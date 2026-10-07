import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/utils/format";
import { shareState, type ShareState } from "@/lib/share/policy";
import { ShareCreateForm } from "@/components/admin/share-create-form";
import { RevokeShareButton } from "@/components/admin/revoke-share-button";

export const metadata: Metadata = { title: "Share" };
export const dynamic = "force-dynamic";

const STATE_STYLE: Record<ShareState, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  revoked: "bg-slate-100 text-slate-600 ring-slate-500/20",
  expired: "bg-amber-50 text-amber-700 ring-amber-600/20",
};
const STATE_LABEL: Record<ShareState, string> = { active: "Active", revoked: "Revoked", expired: "Expired" };

export default async function SharePage({ params }: PageProps<"/admin/books/[bookId]/share">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  // Scoped to the owned book. Token hashes are never selected, so they can't reach the page.
  const links = await getDb().shareLink.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, expiresAt: true, revokedAt: true, createdAt: true },
  });
  const now = new Date();
  const origin = new URL(getEnv().NEXT_PUBLIC_APP_URL).origin;
  const localhostInProd = process.env.NODE_ENV === "production" && /^(localhost|127\.|\[::1\])/.test(new URL(origin).hostname);
  const published = book.status === "PUBLISHED";
  const activeCount = links.filter((l) => shareState(l, now) === "active").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${book.id}`} className="text-sm text-slate-500 hover:text-slate-800">← {book.title}</Link>
      <div>
        <h1 className="text-2xl font-semibold">Share Links</h1>
        <p className="mt-1 text-sm text-slate-500">
          Anyone with a link can open this memory book, even if its visibility is Private. Each link can expire and be revoked on its own.
          Links open at <span className="font-mono">{origin}</span>.
        </p>
      </div>

      <ol className="grid gap-2 text-sm sm:grid-cols-4" aria-label="How sharing works">
        {[["1", "Publish the book", published], ["2", "Create a link below", activeCount > 0], ["3", "Copy it right away", false], ["4", "Send it to the recipient", false]].map(([n, t, done]) => (
          <li key={String(n)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="mr-2 font-semibold text-indigo-700">{n}</span>{t}{done ? " ✓" : ""}
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
        A link is shown <strong>only once</strong>, when you create it. We store just a one-way fingerprint of it, never the link itself, so it can&rsquo;t be shown again.
      </p>

      {localhostInProd && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The application URL is still set to localhost. Set <span className="font-mono">NEXT_PUBLIC_APP_URL</span> to your real address before sharing links.
        </p>
      )}
      {!published && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This book is {book.status === "ARCHIVED" ? "archived" : "a draft"}. Links only work while it is <strong>published</strong>, so you can create them once it is.
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold">New link</h2>
        <ShareCreateForm bookId={book.id} canCreate={published} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-1 text-base font-semibold">Your links</h2>
        <p className="mb-4 text-sm text-slate-500">{activeCount} active · {links.length} total</p>
        {links.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No share links yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {links.map((l) => {
              const st = shareState(l, now);
              const name = l.label ?? "Untitled link";
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{name}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATE_STYLE[st]}`}>{STATE_LABEL[st]}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {formatDateTime(l.createdAt)} · Expires: {l.expiresAt ? formatDateTime(l.expiresAt) : "Never"}
                      {l.revokedAt ? ` · Revoked ${formatDateTime(l.revokedAt)}` : ""}
                    </p>
                  </div>
                  {st === "active" && <RevokeShareButton bookId={book.id} linkId={l.id} label={name} />}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Links are stored only as a one-way hash, so an existing link can&rsquo;t be displayed again. Copy a link when you create it.
        </p>
      </section>
    </div>
  );
}
