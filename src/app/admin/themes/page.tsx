import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { resolveTheme } from "@/lib/themes/resolve";
import { SOFT_BLUSH } from "@/lib/themes/defaults";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/themes/fonts";
import type { ResolvedTheme } from "@/lib/themes/resolve";
import { btnPrimary, btnSecondary } from "@/components/admin/book-ui";

export const metadata: Metadata = { title: "Themes" };

function Swatches({ t }: { t: ResolvedTheme }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[t.background, t.surface, t.text, t.accent, t.accentMuted].map((c, i) => (
        <span key={i} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: c }} />
      ))}
    </div>
  );
}

export default async function ThemesPage() {
  const user = await requireAdmin();
  const [themes, defaultCount] = await Promise.all([
    getDb().theme.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { books: true } } } }),
    getDb().memoryBook.count({ where: { ownerId: user.id, themeId: null } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Themes</h1>
          <p className="mt-1 text-sm text-slate-500">Colors, fonts and spacing for your public stories. Assign a theme from a book&rsquo;s page.</p>
        </div>
        <Link href="/admin/themes/new" className={btnPrimary}>New Theme</Link>
      </div>

      <ul className="space-y-3">
        <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <p className="font-medium">{SOFT_BLUSH.name} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">Built-in default</span></p>
            <Swatches t={SOFT_BLUSH} />
            <p className="text-xs text-slate-500">Used by {defaultCount} {defaultCount === 1 ? "book" : "books"} with no theme assigned. Not editable.</p>
          </div>
          <Link href="/admin/themes/new" className={btnSecondary}>Duplicate as new theme</Link>
        </li>
        {themes.map((row) => {
          const t = resolveTheme(row);
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0 space-y-2">
                <p className="truncate font-medium">{t.name}</p>
                <Swatches t={t} />
                <p className="text-xs text-slate-500">
                  {HEADING_FONTS[t.headingFont].label} + {BODY_FONTS[t.bodyFont].label.split(" (")[0]} · used by {row._count.books} {row._count.books === 1 ? "book" : "books"}
                </p>
              </div>
              <Link href={`/admin/themes/${row.id}/edit`} className={btnSecondary}>Edit &amp; preview</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
