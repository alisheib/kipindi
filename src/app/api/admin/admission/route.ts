/**
 * GET /api/admin/admission — live bet-queue health.
 *
 * The operator's window into whether players are waiting. Admission converts
 * saturation from errors into latency, which is the right trade — but it makes
 * saturation INVISIBLE unless someone can see the queue. This is that view:
 * in-flight, queue depth, wait percentiles, and how many bets were shed or timed
 * out (both of which mean players were actually turned away).
 *
 * Read-only. It reports in-process counters for THIS container, so with more than
 * one instance each reports its own share — stated in the payload rather than
 * silently presented as a platform-wide total.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, CONFIG_ROLES } from "@/lib/server/roles";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { db } from "@/lib/server/store";
import { admissionSnapshot } from "@/lib/server/admission";
import { retrySnapshot } from "@/lib/server/retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Role tier — see @/lib/server/roles. Queue health is operational config, not
// money data or PII, so CONFIG_ROLES rather than MONEY_ROLES.
const ADMIN_ROLES = CONFIG_ROLES;

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });

  // Middleware cannot see roles, and a route handler bypasses the admin layout —
  // so re-check both here or a direct GET would skip the whole admin gate.
  const me = await db.user.findById(session.userId);
  if (!me || !hasRole(me.role, ADMIN_ROLES)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // checkAdminTotp, NOT requireAdminTotp: the latter throws NEXT_REDIRECT, which
  // corrupts a JSON response.
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
  }

  const snap = admissionSnapshot();
  return NextResponse.json({
    ok: true,
    scope: "this container only — counters are in-process",
    admission: snap,
    retries: retrySnapshot(),
    redis: redisHealth(),
  });
}

/** Redis is optional and fail-open; report it honestly rather than implying health. */
function redisHealth(): { configured: boolean; note: string } {
  const configured = !!process.env.REDIS_URL;
  return {
    configured,
    note: configured
      ? "REDIS_URL set — used for cross-container rate limits and SSE fan-out only, never the bet path"
      : "REDIS_URL not set — rate limits and SSE are per-container. Bets are unaffected either way.",
  };
}
