import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { BookIndex } from "@/components/admin/book-index";

export const metadata: Metadata = { title: "Preview" };
export const dynamic = "force-dynamic";

/** Owner preview is per book (and includes draft pages). Nothing here is public. */
export default async function PreviewIndexPage() {
  const user = await requireAdmin();
  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, _count: { select: { pages: true } } },
  });
  return (
    <BookIndex
      title="Preview"
      intro="See a book exactly as visitors will, including pages that are still drafts. Only you can open a preview, and it does not publish anything."
      emptyHint="Create a memory book and add pages to preview it."
      items={books.map((b) => ({
        key: b.id, title: b.title, href: `/preview/${b.id}`, action: "Open preview", external: true,
        detail: `${b.status === "PUBLISHED" ? "Published" : "Draft"} · ${b._count.pages} ${b._count.pages === 1 ? "page" : "pages"}`,
      }))}
    />
  );
}
