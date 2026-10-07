import type { CSSProperties } from "react";

/** Shown when a published book has no published pages yet. Public-safe: no internals. */
export function StoryEmpty({ style, texture = "none" }: { style?: CSSProperties; texture?: string }) {
  return (
    <main className="story-root story-shell story-empty" style={style} data-texture={texture}>
      <div className="story-page story-page-center">
        <span aria-hidden="true" className="story-rule story-rule-wide" />
        <h1 className="story-title">Nothing here yet</h1>
        <p className="story-subtitle">This memory book doesn&rsquo;t have any pages to show right now. Please check back later.</p>
      </div>
    </main>
  );
}
