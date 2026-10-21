import type { ReactNode } from "react";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted } from "@/components/maswali/maswali-format";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatTzs, formatTzsSigned } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE POOL FIGURE — the week's jackpot headline, its rule and its public ledger (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.3,
 * §10 §6 "an UNEARNED surface"; the v6 delivery's U-hub pool block).
 *
 * ⛔ NO GOLD, ANYWHERE IN THIS FILE (DESIGN_AUTHORITY §M8a item 7, §M3). The jackpot, the floor, the rollover and the
 * stub are money nobody has earned: neutral mono ink, never gilt, never struck, never counted up. The figure changes
 * only by `.m-tick` on a real sale or a settlement (`tick`), and a carried figure arrives by N1 (`carry`, M7).
 * ⭐ THE HEADLINE IS LABELLED (§M8a item 9, §C3): "Jackpot" names the figure, the rule under it says it is shared equally
 * by every 10/10 ticket with the fee taken at payout, and while an earlier week is still unsettled the figure is "at
 * least" — a true lower bound from the settlement function — with the line that says why ("plus Week 41's carry-over
 * once it is final"). ⛔ A held ticket never shows a potential payout: this block never names a player's share.
 * Every figure is a prop, read by the composer from the ledger (`maswali-money`), and every rate from the week's frozen
 * snapshot (`pct`); nothing here is computed but the words around them.
 */
export type PoolCarriedIn = {
  /** The week it came from (or, pending, waits on) — the calendar chain's; null when no such week is known: the row then
   *  names none (S5-FIX-PLAYER P9), never "Week 0" or a week counted from this one's open. */
  week: number | null;
  /** null while that week has not settled: the figure is then "at least" */
  amount: number | null;
};
type Sales = { tickets: number; amount: number };

/**
 * The views. ⛔ `floor` is null whenever the floor may not be printed — while the guarantee does not cover every unsettled
 * week at its own frozen floor (MB-56, OD-02: never show the floor unless it is funded), or for a closed week whose
 * read model carries none — and then the ledger has no floor line at all, never a zero.
 */
export type PoolView =
  | { kind: "presale"; carriedIn: PoolCarriedIn | null; floor: number | null; opensOn: string }
  | { kind: "selling"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number }
  | { kind: "won"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; fee: number; toWinners: number; winningTickets: number; perTicket: number }
  | { kind: "rollover"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; carriedOut: { week: number; amount: number } }
  | { kind: "voiding"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number }
  | { kind: "voided"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number; refunded: number; carriedForward: { week: number; amount: number };
      /** Every ticket's refund has landed (MR-18; the read model's `refundsPending` negated): until then the refund row
       *  says the money is on its way back, never that it was refunded (the S5 UI review, HIGH 1). */
      refundLanded: boolean }
  | { kind: "sunset"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; fee: number; toWinners: number; winningTickets: number; perTicket: number; top: { score: number; tickets: number } };

/** One ledger row as the block draws it — exported with the builder below, so a suite reads what the block will say.
 *  `words`: the value is words, not a figure ("Not yet settled", "13% at payout") — the body face, free to wrap. */
export type PoolLedgerRow = { key: string; label: ReactNode; value: ReactNode; ink?: "text" | "muted" | "subtle"; weight?: "medium" | "semibold" | "bold"; words?: boolean };
type Row = PoolLedgerRow;

const INK = { text: "text-text", muted: "text-text-muted", subtle: "text-text-subtle" } as const;
const WEIGHT = { medium: "font-medium", semibold: "font-semibold", bold: "font-bold" } as const;
const DASH = "—";

/**
 * ⭐ THE LEDGER'S ROWS, as the block prints them (pure; `test:maswali-design` reads it). ⛔ A void says what is TRUE at its
 * moment (the S5 UI review, HIGH 1): while the week is being voided nothing is refunded and an objection can still undo it —
 * "if the void stands, every ticket is refunded"; once voided, "every ticket refunded" only after every refund landed.
 * ⭐ S5 VIS P5: the carry-in row names its week ONCE ("Carried in from Week 47") and, while that week is unsettled, its
 * value says so in words ("Not yet settled") — it once read "Carried in (Week 47) · Week 47 not yet settled — –"; and
 * before a payout the fee row's value is the rate and when it is taken ("13% at payout") — its dash read as "no fee"
 * under the rule's "13% fee at payout". A fee taken is the platform's signed figure ("−TZS 136,500", A4).
 */
export function poolLedgerRows(t: Dict, view: PoolView, pct: number, carry?: { from: string; play: boolean }): PoolLedgerRow[] {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const money = (n: number) => formatTzs(n);
  const ticketsLabel = (s: Sales) => `${t.millionea.salesThisWeek} · ${counted(s.tickets, t.millionea.ticketsOne, t.millionea.ticketsN)}`;
  const feeBefore: Row = { key: "fee", label: t.millionea.fee, value: fill(t.millionea.feeAtPayout, { pct }), ink: "muted", words: true };
  const rows: Row[] = [];

  if (v.carriedIn) {
    const c = v.carriedIn;
    const label = c.week === null ? t.millionea.carriedInNoWeek : fill(t.millionea.carriedIn, { week: c.week });
    rows.push(c.amount === null
      ? { key: "in", label, value: t.millionea.carriedInPending, ink: "muted", words: true }
      : {
          key: "in",
          label,
          value: carry ? <MaswaliCarry from={carry.from} play={carry.play}>{money(c.amount)}</MaswaliCarry> : money(c.amount),
          ink: "text",
        });
  }
  if (v.kind === "presale") {
    rows.push({ key: "sales", label: `${t.millionea.salesThisWeek} · ${fill(t.millionea.opensOn, { day: v.opensOn })}`, value: DASH, ink: "muted" });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: DASH, ink: "muted" });
    if (v.floor !== null) rows.push({ key: "floor", label: t.millionea.floor, value: money(v.floor) });
    rows.push({ key: "jackpot", label: t.millionea.jackpot, value: DASH, ink: "muted" });
    rows.push(feeBefore);
  } else {
    rows.push({ key: "sales", label: ticketsLabel(v.sales), value: money(v.sales.amount) });
    rows.push({ key: "pool", label: t.millionea.poolTotal, value: money(v.pool), weight: "semibold" });
    const floor = v.kind === "sunset" ? null : v.floor;
    if (floor !== null) {
      // Above the floor, the floor line drops to the quiet ink and stays visible (§10 §1: "the jackpot line repeats the larger").
      rows.push({ key: "floor", label: t.millionea.floor, value: money(floor), ink: v.pool > floor ? "subtle" : "text" });
    }
    switch (v.kind) {
      case "selling":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: pending ? fill(t.millionea.atLeast, { amount: money(v.jackpot) }) : money(v.jackpot), weight: "bold" });
        rows.push(feeBefore);
        break;
      case "won":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: formatTzsSigned(-v.fee), ink: "muted" });
        rows.push({ key: "winners", label: t.millionea.toWinners, value: money(v.toWinners) });
        rows.push({ key: "share", label: counted(v.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket), value: money(v.perTicket), weight: "bold" });
        break;
      case "rollover":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: money(v.jackpot), weight: "bold" });
        rows.push({ key: "fee", label: t.millionea.fee, value: t.millionea.feeZero, ink: "muted" });
        rows.push({ key: "out", label: fill(t.millionea.carriedOut, { week: v.carriedOut.week }), value: money(v.carriedOut.amount), weight: "bold" });
        break;
      case "voiding":
        rows.push({ key: "jackpot", label: t.millionea.jackpot, value: DASH, ink: "muted" });
        rows.push({ key: "refund", label: fill(t.millionea.refundEachIfVoid, { price: money(v.price) }), value: DASH, ink: "muted" });
        break;
      case "voided":
        rows.push(v.refundLanded
          ? { key: "refund", label: fill(t.millionea.refundEach, { price: money(v.price) }), value: money(v.refunded) }
          : { key: "refund", label: fill(t.millionea.refundEachPending, { price: money(v.price) }), value: DASH, ink: "muted" });
        rows.push({ key: "again", label: `${t.millionea.carriedForwardAgain} · ${fill(t.millionea.week, { week: v.carriedForward.week })}`, value: money(v.carriedForward.amount), weight: "bold" });
        break;
      case "sunset":
        rows.push({ key: "fee", label: fill(t.millionea.feeLine, { pct }), value: formatTzsSigned(-v.fee), ink: "muted" });
        rows.push({ key: "winners", label: t.millionea.toWinners, value: money(v.toWinners) });
        rows.push({ key: "share", label: counted(v.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket), value: money(v.perTicket), weight: "bold" });
        break;
    }
  }
  return rows;
}

/** The rule under the headline — and none on a void: a week being voided or voided shares no jackpot (the S5 UI review,
 *  HIGH 1), so "shared equally by every 10/10 ticket" would be false there. */
export function poolRule(t: Dict, view: PoolView, pct: number): string | null {
  if (view.kind === "voiding" || view.kind === "voided") return null;
  return view.kind === "sunset"
    ? counted(view.top.tickets, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: view.top.score })
    : fill(t.millionea.ruleShared, { pct });
}

/**
 * ⭐ ONE ORDER, THE CARD'S (S5 VIS P3): the figure, the R-HEADLINE's rule, then — while an earlier week is unsettled — the
 * carry's line; the rule's facts and every "·"-joined label are drawn as fact lines (`maswali-facts.tsx`, A1), so no line
 * of the block starts or ends with a separator and no phrase ("Week 47's", "13% fee") is torn.
 */
export function MaswaliPoolFigure({ t, locale, view, pct, carry, tick, className }: {
  t: Dict;
  /** The reader's language: the fact lines keep its phrases whole (`keepFact`). */
  locale: Locale;
  view: PoolView;
  /** The week's fee rate as a number of percent (`pctNum` of the snapshot's rate). */
  pct: number;
  /** M7 — the carried-in figure travels from `from` (last week's figure) once, when `play` (the composer's seen state). */
  carry?: { from: string; play: boolean };
  /** A real sale or a settlement moved the larger-of-two figure: it dips and lands once (`.m-tick`). */
  tick?: boolean;
  className?: string;
}) {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const money = (n: number) => formatTzs(n);
  const rows = poolLedgerRows(t, view, pct, carry);

  // The headline: the larger of the floor and the carry plus sales, from the composer; a dash before sales and on a void.
  // The figure is one unbreakable run; "at least" around it may wrap (a 320px column cannot hold both on one line).
  const whole = (n: number) => <span className="amount">{money(n)}</span>;
  const figure =
    v.kind === "presale" || v.kind === "voiding" || v.kind === "voided" ? DASH
      : v.kind === "sunset" ? whole(v.pool)
        : pending ? fillNodes(t.millionea.atLeast, { amount: whole(v.jackpot) })
          : whole(v.jackpot);
  const rule = poolRule(t, view, pct);
  const facts = (line: string) => <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f))} />;

  return (
    <section className={cn("mat-flat flex flex-col gap-2 rounded-card p-3", className)}>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.millionea.jackpot}</span>
        <span className={cn("font-mono text-title-md font-semibold text-text tabular-nums", tick && "m-tick")}>{figure}</span>
        {rule && <span className="text-body-sm text-text-muted">{facts(rule)}</span>}
        {pending && v.carriedIn && v.carriedIn.week !== null && (
          <span className="text-body-sm text-text-muted text-pretty">{keepFact(locale, fill(t.millionea.pendingCarry, { week: v.carriedIn.week }))}</span>
        )}
      </div>
      <dl className="flex flex-col border-t border-border">
        {rows.map((r) => (
          <div key={r.key} className={cn("flex items-baseline justify-between gap-2 border-b border-border py-1.5", INK[r.ink ?? "text"])}>
            {/* A figure inside a label ("Kila tiketi imerejeshwa TZS 1,000") is set whole in the money face (§M4, through
                `keepFact`'s money reader); a "·"-joined label is a fact line. */}
            <dt className="min-w-0 flex-1 text-body-sm">{typeof r.label === "string" ? facts(r.label) : r.label}</dt>
            <dd className={cn(r.words ? "text-right text-body-sm" : "amount text-right text-body-sm", WEIGHT[r.weight ?? "medium"], r.key === "jackpot" && tick && "m-tick")}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "Wiki 41 · hakuna 10/10 · TZS 389,000 imehamishwa · ada 0" — last week as one closed ledger row (the hub, §3.3),
 *  its facts a fact line (A1); the carried figure keeps its id, the origin of this week's M7 carry. */
export function MaswaliLastWeek({ t, locale, week, carried, id, className }: {
  t: Dict;
  locale: Locale;
  week: number;
  /** What last week carried forward (it had no 10/10). */
  carried: number;
  /** The carried figure's id: the origin of this week's M7 carry. */
  id?: string;
  className?: string;
}) {
  const fact = (f: string) => {
    if (!f.includes("{amount}")) return keepFact(locale, fill(f, { week }));
    const [before, after] = f.split("{amount}");
    return (
      <span>
        {fill(before ?? "", { week })}
        <span id={id} className="amount text-text">{formatTzs(carried)}</span>
        {fill(after ?? "", { week })}
      </span>
    );
  };
  return (
    <p className={cn("mat-inset rounded-control px-3 py-2 text-body-sm text-text-muted", className)}>
      <MaswaliFacts facts={factsOf(t.millionea.lastWeekRolled).map(fact)} />
    </p>
  );
}

