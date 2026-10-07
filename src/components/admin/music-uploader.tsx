"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMusicAction } from "@/actions/music";
import { ACCEPT_AUDIO_ATTRIBUTE, ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES } from "@/lib/music/config";
import { formatBytes } from "@/lib/media/config";
import { btnPrimary } from "./book-ui";

type Status = { kind: "idle" } | { kind: "uploading"; name: string } | { kind: "done"; warning?: string } | { kind: "error"; message: string };

/** Quick client-side pre-check for UX only. The server re-validates type, extension, content and size. */
function precheck(file: File): string | null {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  const exts = ALLOWED_AUDIO_TYPES[file.type.toLowerCase()];
  if (!exts || !exts.includes(ext)) return "Unsupported file. Use an MP3, M4A or WAV file.";
  if (file.size > MAX_AUDIO_BYTES) return `Too large (max ${formatBytes(MAX_AUDIO_BYTES)}).`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function MusicUploader({ bookId, hasTrack }: { bookId: string; hasTrack: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const busy = status.kind === "uploading";

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    const problem = precheck(file);
    if (problem) return setStatus({ kind: "error", message: problem });
    setStatus({ kind: "uploading", name: file.name });
    try {
      const fd = new FormData();
      fd.set("bookId", bookId);
      fd.set("file", file);
      const res = await uploadMusicAction(fd);
      setStatus(res.ok ? { kind: "done", warning: res.warning } : { kind: "error", message: res.error });
      if (res.ok) router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Upload failed. Please try again." });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id="music-file"
        type="file"
        accept={ACCEPT_AUDIO_ATTRIBUTE}
        disabled={busy}
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <label htmlFor="music-file" className={`${btnPrimary} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Uploading…" : hasTrack ? "Replace track" : "Upload a track"}
      </label>
      <p className="text-xs text-slate-500">MP3, M4A or WAV · up to {formatBytes(MAX_AUDIO_BYTES)}. Uploading replaces the current track.</p>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {status.kind === "uploading" && <span className="text-slate-600">Uploading {status.name}…</span>}
        {status.kind === "done" && <span className="text-emerald-600">Saved.{status.warning ? <span className="ml-1 text-amber-700">{status.warning}</span> : null}</span>}
        {status.kind === "error" && <span className="text-red-600">{status.message}</span>}
      </p>
    </div>
  );
}
