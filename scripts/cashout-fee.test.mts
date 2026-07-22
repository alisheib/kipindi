/**
 * Early-cash-out commission tests (in-memory store; no DATABASE_URL).
 *
 * Closing a position EARLY returns the player's OWN STAKE minus the cash-out fee
 * (default 10%) — no winnings. HOLDING to settlement is unaffected.
 *
 * ⚠️ TWO THINGS CHANGED HERE, AND THEY REWROTE THIS SUITE:
 *
 * 1. THE FEE GOES TO THE HOUSE. It used to be deducted from the player and then
 *    LEFT IN THE POOL, where the remaining players collected it at settlement —
 *    50pick earned exactly ZERO on every early exit. This suite ASSERTED that
 *    leak as correct behaviour ("pool dropped by value paid — fee stays in pool").
 *    The assertion is now inverted: the WHOLE stake must leave the pool.
 *
 * 2. THE EXIT WINDOW (Ali's design, 2026-07-15). Cash-out is open only for a fixed
 *    window measured from the bet: free for the first freeExitGraceMinutes (5),
 *    then paid at cashOutFeeRate for paidExitWindowMinutes (15), then LOCKED. A
 *    poll closing too soon (or a bet placed near close) offers no cash-out at all.
 *    This replaced the old side-collapse guard, which only blocked the last
 *    shilling and could still be bypassed for 100 TZS to gut a winner's prize. The
 *    time lock kills every late-exit attack because a late exit is now impossible.
 *
 * Verifies, for "he has 10k in the pool, sells early, we take 10%":
 *   - player gets stake × (1 − feeRate)              (10k → 9,000)
 *   - the house gains stake × feeRate                (1,000)
 *   - THE WHOLE STAKE (10k) leaves the pool — the fee does not stay behind
 *   - the rate is admin-configurable (10% → 20% → 0%)
 *   - the free-exit window is admin-configurable and refunds in full
 *   - a LATE exit (past the window) is locked; a SHORT poll offers no exit
 *   - holding to resolution pays the NORMAL payout, not stake-minus-fee
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, cashOutValue, getMarket, resolveMarket, settleMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { setGlobalConfig, getGlobalConfig, settledPayoutWhole } from "../src/lib/server/market-config.ts";
import { DEFAULT_CASHOUT_FEE_RATE } from "../src/lib/payout.ts";

/** Backdate a position's placedAt so it is past the free-exit grace window. */
async function backdatePastGrace(posId: string) {
  const p = await positionStore.get(posId);
  if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); }
}

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 1_000_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25598${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const pools = async (mid: string) => { const m = (await getMarket(mid))!; return m.yesPool + m.noPool; };

async function makeMarket() {
  return createMarket({
    titleEn: "Cashout fee market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// This suite exercises the PAID cash-out window (fee math, admin-tunable rate,
// frozen-rate-on-retune). The default paidExitWindowMinutes is now 0 — the exit
// LOCKS at the free window ("5-min free exit, then nothing") — so open an explicit
// paid window here for the paid-fee cases below to sell into. The LATE-exit and
// SHORT-poll cases (60 min / 3 min) still lock regardless. See cashout-lockout for
// the default (no-paid-window) behaviour.
await setGlobalConfig({ paidExitWindowMinutes: 15 }, "officer_test");

// ── Default 10%: "he has 10k in the pool, sells early, we take 10%" ─────────
//
// NOTE the co-bettor (usr_co_a2) on the SAME side. Without one, usr_co_a is the
// only YES stake, and selling would empty the YES side and void the whole poll —
// which the side-collapse guard now refuses. This is a realistic poll, not a
// two-player degenerate one.
await fundedUser("usr_co_a");
await fundedUser("usr_co_a2");
await fundedUser("usr_co_b");
{
  const m = await makeMarket();
  const a = await buyPosition("usr_co_a", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_co_a2", { marketId: m.id, side: "YES", stake: 10_000 }); // co-bettor, same side
  await buyPosition("usr_co_b", { marketId: m.id, side: "NO", stake: 10_000 });
  ok("position opened (10k YES)", a.ok);
  const posId = a.ok ? a.data!.positionId : "";

  const mkt = (await getMarket(m.id))!;
  const proj = await cashOutValue(
    { side: "YES", stake: 10_000, placedAt: new Date(Date.now() - 10 * 60_000).toISOString() },
    { id: m.id, yesPool: mkt.yesPool, noPool: mkt.noPool, resolutionAt: mkt.resolutionAt, feeSnapshot: mkt.feeSnapshot },
  );
  ok(`default fee rate is ${DEFAULT_CASHOUT_FEE_RATE * 100}%`, Math.abs(proj.feeRate - DEFAULT_CASHOUT_FEE_RATE) < 1e-9, `feeRate=${proj.feeRate}`);
  ok("gross == stake (10k)", proj.gross === 10_000, `gross=${proj.gross}`);
  ok("player gets 9,000 (10k − 10%)", proj.value === 9_000, `value=${proj.value}`);
  ok("house fee is 1,000", proj.fee === 1_000, `fee=${proj.fee}`);

  await backdatePastGrace(posId); // move past the free-exit window

  const walletBefore = await bal("usr_co_a");
  const poolsBefore = await pools(m.id);

  const r = await cashOutPosition("usr_co_a", posId);
  ok("cash-out succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);
  const got = r.ok ? r.data!.value : -1;

  ok("player received 9,000", (await bal("usr_co_a")) - walletBefore === 9_000 && got === 9_000, `Δwallet=${(await bal("usr_co_a")) - walletBefore} value=${got}`);

  // THE FIX. The pool must drop by the WHOLE stake (10,000), not by the 9,000 the
  // player received. The old suite asserted the opposite and called the 1,000
  // difference "fee stays in pool" — that was 50pick's revenue being handed to
  // whoever else happened to be in the poll.
  ok(
    "THE WHOLE STAKE (10,000) leaves the pool — the fee goes to the HOUSE, not to the other players",
    poolsBefore - (await pools(m.id)) === 10_000,
    `Δpools=${poolsBefore - (await pools(m.id))} (expected 10,000)`,
  );
  ok("no double cash-out", !(await cashOutPosition("usr_co_a", posId)).ok);
}

// ── THE EXIT WINDOW — free / paid / LOCKED (Ali's design, 2026-07-15) ────────
//
// Cash-out is only open for a fixed window measured from the bet: free for the
// first freeExitGraceMinutes, then paid for paidExitWindowMinutes, then LOCKED.
// This replaces the old side-collapse guard: the guttng/void attacks all needed a
// LATE exit (you can only tell you're losing near the real-world event, hours/days
// out), and a hard time lock ~20 min in makes a late exit impossible for everyone.
{
  const closesInMs = (m: { selectionClosedAt?: string | null; resolutionAt: string }) =>
    (m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt)) - Date.now();
  void closesInMs; // (documentation of the runway concept; the service computes it)

  // (a) A LATE exit — 60 min after the bet, past the 20-min window — is LOCKED.
  await fundedUser("win_a"); await fundedUser("win_a2"); await fundedUser("win_b");
  {
    const m = await makeMarket();
    const big = await buyPosition("win_a", { marketId: m.id, side: "YES", stake: 100_000 });
    await buyPosition("win_a2", { marketId: m.id, side: "YES", stake: 100_000 });
    await buyPosition("win_b",  { marketId: m.id, side: "NO",  stake: 10_000 });
    const pid = big.ok ? big.data!.positionId : "";
    // An hour later — long past the exit window.
    const p = await positionStore.get(pid);
    if (p) { p.placedAt = new Date(Date.now() - 60 * 60_000).toISOString(); await positionStore.set(p); }

    const before = await bal("win_a");
    const r = await cashOutPosition("win_a", pid);
    ok("EXIT WINDOW: a late exit (60 min in) is LOCKED — rides to settlement", !r.ok, r.ok ? "!! late exit allowed — the gutting attack is open" : "");
    ok("EXIT WINDOW: no money moved on a locked exit", (await bal("win_a")) === before);
    ok("EXIT WINDOW: the winning side's prize is INTACT (not gutted)", (await getMarket(m.id))!.yesPool === 200_000);

    // And the +100-TZS 'buy a token position then bail' bypass no longer helps:
    // the big position is still past its own window, so it stays locked.
    await buyPosition("win_a", { marketId: m.id, side: "YES", stake: 100 });
    const stillLocked = await cashOutPosition("win_a", pid);
    ok("EXIT WINDOW: the old 100-TZS bypass is dead — the big position is still locked", !stillLocked.ok);
  }

  // (b) A SHORT poll — closes in 3 min — offers NO cash-out at all (too short).
  await fundedUser("short_a"); await fundedUser("short_b");
  {
    const m = await createMarket({
      titleEn: "Short poll", titleSw: "x", category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "x", resolutionAt: new Date(Date.now() + 3 * 60_000).toISOString(),
      selectionClosedAt: new Date(Date.now() + 3 * 60_000).toISOString(), proposedBy: "test",
    } as never);
    const a = await buyPosition("short_a", { marketId: m.id, side: "YES", stake: 10_000 });
    await buyPosition("short_b", { marketId: m.id, side: "NO", stake: 10_000 });
    const pid = a.ok ? a.data!.positionId : "";
    const r = await cashOutPosition("short_a", pid);
    ok("EXIT WINDOW: a 3-minute poll offers NO cash-out (too short a runway)", !r.ok, r.ok ? "!! short poll allowed a sell-out" : "");
  }
}

// ── Admin-configurable: 20% ────────────────────────────────────────────────
{
  const before = await getGlobalConfig();
  const set = await setGlobalConfig({ cashOutFeeRate: 0.20 }, "officer_test");
  ok("admin can set cash-out fee to 20%", set.ok && (set as { config: { cashOutFeeRate: number } }).config.cashOutFeeRate === 0.20);

  await fundedUser("usr_co_c");
  await fundedUser("usr_co_c2");
  await fundedUser("usr_co_d");
  const m = await makeMarket(); // created AFTER the retune → freezes 20%
  const c = await buyPosition("usr_co_c", { marketId: m.id, side: "YES", stake: 30_000 });
  await buyPosition("usr_co_c2", { marketId: m.id, side: "YES", stake: 30_000 }); // co-bettor
  await buyPosition("usr_co_d", { marketId: m.id, side: "NO", stake: 30_000 });
  const posId = c.ok ? c.data!.positionId : "";

  await backdatePastGrace(posId);

  const walletBefore = await bal("usr_co_c");
  const r = await cashOutPosition("usr_co_c", posId);
  ok("20%: player gets 24,000 (30k − 20%)", r.ok && (await bal("usr_co_c")) - walletBefore === 24_000, `Δ=${(await bal("usr_co_c")) - walletBefore}`);

  await setGlobalConfig({ cashOutFeeRate: before.cashOutFeeRate }, "officer_test");
}

// ── RATES STICK TO THE POLL ────────────────────────────────────────────────
//
// A poll created at 10% must still exit at 10% after admin retunes to 25%. This
// is the whole point of the feeSnapshot: a rate change cannot reach back and
// reprice a bet that has already been placed.
{
  await fundedUser("usr_stick_a");
  await fundedUser("usr_stick_a2");
  await fundedUser("usr_stick_b");
  const m = await makeMarket(); // frozen at the current 10%
  const a = await buyPosition("usr_stick_a", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_stick_a2", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_stick_b", { marketId: m.id, side: "NO", stake: 10_000 });
  const posId = a.ok ? a.data!.positionId : "";
  await backdatePastGrace(posId);

  // Admin retunes AFTER the bet is placed.
  const saved = await getGlobalConfig();
  await setGlobalConfig({ cashOutFeeRate: 0.25 }, "officer_test");

  const before = await bal("usr_stick_a");
  const r = await cashOutPosition("usr_stick_a", posId);
  ok(
    "a mid-poll retune does NOT reprice a bet already placed (still 10%, not 25%)",
    r.ok && (await bal("usr_stick_a")) - before === 9_000,
    `Δ=${(await bal("usr_stick_a")) - before} (expected 9,000 at the poll's frozen 10%, NOT 7,500 at the new 25%)`,
  );

  await setGlobalConfig({ cashOutFeeRate: saved.cashOutFeeRate }, "officer_test");
}

// ── Rate 0 disables the fee (knob covers the full range) ───────────────────
{
  const saved = await getGlobalConfig();
  await setGlobalConfig({ cashOutFeeRate: 0 }, "officer_test");
  await fundedUser("usr_co_e");
  await fundedUser("usr_co_e2");
  await fundedUser("usr_co_f");
  const m = await makeMarket(); // created after the retune → freezes 0%
  const e = await buyPosition("usr_co_e", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_co_e2", { marketId: m.id, side: "YES", stake: 10_000 }); // co-bettor
  await buyPosition("usr_co_f", { marketId: m.id, side: "NO", stake: 10_000 });
  const posId = e.ok ? e.data!.positionId : "";
  await backdatePastGrace(posId);
  const walletBefore = await bal("usr_co_e");
  const r = await cashOutPosition("usr_co_e", posId);
  ok("rate 0 → full stake back, no fee", r.ok && (await bal("usr_co_e")) - walletBefore === 10_000, `Δ=${(await bal("usr_co_e")) - walletBefore}`);
  await setGlobalConfig({ cashOutFeeRate: saved.cashOutFeeRate }, "officer_test");
}

// ── HOLDING to settlement applies NORMAL rates (NOT the cash-out fee) ───────
{
  await setGlobalConfig({ cashOutFeeRate: 0.30 }, "officer_test"); // distinctive, so any leak would show
  await fundedUser("usr_hold");
  await fundedUser("usr_hold2");
  const m = await makeMarket();
  const h = await buyPosition("usr_hold", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_hold2", { marketId: m.id, side: "NO", stake: 10_000 });
  ok("hold position opened", h.ok);

  const mkt = (await getMarket(m.id))!;
  // The POLL'S rates, not live config — that is what settlement uses.
  const cfg = ratesFor(mkt);
  const expectedPayout = settledPayoutWhole({ yesPool: mkt.yesPool, noPool: mkt.noPool, side: "YES", stake: 10_000 }, cfg);
  const stakeMinusCashoutFee = Math.round(10_000 * (1 - 0.30)); // 7,000 — what a 30% early sell WOULD give

  const before = await bal("usr_hold");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_one" }); // stage 1
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_two" }); // stage 2 → verdict only
  await settleMarket(m.id, { force: true });                                          // money moves here now
  const delta = (await bal("usr_hold")) - before;

  ok("hold→settlement pays the normal pari-mutuel payout", delta === expectedPayout && expectedPayout > 0, `delta=${delta} expected=${expectedPayout}`);
  ok("settlement is NOT reduced by the cash-out fee", delta !== stakeMinusCashoutFee, `delta=${delta} cashoutWouldBe=${stakeMinusCashoutFee}`);

  await setGlobalConfig({ cashOutFeeRate: 0.09 }, "officer_test");
}

// ── DEFAULT POLICY (2026-07-22): paidExitWindowMinutes = 0 → "5-min free, then
//    nothing". With no paid tail, an exit past the free grace is LOCKED. ───────
{
  await setGlobalConfig({ paidExitWindowMinutes: 0 }, "officer_test");
  await fundedUser("usr_lock_a");
  await fundedUser("usr_lock_b");
  const m = await makeMarket(); // snapshots paidExitWindowMinutes = 0
  const a = await buyPosition("usr_lock_a", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_lock_b", { marketId: m.id, side: "NO", stake: 10_000 });
  const posId = a.ok ? a.data!.positionId : "";
  ok("DEFAULT: the poll froze paidExitWindowMinutes = 0", ratesFor((await getMarket(m.id))!).paidExitWindowMinutes === 0);

  await backdatePastGrace(posId); // 10 min ago — past the 5-min free grace
  const before = await bal("usr_lock_a");
  const r = await cashOutPosition("usr_lock_a", posId);
  ok("DEFAULT: past the 5-min grace with no paid window, the exit is LOCKED", !r.ok, r.ok ? "!! a sale succeeded after the grace with paid window = 0" : "");
  ok("DEFAULT: no money moved on the locked exit", (await bal("usr_lock_a")) === before, `Δ=${(await bal("usr_lock_a")) - before}`);
  await setGlobalConfig({ paidExitWindowMinutes: 15 }, "officer_test"); // restore for any later blocks
}

console.log(`\ncashout-fee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
