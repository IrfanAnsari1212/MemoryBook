import type { BookStatus, Visibility } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<BookStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
export const VISIBILITY_LABEL: Record<Visibility, string> = { PRIVATE: "Private", UNLISTED: "Unlisted", PUBLIC: "Public" };
export const VISIBILITY_HELP: Record<Visibility, string> = {
  PRIVATE: "Only you can see it.",
  UNLISTED: "Anyone with the link, hidden from search engines.",
  PUBLIC: "Anyone can find and open it.",
};

const STATUS_STYLE: Record<BookStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: BookStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
      {VISIBILITY_LABEL[visibility]}
    </span>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50";
