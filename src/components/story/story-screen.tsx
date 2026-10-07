import type { CSSProperties } from "react";
import { themeCssVars } from "@/lib/themes/resolve";
import type { PublicStory } from "@/lib/story/types";
import { StoryPageRenderer } from "./page-renderer";
import { StoryViewer } from "./story-viewer";
import { StoryEmpty } from "./story-empty";

/**
 * Renders a resolved PublicStory (theme, cover, pages, music). Shared by /m/[slug] and /s/[token], so the
 * two routes can only differ in HOW the story is resolved, never in what is rendered.
 */
export function StoryScreen({ story }: { story: PublicStory }) {
  // Every theme value was validated in resolveTheme(); the style object holds only hex colors and
  // constants from lookup tables, never free text.
  const theme = story.book.theme;
  const style = themeCssVars(theme) as CSSProperties;
  if (story.pages.length === 0) return <StoryEmpty style={style} texture={theme.texture} />;

  return (
    <StoryViewer
      title={story.book.title}
      recipient={story.book.recipientName}
      cover={story.book.cover}
      transitions={story.pages.map((p) => p.transition)}
      openTransition={theme.defaultTransition}
      music={story.music}
      style={style}
      texture={theme.texture}
    >
      {story.pages.map((page, i) => (
        <StoryPageRenderer key={page.order} page={page} priority={i === 0} />
      ))}
    </StoryViewer>
  );
}
