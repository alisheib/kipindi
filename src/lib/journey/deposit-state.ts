/** S9 preparation: pure funding-intent, waiting and owned-status rules. No money or provider call lives here. */
import { boundedNext, MAX_NEXT_LEN } from "../safe-next";
import { isGatewayMsisdn, readAsciiDigits, toMsisdn255 } from "../phone-normalize";
import { isMobileMoneyMethodId, isPaymentMethodId, type PaymentMethodId } from "../payment-providers";
import { hasDepositStatusReview, isRgHeldDeposit, presentedStatus, RG_RETURN_MARK } from "../wallet/receipts";
import type { TxnStatusValue } from "../wallet/ledger";
import { formatBetParam, parseBetParam, readMarker, stakeFromUrl, writeMarker, PENDING_BET_MAX_BYTES, type PendingBet, type PendingBetMarker } from "./pending-bet";
import { sheetOpensOn } from "./sheet-state";

export const DEPOSIT_PROBE_AGE_MS = 20_000;
export const DEPOSIT_FRESH_MS = 60_000;
export const DEPOSIT_LONG_MS = 10 * 60_000;
export const DEPOSIT_LATE_MS = 30 * 60_000;
export const DEPOSIT_FAST_POLL_MS = 3_000;
export const DEPOSIT_SLOW_POLL_MS = 10_000;
export const DEPOSIT_RETURN_WINDOW_MS = 30 * 60_000;

/** A create-only Transaction.pendingBet envelope. It holds no phone, attribution, callback or unfinished bet key. */
export type SavedDepositBet = { v: 1; bet: string; returnPath: string };

function record(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === "object" && !Array.isArray(raw);
}

/**
 * A selected return surface, stripped of its query. Payment/auth/admin routes never become a payment loop.
 * ⭐ A question bet returns to the page its sheet was opened on, and that is ANY page that opens the sheet — S8's one list,
 * `sheetOpensOn` (`/`, `/live`, `/watchlist`, `/markets/<id>`): the similar-questions rail opens question B's sheet on
 * question A's page, so `/markets/<A>` is a legitimate return for a bet on B (S9 release candidate, 2026-10-14; this
 * accepted only `/markets/<bet's own id>` and refused that player's way back). Canonical paths only: no trailing slash.
 */
export function depositReturnPath(raw: unknown, bet: PendingBet): string | null {
  if (typeof raw !== "string" || raw.length > MAX_NEXT_LEN || boundedNext(raw) !== raw) return null;
  const path = raw.split("?")[0].split("#")[0];
  if (bet.kind === "round") return path === `/updown/${bet.id}` ? path : null;
  return sheetOpensOn(path) && (path === "/" || !path.endsWith("/")) ? path : null;
}

/** Legacy null and malformed/future versions fail closed. Canonical keys prevent arbitrary metadata being saved. */
export function parseSavedDepositBet(raw: unknown): SavedDepositBet | null {
  if (!record(raw) || Object.keys(raw).sort().join(",") !== "bet,returnPath,v" || raw.v !== 1) return null;
  const bet = parseBetParam(raw.bet);
  if (!bet || bet.stake === null || formatBetParam(bet) !== raw.bet) return null;
  const path = depositReturnPath(raw.returnPath, bet);
  if (!path || path !== raw.returnPath) return null;
  return { v: 1, bet: formatBetParam(bet), returnPath: path };
}

export type DepositRow = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  provider: string | null;
  msisdn?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  providerRef?: string | null;
  providerStatus?: string | null;
  amlReason?: string | null;
  pendingBet?: unknown;
  houseBotId?: string | null;
};

/** Scope is checked before any projection/probe or return trust; the server adapter must use this before I/O. */
export function ownedDeposit(callerId: string, row: DepositRow | null): row is DepositRow {
  return callerId.length > 0 && !!row && row.userId === callerId && row.type === "DEPOSIT" && row.currency === "TZS" && row.houseBotId == null;
}

export type DepositBetTrust =
  | { kind: "none" }
  | { kind: "tab-marker"; hydrated: boolean; markerRaw: string | null }
  | { kind: "owned-deposit"; row: DepositRow | null };

/**
 * SSR supplies none. Only a fresh exact tab marker AFTER hydration authorizes a URL stake; a server-owned deposit
 * instead supplies its stored canonical intent. Raw URL tags cannot override that intent or impersonate ownership.
 * ⛔ THE CALLER IS THE MARKER'S OWNER (S9 release candidate, 2026-10-14). Since main's ee518f52a the host stamps the
 * signed-in account on the marker at the deposit tap, and `stakeFromUrl` refuses a stamped marker read without that
 * owner — so a read without `callerId` silently dropped every returning player's chosen stake.
 */
export function trustedDepositBet(
  callerId: string, rawClaim: unknown, returnPath: unknown, trust: DepositBetTrust, nowMs: number,
): SavedDepositBet | null {
  if (!Number.isFinite(nowMs) || callerId.length === 0 || trust.kind === "none") return null;
  if (trust.kind === "owned-deposit") {
    if (!ownedDeposit(callerId, trust.row)) return null;
    return parseSavedDepositBet(trust.row.pendingBet);
  }
  if (!trust.hydrated) return null;
  const bet = parseBetParam(rawClaim);
  if (!bet || stakeFromUrl(bet, trust.markerRaw, nowMs, callerId) === null) return null;
  const path = depositReturnPath(returnPath, bet);
  return path ? { v: 1, bet: formatBetParam(bet), returnPath: path } : null;
}

/**
 * A proposed SELECTION write for `kp-pending-bet`, never a storage mutation — and never a request key.
 * ⛔ Since main's ee518f52a the shared marker is only the 24-hour auth bridge: unresolved bet keys live in the account's
 * own `kp-sheet-intents:v2:<owner>` (`sheet-owned-storage.ts`), which a deposit neither reads nor writes, so entering a
 * payment cannot drop, renew or move one, and a legacy keyed envelope is quarantined by `saveSheetSelection` (the only
 * way the caller may store this) before it is replaced. This used to carry those keys forward inside the marker, which
 * the bridge now refuses. The selection is stamped with the caller as its owner, as the host's own deposit tap does,
 * and keeps the original choice's age and attribution — but only a choice of THIS account (or a keyless guest choice,
 * which may cross its own sign-in): entering a payment cannot renew the disclosed 24-hour bet lifetime.
 */
export function markerForDeposit(
  callerId: string, rawClaim: unknown, returnPath: unknown, trust: DepositBetTrust, existingRaw: string | null, nowMs: number,
): string | null {
  const saved = trustedDepositBet(callerId, rawClaim, returnPath, trust, nowMs);
  if (!saved || (existingRaw?.length ?? 0) > PENDING_BET_MAX_BYTES) return null;
  if (existingRaw) {
    try { if (!record(JSON.parse(existingRaw))) return null; } catch { return null; }
  }
  const mine = (m: PendingBetMarker | null): PendingBetMarker | null =>
    m && !m.k && (m.owner === undefined || m.owner === callerId) && m.bet === saved.bet ? m : null;
  const fromTab = trust.kind === "tab-marker" ? mine(readMarker(trust.markerRaw, nowMs)) : null;
  const selected = fromTab ?? mine(readMarker(existingRaw, nowMs));
  const bet = parseBetParam(saved.bet);
  if (!bet) return null;
  const raw = writeMarker(bet, selected?.at ?? nowMs, selected ?? {}, undefined, callerId);
  return raw.length <= PENDING_BET_MAX_BYTES ? raw : null;
}

function canonicalPhone(raw: unknown): string | null | false {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 64) return false;
  const text = readAsciiDigits(raw).trim();
  if (!/^\+?[0-9 ()-]+$/.test(text)) return false;
  const msisdn = toMsisdn255(text);
  return isGatewayMsisdn(msisdn) ? msisdn : false;
}

export type DepositFundingIntent = {
  userId: string; type: "DEPOSIT"; amount: number; currency: "TZS"; provider: PaymentMethodId;
  msisdn: string | null; pendingBet: SavedDepositBet | null;
};

/** Funding identity only: billing edits are absent from it and never mutate or redispatch the original Card order. */
export function canonicalDepositFunding(raw: unknown): DepositFundingIntent | null {
  if (!record(raw) || typeof raw.userId !== "string" || !raw.userId || raw.type !== "DEPOSIT" || raw.currency !== "TZS" || raw.houseBotId != null) return null;
  if (typeof raw.amount !== "number" || !Number.isSafeInteger(raw.amount) || raw.amount <= 0 || !isPaymentMethodId(raw.provider)) return null;
  const msisdn = canonicalPhone(raw.msisdn);
  if (msisdn === false || (raw.provider !== "CARD" && msisdn === null)) return null;
  const pendingBet = raw.pendingBet == null ? null : parseSavedDepositBet(raw.pendingBet);
  if (raw.pendingBet != null && !pendingBet) return null;
  return { userId: raw.userId, type: "DEPOSIT", amount: raw.amount, currency: "TZS", provider: raw.provider, msisdn, pendingBet };
}

/** The early replay and the concurrent-create recovery must both ask this before answering an existing global key. */
export function sameDepositFunding(request: unknown, stored: unknown): boolean {
  const a = canonicalDepositFunding(request), b = canonicalDepositFunding(stored);
  return !!a && !!b && a.userId === b.userId && a.type === b.type && a.amount === b.amount && a.currency === b.currency
    && a.provider === b.provider && a.msisdn === b.msisdn && JSON.stringify(a.pendingBet) === JSON.stringify(b.pendingBet);
}

function depositAge(createdAt: string, nowMs: number): number | null {
  const at = Date.parse(createdAt);
  return Number.isFinite(nowMs) && Number.isFinite(at) && at <= nowMs ? nowMs - at : null;
}

export type DepositWaitingBand = "fresh" | "slow" | "long" | "late" | "unknown";
export function depositWaitingBand(createdAt: string, nowMs: number): DepositWaitingBand {
  const age = depositAge(createdAt, nowMs);
  if (age === null) return "unknown";
  if (age < DEPOSIT_FRESH_MS) return "fresh";
  if (age < DEPOSIT_LONG_MS) return "slow";
  if (age < DEPOSIT_LATE_MS) return "long";
  return "late";
}

export type DepositViewState = "UNKNOWN" | "PENDING" | "PAID" | "FAILED" | "HELD" | "RETURNED" | "REVIEW";
export type DepositProjection = { state: "UNKNOWN" } | {
  state: Exclude<DepositViewState, "UNKNOWN">;
  txnId: string; amount: number; currency: "TZS"; provider: PaymentMethodId; status: TxnStatusValue;
  createdAt: string; completedAt: string | null; pendingBet: SavedDepositBet | null; serverNow: number;
};

/** Only a fresh owned row speaks. This does not infer status from age, callback parameters, a balance or an SSE hint. */
export function depositProjection(callerId: string, row: DepositRow | null, nowMs: number): DepositProjection {
  if (!ownedDeposit(callerId, row) || !row.id || !Number.isSafeInteger(row.amount) || row.amount <= 0
    || !isPaymentMethodId(row.provider) || depositAge(row.createdAt, nowMs) === null) return { state: "UNKNOWN" };
  const status = row.status;
  let state: Exclude<DepositViewState, "UNKNOWN">;
  if (hasDepositStatusReview(row)) state = "REVIEW";
  else if (isRgHeldDeposit(row)) state = "HELD";
  else if (status === "PROCESSING" || status === "PENDING") state = "PENDING";
  else if (status === "CONFIRMED") state = "PAID";
  else if (status === "AML_REVIEW") state = (row.amlReason ?? "").startsWith(RG_RETURN_MARK) ? "HELD" : "REVIEW";
  else if (status === "REVERSED") state = "RETURNED";
  else if (status === "FAILED" || status === "CANCELLED") state = "FAILED";
  else return { state: "UNKNOWN" };
  return {
    state, txnId: row.id, amount: row.amount, currency: "TZS", provider: row.provider as PaymentMethodId,
    status: presentedStatus({ ...row, status: status as TxnStatusValue }), createdAt: row.createdAt,
    completedAt: row.completedAt ?? null, pendingBet: parseSavedDepositBet(row.pendingBet), serverNow: nowMs,
  };
}

/** Eligibility only: the server still spends the real owned-transaction bucket and verifies the signed provider reply. */
export function canProbeDeposit(callerId: string, row: DepositRow | null, nowMs: number): boolean {
  if (!ownedDeposit(callerId, row) || hasDepositStatusReview(row) || !isMobileMoneyMethodId(row.provider) || !canonicalDepositFunding(row)
    || row.status !== "PROCESSING" || !row.providerRef) return false;
  const age = depositAge(row.createdAt, nowMs);
  return age !== null && age >= DEPOSIT_PROBE_AGE_MS;
}

/** Unknown reads remain retryable; terminal/held/review screens register no payment poll. */
export function depositPollDelay(state: DepositViewState, createdAt: string, nowMs: number): number | null {
  if (state !== "PENDING" && state !== "UNKNOWN") return null;
  const age = depositAge(createdAt, nowMs);
  return age !== null && age < DEPOSIT_FRESH_MS ? DEPOSIT_FAST_POLL_MS : DEPOSIT_SLOW_POLL_MS;
}

/** For a NEW manual question bet only. The server owns all inputs and persists this decision once on create. */
export function isDepositReturnBet(
  callerId: string, row: DepositRow | null, quote: { marketId: string; side: string; stake: number; houseBotId?: string | null }, placedAtMs: number,
): boolean {
  if (!ownedDeposit(callerId, row) || row.status !== "CONFIRMED" || quote.houseBotId != null) return false;
  const saved = parseSavedDepositBet(row.pendingBet), bet = saved && parseBetParam(saved.bet);
  const createdAtMs = Date.parse(row.createdAt), completedAtMs = Date.parse(row.completedAt ?? ""), elapsed = placedAtMs - completedAtMs;
  return !!bet && bet.kind === "market" && bet.id === quote.marketId && bet.side === quote.side && bet.stake === quote.stake
    && Number.isFinite(createdAtMs) && completedAtMs >= createdAtMs
    && Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= DEPOSIT_RETURN_WINDOW_MS;
}
