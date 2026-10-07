"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { MAX_ACTIVE_LINKS_PER_BOOK, buildShareUrl, expiresAtFor } from "@/lib/share/policy";
import { generateShareToken } from "@/lib/share/token";
import { createShareSchema, revokeShareSchema } from "@/lib/share/validation";

export type ShareActionState = {
  ok?: boolean;
  /** The ONLY time the raw link exists server-side: returned once to the creating client, never stored or logged. */
  url?: string;
  expiresAt?: string | null;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const revalidateShare = (bookId: string) => {
  revalidatePath(`/admin/books/${bookId}/share`);
  revalidatePath("/admin/share");
};

/**
 * Create a share link. The token is generated here (never supplied by the client), only its SHA-256 is
 * stored, the owner comes from the session, the book is looked up through that owner, and the expiry is
 * computed from a closed set of choices (the client never sends a date).
 */
export async function createShareLinkAction(_prev: ShareActionState, formData: FormData): Promise<ShareActionState> {
  const user = await requireAdmin();
  const parsed = createShareSchema.safeParse({
    bookId: formData.get("bookId"),
    expiry: formData.get("expiry"),
    label: String(formData.get("label") ?? ""),
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { bookId, expiry, label } = parsed.data;

  const book = await getDb().memoryBook.findFirst({ where: { id: bookId, ownerId: user.id }, select: { id: true, status: true } });
  if (!book) return { error: "Memory book not found." };
  // A link can't bypass publication, so only published books are shareable.
  if (book.status !== "PUBLISHED") return { error: "Publish this memory book before creating share links." };

  if (!rateLimit(`share:${user.id}`, 30, 10 * 60_000)) return { error: "Too many links created. Please wait a few minutes." };

  const now = new Date();
  const active = await getDb().shareLink.count({
    where: { bookId: book.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
  });
  if (active >= MAX_ACTIVE_LINKS_PER_BOOK) return { error: `This book already has ${MAX_ACTIVE_LINKS_PER_BOOK} active links. Revoke one first.` };

  const { token, tokenHash } = generateShareToken();
  const expiresAt = expiresAtFor(expiry, now);
  try {
    await getDb().shareLink.create({ data: { bookId: book.id, tokenHash, label, expiresAt } });
  } catch {
    console.error("createShareLink failed"); // never log the token
    return { error: "Could not create the link. Please try again." };
  }

  revalidateShare(book.id);
  return { ok: true, url: buildShareUrl(getEnv().NEXT_PUBLIC_APP_URL, token), expiresAt: expiresAt?.toISOString() ?? null };
}

/** Revoke (not delete) a link. Both ids come from the browser, so the write is scoped through the owner. */
export async function revokeShareLinkAction(_prev: ShareActionState, formData: FormData): Promise<ShareActionState> {
  const user = await requireAdmin();
  const parsed = revokeShareSchema.safeParse({ bookId: formData.get("bookId"), linkId: formData.get("linkId") });
  if (!parsed.success) return { error: "Link not found." };

  const { count } = await getDb().shareLink.updateMany({
    where: { id: parsed.data.linkId, bookId: parsed.data.bookId, revokedAt: null, book: { ownerId: user.id } },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return { error: "Link not found or already revoked." };
  revalidateShare(parsed.data.bookId);
  return { ok: true };
}
