import type { PhotoLayout } from "@/generated/prisma/enums";
import type { StoryMedia, StoryPage } from "@/lib/story/types";

/** A flat, neutral placeholder "photo" (static SVG defined here; no external image, no user data). */
const svg = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#d9c9bf"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${h * 0.11}" fill="#f1e4d8"/><path d="M0 ${h * 0.78} Q ${w * 0.3} ${h * 0.5} ${w * 0.55} ${h * 0.72} T ${w} ${h * 0.66} V ${h} H0Z" fill="#b9a396"/><path d="M0 ${h * 0.9} Q ${w * 0.4} ${h * 0.7} ${w} ${h * 0.86} V ${h} H0Z" fill="#9d877b"/></svg>`;

const media = (w: number, h: number, alt: string): StoryMedia => ({
  url: `data:image/svg+xml;utf8,${encodeURIComponent(svg(w, h))}`,
  alt,
  width: w,
  height: h,
});

const base = { subtitle: null, body: null, caption: null, signature: null, transition: "FADE" as const, media: null };

/** Generic sample content for the theme preview. Not real story content. */
export function samplePages(layout: PhotoLayout): StoryPage[] {
  return [
    { ...base, order: 1, type: "TEXT", title: "A quiet beginning", subtitle: "Sample subtitle", body: "This is sample text, so you can see how a paragraph reads with this theme.\n\nLine breaks and paragraphs are kept exactly as written.", photoLayout: layout },
    { ...base, order: 2, type: "MEMORY", title: "A small memory", body: "Sample memory text sits below the photo.", caption: "a sample caption", photoLayout: layout, media: media(800, 1000, "Sample photo") },
    { ...base, order: 3, type: "PHOTO", title: "Sample photo", caption: "another caption", photoLayout: layout, media: media(1000, 750, "Sample landscape photo") },
    { ...base, order: 4, type: "LETTER", title: "A sample letter", body: "Dear reader,\n\nThis is how a letter looks: generous spacing, a paper-like sheet, and a handwritten signature.\n\nWith care,", signature: "Your name", photoLayout: layout },
    { ...base, order: 5, type: "FINAL", title: "The last page", subtitle: "Sample closing line", body: "A spacious, quiet ending.", signature: "Your name", photoLayout: layout, media: media(800, 800, "Sample photo") },
  ];
}

export const SAMPLE_COVER = { title: "For someone special", subtitle: "A sample subtitle", dateLabel: "1 January 2030" };
