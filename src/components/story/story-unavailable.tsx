/**
 * The ONE public page for every reason a story can't be shown: unknown or malformed link, revoked,
 * expired, draft, archived, private (for /m), deleted. It deliberately says nothing about which.
 */
export function StoryUnavailable() {
  return (
    <main className="story-root story-shell story-empty">
      <div className="story-page story-page-center">
        <span aria-hidden="true" className="story-rule story-rule-wide" />
        <h1 className="story-title">This memory isn&rsquo;t available</h1>
        <p className="story-subtitle">The link may be wrong, or this memory isn&rsquo;t being shared right now.</p>
      </div>
    </main>
  );
}
