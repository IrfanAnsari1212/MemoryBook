import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "New Memory Book" };

export default async function NewBookPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Create Memory Book</h1>
      <BookForm mode="create" cancelHref="/admin/books" />
    </div>
  );
}
