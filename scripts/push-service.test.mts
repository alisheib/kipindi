/**
 * F4 — web push (in-memory store, VAPID unset → stub mode).
 *
 * Locks:
 *  - subscriptions persist per-device (endpoint-keyed) and are owner-scoped
 *  - re-subscribing the same endpoint refreshes rather than duplicating
 *  - opt-out removes the subscription (we stop sending immediately)
 *  - RG: a self-excluded / cooling-off player is NEVER pushed at (suppressed +
 *    audited), even with live subscriptions — push is outbound engagement
 *  - stub mode (no VAPID) never throws and never pretends to have delivered
 *  - sendPushToUser never throws, for any input
 *
 * Run: npx tsx scripts/push-service.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
delete process.env.VAPID_PUBLIC_KEY;   // force stub mode
delete process.env.VAPID_PRIVATE_KEY;

import { db } from "../src/lib/server/store.ts";
import {
  savePushSubscription, removePushSubscription, sendPushToUser, pushDeviceCount, pushEnabled,
} from "../src/lib/server/push-service.ts";
import { selfExclude, coolOff } from "../src/lib/server/responsible-gambling.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const nowIso = new Date().toISOString();
let seq = 0;

async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25593${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
}

const sub = (n: string) => ({ endpoint: `https://push.example.com/${n}`, p256dh: `p256_${n}`, auth: `auth_${n}` });

// ── 0. Stub mode ──────────────────────────────────────────────────────────
ok("VAPID unset → pushEnabled() false (stub mode)", pushEnabled() === false);

// ── 1. Subscribe / device count / refresh ─────────────────────────────────
await mkUser("ps_a");
{
  ok("no devices initially", (await pushDeviceCount("ps_a")) === 0);
  await savePushSubscription("ps_a", sub("dev1"));
  ok("one device after subscribe", (await pushDeviceCount("ps_a")) === 1);
  await savePushSubscription("ps_a", sub("dev2"));
  ok("two devices", (await pushDeviceCount("ps_a")) === 2);
  // Same endpoint again → refresh, NOT a duplicate.
  await savePushSubscription("ps_a", { ...sub("dev1"), p256dh: "rotated" });
  ok("re-subscribing an endpoint does not duplicate", (await pushDeviceCount("ps_a")) === 2);
  const rows = await db.pushSub.listForUser("ps_a");
  ok("the refreshed key was stored", rows.some((r) => r.p256dh === "rotated"));
}

// ── 2. Opt-out removes the subscription ──────────────────────────────────
{
  await removePushSubscription("ps_a", sub("dev1").endpoint);
  ok("device removed on opt-out", (await pushDeviceCount("ps_a")) === 1);
  const rows = await db.pushSub.listForUser("ps_a");
  ok("removed endpoint is gone", !rows.some((r) => r.endpoint === sub("dev1").endpoint));
}

// ── 3. Owner scoping — one user's devices are not another's ──────────────
await mkUser("ps_b");
{
  await savePushSubscription("ps_b", sub("bdev"));
  ok("ps_b has its own device", (await pushDeviceCount("ps_b")) === 1);
  ok("ps_a unaffected", (await pushDeviceCount("ps_a")) === 1);
  const bRows = await db.pushSub.listForUser("ps_b");
  ok("ps_b's list contains only its endpoint", bRows.length === 1 && bRows[0].endpoint === sub("bdev").endpoint);
}

// ── 4. Stub mode sends nothing but never throws ──────────────────────────
{
  const sent = await sendPushToUser("ps_a", { title: "T", body: "B", url: "/markets" });
  ok("stub mode reports 0 delivered (honest)", sent === 0);
  const none = await sendPushToUser("ps_nobody", { title: "T", body: "B" });
  ok("unknown user → 0, no throw", none === 0);
}

// ── 5. RG — an excluded player is NEVER pushed at, even with live devices ─
await mkUser("ps_excluded");
await mkUser("ps_cooled");
{
  await savePushSubscription("ps_excluded", sub("exdev"));
  await savePushSubscription("ps_cooled", sub("cooldev"));
  ok("excluded user has a live device", (await pushDeviceCount("ps_excluded")) === 1);

  await selfExclude("ps_excluded", "1m");
  await coolOff("ps_cooled", "24h");

  const s1 = await sendPushToUser("ps_excluded", { title: "T", body: "B" });
  const s2 = await sendPushToUser("ps_cooled", { title: "T", body: "B" });
  ok("self-excluded → suppressed (0 sent)", s1 === 0);
  ok("cooling-off → suppressed (0 sent)", s2 === 0);

  // audit() is fire-and-forget — let it flush before asserting the trail.
  await new Promise((r) => setTimeout(r, 150));
  const audits = getAuditPage({ limit: 300 }).filter((e: { action: string }) => e.action === "push.suppressed.rg_lockout");
  ok("suppression is audited for compliance", audits.length >= 2, `n=${audits.length}`);

  // The subscription itself survives — a break silences push, it doesn't destroy setup.
  ok("excluded user's device is preserved", (await pushDeviceCount("ps_excluded")) === 1);
}

// ── 6. Never throws on hostile input ─────────────────────────────────────
{
  const a = await sendPushToUser("", { title: "", body: "" });
  const b = await sendPushToUser("ps_a", { title: "x".repeat(5000), body: "y".repeat(5000), url: "javascript:alert(1)" });
  ok("empty userId → 0, no throw", a === 0);
  ok("huge payload / hostile url → no throw", typeof b === "number");
}

console.log(`\npush-service: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
