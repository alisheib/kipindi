/**
 * Bonus-funded betting integration tests (in-memory store; no DATABASE_URL).
 *
 * Exercises the Phase-4 money path through the real market-service:
 *   - real-first funding split (real spent before bonus)
 *   - position.bonusStakeTzs recorded
 *   - turnover wagering accrues on the full stake; fulfilment converts bonus→cash
 *   - cash-out blocked on bonus-funded positions (no bonus→cash bypass)
 *   - market void refunds the bonus portion to the bonus wallet, real to real
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition, resolveMarket, settleMarket, getMarket } from "../src/lib/server/market-service.ts";
import { creditBonus } from "../src/lib/server/bonus-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25576${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const real = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
async function makeMarket() {
  return createMarket({
    titleEn: "Bonus betting market", titleSw: null as unknown as string, category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// ── Real-first split: real spent before bonus ────────────────────────────────
{
  await fundedUser("usr_bb_split", 3_000);
  await creditBonus("usr_bb_split", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  const m = await makeMarket();
  const r = await buyPosition("usr_bb_split", { marketId: m.id, side: "YES", stake: 5_000 });
  ok("bet placed", r.ok);
  ok("real balance drained to 0", (await real("usr_bb_split")) === 0, `real=${await real("usr_bb_split")}`);
  ok("bonus reduced by 2,000 → 8,000", (await bonus("usr_bb_split")) === 8_000, `bonus=${await bonus("usr_bb_split")}`);
  const pos = r.ok ? await (await import("../src/lib/server/market-dal.ts")).positionStore.get(r.data!.positionId) : null;
  ok("position.bonusStakeTzs == 2,000", (pos?.bonusStakeTzs ?? -1) === 2_000, `b=${pos?.bonusStakeTzs}`);
  const g = (await db.bonusGrant.listByUser("usr_bb_split"))[0];
  ok("wagering accrued full stake (5,000)", g.wageredTzs === 5_000, `wagered=${g.wageredTzs}`);
}

// ── Fully bonus-funded bet + cash-out blocked ────────────────────────────────
{
  await fundedUser("usr_bb_full", 0);
  await creditBonus("usr_bb_full", { amountTzs: 8_000, source: "INVITE", wagerMultiplier: 5 });
  const m = await makeMarket();
  const r = await buyPosition("usr_bb_full", { marketId: m.id, side: "YES", stake: 4_000 });
  ok("fully-bonus bet placed", r.ok);
  ok("bonus reduced 8,000 → 4,000", (await bonus("usr_bb_full")) === 4_000, `bonus=${await bonus("usr_bb_full")}`);
  ok("real still 0", (await real("usr_bb_full")) === 0);
  const co = r.ok ? await cashOutPosition("usr_bb_full", r.data!.positionId) : { ok: true };
  ok("cash-out BLOCKED on bonus-funded bet", !co.ok && /bonus/i.test((co as { error: string }).error ?? ""));
}

// ── Void refunds bonus portion to bonus wallet, real to real ─────────────────
{
  await fundedUser("usr_bb_void", 2_000);   // will bet 5k: 2k real + 3k bonus
  await fundedUser("usr_bb_opp", 5_000);     // opposite side so market isn't one-sided
  await creditBonus("usr_bb_void", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const m = await makeMarket();
  const a = await buyPosition("usr_bb_void", { marketId: m.id, side: "YES", stake: 5_000 });
  await buyPosition("usr_bb_opp", { marketId: m.id, side: "NO", stake: 5_000 });
  ok("bonus-funded bet placed (2k real + 3k bonus)", a.ok);
  ok("pre-void real 0, bonus 7,000", (await real("usr_bb_void")) === 0 && (await bonus("usr_bb_void")) === 7_000, `real=${await real("usr_bb_void")} bonus=${await bonus("usr_bb_void")}`);
  // Two-officer void
  await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "officer_one" });
  await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "officer_two" });
  await settleMarket(m.id, { force: true }); // refunds move at settlement, not at the verdict
  ok("real refunded to real (2,000)", (await real("usr_bb_void")) === 2_000, `real=${await real("usr_bb_void")}`);
  ok("bonus refunded to bonus (back to 10,000)", (await bonus("usr_bb_void")) === 10_000, `bonus=${await bonus("usr_bb_void")}`);
  ok("opposite bettor fully refunded to real (5,000)", (await real("usr_bb_opp")) === 5_000, `real=${await real("usr_bb_opp")}`);
  // Leak fix: the voided bet's turnover must be REVERSED (else free wagering).
  const gVoid = (await db.bonusGrant.listByUser("usr_bb_void"))[0];
  ok("wagering turnover reversed on void (back to 0)", gVoid.wageredTzs === 0, `wagered=${gVoid.wageredTzs}`);
}

// ── Leak fix: repeated void cycles can NOT clear a bonus to cash ──────────────
{
  await fundedUser("usr_bb_exploit", 0);
  await fundedUser("usr_bb_exploit_opp", 200_000);
  await creditBonus("usr_bb_exploit", { amountTzs: 10_000, source: "INVITE", wagerMultiplier: 5 }); // req 50,000
  // Try to clear the 50k requirement by betting bonus then getting the market
  // voided, 6 times. Each void must reverse turnover + return bonus, never pay real.
  for (let i = 0; i < 6; i++) {
    const m = await makeMarket();
    await buyPosition("usr_bb_exploit", { marketId: m.id, side: "YES", stake: 8_000 }); // bonus-funded
    await buyPosition("usr_bb_exploit_opp", { marketId: m.id, side: "NO", stake: 8_000 });
    await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "off_a" });
    await resolveMarket({ marketId: m.id, outcome: "VOID", officerId: "off_b" });
    await settleMarket(m.id, { force: true }); // the refund is what the exploit tries to farm
  }
  ok("real balance still 0 after 6 void cycles (no bonus→cash leak)", (await real("usr_bb_exploit")) === 0, `real=${await real("usr_bb_exploit")}`);
  ok("bonus still 10,000 (nothing converted)", (await bonus("usr_bb_exploit")) === 10_000, `bonus=${await bonus("usr_bb_exploit")}`);
  const gx = (await db.bonusGrant.listByUser("usr_bb_exploit"))[0];
  ok("grant still ACTIVE, not fulfilled", gx.status === "ACTIVE", `status=${gx.status}`);
  ok("wagering did NOT accumulate across voids", gx.wageredTzs === 0, `wagered=${gx.wageredTzs}`);
}

// ── Wagering fulfilment via real-money turnover converts bonus → cash ─────────
{
  await fundedUser("usr_bb_fulfil", 60_000);
  await creditBonus("usr_bb_fulfil", { amountTzs: 10_000, source: "PROPOSAL", wagerMultiplier: 5 }); // req 50,000
  const m = await makeMarket();
  const r = await buyPosition("usr_bb_fulfil", { marketId: m.id, side: "YES", stake: 50_000 }); // 50k real turnover
  ok("50k real bet placed", r.ok);
  // real: 60,000 − 50,000 stake + 10,000 fulfilment = 20,000
  ok("bonus fulfilled → real 20,000", (await real("usr_bb_fulfil")) === 20_000, `real=${await real("usr_bb_fulfil")}`);
  ok("bonusBalance 0 after fulfilment", (await bonus("usr_bb_fulfil")) === 0, `bonus=${await bonus("usr_bb_fulfil")}`);
  const g = (await db.bonusGrant.listByUser("usr_bb_fulfil"))[0];
  ok("grant FULFILLED", g.status === "FULFILLED");
  const credit = (await db.txn.findByUser("usr_bb_fulfil", 50)).filter((t) => t.type === "BONUS_CREDIT");
  ok("BONUS_CREDIT txn for 10,000 posted", credit.some((t) => t.amount === 10_000));
}

console.log(`\nbonus-betting: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
