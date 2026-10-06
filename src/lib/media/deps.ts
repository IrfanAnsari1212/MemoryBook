import "server-only";
import { getDb } from "@/lib/db";
import { cloudinaryStorage } from "@/lib/cloudinary/server";
import type { DeleteDeps, IngestDeps, MediaRecord } from "./service";

const log = (msg: string) => console.error(msg);

export const ingestDeps: IngestDeps = {
  storage: cloudinaryStorage,
  createRecord: (data) => getDb().media.create({ data }) as Promise<MediaRecord>,
  log,
};

/** Delete dependencies for one media row, scoped through the book's owner. */
export function deleteDeps(ownerId: string, bookId: string, mediaId: string): DeleteDeps {
  const db = getDb();
  return {
    findOwned: () =>
      db.media.findFirst({
        where: { id: mediaId, bookId, book: { ownerId } },
        select: { id: true, bookId: true, publicId: true },
      }),
    findUsage: async (id) => {
      const [pages, musicCount] = await Promise.all([
        db.memoryPage.findMany({ where: { mediaId: id }, orderBy: { order: "asc" }, select: { id: true, order: true, title: true } }),
        db.music.count({ where: { mediaId: id } }),
      ]);
      return { pages, musicCount };
    },
    // One guarded statement: the row is only removed if no page or music record references it.
    deleteRecordIfUnused: async (id) => {
      const n = await db.$executeRaw`
        DELETE FROM "Media"
        WHERE "id" = ${id} AND "bookId" = ${bookId}
          AND NOT EXISTS (SELECT 1 FROM "MemoryPage" WHERE "mediaId" = ${id})
          AND NOT EXISTS (SELECT 1 FROM "Music" WHERE "mediaId" = ${id})`;
      return n > 0;
    },
    storage: cloudinaryStorage,
    log,
  };
}
