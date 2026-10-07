import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStory } from "@/lib/story/queries";
import { StoryScreen } from "@/components/story/story-screen";

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
  return <StoryScreen story={story} />;
}
