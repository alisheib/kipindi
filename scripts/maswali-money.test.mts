/**
 * test:maswali-money — THE WEEK'S ARITHMETIC, TO THE SHILLING (MASWALI-BUILD S2; MR-20…MR-26, §5's worked examples).
 *
 *   npx tsx scripts/maswali-money.test.mts     (npm run test:maswali-money)
 *
 *   §1 ⭐ the grid: R ∈ {0, 500k, 2M} × S ∈ {0, 300k, 1.2M} × k ∈ {0, 1, 3, 7, 870, 1,000, 1,400} — every identity
 *   §2 worked example A, row by row (the six-week trajectory in §5b)
 *   §3 MR-23's PDF check (J 1,050,000 → F 136,500, paid 913,500) and the dust rules
 *   §4 the guarantee requirement (OD-02)
 *   §5 refusals
 */
import { guaranteeRequirement, settleArithmetic } from "../src/lib/maswali-money.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "", quiet = false) => {
  if (cond) { pass++; if (!quiet) console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const RATES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
const run = (R: number, S: number, k: number) => settleArithmetic({ rolloverIn: R, sales: S, winners: k, floor: 1_000_000, feeRate: 0.13, rates: RATES });
/** ⛔ MASWALI-BUILD S7-F7 4 · A THROW IS THE CASE'S FAILURE, NEVER THE SUITE'S END. `settleArithmetic` refuses a jackpot under
 *  its floor (`maswali-money.ts`), so an arithmetic that forgot the floor threw on §1's first payout cell and ended the
 *  suite before any case could say what broke (red:maswali-engine's (6) read WRONG-ASSERTION). §1–§3 compute through this,
 *  so each case records the throw as its own FAIL; §5 still calls `run`, whose refusals ARE the cases. */
type Settled = ReturnType<typeof settleArithmetic> | { kind: "THREW"; error: string };
const settle = (R: number, S: number, k: number): Settled => {
  try { return run(R, S, k); } catch (err) { return { kind: "THREW", error: String((err as Error)?.message ?? err).slice(0, 160) }; }
};

// ── §1 · the grid ───────────────────────────────────────────────────────────
console.log("\n§1 · the grid — every identity on every cell");
{
  let cells = 0;
  for (const R of [0, 500_000, 2_000_000]) for (const S of [0, 300_000, 1_200_000]) for (const k of [0, 1, 3, 7, 870, 1_000, 1_400]) {
    cells++;
    const a = settle(R, S, k);
    const tag = `R=${R} S=${S} k=${k}`;
    if (k === 0) {
      ok(`1 · ${tag}: no winner → the whole of S rolls, nothing charged`, a.kind === "ROLLOVER" && a.rolled === S && a.jackpotAfter === R + S, JSON.stringify(a), true);
      continue;
    }
    if (a.kind !== "PAYOUT") { ok(`1 · ${tag}: a payout`, false, JSON.stringify(a)); continue; }
    ok(`1 · ${tag}: S + R + U = F + k·share + carryOut`, S + R + a.U === a.F + k * a.share + a.carryOut, JSON.stringify(a), true);
    ok(`1 · ${tag}: F = TRA + GBT + net`, a.F === a.tra + a.gbt + a.net, "", true);
    ok(`1 · ${tag}: J = max(floor, R + S)`, a.J === Math.max(1_000_000, R + S), "", true);
    ok(`1 · ${tag}: F = round(13% × J)`, a.F === Math.round(0.13 * a.J), "", true);
    ok(`1 · ${tag}: share = ⌊(J − F)/k⌋, dust < k`, a.share === Math.floor((a.J - a.F) / k) && a.dust >= 0 && a.dust < k, "", true);
    ok(`1 · ${tag}: a topped-up week carries nothing`, a.U === 0 || a.carryOut === 0, JSON.stringify(a), true);
    ok(`1 · ${tag}: no top-up when R + S already reaches the floor`, R + S < 1_000_000 || a.U === 0, JSON.stringify(a), true);
  }
  ok(`1.count · all ${cells} cells (3 × 3 × 7) ran, every identity held`, cells === 63 && fail === 0, String(cells));
  const big = settle(0, 300_000, 1_400);
  ok("1.floor · ⛔ no winner floor: at k = 1,400 a share is below a ticket's price, and it is paid as computed", big.kind === "PAYOUT" && big.share < 1_000 && big.share === 621, JSON.stringify(big));
}

// ── §2 · worked example A ───────────────────────────────────────────────────
console.log("\n§2 · worked example A — the six weeks, to the shilling");
{
  type Row = { wk: number; S: number; R: number; k: number; J?: number; F: number; tra: number; gbt: number; net: number; share?: number; U: number; paid: number; after: number };
  const rows: Row[] = [
    { wk: 1, S: 300_000, R: 0, k: 0, F: 0, tra: 0, gbt: 0, net: 0, U: 0, paid: 0, after: 300_000 },
    { wk: 2, S: 400_000, R: 300_000, k: 1, J: 1_000_000, F: 130_000, tra: 13_000, gbt: 6_500, net: 110_500, share: 870_000, U: 300_000, paid: 870_000, after: 0 },
    { wk: 3, S: 500_000, R: 0, k: 0, F: 0, tra: 0, gbt: 0, net: 0, U: 0, paid: 0, after: 500_000 },
    { wk: 4, S: 600_000, R: 500_000, k: 0, F: 0, tra: 0, gbt: 0, net: 0, U: 0, paid: 0, after: 1_100_000 },
    { wk: 5, S: 700_000, R: 1_100_000, k: 0, F: 0, tra: 0, gbt: 0, net: 0, U: 0, paid: 0, after: 1_800_000 },
    { wk: 6, S: 800_000, R: 1_800_000, k: 3, J: 2_600_000, F: 338_000, tra: 33_800, gbt: 16_900, net: 287_300, share: 754_000, U: 0, paid: 2_262_000, after: 0 },
  ];
  let fees = 0, topups = 0, paid = 0, carried = 0;
  for (const r of rows) {
    const a = settle(carried, r.S, r.k);
    // A week that threw is its own FAIL (its figures read as nothing), and the weeks after it go on from an empty carry.
    const got = a.kind === "THREW"
      ? { J: undefined, F: 0, tra: 0, gbt: 0, net: 0, share: undefined, U: 0, paid: 0, after: 0, threw: a.error }
      : a.kind === "ROLLOVER"
      ? { J: undefined, F: 0, tra: 0, gbt: 0, net: 0, share: undefined, U: 0, paid: 0, after: a.jackpotAfter }
      : { J: a.J, F: a.F, tra: a.tra, gbt: a.gbt, net: a.net, share: a.share, U: a.U, paid: a.paid, after: a.jackpotAfter };
    const want = { J: r.J, F: r.F, tra: r.tra, gbt: r.gbt, net: r.net, share: r.share, U: r.U, paid: r.paid, after: r.after };
    ok(`2.${r.wk} · week ${r.wk} (R claimed ${carried.toLocaleString("en")})`, carried === r.R && JSON.stringify(got) === JSON.stringify(want), `${JSON.stringify(got)} vs ${JSON.stringify(want)}`);
    fees += got.F; topups += got.U; paid += got.paid; carried = got.after;
  }
  ok("2.Σ · fees 468,000 · top-ups 300,000 · paid 3,132,000 — the table's totals", fees === 468_000 && topups === 300_000 && paid === 3_132_000, `${fees}/${topups}/${paid}`);
}

// ── §3 · the PDF check and dust ─────────────────────────────────────────────
console.log("\n§3 · MR-23's PDF check and the dust");
{
  const p = settle(50_000, 1_000_000, 1);
  ok("3.1 · J 1,050,000 → F 136,500 → one winner paid 913,500", p.kind === "PAYOUT" && p.J === 1_050_000 && p.F === 136_500 && p.paid === 913_500 && p.U === 0, JSON.stringify(p));
  const d = settle(0, 1_000_001, 3);
  ok("3.2 · a week that does not divide carries its dust to the jackpot", d.kind === "PAYOUT" && d.carryOut === d.dust && d.dust > 0 && d.dust < 3, JSON.stringify(d));
  const t = settle(0, 300_000, 7); // 870,000 / 7 leaves 5 shillings of dust
  ok("3.3 · ⛔ a topped-up week carries no dust (the top-up already excludes it — house money never carries)", t.kind === "PAYOUT" && t.U > 0 && t.carryOut === 0 && t.dust > 0, JSON.stringify(t));
  const z = settle(0, 0, 1);
  // The top-up covers the fee as well as the share: the house's own money pays the fee and its levies (OD-08 records
  // the levy on the house's top-up as accepted).
  ok("3.4 · a week that sold nothing but has a winner pays the floor's share, the guarantee covering share AND fee", z.kind === "PAYOUT" && z.U === 1_000_000 && z.paid === 870_000 && z.F === 130_000, JSON.stringify(z));
}

// ── §4 · the guarantee requirement ──────────────────────────────────────────
console.log("\n§4 · OD-02 — the guarantee a week needs to open");
{
  ok("4.1 · one fresh week needs its whole floor", guaranteeRequirement([{ floor: 1_000_000, confirmedCarryIn: null }]) === 1_000_000);
  ok("4.2 · ⭐ week N+1 opens while week N is unsettled: 2,000,000 (why the Owner pre-funds that)",
    guaranteeRequirement([{ floor: 1_000_000, confirmedCarryIn: 0 }, { floor: 1_000_000, confirmedCarryIn: null }]) === 2_000_000);
  ok("4.3 · a confirmed carry reduces its week's need", guaranteeRequirement([{ floor: 1_000_000, confirmedCarryIn: 300_000 }]) === 700_000);
  ok("4.4 · a carry above the floor needs nothing (never negative)", guaranteeRequirement([{ floor: 1_000_000, confirmedCarryIn: 1_800_000 }]) === 0);
  ok("4.5 · no unsettled week needs nothing", guaranteeRequirement([]) === 0);
}

// ── §5 · refusals ───────────────────────────────────────────────────────────
console.log("\n§5 · refusals");
{
  ok("5.1 · a fractional sale", throws(() => run(0, 1_000.5, 1)));
  ok("5.2 · a negative carry", throws(() => run(-1, 0, 1)));
  ok("5.3 · a fractional k", throws(() => run(0, 0, 1.5)));
  ok("5.4 · a fee rate of 100%", throws(() => settleArithmetic({ rolloverIn: 0, sales: 0, winners: 1, floor: 1_000_000, feeRate: 1, rates: RATES })));
  ok("5.5 · a fractional guarantee figure", throws(() => guaranteeRequirement([{ floor: 1_000_000.5, confirmedCarryIn: null }])));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI MONEY: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
// MASWALI-BUILD S7-F7 4 (2026-10-19): 1 → 410, what the green run PRINTED (on 1b8744e8 and with the fix alike): a case
// that stops running fails the floor. It only rises, to a printed number.
const MIN_ASSERTIONS = 410;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
