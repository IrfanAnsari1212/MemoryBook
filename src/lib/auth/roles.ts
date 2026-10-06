import type { Role } from "@/generated/prisma/enums";

/** Roles allowed into /admin. Extend here when more roles are introduced. */
export const ADMIN_ROLES: readonly Role[] = ["ADMIN", "OWNER"];
