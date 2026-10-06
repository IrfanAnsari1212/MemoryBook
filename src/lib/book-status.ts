import type { BookStatus } from "@/generated/prisma/enums";

/** Publishing is explicit: an archived book must be restored to DRAFT first. */
export function canTransition(from: BookStatus, to: BookStatus): boolean {
  if (from === to) return true;
  if (from === "ARCHIVED") return to === "DRAFT";
  return true;
}
