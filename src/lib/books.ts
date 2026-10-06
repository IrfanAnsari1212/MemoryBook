import "server-only";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { idSchema } from "@/lib/validations/book";

/**
 * Fetch a book only if it belongs to `ownerId`. A book owned by someone else is
 * indistinguishable from a missing one (404), so IDs cannot be probed.
 */
export async function getOwnedBookOrNotFound(ownerId: string, bookId: string) {
  const parsed = idSchema.safeParse(bookId);
  if (!parsed.success) notFound();
  const book = await getDb().memoryBook.findFirst({ where: { id: parsed.data, ownerId } });
  if (!book) notFound();
  return book;
}
