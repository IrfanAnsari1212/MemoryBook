"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Children, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from "react";
import type { TransitionType } from "@/generated/prisma/enums";
import { canGoNext, canGoPrev, clampIndex, keyDelta, swipeDelta } from "@/lib/story/navigation";
import { Cover, type CoverContent } from "./cover";
import { REDUCED_VARIANTS, TRANSITION_VARIANTS } from "./motion";

type Props = {
  title: string;
  recipient: string;
  cover: CoverContent;
  /** Transition of each page, by index (a page animates in/out with its own transition). */
  transitions: TransitionType[];
  /** Transition used when the cover gives way to the story (the theme's default). */
  openTransition: TransitionType;
  style?: CSSProperties;
  texture: string;
  /** One server-rendered element per published page. Only the current one is mounted. */
  children: ReactNode;
};

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);

/**
 * The only client component of the story. The server loads the story once and renders every page;
 * this shell shows the cover, then mounts one page at a time. Navigation never hits the network.
 */
export function StoryViewer({ title, recipient, cover, transitions, openTransition, style, texture, children }: Props) {
  const pages = Children.toArray(children);
  const total = pages.length;
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const [view, setView] = useState({ index: 0, dir: 1 as 1 | -1 });
  const { index, dir } = view;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const go = useCallback(
    (delta: 1 | -1) =>
      setView((v) => {
        const next = clampIndex(v.index + delta, total);
        return next === v.index ? v : { index: next, dir: delta };
      }),
    [total],
  );

  const open = useCallback(() => {
    setView({ index: 0, dir: 1 });
    setOpened(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = keyDelta(e, e.target as HTMLElement | null);
      if (!opened) {
        // On the cover, Enter or the right arrow opens the book (a focused Open button handles itself).
        if (d === 1 || (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !e.defaultPrevented)) {
          e.preventDefault();
          open();
        }
        return;
      }
      if (d !== 0) {
        e.preventDefault();
        go(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, opened, open]);

  // After opening, move focus into the story so keyboard and screen-reader users start on the content.
  useEffect(() => {
    if (opened) mainRef.current?.focus({ preventScroll: true });
  }, [opened]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = e.changedTouches[0];
    if (!start || !t || !opened) return;
    const d = swipeDelta(t.clientX - start.x, t.clientY - start.y);
    if (d !== 0) go(d);
  };

  const variantsOf = (t: TransitionType | undefined) => (reduced ? REDUCED_VARIANTS : (TRANSITION_VARIANTS[t ?? "FADE"] ?? TRANSITION_VARIANTS.FADE));

  return (
    <LazyMotion features={domAnimation}>
      <div className="story-root story-shell" style={style} data-texture={texture}>
        {opened && <h1 className="sr-only">{`${title} — a memory book for ${recipient}`}</h1>}

        <main
          ref={mainRef}
          tabIndex={-1}
          id="story-content"
          aria-label={opened ? `Page ${index + 1} of ${total}` : "Cover"}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => (touch.current = null)}
          className="story-stage"
        >
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            {!opened ? (
              <m.div key="cover" className="story-motion" custom={1} variants={variantsOf(openTransition)} exit="exit">
                <Cover
                  cover={cover}
                  action={
                    <button type="button" className="story-open" onClick={open}>
                      Open
                    </button>
                  }
                />
              </m.div>
            ) : (
              <m.div
                key={`page-${index}`}
                className="story-motion"
                custom={dir}
                variants={variantsOf(transitions[index])}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {pages[index]}
              </m.div>
            )}
          </AnimatePresence>
        </main>

        {opened && (
          <nav aria-label="Story navigation" className="story-nav">
            <button type="button" className="story-nav-btn" onClick={() => go(-1)} disabled={!canGoPrev(index)} aria-label="Previous page">
              <Arrow dir="left" />
            </button>
            <div className="story-nav-center">
              <p aria-live="polite" aria-atomic="true" className="story-count">
                <span className="sr-only">Page </span>
                {index + 1} / {total}
              </p>
              <div aria-hidden="true" className="story-progress">
                <span style={{ width: `${((index + 1) / total) * 100}%` }} />
              </div>
            </div>
            <button type="button" className="story-nav-btn" onClick={() => go(1)} disabled={!canGoNext(index, total)} aria-label="Next page">
              <Arrow dir="right" />
            </button>
          </nav>
        )}
      </div>
    </LazyMotion>
  );
}
