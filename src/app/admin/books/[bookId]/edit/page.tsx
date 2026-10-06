import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { toDateInputValue } from "@/lib/utils/format";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "Edit Memory Book" };

export default async function EditBookPage({ params }: PageProps<"/admin/books/[bookId]/edit">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Memory Book</h1>
      <BookForm
        mode="edit"
        bookId={book.id}
        cancelHref={`/admin/books/${book.id}`}
        initial={{
          title: book.title,
          recipientName: book.recipientName,
          senderName: book.senderName,
          occasion: book.occasion,
          date: toDateInputValue(book.date),
          slug: book.slug,
          coverTitle: book.coverTitle,
          coverSubtitle: book.coverSubtitle ?? "",
          visibility: book.visibility,
          status: book.status,
        }}
      />
    </div>
  );
}
