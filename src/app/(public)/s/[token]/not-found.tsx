import type { Metadata } from "next";
import { StoryUnavailable } from "@/components/story/story-unavailable";

export const metadata: Metadata = {
  title: { absolute: "Memory" },
  robots: { index: false, follow: false },
};

export default function SharedStoryNotFound() {
  return <StoryUnavailable />;
}
