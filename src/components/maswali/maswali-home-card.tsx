import type { ReactNode } from "react";
import Link from "next/link";
import { IconPlate } from "@/components/ui/icon-plate";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, eatWeekdayClock, weekWord } from "@/components/maswali/maswali-format";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE MILLIONEA CARD — the product's door on the journey home and at the head of the classic board (MASWALI-BUILD S5;
 * MASWALI-PLAN §10 §3.1–§3.2; DESIGN_AUTHORITY §M8a item 11, O-7; the v6 delivery's H-entry frames).
 *
 * One link to the hub: a 48px plate carrying the product mark (never gilt), "Millionea · Wiki 42", the jackpot headline
 * with its rule (R-HEADLINE: "Jackpot TZS X · shared equally by every 10/10 ticket · 13% fee at payout"), the carry's
 * line while an earlier week is unsettled, and the week's state.
 * ⭐ ONE ORDER AT EVERY WIDTH (S5 VIS P3): the title, the R-HEADLINE, the carry's line, then the close and the reader's
 * tickets. At 768 the card once dropped the word "Jackpot" and set the figure, the carry and the rule in a right-hand
 * block in another order. Each "·"-joined line is a fact line (`maswali-facts.tsx`, A1): one fact per line below 768
 * (`phone`), side by side from 768, a fact that does not fit moving whole to the next line — never a separator at a
 * line's start or end, never "13% fee" / "at payout". At 1280 the card is one row: title | headline | state | chevron.
 * ⛔ AN UNEARNED SURFACE (§M8a item 7): no gold on the figure, the plate or anything else. ⛔ A SERVER COMPONENT WITH NO
 * COUNTDOWN AND NO POLL: its figure is the render's (§3.1), and the close is printed as a time, never counted down (the
 * countdown lives on the slip and the hub's buy block only). ⛔ ON A BREAK (cooling-off or self-exclusion,
 * `viewerDoorsFor.onBreak`) THE CARD IS NOT DRAWN — that is the caller's to decide; this never draws a buying door then.
 */
export type HomeCardState =
  /** Before the week opens: the figure is a dash, and the day it opens. */
  | { kind: "presale"; opensOn: string }
  /** Selling: the close and, for a signed-in player, the tickets they hold; at the cap, when the next week opens — or no
   *  next week at all, in a final week or while Millionea ends (`next` null). */
  | { kind: "open"; closesAt: number; held: number | null; capFull?: { next: { week: number; opensOn: string } | null } }
  /** Sales closed, results arriving. */
  | { kind: "closed"; resultsIn: number }
  /** Settled with winners, or with no 10/10 and the pool carried. */
  | { kind: "settledWon"; winners: number }
  | { kind: "settledRollover"; carried: number }
  /** Sales paused by an operator (never on a break: that card is not drawn). */
  | { kind: "paused" }
  /** The week's void is already certain (MR-18): no jackpot and no rule — its refunds, if the void stands. */
  | { kind: "voiding" }
  /** The last week was voided whole: every refund landed, or they are on their way. */
  | { kind: "voided"; refundsPending: boolean };

export function MaswaliHomeCard({ t, locale, week, jackpot, pct, cap, state, finalWeek, atLeast = false, pendingWeek = null, href = "/millionea", className }: {
  t: Dict;
  /** The reader's language: the fact lines keep its phrases whole (`keepFact`). */
  locale: Locale;
  week: number;
  /** The headline (the larger of the floor and the carry plus sales), or null before sales and while paused. */
  jackpot: number | null;
  /** §M8a item 9 · the headline is a true lower bound while the carry waits on an earlier week: "at least", never exact. */
  atLeast?: boolean;
  /** …and that week, named: "plus Week 41's carry-over once it is final", as the hub's pool block says it. */
  pendingWeek?: number | null;
  /** The week's fee rate, as a number of percent. */
  pct: number;
  /** The weekly cap, from the week's snapshot. */
  cap: number;
  state: HomeCardState;
  /** The final week of a sunset (announced in advance). */
  finalWeek?: boolean;
  href?: string;
  className?: string;
}) {
  const figure = jackpot === null ? "—" : formatTzs(jackpot);
  // The figure as one unbreakable run in the money face; "at least" around it while the carry is pending (§M8a item 9).
  const amount = (className: string) => {
    const run = <span className={cn("amount", className)}>{figure}</span>;
    return jackpot !== null && atLeast ? fillNodes(t.millionea.atLeast, { amount: run }) : run;
  };
  const pending = jackpot !== null && pendingWeek !== null ? fill(t.millionea.pendingCarry, { week: pendingWeek }) : null;
  // ⛔ A WEEK BEING VOIDED OR VOIDED SHARES NO JACKPOT (the S5 UI review, MEDIUM 7): no figure and no "shared equally by
  // every 10/10 ticket" rule — the state's own words alone.
  const voidKind = state.kind === "voiding" || state.kind === "voided";
  const keep = (s: string) => keepFact(locale, s);
  /** A dictionary line of facts, each kept whole. */
  const factsIn = (line: string) => factsOf(line).map(keep);
  // The close is a printed time in the money face, never parted from its day ("Friday 18:00", A1).
  const when = (s: string) => <span className="whitespace-nowrap font-mono">{s}</span>;
  let meta: ReactNode[] = [];
  switch (state.kind) {
    case "presale":
      meta = [keep(fill(t.millionea.opensOn, { day: state.opensOn }))];
      break;
    case "open":
      // "Tiketi zako wiki hii: 10 kati ya 10" — never "Tiketi zako 10/10" under "kila tiketi ya 10/10", which reads as a
      // perfect ticket (the S5 UI review, LOW 12).
      meta = state.capFull
        ? [keep(fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(cap), cap: formatNumber(cap) })),
            state.capFull.next ? keep(fill(t.millionea.nextWeekOpens, { week: state.capFull.next.week, day: state.capFull.next.opensOn })) : null]
        : [<span key="close">{fillNodes(t.millionea.salesCloseAt, { when: when(eatWeekdayClock(t, state.closesAt)) })}</span>,
            state.held !== null ? keep(fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(state.held), cap: formatNumber(cap) })) : null];
      break;
    case "closed":
      meta = [keep(fill(t.millionea.resultsOut, { n: formatNumber(state.resultsIn) }))];
      break;
    case "settledWon":
      meta = [keep(counted(state.winners, t.millionea.settledWonOne, t.millionea.settledWon, { week }))];
      break;
    case "settledRollover":
      meta = factsIn(fill(t.millionea.settledRollover, { amount: formatTzs(state.carried) }));
      break;
    case "paused":
      meta = [t.millionea.pausedShort];
      break;
    case "voiding":
      meta = factsIn(t.millionea.weekVoidingShort);
      break;
    case "voided":
      meta = factsIn(state.refundsPending ? t.millionea.weekVoidedShortPending : t.millionea.weekVoidedShort);
      break;
  }
  // The R-HEADLINE's facts, its figure a node in the first ("Jackpot at least TZS 1,000,000").
  const headline = factsOf(t.millionea.ruleWithFigure).map((f) => (f.includes("{amount}")
    ? <span key="figure">{fillNodes(f, { amount: amount("font-semibold text-text xl:text-body-lg"), pct })}</span>
    : keep(fill(f, { pct }))));
  return (
    <Link
      href={href as never}
      className={cn("kp-mln-zh mat-raised flex items-start gap-2 rounded-card p-3 text-text md:gap-3 xl:items-center xl:gap-4 xl:px-4", className)}
    >
      <IconPlate size={48} bg="var(--bg-overlay)" fg="var(--text-muted)" border="1px solid var(--border)">
        <MillioneaGlyph name="millionea" s={plateGlyph(48)} />
      </IconPlate>
      <span className="flex min-w-0 flex-1 flex-col gap-1 xl:flex-row xl:items-center xl:gap-4">
        <span className="font-display text-body-lg font-semibold text-text xl:shrink-0">
          <MaswaliFacts facts={[t.millionea.productLabel, keep(weekWord(t, week))]} />
        </span>
        {finalWeek && <span className="text-body-sm text-text">{t.millionea.finalWeek}</span>}
        {/* The R-HEADLINE, then the carry's line — the same order at every width (P3). */}
        {!voidKind && (
          <span className="flex min-w-0 flex-col gap-1 text-body-sm text-text-muted xl:flex-1">
            <MaswaliFacts layout="phone" facts={headline} />
            {pending && <span className="text-pretty">{keep(pending)}</span>}
          </span>
        )}
        <span className="text-body-sm text-text-subtle xl:shrink-0">
          <MaswaliFacts layout="phone" facts={meta} />
        </span>
      </span>
      <I.chevronRight s={18} edge="end" className="mt-2 shrink-0 text-text-subtle xl:mt-0" />
    </Link>
  );
}
