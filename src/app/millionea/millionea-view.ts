/**
 * /millionea — FROM THE READ MODEL TO THE COMPONENTS' PROPS (MASWALI-BUILD S5 composition; MASWALI-PLAN §7b S5 items 1–5).
 *
 * The pages read `maswali-player.ts` (the one answer to "what may a player see") and draw `src/components/maswali/*`
 * (the one drawing of each thing). This file is the joint between the two, and nothing else: pure, isomorphic, no read,
 * no word of any language — the words are the dictionary's, through `t`.
 *
 * ⛔ ONE GRADER (manifest L9). A ticket's Seal Line is `sealLineOf` over the week's fifteen and the ticket's own picks — the
 *    function `maswali-score.ts` answers for — never a second reading of the server's socket marks.
 * ⛔ NO FIGURE IS MADE HERE. Every amount is the read model's (the ledger's, the settlement's mirrored columns); this file
 *    only places them. The two derived numbers it does print are labelled where they are made: a ticket count from sales
 *    at the week's one frozen price, and a levy's share of the fee from the fee and the levy the settlement booked.
 * ⭐ THE READ MODEL'S SHARE AND REFUND STATES ARE READ HERE, ONCE: a won share paid, held or forfeited (`earnedOf`), a
 *    voided week's refund pending or landed per ticket (`refundOf`) — so a page never re-decides either.
 */
import type {
  MaswaliPoolFigure, MillioneaHubWeek, MillioneaNotice, MillioneaQuestion, MillioneaSlot, MillioneaText, MillioneaTicketRow,
  MillioneaTicketView,
} from "@/lib/server/maswali-player";
import { sealLineOf, type SealLine } from "@/components/maswali/maswali-seal-line";
import type { SlipQuestion } from "@/components/maswali/maswali-slip";
import type { TicketClause } from "@/components/maswali/maswali-ticket";
import type { PoolView } from "@/components/maswali/maswali-pool-figure";
import type { WeekPhases } from "@/components/maswali/maswali-week-strip";
import type { LossPosition, WinLines } from "@/components/maswali/maswali-win-ledger";
import { counted, eatWeekday, weekNumberOf } from "@/components/maswali/maswali-format";
import { factsOf } from "@/components/maswali/maswali-facts";
import { MAIN_COUNT, weekVoidCertain, type GradableQuestion, type MaswaliPick } from "@/lib/maswali-score";
import { remainderFate } from "@/lib/maswali-money";
import type { WeekState } from "@/lib/maswali-week-label";
import { marketCategoryLabel } from "@/lib/localized";
import { eatIsoWeek } from "@/lib/eat-day";
import { fill, pctNum } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
// ⭐ WHERE A WEEK STANDS, AND THE INSTANTS AND PLACES IT READS, LIVE IN `millionea-phase.ts` (a pure module the home card can
// reach without reaching the Seal Line's client marks — S5-DESIGN-DOORS, 2026-10-21, the lead's OK): re-exported here, so every
// importer of this joint reads them where it always did.
import { gradableOf, msOf, ordinalOf } from "./millionea-phase";
export { gradableOf, millioneaWeekPhase, msOf, ordinalOf, weekPhaseWord, type MillioneaWeekPhase, type PhaseWeek } from "./millionea-phase";

/** A week-frozen text in the reader's language (MR-6: each question froze in three languages at the open). */
export function textIn(locale: Locale, text: MillioneaText): string {
  return text[locale] || text.en;
}

/** The fifteen, in slot order. */
export function bySlot<T extends { slot: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.slot - b.slot);
}

/** A ticket's fifteen picks by slot − 1 (`canonicalPicks`'s order), from its own row. */
export function picksOf(slots: readonly MillioneaSlot[]): MaswaliPick[] {
  const out: MaswaliPick[] = [];
  for (const s of slots) out[s.slot - 1] = s.pick;
  return out;
}

/** ⭐ A ticket's Seal Line: the one grader over the week's fifteen and this ticket's picks; the engine's word on a week
 *  voided whole (MR-18), which the questions alone may not show. */
export function lineOf(questions: readonly MillioneaQuestion[], slots: readonly MillioneaSlot[], weekState: WeekState): SealLine {
  return sealLineOf(gradableOf(questions), picksOf(slots), lineOpts(weekState));
}

/** The line's finality is the WEEK's (the S5 UI review, HIGH 2): final once it SETTLED — after MR-16's objections, never at
 *  the settlement gate alone — and voided whole once the engine stamped it VOIDED. Until then the line is PENDING. */
function lineOpts(weekState: WeekState): { weekVoid: boolean; final: boolean } {
  return { weekVoid: weekState === "VOIDED", final: weekState === "SETTLED" };
}

/** A ticket's Seal Line from its own fifteen slots — each carries its role, its place and the sealed outcome — where the
 *  week's questions are not read (Tiketi zangu's list). The same grader, so the same answer as `lineOf`. */
export function lineOfSlots(slots: readonly MillioneaSlot[], weekState: WeekState): SealLine {
  const gq: GradableQuestion[] = slots.map((s) => ({ role: s.role, ordinal: ordinalOf(s), outcome: s.outcome }));
  return sealLineOf(gq, picksOf(slots), lineOpts(weekState));
}

/**
 * MB-15 (the lead's decision): a question sealed VOID before the close still takes a YES/NO pick, because a ticket is
 * fifteen canonical picks — so the slip fills it with this, hidden, and it never grades. A rule of the record's shape, not
 * a guess at an answer.
 */
export const VOIDED_ROW_FILL: MaswaliPick = "YES";

/** The slots the slip fills by itself: every question already sealed VOID (MB-15). */
export function hiddenSlotsOf(questions: readonly MillioneaQuestion[]): number[] {
  return questions.filter((q) => q.outcome === "VOID").map((q) => q.slot);
}

/** The slip's questions, in the reader's language — every question the player answers (a voided one is filled, MB-15). */
export function slipQuestionsOf(t: Dict, locale: Locale, questions: readonly MillioneaQuestion[]): SlipQuestion[] {
  return bySlot(questions).filter((q) => q.outcome !== "VOID").map((q) => ({
    role: q.role, ordinal: ordinalOf(q), category: marketCategoryLabel(t, q.category), text: textIn(locale, q.text),
    source: q.sourceDomain, eventAt: msOf(q.eventStartsAt),
  }));
}

/**
 * The ticket's fifteen clauses, mains first, each with this ticket's pick and the sealed outcome. ⭐ S5-FIX-PLAYER P10: a
 * slot the slip filled ITSELF (`filled`: the read model's `slipFilled` — a question already VOID when the ticket was cut,
 * asked of nobody, MB-15) has no pick of the player's: its clause says "—", never the slip's fill as the player's answer.
 */
export function clausesOf(
  t: Dict, locale: Locale, questions: readonly MillioneaQuestion[], slots: readonly MillioneaSlot[], filled: readonly number[] = [],
): TicketClause[] {
  const pickAt = new Map(slots.map((s) => [s.slot, s.pick] as const));
  return bySlot(questions).flatMap((q) => {
    const pick = pickAt.get(q.slot);
    // Every slot of a ticket carries a pick (`canonicalPicks`); a row without one is not drawn rather than guessed.
    return pick ? [{
      role: q.role, ordinal: ordinalOf(q), category: marketCategoryLabel(t, q.category), text: textIn(locale, q.text),
      eventAt: msOf(q.eventStartsAt), pick: filled.includes(q.slot) ? null : pick, outcome: q.outcome,
    }] : [];
  });
}

/**
 * ⭐ A WEEK'S POOL BLOCK FROM ITS DERIVED FIGURE (MR-28; `maswaliPoolFigure`, which every `maswali:pool` frame carries too).
 * The ticket count is the sales at the week's one frozen price — every ticket of a week costs the same (MR-11).
 * ⛔ The floor is passed through as the figure states it: null whenever it may not be shown (MB-56), and the block then
 * has no floor line.
 * ⭐ S5-FIX-PLAYER P9 · the carry's week is the figure's own (`carryPendingCode` while it waits, `carryFromCode` once known,
 * the calendar chain's) — never this week's open minus seven days, which named the wrong week across a voided week, a
 * skipped one or an early open. With no such week the row names none.
 */
export function poolViewOf(fig: MaswaliPoolFigure, price: number, voiding = false): PoolView {
  const carriedIn = fig.carryPendingCode !== null
    ? { week: weekNumberOf(fig.carryPendingCode), amount: null }
    : (fig.carryIn ?? 0) > 0 ? { week: fig.carryFromCode ? weekNumberOf(fig.carryFromCode) : null, amount: fig.carryIn } : null;
  const sales = { tickets: price > 0 ? Math.round(fig.sales / price) : 0, amount: fig.sales };
  const pool = (fig.carryIn ?? 0) + fig.sales;
  // A week whose void is already certain prints no jackpot and no "shared by every 10/10" rule: its refund, if the void
  // stands (the S5 UI review, HIGH 1).
  if (voiding) return { kind: "voiding", carriedIn, sales, pool, floor: fig.floor, price };
  return { kind: "selling", carriedIn, sales, pool, floor: fig.floor, jackpot: fig.jackpot };
}

/** The three phases of a week, from its own instants: sales from the open to the close; events from the first to the
 *  last; results and payout from the last event to `resultsBy` — the objection window's end once known, else the latest
 *  void deadline plus the frozen window (S5-FIX-PLAYER P7, `millioneaResultsBy`: How to play's own rule; it ended at the
 *  latest void deadline, a day before the window it ignored). Nothing is a typed day. */
export function phasesOf(week: Pick<MillioneaHubWeek, "opensAt" | "closesAt" | "questions" | "resultsBy">): WeekPhases | null {
  const open = msOf(week.opensAt), close = msOf(week.closesAt);
  const events = week.questions.map((q) => msOf(q.eventStartsAt)).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const deadlines = week.questions.map((q) => msOf(q.voidDeadlineAt)).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (open === null || close === null || events.length === 0) return null;
  const lastEvent = events[events.length - 1];
  return {
    salesFrom: open, salesTo: close,
    eventsFrom: events[0], eventsTo: lastEvent,
    resultsFrom: lastEvent, resultsTo: msOf(week.resultsBy) ?? (deadlines.length > 0 ? deadlines[deadlines.length - 1] : lastEvent),
  };
}

/** Which phase the week is in now: selling, its events running, or its results and payout. */
export function phaseNow(week: Pick<MillioneaHubWeek, "state">, phases: WeekPhases, nowMs: number): 0 | 1 | 2 {
  if (week.state === "OPEN" && nowMs < phases.salesTo) return 0;
  if (nowMs < phases.eventsTo) return 1;
  return 2;
}

/**
 * ⭐ THE CAP REACHED, SAID ONE WAY (S5-FIX-PLAYER P13): the hub's buy block and the slip's refusal before any pick say the
 * same line — the reader holds the week's cap, and, ONLY when a next week can follow (`nextWeekOpen`'s answer: none in a
 * final week or while Millionea ends), which week the template opens next and on what day. Never the purchase result's
 * "you can buy again when next week opens", which a final week cannot keep.
 */
export function capReachedLine(t: Dict, cap: number, nextOpenMs: number | null): string {
  return nextOpenMs === null
    ? fill(t.millionea.capReachedOnly, { cap })
    : fill(t.millionea.capReachedNote, { cap, week: eatIsoWeek(nextOpenMs).week, day: eatWeekday(t, nextOpenMs) });
}

/** What a ticket was paid, as gold may show it: a won ticket whose share is the player's — PAID — and nothing else
 *  (§M8a item 7, MB-43). A share held for review or forfeited is null here and shows no gold (its mark says which). */
export function earnedOf(row: Pick<MillioneaTicketRow, "shown" | "share" | "paid">): number | null {
  return row.shown === "won" && row.share === "paid" ? row.paid : null;
}

/**
 * ⭐ A RESULT NOTICE, SAID AS IT IS (round 3, RR3): `won` is true only for a PAID share, so the line branches on the shares
 * themselves, never on `won` alone —
 *   · paid (and any still held beside it — they won; their money waits) → "your ticket won", or the mixed line beside
 *     the losses;
 *   · none won but a share was FORFEITED after review → that, in the week's name — never the loss line (the ticket won,
 *     and the review took its share back, OD-07);
 *   · nothing won → the calm loss line.
 * A week whose every win is still HELD brings no RESULT at all until Compliance decides (the server's rule, RR3).
 */
export function resultLine(t: Dict, n: Extract<MillioneaNotice, { notice: "RESULT" }>, week: number, lost: number): string {
  const winning = n.winningTickets + n.held;
  if (winning > 0) {
    return lost > 0
      ? fill(t.millionea.resultMixed, { week, w: winning, l: lost })
      : counted(winning, t.millionea.resultWon, t.millionea.resultWonMany, { week });
  }
  if (n.forfeited > 0) return counted(n.forfeited, t.millionea.resultForfeitedOne, t.millionea.resultForfeited, { week });
  return counted(Math.max(lost, 1), t.millionea.resultLostOne, t.millionea.resultLost, { week });
}

/** The ticket a result's door opens: a PAID winning one (its seal plays on the reader's tap), else one still held, else a
 *  forfeited one — or null, and the door is Tiketi zangu's list. */
export function resultDoorSerial(mine: ReadonlyArray<Pick<MillioneaTicketRow, "serial" | "shown" | "share">>): string | null {
  const ticket = mine.find((x) => x.shown === "won" && x.share === "paid")
    ?? mine.find((x) => x.shown === "won")
    ?? mine.find((x) => x.shown === "forfeited");
  return ticket ? ticket.serial : null;
}

/** A voided week's refund on THIS ticket, as its own position says (MR-18, M3): landed, or still running — never a refund
 *  claimed before it happened. Null for every ticket of a week that did not void (and for a cancelled one). */
export function refundOf(row: Pick<MillioneaTicketRow, "refund">): "landed" | "pending" | null {
  return row.refund ? row.refund.state : null;
}

/** The fee's share of the jackpot, and each levy's share of the fee, as numbers of percent from what the settlement
 *  booked (the win ledger's "Ada 13%" and "TRA 10% · GBT 5% ya ada"). Null when there was no fee to divide. */
function shareOf(part: number, whole: number): number | null {
  return whole > 0 && Number.isFinite(part) ? pctNum(part / whole) : null;
}

/** ⭐ THE WIN LEDGER'S LINES (§10 §3.13), every one the settlement's. A floor week prints its top-up; the rounding
 *  remainder prints with where it went, as the register says it (`remainderFate`, MR-25): the next jackpot as far as the
 *  week's own money covered it, the guarantee for the rest — all of it in a week the guarantee topped up. */
export function winLinesOf(win: NonNullable<MillioneaTicketView["win"]>, finalWeek = false): WinLines {
  const tra = shareOf(win.traLevy, win.fee), gbt = shareOf(win.gbtLevy, win.fee);
  return {
    jackpot: win.jackpot,
    fee: win.fee,
    pct: shareOf(win.fee, win.jackpot) ?? 0,
    levies: tra !== null && gbt !== null ? { tra, gbt } : undefined,
    toWinners: win.toWinners,
    winningTickets: win.winners,
    perTicket: win.share,
    yours: win.yourWinningTickets,
    yourTotal: win.yourTotal,
    topUp: win.topUp > 0 ? win.topUp : undefined,
    remainder: win.remainder > 0 ? win.remainder : undefined,
    remainderFate: win.remainder > 0 ? remainderFate(win.remainder, win.carriedOut) : undefined,
    finalWeek: finalWeek || undefined,
    sunsetNoTopUp: win.basis === "TOP_SCORE" ? true : undefined,
  };
}

/**
 * The loss receipt's ten counted positions (§10 §3.14): each main, or the reserve that stood in for it — its question,
 * its pick, the world's result and the match, read off the one grader's final line. ⛔ No score is computed here.
 */
export function lossPositionsOf(locale: Locale, questions: readonly MillioneaQuestion[], slots: readonly MillioneaSlot[], line: SealLine): LossPosition[] {
  const q = new Map(questions.map((x) => [x.slot, x] as const));
  const pick = new Map(slots.map((s) => [s.slot, s.pick] as const));
  return line.mains.flatMap((m) => {
    const reserveOrdinal = m.standIn ? Number(m.standIn.slice(1)) : null;
    const slot = reserveOrdinal !== null ? MAIN_COUNT + reserveOrdinal : m.ordinal;
    const question = q.get(slot), p = pick.get(slot);
    const outcome = question?.outcome;
    if (!question || !p || (outcome !== "YES" && outcome !== "NO") || (m.mark !== "matched" && m.mark !== "missed")) return [];
    return [{ ordinal: m.ordinal, text: textIn(locale, question.text), pick: p, outcome, mark: m.mark, standIn: m.standIn }];
  });
}

// ── S5-R2-HUB · THE RESERVES' RULE UNDER ITS HEAD (the lead's ruling 2c, 2026-10-22) ───────────────────────────────────────
/**
 * The reserves' rule as it stands UNDER its head ("Reserves · A1–A5"): the decided sentence (`reserveRule`) without the
 * head's own words it opens with, its first letter a capital — "Count only when a main question voids, in order",
 * "Zinahesabiwa tu swali kuu likibatilishwa, kwa mpangilio", "仅在正选题作废时按顺序计入" — so it never repeats the head right
 * above it (the zh reader: "备选题 · A1–A5" over "备选题 A1–A5 仅在…"). A language whose sentence ever stops opening with its
 * head's words keeps the whole sentence: never a sentence cut wrong. ONE helper for every place that draws the pair — the
 * hub's questions, the slip's reserve step and the ticket's reserves (S5-R2-HUB 6 swapped the two at the merge's wiring).
 * The meaning is the decided one.
 */
export function reserveRuleAfterHead(t: Dict): string {
  const head = factsOf(t.millionea.reservesHead).join(" ");
  const rule = t.millionea.reserveRule;
  if (!rule.startsWith(`${head} `)) return rule;
  const rest = rule.slice(head.length + 1);
  return rest.charAt(0).toLocaleUpperCase() + rest.slice(1);
}
