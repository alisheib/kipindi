/**
 * FINANCE — SELECTED WINDOW. The workbook for the window the officer is actually looking at.
 *
 * 🔴 WHY IT EXISTS. `/admin/finance` carries a full date+time picker and, right beside it, an
 * export button that built `gbt-monthly` — a STATUTORY pack fixed to the previous complete
 * calendar month. Choose "today", press Excel, receive last month. The figures were never
 * wrong; they were never the ones on screen. That is the owner's "wrong ranges of data", and
 * it is the one defect on that page no suite could have caught, because both halves were
 * behaving exactly as written.
 *
 * ⭐ IT MAKES THE SAME READS THE PAGE MAKES. `moneyForWindow` is the canonical primitive that
 * `grossGamingRevenue` / `netGamingRevenue` already delegate to, so this workbook and the
 * console tiles CANNOT disagree — not "should not", cannot. Nothing here re-derives money.
 *
 * ⛔ CLASSIFICATION "Internal", AND NO SIGNATURE BLOCK. This is an operating export, not a
 * regulator hand-off. An attestation panel would invite it to be filed as one, and it is bound
 * to an arbitrary window rather than a statutory period.
 * ⛔ TWO FIGURES HERE ARE ALL-TIME AND THE DOCUMENT SAYS SO ON ITS OWN FACE. A house-account
 * BALANCE is cumulative by definition; printing it inside a windowed workbook without a word
 * would be the same defect the screen had before this pass.
 * ⚠️ Per owner rulings D20/D21b, house-bot volume is INSIDE these figures, and the notes say so.
 */
import type { Report, Row, SummaryItem } from "./types";
import { moneyForWindow, dailyPnl, eatDateLabel } from "../report-money";
import { providerSummary, settlementFeesByPoll } from "../analytics";
import { houseAccountMovement, houseAccountBalances } from "../ledger";
import { formatEatLocal } from "../date-range";
import { getGlobalConfig } from "../market-config";
import { formatTzs } from "@/lib/utils";

const DAY_MS = 86_400_000;

export type FinanceWindowArg = { start: number; end: number; label?: string };

export async function buildFinanceWindow(
  generatorId: string,
  makeReference: (prefix: string, actorId: string) => string,
  win?: FinanceWindowArg,
): Promise<Report> {
  const now = Date.now();
  /* No window handed over → the page's own default, and the document states which one it used.
     A workbook whose period exists only in the URL that produced it is the same defect in a
     new place. */
  const bounds = win ?? { start: now - 7 * DAY_MS, end: now };
  const periodLabel =
    `${win?.label ?? "Last 7 days"} · ` +
    `${formatEatLocal(bounds.start)} → ${formatEatLocal(bounds.end)} EAT`;

  const m = await moneyForWindow(bounds.start, bounds.end);
  const provs = await providerSummary(bounds).catch(() => []);
  const fees = await settlementFeesByPoll(bounds).catch(() => null);
  const moved = await houseAccountMovement(bounds.start, bounds.end).catch(() => null);
  const balances = await houseAccountBalances().catch(() => ({}) as Record<string, number>);
  /* ⛔ `dailyPnl` returns `{ rows, totals }`, NOT an array — it computes its own totals, so this
     section must print THOSE rather than re-summing the rows here. Re-deriving a total beside a
     total the module already produced is how two figures on one page start disagreeing. */
  const pnl = await dailyPnl(bounds).catch(() => null);
  const cfg = await getGlobalConfig().catch(() => null);

  const levyRate = cfg ? cfg.traTaxOnCommissionRate + cfg.gbtLevyOnCommissionRate : null;
  const commissionBooked = moved ? (moved["HOUSE:COMMISSION"] ?? 0) : null;
  const n = (v: number) => v.toLocaleString("en-US");

  const summary: SummaryItem[] = [
    { label: "GGR (TZS)", value: n(m.ggr), tone: m.ggr >= 0 ? "good" : "bad" },
    { label: "NGR (TZS)", value: n(m.ngr), tone: m.ngr >= 0 ? "good" : "bad" },
    { label: "Stakes (TZS)", value: n(m.stakes) },
    { label: "Payouts (TZS)", value: n(m.payouts) },
    { label: "Deposits (TZS)", value: n(m.deposits), delta: `${n(m.depositCount)} txns` },
    { label: "Withdrawals (TZS)", value: n(m.withdrawals), delta: `${n(m.withdrawalCount)} txns` },
  ];

  const sections: Report["sections"] = [
    {
      title: "Money summary",
      titleSw: "Muhtasari wa fedha",
      description:
        "Every figure from report-money.summarise over this window — the same primitive the " +
        "console tiles read, so the two cannot disagree. CONFIRMED transactions only.",
      columns: [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", sub: "TZS", key: "value", format: "tzs", align: "right", width: 18 },
        { header: "Basis", key: "basis", width: 46 },
      ],
      rows: [
        { metric: "Stakes", value: m.stakes, basis: "BET_PLACED, confirmed" },
        { metric: "Payouts", value: m.payouts, basis: "BET_PAYOUT + CASHOUT, confirmed" },
        { metric: "Refunded stakes", value: m.refunds, basis: "BET_REFUND, confirmed" },
        { metric: "GGR", value: m.ggr, basis: "stakes − payouts − refunded stakes" },
        { metric: "Bonus cost", value: m.bonusCost, basis: "BONUS_CREDIT, confirmed" },
        { metric: "Agent commission", value: m.agentCommissionCost, basis: "paid, net of clawbacks" },
        { metric: "Payment fees", value: m.fees, basis: "fee on DEPOSIT + WITHDRAWAL" },
        { metric: "NGR", value: m.ngr, basis: "GGR − bonus − agent commission − fees" },
        { metric: "Deposits", value: m.deposits, basis: `${n(m.depositCount)} confirmed deposits` },
        { metric: "Withdrawals", value: m.withdrawals, basis: `${n(m.withdrawalCount)} confirmed withdrawals` },
      ],
    },
    {
      title: "Mobile-money provider summary",
      titleSw: "Muhtasari wa watoa huduma",
      description: "Confirmed deposits and withdrawals per provider, bounded to this window.",
      columns: [
        { header: "Provider", key: "provider", width: 18 },
        { header: "Deposits", sub: "TZS", key: "deposits", format: "tzs", align: "right", width: 16 },
        { header: "Dep #", key: "depositCount", format: "integer", align: "right", width: 10 },
        { header: "Withdrawals", sub: "TZS", key: "withdrawals", format: "tzs", align: "right", width: 16 },
        { header: "WD #", key: "withdrawalCount", format: "integer", align: "right", width: 10 },
        { header: "Net", sub: "TZS", key: "net", format: "tzs", align: "right", width: 16 },
      ],
      rows: provs.map((p) => ({
        provider: p.provider,
        deposits: p.deposits,
        depositCount: p.depositCount,
        withdrawals: p.withdrawals,
        withdrawalCount: p.withdrawalCount,
        net: p.net,
      })),
      totals: {
        provider: "Total",
        deposits: provs.reduce((t, p) => t + p.deposits, 0),
        depositCount: provs.reduce((t, p) => t + p.depositCount, 0),
        withdrawals: provs.reduce((t, p) => t + p.withdrawals, 0),
        withdrawalCount: provs.reduce((t, p) => t + p.withdrawalCount, 0),
        net: provs.reduce((t, p) => t + p.net, 0),
      },
    },
  ];

  if (fees) {
    sections.push({
      title: "Settlement fees by poll",
      titleSw: "Ada za malipo kwa kila soko",
      description:
        "Commission per poll settled in this window, recomputed from each poll's own frozen " +
        "snapshot. VOID and one-sided polls refund in full at zero fee and are not listed.",
      columns: [
        /* ⛔ THE TOTALS LABEL SITS IN A TEXT COLUMN, DELIBERATELY. Put it in a `date` column and
           both renderers used to erase it — the defect fixed in this same commit for
           match-integrity, where the Gaming Board's totals row shipped with a blank first cell.
           This section is shaped so that cannot recur. */
        { header: "Poll", key: "title", width: 42 },
        { header: "Settled", key: "settled", width: 14 },
        { header: "Fee model", key: "model", width: 18 },
        { header: "Outcome", key: "outcome", width: 10 },
        { header: "Pool", sub: "TZS", key: "pool", format: "tzs", align: "right", width: 16 },
        { header: "Fee taken", sub: "TZS", key: "fee", format: "tzs", align: "right", width: 16 },
        { header: "Operator net", sub: "TZS", key: "net", format: "tzs", align: "right", width: 16 },
      ],
      rows: fees.rows.map((r) => ({
        title: r.title,
        settled: eatDateLabel(new Date(r.settledAt).getTime()),
        model: r.feeModel,
        outcome: r.outcome,
        pool: r.pool,
        fee: r.fee,
        net: r.operatorNet,
      })),
      totals: {
        title: "Total",
        settled: "",
        model: "",
        outcome: "",
        pool: fees.rows.reduce((t, r) => t + r.pool, 0),
        fee: fees.totalFee,
        net: fees.rows.reduce((t, r) => t + r.operatorNet, 0),
      },
    });
  }

  const houseKeys = Array.from(new Set([...Object.keys(balances), ...Object.keys(moved ?? {})])).sort();
  sections.push({
    title: "House accounts (double-entry ledger)",
    titleSw: "Akaunti za nyumba",
    description:
      "Movement is this window. BALANCE IS ALL-TIME — a cumulative ledger balance is not a " +
      "windowed figure and must not be read as one.",
    columns: [
      { header: "Account", key: "account", width: 26 },
      { header: "Movement in window", sub: "TZS", key: "movement", format: "tzs", align: "right", width: 20 },
      { header: "Balance (all time)", sub: "TZS", key: "balance", format: "tzs", align: "right", width: 20 },
    ],
    rows: houseKeys.map((k) => ({
      account: k,
      /* ⛔ `null`, not 0, when the ledger could not be read — the renderers leave that cell
         empty rather than asserting a zero movement nobody measured. */
      movement: moved ? (moved[k] ?? 0) : null,
      balance: balances[k] ?? 0,
    })),
  });

  if (pnl && pnl.rows.length) {
    sections.push({
      title: "Daily P&L",
      titleSw: "Faida na hasara kila siku",
      description:
        "Per EAT calendar day inside this window. The totals row is the module's own, not a " +
        "re-sum of the rows above it.",
      columns: [
        { header: "Day", key: "day", width: 14 },
        { header: "Stakes", sub: "TZS", key: "stakes", format: "tzs", align: "right", width: 15 },
        { header: "Payouts", sub: "TZS", key: "payouts", format: "tzs", align: "right", width: 15 },
        { header: "GGR", sub: "TZS", key: "ggr", format: "tzs", align: "right", width: 15 },
        { header: "Bonus", sub: "TZS", key: "bonus", format: "tzs", align: "right", width: 14 },
        { header: "Agent comm.", sub: "TZS", key: "agentCommission", format: "tzs", align: "right", width: 15 },
        { header: "Fees", sub: "TZS", key: "fees", format: "tzs", align: "right", width: 13 },
        { header: "NGR", sub: "TZS", key: "ngr", format: "tzs", align: "right", width: 15 },
      ],
      rows: pnl.rows.map((d) => ({
        day: eatDateLabel(d.dayMs),
        stakes: d.stakes,
        payouts: d.payouts,
        ggr: d.ggr,
        bonus: d.bonus,
        agentCommission: d.agentCommission,
        fees: d.fees,
        ngr: d.ngr,
      })),
      totals: {
        /* ⛔ "Total" in the FIRST column, which is text. In a `date` column both renderers used
           to erase it — the match-integrity defect fixed in this same commit. */
        day: "Total",
        stakes: pnl.totals.stakes,
        payouts: pnl.totals.payouts,
        ggr: pnl.totals.ggr,
        bonus: pnl.totals.bonus,
        agentCommission: pnl.totals.agentCommission,
        fees: pnl.totals.fees,
        ngr: pnl.totals.ngr,
      },
    });
  }

  const notes: string[] = [
    `Window: ${periodLabel}. All day and month boundaries are East Africa Time (UTC+3).`,
    "GGR = stakes − payouts − refunded stakes. NGR = GGR − bonus cost − agent commission − " +
      "payment fees. CONFIRMED transactions only; pending, failed, reversed and cancelled rows " +
      "contribute nothing to any figure here.",
    "House-bot activity is INCLUDED in stakes, GGR, NGR and active players, per owner rulings " +
      "D20/D21b — house stakes count as player activity with no separate memo.",
    "House-account BALANCES are cumulative to date and are NOT bounded by this window; the " +
      "movement column beside them is.",
  ];
  notes.push(
    levyRate !== null && commissionBooked !== null
      ? `Statutory levies accrue on COMMISSION, never on GGR: commission booked in this window ` +
          `${formatTzs(commissionBooked)} × ${(levyRate * 100).toFixed(0)}% (TRA + GBT).`
      : "Statutory levy accrual is omitted here: the ledger or the rate configuration could not " +
          "be read, and an unbacked tax figure is worse than none.",
  );

  return {
    title: "Finance — selected window",
    subtitle: periodLabel,
    orientation: "landscape",
    reference: makeReference("FINWIN", generatorId),
    meta: {
      generatedAt: new Date(now).toISOString(),
      generatedBy: generatorId,
      period: periodLabel,
      classification: "Internal",
    },
    summary,
    sections,
    notes,
  };
}
