"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createPageAction, updatePageAction, type PageFormState } from "@/actions/pages";
import { PageType, PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import {
  DEFAULT_PHOTO_LAYOUT, DEFAULT_TRANSITION, LIMITS, PAGE_TYPES, PAGE_TYPE_LIST, PHOTO_LAYOUT_LABEL, TRANSITION_LABEL,
} from "@/lib/pages/registry";
import { btnPrimary, btnSecondary } from "./book-ui";
import { MediaSelector, type MediaOption } from "./media-selector";

export type PageFormValues = {
  type: PageType;
  title: string; subtitle: string; body: string; caption: string; signature: string;
  mediaId: string; photoLayout: string; transition: string; published: boolean;
};

const EMPTY_PAGE: PageFormValues = {
  type: "TEXT", title: "", subtitle: "", body: "", caption: "", signature: "", mediaId: "",
  photoLayout: DEFAULT_PHOTO_LAYOUT, transition: DEFAULT_TRANSITION, published: true,
};

const input = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2";
const ok = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30";
const bad = "border-red-400 focus:border-red-500 focus:ring-red-500/30";

function Field({ id, label, error, hint, optional, children }: {
  id: string; label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
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

/** Textarea that preserves line breaks and shows a live character count. */
function CountedTextarea({ id, name, defaultValue, max, rows, invalid }: {
  id: string; name: string; defaultValue: string; max: number; rows: number; invalid: boolean;
}) {
  const [len, setLen] = useState(defaultValue.length);
  return (
    <div>
      <textarea
        id={id} name={name} rows={rows} defaultValue={defaultValue}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : `${id}-count`}
        onChange={(e) => setLen(e.target.value.length)}
        className={`${input} ${invalid ? bad : ok} resize-y leading-relaxed`}
      />
      <p id={`${id}-count`} className={`mt-1 text-right text-xs ${len > max ? "text-red-600" : "text-slate-400"}`}>
        {len.toLocaleString()} / {max.toLocaleString()}
      </p>
    </div>
  );
}

export function PageForm({ mode, bookId, pageId, initial, initialType, media, cancelHref }: {
  mode: "create" | "edit"; bookId: string; pageId?: string; initial?: PageFormValues; initialType?: PageType;
  media: MediaOption[]; cancelHref: string;
}) {
  initial ??= { ...EMPTY_PAGE, ...(initialType ? { type: initialType } : {}) };
  const [state, formAction, pending] = useActionState<PageFormState, FormData>(
    mode === "create" ? createPageAction : updatePageAction, {},
  );
  const sv = state.values;
  const v = {
    ...initial,
    ...(sv ? { ...sv, published: sv.published === "true" } : {}),
  } as PageFormValues;
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => fe[k]?.[0];

  // Echoed form state can carry an invalid type from a crafted request; never index the registry with it.
  const [type, setType] = useState<PageType>(v.type in PAGE_TYPES ? v.type : "TEXT");
  const def = PAGE_TYPES[type];
  const has = (f: (typeof def.fields)[number]) => def.fields.includes(f);
  const p = (id: string) => ({
    id, name: id,
    "aria-invalid": fe[id] ? true : undefined,
    "aria-describedby": fe[id] ? `${id}-error` : undefined,
    className: `${input} ${fe[id] ? bad : ok}`,
  });

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="bookId" value={bookId} />
      {pageId && <input type="hidden" name="pageId" value={pageId} />}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Page type</h2>
        {mode === "create" ? (
          <Field id="type" label="Type" error={err("type")} hint={def.description}>
            <select {...p("type")} value={type} onChange={(e) => setType(e.target.value as PageType)}>
              {PAGE_TYPE_LIST.map((t) => (
                <option key={t} value={t}>{PAGE_TYPES[t].label}</option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{def.label}</span> — {def.description} The type can&rsquo;t be changed after creation.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Content</h2>
        {has("title") && (
          <Field id="title" label="Title" optional error={err("title")}>
            <input {...p("title")} type="text" maxLength={LIMITS.title} defaultValue={v.title} />
          </Field>
        )}
        {has("subtitle") && (
          <Field id="subtitle" label="Subtitle" optional error={err("subtitle")}>
            <input {...p("subtitle")} type="text" maxLength={LIMITS.subtitle} defaultValue={v.subtitle} />
          </Field>
        )}
        {has("body") && (
          <Field id="body" label={type === "LETTER" ? "Letter" : "Body"} optional error={err("body")} hint="Plain text. Line breaks and paragraphs are preserved. HTML is not rendered.">
            <CountedTextarea id="body" name="body" defaultValue={v.body} max={def.bodyMax} rows={type === "LETTER" || type === "FINAL" ? 14 : 8} invalid={!!fe.body} />
          </Field>
        )}
        {has("signature") && (
          <Field id="signature" label="Signature" optional error={err("signature")} hint="For example: Your iSpeed">
            <input {...p("signature")} type="text" maxLength={LIMITS.signature} defaultValue={v.signature} />
          </Field>
        )}
        {has("caption") && (
          <Field id="caption" label="Caption" optional error={err("caption")}>
            <input {...p("caption")} type="text" maxLength={LIMITS.caption} defaultValue={v.caption} />
          </Field>
        )}
      </section>

      {has("media") && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold">Image</h2>
          <MediaSelector media={media} selectedId={v.mediaId || null} error={err("mediaId")} />
          {has("photoLayout") && (
            <Field id="photoLayout" label="Photo layout" error={err("photoLayout")}>
              <select {...p("photoLayout")} defaultValue={v.photoLayout}>
                {Object.values(PhotoLayout).map((l) => (
                  <option key={l} value={l}>{PHOTO_LAYOUT_LABEL[l]}</option>
                ))}
              </select>
            </Field>
          )}
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-base font-semibold">Display</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="transition" label="Transition" error={err("transition")} hint="Stored now; animated in the public story later.">
            <select {...p("transition")} defaultValue={v.transition}>
              {Object.values(TransitionType).map((t) => (
                <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="published" defaultChecked={v.published} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Published
            </label>
          </div>
        </div>
      </section>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{state.error ?? ""}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : mode === "create" ? "Add page" : "Save changes"}
        </button>
        <Link href={cancelHref} className={btnSecondary}>Cancel</Link>
      </div>
    </form>
  );
}
