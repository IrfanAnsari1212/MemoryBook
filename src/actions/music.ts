"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { idSchema } from "@/lib/validations/book";
import { ingestAudio, removeMusic } from "@/lib/music/service";
import { ingestAudioDeps, removeMusicDeps } from "@/lib/music/deps";
import { musicRefSchema, musicSettingsSchema } from "@/lib/music/validation";

export type UploadMusicResult = { ok: true; warning?: string } | { ok: false; error: string };
export type MusicActionState = { ok?: boolean; error?: string; warning?: string; fieldErrors?: Record<string, string[] | undefined> };

function revalidateMusic(bookId: string) {
  revalidatePath(`/admin/books/${bookId}/music`);
  revalidatePath(`/admin/books/${bookId}`);
}

/**
 * Upload (or replace) the book's single track. Authorization comes from the session + book ownership;
 * nothing about the asset (id, URL, size, type) is taken from the client, and no URL field exists.
 */
export async function uploadMusicAction(formData: FormData): Promise<UploadMusicResult> {
  const user = await requireAdmin();
  const bookId = idSchema.safeParse(formData.get("bookId"));
  if (!bookId.success) return { ok: false, error: "Memory book not found." };
  const book = await getDb().memoryBook.findFirst({ where: { id: bookId.data, ownerId: user.id }, select: { id: true } });
  if (!book) return { ok: false, error: "Memory book not found." };

  if (!rateLimit(`music:${user.id}`, 20, 10 * 60_000)) return { ok: false, error: "Too many uploads. Please wait a few minutes." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };

  const result = await ingestAudio(
    { bookId: book.id, file: { name: file.name, type: file.type, size: file.size, bytes: Buffer.from(await file.arrayBuffer()) } },
    ingestAudioDeps,
  );
  if (!result.ok) return result;
  revalidateMusic(book.id);
  return { ok: true, warning: result.warning };
}

/** Edit title / artist / enabled / loop / volume. Scoped to the owner's book; never touches url or storage ids. */
export async function updateMusicAction(_prev: MusicActionState, formData: FormData): Promise<MusicActionState> {
  const user = await requireAdmin();
  const flag = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const parsed = musicSettingsSchema.safeParse({
    bookId: formData.get("bookId"),
    title: String(formData.get("title") ?? ""),
    artist: String(formData.get("artist") ?? ""),
    enabled: flag("enabled"),
    loop: flag("loop"),
    volume: String(formData.get("volume") ?? ""),
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;

  const { count } = await getDb().music.updateMany({
    where: { bookId: d.bookId, book: { ownerId: user.id } },
    data: { name: d.title, artist: d.artist, enabled: d.enabled, loop: d.loop, volume: d.volume },
  });
  if (count === 0) return { error: "This book has no music." };
  revalidateMusic(d.bookId);
  return { ok: true };
}

export async function removeMusicAction(_prev: MusicActionState, formData: FormData): Promise<MusicActionState> {
  const user = await requireAdmin();
  const ref = musicRefSchema.safeParse({ bookId: formData.get("bookId") });
  if (!ref.success) return { error: "This book has no music." };
  const result = await removeMusic(removeMusicDeps(user.id, ref.data.bookId));
  if (!result.ok) return { error: result.error };
  revalidateMusic(ref.data.bookId);
  return { ok: true, warning: result.warning };
}
