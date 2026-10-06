import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    // Do not leak connection details.
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
