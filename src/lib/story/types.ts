import type { PageType, PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import type { ResolvedTheme } from "@/lib/themes/resolve";

/**
 * The public data contract: only what the renderer needs. No database ids, no owner data,
 * no raw `config` JSON, no timestamps. Client-safe (types only).
 */
export type StoryMedia = {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type StoryPage = {
  /** 1-based position among the published pages; also used as the React key (no ids are exposed). */
  order: number;
  type: PageType;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  caption: string | null;
  signature: string | null;
  transition: TransitionType;
  photoLayout: PhotoLayout;
  media: StoryMedia | null;
};

/** A validated, safe theme (see lib/themes). Never raw database values. */
export type StoryTheme = ResolvedTheme;

export type PublicStory = {
  book: {
    title: string;
    recipientName: string;
    /** Cover screen content, all from the book record (never hardcoded). */
    cover: { title: string; subtitle: string | null; dateLabel: string | null };
    theme: StoryTheme;
  };
  pages: StoryPage[];
};
