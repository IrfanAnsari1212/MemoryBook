"use client";

import { useActionState, useRef, useState } from "react";
import { deleteBookAction, type DeleteBookState } from "@/actions/book-delete";
import { btnSecondary } from "./book-ui";

const initial: DeleteBookState = {};

/**
 * Permanent deletion. The button only enables once the exact book name is typed; that is a convenience, the
 * server re-validates the name and ownership.
 */
export function DeleteBookButton({
  bookId, title, published, counts,
}: { bookId: string; title: string; published: boolean; counts: { pages: number; media: number; music: boolean; links: number } }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteBookAction, initial);
  const [typed, setTyped] = useState("");
  const matches = typed === title;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Delete permanently
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`delete-title-${bookId}`}
        onClose={() => setTyped("")}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-red-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
      >
        <h2 id={`delete-title-${bookId}`} className="text-lg font-semibold text-red-700">Delete this memory book permanently?</h2>
        {published && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            This book is published. Its public story will stop working immediately, and every share link will stop working.
          </p>
        )}
        <p className="mt-3 text-sm text-slate-600">
          This permanently removes &ldquo;{title}&rdquo; and everything in it: {counts.pages} {counts.pages === 1 ? "page" : "pages"},{" "}
          {counts.media} {counts.media === 1 ? "image" : "images"}, {counts.music ? "its music track" : "no music"} and its share links
          {counts.links > 0 ? ` (${counts.links} active)` : ""}. The files are deleted from storage. <strong>This cannot be undone.</strong>{" "}
          To keep it, archive it instead.
        </p>
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="bookId" value={bookId} />
          <div className="space-y-1.5">
            <label htmlFor={`confirm-${bookId}`} className="text-sm font-medium text-slate-700">
              Type <span className="font-mono font-semibold">{title}</span> to confirm
            </label>
            <input
              id={`confirm-${bookId}`}
              name="confirmTitle"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>Cancel</button>
            <button
              type="submit"
              disabled={!matches || pending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
