import { randomBytes } from "node:crypto";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export { slugify } from "./slug";

/** Cryptographically secure URL-safe token (default 256 bits). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
