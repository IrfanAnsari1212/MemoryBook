import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { PageForm } from "@/components/admin/page-form";
import { pageTypeSchema } from "@/lib/validations/page";
import { resolveTheme } from "@/lib/themes/resolve";

export const metadata: Metadata = { title: "Add Page" };

export default async function NewPagePage({ params, searchParams }: PageProps<"/admin/books/[bookId]/pages/new">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);
  const media = await getDb().media.findMany({
    where: { bookId: book.id, type: "IMAGE" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, alt: true, originalFilename: true, width: true, height: true },
  });
  const t = pageTypeSchema.safeParse((await searchParams).type);
  const theme = resolveTheme(book.themeId ? await getDb().theme.findFirst({ where: { id: book.themeId } }) : null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${book.id}/pages`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Pages
      </Link>
      <h1 className="text-2xl font-semibold">Add Page</h1>
      <p className="-mt-3 text-sm text-slate-500">The page is added at the end. You can reorder it afterwards.</p>
      <PageForm
        mode="create"
        bookId={book.id}
        media={media}
        initialType={t.success ? t.data : undefined}
        themeDefaults={{ transition: theme.defaultTransition, photoLayout: theme.defaultPhotoLayout }}
        cancelHref={`/admin/books/${book.id}/pages`}
      />
    </div>
  );
}
