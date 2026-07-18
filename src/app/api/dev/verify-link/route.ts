/**
 * /api/dev/verify-link — DEV-ONLY: return the email-confirmation URL for the
 * signed-in account.
 *
 * The confirmation link is a stateless HMAC-signed token delivered by email.
 * The browser journey harness (scripts/browser-journey.mjs) has to follow that
 * link to prove the deposit gate actually opens, but it has no inbox to read.
 * Rather than reach into the token internals from the test — which would let the
 * test pass while the REAL link was broken — this returns the exact URL
 * `buildEmailVerifyUrl` produces, i.e. the same string the mail contains.
 *
 * ⛔ 404 in production. It reveals a token that confirms an address, so it must
 * never exist on a live deployment; the guard is the first thing in the handler,
 * ahead of any session or DB work. Mirrors /auth/demo's posture.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { buildEmailVerifyUrl } from "@/lib/server/email-verification";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  const user = await db.user.findById(session.userId);
  if (!user?.email) return NextResponse.json({ ok: false, error: "No email on this account" }, { status: 400 });

  return NextResponse.json({ ok: true, url: buildEmailVerifyUrl(user.id, user.email) });
}
