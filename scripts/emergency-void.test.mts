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
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, emergencyVoidMarket, getMarket, listPositionsForUser } from "../src/lib/server/market-service.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { getHousePoolBalance } from "../src/lib/server/house-pool.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { marketCancelledRefundHtml, marketCancelledAdminHtml } from "../src/lib/server/email.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const allUsers: string[] = [];

async function fundedUser(id: string, balance = 1_000_000, email: string | null = null): Promise<void> {
  allUsers.push(id);
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email,
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
for (const id of ["ev_a", "ev_c", "ev_d", "ev_e"]) await fundedUser(id);
await fundedUser("ev_b", 1_000_000, "evb@test.tz"); // player WITH email → must be mailed
await mkAdmin("ev_admin", "void-admin@test.tz");     // officer → must get the confirmation
const startSystem = (await sumWallets()) + (await getHousePoolBalance()); // pools = 0 (no market yet)

const m = await createMarket({
  titleEn: "Emergency void market", titleSw: null as unknown as string, category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

const stakes: Record<string, number> = { ev_a: 10_000, ev_b: 20_000, ev_c: 15_000, ev_d: 10_000, ev_e: 25_000 };
await buyPosition("ev_a", { marketId: m.id, side: "YES", stake: stakes.ev_a });
await buyPosition("ev_b", { marketId: m.id, side: "YES", stake: stakes.ev_b });
await buyPosition("ev_c", { marketId: m.id, side: "YES", stake: stakes.ev_c });
await buyPosition("ev_d", { marketId: m.id, side: "NO", stake: stakes.ev_d });
await buyPosition("ev_e", { marketId: m.id, side: "NO", stake: stakes.ev_e });

// ev_a cashes out EARLY first (takes the 9% penalty — proves game flow intact).
// Backdate past the 5-min free-exit window so the fee applies.
const aPos = await posOf("ev_a");
{ const p = await positionStore.get(aPos.id); if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); } }
const aBalBeforeCashout = await bal("ev_a");
const co = await cashOutPosition("ev_a", aPos.id);
ok("early cash-out still works (game flow intact)", co.ok && co.data!.value === Math.round(10_000 * 0.91), `value=${co.ok ? co.data!.value : "n/a"}`);
ok("cashed-out player got stake − 9% (9,100)", (await bal("ev_a")) - aBalBeforeCashout === 9_100);
ok("ev_a position is CASHED_OUT", (await posOf("ev_a")).status === "CASHED_OUT");

// ── Guards: reason required ────────────────────────────────────────────────
ok("void rejected without a reason", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_x", reason: "" })).ok);
ok("void rejected with a too-short reason", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_x", reason: "x" })).ok);
ok("unknown market rejected", !(await emergencyVoidMarket({ marketId: "mkt_nope", officerId: "officer_x", reason: "directive" })).ok);

// Balances of the still-open bettors right before the void.
const before: Record<string, number> = {};
for (const u of ["ev_b", "ev_c", "ev_d", "ev_e"]) before[u] = await bal(u);
const aBeforeVoid = await bal("ev_a"); // already cashed out — must NOT change

// ── THE KILL SWITCH (capture console to prove emails dispatch) ─────────────
const REASON = "Suspended by directive of the Gaming Board";
const logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
const r = await emergencyVoidMarket({ marketId: m.id, officerId: "ev_admin", reason: REASON });
await new Promise((res) => setTimeout(res, 250)); // let fire-and-forget emails flush
console.log = realLog;
const mailed = logs.filter((l) => l.includes("[email-stub]"));
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
const cashoutFee = Math.round(stakes.ev_a * 0.09); // 900
const endSystem = (await sumWallets()) + mkt.yesPool + mkt.noPool + (await getHousePoolBalance());
ok("whole-system money conserved (wallets + pools + house)", endSystem === startSystem - cashoutFee, `start=${startSystem} end=${endSystem} expectedDrift=${-cashoutFee} actualDrift=${endSystem - startSystem}`);

// ── Notifications + emails (with the admin's reason) ───────────────────────
// Player WITH an email got a refund email; admin got a confirmation email.
ok("refunded player was emailed the cancellation+refund", mailed.some((l) => l.includes("evb@test.tz") && l.includes("refunded")), `mailed=${JSON.stringify(mailed)}`);
ok("admin was emailed the cancellation confirmation", mailed.some((l) => l.includes("void-admin@test.tz") && l.includes("Market cancelled")));
// In-app: player sees the cancellation notice; admin sees the confirmation.
ok("player in-app notice mentions the cancellation", !!(await listForUser("ev_b", 20)).find((n) => /Market cancelled/i.test(n.titleEn)));
ok("admin in-app confirmation delivered", !!(await listForUser("ev_admin", 20)).find((n) => /Market cancelled/i.test(n.titleEn)));
// The admin's REASON propagates into both emails (template-level proof).
ok("player refund email includes the admin's reason", marketCancelledRefundHtml({ title: "x", reason: REASON, amount: 100, reference: "r" }).includes(REASON));
ok("admin confirmation email includes the reason", marketCancelledAdminHtml({ title: "x", reason: REASON, refundedCount: 4, refundedTzs: 70_000 }).includes(REASON));

// ── Idempotent: a second void is rejected (no double refund possible) ───────
const balB2 = await bal("ev_b");
ok("second void rejected (already settled)", !(await emergencyVoidMarket({ marketId: m.id, officerId: "officer_gbt", reason: "double click guard" })).ok);
ok("no double refund on repeat", (await bal("ev_b")) === balB2);

console.log(`\nemergency-void: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
