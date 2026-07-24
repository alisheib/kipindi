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
  try {
    const uptimeSec = Math.floor((Date.now() - BOOT_AT) / 1000);
    let userCount = -1;
    try { userCount = await db.user.count(); } catch { /* graceful */ } // audit H4 — COUNT(*), not a full scan every probe
    const auditCount = auditRingSize();
    const smsHealth = smsHealthSnapshot();
    // OPS READ → productLine "ALL". A health probe reports what the platform is
    // actually running; a stalled Up & Down chain must show up here as a live-market
    // count that stops moving, not be filtered out of the signal.
    const liveMarkets = await listMarkets({ status: "LIVE", productLine: "ALL" }).then((l) => l.length).catch(() => -1);
    const resolvedMarkets = await listMarkets({ status: "RESOLVED", productLine: "ALL" }).then((l) => l.length).catch(() => -1);

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
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "health-check-failed", message: String(err) },
      { status: 500, headers: { "cache-control": "no-store", "x-health": "error" } },
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { "x-health": "ok", "cache-control": "no-store" } });
}
