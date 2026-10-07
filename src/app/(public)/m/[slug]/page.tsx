import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getPublicStory } from "@/lib/story/queries";
import { themeCssVars } from "@/lib/themes/resolve";
import { StoryPageRenderer } from "@/components/story/page-renderer";
import { StoryViewer } from "@/components/story/story-viewer";
import { StoryEmpty } from "@/components/story/story-empty";

// Always reflect the current published state; never serve a stale or cached story.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/m/[slug]">): Promise<Metadata> {
  const story = await getPublicStory((await params).slug);
  return {
    // Title only: no page content, names or descriptions are put into metadata.
    title: { absolute: story ? story.book.title : "Memory book" },
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

export default async function PublicStoryPage({ params }: PageProps<"/m/[slug]">) {
  const story = await getPublicStory((await params).slug);
  if (!story) notFound();

  // Every theme value was validated in resolveTheme(); the style object only holds hex colors and
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
