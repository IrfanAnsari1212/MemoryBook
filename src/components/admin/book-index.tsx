import Link from "next/link";
import { btnSecondary } from "./book-ui";

export type BookIndexItem = { key: string; title: string; detail: string; href: string; action: string; external?: boolean };

/** Global nav pages whose real work is per book: lists the books and routes to the right workflow. */
export function BookIndex({ title, intro, emptyHint, items }: { title: string; intro: string; emptyHint: string; items: BookIndexItem[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{intro}</p>
      </div>
      {items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No memory books yet.</p>
          <p className="mt-1 text-sm text-slate-500">{emptyHint}</p>
          <Link href="/admin/books/new" className={`${btnSecondary} mt-4`}>Create a memory book</Link>
        </section>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {items.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="truncate text-sm text-slate-500">{b.detail}</p>
              </div>
              <Link href={b.href} className={btnSecondary} {...(b.external ? { target: "_blank", rel: "noopener" } : {})}>{b.action}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
