/**
 * Account recovery key. 256 bits of CSPRNG output, shown to the admin ONCE and stored only as a SHA-256
 * hash (a fast hash is right here: the key is not human-chosen, so there is nothing to brute-force).
 * Possession of the key lets the admin set a new email + password, which also rotates the key.
 *
 * Free of `server-only`/Next imports so the flow can be unit-tested with fakes. Wiring: src/actions/recovery.ts.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { credentialsSchema } from "@/lib/validations/auth";

export const MIN_PASSWORD_LENGTH = 12;

export const generateRecoveryKey = () => randomBytes(32).toString("base64url");
export const hashRecoveryKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const isWellFormedRecoveryKey = (key: string) => /^[A-Za-z0-9_-]{43}$/.test(key);

export const recoverSchema = z
  .object({
    recoveryKey: z.string().trim().max(200),
    email: credentialsSchema.shape.email,
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`).max(256),
    confirm: z.string().max(256),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export type RecoverDeps = {
  hashPassword: (password: string) => Promise<string>;
  findAdminByKeyHash: (keyHash: string) => Promise<{ id: string } | null>;
  /** Sets email + password hash and replaces the key hash. Resolves "email_taken" on a unique violation. */
  updateAccount: (id: string, data: { email: string; passwordHash: string; recoveryKeyHash: string }) => Promise<"ok" | "email_taken">;
};

export type RecoverResult =
  | { ok: true; newKey: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const INVALID_KEY = "That recovery key isn't valid.";

export async function recoverAccount(input: Record<string, unknown>, deps: RecoverDeps): Promise<RecoverResult> {
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    // Do not say whether the key looked wrong before the rest of the form is valid; one generic message.
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { ...fieldErrors, recoveryKey: undefined } };
  }
  const { recoveryKey, email, password } = parsed.data;
  if (!isWellFormedRecoveryKey(recoveryKey)) return { ok: false, error: INVALID_KEY };

  const user = await deps.findAdminByKeyHash(hashRecoveryKey(recoveryKey));
  if (!user) return { ok: false, error: INVALID_KEY };

  const newKey = generateRecoveryKey(); // the old key is single-use: it is replaced in the same update
  const result = await deps.updateAccount(user.id, {
    email,
    passwordHash: await deps.hashPassword(password),
    recoveryKeyHash: hashRecoveryKey(newKey),
  });
  if (result === "email_taken") return { ok: false, error: "That email can't be used.", fieldErrors: { email: ["That email can't be used."] } };
  return { ok: true, newKey };
}
