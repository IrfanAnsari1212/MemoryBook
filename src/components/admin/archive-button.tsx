"use client";

import { useRef } from "react";
import { setBookStatusAction } from "@/actions/books";
import { btnDanger, btnSecondary } from "./book-ui";

export function ArchiveButton({ bookId, title }: { bookId: string; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={btnDanger} onClick={() => ref.current?.showModal()}>
        Archive
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`archive-title-${bookId}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      >
        <h2 id={`archive-title-${bookId}`} className="text-lg font-semibold">
          Archive this memory book?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          &ldquo;{title}&rdquo; will be hidden from your active list. Nothing is deleted, and you can restore it to Draft later.
        </p>
        <form action={setBookStatusAction} className="mt-6 flex justify-end gap-2">
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="status" value="ARCHIVED" />
          <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Archive
          </button>
        </form>
      </dialog>
    </>
  );
}
