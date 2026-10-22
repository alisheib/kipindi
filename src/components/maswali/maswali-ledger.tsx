import type { ReactNode } from "react";
import Link from "next/link";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { I } from "@/components/ui/glyphs";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, weekWord } from "@/components/maswali/maswali-format";
import { cn, fill, formatNumber, formatTzs, formatTzsSigned } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE MILLIONEA LEDGER — ONE ROW LIST FOR EVERY SURFACE THAT PRINTS A WEEK'S MONEY (MASWALI-BUILD S5-DESIGN-REGISTER,
 * 2026-10-21, Ali's 10/10 pass; the register critic's H3 and H5; MASWALI-PLAN MR-20…MR-26).
 *
 * ⭐ IT RECONCILES ON ITS FACE (H5). MR-26 closes every week: S + R + U = F + Σshares + carried. The ledger prints that
 *    identity as two totals a reader can check — "Money in" (carried in + ticket sales + the floor's top-up, the rows
 *    right above it) and "Money out" (fee + paid to winners + carried forward) — each computed from its own components,
 *    never one copied from the other, so they match only because the week closed. Between them, in the order the money
 *    moved: the floor, the jackpot, the fee (the platform's signed figure in its amber, the levies as one muted line under
 *    it), "To winners" (J − F, the one figure of S5-FIX-PLAYER P3) and "÷ k" (the share), the rounding remainder, and
 *    what carried forward. Because "To winners" holds the remainder too, the out total says what it is made of on its own
 *    muted line ("Fee … · paid to winners … · carried forward …"), so the sum is checkable where the rows alone are not.
 *    A voided week's money out is its refunds and the carry handed on again — the two rows above it, which add up.
 * ⭐ IT READS AS A LEDGER, NOT AS EYEBROWS (H3): every row is the kit's ReceiptRow in its sentence-case label
 *    (`labelStyle="sentence"`), a NOUN as its label and its detail as a note line under it ("Ticket sales" over "1,050
 *    tickets at TZS 1,000"), every amount an `.amount` run that never letter-spaces and never breaks.
 * ⭐ ONE BUILDER, PURE: `millioneaLedgerRows` turns a week's figures into rows; `MaswaliLedger` draws them. The register's
 *    week page and How to play's two worked examples read it now; the win ledger (the TICKETS lane) and the hub's pool
 *    ledger (the HUB lane) adopt it in round 2 — the win ledger by drawing these rows and splicing its own earned rows (the
 *    only gold, that file's) after `share`; the hub by the `live` and `voiding` kinds, which print no out total (nothing
 *    has gone out yet). Every row has a stable `key` for that.
 * ⛔ NO FIGURE IS MADE HERE. Every amount is the caller's — the settlement's mirrored columns, or `settleArithmetic`'s
 *    own result for How's examples — and only the two totals are sums, of figures already printed above them.
 * ⛔ An unearned surface: no gold anywhere in this file (DESIGN_AUTHORITY §M8a item 7). The fee is the receipt's amber.
 */

/** A carry, and the week it came from or went to (the calendar chain's, S5-FIX-PLAYER P9) — linked to that week's register
 *  page when the caller hands its address (M10). `week` null: the chain names no week (yet), and the label names none. */
export type LedgerCarry = { amount: number; week: number | null; href?: string | null };

export type MillioneaLedgerInput = {
  /**
   * Where the week's money stands:
   *   · `won`     — SETTLED with winners (the sunset's top-score payout too, with `sunset`);
   *   · `rolled`  — SETTLED with no 10/10: no fee, the whole pool carried forward (MR-21);
   *   · `voided`  — VOIDED whole: every ticket refunded, the carry handed on untouched (MR-18);
   *   · `live`    — selling or being graded: nothing struck yet (the hub's pool block, round 2);
   *   · `voiding` — its void certain, not yet stamped (the hub's pool block, round 2).
   */
  kind: "won" | "rolled" | "voided" | "live" | "voiding";
  /** The one ticket price the week froze (MR-11) — the sales note's unit. */
  price: number;
  /** Tickets live at the close (or now, while it sells): the sales over the one price. */
  tickets: number;
  /** S. */
  sales: number;
  /** R and its week; `amount` null while that week is unsettled (live). Null — or 0 — prints no row. */
  carryIn: { amount: number | null; week: number | null; href?: string | null } | null;
  /** The floor; null when it may not be printed (MB-56), or does not apply (a voided week, the sunset). */
  floor: number | null;
  /** U — the house's top-up (MR-22); 0 when none. */
  topUp: number;
  /** J — struck at settlement (won), or the live headline figure (live); null when none was struck. */
  jackpot: number | null;
  /** Live only: R is not known yet, so J is a lower bound ("at least", §M8a item 9). */
  jackpotAtLeast?: boolean;
  /** The fee's share of J as a number of percent, from the week's frozen snapshot; null when it cannot be read. */
  feePct: number | null;
  /** F — taken (won); 0 (rolled: no fee in a week nobody won, MR-21); null before any payout. */
  fee: number | null;
  /** The levies the settlement booked out of the fee, with each one's share of it as a number of percent (MR-24). */
  levies: { tra: number; gbt: number; traPct: number; gbtPct: number } | null;
  /** k — the winning tickets. */
  winners: number;
  /** J − F (S5-FIX-PLAYER P3); with `paid` and `remainder` it reconciles: paid + remainder = J − F. */
  toWinners: number | null;
  /** floor((J − F) / k). */
  share: number | null;
  /** k × share — Σshares, what the winners were paid in all. */
  paid: number | null;
  /** (J − F) − k × share. Printed only when the house did not top up (MR-25: a top-up already leaves it out). */
  remainder: number | null;
  /** What the week handed on: the remainder (won), R + S (rolled), R (voided). Null, or 0, prints no row. */
  carriedForward: LedgerCarry | null;
  /** A voided week's refunds: their total (S), and whether every one has landed (MR-18: never "refunded" before). */
  refunds: { amount: number; landed: boolean } | null;
  /** The sunset's payout to the highest score (MR-30, `TOP_SCORE`): its score and its tickets. */
  sunset: { score: number; tickets: number } | null;
};

/** One row of the ledger, as `MaswaliLedger` draws it — the kit ReceiptRow's own vocabulary. */
export type MillioneaLedgerRow = {
  key: string;
  label: ReactNode;
  /** The row's detail, on its own line UNDER the label and the figure, across the row's whole width (the lead's ruling of
   *  2026-10-21: in the label's column beside a total's figure, Money out's parts wrapped to six short lines at 320 sw and
   *  tore "imelipwa kwa" from "washindi"). The label and the figure keep their row. */
  note?: ReactNode;
  value: ReactNode;
  emphasis?: "fee" | "muted" | "total";
  tone?: "warning";
  /** A total: the hairline above it. */
  divider?: boolean;
  /** The first row of a new group: a step of space above it. */
  gap?: boolean;
  /** A carry that opens its week's register page (M10). */
  href?: string | null;
};

const money = (n: number) => <span className="amount">{formatTzs(n)}</span>;

/** Keep a sold count and its translated unit-price phrase as two phone-sized runs ("1,050 tickets" / "at TZS 1,000"). */
export function ticketSalesRuns(sold: string, price: string): string[] {
  const at = sold.lastIndexOf(price);
  if (at < 0) return [sold];
  const before = sold.slice(0, at);
  const priceLead = before.match(/[^\s，​]+\s*$/u)?.[0];
  if (!priceLead) return [sold];
  return [before.slice(0, -priceLead.length).trimEnd().replace(/​$/, ""), `${priceLead}${price}`].filter(Boolean);
}

/** A fact line from a dictionary line written as facts joined by " · " — each fact one wrap unit, its phrases whole, and
 *  each run the caller names kept whole inside the fact that holds it ("TRA 10% TZS 221": the tile read of 2026-10-21 tore
 *  "TRA" from its share at 320). */
function factLine(locale: Locale, line: string, runs: readonly string[] = []): ReactNode {
  return <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f, runs.filter((r) => f.includes(r))))} />;
}

/** A note's line of facts: each part ONE unbroken run (the lead's ruling) — at 320 the parts stack whole, wider they flow,
 *  the platform's separator between them, never opening or ending a line. Every part is narrower than the narrowest note
 *  line (the card's 264px at 320): "imelipwa kwa washindi TZS 1,740,000" is about 245px. */
function noteLine(locale: Locale, parts: readonly string[]): ReactNode {
  return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p, [p]))} />;
}

/** A carry row's label: the chain's week when it names one, else the label that names none (P9). */
function carryLabel(t: Dict, locale: Locale, withWeek: string, noWeek: string, week: number | null): ReactNode {
  return week === null ? noWeek : keepFact(locale, fill(withWeek, { week }), [weekWord(t, week)]);
}

/**
 * ⭐ THE ROWS — pure. The caller's figures, in the order the money moved, with the two totals of MR-26 where the week has
 * closed. See the file's head for the rules each row keeps.
 */
export function millioneaLedgerRows(t: Dict, locale: Locale, f: MillioneaLedgerInput): MillioneaLedgerRow[] {
  const m = t.millionea;
  const price = formatTzs(f.price);
  const rows: MillioneaLedgerRow[] = [];
  const closed = f.kind === "won" || f.kind === "rolled" || f.kind === "voided";

  // ── Money in: the carry it received, the tickets it sold, the floor's top-up ─────────────────────────────────────────
  const carryIn = f.carryIn;
  if (carryIn && (carryIn.amount === null || carryIn.amount > 0)) {
    rows.push({
      key: "in",
      label: carryLabel(t, locale, m.carriedIn, m.carriedInNoWeek, carryIn.week),
      value: carryIn.amount === null ? m.carriedInPending : money(carryIn.amount),
      emphasis: carryIn.amount === null ? "muted" : undefined,
      href: carryIn.href ?? null,
    });
  }
  const sold = fill(m.regTicketsSold, { n: formatNumber(f.tickets), price });
  rows.push({ key: "sales", label: m.ledgerSales, note: keepFact(locale, sold, ticketSalesRuns(sold, price)), value: money(f.sales) });
  if (f.topUp > 0) rows.push({ key: "topup", label: m.topUp, note: m.topUpNote, value: money(f.topUp) });
  const inTotal = (carryIn?.amount ?? 0) + f.sales + f.topUp;
  rows.push(closed
    ? { key: "moneyIn", label: m.ledgerMoneyIn, value: money(inTotal), emphasis: "total", divider: true }
    // Before the week closes nothing has gone out and no top-up exists: the total is the pool so far (the hub's line) —
    // a true lower bound while the carry waits on its week, said in words, never a guess (§M8a item 9).
    : {
        key: "pool", label: m.poolTotal, emphasis: "total", divider: true,
        value: carryIn?.amount === null ? keepFact(locale, fill(m.atLeast, { amount: formatTzs(inTotal) })) : money(inTotal),
      });

  // ── The jackpot, and how it was shared ──────────────────────────────────────────────────────────────────────────────
  const afterIn: MillioneaLedgerRow[] = [];
  if (f.kind === "voided" || f.kind === "voiding") {
    // MR-18: no jackpot is struck and the floor never applies — the money goes back, the carry goes on.
    if (f.kind === "voiding") {
      // A sentence standing alone (the hub critic's L15): no refund exists yet, so no figure (H1) — and no "—" beside it,
      // which read as a missing figure.
      afterIn.push({ key: "refund", label: keepFact(locale, fill(m.refundEachIfVoid, { price }), [price]), value: null, emphasis: "muted" });
    } else {
      const refunds = f.refunds ?? { amount: f.sales, landed: false };
      afterIn.push(refunds.landed
        ? { key: "refund", label: keepFact(locale, fill(m.refundEach, { price }), [price]), value: money(refunds.amount) }
        // Never "refunded" before every refund landed (MR-18; the S5 UI review, HIGH 1): its money is on its way back.
        : { key: "refund", label: keepFact(locale, fill(m.refundEachPending, { price }), [price]), value: money(refunds.amount), emphasis: "muted" });
      const again = f.carriedForward;
      if (again && again.amount > 0) {
        afterIn.push({ key: "again", label: carryLabel(t, locale, m.carriedOutAgain, m.carriedForwardAgain, again.week), value: money(again.amount), href: again.href ?? null });
      }
      afterIn.push({
        key: "moneyOut", label: m.ledgerMoneyOut, emphasis: "total", divider: true,
        value: money(refunds.amount + (again?.amount ?? 0)),
      });
    }
  } else {
    if (f.sunset) {
      // MR-30: the final week with no 10/10 pays its highest score — no floor and no top-up apply. A sentence standing
      // alone, as the voiding week's refund line: no "—" beside it.
      afterIn.push({ key: "noTopUp", label: factLine(locale, m.noTopUp), value: null, emphasis: "muted" });
    } else if (f.floor !== null) {
      // The floor binds only when the house topped the jackpot up to it; otherwise it is a quiet line of the list (H5).
      const binds = f.kind === "live" ? (carryIn?.amount ?? 0) + f.sales <= f.floor : f.topUp > 0;
      afterIn.push({ key: "floor", label: m.floor, value: money(f.floor), emphasis: binds ? undefined : "muted" });
    }
    if (f.kind === "live") {
      if (f.jackpot !== null) {
        afterIn.push({ key: "jackpot", label: m.jackpot, value: f.jackpotAtLeast ? keepFact(locale, fill(m.atLeast, { amount: formatTzs(f.jackpot) })) : money(f.jackpot) });
      }
      // Before a payout the fee is a rate and when it is taken, in words — never a dash, which read as "no fee" (P5).
      if (f.feePct !== null) afterIn.push({ key: "fee", label: m.fee, value: keepFact(locale, fill(m.feeAtPayout, { pct: f.feePct })), emphasis: "muted" });
    } else if (f.kind === "rolled") {
      // A week nobody won takes no fee (MR-21) and strikes no jackpot: "TZS 0", the settlement's own fee column.
      afterIn.push({ key: "fee", label: m.fee, value: money(f.fee ?? 0) });
      const out = f.carriedForward;
      if (out && out.amount > 0) {
        afterIn.push({ key: "out", label: carryLabel(t, locale, m.carriedOut, m.carriedOutNoWeek, out.week), value: money(out.amount), href: out.href ?? null });
      }
      afterIn.push({ key: "moneyOut", label: m.ledgerMoneyOut, value: money((f.fee ?? 0) + (out?.amount ?? 0)), emphasis: "total", divider: true });
    } else {
      // won
      if (f.jackpot !== null) afterIn.push({ key: "jackpot", label: m.jackpot, value: money(f.jackpot) });
      const fee = f.fee ?? 0;
      const pct = f.feePct;
      afterIn.push({
        key: "fee", tone: "warning", emphasis: "fee",
        label: pct === null ? m.fee : keepFact(locale, fill(m.feeLine, { pct }), [`${pct}%`]),
        // The levies are taken OUT OF the fee, never from a player (AGENTS.md §6): one muted line under it, with amounts —
        // each levy one run ("TRA 10% TZS 221": the tile read tore "TRA" from its share at 320).
        note: f.levies && fee > 0 ? noteLine(locale, factsOf(fill(m.ledgerLevies, {
          traPct: f.levies.traPct, tra: formatTzs(f.levies.tra), gbtPct: f.levies.gbtPct, gbt: formatTzs(f.levies.gbt),
        }))) : undefined,
        // A fee taken is the platform's signed figure ("−TZS 136,500", A4).
        value: <span className="amount">{fee > 0 ? formatTzsSigned(-fee) : formatTzs(0)}</span>,
      });
      if (f.toWinners !== null) afterIn.push({ key: "winners", label: m.toWinners, value: money(f.toWinners) });
      if (f.share !== null) {
        // "÷ 3 winning tickets": the operator never ends a line — it is one run with the word after it. In the sunset the
        // winning tickets are the week's highest score, said under them (M9: "Highest score this week: 9 of 10 · 2 tickets").
        const perTicket = counted(f.winners, m.perTicketOne, m.perTicket);
        afterIn.push({
          key: "share", label: keepFact(locale, perTicket, perTicket.match(/^÷ \S+/) ?? []), value: money(f.share),
          note: f.sunset ? noteLine(locale, factsOf(counted(f.sunset.tickets, m.sunsetScoreOne, m.sunsetScore, { score: f.sunset.score }))) : undefined,
        });
      }
      // MR-25 · the remainder only in a week the house did not top up (P4): a top-up already left it out.
      const remainder = f.topUp === 0 ? (f.remainder ?? 0) : 0;
      if (remainder > 0) afterIn.push({ key: "dust", label: m.remainder, note: m.remainderNote, value: money(remainder) });
      const out = f.carriedForward;
      if (out && out.amount > 0) {
        afterIn.push({ key: "out", label: carryLabel(t, locale, m.carriedOut, m.carriedOutNoWeek, out.week), value: money(out.amount), href: out.href ?? null });
      }
      const paid = f.paid ?? 0, carried = out?.amount ?? 0;
      // The parts, fee · paid · carried, in that order in every language; a carry of nothing is no part of the sum and is
      // left out, as its row is (the critic's L11: "carried forward TZS 0" read as a third figure).
      const parts = factsOf(fill(m.ledgerOutParts, { fee: formatTzs(fee), paid: formatTzs(paid), carried: formatTzs(carried) }));
      afterIn.push({
        key: "moneyOut", label: m.ledgerMoneyOut, emphasis: "total", divider: true,
        // "To winners" holds the remainder too, so the rows above do not add up to this on their own: say its parts.
        note: noteLine(locale, carried > 0 ? parts : parts.slice(0, 2)),
        value: money(fee + paid + carried),
      });
    }
  }
  if (afterIn.length > 0) afterIn[0] = { ...afterIn[0], gap: true };
  return [...rows, ...afterIn];
}

/**
 * The rows, drawn: the kit's ReceiptRow in its sentence-case label, a step of space between the groups, a hairline only
 * above a total (the withdraw confirm's bottom line — never a rule under every row, H5). A carry row that names its week
 * opens that week's register page: the whole row is the link (at least `--h-control-md`, 40px), its label in the link
 * ink with the chevron after it, its figure in the column every other figure stands in. A row's note stands on its own
 * line under the label AND the figure, across the row's whole width, in the kit row's note face (the lead's ruling of
 * 2026-10-21) — never squeezed into the label's column beside a figure.
 */
export function MaswaliLedger({ rows, className }: { rows: readonly MillioneaLedgerRow[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-testid="millionea-ledger">
      {rows.map((r) => {
        const row = (
          <ReceiptRow
            labelStyle="sentence"
            label={r.href ? (
              <span className="inline-flex items-center gap-1 text-text-link">
                <span>{r.label}</span>
                <I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />
              </span>
            ) : r.label}
            value={r.value}
            emphasis={r.emphasis}
            tone={r.tone}
            divider={r.divider}
            className={cn(r.gap && "mt-3")}
          />
        );
        // The note: the kit row's own note face, on the row's whole width under its label and its figure.
        const wide = r.note !== undefined && r.note !== null
          ? <span className="mt-0.5 block text-body-sm text-text-muted">{r.note}</span>
          : null;
        return r.href ? (
          <Link key={r.key} href={r.href as never} className="flex flex-col justify-center rounded-control" style={{ minHeight: "var(--h-control-md)" }} data-ledger-row={r.key}>
            {row}
            {wide}
          </Link>
        ) : (
          <div key={r.key} data-ledger-row={r.key}>{row}{wide}</div>
        );
      })}
    </div>
  );
}
