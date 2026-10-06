"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { PageType } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getOwnedPageOrNotFound, nextOrder, pageIdsInOrder, resequence, withBookLock } from "@/lib/pages/server";
import { LIMITS } from "@/lib/pages/registry";
import { idSchema } from "@/lib/validations/book";
import {
  pageRefSchema,
  pageStatusSchema,
  pageTypeSchema,
  parsePageInput,
  reorderSchema,
  type PageValues,
} from "@/lib/validations/page";

export type PageFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export type ReorderResult = { ok: true } | { ok: false; error: string };

const FIELDS = ["title", "subtitle", "body", "caption", "signature", "mediaId", "photoLayout", "transition"] as const;

function readForm(fd: FormData) {
  const values: Record<string, string> = {};
  for (const k of FIELDS) {
    const v = fd.get(k);
    values[k] = typeof v === "string" ? v : "";
  }
  values.published = fd.get("published") === "on" || fd.get("published") === "true" ? "true" : "";
  return values;
}

/** Form values -> parser input. Missing text fields become "" so optional fields stay optional. */
function toParserInput(values: Record<string, string>) {
  return {
    ...values,
    photoLayout: values.photoLayout || "FLOATING_BUBBLE",
    transition: values.transition || "PAGE_TURN",
    published: values.published === "true",
  };
}

/** The referenced image must exist and belong to this same book. */
async function mediaBelongsToBook(mediaId: string, bookId: string) {
  const m = await getDb().media.findFirst({ where: { id: mediaId, bookId, type: "IMAGE" }, select: { id: true } });
  return !!m;
}

function revalidatePages(bookId: string, pageId?: string) {
  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${bookId}`);
  revalidatePath(`/admin/books/${bookId}/pages`);
  if (pageId) {
    revalidatePath(`/admin/books/${bookId}/pages/${pageId}`);
    revalidatePath(`/admin/books/${bookId}/pages/${pageId}/edit`);
  }
}

function jsonOrNull(config: PageValues["config"]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return (config as Prisma.InputJsonObject | null) ?? Prisma.JsonNull;
}

export async function createPageAction(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const user = await requireAdmin();
  const bookIdRes = idSchema.safeParse(formData.get("bookId"));
  if (!bookIdRes.success) notFound();
  const book = await getOwnedBookOrNotFound(user.id, bookIdRes.data);

  const values = { ...readForm(formData), type: String(formData.get("type") ?? "") };
  const type = pageTypeSchema.safeParse(values.type);
  if (!type.success) return { error: "Please fix the highlighted fields.", fieldErrors: { type: [type.error.issues[0].message] }, values };

  const parsed = parsePageInput(type.data, toParserInput(values));
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values };
  const d = parsed.data;

  if (d.mediaId && !(await mediaBelongsToBook(d.mediaId, book.id))) {
    return { error: "Please fix the highlighted fields.", fieldErrors: { mediaId: ["Selected image was not found."] }, values };
  }

  try {
    await withBookLock(book.id, async (tx) => {
      await tx.memoryPage.create({
        data: {
          bookId: book.id, // from the verified book, never from the client
          order: await nextOrder(tx, book.id), // server-assigned
          type: type.data,
          title: d.title,
          subtitle: d.subtitle,
          body: d.body,
          caption: d.caption,
          mediaId: d.mediaId,
          ...(d.photoLayout ? { photoLayout: d.photoLayout } : {}),
          transition: d.transition,
          published: d.published,
          config: jsonOrNull(d.config),
        },
      });
    });
  } catch {
    console.error("createPage failed");
    return { error: "Could not create the page. Please try again.", values };
  }

  revalidatePages(book.id);
  redirect(`/admin/books/${book.id}/pages`);
}

export async function updatePageAction(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const user = await requireAdmin();
  const ref = pageRefSchema.safeParse({ bookId: formData.get("bookId"), pageId: formData.get("pageId") });
  if (!ref.success) notFound();
  const page = await getOwnedPageOrNotFound(user.id, ref.data.bookId, ref.data.pageId);

  const values = readForm(formData);
  // The page type is fixed at creation; any client-supplied type is ignored.
  const parsed = parsePageInput(page.type as PageType, toParserInput(values));
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values };
  const d = parsed.data;

  if (d.mediaId && !(await mediaBelongsToBook(d.mediaId, page.bookId))) {
    return { error: "Please fix the highlighted fields.", fieldErrors: { mediaId: ["Selected image was not found."] }, values };
  }

  const { count } = await getDb().memoryPage.updateMany({
    where: { id: page.id, bookId: page.bookId, book: { ownerId: user.id } },
    data: {
      title: d.title,
      subtitle: d.subtitle,
      body: d.body,
      caption: d.caption,
      mediaId: d.mediaId,
      ...(d.photoLayout ? { photoLayout: d.photoLayout } : {}),
      transition: d.transition,
      published: d.published,
      config: jsonOrNull(d.config),
    },
  });
  if (count === 0) notFound();

  revalidatePages(page.bookId, page.id);
  redirect(`/admin/books/${page.bookId}/pages`);
}

export async function setPageStatusAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = pageStatusSchema.safeParse({
    bookId: formData.get("bookId"),
    pageId: formData.get("pageId"),
    published: formData.get("published"),
  });
  if (!parsed.success) throw new Error("Invalid request.");
  const page = await getOwnedPageOrNotFound(user.id, parsed.data.bookId, parsed.data.pageId);

  await getDb().memoryPage.updateMany({
    where: { id: page.id, bookId: page.bookId, book: { ownerId: user.id } },
    data: { published: parsed.data.published },
  });
  revalidatePages(page.bookId, page.id);
}

export async function duplicatePageAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const ref = pageRefSchema.safeParse({ bookId: formData.get("bookId"), pageId: formData.get("pageId") });
  if (!ref.success) throw new Error("Invalid request.");
  const source = await getOwnedPageOrNotFound(user.id, ref.data.bookId, ref.data.pageId);

  const suffix = " (copy)";
  const title = source.title ? source.title.slice(0, LIMITS.title - suffix.length) + suffix : null;

  await withBookLock(source.bookId, async (tx) => {
    // Re-read inside the lock so we copy the latest content.
    const fresh = await tx.memoryPage.findFirst({ where: { id: source.id, bookId: source.bookId } });
    if (!fresh) return;
    await tx.memoryPage.create({
      data: {
        bookId: fresh.bookId,
        order: await nextOrder(tx, fresh.bookId), // appended after the last page
        type: fresh.type,
        title,
        subtitle: fresh.subtitle,
        body: fresh.body,
        caption: fresh.caption,
        mediaId: fresh.mediaId, // same media record; no binary is copied
        layout: fresh.layout,
        alignment: fresh.alignment,
        transition: fresh.transition,
        photoLayout: fresh.photoLayout,
        photoPosition: fresh.photoPosition,
        photoSize: fresh.photoSize,
        photoRotation: fresh.photoRotation,
        photoAnimation: fresh.photoAnimation,
        photoDelayMs: fresh.photoDelayMs,
        config: fresh.config ?? Prisma.JsonNull,
        published: false, // copies start as drafts
      },
    });
  });
  revalidatePages(source.bookId);
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const ref = pageRefSchema.safeParse({ bookId: formData.get("bookId"), pageId: formData.get("pageId") });
  if (!ref.success) throw new Error("Invalid request.");
  const page = await getOwnedPageOrNotFound(user.id, ref.data.bookId, ref.data.pageId);

  await withBookLock(page.bookId, async (tx) => {
    await tx.memoryPage.deleteMany({ where: { id: page.id, bookId: page.bookId } });
    await resequence(tx, page.bookId, await pageIdsInOrder(tx, page.bookId)); // close the gap
  });
  revalidatePages(page.bookId);
}

/** Called programmatically by the drag-and-drop list. `orderedIds` must be exactly the book's pages. */
export async function reorderPagesAction(bookId: string, orderedIds: string[]): Promise<ReorderResult> {
  const user = await requireAdmin();
  const parsed = reorderSchema.safeParse({ bookId, orderedIds });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const book = await getOwnedBookOrNotFound(user.id, parsed.data.bookId);

  const result = await withBookLock(book.id, async (tx): Promise<ReorderResult> => {
    const current = await pageIdsInOrder(tx, book.id);
    const sameSet = current.length === parsed.data.orderedIds.length && current.every((id) => parsed.data.orderedIds.includes(id));
    if (!sameSet) return { ok: false, error: "The page list changed. Reload and try again." };
    await resequence(tx, book.id, parsed.data.orderedIds);
    return { ok: true };
  });
  if (result.ok) revalidatePages(book.id);
  return result;
}

