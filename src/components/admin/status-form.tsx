import { setBookStatusAction } from "@/actions/books";
import type { BookStatus } from "@/generated/prisma/enums";
import { btnPrimary, btnSecondary } from "./book-ui";

/** Server-rendered publish / unpublish / restore control (archive lives in <ArchiveButton/>). */
export function StatusActionButton({ bookId, status }: { bookId: string; status: BookStatus }) {
  const next: { to: BookStatus; label: string; primary: boolean } =
    status === "PUBLISHED"
      ? { to: "DRAFT", label: "Unpublish", primary: false }
      : status === "DRAFT"
        ? { to: "PUBLISHED", label: "Publish", primary: true }
        : { to: "DRAFT", label: "Restore to Draft", primary: false };
  return (
    <form action={setBookStatusAction}>
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="status" value={next.to} />
      <button type="submit" className={next.primary ? btnPrimary : btnSecondary}>
        {next.label}
      </button>
    </form>
  );
}
