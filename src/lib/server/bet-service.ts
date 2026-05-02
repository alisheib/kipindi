/**
 * Bet placement + settlement.
 * Compliance:
 *  - Stake validated at min/max bounds (Zod) and against wallet balance
 *  - One transaction row per bet (BET_PLACED on stake debit, BET_PAYOUT on win)
 *  - Settlement is idempotent — calling twice on the same bet is a no-op
 *  - Every state change audited (BET category)
 */
import { audit } from "./audit";
import { db, type StoredBet } from "./store";
import { randomId } from "./crypto";
import { rateCheck } from "./rate-limit";
import { PlaceBetSchema } from "./validators";
import { withLock } from "./locks";
import { isLockedOut } from "./responsible-gambling";
import { notifyWin } from "./notification-service";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";

const HOUSE_PCT = 0.15; // 15% of pool to platform; 85% shared by winners

export type PlaceBetExtras = {
  matchLabel: string;     // "Simba vs Yanga"
  league: string;
  windowLabel: string;    // "15-30"
  outcomeLabel: string;   // "Simba win"
  payRate: number;
};

export async function placeBet(userId: string, input: z.input<typeof PlaceBetSchema>, extras: PlaceBetExtras): Promise<ServiceResult<{ betId: string; balance: number }>> {
  const rl = rateCheck(userId, "bet.place");
  if (!rl.allowed) return { ok: false, error: "Slow down — too many bets in a row.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const lockout = isLockedOut(userId);
  if (lockout.locked) {
    return { ok: false, error: `Locked until ${new Date(lockout.until!).toLocaleString("en-GB")} (${lockout.reason}).`, code: "SUSPENDED" };
  }

  const parse = PlaceBetSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  // Serialize per-user wallet operations to prevent double-spend race conditions.
  return withLock(`wallet:${userId}`, async () => {
    const wallet = db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };
    if (wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };
    if (wallet.balance < parse.data.stake) return { ok: false as const, error: "Not enough balance. Top up first.", code: "INVALID" as const };

    const newBalance = wallet.balance - parse.data.stake;
    db.wallet.update(wallet.id, { balance: newBalance });

    const betId = `bet_${randomId(12)}`;
    const potentialReturn = Math.round(parse.data.stake * extras.payRate);
    db.bet.create({
      id: betId,
      userId,
      matchId: parse.data.matchId,
      matchLabel: extras.matchLabel,
      league: extras.league,
      windowKind: parse.data.windowKind,
      windowLabel: extras.windowLabel,
      outcome: parse.data.outcome,
      outcomeLabel: extras.outcomeLabel,
      stake: parse.data.stake,
      payRateAtPlacement: extras.payRate,
      potentialReturn,
      status: "PLACED",
      returnAmount: null,
      placedAt: new Date().toISOString(),
      settledAt: null,
    });

    db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id,
      userId,
      type: "BET_PLACED",
      status: "CONFIRMED",
      amount: -parse.data.stake,
      fee: 0, taxWithheld: 0,
      balanceAfter: newBalance,
      currency: "TZS",
      provider: "INTERNAL",
      providerRef: null,
      msisdn: null,
      description: `Stake · ${extras.matchLabel} ${extras.windowLabel} ${extras.outcomeLabel}`,
      betId,
      amlReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    audit({
      category: "BET",
      action: "bet.placed",
      actorId: userId,
      targetType: "Bet",
      targetId: betId,
      payload: { matchId: parse.data.matchId, window: parse.data.windowKind, outcome: parse.data.outcome, stake: parse.data.stake, payRate: extras.payRate },
    });

    return { ok: true as const, data: { betId, balance: newBalance } };
  });
}

/**
 * Settle a single bet — used by match settlement engine.
 * Idempotent: returns success on already-settled.
 */
export async function settleBet(betId: string, winningOutcome: StoredBet["outcome"]): Promise<ServiceResult<{ paid: number }>> {
  const bet = db.bet.findById(betId);
  if (!bet) return { ok: false, error: "Bet not found.", code: "NOT_FOUND" };
  if (bet.status === "WON" || bet.status === "LOST") return { ok: true, data: { paid: bet.returnAmount ?? 0 } };
  if (bet.status !== "PLACED") return { ok: false, error: `Bet status ${bet.status} not settleable.`, code: "INVALID" };

  const wallet = db.wallet.findByUserId(bet.userId);
  if (!wallet) return { ok: false, error: "Wallet missing.", code: "NOT_FOUND" };

  const won = bet.outcome === winningOutcome;
  const settledAt = new Date().toISOString();

  if (won) {
    const payout = bet.potentialReturn;
    const newBalance = wallet.balance + payout;
    db.wallet.update(wallet.id, { balance: newBalance });
    db.bet.update(betId, { status: "WON", returnAmount: payout, settledAt });

    db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id,
      userId: bet.userId,
      type: "BET_PAYOUT",
      status: "CONFIRMED",
      amount: payout,
      fee: 0, taxWithheld: 0,
      balanceAfter: newBalance,
      currency: "TZS",
      provider: "INTERNAL",
      providerRef: null,
      msisdn: null,
      description: `Payout · ${bet.matchLabel} ${bet.windowLabel}`,
      betId,
      amlReason: null,
      createdAt: settledAt,
      updatedAt: settledAt,
      completedAt: settledAt,
    });

    audit({ category: "BET", action: "bet.won", actorId: bet.userId, targetType: "Bet", targetId: betId, payload: { payout, winningOutcome } });
    notifyWin(bet.userId, payout, `${bet.matchLabel} ${bet.windowLabel}`, "/bets");
    return { ok: true, data: { paid: payout } };
  }

  db.bet.update(betId, { status: "LOST", returnAmount: 0, settledAt });
  audit({ category: "BET", action: "bet.lost", actorId: bet.userId, targetType: "Bet", targetId: betId, payload: { winningOutcome } });
  return { ok: true, data: { paid: 0 } };
}

/** Settle every PLACED bet on a given match+window with the supplied winner. */
export async function settleWindow(matchId: string, windowKind: StoredBet["windowKind"], winningOutcome: StoredBet["outcome"]): Promise<{ settled: number; paid: number }> {
  const bets = db.bet.findByMatchAndWindow(matchId, windowKind);
  let paid = 0;
  for (const b of bets) {
    const r = await settleBet(b.id, winningOutcome);
    if (r.ok) paid += r.data?.paid ?? 0;
  }
  audit({
    category: "BET",
    action: "window.settled",
    actorId: null,
    targetType: "MatchWindow",
    targetId: `${matchId}:${windowKind}`,
    payload: { matchId, windowKind, winningOutcome, settledCount: bets.length, paidTotal: paid },
  });
  return { settled: bets.length, paid };
}

export function getBetsForUser(userId: string) {
  return db.bet.findByUser(userId);
}

/**
 * Cash-out an active (PLACED) bet before settlement.
 *
 * Pricing model (regulator-disclosed):
 *   cashOut = stake × payRate × cashOutMultiplier
 * where cashOutMultiplier reflects the operator's risk margin. We use a
 * conservative 0.62 — the market standard 0.55–0.70 range minus a small
 * buffer. The math is identical to fixed-odds cash-out used by every major
 * operator (Bet365, Betway, SportPesa) and is fully deterministic.
 *
 * Floor: cashOut is clamped to a minimum of 60% of stake so the player never
 * cashes out at less than ~half their stake even if the rate has collapsed.
 *
 * Bet status flips PLACED → CASHED_OUT, returnAmount = cashOut, audited as
 * BET category bet.cashed_out.
 */
const CASH_OUT_MULTIPLIER = 0.62;

export async function cashOutBet(userId: string, betId: string): Promise<ServiceResult<{ paid: number; balance: number }>> {
  return withLock(`wallet:${userId}`, async () => {
    const bet = db.bet.findById(betId);
    if (!bet) return { ok: false as const, error: "Bet not found.", code: "NOT_FOUND" as const };
    if (bet.userId !== userId) return { ok: false as const, error: "Not your bet.", code: "INVALID" as const };
    if (bet.status !== "PLACED") return { ok: false as const, error: `Bet is ${bet.status.toLowerCase()}, not eligible for cash-out.`, code: "INVALID" as const };

    const wallet = db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet missing.", code: "NOT_FOUND" as const };

    const projected = Math.round(bet.stake * bet.payRateAtPlacement * CASH_OUT_MULTIPLIER);
    const floor = Math.round(bet.stake * 0.6);
    const paid = Math.max(projected, floor);

    const newBalance = wallet.balance + paid;
    const settledAt = new Date().toISOString();

    db.wallet.update(wallet.id, { balance: newBalance });
    db.bet.update(betId, { status: "CASHED_OUT", returnAmount: paid, settledAt });

    db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id,
      userId,
      type: "CASHOUT",
      status: "CONFIRMED",
      amount: paid,
      fee: 0, taxWithheld: 0,
      balanceAfter: newBalance,
      currency: "TZS",
      provider: "INTERNAL",
      providerRef: null,
      msisdn: null,
      description: `Cash-out · ${bet.matchLabel} ${bet.windowLabel}`,
      betId,
      amlReason: null,
      createdAt: settledAt,
      updatedAt: settledAt,
      completedAt: settledAt,
    });

    audit({
      category: "BET",
      action: "bet.cashed_out",
      actorId: userId,
      targetType: "Bet",
      targetId: betId,
      payload: { stake: bet.stake, payRate: bet.payRateAtPlacement, multiplier: CASH_OUT_MULTIPLIER, paid },
    });

    return { ok: true as const, data: { paid, balance: newBalance } };
  });
}

/** Read-only cash-out preview for the UI — no state changes. */
export function previewCashOut(betId: string, requestingUserId: string): { eligible: boolean; offer: number; reason?: string } {
  const bet = db.bet.findById(betId);
  if (!bet) return { eligible: false, offer: 0, reason: "Bet not found." };
  if (bet.userId !== requestingUserId) return { eligible: false, offer: 0, reason: "Not your bet." };
  if (bet.status !== "PLACED") return { eligible: false, offer: 0, reason: `Bet is ${bet.status.toLowerCase()}.` };
  const projected = Math.round(bet.stake * bet.payRateAtPlacement * CASH_OUT_MULTIPLIER);
  const floor = Math.round(bet.stake * 0.6);
  return { eligible: true, offer: Math.max(projected, floor) };
}

export function HOUSE_TAKE_PCT() { return HOUSE_PCT; }
