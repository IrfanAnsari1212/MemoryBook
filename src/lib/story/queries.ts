import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { PAGE_TYPES, readConfig } from "@/lib/pages/registry";
import { SLUG_PATTERN, idSchema } from "@/lib/validations/book";
import { PUBLIC_STATUS, PUBLIC_VISIBILITIES } from "./config";
import { isAllowedImageUrl, normalizePhotoLayout, normalizeTransition } from "./normalize";
import { resolveTheme } from "@/lib/themes/resolve";
import { getEnv } from "@/lib/env";
import { clampVolume } from "@/lib/music/config";
import { audioMimeFromUrl, isAllowedAudioUrl } from "@/lib/music/url";
import type { PublicStory, StoryPage } from "./types";
import type { Prisma } from "@/generated/prisma/client";
import { hashShareToken, isWellFormedShareToken } from "@/lib/share/token";

/**
 * The single story loader behind every public entry point (/m/[slug] and /s/[token]). The caller supplies
 * the ACCESS rule as a `where`; everything about what gets rendered (published pages in order, media owned
 * by this book, theme, music, cover) is decided here, once, so both routes return the same normalized
 * PublicStory. Ineligible books never leave the database because eligibility is part of the query.
 */
async function loadStory(where: Prisma.MemoryBookWhereInput, opts: { includeUnpublishedPages?: boolean } = {}): Promise<PublicStory | null> {
  const book = await getDb().memoryBook.findFirst({
    where,
    select: {
      id: true,
      title: true,
      recipientName: true,
      coverTitle: true,
      coverSubtitle: true,
      date: true,
      music: { select: { name: true, url: true, enabled: true, volume: true, loop: true } },
      theme: { select: { name: true, background: true, foreground: true, accent: true, card: true, headingFont: true, bodyFont: true, accentFont: true, config: true } },
      pages: {
        // Public callers never pass the option, so only published pages can ever be read for them.
        where: opts.includeUnpublishedPages ? {} : { published: true },
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

  // Music is exposed only when enabled AND its URL still passes the strict Cloudinary-audio allowlist.
  const m = book.music;
  const music =
    m && m.enabled && isAllowedAudioUrl(m.url, getEnv().CLOUDINARY_CLOUD_NAME)
      ? { url: m.url, mime: audioMimeFromUrl(m.url) ?? null, title: m.name, volume: clampVolume(m.volume), loop: m.loop === true }
      : null;

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
    music,
    pages,
  };
}

/**
 * /m/[slug]: the book must be PUBLISHED and PUBLIC or UNLISTED (PRIVATE, DRAFT, ARCHIVED are never public).
 * React `cache` lets generateMetadata and the page share one lookup per request.
 */
export const getPublicStory = cache(async (slug: string): Promise<PublicStory | null> => {
  if (slug.length > 80 || !SLUG_PATTERN.test(slug)) return null;
  return loadStory({ slug, status: PUBLIC_STATUS, visibility: { in: [...PUBLIC_VISIBILITIES] } });
});

/**
 * /s/[token]: possession of a valid token is the access mechanism, so visibility is NOT checked (a PRIVATE
 * or UNLISTED book can be shared). Publication still is: DRAFT and ARCHIVED books stay unreachable, and the
 * link itself must be neither revoked nor expired. The raw token is hashed immediately; the lookup is a
 * single indexed equality on the hash, scoped to the link's own book, so a token can never resolve a
 * different book. Every failure (malformed, unknown, revoked, expired, unpublished) is the same `null`.
 */
export const getSharedStory = cache(async (token: string): Promise<PublicStory | null> => {
  if (!isWellFormedShareToken(token)) return null;
  const now = new Date(); // UTC instant
  return loadStory({
    status: PUBLIC_STATUS,
    shareLinks: {
      some: { tokenHash: hashShareToken(token), revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    },
  });
});

/**
 * Owner preview (/preview/[bookId]): the book must belong to `ownerId` (anyone else gets null, same as a
 * missing book). Status and visibility are ignored and draft pages ARE included, so the owner can see the
 * book as it will look once everything is published. Only the admin preview route calls this; it is never
 * reachable from /m or /s, and it changes nothing about what those routes expose.
 */
export async function getOwnerPreviewStory(ownerId: string, bookId: string): Promise<PublicStory | null> {
  if (!idSchema.safeParse(bookId).success) return null;
  return loadStory({ id: bookId, ownerId }, { includeUnpublishedPages: true });
}
