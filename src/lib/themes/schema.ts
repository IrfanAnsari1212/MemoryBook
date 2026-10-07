import { z } from "zod";
import { PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import { ACCENT_FONT_KEYS, BODY_FONT_KEYS, HEADING_FONT_KEYS } from "./fonts";

/**
 * Theme values are DATA, never code. Colors are strict hex, fonts are allowlist keys, everything
 * else is a closed enum, and free text (the name) cannot contain markup. Because nothing user-
 * supplied is ever interpolated into CSS as free text, there is no CSS/HTML/JS injection surface.
 */

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const RADIUS_KEYS = ["sharp", "soft", "round"] as const;
export const DENSITY_KEYS = ["compact", "comfortable", "spacious"] as const;
export const TEXTURE_KEYS = ["none", "paper", "grain", "dots"] as const;

const hex = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(HEX_COLOR, `${label}: use a hex color such as #fbf5f0`)
    .transform((v) => v.toLowerCase());

const CONTROL = /[\u0000-\u001f\u007f]/;

const themeName = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(60, "Name must be at most 60 characters")
  .refine((v) => !/[<>]/.test(v), "Name cannot contain < or >")
  .refine((v) => !CONTROL.test(v), "Name contains invalid characters");

export const themeInputSchema = z.object({
  name: themeName,
  background: hex("Background"),
  surface: hex("Surface"),
  text: hex("Text"),
  textSecondary: hex("Secondary text"),
  accent: hex("Accent"),
  accentMuted: hex("Muted accent"),
  headingFont: z.enum(HEADING_FONT_KEYS, { error: "Choose one of the supported heading fonts" }),
  bodyFont: z.enum(BODY_FONT_KEYS, { error: "Choose one of the supported body fonts" }),
  accentFont: z.enum(ACCENT_FONT_KEYS, { error: "Choose one of the supported accent fonts" }),
  radius: z.enum(RADIUS_KEYS, { error: "Choose a valid corner style" }),
  density: z.enum(DENSITY_KEYS, { error: "Choose a valid spacing density" }),
  texture: z.enum(TEXTURE_KEYS, { error: "Choose a valid background style" }),
  defaultTransition: z.enum(TransitionType, { error: "Choose a valid transition" }),
  defaultPhotoLayout: z.enum(PhotoLayout, { error: "Choose a valid photo layout" }),
});

export type ThemeInput = z.infer<typeof themeInputSchema>;

/** Shape stored in Theme.config. Strict: unknown keys are rejected on write. */
export const themeConfigSchema = z.strictObject({
  textSecondary: z.string().regex(HEX_COLOR),
  accentMuted: z.string().regex(HEX_COLOR),
  radius: z.enum(RADIUS_KEYS),
  density: z.enum(DENSITY_KEYS),
  texture: z.enum(TEXTURE_KEYS),
  defaultTransition: z.enum(TransitionType),
  defaultPhotoLayout: z.enum(PhotoLayout),
});

export const THEME_FIELDS = Object.keys(themeInputSchema.shape) as Array<keyof ThemeInput>;
