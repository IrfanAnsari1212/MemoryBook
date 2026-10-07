import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedStory } from "@/lib/story/queries";
import { StoryScreen } from "@/components/story/story-screen";

// Revocation and expiry must take effect immediately: never cache this route.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const story = await getSharedStory((await params).token);
  return {
    // The title is the book's title only. The token is never placed in metadata, Open Graph tags or links.
    title: { absolute: story ? story.book.title : "Memory" },
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

/**
 * /s/[token]: the same story engine as /m/[slug], resolved by a secret share token instead of the slug.
 * Any problem with the link yields the one generic unavailable page (see not-found.tsx).
 */
export default async function SharedStoryPage({ params }: PageProps<"/s/[token]">) {
  const story = await getSharedStory((await params).token);
  if (!story) notFound();
  return <StoryScreen story={story} />;
}
