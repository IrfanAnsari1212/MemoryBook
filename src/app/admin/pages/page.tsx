import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { BookIndex } from "@/components/admin/book-index";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

/** Pages belong to a book; this page routes to each book's page builder. */
export default async function PagesIndexPage() {
  const user = await requireAdmin();
  const books = await getDb().memoryBook.findMany({
    where: { ownerId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, pages: { select: { published: true } } },
  });
  return (
    <BookIndex
      title="Pages"
      intro="Pages are managed inside each memory book. Choose a book to add, order and publish its pages."
      emptyHint="Create a memory book first, then add its pages."
      items={books.map((b) => {
        const pub = b.pages.filter((p) => p.published).length;
        return {
          key: b.id, title: b.title, href: `/admin/books/${b.id}/pages`, action: "Manage pages",
          detail: `${b.pages.length} total · ${pub} published · ${b.pages.length - pub} ${b.pages.length - pub === 1 ? "draft" : "drafts"}`,
        };
      })}
    />
  );
}
