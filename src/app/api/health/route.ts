/**
 * Liveness + readiness probe.
 *
 * GET /api/health → 200 with a small JSON body describing system health:
 *   { ok: true, uptimeSec, store: { users, audit }, matchFeed, sms, version }
 *
 * Used by:
 *  - Railway health-check (returns 200 means "keep traffic flowing")
 *  - ISO 27001 + GLI-19 reviewers wanting a public ping
 *  - The /admin/system page (extends this with bucket-level detail)
 *
 * Intentionally exposes no PII and no secrets — anyone can hit this.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { getActiveAdapter } from "@/lib/server/match-feed";
import { sms, smsHealthSnapshot } from "@/lib/server/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOOT_AT = Date.now();

export async function GET() {
  const uptimeSec = Math.floor((Date.now() - BOOT_AT) / 1000);
  const matchFeed = getActiveAdapter();
  const userCount = db.user.list().length;
  const auditRing = (globalThis as { __KIPINDI_AUDIT_RING?: unknown[] }).__KIPINDI_AUDIT_RING ?? [];
  const smsHealth = smsHealthSnapshot();

  return NextResponse.json(
    {
      ok: true,
      uptimeSec,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      store: {
        users: userCount,
        auditEntries: auditRing.length,
      },
      matchFeed: {
        provider: matchFeed.name,
        ok: true,
      },
      sms: {
        provider: sms.name,
        successRate: smsHealth.successRate,
      },
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-health": "ok",
      },
    },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { "x-health": "ok", "cache-control": "no-store" } });
}
