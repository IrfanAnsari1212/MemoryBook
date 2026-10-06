import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "@/actions/auth";
import { SidebarNav } from "@/components/admin/sidebar-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Authoritative server-side authorization for every /admin route.
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 px-3 text-base font-semibold">MemoryLetter</div>
        <SidebarNav orientation="vertical" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <span className="text-sm font-semibold md:hidden">MemoryLetter</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="max-w-[40vw] truncate text-sm text-slate-600" title={user.email}>
              {user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white md:hidden">
          <SidebarNav orientation="horizontal" />
        </div>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
