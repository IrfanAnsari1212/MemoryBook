import { z } from "zod";
import { idSchema } from "@/lib/validations/book";
import {
  ALLOWED_AUDIO_TYPES, ARTIST_MAX, MAX_AUDIO_BYTES, MAX_MUSIC_VOLUME, MIN_MUSIC_VOLUME, TITLE_MAX,
} from "./config";
import { formatBytes } from "@/lib/media/config";

export type AudioKind = "mp3" | "m4a" | "wav";
export type AudioCheck = { ok: true; kind: AudioKind; ext: string } | { ok: false; error: string };

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...Array.from(b.slice(from, from + len)));

/** Identify the real audio container from its leading bytes (never trust the declared type alone). */
export function sniffAudioKind(b: Uint8Array): AudioKind | null {
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE") return "wav";
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") return "m4a"; // ISO base media (M4A/MP4 audio)
  if (b.length >= 3 && ascii(b, 0, 3) === "ID3") return "mp3"; // ID3v2 tag
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "mp3"; // MPEG frame sync
  return null;
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

/** Server-side validation: size, declared MIME, extension and magic bytes must all agree. */
export function validateAudioFile(file: { name: string; type: string; size: number; bytes: Uint8Array }): AudioCheck {
  if (file.size <= 0 || file.bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_AUDIO_BYTES || file.bytes.length > MAX_AUDIO_BYTES) {
    return { ok: false, error: `The file is too large (max ${formatBytes(MAX_AUDIO_BYTES)}).` };
  }
  const exts = ALLOWED_AUDIO_TYPES[file.type.toLowerCase()];
  if (!exts) return { ok: false, error: "Unsupported file type. Use MP3, M4A or WAV." };
  const ext = extOf(file.name);
  if (!exts.includes(ext)) return { ok: false, error: "The file extension does not match its type." };
  const kind = sniffAudioKind(file.bytes);
  if (!kind || kind !== ext) return { ok: false, error: "The file content is not a valid MP3, M4A or WAV audio file." };
  return { ok: true, kind, ext };
}

/** Pre-fill the track title from the filename: no extension, separators to spaces, bounded. */
export function defaultTitleFromFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/\.[^.]+$/, "");
  const clean = base.replace(/[_-]+/g, " ").replace(/[<>\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return (clean || "Untitled track").slice(0, TITLE_MAX);
}

const text = (label: string, max: number) =>
  z
    .string()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((v) => v.trim())
    .refine((v) => !/[<>]/.test(v), `${label} cannot contain < or >`)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), `${label} contains invalid characters`);

/** The only music fields a client may set. No url, no ids, no storage fields. */
export const musicSettingsSchema = z.object({
  bookId: idSchema,
  title: text("Title", TITLE_MAX).refine((v) => v.length > 0, "Title is required"),
  artist: text("Artist", ARTIST_MAX).transform((v) => (v === "" ? null : v)),
  enabled: z.boolean(),
  loop: z.boolean(),
  volume: z.coerce
    .number({ error: "Volume must be a number" })
    .min(MIN_MUSIC_VOLUME, `Volume must be at least ${Math.round(MIN_MUSIC_VOLUME * 100)}%`)
    .max(MAX_MUSIC_VOLUME, `Volume must be at most ${Math.round(MAX_MUSIC_VOLUME * 100)}%`),
});

export const musicRefSchema = z.object({ bookId: idSchema });
