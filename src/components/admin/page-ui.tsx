import type { PageType } from "@/generated/prisma/enums";
import { PAGE_TYPES } from "@/lib/pages/registry";

const TYPE_STYLE: Record<PageType, string> = {
  TEXT: "bg-slate-100 text-slate-700 ring-slate-500/20",
  MEMORY: "bg-violet-50 text-violet-700 ring-violet-600/20",
  PHOTO: "bg-sky-50 text-sky-700 ring-sky-600/20",
  LETTER: "bg-rose-50 text-rose-700 ring-rose-600/20",
  FINAL: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function PageTypeBadge({ type }: { type: PageType }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_STYLE[type]}`}>
      {PAGE_TYPES[type].label}
    </span>
  );
}

export function PagePublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        published ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
