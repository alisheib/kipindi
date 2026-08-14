/**
 * B · ONE SIDE COUNTS, AND A FREE CANCELLATION TAKES ITS CREDIT BACK — executed.
 *
 *   npx tsx scripts/bonus-one-side.test.mts     (npm run test:bonus-one-side)
 *
 * ⛔ THIS SUITE IS THE OTHER HALF OF A SINGLE COMMIT. `docs/RULES.md` §2.4 removed the
 * "ONE ACCOUNT, ONE SIDE" refusal from `buyPosition`; §2.5 says only one side of a market
 * accrues turnover toward a bonus requirement. The two are inseparable, and the window
 * between them is the exploit:
 *
 *   at 13% of the losing side, a TZS 10,000 grant with a 5x requirement clears for 3,250
 *   of fee — a 6,750 gift per grant, same day, no market view taken.
 *
 * `test:updown-window` §6 and `test:updown-quickbet` §4 pin that both sides are now
 * ACCEPTED. Nothing there can see the wagering half, because it needs a live grant to be
 * visible at all — which is exactly why it gets its own file rather than a line in theirs.
 *
 *   §1  the hedge is PERMITTED and the second side accrues NOTHING
 *   §2  the conservative form: a top-up on the ORIGINAL side is also suppressed while the
 *       opposite leg is open — and the looser rule is shown, in numbers, to over-credit
 *   §3  ★ B1b — a FREE CANCELLATION takes its turnover credit back with it
 *   §4  ★ the whole exploit, driven end to end: the pre-fix routes cannot clear a grant
 *   §5  and honest play is UNHARMED — one side, many bets, full credit, grant fulfils
 *
 * ⚠️ EVERY SECTION READS `wageredTzs` OFF THE GRANT, not a service return value. A rule
 * about turnover that is checked against the function that computes turnover proves only
 * that the function is self-consistent.
 *
 * RED harness: `node scripts/bonus-one-side-red.mjs`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, cashOutPosition } from "../src/lib/server/market-service.ts";
import { creditBonus } from "../src/lib/server/bonus-service.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25577${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
const wagered = async (uid: string) => (await db.bonusGrant.listByUser(uid))[0]?.wageredTzs ?? -1;
const realBal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
async function makeMarket() {
  return createMarket({
    titleEn: "One-side wagering market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// ── §1 · the hedge is permitted, and buys no wagering progress ────────────────
console.log("\n§1 · both sides accepted; only the first accrues");
{
  await fundedUser("os_hedge", 100_000);
  await creditBonus("os_hedge", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  const m = await makeMarket();

  const up = await buyPosition("os_hedge", { marketId: m.id, side: "YES", stake: 10_000 });
  ok("1.1 · the first side is accepted", up.ok, up.ok ? "" : up.error);
  ok("1.2 · …and accrues its full stake as turnover", (await wagered("os_hedge")) === 10_000, `wagered=${await wagered("os_hedge")}`);

  const down = await buyPosition("os_hedge", { marketId: m.id, side: "NO", stake: 10_000 });
  ok("1.3 · ⭐ the OPPOSITE side is ACCEPTED — the 2026-08-04 guard is gone", down.ok, down.ok ? "" : `REFUSED — ${down.error}`);
  ok("1.4 · ★ …and accrues NOTHING — the hedge buys no wagering progress",
     (await wagered("os_hedge")) === 10_000, `wagered=${await wagered("os_hedge")} (must still be 10,000)`);

  // ⛔ The stake really moved. A "did not accrue" that had also silently refused the bet
  // would read identically at the line above, and would be the OLD behaviour wearing the
  // new assertion's clothes.
  ok("1.5 · ⛔ and the second stake really left the wallet — this is a bet, not a refusal",
     (await realBal("os_hedge")) === 80_000, `balance=${await realBal("os_hedge")}`);
}

// ── §2 · the conservative form, and why the looser one leaks ──────────────────
console.log("\n§2 · a top-up while hedged is suppressed too");
{
  await fundedUser("os_topup", 100_000);
  await creditBonus("os_topup", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const m = await makeMarket();

  await buyPosition("os_topup", { marketId: m.id, side: "YES", stake: 10_000 });
  await buyPosition("os_topup", { marketId: m.id, side: "NO", stake: 10_000 });
  const before = await wagered("os_topup");
  const more = await buyPosition("os_topup", { marketId: m.id, side: "YES", stake: 10_000 });
  ok("2.1 · a third bet on the ORIGINAL side is still accepted", more.ok, more.ok ? "" : more.error);
  ok("2.2 · ★ …and accrues NOTHING while the opposite leg is open",
     (await wagered("os_topup")) === before, `${before} → ${await wagered("os_topup")}`);

  // ⭐ THE NUMBER THAT SETTLES THE DESIGN CHOICE. Under the looser reading — "credit
  // whichever side they were on FIRST" — this player would now hold 20,000 credited turnover
  // against 10,000 of net exposure (UP 20,000 vs DOWN 10,000): a 2x amplification, available
  // to anyone, forever. The shipped rule can only ever UNDER-credit.
  const netExposure = 20_000 - 10_000;
  ok("2.3 · ⭐ credited turnover never exceeds net exposure",
     (await wagered("os_topup")) <= netExposure, `wagered ${await wagered("os_topup")} vs net exposure ${netExposure}`);

  // And the escape hatch is real: close the opposite leg (free inside 5 minutes) and the
  // next bet on the original side counts again.
  const legs = await (await import("../src/lib/server/market-dal.ts")).positionStore.listForUserAndMarket("os_topup", m.id);
  const noLeg = legs.find((p) => p.side === "NO" && p.status === "OPEN")!;
  const sold = await cashOutPosition("os_topup", noLeg.id);
  ok("2.4 · the opposite leg can be cancelled inside the free window", sold.ok, sold.ok ? "" : sold.error);
  const afterSell = await wagered("os_topup");
  const resumed = await buyPosition("os_topup", { marketId: m.id, side: "YES", stake: 5_000 });
  ok("2.5 · ⭐ with the hedge closed, the original side ACCRUES AGAIN — the rule is not a trap",
     resumed.ok && (await wagered("os_topup")) === afterSell + 5_000,
     `${afterSell} → ${await wagered("os_topup")}`);
}

// ── §3 · B1b — a free cancellation takes its credit back ──────────────────────
console.log("\n§3 · B1b · cash-out reverses its own turnover");
{
  await fundedUser("os_cancel", 100_000);
  await creditBonus("os_cancel", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const m = await makeMarket();

  const bet = await buyPosition("os_cancel", { marketId: m.id, side: "YES", stake: 20_000 });
  ok("3.1 · a plain one-sided bet accrues its stake", bet.ok && (await wagered("os_cancel")) === 20_000, `wagered=${await wagered("os_cancel")}`);

  const sold = bet.ok ? await cashOutPosition("os_cancel", bet.data.positionId) : { ok: false as const, error: "no bet" };
  ok("3.2 · it can be cancelled free inside the 5-minute grace", sold.ok, sold.ok ? "" : sold.error);
  ok("3.3 · …and the whole stake comes back", (await realBal("os_cancel")) === 100_000, `balance=${await realBal("os_cancel")}`);
  ok("3.4 · ★★ AND THE TURNOVER CREDIT GOES BACK WITH IT — this call did not exist before 2026-08-14",
     (await wagered("os_cancel")) === 0, `wagered=${await wagered("os_cancel")} (must be 0)`);
}

// ── §4 · the exploit, driven end to end ──────────────────────────────────────
console.log("\n§4 · neither route clears a grant");
{
  // ── Route A · THE EXPLOIT EXACTLY AS docs/RULES.md §2.5 STATES IT ──────────
  // ONE market, ONE matched pair. Under the old accrual a 25,000/25,000 hedge credits
  // 50,000 of turnover and clears a 10,000 grant's 5x requirement OUTRIGHT, same day, for
  // the fee on the losing leg alone: 13% of 25,000 = 3,250 against a 10,000 bonus made
  // withdrawable — the 6,750 gift per grant, repeatable.
  await fundedUser("os_exploit_a", 1_000_000);
  await creditBonus("os_exploit_a", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  const mA = await makeMarket();
  await buyPosition("os_exploit_a", { marketId: mA.id, side: "YES", stake: 25_000 });
  await buyPosition("os_exploit_a", { marketId: mA.id, side: "NO", stake: 25_000 });
  const gA = (await db.bonusGrant.listByUser("os_exploit_a"))[0];
  ok("4.1 · ★★ one 25,000/25,000 hedge credits 25,000, not the 50,000 that cleared the grant",
     gA.wageredTzs === 25_000, `wagered=${gA.wageredTzs}`);
  ok("4.2 · ★★ …so the grant is NOT fulfilled, and 10,000 of bonus did not become cash for 3,250 of fee",
     gA.status === "ACTIVE", `status=${gA.status}`);

  // ── Route A' · at scale, where the requirement cannot mask the difference ──
  // ⚠️ `wageredTzs` STOPS AT THE REQUIREMENT — `recordWageringCore` applies only what the
  // grant still needs, and skips a FULFILLED grant entirely. So a 50,000-requirement grant
  // reads 50,000 whether the true turnover was 250,000 or 500,000, and an assertion about
  // the difference would be measuring the CAP. The requirement here is deliberately far
  // above both totals so the counter can show what actually accrued.
  await fundedUser("os_exploit_scale", 2_000_000);
  await creditBonus("os_exploit_scale", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 100 }); // req 1,000,000
  for (let i = 0; i < 10; i++) {
    const m = await makeMarket();
    await buyPosition("os_exploit_scale", { marketId: m.id, side: "YES", stake: 25_000 });
    await buyPosition("os_exploit_scale", { marketId: m.id, side: "NO", stake: 25_000 });
  }
  const gS = (await db.bonusGrant.listByUser("os_exploit_scale"))[0];
  ok("4.2b · ★ 10 hedged pairs across 10 markets credit only the first leg of each — 250,000, not 500,000",
     gS.wageredTzs === 250_000, `wagered=${gS.wageredTzs}`);
  // ⚠️ AND THE 250,000 IS CORRECT, not a leak. Ten SEPARATE markets carry ten genuine first
  // legs, and a genuine first leg is genuine risk. The rule is about one market. This line
  // exists so nobody later reads 4.2b as "hedging can never advance a bonus at all".
  ok("4.2c · …and that 250,000 is REAL exposure — ten first legs on ten markets are ten real bets",
     gS.status === "ACTIVE" && gS.wageredTzs === 10 * 25_000, `wagered=${gS.wageredTzs} status=${gS.status}`);

  // Route B — bet, cancel free, repeat. THIS is the one that was entirely free, and it is
  // the one B1b closes: the stake always comes back, so no risk is ever taken at all.
  await fundedUser("os_exploit_b", 100_000);
  await creditBonus("os_exploit_b", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  for (let i = 0; i < 10; i++) {
    const m = await makeMarket();
    const r = await buyPosition("os_exploit_b", { marketId: m.id, side: "YES", stake: 25_000 });
    if (r.ok) await cashOutPosition("os_exploit_b", r.data.positionId);
  }
  const gB = (await db.bonusGrant.listByUser("os_exploit_b"))[0];
  ok("4.3 · ★★ bet-cancel-repeat x10 leaves turnover at ZERO — 250,000 of it before B1b",
     gB.wageredTzs === 0, `wagered=${gB.wageredTzs}`);
  ok("4.4 · ★★ …so the grant is NOT fulfilled, and no bonus became withdrawable cash",
     gB.status === "ACTIVE" && (await realBal("os_exploit_b")) === 100_000,
     `status=${gB.status} balance=${await realBal("os_exploit_b")}`);
}

// ── §5 · honest play is unharmed ─────────────────────────────────────────────
console.log("\n§5 · a player who takes a view is not penalised");
{
  await fundedUser("os_honest", 100_000);
  await creditBonus("os_honest", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  // Five bets, one side, across five markets — and two on the SAME market, which was always
  // allowed and must still accrue in full.
  for (let i = 0; i < 4; i++) {
    const m = await makeMarket();
    await buyPosition("os_honest", { marketId: m.id, side: "YES", stake: 10_000 });
  }
  const last = await makeMarket();
  await buyPosition("os_honest", { marketId: last.id, side: "NO", stake: 5_000 });
  await buyPosition("os_honest", { marketId: last.id, side: "NO", stake: 5_000 });
  const g = (await db.bonusGrant.listByUser("os_honest"))[0];
  ok("5.1 · ★ every stake counted — 4 x 10,000 plus two same-side bets of 5,000",
     g.wageredTzs === 50_000, `wagered=${g.wageredTzs}`);
  ok("5.2 · ★ the grant FULFILLED and the bonus became real, withdrawable balance",
     g.status === "FULFILLED" && (await realBal("os_honest")) > 50_000,
     `status=${g.status} balance=${await realBal("os_honest")}`);
}

console.log(`\nbonus-one-side: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
