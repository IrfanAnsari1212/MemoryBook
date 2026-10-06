"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { idSchema } from "@/lib/validations/book";
import { deleteMedia, ingestImage } from "@/lib/media/service";
import { deleteDeps, ingestDeps } from "@/lib/media/deps";
import { mediaMetaSchema, mediaRefSchema } from "@/lib/media/validation";

export type UploadResult = { ok: true; mediaId: string } | { ok: false; error: string };
export type MediaActionState = { ok?: boolean; error?: string; warning?: string; fieldErrors?: Record<string, string[] | undefined> };

function revalidateMedia(bookId: string) {
  revalidatePath(`/admin/books/${bookId}/media`);
  revalidatePath(`/admin/books/${bookId}`);
}

/**
 * Upload ONE image (the uploader calls this once per file). Authorization comes from the
 * session + book ownership; nothing about the asset (id, URL, size, type) is taken from the client.
 */
export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  const user = await requireAdmin();
  const bookId = idSchema.safeParse(formData.get("bookId"));
  if (!bookId.success) return { ok: false, error: "Memory book not found." };
  const book = await getDb().memoryBook.findFirst({ where: { id: bookId.data, ownerId: user.id }, select: { id: true } });
  if (!book) return { ok: false, error: "Memory book not found." };

  if (!rateLimit(`upload:${user.id}`, 60, 10 * 60_000)) return { ok: false, error: "Too many uploads. Please wait a few minutes." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };

  const result = await ingestImage(
    { bookId: book.id, file: { name: file.name, type: file.type, size: file.size, bytes: Buffer.from(await file.arrayBuffer()) } },
    ingestDeps,
  );
  if (!result.ok) return result;
  revalidateMedia(book.id);
  return { ok: true, mediaId: result.media.id };
}

export async function deleteMediaAction(_prev: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const user = await requireAdmin();
  const ref = mediaRefSchema.safeParse({ bookId: formData.get("bookId"), mediaId: formData.get("mediaId") });
  if (!ref.success) return { error: "Image not found." };

  // Ownership is enforced inside findOwned (book.ownerId = session user) and the guarded DELETE.
  const result = await deleteMedia(deleteDeps(user.id, ref.data.bookId, ref.data.mediaId));
  if (!result.ok) return { error: result.error };
  revalidateMedia(ref.data.bookId);
  return { ok: true, warning: result.warning };
}

export async function updateMediaMetaAction(_prev: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const user = await requireAdmin();
  const parsed = mediaMetaSchema.safeParse({
    bookId: formData.get("bookId"),
    mediaId: formData.get("mediaId"),
    alt: String(formData.get("alt") ?? ""),
    caption: String(formData.get("caption") ?? ""),
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { count } = await getDb().media.updateMany({
    where: { id: parsed.data.mediaId, bookId: parsed.data.bookId, book: { ownerId: user.id } },
    data: { alt: parsed.data.alt, caption: parsed.data.caption },
  });
  if (count === 0) return { error: "Image not found." };
  revalidateMedia(parsed.data.bookId);
  return { ok: true };
}
