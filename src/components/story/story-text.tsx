/**
 * User text is always rendered as plain text through React (escaped). `white-space: pre-wrap`
 * (in .story-prose) keeps intentional line breaks and paragraphs. There is no HTML rendering anywhere.
 */
export function StoryBody({ text, className = "" }: { text: string | null; className?: string }) {
  if (!text) return null;
  return <p className={`story-prose ${className}`}>{text}</p>;
}

export function StoryTitle({ text, size = "md", className = "" }: { text: string | null; size?: "md" | "xl"; className?: string }) {
  if (!text) return null;
  return <h2 className={`story-title ${size === "xl" ? "story-title-xl" : ""} ${className}`}>{text}</h2>;
}

export function StorySubtitle({ text, className = "" }: { text: string | null; className?: string }) {
  if (!text) return null;
  return <p className={`story-subtitle ${className}`}>{text}</p>;
}

/** Script font, used only for small personal moments (signature, captions). */
export function StorySignature({ text, className = "" }: { text: string | null; className?: string }) {
  if (!text) return null;
  return <p className={`story-signature story-script ${className}`}>&mdash; {text}</p>;
}

export const Rule = ({ className = "" }: { className?: string }) => <span aria-hidden="true" className={`story-rule ${className}`} />;
