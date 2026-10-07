import type { ReactNode } from "react";
import { Rule } from "./story-text";

export type CoverContent = { title: string; subtitle: string | null; dateLabel: string | null };

/**
 * The opening screen. Presentational only (no state), so the viewer and the admin theme preview
 * share it. Every word comes from the book record; nothing here is specific to any recipient.
 * `action` is the "Open" control supplied by the caller.
 */
export function Cover({ cover, action, headingLevel = "h1" }: { cover: CoverContent; action: ReactNode; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
    <section data-cover aria-label="Cover" className="story-cover">
      {cover.dateLabel && <p className="story-cover-date">{cover.dateLabel}</p>}
      <Rule className="story-rule-wide" />
      <Heading className="story-cover-title">{cover.title}</Heading>
      {cover.subtitle && <p className="story-cover-subtitle">{cover.subtitle}</p>}
      <div className="story-cover-action">{action}</div>
    </section>
  );
}
