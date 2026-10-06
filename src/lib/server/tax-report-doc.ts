/**
 * GOVERNMENT TAX REPORT — the document: ONE `Report` for the PDF and the workbook, and ONE row list
 * for the CSV, both built from the same `TaxReportData` the page renders (`docs/TAX-REPORT.md` §7).
 * Nothing here computes a figure; it lays out figures `tax-report-data.ts` already computed, so the
 * screen, the PDF, the workbook and the CSV cannot disagree. The one exception is called, not written:
 * Finance's two filing lines come from the engine's `filingSummary`, so every surface prints the same two.
 *
 * ⭐ THE PLAN'S OWN SHAPE. Report 1 prints the plan's four lines first, in the plan's order, then
 * the two reconciling items, then the check. Report 2 prints the plan's five lines, with the plan's
 * "Basis / Rate" column, each rate read from the version in force — framed by Finance's two filing
 * lines (2026-10-06): Sales less refunds with its tickets first, Net commission revenue last.
 * ⛔ A PERIOD THAT IS NOT FINISHED, OR NOT BALANCED, IS NOT DRESSED AS A FILING. Its title, its
 * classification and its notes all say so first — the discipline the statutory monthly pack set
 * (`catalogue.ts` `buildGbtMonthly`): any one of them left in filing dress is enough for a
 * part-period to be filed.
 */
import type { Column, ColumnFormat, Report, Row, Section, SignatureRow, SummaryItem } from "./reports/types";
import type { DayFigures, ProductFigures, TaxReportData } from "./tax-report-data";
import type { TaxLock } from "./tax-locks";
import { CSV_BOM, CSV_EOL, csvCell } from "@/lib/contacts/csv-write";
import {
  EXCEPTION_LABEL,
  PRODUCT_LABEL,
  REFUND_REASONS,
  LOCK_GRACE_MS,
  daySlice,
  eatDateTimeLabel,
  filingSummary,
  toEatLocal,
  formatCents,
  formatWhole,
  percentLabel,
  type ProductFilter,
  type TaxSegment,
} from "@/lib/tax-report";

export const DOCUMENT_TITLE = "Government Tax Report";

/** Does any money figure in the report carry cents? Then the PDF must print them as text, exactly. */
function hasCents(d: TaxReportData): boolean {
  const figs = [d.main, ...(d.byProduct ?? [])];
  const cents = (c: number) => c % 100 !== 0;
  return figs.some((f) => Object.values(f.report1).some(cents) || cents(f.reconciliation.differenceCents) || f.refundsByReason.some((r) => cents(r.cents)))
    || d.exceptions.some((e) => cents(e.contributionCents))
    // Two days of .50 make a whole period: the days carry cents the period does not, and they print exactly too.
    || (d.byDay ?? []).some((x) => Object.values(x.report1).some(cents) || cents(x.differenceCents));
}

/** The document's state, decided once and read by the title, the classification and the notes. */
export function documentState(d: TaxReportData, lock: TaxLock | null): {
  filingGrade: boolean;
  titleSuffix: string;
  headline: string;
} {
  if (d.notStarted) return { filingGrade: false, titleSuffix: " — NOT STARTED", headline: "This period has not started; there is nothing to report yet." };
  if (d.inProgress) return { filingGrade: false, titleSuffix: " — PARTIAL (period in progress)", headline: `PERIOD IN PROGRESS. Figures cover ${d.period.label} up to ${eatDateTimeLabel(d.cutoffMs)} EAT and WILL CHANGE before it closes. Not for filing.` };
  // ⛔ A custom window is a working view, not a statutory period — the finance-window rule: Internal, no attestation,
  // and the title says so, out of balance or not.
  if (d.period.kind === "custom") {
    const off = !d.main.reconciliation.balanced;
    return {
      filingGrade: false,
      titleSuffix: off ? " — CUSTOM WINDOW, OUT OF BALANCE" : " — CUSTOM WINDOW (not a filing period)",
      headline: off
        ? `Custom window, for review — OUT OF BALANCE by TZS ${formatCents(d.main.reconciliation.differenceCents)}; the exceptions are named in the Exceptions section.`
        : "Custom window, for review. Filings are made by day, week or month.",
    };
  }
  const ack = lock?.exceptionsAcknowledged;
  if (!d.main.reconciliation.balanced) {
    return ack
      ? { filingGrade: true, titleSuffix: " — EXCEPTIONS ACKNOWLEDGED", headline: `Locked OUT OF BALANCE by TZS ${formatCents(d.main.reconciliation.differenceCents)} with the exceptions acknowledged: ${ack}` }
      : { filingGrade: false, titleSuffix: " — OUT OF BALANCE", headline: `OUT OF BALANCE by TZS ${formatCents(d.main.reconciliation.differenceCents)}. Sign-off is blocked until the exceptions named in the Exceptions section are resolved.` };
  }
  // ⛔ ONE PRODUCT CANNOT FILE AROUND THE WHOLE BOOK. A difference that belongs to no product is invisible to each
  // product alone; while the whole book is out, a single-product document is not a filing either — unless the Owner
  // locked it with the difference acknowledged, and then the document SAYS SO, with the reason, as the product's own
  // acknowledged difference does above. A filing that hides an acknowledged difference is the one thing it may not be.
  if (d.wholeBook && !d.wholeBook.balanced) {
    const whole = `the whole book (all products) is OUT OF BALANCE by TZS ${formatCents(d.wholeBook.differenceCents)}${d.unattributedRecords ? ` — ${d.unattributedRecords} money record${d.unattributedRecords === 1 ? " names" : "s name"} no bet or round` : ""}`;
    if (ack) return { filingGrade: true, titleSuffix: " — EXCEPTIONS ACKNOWLEDGED", headline: `Locked while ${whole}; this product balances on its own. Acknowledged by the Owner: ${ack}` };
    return {
      filingGrade: false,
      titleSuffix: " — WHOLE BOOK OUT OF BALANCE",
      headline: `This product balances, but ${whole}. Resolve it under All products before filing.`,
    };
  }
  // ⛔ A PERIOD THAT CLOSED MOMENTS AGO IS STILL SETTLING: a bet stamped inside it can commit up to a transaction
  // timeout later. Until the lock grace has passed (or the period is locked), the document is not filing-grade.
  if (!lock && d.period.endMs + LOCK_GRACE_MS > d.generatedAtMs) {
    return {
      filingGrade: false,
      titleSuffix: " — SETTLING (closed moments ago)",
      headline: `${d.period.label} closed moments ago and its last bets may still be settling into the books. Download the filing copy from ${eatDateTimeLabel(d.period.endMs + LOCK_GRACE_MS)} EAT.`,
    };
  }
  return { filingGrade: true, titleSuffix: "", headline: "" };
}

/** The period's kind as a word the file name and reference carry — a week and the day of its Monday share a key. */
const KIND_WORD = { month: "MONTH", week: "WEEK", day: "DAY", custom: "CUSTOM" } as const;

/** "TAX-MONTH-202609-ALL-8F3K2Q" — kind, period, product, and the generator's id tail. */
export function documentReference(d: TaxReportData, generatorId: string): string {
  const key = d.period.kind === "custom" ? d.period.key.replace(/[^0-9]+/g, "").slice(0, 24) : d.period.key.replace(/-/g, "");
  const tail = generatorId.replace(/^usr_/, "").slice(-6).toUpperCase();
  return `TAX-${KIND_WORD[d.period.kind]}-${key}-${d.product}-${tail}`;
}

/** "50pick-government-tax-report-month-2026-09-all-products.pdf" — kind, period and product are IN the name. */
export function documentFilename(d: TaxReportData, ext: "pdf" | "xlsx" | "csv"): string {
  const key = d.period.kind === "custom" ? d.period.key.replace(/[^0-9]+/g, "") : d.period.key;
  const slug = `government-tax-report-${d.period.kind}-${key}-${PRODUCT_LABEL[d.product]}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `50pick-${slug}.${ext}`;
}

/**
 * The line every surface prints for the window: "1 Sep 2026 00:00 → 1 Oct 2026 00:00 EAT". A running period ends at
 * the reader's CUT-OFF (a minute before now, `RUNNING_MARGIN_MS`), never at "now": the window printed is the window the
 * figures cover. The page's filter card builds the same words from `cutoffOf` before the books are read.
 */
export function windowStatement(d: TaxReportData): string {
  return d.inProgress
    ? `${eatDateTimeLabel(d.period.startMs)} → ${eatDateTimeLabel(d.cutoffMs)} EAT (period in progress)`
    : `${eatDateTimeLabel(d.period.startMs)} → ${eatDateTimeLabel(d.period.endMs)} EAT`;
}

const rateLine = (bp: number, of: string) => `${percentLabel(bp)} × ${of}`;

function segmentLabel(s: TaxSegment): string {
  return `${eatDateTimeLabel(s.startMs)} → ${eatDateTimeLabel(s.endMs)}`;
}

/** Report 1's rows: the plan's four lines, the two reconciling items, the check. Money in `amount`. */
export function report1Rows(f: ProductFigures): Array<{ line: string; cents: number; basis: string; kind: "line" | "item" | "check" | "difference" }> {
  const r = f.report1;
  const c = f.counts;
  const rec = f.reconciliation;
  const n = (k: number, one: string, many: string) => `${k.toLocaleString("en-US")} ${k === 1 ? one : many}`;
  return [
    { line: "Sales", cents: r.salesCents, basis: `Every stake placed in the period (${n(c.betsPlaced, "bet", "bets")})`, kind: "line" },
    // ⭐ NO WORD OF WITHDRAWALS ON THE LINE (management, 2026-10-06): "withdrawals are never included" here was read as
    // withdrawals being IN Payout. The report states once, in its notes, that deposits and withdrawals are not part of it.
    { line: "Payout", cents: r.payoutCents, basis: `Winnings paid on rounds resulted in the period (${n(c.payoutRecords, "payment", "payments")})`, kind: "line" },
    { line: "On hold", cents: r.onHoldCents, basis: `Stakes still awaiting a result at the cut-off (${n(c.betsOnHold, "bet", "bets")})`, kind: "line" },
    { line: "Refunds", cents: r.refundsCents, basis: `Returned to customers: one-sided bets, cancelled rounds, early exits (${n(c.refundRecords, "refund", "refunds")})`, kind: "line" },
    {
      line: "Platform fee kept",
      cents: r.feeKeptCents,
      basis: `Our fee on resulted rounds, at each round's own frozen rates (${n(c.roundsResulted, "round", "rounds")})`
        + (f.feeDetail.roundingCents ? `, incl. TZS ${formatCents(f.feeDetail.roundingCents)} rounding` : "")
        + (f.feeDetail.exitFeeCents ? `, plus TZS ${formatCents(f.feeDetail.exitFeeCents)} of early-exit fees` : ""),
      kind: "item",
    },
    // `|| 0` turns −0 into 0: a period with nothing brought forward must print 0, never "-0".
    { line: "Less: on hold brought forward", cents: -r.broughtForwardCents || 0, basis: `Stakes placed before the period, still awaiting a result when it opened (${n(c.betsBroughtForward, "bet", "bets")})`, kind: "item" },
    {
      line: "Check: accounted total",
      cents: rec.accountedCents,
      basis: "Payout + On hold + Refunds + Platform fee kept − on hold brought forward",
      kind: "check",
    },
    {
      line: "Difference from Sales (must be 0)",
      cents: rec.differenceCents,
      basis: rec.balanced ? "Balanced — the check equals Sales to the shilling" : "OUT OF BALANCE — the exceptions below name every shilling of it",
      kind: "difference",
    },
  ];
}

/** One Report 2 row. `line` is the whole label (the documents print it); the page prints `label` and, under it, the
 *  rate period `segment` — two timestamps that must never break across lines. `tickets` rides the Sales-less-refunds
 *  line only: the tickets behind it, which the page, the PDF and the CSV each print in their own place. */
export type Report2Row = {
  line: string;
  label: string;
  segment: { startMs: number; endMs: number } | null;
  basis: string;
  amount: number;
  cents: boolean;
  kind: "line" | "total";
  tickets?: { placed: number; refunded: number; net: number };
};

const count = (n: number) => n.toLocaleString("en-US");

/** "1,074 tickets" · "1 ticket" · "−1 ticket" — one word for every surface that prints the count. A negative count (a
 *  period that refunds more earlier tickets than it sells) signs as every figure in this report does, with U+2212. */
export function ticketsLabel(n: number): string {
  return `${formatWhole(n)} ${Math.abs(n) === 1 ? "ticket" : "tickets"}`;
}

/** "3,353 placed − 2,279 refunded" — how the count is made, from the two counts Report 1 prints. `keepTogether` joins
 *  each number to its word, and the minus to the number after it, with no-break spaces — for the page, where at 360px
 *  the line broke as "… − 5" / "refunded"; now it can break only as "3,353 placed" / "− 2,279 refunded". */
export function ticketsDetail(t: { placed: number; refunded: number }, o: { keepTogether?: boolean } = {}): string {
  const sp = o.keepTogether ? String.fromCharCode(160) : " ";
  return `${count(t.placed)}${sp}placed −${sp}${count(t.refunded)}${sp}refunded`;
}

/** The page's own line under the basis of Sales less refunds: "Tickets: 3,353 placed − 2,279 refunded". */
export function ticketsLine(t: { placed: number; refunded: number }): string {
  return `Tickets: ${ticketsDetail(t, { keepTogether: true })}`;
}

/** A Report 2 row's basis as the CSV prints it — with how its tickets are made, where it has them. Plain text: no
 *  no-break space goes into a file a spreadsheet reads. The PDF's narrow Basis column keeps the rule alone (`r.basis`)
 *  and carries the count on the line; the page prints the rule, then `ticketsLine` on a line of its own. */
export function report2BasisText(r: Report2Row): string {
  return r.tickets ? `${r.basis} · tickets: ${ticketsDetail(r.tickets)}` : r.basis;
}

/**
 * Report 2's rows: the plan's five lines, one block per rate segment, with its "Basis / Rate" column — framed by the
 * two lines of Finance's filing sheet (2026-10-06): Sales less refunds, with its tickets, first; Net commission revenue
 * last. Both are `filingSummary` of lines printed above them, so they can never disagree with the reports.
 */
export function report2Rows(f: ProductFigures): Report2Row[] {
  const t = f.tax;
  const fs = filingSummary(f);
  const rows: Report2Row[] = [{
    line: "Sales less refunds", label: "Sales less refunds", segment: null, basis: "Sales − Refunds", amount: fs.salesLessRefundsCents, cents: true, kind: "line",
    tickets: { placed: fs.ticketsPlaced, refunded: fs.ticketsRefunded, net: fs.ticketsNotRefunded },
  }];
  const multi = t.segments.length > 1;
  for (const s of t.segments) {
    const tag = multi ? ` · ${segmentLabel(s)}` : "";
    const segment = multi ? { startMs: s.startMs, endMs: s.endMs } : null;
    rows.push(
      { line: `Payout (taxable reference)${tag}`, label: "Payout (taxable reference)", segment, basis: "From Report 1", amount: s.payoutCents, cents: true, kind: "line" },
      { line: `Commission${tag}`, label: "Commission", segment, basis: rateLine(s.rates.commissionBp, "Payout"), amount: s.commission, cents: false, kind: "line" },
      { line: `TRA tax${tag}`, label: "TRA tax", segment, basis: rateLine(s.rates.traBp, "Commission"), amount: s.tra, cents: false, kind: "line" },
      { line: `GBT tax${tag}`, label: "GBT tax", segment, basis: rateLine(s.rates.gbtBp, "Commission"), amount: s.gbt, cents: false, kind: "line" },
    );
  }
  if (multi) {
    rows.push(
      { line: "Commission — all segments", label: "Commission — all segments", segment: null, basis: "Sum of the lines above", amount: t.commission, cents: false, kind: "total" },
      { line: "TRA tax — all segments", label: "TRA tax — all segments", segment: null, basis: "Sum of the lines above", amount: t.tra, cents: false, kind: "total" },
      { line: "GBT tax — all segments", label: "GBT tax — all segments", segment: null, basis: "Sum of the lines above", amount: t.gbt, cents: false, kind: "total" },
    );
  }
  rows.push(
    { line: "Total Tax payable", label: "Total Tax payable", segment: null, basis: "TRA + GBT", amount: t.total, cents: false, kind: "total" },
    { line: "Net commission revenue", label: "Net commission revenue", segment: null, basis: "Commission − Total Tax", amount: fs.netCommission, cents: false, kind: "total" },
  );
  return rows;
}

/**
 * The words under every day-by-day table — the page's, the PDF's and the workbook's — so all three explain alike.
 * The tax clause appears only when the days' own rounding makes their tax differ from Report 2's.
 */
export function dayByDayNote(days: readonly DayFigures[], f: ProductFigures): string {
  const dayTax = days.reduce((t, x) => t + x.tax.total, 0);
  return "Each day is computed exactly as that day opened on its own. The days' Sales, Payout and Refunds add up to the period's; "
    + "On hold is each day's closing balance, brought forward into the next."
    + (dayTax === f.tax.total ? "" : ` Each day's tax is rounded on that day's own Payout, so the days' tax adds to TZS ${formatWhole(dayTax)} against Report 2's TZS ${formatWhole(f.tax.total)} on the whole period's Payout.`);
}

/**
 * A day-by-day row's first cell: its day, its hours when it is part of one, "so far" while it runs — and on the printed
 * page (`print`), where no Difference column stands beside it, "out of balance" when its check does not close. The
 * amount is not printed there: a nine-digit difference does not fit the day's column (`findPdfOverflows`); the
 * workbook's Difference column, the CSV and the day's own report carry it. `withYear: false` prints "Sun 20 Sep" — one
 * line in the portrait page's narrow day column, where "Sun 20 Sep 2026" took two on every row.
 * ⭐ ON THE PRINTED PAGE EACH PART TAKES ITS OWN LINE: joined with " · ", the column's width left a "·" hanging at a
 * line's end ("Sat 26 Sep ·" / "out of" / "balance", measured 2026-10-04).
 */
export function dayRowLabel(d: TaxReportData, x: DayFigures, o: { running: boolean; print: boolean; withYear: boolean }): string {
  const s = daySlice(x.startMs, d.period.endMs);
  const parts = [o.withYear ? s.label : s.short, s.hours, o.running ? "so far" : null, o.print && !x.balanced ? "out of balance" : null].filter(Boolean);
  return parts.join(o.print ? "\n" : " · ");
}

/** Does the window sit inside one EAT calendar year? Then its period line already states the year every day shares. */
function oneYear(d: TaxReportData): boolean {
  return toEatLocal(d.period.startMs).slice(0, 4) === toEatLocal(d.period.endMs - 1).slice(0, 4);
}

/** A lock taken before daily figures were recorded holds none — the documents say so rather than print a table it never filed. */
const NO_DAYS_IN_LOCK = "This filing was locked before daily figures were recorded, so it holds no day-by-day table. Reopening and locking the period again records them.";

function productColumns(d: TaxReportData): Array<{ key: string; label: string; f: ProductFigures }> {
  if (!d.byProduct) return [];
  // All first — the answer, then its parts (the page's order, so the screen and the document read alike).
  return [{ key: "ALL", label: PRODUCT_LABEL.ALL, f: d.main }, ...d.byProduct.map((f) => ({ key: f.product, label: PRODUCT_LABEL[f.product], f }))];
}

/**
 * The PDF / workbook document. `generatorName` is the officer's display name (the route reads it);
 * `lock` is the live lock when the period is locked — then `d` IS the locked snapshot.
 */
export function buildTaxDocument(d: TaxReportData, opts: {
  generatorId: string;
  generatorName: string;
  generatedAtMs: number;
  lock: TaxLock | null;
  /** Lines where the live books have moved since the lock — printed, never hidden (`tax-report-view.ts`). */
  drift?: ReadonlyArray<{ line: string; locked: number; live: number; unit: "cents" | "tzs" }>;
  /** The workbook carries every daily figure as its own column; a portrait page carries the five that fit. Default pdf. */
  layout?: "pdf" | "xlsx";
}): Report {
  const state = documentState(d, opts.lock);
  const exact = hasCents(d);
  // ⛔ A figure with cents is printed as exact TEXT: both renderers round a "tzs" cell to whole
  // shillings, and then the printed lines would not add up to the printed Sales.
  const money = (cents: number): number | string => (exact ? formatCents(cents) : cents / 100);
  const moneyFmt: ColumnFormat = exact ? "text" : "tzs";
  const f = d.main;

  const summary: SummaryItem[] = [
    { label: "Sales (TZS)", num: f.report1.salesCents / 100, format: "tzs" },
    { label: "Payout (TZS)", num: f.report1.payoutCents / 100, format: "tzs" },
    { label: "On hold (TZS)", num: f.report1.onHoldCents / 100, format: "tzs" },
    { label: "Refunds (TZS)", num: f.report1.refundsCents / 100, format: "tzs" },
    { label: "Total tax payable (TZS)", num: f.tax.total, format: "tzs" },
    // A NUMBER, not a sentence: a text tile truncated to "Balanced…" in the PDF's 17pt card. The tone carries the verdict.
    { label: "Difference (must be 0)", num: f.reconciliation.differenceCents / 100, format: "tzs", tone: f.reconciliation.balanced ? "good" : "bad" },
  ];

  const sections: Section[] = [];
  sections.push({
    title: "Report 1 — Total Reporting System",
    description: `Every stake placed in the period and where it stood at the cut-off (${windowStatement(d)}). The first four lines are the plan's; the next two are the reconciling items that make its rule hold on live books.`,
    columns: [
      { header: "Line", key: "line", width: 40 },
      { header: "Amount", sub: "TZS", key: "amount", format: moneyFmt, align: "right", width: 28 },
      { header: "Basis", key: "basis", width: 56 },
    ],
    rows: report1Rows(f).map((r) => ({ line: r.line, amount: money(r.cents), basis: r.basis })),
  });
  sections.push({
    title: "Report 2 — Taxation",
    description: "The approved model, each line rounded to the nearest shilling at each step: Commission on Payout, then TRA and GBT on the rounded Commission. It opens with the sales filed and their tickets, and closes with the commission left after tax.",
    columns: [
      { header: "Line", key: "line", width: 40 },
      { header: "Basis / Rate", key: "basis", width: 26 },
      { header: "Amount", sub: "TZS", key: "amount", format: moneyFmt, align: "right", width: 18 },
    ],
    // The tickets ride the line's own cell ("Sales less refunds · 1,074 tickets"): the Amount column is shillings, and
    // the narrow Basis column keeps the rule. Report 1 above prints the two counts they are made of.
    rows: report2Rows(f).map((r) => ({
      line: r.tickets ? `${r.line} · ${ticketsLabel(r.tickets.net)}` : r.line,
      basis: r.basis,
      amount: r.cents ? money(r.amount) : (exact ? formatWhole(r.amount) : r.amount),
    })),
  });
  sections.push({
    title: "Refunds by reason",
    description: "Every refund carries the reason its round records and the authority that produced it. 50pick writes no manual refund.",
    columns: [
      { header: "Reason", key: "reason", width: 24 },
      { header: "Plan code", key: "code", width: 26 },
      { header: "Count", key: "count", format: "integer", align: "right", width: 16 },
      { header: "Amount", sub: "TZS", key: "amount", format: moneyFmt, align: "right", width: 28 },
      { header: "Approved by", key: "approval", width: 40 },
    ],
    rows: f.refundsByReason.map((r) => ({
      reason: REFUND_REASONS[r.code].label,
      code: REFUND_REASONS[r.code].planCode,
      count: r.count,
      amount: money(r.cents),
      approval: REFUND_REASONS[r.code].approval,
    })),
    totals: {
      reason: "Total",
      code: "",
      count: f.refundsByReason.reduce((t, r) => t + r.count, 0),
      amount: money(f.refundsByReason.reduce((t, r) => t + r.cents, 0)),
      approval: "",
    },
  });

  const cols = productColumns(d);
  if (cols.length) {
    const line = (label: string, get: (x: ProductFigures) => number, isCents = true): Row => {
      const row: Row = { line: label };
      for (const c of cols) row[c.key] = isCents ? money(get(c.f)) : (exact ? formatWhole(get(c.f)) : get(c.f));
      return row;
    };
    sections.push({
      title: "By product",
      description:
        "Polls and Up & Down side by side. Every money line adds up to All products. Each product's tax is computed on its own Payout and rounded at each step, so the products' tax can differ from All by a shilling."
        + (d.unattributedRecords ? ` ${d.unattributedRecords} money record${d.unattributedRecords === 1 ? " names no bet or round, so it appears" : "s name no bet or round, so they appear"} only under All products.` : ""),
      columns: [
        { header: "Line", key: "line", width: 34 },
        ...cols.map((c) => ({ header: c.label, sub: "TZS", key: c.key, format: moneyFmt, align: "right" as const, width: 18 })),
      ],
      rows: [
        line("Sales", (x) => x.report1.salesCents),
        line("Payout", (x) => x.report1.payoutCents),
        line("On hold", (x) => x.report1.onHoldCents),
        line("Refunds", (x) => x.report1.refundsCents),
        line("Platform fee kept", (x) => x.report1.feeKeptCents),
        // Subtracted, as Report 1 prints it — one document, one sign. `|| 0`: never "-0".
        line("Less: on hold brought forward", (x) => -x.report1.broughtForwardCents || 0),
        line("Check difference (must be 0)", (x) => x.reconciliation.differenceCents),
        line("Commission", (x) => x.tax.commission, false),
        line("TRA tax", (x) => x.tax.tra, false),
        line("GBT tax", (x) => x.tax.gbt, false),
        line("Total Tax payable", (x) => x.tax.total, false),
      ],
    });
  }

  // ── Day by day: the window's days, each its own report. After the period's composition, before its exceptions —
  // an out-of-balance day says so in its first cell, and the exceptions below name what makes it.
  if (d.byDay && d.byDay.length > 0) {
    const days = d.byDay;
    const wide = opts.layout === "xlsx";
    const taxFmt: ColumnFormat = exact ? "text" : "tzs";
    const whole = (n: number): number | string => (exact ? formatWhole(n) : n);
    const sum = (get: (x: DayFigures) => number) => days.reduce((t, x) => t + get(x), 0);
    const money5: Column[] = [
      { header: "Sales", sub: "TZS", key: "sales", format: moneyFmt, align: "right", width: wide ? 16 : 21 },
      { header: "Payout", sub: "TZS", key: "payout", format: moneyFmt, align: "right", width: wide ? 16 : 21 },
      { header: "On hold", sub: "TZS", key: "onHold", format: moneyFmt, align: "right", width: wide ? 16 : 21 },
      { header: "Refunds", sub: "TZS", key: "refunds", format: moneyFmt, align: "right", width: wide ? 16 : 21 },
    ];
    const columns: Column[] = wide
      ? [
          { header: "Day", key: "day", width: 26 },
          ...money5,
          { header: "Platform fee kept", sub: "TZS", key: "fee", format: moneyFmt, align: "right", width: 16 },
          { header: "Less: on hold brought forward", sub: "TZS", key: "bf", format: moneyFmt, align: "right", width: 18 },
          { header: "Difference (must be 0)", sub: "TZS", key: "diff", format: moneyFmt, align: "right", width: 16 },
          { header: "Commission", sub: "TZS", key: "commission", format: taxFmt, align: "right", width: 14 },
          { header: "TRA tax", sub: "TZS", key: "tra", format: taxFmt, align: "right", width: 12 },
          { header: "GBT tax", sub: "TZS", key: "gbt", format: taxFmt, align: "right", width: 12 },
          { header: "Total tax", sub: "TZS", key: "tax", format: taxFmt, align: "right", width: 12 },
          { header: "Bets placed", key: "bets", format: "integer", align: "right", width: 12 },
        ]
      : [{ header: "Day", key: "day", width: 18 }, ...money5, { header: "Total tax", sub: "TZS", key: "tax", format: taxFmt, align: "right", width: 21 }];
    sections.push({
      title: "Day by day",
      description: dayByDayNote(days, f) + (wide ? "" : " The workbook carries every daily figure — the fee kept, the stakes brought forward, the check and each tax line."),
      columns,
      rows: days.map((x, i) => ({
        day: dayRowLabel(d, x, { running: d.inProgress && i === days.length - 1, print: !wide, withYear: wide || !oneYear(d) }),
        sales: money(x.report1.salesCents),
        payout: money(x.report1.payoutCents),
        onHold: money(x.report1.onHoldCents),
        refunds: money(x.report1.refundsCents),
        ...(wide ? {
          fee: money(x.report1.feeKeptCents),
          // Subtracted, as Report 1 prints it. `|| 0`: never "-0".
          bf: money(-x.report1.broughtForwardCents || 0),
          diff: money(x.differenceCents),
          commission: whole(x.tax.commission),
          tra: whole(x.tax.tra),
          gbt: whole(x.tax.gbt),
          bets: x.counts.betsPlaced,
        } : {}),
        tax: whole(x.tax.total),
      })),
      // ⭐ A SUM ROW THAT IS A SUM — the workbook only. On hold and brought forward are balances, not flows, so they
      // are left blank rather than given a total SUM() would contradict; the tax lines are the days' own sums. A
      // portrait page has no room for a ten-digit total in bold, and Report 1 above it is the period's own figures.
      ...(wide ? {
        totals: {
          day: "Sum of the days",
          sales: money(sum((x) => x.report1.salesCents)),
          payout: money(sum((x) => x.report1.payoutCents)),
          onHold: "",
          refunds: money(sum((x) => x.report1.refundsCents)),
          fee: money(sum((x) => x.report1.feeKeptCents)),
          bf: "",
          diff: money(sum((x) => x.differenceCents)),
          commission: whole(sum((x) => x.tax.commission)),
          tra: whole(sum((x) => x.tax.tra)),
          gbt: whole(sum((x) => x.tax.gbt)),
          tax: whole(sum((x) => x.tax.total)),
          bets: sum((x) => x.counts.betsPlaced),
        },
      } : {}),
    });
  }

  if (d.exceptionCount > 0) {
    const shown = d.exceptions.length;
    sections.push({
      title: "Exceptions — the items that make the difference",
      description:
        (shown < d.exceptionCount ? `Showing the ${shown} largest of ${d.exceptionCount}. ` : "")
        + `${d.exceptionCount === 1 ? "The one exception explains" : `Together the ${d.exceptionCount} exceptions explain`} TZS ${formatCents(d.explainedCents)} of the TZS ${formatCents(f.reconciliation.differenceCents)} difference.`,
      columns: [
        { header: "Exception", key: "kind", width: 20 },
        { header: "Difference", sub: "TZS", key: "amount", format: moneyFmt, align: "right", width: 20 },
        { header: "Reference", key: "ref", width: 34 },
        { header: "What the records say", key: "note", width: 26 },
      ],
      rows: d.exceptions.map((e) => ({ kind: EXCEPTION_LABEL[e.kind], amount: money(e.contributionCents), ref: e.ref, note: e.note })),
    });
  }

  sections.push({
    title: "Rates applied",
    description: "Every rate is an admin setting with an effective date; a period is taxed at the rates in force on each of its days.",
    columns: [
      { header: "In force from", key: "from", width: 18 },
      { header: "Commission", key: "commission", width: 18 },
      { header: "TRA", key: "tra", width: 14 },
      { header: "GBT", key: "gbt", width: 14 },
      { header: "Authority", key: "note", width: 54 },
    ],
    rows: d.rateVersions.map((v) => ({
      from: v.effectiveFrom,
      commission: percentLabel(v.rates.commissionBp),
      tra: percentLabel(v.rates.traBp),
      gbt: percentLabel(v.rates.gbtBp),
      note: v.note ?? "",
    })),
  });

  const notes: string[] = [];
  if (state.headline) notes.push(state.headline);
  if (opts.lock) {
    notes.push(
      `LOCKED ${eatDateTimeLabel(opts.lock.lockedAtMs)} EAT by ${opts.lock.lockedBy} — lock ${opts.lock.id}, snapshot sha256 ${opts.lock.sha256.slice(0, 16)}…. `
      + "Every figure in this document is the locked snapshot, exactly as filed.",
    );
    if (opts.drift?.length) {
      const fmt = (v: number, unit: "cents" | "tzs") => (unit === "cents" ? formatCents(v) : formatWhole(v));
      notes.push(
        "THE LIVE BOOKS HAVE MOVED SINCE THIS LOCK — locked → live: "
        + opts.drift.map((x) => `${x.line} ${fmt(x.locked, x.unit)} → ${fmt(x.live, x.unit)}`).join("; ")
        + ". The figures above stay as filed; reopen the period to refile.",
      );
    }
    if (d.byDay === undefined && d.period.kind !== "day") notes.push(NO_DAYS_IN_LOCK);
  }
  notes.push(
    "Sales = every stake placed in the period. Payout = winnings paid on rounds resulted in the period. On hold = stakes still awaiting a result at the cut-off. Refunds = stakes returned (one-sided bets, cancelled rounds, players' early exits). Sales less refunds = Sales − Refunds: the stakes placed in the period less every stake returned in it, including refunds of tickets placed before the period, so a short period can print a negative figure; its tickets are the tickets placed in the period less the tickets refunded in it (one ticket is one bet). Net commission revenue = Commission − Total tax.",
    "Deposits and withdrawals are not part of this report: they are players' own money moving into and out of their wallets, never Sales, Payout, Refunds or any tax line.",
    "The plan's rule — Sales = Payout + On hold + Refunds — holds exactly for a period that starts with nothing on hold and whose resulted pools go wholly to the winners. On 50pick a period opens holding stakes placed before it, and our fee (a share of the losing side, at each resulted round's own frozen rate; a legacy round keeps the model it froze) leaves each resulted pool with the winnings; those are the two reconciling items, and with them the check closes to the shilling.",
    `Cut-off: ${windowStatement(d)}. A round resulted after the cut-off stays On hold for this period and is reclassified in the period in which it results. All day, week and month boundaries are East Africa Time (UTC+3).`,
    "Tax is computed by the approved model of the Government Tax Reporting System plan (v1.0, 03 Oct 2026, §3.3): Commission = commission rate × Payout; TRA = TRA rate × Commission; GBT = GBT rate × Commission; Total tax = TRA + GBT. Each line is rounded to the nearest shilling (halves away from zero) at each step. The rates are admin settings with effective dates — see Rates applied.",
    "Sources: Sales, Payout and Refunds are the CONFIRMED money records (the Transaction table), plus the bonus-funded part of a stake and of its refund, which the bets record; the two On-hold balances are the bets themselves (each bet's placed and settled instants); the platform fee is recomputed from each resulted round's own frozen fee model and rates, exactly as settlement took it, plus the fee on any early exit. Three independent records — when they disagree, the exceptions name every shilling.",
    "All amounts in Tanzanian Shillings (TZS).",
  );

  const signatures: SignatureRow[] | undefined = state.filingGrade
    ? [
        // An officer with no display name signs as "Generator" over their id, as every catalogue report does.
        { role: "Prepared by", name: opts.generatorName !== opts.generatorId ? opts.generatorName : "Generator", id: opts.generatorId },
        { role: "Reviewed by", name: "" },
        { role: "Approved by", name: "" },
      ]
    : undefined;

  return {
    title: `${DOCUMENT_TITLE}${state.titleSuffix}`,
    subtitle: `${d.period.label} · ${PRODUCT_LABEL[d.product]}`,
    orientation: "portrait",
    reference: documentReference(d, opts.generatorId),
    meta: {
      generatedAt: new Date(opts.generatedAtMs).toISOString(),
      generatedBy: opts.generatorName,
      period: `${d.period.label} · ${windowStatement(d)}${d.inProgress ? " · PARTIAL — the period is still running" : ""}`,
      classification: state.filingGrade ? "Regulator hand-off" : "Internal",
    },
    summary,
    // Three across, not four: a four-across tile splits a figure of a billion shillings mid-digit (`findPdfOverflows`).
    summaryColumns: 3,
    sections,
    notes,
    ...(signatures ? { signatures } : {}),
  };
}

/** A cents figure as a plain CSV number: "1234", "-1234", "1110.60" — never through the text guard. */
function plainCents(cents: number): string {
  const neg = cents < 0; const a = Math.abs(cents);
  const whole = Math.trunc(a / 100); const frac = a % 100;
  return `${neg ? "-" : ""}${whole}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
}

/**
 * The CSV: ONE flat table — Section, Line, Basis / rate, Amount (TZS), Count — so a spreadsheet can
 * filter it by section. Numbers are written as plain numeric cells; every string goes through the
 * platform's formula guard (`csvCell`). UTF-8 with a BOM so Excel reads "—" and "→" correctly.
 */
export function buildTaxCsv(d: TaxReportData, opts: { generatorName: string; generatedAtMs: number; lock: TaxLock | null; reference: string; drift?: ReadonlyArray<{ line: string; locked: number; live: number; unit: "cents" | "tzs" }> }): string {
  type Cell = { s: string } | { n: string } | null;
  const S = (s: string): Cell => ({ s });
  const N = (cents: number): Cell => ({ n: plainCents(cents) });
  const W = (whole: number): Cell => ({ n: String(whole) });
  const rows: Cell[][] = [];
  const state = documentState(d, opts.lock);
  rows.push([S("Section"), S("Line"), S("Basis / rate"), S("Amount (TZS)"), S("Count")]);
  rows.push([S("Document"), S("Title"), S(`${DOCUMENT_TITLE}${state.titleSuffix}`), null, null]);
  rows.push([S("Document"), S("Period"), S(`${d.period.label} · ${windowStatement(d)}`), null, null]);
  rows.push([S("Document"), S("Product"), S(PRODUCT_LABEL[d.product]), null, null]);
  rows.push([S("Document"), S("Reference"), S(opts.reference), null, null]);
  rows.push([S("Document"), S("Generated"), S(`${eatDateTimeLabel(opts.generatedAtMs)} EAT by ${opts.generatorName}`), null, null]);
  if (opts.lock) rows.push([S("Document"), S("Locked"), S(`${eatDateTimeLabel(opts.lock.lockedAtMs)} EAT · ${opts.lock.id} · sha256 ${opts.lock.sha256}`), null, null]);
  if (state.headline) rows.push([S("Document"), S("Status"), S(state.headline), null, null]);
  // ⛔ A LOCKED FILING WHOSE BOOKS HAVE MOVED SAYS SO, line by line — the PDF's note, as rows a spreadsheet can read.
  // The Amount column holds the LIVE figure; the locked one is in the basis text, so the filed numbers below stay the lock's.
  for (const x of opts.drift ?? []) {
    rows.push([S("Moved since the lock"), S(x.line), S(`Locked ${x.unit === "cents" ? formatCents(x.locked) : formatWhole(x.locked)} → live now`), x.unit === "cents" ? N(x.live) : W(x.live), null]);
  }

  const f = d.main;
  for (const r of report1Rows(f)) rows.push([S("Report 1 — Total Reporting System"), S(r.line), S(r.basis), N(r.cents), null]);
  // The tickets behind Sales less refunds go in the Count column, a plain number; how they are made, in the basis.
  for (const r of report2Rows(f)) {
    rows.push([S("Report 2 — Taxation"), S(r.line), S(report2BasisText(r)), r.cents ? N(r.amount) : W(r.amount), r.tickets ? W(r.tickets.net) : null]);
  }
  for (const r of f.refundsByReason) rows.push([S("Refunds by reason"), S(REFUND_REASONS[r.code].label), S(`${REFUND_REASONS[r.code].planCode} · ${REFUND_REASONS[r.code].approval}`), N(r.cents), W(r.count)]);
  for (const c of productColumns(d)) {
    const x = c.f;
    const sec = `By product — ${c.label}`;
    rows.push(
      [S(sec), S("Sales"), null, N(x.report1.salesCents), null],
      [S(sec), S("Payout"), null, N(x.report1.payoutCents), null],
      [S(sec), S("On hold"), null, N(x.report1.onHoldCents), null],
      [S(sec), S("Refunds"), null, N(x.report1.refundsCents), null],
      [S(sec), S("Platform fee kept"), null, N(x.report1.feeKeptCents), null],
      [S(sec), S("Less: on hold brought forward"), null, N(-x.report1.broughtForwardCents || 0), null],
      [S(sec), S("Check difference (must be 0)"), null, N(x.reconciliation.differenceCents), null],
      [S(sec), S("Commission"), null, W(x.tax.commission), null],
      [S(sec), S("TRA tax"), null, W(x.tax.tra), null],
      [S(sec), S("GBT tax"), null, W(x.tax.gbt), null],
      [S(sec), S("Total Tax payable"), null, W(x.tax.total), null],
    );
  }
  // Day by day: ONE ROW PER DAY PER LINE — a long table a spreadsheet pivots (rows: the Section's date; columns: the Line).
  for (const [i, x] of (d.byDay ?? []).entries()) {
    const sec = `Day by day — ${x.dayKey}`;
    const day = dayRowLabel(d, x, { running: d.inProgress && i === (d.byDay ?? []).length - 1, print: false, withYear: true });
    rows.push(
      [S(sec), S("Sales"), S(day), N(x.report1.salesCents), W(x.counts.betsPlaced)],
      [S(sec), S("Payout"), S(day), N(x.report1.payoutCents), W(x.counts.payoutRecords)],
      [S(sec), S("On hold"), S(day), N(x.report1.onHoldCents), W(x.counts.betsOnHold)],
      [S(sec), S("Refunds"), S(day), N(x.report1.refundsCents), W(x.counts.refundRecords)],
      [S(sec), S("Platform fee kept"), S(day), N(x.report1.feeKeptCents), null],
      [S(sec), S("Less: on hold brought forward"), S(day), N(-x.report1.broughtForwardCents || 0), null],
      [S(sec), S("Check difference (must be 0)"), S(day), N(x.differenceCents), null],
      [S(sec), S("Commission"), S(day), W(x.tax.commission), null],
      [S(sec), S("TRA tax"), S(day), W(x.tax.tra), null],
      [S(sec), S("GBT tax"), S(day), W(x.tax.gbt), null],
      [S(sec), S("Total Tax payable"), S(day), W(x.tax.total), null],
    );
  }
  if (opts.lock && d.byDay === undefined && d.period.kind !== "day") rows.push([S("Day by day"), S("Not recorded"), S(NO_DAYS_IN_LOCK), null, null]);
  for (const e of d.exceptions) rows.push([S("Exception"), S(EXCEPTION_LABEL[e.kind]), S(`${e.ref}${e.roundId && e.roundId !== e.ref ? ` · round ${e.roundId}` : ""} · ${e.note}`), N(e.contributionCents), null]);
  if (d.exceptionCount > d.exceptions.length) rows.push([S("Exception"), S(`Showing the ${d.exceptions.length} largest of ${d.exceptionCount}`), S(`All ${d.exceptionCount} explain TZS ${formatCents(d.explainedCents)}`), null, null]);
  for (const v of d.rateVersions) rows.push([S("Rates applied"), S(`In force from ${v.effectiveFrom}`), S(`Commission ${percentLabel(v.rates.commissionBp)} · TRA ${percentLabel(v.rates.traBp)} · GBT ${percentLabel(v.rates.gbtBp)}${v.note ? ` · ${v.note}` : ""}`), null, null]);

  const cell = (c: Cell): string => (c === null ? '""' : "n" in c ? c.n : csvCell(c.s));
  return CSV_BOM + rows.map((r) => r.map(cell).join(",") + CSV_EOL).join("");
}

/** The product label for a filter — re-exported so the route names files without importing the engine twice. */
export function productLabel(p: ProductFilter): string {
  return PRODUCT_LABEL[p];
}
