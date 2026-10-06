import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { credentialsSchema } from "@/lib/validations/auth";
import { verifyAgainstDummy, verifyPassword } from "./password";
import { authConfig } from "./config";
import { ADMIN_ROLES } from "./roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await getDb().user.findUnique({ where: { email } });
        if (!user) {
          await verifyAgainstDummy(password);
          return null;
        }
        if (!(await verifyPassword(user.passwordHash, password))) return null;
        if (!ADMIN_ROLES.includes(user.role)) return null;

        // Never include passwordHash here (the returned object is copied into the JWT).
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
