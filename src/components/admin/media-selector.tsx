import Image from "next/image";

export type MediaOption = { id: string; url: string; alt: string | null };

/**
 * Image picker. Module 5 supplies real media; until then this renders the empty
 * state. It only submits a media id, which the server re-validates against the book.
 */
export function MediaSelector({
  media, selectedId, error,
}: { media: MediaOption[]; selectedId: string | null; error?: string }) {
  return (
    <fieldset className="space-y-2" aria-describedby={error ? "mediaId-error" : undefined}>
      <legend className="text-sm font-medium text-slate-700">
        Image <span className="font-normal text-slate-400">(optional)</span>
      </legend>
      {media.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No media available yet. Upload media in the Media Library.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-xs text-slate-600 has-[:checked]:border-indigo-600 has-[:checked]:ring-2 has-[:checked]:ring-indigo-600/30">
            <input type="radio" name="mediaId" value="" defaultChecked={!selectedId} className="sr-only" />
            None
          </label>
          {media.map((m) => (
            <label
              key={m.id}
              className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-slate-300 has-[:checked]:border-indigo-600 has-[:checked]:ring-2 has-[:checked]:ring-indigo-600/30"
            >
              <input type="radio" name="mediaId" value={m.id} defaultChecked={m.id === selectedId} className="sr-only" />
              <Image src={m.url} alt={m.alt ?? ""} fill sizes="120px" className="object-cover" />
            </label>
          ))}
        </div>
      )}
      {error && <p id="mediaId-error" className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
