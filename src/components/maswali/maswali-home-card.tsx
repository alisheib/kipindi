import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { IconPlate } from "@/components/ui/icon-plate";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, eatClock, eatWeekday, eatWeekdayClock, weekWord } from "@/components/maswali/maswali-format";
import { formatEatDay } from "@/lib/eat-day";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE MILLIONEA CARD — the product's door on the journey home and at the head of the classic board (MASWALI-BUILD S5;
 * MASWALI-PLAN §10 §3.1–§3.2; DESIGN_AUTHORITY §M8a item 11, O-7; the v6 delivery's H-entry frames).
 *
 * One link to the hub: a 48px identity plate carrying the product mark (never gilt), "Millionea · Wiki 42", the jackpot
 * headline with its rule (R-HEADLINE: "Jackpot TZS X · shared equally by every 10/10 ticket · 13% fee at payout"), the
 * carry's line while an earlier week is unsettled, and the week's state.
 * ⭐ ONE ANATOMY, THE DOOR'S (S5-DESIGN-DOORS, the critic's M1 L1 L4; `.kp-mln-door` in globals.css): a head row of three —
 * the plate, the title (and, in a final week, its line; at STAFF_PREVIEW the preview chip), the chevron — on one axis, the
 * How-to card's own row; under it the body: the R-HEADLINE's facts, then the state's. Below 768 the body runs the card's
 * full inner width, one fact per line; from 768 it stands under the title, its facts side by side; from 1280 the card is one
 * row: plate | title | headline | state | chevron. A void state's words stand at the row's end (L4).
 * ⭐ ONE ORDER, EVERYWHERE (P3, M2): the figure, the carry that adds to it, the rule, the fee — then the state. The carry
 * hung after the fee ("13% fee at payout · plus Week 47's carry-over") and read as adding to the fee.
 * ⭐ EACH FACT LINE IS `MaswaliFacts` (A1): one fact per line below 768 (`phone`), side by side from 768, a fact that does not
 * fit moving whole — never a separator at a line's start or end, never "13% fee" / "at payout".
 * ⭐ ITS HOST'S MATERIAL (L2): on the journey home the How-to card's own flat box and inset (`--journey`: `--bg-elevated`,
 * its border, 12px with 14px at the chevron's side), on the board the market card's raised material and inset (`--board`:
 * `mat-raised`, 12px, 16px across from 640, as `.mcardp`). Each host's own hover (M5; the motion critic's L5): at home the
 * How-to card's — the border turns `--border-royal` — and on the board every board card's — lifted `--m-lift` with the
 * brand ring.
 * ⭐ ITS NAME IS ITS TITLE AND ITS FIGURE (L11): `aria-labelledby` names the title and the figure, `aria-describedby` the
 * rest, so a screen reader hears "Millionea · Week 49, Jackpot at least TZS 1,000,000" and not all forty-five words. A
 * figure not read (before sales, while paused) is the house's missing-value mark, drawn as quietly as the hub's pool block
 * draws it (muted, regular weight) and read with the rest, never as the card's name.
 * ⭐ EVERY STATE LINE OPENS AS A SENTENCE OPENS (the tile read of 2026-10-21): "No 10/10 · TZS 601,000 carried forward", as
 * "Week voided · …" and "Sales closed · …" — the hub's lower-case line ("Week 46 · no 10/10 · …") follows its week word.
 * ⛔ AN UNEARNED SURFACE (§M8a item 7): no gold on the figure, the plate or anything else. ⛔ A SERVER COMPONENT WITH NO
 * COUNTDOWN AND NO POLL: its figure is the render's (§3.1), and the close is printed as a time, never counted down (the
 * countdown lives on the slip and the hub's buy block only). ⛔ ON A BREAK (cooling-off or self-exclusion,
 * `viewerDoorsFor.onBreak`) THE CARD IS NOT DRAWN — that is the caller's to decide; this never draws a buying door then.
 * ⭐ ITS LOADING PICTURE IS `MaswaliHomeCardGhost` (maswali-home-card-ghost.tsx): this anatomy, this host's box, its words
 * hidden over bars, so the card lands where its ghost stood (H1).
 */
export type HomeCardState =
  /** Before the week opens: the figure is a dash, and the day and date it opens (`opensDay`, its EAT calendar day). */
  | { kind: "presale"; opensOn: string; opensDay: string }
  /** Selling: the close, and the reader's tickets of the cap — or, to a reader who holds none (a guest too), what a ticket
   *  costs (`price`, the week's frozen price); at the cap, when the next week opens — or no next week at all, in a final
   *  week or while Millionea ends (`next` null). */
  | { kind: "open"; closesAt: number; held: number | null; price: number; capFull?: { next: { week: number; opensOn: string } | null } }
  /** Sales closed, results arriving — and where the week stands after them (`millioneaWeekPhase`): the objection window
   *  while it runs (`objectionsUntil`, its end), then settling (`word`, `weekPhaseWord`'s); `state` while results come in. */
  | { kind: "closed"; resultsIn: number; phase: { kind: "state" | "objections" | "settling"; objectionsUntil: number | null; word: string } }
  /** Settled with winners, or with no 10/10 and the pool carried. */
  | { kind: "settledWon"; winners: number }
  | { kind: "settledRollover"; carried: number }
  /** Sales paused by an operator (never on a break: that card is not drawn). */
  | { kind: "paused" }
  /** The week's void is already certain (MR-18): no jackpot and no rule — its refunds, if the void stands. */
  | { kind: "voiding" }
  /** The last week was voided whole: every refund landed, or they are on their way. */
  | { kind: "voided"; refundsPending: boolean };

/** Where the door stands: the journey home (the How-to card's flat box) or the classic board (the market cards' raised one). */
export type DoorHost = "journey" | "board";

/** The class of each host's box, one place for the card and its ghost: the door's anatomy and its host's material. */
export function doorClass(host: DoorHost): string {
  return host === "journey" ? "kp-mln-door kp-mln-door--journey" : "kp-mln-door kp-mln-door--board mat-raised";
}

/** "Friday 18:00": a printed time as §T5 sets a numeral — the weekday in the sentence's own face, the clock a numeral
 *  (`.mono`: JetBrains Mono, tabular figures) — the whole never parted (L7; the lead's ruling of 2026-10-21: it was one mono
 *  run mid-sentence, weekday and all). */
export function doorTime(t: Dict, atMs: number): ReactNode {
  return <span className="whitespace-nowrap">{eatWeekday(t, atMs)} <span className="mono">{eatClock(atMs)}</span></span>;
}

/** "Monday 23 Nov" / "周一 2026年11月23日": a printed day set as `doorTime` sets a time (§T5, the same ruling) — its words in
 *  the sentence's face, each number a `.mono` numeral, the whole never parted (the presale's date, L10). */
export function doorDay(t: Dict, locale: Locale, weekday: string, dayKey: string): ReactNode {
  const parts = formatEatDay(dayKey, t.common.monthsShort, locale).split(/(\d+)/);
  return <span className="whitespace-nowrap">{weekday} {parts.map((p, i) => (i % 2 === 1 ? <span key={i} className="mono">{p}</span> : p))}</span>;
}

export function MaswaliHomeCard({ t, locale, week, jackpot, pct, cap, state, finalWeek, finalAhead = null, atLeast = false, pendingWeek = null, preview = false, host = "board", href = "/millionea", idBase = "mln-card", className }: {
  t: Dict;
  /** The reader's language: the fact lines keep its phrases whole (`keepFact`), and a date reads its way. */
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
  /** The final week of a sunset: this card's own week. */
  finalWeek?: boolean;
  /** The final week's number while it is still to open (MR-30, OD-03): the card names it, whatever week it shows. */
  finalAhead?: number | null;
  /** At STAFF_PREVIEW, the preview's mark in the title row, as every Millionea page and /results carry it (L12). */
  preview?: boolean;
  host?: DoorHost;
  href?: string;
  /** The ids its name and description are read from (one card on a page). */
  idBase?: string;
  className?: string;
}) {
  const figure = jackpot === null ? "—" : formatTzs(jackpot);
  // The figure as one unbreakable run in the money face, at the body's large rung at every width (L3); "at least" around it
  // while the carry is pending (§M8a item 9). A figure not read is the house's dash at the same rung (no line moves), in the
  // muted ink and regular weight the hub's pool block gives it — it said nothing as the line's heaviest mark.
  const amount = (() => {
    if (jackpot === null) return <span className="amount text-body-lg text-text-muted">{figure}</span>;
    const run = <span className="amount text-body-lg font-semibold text-text">{figure}</span>;
    return jackpot !== null && atLeast ? fillNodes(t.millionea.atLeast, { amount: run }) : run;
  })();
  const pending = jackpot !== null && pendingWeek !== null ? fill(t.millionea.pendingCarry, { week: pendingWeek }) : null;
  // ⛔ A WEEK BEING VOIDED OR VOIDED SHARES NO JACKPOT (the S5 UI review, MEDIUM 7), AND A WEEK NOBODY WON STATES NONE (the
  // critic's M6: "Jackpot —" over the live rule read as a jackpot still to share): no figure and no "shared equally by every
  // 10/10 ticket" rule — the state's own words alone ("No 10/10 · TZS 601,000 carried forward").
  const noHeadline = state.kind === "voiding" || state.kind === "voided" || state.kind === "settledRollover";
  const keep = (s: string, runs: readonly string[] = []) => keepFact(locale, s, runs);
  /** A dictionary line of facts, each kept whole. */
  const factsIn = (line: string) => factsOf(line).map((f) => keep(f));
  let meta: ReactNode[] = [];
  switch (state.kind) {
    case "presale":
      meta = [<span key="opens">{fillNodes(t.millionea.opensOn, { day: doorDay(t, locale, state.opensOn, state.opensDay) })}</span>];
      break;
    case "open":
      // "Tiketi zako wiki hii: 10 kati ya 10" — never "Tiketi zako 10/10" under "kila tiketi ya 10/10", which reads as a
      // perfect ticket (the S5 UI review, LOW 12). A reader who holds none is told the price instead (M7).
      meta = state.capFull
        ? [keep(fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(cap), cap: formatNumber(cap) })),
            state.capFull.next ? keep(fill(t.millionea.nextWeekOpens, { week: state.capFull.next.week, day: state.capFull.next.opensOn })) : null]
        // ONE wording for the week's close on every surface (the lead's ruling, S5 round 2): the slip's and the ticket's
        // `salesCloseColon` — "Sales close: Friday 18:00 EAT", its zone kept with its clock and the clock a `.mono`
        // numeral (`keepFact`, §T5), where the card said "Sales close Friday 18:00" with no zone.
        : [keep(fill(t.millionea.salesCloseColon, { when: eatWeekdayClock(t, state.closesAt) })),
            state.held !== null && state.held > 0
              ? keep(fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(state.held), cap: formatNumber(cap) }))
              : keep(fill(t.millionea.cardPrice, { price: formatTzs(state.price) }))];
      break;
    case "closed": {
      // P6 on the card, in the week's own order: while results arrive, "Sales closed" (the hub's `salesClosedAt` words — the
      // past tense of the open card's "Sales close Friday 18:00": a reader learns no ticket can be bought) and the count;
      // once every result needed is in, the count and where the week stands — the objection window and its end while it runs
      // (the hub's `checkWindowUntil`), then "Settling" — the one answer every surface says (`millioneaWeekPhase`).
      // Two lines either way, as the open card's two: the card and its loading picture keep one height through the week.
      const { kind, objectionsUntil, word } = state.phase;
      const count = keep(fill(t.millionea.resultsOut, { n: formatNumber(state.resultsIn) }));
      meta = kind === "objections" && objectionsUntil !== null
        ? [count, <span key="objections">{fillNodes(t.millionea.checkWindowUntil, { when: doorTime(t, objectionsUntil) })}</span>]
        : kind === "settling" ? [count, word] : [factsOf(t.millionea.salesClosedAt)[0], count];
      break;
    }
    case "settledWon":
      // The register's and /results' own words (L9): the title already names the week, so the line never says it twice.
      meta = [keep(counted(state.winners, t.millionea.regWonOne, t.millionea.regWon))];
      break;
    case "settledRollover":
      // The hub's words (`settledRollover`, which follows "Week 46 · "), opening the line as a sentence opens.
      meta = factsIn(fill(t.millionea.weekRolledShort, { amount: formatTzs(state.carried) }));
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
  // The R-HEADLINE's facts in ONE order (M2): the figure ("Jackpot at least TZS 1,000,000"), the carry that adds to it, the
  // 10/10 share, the fee.
  const rule = factsOf(t.millionea.ruleWithFigure);
  const at = rule.findIndex((f) => f.includes("{amount}"));
  const headline: ReactNode[] = noHeadline ? [] : [
    ...rule.slice(0, at).map((f) => keep(fill(f, { pct }))),
    <span key="figure" id={`${idBase}-figure`}>{fillNodes(rule[at] ?? "", { amount, pct })}</span>,
    pending ? keep(pending) : null,
    ...rule.slice(at + 1).map((f) => keep(fill(f, { pct }))),
  ];
  const headIds = headline.map((f, i) => (f === null || i === at ? undefined : `${idBase}-h${i}`));
  // Its name: the title and the figure. Its description: everything else that is drawn, in order — the dash of a figure not
  // read among it, never in the name.
  const named = headline.length > 0 && jackpot !== null;
  const labelledBy = [`${idBase}-title`, named ? `${idBase}-figure` : null].filter(Boolean).join(" ");
  const describedBy = [preview ? `${idBase}-preview` : null, finalWeek || finalAhead !== null ? `${idBase}-final` : null,
    ...headIds.map((id, i) => (i === at && headline.length > 0 && !named ? `${idBase}-figure` : id)).filter((id): id is string => id !== undefined),
    `${idBase}-state`].filter(Boolean).join(" ");
  return (
    <Link
      href={href as never}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn("kp-mln-zh", doorClass(host), className)}
    >
      <IconPlate size={48} variant="identity" aria-hidden className="kp-mln-door__plate">
        <MillioneaGlyph name="millionea" s={plateGlyph(48)} tier="duo" />
      </IconPlate>
      <span className="kp-mln-door__head">
        <span className="kp-mln-door__title">
          <span id={`${idBase}-title`} className="font-display text-body-lg font-semibold text-text">
            {/* A heading in the display face keeps its numerals in its face (§T5's ruling of 2026-10-21 covers fact lines). */}
            <MaswaliFacts numerals={false} facts={[t.millionea.productLabel, keepFact(locale, weekWord(t, week), [], { numerals: false })]} />
          </span>
          {preview && (
            <Chip id={`${idBase}-preview`} variant="info" size="sm" className="gap-1">
              <I.eye s={10} aria-hidden />
              {t.millionea.previewChip}
            </Chip>
          )}
        </span>
        {finalWeek && <span id={`${idBase}-final`} className="text-body-sm text-text-muted">{keep(t.millionea.finalWeek)}</span>}
        {/* S7 · F1 (MR-30, OD-03): every card but the final week's own names the announced final week, by its number — in
            the final week's own slot (the two never stand together), and its description reads it. */}
        {!finalWeek && finalAhead !== null && <span id={`${idBase}-final`} className="text-body-sm text-text-muted">{keep(fill(t.millionea.finalAheadShort, { week: finalAhead }))}</span>}
      </span>
      {headline.length > 0 && (
        <span className="kp-mln-door__rule text-body-sm text-text-muted">
          <MaswaliFacts layout="phone" facts={headline} ids={headIds} />
        </span>
      )}
      <span className="kp-mln-door__state text-body-sm text-text-subtle">
        <MaswaliFacts layout="phone" facts={meta} id={`${idBase}-state`} />
      </span>
      <I.chevronRight s={20} edge="end" className="kp-mln-door__chev" />
    </Link>
  );
}
