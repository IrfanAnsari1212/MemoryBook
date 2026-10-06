import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./index";
import { getDb } from "@/lib/db";
import { ADMIN_ROLES } from "./roles";

/**
 * Returns the current admin user, verified against the database (so deleted or
 * demoted users lose access immediately even if their JWT is still valid).
 * Never returns the password hash.
 */
export const getAdminUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await getDb().user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user || !ADMIN_ROLES.includes(user.role)) return null;
  return user;
});

/** Use at the top of every admin page, layout, server action and route handler. */
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}
