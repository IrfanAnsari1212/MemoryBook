"use client";

import { useActionState, useRef } from "react";
import { revokeShareLinkAction, type ShareActionState } from "@/actions/share";
import { btnDanger, btnSecondary } from "./book-ui";

const initial: ShareActionState = {};

export function RevokeShareButton({ bookId, linkId, label }: { bookId: string; linkId: string; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(revokeShareLinkAction, initial);
  return (
    <>
      <button type="button" className={btnDanger} onClick={() => ref.current?.showModal()}>Revoke</button>
      <dialog
        ref={ref}
        aria-labelledby={`revoke-${linkId}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      >
        <h2 id={`revoke-${linkId}`} className="text-lg font-semibold">Revoke this link?</h2>
        <p className="mt-2 text-sm text-slate-600">
          &ldquo;{label}&rdquo; will stop working immediately for everyone who has it. This can&rsquo;t be undone; you would need to create a new link.
        </p>
        <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
        <form action={action} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="linkId" value={linkId} />
          <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>Cancel</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {pending ? "Revoking…" : "Revoke link"}
          </button>
        </form>
      </dialog>
    </>
  );
}
