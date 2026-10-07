import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { PageTypeBadge, PagePublishedBadge } from "@/components/admin/page-ui";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { setBookVisibilityAction } from "@/actions/books";
import { assignBookThemeAction } from "@/actions/themes";
import { SOFT_BLUSH } from "@/lib/themes/defaults";
import { Visibility } from "@/generated/prisma/enums";
import { buildChecklist } from "@/lib/books/checklist";
import { DeleteBookButton } from "@/components/admin/delete-book-button";
import { ArchiveButton } from "@/components/admin/archive-button";
import { StatusActionButton } from "@/components/admin/status-form";
import {
  STATUS_LABEL, StatusBadge, VISIBILITY_HELP, VISIBILITY_LABEL, VisibilityBadge, btnPrimary, btnSecondary,
} from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Memory Book" };

export default async function BookDetailPage({ params }: PageProps<"/admin/books/[bookId]">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  const now = new Date();
  const [total, published, firstPages, images, music, activeLinks, photoNoImage] = await Promise.all([
    getDb().memoryPage.count({ where: { bookId: book.id } }),
    getDb().memoryPage.count({ where: { bookId: book.id, published: true } }),
    getDb().memoryPage.findMany({
      where: { bookId: book.id },
      orderBy: { order: "asc" },
      take: 5,
      select: { id: true, order: true, type: true, title: true, published: true },
    }),
    getDb().media.count({ where: { bookId: book.id, type: "IMAGE" } }),
    getDb().music.findUnique({ where: { bookId: book.id }, select: { name: true, enabled: true } }),
    getDb().shareLink.count({ where: { bookId: book.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    getDb().memoryPage.count({ where: { bookId: book.id, type: "PHOTO", mediaId: null } }),
  ]);

  const themes = await getDb().theme.findMany({
    where: { OR: [{ ownerId: user.id }, { ownerId: null, isPreset: true }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const themeName = themes.find((t) => t.id === book.themeId)?.name ?? SOFT_BLUSH.name;
  const checklist = buildChecklist({
    details: {
      title: book.title, recipientName: book.recipientName, senderName: book.senderName, occasion: book.occasion,
      slug: book.slug, coverTitle: book.coverTitle, hasDate: !!book.date,
    },
    status: book.status,
    pages: { total, published },
    photoPagesWithoutImage: photoNoImage,
    themeName,
    music: { configured: !!music, enabled: !!music?.enabled },
    activeShareLinks: activeLinks,
  });
  const doneCount = checklist.filter((c) => c.done).length;
  const base = `/admin/books/${book.id}`;
  const workspace: Array<{ label: string; href: string; hint: string }> = [
    { label: "Edit book", href: `${base}/edit`, hint: "Names, date, cover, slug" },
    { label: "Pages", href: `${base}/pages`, hint: "Add, order and publish pages" },
    { label: "Media library", href: `${base}/media`, hint: "Upload and reuse images" },
    { label: "Music", href: `${base}/music`, hint: "Optional background track" },
    { label: "Theme", href: "#theme", hint: "Colours, fonts and style" },
    { label: "Preview", href: `/preview/${book.id}`, hint: "See it as the owner, drafts included" },
    { label: "Share", href: `${base}/share`, hint: "Private links for the recipient" },
  ];

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

      <nav aria-label="Workspace" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {workspace.map((w) => (
          <Link
            key={w.label}
            href={w.href}
            {...(w.label === "Preview" ? { target: "_blank", rel: "noopener" } : {})}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <span className="block text-sm font-semibold text-slate-900">{w.label}{w.label === "Preview" ? " ↗" : ""}</span>
            <span className="mt-1 block text-xs text-slate-500">{w.hint}</span>
          </Link>
        ))}
      </nav>

      <section aria-label="Status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Pages", `${total} total`, `${published} published · ${total - published} ${total - published === 1 ? "draft" : "drafts"}`],
          ["Media", `${images} ${images === 1 ? "image" : "images"}`, "in this book’s library"],
          ["Music", music ? (music.enabled ? "Enabled" : "Disabled") : "Not set", "optional"],
          ["Book", STATUS_LABEL[book.status], `${VISIBILITY_LABEL[book.visibility]} · ${activeLinks} active ${activeLinks === 1 ? "link" : "links"}`],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="mt-0.5 text-lg font-semibold">{v}</div>
            <div className="text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </section>

      <section aria-label="Production checklist" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Production checklist</h2>
        <p className="mt-1 text-sm text-slate-500">
          {doneCount} of {checklist.length} done. This is a guide only; nothing here stops you from publishing.
        </p>
        <ul className="mt-4 space-y-2">
          {checklist.map((c) => (
            <li key={c.key} className="flex items-start gap-3 text-sm" data-check={c.key} data-done={c.done}>
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${c.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
              >
                {c.done ? "✓" : ""}
              </span>
              <span>
                <span className="font-medium text-slate-900">{c.label}</span>
                {c.optional && <span className="text-slate-400"> (optional)</span>}
                <span className="sr-only">{c.done ? " — done" : " — not done"}</span>
                <span className="block text-xs text-slate-500">{c.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

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

      <section id="theme" aria-label="Theme" className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-1 text-base font-semibold">Theme</h2>
        <p className="mb-4 text-sm text-slate-500">
          Controls how the public story looks. Without a theme, {SOFT_BLUSH.name} is used.{" "}
          <Link href="/admin/themes" className="text-indigo-700 underline">Manage themes</Link>
        </p>
        <form action={assignBookThemeAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="bookId" value={book.id} />
          <label htmlFor="themeId" className="sr-only">Theme</label>
          <select id="themeId" name="themeId" defaultValue={book.themeId ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">{SOFT_BLUSH.name} (default)</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>Apply theme</button>
        </form>
      </section>


      <section aria-label="Danger zone" className="rounded-2xl border border-red-200 bg-red-50/40 p-5 md:p-6">
        <h2 className="text-base font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">
          Archiving hides a book and can be undone. Deleting permanently removes the book, its pages, images, music and share links for good.
        </p>
        <div className="mt-4">
          <DeleteBookButton
            bookId={book.id}
            title={book.title}
            published={book.status === "PUBLISHED"}
            counts={{ pages: total, media: images, music: !!music, links: activeLinks }}
          />
        </div>
      </section>
    </div>
  );
}
