"use client";

import { useActionState } from "react";
import { createShareLinkAction, type ShareActionState } from "@/actions/share";
import { EXPIRY_KEYS, EXPIRY_LABEL, LABEL_MAX } from "@/lib/share/policy";
import { btnPrimary } from "./book-ui";
import { CopyLink } from "./copy-link";

const initial: ShareActionState = {};
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export function ShareCreateForm({ bookId, canCreate }: { bookId: string; canCreate: boolean }) {
  const [state, action, pending] = useActionState(createShareLinkAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end" noValidate>
        <input type="hidden" name="bookId" value={bookId} />
        <div className="space-y-1.5">
          <label htmlFor="label" className="text-sm font-medium text-slate-700">Label <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="label" name="label" maxLength={LABEL_MAX} placeholder="e.g. Close friends" className={field} aria-invalid={fe.label ? true : undefined} />
          {fe.label && <p className="text-xs text-red-600">{fe.label[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="expiry" className="text-sm font-medium text-slate-700">Expires</label>
          <select id="expiry" name="expiry" defaultValue="never" className={field}>
            {EXPIRY_KEYS.map((k) => (
              <option key={k} value={k}>{EXPIRY_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending || !canCreate} className={btnPrimary}>{pending ? "Creating…" : "Create Share Link"}</button>
      </form>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{state.error ?? ""}</p>

      {state.ok && state.url && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" data-new-link>
          <p className="text-sm font-medium text-emerald-900">Your new link is ready</p>
          <CopyLink value={state.url} label="New share link" />
          <p className="text-xs text-emerald-900/80">
            Copy it now. For security the link is shown only once and is not stored in a readable form, so it can&rsquo;t be shown again later.
            If you lose it, create a new link and revoke this one.
          </p>
        </div>
      )}
    </div>
  );
}
