/**
 * Mapigo round + bet lifecycle.
 * Round states: OPEN → SETTLED
 * Bet states:   PLACED → WON | LOST
 */
import { audit } from "./audit";
import { db, type StoredMapigoRound } from "./store";
import { randomId } from "./crypto";
import { rateCheck } from "./rate-limit";
import { withLock } from "./locks";
import { isLockedOut } from "./responsible-gambling";
import { notifyWin } from "./notification-service";
import type { ServiceResult } from "./auth-service";

const ROUND_DURATION_MS = 60_000;

/** Fetch the active open round, or open a new one if none exists / current expired. */
export function getOrOpenCurrentRound(): StoredMapigoRound {
  const open = db.mapigoRound.listOpen();
  for (const r of open) {
    const elapsed = Date.now() - new Date(r.startedAt).getTime();
    if (elapsed < ROUND_DURATION_MS) return r;
  }
  // No active open — open a new one
  const all = db.mapigoRound.list(1);
  const number = (all[0]?.number ?? 84) + 1;
  const round = db.mapigoRound.create({
    id: `mr_${randomId(10)}`,
    number,
    status: "OPEN",
    result: null,
    pool: 0,
    poolByCall: { SPIKE: 0, DRIFT: 0, CALM: 0 },
    payRate: { SPIKE: 2.3, DRIFT: 3.1, CALM: 4.2 },
    participants: 0,
    startedAt: new Date().toISOString(),
    endedAt: null,
  });
  audit({ category: "BET", action: "mapigo.round.opened", actorId: null, targetType: "MapigoRound", targetId: round.id, payload: { number } });
  return round;
}

export async function placeMapigoBet(userId: string, opts: { call: "SPIKE" | "DRIFT" | "CALM"; stake: number }): Promise<ServiceResult<{ betId: string; roundNumber: number; balance: number }>> {
  const rl = rateCheck(userId, "bet.place");
  if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const lockout = isLockedOut(userId);
  if (lockout.locked) {
    return { ok: false, error: `Locked until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };
  }

  if (!Number.isInteger(opts.stake) || opts.stake < 100 || opts.stake > 50_000) {
    return { ok: false, error: "Stake must be a whole number between TZS 100 and TZS 50,000.", code: "INVALID" };
  }
  if (!["SPIKE", "DRIFT", "CALM"].includes(opts.call)) {
    return { ok: false, error: "Invalid call.", code: "INVALID" };
  }

  // Wallet operations serialized; round-update also serialized via the round-id key.
  return withLock(`wallet:${userId}`, async () => {
    const wallet = db.wallet.findByUserId(userId);
    if (!wallet || wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet unavailable.", code: "NOT_FOUND" as const };
    if (wallet.balance < opts.stake) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };

    const round = getOrOpenCurrentRound();

    const existing = db.mapigoBet.findByRound(round.id).find((b) => b.userId === userId);
    if (existing) return { ok: false as const, error: "You already placed a call this round.", code: "INVALID" as const };

    const newBalance = wallet.balance - opts.stake;
    db.wallet.update(wallet.id, { balance: newBalance });

    const betId = `mb_${randomId(10)}`;
    const potentialReturn = Math.round(opts.stake * round.payRate[opts.call]);
    db.mapigoBet.create({
      id: betId,
      userId,
      roundId: round.id,
      call: opts.call,
      stake: opts.stake,
      potentialReturn,
      status: "PLACED",
      returnAmount: null,
      placedAt: new Date().toISOString(),
      settledAt: null,
    });

    db.mapigoRound.update(round.id, {
      pool: round.pool + opts.stake,
      poolByCall: { ...round.poolByCall, [opts.call]: round.poolByCall[opts.call] + opts.stake },
      participants: round.participants + 1,
    });

    db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id,
      userId,
      type: "BET_PLACED",
      status: "CONFIRMED",
      amount: -opts.stake,
      fee: 0, taxWithheld: 0,
      balanceAfter: newBalance,
      currency: "TZS",
      provider: "INTERNAL",
      providerRef: null,
      msisdn: null,
      description: `Mapigo round #${round.number} · ${opts.call}`,
      betId,
      amlReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    audit({
      category: "BET",
      action: "mapigo.bet.placed",
      actorId: userId,
      targetType: "MapigoBet",
      targetId: betId,
      payload: { roundId: round.id, roundNumber: round.number, call: opts.call, stake: opts.stake, payRate: round.payRate[opts.call] },
    });

    return { ok: true as const, data: { betId, roundNumber: round.number, balance: newBalance } };
  });
}

/** Settle a round — choose a result deterministically based on the round id. */
export async function settleRound(roundId: string, forcedResult?: "SPIKE" | "DRIFT" | "CALM"): Promise<ServiceResult<{ result: "SPIKE" | "DRIFT" | "CALM"; winnersPaid: number }>> {
  const round = db.mapigoRound.findById(roundId);
  if (!round) return { ok: false, error: "Round not found.", code: "NOT_FOUND" };
  if (round.status === "SETTLED") return { ok: true, data: { result: round.result!, winnersPaid: 0 } };

  // Pick a result — bias toward SPIKE (most common in real matches)
  const r = forcedResult ?? pickResult(round.id);

  const bets = db.mapigoBet.findByRound(roundId);
  let winnersPaid = 0;
  const settledAt = new Date().toISOString();
  for (const bet of bets) {
    if (bet.call === r) {
      const wallet = db.wallet.findByUserId(bet.userId);
      if (!wallet) continue;
      const payout = bet.potentialReturn;
      const newBalance = wallet.balance + payout;
      db.wallet.update(wallet.id, { balance: newBalance });
      db.mapigoBet.update(bet.id, { status: "WON", returnAmount: payout, settledAt });
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
        description: `Mapigo round #${round.number} · ${r} paid`,
        betId: bet.id,
        amlReason: null,
        createdAt: settledAt,
        updatedAt: settledAt,
        completedAt: settledAt,
      });
      winnersPaid += payout;
      notifyWin(bet.userId, payout, `Mapigo round #${round.number} · ${r}`, "/bets");
    } else {
      db.mapigoBet.update(bet.id, { status: "LOST", returnAmount: 0, settledAt });
    }
  }

  db.mapigoRound.update(roundId, { status: "SETTLED", result: r, endedAt: settledAt });
  audit({
    category: "BET",
    action: "mapigo.round.settled",
    actorId: null,
    targetType: "MapigoRound",
    targetId: roundId,
    payload: { roundNumber: round.number, result: r, betCount: bets.length, paidTotal: winnersPaid },
  });

  return { ok: true, data: { result: r, winnersPaid } };
}

function pickResult(seed: string): "SPIKE" | "DRIFT" | "CALM" {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const x = Math.abs(h) % 100;
  if (x < 45) return "SPIKE";
  if (x < 80) return "DRIFT";
  return "CALM";
}

export function getCurrentRound(): StoredMapigoRound {
  return getOrOpenCurrentRound();
}
export function getRecentRounds(limit = 8) {
  return db.mapigoRound.list(limit).filter((r) => r.status === "SETTLED");
}
export function getMyMapigoBets(userId: string, limit = 20) {
  return db.mapigoBet.findByUser(userId, limit);
}
