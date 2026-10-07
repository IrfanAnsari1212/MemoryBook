import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { btnSecondary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Share" };
export const dynamic = "force-dynamic";

/** Share links are per book; this page routes to each book's share screen. */
export default async function ShareIndexPage() {
  const user = await requireAdmin();
  const now = new Date();
  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { shareLinks: { where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Share</h1>
      {books.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No memory books yet.</p>
          <p className="mt-1 text-sm text-slate-500">Create and publish a memory book, then share it from here.</p>
        </section>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {books.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="text-sm text-slate-500">
                  {b.status === "PUBLISHED" ? `${b._count.shareLinks} active ${b._count.shareLinks === 1 ? "link" : "links"}` : "Draft: publish to share"}
                </p>
              </div>
              <Link href={`/admin/books/${b.id}/share`} className={btnSecondary}>Manage links</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
