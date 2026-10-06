export type { Role, Visibility, BookStatus, PageType, PageLayout, PageAlignment, TransitionType, PhotoLayout, MediaType } from "@/generated/prisma/enums";

/** Standard result shape for Server Actions. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
