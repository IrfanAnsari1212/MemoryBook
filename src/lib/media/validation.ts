import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, ALT_MAX, CAPTION_MAX, MAX_UPLOAD_BYTES, formatBytes } from "./config";
import { idSchema } from "@/lib/validations/book";

export type FileCheck = { ok: true; mime: string; ext: string } | { ok: false; error: string };

/** Identify the real image type from its leading bytes (never trust the declared type alone). */
export function sniffImageMime(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  ) return "image/webp";
  return null;
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

/** Server-side file validation: size, declared MIME, extension, and magic bytes must all agree. */
export function validateImageFile(file: { name: string; type: string; size: number; bytes: Uint8Array }): FileCheck {
  if (file.size <= 0 || file.bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_UPLOAD_BYTES || file.bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `The file is too large (max ${formatBytes(MAX_UPLOAD_BYTES)}).` };
  }
  const allowedExts = ALLOWED_IMAGE_TYPES[file.type];
  if (!allowedExts) return { ok: false, error: "Unsupported file type. Use JPEG, PNG or WebP." };
  const ext = extOf(file.name);
  if (!allowedExts.includes(ext)) return { ok: false, error: "The file extension does not match its type." };
  const sniffed = sniffImageMime(file.bytes);
  if (sniffed !== file.type) return { ok: false, error: "The file content is not a valid JPEG, PNG or WebP image." };
  return { ok: true, mime: sniffed, ext };
}

/** Display-only filename: basename, printable characters, bounded length. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f\u007f<>"|?*]/g, "").trim().slice(0, 150) || "image";
}

const optionalText = (max: number) =>
  z.string().max(max, `Must be at most ${max} characters`).transform((v) => v.trim()).transform((v) => (v === "" ? null : v));

export const mediaMetaSchema = z.object({
  bookId: idSchema,
  mediaId: idSchema,
  alt: optionalText(ALT_MAX),
  caption: optionalText(CAPTION_MAX),
});
export const mediaRefSchema = z.object({ bookId: idSchema, mediaId: idSchema });
