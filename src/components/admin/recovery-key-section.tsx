"use client";

import { useActionState } from "react";
import { generateRecoveryKeyAction, type GenerateKeyState } from "@/actions/recovery";
import { RecoveryKeyBox } from "./recovery-key-box";
import { btnSecondary } from "./book-ui";

const initial: GenerateKeyState = {};

export function RecoveryKeySection({ hasKey }: { hasKey: boolean }) {
  const [state, action, pending] = useActionState(generateRecoveryKeyAction, initial);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="mb-1 text-base font-semibold">Recovery key</h2>
      <p className="mb-4 text-sm text-slate-500">
        {hasKey ? "A recovery key is set." : "No recovery key yet."} If you ever forget your email or password, the key lets you set a
        new one at <span className="font-mono">/forgot-password</span>. {hasKey ? "Creating a new key makes the old one stop working." : ""}
      </p>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label htmlFor="rk-password" className="text-sm font-medium text-slate-700">Current password</label>
          <input
            id="rk-password" name="password" type="password" autoComplete="current-password" required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <button type="submit" disabled={pending} className={btnSecondary}>{pending ? "Creating…" : hasKey ? "Create new key" : "Create recovery key"}</button>
      </form>
      <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
      {state.newKey && <div className="mt-2"><RecoveryKeyBox keyValue={state.newKey} /></div>}
    </section>
  );
}
