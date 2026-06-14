/**
 * Tests the "notify officers a real market is awaiting resolution" sweep +
 * confirms demo markets auto-resolve on expiry while real ones don't.
 * In-memory store. Run: npx tsx scripts/market-resolution-notify.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { marketStore } from "../src/lib/server/market-dal.ts";
import { notifyDueMarketsForResolution, autoResolveExpiredDemoMarkets } from "../src/lib/server/market-service.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date();
const past = new Date(now.getTime() - 3 * 24 * 3600_000).toISOString(); // 3 days ago
const iso = now.toISOString();

function mkMarket(id: string, titleEn: string, status = "LIVE") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return marketStore.set({
    id, titleEn, titleSw: "SW", category: "crypto", sourceUrl: "https://x", resolutionCriterion: "crit",
    resolutionAt: past, status, yesPool: 1000, noPool: 1000, predictorCount: 2, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, resolutionNotifiedAt: null, proposedBy: "system", createdAt: iso, updatedAt: iso,
  } as any);
}
async function mkAdmin(id: string, role: string) {
  await db.user.create({
    id, phoneE164: `+25571${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: role as never, status: "ACTIVE", locale: "EN", displayName: role, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
  });
}

await mkAdmin("usr_mkt_admin1", "ADMIN");
await mkAdmin("usr_mkt_comp1", "COMPLIANCE");
await mkAdmin("usr_mkt_player", "PLAYER"); // must NOT be notified

// 1. A real, closed-by-time, LIVE market → officers alerted once.
await mkMarket("mkt_real_1", "Will BTC daily close be green?");
let r = await notifyDueMarketsForResolution();
ok("real due market → notified", r.notified === 1, `notified=${r.notified}`);
ok("admin got 'Market awaiting resolution'", !!(await listForUser("usr_mkt_admin1", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("compliance got it too", !!(await listForUser("usr_mkt_comp1", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("player did NOT get it", !(await listForUser("usr_mkt_player", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("notification deep-links to resolver queue", (await listForUser("usr_mkt_admin1", 20)).find((n) => n.titleEn === "Market awaiting resolution")?.href === "/admin/resolver-queue");
ok("resolutionNotifiedAt stamped", !!(await marketStore.get("mkt_real_1"))?.resolutionNotifiedAt);

// 2. Idempotent — second sweep notifies nobody new.
r = await notifyDueMarketsForResolution();
ok("second sweep → no re-notify", r.notified === 0, `notified=${r.notified}`);
const adminNotes = (await listForUser("usr_mkt_admin1", 50)).filter((n) => n.titleEn === "Market awaiting resolution");
ok("exactly one alert per market", adminNotes.length === 1, `count=${adminNotes.length}`);

// 3. A still-open market (future resolutionAt) is NOT alerted.
await marketStore.set({ ...(await marketStore.get("mkt_real_1"))!, id: "mkt_future", resolutionNotifiedAt: null, resolutionAt: new Date(now.getTime() + 86400_000).toISOString() });
r = await notifyDueMarketsForResolution();
ok("future market not alerted", r.notified === 0);

// 4. Demo market that's expired → auto-resolves (real ones never do).
await mkMarket("mkt_demo_1", "Demo · auto resolve me");
const ar = await autoResolveExpiredDemoMarkets();
ok("demo market auto-resolved", ar.resolved >= 1, `resolved=${ar.resolved}`);
ok("demo market now RESOLVED", (await marketStore.get("mkt_demo_1"))?.status === "RESOLVED");
ok("real market still LIVE (manual)", (await marketStore.get("mkt_real_1"))?.status === "LIVE");
// Demo markets must NOT generate resolution-due alerts (they self-resolve).
ok("demo did not alert officers", !(await listForUser("usr_mkt_admin1", 50)).find((n) => n.bodyEn?.includes("auto resolve me")));

console.log(`\n${fail === 0 ? "ALL MARKET-RESOLUTION SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
