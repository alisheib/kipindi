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
import { redisHealth } from "@/lib/server/redis";

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
  // Real health from the client itself, not a guess from the env var. The
  // previous stub in this file reported only whether REDIS_URL was SET, which
  // would have shown a green "configured" against a Redis that had been
  // unreachable for hours — the operator needs `connected` and `breakerOpen` to
  // tell "cross-container limits are live" from "we quietly fell back".
  const redis = redisHealth();
  return NextResponse.json({
    ok: true,
    scope: "this container only — counters are in-process",
    admission: snap,
    retries: retrySnapshot(),
    redis: {
      ...redis,
      note: !redis.configured
        ? redis.urlPresent
          // Two keys arm the layer. Say which one is missing, or an operator who
          // set the URL reasonably assumes it is live.
          ? "REDIS_URL is set but REDIS_ENABLED is not \"true\" — the layer is inert by design. Rate limits and SSE are per-container."
          : "REDIS_URL not set — rate limits and SSE are per-container. Bets are unaffected either way."
        : redis.breakerOpen
          ? "Redis configured but the fail-open breaker is OPEN — degraded to per-container behaviour. Bets are unaffected."
          : redis.clientStatus === "end"
            ? "Redis client has ENDED and is not reconnecting — degraded to per-container behaviour until the container restarts. Bets are unaffected."
            : redis.connected
              // Connected is NOT the same as fanning out. A subscriber that is
              // 'ready' but subscribed to nothing looks identical from the
              // command client's side, so report the two independently.
              ? redis.subscribed
                ? "REDIS_ENABLED and connected — cross-container rate limits and SSE fan-out are live. Never on the bet path."
                : "Connected — cross-container rate limits are live, but SSE fan-out is NOT subscribed. Real-time updates are per-container."
              : "Redis armed but not connected — degraded to per-container behaviour. Bets are unaffected.",
    },
  });
}
