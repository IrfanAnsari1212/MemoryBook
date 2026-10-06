import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/utils/format";
import { PageList } from "@/components/admin/page-list";
import { btnPrimary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage({ params }: PageProps<"/admin/books/[bookId]/pages">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);
  const pages = await getDb().memoryPage.findMany({
    where: { bookId: book.id },
    orderBy: { order: "asc" },
    select: { id: true, type: true, title: true, published: true, updatedAt: true },
  });
  const items = pages.map((p) => ({ ...p, updatedAt: formatDate(p.updatedAt) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/admin/books/${book.id}`} className="text-sm text-slate-500 hover:text-slate-800">
        ← {book.title}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pages.length} {pages.length === 1 ? "page" : "pages"} · drag to reorder. A story usually works well with 5–20 pages.
          </p>
        </div>
        <Link href={`/admin/books/${book.id}/pages/new`} className={btnPrimary}>
          Add Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No pages yet.</p>
          <Link href={`/admin/books/${book.id}/pages/new`} className={`${btnPrimary} mt-4`}>
            Add Page
          </Link>
        </section>
      ) : (
        <PageList
          key={pages.map((p) => `${p.id}:${p.published}:${p.updatedAt.getTime()}`).join("|")}
          bookId={book.id}
          initialItems={items}
        />
      )}
    </div>
  );
}
