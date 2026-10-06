"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { duplicatePageAction, reorderPagesAction, setPageStatusAction } from "@/actions/pages";
import type { PageType } from "@/generated/prisma/enums";
import { btnSecondary } from "./book-ui";
import { DeletePageButton } from "./delete-page-button";
import { PagePublishedBadge, PageTypeBadge } from "./page-ui";

export type PageListItem = {
  id: string;
  type: PageType;
  title: string | null;
  published: boolean;
  updatedAt: string;
};

function Row({
  item, index, total, bookId, onMove,
}: { item: PageListItem; index: number; total: number; bookId: string; onMove: (from: number, to: number) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const label = item.title || "Untitled page";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-3 bg-white px-3 py-3 md:px-4 ${isDragging ? "relative z-10 shadow-lg ring-1 ring-indigo-300" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder page ${index + 1}: ${label}. Press space, then arrow keys.`}
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="3" r="1.4" /><circle cx="11" cy="3" r="1.4" /><circle cx="5" cy="8" r="1.4" />
            <circle cx="11" cy="8" r="1.4" /><circle cx="5" cy="13" r="1.4" /><circle cx="11" cy="13" r="1.4" />
          </svg>
        </button>
        <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-500" aria-label={`Order ${index + 1}`}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/admin/books/${bookId}/pages/${item.id}`} className="block truncate font-medium text-slate-900 hover:text-indigo-700">
            {label}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PageTypeBadge type={item.type} />
            <PagePublishedBadge published={item.published} />
            <span className="text-xs text-slate-500">Updated {item.updatedAt}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 md:flex-row">
          <button type="button" className={`${btnSecondary} !px-2 !py-1`} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move "${label}" up`}>
            ↑
          </button>
          <button type="button" className={`${btnSecondary} !px-2 !py-1`} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move "${label}" down`}>
            ↓
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-0 md:pl-[3.25rem]">
        <Link href={`/admin/books/${bookId}/pages/${item.id}/edit`} className={btnSecondary}>Edit</Link>
        <form action={duplicatePageAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="pageId" value={item.id} />
          <button type="submit" className={btnSecondary}>Duplicate</button>
        </form>
        <form action={setPageStatusAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="pageId" value={item.id} />
          <input type="hidden" name="published" value={item.published ? "false" : "true"} />
          <button type="submit" className={btnSecondary}>{item.published ? "Unpublish" : "Publish"}</button>
        </form>
        <DeletePageButton bookId={bookId} pageId={item.id} label={label} />
      </div>
    </li>
  );
}

export function PageList({ bookId, initialItems }: { bookId: string; initialItems: PageListItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function commit(next: PageListItem[]) {
    const previous = items;
    setItems(next);
    setError(null);
    startTransition(async () => {
      const res = await reorderPagesAction(bookId, next.map((i) => i.id));
      if (!res.ok) {
        setItems(previous);
        setError(res.error);
      }
    });
  }

  const move = (from: number, to: number) => commit(arrayMove(items, from, to));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  return (
    <div className="space-y-2">
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{error ?? ""}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul
            aria-busy={pending}
            className={`divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 ${pending ? "opacity-70" : ""}`}
          >
            {items.map((item, i) => (
              <Row key={item.id} item={item} index={i} total={items.length} bookId={bookId} onMove={move} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
