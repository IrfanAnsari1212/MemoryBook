import type { Variants } from "framer-motion";
import type { TransitionType } from "@/generated/prisma/enums";

/**
 * Page transitions. `custom` is the direction: 1 = forward, -1 = back. Each page uses the variants of
 * its own stored transition type. Only opacity/transform/filter are animated (cheap, no layout work),
 * durations are short, and reduced-motion users get a very short fade only.
 */
const EASE = [0.22, 0.61, 0.36, 1] as const;
const IN = { duration: 0.5, ease: EASE };
const OUT = { duration: 0.28, ease: "easeIn" as const };

export const TRANSITION_VARIANTS: Record<TransitionType, Variants> = {
  FADE: {
    enter: { opacity: 0 },
    center: { opacity: 1, transition: IN },
    exit: { opacity: 0, transition: OUT },
  },
  SLIDE: {
    enter: (d: number) => ({ opacity: 0, x: d * 44 }),
    center: { opacity: 1, x: 0, transition: IN },
    exit: (d: number) => ({ opacity: 0, x: d * -32, transition: OUT }),
  },
  // A subtle card turn: a few degrees of rotation around the binding edge, not a full 3D flip.
  PAGE_TURN: {
    enter: (d: number) => ({ opacity: 0, rotateY: d * -10, x: d * 24, transformOrigin: d > 0 ? "0% 50%" : "100% 50%" }),
    center: { opacity: 1, rotateY: 0, x: 0, transition: { ...IN, duration: 0.6 } },
    exit: (d: number) => ({ opacity: 0, rotateY: d * 8, x: d * -18, transformOrigin: d > 0 ? "100% 50%" : "0% 50%", transition: OUT }),
  },
  BLUR: {
    enter: { opacity: 0, filter: "blur(10px)" },
    center: { opacity: 1, filter: "blur(0px)", transition: IN },
    exit: { opacity: 0, filter: "blur(8px)", transition: OUT },
  },
  ZOOM: {
    enter: { opacity: 0, scale: 0.96 },
    center: { opacity: 1, scale: 1, transition: IN },
    exit: { opacity: 0, scale: 1.03, transition: OUT },
  },
};

/** Reduced motion: no movement, blur or scaling; a brief fade only. */
export const REDUCED_VARIANTS: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

/** The cover's own entrance (subtle rise + fade). Its exit reuses the theme's default transition. */
export const COVER_ENTER: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
