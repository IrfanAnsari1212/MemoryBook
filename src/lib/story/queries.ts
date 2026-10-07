import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { PAGE_TYPES, readConfig } from "@/lib/pages/registry";
import { SLUG_PATTERN } from "@/lib/validations/book";
import { PUBLIC_STATUS, PUBLIC_VISIBILITIES } from "./config";
import { isAllowedImageUrl, normalizePhotoLayout, normalizeTransition } from "./normalize";
import { resolveTheme } from "@/lib/themes/resolve";
import type { PublicStory, StoryPage } from "./types";

/**
 * Load a story for public viewing, or null if it may not be shown. Eligibility is enforced IN the
 * query (published + public/unlisted), so ineligible books never leave the database. One query
 * loads the book, its published pages (ordered by `order`) and each page's media.
 * Wrapped in React `cache` so generateMetadata and the page share one lookup per request.
 */
export const getPublicStory = cache(async (slug: string): Promise<PublicStory | null> => {
  if (slug.length > 80 || !SLUG_PATTERN.test(slug)) return null;

  const book = await getDb().memoryBook.findFirst({
    where: { slug, status: PUBLIC_STATUS, visibility: { in: [...PUBLIC_VISIBILITIES] } },
    select: {
      id: true,
      title: true,
      recipientName: true,
      coverTitle: true,
      coverSubtitle: true,
      date: true,
      theme: { select: { name: true, background: true, foreground: true, accent: true, card: true, headingFont: true, bodyFont: true, accentFont: true, config: true } },
      pages: {
        where: { published: true },
        orderBy: { order: "asc" },
        select: {
          type: true,
          title: true,
          subtitle: true,
          body: true,
          caption: true,
          transition: true,
          photoLayout: true,
          config: true,
          media: { select: { bookId: true, url: true, alt: true, width: true, height: true } },
        },
      },
    },
  });
  if (!book) return null;

  // Validated field by field; a missing or damaged theme falls back to Soft Blush.
  const theme = resolveTheme(book.theme);

  const pages: StoryPage[] = book.pages.map((p, i) => {
    const fields = PAGE_TYPES[p.type].fields; // the Module 4 registry decides what each type may show
    const has = (f: (typeof fields)[number]) => fields.includes(f);
    // Media must belong to THIS book and come from the Cloudinary host, otherwise it is dropped.
    const media = has("media") && p.media && p.media.bookId === book.id && isAllowedImageUrl(p.media.url) ? p.media : null;
    return {
      order: i + 1,
      type: p.type,
      title: has("title") ? p.title : null,
      subtitle: has("subtitle") ? p.subtitle : null,
      body: has("body") ? p.body : null,
      caption: has("caption") ? p.caption : null,
      signature: has("signature") ? (readConfig(p.type, p.config).signature ?? null) : null,
      transition: normalizeTransition(p.transition),
      photoLayout: normalizePhotoLayout(p.photoLayout),
      media: media ? { url: media.url, alt: media.alt, width: media.width, height: media.height } : null,
    };
  });

  const dateLabel = book.date
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(book.date)
    : null;

  return {
    book: {
      title: book.title,
      recipientName: book.recipientName,
      cover: { title: book.coverTitle, subtitle: book.coverSubtitle, dateLabel },
      theme,
    },
    pages,
  };
});
