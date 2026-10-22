/**
 * Emergency-void ("kill switch") tests (in-memory store; no DATABASE_URL).
 *
 * An admin pulls a LIVE market mid-trading. Verifies:
 *   - every OPEN position is refunded its FULL stake (no fee — it's a cancellation)
 *   - a position CASHED OUT before the void is NOT refunded again (no double credit)
 *   - the market ends VOIDED with both pools zeroed
 *   - whole-system money is conserved (wallets + pools + house reserve unchanged,
 *     since no external money moved) — i.e. game flow + cash-out fee stay intact
 *   - it's idempotent (a second void is rejected) and requires a reason
 *
 * Crucially this runs the REAL flow — buy, an early cash-out (which takes the 9%
 * penalty), then the emergency void — so it doubles as a regression check that
 * the cash-out-fee change didn't disturb betting/refunds.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = ""; // local outbox only; this fixture must never send real mail
process.env.SMS_PROVIDER = "console";
// The bonus wallet is withdrawn from the live product. Exercise its funded
// refund path under the test-only ON state, with real grants behind the balance.
import "./lib/bonus-feature-on.mts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, emergencyVoidMarket, getMarket, listPositionsForUser } from "../src/lib/server/market-service.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";

import { listForUser } from "../src/lib/server/notification-service.ts";
import { marketCancelledRefundHtml, marketCancelledAdminHtml } from "../src/lib/server/email.ts";
import { emailOutbox } from "../src/lib/server/email.ts";
import { creditBonus, expireActiveGrants, refundBonusToActive } from "../src/lib/server/bonus-service.ts";
import { getHistory } from "../src/lib/server/market-history.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const allUsers: string[] = [];

// `confirmed` (2026-10-07): money mail goes only to a CONFIRMED address (`sendEmailToUser(…, { confirmedOnly: true })`) —
// a deposit asks no email any more, so an address on file may never have been confirmed.
async function fundedUser(id: string, balance = 1_000_000, email: string | null = null, confirmed = false): Promise<void> {
  allUsers.push(id);
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email, emailVerifiedAt: confirmed ? now() : null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

// An admin officer (with an email) who should receive the cancellation
// confirmation. No wallet / not in `allUsers` so it doesn't affect conservation.
async function mkAdmin(id: string, email: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "ADMIN", status: "ACTIVE", locale: "EN",
    displayName: "Officer", dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const sumWallets = async () => { let s = 0; for (const u of allUsers) s += await bal(u); return s; };
async function posOf(uid: string) { return (await listPositionsForUser(uid))[0]; }

// ── Setup: 5 bettors (ev_b has an email) + an admin officer, snapshot total
//    system money BEFORE any market exists. ──
for (const id of ["ev_a", "ev_d", "ev_e"]) await fundedUser(id);
await fundedUser("ev_c", 1_000_000, "evc@test.tz");       // an UNCONFIRMED address → the bell, never the money mail
await fundedUser("ev_b", 1_000_000, "evb@test.tz", true); // a CONFIRMED address → must be mailed
await mkAdmin("ev_admin", "void-admin@test.tz");     // officer → must get the confirmation
const startSystem = await sumWallets(); // pools = 0 (no market yet)

// This test exercises an early PAID cash-out (stake − 10%) before the emergency
// void. The default paidExitWindowMinutes is now 0 (exit locks at the free
// window), so open an explicit paid window for the cash-out below to sell into.
await setGlobalConfig({ paidExitWindowMinutes: 15 }, "officer_test");

const m = await createMarket({
  titleEn: "Emergency void market", titleSw: "Soko la majaribio", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

const stakes: Record<string, number> = { ev_a: 10_000, ev_b: 20_000, ev_c: 15_000, ev_d: 10_000, ev_e: 25_000 };
await buyPosition("ev_a", { marketId: m.id, side: "YES", stake: stakes.ev_a });
await buyPosition("ev_b", { marketId: m.id, side: "YES", stake: stakes.ev_b });
await buyPosition("ev_c", { marketId: m.id, side: "YES", stake: stakes.ev_c });
await buyPosition("ev_d", { marketId: m.id, side: "NO", stake: stakes.ev_d });
await buyPosition("ev_e", { marketId: m.id, side: "NO", stake: stakes.ev_e });

// ev_a cashes out EARLY first (takes the 10% early-exit fee — proves game flow intact).
// Backdate past the 5-min free-exit window so the fee applies.
const aPos = await posOf("ev_a");
{ const p = await positionStore.get(aPos.id); if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); } }
const aBalBeforeCashout = await bal("ev_a");
const co = await cashOutPosition("ev_a", aPos.id);
ok("early cash-out still works (game flow intact)", co.ok && co.data!.value === Math.round(10_000 * 0.90), `value=${co.ok ? co.data!.value : "n/a"}`);
ok("cashed-out player got stake − 10% (9,000)", (await bal("ev_a")) - aBalBeforeCashout === 9_000);
ok("ev_a position is CASHED_OUT", (await posOf("ev_a")).status === "CASHED_OUT");

// ── Guards: reason required ────────────────────────────────────────────────
ok("void rejected without a reason", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_x", reason: "" })).ok);
ok("void rejected with a too-short reason", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_x", reason: "x" })).ok);
ok("unknown market rejected", !(await emergencyVoidMarket({ marketId: "mkt_nope", officerId: "officer_x", reason: "directive" })).ok);

// Balances of the still-open bettors right before the void.
const before: Record<string, number> = {};
for (const u of ["ev_b", "ev_c", "ev_d", "ev_e"]) before[u] = await bal(u);
const aBeforeVoid = await bal("ev_a"); // already cashed out — must NOT change

// ── Least-privilege: a MODERATOR must NOT be able to void (it moves money) ──
// Closes the ai-polls-delete escalation path — the gate is now in the service.
await db.user.create({
  id: "ev_mod", phoneE164: `+25595${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "MODERATOR", status: "ACTIVE", locale: "EN",
  displayName: "Mod", dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);
const modVoid = await emergencyVoidMarket({ marketId: m.id, officerId: "ev_mod", reason: "moderator attempting a live-market void" });
ok("MODERATOR void BLOCKED at service layer", !modVoid.ok, modVoid.ok ? "unexpectedly ok" : modVoid.error);
ok("market still LIVE after blocked moderator void", (await getMarket(m.id))!.status === "LIVE");
ok("open positions untouched by blocked moderator void", (await posOf("ev_b")).status === "OPEN");

// ── THE KILL SWITCH (capture console to prove emails dispatch) ─────────────
const REASON = "Suspended by directive of the Gaming Board";
const logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
const evcBellsBefore = (await db.notification.findByUser("ev_c", 500)).length;
const r = await emergencyVoidMarket({ marketId: m.id, officerId: "ev_admin", reason: REASON });
await new Promise((res) => setTimeout(res, 250)); // let fire-and-forget emails flush
console.log = realLog;
// ⚠️ RECIPIENTS COME FROM THE OUTBOX, NOT STDOUT — the log masks the address (audit F-06),
// and matching the masked form would keep these green while destroying what they measure:
// "somebody was mailed" is not the claim, "the REFUNDED PLAYER was, and so was the admin"
// is. `to === addr` is also exact, where a log scrape matched the fragment anywhere.
const mailed = emailOutbox();
ok("emergency void on a LIVE market succeeds", r.ok);
ok("refundedCount = 4 open positions (cashed-out one excluded)", r.ok && r.data!.refundedCount === 4, `count=${r.ok ? r.data!.refundedCount : "n/a"}`);
ok("refundedTzs = sum of the 4 open stakes", r.ok && r.data!.refundedTzs === stakes.ev_b + stakes.ev_c + stakes.ev_d + stakes.ev_e, `tzs=${r.ok ? r.data!.refundedTzs : "n/a"}`);

// Each OPEN bettor got their FULL stake back — no fee.
for (const u of ["ev_b", "ev_c", "ev_d", "ev_e"]) {
  ok(`${u} refunded FULL stake (${stakes[u]}, no fee)`, (await bal(u)) - before[u] === stakes[u], `Δ=${(await bal(u)) - before[u]}`);
  ok(`${u} position now VOID`, (await posOf(u)).status === "VOID");
}

// The cashed-out player is untouched (no double refund).
ok("cashed-out player NOT refunded again", (await bal("ev_a")) === aBeforeVoid);
ok("cashed-out position stays CASHED_OUT", (await posOf("ev_a")).status === "CASHED_OUT");

// Market is VOIDED with empty pools.
const mkt = (await getMarket(m.id))!;
ok("market is VOIDED", mkt.status === "VOIDED");
ok("pools zeroed", mkt.yesPool === 0 && mkt.noPool === 0, `yes=${mkt.yesPool} no=${mkt.noPool}`);

// Whole-system conservation: the only expected drift is the cash-out fee (900)
// that stayed in the pool and was zeroed on void (fee was legitimately collected
// but has no destination when the market is cancelled — acceptable for emergency voids).
// The early-exit fee now LEAVES the pool and lands on the house, so the money
// visible in wallets+pools drops by the WHOLE fee. It used to stay in the pool
// (and this drift was only the 900 the player forfeited to the other bettors).
const cashoutFee = Math.round(stakes.ev_a * 0.10); // 1,000 → HOUSE:COMMISSION
const endSystem = (await sumWallets()) + mkt.yesPool + mkt.noPool;
ok("whole-system money conserved (wallets + pools + house)", endSystem === startSystem - cashoutFee, `start=${startSystem} end=${endSystem} expectedDrift=${-cashoutFee} actualDrift=${endSystem - startSystem}`);

// ── Notifications + emails (with the admin's reason) ───────────────────────
// Player WITH an email got a refund email; admin got a confirmation email.
ok("refunded player was emailed the cancellation+refund",
   mailed.some((m) => m.to === "evb@test.tz" && /refunded/i.test(`${m.subject} ${m.html}`)),
   `mailed=${JSON.stringify(mailed.map((m) => `${m.to} | ${m.subject}`))}`);
// Both halves of the 2026-10-07 rule: the confirmed address is mailed (above); the unconfirmed one is told in the bell
// and is NOT mailed — the address may be a typo or someone else's.
ok("an UNCONFIRMED address is not mailed the refund — the bell tells that player instead",
   !mailed.some((m) => m.to === "evc@test.tz") && (await db.notification.findByUser("ev_c", 500)).length > evcBellsBefore,
   `mailed=${JSON.stringify(mailed.map((m) => m.to))} · bells ${evcBellsBefore} → ${(await db.notification.findByUser("ev_c", 500)).length}`);
ok("admin was emailed the cancellation confirmation",
   mailed.some((m) => m.to === "void-admin@test.tz" && m.subject.includes("Market cancelled")));
// In-app: player sees the cancellation notice; admin sees the confirmation.
ok("player in-app notice mentions the cancellation", !!(await listForUser("ev_b", 20)).find((n) => /Market cancelled/i.test(n.titleEn)));
ok("admin in-app confirmation delivered", !!(await listForUser("ev_admin", 20)).find((n) => /Market cancelled/i.test(n.titleEn)));
// The admin's REASON propagates into both emails (template-level proof).
ok("player refund email includes the admin's reason", marketCancelledRefundHtml({ title: "x", reason: REASON, amount: 100, bonusStakeTzs: 0, reference: "r" }).includes(REASON));
ok("admin confirmation email includes the reason", marketCancelledAdminHtml({ title: "x", reason: REASON, refundedCount: 4, refundedTzs: 70_000 }).includes(REASON));

// ── Idempotent: a second void is rejected (no double refund possible) ───────
const balB2 = await bal("ev_b");
ok("second void rejected (already settled)", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_gbt", reason: "double click guard" })).ok);
ok("no double refund on repeat", (await bal("ev_b")) === balB2);

// A cancellation returns each still-held position to the balances that funded
// it. Drive the real bonus grant, bet, emergency refund, inbox and email paths.
await fundedUser("ev_mix", 20_000, "evmix@test.tz", true);
await fundedUser("ev_bonus", 0, "evbonus@test.tz", true);
ok("mixed refund fixture: real bonus grant credited",
  (await creditBonus("ev_mix", { amountTzs: 30_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false })).ok);
ok("bonus-only refund fixture: real bonus grant credited",
  (await creditBonus("ev_bonus", { amountTzs: 40_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false })).ok);
const splitMarket = await createMarket({
  titleEn: "Split refund market", titleSw: "Soko la marejesho", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);
const mixedBet = await buyPosition("ev_mix", { marketId: splitMarket.id, side: "YES", stake: 40_000 });
const bonusBet = await buyPosition("ev_bonus", { marketId: splitMarket.id, side: "NO", stake: 40_000 });
ok("split refund fixtures use the recorded funding split",
  mixedBet.ok && bonusBet.ok &&
  (await positionStore.get(mixedBet.data!.positionId))?.bonusStakeTzs === 20_000 &&
  (await positionStore.get(bonusBet.data!.positionId))?.bonusStakeTzs === 40_000);
const splitVoid = await emergencyVoidMarket({ marketId: splitMarket.id, officerId: "ev_admin",
  reason: "Fixture cancellation to test the funding destination." });
await new Promise((res) => setTimeout(res, 250));
ok("split emergency void refunds both still-held positions", splitVoid.ok && splitVoid.data?.refundedCount === 2);
const mixedWallet = await db.wallet.findByUserId("ev_mix");
const bonusWallet = await db.wallet.findByUserId("ev_bonus");
ok("mixed stake returns TZS 20,000 main and TZS 20,000 bonus",
  mixedWallet?.balance === 20_000 && mixedWallet.bonusBalance === 30_000);
ok("bonus-only stake returns TZS 40,000 to bonus, never main",
  bonusWallet?.balance === 0 && bonusWallet.bonusBalance === 40_000);
const splitNotices = await Promise.all(["ev_mix", "ev_bonus"].map((id) => listForUser(id, 30)));
const mixedNotice = splitNotices[0].find((n) => n.kind === "REFUND" && n.href?.includes(splitMarket.id));
const bonusNotice = splitNotices[1].find((n) => n.kind === "REFUND" && n.href?.includes(splitMarket.id));
ok("mixed notice names both actual balances in EN, SW and ZH",
  !!mixedNotice && /TZS 20,000.*main balance.*TZS 20,000.*bonus balance.*check your wallet/.test(mixedNotice.bodyEn) &&
  /TZS 20,000.*salio kuu.*TZS 20,000.*salio la bonasi.*angalia salio/.test(mixedNotice.bodySw) &&
  /TZS 20,000.*主余额.*TZS 20,000.*奖金余额.*当前余额/.test(mixedNotice.bodyZh ?? ""));
ok("bonus-only notice names bonus balance, never main, in all locales",
  !!bonusNotice && /TZS 40,000.*bonus balance/.test(bonusNotice.bodyEn) &&
  /TZS 40,000.*salio la bonasi/.test(bonusNotice.bodySw) &&
  /TZS 40,000.*奖金余额/.test(bonusNotice.bodyZh ?? "") &&
  !/main balance|salio kuu|主余额/.test(`${bonusNotice.bodyEn} ${bonusNotice.bodySw} ${bonusNotice.bodyZh}`));
const mixedMail = emailOutbox().find((entry) => entry.to === "evmix@test.tz" && entry.tag === "market-cancelled-refund");
const bonusMail = emailOutbox().find((entry) => entry.to === "evbonus@test.tz" && entry.tag === "market-cancelled-refund");
ok("mixed refund email lists the two actual balance amounts and Chinese copy",
  !!mixedMail && /Credited to main at refund/.test(mixedMail.html) &&
  /Credited to bonus at refund/.test(mixedMail.html) && /主余额/.test(mixedMail.html) && /奖金余额/.test(mixedMail.html));
ok("bonus-only refund email has no main-balance refund row",
  !!bonusMail && /Credited to bonus at refund/.test(bonusMail.html) &&
  !/Credited to main at refund/.test(bonusMail.html));
ok("prior cash-out receives no new emergency refund notice",
  !(await listForUser("ev_a", 50)).some((n) => n.kind === "REFUND" && n.href?.includes(m.id)));

// A formerly fulfilled grant can re-lock the very real credit just refunded.
// The player copy reports what was credited at refund time and tells the player
// to consult the wallet for the current withdrawable balance.
await fundedUser("ev_relock", 3_000, "evrelock@test.tz", true);
const relockMarket = await createMarket({
  titleEn: "Emergency relock market", titleSw: "Soko la bonasi", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);
const relockBet = await buyPosition("ev_relock", { marketId: relockMarket.id, side: "YES", stake: 2_000 });
await db.bonusGrant.create({
  id: "bg_ev_relock", userId: "ev_relock", walletId: "wal_ev_relock",
  amountTzs: 5_000, remainingTzs: 5_000, wagerMultiplier: 1,
  wagerRequiredTzs: 5_000, wageredTzs: 5_000, source: "ADMIN", sourceRef: "ev-relock-fixture",
  status: "FULFILLED", expiresAt: null, fulfilledAt: now(), note: null,
  createdAt: now(), updatedAt: now(),
});
const relockVoid = await emergencyVoidMarket({ marketId: relockMarket.id, officerId: "ev_admin",
  reason: "Fixture to check a fulfilled bonus re-lock." });
await new Promise((res) => setTimeout(res, 250));
const relockWallet = await db.wallet.findByUserId("ev_relock");
ok("fulfilled-grant fixture refunded one real-funded bet", relockBet.ok && relockVoid.ok && relockVoid.data?.refundedCount === 1);
ok("fulfilled-grant reversal can re-lock the refunded main credit",
  relockWallet?.balance === 0 && relockWallet.bonusBalance === 3_000);
const relockNotice = (await listForUser("ev_relock", 40)).find((n) => n.kind === "REFUND" && n.href?.includes(relockMarket.id));
ok("re-lock notice describes credit at refund and current-wallet uncertainty in all locales",
  !!relockNotice && /credited to your main balance at refund.*check your wallet/.test(relockNotice.bodyEn) &&
  /iliwekwa kwenye salio kuu wakati wa marejesho.*angalia salio/.test(relockNotice.bodySw) &&
  /退款时.*已计入主余额.*当前余额/.test(relockNotice.bodyZh ?? ""));
const relockMail = emailOutbox().find((entry) => entry.to === "evrelock@test.tz" && entry.tag === "market-cancelled-refund");
ok("re-lock email labels credited-at-refund amount rather than final main balance",
  !!relockMail && /Credited to main at refund/.test(relockMail.html) && /current balances/.test(relockMail.html));

// An unswept but already expired ACTIVE grant must never receive returned bonus
// principal. A dedicated no-expiry restitution grant survives the next sweep.
await fundedUser("ev_expired", 0);
const expiredGrant = await creditBonus("ev_expired", {
  amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false,
});
const expiredMarket = await createMarket({
  titleEn: "Emergency expired bonus market", titleSw: "Soko la bonasi", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);
const expiredBet = await buyPosition("ev_expired", { marketId: expiredMarket.id, side: "YES", stake: 10_000 });
if (expiredGrant.ok) await db.bonusGrant.update(expiredGrant.grant.id,
  { expiresAt: new Date(Date.now() - 60_000).toISOString() });
const expiredVoid = await emergencyVoidMarket({ marketId: expiredMarket.id, officerId: "ev_admin",
  reason: "Fixture returning an expired bonus-funded stake." });
const restitutionBeforeSweep = (await db.bonusGrant.listByUser("ev_expired"))
  .find((g) => g.sourceRef === `void-restitution:${expiredBet.ok ? expiredBet.data!.positionId : "missing"}`);
await expireActiveGrants();
ok("emergency bonus refund bypasses expired ACTIVE grant and mints no-expiry restitution",
  expiredBet.ok && expiredVoid.ok && restitutionBeforeSweep?.expiresAt === null &&
  restitutionBeforeSweep.remainingTzs === 10_000 &&
  (await db.wallet.findByUserId("ev_expired"))?.bonusBalance === 10_000);

await fundedUser("ev_legacy_expired", 0);
const legacyGrant = await creditBonus("ev_legacy_expired", {
  amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false,
});
if (legacyGrant.ok) await db.bonusGrant.update(legacyGrant.grant.id,
  { expiresAt: new Date(Date.now() - 60_000).toISOString() });
const legacyRestitution = await refundBonusToActive("ev_legacy_expired", 2_000);
await expireActiveGrants();
ok("legacy bonus refund also bypasses expired ACTIVE grant and survives sweep",
  legacyRestitution.refundedToBonus === 2_000 &&
  (await db.wallet.findByUserId("ev_legacy_expired"))?.bonusBalance === 2_000 &&
  (await db.bonusGrant.listByUser("ev_legacy_expired")).some((g) =>
    g.status === "ACTIVE" && g.expiresAt === null && g.remainingTzs === 2_000));

// Two holders: a failure AFTER the first credit must restore every affected
// memory row, including the first wallet, transaction and VOID position. The
// retry then refunds exactly once, and a third call cannot pay either again.
await fundedUser("ev_fault_a", 5_000);
await fundedUser("ev_fault_b", 100_000);
const faultGrant = await creditBonus("ev_fault_a", {
  amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false,
});
ok("two-holder fault fixture has a real bonus grant", faultGrant.ok);
const faultMarket = await createMarket({
  titleEn: "Emergency atomic fault market", titleSw: "Soko la hitilafu", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);
const faultA = await buyPosition("ev_fault_a", { marketId: faultMarket.id, side: "YES", stake: 10_000 });
const faultB = await buyPosition("ev_fault_b", { marketId: faultMarket.id, side: "NO", stake: 12_000 });
ok("two-holder fault fixture placed both stakes", faultA.ok && faultB.ok);
const faultBalances = [await bal("ev_fault_a"), await bal("ev_fault_b")];
const faultBonusBefore = (await db.wallet.findByUserId("ev_fault_a"))?.bonusBalance;
const faultGrantBefore = faultGrant.ok ? await db.bonusGrant.findById(faultGrant.grant.id) : null;
const faultTxnCounts = await Promise.all(["ev_fault_a", "ev_fault_b"].map(async (id) => (await db.txn.listForUser(id)).length));
const faultNoticeCounts = await Promise.all(["ev_fault_a", "ev_fault_b"].map(async (id) => (await listForUser(id, 50)).length));
const faultZeroHistoryBefore = (await getHistory(faultMarket.id)).filter((s) => s.yesPool === 0 && s.noPool === 0).length;
const originalAdjust = db.wallet.adjust;
let refundAdjusts = 0;
db.wallet.adjust = (async (...args: Parameters<typeof originalAdjust>) => {
  if (["wal_ev_fault_a", "wal_ev_fault_b"].includes(args[0]) && (args[1].balance ?? 0) > 0 && ++refundAdjusts === 2) {
    throw new Error("injected second-holder emergency refund fault");
  }
  return originalAdjust(...args);
}) as typeof originalAdjust;
let faultThrew = false;
try {
  await emergencyVoidMarket({ marketId: faultMarket.id, officerId: "ev_admin", reason: "Fixture second-holder money fault." });
} catch (e) { faultThrew = String(e).includes("second-holder emergency refund fault"); }
finally { db.wallet.adjust = originalAdjust; }
ok("second-holder fault reached after one refund", faultThrew && refundAdjusts === 2);
ok("failed memory void restores both wallet balances",
  await bal("ev_fault_a") === faultBalances[0] && await bal("ev_fault_b") === faultBalances[1]);
ok("failed memory void restores first holder's bonus principal and grant",
  (await db.wallet.findByUserId("ev_fault_a"))?.bonusBalance === faultBonusBefore &&
  (faultGrant.ok ? (await db.bonusGrant.findById(faultGrant.grant.id))?.remainingTzs === faultGrantBefore?.remainingTzs : false));
ok("failed memory void restores both OPEN positions and market",
  (await positionStore.get(faultA.data!.positionId))?.status === "OPEN" &&
  (await positionStore.get(faultB.data!.positionId))?.status === "OPEN" &&
  (await getMarket(faultMarket.id))?.status === "LIVE");
ok("failed memory void leaves no refund transactions or notices",
  (await db.txn.listForUser("ev_fault_a")).length === faultTxnCounts[0] &&
  (await db.txn.listForUser("ev_fault_b")).length === faultTxnCounts[1] &&
  (await listForUser("ev_fault_a", 50)).length === faultNoticeCounts[0] &&
  (await listForUser("ev_fault_b", 50)).length === faultNoticeCounts[1]);
ok("failed memory void leaves no terminal zero-pool history point",
  (await getHistory(faultMarket.id)).filter((s) => s.yesPool === 0 && s.noPool === 0).length === faultZeroHistoryBefore);
const faultRetry = await emergencyVoidMarket({ marketId: faultMarket.id, officerId: "ev_admin", reason: "Fixture retry after fault." });
ok("two-holder retry pays both once", faultRetry.ok && faultRetry.data?.refundedCount === 2 &&
  await bal("ev_fault_a") === faultBalances[0] + 5_000 &&
  (await db.wallet.findByUserId("ev_fault_a"))?.bonusBalance === (faultBonusBefore ?? 0) + 5_000 &&
  await bal("ev_fault_b") === faultBalances[1] + 12_000);
const faultAgain = await emergencyVoidMarket({ marketId: faultMarket.id, officerId: "ev_admin", reason: "Fixture duplicate retry." });
ok("settled two-holder retry cannot pay twice", !faultAgain.ok &&
  await bal("ev_fault_a") === faultBalances[0] + 5_000 && await bal("ev_fault_b") === faultBalances[1] + 12_000);

// One holder can have two positions. The second reversal must see the first
// grant update inside the same transaction, so 4,000 of recorded turnover
// reverses to zero rather than losing only 2,000.
await fundedUser("ev_two_positions", 100_000);
const turnoverGrant = await creditBonus("ev_two_positions", {
  amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false,
});
const turnoverMarket = await createMarket({
  titleEn: "Emergency two bets market", titleSw: "Soko la dau mbili", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);
const twoA = await buyPosition("ev_two_positions", { marketId: turnoverMarket.id, side: "YES", stake: 2_000 });
const twoB = await buyPosition("ev_two_positions", { marketId: turnoverMarket.id, side: "YES", stake: 2_000 });
ok("two-position turnover fixture placed both bets", turnoverGrant.ok && twoA.ok && twoB.ok);
const beforeTurnover = turnoverGrant.ok ? await db.bonusGrant.findById(turnoverGrant.grant.id) : null;
ok("two-position turnover fixture accrued 4,000", beforeTurnover?.wageredTzs === 4_000);
const twoVoid = await emergencyVoidMarket({ marketId: turnoverMarket.id, officerId: "ev_admin", reason: "Fixture reversing both wagers." });
const afterTurnover = turnoverGrant.ok ? await db.bonusGrant.findById(turnoverGrant.grant.id) : null;
ok("two-position emergency reverses both wagers", twoVoid.ok && twoVoid.data?.refundedCount === 2 && afterTurnover?.wageredTzs === 0);

console.log(`\nemergency-void: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
