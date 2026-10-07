import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { formatBytes } from "@/lib/media/config";
import { clampVolume, formatDuration } from "@/lib/music/config";
import { audioMimeFromUrl, isAllowedAudioUrl } from "@/lib/music/url";
import { MusicUploader } from "@/components/admin/music-uploader";
import { MusicSettingsForm } from "@/components/admin/music-settings-form";
import { RemoveMusicButton } from "@/components/admin/remove-music-button";

export const metadata: Metadata = { title: "Music" };

export default async function MusicPage({ params }: PageProps<"/admin/books/[bookId]/music">) {
  const user = await requireAdmin();
  const book = await getOwnedBookOrNotFound(user.id, (await params).bookId);

  // Scoped to the owned book only (bookId is unique on Music).
  const music = await getDb().music.findUnique({
    where: { bookId: book.id },
    include: { media: { select: { bytes: true, format: true } } },
  });
  const playable = music && isAllowedAudioUrl(music.url, getEnv().CLOUDINARY_CLOUD_NAME);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/books/${book.id}`} className="text-sm text-slate-500 hover:text-slate-800">← {book.title}</Link>
      <div>
        <h1 className="text-2xl font-semibold">Music</h1>
        <p className="mt-1 text-sm text-slate-500">
          One optional track per memory book. It starts when the reader taps <em>Open</em> (browsers never allow music before that), plays quietly, and readers can switch it off.
        </p>
      </div>

      {!music ? (
        <section className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-base font-medium text-slate-900">No music yet.</p>
          <div className="flex justify-center"><MusicUploader bookId={book.id} hasTrack={false} /></div>
        </section>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{music.name}</h2>
                <p className="text-sm text-slate-500">{music.artist ?? "No artist"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${music.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                {music.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              {[
                ["Length", formatDuration(music.durationSeconds)],
                ["Size", formatBytes(music.media?.bytes ?? null)],
                ["Format", (music.media?.format ?? "").toUpperCase() || "—"],
                ["Loop", music.loop ? "On" : "Off"],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {playable ? (
              <div>
                <p className="mb-1 text-xs text-slate-500">Preview (plays only when you press play)</p>
                {/* No autoplay: preload="none" and native controls require an explicit action. */}
                <audio controls preload="none" className="w-full" aria-label={`Preview of ${music.name}`}>
                  <source src={music.url} type={audioMimeFromUrl(music.url)} />
                </audio>
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This track&rsquo;s file is not available for playback. Upload it again.</p>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <h2 className="text-base font-semibold">Settings</h2>
            <MusicSettingsForm
              bookId={book.id}
              title={music.name}
              artist={music.artist ?? ""}
              enabled={music.enabled}
              loop={music.loop}
              volume={clampVolume(music.volume)}
            />
          </section>

          <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <MusicUploader bookId={book.id} hasTrack />
            <RemoveMusicButton bookId={book.id} title={music.name} />
          </section>
        </>
      )}
    </div>
  );
}
