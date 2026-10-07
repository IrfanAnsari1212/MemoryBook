import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

const STEPS: Array<[string, string]> = [
  ["Create the book", "Memory Books → Create. It starts as an unlisted draft."],
  ["Add pages", "Open the book, then Pages → Add Page. Pick the type that fits each page."],
  ["Upload images", "Media library inside the book. Pick them while editing a page."],
  ["Choose a theme and music", "Both on the book workspace; music is optional."],
  ["Preview", "Owner preview shows everything, including draft pages."],
  ["Publish", "Publish the book once the checklist looks right."],
  ["Share", "Create a share link, copy it immediately, and send it to the recipient."],
];

export default async function SettingsPage() {
  const user = await requireAdmin();
  const origin = new URL(getEnv().NEXT_PUBLIC_APP_URL).origin;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-3 text-base font-semibold">Account</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Signed in as</dt><dd className="break-all text-sm">{user.email}</dd></div>
          <div><dt className="text-xs text-slate-500">Share links open at</dt><dd className="break-all font-mono text-sm">{origin}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">The link address comes from the server configuration and is not editable here.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="mb-3 text-base font-semibold">How to make a memory book</h2>
        <ol className="space-y-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{i + 1}</span>
              <span><span className="font-medium">{t}.</span> <span className="text-slate-500">{d}</span></span>
            </li>
          ))}
        </ol>
        <Link href="/admin/books/new" className="mt-4 inline-block text-sm font-medium text-indigo-700 underline">Create a memory book</Link>
      </section>
    </div>
  );
}
