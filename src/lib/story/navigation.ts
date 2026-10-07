import { SWIPE_DOMINANCE_RATIO, SWIPE_THRESHOLD_PX } from "./config";

/** Pure navigation helpers so boundary and gesture rules are unit-testable. */

export const clampIndex = (index: number, total: number) => Math.max(0, Math.min(index, Math.max(total - 1, 0)));
export const canGoPrev = (index: number) => index > 0;
export const canGoNext = (index: number, total: number) => index < total - 1;
export const nextIndex = (index: number, total: number) => (canGoNext(index, total) ? index + 1 : index);
export const prevIndex = (index: number) => (canGoPrev(index) ? index - 1 : index);

/** Swipe left (finger moves left, dx < 0) goes forward; swipe right goes back. */
export function swipeDelta(dx: number, dy: number, threshold = SWIPE_THRESHOLD_PX): 1 | -1 | 0 {
  if (Math.abs(dx) < threshold) return 0; // too small: ignore accidental movement
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE_RATIO) return 0; // mostly vertical: let the page scroll
  return dx < 0 ? 1 : -1;
}

export type KeyLike = { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; defaultPrevented?: boolean };
export type TargetLike = { tagName?: string; isContentEditable?: boolean } | null | undefined;

/** True when the user is typing somewhere; arrow keys must then keep their normal meaning. */
export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  const tag = (target.tagName ?? "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable === true;
}

/** Maps a keyboard event to a page delta, or 0 if it should be ignored. */
export function keyDelta(e: KeyLike, target: TargetLike): 1 | -1 | 0 {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return 0;
  if (isTypingTarget(target)) return 0;
  if (e.key === "ArrowRight") return 1;
  if (e.key === "ArrowLeft") return -1;
  return 0;
}
