/** Central tunables for the public story engine. Client-safe. */

/** Minimum horizontal travel (px) for a touch gesture to count as a swipe. */
export const SWIPE_THRESHOLD_PX = 50;

/** A swipe must be at least this many times more horizontal than vertical (lets the page scroll normally). */
export const SWIPE_DOMINANCE_RATIO = 1.5;

/** Page transition length. Reduced-motion users get ~0ms via the global media query. */
export const TRANSITION_MS = 450;

/**
 * Who may open /m/[slug]:
 *  - status must be PUBLISHED (DRAFT and ARCHIVED are never public), and
 *  - visibility must be PUBLIC or UNLISTED (PRIVATE is never public).
 * UNLISTED books are reachable by anyone who knows the link and are hidden from
 * search engines; secure share tokens arrive with the sharing module.
 */
export const PUBLIC_STATUS = "PUBLISHED" as const;
export const PUBLIC_VISIBILITIES = ["PUBLIC", "UNLISTED"] as const;
