"use client";

import { useRef, useState } from "react";
import { btnSecondary } from "./book-ui";

/**
 * Shows a link in a read-only field with a Copy button. Uses the async Clipboard API, falls back to
 * selecting the text and execCommand("copy"), and as a last resort tells the user to copy manually.
 * The value only ever lives in this component's props/DOM; it is never logged or sent anywhere.
 */
export function CopyLink({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return setState("copied");
      }
    } catch {
      /* fall through to the legacy path */
    }
    try {
      ref.current?.focus();
      ref.current?.select();
      if (document.execCommand("copy")) return setState("copied");
    } catch {
      /* fall through */
    }
    ref.current?.select();
    setState("manual");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          readOnly
          value={value}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 basis-64 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800"
        />
        <button type="button" onClick={copy} className={btnSecondary}>
          {state === "copied" ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-4 text-xs">
        {state === "copied" && <span className="text-emerald-600">Link copied to your clipboard.</span>}
        {state === "manual" && <span className="text-amber-700">Couldn&rsquo;t copy automatically. The link is selected: press Ctrl+C (or ⌘C).</span>}
      </p>
    </div>
  );
}
