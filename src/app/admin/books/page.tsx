import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Memory Books" };

export default async function BooksPage() {
  const user = await requireAdmin();
  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, recipientName: true, status: true, visibility: true, updatedAt: true },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Memory Books</h1>
        <Link
          href="/admin/books/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Create Memory Book
        </Link>
      </div>

      {books.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No memory books yet.</p>
        </section>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {books.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{b.title}</div>
                <div className="truncate text-sm text-slate-500">For {b.recipientName}</div>
              </div>
              <div className="shrink-0 text-xs text-slate-600">
                {b.status} · {b.visibility}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
