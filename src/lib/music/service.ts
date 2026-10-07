/**
 * Music business logic with injected dependencies (no `server-only`/Next imports), so failure paths
 * (storage down, DB down, cleanup failing) are testable with fakes. Real wiring lives in ./deps.ts.
 *
 * Cloudinary and PostgreSQL are separate systems: there are no distributed transactions, only
 * ordered steps with compensating cleanup.
 */
import { bookFolder } from "@/lib/media/service";
import { defaultTitleFromFilename, validateAudioFile } from "./validation";

export type UploadedAudio = {
  publicId: string;
  url: string;
  bytes: number | null;
  format: string | null;
  durationSeconds: number | null;
};

export type AudioStorage = {
  /** The adapter picks the public id (server-generated, inside the book's music folder). */
  upload(bytes: Buffer, ctx: { bookId: string }): Promise<UploadedAudio>;
  destroy(publicId: string): Promise<boolean>;
};

/** A log-safe description of an error: its type and code only (never the message, which may contain query text). */
const errTag = (e: unknown) => {
  const code = (e as { code?: unknown })?.code;
  return `${e instanceof Error ? e.name : typeof e}${typeof code === "string" ? `/${code}` : ""}`;
};

export const musicFolder = (bookId: string) => `${bookFolder(bookId)}/music`;

export type SavedTrack = { musicId: string; title: string; /** asset replaced by this upload, to remove afterwards */ replacedPublicId: string | null };

export type IngestAudioDeps = {
  storage: AudioStorage;
  /**
   * Atomically: create the AUDIO media row, create-or-update the book's single Music row (keeping its
   * settings when replacing) and delete the previous AUDIO media row. Returns the replaced asset id.
   */
  saveTrack: (data: { bookId: string; asset: UploadedAudio; mimeType: string; originalFilename: string; title: string }) => Promise<SavedTrack>;
  log?: (msg: string) => void;
};

export type IngestAudioResult = { ok: true; track: SavedTrack; warning?: string } | { ok: false; error: string };

export async function ingestAudio(
  input: { bookId: string; file: { name: string; type: string; size: number; bytes: Buffer } },
  deps: IngestAudioDeps,
): Promise<IngestAudioResult> {
  const log = deps.log ?? (() => {});
  const { bookId, file } = input;

  // E: invalid audio is rejected before anything is uploaded.
  const check = validateAudioFile(file);
  if (!check.ok) return { ok: false, error: check.error };

  // A: storage failure -> nothing exists yet, so no DB record is created.
  let asset: UploadedAudio;
  try {
    asset = await deps.storage.upload(file.bytes, { bookId });
  } catch {
    return { ok: false, error: "Upload to audio storage failed. Please try again." };
  }

  const cleanup = async (reason: string) => {
    try {
      await deps.storage.destroy(asset.publicId);
    } catch {
      // C: cleanup failed -> record the orphan identifier (an id, never a secret).
      log(`music-orphan: could not remove uploaded audio ${asset.publicId} after ${reason}`);
    }
  };

  if (!asset.publicId.startsWith(`${musicFolder(bookId)}/`)) {
    await cleanup("unexpected public id");
    return { ok: false, error: "Upload to audio storage failed. Please try again." };
  }

  // B: DB failure after a successful upload -> attempt to remove the new asset.
  let track: SavedTrack;
  try {
    track = await deps.saveTrack({
      bookId,
      asset,
      mimeType: file.type.toLowerCase(),
      originalFilename: file.name.split(/[\\/]/).pop()!.slice(0, 150),
      title: defaultTitleFromFilename(file.name),
    });
  } catch (e) {
    log(`music saveTrack failed: ${errTag(e)}`);
    await cleanup("database failure");
    return { ok: false, error: "Could not save the track. Please try again." };
  }

  // Replacement: the previous asset belongs to this book (it is the old Music's own AUDIO media), so remove it.
  let warning: string | undefined;
  if (track.replacedPublicId && track.replacedPublicId !== asset.publicId) {
    try {
      await deps.storage.destroy(track.replacedPublicId);
    } catch {
      log(`music-orphan: replaced track ${track.replacedPublicId} could not be removed from storage`);
      warning = "The new track is saved, but the previous file could not be deleted from storage. It is no longer used.";
    }
  }
  return { ok: true, track, warning };
}

// ───────────── remove ─────────────

export type RemoveMusicDeps = {
  /** Deletes the book's Music row and its AUDIO media row; returns the asset id to delete, or null if there was no music. */
  detach: () => Promise<{ publicId: string | null } | null>;
  storage: Pick<AudioStorage, "destroy">;
  log?: (msg: string) => void;
};

export type RemoveMusicResult = { ok: true; warning?: string } | { ok: false; error: string };

/** DB first (the story never points at a missing file), then storage; a storage failure is reported, not hidden. */
export async function removeMusic(deps: RemoveMusicDeps): Promise<RemoveMusicResult> {
  const log = deps.log ?? (() => {});
  const detached = await deps.detach();
  if (!detached) return { ok: false, error: "This book has no music." };
  if (detached.publicId) {
    try {
      await deps.storage.destroy(detached.publicId);
    } catch {
      log(`music-orphan: record removed but audio ${detached.publicId} could not be deleted from storage`);
      return { ok: true, warning: "Music was removed, but the stored file could not be deleted from storage. It is unreferenced." };
    }
  }
  return { ok: true };
}
