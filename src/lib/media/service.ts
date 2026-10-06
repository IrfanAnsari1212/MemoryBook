/**
 * Media business logic with injected dependencies. Intentionally free of
 * `server-only`/Next imports so failure paths (Cloudinary down, DB down, cleanup
 * failing) can be tested with fakes. Real wiring lives in ./deps.ts.
 *
 * Cloudinary and PostgreSQL are separate systems; there are no distributed
 * transactions here, only ordered steps with compensating cleanup.
 */
import { MAX_IMAGE_DIMENSION } from "./config";
import { sanitizeFilename, validateImageFile } from "./validation";

export type UploadedAsset = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
};

export type StorageAdapter = {
  /** The adapter, not the caller, chooses the public id (server-generated, inside the book's folder). */
  upload(bytes: Buffer, ctx: { bookId: string }): Promise<UploadedAsset>;
  /** Resolves true if the asset was removed (or was already gone). */
  destroy(publicId: string): Promise<boolean>;
};

export type MediaRecord = {
  id: string;
  bookId: string;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mimeType: string | null;
  format: string | null;
  originalFilename: string | null;
  alt: string | null;
  caption: string | null;
  createdAt: Date;
};

export type NewMediaRecord = Omit<MediaRecord, "id" | "createdAt" | "alt" | "caption"> & { type: "IMAGE" };

export type IngestDeps = {
  storage: StorageAdapter;
  createRecord: (data: NewMediaRecord) => Promise<MediaRecord>;
  log?: (msg: string) => void;
};

export type IngestResult = { ok: true; media: MediaRecord } | { ok: false; error: string };

export const bookFolder = (bookId: string) => `memoryletter/books/${bookId}`;

export async function ingestImage(
  input: { bookId: string; file: { name: string; type: string; size: number; bytes: Buffer } },
  deps: IngestDeps,
): Promise<IngestResult> {
  const log = deps.log ?? (() => {});
  const { bookId, file } = input;

  const check = validateImageFile(file);
  if (!check.ok) return { ok: false, error: check.error };

  // (C) Cloudinary failure: nothing exists yet, so no DB record is created.
  let asset: UploadedAsset;
  try {
    asset = await deps.storage.upload(file.bytes, { bookId });
  } catch {
    return { ok: false, error: "Upload to image storage failed. Please try again." };
  }

  const cleanup = async (reason: string) => {
    try {
      await deps.storage.destroy(asset.publicId);
    } catch {
      log(`media-orphan: could not remove uploaded asset ${asset.publicId} after ${reason}`);
    }
  };

  // The asset must live inside this book's folder; anything else is treated as a failure.
  if (!asset.publicId.startsWith(`${bookFolder(bookId)}/`)) {
    await cleanup("unexpected public id");
    return { ok: false, error: "Upload to image storage failed. Please try again." };
  }
  if ((asset.width ?? 0) > MAX_IMAGE_DIMENSION || (asset.height ?? 0) > MAX_IMAGE_DIMENSION) {
    await cleanup("oversized dimensions");
    return { ok: false, error: `The image is too large in pixels (max ${MAX_IMAGE_DIMENSION}px per side).` };
  }

  // (B) DB failure after a successful upload: attempt to remove the new asset.
  try {
    const media = await deps.createRecord({
      bookId,
      type: "IMAGE",
      url: asset.url,
      publicId: asset.publicId,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes ?? file.size,
      mimeType: check.mime,
      format: asset.format ?? check.ext,
      originalFilename: sanitizeFilename(file.name),
    });
    return { ok: true, media };
  } catch {
    await cleanup("database failure");
    return { ok: false, error: "Could not save the image. Please try again." };
  }
}

// ───────────── delete ─────────────

export type MediaUsage = { pages: Array<{ id: string; order: number; title: string | null }>; musicCount: number };

export type DeleteDeps = {
  findOwned: () => Promise<{ id: string; bookId: string; publicId: string } | null>;
  findUsage: (mediaId: string) => Promise<MediaUsage>;
  /** Atomically deletes the row only if nothing references it. Returns whether a row was deleted. */
  deleteRecordIfUnused: (mediaId: string) => Promise<boolean>;
  storage: Pick<StorageAdapter, "destroy">;
  log?: (msg: string) => void;
};

export type DeleteResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string; usedBy?: MediaUsage["pages"] };

/**
 * Order of operations: refuse if referenced -> delete the DB row (guarded, atomic) -> delete the
 * Cloudinary asset. The DB goes first so a page can never point at an image that no longer exists.
 * If Cloudinary then fails, the only leftover is an unreferenced asset, which is reported (not hidden).
 */
export async function deleteMedia(deps: DeleteDeps): Promise<DeleteResult> {
  const log = deps.log ?? (() => {});
  const media = await deps.findOwned();
  if (!media) return { ok: false, error: "Image not found." };

  const usage = await deps.findUsage(media.id);
  if (usage.pages.length > 0 || usage.musicCount > 0) {
    const where = usage.pages.length
      ? `page${usage.pages.length === 1 ? "" : "s"} ${usage.pages.map((p) => p.order).join(", ")}`
      : "the book's music";
    return { ok: false, error: `This image is in use on ${where}. Detach it first.`, usedBy: usage.pages };
  }

  const deleted = await deps.deleteRecordIfUnused(media.id);
  if (!deleted) return { ok: false, error: "This image was just attached to a page. Detach it first." };

  try {
    await deps.storage.destroy(media.publicId);
  } catch {
    log(`media-orphan: record deleted but asset ${media.publicId} could not be removed from storage`);
    return {
      ok: true,
      warning: "The image was removed from your library, but the stored file could not be deleted from Cloudinary. It is unreferenced and can be removed manually.",
    };
  }
  return { ok: true };
}
