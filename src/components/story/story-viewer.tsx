"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Children, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from "react";
import type { TransitionType } from "@/generated/prisma/enums";
import { canGoNext, canGoPrev, clampIndex, keyDelta, swipeDelta } from "@/lib/story/navigation";
import type { StoryMusic } from "@/lib/story/types";
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
  /** Optional background music. Never played before the reader taps Open. */
  music?: StoryMusic | null;
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
export function StoryViewer({ title, recipient, cover, transitions, openTransition, music = null, style, texture, children }: Props) {
  const pages = Children.toArray(children);
  const total = pages.length;
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const [view, setView] = useState({ index: 0, dir: 1 as 1 | -1 });
  const { index, dir } = view;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Music lives at viewer level (outside the animated page area), so changing pages never remounts or restarts it.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [musicBroken, setMusicBroken] = useState(false);

  // Always called from a user gesture (the Open click / key press). A rejected play() (browser policy,
  // decode error...) is swallowed: the story keeps working and the control simply shows "Music off".
  const requestPlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* ignore: music is an enhancement */
    }
  }, []);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) requestPlay();
    else a.pause();
  };

  useEffect(() => {
    if (audioRef.current && music) audioRef.current.volume = music.volume;
  }, [music]);

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
    requestPlay(); // music begins only now, from the user's explicit Open
  }, [requestPlay]);

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
          className={`story-stage ${music && opened && !musicBroken ? "story-has-music" : ""}`}
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

        {music && !musicBroken && (
          <audio
            ref={audioRef}
            src={music.url}
            loop={music.loop}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => { setPlaying(false); setMusicBroken(true); }}
          />
        )}

        {music && !musicBroken && opened && (
          <button type="button" className="story-music" aria-pressed={playing} aria-label="Music" onClick={toggleMusic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
              {playing ? (
                <>
                  <path d="M15.5 9a4 4 0 0 1 0 6" />
                  <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
                </>
              ) : (
                <path d="M16 9.5l5 5M21 9.5l-5 5" />
              )}
            </svg>
            <span className="story-music-label" aria-hidden="true">{playing ? "On" : "Off"}</span>
          </button>
        )}

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
