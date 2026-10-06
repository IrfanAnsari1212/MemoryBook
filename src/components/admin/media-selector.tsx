"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { btnSecondary } from "./book-ui";

export type MediaOption = {
  id: string;
  url: string;
  alt: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
};

const label = (m: MediaOption) => m.alt || m.originalFilename || "Image";

/**
 * Picks one of THIS book's uploaded images. Only an id is submitted; the server
 * re-checks that the id belongs to the page's book before saving.
 */
export function MediaSelector({
  media, selectedId, libraryHref, error,
}: { media: MediaOption[]; selectedId: string | null; libraryHref: string; error?: string }) {
  const [selected, setSelected] = useState<string>(selectedId ?? "");
  const current = media.find((m) => m.id === selected) ?? null;

  return (
    <fieldset className="space-y-3" aria-describedby={error ? "mediaId-error" : undefined}>
      <legend className="text-sm font-medium text-slate-700">
        Image <span className="font-normal text-slate-400">(optional)</span>
      </legend>
      <input type="hidden" name="mediaId" value={selected} />

      {media.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No media available yet. Upload media in the{" "}
          <Link href={libraryHref} className="font-medium text-indigo-700 underline">Media Library</Link>.
        </p>
      ) : (
        <>
          {current ? (
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image src={current.url} alt={label(current)} fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{current.originalFilename ?? "Selected image"}</p>
                <p className="text-xs text-slate-500">{current.width && current.height ? `${current.width}×${current.height}` : "Selected"}</p>
              </div>
              <button type="button" className={btnSecondary} onClick={() => setSelected("")}>Remove</button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No image selected.</p>
          )}

          <div role="group" aria-label="Choose an image" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {media.map((m) => {
              const on = m.id === selected;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  title={label(m)}
                  onClick={() => setSelected(m.id)}
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    on ? "border-indigo-600 ring-2 ring-indigo-600/40" : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <Image src={m.url} alt={label(m)} fill sizes="120px" className="object-cover" />
                  {on && (
                    <span className="absolute right-1 top-1 rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <Link href={libraryHref} className="inline-block text-xs text-indigo-700 underline">Manage media</Link>
        </>
      )}
      {error && <p id="mediaId-error" className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
