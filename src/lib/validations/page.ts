import { z } from "zod";
import { PageType, PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import { LIMITS, PAGE_TYPES, buildConfig, type PageField } from "@/lib/pages/registry";
import { idSchema } from "./book";

const text = (label: string, max: number) =>
  z
    .string()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v));

/** Normalizes line endings but preserves paragraph breaks and inner whitespace. */
const bodyText = z
  .string()
  .max(20000, "Body must be at most 20000 characters")
  .transform((v) => v.replace(/\r\n?/g, "\n").trim())
  .transform((v) => (v === "" ? null : v));

export const pageTypeSchema = z.enum(PageType, { error: "Choose a valid page type" });

/** Everything the client may send for create/update. No order, bookId, type-of-record, or config. */
const rawPageSchema = z.object({
  title: text("Title", LIMITS.title),
  subtitle: text("Subtitle", LIMITS.subtitle),
  body: bodyText,
  caption: text("Caption", LIMITS.caption),
  signature: text("Signature", LIMITS.signature),
  mediaId: z.string().max(64).transform((v) => (v.trim() === "" ? null : v.trim())),
  photoLayout: z.enum(PhotoLayout, { error: "Choose a valid photo layout" }),
  transition: z.enum(TransitionType, { error: "Choose a valid transition" }),
  published: z.boolean(),
});

export type PageValues = {
  title: string | null;
  subtitle: string | null;
  body: string | null;
  caption: string | null;
  mediaId: string | null;
  /** undefined = type has no photo layout; leave the stored value untouched. */
  photoLayout: PhotoLayout | undefined;
  transition: TransitionType;
  published: boolean;
  config: Record<string, unknown> | null;
};

export type PageParseResult =
  | { ok: true; data: PageValues }
  | { ok: false; fieldErrors: Record<string, string[]> };

/** Parse and validate a page form against the rules of its (server-trusted) type. */
export function parsePageInput(type: PageType, raw: Record<string, unknown>): PageParseResult {
  const parsed = rawPageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };

  const def = PAGE_TYPES[type];
  const p = parsed.data;
  const allowed = (f: PageField) => def.fields.includes(f);
  const fieldErrors: Record<string, string[]> = {};

  if (allowed("body") && p.body && p.body.length > def.bodyMax) fieldErrors.body = [`Body must be at most ${def.bodyMax} characters`];

  const present: Record<PageField, boolean> = {
    title: !!p.title,
    subtitle: !!p.subtitle,
    body: !!p.body,
    caption: !!p.caption,
    media: !!p.mediaId,
    photoLayout: true,
    signature: !!p.signature,
  };
  if (!def.requireOneOf.some((f) => allowed(f) && present[f])) {
    const first = def.requireOneOf[0] === "media" ? "mediaId" : def.requireOneOf[0];
    const names = def.requireOneOf.map((f) => (f === "media" ? "an image" : `a ${f}`)).join(" or ");
    fieldErrors[first] = [`Add ${names}.`];
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      title: allowed("title") ? p.title : null,
      subtitle: allowed("subtitle") ? p.subtitle : null,
      body: allowed("body") ? p.body : null,
      caption: allowed("caption") ? p.caption : null,
      mediaId: allowed("media") ? p.mediaId : null,
      photoLayout: allowed("photoLayout") ? p.photoLayout : undefined,
      transition: p.transition,
      published: p.published,
      config: buildConfig(type, allowed("signature") ? p.signature : null),
    },
  };
}

export const pageRefSchema = z.object({ bookId: idSchema, pageId: idSchema });
export const pageStatusSchema = z.object({
  bookId: idSchema,
  pageId: idSchema,
  published: z.enum(["true", "false"]).transform((v) => v === "true"),
});
export const reorderSchema = z.object({
  bookId: idSchema,
  orderedIds: z.array(idSchema).min(1).max(1000).refine((a) => new Set(a).size === a.length, "Duplicate page ids"),
});
