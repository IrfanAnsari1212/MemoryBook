import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedPageOrNotFound } from "@/lib/pages/server";
import { PAGE_TYPES, PHOTO_LAYOUT_LABEL, TRANSITION_LABEL, readConfig } from "@/lib/pages/registry";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/utils/format";
import { PagePublishedBadge, PageTypeBadge } from "@/components/admin/page-ui";
import { btnPrimary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Page" };

/** Plain stored-content preview. The animated public renderer is a later module. */
export default async function PageDetailPage({ params }: PageProps<"/admin/books/[bookId]/pages/[pageId]">) {
  const user = await requireAdmin();
  const { bookId, pageId } = await params;
  const page = await getOwnedPageOrNotFound(user.id, bookId, pageId);
  const def = PAGE_TYPES[page.type];
  const { signature } = readConfig(page.type, page.config);
  const media = page.mediaId
    ? await getDb().media.findFirst({ where: { id: page.mediaId, bookId: page.bookId }, select: { url: true, alt: true } })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${page.bookId}/pages`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Pages
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Page {page.order}</h1>
          <PageTypeBadge type={page.type} />
          <PagePublishedBadge published={page.published} />
        </div>
        <Link href={`/admin/books/${page.bookId}/pages/${page.id}/edit`} className={btnPrimary}>Edit</Link>
      </div>

      <section aria-label="Content preview" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        {page.title && <h2 className="break-words text-xl font-semibold">{page.title}</h2>}
        {page.subtitle && <p className="break-words text-slate-500">{page.subtitle}</p>}
        {media && (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl">
            <Image src={media.url} alt={media.alt ?? ""} fill sizes="384px" className="object-cover" />
          </div>
        )}
        {page.caption && <p className="text-center text-sm italic text-slate-500">{page.caption}</p>}
        {/* Rendered as text (React-escaped); whitespace-pre-wrap preserves paragraphs and line breaks. */}
        {page.body && <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">{page.body}</p>}
        {signature && <p className="pt-2 text-right font-medium text-slate-700">— {signature}</p>}
        {!page.title && !page.subtitle && !page.body && !page.caption && !media && (
          <p className="text-sm text-slate-400">This page has no content yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold">Settings</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[
            ["Type", def.label],
            ["Order", String(page.order)],
            ["Transition", TRANSITION_LABEL[page.transition]],
            ["Photo layout", def.fields.includes("photoLayout") ? PHOTO_LAYOUT_LABEL[page.photoLayout] : "—"],
            ["Updated", formatDateTime(page.updatedAt)],
            ["Created", formatDateTime(page.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-sm text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
