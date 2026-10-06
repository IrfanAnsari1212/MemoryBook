"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMediaAction } from "@/actions/media";
import { ACCEPT_ATTRIBUTE, ALLOWED_IMAGE_TYPES, MAX_FILES_PER_BATCH, MAX_UPLOAD_BYTES, formatBytes } from "@/lib/media/config";

type Item = { key: string; name: string; status: "uploading" | "queued" | "done" | "error"; error?: string };

/** Quick client-side pre-check for UX only. The server re-validates everything. */
function precheck(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES[file.type]) return "Unsupported type. Use JPEG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) return `Too large (max ${formatBytes(MAX_UPLOAD_BYTES)}).`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function MediaUploader({ bookId }: { bookId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const patch = (key: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0 || busy) return;
    const batch = files.slice(0, MAX_FILES_PER_BATCH);
    const entries = batch.map((f, i) => ({ f, key: `${Date.now()}-${i}` }));
    const queued: Item[] = entries.map(({ f, key }) => ({ key, name: f.name, status: "queued" }));
    if (files.length > batch.length) {
      queued.push({ key: "limit", name: `Only ${MAX_FILES_PER_BATCH} files at a time: ${files.length - batch.length} skipped.`, status: "error" });
    }
    setItems(queued);
    setBusy(true);
    for (const { f, key } of entries) {
      const problem = precheck(f);
      if (problem) { patch(key, { status: "error", error: problem }); continue; }
      patch(key, { status: "uploading" });
      try {
        const fd = new FormData();
        fd.set("bookId", bookId);
        fd.set("file", f);
        const res = await uploadMediaAction(fd);
        patch(key, res.ok ? { status: "done" } : { status: "error", error: res.error });
      } catch {
        patch(key, { status: "error", error: "Upload failed. Please try again." });
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="media-files"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:bg-slate-50"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="text-sm font-semibold text-slate-900">{busy ? "Uploading…" : "Choose images or drop them here"}</span>
        <span className="text-xs text-slate-500">
          JPEG, PNG or WebP · up to {formatBytes(MAX_UPLOAD_BYTES)} each · {MAX_FILES_PER_BATCH} at a time
        </span>
        <input
          ref={inputRef}
          id="media-files"
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          disabled={busy}
          className="sr-only"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
      </label>

      {items.length > 0 && (
        <ul aria-live="polite" className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate text-slate-700">{i.name}</span>
              <span
                className={`shrink-0 text-xs font-medium ${
                  i.status === "done" ? "text-emerald-600" : i.status === "error" ? "text-red-600" : "text-slate-500"
                }`}
              >
                {i.status === "uploading" && "Uploading…"}
                {i.status === "queued" && "Waiting"}
                {i.status === "done" && "Uploaded"}
                {i.status === "error" && (i.error ?? "Failed")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
