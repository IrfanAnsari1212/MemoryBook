import "server-only";
import { getDb } from "@/lib/db";
import { cloudinaryAudioStorage } from "@/lib/cloudinary/server";
import { DEFAULT_MUSIC_LOOP, DEFAULT_MUSIC_VOLUME } from "./config";
import type { IngestAudioDeps, RemoveMusicDeps } from "./service";

const log = (msg: string) => console.error(msg);

// Interactive transactions default to a 5s timeout, which is tight against a remote database.
const TX = { maxWait: 10_000, timeout: 20_000 } as const;

export const ingestAudioDeps: IngestAudioDeps = {
  storage: cloudinaryAudioStorage,
  log,
  async saveTrack({ bookId, asset, mimeType, originalFilename, title }) {
    return getDb().$transaction(async (tx) => {
      // Serialize concurrent music changes on one book (one track per book is enforced here, in the DB layer).
      await tx.$queryRaw`SELECT "id" FROM "MemoryBook" WHERE "id" = ${bookId} FOR UPDATE`;
      const existing = await tx.music.findUnique({
        where: { bookId },
        include: { media: { select: { id: true, bookId: true, type: true, publicId: true } } },
      });

      const media = await tx.media.create({
        data: { bookId, type: "AUDIO", url: asset.url, publicId: asset.publicId, bytes: asset.bytes, mimeType, format: asset.format, originalFilename },
        select: { id: true },
      });

      if (!existing) {
        const created = await tx.music.create({
          data: {
            bookId,
            name: title,
            durationSeconds: asset.durationSeconds,
            url: asset.url,
            mediaId: media.id,
            enabled: true,
            volume: DEFAULT_MUSIC_VOLUME,
            loop: DEFAULT_MUSIC_LOOP,
          },
          select: { id: true },
        });
        return { musicId: created.id, title, replacedPublicId: null };
      }

      // Replace: keep the book's playback settings, swap the track, drop the old AUDIO media row of THIS book.
      await tx.music.update({
        where: { id: existing.id },
        data: { name: title, artist: null, durationSeconds: asset.durationSeconds, url: asset.url, mediaId: media.id },
      });
      let replacedPublicId: string | null = null;
      if (existing.media && existing.media.type === "AUDIO" && existing.media.bookId === bookId) {
        await tx.media.deleteMany({ where: { id: existing.media.id, bookId, type: "AUDIO" } });
        replacedPublicId = existing.media.publicId;
      }
      return { musicId: existing.id, title, replacedPublicId };
    }, TX);
  },
};

/** Removal dependencies, scoped through the book's owner. */
export function removeMusicDeps(ownerId: string, bookId: string): RemoveMusicDeps {
  return {
    storage: cloudinaryAudioStorage,
    log,
    detach: () =>
      getDb().$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "MemoryBook" WHERE "id" = ${bookId} AND "ownerId" = ${ownerId} FOR UPDATE`;
        const music = await tx.music.findFirst({
          where: { bookId, book: { ownerId } },
          include: { media: { select: { id: true, bookId: true, type: true, publicId: true } } },
        });
        if (!music) return null;
        await tx.music.delete({ where: { id: music.id } });
        let publicId: string | null = null;
        if (music.media && music.media.type === "AUDIO" && music.media.bookId === bookId) {
          await tx.media.deleteMany({ where: { id: music.media.id, bookId, type: "AUDIO" } });
          publicId = music.media.publicId;
        }
        return { publicId };
      }, TX),
  };
}
