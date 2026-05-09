/**
 * Liveness + readiness probe.
 *
 * GET /api/health → 200 with a small JSON body describing system health:
 *   { ok: true, uptimeSec, store: { users, audit, markets }, sms, version }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { sms, smsHealthSnapshot } from "@/lib/server/sms";
import { listMarkets } from "@/lib/server/market-service";
import { auditRingSize } from "@/lib/server/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOOT_AT = Date.now();

export async function GET() {
  const uptimeSec = Math.floor((Date.now() - BOOT_AT) / 1000);
  const userCount = db.user.list().length;
  const auditCount = auditRingSize();
  const smsHealth = smsHealthSnapshot();
  const liveMarkets = listMarkets({ status: "LIVE" }).length;
  const resolvedMarkets = listMarkets({ status: "RESOLVED" }).length;

  return NextResponse.json(
    {
      ok: true,
      uptimeSec,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      store: {
        users: userCount,
        auditEntries: auditCount,
        marketsLive: liveMarkets,
        marketsResolved: resolvedMarkets,
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
