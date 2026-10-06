"use client";

import Image from "next/image";
import { useActionState, useRef } from "react";
import { deleteMediaAction, updateMediaMetaAction, type MediaActionState } from "@/actions/media";
import { ALT_MAX, CAPTION_MAX } from "@/lib/media/config";
import { btnDanger, btnSecondary } from "./book-ui";

export type MediaCardData = {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  sizeLabel: string;
  format: string | null;
  uploadedLabel: string;
  usedOnPages: number[];
};

const initial: MediaActionState = {};
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

function DeleteButton({ bookId, media }: { bookId: string; media: MediaCardData }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteMediaAction, initial);
  const label = media.originalFilename ?? "this image";
  return (
    <>
      <button type="button" className={btnDanger} onClick={() => ref.current?.showModal()}>Delete</button>
      <dialog
        ref={ref}
        aria-labelledby={`del-${media.id}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
      >
        <h2 id={`del-${media.id}`} className="text-lg font-semibold">Delete this image?</h2>
        <p className="mt-2 text-sm text-slate-600">
          &ldquo;{label}&rdquo; will be permanently deleted from your library and from Cloudinary. This cannot be undone.
        </p>
        {media.usedOnPages.length > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            In use on page{media.usedOnPages.length === 1 ? "" : "s"} {media.usedOnPages.join(", ")}. Detach it from those pages first.
          </p>
        )}
        <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
        {state.warning && <p role="status" className="mt-1 text-sm text-amber-700">{state.warning}</p>}
        <form action={action} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="mediaId" value={media.id} />
          <button type="button" className={btnSecondary} onClick={() => ref.current?.close()}>Cancel</button>
          <button
            type="submit"
            disabled={pending || media.usedOnPages.length > 0}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete image"}
          </button>
        </form>
      </dialog>
    </>
  );
}

function DetailsForm({ bookId, media }: { bookId: string; media: MediaCardData }) {
  const [state, action, pending] = useActionState(updateMediaMetaAction, initial);
  return (
    <form action={action} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="mediaId" value={media.id} />
      <div className="space-y-1">
        <label htmlFor={`alt-${media.id}`} className="text-xs font-medium text-slate-600">Alt text (describes the image)</label>
        <input id={`alt-${media.id}`} name="alt" defaultValue={media.alt ?? ""} maxLength={ALT_MAX} className={field} />
        {state.fieldErrors?.alt && <p className="text-xs text-red-600">{state.fieldErrors.alt[0]}</p>}
      </div>
      <div className="space-y-1">
        <label htmlFor={`cap-${media.id}`} className="text-xs font-medium text-slate-600">Caption</label>
        <input id={`cap-${media.id}`} name="caption" defaultValue={media.caption ?? ""} maxLength={CAPTION_MAX} className={field} />
        {state.fieldErrors?.caption && <p className="text-xs text-red-600">{state.fieldErrors.caption[0]}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnSecondary}>{pending ? "Saving…" : "Save details"}</button>
        <span role="status" aria-live="polite" className="text-xs">
          {state.ok && <span className="text-emerald-600">Saved</span>}
          {state.error && <span className="text-red-600">{state.error}</span>}
        </span>
      </div>
    </form>
  );
}

export function MediaCard({ bookId, media }: { bookId: string; media: MediaCardData }) {
  const alt = media.alt || media.caption || media.originalFilename || "Uploaded image";
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image src={media.url} alt={alt} fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
      </div>
      <div className="space-y-1 p-4">
        <p className="truncate text-sm font-medium text-slate-900" title={media.originalFilename ?? undefined}>
          {media.originalFilename ?? "image"}
        </p>
        <p className="text-xs text-slate-500">
          {media.width && media.height ? `${media.width}×${media.height}` : "—"} · {media.sizeLabel} · {(media.format ?? "").toUpperCase() || "—"}
        </p>
        <p className="text-xs text-slate-500">
          Uploaded {media.uploadedLabel} ·{" "}
          {media.usedOnPages.length > 0 ? `used on page${media.usedOnPages.length === 1 ? "" : "s"} ${media.usedOnPages.join(", ")}` : "not used"}
        </p>
        <details className="pt-2">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">Details</summary>
          <DetailsForm bookId={bookId} media={media} />
        </details>
        <div className="pt-2"><DeleteButton bookId={bookId} media={media} /></div>
      </div>
    </li>
  );
}
