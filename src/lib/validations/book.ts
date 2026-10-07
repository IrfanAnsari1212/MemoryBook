import { z } from "zod";
import { BookStatus, Visibility } from "@/generated/prisma/enums";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .transform((v) => (v === "" ? null : v));

/** `YYYY-MM-DD` from <input type="date"> -> Date at UTC midnight, rejecting impossible dates. */
const dateField = z
  .string()
  .trim()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .transform((v, ctx) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    const year = d.getUTCFullYear();
    if (year < 1900 || year > 2200) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

export const idSchema = z.string().trim().min(1).max(64);

export const bookStatusSchema = z.enum(BookStatus);
export const visibilitySchema = z.enum(Visibility);

/** Only these fields are ever accepted from the client. ownerId etc. are never read. */
export const bookInputSchema = z.object({
  title: required("Book name", 120),
  recipientName: required("Recipient name", 80),
  senderName: required("Sender name", 80),
  occasion: required("Occasion", 80),
  date: dateField,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug must be at least 3 characters")
    .max(80, "Slug must be at most 80 characters")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only"),
  coverTitle: optionalText(160),
  coverSubtitle: optionalText(240),
  visibility: visibilitySchema,
  status: bookStatusSchema,
});

export type BookInput = z.infer<typeof bookInputSchema>;

export const setStatusSchema = z.object({ bookId: idSchema, status: bookStatusSchema });
export const setVisibilitySchema = z.object({ bookId: idSchema, visibility: visibilitySchema });

/** Permanent deletion: the id plus the book name typed by the user. The owner is never part of the input. */
export const deleteBookSchema = z.object({
  bookId: idSchema,
  confirmTitle: z.string().min(1, "Type the book name to confirm.").max(200),
});
