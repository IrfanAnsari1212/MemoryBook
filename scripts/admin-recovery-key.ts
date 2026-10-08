/**
 * Issue (or replace) the admin recovery key from your own machine. No email or password needed, so this
 * works when both are forgotten. Prints the key ONCE to your terminal; only its hash is stored.
 *   npm run admin:recovery-key
 * If more than one admin exists, pass ADMIN_EMAIL to choose which.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateRecoveryKey, hashRecoveryKey } from "../src/lib/auth/recovery";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "OWNER"] }, ...(email ? { email } : {}) },
      select: { id: true },
    });
    if (admins.length === 0) throw new Error("No matching admin found.");
    if (admins.length > 1) throw new Error("More than one admin exists. Set ADMIN_EMAIL to choose one.");
    const key = generateRecoveryKey();
    await db.user.update({ where: { id: admins[0].id }, data: { recoveryKeyHash: hashRecoveryKey(key) } });
    console.log("Recovery key (shown once, save it now):\n\n  " + key + "\n");
    console.log("Use it at /forgot-password to set a new email and password.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Failed to create a recovery key.");
  process.exit(1);
});
