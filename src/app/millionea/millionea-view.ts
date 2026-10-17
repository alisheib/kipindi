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
 * ⭐ THE SERVER LANE'S SECOND ROUND LANDS HERE, AND ONLY HERE (the lead's note of 2026-10-17): a held or forfeited share
 *    (`earnedOf`), a refund decided per ticket with its pending state (`refundOf`), the pool frame's visibility (the live
 *    figure listens for its own week only, `poolViewOf`'s caller) — so each change is a line, not a page.
 */
import type {
  MaswaliPoolFigure, MillioneaHubWeek, MillioneaQuestion, MillioneaSlot, MillioneaText, MillioneaTicketRow,
  MillioneaTicketView,
} from "@/lib/server/maswali-player";
import { sealLineOf, type SealLine } from "@/components/maswali/maswali-seal-line";
import type { SlipQuestion } from "@/components/maswali/maswali-slip";
import type { TicketClause } from "@/components/maswali/maswali-ticket";
import type { PoolView } from "@/components/maswali/maswali-pool-figure";
import type { WeekPhases } from "@/components/maswali/maswali-week-strip";
import type { LossPosition, WinLines } from "@/components/maswali/maswali-win-ledger";
import { weekNumberOf } from "@/components/maswali/maswali-format";
import { MAIN_COUNT, type GradableQuestion, type MaswaliPick } from "@/lib/maswali-score";
import type { WeekState } from "@/lib/maswali-week-label";
import { marketCategoryLabel } from "@/lib/localized";
import { eatIsoWeek } from "@/lib/eat-day";
import { pctNum } from "@/lib/utils";
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
  return sealLineOf(gradableOf(questions), picksOf(slots), { weekVoid: weekState === "VOIDED" });
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
export function poolViewOf(fig: MaswaliPoolFigure, price: number, opensAt: string): PoolView {
  const carriedIn = fig.carryPendingCode !== null
    ? { week: weekNumberOf(fig.carryPendingCode), amount: null }
    : (fig.carryIn ?? 0) > 0 ? { week: previousWeekNumber(opensAt), amount: fig.carryIn } : null;
  return {
    kind: "selling",
    carriedIn,
    sales: { tickets: price > 0 ? Math.round(fig.sales / price) : 0, amount: fig.sales },
    pool: (fig.carryIn ?? 0) + fig.sales,
    floor: fig.floor,
    jackpot: fig.jackpot,
  };
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

/** ⭐ ROUND 2's SEAM · what a ticket was paid, as gold may show it: a won ticket's share, and nothing else (§M8a item 7).
 *  When the read model learns held and forfeited shares, a forfeited share returns null here and shows no gold. */
export function earnedOf(row: Pick<MillioneaTicketRow, "shown" | "paid">): number | null {
  return row.shown === "won" ? row.paid : null;
}

/** ⭐ ROUND 2's SEAM · a voided week's refund on THIS ticket: landed, or still running. Never claimed before it happened. */
export function refundOf(view: Pick<MillioneaTicketView, "weekVoid">): "landed" | "pending" | null {
  if (!view.weekVoid) return null;
  return view.weekVoid.refundedAt ? "landed" : "pending";
}

/** The fee's share of the jackpot, and each levy's share of the fee, as numbers of percent from what the settlement
 *  booked (the win ledger's "Ada 13%" and "TRA 10% · GBT 5% ya ada"). Null when there was no fee to divide. */
function shareOf(part: number, whole: number): number | null {
  return whole > 0 && Number.isFinite(part) ? pctNum(part / whole) : null;
}

/** ⭐ THE WIN LEDGER'S LINES (§10 §3.13), every one the settlement's. A floor week prints its top-up; the rounding
 *  remainder only in a week the house did not top up (`MillioneaTicketView.win.remainder`'s own rule, MR-25). */
export function winLinesOf(win: NonNullable<MillioneaTicketView["win"]>): WinLines {
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
    remainder: win.topUp === 0 && win.remainder > 0 ? win.remainder : undefined,
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
