/**
 * Early-cash-out commission tests (in-memory store; no DATABASE_URL).
 *
 * Management model: closing a position EARLY returns the player's OWN STAKE
 * minus the admin-configured cash-out fee (default 9%) — no winnings. The stake
 * leaves the player's own pool side; the fee is booked to the house reserve.
 * HOLDING to settlement is unaffected (normal pari-mutuel rates).
 *
 * Verifies, for "he has 10k in the pool, sells early, we take 9%":
 *   - player gets stake × (1 − feeRate)         (e.g. 10k → 9.1k)
 *   - house reserve gains stake × feeRate         (e.g. 900)
 *   - the pool drops by exactly the stake (10k)   (conserved; total unaffected)
 *   - rate is admin-configurable (9% → 20% → 0%)
 *   - holding to resolution pays the NORMAL payout, not stake-minus-fee
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, cashOutValue, getMarket, resolveMarket } from "../src/lib/server/market-service.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { setGlobalConfig, getGlobalConfig, getEffectiveConfig, settledPayoutWhole } from "../src/lib/server/market-config.ts";

/** Backdate a position's placedAt to 10 min ago so it's past the 5-min grace window. */
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
    titleEn: "Cashout fee market", titleSw: null as unknown as string, category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// ── Default 9%: "he has 10k in the pool, sells early, we take 9%" ───────────
await fundedUser("usr_co_a");
await fundedUser("usr_co_b");
{
  const m = await makeMarket();
  const a = await buyPosition("usr_co_a", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_co_b", { marketId: m.id, side: "NO", stake: 10_000 });
  ok("position opened (10k YES)", a.ok);
  const posId = a.ok ? a.data!.positionId : "";

  const mkt = (await getMarket(m.id))!;
  const proj = await cashOutValue({ side: "YES", stake: 10_000 }, { id: m.id, yesPool: mkt.yesPool, noPool: mkt.noPool });
  ok("default fee rate is 9%", Math.abs(proj.feeRate - 0.09) < 1e-9, `feeRate=${proj.feeRate}`);
  ok("gross == stake (10k)", proj.gross === 10_000, `gross=${proj.gross}`);
  ok("player gets 9,100 (10k − 9%)", proj.value === 9_100, `value=${proj.value}`);
  ok("house fee is 900", proj.fee === 900, `fee=${proj.fee}`);

  await backdatePastGrace(posId); // move past the 5-min free-exit window

  const walletBefore = await bal("usr_co_a");
  const poolsBefore = await pools(m.id);

  const r = await cashOutPosition("usr_co_a", posId);
  ok("cash-out succeeded", r.ok);
  const got = r.ok ? r.data!.value : -1;

  ok("player received 9,100", (await bal("usr_co_a")) - walletBefore === 9_100 && got === 9_100, `Δwallet=${(await bal("usr_co_a")) - walletBefore} value=${got}`);
  ok("pool dropped by value paid (9,100) — fee stays in pool", poolsBefore - (await pools(m.id)) === 9_100, `Δpools=${poolsBefore - (await pools(m.id))}`);
  ok("no double cash-out", !(await cashOutPosition("usr_co_a", posId)).ok);
}

// ── Admin-configurable: 20% ────────────────────────────────────────────────
{
  const before = await getGlobalConfig();
  const set = await setGlobalConfig({ cashOutFeeRate: 0.20 }, "officer_test");
  ok("admin can set cash-out fee to 20%", set.ok && (set as { config: { cashOutFeeRate: number } }).config.cashOutFeeRate === 0.20);

  await fundedUser("usr_co_c");
  await fundedUser("usr_co_d");
  const m = await makeMarket();
  const c = await buyPosition("usr_co_c", { marketId: m.id, side: "YES", stake: 30_000 });
  await buyPosition("usr_co_d", { marketId: m.id, side: "NO", stake: 30_000 });
  const posId = c.ok ? c.data!.positionId : "";

  await backdatePastGrace(posId); // move past the 5-min free-exit window

  const walletBefore = await bal("usr_co_c");
  const r = await cashOutPosition("usr_co_c", posId);
  ok("20%: player gets 24,000 (30k − 20%)", r.ok && (await bal("usr_co_c")) - walletBefore === 24_000, `Δ=${(await bal("usr_co_c")) - walletBefore}`);

  await setGlobalConfig({ cashOutFeeRate: before.cashOutFeeRate }, "officer_test");
}

// ── Rate 0 disables the fee (knob covers the full range) ───────────────────
{
  await setGlobalConfig({ cashOutFeeRate: 0 }, "officer_test");
  await fundedUser("usr_co_e");
  await fundedUser("usr_co_f");
  const m = await makeMarket();
  const e = await buyPosition("usr_co_e", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("usr_co_f", { marketId: m.id, side: "NO", stake: 10_000 });
  const posId = e.ok ? e.data!.positionId : "";
  const walletBefore = await bal("usr_co_e");
  const r = await cashOutPosition("usr_co_e", posId);
  ok("rate 0 → full stake back, no fee", r.ok && (await bal("usr_co_e")) - walletBefore === 10_000);
  await setGlobalConfig({ cashOutFeeRate: 0.09 }, "officer_test");
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
  const cfg = await getEffectiveConfig(m.id);
  const expectedPayout = settledPayoutWhole({ yesPool: mkt.yesPool, noPool: mkt.noPool, side: "YES", stake: 10_000 }, cfg);
  const stakeMinusCashoutFee = Math.round(10_000 * (1 - 0.30)); // 7,000 — what a 30% early sell WOULD give

  const before = await bal("usr_hold");
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_one" }); // stage 1
  await resolveMarket({ marketId: m.id, outcome: "YES", officerId: "officer_two" }); // stage 2 → pays winners
  const delta = (await bal("usr_hold")) - before;

  ok("hold→settlement pays the normal pari-mutuel payout", delta === expectedPayout && expectedPayout > 0, `delta=${delta} expected=${expectedPayout}`);
  ok("settlement is NOT reduced by the cash-out fee", delta !== stakeMinusCashoutFee, `delta=${delta} cashoutWouldBe=${stakeMinusCashoutFee}`);

  await setGlobalConfig({ cashOutFeeRate: 0.09 }, "officer_test");
}

console.log(`\ncashout-fee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
