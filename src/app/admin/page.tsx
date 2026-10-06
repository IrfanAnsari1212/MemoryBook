import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireAdmin();

  const grouped = await getDb().memoryBook.groupBy({
    by: ["status"],
    where: { ownerId: user.id },
    _count: { _all: true },
  });
  const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const published = count("PUBLISHED");
  const draft = count("DRAFT");
  const archived = count("ARCHIVED");
  const total = published + draft + archived;
  const pageCount = await getDb().memoryPage.count({ where: { book: { ownerId: user.id } } });

  const stats = [
    { label: "Total Books", value: total },
    { label: "Published", value: published },
    { label: "Draft", value: draft },
    { label: "Archived", value: archived },
    { label: "Total Pages", value: pageCount },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {total === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No memory books yet.</p>
          <Link
            href="/admin/books/new"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Create Memory Book
          </Link>
        </section>
      ) : (
        <section aria-label="Statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="mt-2 text-3xl font-semibold">{s.value}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
