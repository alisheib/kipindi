/**
 * THE BET SHEET'S REFUSAL MATRIX — every way `buyPositionAction` and `buyPosition` can answer the sheet, and what the
 * sheet shows (the Vodacom plan S8; `docs/design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md` "The refusal
 * matrix", with A2, A6, A7, A8 and A24). Two pure steps:
 *
 *   1. `refusalOutcome(answer)` — the row. Keyed on `reason`, else on `code` (`reasonForCode`, and the codes the matrix
 *      names). ⛔ It never reads `error`: the server's English sentence is neither shown nor matched.
 *   2. `settleRefusal(outcome, reread, ctx)` — the ONE step that settles it (A8): whether the intent is or stays in
 *      doubt, the frame, the line, the retry, the marker. The rows that decide only after a fresh `?me=1` read (10, 12,
 *      15, 19, 20, 21) are decided here, from that read.
 *
 * ⭐ ORDER FOR A CALL THAT REJECTED (A6, live fix L3): a redirect FIRST (`isActionRedirect` — the session ended; the
 * router is already on its way to sign-in, the server ran nothing), then a deploy skew (`UnrecognizedActionError`: the
 * server refused the stale action before it ran), and only then a throw — an unknown outcome, so in doubt.
 *
 * ⭐ IN DOUBT (A2). After a throw, an unknown shape, or the placing watchdog, only the intent's key is sent until the
 * server has said what happened. A refusal made BEFORE the wallet lock (rows 1, 5–15, 23) cannot say: the doubt holds,
 * the key is kept, and no sentence claims nothing was placed or charged — `journey.sheetBusy` and `error.failMaintenance`
 * are never shown in doubt.
 * ⛔ A refusal made inside the lock (rows 16–22) answers only for the attempt that held the lock. When that attempt was
 * a RETRY, the lost first attempt may still be on its way, and may land once the refusing fact changes (a deposit lands,
 * a settlement pays): "the key had not landed then" is the same fact as a key read finding nothing then, which A2 trusts
 * only `DOUBT_SETTLE_MS` after the last same-key settle. So in doubt an in-lock refusal of a retry HOLDS the doubt and
 * the key until that window has passed (S8 WP2 review, finding 1) — except rows 16 and 22, which stay refused once
 * refused: a key another bet holds stays held, and a closed selection never reopens, so the first attempt meets the
 * same refusal. The first attempt's OWN late answer (`priorSettledAt` null) is that attempt's answer, and ends it.
 * Since live fix L2 a keyed retry refused before the in-lock replay is answered with the landed bet's receipt
 * (`replayed: true`): one ticket, never a second (row 24).
 *
 * Client-safe and pure. It imports `failure-reasons.ts`, `action-redirect.ts` (A6: the sheet asks it, never a digest test
 * of its own) and the sheet's own rules.
 */
import { REASONS, reasonForCode, type FailureReason } from "@/lib/failure-reasons";
import { isActionRedirect } from "@/lib/action-redirect";
import { lossHeadroomFor } from "./shortfall";
import {
  DOUBT_SETTLE_MS,
  blockFor,
  closedBody,
  sheetPlan,
  type Quote,
  type Settled,
  type SettledView,
  type SheetBounds,
  type SheetFacts,
  type SheetLine,
  type SheetSeed,
  type SheetViewer,
} from "./sheet-state";

/** What the action's call did: resolved to a value, or rejected. */
export type ActionAnswer = { kind: "resolved"; value: unknown } | { kind: "rejected"; error: unknown };

/** The matrix's verdict on one answer, before any re-read. */
export type RefusalOutcome = {
  row: number;
  reason: FailureReason | null;
  /**
   * receipt · inline (a line above the CTA) · block · closed · bounds · decide (a re-read decides) · unknown (a throw or
   * an unknown shape — in doubt) · skew · redirect.
   */
  frame: "receipt" | "inline" | "block" | "closed" | "bounds" | "decide" | "unknown" | "skew" | "redirect";
  line?: SheetLine;
  block?: ReturnType<typeof blockFor>;
  retry: "same" | "new" | "none";
  /** The half a re-read must decide on: the market's (public) or the viewer's facts; null when none is needed. */
  reread: "public" | "viewer" | null;
  /** Row 14: the bounds the refusal carried (a bound that moved since the open). */
  bounds?: SheetBounds;
  /** Rows 24–25: the server's ticket. */
  receipt?: { positionId: string; replayed: boolean };
  /** The refusal was made inside the wallet lock, after the key lookup (A2 item 3; the census ties it to the source). */
  inLock: boolean;
  /** A key conflict is permanent. A closed selection can be reopened, so it is never permanent proof of no bet. */
  final?: boolean;
  /** The row's own sentence makes a money claim ("nothing has been charged"): never shown while in doubt. */
  moneyClaim: boolean;
};

type Row = Omit<RefusalOutcome, "reason" | "bounds" | "receipt" | "block"> & { blockOf?: Parameters<typeof blockFor>[0] };

const L = (key: string): SheetLine => ({ key });

/**
 * ⭐ THE ROWS BY REASON — every reason the player bet path emits. `test:bet-sheet` §2 reads the source's `reason:`
 * literals on that path and fails on one with no row here.
 */
const BY_REASON: Readonly<Record<string, Row>> = {
  system_busy:              { row: 1, frame: "inline", line: L("journey.sheetBusy"), retry: "same", reread: null, inLock: false, moneyClaim: true },
  rate_limited:             { row: 5, frame: "inline", line: L("journey.sheetRateLimited"), retry: "new", reread: null, inLock: false, moneyClaim: false },
  maintenance:              { row: 6, frame: "inline", line: L("error.failMaintenance"), retry: "new", reread: null, inLock: false, moneyClaim: true },
  cooling_off:              { row: 7, frame: "block", blockOf: "cooling_off", retry: "none", reread: null, inLock: false, moneyClaim: false },
  self_excluded:            { row: 8, frame: "block", blockOf: "self_excluded", retry: "none", reread: null, inLock: false, moneyClaim: false },
  session_limit_reached:    { row: 9, frame: "inline", line: L("journey.sheetSessionLimit"), retry: "new", reread: null, inLock: false, moneyClaim: false },
  account_blocked:          { row: 11, frame: "block", blockOf: "account_blocked", retry: "none", reread: null, inLock: false, moneyClaim: false },
  stake_not_whole:          { row: 14, frame: "bounds", retry: "new", reread: null, inLock: false, moneyClaim: false },
  stake_below_min:          { row: 14, frame: "bounds", retry: "new", reread: null, inLock: false, moneyClaim: false },
  stake_above_max:          { row: 14, frame: "bounds", retry: "new", reread: null, inLock: false, moneyClaim: false },
  market_not_live:          { row: 15, frame: "decide", retry: "new", reread: "public", inLock: false, moneyClaim: false },
  // Row 16's words say nothing was placed: a money claim (review note d).
  idempotency_key_conflict: { row: 16, frame: "inline", line: L("error.failIdempotencyKeyConflict"), retry: "new", reread: null, inLock: true, final: true, moneyClaim: true },
  wallet_frozen:            { row: 17, frame: "block", blockOf: "wallet_held", retry: "none", reread: null, inLock: true, moneyClaim: false },
  wallet_missing:           { row: 18, frame: "inline", line: L("error.failWalletMissing"), retry: "new", reread: null, inLock: true, moneyClaim: true },
  loss_limit_daily:         { row: 19, frame: "decide", retry: "none", reread: "viewer", inLock: true, moneyClaim: false },
  balance_insufficient:     { row: 20, frame: "decide", retry: "new", reread: "viewer", inLock: true, moneyClaim: false },
  selection_closed:         { row: 22, frame: "closed", retry: "none", reread: null, inLock: true, moneyClaim: false },
};

/** ⭐ THE ROWS BY CODE, for a refusal that carries no reason. */
const BY_CODE: Readonly<Record<string, Row>> = {
  // Admission's BUSY carries its code alone (`reasonForCode` → system_busy).
  BUSY:             BY_REASON.system_busy,
  RATE_LIMITED:     BY_REASON.rate_limited,
  // "Account not found." and "Market not found." share this shape: only a re-read tells rows 10 and 12 apart (A8).
  NOT_FOUND:        { row: 10, frame: "decide", retry: "none", reread: "public", inLock: false, moneyClaim: false },
  // "Market is not accepting predictions." · "Market has closed." (row 12).
  INVALID:          { row: 12, frame: "decide", retry: "new", reread: "public", inLock: false, moneyClaim: false },
  // The pre-lock selection check (row 13): no reason, closed by its code.
  SELECTION_CLOSED: { row: 13, frame: "closed", retry: "none", reread: null, inLock: false, moneyClaim: false },
};

/*
 * ⛔ `SUSPENDED` has no row by code: every player-path site sends it WITH a reason, so a reasonless SUSPENDED is an
 * unknown shape — row 2's handling (Open point 35), in doubt, never a guess (review finding 2).
 */

/** The house seam's refusals: they need a house context no player call has (S8-PLAN, the matrix's closing note). */
export const HOUSE_ONLY_REASONS: readonly string[] = ["house_key_mismatch", "house_intent_superseded"];

/** For the census: the reasons and codes the matrix classifies. */
export const CLASSIFIED_REASONS: readonly string[] = Object.keys(BY_REASON);
export const CLASSIFIED_CODES: readonly string[] = Object.keys(BY_CODE);

const UNKNOWN: Row = { row: 2, frame: "unknown", line: L("error.failSystemError"), retry: "same", reread: null, inLock: false, moneyClaim: false };
const PARAMS: Row = { ...UNKNOWN, row: 23 };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** A reason the registry knows, or null — a string the registry has never heard of is not a reason. */
function knownReason(v: unknown): FailureReason | null {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(REASONS, v) ? (v as FailureReason) : null;
}

function fromRow(r: Row, reason: FailureReason | null, extra: Partial<RefusalOutcome> = {}): RefusalOutcome {
  const { blockOf, ...rest } = r;
  return { ...rest, reason, ...(blockOf ? { block: blockFor(blockOf) } : {}), ...extra };
}

/** Next's deploy-skew error: raised only on the server's not-found answer for a stale action — the server ran nothing. */
function isDeploySkew(e: unknown): boolean {
  return isObj(e) && e.name === "UnrecognizedActionError";
}

/**
 * ⭐ THE ROW FOR ONE ANSWER. Total: an answer it cannot read is an unknown outcome (row 2), never a fresh key.
 */
export function refusalOutcome(answer: ActionAnswer): RefusalOutcome {
  if (answer.kind === "rejected") {
    if (isActionRedirect(answer.error)) return { row: 4, reason: null, frame: "redirect", retry: "none", reread: null, inLock: false, moneyClaim: false };
    if (isDeploySkew(answer.error)) return { row: 3, reason: null, frame: "skew", retry: "none", reread: null, inLock: false, moneyClaim: false };
    return fromRow(UNKNOWN, "system_error");
  }
  const v = answer.value;
  if (!isObj(v) || typeof v.ok !== "boolean") return fromRow(UNKNOWN, "system_error");

  if (v.ok === true) {
    const d = isObj(v.data) ? v.data : null;
    const positionId = d && typeof d.positionId === "string" && d.positionId !== "" ? d.positionId : null;
    if (!positionId) return fromRow(UNKNOWN, "system_error");
    const replayed = d?.replayed === true;
    return { row: replayed ? 24 : 25, reason: null, frame: "receipt", retry: "none", reread: null, inLock: true, moneyClaim: false, receipt: { positionId, replayed } };
  }

  const detail = isObj(v.detail) ? v.detail : {};
  const code = typeof v.code === "string" ? v.code : null;
  // Keyed on the reason when one is sent — a reason the matrix has no row for is an unknown shape, never re-keyed on
  // its code; on the code only when no reason is sent at all.
  if (v.reason !== undefined && v.reason !== null) {
    const reason = knownReason(v.reason);
    if (!reason || !Object.prototype.hasOwnProperty.call(BY_REASON, reason)) return fromRow(UNKNOWN, "system_error");
    const r = BY_REASON[reason];
    if (reason === "rate_limited") {
      const sec = num(v.retryAfterSec) ?? num(detail.retryAfterSec);
      return fromRow(r, reason, { line: { key: "journey.sheetRateLimited", vars: sec !== undefined ? { sec } : {} } });
    }
    if (reason === "session_limit_reached") {
      const limitMin = num(detail.limitMin);
      return fromRow(r, reason, { line: { key: "journey.sheetSessionLimit", vars: limitMin !== undefined ? { limitMin } : {} } });
    }
    if (reason === "cooling_off" || reason === "self_excluded") {
      const until = typeof detail.until === "string" ? detail.until : undefined;
      const untilAt = typeof detail.untilAt === "string" ? detail.untilAt : undefined;
      return fromRow(r, reason, { block: blockFor(reason, { until, untilAt }) });
    }
    if (r.frame === "bounds") {
      const min = num(detail.min), max = num(detail.max);
      return fromRow(r, reason, min !== undefined && max !== undefined ? { bounds: { min, max } } : {});
    }
    if (reason === "balance_insufficient" && !(num(detail.balance) !== undefined && num(detail.needed) !== undefined)) {
      return fromRow(r, reason, { row: 21 }); // the in-transaction abort: no figures (Correction 9)
    }
    return fromRow(r, reason);
  }
  if (code !== null && Object.prototype.hasOwnProperty.call(BY_CODE, code)) return fromRow(BY_CODE[code], reasonForCode(code));
  if (code === null) return fromRow(PARAMS, "system_error");
  return fromRow(UNKNOWN, "system_error");
}

/**
 * ⭐ THE ANSWER OF ONE CALL, as the matrix reads it: what it resolved to, or that it rejected — never a value a host
 * invents for a throw (a hand-built `{ code: "BUSY" }` would be row 1, and drop a key whose bet may have landed).
 */
export async function answerOf(call: () => Promise<unknown>): Promise<ActionAnswer> {
  try { return { kind: "resolved", value: await call() }; } catch (error) { return { kind: "rejected", error }; }
}

/** A `?me=1` re-read (A8: private, no-store, fresh): the market's half — found or not — and the viewer's. */
export type Reread =
  | { state: "none" }
  | { state: "failed" }
  | { state: "read"; market: { found: false } | { found: true; bettable: boolean }; viewer: SheetViewer | null };

export type SettleContext = {
  /** The intent was already in doubt when this answer arrived. */
  inDoubt: boolean;
  /**
   * When the intent last settled before THIS attempt was sent (its `settledAt` then): null for the first attempt's own
   * answer. An in-lock refusal of a retry holds the doubt until `DOUBT_SETTLE_MS` after it (finding 1).
   */
  priorSettledAt: number | null;
  seed: SheetSeed;
  /** The quote this attempt COMMITTED: the receipt prints it, and rows 19–21 are decided at it (review finding 4). */
  quote: Quote;
  /** The phone's clock and the offset to the server's. */
  nowMs: number;
  offsetMs?: number;
  /** Row 3: the once-per-build reload is already spent for this build, or the build has no id (A7 item 3). */
  reloadSpent?: boolean;
};

/**
 * ⭐ THE ONE PURE STEP THAT SETTLES AN ANSWER (A8). The doubt first (A2 item 6), then the row, from its re-read.
 */
export function settleRefusal(o: RefusalOutcome, reread: Reread, ctx: SettleContext): Settled {
  const offset = ctx.offsetMs ?? 0;
  const make = (view: SettledView, retry: Settled["retry"], doubt: Settled["doubt"], marker: Settled["marker"]): Settled =>
    ({ row: o.row, reason: o.reason, view, retry, doubt, marker });

  if (o.frame === "receipt" && o.receipt) return make({ kind: "receipt", positionId: o.receipt.positionId, replayed: o.receipt.replayed, quote: ctx.quote }, "none", ctx.inDoubt ? "end" : "none", "clear");

  // A redirect or a skew proves the server ran nothing — unless the intent was already in doubt, when an earlier
  // attempt may still have landed: the doubt holds and the marker keeps its key (A6 item 2, A7 item 3).
  if (o.frame === "redirect") return ctx.inDoubt ? make({ kind: "inDoubt", extra: null }, "same", "hold", "keepKey") : make({ kind: "redirect" }, "none", "none", "dropKey");
  if (o.frame === "skew") {
    if (ctx.inDoubt) return make({ kind: "inDoubt", extra: null }, "same", "hold", "keepKey");
    return make({ kind: "skew", reload: !ctx.reloadSpent }, "none", "none", "dropKey");
  }
  if (o.frame === "unknown") return make({ kind: "inDoubt", extra: null }, "same", ctx.inDoubt ? "hold" : "enter", "keepKey");

  // In doubt, a refusal made before the wallet lock cannot say what the first attempt did: the doubt holds, the key is
  // kept, and the row's own sentence shows beside the doubt's only when it makes no money claim.
  if (ctx.inDoubt && !o.inLock) return make({ kind: "inDoubt", extra: o.moneyClaim ? null : ownLine(o, ctx) }, "same", "hold", "keepKey");
  // In doubt, an in-lock refusal of a RETRY inside the window says only that the key had not landed then (finding 1).
  if (ctx.inDoubt && o.inLock && !o.final && ctx.priorSettledAt !== null && ctx.nowMs - ctx.priorSettledAt < DOUBT_SETTLE_MS) {
    return make({ kind: "inDoubt", extra: o.moneyClaim ? null : ownLine(o, ctx) }, "same", "hold", "keepKey");
  }
  // Not (or no longer) in doubt: the intent ends as this answer says, and the marker loses its key — BUSY included,
  // since admission shed it before anything ran (the retry's own tap writes the key again, A3 item 4).
  const doubt: Settled["doubt"] = ctx.inDoubt ? "end" : "none";
  const ended = (view: SettledView): Settled => make(view, o.retry, doubt, "dropKey");

  switch (o.frame) {
    case "inline":
      return ended({ kind: "inline", line: o.line as SheetLine });
    case "block":
      return ended({ kind: "block", block: o.block ?? blockFor("account_blocked") });
    case "closed":
      return ended({ kind: "closed", body: o.row === 13 ? "journey.sheetClosedBody" : closedBody(ctx.seed, ctx.nowMs, offset) });
    case "bounds":
      return ended({ kind: "bounds", bounds: o.bounds ?? { min: ctx.seed.min, max: ctx.seed.max } });
    case "decide":
      return ended(decide(o, reread, ctx));
  }
  return make({ kind: "inDoubt", extra: null }, "same", ctx.inDoubt ? "hold" : "enter", "keepKey");
}

/** Rows 10, 12, 15, 19, 20 and 21 — decided by the fresh re-read, never by a cached one (A8 item 2). */
function decide(o: RefusalOutcome, reread: Reread, ctx: SettleContext): SettledView {
  const offset = ctx.offsetMs ?? 0;
  const notTaking: SettledView = { kind: "inline", line: L("journey.sheetNotTaking") };
  if (o.reread === "public") {
    if (reread.state !== "read") return notTaking;
    if (!reread.market.found || !reread.market.bettable) return { kind: "closed", body: closedBody(ctx.seed, ctx.nowMs, offset) };
    // The market takes bets: a NOT_FOUND was the account (row 10), anything else is not taking this bet now.
    return o.row === 10 ? { kind: "block", block: blockFor("not_found") } : notTaking;
  }
  // The viewer's half: rows 19–21.
  const facts: SheetFacts | null = reread.state === "read" ? reread.viewer?.facts ?? null : null;
  if (o.row === 19) {
    const room = facts ? lossHeadroomFor(facts.loss) : null;
    return room !== null && room >= ctx.seed.min ? { kind: "lossRoom", headroom: room, quote: ctx.quote } : { kind: "block", block: blockFor("loss_limit") };
  }
  if (!facts || reread.state !== "read" || !reread.viewer) return { kind: "lowNoRead", quote: ctx.quote };
  return { kind: "plan", plan: sheetPlan({ state: "read", viewer: reread.viewer }, ctx.seed, ctx.quote.stake, ctx.nowMs + offset), quote: ctx.quote };
}

/** A row's own sentence, for beside the doubt's (rows 5 and 7–15; and rows 17–21 while a retry's refusal holds it). */
function ownLine(o: RefusalOutcome, ctx: SettleContext): SheetLine | null {
  if (o.line) return o.line;
  if (o.row === 19) return { key: "error.failLossLimitDaily" };
  if (o.row === 20 || o.row === 21) return { key: "journey.lowTitle" };
  if (o.block) return o.block.body;
  if (o.frame === "closed") return { key: o.row === 13 ? "journey.sheetClosedBody" : closedBody(ctx.seed, ctx.nowMs, ctx.offsetMs ?? 0) };
  if (o.frame === "bounds") {
    const b = o.bounds ?? { min: ctx.seed.min, max: ctx.seed.max };
    if (o.reason === "stake_below_min") return { key: "journey.sheetBelowMin", vars: { min: b.min } };
    if (o.reason === "stake_above_max") return { key: "journey.sheetAboveMax", vars: { max: b.max } };
    return { key: "error.failStakeNotWhole" };
  }
  // Rows 12 and 15 (INVALID, market_not_live): this question is not taking bets now. Row 10's shape is ambiguous
  // (the account or the market, A8), so it adds nothing beside the doubt.
  if (o.frame === "decide" && o.reread === "public" && o.row !== 10) return { key: "journey.sheetNotTaking" };
  return null;
}
