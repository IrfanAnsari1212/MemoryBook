/** Share-link rules. Pure and client-safe so the admin UI and the server agree on them. */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The only expiry choices a client may pick. The server turns a choice into a timestamp; dates are never accepted. */
export const EXPIRY_CHOICES = { never: null, "1h": HOUR, "1d": DAY, "7d": 7 * DAY, "30d": 30 * DAY } as const;
export type ExpiryChoice = keyof typeof EXPIRY_CHOICES;
export const EXPIRY_KEYS = Object.keys(EXPIRY_CHOICES) as [ExpiryChoice, ...ExpiryChoice[]];
export const EXPIRY_LABEL: Record<ExpiryChoice, string> = { never: "Never", "1h": "1 hour", "1d": "1 day", "7d": "7 days", "30d": "30 days" };

/** Server-generated expiry (UTC instant), or null for "never". */
export function expiresAtFor(choice: ExpiryChoice, now: Date = new Date()): Date | null {
  const ms = EXPIRY_CHOICES[choice];
  return ms === null ? null : new Date(now.getTime() + ms);
}

export type ShareState = "active" | "revoked" | "expired";

/**
 * Revoked wins over expired. A link is expired when expiresAt <= now (the instant of expiry is already
 * invalid). The public lookup applies the same rule in SQL (`expiresAt > now`).
 */
export function shareState(link: { revokedAt: Date | null; expiresAt: Date | null }, now: Date = new Date()): ShareState {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/** Cap on simultaneously active links per book (keeps the table and the admin list sane). */
export const MAX_ACTIVE_LINKS_PER_BOOK = 25;
export const LABEL_MAX = 60;

/** Build the share URL from the configured, validated application URL (never from request headers). */
export function buildShareUrl(appUrl: string, token: string): string {
  const base = new URL(appUrl);
  if (base.protocol !== "https:" && base.protocol !== "http:") throw new Error("Invalid application URL");
  return new URL(`/s/${token}`, base.origin).toString();
}
