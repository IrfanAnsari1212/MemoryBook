"use client";

import { useActionState, useState } from "react";
import { updateMusicAction, type MusicActionState } from "@/actions/music";
import { ARTIST_MAX, MAX_MUSIC_VOLUME, MIN_MUSIC_VOLUME, TITLE_MAX } from "@/lib/music/config";
import { btnSecondary } from "./book-ui";

const input = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2";
const ok = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30";
const bad = "border-red-400 focus:border-red-500 focus:ring-red-500/30";
const initial: MusicActionState = {};

export function MusicSettingsForm({
  bookId, title, artist, enabled, loop, volume,
}: { bookId: string; title: string; artist: string; enabled: boolean; loop: boolean; volume: number }) {
  const [state, action, pending] = useActionState(updateMusicAction, initial);
  const [vol, setVol] = useState(volume);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="bookId" value={bookId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium text-slate-700">Title</label>
          <input id="title" name="title" defaultValue={title} maxLength={TITLE_MAX} aria-invalid={fe.title ? true : undefined} className={`${input} ${fe.title ? bad : ok}`} />
          {fe.title && <p className="text-xs text-red-600">{fe.title[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="artist" className="text-sm font-medium text-slate-700">Artist / credit <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="artist" name="artist" defaultValue={artist} maxLength={ARTIST_MAX} aria-invalid={fe.artist ? true : undefined} className={`${input} ${fe.artist ? bad : ok}`} />
          {fe.artist && <p className="text-xs text-red-600">{fe.artist[0]}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="volume" className="text-sm font-medium text-slate-700">
          Volume <span className="font-normal text-slate-500">({Math.round(vol * 100)}%)</span>
        </label>
        <input
          id="volume" name="volume" type="range" min={MIN_MUSIC_VOLUME} max={MAX_MUSIC_VOLUME} step={0.05}
          value={vol} onChange={(e) => setVol(Number(e.target.value))} className="w-full max-w-sm accent-indigo-600"
        />
        <p className="text-xs text-slate-500">Kept conservative on purpose (max {Math.round(MAX_MUSIC_VOLUME * 100)}%). Readers can also turn music off.</p>
        {fe.volume && <p className="text-xs text-red-600">{fe.volume[0]}</p>}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
          Music enabled
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="loop" defaultChecked={loop} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
          Loop
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnSecondary}>{pending ? "Saving…" : "Save settings"}</button>
        <span role="status" aria-live="polite" className="text-sm">
          {state.ok && <span className="text-emerald-600">Saved</span>}
          {state.error && <span className="text-red-600">{state.error}</span>}
        </span>
      </div>
    </form>
  );
}
