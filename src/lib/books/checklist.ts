/**
 * Production checklist for a memory book. Pure and derived entirely from existing database state (nothing is
 * stored), so it can never drift. It is informational: no item blocks publishing, and music is optional.
 */
export type ChecklistInput = {
  details: { title: string; recipientName: string; senderName: string; occasion: string; slug: string; coverTitle: string; hasDate: boolean };
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pages: { total: number; published: number };
  /** PHOTO pages that have no image attached. */
  photoPagesWithoutImage: number;
  themeName: string;
  music: { configured: boolean; enabled: boolean };
  activeShareLinks: number;
};

export type ChecklistItem = { key: string; label: string; done: boolean; optional?: boolean; note: string };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function buildChecklist(i: ChecklistInput): ChecklistItem[] {
  const d = i.details;
  const detailsDone = [d.title, d.recipientName, d.senderName, d.occasion, d.slug, d.coverTitle].every((s) => s.trim() !== "") && d.hasDate;
  const drafts = i.pages.total - i.pages.published;
  return [
    { key: "details", label: "Book details completed", done: detailsDone, note: detailsDone ? "Name, recipient, sender, occasion, date and cover are set." : "Some details are missing. Edit the book." },
    { key: "pages", label: "At least one page", done: i.pages.total > 0, note: i.pages.total > 0 ? plural(i.pages.total, "page") + " added." : "Add your first page." },
    {
      key: "published-pages", label: "All intended pages are published", done: i.pages.total > 0 && drafts === 0,
      note: i.pages.total === 0 ? "No pages yet." : drafts === 0 ? "Every page will be visible." : `${plural(drafts, "page")} still ${drafts === 1 ? "a draft" : "drafts"} and hidden from visitors.`,
    },
    {
      key: "media", label: "Images attached where needed", done: i.photoPagesWithoutImage === 0,
      note: i.photoPagesWithoutImage === 0 ? "No photo page is missing its image." : `${plural(i.photoPagesWithoutImage, "photo page")} without an image.`,
    },
    { key: "theme", label: "Theme selected", done: true, note: `${i.themeName}.` },
    {
      key: "music", label: "Music configured", optional: true, done: i.music.configured && i.music.enabled,
      note: !i.music.configured ? "Optional. No music, and that is fine." : i.music.enabled ? "Music is on." : "Music is added but turned off.",
    },
    {
      key: "published", label: "Book published", done: i.status === "PUBLISHED",
      note: i.status === "PUBLISHED" ? "Published." : i.status === "ARCHIVED" ? "Archived. Restore it to Draft, then publish." : "Still a draft. Publish when ready.",
    },
    {
      key: "share", label: "Share link created", done: i.activeShareLinks > 0,
      note: i.activeShareLinks > 0 ? `${plural(i.activeShareLinks, "active link")}.` : i.status === "PUBLISHED" ? "Create a link to send to the recipient." : "Available once the book is published.",
    },
  ];
}
