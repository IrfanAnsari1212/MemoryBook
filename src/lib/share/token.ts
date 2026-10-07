import { createHash } from "node:crypto";
import { generateToken } from "@/lib/utils";

/**
 * Share tokens are 32 bytes (256 bits) from the OS CSPRNG (crypto.randomBytes via generateToken),
 * encoded as URL-safe base64 (43 characters). Only a SHA-256 hash is stored.
 *
 * A fast, unsalted hash is the right tool here: the token itself carries 256 bits of entropy, so
 * there is nothing to brute-force or look up in a rainbow table (unlike a human password), and the
 * public route needs a cheap, indexable, deterministic lookup key on every request.
 */
export const SHARE_TOKEN_BYTES = 32;
export const SHARE_TOKEN_LENGTH = 43;

export const hashShareToken = (token: string): string => createHash("sha256").update(token, "utf8").digest("hex");

/** A fresh token plus the hash to store. The raw token must be shown once and never persisted or logged. */
export function generateShareToken(): { token: string; tokenHash: string } {
  const token = generateToken(SHARE_TOKEN_BYTES);
  return { token, tokenHash: hashShareToken(token) };
}

/** Cheap shape check so garbage never reaches the database (and cannot be used to probe it). */
export const isWellFormedShareToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
