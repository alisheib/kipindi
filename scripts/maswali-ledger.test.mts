/**
 * test:maswali-ledger — EVERY MILLIONEA MONEY MOVEMENT IS A BALANCED GROUP, AND A WRONG ONE IS REFUSED (MASWALI-BUILD S1).
 *
 *   npx tsx scripts/maswali-ledger.test.mts     (npm run test:maswali-ledger)
 *
 * The builders are pure; this drives them with MASWALI-PLAN §5b worked example A (the six-week trajectory) and checks the
 * identities the plan writes down, line by line — not "the group sums to zero", which a wrong group can also do:
 *
 *   §1 example A, week 2 (one winner, a top-up): the lines, the pool at exactly 0, the jackpot emptied, the guarantee drawn
 *   §2 example A, week 6 (three winners, the carry claimed, no top-up)
 *   §3 a no-winner week rolls the whole of S; nothing is charged
 *   §4 the guarantee in and out, the forfeit, the sunset — and the accounts each one touches
 *   §5 ⛔ REFUSALS — a pool that does not close, unequal shares, levies above the fee, fractions, no winner
 *   §6 the house book reads the two new accounts (they are in `acct`, and the solvency line counts them)
 */
import {
  acct, maswaliForfeitReturnEntries, maswaliGuaranteeFundEntries, maswaliGuaranteeReturnEntries, maswaliRolloverEntries,
  maswaliSettlementEntries, maswaliSunsetEntries, stakeEntries, type LedgerLine,
} from "../src/lib/server/ledger.ts";
import { levySplit } from "../src/lib/payout.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const throws = (fn: () => unknown): string | null => { try { fn(); return null; } catch (e) { return String((e as Error).message ?? e); } };
const sum = (ls: LedgerLine[]) => ls.reduce((s, l) => s + l.amount, 0);
const on = (ls: LedgerLine[], account: string) => ls.filter((l) => l.account === account).reduce((s, l) => s + l.amount, 0);
const POOL = acct.pool("mkt_week");

// The fee and its levies the platform's one split computes — the same function settlement uses for every product.
const split = (F: number) => {
  const s = levySplit(F, { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 });
  return { tra: s.traLevy, gbt: s.gbtLevy };
};

// ── §1 · week 2: S 400,000, R 300,000, k 1 → J 1,000,000, F 130,000, share 870,000, U 300,000, carry 0 ──────────────
console.log("\n§1 · example A, week 2 — one winner and a floor top-up");
{
  const { tra, gbt } = split(130_000);
  ok("1.0 · the levy split of 130,000 is TRA 13,000 and GBT 6,500 (the plan's table)", tra === 13_000 && gbt === 6_500, `${tra}/${gbt}`);
  const stakes = Array.from({ length: 400 }, (_, i) => stakeEntries({ txnId: `t${i}`, userId: `u${i}`, marketId: "mkt_week", realPart: 1_000, bonusPart: 0 })).flat();
  const lines = maswaliSettlementEntries({
    marketId: "mkt_week", sales: 400_000, rolloverIn: 300_000, topUp: 300_000, fee: 130_000, traLevy: tra, gbtLevy: gbt,
    winners: [{ userId: "u7", txnId: "pay_1", share: 870_000 }], carryOut: 0,
  });
  ok("1.1 · the group sums to 0", sum(lines) === 0, String(sum(lines)));
  ok("1.2 · ⭐ the POOL ends at EXACTLY 0 once the stakes are counted", on([...stakes, ...lines], POOL) === 0, String(on([...stakes, ...lines], POOL)));
  ok("1.3 · the jackpot gives up R = 300,000", on(lines, acct.maswaliJackpot) === -300_000);
  ok("1.4 · the guarantee gives up U = 300,000 (Δ −300,000 in the plan)", on(lines, acct.maswaliGuarantee) === -300_000);
  ok("1.5 · our commission keeps F − TRA − GBT = 110,500", on(lines, acct.commission) === 110_500, String(on(lines, acct.commission)));
  ok("1.6 · TRA 13,000 and GBT 6,500 land on the levy accounts", on(lines, acct.traLevy) === 13_000 && on(lines, acct.gbtLevy) === 6_500);
  ok("1.7 · the winner is paid 870,000 as a PAYOUT_CREDIT on their own account", on(lines, acct.player("u7")) === 870_000
    && lines.some((l) => l.account === acct.player("u7") && l.entryType === "PAYOUT_CREDIT" && l.txnId === "pay_1"));
  ok("1.8 · no carry line when the dust is 0", !lines.some((l) => l.entryType === "MASWALI_ROLLOVER_OUT"));
  ok("1.9 · every line names the week", lines.every((l) => l.marketId === "mkt_week"));
  ok("1.10 · the movements use the plan's entry types", ["MASWALI_ROLLOVER_IN", "MASWALI_TOPUP", "SETTLEMENT_COMMISSION", "SETTLEMENT_TRA_LEVY", "SETTLEMENT_GBT_LEVY", "PAYOUT_CREDIT"]
    .every((t) => lines.some((l) => l.entryType === t)));
}

// ── §2 · week 6: S 800,000, R 1,800,000, k 3 → J 2,600,000, F 338,000, share 754,000, U 0, carry 0 ─────────────────
console.log("\n§2 · example A, week 6 — three winners, the carry claimed, no top-up");
{
  const { tra, gbt } = split(338_000);
  ok("2.0 · TRA 33,800 and GBT 16,900", tra === 33_800 && gbt === 16_900);
  const winners = ["a", "b", "c"].map((u, i) => ({ userId: u, txnId: `p${i}`, share: 754_000 }));
  const lines = maswaliSettlementEntries({ marketId: "mkt_week", sales: 800_000, rolloverIn: 1_800_000, topUp: 0, fee: 338_000, traLevy: tra, gbtLevy: gbt, winners, carryOut: 0 });
  ok("2.1 · the group sums to 0", sum(lines) === 0);
  ok("2.2 · paid 2,262,000 in all (3 × 754,000)", ["a", "b", "c"].reduce((s, u) => s + on(lines, acct.player(u)), 0) === 2_262_000);
  ok("2.3 · ⛔ no top-up line when U = 0 — the guarantee is untouched", on(lines, acct.maswaliGuarantee) === 0 && !lines.some((l) => l.entryType === "MASWALI_TOPUP"));
  ok("2.4 · the jackpot is emptied of R", on(lines, acct.maswaliJackpot) === -1_800_000);
  // A week whose share does not divide: S 1,000,001 with k = 3 leaves dust, carried to the jackpot.
  const J = 1_000_001, F = Math.round(0.13 * J), share = Math.floor((J - F) / 3), carry = J - F - 3 * share;
  const s3 = split(F);
  const dusty = maswaliSettlementEntries({ marketId: "mkt_week", sales: J, rolloverIn: 0, topUp: 0, fee: F, traLevy: s3.tra, gbtLevy: s3.gbt,
    winners: ["a", "b", "c"].map((u) => ({ userId: u, txnId: `d${u}`, share })), carryOut: carry });
  ok(`2.5 · the rounding dust (${carry}) goes to the JACKPOT, never the house`, carry > 0 && on(dusty, acct.maswaliJackpot) === carry && on(dusty, acct.commission) === F - s3.tra - s3.gbt);
}

// ── §3 · a no-winner week ───────────────────────────────────────────────────
console.log("\n§3 · no winner — the whole of S rolls, nothing is charged");
{
  const lines = maswaliRolloverEntries({ marketId: "mkt_week", sales: 300_000 });
  ok("3.1 · two lines, summing to 0", lines.length === 2 && sum(lines) === 0);
  ok("3.2 · the pool gives up all of S to the jackpot", on(lines, POOL) === -300_000 && on(lines, acct.maswaliJackpot) === 300_000);
  ok("3.3 · ⛔ no fee, no levy, no top-up", !lines.some((l) => l.account === acct.commission || l.account === acct.traLevy || l.account === acct.maswaliGuarantee));
  ok("3.4 · a week that sold nothing books nothing", maswaliRolloverEntries({ marketId: "mkt_week", sales: 0 }).length === 0);
}

// ── §4 · the other movements ────────────────────────────────────────────────
console.log("\n§4 · guarantee in and out, forfeit, sunset");
{
  const fund = maswaliGuaranteeFundEntries({ amount: 2_000_000, reference: "BANK-REF-001", actorId: "usr_owner" });
  ok("4.1 · funding: owner capital → guarantee, 2,000,000, balanced", sum(fund) === 0 && on(fund, acct.ownerCapital) === -2_000_000 && on(fund, acct.maswaliGuarantee) === 2_000_000);
  ok("4.2 · the owner-capital counterparty is EXTERNAL (money really crossed the boundary)", acct.ownerCapital === "EXTERNAL:OWNER_CAPITAL");
  ok("4.3 · the reference is on the record", fund.every((l) => (l.memo ?? "").includes("BANK-REF-001")));
  const ret = maswaliGuaranteeReturnEntries({ amount: 500_000, reference: "BANK-REF-002", actorId: "usr_owner" });
  ok("4.4 · return: guarantee → owner capital, balanced", sum(ret) === 0 && on(ret, acct.maswaliGuarantee) === -500_000 && on(ret, acct.ownerCapital) === 500_000);
  const forfeit = maswaliForfeitReturnEntries({ marketId: "mkt_week", userId: "u9", txnId: "f1", amount: 870_000 });
  ok("4.5 · ⛔ a forfeit goes to the JACKPOT, never the house (OD-07)", sum(forfeit) === 0 && on(forfeit, acct.maswaliJackpot) === 870_000 && !forfeit.some((l) => l.account === acct.commission));
  const sunset = maswaliSunsetEntries({ marketId: "mkt_final", amount: 1_234_000 });
  ok("4.6 · sunset: the jackpot into the final week's pool", sum(sunset) === 0 && on(sunset, acct.maswaliJackpot) === -1_234_000 && on(sunset, acct.pool("mkt_final")) === 1_234_000);
  ok("4.7 · an empty jackpot at the sunset books nothing", maswaliSunsetEntries({ marketId: "mkt_final", amount: 0 }).length === 0);
  ok("4.8 · the jackpot and the guarantee are HOUSE accounts the house book reads", acct.maswaliJackpot === "HOUSE:MASWALI_JACKPOT" && acct.maswaliGuarantee === "HOUSE:MASWALI_GUARANTEE");
}

// ── §5 · refusals ───────────────────────────────────────────────────────────
console.log("\n§5 · ⛔ a wrong group is refused, not booked");
{
  const base = { marketId: "mkt_week", sales: 400_000, rolloverIn: 300_000, topUp: 300_000, fee: 130_000, traLevy: 13_000, gbtLevy: 6_500,
    winners: [{ userId: "u7", txnId: "pay_1", share: 870_000 }], carryOut: 0 };
  ok("5.0 · CONTROL · the good group is accepted", throws(() => maswaliSettlementEntries(base)) === null);
  ok("5.1 · a pool that does not close (one shilling short on the top-up)", /does not close/.test(String(throws(() => maswaliSettlementEntries({ ...base, topUp: 299_999 })))));
  ok("5.2 · a pool that does not close (the dust forgotten)", /does not close/.test(String(throws(() => maswaliSettlementEntries({ ...base, sales: 400_001 })))));
  // Two shares that still close the pool (435,001 + 434,999 = 870,000) — so only the equal-share rule can refuse them.
  ok("5.3 · unequal winners' shares (MR-23), even when the pool would close", /same share/.test(String(throws(() => maswaliSettlementEntries({ ...base,
    winners: [{ userId: "a", txnId: "1", share: 435_001 }, { userId: "b", txnId: "2", share: 434_999 }] })))));
  ok("5.4 · levies above the fee", /exceed the fee/.test(String(throws(() => maswaliSettlementEntries({ ...base, traLevy: 100_000, gbtLevy: 40_000 })))));
  ok("5.5 · a fractional shilling", /whole non-negative/.test(String(throws(() => maswaliSettlementEntries({ ...base, fee: 130_000.5 })))));
  ok("5.6 · a negative amount", /whole non-negative/.test(String(throws(() => maswaliSettlementEntries({ ...base, carryOut: -1 })))));
  ok("5.7 · no winner → it is a rollover, not a settlement", /rollover/.test(String(throws(() => maswaliSettlementEntries({ ...base, winners: [] })))));
  ok("5.8 · a zero guarantee funding is not a ceremony", throws(() => maswaliGuaranteeFundEntries({ amount: 0, reference: "x", actorId: "o" })) !== null);
  ok("5.9 · a zero forfeit is not a ceremony", throws(() => maswaliForfeitReturnEntries({ marketId: "m", userId: "u", txnId: "t", amount: 0 })) !== null);
}

console.log(`\n${"═".repeat(70)}\n  MASWALI LEDGER: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTED (MASWALI-BUILD S1, the first run); it only rises, to a printed number. */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
