"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/auth/rate-limit";

export type LoginState = { error?: string };

const GENERIC = "Invalid email or password.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: GENERIC };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed =
    rateLimit(`login:ip:${ip}`, 20, 15 * 60_000) &&
    rateLimit(`login:email:${parsed.data.email}`, 5, 15 * 60_000);
  if (!allowed) return { error: "Too many attempts. Please try again later." };

  try {
    // On success signIn throws a redirect, which must propagate.
    await signIn("credentials", { ...parsed.data, redirectTo: "/admin" });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: e.type === "CredentialsSignin" ? GENERIC : "Sign-in failed. Please try again." };
    }
    throw e;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
