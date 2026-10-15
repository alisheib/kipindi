/** Browser-only deposit choice and waiting rules. Server funding and origin checks live in deposit-state.ts. */
import { boundedNext, MAX_NEXT_LEN } from "../safe-next";
import type { PaymentMethodId } from "../payment-providers";
import type { TxnStatusValue } from "../wallet/ledger";
import { formatBetParam, parseBetParam, readMarker, stakeFromUrl, writeMarker, PENDING_BET_MAX_BYTES, type PendingBet, type PendingBetMarker } from "./pending-bet";
import { sheetOpensOn } from "./sheet-state";

export const DEPOSIT_FRESH_MS = 60_000;
export const DEPOSIT_LONG_MS = 10 * 60_000;
export const DEPOSIT_LATE_MS = 30 * 60_000;
export const DEPOSIT_FAST_POLL_MS = 3_000;
export const DEPOSIT_SLOW_POLL_MS = 10_000;

export type SavedDepositBet = { v: 1; bet: string; returnPath: string };
type OwnedStatusRow = { userId: string; type: string; currency: string; pendingBet?: unknown };
export type DepositBetTrust =
  | { kind: "none" }
  | { kind: "tab-marker"; hydrated: boolean; markerRaw: string | null }
  | { kind: "owned-deposit"; row: OwnedStatusRow | null };

function record(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === "object" && !Array.isArray(raw);
}

export function depositReturnPath(raw: unknown, bet: PendingBet): string | null {
  if (typeof raw !== "string" || raw.length > MAX_NEXT_LEN || boundedNext(raw) !== raw) return null;
  const path = raw.split("?")[0].split("#")[0];
  if (bet.kind === "round") return path === `/updown/${bet.id}` ? path : null;
  return sheetOpensOn(path) && (path === "/" || !path.endsWith("/")) ? path : null;
}

export function parseSavedDepositBet(raw: unknown): SavedDepositBet | null {
  if (!record(raw) || Object.keys(raw).sort().join(",") !== "bet,returnPath,v" || raw.v !== 1) return null;
  const bet = parseBetParam(raw.bet);
  if (!bet || bet.stake === null || formatBetParam(bet) !== raw.bet) return null;
  const path = depositReturnPath(raw.returnPath, bet);
  if (!path || path !== raw.returnPath) return null;
  return { v: 1, bet: formatBetParam(bet), returnPath: path };
}

function ownedStatus(callerId: string, row: OwnedStatusRow | null): row is OwnedStatusRow {
  return callerId.length > 0 && !!row && row.userId === callerId && row.type === "DEPOSIT" && row.currency === "TZS";
}

/** A tab choice needs its exact marker. An owned choice comes only from a server-authenticated status response. */
export function trustedDepositBet(
  callerId: string, rawClaim: unknown, returnPath: unknown, trust: DepositBetTrust, nowMs: number,
): SavedDepositBet | null {
  if (!Number.isFinite(nowMs) || callerId.length === 0 || trust.kind === "none") return null;
  if (trust.kind === "owned-deposit") {
    if (!ownedStatus(callerId, trust.row)) return null;
    return parseSavedDepositBet(trust.row.pendingBet);
  }
  if (!trust.hydrated) return null;
  const bet = parseBetParam(rawClaim);
  if (!bet || stakeFromUrl(bet, trust.markerRaw, nowMs, callerId) === null) return null;
  const path = depositReturnPath(returnPath, bet);
  return path ? { v: 1, bet: formatBetParam(bet), returnPath: path } : null;
}

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

export function depositPollDelay(state: DepositViewState, createdAt: string, nowMs: number): number | null {
  if (state !== "PENDING" && state !== "UNKNOWN") return null;
  const age = depositAge(createdAt, nowMs);
  return age !== null && age < DEPOSIT_FRESH_MS ? DEPOSIT_FAST_POLL_MS : DEPOSIT_SLOW_POLL_MS;
}
