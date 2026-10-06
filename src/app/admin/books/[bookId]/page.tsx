import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { PageTypeBadge, PagePublishedBadge } from "@/components/admin/page-ui";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { setBookVisibilityAction } from "@/actions/books";
import { Visibility } from "@/generated/prisma/enums";
import { ArchiveButton } from "@/components/admin/archive-button";
import { StatusActionButton } from "@/components/admin/status-form";
import {
  StatusBadge, VISIBILITY_HELP, VISIBILITY_LABEL, VisibilityBadge, btnPrimary, btnSecondary,
} from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Memory Book" };

const LATER = [
  { label: "Preview", module: 6 },
  { label: "Share", module: 9 },
];

export default async function BookDetailPage({ params }: PageProps<"/admin/books/[bookId]">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  const [total, published, firstPages] = await Promise.all([
    getDb().memoryPage.count({ where: { bookId: book.id } }),
    getDb().memoryPage.count({ where: { bookId: book.id, published: true } }),
    getDb().memoryPage.findMany({
      where: { bookId: book.id },
      orderBy: { order: "asc" },
      take: 5,
      select: { id: true, order: true, type: true, title: true, published: true },
    }),
  ]);

  const rows: Array<[string, string]> = [
    ["Recipient", book.recipientName],
    ["Sender", book.senderName],
    ["Occasion", book.occasion],
    ["Date", formatDate(book.date)],
    ["Slug", book.slug],
    ["Cover title", book.coverTitle],
    ["Cover subtitle", book.coverSubtitle ?? "—"],
    ["Created", formatDateTime(book.createdAt)],
    ["Last updated", formatDateTime(book.updatedAt)],
    ["Published", book.publishedAt ? formatDateTime(book.publishedAt) : "—"],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/books" className="text-sm text-slate-500 hover:text-slate-800">
        ← Memory Books
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-semibold">{book.title}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={book.status} />
            <VisibilityBadge visibility={book.visibility} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/books/${book.id}/edit`} className={btnPrimary}>Edit</Link>
          <StatusActionButton bookId={book.id} status={book.status} />
          {book.status !== "ARCHIVED" && <ArchiveButton bookId={book.id} title={book.title} />}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold">Details</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="break-words text-sm text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Pages" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Pages</h2>
            <p className="mt-1 text-sm text-slate-500">
              {total} total · {published} published · {total - published} {total - published === 1 ? "draft" : "drafts"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/books/${book.id}/pages/new`} className={btnPrimary}>Add Page</Link>
            <Link href={`/admin/books/${book.id}/pages`} className={btnSecondary}>Manage Pages</Link>
            <Link href={`/admin/books/${book.id}/media`} className={btnSecondary}>Media Library</Link>
          </div>
        </div>
        {firstPages.length > 0 && (
          <ol className="mt-4 divide-y divide-slate-100">
            {firstPages.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-6 text-sm font-semibold tabular-nums text-slate-400">{p.order}</span>
                <Link href={`/admin/books/${book.id}/pages/${p.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-indigo-700">
                  {p.title || "Untitled page"}
                </Link>
                <PageTypeBadge type={p.type} />
                <PagePublishedBadge published={p.published} />
              </li>
            ))}
            {total > firstPages.length && (
              <li className="pt-2 text-xs text-slate-500">and {total - firstPages.length} more…</li>
            )}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-1 text-base font-semibold">Visibility</h2>
        <p className="mb-4 text-sm text-slate-500">{VISIBILITY_HELP[book.visibility]}</p>
        <form action={setBookVisibilityAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="bookId" value={book.id} />
          <label htmlFor="visibility" className="sr-only">Visibility</label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={book.visibility}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {Object.values(Visibility).map((o) => (
              <option key={o} value={o}>{VISIBILITY_LABEL[o]}</option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>Update visibility</button>
        </form>
      </section>

      <section aria-label="Upcoming features" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LATER.map((l) => (
          <div key={l.label} className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <div className="text-sm font-medium text-slate-900">{l.label}</div>
            <div className="mt-1 text-xs text-slate-500">Coming in Module {l.module}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
