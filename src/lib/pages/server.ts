import "server-only";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { idSchema } from "@/lib/validations/book";

type Tx = Prisma.TransactionClient;

/** Page fetched through its book's owner: a page in someone else's book is a 404. */
export async function getOwnedPageOrNotFound(ownerId: string, bookId: string, pageId: string) {
  const b = idSchema.safeParse(bookId);
  const p = idSchema.safeParse(pageId);
  if (!b.success || !p.success) notFound();
  const page = await getDb().memoryPage.findFirst({
    where: { id: p.data, bookId: b.data, book: { ownerId } },
  });
  if (!page) notFound();
  return page;
}

/**
 * Runs `fn` in a transaction holding a row lock on the book, so concurrent
 * add/duplicate/delete/reorder calls on the same book are serialized and
 * cannot race on `order`.
 */
export function withBookLock<T>(bookId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "MemoryBook" WHERE "id" = ${bookId} FOR UPDATE`;
    return fn(tx);
  });
}

/**
 * Assign orders 1..n following `orderedIds`, without ever creating a duplicate
 * (bookId, order). Step 1 negates every order (negatives cannot collide with the
 * final positive values); step 2 writes the final positions in one statement.
 * Must be called inside withBookLock and with ALL page ids of the book.
 */
export async function resequence(tx: Tx, bookId: string, orderedIds: string[]) {
  await tx.$executeRaw`UPDATE "MemoryPage" SET "order" = -"order" WHERE "bookId" = ${bookId}`;
  if (orderedIds.length === 0) return;
  await tx.$executeRaw`
    UPDATE "MemoryPage" AS p
    SET "order" = v.ord::int
    FROM unnest(${orderedIds}::text[]) WITH ORDINALITY AS v(id, ord)
    WHERE p."id" = v.id AND p."bookId" = ${bookId}`;
}

export async function pageIdsInOrder(tx: Tx, bookId: string): Promise<string[]> {
  const rows = await tx.memoryPage.findMany({ where: { bookId }, orderBy: { order: "asc" }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function nextOrder(tx: Tx, bookId: string): Promise<number> {
  const agg = await tx.memoryPage.aggregate({ where: { bookId }, _max: { order: true } });
  return (agg._max.order ?? 0) + 1;
}
