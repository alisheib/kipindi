/**
 * /millionea/register — THE PARTS BOTH REGISTER PAGES SHARE (MASWALI-BUILD S5 VIS-R, the tile read of 2026-10-19).
 *
 * Server-safe, no directive, no read: each page hands in its words.
 */
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { keepConnectives, runAndDashRanges } from "@/components/ui/keep-run";
import { counted, millioneaWord, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { fill, formatNumber, formatTzs, formatTzsSigned, pctNum } from "@/lib/utils";
import type { MillioneaRegisterWeek, MillioneaWeekSummary } from "@/lib/server/maswali-player";
import type { Dict } from "@/lib/i18n-dict";

/**
 * A FINAL WEEK'S STATE, AS ITS OWN CHIP (R4: the heading read "Week 48 · Voided" and wrapped at 320 into a line that began
 * with "·"; R9: a row of the index says its state the same way). Both final states are terminal and inert, so both wear
 * status-tone's slate — the platform's VOID ink, `TONE_CHIP[STATUS_TONE.VOID.player]` — and a settled week never takes the
 * resolved gold here: the register states money, it awards none (DESIGN_AUTHORITY §M8a item 7).
 */
export function WeekStateChip({ t, state }: { t: Dict; state: "SETTLED" | "VOIDED" }) {
  return (
    <Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]} metrics="status" className="shrink-0 self-start" data-testid="millionea-week-state">
      {millioneaWord(t, WEEK_STATE_KEY[state])}
    </Chip>
  );
}

/**
 * A label whose phrases never break inside (S5 VIS A1): each run the caller names — a week, an amount, a date — stays on
 * one line, and no line ends on a connective (the kit's keep-run, as every receipt label is). The words are unchanged.
 */
export function kept(text: string, runs: readonly string[]): ReactNode {
  return keepConnectives(text, runAndDashRanges(text, runs));
}

/** Keep the ticket count and the translated unit-price phrase in separate phone-sized runs. */
export function ticketSalesRuns(sold: string, price: string): string[] {
  const at = sold.lastIndexOf(price);
  if (at < 0) return [sold];
  const before = sold.slice(0, at);
  const priceLead = before.match(/[^\s，\u200b]+\s*$/u)?.[0];
  if (!priceLead) return [sold];
  return [before.slice(0, -priceLead.length).trimEnd().replace(/\u200b$/, ""), `${priceLead}${price}`].filter(Boolean);
}

/**
 * A FINAL WEEK'S FACTS, AFTER ITS STATE (R9: "Week 48 · Voided" and "Week 45: 1 ticket won" were two grammars for one kind
 * of row) — a voided week's refunds ("every ticket refunded" only once every refund landed: the read model's
 * `refundsPending`, MR-18, never a refund stated before it happened), a won week's winners and jackpot, or a rolled week's
 * carry at fee 0 (the strata line, D-38). Every amount is the read model's; each one is a single unbroken run.
 */
export function weekFacts(t: Dict, w: MillioneaWeekSummary): ReactNode[] {
  if (w.state === "VOIDED") return [w.refundsPending ? t.millionea.regRefundsPending : t.millionea.regRefunded];
  const k = w.winners ?? 0;
  if (k > 0) {
    const facts: ReactNode[] = [counted(k, t.millionea.regWonOne, t.millionea.regWon)];
    if (w.jackpot !== null) facts.push(<>{`${t.millionea.jackpot} `}<span className="amount">{formatTzs(w.jackpot)}</span></>);
    return facts;
  }
  const amount = formatTzs(w.carriedForward ?? 0);
  return [kept(fill(t.millionea.regCarried, { amount }), [amount]), t.millionea.feeZero];
}

/** A label with a note of its own: the note on its own line, never after a "·" (A1). */
function noted(head: string, note: string): ReactNode {
  return (
    <span className="flex flex-col">
      <span>{keepConnectives(head)}</span>
      <span>{keepConnectives(note)}</span>
    </span>
  );
}

/** One row of a week's ledger as the register's week page draws it — a receipt row: its label, its figure (an amount
 *  formatted the platform's way, or "—"), the row's tone and emphasis, and `quiet` for a figure in the muted ink (a levy's). */
export type LedgerRow = { key: string; label: ReactNode; value: string; tone?: "warning"; emphasis?: "fee" | "muted"; quiet?: boolean };

/**
 * ⭐ ONE WEEK'S LEDGER, ROW BY ROW, TO THE SHILLING (§10 §3.17; MR-20–MR-25) — what the register's week page prints, in
 * order, every figure the settlement's own column (the read model's), every label's runs kept whole (A1). Pure: the page
 * draws each row as a receipt row, and `test:maswali-register` reads these rows' words and figures in three languages.
 *   · S5-FIX-PLAYER P3 · "To winners" is J − F — the win ledger's and How to play's one figure — and stands BEFORE the equal
 *     split it is divided by; the share and the rounding remainder under it reconcile it (it printed k × share).
 *   · P4 · the rounding remainder only in a week the house did not top up (MR-25: a top-up already leaves it out, so
 *     nothing carries) — the win ledger's own rule (`winLinesOf`).
 *   · P11 · a fee taken is the platform's signed figure ("−TZS 136,500", rule A4) — it printed "TZS −136,500"; a week that
 *     took none, "TZS 0".
 *   · P9 · the weeks a carry came from and went to are the calendar chain's (`carryFromCode`, `carryToCode`: DRAFTs and
 *     voided weeks skipped) — never the week's open ± 7 days, which named the wrong week across a voided week, a skipped
 *     holiday week or an early open; with no such week (yet) the label names none.
 */
export function registerLedgerRows(t: Dict, w: MillioneaRegisterWeek): LedgerRow[] {
  const money = (n: number | null) => (n === null ? "—" : formatTzs(n));
  const fee = (n: number | null) => (n === null ? "—" : n > 0 ? formatTzsSigned(-n) : formatTzs(0));
  const from = w.carryFromCode ? weekNumberOf(w.carryFromCode) : null;
  const to = w.carryToCode ? weekNumberOf(w.carryToCode) : null;
  const price = formatTzs(w.ticketPrice);
  const sales = w.sales ?? 0, carryIn = w.carryIn ?? 0;
  const pct = w.feeRate !== null ? pctNum(w.feeRate) : null;
  const carriedOut: ReactNode = to === null ? t.millionea.carriedOutNoWeek : kept(fill(t.millionea.carriedOut, { week: to }), [weekWord(t, to)]);
  const sold = fill(t.millionea.regTicketsSold, { n: formatNumber(w.tickets), price });
  const rows: LedgerRow[] = [];
  if (carryIn > 0) rows.push({ key: "in", label: from === null ? t.millionea.carriedInNoWeek : kept(fill(t.millionea.carriedIn, { week: from }), [weekWord(t, from)]), value: money(carryIn) });
  // The count and the unit-price phrase each keep their own phone-sized run in every language.
  rows.push({ key: "sold", label: kept(sold, ticketSalesRuns(sold, price)), value: money(sales) });
  rows.push({ key: "pool", label: t.millionea.poolTotal, value: money(carryIn + sales) });
  rows.push({ key: "floor", label: t.millionea.floor, value: money(w.floor) });
  if (w.state === "VOIDED") {
    // "Every ticket refunded" only once every refund landed (MR-18, the read model's `refundsPending`); until then, that the
    // money is on its way back — never a refund stated before it happened (the S5 UI review, HIGH 1).
    rows.push(w.refundsPending
      ? { key: "refund", label: kept(fill(t.millionea.refundEachPending, { price }), [price]), value: money(sales), emphasis: "muted" }
      : { key: "refund", label: kept(fill(t.millionea.refundEach, { price }), [price]), value: money(sales) });
    rows.push({ key: "again", label: t.millionea.carriedForwardAgain, value: money(carryIn) });
    return rows;
  }
  if ((w.winners ?? 0) === 0) {
    // A week nobody won takes no fee (MR-21): the settlement's own fee column, "TZS 0", in the ledger's one money format.
    rows.push({ key: "fee", label: t.millionea.fee, value: fee(w.fee) });
    rows.push({ key: "out", label: carriedOut, value: money(w.carriedForward) });
    return rows;
  }
  rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(w.jackpot) });
  rows.push({ key: "fee", label: pct === null ? t.millionea.fee : kept(fill(t.millionea.feeLine, { pct }), [`${pct}%`]), value: fee(w.fee), tone: "warning", emphasis: "fee" });
  if (w.traLevy !== null && w.gbtLevy !== null && (w.fee ?? 0) > 0) {
    // The levies' shares OF THE FEE (MR-24), from what the settlement booked — one row each under the fee, its amount beside
    // it, where one "TRA … · GBT …" row could start a line with its "·" (A1).
    const taken = w.fee ?? 0;
    const tra = pctNum(w.traLevy / taken), gbt = pctNum(w.gbtLevy / taken);
    rows.push({ key: "tra", label: kept(fill(t.millionea.regLevyTra, { pct: tra }), [`TRA ${tra}%`]), value: money(w.traLevy), emphasis: "muted", quiet: true });
    rows.push({ key: "gbt", label: kept(fill(t.millionea.regLevyGbt, { pct: gbt }), [`GBT ${gbt}%`]), value: money(w.gbtLevy), emphasis: "muted", quiet: true });
  }
  if ((w.topUp ?? 0) > 0) rows.push({ key: "topup", label: noted(t.millionea.topUp, t.millionea.topUpNote), value: money(w.topUp) });
  rows.push({ key: "winners", label: t.millionea.toWinners, value: money(w.toWinners) });
  // "÷ 3 winning tickets": the operator never ends a line — it is one run with the word after it.
  const perTicket = counted(w.winners ?? 0, t.millionea.perTicketOne, t.millionea.perTicket);
  rows.push({ key: "share", label: kept(perTicket, perTicket.match(/^÷ \S+/) ?? []), value: money(w.share) });
  if ((w.topUp ?? 0) === 0 && (w.remainder ?? 0) > 0) rows.push({ key: "dust", label: noted(t.millionea.remainder, t.millionea.remainderNote), value: money(w.remainder) });
  rows.push({ key: "out", label: carriedOut, value: money(w.carriedForward) });
  return rows;
}
