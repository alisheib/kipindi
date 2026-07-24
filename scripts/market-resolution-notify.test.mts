/**
 * Tests the "notify officers a real market is awaiting resolution" trigger +
 * confirms demo markets auto-resolve on expiry while real ones don't.
 *
 * The lifecycle sweep is gone: officers are now alerted by the PER-MARKET resolve
 * trigger (resolveDueMarket), which runs the AI check and then — on the human
 * fallback — stamps the market CLOSED + resolutionNotifiedAt and alerts officers.
 * Tests pass an explicit `assessment` so the AI call is never attempted.
 *
 * In-memory store. Run: npx tsx scripts/market-resolution-notify.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { marketStore } from "../src/lib/server/market-dal.ts";
import { resolveDueMarket, autoResolveExpiredDemoMarkets } from "../src/lib/server/market-service.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { marketResolutionAdminHtml } from "../src/lib/server/email.ts";
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
async function mkAdmin(id: string, role: string, email: string | null = null) {
  await db.user.create({
    id, phoneE164: `+25571${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: role as never, status: "ACTIVE", locale: "EN", displayName: role, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: null, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
  });
}

await mkAdmin("usr_mkt_admin1", "ADMIN", "mkt-admin@test.tz"); // has an email → must be MAILED
await mkAdmin("usr_mkt_comp1", "COMPLIANCE");
await mkAdmin("usr_mkt_player", "PLAYER", "player@test.tz"); // must NOT be notified or mailed

// 0. The admin email template renders with the market title + resolver link.
{
  const html = marketResolutionAdminHtml({ title: "Will BTC daily close be green?", closedAt: iso, reviewUrl: "/admin/resolver-queue" });
  ok("email template shows the market title", html.includes("Will BTC daily close be green?"));
  ok("email template links to the resolver queue", html.includes("/admin/resolver-queue"));
  ok("email template has a Resolve-now CTA", html.includes("Resolve now"));
}

// 1. A real, closed-by-time, LIVE market → resolve trigger takes the human fallback:
//    market CLOSED + officers alerted once (in-app + email), nothing sealed.
await mkMarket("mkt_real_1", "Will BTC daily close be green?");
// Capture console output so we can prove an email is actually dispatched (no
// POSTMARK key in the test → sendEmail logs an [email-stub] line per send).
const logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
// `assessment: null` = the AI found nothing (and is never called) → human fallback.
let r = await resolveDueMarket("mkt_real_1", { assessment: null });
await new Promise((res) => setTimeout(res, 150)); // let fire-and-forget emails flush
console.log = realLog;
const mailedLines = logs.filter((l) => l.includes("[email-stub]") && l.includes("Market awaiting resolution"));
ok("real due market → human fallback fired", r.status === "closed-human", `status=${r.status}`);
ok("admin got 'Market awaiting resolution'", !!(await listForUser("usr_mkt_admin1", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("compliance got it too", !!(await listForUser("usr_mkt_comp1", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("player did NOT get it", !(await listForUser("usr_mkt_player", 20)).find((n) => n.titleEn === "Market awaiting resolution"));
ok("notification deep-links to resolver queue", (await listForUser("usr_mkt_admin1", 20)).find((n) => n.titleEn === "Market awaiting resolution")?.href === "/admin/resolver-queue");
ok("admin WITH an email was emailed the resolution nudge", mailedLines.some((l) => l.includes("mkt-admin@test.tz")), `mailed=${JSON.stringify(mailedLines)}`);
ok("player was NOT emailed", !mailedLines.some((l) => l.includes("player@test.tz")));
ok("resolutionNotifiedAt stamped", !!(await marketStore.get("mkt_real_1"))?.resolutionNotifiedAt);
// The trigger now also closes the market to bets — and must NOT seal an outcome
// without the two-officer ceremony.
ok("market closed to bets (LIVE → CLOSED)", (await marketStore.get("mkt_real_1"))?.status === "CLOSED", `status=${(await marketStore.get("mkt_real_1"))?.status}`);
ok("no outcome sealed without the ceremony", (await marketStore.get("mkt_real_1"))?.resolvedOutcome === null);

// 2. Idempotent — a second trigger fire notifies nobody new and re-mails nobody.
const logs2: string[] = [];
console.log = (...a: unknown[]) => { logs2.push(a.join(" ")); };
r = await resolveDueMarket("mkt_real_1", { assessment: null });
await new Promise((res) => setTimeout(res, 150));
console.log = realLog;
ok("second fire → no re-notify", r.status === "skipped", `status=${r.status}`);
const adminNotes = (await listForUser("usr_mkt_admin1", 50)).filter((n) => n.titleEn === "Market awaiting resolution");
ok("exactly one alert per market", adminNotes.length === 1, `count=${adminNotes.length}`);
ok("no second email dispatched", !logs2.some((l) => l.includes("[email-stub]") && l.includes("Market awaiting resolution")));

// 3. A still-open market (future resolutionAt) is NOT alerted — the early re-check
//    guard leaves it LIVE and does not consume the trigger.
await mkMarket("mkt_future", "Will BTC daily close be green?");
await marketStore.set({ ...(await marketStore.get("mkt_future"))!, resolutionAt: new Date(now.getTime() + 86400_000).toISOString() });
r = await resolveDueMarket("mkt_future", { assessment: null });
ok("future market not alerted", r.status === "early-noop", `status=${r.status}`);
ok("future market left LIVE", (await marketStore.get("mkt_future"))?.status === "LIVE");
ok("future market trigger not consumed", (await marketStore.get("mkt_future"))?.resolutionNotifiedAt == null);
ok("no extra officer alert raised", (await listForUser("usr_mkt_admin1", 50)).filter((n) => n.titleEn === "Market awaiting resolution").length === 1);

// 4. Demo market that's expired → auto-resolves (real ones never do).
await mkMarket("mkt_demo_1", "Demo · auto resolve me");
const ar = await autoResolveExpiredDemoMarkets();
ok("demo market auto-resolved", ar.resolved >= 1, `resolved=${ar.resolved}`);
ok("demo market now RESOLVED", (await marketStore.get("mkt_demo_1"))?.status === "RESOLVED");
ok("real market only CLOSED, never auto-RESOLVED (manual)", (await marketStore.get("mkt_real_1"))?.status === "CLOSED");
// Demo markets must NOT generate resolution-due alerts (they self-resolve).
ok("demo did not alert officers", !(await listForUser("usr_mkt_admin1", 50)).find((n) => n.bodyEn?.includes("auto resolve me")));

console.log(`\n${fail === 0 ? "ALL MARKET-RESOLUTION SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
