import type { ThemeInput } from "./schema";

/**
 * Built-in themes live in code (not the database), so they always exist and can never be edited
 * or deleted. "Soft Blush" is the default for any book without an assigned theme; the others are
 * starting points offered when creating a theme.
 */
export const SOFT_BLUSH: ThemeInput = {
  name: "Soft Blush",
  background: "#fbf5f0", // warm cream
  surface: "#fffbf8",
  text: "#4a3b3f", // deep muted plum-brown
  textSecondary: "#7a6468",
  accent: "#a86b77", // muted rose (not saturated pink)
  accentMuted: "#ecd5d6",
  headingFont: "cormorant",
  bodyFont: "inter",
  accentFont: "caveat",
  radius: "soft",
  density: "comfortable",
  texture: "paper",
  defaultTransition: "PAGE_TURN",
  defaultPhotoLayout: "FLOATING_BUBBLE",
};

export const CREAM_PAPER: ThemeInput = {
  name: "Cream Paper",
  background: "#f6f0e2",
  surface: "#fffdf6",
  text: "#3d342a",
  textSecondary: "#6b5e4d",
  accent: "#8d6e3f",
  accentMuted: "#e7dcc0",
  headingFont: "lora",
  bodyFont: "lora",
  accentFont: "dancing",
  radius: "sharp",
  density: "comfortable",
  texture: "grain",
  defaultTransition: "FADE",
  defaultPhotoLayout: "POLAROID",
};

export const MIDNIGHT: ThemeInput = {
  name: "Midnight",
  background: "#15171f",
  surface: "#1e2230",
  text: "#ece8f0",
  textSecondary: "#b2acc0",
  accent: "#d3a5b3",
  accentMuted: "#3a3347",
  headingFont: "playfair",
  bodyFont: "inter",
  accentFont: "caveat",
  radius: "round",
  density: "spacious",
  texture: "none",
  defaultTransition: "BLUR",
  defaultPhotoLayout: "CIRCLE",
};

export const THEME_TEMPLATES: ThemeInput[] = [SOFT_BLUSH, CREAM_PAPER, MIDNIGHT];
export const DEFAULT_THEME_NAME = SOFT_BLUSH.name;
