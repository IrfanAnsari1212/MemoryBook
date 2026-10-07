import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { btnSecondary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Music" };

/** Music is per book (at most one track each); this page routes to each book's music settings. */
export default async function MusicIndexPage() {
  const user = await requireAdmin();
  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, music: { select: { name: true, enabled: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Music</h1>
      {books.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No memory books yet.</p>
          <p className="mt-1 text-sm text-slate-500">Create a memory book first, then add its music.</p>
        </section>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {books.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="truncate text-sm text-slate-500">
                  {b.music ? `${b.music.name}${b.music.enabled ? "" : " (disabled)"}` : "No music"}
                </p>
              </div>
              <Link href={`/admin/books/${b.id}/music`} className={btnSecondary}>Manage music</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
