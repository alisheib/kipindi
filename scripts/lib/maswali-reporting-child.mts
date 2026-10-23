/**
 * test:maswali-reporting — MASWALI-BUILD S6's ACCEPTANCE, ON BOTH STORES (MASWALI-PLAN §7b S6 "Acceptance", items 4–6).
 *
 *   npx tsx scripts/maswali-reporting.test.mts     (npm run test:maswali-reporting)
 *
 * A simulated month holding the §5 six-week trajectory (worked example A), through the product's own doors
 * (`maswali-money-world.mts`), then every report S6 teaches the jackpot model, each held to the books to the shilling:
 *   R1  the trajectory replays: R, k, F, U, paid and the jackpot after each week
 *   R2  the Government Tax Report files the month: Report 1 balanced by its three reconciling lines, Report 2 the booked
 *       fee, Polls + Up & Down + Millionea = All, and a week's fee re-priced by `chargedFee`'s week arm = the booked F
 *   R3  the ledger (Postgres): each week's booked fee is its group's COMMISSION + TRA + GBT, and the three accounts hold
 *       Report 2's lines
 *   R4  the monthly pack, after week 5 and after week 6: GGR as it always was, and its jackpot liability movement and
 *       guarantee contribution equal the jackpot and guarantee accounts' balances; and (round 2) a window opening after
 *       week 1, whose movement is the closing balance LESS the opening one (R4.8)
 *   R5  the per-game split, the finance window and the per-poll fee view (/admin/finance's commission total); round 2:
 *       the week records unreadable, a paying week's fee null, a week's record missing — each said, never a 0 (R5.7–R5.9)
 *       — and the finance window reading the weeks once (R5.10); round 3: an undated week a problem of its own window only
 *       (R5.11), the fee view's failure said (R5.12), the console's rollover trail never printing a 0 (R5.13)
 *   R6  the house book (Postgres): "Jackpot guarantee paid", the +97,800, and every week's own book closing to zero
 *   R7  the measures (OD-22, MB-46): the launch date, the tickets no bet, measure 5 judged on players without a ticket
 *       from the first public week's opening (rounds 2 and 3), the harm split from the real reads
 * ⭐ CONTROLS: a window before the trajectory carries no Millionea line anywhere, and the previous month's pack is the
 *    document it always was.
 * ⚠️ The money is stamped on the real clock (the weeks' own clocks are injected, `maswali-money-world.mts`), so the month
 *    under test is today's EAT month; R0 says so if a run ever straddles a month's end.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-reporting-session-secret-0123456789ab";

const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W: Any = await loadMaswaliWorld();
const { acct, ledger } = W;
const TR: Any = await import("../../src/lib/tax-report.ts");
const TD: Any = await import("../../src/lib/server/tax-report-data.ts");
const CAT: Any = await import("../../src/lib/server/reports/catalogue.ts");
const FW: Any = await import("../../src/lib/server/reports/finance-window.ts");
const RM: Any = await import("../../src/lib/server/report-money.ts");
const PAY: Any = await import("../../src/lib/payout.ts");
const MC: Any = await import("../../src/lib/server/market-config.ts");
const MD: Any = await import("../../src/lib/server/market-dal.ts");
const HL: Any = await import("../../src/lib/server/house-ledger.ts");
const HB: Any = await import("../../src/lib/house-book.ts");
const JMD: Any = await import("../../src/lib/server/journey-measures-dal.ts");
const HW: Any = await import("../../src/lib/server/harm-watch.ts");
const RP: Any = await import("../../src/lib/server/report-pack.ts");
const AN: Any = await import("../../src/lib/server/analytics.ts");
const { eatDayKey, eatDayStartMs }: Any = await import("../../src/lib/eat-day.ts");
const { FIRST_BET_HORIZON_MS }: Any = await import("../../src/lib/journey/measures.ts");
const WREC: Any = await import("../../src/lib/server/maswali-week-record.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const HOUR = 3_600_000, DAY = 86_400_000;
const GEN = "usr_mln_reporting";
const FUND = 2_000_000; // OD-02: the Owner pre-funds 2,000,000 before week 1
const C = (tzs: number) => tzs * 100;

/** The jackpot and guarantee as the ledger holds them: `ledgerAccountBalance` on Postgres, the mirror on memory. */
const balanceOf = async (account: string): Promise<number> =>
  (W.onPostgres ? await ledger.ledgerAccountBalance(account) : await W.balanceOf(account)) as number;
const sectionOf = (rep: Any, title: string) => (rep?.sections ?? []).find((s: Any) => s.title === title);
const valueOf = (sec: Any, metric: string, key = "metric") => sec?.rows.find((r: Any) => r[key] === metric);

// ── the players: enough for the 800-ticket week at the cap of 10 ─────────────────────────────────
const TP0 = Date.now();
const players: string[] = [];
for (let i = 0; i < 90; i++) players.push(await W.user({ balance: 100_000 }));

/** Sell a week: `winners` all-YES tickets (one per player, so each winner is its own account), then losers. */
async function sellWeek(weekId: string, total: number, winners: number): Promise<void> {
  for (const u of players.slice(0, winners)) {
    const r = await W.buy(u, weekId, [W.WIN]);
    if (!r.ok) throw new Error(`sellWeek: a winner's purchase was refused: ${r.error}`);
  }
  await W.sell(weekId, total - winners, W.LOSE, players.slice(winners));
}

await W.setup({ guarantee: FUND });
const T0 = Date.now();
const month = TR.monthKeyOf(T0);
// The three fee accounts before the trajectory (Postgres): Report 2's lines are measured as what the weeks added.
const fee0 = W.onPostgres
  ? { commission: await ledger.ledgerAccountBalance(acct.commission), tra: await ledger.ledgerAccountBalance(acct.traLevy), gbt: await ledger.ledgerAccountBalance(acct.gbtLevy) }
  : null;

// ── R1 · the trajectory ─────────────────────────────────────────────────────────────────────────
console.log("\n§R1 · the six-week trajectory of §5 worked example A, through the product's own doors");
const plan = [[300, 0], [400, 1], [500, 0], [600, 0], [700, 0], [800, 3]] as const;
const weeks: Any[] = [];
let ahead = 2;
let midPack: Any = null, midJackpot = Number.NaN, midGuarantee = Number.NaN;
// ⭐ Round 2 — the instants just after weeks 1 and 2 settled, and what the jackpot held after week 1 (R4.8, R5.7–R5.8).
let TW1 = Number.NaN, TW2 = Number.NaN, jackpotW1 = Number.NaN;
for (const [i, [n, k]] of plan.entries()) {
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  await sellWeek(week.id, n, k);
  const r = await W.release(week.id, await W.closeAndSeal(week, start));
  if (!r.ok) { ok(`R1.x · week ${i + 1} of the trajectory settles`, false, String(r.error)); break; }
  weeks.push(r.week);
  if (i === 0) { TW1 = Date.parse(r.week.settledAt) + 1; jackpotW1 = await balanceOf(acct.maswaliJackpot); }
  if (i === 1) TW2 = Date.parse(r.week.settledAt) + 1;
  if (i === 4) {
    // ⭐ After week 5 the jackpot holds 1,800,000 for the next week's players: the pack's movement must say so.
    midPack = await CAT.buildGbtMonthly(GEN, month);
    midJackpot = await balanceOf(acct.maswaliJackpot);
    midGuarantee = await balanceOf(acct.maswaliGuarantee);
  }
}
const T1 = Date.now() + 60_000;
const got = weeks.map((w) => ({ R: w.rolloverIn, k: w.winningTickets, F: w.fee, U: w.topUp, paid: w.paidTotal, carry: w.carryOut }));
ok("R1.1 · ⭐ the trajectory replays to the shilling (R, k, F, U, paid, carried)", J(got) === J([
  { R: 0, k: 0, F: 0, U: 0, paid: 0, carry: 300_000 },
  { R: 300_000, k: 1, F: 130_000, U: 300_000, paid: 870_000, carry: 0 },
  { R: 0, k: 0, F: 0, U: 0, paid: 0, carry: 500_000 },
  { R: 500_000, k: 0, F: 0, U: 0, paid: 0, carry: 600_000 },
  { R: 1_100_000, k: 0, F: 0, U: 0, paid: 0, carry: 700_000 },
  { R: 1_800_000, k: 3, F: 338_000, U: 0, paid: 2_262_000, carry: 0 },
]), J(got));
ok("R0 · the run sits inside one East Africa month, so the month under test holds every shilling of it",
  TR.monthKeyOf(T1) === month && TR.monthKeyOf(TP0) === month, `${TR.monthKeyOf(TP0)} · ${month} · ${TR.monthKeyOf(T1)}`);
const jackpotEnd = await balanceOf(acct.maswaliJackpot);
const guaranteeEnd = await balanceOf(acct.maswaliGuarantee);
ok("R1.2 · the jackpot is empty again and the guarantee gave its 300,000", jackpotEnd === 0 && FUND - guaranteeEnd === 300_000, `${jackpotEnd} · ${guaranteeEnd}`);

// ── R2 · the Government Tax Report, the month ───────────────────────────────────────────────────
console.log("\n§R2 · the Government Tax Report files the month (OD-08, MB-65)");
const P = TR.monthPeriod(month);
const taxNow = P.endMs + TR.LOCK_GRACE_MS; // the month as Finance files it: closed, and past its grace
const mv = await TD.buildTaxReportData({ period: P, product: "MASWALI", nowMs: taxNow });
const r1 = mv.ok ? mv.data.main.report1 : null;
ok("R2.1 · ⭐ Report 1 for Millionea: Sales 3,300,000 · Payout 3,132,000 · fee kept 468,000 · Jackpot brought forward 2,100,000 · House floor top-up 300,000 · Carried to the jackpot 2,100,000",
  !!r1 && r1.salesCents === C(3_300_000) && r1.payoutCents === C(3_132_000) && r1.refundsCents === 0 && r1.feeKeptCents === C(468_000)
    && r1.onHoldCents === 0 && r1.broughtForwardCents === 0 && r1.jackpotBroughtForwardCents === C(2_100_000)
    && r1.floorTopUpCents === C(300_000) && r1.carriedToJackpotCents === C(2_100_000), J(mv.ok ? r1 : mv));
ok("R2.2 · ⭐ …and balanced to the cent by its three reconciling lines: no week jams the book", mv.ok && mv.data.main.reconciliation.balanced && mv.data.main.reconciliation.differenceCents === 0,
  J(mv.ok && mv.data.main.reconciliation));
const t2 = mv.ok ? mv.data.main.tax : null;
ok("R2.3 · ⭐ Report 2 files the booked fee, 13% of J: Commission 468,000 · TRA 46,800 · GBT 23,400 · Total 70,200 — never 13% × Payout (407,160)",
  !!t2 && t2.commission === 468_000 && t2.tra === 46_800 && t2.gbt === 23_400 && t2.total === 70_200
    && t2.jackpot?.bookedFee === 468_000 && t2.jackpot?.weeks === 2 && t2.jackpot?.jackpotCents === C(3_600_000), J(t2));
const all = await TD.buildTaxReportData({ period: P, product: "ALL", nowMs: taxNow });
const parts = all.ok ? (all.data.byProduct ?? []) : [];
const LINES = ["salesCents", "payoutCents", "onHoldCents", "refundsCents", "feeKeptCents", "broughtForwardCents", "jackpotBroughtForwardCents", "floorTopUpCents", "carriedToJackpotCents"];
const sums = LINES.map((k) => [k, parts.reduce((t: number, p: Any) => t + (p.report1[k] || 0), 0), all.ok ? (all.data.main.report1[k] || 0) : null]);
ok("R2.4 · ⭐ Polls + Up & Down + Millionea = All, on every Report 1 line, and All balances",
  all.ok && J(parts.map((p: Any) => p.product)) === J(["MARKET", "UPDOWN", "MASWALI"]) && sums.every(([, s, a]) => s === a) && all.data.main.reconciliation.balanced, J(sums));
ok("R2.5 · All products' Report 2: the Polls and Up & Down commission (none this month) + the booked 468,000",
  all.ok && all.data.main.tax.commission === 468_000 && all.data.main.tax.tra === 46_800 && all.data.main.tax.gbt === 23_400, J(all.ok && all.data.main.tax));
const polls = await TD.buildTaxReportData({ period: P, product: "MARKET", nowMs: taxNow });
ok("R2.6 · CONTROL · the Polls view of the same month carries none of Millionea's lines and files nothing",
  polls.ok && polls.data.main.report1.salesCents === 0 && polls.data.main.report1.jackpotBroughtForwardCents === undefined
    && polls.data.main.tax.commission === 0 && polls.data.main.tax.jackpot === undefined && polls.data.main.reconciliation.balanced, J(polls.ok && polls.data.main.report1));
const paying = weeks.filter((w) => (w.winningTickets ?? 0) > 0);
const books = await MD.marketStore.bookByIds(paying.map((w) => w.marketId));
const repriced = paying.map((w) => {
  const b = books.get(w.marketId);
  return { booked: w.fee, again: b ? PAY.chargedFee({ yesPool: b.yesPool, noPool: b.noPool, productLine: "MASWALI", week: { state: "SETTLED", jackpot: w.jackpot, winningTickets: w.winningTickets } }, MC.snapshotOrLegacy(b.feeSnapshot)).fee : null };
});
ok("R2.7 · ⭐ chargedFee learns jackpot-payout: each paying week re-priced from its own frozen rate is exactly the fee it booked",
  repriced.length === 2 && repriced.every((x) => x.again === x.booked) && J(repriced.map((x) => x.booked)) === J([130_000, 338_000]), J(repriced));

// ── R3 · the ledger, to the shilling (Postgres) ─────────────────────────────────────────────────
if (W.onPostgres) {
  console.log("\n§R3 · the ledger: each week's booked fee is its own group's lines");
  const groups = await Promise.all(paying.map(async (w) => ({
    fee: w.fee,
    commission: await ledger.ledgerGroupAccountSum(w.settlementGroupId, acct.commission),
    tra: await ledger.ledgerGroupAccountSum(w.settlementGroupId, acct.traLevy),
    gbt: await ledger.ledgerGroupAccountSum(w.settlementGroupId, acct.gbtLevy),
  })));
  ok("R3.1 · ⭐ every paying week's fee = its settlement group's net COMMISSION + TRA + GBT, to the shilling",
    groups.length === 2 && groups.every((g) => g.commission !== null && g.commission + g.tra + g.gbt === g.fee), J(groups));
  const bal = {
    commission: (await ledger.ledgerAccountBalance(acct.commission)) - (fee0?.commission ?? 0),
    tra: (await ledger.ledgerAccountBalance(acct.traLevy)) - (fee0?.tra ?? 0),
    gbt: (await ledger.ledgerAccountBalance(acct.gbtLevy)) - (fee0?.gbt ?? 0),
  };
  ok("R3.2 · ⭐ the accounts moved by Report 2's lines: COMMISSION +397,800, TRA +46,800, GBT +23,400 — together the filed 468,000",
    bal.commission === 397_800 && bal.tra === 46_800 && bal.gbt === 23_400 && !!t2 && bal.commission + bal.tra + bal.gbt === t2.commission && bal.tra === t2.tra && bal.gbt === t2.gbt, J(bal));
}

// ── R4 · the monthly pack ───────────────────────────────────────────────────────────────────────
console.log("\n§R4 · the monthly pack: GGR unchanged, with the jackpot liability and the guarantee beside it (MB-66)");
{
  const agg = sectionOf(midPack, "Aggregate financials");
  const v = (m: string) => valueOf(agg, m)?.value;
  ok("R4.1 · ⭐ after week 5: GGR 1,630,000 as it always was; the jackpot liability moved 1,800,000 — exactly what the jackpot account holds",
    v("Gross gaming revenue (GGR)") === 1_630_000 && v("Millionea jackpot liability movement") === 1_800_000 && midJackpot === 1_800_000,
    J({ ggr: v("Gross gaming revenue (GGR)"), movement: v("Millionea jackpot liability movement"), jackpot: midJackpot }));
  ok("R4.2 · ⭐ …the guarantee contribution 300,000 is what left the guarantee account, and GGR excluding the movement is F − U = −170,000",
    v("Millionea house guarantee contribution") === 300_000 && FUND - midGuarantee === 300_000 && v("GGR excluding the Millionea jackpot movement") === -170_000,
    J({ g: v("Millionea house guarantee contribution"), held: midGuarantee, ex: v("GGR excluding the Millionea jackpot movement") }));
}
const pack = await CAT.buildGbtMonthly(GEN, month);
{
  const agg = sectionOf(pack, "Aggregate financials");
  const v = (m: string) => valueOf(agg, m)?.value;
  ok("R4.3 · ⭐ after week 6: GGR 168,000; the movement 0 — the jackpot account is empty — and the guarantee contribution 300,000 = what it holds less",
    v("Gross gaming revenue (GGR)") === 168_000 && v("Millionea jackpot liability movement") === jackpotEnd && jackpotEnd === 0
      && v("Millionea house guarantee contribution") === FUND - guaranteeEnd && v("GGR excluding the Millionea jackpot movement") === 468_000 - 300_000,
    J(agg?.rows));
  const mln = sectionOf(pack, "Maswali Millionea: jackpot and guarantee");
  const m = (x: string) => valueOf(mln, x)?.value;
  ok("R4.4 · the Millionea section: carried 2,100,000, claimed 2,100,000, the fee booked 468,000, Millionea's GGR 168,000 and no forfeit line",
    m("Carried to the jackpot") === 2_100_000 && m("Claimed from the jackpot") === -2_100_000 && m("Fee booked at payout") === 468_000
      && m("Millionea GGR") === 168_000 && m("Forfeited shares returned to the jackpot") === undefined, J(mln?.rows));
  const byGame = sectionOf(pack, "By game");
  const g = valueOf(byGame, TR.PRODUCT_LABEL.MASWALI, "game");
  ok("R4.5 · the product split: Millionea's stakes 3,300,000 and payouts 3,132,000; Combined GGR = the pack's GGR",
    g?.stakes === 3_300_000 && g?.payouts === 3_132_000 && g?.ggr === 168_000 && byGame?.totals?.ggr === v("Gross gaming revenue (GGR)"), J(byGame?.rows));
  ok("R4.6 · the note the ruling asks for is on the pack, and (round 2) its provenance names the week records and the position and market reads behind the Millionea lines",
    (pack.notes ?? []).some((n: string) => n.startsWith("Maswali Millionea. GGR above is the statutory figure"))
      && (pack.notes ?? []).some((n: string) => n.startsWith("Source: the Transaction, User and KYC tables") && n.includes("each week's own settlement record") && n.includes("Position and Market tables")),
    J((pack.notes ?? []).filter((n: string) => n.startsWith("Source:"))));
}
{
  const prev = await CAT.buildGbtMonthly(GEN, RP.currentPackPeriod(Date.now()));
  const agg = sectionOf(prev, "Aggregate financials");
  ok("R4.7 · CONTROL · the previous month's pack is the document it always was: four sections, four aggregate rows, no Millionea note",
    J(prev.sections.map((s: Any) => s.title)) === J(["Aggregate financials", "KYC funnel", "Responsible-gambling roster", "Mobile-money provider summary"])
      && agg?.rows.length === 4 && !(prev.notes ?? []).some((n: string) => /Millionea/.test(n)), J(prev.sections.map((s: Any) => s.title)));
}
{
  // ⭐ Round 2 — a window that OPENS after week 1. Every window above opened on an empty jackpot, where the movement and
  // the closing balance are one number; here they are not: the jackpot held 300,000 when the window opened.
  const g1 = await RM.moneyByGame(TW1, T1);
  const fw1 = await FW.buildFinanceWindow(GEN, (p: string, a: string) => `${p}-TEST-${a.slice(-4)}`, { start: TW1, end: T1, label: "After week 1" });
  const s1 = valueOf(sectionOf(fw1, "Money summary"), "Millionea jackpot liability movement")?.value;
  ok("R4.8 · ⭐ a window opening after week 1: the movement is −300,000 — the closing balance 0 less the 300,000 the jackpot held when it opened — never the closing balance",
    g1.jackpot?.movement === -300_000 && g1.jackpot?.weeks === 5 && jackpotW1 === 300_000 && jackpotEnd === 0
      && g1.jackpot.movement === jackpotEnd - jackpotW1 && s1 === -300_000,
    J({ movement: g1.jackpot?.movement, weeks: g1.jackpot?.weeks, opening: jackpotW1, closing: jackpotEnd, window: s1 }));
}

// ── R5 · the per-game split and the finance window ──────────────────────────────────────────────
console.log("\n§R5 · the per-game split and the finance window");
{
  const g = await RM.moneyByGame(T0, T1);
  ok("R5.1 · ⭐ moneyByGame: Millionea's GameMoney as any game's, and its jackpot model beside it — fee − guarantee = its GGR excluding the carry",
    g.maswali.stakes === 3_300_000 && g.maswali.payouts === 3_132_000 && g.maswali.ggr === 168_000
      && J(g.jackpot) === J({ carried: 2_100_000, claimed: 2_100_000, forfeited: 0, movement: 0, guarantee: 300_000, fee: 468_000, ggrExJackpot: 168_000, weeks: 6 }),
    J(g.jackpot));
  const before = await RM.moneyByGame(T0 - HOUR, T0);
  ok("R5.2 · CONTROL · a window before the trajectory carries no jackpot model and no Millionea money", !("jackpot" in before) && !RM.holdsMillionea(before), J(before));
  const fw = await FW.buildFinanceWindow(GEN, (p: string, a: string) => `${p}-TEST-${a.slice(-4)}`, { start: T0, end: T1, label: "The trajectory" });
  const sum = sectionOf(fw, "Money summary");
  const s = (x: string) => valueOf(sum, x)?.value;
  ok("R5.3 · the finance window: GGR 168,000, and beside it the movement 0, the guarantee 300,000 and GGR excluding the movement 168,000",
    s("GGR") === 168_000 && s("Millionea jackpot liability movement") === 0 && s("Millionea house guarantee contribution") === 300_000
      && s("GGR excluding the Millionea jackpot movement") === 168_000, J(sum?.rows));
  const wk = sectionOf(fw, "Millionea weeks settled in this window");
  ok("R5.4 · …and its weeks, each as its settlement left it: 6 weeks, sales 3,300,000, claimed 2,100,000, jackpots 3,600,000, paid 3,132,000",
    wk?.rows.length === 6 && wk.totals?.sales === 3_300_000 && wk.totals?.claimed === 2_100_000 && wk.totals?.topUp === 300_000
      && wk.totals?.jackpot === 3_600_000 && wk.totals?.fee === 468_000 && wk.totals?.paid === 3_132_000 && wk.totals?.carried === 2_100_000, J(wk?.totals));
  const fw0 = await FW.buildFinanceWindow(GEN, (p: string, a: string) => `${p}-TEST-${a.slice(-4)}`, { start: T0 - HOUR, end: T0, label: "Before" });
  ok("R5.5 · CONTROL · the finance window of an hour before: no Millionea row, section or note",
    !sectionOf(fw0, "Millionea weeks settled in this window") && !(sectionOf(fw0, "Money summary")?.rows ?? []).some((r: Any) => /Millionea/.test(String(r.metric)))
      && !(fw0.notes ?? []).some((n: string) => /Millionea/.test(n)), J(fw0.sections.map((x: Any) => x.title)));
  // ⭐ /admin/finance's "Settlement fees by poll" (and the finance window's): a paying week by its own model, so the card's
  // "Total commission this period" is every booked settlement fee, Millionea's included.
  const fees = await AN.settlementFeesByPoll({ start: T0, end: T1 });
  const weekRows = fees.rows.filter((r: Any) => r.feeModel === "jackpot-payout");
  ok("R5.6 · ⭐ the per-poll fee view prices each paying week by the jackpot-payout model: 130,000 and 338,000, the total 468,000",
    weekRows.length === 2 && J(weekRows.map((r: Any) => r.fee).sort((a: number, b: number) => a - b)) === J([130_000, 338_000])
      && weekRows.every((r: Any) => r.outcome === "JACKPOT") && fees.byModel["jackpot-payout"].fee === 468_000 && fees.totalFee === 468_000, J(fees.byModel));
  const fees0 = await AN.settlementFeesByPoll({ start: T0 - HOUR, end: T0 });
  ok("R5.6b · CONTROL · an hour before the trajectory the fee view holds no week and no jackpot-payout fee",
    fees0.rows.length === 0 && fees0.byModel["jackpot-payout"].count === 0, J(fees0.byModel));

  /* ⭐ Round 2 — the week records failing in each way a reader can meet them. The store's own methods are swapped for the
     length of one read and put back in `finally` (both stores: the readers hold the same `weekStore` object). */
  const name = (p: string, a: string) => `${p}-TEST-${a.slice(-4)}`;
  const listReal = W.dal.weekStore.list, byMarketReal = W.dal.weekStore.getByMarketId;
  // R5.7 · the records unreadable, over the window that holds exactly week 2 (Millionea money, a paying week).
  W.dal.weekStore.list = async () => { throw new Error("planted: the week records cannot be read"); };
  let gU: Any = null, fwU: Any = null, packU = "";
  try {
    gU = await RM.moneyByGame(TW1, TW2);
    fwU = await FW.buildFinanceWindow(GEN, name, { start: TW1, end: TW2, label: "Week 2, its records unread" }).catch((e: Error) => ({ threw: String(e?.message ?? e) }));
    packU = await CAT.buildGbtMonthly(GEN, month).then(() => "built", (e: Error) => String(e?.message ?? e));
  } finally { W.dal.weekStore.list = listReal; }
  const sumU = sectionOf(fwU, "Money summary");
  ok("R5.7 · ⭐ the week records unreadable over the window holding week 2: none of the three Millionea lines — never a 0 nobody read — no weeks section, and the note says why",
    gU?.jackpotUnread === true && !("jackpot" in gU) && gU.maswali.stakes === 400_000 && !!sumU
      && !(sumU.rows ?? []).some((r: Any) => /Millionea/.test(String(r.metric))) && !sectionOf(fwU, "Millionea weeks settled in this window")
      && (fwU.notes ?? []).some((n: string) => n.startsWith("The per-game split or the Millionea weeks could not be read")),
    J({ unread: gU?.jackpotUnread, stakes: gU?.maswali?.stakes, rows: (sumU?.rows ?? []).map((r: Any) => r.metric), threw: fwU?.threw }));
  ok("R5.7b · …and the monthly pack refuses to build rather than file the month without its jackpot lines (fail-closed)",
    packU !== "built" && packU.length > 0, packU);
  // R5.8 · a paying week whose record lacks its fee: week 2's read with its fee null.
  W.dal.weekStore.list = async (o?: Any) => (await listReal.call(W.dal.weekStore, o)).map((w: Any) => (w.id === weeks[1]?.id ? { ...w, fee: null } : w));
  let gN: Any = null;
  try { gN = await RM.moneyByGame(TW1, TW2); } finally { W.dal.weekStore.list = listReal; }
  ok("R5.8 · ⭐ a settled paying week whose record lacks its fee (week 2's, planted null) leaves the weeks unread — never a fee of 0 — and is named with what it lacks",
    gN?.jackpotUnread === true && !("jackpot" in gN) && J(gN?.jackpotProblems) === J([{ weekId: weeks[1]?.id, code: weeks[1]?.code, lacks: ["fee"] }]),
    J({ unread: gN?.jackpotUnread, jackpot: gN?.jackpot ?? null, problems: gN?.jackpotProblems ?? null }));
  // R5.9 · a resulted week whose record is missing: week 6's, for the per-poll fee view.
  W.dal.weekStore.getByMarketId = async (marketId: string) => (marketId === weeks[5]?.marketId ? null : byMarketReal.call(W.dal.weekStore, marketId));
  let feesX: Any = null, fwX: Any = null;
  try {
    feesX = await AN.settlementFeesByPoll({ start: T0, end: T1 });
    fwX = await FW.buildFinanceWindow(GEN, name, { start: T0, end: T1, label: "Week 6, its record missing" });
  } finally { W.dal.weekStore.getByMarketId = byMarketReal; }
  const feeSec = sectionOf(fwX, "Settlement fees by poll");
  ok("R5.9 · ⭐ a resulted week whose record is missing (week 6's) is named as unread and the total says it is incomplete: 130,000 — never 338,000 dropped in silence",
    feesX?.unread?.length === 1 && feesX.unread[0].marketId === weeks[5]?.marketId && feesX.unread[0].lacks === null && feesX.totalFee === 130_000
      && feesX.byModel["jackpot-payout"].fee === 130_000 && feeSec?.totals?.title === "Total (incomplete)"
      && String(feeSec?.description ?? "").includes("has no settled record of its own"),
    J({ unread: feesX?.unread, total: feesX?.totalFee, title: feeSec?.totals?.title }));
  // R5.10 · the finance window reads the settled weeks ONCE.
  let lists = 0;
  W.dal.weekStore.list = async (o?: Any) => { lists++; return listReal.call(W.dal.weekStore, o); };
  let fwC: Any = null;
  try { fwC = await FW.buildFinanceWindow(GEN, name, { start: T0, end: T1, label: "The trajectory, counted" }); } finally { W.dal.weekStore.list = listReal; }
  ok("R5.10 · the finance window reads the settled weeks once: its weeks section prints the very rows its three lines were made from",
    lists === 1 && sectionOf(fwC, "Millionea weeks settled in this window")?.rows.length === 6, `${lists} reads`);

  /* ⭐ Round 3 · R5.11 — a settled week whose record lost its settlement instant (week 2's, planted null) is a problem of
     its own, placed by the instant its settlement stamped on its market: the window that holds it names it; every other
     window, and every other month's pack, reads as it always did (before, it made every window unread). */
  W.dal.weekStore.list = async (o?: Any) => (await listReal.call(W.dal.weekStore, o)).map((w: Any) => (w.id === weeks[1]?.id ? { ...w, settledAt: null } : w));
  let gOut: Any = null, gIn: Any = null, fwIn: Any = null, prevU: Any = null, packIn = "";
  try {
    gOut = await RM.moneyByGame(TW2, T1);
    gIn = await RM.moneyByGame(TW1, TW2);
    fwIn = await FW.buildFinanceWindow(GEN, name, { start: TW1, end: TW2, label: "Week 2, its settlement instant lost" });
    prevU = await CAT.buildGbtMonthly(GEN, RP.currentPackPeriod(Date.now())).catch((e: Error) => ({ threw: String(e?.message ?? e) }));
    packIn = await CAT.buildGbtMonthly(GEN, month).then(() => "built", (e: Error) => String(e?.message ?? e));
  } finally { W.dal.weekStore.list = listReal; }
  ok("R5.11 · ⭐ R3 · a window that does not hold the undated week reads normally: weeks 3–6, their jackpot lines, nothing unread",
    gOut?.jackpot?.weeks === 4 && !gOut?.jackpotUnread && !gOut?.jackpotProblems, J({ weeks: gOut?.jackpot?.weeks, unread: gOut?.jackpotUnread, problems: gOut?.jackpotProblems }));
  ok("R5.11b · ⭐ R3 · …the window that holds it (placed by its market's settlement stamp) names it as its own problem, and its note says so",
    gIn?.jackpotUnread === true && J(gIn?.jackpotProblems) === J([{ weekId: weeks[1]?.id, code: weeks[1]?.code, lacks: ["settledAt"] }])
      && (fwIn?.notes ?? []).some((n: string) => n.startsWith(`Millionea week ${weeks[1]?.code}'s settlement record lacks its time settled:`)),
    J({ problems: gIn?.jackpotProblems, notes: (fwIn?.notes ?? []).filter((n: string) => /Millionea week/.test(n)) }));
  ok("R5.11c · ⭐ R3 · …and the monthly pack: the month that holds it refuses, naming it; the month before builds as the document it always was",
    packIn.startsWith(`Millionea week ${weeks[1]?.code}'s settlement record lacks its time settled:`) && !prevU?.threw && (prevU?.sections ?? []).length === 4,
    J({ packIn, prev: prevU?.threw ?? (prevU?.sections ?? []).map((s: Any) => s.title) }));

  /* ⭐ Round 3 · R5.12 — the per-poll fee view unreadable (its market read failing) is said, never "no fee". */
  const boardReal = MD.marketStore.listBoard;
  MD.marketStore.listBoard = async () => { throw new Error("planted: the markets cannot be read"); };
  let feesU = "", fwF: Any = null;
  try {
    feesU = await AN.settlementFeesByPoll({ start: T0, end: T1 }).then(() => "read", (e: Error) => String(e?.message ?? e));
    fwF = await FW.buildFinanceWindow(GEN, name, { start: T0, end: T1, label: "The fee view unread" }).catch((e: Error) => ({ threw: String(e?.message ?? e) }));
  } finally { MD.marketStore.listBoard = boardReal; }
  ok("R5.12 · ⭐ R3 · the fee view's market read failing throws (never 'no polls settled'), and the finance window omits its section with a note that says it could not be read",
    feesU !== "read" && !fwF?.threw && !sectionOf(fwF, "Settlement fees by poll")
      && (fwF?.notes ?? []).includes("The settlement fees by poll could not be read, so their section is omitted: it is not zero."),
    J({ feesU, threw: fwF?.threw, notes: (fwF?.notes ?? []).filter((n: string) => /settlement fees/i.test(n)) }));
  const { readFileSync } = await import("node:fs");
  const financePage = readFileSync("src/app/admin/finance/page.tsx", "utf8");
  const iNull = financePage.indexOf("{pollFees === null ? (");
  const iSaid = financePage.indexOf("The settlement fees could not be read", iNull);
  const iNone = financePage.indexOf("No polls settled with a fee in this period");
  ok("R5.12b · …and /admin/finance's fee card says it could not be read before it can say 'No polls settled' (its source, in that order)",
    iNull > 0 && iSaid > iNull && iNone > iSaid, `${iNull} · ${iSaid} · ${iNone}`);

  /* ⭐ Round 3 · R5.13 — the console's rollover trail: a figure the record lacks is null and named, never 0. */
  const CON: Any = await import("../../src/lib/server/maswali-console.ts");
  const tWhole = (await CON.poolsView()).trail;
  W.dal.weekStore.list = async (o?: Any) => (await listReal.call(W.dal.weekStore, o)).map((w: Any) => (w.id === weeks[1]?.id ? { ...w, fee: null } : w));
  let tGap: Any[] = [];
  try { tGap = (await CON.poolsView()).trail; } finally { W.dal.weekStore.list = listReal; }
  const r2Gap = tGap.find((t: Any) => t.code === weeks[1]?.code), r2Whole = tWhole.find((t: Any) => t.code === weeks[1]?.code);
  ok("R5.13 · ⭐ R3 · the console's rollover trail: week 2's missing fee is null and named — never 0 — and every other week keeps its figures",
    r2Gap?.fee === null && J(r2Gap?.lacks) === J(["fee"]) && r2Gap?.paid === 870_000
      && tGap.filter((t: Any) => t.code !== weeks[1]?.code).every((t: Any) => t.lacks.length === 0 && t.fee !== null), J(r2Gap));
  ok("R5.13b · CONTROL · read whole, the trail holds all six weeks with every figure and nothing lacking (week 2: fee 130,000, levy on its own top-up 5,850)",
    tWhole.length === 6 && tWhole.every((t: Any) => t.lacks.length === 0) && r2Whole?.fee === 130_000 && r2Whole?.levyOnOwnTopUp === 5_850, J(r2Whole));

  /* ⭐ Round 5 · R5.14 — each reader asks only for the columns it reads: week 2's booked levies read null. The fee view
     (it prices a week from its winners and its jackpot) and the jackpot lines (they never read the levies) read it whole;
     the console's trail, which prints the levy on the house's own top-up, says what the record lacks. */
  const levyNull = (w: Any) => (w && w.id === weeks[1]?.id ? { ...w, traLevy: null, gbtLevy: null } : w);
  W.dal.weekStore.list = async (o?: Any) => (await listReal.call(W.dal.weekStore, o)).map(levyNull);
  W.dal.weekStore.getByMarketId = async (marketId: string) => levyNull(await byMarketReal.call(W.dal.weekStore, marketId));
  let feesL: Any = null, gL: Any = null, tL: Any[] = [];
  try {
    feesL = await AN.settlementFeesByPoll({ start: T0, end: T1 });
    gL = await RM.moneyByGame(TW1, TW2);
    tL = (await CON.poolsView()).trail;
  } finally { W.dal.weekStore.list = listReal; W.dal.weekStore.getByMarketId = byMarketReal; }
  const r2L = tL.find((t: Any) => t.code === weeks[1]?.code);
  ok("R5.14 · ⭐ R5 · a week whose booked levies read null still reads where they are never read: the fee view prices it (468,000 in all, nothing unread) and the jackpot lines of the window holding it stand",
    feesL?.totalFee === 468_000 && !feesL?.unread && gL?.jackpot?.weeks === 1 && !gL?.jackpotUnread && !gL?.jackpotProblems,
    J({ total: feesL?.totalFee, unread: feesL?.unread ?? null, weeks: gL?.jackpot?.weeks, problems: gL?.jackpotProblems ?? null }));
  ok("R5.14b · CONTROL · …while the reader that does read them says so: the trail's levy on week 2's own top-up is null, its record named as lacking its TRA levy and its GBT levy",
    r2L?.levyOnOwnTopUp === null && J(r2L?.lacks) === J(["traLevy", "gbtLevy"]) && WREC.lacksText(r2L?.lacks ?? []) === "its TRA levy and its GBT levy", J(r2L));

  /* ⭐ Round 5 · R5.15 — an open week's money with nothing guessed (`openWeekMoney`, what the Pools page's open weeks print). */
  const om = CON.openWeekMoney;
  const whole = om({ liveTickets: 120, ticketPriceTzs: 1_000, floorTzs: 1_000_000, jackpot: 300_000 });
  const noRules = om({ liveTickets: 120, ticketPriceTzs: null, floorTzs: null, jackpot: 300_000 });
  const noJackpot = om({ liveTickets: 120, ticketPriceTzs: 1_000, floorTzs: 1_000_000, jackpot: null });
  ok("R5.15 · ⭐ R5 · an open week's money is never guessed: no frozen rules on record gives no sales and no worst top-up; no jackpot reading gives no worst top-up, its sales standing; read whole, 120 × 1,000 and 1,000,000 − 300,000 − 120,000",
    J(noRules) === J({ sales: null, worstTopUp: null }) && J(noJackpot) === J({ sales: 120_000, worstTopUp: null }) && J(whole) === J({ sales: 120_000, worstTopUp: 580_000 }),
    J({ whole, noRules, noJackpot }));
  const poolsPage = readFileSync("src/app/admin/maswali/pools/page.tsx", "utf8");
  ok("R5.15b · …and the Pools page prints each missing figure as what it is (its source): an open week's sales and worst top-up, and a settlement time the record lacks, said — never 0, never a dash",
    poolsPage.includes("{money(w.sales)}") && poolsPage.includes("{money(w.worstTopUp)}")
      && poolsPage.includes("t.settledAt === null ? CANNOT_BE_READ : fmtEat(t.settledAt)") && poolsPage.includes("{lacksText(t.lacks)}"));

  /* ⭐ Round 5 · R5.16 — a gap is said in words, never a column's name: one table, every reader. */
  const words = Object.values(WREC.SETTLEMENT_FIELD_WORDS) as string[];
  ok("R5.16 · ⭐ R5 · one table says every settlement column in words — none prints a column name — and a list reads as English: its sales at close, its total paid and its TRA levy",
    words.length === 11 && words.every((w) => !/[a-z][A-Z]/.test(w)) && WREC.lacksText(["salesAtClose", "paidTotal", "traLevy"]) === "its sales at close, its total paid and its TRA levy"
      && WREC.lacksText(["fee"]) === "its fee", J(words));

  /* ⭐ Round 6 · R5.17 (LOW 3) — a paying week whose record lacks its jackpot (week 2's, planted null): the fee view names it
     WITH its gap, and the finance window and /admin/finance say what it lacks — never "could not be read from its own
     record", which a week read and found lacking is not. */
  const jackpotNull = (w: Any) => (w && w.id === weeks[1]?.id ? { ...w, jackpot: null } : w);
  W.dal.weekStore.getByMarketId = async (marketId: string) => jackpotNull(await byMarketReal.call(W.dal.weekStore, marketId));
  let feesJ: Any = null, fwJ: Any = null;
  try {
    feesJ = await AN.settlementFeesByPoll({ start: T0, end: T1 });
    fwJ = await FW.buildFinanceWindow(GEN, name, { start: T0, end: T1, label: "Week 2, its jackpot lacking" });
  } finally { W.dal.weekStore.getByMarketId = byMarketReal; }
  const feeSecJ = sectionOf(fwJ, "Settlement fees by poll");
  const saidJ: string = feesJ?.unread ? AN.unreadFeesText(feesJ.unread) : "";
  ok("R5.17 · ⭐ R6 · a paying week whose record lacks its jackpot is named with its gap: the fee view carries it (lacks: jackpot), the total is incomplete (338,000), and the finance window says it lacks its jackpot — never 'could not be read from its own record'",
    feesJ?.unread?.length === 1 && J(feesJ.unread[0].lacks) === J(["jackpot"]) && feesJ.totalFee === 338_000 && saidJ.endsWith("'s settlement record lacks its jackpot")
      && String(feeSecJ?.description ?? "").includes(saidJ) && !String(feeSecJ?.description ?? "").includes("could not be read from its own record"),
    J({ unread: feesJ?.unread, said: saidJ, description: feeSecJ?.description }));
  ok("R5.17b · …and /admin/finance prints those words in both of its notes (`unreadFeesText`), and no longer says a fee 'could not be read from its own record' (its source)",
    financePage.split("{unreadFeesText(pollFees.unread)}").length === 3 && !/be read from its own record/.test(financePage));

  /* ⭐ Round 6 · R5.18 (LOW 4) — a gap is said in the Pools trail's own header words. */
  // S6-INT · S5's Pools page heads its tables with sortable headers (`<SortTh label="…" prefix="t" />`) beside plain `<th>`s:
  // each table is found by its own pager's prefix (t: the trail, o: the open weeks) and read in both forms.
  const headBlock = (prefix: string) => [...poolsPage.matchAll(/<thead><tr>[\s\S]*?<\/tr><\/thead>/g)].map((m) => m[0]).find((b) => b.includes(`prefix="${prefix}"`)) ?? "";
  const headsOf = (block: string) => [...block.matchAll(/<th[^>]*>([^<]+)<\/th>|\blabel="([^"]+)"/g)].map((m) => (m[1] ?? m[2]).toLowerCase());
  const trailHead = headBlock("t");
  const headers = headsOf(trailHead);
  const W6 = WREC.SETTLEMENT_FIELD_WORDS;
  // ⭐ Round 7 — and every other surface those words serve heads its columns the same way: the finance window's weeks
  // table and the Pools page's open weeks.
  const fwHeads = (sectionOf(fw, "Millionea weeks settled in this window")?.columns ?? []).map((c: Any) => String(c.header).toLowerCase());
  const openHead = headBlock("o");
  const openHeads = headsOf(openHead);
  ok("R5.18 · ⭐ R6/R7 · one header vocabulary: a gap is said in the trail's own words ('Settled', 'Winners', 'Carry in', 'Carried on' are its time settled, its count of winners, its carry in and its amount carried on), and the finance window's weeks table and the Pools page's open weeks head their columns in the same words",
    headers.includes("settled") && headers.includes("winners") && headers.includes("carry in") && headers.includes("carried on")
      && W6.settledAt.includes("settled") && W6.winningTickets.includes("winners") && W6.rolloverIn.includes("carry in") && W6.carryOut.includes("carried on")
      && ["settled", "winners", "carry in", "top-up", "paid", "carried on"].every((h) => fwHeads.includes(h))
      && !fwHeads.some((h: string) => /winning tickets|carry claimed|paid to winners|carried to the jackpot|floor top-up/.test(h))
      && openHeads.includes("carry in") && !openHeads.includes("carry claimed"),
    J({ headers, fwHeads, openHeads, words: [W6.settledAt, W6.winningTickets, W6.rolloverIn, W6.carryOut] }));

  /* ⭐ Round 6 · R5.19 (LOW 5) — one word for a missing figure on the Pools page, its KPIs included (the lead's ruling). */
  ok("R5.19 · ⭐ R6/R7 · the Pools page says one word for every missing figure, its KPIs, licence basis and rollout included — 'Cannot be read' — and never 'unreadable' in any case, nor 'Not on record' (its source)",
    poolsPage.includes(`const CANNOT_BE_READ = "Cannot be read";`) && poolsPage.includes("v === null ? CANNOT_BE_READ : formatTzs(v)")
      && poolsPage.includes("{t.winners ?? CANNOT_BE_READ}") && poolsPage.includes("{standing?.rollout ?? CANNOT_BE_READ}")
      && !/unreadable/i.test(poolsPage) && !poolsPage.includes(`"Not on record"`) && !/\brecorded\(/.test(poolsPage));

  /* ⭐ Round 6 · R5.20 (LOW 8) — a held share or a winner whose payout the record lacks is "Not on record", never 0 TZS. */
  const listForWeekReal = W.dal.ticketStore.listForWeek;
  W.dal.ticketStore.listForWeek = async (cycleId: string, o?: Any) => (await listForWeekReal.call(W.dal.ticketStore, cycleId, o))
    .map((t: Any) => (cycleId === weeks[1]?.id && t.won ? { ...t, payout: null, frozenReason: t.frozenReason ?? "held · planted for the case" } : t));
  let ivGap: Any = null;
  try { ivGap = await CON.integrityView(); } finally { W.dal.ticketStore.listForWeek = listForWeekReal; }
  const ivWhole: Any = await CON.integrityView();
  const heldW2 = (ivGap?.held ?? []).filter((h: Any) => h.weekCode === weeks[1]?.code);
  const winW2 = (ivGap?.winners ?? []).filter((x: Any) => x.weekCode === weeks[1]?.code);
  const winW6 = (ivWhole?.winners ?? []).filter((x: Any) => x.weekCode === weeks[5]?.code);
  ok("R5.20 · ⭐ R6 · a held share and a winner whose payout the record lacks read null — never 0 TZS — while week 6's three winners keep their 754,000 each",
    heldW2.length === 1 && heldW2[0].payout === null && winW2.length === 1 && winW2[0].payout === null
      && winW6.length === 3 && winW6.every((x: Any) => x.payout === 754_000),
    J({ held: heldW2.map((h: Any) => h.payout), w2: winW2.map((x: Any) => x.payout), w6: winW6.map((x: Any) => x.payout) }));
  const integrityPage = readFileSync("src/app/admin/maswali/integrity/page.tsx", "utf8");
  ok("R5.20b · …and the integrity page says 'Not on record' for each, never formatting a missing share (its source)",
    integrityPage.includes(`{h.payout === null ? "Not on record" : formatTzs(h.payout)}`) && integrityPage.includes(`{w.payout === null ? "Not on record" : formatTzs(w.payout)}`));
}

// ── R6 · the house book (Postgres: its readers read the ledger) ─────────────────────────────────
if (W.onPostgres) {
  console.log("\n§R6 · the house book reads a Millionea week (MB-04)");
  // ⚠️ A DAY EITHER SIDE, ON PURPOSE: these readers bind a JS Date against the naive `LedgerEntry.createdAt`, which a
  // non-UTC session (this box's scratch cluster runs Asia/Beirut) shifts by its offset — the trap `audit-reconcile.ts`
  // documents. The fresh store holds nothing else to catch, so the padded window measures the weeks' own rows.
  const H0 = new Date(T0 - DAY), H1 = new Date(T1 + DAY);
  const flow = await HL.readWaterfall(H0, H1);
  const wf = flow ? HB.waterfall(flow) : null;
  ok("R6.1 · ⭐ the waterfall's own step: Jackpot guarantee paid 300,000, and net retained the trajectory's +97,800",
    !!wf && wf.guaranteePaid === 300_000 && wf.feeEarned === 468_000 && wf.leviesOut === 70_200 && wf.netRetained === 97_800, J(wf));
  const rows = (await HL.readGameRows(H0, H1)) ?? [];
  const mine = new Set(weeks.map((w) => w.marketId));
  const theirs = rows.filter((r: Any) => mine.has(r.marketId)).map((r: Any) => HB.gameBook({ ...r, outcome: null }));
  ok("R6.2 · ⭐ every week's own book closes to exactly zero with its legs — the weekly false alarm is gone",
    theirs.length === 6 && theirs.every((g: Any) => g.closesTo === 0), J(theirs.map((g: Any) => g.closesTo)));
  ok("R6.3 · …and the weeks' net retained adds up to the waterfall's: −189,500 + 287,300 = +97,800",
    theirs.reduce((t: number, g: Any) => t + g.netRetained, 0) === 97_800 && theirs.some((g: Any) => g.netRetained === -189_500) && theirs.some((g: Any) => g.netRetained === 287_300),
    J(theirs.map((g: Any) => g.netRetained)));
}

// ── R7 · the measures (OD-22, MB-46) ────────────────────────────────────────────────────────────
console.log("\n§R7 · the S16 measures leave Millionea out, mark its launch, and count harm twice");
{
  const o = await JMD.millioneaOpenings();
  ok("R7.1 · ⭐ MB-46 · the launch date the measures view marks is the first public week's opening",
    weeks.length > 0 && o.publicAt === Date.parse(weeks[0].opensAt) && J(Object.keys(o)) === J(["publicAt"]), J({ o, first: weeks[0]?.opensAt }));
  const bets = await JMD.betsOf(players, T0, T1);
  // ⭐ OD-22 (round 5) — measures 5 and 4b leave out a unit whose player bought a ticket within the window the measure
  // reads for it. Players 0–82 bought tickets in the trajectory, minutes after joining; 83–89 none.
  const holders: Set<string> = await JMD.ticketHolders(players, T1);
  const joined = (await JMD.joinedPlayers(TP0, T1)).filter((p: Any) => players.includes(p.id));
  const marked = joined.filter((p: Any) => p.ticketInHorizon);
  ok("R7.2 · ⭐ OD-22 · not one of the trajectory's 3,300 tickets is a bet (no follow-up, no first bet for any of the 90), and R4 marks the 83 who bought a ticket within the 24 hours after joining to be left out of measure 5; the 7 who bought none stand",
    bets.length === 0 && holders.size === 83 && joined.length === 90 && joined.every((p: Any) => p.firstBetAt === null)
      && marked.length === 83 && marked.every((p: Any) => holders.has(p.id)), J({ bets: bets.length, holders: holders.size, joined: joined.length, marked: marked.length }));
  const purchases: Map<string, number[]> = await JMD.ticketPurchases(players, TP0, T1);
  ok("R7.2b · ⭐ …and the one ticket reader agrees, on the real tickets of both stores: each marked player's first purchase fell inside the horizon measure 5 reads after joining",
    marked.every((p: Any) => { const first = Math.min(...(purchases.get(p.id) ?? [])); return first >= p.joinedAt && first <= p.joinedAt + FIRST_BET_HORIZON_MS; }),
    J(marked.slice(0, 2).map((p: Any) => ({ joinedAt: p.joinedAt, first: Math.min(...(purchases.get(p.id) ?? [])) }))));
  if (weeks.length === 0) {
    ok("R7.3 · ⭐ OD-22 · the harm count from the real reads: once a week has opened, its split leaves out the ticket holder", false, "no week of the trajectory settled");
  } else {
    const lastOpen = Math.max(...weeks.map((w) => Date.parse(w.opensAt)));
    const harmNow = eatDayStartMs(eatDayKey(lastOpen + DAY)) + 4 * HOUR; // 04:00 EAT, the day after the last week opened
    const nonHolder = await W.user({ balance: 0 });
    const hs = await HW.snapshotHarmMarkers(harmNow, { candidates: async () => [players[0], nonHolder], detect: async () => [] });
    ok("R7.3 · ⭐ OD-22 · the harm count from the real reads: once a week has opened, its split leaves out the ticket holder",
      hs.wrote === "counted" && hs.scanned === 2 && J(hs.noTicket) === J({ rapidDeposit: 0, chasingLosses: 0, scanned: 1 }), J(hs));
  }
}

ok(`0.store · the cases ran on the ${STORE} store`, W.onPostgres === (STORE === "postgres"), `onPostgres ${W.onPostgres}`);
console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
