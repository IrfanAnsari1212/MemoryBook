import { PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import { ACCENT_FONTS, BODY_FONTS, HEADING_FONTS, fontStack } from "./fonts";
import { SOFT_BLUSH } from "./defaults";
import { HEX_COLOR, type ThemeInput } from "./schema";

/** A theme after validation/fallback: every field is guaranteed safe to render. */
export type ResolvedTheme = ThemeInput;

/** What a Theme database row looks like to this module. */
export type ThemeRowLike = {
  name?: string | null;
  background?: string | null;
  foreground?: string | null;
  accent?: string | null;
  card?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  accentFont?: string | null;
  config?: unknown;
};

const D = SOFT_BLUSH;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX_COLOR.test(v.trim()) ? v.trim().toLowerCase() : fallback);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Turn a stored row (or nothing) into a safe theme. Each field is validated on its own, and anything
 * unknown, malformed or hostile silently falls back to the Soft Blush default. Never throws.
 */
export function resolveTheme(row?: ThemeRowLike | null): ResolvedTheme {
  if (!row) return D;
  const c = obj(row.config);
  return {
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 60) : D.name,
    background: color(row.background, D.background),
    surface: color(row.card, D.surface),
    text: color(row.foreground, D.text),
    textSecondary: color(c.textSecondary, D.textSecondary),
    accent: color(row.accent, D.accent),
    accentMuted: color(c.accentMuted, D.accentMuted),
    headingFont: pick(row.headingFont, Object.keys(HEADING_FONTS) as Array<keyof typeof HEADING_FONTS>, D.headingFont),
    bodyFont: pick(row.bodyFont, Object.keys(BODY_FONTS) as Array<keyof typeof BODY_FONTS>, D.bodyFont),
    accentFont: pick(row.accentFont, Object.keys(ACCENT_FONTS) as Array<keyof typeof ACCENT_FONTS>, D.accentFont),
    radius: pick(c.radius, ["sharp", "soft", "round"] as const, D.radius),
    density: pick(c.density, ["compact", "comfortable", "spacious"] as const, D.density),
    texture: pick(c.texture, ["none", "paper", "grain", "dots"] as const, D.texture),
    defaultTransition: pick(c.defaultTransition, Object.values(TransitionType), D.defaultTransition),
    defaultPhotoLayout: pick(c.defaultPhotoLayout, Object.values(PhotoLayout), D.defaultPhotoLayout),
  };
}

/** Validated input -> Theme table columns (+ the extras in `config`). */
export function toRow(input: ThemeInput) {
  return {
    name: input.name,
    background: input.background,
    foreground: input.text,
    accent: input.accent,
    card: input.surface,
    headingFont: input.headingFont,
    bodyFont: input.bodyFont,
    accentFont: input.accentFont,
    config: {
      textSecondary: input.textSecondary,
      accentMuted: input.accentMuted,
      radius: input.radius,
      density: input.density,
      texture: input.texture,
      defaultTransition: input.defaultTransition,
      defaultPhotoLayout: input.defaultPhotoLayout,
    },
  };
}

const RADIUS = { sharp: "2px", soft: "14px", round: "28px" } as const;
const DENSITY = {
  compact: { gap: "0.9rem", pad: "1.1rem" },
  comfortable: { gap: "1.35rem", pad: "1.5rem" },
  spacious: { gap: "1.9rem", pad: "2rem" },
} as const;

/**
 * Theme -> CSS custom properties. Every value is either a validated hex color or a constant from
 * the tables above, so no user-provided string is ever interpolated into CSS.
 */
export function themeCssVars(t: ResolvedTheme): Record<string, string> {
  return {
    "--story-bg": t.background,
    "--story-card": t.surface,
    "--story-fg": t.text,
    "--story-fg2": t.textSecondary,
    "--story-accent": t.accent,
    "--story-accent-muted": t.accentMuted,
    "--story-radius": RADIUS[t.radius],
    "--story-gap": DENSITY[t.density].gap,
    "--story-pad": DENSITY[t.density].pad,
    "--story-font-heading": fontStack(HEADING_FONTS[t.headingFont]),
    "--story-font-body": fontStack(BODY_FONTS[t.bodyFont]),
    "--story-font-accent": fontStack(ACCENT_FONTS[t.accentFont]),
  };
}
