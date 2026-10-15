/**
 * THE GUEST SHEET'S RULES — every decision the journey's bet sheet makes for a reader who is NOT signed in, as pure
 * functions (the Vodacom plan S10, `docs/VODACOM-PLAN.md` §3.7; `docs/design-system/v5-2026-09-29-simplified-journey/
 * S10-PLAN.md` WP1, with its amendments). The guest host (WP4) and the sheet's guest face (WP3) hand every fact in and
 * render what comes out; nothing here draws, fetches, stores or reads a clock.
 *
 * ⭐ ONE SHEET, TWO FACES. A guest's frame IS S8's frame (`sheetFrame`) with no viewer half — the wallet unread, no intent,
 * no answer — so the stake, its bounds, the chips and the estimate are the money face's own, figure for figure. The plan
 * then asks the market's half alone (`viewerUnread`), so the only frames are edit (inside or outside the bounds) and
 * closed. ⛔ NEVER A COMMIT: `guestFrame` withholds the CTA and both quotes, so nothing drawn from it can place a bet, and
 * it draws no balance (the face leaves the row out; the frame's balance is S8's "unknown", never a figure).
 *
 * ⭐ THE DOORS CARRY THE BET (`guestCarry`): the bet with the stake the visitor chose (only a stake inside the bounds —
 * Open point 6), the selection marker this browser writes when a door is pressed (`writeMarker` with NO key and NO owner:
 * a keyless guest choice may cross its own sign-in, pending-bet.ts), the address the door leaves behind (Back from the
 * auth page reopens the sheet at that stake) and the `next` the door carries — the bet's return page rebuilt from its
 * path and the bet alone (`betReturnPath`, `pendingBetUrl`). The codes ride the door's tail (`doorHrefsFor`,
 * auth-landing.ts), never `next`.
 *
 * ⭐ A LINK NEVER SETS A STAKE (`guestOpensFrom`): an address opens at the stake only when this tab's own ownerless, keyless
 * marker under 24 hours old names the same bet (`stakeFromUrl` with no owner) — a forwarded link opens at the minimum.
 *
 * ⭐ ONE COUNT PER VISITOR OPEN (`countsSheetOpen`, Open point 9): a tap always counts; an address open counts unless it
 * continues a visitor's own counted open (`returnedOpen`). Both hosts ask this one predicate.
 *
 * Client-safe and pure: it imports only `sheet-state.ts` and `pending-bet.ts`. `test:guest-sheet` §6 holds that list.
 */
import { sheetFrame, sheetOpensOn, withBet, type SheetFrame, type SheetFrameInput, type SheetSide } from "./sheet-state";
import {
  attributionFrom, betReturnPath, formatBetParam, parseBetParam, pendingBetFrom, pendingBetUrl, readMarker, stakeFromUrl, writeMarker,
  type PendingBet,
} from "./pending-bet";

type MarketBet = Extract<PendingBet, { kind: "market" }>;

/** What a guest's frame is handed: the money face's input with no viewer, no intent and no answer. */
export type GuestFrameInput = Pick<SheetFrameInput, "seed" | "side" | "stakeText" | "nowMs" | "offsetMs">;

/**
 * ⭐ THE GUEST'S FRAME: `sheetFrame` with the viewer's half unread (`failed`), no intent and no answer — edit or closed —
 * with the CTA and both quotes withheld. Every other field is the money face's for the same inputs.
 */
export function guestFrame(input: GuestFrameInput): SheetFrame {
  const f = sheetFrame({ ...input, viewer: { state: "failed" }, intent: null, settled: null });
  return { ...f, cta: null, quote: null, betInsteadQuote: null };
}

/** The stake a door carries: the edit frame's stake when it is inside the bounds, else null (the minimum on return). */
export function carriedStake(frame: SheetFrame): number | null {
  return frame.frame === "edit" && frame.breaks === null && frame.stake !== null && Number.isSafeInteger(frame.stake) && frame.stake > 0
    ? frame.stake
    : null;
}

export type GuestCarry = {
  /** The bet the doors carry: the stake only when it is inside the bounds. */
  bet: MarketBet;
  /** The selection marker the doors write (sessionStorage), keyless and ownerless, with the page's own codes. */
  markerRaw: string;
  /** The address the door leaves behind (path + query with `bet` set, every other parameter kept). */
  address: string;
  /** The page the visitor returns to after signing in or up, with the bet: `next`. */
  next: string;
};

/**
 * ⭐ WHAT A DOOR CARRIES. Null when the bet cannot be written (a seed id or side the grammar refuses). `search` is the
 * page's own query (with or without its "?"); `stake` is `carriedStake`'s answer.
 */
export function guestCarry(i: { pathname: string; search: string; seedId: string; side: SheetSide; stake: number | null; nowMs: number }): GuestCarry | null {
  const sideOnly: MarketBet = { kind: "market", id: i.seedId, side: i.side, stake: null };
  // A stake no bet can hold (not a whole positive number, or longer than the grammar's nine digits) leaves the side alone.
  const staked = i.stake !== null && Number.isSafeInteger(i.stake) && i.stake > 0 ? parseBetParam(formatBetParam({ ...sideOnly, stake: i.stake })) : null;
  const bet = staked ?? parseBetParam(formatBetParam(sideOnly));
  if (!bet || bet.kind !== "market" || bet.id !== i.seedId || bet.side !== i.side) return null;
  const markerRaw = writeMarker(bet, i.nowMs, attributionFrom(new URLSearchParams(i.search)));
  return { bet, markerRaw, address: i.pathname + withBet(i.search, bet), next: pendingBetUrl(betReturnPath(i.pathname, bet), bet) };
}

/**
 * ⭐ WHAT AN ADDRESS OPENS for a guest: the market bet `?bet=` (or a question page's legacy `?side=`) names on a page that
 * draws journey picks, and the stake it may open at — this tab's own ownerless marker's, else null (the minimum).
 * `dropSide`: the address carried `?side=` rather than `?bet=`, so closing strips `side` too. Null for anything else: a
 * round, a malformed bet, or a page that is not a `SHEET_PAGES` page (`/wallet/*`, `/auth/*`…).
 */
export function guestOpensFrom(pathname: string, search: string | URLSearchParams, markerRaw: string | null | undefined, nowMs: number):
  { bet: MarketBet; stake: number | null; dropSide: boolean } | null {
  if (!sheetOpensOn(pathname)) return null;
  const q = new URLSearchParams(search);
  const bet = pendingBetFrom(pathname, q);
  if (!bet || bet.kind !== "market") return null;
  return { bet, stake: stakeFromUrl(bet, markerRaw, nowMs), dropSide: !q.has("bet") };
}

/**
 * True only when this tab's ownerless, keyless marker under 24 hours old names the address's bet WITH its stake — the
 * marker a guest door wrote, so the open continues that visitor's own counted open. The money host stamps an owner on
 * every marker it writes, so its own never qualify.
 */
export function returnedOpen(markerRaw: string | null | undefined, bet: PendingBet | null, nowMs: number): boolean {
  if (!bet || bet.stake === null) return false;
  const m = readMarker(markerRaw, nowMs);
  return m !== null && m.k === undefined && m.owner === undefined && m.bet === formatBetParam(bet);
}

/** ⭐ ONE COUNT PER VISITOR OPEN: a tap always counts; an address open counts unless `returnedOpen` says it continues one. */
export function countsSheetOpen(o: { tapped: boolean; markerRaw: string | null | undefined; bet: PendingBet | null; nowMs: number }): boolean {
  return o.tapped || !returnedOpen(o.markerRaw, o.bet, o.nowMs);
}
