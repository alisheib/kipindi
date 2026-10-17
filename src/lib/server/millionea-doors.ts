/**
 * MASWALI MILLIONEA — ITS DOORS ON OTHER PLATFORM PAGES (MASWALI-BUILD S5 composition; MASWALI-PLAN §7b S5 items 4–5;
 * DESIGN_AUTHORITY §M8a item 11).
 *
 * The journey home's card, the classic board's card, the classic More rows and the classic /positions row each ask the
 * same two questions — may this request be shown Millionea at all, and what does the week say — and this file is the one
 * place they are answered, React-cached per request, so two doors on one page can never disagree.
 *
 * ⛔ A HIDDEN PRODUCT HAS NO DOOR (MR-2): `visible` is the rollout's per-request answer (`resolveMillionea`); below it no
 *    door is drawn, no link is written and nothing is read.
 * ⛔ NO DOOR ON A BREAK (§10 §3.1, the refusals table): a reader whose cooling-off or self-exclusion runs is shown none —
 *    the card is not drawn, and the More row and the board's card follow the same answer. Read beside the page and failing
 *    OPEN, as the board's own bet controls do (`/updown`'s R6-A): it hides an invitation, and the money path refuses a
 *    purchase on a break whatever a door showed.
 * ⛔ READS ONLY, and nothing here throws: a door that cannot be answered is not drawn.
 */
import { cache } from "react";
import { resolveMillionea } from "./millionea-preview";
import { getSession } from "./session";
import { millioneaHub, type MillioneaHub } from "./maswali-player";
import { getMaswaliConfig } from "./maswali-config";
import { frozenRules } from "./maswali-service";
import { ticketStore, weekStore } from "./maswali-dal";
import { isLockedOut } from "./responsible-gambling";
import { breakStateOf, type BreakState } from "@/lib/break-end";
import type { RolloutState } from "@/lib/millionea-rollout";

/** Who is asking, as the doors need it. */
export type MillioneaDoor = {
  /** The rollout lets this request see Millionea. */
  visible: boolean;
  /** …at STAFF_PREVIEW, under the preview mark. */
  preview: boolean;
  state: RolloutState;
  userId: string | null;
};

const HIDDEN: MillioneaDoor = { visible: false, preview: false, state: "WITHDRAWN", userId: null };

/** ⭐ THE PER-REQUEST ANSWER every Millionea door asks first. Never throws: a failure hides every door. */
export const millioneaDoor = cache(async (): Promise<MillioneaDoor> => {
  try {
    const r = await resolveMillionea();
    if (!r.visible) return { ...HIDDEN, state: r.state };
    let userId: string | null = null;
    try { userId = (await getSession())?.userId ?? null; } catch { userId = null; }
    return { visible: true, preview: r.preview, state: r.state, userId };
  } catch {
    return HIDDEN;
  }
});

/** The hub's read model for this request — one read however many doors draw from it; null when it cannot be read. */
export const millioneaHubNow = cache(async (userId: string | null, state: RolloutState): Promise<MillioneaHub | null> => {
  try {
    return await millioneaHub({ userId, state });
  } catch {
    return null;
  }
});

/**
 * The configured share of the jackpot taken at a payout — printed ONLY where no week froze one (no week sells or is being
 * graded); a week's own surfaces always print its frozen rate (L2: admins can change everything). Null if unreadable.
 */
export function configuredFeeRate(): number | null {
  try {
    const rate = getMaswaliConfig().jackpotFeeRate;
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

/** The signed-in reader's running break or self-exclusion, or null. Fails OPEN (the header note). */
export const millioneaBreakOf = cache(async (userId: string | null): Promise<BreakState | null> => {
  if (!userId) return null;
  try {
    return breakStateOf(await isLockedOut(userId));
  } catch {
    return null;
  }
});

/**
 * Each week's frozen ticket price (MR-11: the week's own `rulesSnapshot`), by week id — what every ticket of that week
 * cost, as Tiketi zangu's cards print it. A week whose rules cannot be read is left out (its cards are not drawn rather
 * than priced by a guess).
 */
export async function millioneaWeekPrices(weekIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const id of new Set(weekIds)) {
    try {
      const week = await weekStore.get(id);
      const price = week ? frozenRules(week)?.ticketPriceTzs : undefined;
      if (typeof price === "number" && Number.isSafeInteger(price) && price > 0) out.set(id, price);
    } catch { /* unread: left out */ }
  }
  return out;
}

/**
 * ⭐ MAY THIS REQUEST BE SHOWN THE DOOR TO ITS OWN MILLIONEA TICKETS? (the lead's decision L5: a kill hides the product,
 * never a player's own tickets) — Tiketi zangu's third kind and the classic /positions row: the product visible to it,
 * or, hidden, a signed-in account that HOLDS a ticket (`millioneaTicketGate`'s own rule). Never throws: a failure hides it.
 */
export const millioneaTicketsDoor = cache(async (): Promise<boolean> => {
  const door = await millioneaDoor();
  if (door.visible) return true;
  try {
    const userId = (await getSession())?.userId ?? null;
    return userId ? (await ticketStore.listForUser(userId, { limit: 1 })).length > 0 : false;
  } catch {
    return false;
  }
});
