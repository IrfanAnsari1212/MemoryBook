"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { canTransition } from "@/lib/book-status";
import {
  bookInputSchema,
  idSchema,
  setStatusSchema,
  setVisibilitySchema,
  type BookInput,
} from "@/lib/validations/book";

export type BookFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, echoed back so the form can be re-populated after an error. */
  values?: Record<string, string>;
};

const FIELDS = [
  "title", "recipientName", "senderName", "occasion", "date",
  "slug", "coverTitle", "coverSubtitle", "visibility", "status",
] as const;

function readFields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of FIELDS) {
    const v = formData.get(key);
    out[key] = typeof v === "string" ? v : "";
  }
  return out;
}

function parseBook(values: Record<string, string>): { data: BookInput } | { state: BookFormState } {
  const parsed = bookInputSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data };
  return {
    state: {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    },
  };
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

const SLUG_TAKEN: BookFormState["fieldErrors"] = { slug: ["This slug is already in use."] };

function revalidateBooks(bookId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/books");
  if (bookId) {
    revalidatePath(`/admin/books/${bookId}`);
    revalidatePath(`/admin/books/${bookId}/edit`);
  }
}

export async function createBookAction(_prev: BookFormState, formData: FormData): Promise<BookFormState> {
  const user = await requireAdmin();
  const values = readFields(formData);
  const result = parseBook(values);
  if ("state" in result) return result.state;
  const d = result.data;

  let id: string;
  try {
    const book = await getDb().memoryBook.create({
      data: {
        ownerId: user.id, // always derived from the session, never from the client
        title: d.title,
        recipientName: d.recipientName,
        senderName: d.senderName,
        occasion: d.occasion,
        date: d.date,
        slug: d.slug,
        coverTitle: d.coverTitle ?? `For ${d.recipientName}`,
        coverSubtitle: d.coverSubtitle,
        visibility: d.visibility,
        status: d.status,
        publishedAt: d.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true },
    });
    id = book.id;
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Please fix the highlighted fields.", fieldErrors: SLUG_TAKEN, values };
    console.error("createBook failed");
    return { error: "Could not create the memory book. Please try again.", values };
  }

  revalidateBooks();
  redirect(`/admin/books/${id}`);
}

export async function updateBookAction(_prev: BookFormState, formData: FormData): Promise<BookFormState> {
  const user = await requireAdmin();
  const bookId = idSchema.safeParse(formData.get("bookId"));
  if (!bookId.success) notFound();
  const existing = await getOwnedBookOrNotFound(user.id, bookId.data);

  const values = readFields(formData);
  const result = parseBook(values);
  if ("state" in result) return result.state;
  const d = result.data;

  if (!canTransition(existing.status, d.status)) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { status: ["Restore an archived book to Draft before publishing it."] },
      values,
    };
  }

  let count: number;
  try {
    // Ownership is part of the WHERE clause, so the write itself is scoped.
    ({ count } = await getDb().memoryBook.updateMany({
      where: { id: existing.id, ownerId: user.id },
      data: {
        title: d.title,
        recipientName: d.recipientName,
        senderName: d.senderName,
        occasion: d.occasion,
        date: d.date,
        slug: d.slug,
        coverTitle: d.coverTitle ?? `For ${d.recipientName}`,
        coverSubtitle: d.coverSubtitle,
        visibility: d.visibility,
        status: d.status,
        publishedAt: d.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
    }));
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Please fix the highlighted fields.", fieldErrors: SLUG_TAKEN, values };
    console.error("updateBook failed");
    return { error: "Could not save changes. Please try again.", values };
  }

  if (count === 0) notFound();
  revalidateBooks(existing.id);
  redirect(`/admin/books/${existing.id}`);
}

/** Publish / unpublish (DRAFT) / archive / restore (DRAFT). Used as a plain <form action>. */
export async function setBookStatusAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = setStatusSchema.safeParse({ bookId: formData.get("bookId"), status: formData.get("status") });
  if (!parsed.success) throw new Error("Invalid request.");

  const book = await getOwnedBookOrNotFound(user.id, parsed.data.bookId);
  const next = parsed.data.status;
  if (!canTransition(book.status, next)) throw new Error("Restore the book to Draft before publishing it.");

  await getDb().memoryBook.updateMany({
    where: { id: book.id, ownerId: user.id },
    data: {
      status: next,
      publishedAt: next === "PUBLISHED" ? (book.publishedAt ?? new Date()) : book.publishedAt,
    },
  });
  revalidateBooks(book.id);
}

export async function setBookVisibilityAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = setVisibilitySchema.safeParse({
    bookId: formData.get("bookId"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const book = await getOwnedBookOrNotFound(user.id, parsed.data.bookId);
  await getDb().memoryBook.updateMany({
    where: { id: book.id, ownerId: user.id },
    data: { visibility: parsed.data.visibility },
  });
  revalidateBooks(book.id);
}
