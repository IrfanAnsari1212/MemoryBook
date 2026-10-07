"use client";

import { useActionState, useRef } from "react";
import { removeMusicAction, type MusicActionState } from "@/actions/music";
import { btnDanger, btnSecondary } from "./book-ui";

const initial: MusicActionState = {};

export function RemoveMusicButton({ bookId, title }: { bookId: string; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(removeMusicAction, initial);
  return (
    <>
      <button type="button" className={btnDanger} onClick={() => ref.current?.showModal()}>Remove music</button>
      <dialog
        ref={ref}
        aria-labelledby="remove-music-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      >
        <h2 id="remove-music-title" className="text-lg font-semibold">Remove the music?</h2>
        <p className="mt-2 text-sm text-slate-600">
          &ldquo;{title}&rdquo; will be removed from this memory book and its file deleted from storage. The story will play without music.
        </p>
        <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
        {state.warning && <p role="status" className="text-sm text-amber-700">{state.warning}</p>}
        <form action={action} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="bookId" value={bookId} />
          <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>Cancel</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {pending ? "Removing…" : "Remove music"}
          </button>
        </form>
      </dialog>
    </>
  );
}
