import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Memory book" },
  robots: { index: false, follow: false },
};

/** One neutral page for every reason a story can't be shown (missing, draft, archived, private). */
export default function StoryNotFound() {
  return (
    <main className="story-root story-shell story-empty">
      <div className="story-page story-page-center">
        <span aria-hidden="true" className="story-rule story-rule-wide" />
        <h1 className="story-title">This memory book isn&rsquo;t available</h1>
        <p className="story-subtitle">The link may be wrong, or the book isn&rsquo;t being shared right now.</p>
      </div>
    </main>
  );
}
