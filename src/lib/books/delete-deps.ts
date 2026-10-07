import "server-only";
import { getDb } from "@/lib/db";
import { cloudinaryBookCleanup } from "@/lib/cloudinary/server";
import type { DeleteBookDeps } from "./delete";

export const deleteBookDeps: DeleteBookDeps = {
  findOwnedBook: (ownerId, bookId) =>
    getDb().memoryBook.findFirst({ where: { id: bookId, ownerId }, select: { id: true, title: true, status: true } }),
  listAssets: (bookId) => getDb().media.findMany({ where: { bookId }, select: { publicId: true, type: true } }),
  takeOffline: async (ownerId, bookId) => {
    await getDb().memoryBook.updateMany({
      where: { id: bookId, ownerId, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    });
  },
  deleteAssets: cloudinaryBookCleanup.deleteAssets,
  sweepFolder: cloudinaryBookCleanup.sweepFolder,
  // Children (pages, media, music, share links) are removed by the schema's ON DELETE CASCADE, atomically with the book.
  deleteBookRecord: async (ownerId, bookId) => (await getDb().memoryBook.deleteMany({ where: { id: bookId, ownerId } })).count,
  log: (m) => console.error(m),
};
