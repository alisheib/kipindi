/**
 * WHAT THE MILLIONEA CARD SAYS (MASWALI-BUILD S5 composition; MASWALI-PLAN §10 §3.1–§3.2; DESIGN_AUTHORITY §M8a item 11).
 *
 * The card's props from the hub's own read model (`millioneaHub`), so the card on the journey home or at the head of the
 * classic board and the hub it opens can never disagree. Pure, and CLIENT-FREE on purpose: the journey home is `/`, and
 * a client module any of its server files reaches joins `/`'s first load for every visitor (VODACOM-PLAN §0h point 20,
 * `test:journey-home` 7.client) — so this file reaches nothing that draws.
 *
 * ⛔ An unearned figure, and a figure only (§M8a item 7, §C3): the headline a week prints, never a share a ticket might
 *    take; the card shows no countdown (the close is a printed time) and polls nothing.
 */
import type { MillioneaHub } from "@/lib/server/maswali-player";
import type { HomeCardState } from "@/components/maswali/maswali-home-card";
import { eatWeekday, weekNumberOf } from "@/components/maswali/maswali-format";
import { millioneaWeekPhase, weekPhaseWord } from "@/app/millionea/millionea-view";
import { eatDayKey, eatIsoWeek, eatNextWeekAt } from "@/lib/eat-day";
import { pctNum } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";


/** The card's props (`MaswaliHomeCard`), minus the dictionary. `atLeast` and `pendingWeek` say a carry still waiting on
 *  an earlier week (§M8a item 9): the figure is then a true lower bound, never an exact jackpot. */
export type HomeCardModel = {
  week: number; jackpot: number | null; pct: number; cap: number; state: HomeCardState; finalWeek: boolean;
  atLeast: boolean; pendingWeek: number | null;
};

/** The week's opening on the published template (`maswali-config.ts`: its weekday, 1 = Monday, and its EAT time). */
export type OpenTemplate = { weekday: number; clock: string };

/**
 * ⭐ WHEN THE NEXT WEEK OPENS — the template's next open after `nowMs` (MR-3, R-WEEK: this ISO week's while it is still
 * ahead, else next week's), through the EAT calendar's own helpers, never a typed seven days after a week opened (the S5
 * review of 24ec0d33, MEDIUM 5). ⛔ NONE while no week can follow: a final week is the week shown, a final week runs
 * (ENDING), or Millionea has ended (RETIRED) — the card and the hub then promise no next week. A fact of the published
 * schedule, never a promise that a week will open (OD-27). Null when the template cannot be read.
 */
export function nextWeekOpen(hub: Pick<MillioneaHub, "life" | "week">, template: OpenTemplate | null, nowMs: number): number | null {
  if (template === null || hub.life === "ENDING" || hub.life === "RETIRED" || hub.week?.isFinal === true) return null;
  try {
    return eatNextWeekAt(nowMs, template.weekday, template.clock);
  } catch {
    return null;
  }
}

function msOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * ⭐ THE CARD, FROM THE HUB'S READ MODEL — or null when it must not be drawn.
 *   · a week on sale: its close, the reader's tickets of the cap, and — at the cap — when the next week opens
 *     (`nextOpenMs`, `nextWeekOpen`'s answer: none in a final week or while Millionea ends); a carry still waiting on an
 *     earlier week makes the figure "at least" and names that week (§M8a item 9, as the hub's pool block does); and the
 *     week's frozen ticket price, which the card says to a reader who holds no ticket this week (the critic's M7);
 *   · paused by an operator: no figure (§10 §3.1);
 *   · sales closed, results arriving: how many of the fifteen are out, and where the week stands after them — the one
 *     answer every surface says (S5-FIX-PLAYER's `millioneaWeekPhase`, the critic's P6 on the card: "15 of 15 results in",
 *     then nothing): the objection window and its end while it runs, then "Settling" — unless its void is certain (MR-18):
 *     then "being voided", with no jackpot and no rule (the S5 UI review, MEDIUM 7);
 *   · no week on sale: the last settled week's line — or a voided one's, its refunds landed or on their way — else the
 *     day and date the next one opens (MB-84: no pre-sale).
 * `fallbackRate` is the configured fee share, used ONLY where no week froze one; a week's card prints its frozen rate (L2).
 * ⛔ A week whose figure cannot be read draws no card, rather than a rule without its rate.
 */
export function homeCardOf(t: Dict, hub: MillioneaHub, fallbackRate: number | null, nowMs: number, nextOpenMs: number | null = null): HomeCardModel | null {
  const exact = { atLeast: false, pendingWeek: null };
  const w = hub.week;
  if (w) {
    if (!w.pool) return null;
    const base = { week: weekNumberOf(w.code), pct: pctNum(w.pool.feeRate), cap: w.ticketCap, finalWeek: w.isFinal };
    // The figure as the pool states it: "at least" while R waits on an earlier week, and that week named (§M8a item 9).
    const bound = { atLeast: w.pool.atLeast, pendingWeek: w.pool.carryPendingCode ? weekNumberOf(w.pool.carryPendingCode) : null };
    const closesAt = msOf(w.closesAt);
    if (w.state === "OPEN" && hub.paused) return { ...base, ...exact, jackpot: null, state: { kind: "paused" } };
    if (w.state === "OPEN" && closesAt !== null && closesAt > nowMs) {
      const held = w.mine?.held ?? null;
      const next = nextOpenMs === null ? null : { week: eatIsoWeek(nextOpenMs).week, opensOn: eatWeekday(t, nextOpenMs) };
      const capFull = held !== null && held >= w.ticketCap ? { next } : undefined;
      // The week's frozen price (MR-11, the hub's `ticketPrice`): the card says what a ticket costs to a reader who holds none.
      return { ...base, ...bound, jackpot: w.pool.jackpot, state: { kind: "open", closesAt, held, price: w.ticketPrice, capFull } };
    }
    const phase = millioneaWeekPhase(w, nowMs);
    if (phase.kind === "voiding") return { ...base, ...exact, jackpot: null, state: { kind: "voiding" } };
    return { ...base, ...bound, jackpot: w.pool.jackpot, state: { kind: "closed", resultsIn: w.resultsOut, phase: { kind: phase.kind, objectionsUntil: phase.objectionsUntil, word: weekPhaseWord(t, w.state, phase) } } };
  }
  if (fallbackRate === null || !Number.isFinite(fallbackRate)) return null;
  const pct = pctNum(fallbackRate);
  const last = hub.lastWeek;
  if (last && last.state === "VOIDED") {
    return { week: weekNumberOf(last.code), pct, cap: 0, finalWeek: last.isFinal, ...exact, jackpot: null, state: { kind: "voided", refundsPending: last.refundsPending } };
  }
  if (last && last.state === "SETTLED") {
    const week = weekNumberOf(last.code);
    if ((last.winners ?? 0) > 0) {
      return { week, pct, cap: 0, finalWeek: last.isFinal, ...exact, jackpot: last.jackpot, state: { kind: "settledWon", winners: last.winners ?? 0 } };
    }
    return { week, pct, cap: 0, finalWeek: last.isFinal, ...exact, jackpot: null, state: { kind: "settledRollover", carried: last.carriedForward ?? 0 } };
  }
  const opens = msOf(hub.nextOpensAt);
  if (opens !== null && hub.life !== "RETIRED") {
    // The day AND its date (the critic's L10): the next open is the template's next one, always within seven days, so a bare
    // weekday read on that same weekday ("Opens Monday", said on a Monday) could mean today or a week ahead.
    return { week: eatIsoWeek(opens).week, pct, cap: 0, finalWeek: false, ...exact, jackpot: null, state: { kind: "presale", opensOn: eatWeekday(t, opens), opensDay: eatDayKey(opens) } };
  }
  return null;
}
