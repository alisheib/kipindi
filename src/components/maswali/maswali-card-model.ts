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
import { eatIsoWeek } from "@/lib/eat-day";
import { pctNum } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";

const DAY_MS = 86_400_000;

/** The card's props (`MaswaliHomeCard`), minus the dictionary. */
export type HomeCardModel = { week: number; jackpot: number | null; pct: number; cap: number; state: HomeCardState; finalWeek: boolean };

function msOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * ⭐ THE CARD, FROM THE HUB'S READ MODEL — or null when it must not be drawn.
 *   · a week on sale: its close, the reader's tickets of the cap, and — at the cap — when the next week opens (a week
 *     later than this one opened: the template's own weekday, MR-3);
 *   · paused by an operator: no figure (§10 §3.1);
 *   · sales closed, results arriving: how many of the fifteen are out;
 *   · no week on sale: the last settled week's line, else the day the next one opens (MB-84: no pre-sale).
 * `fallbackRate` is the configured fee share, used ONLY where no week froze one; a week's card prints its frozen rate (L2).
 * ⛔ A week whose figure cannot be read draws no card, rather than a rule without its rate.
 */
export function homeCardOf(t: Dict, hub: MillioneaHub, fallbackRate: number | null, nowMs: number): HomeCardModel | null {
  const w = hub.week;
  if (w) {
    if (!w.pool) return null;
    const base = { week: weekNumberOf(w.code), pct: pctNum(w.pool.feeRate), cap: w.ticketCap, finalWeek: w.isFinal };
    const closesAt = msOf(w.closesAt);
    if (w.state === "OPEN" && hub.paused) return { ...base, jackpot: null, state: { kind: "paused" } };
    if (w.state === "OPEN" && closesAt !== null && closesAt > nowMs) {
      const held = w.mine?.held ?? null;
      const opened = msOf(w.opensAt);
      const nextOpen = opened === null ? null : opened + 7 * DAY_MS;
      const capFull = held !== null && held >= w.ticketCap && nextOpen !== null
        ? { nextWeek: eatIsoWeek(nextOpen).week, opensOn: eatWeekday(t, nextOpen) }
        : undefined;
      return { ...base, jackpot: w.pool.jackpot, state: { kind: "open", closesAt, held, capFull } };
    }
    return { ...base, jackpot: w.pool.jackpot, state: { kind: "closed", resultsIn: w.resultsOut } };
  }
  if (fallbackRate === null || !Number.isFinite(fallbackRate)) return null;
  const pct = pctNum(fallbackRate);
  const last = hub.lastWeek;
  if (last && last.state === "SETTLED") {
    const week = weekNumberOf(last.code);
    if ((last.winners ?? 0) > 0) {
      return { week, pct, cap: 0, finalWeek: last.isFinal, jackpot: last.jackpot, state: { kind: "settledWon", winners: last.winners ?? 0 } };
    }
    return { week, pct, cap: 0, finalWeek: last.isFinal, jackpot: null, state: { kind: "settledRollover", carried: last.carriedForward ?? 0 } };
  }
  const opens = msOf(hub.nextOpensAt);
  if (opens !== null && hub.life !== "RETIRED") {
    return { week: eatIsoWeek(opens).week, pct, cap: 0, finalWeek: false, jackpot: null, state: { kind: "presale", opensOn: eatWeekday(t, opens) } };
  }
  return null;
}
