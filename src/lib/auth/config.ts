import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Edge-safe Auth.js config (no DB / hashing imports). Shared by the full
 * auth instance and by proxy.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    // Optimistic gate used by proxy.ts. Real authorization is re-checked
    // server-side (against the DB) in requireAdmin().
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/admin")) return !!auth?.user;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
