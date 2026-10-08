"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { generateRecoveryKey, hashRecoveryKey, recoverAccount } from "@/lib/auth/recovery";

export type RecoverState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** The replacement key, shown once after a successful recovery. */
  newKey?: string;
};

/** Public "forgot email or password" action. The recovery key is the credential. */
export async function recoverAccountAction(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`recover:ip:${ip}`, 10, 15 * 60_000) || !rateLimit("recover:global", 30, 60 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  const result = await recoverAccount(
    {
      recoveryKey: formData.get("recoveryKey") ?? "",
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      confirm: formData.get("confirm") ?? "",
    },
    {
      hashPassword,
      findAdminByKeyHash: (recoveryKeyHash) =>
        getDb().user.findFirst({ where: { recoveryKeyHash, role: { in: [...ADMIN_ROLES] } }, select: { id: true } }),
      updateAccount: async (id, data) => {
        try {
          await getDb().user.update({ where: { id }, data });
          return "ok";
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            // Either the email belongs to someone else, or (astronomically unlikely) the new key hash collided.
            return "email_taken";
          }
          console.error("recoverAccount failed");
          throw e;
        }
      },
    },
  );
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  return { newKey: result.newKey };
}

export type GenerateKeyState = { error?: string; newKey?: string };

/** Signed-in admins issue (or replace) their recovery key after re-entering their current password. */
export async function generateRecoveryKeyAction(_prev: GenerateKeyState, formData: FormData): Promise<GenerateKeyState> {
  const user = await requireAdmin();
  if (!rateLimit(`recovery-key:${user.id}`, 5, 15 * 60_000)) return { error: "Too many attempts. Please try again later." };

  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0 || password.length > 256) return { error: "Enter your current password." };
  const row = await getDb().user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(row.passwordHash, password))) return { error: "That password is incorrect." };

  const key = generateRecoveryKey();
  await getDb().user.update({ where: { id: user.id }, data: { recoveryKeyHash: hashRecoveryKey(key) } });
  return { newKey: key };
}
