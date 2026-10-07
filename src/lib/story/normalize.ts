import { PhotoLayout, TransitionType } from "@/generated/prisma/enums";

/** Unknown or corrupt stored values must never break rendering. */
export function normalizeTransition(value: unknown): TransitionType {
  return Object.values(TransitionType).includes(value as TransitionType) ? (value as TransitionType) : "FADE";
}

export function normalizePhotoLayout(value: unknown): PhotoLayout {
  return Object.values(PhotoLayout).includes(value as PhotoLayout) ? (value as PhotoLayout) : "FLOATING_BUBBLE";
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9\s.,%]+\)|hsla?\([0-9\s.,%deg]+\))$/;

/** Theme colors end up in an inline style, so only plain color syntax is accepted. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && COLOR.test(value.trim()) ? value.trim() : fallback;
}

/** Only images served from this project's Cloudinary delivery host may be rendered. */
export function isAllowedImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
