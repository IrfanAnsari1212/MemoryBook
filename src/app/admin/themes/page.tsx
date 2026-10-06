import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Themes" };

export default async function Page() {
  await requireAdmin();
  return <ComingSoon title="Themes" module={7} />;
}
