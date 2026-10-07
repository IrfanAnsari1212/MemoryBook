import type { StoryPage } from "@/lib/story/types";
import { PAGE_VIEWS } from "./page-types";

/** Generic dispatcher: picks the view for a page's type. Knows nothing about any specific book. */
export function StoryPageRenderer({ page, priority = false }: { page: StoryPage; priority?: boolean }) {
  const View = PAGE_VIEWS[page.type];
  if (!View) return null; // unknown future type: skip rather than crash
  return <View page={page} priority={priority} />;
}
