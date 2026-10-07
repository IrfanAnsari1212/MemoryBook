/**
 * Permanent book deletion with injected dependencies (no `server-only`/Next imports, so every failure path
 * can be tested with fakes). Wiring lives in ./delete-deps.ts.
 *
 * Cloudinary and PostgreSQL cannot share a transaction, so the order is chosen so that no failure is silent
 * and every state is recoverable by simply trying again:
 *   1. authorize (owner-scoped lookup) and check the typed name
 *   2. take the book OFFLINE (ARCHIVED): /m and /s stop serving it before anything is destroyed
 *   3. delete the Cloudinary assets (explicit stored ids, then a sweep of the book's own folder)
 *      -> on ANY failure stop here: the database is untouched, the user is told, retrying is safe
 *         (Cloudinary deletes are idempotent: "not found" counts as success)
 *   4. delete the book row in one DB statement; every dependent row (pages, media, music, share links)
 *      goes with it through the schema's ON DELETE CASCADE foreign keys, atomically.
 * If step 4 fails after step 3 the book stays archived with its files gone; retrying finishes the job.
 */
import { deleteBookSchema } from "@/lib/validations/book";

export const bookFolder = (bookId: string) => `memoryletter/books/${bookId}`;

export type AssetKind = "IMAGE" | "AUDIO";
export type BookAsset = { publicId: string; type: AssetKind };

export type DeleteBookDeps = {
  findOwnedBook: (ownerId: string, bookId: string) => Promise<{ id: string; title: string; status: string } | null>;
  listAssets: (bookId: string) => Promise<BookAsset[]>;
  takeOffline: (ownerId: string, bookId: string) => Promise<void>;
  /** resource type is Cloudinary's: images are "image", audio is "video". Throws on any failure. */
  deleteAssets: (resourceType: "image" | "video", publicIds: string[]) => Promise<void>;
  /** Removes whatever is left under the prefix (orphans) for both resource types. Throws on failure. */
  sweepFolder: (prefix: string) => Promise<void>;
  /** Deletes the owner's book; returns how many rows were deleted (0 or 1). */
  deleteBookRecord: (ownerId: string, bookId: string) => Promise<number>;
  log?: (msg: string) => void;
};

export type DeleteBookResult =
  | { ok: true; removedAssets: number }
  | { ok: false; code: "invalid" | "not_found" | "confirmation" | "cleanup_failed" | "db_failed"; error: string };

export async function deleteBookPermanently(
  ownerId: string,
  input: { bookId: unknown; confirmTitle: unknown },
  deps: DeleteBookDeps,
): Promise<DeleteBookResult> {
  const log = deps.log ?? (() => {});
  const parsed = deleteBookSchema.safeParse(input);
  if (!parsed.success) {
    const missingName = parsed.error.issues.some((i) => i.path[0] === "confirmTitle");
    return missingName
      ? { ok: false, code: "confirmation", error: "Type the exact book name to confirm." }
      : { ok: false, code: "invalid", error: "Invalid request." };
  }
  const { bookId, confirmTitle } = parsed.data;

  // Ownership comes from the caller (the session), never from the client.
  const book = await deps.findOwnedBook(ownerId, bookId);
  if (!book) return { ok: false, code: "not_found", error: "Memory book not found." };

  if (confirmTitle !== book.title) {
    return { ok: false, code: "confirmation", error: "The name you typed doesn't match this book. Nothing was deleted." };
  }

  // Only assets inside THIS book's folder are ever destroyed; anything else on a row is left alone.
  const folder = `${bookFolder(book.id)}/`;
  const all = await deps.listAssets(book.id);
  const own = all.filter((a) => a.publicId.startsWith(folder) && !a.publicId.includes(".."));
  if (own.length !== all.length) log(`delete book: ${all.length - own.length} asset(s) outside the book folder were skipped`);
  const images = own.filter((a) => a.type === "IMAGE").map((a) => a.publicId);
  const audio = own.filter((a) => a.type === "AUDIO").map((a) => a.publicId);

  try {
    await deps.takeOffline(ownerId, book.id);
    if (images.length) await deps.deleteAssets("image", images);
    if (audio.length) await deps.deleteAssets("video", audio);
    await deps.sweepFolder(folder);
  } catch {
    log("delete book: stored-file cleanup failed; database left intact");
    return {
      ok: false,
      code: "cleanup_failed",
      error:
        "Some stored files couldn't be removed, so nothing was deleted. The book has been taken offline (archived). Please try again.",
    };
  }

  let deleted: number;
  try {
    deleted = await deps.deleteBookRecord(ownerId, book.id);
  } catch {
    log("delete book: database delete failed after file cleanup");
    return {
      ok: false,
      code: "db_failed",
      error: "The files were removed but the book record could not be deleted. The book is archived; please try again.",
    };
  }
  if (deleted !== 1) return { ok: false, code: "not_found", error: "Memory book not found." };
  return { ok: true, removedAssets: images.length + audio.length };
}
