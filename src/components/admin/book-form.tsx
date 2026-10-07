"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { slugify } from "@/lib/utils/slug";
import { createBookAction, updateBookAction, type BookFormState } from "@/actions/books";
import { BookStatus, Visibility } from "@/generated/prisma/enums";
import { STATUS_LABEL, VISIBILITY_HELP, VISIBILITY_LABEL, btnPrimary, btnSecondary } from "./book-ui";

export type BookFormValues = {
  title: string; recipientName: string; senderName: string; occasion: string; date: string;
  slug: string; coverTitle: string; coverSubtitle: string; visibility: string; status: string;
};

export const EMPTY_BOOK: BookFormValues = {
  title: "", recipientName: "", senderName: "", occasion: "", date: "", slug: "",
  coverTitle: "", coverSubtitle: "", visibility: "UNLISTED", status: "DRAFT",
};

const input =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2";
const ok = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30";
const bad = "border-red-400 focus:border-red-500 focus:ring-red-500/30";

function Field({
  id, label, error, hint, optional, children,
}: { id: string; label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function BookForm({
  mode, bookId, initial = EMPTY_BOOK, cancelHref,
}: { mode: "create" | "edit"; bookId?: string; initial?: BookFormValues; cancelHref: string }) {
  const [state, formAction, pending] = useActionState<BookFormState, FormData>(
    mode === "create" ? createBookAction : updateBookAction,
    {},
  );
  const v = { ...initial, ...state.values };
  const fe = state.fieldErrors ?? {};

  const [title, setTitle] = useState(v.title);
  const [slug, setSlug] = useState(v.slug);
  // In create mode the slug follows the title until the user edits it by hand.
  const [slugTouched, setSlugTouched] = useState(mode === "edit" || v.slug !== "");

  const statuses = mode === "create" ? [BookStatus.DRAFT, BookStatus.PUBLISHED] : Object.values(BookStatus);
  const props = (id: keyof BookFormValues) => ({
    id,
    name: id,
    "aria-invalid": fe[id] ? true : undefined,
    "aria-describedby": fe[id] ? `${id}-error` : undefined,
    className: `${input} ${fe[id] ? bad : ok}`,
  });
  const err = (id: string) => fe[id]?.[0];

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {bookId && <input type="hidden" name="bookId" value={bookId} />}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field id="title" label="Book name" error={err("title")} hint="Your own name for this book. It is shown in the admin and as the browser tab title.">
              <input
                {...props("title")}
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
          </div>
          <Field id="recipientName" label="Recipient name" error={err("recipientName")} hint="Who the book is for.">
            <input {...props("recipientName")} type="text" required maxLength={80} defaultValue={v.recipientName} />
          </Field>
          <Field id="senderName" label="Sender name" error={err("senderName")} hint="Who it is from.">
            <input {...props("senderName")} type="text" required maxLength={80} defaultValue={v.senderName} />
          </Field>
          <Field id="occasion" label="Occasion" error={err("occasion")} hint="For example: Birthday, Anniversary.">
            <input {...props("occasion")} type="text" required maxLength={80} defaultValue={v.occasion} />
          </Field>
          <Field id="date" label="Date" error={err("date")} hint="The date of the occasion, shown on the cover.">
            <input {...props("date")} type="date" required defaultValue={v.date} />
          </Field>
          <div className="md:col-span-2">
            <Field
              id="slug"
              label="Slug"
              error={err("slug")}
              hint="Unique short name for the public address /m/your-slug. Filled in from the book name; lowercase letters, numbers and hyphens."
            >
              <input
                {...props("slug")}
                type="text"
                required
                maxLength={80}
                value={slug}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Cover</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="coverTitle" label="Cover title" optional error={err("coverTitle")} hint="Defaults to “For {recipient}”.">
            <input {...props("coverTitle")} type="text" maxLength={160} defaultValue={v.coverTitle} />
          </Field>
          <Field id="coverSubtitle" label="Cover subtitle" optional error={err("coverSubtitle")} hint="A short line under the cover title.">
            <input {...props("coverSubtitle")} type="text" maxLength={240} defaultValue={v.coverSubtitle} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Publishing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="visibility" label="Visibility" error={err("visibility")} hint={VISIBILITY_HELP[v.visibility as Visibility]}>
            <select {...props("visibility")} defaultValue={v.visibility}>
              {Object.values(Visibility).map((o) => (
                <option key={o} value={o}>{VISIBILITY_LABEL[o]}</option>
              ))}
            </select>
          </Field>
          <Field id="status" label="Status" error={err("status")} hint="Draft books are visible only to you. Keep it as Draft while you add pages, then publish from the book page.">
            <select {...props("status")} defaultValue={v.status}>
              {statuses.map((o) => (
                <option key={o} value={o}>{STATUS_LABEL[o]}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.error ?? ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : mode === "create" ? "Create memory book" : "Save changes"}
        </button>
        <Link href={cancelHref} className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
