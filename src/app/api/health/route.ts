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
import { lifecycleTickerHealth } from "@/lib/server/lifecycle";
import { isMonitoringEnabled } from "@/lib/server/monitoring";

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
        // The lifecycle ticker owns payment reconcile and the wallet↔ledger trial
        // balance. It skips a tick rather than overlap passes — correct, but it used
        // to do so silently, so a stalled settlement was invisible until a player
        // complained. A non-zero `skippedConsecutive` here means those chores are
        // NOT running right now. See lifecycle.ts → OVERRUN_ALERT_SKIPS.
        ticker: lifecycleTickerHealth(),
        // Whether anything would TELL you about an error, as opposed to recording it.
        // Server exceptions are durable on box either way (audit chain, scrubbed and
        // deduped); `alerting: false` means nobody is paged and someone has to go and
        // look. Reported here because "is alerting on?" was previously answerable only
        // by reading Railway's variable list.
        monitoring: {
          durable: true,
          alerting: isMonitoringEnabled(),
          sink: isMonitoringEnabled() ? "audit-chain + sentry" : "audit-chain only",
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
