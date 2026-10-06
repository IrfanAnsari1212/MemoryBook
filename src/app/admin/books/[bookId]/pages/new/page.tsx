import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { PageForm } from "@/components/admin/page-form";
import { pageTypeSchema } from "@/lib/validations/page";

export const metadata: Metadata = { title: "Add Page" };

export default async function NewPagePage({ params, searchParams }: PageProps<"/admin/books/[bookId]/pages/new">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);
  const media = await getDb().media.findMany({
    where: { bookId: book.id, type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, alt: true },
  });
  const t = pageTypeSchema.safeParse((await searchParams).type);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${book.id}/pages`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Pages
      </Link>
      <h1 className="text-2xl font-semibold">Add Page</h1>
      <p className="-mt-3 text-sm text-slate-500">The page is added at the end. You can reorder it afterwards.</p>
      <PageForm
        mode="create"
        bookId={book.id}
        media={media}
        initialType={t.success ? t.data : undefined}
        cancelHref={`/admin/books/${book.id}/pages`}
      />
    </div>
  );
}
