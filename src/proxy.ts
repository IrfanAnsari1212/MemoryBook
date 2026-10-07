import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Optimistic redirect only. Authoritative checks happen in requireAdmin().
export const proxy = NextAuth(authConfig).auth;

export const config = { matcher: ["/admin/:path*", "/preview/:path*"] };
