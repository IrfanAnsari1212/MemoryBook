import { z } from "zod";
import { PageType, PhotoLayout, TransitionType } from "@/generated/prisma/enums";

/**
 * Single source of truth for page types. The admin editor, validation and
 * (later) the public renderer all key off this registry, so adding a type is:
 * 1) add it to the PageType enum, 2) add an entry here (TypeScript enforces it).
 * Client-safe: no server-only imports.
 */

export type PageField = "title" | "subtitle" | "body" | "caption" | "media" | "photoLayout" | "signature";

export type PageTypeDef = {
  label: string;
  description: string;
  /** Fields the editor shows and the server accepts for this type. */
  fields: readonly PageField[];
  bodyMax: number;
  /** A page must have at least one of these non-empty. */
  requireOneOf: readonly PageField[];
  /** Validates the type-specific `config` JSON. Strict: unknown keys are rejected. */
  config: z.ZodType<Record<string, unknown>>;
};

export const LIMITS = { title: 160, subtitle: 240, caption: 300, signature: 80 } as const;

const noConfig = z.strictObject({});
const signatureConfig = z.strictObject({ signature: z.string().trim().min(1).max(LIMITS.signature).optional() });

export const PAGE_TYPES: Record<PageType, PageTypeDef> = {
  TEXT: {
    label: "Text",
    description: "A short passage of text.",
    fields: ["title", "subtitle", "body"],
    bodyMax: 5000,
    requireOneOf: ["title", "body"],
    config: noConfig,
  },
  MEMORY: {
    label: "Memory",
    description: "A memory with an optional photo and caption.",
    fields: ["title", "subtitle", "body", "caption", "media", "photoLayout"],
    bodyMax: 5000,
    requireOneOf: ["title", "body"],
    config: noConfig,
  },
  PHOTO: {
    label: "Photo",
    description: "A photo-focused page with a caption.",
    fields: ["title", "caption", "media", "photoLayout"],
    bodyMax: 0,
    requireOneOf: ["title", "caption", "media"],
    config: noConfig,
  },
  LETTER: {
    label: "Letter",
    description: "A longer letter with a signature.",
    fields: ["title", "body", "signature"],
    bodyMax: 20000,
    requireOneOf: ["title", "body"],
    config: signatureConfig,
  },
  FINAL: {
    label: "Final",
    description: "The closing page, with a signature and optional image.",
    fields: ["title", "subtitle", "body", "signature", "media"],
    bodyMax: 20000,
    requireOneOf: ["title", "body"],
    config: signatureConfig,
  },
};

export const PAGE_TYPE_LIST = Object.values(PageType);

export const TRANSITION_LABEL: Record<TransitionType, string> = {
  FADE: "Fade",
  SLIDE: "Slide",
  PAGE_TURN: "Page turn",
  BLUR: "Blur",
  ZOOM: "Zoom",
};

export const PHOTO_LAYOUT_LABEL: Record<PhotoLayout, string> = {
  FLOATING_BUBBLE: "Floating bubble",
  POLAROID: "Polaroid",
  CIRCLE: "Circle",
  FULLSCREEN: "Fullscreen",
  STACKED: "Stacked photos",
};

export const DEFAULT_TRANSITION: TransitionType = "PAGE_TURN";
export const DEFAULT_PHOTO_LAYOUT: PhotoLayout = "FLOATING_BUBBLE";

/** Build the validated `config` JSON for a page from its form fields (null = no config). */
export function buildConfig(type: PageType, signature: string | null): Record<string, unknown> | null {
  if (!PAGE_TYPES[type].fields.includes("signature") || !signature) return null;
  return PAGE_TYPES[type].config.parse({ signature });
}

/** Safely read a stored config; never throws and never returns unvalidated data. */
export function readConfig(type: PageType, raw: unknown): { signature?: string } {
  const parsed = PAGE_TYPES[type].config.safeParse(raw);
  if (!parsed.success) return {};
  const signature = (parsed.data as { signature?: unknown }).signature;
  return typeof signature === "string" ? { signature } : {};
}
