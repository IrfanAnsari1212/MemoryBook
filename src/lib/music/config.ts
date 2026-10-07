/**
 * Central music rules. Client-safe (no server imports), so the uploader UI, the validators and the
 * public player all use the same numbers. The server is the authority.
 */

/** Maximum size of an uploaded track. Must stay below SERVER_ACTION_BODY_LIMIT (media/config.ts, 11mb). */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

/** Accepted types: MIME type -> allowed extensions. Everything else is rejected. */
export const ALLOWED_AUDIO_TYPES: Record<string, readonly string[]> = {
  "audio/mpeg": ["mp3"],
  "audio/mp3": ["mp3"],
  "audio/mp4": ["m4a"],
  "audio/x-m4a": ["m4a"],
  "audio/m4a": ["m4a"],
  "audio/wav": ["wav"],
  "audio/x-wav": ["wav"],
  "audio/wave": ["wav"],
  "audio/vnd.wave": ["wav"],
};

/** Cloudinary-side format allow-list (enforced by Cloudinary on upload, as defense in depth). */
export const CLOUDINARY_AUDIO_FORMATS = ["mp3", "m4a", "wav"] as const;

export const ACCEPT_AUDIO_ATTRIBUTE = ".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav";

/** Playback defaults: conservative volume, loop on. Never 100%. */
export const DEFAULT_MUSIC_VOLUME = 0.3;
export const MIN_MUSIC_VOLUME = 0.05;
export const MAX_MUSIC_VOLUME = 0.7;
export const DEFAULT_MUSIC_LOOP = true;

export const TITLE_MAX = 120;
export const ARTIST_MAX = 120;

export const clampVolume = (v: unknown): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : DEFAULT_MUSIC_VOLUME;
  return Math.min(MAX_MUSIC_VOLUME, Math.max(MIN_MUSIC_VOLUME, n));
};

export const formatDuration = (s: number | null | undefined): string =>
  s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
