import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "New Memory Book" };

export default async function NewBookPage() {
  await requireAdmin();
  return <ComingSoon title="Create Memory Book" module={3} />;
}
