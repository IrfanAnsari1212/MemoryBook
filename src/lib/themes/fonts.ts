/**
 * Fonts a theme may use. A theme stores only a KEY from these allowlists; the CSS family
 * always comes from here, so a theme can never smuggle arbitrary CSS through a font field.
 * The `cssVar` is the next/font variable defined in app/layout.tsx. Client-safe.
 */
export type FontDef = { label: string; cssVar: string; fallback: string };

export const HEADING_FONTS = {
  cormorant: { label: "Cormorant Garamond", cssVar: "--font-heading", fallback: "Georgia, 'Times New Roman', serif" },
  playfair: { label: "Playfair Display", cssVar: "--font-playfair", fallback: "Georgia, 'Times New Roman', serif" },
  lora: { label: "Lora", cssVar: "--font-lora", fallback: "Georgia, 'Times New Roman', serif" },
} as const satisfies Record<string, FontDef>;

export const BODY_FONTS = {
  inter: { label: "Inter (clean sans-serif)", cssVar: "--font-body", fallback: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  nunito: { label: "Nunito (soft sans-serif)", cssVar: "--font-nunito", fallback: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  lora: { label: "Lora (refined serif)", cssVar: "--font-lora", fallback: "Georgia, 'Times New Roman', serif" },
} as const satisfies Record<string, FontDef>;

export const ACCENT_FONTS = {
  caveat: { label: "Caveat (handwritten)", cssVar: "--font-accent", fallback: "'Segoe Script', cursive" },
  dancing: { label: "Dancing Script (flowing)", cssVar: "--font-dancing", fallback: "'Segoe Script', cursive" },
} as const satisfies Record<string, FontDef>;

export type HeadingFontKey = keyof typeof HEADING_FONTS;
export type BodyFontKey = keyof typeof BODY_FONTS;
export type AccentFontKey = keyof typeof ACCENT_FONTS;

export const HEADING_FONT_KEYS = Object.keys(HEADING_FONTS) as [HeadingFontKey, ...HeadingFontKey[]];
export const BODY_FONT_KEYS = Object.keys(BODY_FONTS) as [BodyFontKey, ...BodyFontKey[]];
export const ACCENT_FONT_KEYS = Object.keys(ACCENT_FONTS) as [AccentFontKey, ...AccentFontKey[]];

export const fontStack = (def: FontDef) => `var(${def.cssVar}), ${def.fallback}`;
