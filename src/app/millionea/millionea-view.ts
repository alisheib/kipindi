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
import { counted, weekNumberOf } from "@/components/maswali/maswali-format";
import { MAIN_COUNT, type GradableQuestion, type MaswaliPick } from "@/lib/maswali-score";
import { remainderFate } from "@/lib/maswali-money";
import type { WeekState } from "@/lib/maswali-week-label";
import { marketCategoryLabel } from "@/lib/localized";
import { eatIsoWeek } from "@/lib/eat-day";
import { fill, pctNum } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

const DAY_MS = 86_400_000;

/** An instant the read model wrote, in ms, or null when it is not one. */
export function msOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** A week-frozen text in the reader's language (MR-6: each question froze in three languages at the open). */
export function textIn(locale: Locale, text: MillioneaText): string {
  return text[locale] || text.en;
}

/** A question's place within its role: M1…M10 and A1…A5 (the slot is 1…15, `slotOf`'s inverse). */
export function ordinalOf(q: { slot: number; role: MillioneaQuestion["role"] }): number {
  return q.role === "MAIN" ? q.slot : q.slot - MAIN_COUNT;
}

/** The fifteen, in slot order. */
export function bySlot<T extends { slot: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.slot - b.slot);
}

/** The grader's view of the fifteen: role, place, sealed outcome (L9). */
export function gradableOf(questions: readonly MillioneaQuestion[]): GradableQuestion[] {
  return questions.map((q) => ({ role: q.role, ordinal: ordinalOf(q), outcome: q.outcome }));
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

/** The ticket's fifteen clauses, mains first, each with this ticket's pick and the sealed outcome. */
export function clausesOf(t: Dict, locale: Locale, questions: readonly MillioneaQuestion[], slots: readonly MillioneaSlot[]): TicketClause[] {
  const pickAt = new Map(slots.map((s) => [s.slot, s.pick] as const));
  return bySlot(questions).flatMap((q) => {
    const pick = pickAt.get(q.slot);
    // Every slot of a ticket carries a pick (`canonicalPicks`); a row without one is not drawn rather than guessed.
    return pick ? [{
      role: q.role, ordinal: ordinalOf(q), category: marketCategoryLabel(t, q.category), text: textIn(locale, q.text),
      eventAt: msOf(q.eventStartsAt), pick, outcome: q.outcome,
    }] : [];
  });
}

/** The ISO week a week opened in, in EAT, `days` later: the next week's number and its open day (a year's end included). */
function weekAfter(opensAt: string, days: number): { week: number; atMs: number } | null {
  const at = msOf(opensAt);
  if (at === null) return null;
  const atMs = at + days * DAY_MS;
  return { week: eatIsoWeek(atMs).week, atMs };
}

/** The week a carry came from, as the ledger line names it ("Imeletwa mbele (Wiki 41)"): the week before this one. */
export function previousWeekNumber(opensAt: string): number {
  return weekAfter(opensAt, -7)?.week ?? 0;
}

/** The week after this one ("Imeletwa mbele kwenda Wiki 43"). */
export function nextWeekNumber(opensAt: string): number {
  return weekAfter(opensAt, 7)?.week ?? 0;
}

/**
 * ⭐ A WEEK'S POOL BLOCK FROM ITS DERIVED FIGURE (MR-28; `maswaliPoolFigure`, which every `maswali:pool` frame carries too).
 * The ticket count is the sales at the week's one frozen price — every ticket of a week costs the same (MR-11).
 * ⛔ The floor is passed through as the figure states it: null whenever it may not be shown (MB-56), and the block then
 * has no floor line.
 */
export function poolViewOf(fig: MaswaliPoolFigure, price: number, opensAt: string, voiding = false): PoolView {
  const carriedIn = fig.carryPendingCode !== null
    ? { week: weekNumberOf(fig.carryPendingCode), amount: null }
    : (fig.carryIn ?? 0) > 0 ? { week: previousWeekNumber(opensAt), amount: fig.carryIn } : null;
  const sales = { tickets: price > 0 ? Math.round(fig.sales / price) : 0, amount: fig.sales };
  const pool = (fig.carryIn ?? 0) + fig.sales;
  // A week whose void is already certain prints no jackpot and no "shared by every 10/10" rule: its refund, if the void
  // stands (the S5 UI review, HIGH 1).
  if (voiding) return { kind: "voiding", carriedIn, sales, pool, floor: fig.floor, price };
  return { kind: "selling", carriedIn, sales, pool, floor: fig.floor, jackpot: fig.jackpot };
}

/** The three phases of a week, from its own instants: sales from the open to the close; events from the first to the
 *  last; results from the last event to the latest void deadline (MR-16). Nothing is a typed day. */
export function phasesOf(week: Pick<MillioneaHubWeek, "opensAt" | "closesAt" | "questions">): WeekPhases | null {
  const open = msOf(week.opensAt), close = msOf(week.closesAt);
  const events = week.questions.map((q) => msOf(q.eventStartsAt)).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const deadlines = week.questions.map((q) => msOf(q.voidDeadlineAt)).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (open === null || close === null || events.length === 0) return null;
  const lastEvent = events[events.length - 1];
  return {
    salesFrom: open, salesTo: close,
    eventsFrom: events[0], eventsTo: lastEvent,
    resultsFrom: lastEvent, resultsTo: deadlines.length > 0 ? deadlines[deadlines.length - 1] : lastEvent,
  };
}

/** Which phase the week is in now: selling, its events running, or its results and payout. */
export function phaseNow(week: Pick<MillioneaHubWeek, "state">, phases: WeekPhases, nowMs: number): 0 | 1 | 2 {
  if (week.state === "OPEN" && nowMs < phases.salesTo) return 0;
  if (nowMs < phases.eventsTo) return 1;
  return 2;
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
