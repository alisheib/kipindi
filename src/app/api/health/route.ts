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
import { leadershipSnapshot } from "@/lib/server/leader";
import { isAdminTotpEnforced } from "@/lib/server/admin-guard";
import { redisHealth } from "@/lib/server/redis";
import { emailHealth } from "@/lib/server/email";

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
        // Which instance is actually running the chores. With one container this always
        // reads `isMe: true`; with two it is the only way to see that exactly one of them
        // is sweeping, and which. `admission` stays per-container by design — see
        // docs/POLISH-BACKLOG.md §3 for the pool arithmetic that implies.
        leadership: leadershipSnapshot(),
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
        // 🔴 Is the admin console actually behind 2FA? `DISABLE_ADMIN_TOTP=true` has been set on
        // production and NOTHING reported it — not here, not the boot checks, not /admin/system —
        // so "is admin 2FA on?" was answerable only by reading Railway's variable list, which is
        // exactly how the alerting question used to be answered before it was surfaced above.
        // Reported for the same reason: a password-only admin console must not be a silent state.
        security: {
          adminTotp: isAdminTotpEnforced() ? "enforced" : "DISABLED",
        },
        // 🔴 Is transactional email actually being delivered? Every send on this
        // platform is fire-and-forget from a money or auth path, and the failure
        // path was one `console.error` — so a Postmark key that died would have
        // stopped every deposit receipt, withdrawal confirmation, KYC decision
        // and verification link with NOTHING to see. In the sibling AWARKEH repo
        // exactly that happened and went unnoticed. `status` is a word, not a
        // boolean, for the same reason `adminTotp` is.
        email: emailHealth(),
        // 🔴 Is the cross-container layer actually ON? Redis is armed by TWO variables
        // (`REDIS_ENABLED=true` AND `REDIS_URL`) precisely so configuring it and activating
        // it are separate acts — but that also means "is it on?" had four possible answers
        // (neither key, one key, both keys but not connected, connected) and only an
        // admin-gated page could tell you which. A Redis service was provisioned and Online
        // on this project for weeks while the application could not see it, and nothing said
        // so. Reported here for the same reason as `alerting` and `adminTotp` above.
        //
        // ⚠️ What turning it on CHANGES, so the answer is meaningful: rate limits become
        // cross-container (audit H2 — two containers each granting the full per-phone OTP,
        // login and register budget), and SSE frames fan out between containers. It is
        // deliberately NOT on the bet or admission path, and every access is fail-open, so
        // `connected: false` while `configured: true` is a degraded cache, never an outage.
        //
        // ⛔ No URL, no credentials — booleans, a status word and a last-error string only.
        redis: (() => {
          const h = redisHealth();
          return {
            configured: h.configured,
            enabled: h.enabled,
            urlPresent: h.urlPresent,
            connected: h.connected,
            clientStatus: h.clientStatus,
            subscribed: h.subscribed,
            breakerOpen: h.breakerOpen,
            // ⚠️ WITHOUT THIS, "UNREACHABLE" IS A DIAGNOSTIC DEAD END. The state word says
            // something is wrong; only the error says what, and the difference between
            // ENOTFOUND (DNS / IPv6), ECONNREFUSED (wrong port or Redis down), WRONGPASS
            // (stale credential after a rotation) and "construct:" (a malformed URL) is the
            // difference between four completely different operator actions.
            //
            // ⛔ CREDENTIALS SCRUBBED. `errText` is only a truncated `err.message`, and ioredis
            // messages carry host:port rather than secrets — but a construct-time throw on a
            // malformed URL can echo the URL back, and that URL contains the password. So any
            // `//user:pass@` is rewritten before it can be served on a PUBLIC endpoint. Adding
            // a field to a public health payload is exactly where a secret leaks by accident.
            lastError: h.lastError ? h.lastError.replace(/\/\/[^/@\s]*:[^/@\s]*@/g, "//***:***@") : null,
            subscriberError: h.subscriberError ? h.subscriberError.replace(/\/\/[^/@\s]*:[^/@\s]*@/g, "//***:***@") : null,
            // A word, not a boolean, for the same reason `adminTotp` is — and FOUR words, not
            // three, because the first version of this line got it wrong in the way this whole
            // audit has been about.
            //
            // ⚠️ It read `connected ? "cross-container" : "ARMED BUT UNREACHABLE"`, and on the
            // first deploy after arming it duly reported UNREACHABLE. Redis was fine: an
            // `ioredis` PING from inside the container returned PONG with a SET/GET round trip
            // and `status: ready`. The module is LAZY — `getRedis()` constructs nothing until a
            // caller needs it — so 39 seconds after boot, with no login or OTP yet, there was
            // simply no client. `clientStatus: "none"` means *not yet built*, which is not the
            // same fact as *cannot connect*, and collapsing the two would have put a false
            // alarm on a health endpoint. That is precisely the defect fixed in
            // `verifyChainFull` earlier in this audit: a control that cries wolf gets ignored,
            // and then the real alarm is ignored too.
            //
            // ⛔ Health must not construct a client to find out. A health check with a side
            // effect is a health check that can cause the outage it reports.
            state: !h.enabled || !h.urlPresent ? "OFF (in-memory fallback)"
              : h.connected ? "cross-container"
              : h.clientStatus === "none" && !h.lastError ? "ARMED — no client yet (lazy; first login or OTP builds it)"
              : "ARMED BUT UNREACHABLE — falling back in-memory",
          };
        })(),
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
