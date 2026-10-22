import type { ReactNode } from "react";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { counted } from "@/components/maswali/maswali-format";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { HUB_POOL_HEAD } from "@/app/millionea/hub-frame";

/**
 * THE POOL FIGURE — the week's jackpot headline and its rule (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.3, §10 §6 "an UNEARNED
 * surface"; the v6 delivery's U-hub pool block).
 *
 * ⛔ NO GOLD, ANYWHERE IN THIS FILE (DESIGN_AUTHORITY §M8a item 7, §M3). The jackpot, the floor, the rollover and the
 * stub are money nobody has earned: neutral mono ink, never gilt, never struck, never counted up. The figure changes
 * only by `.m-tick` on a real sale or a settlement (`tick`).
 * ⭐ THE HEADLINE IS LABELLED (§M8a item 9, §C3): "Jackpot" names the figure, the rule under it says it is shared equally
 * by every 10/10 ticket with the fee taken at payout, and while an earlier week is still unsettled the figure is "at
 * least" — a true lower bound from the settlement function — with the line that says why ("plus Week 41's carry-over
 * once it is final"). ⛔ A held ticket never shows a potential payout: this block never names a player's share.
 * Every figure is a prop, read by the composer from the ledger (`maswali-money`), and every rate from the week's frozen
 * snapshot (`pct`); nothing here is computed but the words around them.
 * ⭐ S5-DESIGN-HUB (Ali 2026-10-21 10/10 pass; R1-hub H1, H2, M4): this is the pool's HEAD (`MaswaliPoolHead`: the label,
 * the figure, its rule, the final week's line and the carry's line). Its LEDGER is the one Millionea ledger
 * (`maswali-ledger.tsx`, the REGISTER lane's shared builder, read by the hub's live island `hub-pool.tsx`), so the hub's
 * rows say every figure in the register's words. The hub draws its buy block BETWEEN the two on a phone, so its door
 * stands on the first screen, and pins the head with the door from 1024 while the ledger reads on under it.
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
 * read model carries none.
 */
export type PoolView =
  | { kind: "presale"; carriedIn: PoolCarriedIn | null; floor: number | null; opensOn: string }
  | { kind: "selling"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number }
  | { kind: "won"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; fee: number; toWinners: number; winningTickets: number; perTicket: number }
  | { kind: "rollover"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; jackpot: number; carriedOut: { week: number; amount: number } }
  | { kind: "voiding"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number }
  | { kind: "voided"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; floor: number | null; price: number; refunded: number; carriedForward: { week: number; amount: number };
      /** Every ticket's refund has landed (MR-18; the read model's `refundsPending` negated). */
      refundLanded: boolean }
  | { kind: "sunset"; carriedIn: PoolCarriedIn | null; sales: Sales; pool: number; fee: number; toWinners: number; winningTickets: number; perTicket: number; top: { score: number; tickets: number } };

const DASH = "—";

/** The rule under the headline — and none on a void: a week being voided or voided shares no jackpot (the S5 UI review,
 *  HIGH 1), so "shared equally by every 10/10 ticket" would be false there. */
export function poolRule(t: Dict, view: PoolView, pct: number): string | null {
  if (view.kind === "voiding" || view.kind === "voided") return null;
  return view.kind === "sunset"
    ? counted(view.top.tickets, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: view.top.score })
    : fill(t.millionea.ruleShared, { pct });
}

/**
 * ⭐ S5-DESIGN-HUB H3 · THE FINAL WEEK'S LINE (MR-30, OD-03; RULES §2.12 "the sunset"): in the final week a pool with no
 * 10/10 goes to the week's highest-scoring tickets, shared equally — so under a figure the 10/10 rule alone would
 * overstate, and the head's rule IS the final week's: the critic's one key, "Final week: if no ticket gets 10/10, the
 * pool is shared equally by this week's highest-scoring tickets · 13% fee at payout" (the fee its rule's own fact). None
 * on a void (no pool is shared) and none once the sunset has settled (its own rule line names the top score).
 */
export function poolFinalLine(t: Dict, view: PoolView, final: boolean): string | null {
  return final && (view.kind === "selling" || view.kind === "presale") ? t.millionea.finalWeekRule : null;
}

/** The headline's figure: the larger of the floor and the carry plus sales, from the composer; "at least" around it while
 *  the carry waits; a dash before sales and on a void. The figure itself is one unbreakable run.
 *  ⭐ S5-R2-HUB (the lead's 7b) · NO FIGURE TO STATE IS THE PLATFORM'S OWN EMPTY SLOT: the em-dash in the faint ink, never
 *  a figure-bright "—" (the market card's `noPrice` / one-sided slot, `.mcardp-pct--empty`; DESIGN_AUTHORITY B6) — and
 *  hidden from the screen reader, as the card hides it where the words around it say why: here the week's chip and the
 *  voiding notice (or, before sales, the week's own state). The slot keeps the figure's line, so the head's height holds. */
function headlineOf(t: Dict, v: PoolView): ReactNode {
  const whole = (n: number) => <span className="amount">{formatTzs(n)}</span>;
  if (v.kind === "presale" || v.kind === "voiding" || v.kind === "voided") return <span className="text-text-faint" aria-hidden>{DASH}</span>;
  if (v.kind === "sunset") return whole(v.pool);
  return v.carriedIn?.amount === null ? fillNodes(t.millionea.atLeast, { amount: whole(v.jackpot) }) : whole(v.jackpot);
}

/**
 * ⭐ THE HEAD — ONE ORDER, THE CARD'S (S5 VIS P3; DOORS' M2 card order, the lead's ruling 2026-10-22): the label, the figure,
 * then — while an earlier week is unsettled — the carry's line that adds to it, then the R-HEADLINE's rule (in Millionea's
 * final week, the final week's). The carry's line stood after the fee and read as adding to the fee (the hub's sw tile
 * reader read it so; the card moved it for the same reason). Each line says what it is (`data-head`), so a measure never
 * counts children. The rule's facts are a fact line (`maswali-facts.tsx`,
 * A1), so no line starts or ends with a separator and no phrase ("Week 47's", "13% fee") is torn.
 * ⭐ L10 · the figure at the title-sm rung below 360 and title-md from 360: "at least TZS 1,000,000" holds one line in
 * the 256px a 320 phone gives it (22px left "at least" alone on a line above the figure).
 * ⭐ H3 + H1 · IN THE FINAL WEEK ONE RULE, NOT TWO, AND NO BOX ABOVE THE PAGE: the rule line is the final week's, led by the
 * final week's own mark (`finalWeek`, §10c P17). It was the 10/10 rule, then the final week's line, under a page-wide
 * "Final week of Millionea" box: three statements of one week, which put the door at y 770 on a 360 phone (958 at 320
 * under the week's notices). The head says it once, in the critic's words, and the door stays on the first screen.
 * `labelId` names the block's label, so the column that holds it can be named by it (L17).
 */
export function MaswaliPoolHead({ t, locale, view, pct, final = false, tick, labelId, className }: {
  t: Dict;
  /** The reader's language: the fact lines keep its phrases whole (`keepFact`). */
  locale: Locale;
  view: PoolView;
  /** The week's fee rate as a number of percent (`pctNum` of the snapshot's rate). */
  pct: number;
  /** The week is Millionea's final week (MR-30): the head says what a pool with no 10/10 does. */
  final?: boolean;
  /** A real sale or a settlement moved the larger-of-two figure: it dips and lands once (`.m-tick`). */
  tick?: boolean;
  /** The id the label carries. */
  labelId?: string;
  className?: string;
}) {
  const v = view;
  const pending = v.carriedIn?.amount === null;
  const rule = poolRule(t, view, pct);
  const finalLine = poolFinalLine(t, view, final);
  const facts = (line: string) => <MaswaliFacts facts={factsOf(line).map((f) => keepFact(locale, f))} className={HUB_POOL_HEAD.facts} />;
  // ⭐ ONE FRAME FOR THE HEAD AND ITS DRAWING (S5-R2-HUB): every class here is `hub-frame.ts`'s, which the hub's loading
  // drawing composes too — so the drawn head is this head's height, line box by line box.
  return (
    <div className={cn(HUB_POOL_HEAD.box, className)} data-testid="millionea-hub-jackpot">
      <span id={labelId} className={HUB_POOL_HEAD.label}>{t.millionea.jackpot}</span>
      <span className={cn(HUB_POOL_HEAD.figure, tick && "m-tick")} data-testid="millionea-hub-figure">{headlineOf(t, v)}</span>
      {pending && v.carriedIn && v.carriedIn.week !== null && (
        <span className={HUB_POOL_HEAD.carry} data-head="carry">{keepFact(locale, fill(t.millionea.pendingCarry, { week: v.carriedIn.week }))}</span>
      )}
      {finalLine ? (
        <span className={HUB_POOL_HEAD.finalRule} data-head="rule" data-testid="millionea-hub-final-rule">
          <MillioneaGlyph name="finalWeek" s={14} className="relative top-0.5 shrink-0 text-text-subtle" />
          <MaswaliFacts facts={[finalLine, ...(rule ? factsOf(rule).slice(1) : [])].map((f) => keepFact(locale, f))} className={HUB_POOL_HEAD.facts} />
        </span>
      ) : rule && <span className={HUB_POOL_HEAD.rule} data-head="rule">{facts(rule)}</span>}
    </div>
  );
}

/** "Wiki 41 · hakuna 10/10 · TZS 389,000 imehamishwa · ada 0" — last week's words as one closed ledger row (the hub, §3.3),
 *  its facts a fact line (A1), the carried figure in the money face; `id` marks that figure when a page carries from it.
 *  The words alone: the hub's row is the door's own box (S5-DESIGN-HUB, P16's tap floor and end mark). */
export function MaswaliLastWeek({ t, locale, week, carried, id, className }: {
  t: Dict;
  locale: Locale;
  week: number;
  /** What last week carried forward (it had no 10/10). */
  carried: number;
  /** The carried figure's id, when a page carries from it. */
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
  return <MaswaliFacts className={className} facts={factsOf(t.millionea.lastWeekRolled).map(fact)} />;
}
