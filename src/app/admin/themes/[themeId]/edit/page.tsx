import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { resolveTheme } from "@/lib/themes/resolve";
import { idSchema } from "@/lib/validations/book";
import { ThemeEditor } from "@/components/themes/theme-editor";

export const metadata: Metadata = { title: "Edit Theme" };

export default async function EditThemePage({ params }: PageProps<"/admin/themes/[themeId]/edit">) {
  const user = await requireAdmin();
  const id = idSchema.safeParse((await params).themeId);
  if (!id.success) notFound();
  // Only the owner's own themes: another owner's (or a missing) theme is a 404.
  const row = await getDb().theme.findFirst({ where: { id: id.data, ownerId: user.id } });
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/themes" className="text-sm text-slate-500 hover:text-slate-800">← Themes</Link>
      <h1 className="text-2xl font-semibold">Edit Theme</h1>
      <ThemeEditor mode="edit" themeId={row.id} initial={resolveTheme(row)} />
    </div>
  );
}
