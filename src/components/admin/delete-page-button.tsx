"use client";

import { useRef } from "react";
import { deletePageAction } from "@/actions/pages";
import { btnDanger, btnSecondary } from "./book-ui";

export function DeletePageButton({ bookId, pageId, label }: { bookId: string; pageId: string; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={btnDanger} onClick={() => ref.current?.showModal()}>
        Delete
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`delete-title-${pageId}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      >
        <h2 id={`delete-title-${pageId}`} className="text-lg font-semibold">
          Delete this page?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          &ldquo;{label}&rdquo; will be permanently deleted and the remaining pages will be renumbered. This cannot be undone.
        </p>
        <form action={deletePageAction} className="mt-6 flex justify-end gap-2">
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="pageId" value={pageId} />
          <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">
            Delete page
          </button>
        </form>
      </dialog>
    </>
  );
}
