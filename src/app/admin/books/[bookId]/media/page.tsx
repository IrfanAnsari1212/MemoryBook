import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { formatBytes } from "@/lib/media/config";
import { formatDate } from "@/lib/utils/format";
import { MediaUploader } from "@/components/admin/media-uploader";
import { MediaCard } from "@/components/admin/media-card";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({ params }: PageProps<"/admin/books/[bookId]/media">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  // Scoped to this (owned) book only.
  const media = await getDb().media.findMany({
    where: { bookId: book.id, type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    include: { pages: { select: { order: true }, orderBy: { order: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/admin/books/${book.id}`} className="text-sm text-slate-500 hover:text-slate-800">
        ← {book.title}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Media</h1>
        <p className="mt-1 text-sm text-slate-500">
          {media.length} {media.length === 1 ? "image" : "images"}. Upload here, then pick images when editing pages.
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-slate-600">
          <li>Upload images below. They belong to this book only.</li>
          <li>Open a page and choose an image from this library.</li>
          <li>The same image can be used on several pages.</li>
          <li>An image that a page uses can&rsquo;t be deleted. Remove it from those pages first.</li>
        </ol>
      </div>

      <MediaUploader bookId={book.id} />

      {media.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">No media yet.</p>
          <p className="mt-1 text-sm text-slate-500">Upload your first image above.</p>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <MediaCard
              key={m.id}
              bookId={book.id}
              media={{
                id: m.id,
                url: m.url,
                alt: m.alt,
                caption: m.caption,
                originalFilename: m.originalFilename,
                width: m.width,
                height: m.height,
                sizeLabel: formatBytes(m.bytes),
                format: m.format,
                uploadedLabel: formatDate(m.createdAt),
                usedOnPages: m.pages.map((p) => p.order),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
