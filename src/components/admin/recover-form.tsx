"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recoverAccountAction, type RecoverState } from "@/actions/recovery";
import { RecoveryKeyBox } from "./recovery-key-box";

const initial: RecoverState = {};
const input =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/30";

export function RecoverForm() {
  const [state, action, pending] = useActionState(recoverAccountAction, initial);
  const fe = state.fieldErrors ?? {};

  if (state.newKey) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Your email and password were updated.
        </p>
        <RecoveryKeyBox keyValue={state.newKey} />
        <Link href="/login" className="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">
          Continue to sign in
        </Link>
      </div>
    );
  }

  const field = (id: string, label: string, type: string, autoComplete: string, hint?: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id} name={id} type={type} autoComplete={autoComplete} required spellCheck={false} autoCapitalize="none"
        aria-invalid={fe[id] ? true : undefined} className={`${input} ${fe[id] ? "border-red-400" : "border-slate-300"}`}
      />
      {hint && !fe[id] && <p className="text-xs text-slate-500">{hint}</p>}
      {fe[id] && <p className="text-xs text-red-600">{fe[id]?.[0]}</p>}
    </div>
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {field("recoveryKey", "Recovery key", "password", "off", "The 43-character key you saved earlier.")}
      {field("email", "New email", "email", "username")}
      {field("password", "New password", "password", "new-password", "At least 12 characters.")}
      {field("confirm", "Confirm new password", "password", "new-password")}
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating…" : "Set new email and password"}
      </button>
      <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-slate-800">Back to sign in</Link>
    </form>
  );
}
