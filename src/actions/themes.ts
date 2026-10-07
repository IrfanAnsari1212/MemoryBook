"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getOwnedBookOrNotFound } from "@/lib/books";
import { idSchema } from "@/lib/validations/book";
import { THEME_FIELDS, themeConfigSchema, themeInputSchema } from "@/lib/themes/schema";
import { toRow } from "@/lib/themes/resolve";

export type ThemeFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

function readFields(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of THEME_FIELDS) {
    const v = fd.get(k);
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

/** Validate and convert to table columns. Config is validated a second time against the strict stored shape. */
function parseTheme(values: Record<string, string>) {
  const parsed = themeInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, state: { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors, values } satisfies ThemeFormState };
  }
  const row = toRow(parsed.data);
  return { ok: true as const, row: { ...row, config: themeConfigSchema.parse(row.config) as Prisma.InputJsonObject } };
}

const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const NAME_TAKEN: ThemeFormState["fieldErrors"] = { name: ["You already have a theme with this name."] };

export async function createThemeAction(_prev: ThemeFormState, formData: FormData): Promise<ThemeFormState> {
  const user = await requireAdmin();
  const values = readFields(formData);
  const r = parseTheme(values);
  if (!r.ok) return r.state;

  try {
    await getDb().theme.create({ data: { ownerId: user.id, isPreset: false, ...r.row } }); // owner from the session only
  } catch (e) {
    if (isUnique(e)) return { error: "Please fix the highlighted fields.", fieldErrors: NAME_TAKEN, values };
    console.error("createTheme failed");
    return { error: "Could not save the theme. Please try again.", values };
  }
  revalidatePath("/admin/themes");
  redirect("/admin/themes");
}

export async function updateThemeAction(_prev: ThemeFormState, formData: FormData): Promise<ThemeFormState> {
  const user = await requireAdmin();
  const id = idSchema.safeParse(formData.get("themeId"));
  if (!id.success) notFound();
  // Only the owner's own (non built-in) themes can be edited; anything else looks like it does not exist.
  const existing = await getDb().theme.findFirst({ where: { id: id.data, ownerId: user.id }, select: { id: true } });
  if (!existing) notFound();

  const values = readFields(formData);
  const r = parseTheme(values);
  if (!r.ok) return r.state;

  let count: number;
  try {
    ({ count } = await getDb().theme.updateMany({ where: { id: existing.id, ownerId: user.id }, data: r.row }));
  } catch (e) {
    if (isUnique(e)) return { error: "Please fix the highlighted fields.", fieldErrors: NAME_TAKEN, values };
    console.error("updateTheme failed");
    return { error: "Could not save the theme. Please try again.", values };
  }
  if (count === 0) notFound();
  revalidatePath("/admin/themes");
  redirect("/admin/themes");
}

/** Assign a theme to a book ("" = no theme, i.e. the built-in Soft Blush). Both sides are ownership-checked. */
export async function assignBookThemeAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const bookId = idSchema.safeParse(formData.get("bookId"));
  if (!bookId.success) throw new Error("Invalid request.");
  const book = await getOwnedBookOrNotFound(user.id, bookId.data);

  const raw = String(formData.get("themeId") ?? "");
  let themeId: string | null = null;
  if (raw !== "") {
    const t = idSchema.safeParse(raw);
    if (!t.success) throw new Error("Invalid request.");
    const theme = await getDb().theme.findFirst({
      where: { id: t.data, OR: [{ ownerId: user.id }, { ownerId: null, isPreset: true }] },
      select: { id: true },
    });
    if (!theme) notFound(); // someone else's theme is indistinguishable from a missing one
    themeId = theme.id;
  }

  await getDb().memoryBook.updateMany({ where: { id: book.id, ownerId: user.id }, data: { themeId } });
  revalidatePath(`/admin/books/${book.id}`);
}
