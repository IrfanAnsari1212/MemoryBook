import { randomBytes } from "node:crypto";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** URL-safe slug: lowercase, ascii, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Cryptographically secure URL-safe token (default 256 bits). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
