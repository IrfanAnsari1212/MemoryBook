import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/utils/format";
import { ArchiveButton } from "@/components/admin/archive-button";
import { StatusActionButton } from "@/components/admin/status-form";
import { StatusBadge, VisibilityBadge, btnPrimary, btnSecondary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Memory Books" };

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const WHERE: Record<FilterKey, Prisma.MemoryBookWhereInput> = {
  active: { status: { in: ["DRAFT", "PUBLISHED"] } },
  published: { status: "PUBLISHED" },
  draft: { status: "DRAFT" },
  archived: { status: "ARCHIVED" },
  all: {},
};

export default async function BooksPage({ searchParams }: PageProps<"/admin/books">) {
  const user = await requireAdmin();
  const raw = (await searchParams).status;
  const filter: FilterKey = FILTERS.some((f) => f.key === raw) ? (raw as FilterKey) : "active";

  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id, ...WHERE[filter] },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, title: true, recipientName: true, occasion: true, date: true,
      status: true, visibility: true, updatedAt: true,
      _count: { select: { pages: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Memory Books</h1>
        <Link href="/admin/books/new" className={btnPrimary}>
          Create Memory Book
        </Link>
      </div>

      <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "active" ? "/admin/books" : `/admin/books?status=${f.key}`}
            aria-current={f.key === filter ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              f.key === filter ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {books.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">
            {filter === "active" || filter === "all" ? "No memory books yet." : "No memory books match this filter."}
          </p>
          {(filter === "active" || filter === "all") && (
            <Link href="/admin/books/new" className={`${btnPrimary} mt-4`}>
              Create Memory Book
            </Link>
          )}
        </section>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {books.map((b) => (
            <li key={b.id} className="space-y-3 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/books/${b.id}`} className="block truncate font-medium text-slate-900 hover:text-indigo-700">
                    {b.title}
                  </Link>
                  <p className="truncate text-sm text-slate-500">
                    For {b.recipientName} · {b.occasion} · {formatDate(b.date)} · {b._count.pages} {b._count.pages === 1 ? "page" : "pages"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  <VisibilityBadge visibility={b.visibility} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Updated {formatDate(b.updatedAt)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/books/${b.id}`} className={btnSecondary}>Open</Link>
                  <Link href={`/admin/books/${b.id}/edit`} className={btnSecondary}>Edit</Link>
                  <StatusActionButton bookId={b.id} status={b.status} />
                  {b.status !== "ARCHIVED" && <ArchiveButton bookId={b.id} title={b.title} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
