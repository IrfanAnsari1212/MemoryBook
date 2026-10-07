import { z } from "zod";
import { idSchema } from "@/lib/validations/book";
import { EXPIRY_KEYS, LABEL_MAX } from "./policy";

/** The only fields a client may send when creating a link. No token, no owner id, no timestamps. */
export const createShareSchema = z.object({
  bookId: idSchema,
  expiry: z.enum(EXPIRY_KEYS, { error: "Choose a valid expiry" }),
  label: z
    .string()
    .max(LABEL_MAX, `Label must be at most ${LABEL_MAX} characters`)
    .transform((v) => v.trim())
    .refine((v) => !/[<>]/.test(v), "Label cannot contain < or >")
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Label contains invalid characters")
    .transform((v) => (v === "" ? null : v)),
});

export const revokeShareSchema = z.object({ bookId: idSchema, linkId: idSchema });
