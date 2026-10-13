/** Local WP11a sitting clock, through the actual session gate, for the authenticated synthetic QA player only. */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import { checkSessionTimeLimit, getRgSettings } from "@/lib/server/responsible-gambling";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (process.env.DATABASE_URL || hasDatabase()) {
    return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => key !== "elapsedMin")
    || !Number.isInteger(input.elapsedMin) || input.elapsedMin < 15 || input.elapsedMin > 120) {
    return NextResponse.json({ ok: false, error: "One bounded elapsedMin required" }, { status: 400 });
  }
  const user = await db.user.findById(session.userId);
  if (!user || user.role !== "PLAYER" || user.displayName !== "Local Sheet Matrix" || !/^\+25571\d{7}$/.test(user.phoneE164)) {
    return NextResponse.json({ ok: false, error: "Synthetic QA player required" }, { status: 403 });
  }
  const settings = await getRgSettings(session.userId);
  if (settings.sessionTimeLimitMin !== 15) return NextResponse.json({ ok: false, error: "Set the real 15-minute limit first" }, { status: 409 });
  const now = Date.now();
  const standing = await checkSessionTimeLimit(session.userId, now - input.elapsedMin * 60000, now);
  return NextResponse.json({ ok: true, standing }, { headers: { "Cache-Control": "no-store" } });
}
