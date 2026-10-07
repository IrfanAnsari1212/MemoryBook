import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { SOFT_BLUSH } from "@/lib/themes/defaults";
import { ThemeEditor } from "@/components/themes/theme-editor";

export const metadata: Metadata = { title: "New Theme" };

export default async function NewThemePage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/themes" className="text-sm text-slate-500 hover:text-slate-800">← Themes</Link>
      <h1 className="text-2xl font-semibold">New Theme</h1>
      <ThemeEditor mode="create" initial={{ ...SOFT_BLUSH, name: "" }} />
    </div>
  );
}
