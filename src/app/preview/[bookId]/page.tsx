import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getOwnerPreviewStory } from "@/lib/story/queries";
import { StoryScreen } from "@/components/story/story-screen";

export const metadata: Metadata = {
  title: { absolute: "Preview" },
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};
export const dynamic = "force-dynamic";

/**
 * Owner-only preview of a book exactly as the story engine renders it, INCLUDING draft pages and regardless
 * of the book's status or visibility. It is authenticated and ownership-scoped; it creates no link, token or
 * public state, and /m/[slug] and /s/[token] are unaffected.
 */
export default async function PreviewPage({ params }: PageProps<"/preview/[bookId]">) {
  const user = await requireAdmin();
  const { bookId } = await params;
  const story = await getOwnerPreviewStory(user.id, bookId);
  if (!story) notFound();

  const [book, hidden] = await Promise.all([
    getDb().memoryBook.findFirst({ where: { id: bookId, ownerId: user.id }, select: { status: true } }),
    getDb().memoryPage.count({ where: { bookId, published: false, book: { ownerId: user.id } } }),
  ]);

  return (
    <>
      <div
        role="status"
        className="fixed left-2 top-2 z-50 flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg"
        data-owner-preview
      >
        <span className="font-semibold">Owner preview</span>
        <span className="text-slate-300">
          Only you can see this.{book?.status !== "PUBLISHED" ? " The book is not published." : ""}
          {hidden > 0 ? ` Includes ${hidden} draft ${hidden === 1 ? "page" : "pages"} that visitors won’t see.` : ""}
        </span>
        <Link href={`/admin/books/${bookId}`} className="font-medium underline">Back to workspace</Link>
      </div>
      <StoryScreen story={story} />
    </>
  );
}
