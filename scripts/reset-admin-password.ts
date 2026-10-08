/**
 * Reset an admin's password (see docs/ADMIN_SETUP.md):
 *   ADMIN_EMAIL=you@example.com NEW_PASSWORD=... npm run admin:reset
 * Only updates the password of an EXISTING admin; never creates users and never prints the password or hash.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { credentialsSchema } from "../src/lib/validations/auth";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const parsed = credentialsSchema.safeParse({ email: process.env.ADMIN_EMAIL, password: process.env.NEW_PASSWORD });
  if (!parsed.success) throw new Error("ADMIN_EMAIL must be a valid email and NEW_PASSWORD must be set.");
  const { email, password } = parsed.data;
  if (password.length < 12) throw new Error("NEW_PASSWORD must be at least 12 characters.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user || !["ADMIN", "OWNER"].includes(user.role)) throw new Error("No admin with that email.");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    console.log("Password updated. Log in with the new password.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Failed to reset password.");
  process.exit(1);
});
