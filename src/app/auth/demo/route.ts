import { NextResponse } from "next/server";
import { enterDemoMode, isDemoModeAllowed } from "@/lib/server/demo-mode";

export async function POST() {
  if (!isDemoModeAllowed()) return NextResponse.json({ ok: false, error: "Demo disabled" }, { status: 403 });
  const result = await enterDemoMode();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function GET() {
  if (!isDemoModeAllowed()) return NextResponse.json({ ok: false, error: "Demo disabled" }, { status: 403 });
  const result = await enterDemoMode();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
