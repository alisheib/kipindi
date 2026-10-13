/**
 * THE BET SHEET'S RULES — every decision the journey's bet sheet makes, as pure functions (the Vodacom plan S8,
 * `docs/VODACOM-PLAN.md` §3.3 and §3.4; `docs/design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md` WP2, with its
 * amendments A2, A3, A8, A9, A10 and A24). Nothing here draws, fetches, stores or reads a clock: the sheet (WP6) and its
 * host (WP7) hand every fact in, the server-offset "now" included, and render what comes out.
 *
 * ⭐ EVERY FIGURE IS THE ENGINE'S. The estimate is `estimateFor` at the entered stake (`sheetEstimate`); every low-balance
 * figure is `shortfallPlan`'s (`sheetPlan`), `leftAfter` and the "bet instead" stake included. This module adds no
 * arithmetic on money: it chooses a frame, a line and a button, and names the dictionary key each one reads.
 *
 * ⭐ EXACTLY ONCE (S8-PLAN "Exactly once", A2). One idempotency key per intent. A tap freezes the quote — the market, the
 * side and the stake exactly as the tapped button prints it — and `nextKey` decides whether that tap reuses the intent's
 * key or mints a new one:
 *   · a second tap while placing reuses it (the server answers the first bet by its key);
 *   · an intent IN DOUBT (its answer lost: a throw, an unknown shape, the placing watchdog) only ever sends ITS key and
 *     ITS frozen quote again, until the server has said what happened — an edited stake is never sent under that key;
 *   · after admission's BUSY (nothing ran) the retry reuses the key while the stake is unchanged;
 *   · every other answer ends the intent, and the next tap mints a fresh key.
 * The request (`requestFor`) carries `marketId`, `side` (YES or NO only), `stake` as digits, `idempotencyKey` and
 * the three fields `funnelBetFields` sets for the origin `sheet` — nothing else, and never a house key.
 *
 * ⛔ THE SHEET COMPUTES NO BALANCE (A9). The balance row shows the server's spendable figure as read; while the first read
 * is out it is loading, not unavailable; a failed read is `unknown` (the server decides), never zero.
 *
 * Client-safe and pure: it imports only `estimate.ts`, `shortfall.ts`, `failure-reasons.ts` (types), `pending-bet.ts`,
 * `funnel-beacon.ts`'s `funnelBetFields` and `stake-math.ts`'s `quickStakes` / `parseStake`. `test:bet-sheet` §6 holds
 * that list, and that no rate, multiple or shilling amount is typed here.
 */
import { estimateFor, type Estimate, type EstimateRates } from "@/lib/markets/estimate";
import {
  shortfallPlan,
  depositRequestFor,
  type BetInsteadOption,
  type DepositOption,
  type ShortfallBlock,
  type ShortfallInput,
  type ShortfallPlan,
} from "./shortfall";
import type { FailureReason } from "@/lib/failure-reasons";
import { formatBetParam, parseBetParam, readMarker, type PendingBet } from "./pending-bet";
import { funnelBetFields } from "./funnel-beacon";
import { parseStake, quickStakes } from "@/components/updown/stake-math";

export type SheetSide = "YES" | "NO";

/* ─── What the sheet is handed ────────────────────────────────────────────────────────────────────────────────── */

/**
 * THE CARD'S SEED — the market's public half, rendered by the server into the card (`sheetSeedFor`, WP3), so the sheet
 * draws on the tap frame. `serverNow` is the server's clock when it was rendered.
 */
export type SheetSeed = {
  v: 1;
  id: string;
  yesPool: number;
  noPool: number;
  rates: EstimateRates | null;
  feePct: number | null;
  min: number;
  max: number;
  /** When betting closes, ISO; null when the market carries neither close nor resolution time. */
  closesAt: string | null;
  serverNow: number;
  /** The market took a bet when the seed was rendered (the bet path's own test). */
  bettable: boolean;
};

export type SheetBounds = { min: number; max: number };

/** Every `ShortfallInput` fact but the stake, the market, its bounds and the clock (WP3's `facts`). */
export type SheetFacts = Omit<ShortfallInput, "stake" | "market" | "bounds" | "nowMs" | "deposit"> & {
  deposit: ShortfallInput["deposit"] & { railNames?: string[] };
};

/** The signed-in half (`?me=1`), as read. */
export type SheetViewer = {
  /** The server's spendable figure (balance + bonus); null when the wallet could not be read. */
  spendable: number | null;
  heldSides: SheetSide[];
  /** SJ-22's bonus line: the viewer holds the other side and a grant still has wagering left. */
  bonusWager: { remaining: number } | null;
  /** Null when any of the facts' reads failed — unknown, never zero. */
  facts: SheetFacts | null;
};

/** A9 · the viewer's half is loading (no answer yet), failed, or read. */
export type SheetViewerRead = { state: "loading" } | { state: "failed" } | { state: "read"; viewer: SheetViewer };

/* ─── The clock: the server's, offset from the phone's ─────────────────────────────────────────────────────────── */

/** The server's clock minus the phone's, measured when the seed arrived: add it to a phone time to read server time. */
export function clockOffset(serverNow: number, receivedAtMs: number): number {
  return Number.isFinite(serverNow) && Number.isFinite(receivedAtMs) ? serverNow - receivedAtMs : 0;
}

/**
 * ⭐ THE SHEET'S OWN CLOSED FLIP (§3.3): closed when the seed says the market took no bet, or once the server-offset clock
 * reaches `closesAt` — the dial's rule (`phoneNow + offset ≥ close`), read on the caller's tick. `nowMs` is the phone's.
 */
export function closedAt(seed: SheetSeed, nowMs: number, offsetMs = 0): boolean {
  if (!seed.bettable) return true;
  if (seed.closesAt === null) return false;
  const close = Date.parse(seed.closesAt);
  return Number.isFinite(close) && nowMs + offsetMs >= close;
}

/* ─── Where the address opens a sheet (A3 item 1) ─────────────────────────────────────────────────────────────── */

/** The pages that draw journey picks — the only ones whose address (`?bet=`, `?side=`) opens the sheet. */
export const SHEET_PAGES: readonly string[] = ["/", "/markets/[id]", "/live", "/watchlist"];

const MARKET_ID = /^mkt_[A-Za-z0-9]{1,64}$/;

/** True only on a `SHEET_PAGES` path. Never `/wallet/*`, `/profile/*`, `/positions/*`, `/help` or `/auth/*`. */
export function sheetOpensOn(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  const path = pathname.split("?")[0].split("#")[0];
  const bare = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return SHEET_PAGES.some((p) => {
    if (p === bare) return true;
    if (p !== "/markets/[id]") return false;
    const seg = bare.split("/");
    return seg.length === 3 && seg[0] === "" && seg[1] === "markets" && MARKET_ID.test(seg[2]);
  });
}

/**
 * The address with the bet set, or with it removed — every other parameter kept (`cat`, `q`, `page`, `from`, A24 item 5).
 * After a receipt the host replaces the entry with `withoutBet` (A3 item 3); a sheet opened from `?side=` strips `side`.
 */
export function withBet(search: string, bet: PendingBet): string {
  const p = new URLSearchParams(search);
  p.set("bet", formatBetParam(bet));
  return `?${p.toString()}`;
}
export function withoutBet(search: string, dropSide: boolean): string {
  const p = new URLSearchParams(search);
  p.delete("bet");
  if (dropSide) p.delete("side");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/* ─── The stake, the chips and the estimate ───────────────────────────────────────────────────────────────────── */

/** The bound a typed stake breaks, for the bounds line (§0g); `empty` draws no line. */
export type StakeBreak = "empty" | "notWhole" | "below" | "above";

/**
 * ⭐ THE STAKE as typed: a whole positive number of shillings (`parseStake`), or null with the bound it breaks. Grouping
 * marks and the currency word are ignored; a decimal part that is not all zeros is `notWhole`, never rounded away.
 */
export function sheetStake(text: string, bounds: SheetBounds): { stake: number | null; breaks: StakeBreak | null } {
  const raw = typeof text === "string" ? text.trim() : "";
  const dot = raw.lastIndexOf(".");
  const whole = dot >= 0 ? raw.slice(0, dot) : raw;
  if (dot >= 0 && /[1-9]/.test(raw.slice(dot + 1))) return { stake: null, breaks: "notWhole" };
  const n = parseStake(whole);
  if (n === null) return { stake: null, breaks: /\d/.test(whole) ? "notWhole" : "empty" };
  if (n < bounds.min) return { stake: n, breaks: "below" };
  if (n > bounds.max) return { stake: n, breaks: "above" };
  return { stake: n, breaks: null };
}

/** The stake the sheet opens at: the address's own stake (only when `stakeFromUrl` allowed it), else the minimum (A24). */
export function sheetPreset(bounds: SheetBounds, allowedFromUrl: number | null): number {
  return allowedFromUrl !== null && Number.isSafeInteger(allowedFromUrl) && allowedFromUrl >= bounds.min && allowedFromUrl <= bounds.max
    ? allowedFromUrl
    : bounds.min;
}

/**
 * THE CHIPS: `quickStakes(min, max)` — filtered to the bounds, never to the balance (SJ-10) — less every chip above the
 * loss room when the plan is the loss room (the panel's A3). Full figures: the label is the component's `formatTzs`,
 * never `stakeChipLabel`'s short form.
 */
export function sheetChips(bounds: SheetBounds, plan: SheetPlan | null): number[] {
  const chips = quickStakes(bounds.min, bounds.max).filter((c) => c >= bounds.min && c <= bounds.max);
  if (plan && plan.kind === "blocked" && plan.reason === "loss_limit" && typeof plan.headroom === "number") {
    return chips.filter((c) => c <= (plan.headroom as number));
  }
  return chips;
}

/** What the estimate box reads — these six fields of `estimateFor`'s answer, nothing else. */
export type SheetEstimate = Pick<Estimate, "state" | "payout" | "multText" | "overCap" | "lean" | "emptySide">;

/** ⭐ THE SHEET'S ESTIMATE: `estimateFor` at the entered stake, on the seed's pools and frozen rates. A null stake prices nothing. */
export function sheetEstimate(seed: SheetSeed, side: SheetSide, stake: number | null): SheetEstimate | null {
  const e = estimateFor({
    yesPool: seed.yesPool,
    noPool: seed.noPool,
    rates: seed.rates,
    side,
    // A stake the field could not read is never the card's zero-stake figure: −1 is out of every bound.
    stake: stake === null ? -1 : stake,
    bettable: seed.bettable,
    bounds: { min: seed.min, max: seed.max },
    productLine: null,
  });
  if (!e) return null;
  return { state: e.state, payout: e.payout, multText: e.multText, overCap: e.overCap, lean: e.lean, emptySide: e.emptySide };
}

/**
 * "MAKADIRIO YAMESASISHWA" (§3.3): true only when the stake is unchanged and the printed figure, multiple or over-cap
 * changed — a pool that moved, never a keystroke.
 */
export function estimateMoved(
  prev: { stake: number | null; estimate: SheetEstimate | null } | null,
  next: { stake: number | null; estimate: SheetEstimate | null },
): boolean {
  if (!prev || prev.stake === null || prev.stake !== next.stake) return false;
  const a = prev.estimate, b = next.estimate;
  if (!a || !b) return false;
  const printed = (e: SheetEstimate) => e.payout !== null || e.overCap;
  if (!printed(b)) return false;
  return a.payout !== b.payout || a.multText !== b.multText || a.overCap !== b.overCap;
}

/** The holder line (§3.3): none, this side held, the other side held (the hedge note), or both. */
export function holderLine(heldSides: readonly SheetSide[], side: SheetSide): "none" | "this" | "other" | "both" {
  const mine = heldSides.includes(side);
  const other = heldSides.includes(side === "YES" ? "NO" : "YES");
  return mine && other ? "both" : mine ? "this" : other ? "other" : "none";
}

/* ─── The plan ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** `shortfallPlan`'s answer, plus `loading` (the viewer's half not yet read, A9) and `empty` (no stake typed). */
export type SheetPlan = ShortfallPlan | { kind: "loading" } | { kind: "empty" };

/** Blocks that hold whatever the stake: a typed stake (or none) changes nothing about them. */
const STAKELESS_BLOCKS: ReadonlySet<ShortfallBlock> = new Set<ShortfallBlock>([
  "maintenance", "self_excluded", "cooling_off", "session_limit", "account_blocked", "market_closed", "wallet_held",
]);

/** A viewer who blocks nothing and whose wallet is unread — so the plan can answer the market's half alone. */
function viewerUnread(): SheetFacts {
  return {
    maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null }, wallet: null,
    loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
    deposit: {
      limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 },
      sof: { accepted: true, singleTxn: Number.POSITIVE_INFINITY, rolling30d: Number.POSITIVE_INFINITY }, railsOpen: true,
    },
  };
}

/**
 * ⭐ THE PLAN at this stake: `shortfallPlan` on the viewer's facts and the seed's market, at the server-offset `nowMs`.
 *   · facts loading → the market's half alone (closed, a stake out of bounds), else `loading`;
 *   · facts failed, or read with null facts → the market's half alone, else `unknown` (the server decides);
 *   · no stake typed → the stake-free blocks only, else `empty`.
 */
export function sheetPlan(read: SheetViewerRead, seed: SheetSeed, stake: number | null, nowMs: number, bounds?: SheetBounds): SheetPlan {
  const b = bounds ?? { min: seed.min, max: seed.max };
  const known = read.state === "read" && read.viewer.facts !== null ? read.viewer.facts : null;
  const facts = known ?? viewerUnread();
  const live = !closedAt(seed, nowMs);
  const plan = shortfallPlan({ ...facts, market: { live, selectionClosed: false }, stake: stake ?? b.min, bounds: b, nowMs });
  if (stake === null) {
    if (plan.kind === "blocked" && STAKELESS_BLOCKS.has(plan.reason)) return plan;
    if (plan.kind === "blocked" && plan.reason === "loss_limit" && (plan.headroom ?? 0) < b.min) return plan;
    return { kind: "empty" };
  }
  if (!known && plan.kind === "unknown" && read.state === "loading") return { kind: "loading" };
  return plan;
}

/* ─── A block shown at open records what a refused tap records (A4, the pure half) ───────────────────────────── */

/**
 * The row the open's read (`?me=1&open=1`, never a refresh, a focus, a balance event or the key read) writes when its
 * plan at the open stake blocks the bet — exactly the row the bet path writes for the same refusal, in the same order,
 * because the plan asks the gates in `buyPosition`'s order:
 *   · the session limit → `rg.session_limit.enforced` (the server runs `checkSessionTimeLimit` itself, whose write holds
 *     the sitting, and adds the gate's own `limitMin` and `playedMin`);
 *   · the account → `bet.account_blocked` (the server adds the status);
 *   · the loss limit with room below the minimum → `bet.loss_limit_blocked` at the market's minimum stake (the server adds
 *     `checkLossLimit`'s reason for it).
 * A break, maintenance and a held wallet write nothing: the bet path writes no row for them. Every payload says
 * `at: "sheet"`. Null for any other plan, and for every read that is not the open's.
 */
export type OpenReadRecord =
  | { action: "rg.session_limit.enforced"; payload: { at: "sheet" } }
  | { action: "bet.account_blocked"; payload: { at: "sheet" } }
  | { action: "bet.loss_limit_blocked"; payload: { stake: number; at: "sheet" } };

export function openReadRecord(plan: SheetPlan, open: boolean, bounds: SheetBounds): OpenReadRecord | null {
  if (!open || plan.kind !== "blocked") return null;
  if (plan.reason === "session_limit") return { action: "rg.session_limit.enforced", payload: { at: "sheet" } };
  if (plan.reason === "account_blocked") return { action: "bet.account_blocked", payload: { at: "sheet" } };
  if (plan.reason === "loss_limit" && Math.max(0, plan.headroom ?? 0) < bounds.min) {
    return { action: "bet.loss_limit_blocked", payload: { stake: bounds.min, at: "sheet" } };
  }
  return null;
}

/* ─── A pending deposit, by its age (A10) ─────────────────────────────────────────────────────────────────────── */

export const PENDING_LONG_MS = 10 * 60 * 1000;
export const PENDING_LATE_MS = 30 * 60 * 1000;

/** Under 10 minutes `fresh`, to 30 `long`, from 30 `late` — on the server-offset clock. An unreadable age is `fresh`. */
export function pendingBand(createdAt: string | null, nowMs: number): "fresh" | "long" | "late" {
  const t = createdAt === null ? Number.NaN : Date.parse(createdAt);
  if (!Number.isFinite(t)) return "fresh";
  const age = nowMs - t;
  return age >= PENDING_LATE_MS ? "late" : age >= PENDING_LONG_MS ? "long" : "fresh";
}

/* ─── The quote, the key and the request ──────────────────────────────────────────────────────────────────────── */

/** What one tap commits: frozen exactly as the tapped button printed it. */
export type Quote = { marketId: string; side: SheetSide; stake: number };

/**
 * THE INTENT the host holds between a tap and the server's final word.
 *   placing  a request is out (`sentAt`);
 *   inDoubt  the answer was lost (A2): `settledAt` is when the last same-key attempt settled on this page, or when this
 *            page loaded for a doubt carried through a reload (A3 item 5); null while a request is still out;
 *   retry    admission shed the request (BUSY): nothing ran, and the same key may be sent again for the same stake.
 */
export type SheetIntent = {
  quote: Quote;
  key: string;
  phase: "placing" | "inDoubt" | "retry";
  sentAt: number | null;
  settledAt: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A well-formed intent key: a UUID — never a house key, never anything the key read would refuse to look up. */
export function isIntentKey(k: unknown): k is string {
  return typeof k === "string" && UUID.test(k);
}

/** A fresh key (`crypto.randomUUID`, as the dial mints one); where it is missing, a version-4 UUID from random bytes. */
export function mintIntentKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  const k = c?.randomUUID?.();
  if (isIntentKey(k)) return k;
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const sameQuote = (a: Quote, b: Quote) => a.marketId === b.marketId && a.side === b.side && a.stake === b.stake;

/**
 * ⭐ WHICH KEY A TAP SENDS, AND WITH WHICH QUOTE ("Exactly once" items 1–3; A2 item 5).
 *   · no intent → a fresh key for the tapped quote;
 *   · placing (a second tap) → the intent's key and quote; the host swallows the tap;
 *   · in doubt → the intent's key and ITS quote, whatever the field now says;
 *   · retry (BUSY) → the intent's key only for the same quote; a changed stake is a new bet with a fresh key;
 *   · another market, or the other side, is another bet with its own key, whatever the prior intent's phase (A2 item 4).
 */
export function nextKey(prior: SheetIntent | null, quote: Quote, mint: () => string = mintIntentKey): { key: string; quote: Quote; reused: boolean } {
  const sameBet = prior !== null && prior.quote.marketId === quote.marketId && prior.quote.side === quote.side;
  if (prior && sameBet && (prior.phase === "placing" || prior.phase === "inDoubt")) return { key: prior.key, quote: prior.quote, reused: true };
  if (prior && prior.phase === "retry" && sameQuote(prior.quote, quote)) return { key: prior.key, quote: prior.quote, reused: true };
  return { key: mint(), quote, reused: false };
}

/**
 * ⭐ THE REQUEST: exactly `marketId`, `side`, `stake` as digits, `idempotencyKey`, and the funnel's
 * three fields. Null for anything the bet path would refuse by construction: a side that is not YES or NO, a stake that
 * is not a whole positive number, a market id of the wrong shape, a key that is not an intent key (a house key included).
 */
export function requestFor(quote: Quote, key: string): FormData | null {
  if (quote.side !== "YES" && quote.side !== "NO") return null;
  if (!Number.isSafeInteger(quote.stake) || quote.stake <= 0) return null;
  if (!MARKET_ID.test(quote.marketId) || !isIntentKey(key)) return null;
  const fd = new FormData();
  fd.set("marketId", quote.marketId);
  fd.set("side", quote.side);
  fd.set("stake", String(quote.stake));
  fd.set("idempotencyKey", key);
  funnelBetFields(fd, "sheet");
  return fd;
}

/* ─── Placing: its watchdog, and a doubt settled by the key read (A2, A7) ─────────────────────────────────────── */

/** The wait line shows after this (the classic confirm's busy hint). */
export const PLACING_SLOW_MS = 1_500;
/** After this the intent is in doubt: admission's default wait plus the bet's usual time (A7 item 2). */
export const PLACING_DOUBT_MS = 20_000;
/**
 * ⭐ A DOUBT ENDS WITHOUT A BET ONLY when the key read finds nothing this long after the last same-key attempt settled
 * (A2 item 3). It bounds what the server can still do with a bet it received; `test:bet-sheet` §3 recomputes that bound
 * from the server's own timeouts and is red if this falls below it.
 */
export const DOUBT_SETTLE_MS = 10 * 60 * 1000;

/** The placing frame's stage at `nowMs`: placing, slow (the wait line), or in doubt (the watchdog). */
export function placingStage(sentAt: number, nowMs: number): "placing" | "slow" | "doubt" {
  const t = nowMs - sentAt;
  return t >= PLACING_DOUBT_MS ? "doubt" : t >= PLACING_SLOW_MS ? "slow" : "placing";
}

/** The watchdog: a request out this long puts the intent in doubt, the request still out (`settledAt` null). */
export function watchdog(intent: SheetIntent, nowMs: number): SheetIntent {
  if (intent.phase !== "placing" || intent.sentAt === null) return intent;
  return placingStage(intent.sentAt, nowMs) === "doubt" ? { ...intent, phase: "inDoubt", settledAt: null } : intent;
}

/** The key read's cadence while in doubt (A2 item 2): every 5 s for the first minute, then every 30 s. */
export const KEY_READ_FAST_MS = 5_000;
export const KEY_READ_FAST_FOR_MS = 60_000;
export const KEY_READ_SLOW_MS = 30_000;

/** How long until the next key read while in doubt. */
export function keyReadDelay(doubtSinceMs: number, nowMs: number): number {
  return nowMs - doubtSinceMs < KEY_READ_FAST_FOR_MS ? KEY_READ_FAST_MS : KEY_READ_SLOW_MS;
}

/**
 * ⭐ WHAT A KEY READ SAYS ABOUT A DOUBT (A2 items 2–3): a position is that bet's receipt; none ends the doubt only when
 * read `DOUBT_SETTLE_MS` after the last attempt settled — never while a request is still out, never counted from a send.
 * ⛔ `readAtMs` is when the key read was SENT, never when its answer arrived: a slow answer describes the moment the
 * server looked, and only that moment may be measured against the window.
 */
export function afterKeyRead(intent: SheetIntent, keyPosition: { positionId: string } | null, readAtMs: number): "receipt" | "ended" | "holds" {
  if (keyPosition && typeof keyPosition.positionId === "string" && keyPosition.positionId !== "") return "receipt";
  if (intent.phase !== "inDoubt" || intent.settledAt === null) return "holds";
  return readAtMs - intent.settledAt >= DOUBT_SETTLE_MS ? "ended" : "holds";
}

/**
 * A3 item 5 · the intent a stored marker carries for THIS market and side: its key and the stake THAT key was sent
 * with — or null. `readMarker` decides the marker is ours and fresh; the key is kept only when it is a well-formed
 * intent key, and only with a stake. ⭐ Matched on (id, side), not on the address's stake (S8 WP2 review, note f): the
 * marker records what was SENT, so an address whose stake differs or is missing must still reopen that key in doubt at
 * the marker's own stake — dropping the key there would let the next tap mint a second one while the first may land.
 */
export function markerIntentFor(markerRaw: string | null | undefined, bet: Pick<PendingBet, "id" | "side">, nowMs: number): { key: string; stake: number } | null {
  const m = readMarker(markerRaw, nowMs);
  if (!m) return null;
  const sent = parseBetParam(m.bet);
  if (!sent || sent.kind !== "market" || sent.id !== bet.id || sent.side !== bet.side || sent.stake === null) return null;
  let k: unknown;
  try { k = (JSON.parse(markerRaw as string) as { k?: unknown }).k; } catch { return null; }
  return isIntentKey(k) ? { key: k, stake: sent.stake } : null;
}

/** A sheet reopened from a keyed marker starts in doubt, its settle window counted from this page's load (A3 item 5). */
export function reopenInDoubt(quote: Quote, key: string, pageLoadedAtMs: number): SheetIntent {
  return { quote, key, phase: "inDoubt", sentAt: null, settledAt: pageLoadedAtMs };
}

/* ─── The frame ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A dictionary key and its values; the component formats every figure (`formatTzs`, `formatBreakEnd`, `<Cash>`). */
export type SheetLine = { key: string; vars?: Record<string, number | string> };

export type SheetBlockReason = "cooling_off" | "self_excluded" | "account_blocked" | "not_found" | "wallet_held" | "loss_limit";
export type SheetBlockAction = "setLimits" | "contactSupport" | "gotIt";

/** A blocking frame: its title, its sentence (`role="alert"`, the dialog's `describedBy`), and its buttons. */
export type SheetBlock = { reason: SheetBlockReason; title: string; body: SheetLine; actions: SheetBlockAction[] };

/** The block for a reason, as the boards draw it (s4-4-block-*) — no helpline (S8-PLAN Correction 15). */
export function blockFor(reason: SheetBlockReason, detail: { until?: string; untilAt?: string } = {}): SheetBlock {
  const until: Record<string, string> = {};
  if (typeof detail.until === "string") until.until = detail.until;
  if (typeof detail.untilAt === "string") until.untilAt = detail.untilAt;
  switch (reason) {
    case "cooling_off":
      return { reason, title: "market.udErrSuspendedTitle", body: { key: "error.failCoolingOff", vars: until }, actions: ["setLimits", "gotIt"] };
    case "self_excluded":
      return { reason, title: "market.udErrSuspendedTitle", body: { key: "error.failSelfExcluded", vars: until }, actions: ["gotIt"] };
    case "account_blocked":
    case "not_found":
      return { reason, title: "market.udErrSuspendedTitle", body: { key: "journey.sheetBlocked" }, actions: ["contactSupport", "gotIt"] };
    case "wallet_held":
      return { reason, title: "market.udErrSuspendedTitle", body: { key: "journey.sheetFrozen" }, actions: ["contactSupport", "gotIt"] };
    case "loss_limit":
      return { reason, title: "market.udErrRgLimitTitle", body: { key: "error.failLossLimitDaily" }, actions: ["setLimits", "gotIt"] };
  }
}

/** The closed frame's body: picking has closed (the close time has passed), or the question is not taking bets now (A8). */
export function closedBody(seed: SheetSeed, nowMs: number, offsetMs = 0): "journey.sheetClosedBody" | "journey.sheetNotTaking" {
  const close = seed.closesAt === null ? Number.NaN : Date.parse(seed.closesAt);
  return Number.isFinite(close) && nowMs + offsetMs >= close ? "journey.sheetClosedBody" : "journey.sheetNotTaking";
}

/**
 * THE SETTLED ANSWER — what `settleRefusal` (sheet-refusal.ts) made of the server's answer and its re-read. Defined here
 * because the frame reads it; built there.
 */
export type SettledView =
  | { kind: "receipt"; positionId: string; replayed: boolean; quote: Quote }
  | { kind: "inDoubt"; extra: SheetLine | null }
  | { kind: "inline"; line: SheetLine }
  | { kind: "block"; block: SheetBlock }
  | { kind: "closed"; body: "journey.sheetClosedBody" | "journey.sheetNotTaking" }
  | { kind: "bounds"; bounds: SheetBounds }
  | { kind: "lossRoom"; headroom: number; quote: Quote }
  | { kind: "plan"; plan: SheetPlan; quote: Quote }
  | { kind: "lowNoRead"; quote: Quote }
  | { kind: "skew"; reload: boolean }
  | { kind: "redirect" };

export type Settled = {
  /** The refusal matrix's row. */
  row: number;
  reason: FailureReason | null;
  view: SettledView;
  /** same: the intent's key may be sent again; new: the next tap mints one; none: the attempt is over. */
  retry: "same" | "new" | "none";
  /** enter / hold: the intent is (still) in doubt; end: a doubt the answer ended; none: never in doubt. */
  doubt: "enter" | "hold" | "end" | "none";
  /** What becomes of the stored marker: cleared (a receipt), its key dropped (the intent ended), or kept with its key. */
  marker: "clear" | "dropKey" | "keepKey";
};

/** ⭐ THE INTENT AFTER AN ANSWER: a receipt or an ended intent clears it; a doubt holds it, settled now; BUSY keeps its key. */
export function afterSettle(intent: SheetIntent, settled: Settled, nowMs: number): SheetIntent | null {
  if (settled.view.kind === "receipt") return null;
  if (settled.doubt === "enter" || settled.doubt === "hold") return { ...intent, phase: "inDoubt", sentAt: null, settledAt: nowMs };
  if (settled.retry === "same") return { ...intent, phase: "retry", sentAt: null, settledAt: nowMs };
  return null;
}

export type SheetFrameKind = "edit" | "low" | "lossRoom" | "pending" | "blocked" | "closed" | "placing" | "inDoubt" | "receipt";

export type SheetCta = {
  label: SheetLine;
  enabled: boolean;
  /** What describes the button: the low callout, the bounds line, or the inline line. */
  describedBy: "callout" | "bounds" | "line" | null;
};

export type SheetBalance = { kind: "loading" } | { kind: "unknown" } | { kind: "known"; spendable: number };

export type SheetFrame = {
  frame: SheetFrameKind;
  /** The bounds the stake was read against: the seed's, or a refusal's newer ones (matrix row 14). */
  bounds: SheetBounds;
  stake: number | null;
  /** The bounds line under the stake. */
  breaks: StakeBreak | null;
  /** The stake box is locked to the frozen quote (placing, in doubt). */
  stakeLocked: boolean;
  /** `aria-invalid="true"` on the stake: low, loss-room, pending and nonempty bounds breaks (A18; below/above canvases). */
  stakeInvalid: boolean;
  /** The Input's neutral `attention` border: low, loss-room, pending and nonempty bounds breaks. */
  attention: boolean;
  /** The chips, or null where the frame hides them. */
  chips: number[] | null;
  estimate: SheetEstimate | null;
  /** The estimate box, the Makadirio line and the balance row show (hidden in the low frames, §3.4). */
  showEstimate: boolean;
  balance: SheetBalance;
  holder: "none" | "this" | "other" | "both";
  bonusWager: { remaining: number } | null;
  /** The lines in the sheet's last rows, above the CTA (`role="status"`). */
  lines: SheetLine[];
  block: SheetBlock | null;
  closedBody: "journey.sheetClosedBody" | "journey.sheetNotTaking" | null;
  low: {
    /** Null only after a failed re-read (`titleOnly`): unknown is never zero (A9). */
    shortfall: number | null;
    spendable: number | null;
    deposit: DepositOption | null;
    betInstead: BetInsteadOption | null;
    depositRefusal: "rails_paused" | "deposit_limit" | "sof_required" | "deposit_max" | null;
    /** The deposit engine's proposed amount and ceiling, for refusal sentences; null after an unread re-read. */
    requestedDeposit: number | null;
    depositMaximum: number | null;
    /** The `lowChoose` eyebrow: two options show. */
    eyebrow: boolean;
    /** A failed re-read after a balance refusal: `lowTitle` alone, no option, until a read lands (A8). */
    titleOnly: boolean;
  } | null;
  pending: { amount: number; txnId: string; band: "fresh" | "long" | "late"; title: SheetLine; body: SheetLine; betInstead: BetInsteadOption | null } | null;
  lossRoom: { headroom: number } | null;
  receipt: { positionId: string; replayed: boolean; quote: Quote | null } | null;
  cta: SheetCta | null;
  /** The ✕ answers (it is withheld while placing). */
  closable: boolean;
  /** What the CTA commits, and what "bet instead" commits — the quote a tap freezes (`quoteAt`). */
  quote: Quote | null;
  betInsteadQuote: Quote | null;
};

export type SheetFrameInput = {
  seed: SheetSeed;
  side: SheetSide;
  stakeText: string;
  viewer: SheetViewerRead;
  /** The phone's clock and the offset to the server's (`clockOffset`). */
  nowMs: number;
  offsetMs?: number;
  intent: SheetIntent | null;
  /** The last answer's settled view, while it stands (the host drops it when the player edits or closes). */
  settled: Settled | null;
};

const ctaPlace = (stake: number): SheetLine => ({ key: "journey.placeCta", vars: { amount: stake } });
const CTA_BARE: SheetLine = { key: "journey.placeCtaBare" };
const lineOf = (key: string, vars?: Record<string, number | string>): SheetLine => (vars ? { key, vars } : { key });

/** The plan's line for the stake-free inline blocks (s4-4-inline-refusals). */
function planLine(plan: SheetPlan): SheetLine | null {
  if (plan.kind !== "blocked") return null;
  if (plan.reason === "maintenance") return lineOf("error.failMaintenance");
  if (plan.reason === "session_limit") return lineOf("journey.sheetSessionLimit", { limitMin: plan.limitMin ?? 0 });
  return null;
}

const BLOCK_OF: Partial<Record<ShortfallBlock, SheetBlockReason>> = {
  self_excluded: "self_excluded", cooling_off: "cooling_off", account_blocked: "account_blocked", wallet_held: "wallet_held",
};

/**
 * ⭐ WHICH FRAME DRAWS, AND THE CTA. In order:
 *   receipt → placing → in doubt (it overrides every derived frame: neither the facts nor a balance event move it) →
 *   the settled answer's block, closed frame, loss room, or low frame → the plan at the typed stake.
 * The CTA reads "Weka dau · {amount}" and is enabled only in the edit frame at a stake inside the bounds (or an unread
 * balance, which the server decides); it is bare and disabled with no stake or out of bounds, and disabled in the low,
 * loss-room and pending frames and while placing. In doubt it is "Jaribu tena · {amount}", enabled once the request
 * that was out has settled (Next would only queue a second one behind it, A7 item 2).
 */
export function sheetFrame(input: SheetFrameInput): SheetFrame {
  const { seed, side, viewer, intent, settled } = input;
  const offset = input.offsetMs ?? 0;
  const serverNow = input.nowMs + offset;
  const bounds: SheetBounds = settled?.view.kind === "bounds" ? settled.view.bounds : { min: seed.min, max: seed.max };
  const locked = intent && (intent.phase === "placing" || intent.phase === "inDoubt") ? intent.quote : null;
  // ⭐ A settled answer about a COMMITTED quote (the receipt, the re-read plan, the loss room) is drawn at that quote's
  // stake, never beside whatever the box now says — "bet 2,000 instead" from a 5,000 frame receipts 2,000 (review 4).
  const sv = settled?.view;
  const committed = sv && (sv.kind === "receipt" || sv.kind === "plan" || sv.kind === "lowNoRead" || sv.kind === "lossRoom") ? sv.quote : null;
  const typed = sheetStake(committed ? String(committed.stake) : input.stakeText, bounds);
  const stake = locked ? locked.stake : typed.stake;
  const breaks = locked ? null : typed.breaks;
  const inBounds = stake !== null && breaks === null;
  const read = viewer.state === "read" ? viewer.viewer : null;
  const balance: SheetBalance = viewer.state === "loading" ? { kind: "loading" }
    : read && read.spendable !== null && Number.isFinite(read.spendable) ? { kind: "known", spendable: read.spendable } : { kind: "unknown" };
  const quoteOf = (s: number | null): Quote | null => (s === null ? null : { marketId: seed.id, side, stake: s });

  const base: SheetFrame = {
    frame: "edit", bounds, stake, breaks, stakeLocked: locked !== null, stakeInvalid: false, attention: false,
    chips: null, estimate: sheetEstimate(seed, side, inBounds ? stake : null), showEstimate: true, balance,
    holder: holderLine(read?.heldSides ?? [], side), bonusWager: read?.bonusWager ?? null, lines: [], block: null,
    closedBody: null, low: null, pending: null, lossRoom: null, receipt: null, cta: null, closable: true,
    quote: null, betInsteadQuote: null,
  };

  if (settled?.view.kind === "receipt") {
    return { ...base, frame: "receipt", estimate: null, showEstimate: false, receipt: { positionId: settled.view.positionId, replayed: settled.view.replayed, quote: settled.view.quote } };
  }
  if (intent?.phase === "placing") {
    const slow = intent.sentAt !== null && placingStage(intent.sentAt, input.nowMs) === "slow";
    return {
      ...base, frame: "placing", closable: false, lines: slow ? [lineOf("journey.sheetPlacingSlow")] : [],
      cta: { label: lineOf("dialog.placing"), enabled: false, describedBy: null },
    };
  }
  if (intent?.phase === "inDoubt") {
    const extra = settled?.view.kind === "inDoubt" ? settled.view.extra : null;
    return {
      ...base, frame: "inDoubt", lines: [lineOf("error.failSystemError"), ...(extra ? [extra] : [])],
      cta: { label: lineOf("journey.retryCta", { amount: intent.quote.stake }), enabled: intent.settledAt !== null, describedBy: "line" },
      quote: intent.quote,
    };
  }

  const view = settled?.view ?? null;
  if (view?.kind === "block") return { ...base, frame: "blocked", estimate: null, showEstimate: false, block: view.block };
  if (view?.kind === "closed") return { ...base, frame: "closed", estimate: null, showEstimate: false, closedBody: view.body };
  if (view?.kind === "lossRoom") return lossRoomFrame(base, bounds, view.headroom);
  if (view?.kind === "lowNoRead") {
    return {
      ...base, frame: "low", stakeInvalid: true, attention: true, showEstimate: false,
      low: { shortfall: null, spendable: null, deposit: null, betInstead: null, depositRefusal: null, requestedDeposit: null, depositMaximum: null, eyebrow: false, titleOnly: true },
      cta: { label: stake !== null ? ctaPlace(stake) : CTA_BARE, enabled: false, describedBy: "callout" },
    };
  }
  const settledLine: SheetLine | null = view?.kind === "inline" ? view.line
    : view?.kind === "skew" && !view.reload ? lineOf("common.temporarilyUnavailable") : null;

  const plan = view?.kind === "plan" ? view.plan : sheetPlan(viewer, seed, typed.stake, serverNow, bounds);
  if (plan.kind === "blocked" && plan.reason === "market_closed") {
    return { ...base, frame: "closed", estimate: null, showEstimate: false, closedBody: closedBody(seed, input.nowMs, offset) };
  }
  if (plan.kind === "blocked" && plan.reason === "loss_limit") {
    const room = Math.max(0, plan.headroom ?? 0);
    if (room < bounds.min) return { ...base, frame: "blocked", estimate: null, showEstimate: false, block: blockFor("loss_limit") };
    return lossRoomFrame(base, bounds, room);
  }
  if (plan.kind === "blocked" && BLOCK_OF[plan.reason]) {
    const r = BLOCK_OF[plan.reason] as SheetBlockReason;
    return { ...base, frame: "blocked", estimate: null, showEstimate: false, block: blockFor(r, { until: plan.until }) };
  }

  const chips = sheetChips(bounds, plan);
  if (plan.kind === "pending") {
    const band = pendingBand(plan.createdAt, serverNow);
    const title = band === "late" ? lineOf("journey.lowPendingLateTitle") : lineOf("journey.lowPendingTitle", { amount: plan.amount });
    const body = band === "late" ? lineOf("journey.lowPendingLateBody") : band === "long" ? lineOf("journey.lowPendingWaitBody") : lineOf("common.depositPendingBody");
    const instead = band === "late" ? plan.betInstead : null;
    return {
      ...base, frame: "pending", stakeInvalid: true, attention: true, showEstimate: false,
      pending: { amount: plan.amount, txnId: plan.txnId, band, title, body, betInstead: instead },
      cta: { label: stake !== null ? ctaPlace(stake) : CTA_BARE, enabled: false, describedBy: "callout" },
      betInsteadQuote: instead ? quoteOf(instead.stake) : null,
    };
  }
  if (plan.kind === "short") {
    const deposit = (plan.options.find((o) => o.kind === "deposit") as DepositOption | undefined) ?? null;
    const instead = (plan.options.find((o) => o.kind === "betInstead") as BetInsteadOption | undefined) ?? null;
    return {
      ...base, frame: "low", stakeInvalid: true, attention: true, showEstimate: false,
      low: {
        shortfall: plan.shortfall, spendable: plan.spendable, deposit, betInstead: instead,
        depositRefusal: plan.depositRefusal ?? null, eyebrow: deposit !== null && instead !== null, titleOnly: false,
        requestedDeposit: depositRequestFor(plan.shortfall).amount, depositMaximum: depositRequestFor(plan.shortfall).maximum,
      },
      cta: { label: stake !== null ? ctaPlace(stake) : CTA_BARE, enabled: false, describedBy: "callout" },
      betInsteadQuote: instead ? quoteOf(instead.stake) : null,
    };
  }

  // The edit frame: enough, unknown, loading, empty, a stake out of bounds, or an inline block (maintenance, session).
  const blockedLine = planLine(plan);
  const lines = [...(blockedLine ? [blockedLine] : []), ...(settledLine ? [settledLine] : [])];
  const outOfBounds = plan.kind === "blocked" || plan.kind === "empty" || !inBounds;
  const enabled = !blockedLine && !outOfBounds && (plan.kind === "enough" || plan.kind === "unknown" || plan.kind === "loading");
  const retry = intent?.phase === "retry" && stake !== null && intent.quote.stake === stake && enabled;
  const label = retry ? lineOf("journey.retryCta", { amount: stake as number }) : inBounds ? ctaPlace(stake as number) : CTA_BARE;
  const boundsInvalid = breaks !== null && breaks !== "empty";
  return {
    ...base,
    frame: "edit",
    stakeInvalid: boundsInvalid,
    attention: boundsInvalid,
    chips,
    lines,
    cta: { label, enabled, describedBy: lines.length > 0 ? "line" : breaks && breaks !== "empty" ? "bounds" : null },
    quote: enabled ? quoteOf(stake) : null,
  };
}

function lossRoomFrame(base: SheetFrame, bounds: SheetBounds, headroom: number): SheetFrame {
  return {
    ...base, frame: "lossRoom", stakeInvalid: true, attention: true,
    chips: sheetChips(bounds, { kind: "blocked", reason: "loss_limit", headroom }),
    lossRoom: { headroom },
    cta: { label: CTA_BARE, enabled: false, describedBy: "callout" },
  };
}

/** ⭐ THE QUOTE A TAP FREEZES: the CTA's, or "bet instead"'s — null when that button would not commit. */
export function quoteAt(frame: SheetFrame, which: "cta" | "betInstead" = "cta"): Quote | null {
  if (which === "betInstead") return frame.betInsteadQuote;
  return frame.cta?.enabled ? frame.quote : null;
}
