import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedPageOrNotFound } from "@/lib/pages/server";
import { readConfig } from "@/lib/pages/registry";
import { getDb } from "@/lib/db";
import { PageForm } from "@/components/admin/page-form";

export const metadata: Metadata = { title: "Edit Page" };

export default async function EditPagePage({ params }: PageProps<"/admin/books/[bookId]/pages/[pageId]/edit">) {
  const user = await requireAdmin();
  const { bookId, pageId } = await params;
  const page = await getOwnedPageOrNotFound(user.id, bookId, pageId);
  const media = await getDb().media.findMany({
    where: { bookId: page.bookId, type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, alt: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${page.bookId}/pages`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Pages
      </Link>
      <h1 className="text-2xl font-semibold">Edit Page {page.order}</h1>
      <PageForm
        mode="edit"
        bookId={page.bookId}
        pageId={page.id}
        media={media}
        cancelHref={`/admin/books/${page.bookId}/pages`}
        initial={{
          type: page.type,
          title: page.title ?? "",
          subtitle: page.subtitle ?? "",
          body: page.body ?? "",
          caption: page.caption ?? "",
          signature: readConfig(page.type, page.config).signature ?? "",
          mediaId: page.mediaId ?? "",
          photoLayout: page.photoLayout,
          transition: page.transition,
          published: page.published,
        }}
      />
    </div>
  );
}
