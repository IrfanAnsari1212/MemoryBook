import type { ComponentType, ReactNode } from "react";
import type { PageType } from "@/generated/prisma/enums";
import type { StoryPage } from "@/lib/story/types";
import { PhotoFrame } from "./photo-frame";
import { Rule, StoryBody, StorySignature, StorySubtitle, StoryTitle } from "./story-text";

export type PageViewProps = { page: StoryPage; priority: boolean };

const altFor = (p: StoryPage) => p.media?.alt || p.caption || p.title || "Photo from this memory book";

const Column = ({ type, children, center = false }: { type: string; children: ReactNode; center?: boolean }) => (
  <article data-page-type={type} className={`story-page ${center ? "story-page-center" : ""}`}>
    {children}
  </article>
);

const Caption = ({ text }: { text: string | null }) => (text ? <p className="story-caption story-script">{text}</p> : null);

/** TEXT: a calm, typographic page. */
export function TextPage({ page }: PageViewProps) {
  return (
    <Column type="TEXT">
      <Rule />
      <StoryTitle text={page.title} />
      <StorySubtitle text={page.subtitle} />
      <StoryBody text={page.body} />
    </Column>
  );
}

/** MEMORY: photo first, then the story told around it. */
export function MemoryPage({ page, priority }: PageViewProps) {
  return (
    <Column type="MEMORY">
      <figure className="story-figure">
        <PhotoFrame layout={page.photoLayout} media={page.media} alt={altFor(page)} priority={priority} />
        {page.media && page.caption && <figcaption><Caption text={page.caption} /></figcaption>}
      </figure>
      {!page.media && <Rule />}
      <StoryTitle text={page.title} />
      <StorySubtitle text={page.subtitle} />
      {!page.media && <Caption text={page.caption} />}
      <StoryBody text={page.body} />
    </Column>
  );
}

/** PHOTO: visual first, minimal text. */
export function PhotoPage({ page, priority }: PageViewProps) {
  return (
    <Column type="PHOTO" center>
      <figure className="story-figure story-figure-center">
        <PhotoFrame layout={page.photoLayout} media={page.media} alt={altFor(page)} priority={priority} />
        {page.media && page.caption && <figcaption><Caption text={page.caption} /></figcaption>}
      </figure>
      {!page.media && <Rule />}
      <StoryTitle text={page.title} className="story-title-sm" />
      {!page.media && <Caption text={page.caption} />}
    </Column>
  );
}

/** LETTER: a sheet of paper with generous leading and a handwritten signature. */
export function LetterPage({ page }: PageViewProps) {
  return (
    <Column type="LETTER">
      <div className="story-letter">
        <Rule />
        <StoryTitle text={page.title} />
        <StoryBody text={page.body} className="story-prose-letter" />
        <StorySignature text={page.signature} />
      </div>
    </Column>
  );
}

/** FINAL: a quiet, spacious ending. */
export function FinalPage({ page, priority }: PageViewProps) {
  return (
    <Column type="FINAL" center>
      <Rule className="story-rule-wide" />
      <PhotoFrame layout={page.photoLayout} media={page.media} alt={altFor(page)} priority={priority} />
      <StoryTitle text={page.title} size="xl" />
      <StorySubtitle text={page.subtitle} className="story-subtitle-center" />
      <StoryBody text={page.body} className="story-prose-center" />
      <StorySignature text={page.signature} className="story-signature-xl" />
      <Rule className="story-rule-wide" />
    </Column>
  );
}

/** Typed as a full Record: adding a PageType without a view is a compile error. */
export const PAGE_VIEWS: Record<PageType, ComponentType<PageViewProps>> = {
  TEXT: TextPage,
  MEMORY: MemoryPage,
  PHOTO: PhotoPage,
  LETTER: LetterPage,
  FINAL: FinalPage,
};
