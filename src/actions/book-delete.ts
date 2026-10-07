"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { deleteBookPermanently } from "@/lib/books/delete";
import { deleteBookDeps } from "@/lib/books/delete-deps";

export type DeleteBookState = { error?: string };

/**
 * Permanently deletes ONE book. The owner is the authenticated admin; the only client inputs are the book id
 * and the typed name, both validated server-side. A book the caller doesn't own is reported exactly like a
 * missing one.
 */
export async function deleteBookAction(_prev: DeleteBookState, formData: FormData): Promise<DeleteBookState> {
  const user = await requireAdmin();
  if (!rateLimit(`delete-book:${user.id}`, 10, 10 * 60 * 1000)) return { error: "Too many attempts. Please wait a few minutes." };

  const result = await deleteBookPermanently(
    user.id,
    { bookId: formData.get("bookId"), confirmTitle: formData.get("confirmTitle") },
    deleteBookDeps,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/books");
  redirect("/admin/books?deleted=1");
}
