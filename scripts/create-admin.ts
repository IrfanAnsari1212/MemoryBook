/**
 * Bootstrap the first admin (see docs/ADMIN_SETUP.md):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run admin:create
 * Never prints the password or its hash.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { credentialsSchema } from "../src/lib/validations/auth";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const parsed = credentialsSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!parsed.success) throw new Error("ADMIN_EMAIL must be a valid email and ADMIN_PASSWORD must be set.");
  const { email, password } = parsed.data;
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const existing = await db.user.count({ where: { role: { in: ["ADMIN", "OWNER"] } } });
    if (existing > 0) {
      console.log("An admin already exists. Nothing to do.");
      return;
    }
    await db.user.create({
      data: { email, passwordHash: await hashPassword(password), role: "ADMIN" },
    });
    console.log("Admin created.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Failed to create admin.");
  process.exit(1);
});
