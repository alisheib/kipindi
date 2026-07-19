/**
 * Market service — binary YES/NO price-competition markets, pari-mutuel pool.
 *
 * Pool model (regulator-approved):
 *   1. Officer creates a market with a title, source URL, resolutionAt timestamp,
 *      and a written resolution criterion. Market opens with empty pools.
 *   2. Players buy YES or NO at the current implied probability (derived from
 *      pool weights). Stake goes into the corresponding side's pool.
 *   3. At resolutionAt, two officers (different userIds) confirm the outcome.
 *      Audit chain captures both signatures + the source URL.
 *   4. 24-hour public objection window — anyone can flag, audit captures it.
 *   5. After window closes: winners share the pool, minus our commission —
 *      min(commissionRate * pool, feeCeilingRate * smaller side); see payout.ts.
 *      Each winner's payout = stake + (their_stake / winning_pool) × (losing_pool * 0.91)
 *
 * Aligns with Tanzania GBT pari-mutuel licensing + LCCP RTS 7B disclosure.
 */
import { audit } from "./audit";
import { db } from "./store";
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { withAdmission, AdmissionBusy } from "./admission";
import { withTransientRetry } from "./retry";
import { emit } from "./event-bus";
import { spendBonusLocked, recordWageringLocked, reverseWagering, refundBonusToActive, refundBonusLocked, expireActiveGrants, type BonusAllocation } from "./bonus-service";
import { notifyBonusFulfilled } from "./notification-service";
import { isLockedOut, checkLossLimit } from "./responsible-gambling";
import { rateCheck } from "./rate-limit";
import { getEffectiveConfig, snapshotFromConfig, snapshotOrLegacy } from "./market-config";
import { payoutFor, settledPayoutFor, allocateWinnerPayouts, poolFee, levySplit, type FeeSnapshot } from "@/lib/payout";
import { getConflictedResolutionAllowed } from "./test-overrides";
import { getAutoSettleEnabled } from "./payment-control";
import { isMaintenanceMode, maintenanceMessage } from "./platform-config";
import { recordSnapshot, seedHistory } from "./market-history";
import { notifyBetPlaced, notifyWin, notifyLoss, notifyRefund, notifyCashout, notifyAdminMarketResolution, notifyMarketCancelled, notifyAdminMarketCancelled, notifyOneSidedRefund, notifySelectionClosed } from "./notification-service";
import { sendEmailToUser, betPlacedHtml, winNotificationHtml, lossNotificationHtml, cashOutReceiptHtml, oneSidedRefundHtml, marketResolutionAdminHtml, marketCancelledRefundHtml, marketCancelledAdminHtml, bonusFulfilledHtml, selectionClosedHtml } from "./email";
import { onRecruitBet, onRecruitSettlement } from "./affiliate-service";
import { postLedgerEntries, stakeEntries, settlementPayoutEntries, refundEntries, cashoutEntries, withMoneyTx } from "./ledger";
import type { ServiceResult } from "./auth-service";
import { marketStore, positionStore } from "./market-dal";
import { formatTzs } from "@/lib/utils";

// OPERATOR_MARGIN (a dead 0.09 constant with no call sites) is gone. So is
// CASHOUT_SLIPPAGE. Rates live in RateConfig and, for a poll that exists, in its
// immutable feeSnapshot — nothing money-side is hardcoded any more.
export const MIN_STAKE = 100;
export const MAX_STAKE = 1_000_000;

// NOTE: Politics is intentionally NOT in this list — Tanzania Gaming Board
// licence terms exclude political-event markets. Operators caught listing
// political markets risk the licence. Do not add it back without a written
// regulator carve-out.
export type MarketCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other";
export type MarketStatus = "DRAFT" | "LIVE" | "CLOSED" | "RESOLVED" | "VOIDED";
export type Side = "YES" | "NO";

export type StoredMarket = {
  id: string;
  titleEn: string;
  titleSw: string;
  titleZh: string | null;
  category: MarketCategory;
  sourceUrl: string;
  resolutionCriterion: string;
  resolutionAt: string;
  /** When new bets (selections) stop being accepted. Null = bets close at
   *  resolutionAt (legacy behavior). Always < resolutionAt when set. */
  selectionClosedAt: string | null;
  status: MarketStatus;
  yesPool: number;
  noPool: number;
  predictorCount: number;
  /** The fee rates FROZEN onto this poll at creation. Settlement, cash-out and
   *  every payout preview price against THIS, never live admin config — so
   *  retuning a rate can no longer reprice a bet that is already placed.
   *  Null only on pre-migration rows; snapshotOrLegacy() handles those. */
  feeSnapshot: FeeSnapshot | null;
  resolvedOutcome: Side | "VOID" | null;
  resolutionStage1By: string | null;
  resolutionStage1At: string | null;
  resolutionStage2By: string | null;
  resolutionStage2At: string | null;
  objectionsClosedAt: string | null;
  /** When this market's money actually moved — winners credited, losers closed,
   *  refunds issued. THIS is settlement; `status: RESOLVED` is only the verdict.
   *
   *  A market that is RESOLVED with `settledAt: null` has been adjudicated but
   *  its pool is still intact and every position is still OPEN: that is the state
   *  a player objects from, and it is what makes the objection window a real gate
   *  rather than a countdown drawn over money that already left. `settleDueMarkets`
   *  stamps this once the window has closed and no objection is open. */
  settledAt: string | null;
  /** The officer's recorded evidence excerpt — the exact quote from the official
   *  source that justifies the verdict, captured at stage-1 of the two-officer
   *  ceremony (and written immutably to the audit chain). Denormalised here so the
   *  player-facing settlement-proof panel can render it. Capped at 2000 chars.
   *  Null = none recorded (empty-state; never fabricated). */
  resolutionEvidence?: string | null;
  /** When admins were alerted that this market is closed-by-time and awaiting
   *  their resolution. Set once by the resolution-due sweep so the alert fires
   *  exactly once per market. Null = not yet alerted (or not yet due). */
  resolutionNotifiedAt?: string | null;
  /** When the market's bettors were notified that selections have closed and it
   *  is awaiting results. Set once by the selection-closed sweep so the
   *  "waiting for results" notification fires exactly once per market. */
  selectionClosedNotifiedAt?: string | null;
  /** When WATCHERS were alerted this market closes within the hour. Set once by
   *  the closing-soon sweep so a follower is nudged exactly once per market. */
  closingSoonNotifiedAt?: string | null;
  /** AI sentinel recommendation — populated when the sentinel closes this
   *  market. Officers see this in the resolver queue as a pre-filled suggestion
   *  so their job is "verify + confirm" instead of "research + decide". */
  sentinelOutcome?: "YES" | "NO" | null;
  sentinelEvidence?: string | null;
  sentinelReasoning?: string | null;
  sentinelSourceUrl?: string | null;
  sentinelConfidence?: number | null;
  sentinelClosedAt?: string | null;
  proposedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredPosition = {
  id: string;
  userId: string;
  marketId: string;
  side: Side;
  stake: number;
  /** Portion of `stake` funded from the bonus wallet (whole TZS). 0 = fully real.
   *  Optional so positions created before the bonus wallet shipped read as 0. */
  bonusStakeTzs?: number;
  potentialPayout: number;
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  finalPayout: number | null;
  placedAt: string;
  settledAt: string | null;
  /** Client-generated UUID — prevents double-submit on 2G. Null for internal positions. */
  idempotencyKey?: string | null;
};


/** Implied probability of YES side based on pool weight. Even-split when pools are zero. */
export function impliedYesPct(m: Pick<StoredMarket, "yesPool" | "noPool">): number {
  const total = m.yesPool + m.noPool;
  if (total === 0) return 50;
  return Math.round((m.yesPool / total) * 100);
}

/**
 * Whole-pool pari-mutuel projection for a bet NOT YET PLACED.
 *   fee     = min(commissionRate × pool, feeCeilingRate × smallerSide)
 *   payout  = (stake / winningSidePool) × (pool - fee)
 *
 * Prices against the POLL'S OWN frozen rates when the poll exists. A projection
 * that used live config while settlement used something else is precisely how the
 * dial ended up quoting a number we did not pay.
 */
export async function projectedPayout(
  m: Pick<StoredMarket, "yesPool" | "noPool"> & { id?: string; feeSnapshot?: FeeSnapshot | null },
  side: Side,
  stake: number,
): Promise<number> {
  // A poll in hand → its snapshot. No poll yet (a pre-creation preview) → the
  // live config, which is exactly what a poll created right now would freeze.
  const rates = m.feeSnapshot !== undefined
    ? ratesFor({ feeSnapshot: m.feeSnapshot ?? null })
    : await getEffectiveConfig(m.id);
  return payoutFor({ yesPool: m.yesPool, noPool: m.noPool, side, stake }, rates).payout;
}

/** A "Demo · " market is a synthetic training fixture. Per tester feedback
 *  these are hidden from every player-facing listing. They are NOT deleted
 *  (that would orphan real positions placed on them) — existing demo bets
 *  still settle via autoResolveExpiredDemoMarkets and remain reachable by id
 *  on /positions. New demo markets are no longer seeded. */
export function isDemoMarket(m: Pick<StoredMarket, "titleEn">): boolean {
  return m.titleEn.startsWith("Demo · ");
}

export async function listMarkets(filter?: { status?: MarketStatus; category?: MarketCategory }) {
  return (await marketStore.values())
    .filter((m) => !isDemoMarket(m))
    .filter((m) => !filter?.status   || m.status === filter.status)
    .filter((m) => !filter?.category || m.category === filter.category)
    .sort((a, b) => a.resolutionAt.localeCompare(b.resolutionAt));
}

export async function getMarket(id: string) {
  return (await marketStore.get(id)) ?? null;
}

/** A market is "closed by time" once resolutionAt has passed, regardless
 *  of whether the resolver has run stage-1 yet. The server enforces this
 *  at buyPosition (line ~185), and the client uses it to disable the dial
 *  + drop the market from the bettable grid the moment the clock hits 0,
 *  so the visitor sees a clean state transition without a hard refresh. */
export function isClosedByTime(m: Pick<StoredMarket, "resolutionAt" | "status">): boolean {
  if (m.status === "RESOLVED" || m.status === "VOIDED" || m.status === "CLOSED") return true;
  return Date.parse(m.resolutionAt) <= Date.now();
}

/** True when the selection window has closed (no new bets) but the market is
 *  still LIVE awaiting its outcome. If selectionClosedAt is null, falls back
 *  to the resolutionAt time close (legacy behavior). */
export function isSelectionClosed(m: Pick<StoredMarket, "selectionClosedAt" | "resolutionAt" | "status">): boolean {
  if (m.status === "RESOLVED" || m.status === "VOIDED" || m.status === "CLOSED") return true;
  const cutoff = m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt);
  return cutoff <= Date.now();
}

export type CreateMarketInput = {
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  category: MarketCategory;
  sourceUrl: string;
  resolutionCriterion: string;
  resolutionAt: string;
  selectionClosedAt?: string | null;
  proposedBy: string;
};

export async function createMarket(input: CreateMarketInput) {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const id = `mkt_${randomId(10)}`;

  // Hard guard: never create a market whose resolution is already in the past.
  const resMs = Date.parse(input.resolutionAt);
  if (!Number.isFinite(resMs) || resMs <= nowMs) {
    throw new Error("Cannot create a market with a past or invalid resolution date.");
  }
  // If selectionClosedAt is already past, drop it — the market would be born
  // with betting immediately closed, which is useless. Null falls back to
  // resolutionAt (legacy behavior = betting open until resolution).
  let effectiveSelectionClosedAt = input.selectionClosedAt ?? null;
  if (effectiveSelectionClosedAt) {
    const selMs = Date.parse(effectiveSelectionClosedAt);
    if (!Number.isFinite(selMs) || selMs <= nowMs || selMs >= resMs) {
      effectiveSelectionClosedAt = null;
    }
  }

  // THE RATES STICK TO THE POLL. Freeze the live config onto the market at
  // creation; settlement, cash-out and every preview price against this copy for
  // the rest of the poll's life. An admin retuning a rate tomorrow cannot reach
  // back and reprice a bet placed today.
  const feeSnapshot = snapshotFromConfig(await getEffectiveConfig(id));

  const m: StoredMarket = {
    id,
    titleEn: input.titleEn,
    titleSw: input.titleSw,
    titleZh: input.titleZh ?? null,
    category: input.category,
    sourceUrl: input.sourceUrl,
    resolutionCriterion: input.resolutionCriterion,
    resolutionAt: input.resolutionAt,
    selectionClosedAt: effectiveSelectionClosedAt,
    status: "LIVE",
    yesPool: 0,
    noPool: 0,
    predictorCount: 0,
    feeSnapshot,
    resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null,
    settledAt: null,
    proposedBy: input.proposedBy,
    createdAt: now,
    updatedAt: now,
  };
  await marketStore.set(m);
  audit({
    category: "ADMIN",
    action: "market.created",
    actorId: input.proposedBy,
    targetType: "Market",
    targetId: m.id,
    // The frozen rates go into the tamper-evident chain too — so we can always
    // prove, to a player or an inspector, what this poll was priced at.
    payload: { titleEn: m.titleEn, category: m.category, sourceUrl: m.sourceUrl, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot },
  });
  return m;
}

/**
 * The rates THIS poll is priced at. The one function every money path calls.
 *
 * Never call getEffectiveConfig() in a payout path — that reads LIVE config and
 * is exactly how a rate change used to silently reprice bets already placed.
 * getEffectiveConfig is for stamping a NEW poll and for the admin UI. This is for
 * paying an existing one.
 */
export function ratesFor(m: Pick<StoredMarket, "feeSnapshot">): FeeSnapshot {
  return snapshotOrLegacy(m.feeSnapshot);
}

/** Internal control-flow signal for buyPosition's money transaction: thrown
 *  inside `withMoneyTx` so Prisma rolls back EVERY write of the bet (real debit,
 *  bonus spend, pool increment, position, txn, ledger), then mapped to a clean
 *  player-facing rejection. Never escapes buyPosition. */
class BetAbort extends Error {
  constructor(readonly reason: "NO_FUNDS") { super(`bet aborted: ${reason}`); }
}

type BuyOpts = { marketId: string; side: Side; stake: number; idempotencyKey?: string };
type BuyResult = ServiceResult<{ positionId: string; balance: number; payoutIfWin: number }>;

/**
 * Player buys a position on a market.
 *
 * Admission control wraps the SERVICE, not the server action, on purpose: the
 * action is only one of several entry points (dev-test routes, the lifecycle
 * ticker, every scripts/load harness). Gating the action would let those bypass
 * the semaphore entirely — and the saturation proof would then be measuring an
 * ungated path while claiming the gated one was safe.
 *
 * Saturation surfaces as a BUSY rejection the UI can retry with the SAME
 * idempotency key. It never reaches the player as a raw P2024.
 */
export async function buyPosition(userId: string, opts: BuyOpts): Promise<BuyResult> {
  try {
    // Retry sits INSIDE admission (a retry keeps the slot it already queued for)
    // and OUTSIDE withLock (each attempt needs a fresh transaction — retrying in
    // an aborted one is 25P02). Gated on the caller's idempotency key: without
    // one, a retry would be a double bet, so we make exactly one attempt.
    return await withAdmission(() =>
      withTransientRetry(() => buyPositionInner(userId, opts), !!opts.idempotencyKey),
    );
  } catch (err) {
    if (err instanceof AdmissionBusy) {
      return {
        ok: false,
        error: "We're busy right now — your stake hasn't moved. Try again in a moment.",
        code: "BUSY",
        retryAfterSec: 1,
      };
    }
    throw err;
  }
}

async function buyPositionInner(userId: string, opts: BuyOpts): Promise<BuyResult> {
  const rl = rateCheck(userId, "bet.place");
  if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Global maintenance switch (§9.3 #1) — new bets are paused platform-wide.
  // Withdrawals/cash-outs stay open so funds are never trapped.
  if (await isMaintenanceMode()) {
    return { ok: false, error: await maintenanceMessage(), code: "SUSPENDED" };
  }

  const lockout = await isLockedOut(userId);
  if (lockout.locked) return { ok: false, error: `Locked until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };

  // Account-level status check — a suspended or closed user must not
  // be able to place bets even if their wallet is still nominally
  // ACTIVE. This is the "ban hammer" path the admin operator uses
  // when a player is under investigation or has been removed.
  const u = await db.user.findById(userId);
  if (!u) return { ok: false, error: "Account not found.", code: "NOT_FOUND" };
  // Belt-and-suspenders alongside isLockedOut() above: the RG timer and the
  // account status are set together, but if they ever diverge (admin clears a
  // timer, a data migration sets status without the timestamp) we must still
  // refuse a bet from a self-excluded / cooled-off / suspended / closed player.
  if (u.status === "SUSPENDED" || u.status === "CLOSED" || u.status === "SELF_EXCLUDED" || u.status === "COOLED_OFF") {
    audit({
      category: "COMPLIANCE",
      action: "bet.account_blocked",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      payload: { status: u.status },
    });
    const blockedMsg =
      u.status === "SUSPENDED" ? "Account suspended. Contact support." :
      u.status === "CLOSED" ? "Account closed." :
      u.status === "SELF_EXCLUDED" ? "You're self-excluded — betting is disabled. · Umejizuia kucheza." :
      "You're on a cool-off break — betting is paused. · Uko kwenye mapumziko.";
    return { ok: false, error: blockedMsg, code: "SUSPENDED" };
  }

  // Stake bounds come from runtime config — global with optional per-market override.
  const stakeCfg = await getEffectiveConfig(opts.marketId);
  if (!Number.isInteger(opts.stake) || opts.stake < stakeCfg.minStake || opts.stake > stakeCfg.maxStake) {
    return { ok: false, error: `Stake must be a whole number between ${formatTzs(stakeCfg.minStake)} and ${formatTzs(stakeCfg.maxStake)}.`, code: "INVALID" };
  }
  if (opts.side !== "YES" && opts.side !== "NO") return { ok: false, error: "Invalid side.", code: "INVALID" };

  const market = await marketStore.get(opts.marketId);
  if (!market) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (market.status !== "LIVE") return { ok: false, error: "Market is not accepting predictions.", code: "INVALID" };
  if (isSelectionClosed(market)) return { ok: false, error: "Selections are closed — waiting for results. · Uchaguzi umefungwa — tunasubiri matokeo.", code: "SELECTION_CLOSED" };
  if (Date.parse(market.resolutionAt) <= Date.now()) return { ok: false, error: "Market has closed.", code: "INVALID" };

  // Daily loss-limit gate (RG / GLI-19) is re-checked INSIDE the wallet lock
  // below (audit C4), not here — checking outside the lock let two concurrent
  // bets each read the pre-bet 24h net loss and both clear a cap only one should.

  let wageringFulfilled: { amountTzs: number }[] = [];
  // Captured inside the lock, USED after it commits — see the note at the
  // recordSnapshot/emit call below for why these can't fire inside any more.
  type CommittedBet = { positionId: string; placedAt: string; yesPool: number; noPool: number; payoutIfWin: number; bonusPart: number; walletId: string; bonusAllocations: BonusAllocation[]; usedTx: boolean };
  let committed: CommittedBet | null = null;
  let result: ServiceResult<{ positionId: string; balance: number; payoutIfWin: number }>;
  try {
  result = await withLock(`wallet:${userId}`, async (lockTx) => {
    // Idempotency: if this key was already used, return the existing position.
    // This prevents double-submit on 2G (same key = same intent, two taps).
    if (opts.idempotencyKey) {
      const existing = await positionStore.findByIdempotencyKey(opts.idempotencyKey, lockTx);
      if (existing) {
        const w = await db.wallet.findByUserId(userId, lockTx);
        return { ok: true as const, data: { positionId: existing.id, balance: w?.balance ?? 0, payoutIfWin: existing.potentialPayout } };
      }
    }

    const wallet = await db.wallet.findByUserId(userId, lockTx);
    if (!wallet || wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet unavailable.", code: "NOT_FOUND" as const };

    // Daily loss-limit gate (RG / GLI-19), re-read INSIDE the lock so a concurrent
    // bet that already committed its stake is counted (audit C4). Before any debit,
    // so a rejected bet never moves money.
    const lossCheck = await checkLossLimit(userId, opts.stake, lockTx);
    if (!lossCheck.allowed) {
      audit({ category: "COMPLIANCE", action: "bet.loss_limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { stake: opts.stake, reason: lossCheck.reason } });
      return { ok: false as const, error: lossCheck.reason ?? "Daily loss limit reached.", code: "INVALID" as const };
    }

    // Real-first funding: spend the player's own (withdrawable) balance first,
    // then top up the remainder from the bonus wallet. Both debits run inside
    // THIS wallet lock so the affordability check and the two debits can't be
    // split by a concurrent bet/withdraw (no double-spend). The affordability
    // PRE-CHECK runs here on the locked read; the actual debits run inside the
    // single money transaction below, still guard-protected (belt-and-suspenders).
    const realAvail = wallet.balance;
    const bonusAvail = wallet.bonusBalance ?? 0;
    const realPart = Math.min(opts.stake, realAvail);
    const bonusPart = opts.stake - realPart;
    if (bonusPart > bonusAvail) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };

    const payoutIfWin = await projectedPayout(market, opts.side, opts.stake);
    const positionId = `pos_${randomId(10)}`;
    const betTxnId = `txn_${randomId(12)}`;
    const placedAt = new Date().toISOString();
    const position: StoredPosition = {
      id: positionId,
      userId,
      marketId: opts.marketId,
      side: opts.side,
      stake: opts.stake,
      bonusStakeTzs: bonusPart,
      potentialPayout: payoutIfWin,
      status: "OPEN",
      finalPayout: null,
      placedAt,
      settledAt: null,
      idempotencyKey: opts.idempotencyKey ?? null,
    };

    // Pool mutation must be serialized PER-MARKET, not per-wallet: two
    // different users betting the same market hold different `wallet:` locks,
    // so without this they read-modify-write the same pool concurrently and
    // one stake gets dropped from the pool (breaks payout conservation —
    // winners would later share a pool that's missing money). Re-read inside
    // the market lock so the += applies to the freshest pool values. Lock
    // order is always wallet→market (here and in cashOut), never the reverse,
    // so this nesting cannot deadlock.
    //
    // We ALSO re-check the close state INSIDE this lock (GLI-33 late-bet
    // defence) BEFORE any money moves: a bet that slipped past the pre-lock
    // close checks — placed in the microseconds before the cutoff, or racing a
    // concurrent admin suspend / auto-close — is rejected with the wallet
    // UNTOUCHED. Checks-first kills the whole unwind path the old shape needed.
    //
    // Then EVERY money write of the bet — the real-balance debit, the bonus
    // spend (grant decrements + bonusBalance), the pool increment, the Position
    // row, the BET_PLACED transaction and the stake ledger entries — commits in
    // ONE Prisma $transaction (withMoneyTx). A failure of ANY write rolls back
    // ALL of them; a crash between two writes can no longer leave partial state.
    // Both advisory locks are acquired BEFORE the tx opens: opening the tx first
    // (debit, then wait on the market lock) would hold the bettor's wallet ROW
    // inside an open tx while settlement (market lock → withMoneyTx paying that
    // same wallet) holds the market lock — an advisory-lock/row-lock deadlock
    // cycle that does not exist today. Locks-then-tx preserves it.
    let newBalance = realAvail;
    let bonusAllocations: BonusAllocation[] = [];
    let usedTx = false;
    const outcome = await withLock(`market:${opts.marketId}`, async (lockTx): Promise<"OK" | "CLOSED"> => {
      const fresh = await marketStore.get(opts.marketId, lockTx);
      if (!fresh || fresh.status !== "LIVE" || isSelectionClosed(fresh) || Date.parse(fresh.resolutionAt) <= Date.now()) {
        return "CLOSED";
      }
      {
        await withMoneyTx(async (tx) => {
          usedTx = tx !== null;
          if (realPart > 0) {
            // Atomic, overdraw-guarded debit (WHERE balance >= realPart).
            const debited = await db.wallet.adjust(wallet.id, { balance: -realPart }, { requireBalanceGte: realPart }, tx);
            if (!debited) throw new BetAbort("NO_FUNDS");
            newBalance = debited.balance;
          }
          if (bonusPart > 0) {
            // Lock-free spend — we already hold wallet:<userId>. Threaded into
            // this tx so the grant decrements + bonusBalance debit roll back
            // with everything else on abort.
            const spend = await spendBonusLocked(userId, bonusPart, tx);
            if (spend.spent < bonusPart) {
              // Defensive only — can't normally happen under the wallet lock
              // (bonusPart ≤ bonusAvail was checked on the locked read). With a
              // real tx, throwing rolls the whole movement back. In-memory
              // (tx === null) there is no rollback, so compensate by hand: the
              // real debit was the only prior write, plus any partial
              // allocations the spend made before falling short.
              if (!tx) {
                if (realPart > 0) await db.wallet.adjust(wallet.id, { balance: realPart });
                if (spend.allocations.length > 0) await refundBonusLocked(userId, spend.allocations);
              }
              throw new BetAbort("NO_FUNDS");
            }
            bonusAllocations = spend.allocations;
          }

          // Money is secured — apply the pool increment and persist everything.
          // ATOMIC DELTA, computed by the database, rather than the old
          // read-modify-write full-row `set`. Correct today because the market
          // lock is still held, but it removes the lost-update window itself,
          // which is the prerequisite for dropping that lock (deploy 5/5).
          // Placed AFTER the two throw points above so an abort never touches
          // pools (in-memory `fresh` aliases the stored object).
          const pools = await marketStore.addToPool(
            opts.marketId,
            opts.side === "YES" ? { yesPool: opts.stake, predictorCount: 1 } : { noPool: opts.stake, predictorCount: 1 },
            tx,
          );
          // Use the TRUE committed pools for the snapshot/odds push below.
          if (pools) { fresh.yesPool = pools.yesPool; fresh.noPool = pools.noPool; }
          fresh.updatedAt = placedAt;
          await positionStore.set(position, tx);

          // The real-wallet ledger records only the REAL cash that left `balance`
          // (-realPart). The bonus-funded portion moves on the bonus wallet and is
          // tracked via BonusGrant + bonus audit entries, not here, so balanceAfter
          // stays reconcilable with the running real-balance sum.
          await db.txn.create({
            id: betTxnId,
            walletId: wallet.id, userId,
            type: "BET_PLACED", status: "CONFIRMED",
            amount: -realPart, fee: 0, taxWithheld: 0,
            balanceAfter: newBalance, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: bonusPart > 0
              ? `${opts.side} on "${market.titleEn.slice(0, 50)}" (incl. ${formatTzs(bonusPart)} bonus)`
              : `${opts.side} on "${market.titleEn.slice(0, 60)}"`,
            positionId: positionId,
            amlReason: null,
            createdAt: placedAt, updatedAt: placedAt, completedAt: placedAt,
          }, tx);
          // Dual-write: stake to the double-entry ledger, IN the transaction —
          // a ledger failure now rejects the whole bet (rollback) instead of
          // silently dropping the ledger row (was fire-and-forget .catch()).
          await postLedgerEntries(`stake_${betTxnId}`, stakeEntries({ txnId: betTxnId, userId, marketId: opts.marketId, realPart, bonusPart }), tx);
        });
      }
      // NOT committed yet — withMoneyTx now JOINS the lock's transaction, which
      // only commits when the outermost withLock returns. Snapshotting or
      // emitting here would publish a pool the transaction can still roll back,
      // exactly the leak the old post-tx placement existed to prevent. Both are
      // deferred to `committed` and fired after withLock resolves.
      committed = {
        positionId, placedAt, yesPool: fresh.yesPool, noPool: fresh.noPool,
        payoutIfWin, bonusPart, walletId: wallet.id, bonusAllocations, usedTx,
      };
      return "OK";
    });

    // Closed in-flight → reject. NOTHING was debited (the close re-check runs
    // before any money write), so there is nothing to refund — the old unwind
    // path no longer exists.
    if (outcome === "CLOSED") {
      audit({
        category: "BET",
        action: "bet.rejected.closed_in_flight",
        actorId: userId,
        targetType: "Market",
        targetId: opts.marketId,
        payload: { side: opts.side, stake: opts.stake, moneyMoved: false },
      });
      return { ok: false as const, error: "Selections closed while placing your bet. · Uchaguzi umefungwa.", code: "SELECTION_CLOSED" as const };
    }
    // The bet's audit trail, inbox receipt and email all moved BELOW the lock.
    // They are fire-and-forget and need no lock, but the market advisory lock is
    // now held until the outer transaction ends (it rides the same tx), so any
    // work left in here extends the hold on a hot market for no benefit.

    // Wagering accrues on the FULL stake (turnover) INSIDE this wallet lock, so
    // spend + wagering + any fulfilment are one atomic unit (no race with a
    // concurrent second bet on the same wallet). Turnover from this bet is
    // reversed if the bet is later refunded (see reverseWagering in the void
    // paths) — that's what prevents bonus from clearing to cash with no risk.
    // Best-effort: a wagering hiccup must never fail a placed bet.
    try {
      // lockTx: this runs after the wallet debit inside the SAME transaction, so
      // its wallet/grant UPDATEs must ride that transaction — on a separate
      // connection they would block on our own uncommitted wallet row (P2028).
      const wr = await recordWageringLocked(userId, opts.stake, lockTx);
      wageringFulfilled = wr.fulfilled;
    } catch (err) {
      // Never block a placed bet — but DON'T fail silently: a lost turnover
      // accrual stalls bonus clearing, so leave a trace (mirrors the affiliate
      // accrual_error handling above).
      audit({ category: "SYSTEM", action: "bonus.wagering_error", actorId: userId, targetType: "Position", targetId: positionId, payload: { stake: opts.stake, error: String((err as Error)?.message ?? err) } });
    }

    return { ok: true as const, data: { positionId, balance: newBalance, payoutIfWin } };
  });
  } catch (err) {
    // BetAbort now has to escape withLock to do its job. Since withMoneyTx joins
    // the lock's transaction, catching it INSIDE would let the enclosing lock
    // commit the very writes the abort meant to discard — a real debit with no
    // position. Letting it reach here rolls the whole bet back, then we map it to
    // the same clean rejection the player always saw. (In-memory there is no
    // rollback, so spendBonusLocked's hand-compensation above still applies.)
    if (err instanceof BetAbort) {
      return { ok: false, error: "Not enough balance.", code: "INVALID" };
    }
    throw err;
  }

  // ── COMMITTED ──────────────────────────────────────────────────────────────
  // Everything below runs only after the lock's transaction actually committed,
  // so no subscriber, chart point, receipt or email can describe a bet that
  // rolled back.
  if (result.ok && committed) {
    const c: CommittedBet = committed;
    recordSnapshot(opts.marketId, c.yesPool, c.noPool);
    emit("market:odds", { marketId: opts.marketId, yesPct: impliedYesPct({ ...market, yesPool: c.yesPool, noPool: c.noPool }) });

    // Deferred from spendBonusLocked in tx mode (see there): raised only after
    // the transaction committed, so the audit can never narrate a rolled-back spend.
    if (c.usedTx && c.bonusPart > 0) {
      audit({ category: "WALLET", action: "bonus.spent", actorId: userId, targetType: "Wallet", targetId: c.walletId, payload: { spent: c.bonusPart, allocations: c.bonusAllocations } });
    }
    audit({
      category: "BET",
      action: "market.position.opened",
      actorId: userId,
      targetType: "Position",
      targetId: c.positionId,
      payload: { marketId: market.id, side: opts.side, stake: opts.stake, payoutIfWin: c.payoutIfWin },
    });
    // Inbox receipt — kit-faithful, opens to the market detail. The cash-out terms
    // it quotes come from THIS POLL'S frozen rates, not a hardcoded "5 min / 9%".
    const betRates = ratesFor(market);
    notifyBetPlaced(userId, {
      side: opts.side,
      stake: opts.stake,
      payoutIfWin: c.payoutIfWin,
      marketTitle: market.titleEn,
      marketId: market.id,
      positionId: c.positionId,
      cashOutFeeRate: betRates.cashOutFeeRate,
      freeExitGraceMinutes: betRates.freeExitGraceMinutes,
    });
    // Note: `payoutIfWin` is deliberately NOT passed to the email. It printed a
    // "Potential return" figure that every in-app surface suppresses before betting
    // closes (D3, license review 2026-05) — the policy was enforced on screen and
    // broken in the inbox. The exact figure is emailed when betting CLOSES and the
    // pools freeze, where it is a fact rather than a moving projection.
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bet placed · ${opts.side} on "${market.titleEn.slice(0, 40)}"`,
      html: betPlacedHtml({
        reference: c.positionId, side: opts.side, stake: opts.stake,
        marketTitle: market.titleEn, placedAt: c.placedAt, resolutionDate: market.resolutionAt.slice(0, 10),
        cashOutFeeRate: betRates.cashOutFeeRate, freeExitGraceMinutes: betRates.freeExitGraceMinutes,
      }),
      tag: "bet-placed",
    })).catch(() => {});
  }

  // Dual-channel on the bet-placement fulfilment path too (matches recordWagering).
  for (const g of wageringFulfilled) {
    notifyBonusFulfilled(userId, { amountTzs: g.amountTzs }).catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bonus unlocked · ${formatTzs(g.amountTzs)}`,
      html: bonusFulfilledHtml({ amountTzs: g.amountTzs }),
      tag: "bonus",
    })).catch(() => {});
  }

  // Affiliate accrual runs AFTER the bettor's wallet lock releases — never
  // nested inside it. onRecruitBet takes referral:* and the REFERRER's wallet
  // lock; holding those under the bettor's wallet lock pins up to three pooled
  // connections per referred bet and risks Prisma pool exhaustion under load
  // (money-safety re-audit MED). Best-effort; a dropped commission never affects
  // the placed bet.
  if (result.ok) {
    try {
      // The first-bet PRIZE only. Referral COMMISSION is no longer accrued here —
      // it accrues at SETTLEMENT, from the fee we actually charged
      // (see onRecruitSettlement). The real fee is not knowable at bet time: it
      // depends on the final pools. Accruing it here meant paying a referrer a
      // share of 31,050 on a poll where we earned 3,500 — and paying out at all on
      // a one-sided poll, where we earn nothing.
      await onRecruitBet(userId, { stake: opts.stake });
    } catch (err) {
      audit({ category: "SYSTEM", action: "affiliate.accrual_error", actorId: userId, targetType: "Position", targetId: result.data!.positionId, payload: { error: String(err) } });
    }
  }
  return result;
}

export async function listPositionsForUser(userId: string, limit = 100) {
  return positionStore.listForUser(userId, limit);
}

export async function listPositionsForMarket(marketId: string) {
  return positionStore.listForMarket(marketId);
}

/** One pass over all positions → up to `n` distinct trader user-ids per market.
 *  Used by the card grids for the live trader crest-stack (cheap: O(positions),
 *  not O(markets × positions)). */
export async function traderSeedsByMarket(n = 3) {
  const map = new Map<string, string[]>();
  for (const p of await positionStore.values()) {
    let arr = map.get(p.marketId);
    if (!arr) { arr = []; map.set(p.marketId, arr); }
    if (arr.length < n && !arr.includes(p.userId)) arr.push(p.userId);
  }
  return map;
}

/**
 * Auto-resolve expired Demo · markets. Demo markets exist for live
 * walk-throughs — the manager cannot wait for a human officer pair to
 * stage + confirm before the wallet shows the win. The moment the
 * countdown hits 0, settle the market with a synthetic outcome and
 * run the same settlement codepath as a regular market (pay winners,
 * forfeit losers, notify both, audit). When the real polling vendor is
 * wired (Sportradar / TMA / BoT feeds), production markets resolve
 * from those responses; this function only ever touches markets whose
 * title starts with "Demo · ".
 *
 * Outcome selection: weighted by the current pool lean. If 65% of the
 * pool went YES, YES wins 65% of the time. This reads more like a real
 * market resolving than a pure coin-flip and keeps demo runs varied
 * while still surprising the manager often enough to feel realistic.
 *
 * Idempotent: a Demo market that's already RESOLVED is skipped.
 * Re-entry safe under the global Map mutation pattern; we don't run
 * the two-officer dance because there's no second human in a demo.
 */
export async function autoResolveExpiredDemoMarkets(): Promise<{ resolved: number }> {
  // Hard prod-lock: this path picks a demo market's outcome with Math.random and
  // pays real winners with no two-officer flow. It exists only for demo/dev
  // markets ("Demo · " prefix, never seeded in prod), but the money-settling
  // random path must be UNREACHABLE in production regardless of stray data.
  if (process.env.NODE_ENV === "production") return { resolved: 0 };
  let resolved = 0;
  const now = Date.now();
  for (const m of await marketStore.values()) {
    if (!m.titleEn.startsWith("Demo · ")) continue;
    if (m.status !== "LIVE") continue;
    if (Date.parse(m.resolutionAt) > now) continue;

    // Re-validate and settle under a per-market lock for IDEMPOTENCY. This
    // runs fire-and-forget on every /markets hit, so two concurrent requests
    // can both pass the cheap LIVE/expired pre-checks above and, without a
    // lock, both settle the same market → winners paid twice. Take the same
    // `market:` lock the human resolver uses, then re-read and re-check inside
    // it: the first run flips status to RESOLVED, every later run no-ops.
    const didResolve = await withLock(`market:${m.id}`, async () => {
      const cur = await marketStore.get(m.id);
      if (!cur || cur.status !== "LIVE") return false;
      if (Date.parse(cur.resolutionAt) > now) return false;

      // Outcome weighted by pool lean — if the crowd believed YES at 70%,
      // YES wins ~70% of the time. Falls back to a fair 50/50 when pools
      // are empty (no bets placed yet → market just resolves YES half the
      // time).
      const total = cur.yesPool + cur.noPool;
      const yesProb = total > 0 ? cur.yesPool / total : 0.5;
      const outcome: Side = Math.random() < yesProb ? "YES" : "NO";

      // Run the exact settlement codepath used by the resolver-queue's
      // stage-2 confirm — same pay-winners / forfeit-losers / notify /
      // audit shape, just bypassing the two-officer staging dance which
      // makes no sense for a synthetic demo market.
      cur.resolutionStage1By = "system_demo_auto";
      cur.resolutionStage1At = new Date(now).toISOString();
      cur.resolutionStage2By = "system_demo_auto";
      cur.resolutionStage2At = new Date(now).toISOString();
      cur.objectionsClosedAt = new Date(now).toISOString(); // no window for a synthetic market
      cur.resolvedOutcome = outcome;
      cur.status = "RESOLVED";
      cur.updatedAt = cur.resolutionStage2At;
      cur.settledAt = null; // ADJUDICATED only — settleMarket moves the money
      // stamp, not set: LIVE→RESOLVED on a market that may still be taking bets.
      await marketStore.stamp(m.id, {
        resolutionStage1By: cur.resolutionStage1By,
        resolutionStage1At: cur.resolutionStage1At,
        resolutionStage2By: cur.resolutionStage2By,
        resolutionStage2At: cur.resolutionStage2At,
        objectionsClosedAt: cur.objectionsClosedAt,
        resolvedOutcome: cur.resolvedOutcome,
        status: "RESOLVED",
        updatedAt: cur.updatedAt,
        settledAt: null,
      });
      recordSnapshot(cur.id, cur.yesPool, cur.noPool);

      audit({
        category: "ADMIN",
        action: "market.resolved.demo_auto",
        actorId: "system_demo_auto",
        targetType: "Market",
        targetId: cur.id,
        payload: {
          outcome,
          yesPool: cur.yesPool, noPool: cur.noPool,
          reason: "Demo market countdown elapsed; no human officer required for synthetic markets",
        },
      });
      return true;
    });

    // ── SETTLE VIA THE REAL CODEPATH ─────────────────────────────────────────
    //
    // This used to be a HAND-COPIED settlement loop, ~75 lines duplicating
    // settleMarket's pay-winners/forfeit-losers/ledger/notify logic. Its comment
    // claimed it ran "the exact settlement codepath used by the resolver-queue's
    // stage-2 confirm". It did not — it was a copy, and the copy had already
    // drifted: it was MISSING THE ONE-SIDED REFUND BRANCH entirely, so a demo poll
    // whose outcome landed on an empty side would have paid nobody and quietly
    // eaten the pool. It would also have needed its own copy of the new capped-fee
    // maths, its own winner-floor assertion, and its own snapshot lookup — three
    // more chances to drift.
    //
    // Now it adjudicates (above, under the lock) and then calls the ONE settlement
    // function (below, which takes the lock itself — so this must be OUTSIDE the
    // lock: withLock is not re-entrant and nesting it would self-deadlock).
    // Exactly the shape of the real flow: resolveMarket adjudicates, settleMarket
    // pays. One settlement codepath. One fee model. Nothing left to diverge.
    if (didResolve) {
      const settled = await settleMarket(m.id, { force: true, actorId: "system_demo_auto" });
      if (!settled.ok) console.error(`[demo-auto] settle failed for ${m.id}: ${settled.error}`);
      resolved++;
    }
  }
  return { resolved };
}

/**
 * Alert officers that REAL markets have closed and are awaiting their
 * two-officer resolution. Real (non-Demo) markets never auto-resolve — they
 * wait in the resolver queue for a human pair. This sweep finds markets that
 * are LIVE + past resolutionAt + not yet alerted, and pushes a one-time in-app
 * notification (the main bell, deep-linking to the resolver queue) to every
 * admin/compliance/moderator, then stamps resolutionNotifiedAt so each market
 * alerts exactly once. Runs fire-and-forget on /markets hits (self-healing, no
 * cron); the per-market flag + a lock make it idempotent.
 */
/**
 * Notify bettors that a market's SELECTION WINDOW has closed — betting has
 * stopped and the market is now "waiting for results". The selection close is a
 * computed cutoff (selectionClosedAt, falling back to resolutionAt), not a
 * status change, so there's no natural event to hang this on — this sweep is the
 * trigger. It finds LIVE, non-Demo markets whose cutoff has passed but whose
 * bettors haven't been told yet, sends each distinct bettor (open positions)
 * BOTH an in-app bell notification AND an email, then stamps
 * selectionClosedNotifiedAt so each market fires exactly once.
 *
 * Idempotent + concurrency-safe via the per-market lock + the stamp (mirrors
 * notifyDueMarketsForResolution). Demo markets are excluded — they auto-resolve
 * the instant they expire, so "waiting for results" would be immediately
 * contradicted by the win/loss receipt.
 */
export async function notifySelectionClosedMarkets(): Promise<{ notified: number; bettors: number }> {
  const now = Date.now();
  let notified = 0;
  let bettorsNotified = 0;
  const due = (await marketStore.values()).filter((m) => {
    if (m.status !== "LIVE") return false;
    if (m.titleEn.startsWith("Demo · ")) return false;
    if (m.selectionClosedNotifiedAt) return false;
    const cutoff = m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt);
    return Number.isFinite(cutoff) && cutoff <= now;
  });
  if (due.length === 0) return { notified: 0, bettors: 0 };

  for (const m of due) {
    // Stamp inside the lock so two concurrent sweeps can't both notify.
    const stamped = await withLock(`market:${m.id}`, async () => {
      const cur = await marketStore.get(m.id);
      if (!cur || cur.status !== "LIVE" || cur.selectionClosedNotifiedAt) return false;
      const cutoff = cur.selectionClosedAt ? Date.parse(cur.selectionClosedAt) : Date.parse(cur.resolutionAt);
      if (!Number.isFinite(cutoff) || cutoff > now) return false;
      // stamp, not set: a full-row write here would erase the pool increments of
      // any bet that committed between the read above and this write.
      await marketStore.stamp(m.id, { selectionClosedNotifiedAt: new Date().toISOString() });
      return true;
    });
    if (!stamped) continue;
    notified++;

    // ── THE EXACT PAYOUT, DISCLOSED THE MOMENT BETTING CLOSES ────────────────
    //
    // Once selections close the pools are FROZEN. So the payout stops being a
    // projection and becomes an exact number — arithmetic, not a forecast. We tell
    // every player precisely what they receive if their side wins, to the shilling.
    //
    // It is computed by `settledPayoutFor` — THE FUNCTION THAT ACTUALLY SETTLES —
    // against the poll's own frozen fee snapshot. Not a re-derivation, not an
    // estimate, and emphatically not a model: what we tell him here and what we
    // pay him at settlement come out of the same line of code, so they cannot
    // disagree. (It also asserts the winner floor, so a poll that could underpay a
    // winner would throw HERE, at disclosure time, days before any money moves.)
    //
    // This does not touch the D3 policy (license review 2026-05), which hides the
    // payout figure BEFORE a bet is placed. Betting is over; there is nothing left
    // to influence.
    const open = (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN");
    const closeFee = poolFee(m.yesPool, m.noPool, ratesFor(m));

    // Persist each position's exact payoutIfWin.
    const payoutByPosition = new Map<string, number>();
    for (const p of open) {
      const { payout } = settledPayoutFor(
        { yesPool: m.yesPool, noPool: m.noPool, side: p.side, stake: p.stake },
        ratesFor(m),
      );
      payoutByPosition.set(p.id, payout);
      p.potentialPayout = payout;
      await positionStore.set(p);
    }

    // A player may hold both YES and NO. Sum what he'd receive per side so the
    // notification tells him the truth about his own book, not one leg of it.
    const bettors = Array.from(new Set(open.map((p) => p.userId)));
    for (const userId of bettors) {
      bettorsNotified++;
      const mine = open.filter((p) => p.userId === userId);
      const ifYes = mine.filter((p) => p.side === "YES").reduce((s, p) => s + (payoutByPosition.get(p.id) ?? 0), 0);
      const ifNo = mine.filter((p) => p.side === "NO").reduce((s, p) => s + (payoutByPosition.get(p.id) ?? 0), 0);

      notifySelectionClosed(userId, {
        marketTitle: m.titleEn, marketId: m.id,
        payoutIfYes: ifYes, payoutIfNo: ifNo,
        hasYes: mine.some((p) => p.side === "YES"),
        hasNo: mine.some((p) => p.side === "NO"),
      }).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: `Betting closed — if you're right you receive ${formatTzs(Math.max(ifYes, ifNo))} · ${m.titleEn.slice(0, 40)}`,
        html: selectionClosedHtml({
          marketTitle: m.titleEn, closedAt: m.selectionClosedAt ?? m.resolutionAt, resolvesAt: m.resolutionAt, marketId: m.id,
          payoutIfYes: mine.some((p) => p.side === "YES") ? ifYes : null,
          payoutIfNo: mine.some((p) => p.side === "NO") ? ifNo : null,
        }),
        tag: "selection-closed",
      })).catch(() => {});
    }

    // ── ADMIN: flag a lopsided / thin poll at close, while it can still be managed
    //
    // The fee being CAPPED is the signal: it means 10%-of-pool exceeded a third of
    // the prize, i.e. the poll is lopsided enough that an uncapped rake would have
    // bitten into the winners. Winners are safe — that is what the ceiling is for —
    // but their upside is thin, we earn less than the headline rate, and an officer
    // should know before the result lands.
    const winnerRatio = closeFee.larger > 0 ? closeFee.netPool / closeFee.larger : 0;
    if (closeFee.capped || closeFee.smaller === 0) {
      audit({
        category: "ADMIN",
        action: "market.selection_closed.thin_poll",
        actorId: "system",
        targetType: "Market",
        targetId: m.id,
        payload: {
          titleEn: m.titleEn,
          yesPool: m.yesPool, noPool: m.noPool,
          pool: closeFee.pool, smallerSide: closeFee.smaller,
          smallerPctOfPool: closeFee.pool > 0 ? +(closeFee.smaller / closeFee.pool * 100).toFixed(1) : 0,
          commissionUncapped: Math.round(closeFee.commission),
          feeCharged: Math.round(closeFee.fee),
          feeWasCapped: closeFee.capped,
          worstWinnerRatio: +winnerRatio.toFixed(4),
          reason: closeFee.smaller === 0
            ? "ONE-SIDED — no opposing pool. Every stake will be refunded in full; this poll earns nothing."
            : "LOPSIDED — the fee hit the ceiling. Winners are protected (never below stake) but upside is thin and our take is below the headline rate.",
        },
      });
    }
  }
  return { notified, bettors: bettorsNotified };
}

/** How far ahead of close we nudge watchers. */
const CLOSING_SOON_WINDOW_MS = 60 * 60_000; // 1 hour

/**
 * F3 — alert WATCHERS that a market they follow closes within the hour.
 *
 * Idempotency is the same one-shot stamp the selection-closed sweep uses:
 * `closingSoonNotifiedAt` is written INSIDE `withLock("market:{id}")`, so two
 * concurrent sweeps (or the ticker racing the /markets fire-and-forget trigger)
 * can never double-alert a follower.
 *
 * Only fires for markets still OPEN for selections and inside the window — a
 * market that is already past its cutoff is handled by the selection-closed
 * sweep, not this one. Watchers under an RG lockout are suppressed (audited)
 * inside `alertWatchersClosingSoon`.
 */
export async function notifyClosingSoonMarkets(): Promise<{ notified: number; watchers: number }> {
  const now = Date.now();
  let notified = 0;
  let watchersNotified = 0;
  const due = (await marketStore.values()).filter((m) => {
    if (m.status !== "LIVE") return false;
    if (m.titleEn.startsWith("Demo · ")) return false;
    if (m.closingSoonNotifiedAt) return false;
    const cutoff = m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt);
    if (!Number.isFinite(cutoff)) return false;
    const ms = cutoff - now;
    return ms > 0 && ms <= CLOSING_SOON_WINDOW_MS; // inside the window, not yet closed
  });
  if (due.length === 0) return { notified: 0, watchers: 0 };

  for (const m of due) {
    const stamped = await withLock(`market:${m.id}`, async () => {
      const cur = await marketStore.get(m.id);
      if (!cur || cur.status !== "LIVE" || cur.closingSoonNotifiedAt) return false;
      const cutoff = cur.selectionClosedAt ? Date.parse(cur.selectionClosedAt) : Date.parse(cur.resolutionAt);
      if (!Number.isFinite(cutoff)) return false;
      const ms = cutoff - now;
      if (ms <= 0 || ms > CLOSING_SOON_WINDOW_MS) return false;
      await marketStore.stamp(m.id, { closingSoonNotifiedAt: new Date().toISOString() });
      return true;
    });
    if (!stamped) continue;
    notified++;

    const cutoff = m.selectionClosedAt ? Date.parse(m.selectionClosedAt) : Date.parse(m.resolutionAt);
    const minutes = Math.max(1, Math.round((cutoff - now) / 60_000));
    const { alertWatchersClosingSoon } = await import("./watchlist-service");
    watchersNotified += await alertWatchersClosingSoon(m.id, m.titleEn, minutes);
  }
  return { notified, watchers: watchersNotified };
}

export async function notifyDueMarketsForResolution(): Promise<{ notified: number }> {
  const now = Date.now();
  let notified = 0;
  const due = (await marketStore.values()).filter(
    (m) => m.status === "LIVE"
      && !m.titleEn.startsWith("Demo · ")
      && Date.parse(m.resolutionAt) <= now
      && !m.resolutionNotifiedAt,
  );
  if (due.length === 0) return { notified: 0 };

  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE", "MODERATOR"]); // audit M5
  for (const m of due) {
    const stamped = await withLock(`market:${m.id}`, async () => {
      const cur = await marketStore.get(m.id);
      // Re-check inside the lock so two concurrent sweeps can't both alert.
      if (!cur || cur.status !== "LIVE" || cur.resolutionNotifiedAt || Date.parse(cur.resolutionAt) > now) return false;
      await marketStore.stamp(m.id, { resolutionNotifiedAt: new Date().toISOString() });
      return true;
    });
    if (!stamped) continue;
    notified++;
    // Every admin/officer gets BOTH the in-app bell AND an email with a button
    // straight to the resolver queue — same dual-channel pattern as a new KYC
    // submission. (For now: ALL admins. When live we'll narrow who receives the
    // email by role/right.) sendEmailToUser resolves each officer's address and
    // silently skips anyone without one; all best-effort, never blocks the sweep.
    for (const o of officers) {
      notifyAdminMarketResolution(o.id, { title: m.titleEn, marketId: m.id }).catch(() => {});
      sendEmailToUser(o.id, (email) => ({
        to: email,
        subject: `Market awaiting resolution · ${m.titleEn.slice(0, 60)}`,
        html: marketResolutionAdminHtml({ title: m.titleEn, closedAt: m.resolutionAt, reviewUrl: "/admin/resolver-queue" }),
        tag: "market-resolve-admin",
        trackLinks: false,
      })).catch(() => {});
    }
  }
  return { notified };
}

/**
 * Repair orphaned positions — refund stakes for any open position whose
 * market record no longer exists. This is a defensive boot-time pass
 * that recovers from a Sprint 55 bug where seedDemoMarkets was deleting
 * expired Demo · markets out from under live positions: the wallet had
 * debited at place-time, the market vanished, and the position could
 * never settle. The bug is fixed (Sprint 56.4 stops the deletion), but
 * any stake already debited stays missing until we walk back and
 * refund it.
 *
 * Idempotent: only OPEN positions whose market is missing are affected,
 * and each refund creates a wallet credit + transaction + audit entry
 * exactly once. Running this on every boot is safe because the second
 * pass finds no orphans.
 */
export async function repairOrphanedPositions(): Promise<{ repaired: number; refundedTzs: number }> {
  let repaired = 0;
  let refundedTzs = 0;
  for (const p of await positionStore.values()) {
    if (p.status !== "OPEN") continue;
    if (await marketStore.has(p.marketId)) continue; // market still exists → nothing to repair
    // Orphaned — refund the stake, mark VOID, audit. Split: real portion → real
    // balance, bonus portion → bonus wallet (no market lock held here, so the
    // wallet-locked bonus refund is safe to call directly).
    const w = await db.wallet.findByUserId(p.userId);
    if (!w) continue;
    const bonusPart = p.bonusStakeTzs ?? 0;
    const realRefund = p.stake - bonusPart;
    // Reverse this bet's turnover (it never settled) and return the bonus portion
    // to the bonus wallet — never to real (no active grant → bonus is forfeit).
    await reverseWagering(p.userId, p.stake);
    if (bonusPart > 0) {
      const { refundedToBonus } = await refundBonusToActive(p.userId, bonusPart);
      if (refundedToBonus < bonusPart) {
        audit({ category: "WALLET", action: "bonus.refund_forfeited", actorId: p.userId, targetType: "Position", targetId: p.id, payload: { requested: bonusPart, refundedToBonus, forfeited: bonusPart - refundedToBonus, reason: "orphan refund, no active grant" } });
      }
    }
    let newBal = w.balance;
    if (realRefund > 0) {
      const updated = await db.wallet.adjust(w.id, { balance: realRefund });
      newBal = updated?.balance ?? w.balance + realRefund;
    }
    p.status = "VOID";
    p.finalPayout = p.stake;
    p.settledAt = new Date().toISOString();
    await positionStore.set(p);
    if (realRefund > 0) await db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: w.id, userId: p.userId,
      type: "BET_REFUND", status: "CONFIRMED",
      amount: realRefund, fee: 0, taxWithheld: 0,
      balanceAfter: newBal, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Refund · orphaned position (market record missing)`,
      positionId: p.id,
      amlReason: null,
      createdAt: p.settledAt, updatedAt: p.settledAt, completedAt: p.settledAt,
    });
    notifyRefund(p.userId, { stake: p.stake, marketTitle: "Orphaned position", marketId: "" });
    audit({
      category: "WALLET",
      action: "position.orphan_refund",
      actorId: p.userId,
      targetType: "Position",
      targetId: p.id,
      payload: { marketId: p.marketId, refunded: p.stake, reason: "market record missing" },
    });
    repaired++;
    refundedTzs += p.stake;
  }
  return { repaired, refundedTzs };
}

/**
 * Early cash-out value of an OPEN position, and WHETHER it can be sold at all.
 *
 * ── THE EXIT WINDOW (2026-07-15, Ali's design) ─────────────────────────────
 *
 * Measured from when the bet was PLACED:
 *   • 0 .. freeExitGraceMinutes (5)          → FREE: full stake back, no fee.
 *   • free .. free+paidExitWindowMinutes (20)→ PAID: stake × (1 − cashOutFeeRate).
 *   • after that                             → LOCKED: rides to settlement.
 *
 * WHY A HARD TIME LOCK. Every abusive exit — gutting a winner's prize, voiding a
 * poll you're losing — requires a LATE exit, because you can only tell you're
 * losing once the real-world event is near, which is HOURS OR DAYS after the bet.
 * Locking the exit ~20 minutes in means that by the time anyone could know the
 * outcome, their door shut long ago. It replaces the old side-collapse guard,
 * which only blocked the last shilling and trapped the eventual winner.
 *
 * ── SHORT / ENDING-SOON POLLS (Ali's edge case) ────────────────────────────
 *
 * The window is measured from the bet, but a poll can CLOSE (betting shuts) sooner
 * than 20 minutes — a short poll, or a bet placed near close. Two rules keep that
 * safe, and they auto-shrink the window to fit:
 *
 *   1. Selling always shuts at SELECTION CLOSE (isSelectionClosed, enforced in
 *      cashOutPosition), whichever comes first. A poll that closes 8 minutes after
 *      your bet gives you 5 free + 3 paid, then locks — never any exit after close.
 *
 *   2. `RUNWAY` — cash-out is only offered if, when you bet, there were at least
 *      `freeExitGraceMinutes` of betting time LEFT. Bet 2 minutes before a poll
 *      closes (or on a 3-minute poll) and you get NO cash-out at all: you took a
 *      last-moment position, you ride it. This is what stops a short/no-gap poll
 *      being sold at the wire, when the outcome is becoming visible.
 *
 * Profit is never paid on an exit — only the stake back (minus any fee). Winnings
 * come only from HOLDING to settlement. The fee goes to the HOUSE
 * (HOUSE:COMMISSION, with TRA/GBT levies) — it used to be left in the pool for the
 * other players, so we earned zero on every early exit.
 *
 * Returns `sellable` — false means the exit window has passed (or never opened for
 * a too-short runway) and the UI must show "rides to settlement", not a sell price.
 */
export async function cashOutValue(
  position: Pick<StoredPosition, "side" | "stake" | "placedAt">,
  market: Pick<StoredMarket, "id" | "yesPool" | "noPool" | "resolutionAt" | "selectionClosedAt" | "feeSnapshot">,
): Promise<{ value: number; ratio: number; gross: number; fee: number; feeRate: number; inGracePeriod: boolean; sellable: boolean; reason?: "WINDOW_PASSED" | "TOO_SHORT" }> {
  // The poll's OWN rates, not live config — a mid-poll retune must not change the
  // exit terms a player was promised when he bet.
  const cfg = ratesFor(market);
  const graceMs = Math.max(0, cfg.freeExitGraceMinutes) * 60_000;
  const windowMs = graceMs + Math.max(0, cfg.paidExitWindowMinutes) * 60_000;

  const placedAt = position.placedAt ? Date.parse(position.placedAt) : Date.now();
  const sinceBet = Date.now() - placedAt;
  // Selling shuts when SELECTIONS shut, never at resolutionAt (see the lockout
  // note in cashOutPosition). No gap set → betting closes at resolutionAt.
  const closesAt = market.selectionClosedAt ? Date.parse(market.selectionClosedAt) : Date.parse(market.resolutionAt);

  // RUNWAY: how much betting time this bet had when it was placed. A bet placed
  // with less than the free window left never gets a cash-out — it is a
  // last-moment position and it rides to settlement. This is what makes an
  // ending-soon / no-gap poll un-gameable at the wire.
  const hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs;

  const withinWindow = sinceBet < windowMs;
  const inGracePeriod = hadRunway && withinWindow && sinceBet < graceMs;
  const sellable = hadRunway && withinWindow; // the LIVE / open / selection-open checks live in cashOutPosition

  const feeRate = inGracePeriod ? 0 : Math.min(0.30, Math.max(0, cfg.cashOutFeeRate));
  const gross = Math.max(0, Math.round(position.stake)); // the player's money in the pool
  const value = inGracePeriod ? gross : Math.round(gross * (1 - feeRate)); // full refund in grace
  const cashOutFee = Math.max(0, gross - value);          // our commission (0 in grace)
  const ratio = gross > 0 ? value / gross : 0;
  const reason = sellable ? undefined : (!hadRunway ? "TOO_SHORT" as const : "WINDOW_PASSED" as const);
  return { value, ratio, gross, fee: cashOutFee, feeRate, inGracePeriod, sellable, reason };
}

export async function cashOutPosition(
  userId: string,
  positionId: string,
): Promise<ServiceResult<{ value: number; balance: number }>> {
  const rl = rateCheck(userId, "bet.cashout");
  if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Cheap pre-lock fast-fail (avoids taking the lock for obviously-bad calls).
  const pre = await positionStore.get(positionId);
  if (!pre) return { ok: false, error: "Position not found.", code: "NOT_FOUND" };
  if (pre.userId !== userId) return { ok: false, error: "Not your position.", code: "INVALID" };

  return withLock(`wallet:${userId}`, async () => {
    // Learn the market so we can nest its lock. Lock order is ALWAYS
    // wallet→market (identical to buyPosition), so this nesting cannot deadlock.
    const owned = await positionStore.get(positionId);
    if (!owned) return { ok: false as const, error: "Position not found.", code: "NOT_FOUND" as const };
    if (owned.userId !== userId) return { ok: false as const, error: "Not your position.", code: "INVALID" as const };
    // The pool mutation + position settlement below MUST hold the market lock.
    // resolveMarket holds market:<id> while it settles positions, so nesting it
    // here serializes cash-out against resolve (and buyPosition): a concurrent
    // resolve either ran first (position no longer OPEN / market RESOLVED → we
    // abort below, no double-credit) or waits for us. Without this the two ops
    // take disjoint locks and can interleave — double-paying the position AND
    // dropping pool updates. This is a prod-only race: the in-memory dev store
    // shares object references so it never manifests there, but Prisma returns a
    // fresh copy per read and writes absolute pool values, so the update is lost.
    return withLock(`market:${owned.marketId}`, async () => {
    // Re-fetch under the lock: a concurrent resolveMarket may have settled this
    // position (and credited the wallet) at an await point between the pre-lock
    // read above and acquiring the lock. Validating the live state here is what
    // prevents a double-settle / double-credit.
    const p = await positionStore.get(positionId);
    if (!p) return { ok: false as const, error: "Position not found.", code: "NOT_FOUND" as const };
    if (p.userId !== userId) return { ok: false as const, error: "Not your position.", code: "INVALID" as const };
    if (p.status !== "OPEN") return { ok: false as const, error: "Position is no longer open.", code: "INVALID" as const };

    // Bonus-funded bets cannot be cashed out — cash-out pays into the REAL
    // wallet, which would convert non-withdrawable bonus into withdrawable cash
    // and bypass the wagering requirement. Such bets must ride to settlement.
    if ((p.bonusStakeTzs ?? 0) > 0) {
      return { ok: false as const, error: "Bonus-funded bets can't be cashed out — play them through to settlement · Dau la bonasi haliwezi kuuzwa mapema.", code: "INVALID" as const };
    }

    const m = await marketStore.get(p.marketId);
    if (!m) return { ok: false as const, error: "Market not found.", code: "NOT_FOUND" as const };
    if (m.status === "RESOLVED" || m.status === "VOIDED") return { ok: false as const, error: "Market has been settled — position is final.", code: "INVALID" as const };

    // THE EXIT SHUTS WHEN THE ENTRY SHUTS.
    //
    // Cash-out used to stay open right up until the officers resolved the market,
    // CLOSED markets explicitly included — the reasoning being that a player
    // shouldn't be "trapped" just because the sentinel spotted an early outcome.
    // That reasoning had it exactly backwards. Selections close BEFORE the real-
    // world event is settled in our records: the match finishes, the price prints,
    // the result becomes public — and only later does an officer record it. In
    // that gap the answer is knowable to the player but not yet to us.
    //
    // Leaving the exit open across that gap handed every losing player a free
    // option on a known outcome: watch your side lose, then sell out and recover
    // most of a stake you had already lost. And a cash-out is paid OUT OF THE
    // POOL — so every shilling the late seller took came straight out of the
    // players who were RIGHT. The house lost nothing; the winners paid for it.
    // Measured in scripts/cashout-lockout.test.mts: a winner owed the full 18,200
    // net pool received 9,919 — 45% of their money siphoned off by a player who
    // already knew they had lost.
    //
    // So selling now closes at the SAME instant betting does, from the SAME
    // source of truth (isSelectionClosed — which also covers sentinel-CLOSED, the
    // single most dangerous moment to leave an exit open). Once selections shut,
    // the position rides to settlement. You take the risk you actually took.
    if (isSelectionClosed(m)) {
      return {
        ok: false as const,
        error: "Selections are closed — this position now rides to settlement and can't be sold. · Uchaguzi umefungwa — dau hili litaenda hadi malipo, haliwezi kuuzwa.",
        code: "SELECTION_CLOSED" as const,
      };
    }

    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };

    // The poll's frozen rates — the levies on our cash-out fee are booked at the
    // rates this poll was created under, exactly like a settlement fee.
    const cfg = ratesFor(m);
    const { value, gross, fee: cashOutFee, feeRate, inGracePeriod, sellable, reason } = await cashOutValue(p, m);

    // ── THE EXIT WINDOW (Ali's design — replaces the old side-collapse guard) ──
    //
    // Once free + paid have elapsed, or the bet was placed with too little betting
    // runway to ever offer an exit, the position is LOCKED and rides to settlement.
    // This is what makes a late exit — the only kind that can gut a winner's prize
    // or void a poll you're losing — impossible, without trapping the eventual
    // winner the way the old last-shilling guard did.
    if (!sellable) {
      return {
        ok: false as const,
        error: reason === "TOO_SHORT"
          ? "This poll is closing too soon to sell out — your position rides to settlement. · Kura hii inafungwa hivi karibuni — dau lako litaenda hadi malipo."
          : "The sell-out window for this bet has closed — it now rides to settlement. · Muda wa kuuza dau hili umefungwa — litaenda hadi malipo.",
        code: "SELECTION_CLOSED" as const,
      };
    }
    if (value <= 0) {
      return { ok: false as const, error: "Current cash-out value is zero — your side has no live pool.", code: "INVALID" as const };
    }

    const ownYes = p.side === "YES";
    const ownPool = ownYes ? m.yesPool : m.noPool;

    const now = new Date().toISOString();

    // ── Conservation ──────────────────────────────────────────────────────────
    //
    // THE WHOLE STAKE LEAVES THE POOL. `value` goes to the player, `cashOutFee`
    // goes to the HOUSE (booked to HOUSE:COMMISSION by cashoutEntries, with the
    // TRA/GBT levies applied like any other fee).
    //
    // It did not used to. The old code debited only `value` and left the fee
    // sitting in the pool, where the remaining players collected it at resolution
    // — so 50pick earned ZERO on every early exit, while market-config.ts's
    // docstring claimed the fee was "booked to the house as operator revenue".
    // The comment that used to sit here even explained the leak as a virtue
    // ("giving them a marginally better payout at resolution"). It was revenue we
    // were quietly handing to whoever happened to still be in the poll.
    //
    // The player's own stake is by definition in his own side's pool, so the
    // whole debit comes from there. The clamp is belt-and-braces against a future
    // change breaking that invariant: pay the lesser rather than mint.
    const ownDebit = Math.min(ownPool, gross);
    // ATOMIC DELTA, not a read-modify-write. This is a genuine pool mutation on a
    // market that is still LIVE and still taking bets, so it cannot be a `stamp`
    // and it must not be a full-row `set`: writing back `m` would rewrite BOTH
    // pools from the snapshot read at the top of this lock and erase the stakes of
    // every bet committed since. The database computes the new value, so a bet and
    // a cash-out can no longer clobber one another.
    const pools = await marketStore.addToPool(m.id, ownYes ? { yesPool: -ownDebit } : { noPool: -ownDebit });
    // Use the TRUE committed pools for the chart and the odds push, never the
    // values this caller assumed.
    m.yesPool = pools?.yesPool ?? Math.max(0, m.yesPool - (ownYes ? ownDebit : 0));
    m.noPool = pools?.noPool ?? Math.max(0, m.noPool - (ownYes ? 0 : ownDebit));
    m.updatedAt = now;
    recordSnapshot(m.id, m.yesPool, m.noPool);
    // SSE: push updated odds after cash-out changes the pool
    emit("market:odds", { marketId: m.id, yesPct: impliedYesPct(m) });

    // Never credit more than actually left the pool.
    const paid = Math.min(value, ownDebit);
    // Whatever we removed but did not pay the player is ours. If the clamp above
    // ever bit, the fee shrinks with it — the ledger group must still balance.
    const houseFee = Math.max(0, ownDebit - paid);

    // Mark the position closed.
    p.status = "CASHED_OUT";
    p.finalPayout = paid;
    p.settledAt = now;
    await positionStore.set(p);

    // Credit wallet + record the txn (atomic +delta on the live row).
    const credited = await db.wallet.adjust(wallet.id, { balance: paid });
    const newBalance = credited?.balance ?? wallet.balance + paid;
    const cashoutTxnId = `txn_${randomId(12)}`;
    await db.txn.create({
      id: cashoutTxnId,
      walletId: wallet.id, userId,
      type: "CASHOUT",
      status: "CONFIRMED",
      amount: paid, fee: houseFee, taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Cashed out · "${m.titleEn.slice(0, 60)}"`,
      positionId: p.id,
      amlReason: null,
      createdAt: now, updatedAt: now, completedAt: now,
    });
    // Dual-write: cashout to the double-entry ledger. The pool is debited the
    // whole stake; the player is credited `value` and the HOUSE is credited the
    // fee (net of the TRA/GBT levies, which are booked to their own accounts).
    postLedgerEntries(`cashout_${cashoutTxnId}`, cashoutEntries({
      txnId: cashoutTxnId, userId, marketId: m.id,
      value: paid, fee: houseFee,
      rates: { traTaxOnCommissionRate: cfg.traTaxOnCommissionRate, gbtLevyOnCommissionRate: cfg.gbtLevyOnCommissionRate },
    })).catch(() => {});

    // EVERY figure below is `paid` / `houseFee` — what actually moved — not the
    // pre-clamp `value` / `cashOutFee`. They differ only when the conservation
    // clamp bites (ownPool < gross), which is exactly the case the clamp exists
    // for; telling a player he received a number we did not credit him is the last
    // thing we should do in that state.
    notifyCashout(userId, { amount: paid, marketTitle: m.titleEn, marketId: m.id, inGracePeriod, positionId });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Position sold · ${formatTzs(paid)}`,
      html: cashOutReceiptHtml({ reference: p.id, value: paid, stake: p.stake, marketTitle: m.titleEn, soldAt: now, gracePeriod: inGracePeriod }),
      tag: "cashout",
    })).catch(() => {});

    audit({
      category: "BET",
      action: "market.position.cashed_out",
      actorId: userId,
      targetType: "Position",
      targetId: p.id,
      payload: {
        marketId: m.id, side: p.side, stake: p.stake,
        paid, houseFee, feeRate, gross,
        // Recorded only when the clamp actually bit — so a divergence is visible
        // in the audit chain rather than silently smoothed over.
        ...(paid !== value ? { quotedValueBeforeClamp: value, quotedFee: cashOutFee } : {}),
        yesPoolAfter: m.yesPool, noPoolAfter: m.noPool,
      },
    });

    return { ok: true as const, data: { value: paid, balance: newBalance } };
    });
  });
}

export async function resolveMarket(opts: { marketId: string; outcome: Side | "VOID"; officerId: string; evidence?: string }): Promise<ServiceResult<{ stage: "stage1" | "complete"; settlesAt?: string | null }>> {
  // ADM2 ceremony — the officer's declared evidence excerpt (the source quote
  // that justifies the verdict). Recorded into the immutable audit payload at
  // each attestation so the fairness story is provable; capped defensively.
  const evidence = (opts.evidence ?? "").trim().slice(0, 2000) || null;
  // Solo-resolution override (default OFF) — ⚠️ NOT FOR PRODUCTION, testing /
  // consultant-evaluation only (see test-overrides.ts header). When an admin
  // enables it on the resolver queue, a single officer may resolve a market
  // end-to-end even if they hold a position in it — so a tester acting as admin
  // + player can settle a market alone and have their own position pay out
  // normally (win pays, loss deducted from their wallet). It relaxes BOTH the
  // position-conflict block (below) AND the "second officer must differ" gate
  // (stage-2). Every bypass is written to the COMPLIANCE trail; production
  // behaviour is unchanged while the flag is OFF — and it MUST be OFF for any
  // real-money launch (leaving it ON lets an admin pay their own bets).
  const testingResolveOverride = await getConflictedResolutionAllowed();
  // Officer-conflict hard-block (Elevation #12): an officer who holds a position
  // in this market MUST NOT resolve it — they have a financial interest in the
  // outcome. This is a POCA §16 / GBT licensing requirement. Checked before
  // the lock so a conflicted officer gets a fast, clear rejection.
  const officerPositions = (await listPositionsForMarket(opts.marketId))
    .filter((p) => p.userId === opts.officerId && (p.status === "OPEN" || p.status === "WIN" || p.status === "LOSS"));
  if (officerPositions.length > 0) {
    if (!testingResolveOverride) {
      audit({
        category: "COMPLIANCE",
        action: "market.resolve.conflict_blocked",
        actorId: opts.officerId,
        targetType: "Market",
        targetId: opts.marketId,
        payload: { positionCount: officerPositions.length, positionIds: officerPositions.map((p) => p.id) },
      });
      return { ok: false, error: "You hold a position in this market and cannot resolve it — assign a different officer.", code: "CONFLICT" };
    }
    audit({
      category: "COMPLIANCE",
      action: "market.resolve.conflict_overridden",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: opts.marketId,
      payload: { positionCount: officerPositions.length, positionIds: officerPositions.map((p) => p.id), note: "TESTING override active — conflicted officer allowed to resolve; their positions settle normally." },
    });
  }

  // No money moves in this function any more — the refund/wagering bookkeeping
  // that used to live here moved with the payout loops into settleMarket().
  const result = await withLock(`market:${opts.marketId}`, async (): Promise<ServiceResult<{ stage: "stage1" | "complete"; settlesAt?: string | null }>> => {
  const m = await marketStore.get(opts.marketId);
  if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (m.status === "RESOLVED" || m.status === "VOIDED") return { ok: false, error: "Market already resolved.", code: "INVALID" };

  if (!m.resolutionStage1By) {
    // Stage-1: the officer is STAGING the outcome. This transitions LIVE → CLOSED
    // (no money moves). An officer can stage any LIVE or CLOSED market — this is
    // the intentional early-close path (the sentinel does the same via its own
    // CLOSED write). resolutionAt doesn't gate stage-1 so officers can close a
    // market early when the outcome is already known.
    m.resolutionStage1By = opts.officerId;
    m.resolutionStage1At = new Date().toISOString();
    m.resolvedOutcome = opts.outcome;
    // Denormalise the officer's evidence excerpt onto the market so the player-
    // facing settlement-proof panel can render it (source of truth stays the audit
    // chain below). Stage-1 is canonical — the stage-2 field is a countersign note.
    m.resolutionEvidence = evidence;
    m.status = "CLOSED";
    m.updatedAt = m.resolutionStage1At;
    // stamp, not set: this is the LIVE→CLOSED transition, so bets can still be
    // committing concurrently. A full-row write would rewrite yesPool/noPool from
    // the snapshot read at the top of this callback and silently destroy the
    // stakes of every bet placed in between.
    await marketStore.stamp(m.id, {
      resolutionStage1By: m.resolutionStage1By,
      resolutionStage1At: m.resolutionStage1At,
      resolvedOutcome: m.resolvedOutcome,
      resolutionEvidence: m.resolutionEvidence,
      status: "CLOSED",
      updatedAt: m.updatedAt,
    });
    audit({
      category: "ADMIN",
      action: "market.resolve.stage1",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: m.id,
      payload: { outcome: opts.outcome, evidence },
    });
    return { ok: true, data: { stage: "stage1" } };
  }
  if (m.resolutionStage1By === opts.officerId && !testingResolveOverride) {
    return { ok: false, error: "Second-officer must be a different reviewer.", code: "INVALID" };
  }
  if (m.resolutionStage1By === opts.officerId && testingResolveOverride) {
    // Solo-resolution testing path — the same officer confirms stage-2. Recorded
    // so the single-officer settlement is never silent in the compliance trail.
    audit({
      category: "COMPLIANCE",
      action: "market.resolve.solo_overridden",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: m.id,
      payload: { note: "TESTING override active — same officer confirmed stage-1 and stage-2 (two-officer rule bypassed)." },
    });
  }
  // The second officer is confirming the first officer's decision — they cannot
  // silently settle on a *different* outcome than the one recorded at stage 1.
  // Without this, a colluding/erroneous stage-2 officer could pay the wrong side.
  if (opts.outcome !== m.resolvedOutcome) {
    return { ok: false, error: "Stage-2 outcome must match the Stage-1 decision. Reject and restart to change it.", code: "INVALID" };
  }
  // Stage 2 — ADJUDICATE. The second officer countersigns and the verdict becomes
  // final, but NO MONEY MOVES HERE. The pool stays intact and every position stays
  // OPEN until the objection window closes with no objection standing, at which
  // point settleDueMarkets() calls settleMarket() and the money is paid.
  //
  // That deferral is the whole point of the window. It used to be decorative — we
  // stamped objectionsClosedAt and then paid the winners on the very next line, so
  // a player "objecting" was arguing about money that had already left the pool,
  // and there was no remedy path at all (emergencyVoidMarket refuses a settled
  // market). Holding settlement until the window elapses is what lets an upheld
  // objection actually change the outcome, and it is what makes the control we
  // describe to the regulator a true statement.
  const adjCfg = await getEffectiveConfig(m.id);
  const windowMs = Math.max(0, adjCfg.objectionWindowHours) * 3600_000;
  m.resolutionStage2By = opts.officerId;
  m.resolutionStage2At = new Date().toISOString();
  m.objectionsClosedAt = new Date(Date.parse(m.resolutionStage2At) + windowMs).toISOString();
  m.status = opts.outcome === "VOID" ? "VOIDED" : "RESOLVED";
  m.updatedAt = m.resolutionStage2At;
  m.settledAt = null; // money has NOT moved — settleMarket stamps this
  await marketStore.set(m);
  recordSnapshot(m.id, m.yesPool, m.noPool); // final point on the chart
  emit("market:resolve", { marketId: m.id, outcome: opts.outcome }); // SSE broadcast

  audit({
    category: "ADMIN",
    action: "market.adjudicated",
    actorId: opts.officerId,
    targetType: "Market",
    targetId: m.id,
    payload: {
      outcome: opts.outcome,
      yesPool: m.yesPool, noPool: m.noPool,
      grossPool: m.yesPool + m.noPool,
      stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
      sourceUrl: m.sourceUrl,
      evidence,
      objectionsClosedAt: m.objectionsClosedAt,
      objectionWindowHours: adjCfg.objectionWindowHours,
      settlement: windowMs > 0
        ? "DEFERRED — no money moves until the objection window closes"
        : "IMMEDIATE — objection window is configured to 0h",
    },
  });

  return { ok: true, data: { stage: "complete", settlesAt: m.objectionsClosedAt } };
  }); // end withLock market

  return result;
}

/**
 * SETTLE — the only place a resolved market's money moves.
 *
 * Split out of resolveMarket's stage-2 so that the objection window is a real
 * settlement gate rather than a countdown drawn over money that already left.
 * The payout/refund logic below is the same logic that used to run inline at
 * stage-2 — it MOVED, it did not change; the pari-mutuel maths, the fee split,
 * the one-sided refund rule and the ledger dual-write are all byte-for-byte the
 * behaviour that money-invariants has always asserted.
 *
 * Refusal is the safe direction. We settle only when:
 *   - the market is adjudicated (RESOLVED/VOIDED) and has a recorded outcome,
 *   - it has not already settled (settledAt === null → idempotent; a re-run pays
 *     nobody twice, and the OPEN-position filter is a second guard on that),
 *   - the objection window has elapsed, and
 *   - NO objection is standing against it.
 *
 * `force` skips only the last two (the window and the objection check) — it is for
 * the officer-driven "settle now" path and for tests. It can never skip the
 * already-settled guard, so it cannot double-pay.
 */
export async function settleMarket(
  marketId: string,
  settleOpts: { actorId?: string; force?: boolean } = {},
): Promise<ServiceResult<{ winnersPaid: number; positionsSettled: number }>> {
  // Bonus refunds + wagering reversals take the WALLET lock, and taking it while
  // holding the market lock would invert buyPosition's wallet→market order and
  // could deadlock. Collected inside the lock, applied after it releases.
  const pendingBonusRefunds: Array<{ userId: string; amount: number }> = [];
  const pendingWagerReversals: Array<{ userId: string; stake: number }> = [];
  // Referral commission — a share of the fee we ACTUALLY charged. Applied after
  // the market lock releases, because it takes the REFERRER's wallet lock.
  const pendingReferralAccruals: Array<{ userId: string; operatorFee: number }> = [];

  const result = await withLock(`market:${marketId}`, async (): Promise<ServiceResult<{ winnersPaid: number; positionsSettled: number }>> => {
  const m = await marketStore.get(marketId);
  if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (m.status !== "RESOLVED" && m.status !== "VOIDED") {
    return { ok: false, error: "Market has not been adjudicated yet.", code: "INVALID" };
  }
  if (m.settledAt) return { ok: false, error: "Market is already settled.", code: "INVALID" };
  if (!m.resolvedOutcome) return { ok: false, error: "Market has no recorded outcome.", code: "INVALID" };

  if (!settleOpts.force) {
    // THE GATE. Money does not move while players can still object.
    if (m.objectionsClosedAt && Date.now() < Date.parse(m.objectionsClosedAt)) {
      return { ok: false, error: "Objection window is still open.", code: "TOO_EARLY" };
    }
    // A standing objection freezes the pool past the window — otherwise an
    // objection filed in the last minute would be paid out from under the player
    // before an officer could ever read it. Deliberately NOT wrapped in a
    // try/catch: if the objection store cannot be read we must fail CLOSED and
    // leave the money where it is, not settle in the dark.
    const { countOpenObjections } = await import("./objections-service");
    if ((await countOpenObjections(m.id)) > 0) {
      return { ok: false, error: "An objection is standing against this market.", code: "OBJECTION_OPEN" };
    }
  }

  // The settlement loops below moved here verbatim from stage-2. `opts` and
  // `evidence` are rebound to the market's own recorded verdict so that code
  // reads exactly as it did before the split.
  const opts = { marketId: m.id, outcome: m.resolvedOutcome, officerId: settleOpts.actorId ?? "system" };
  const evidence = m.resolutionEvidence ?? null;

  const settledAt = new Date().toISOString();
  m.settledAt = settledAt;
  m.updatedAt = settledAt;

  // settledAt is persisted LAST, after every position is paid. Advisory-lock
  // writes autocommit on their own connections, so stamping settledAt first and
  // then crashing mid-payout would strand winners as OPEN on a market the guard
  // above now considers settled — with no recovery. Persisting it last keeps
  // settlement resumable: a re-run re-enters (settledAt still null) and pays only
  // the still-OPEN positions.
  const persistResolution = async () => {
    await marketStore.set(m);
    recordSnapshot(m.id, m.yesPool, m.noPool);
  };

  // THE POLL'S OWN RATES — frozen at creation, not whatever admin has set today.
  const settleCfg = ratesFor(m);
  const grossPool = m.yesPool + m.noPool;
  const winningPool = opts.outcome === "YES" ? m.yesPool : opts.outcome === "NO" ? m.noPool : 0;

  // THE FEE. Computed ONCE, from the two pool numbers and the frozen rates, before
  // we know or care which side won. It is byte-identical for a YES win and a NO win
  // on the same final pools — that outcome-neutrality is what the pari-mutuel
  // licence rests on (F6 §3.1), and it is why `poolFee` takes no outcome argument.
  const settleFee = poolFee(m.yesPool, m.noPool, settleCfg);

  // Settle only OPEN positions. A CASHED_OUT (or otherwise already-settled)
  // position has already paid out and had its stake removed from the pool —
  // re-settling it here would double-credit the player. (The full list is also
  // used for the M2 largest-remainder allocation, which must see ALL winning-side
  // positions — WIN + OPEN — to stay correct across a resume.)
  const allMarketPositions = await listPositionsForMarket(m.id);
  const myPositions = allMarketPositions.filter((p) => p.status === "OPEN");

  // One-sided market: all bets went to the same side, so there is no
  // opposing pool to pay winnings from. Per the platform rules, all
  // bettors receive a full stake refund at 0% fee.
  const isOneSided = opts.outcome !== "VOID"
    && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));

  if (isOneSided) {
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      // Split: real portion → real balance now; bonus portion → bonus wallet
      // after the lock (queued in pendingBonusRefunds).
      const bonusPart = p.bonusStakeTzs ?? 0;
      const realPart = p.stake - bonusPart;
      const oneSidedTxnId = `txn_${randomId(12)}`;
      // ATOMIC (audit C3): the real-money refund credit, the position → VOID mark,
      // the BET_REFUND txn, and the ledger refund group commit together. A ledger
      // failure rolls the credit back and the position stays OPEN for a clean
      // resume. (The bonus part is refunded after the lock via pendingBonusRefunds
      // → a zero-wagering restitution grant, per C2.)
      await withMoneyTx(async (tx) => {
        // L4/C2: finalPayout = the FULL stake, honest — real → balance, bonus →
        // a zero-wagering restitution grant (refundBonusToActive never forfeits).
        p.status = "VOID"; p.finalPayout = p.stake; p.settledAt = settledAt;
        if (realPart > 0) {
          const updated = await db.wallet.adjust(w.id, { balance: realPart }, undefined, tx);
          if (!updated) throw new Error(`one-sided refund ${m.id}: wallet ${w.id} row missing`);
          await db.txn.create({
            id: oneSidedTxnId,
            walletId: w.id, userId: p.userId,
            type: "BET_REFUND", status: "CONFIRMED",
            amount: realPart, fee: 0, taxWithheld: 0,
            balanceAfter: updated.balance, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `One-sided refund · "${m.titleEn.slice(0, 60)}"`,
            positionId: p.id,
            amlReason: null,
            createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
          }, tx);
        }
        await positionStore.set(p, tx);
        if (realPart > 0 || bonusPart > 0) {
          await postLedgerEntries(`refund_${oneSidedTxnId}`, refundEntries({ txnId: oneSidedTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart }), tx);
        }
      });
      pendingWagerReversals.push({ userId: p.userId, stake: p.stake });
      if (bonusPart > 0) pendingBonusRefunds.push({ userId: p.userId, amount: bonusPart });
      notifyOneSidedRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id, positionId: p.id });
      sendEmailToUser(p.userId, (email) => ({
        to: email,
        subject: `Full refund · ${formatTzs(p.stake)} returned`,
        html: oneSidedRefundHtml({ reference: p.id, stake: p.stake, marketTitle: m.titleEn, settledAt }),
        tag: "one-sided-refund",
      })).catch(() => {});
    }
    audit({
      category: "ADMIN",
      action: "market.resolved.one_sided_refund",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: m.id,
      payload: {
        outcome: opts.outcome,
        yesPool: m.yesPool, noPool: m.noPool,
        grossPool,
        stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
        sourceUrl: m.sourceUrl,
        evidence,
        reason: "One-sided market — all bets on same side, full refund issued at 0% fee",
      },
    });
    try {
      const { onMarketResolved } = await import("./proposals-service");
      await onMarketResolved(m.id, { voided: false });
    } catch { /* proposal prize must never break settlement */ }
    await persistResolution(); // all one-sided refunds done → now stamp settledAt
    audit({
      category: "WALLET",
      action: "market.settled",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: m.id,
      payload: { outcome: opts.outcome, settledAt, winnersPaid: 0, positionsSettled: myPositions.length, reason: "one-sided refund" },
    });
    return { ok: true, data: { winnersPaid: 0, positionsSettled: myPositions.length } };
  }

  if (opts.outcome === "VOID") {
    // Refund everyone
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      const bonusPart = p.bonusStakeTzs ?? 0;
      const realPart = p.stake - bonusPart;
      const refundTxnId = `txn_${randomId(12)}`;
      // ATOMIC (audit C3): real refund credit + position → VOID + BET_REFUND txn +
      // ledger refund group commit together; a failure rolls back and the position
      // stays OPEN for a clean resume. (Bonus part → restitution grant after the
      // lock via pendingBonusRefunds, per C2.)
      await withMoneyTx(async (tx) => {
        p.status = "VOID";
        // L4/C2: full-stake refund is honest — real → balance, bonus → restitution grant.
        p.finalPayout = p.stake;
        p.settledAt = settledAt;
        if (realPart > 0) {
          const updated = await db.wallet.adjust(w.id, { balance: realPart }, undefined, tx);
          if (!updated) throw new Error(`void refund ${m.id}: wallet ${w.id} row missing`);
          await db.txn.create({
            id: refundTxnId,
            walletId: w.id, userId: p.userId,
            type: "BET_REFUND", status: "CONFIRMED",
            amount: realPart, fee: 0, taxWithheld: 0,
            balanceAfter: updated.balance, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `Refund · "${m.titleEn.slice(0, 60)}" voided`,
            positionId: p.id,
            amlReason: null,
            createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
          }, tx);
        }
        await positionStore.set(p, tx);
        if (realPart > 0 || bonusPart > 0) {
          await postLedgerEntries(`refund_${refundTxnId}`, refundEntries({ txnId: refundTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart }), tx);
        }
      });
      pendingWagerReversals.push({ userId: p.userId, stake: p.stake });
      if (bonusPart > 0) pendingBonusRefunds.push({ userId: p.userId, amount: bonusPart });
      notifyRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });
    }
  } else {
    // Whole-pool pari-mutuel distribution, with the capped fee.
    //   fee     = min(commissionRate × pool, feeCeilingRate × smallerSide)
    //   netPool = pool - fee
    //   payout  = (stake / winningSidePool) × netPool
    //
    // `settledPayoutFor` asserts the winner floor and THROWS if a WIN position
    // would be paid below its stake. That is deliberate: the throw propagates,
    // settlement aborts, the pool stays intact and an officer sees it. Refusing to
    // settle is recoverable. Paying a winner 93,150 on a 100,000 stake is not —
    // by the time anyone notices, the money is gone. That is the bug this whole
    // change exists to kill, and this is the tripwire that keeps it dead.
    //
    // M2 — allocate payouts across ALL winning-side positions by largest-remainder
    // (deterministic, so a resumed settlement reproduces each amount) so the sum is
    // EXACTLY floor(netPool): no per-winner rounding drift, the operator's fee is
    // exact. assertWinnerFloor runs per allocation inside allocateWinnerPayouts.
    const winningSidePositions = allMarketPositions.filter((wp) => wp.side === opts.outcome);
    const payoutByPos = allocateWinnerPayouts(
      winningSidePositions.map((wp) => ({ id: wp.id, stake: wp.stake })),
      winningPool,
      settleFee.netPool,
    );
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      if (p.side === opts.outcome) {
        // M2: use the pre-computed largest-remainder allocation (Σ == floor(netPool),
        // winner floor asserted in allocateWinnerPayouts) instead of an independent
        // per-winner round that could drift the operator's fee by a few TZS.
        const payout = payoutByPos.get(p.id) ?? 0;
        const payoutTxnId = `txn_${randomId(12)}`;
        // ATOMIC (audit C3): the wallet credit, the position → WIN mark, the
        // BET_PAYOUT txn row, and the ledger settlement group all commit in ONE
        // transaction. This closes TWO holes at once: a ledger group can no longer
        // be lost while the money moved (the finding), and a crash can no longer
        // land between "credited" and "marked WIN" — which on resume (OPEN-only
        // filter) would double-pay. Any throw rolls the whole winner back; the
        // position stays OPEN and the resumed settlement pays it exactly once.
        const balanceAfter = await withMoneyTx(async (tx) => {
          const updated = await db.wallet.adjust(w.id, { balance: payout }, undefined, tx);
          if (!updated) throw new Error(`settle ${m.id}: wallet ${w.id} row missing for payout`);
          p.status = "WIN"; p.finalPayout = payout; p.settledAt = settledAt;
          await positionStore.set(p, tx);
          await db.txn.create({
            id: payoutTxnId,
            walletId: w.id, userId: p.userId,
            type: "BET_PAYOUT", status: "CONFIRMED",
            amount: payout, fee: 0, taxWithheld: 0,
            balanceAfter: updated.balance, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `${opts.outcome} won · "${m.titleEn.slice(0, 60)}"`,
            positionId: p.id,
            amlReason: null,
            createdAt: settledAt, updatedAt: settledAt, completedAt: settledAt,
          }, tx);
          // The ledger books this winner's SHARE of the poll's single fee — summing
          // every winner's group reconstitutes the whole fee exactly.
          await postLedgerEntries(`settle_${payoutTxnId}`, settlementPayoutEntries({
            groupId: `settle_${payoutTxnId}`, userId: p.userId, marketId: m.id,
            payout, stake: p.stake, fee: settleFee.fee, winningPool,
            rates: { traTaxOnCommissionRate: settleCfg.traTaxOnCommissionRate, gbtLevyOnCommissionRate: settleCfg.gbtLevyOnCommissionRate },
          }), tx);
          return updated.balance;
        });
        // Tamper-evident chain entry for the payout credit (txn row is the
        // ledger; this anchors it in the HMAC audit chain too).
        audit({ category: "WALLET", action: "bet.payout", actorId: p.userId, targetType: "Position", targetId: p.id, payload: { marketId: m.id, outcome: opts.outcome, payout, balanceAfter } });
        // Win receipt — opens the position so they can see the payout.
        notifyWin(p.userId, payout, `${m.titleEn} · ${p.id}`, "/positions");
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `You won · ${formatTzs(payout)}`,
          html: winNotificationHtml({ reference: p.id, payout, stake: p.stake, marketTitle: m.titleEn, settledAt }),
          tag: "win",
        })).catch(() => {});
      } else {
        p.status = "LOSS"; p.finalPayout = 0; p.settledAt = settledAt;
        await positionStore.set(p);
        // Loss receipt — kit copy reframes loss as "pool grew".
        notifyLoss(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id, positionId: p.id });
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `Bet lost · ${formatTzs(p.stake)}`,
          html: lossNotificationHtml({ reference: p.id, stake: p.stake, marketTitle: m.titleEn, settledAt }),
          tag: "loss",
        })).catch(() => {});
      }

      // ── REFERRAL COMMISSION — accrued HERE, from the fee we ACTUALLY charged.
      //
      // It used to accrue at BET time against `stake × commissionRate`, which under
      // the capped model is a fee we may never earn: on the reported poll we take
      // 3,500, not 31,050, and on a one-sided poll we take NOTHING while the old
      // code still paid the referrer. We were paying out a share of revenue that
      // did not exist.
      //
      // This position's honest share of the fee is `(stake / pool) × fee` — it put
      // that fraction of the money into the pool the fee came out of. Win or lose:
      // a loser's stake funded the fee just as much as a winner's did.
      //
      // The refund branches (one-sided, VOID) never reach this line, so a refunded
      // poll accrues nothing — which is correct, because we earned nothing.
      if (settleFee.pool > 0 && settleFee.fee > 0) {
        const attributableFee = (p.stake / settleFee.pool) * settleFee.fee;
        pendingReferralAccruals.push({ userId: p.userId, operatorFee: attributableFee });
      }
    }
  }

  // L2 — report the FULL settled totals from the authoritative position rows. A
  // resumed settlement's loop sees only the still-OPEN positions, so an in-loop
  // accumulator under-counts on re-entry; Σ(finalPayout WHERE WIN) and the
  // non-OPEN count are correct whether this is the first run or a re-entry. This
  // is the number a regulator reconciles. Money-neutral — reporting only.
  const settledNow = await listPositionsForMarket(m.id);
  const totalWinnersPaid = settledNow.reduce((s, p) => s + (p.status === "WIN" ? (p.finalPayout ?? 0) : 0), 0);
  const totalPositionsSettled = settledNow.filter((p) => p.status !== "OPEN").length;

  audit({
    category: "ADMIN",
    action: "market.resolved",
    actorId: opts.officerId,
    targetType: "Market",
    targetId: m.id,
    payload: {
      outcome: opts.outcome,
      yesPool: m.yesPool, noPool: m.noPool,
      payoutModel: "whole-pool-capped-fee",
      // The whole fee arithmetic, in the tamper-evident chain. An inspector (or a
      // player who disputes a payout) can recompute the fee from these five
      // numbers alone and check that `fee = min(commission, ceiling)` — and that
      // it did not depend on which side won.
      rates: { commissionRate: settleCfg.commissionRate, feeCeilingRate: settleCfg.feeCeilingRate },
      grossPool: settleFee.pool,
      smallerSide: settleFee.smaller,
      commissionUncapped: Math.round(settleFee.commission),
      feeCeiling: Math.round(settleFee.ceiling),
      fee: Math.round(settleFee.fee),
      feeWasCapped: settleFee.capped,
      netPool: Math.round(settleFee.netPool),
      levies: levySplit(settleFee.fee, settleCfg),
      winningPool,
      winnersPaid: totalWinnersPaid,
      stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
      sourceUrl: m.sourceUrl,
      evidence,
    },
  });

  // Feature 2 — if this market came from a player proposal, pay the proposer
  // their prize now that it is listed AND resolved. Best-effort; never blocks
  // settlement. VOID outcomes mark the proposal resolved without a prize.
  try {
    const { onMarketResolved } = await import("./proposals-service");
    await onMarketResolved(m.id, { voided: opts.outcome === "VOID" });
  } catch { /* proposal prize must never break settlement */ }

  await persistResolution(); // all winners paid / refunds issued → now flip status

  // F3 — tell WATCHERS the market they follow has settled. Bettors are EXCLUDED:
  // they already receive their own win/loss receipt (which carries the money), so
  // alerting them again would duplicate. Best-effort — never breaks settlement.
  try {
    const { alertWatchersSettled } = await import("./watchlist-service");
    const bettorIds = new Set((await listPositionsForMarket(m.id)).map((p) => p.userId));
    await alertWatchersSettled(m.id, m.titleEn, opts.outcome, bettorIds);
  } catch { /* watcher alerts must never break settlement */ }

  audit({
    category: "WALLET",
    action: "market.settled",
    actorId: opts.officerId,
    targetType: "Market",
    targetId: m.id,
    payload: {
      outcome: opts.outcome, settledAt, winnersPaid: totalWinnersPaid,
      positionsSettled: totalPositionsSettled,
      grossPool, winningPool,
      objectionsClosedAt: m.objectionsClosedAt,
      forced: settleOpts.force === true,
    },
  });

  return { ok: true, data: { winnersPaid: totalWinnersPaid, positionsSettled: totalPositionsSettled } };
  }); // end withLock market

  // Apply, now the market lock is released (refund helpers take the wallet lock —
  // taking it inside the market lock would invert buyPosition's wallet→market
  // order and could deadlock). Reverse each refunded bet's turnover first, then
  // return the bonus principal to the bonus wallet. If the source grant is gone,
  // refundBonusToActive mints a zero-wagering restitution grant so the principal
  // is never forfeited (audit C2) — the money the ledger already recorded as a
  // BONUS_REFUND (refundEntries, above) now always lands in the wallet too, so
  // ledger and wallet cannot diverge on a void.
  for (const r of pendingWagerReversals) await reverseWagering(r.userId, r.stake);
  for (const r of pendingBonusRefunds) {
    if (r.amount <= 0) continue;
    const { refundedToBonus } = await refundBonusToActive(r.userId, r.amount);
    if (refundedToBonus < r.amount) {
      audit({ category: "WALLET", action: "bonus.refund_forfeited", actorId: r.userId, targetType: "User", targetId: r.userId, payload: { requested: r.amount, refundedToBonus, forfeited: r.amount - refundedToBonus, reason: "no active grant to hold refunded bonus" } });
    }
  }

  // Referral commission, on the fee we ACTUALLY charged. Outside the market lock
  // for the same reason as the bonus work above: onRecruitSettlement takes the
  // REFERRER's wallet lock, and taking a wallet lock while holding the market lock
  // would invert buyPosition's wallet→market order and could deadlock.
  //
  // Best-effort: a dropped referral credit must never break a settlement. It is
  // audited and can be replayed from the settlement audit entry.
  for (const r of pendingReferralAccruals) {
    try {
      await onRecruitSettlement(r.userId, { operatorFee: r.operatorFee });
    } catch (err) {
      audit({ category: "SYSTEM", action: "affiliate.settlement_accrual_error", actorId: r.userId, targetType: "Market", targetId: marketId, payload: { error: String(err), operatorFee: r.operatorFee } });
    }
  }
  return result;
}

/**
 * SETTLEMENT SWEEP — pays out every adjudicated market whose objection window has
 * closed. Runs on the lifecycle ticker (once a minute), which is what turns the
 * window from a promise into a mechanism: nothing else pays a resolved market.
 *
 * Every guard that matters lives in settleMarket() and is re-checked under the
 * market lock, so this sweep is deliberately dumb — it proposes candidates, it
 * does not decide. Running it twice concurrently is safe (the lock serialises and
 * the settledAt guard makes the second call a no-op), and a market that is not yet
 * due, or that has an objection standing, simply refuses and is picked up on a
 * later pass.
 */
export async function settleDueMarkets(): Promise<{ settled: number; skipped: number }> {
  const now = Date.now();
  const candidates = (await marketStore.values()).filter(
    (m) => (m.status === "RESOLVED" || m.status === "VOIDED")
      && !m.settledAt
      && !!m.objectionsClosedAt
      && Date.parse(m.objectionsClosedAt) <= now,
  );

  let settled = 0;
  let skipped = 0;
  for (const m of candidates) {
    try {
      const r = await settleMarket(m.id, { actorId: "system" });
      if (r.ok) settled++;
      else skipped++; // TOO_EARLY / OBJECTION_OPEN / already settled — all benign
    } catch (e) {
      // Fail closed: the money stays in the pool and we retry on the next pass.
      skipped++;
      console.error(`[settle] ${m.id} failed — money left in pool, will retry:`, e);
    }
  }

  // Heartbeat. This sweep is now the ONLY thing that pays a resolved market, so
  // if it silently stops running, nobody gets paid and nothing else complains.
  // Recording the beat is what makes that failure visible instead of invisible —
  // see getSettlementHealth(), surfaced on /admin/system.
  setLastSweep({ at: new Date().toISOString(), settled, skipped });
  return { settled, skipped };
}

/**
 * The heartbeat is held on globalThis, NOT in a module-level `let`.
 *
 * The sweep is started from instrumentation.register(); the /admin/system page
 * that reads the heartbeat is rendered in a different module graph. A plain
 * module-level variable is per-module-instance, so the page read `null` even
 * while the ticker was demonstrably running — the health card cried "ticker has
 * not run" on a perfectly healthy system. A false alarm on the one dial that says
 * whether players are being paid is worse than no dial: it trains the operator to
 * ignore it. globalThis is per-PROCESS, so both sides see the same beat (and it
 * is the pattern the rest of this codebase already uses for singletons).
 */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_LAST_SWEEP: { at: string; settled: number; skipped: number } | undefined;
}
const setLastSweep = (v: { at: string; settled: number; skipped: number }) => { globalThis.__50PICK_LAST_SWEEP = v; };
const getLastSweep = () => globalThis.__50PICK_LAST_SWEEP ?? null;

/** Is anything allowed to pay a market on its own? Paused until the payment
 *  aggregator is integrated — see lifecycle.ts. SYNC env-only read, kept for the
 *  degraded display fallback; the effective value (which honours the admin
 *  control-plane toggle) is `getAutoSettleEnabled()` in payment-control.ts, used by
 *  the ticker and `getSettlementHealth()`. */
export function isAutoSettleEnabled(): boolean {
  return process.env.AUTO_SETTLE === "true";
}

export type SettlementQueueRow = {
  id: string;
  titleEn: string;
  outcome: string | null;
  pool: number;
  positions: number;
  objectionsClosedAt: string | null;
  /** READY   — window closed, nothing disputing it: an officer may settle it now.
   *  WAITING — objection window still running; too early to pay.
   *  FROZEN  — an objection is standing; rule on it at /admin/objections first. */
  state: "READY" | "WAITING" | "FROZEN";
};

/**
 * Every market that has been adjudicated but whose money has NOT moved — i.e.
 * everything the officer might have to act on. This is the operator's payout
 * worklist while automatic settlement is paused.
 */
export async function listSettlementQueue(): Promise<SettlementQueueRow[]> {
  const now = Date.now();
  const unsettled = (await marketStore.values()).filter(
    (m) => (m.status === "RESOLVED" || m.status === "VOIDED") && !m.settledAt,
  );
  const { countOpenObjections } = await import("./objections-service");

  const rows: SettlementQueueRow[] = [];
  for (const m of unsettled) {
    const frozen = (await countOpenObjections(m.id)) > 0;
    const due = m.objectionsClosedAt ? Date.parse(m.objectionsClosedAt) : now;
    rows.push({
      id: m.id,
      titleEn: m.titleEn,
      outcome: m.resolvedOutcome,
      pool: m.yesPool + m.noPool,
      positions: (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN").length,
      objectionsClosedAt: m.objectionsClosedAt,
      state: frozen ? "FROZEN" : due > now ? "WAITING" : "READY",
    });
  }
  // Actionable first, then the biggest pools — the officer's eye should land on
  // the money that has been waiting.
  const rank = { READY: 0, FROZEN: 1, WAITING: 2 } as const;
  return rows.sort((a, b) => rank[a.state] - rank[b.state] || b.pool - a.pool);
}

export type SettlementHealth = {
  /** False = nothing pays by itself; an officer settles each market by hand. */
  autoSettle: boolean;
  /** When the sweep last ran. Null = never (expected while auto-settle is off). */
  lastSweepAt: string | null;
  lastSweep: { settled: number; skipped: number } | null;
  /** Adjudicated, money still in the pool, objection window still running. */
  awaiting: { count: number; tzs: number; nextDueAt: string | null };
  /** Frozen by a standing objection — waiting on an OFFICER to rule. */
  frozenByObjection: { count: number; tzs: number };
  /**
   * Window closed, nothing disputing it, money still in the pool.
   *
   * While automatic payout is PAUSED this is simply the officer's work queue —
   * these markets are waiting for a human to press Settle at /admin/settlement.
   * It is normal for this to be non-zero.
   *
   * If AUTO_SETTLE is ever turned back on, the meaning flips: the sweep should be
   * clearing these within a minute, so a number that sits here is an ALARM — it
   * means the ticker is dead and players are silently going unpaid.
   */
  readyToSettle: { count: number; tzs: number; oldestDueAt: string | null };
};

/**
 * Is settlement actually happening? Before the gate, "resolved" meant "paid", so
 * there was nothing to watch. Now a market can sit adjudicated-and-unpaid, and the
 * only thing that moves it is a background sweep — so the sweep failing is a
 * silent, money-shaped failure. This is the readout that makes it loud.
 */
export async function getSettlementHealth(): Promise<SettlementHealth> {
  const now = Date.now();
  const unsettled = (await marketStore.values()).filter(
    (m) => (m.status === "RESOLVED" || m.status === "VOIDED") && !m.settledAt,
  );

  const { countOpenObjections } = await import("./objections-service");

  const awaiting = { count: 0, tzs: 0, nextDueAt: null as string | null };
  const frozen = { count: 0, tzs: 0 };
  const readyToSettle = { count: 0, tzs: 0, oldestDueAt: null as string | null };

  for (const m of unsettled) {
    const pool = m.yesPool + m.noPool;
    const due = m.objectionsClosedAt ? Date.parse(m.objectionsClosedAt) : now;
    const blocked = (await countOpenObjections(m.id)) > 0;

    if (blocked) {
      frozen.count++;
      frozen.tzs += pool;
    } else if (due > now) {
      awaiting.count++;
      awaiting.tzs += pool;
      if (!awaiting.nextDueAt || due < Date.parse(awaiting.nextDueAt)) awaiting.nextDueAt = m.objectionsClosedAt;
    } else {
      // Window closed, nothing disputing it, money still in the pool. With
      // automatic payout paused this is the officer's queue, not a fault.
      readyToSettle.count++;
      readyToSettle.tzs += pool;
      if (!readyToSettle.oldestDueAt || due < Date.parse(readyToSettle.oldestDueAt)) readyToSettle.oldestDueAt = m.objectionsClosedAt;
    }
  }

  return {
    autoSettle: await getAutoSettleEnabled(),
    lastSweepAt: getLastSweep()?.at ?? null,
    lastSweep: getLastSweep() ? { settled: getLastSweep()!.settled, skipped: getLastSweep()!.skipped } : null,
    awaiting, frozenByObjection: frozen, readyToSettle,
  };
}

/**
 * ADMIN REOPEN — reverses a sentinel closure so the market goes back to LIVE.
 * Only works on CLOSED markets that haven't entered the resolution flow yet
 * (no stage-1 officer recorded). If the sentinel was wrong, this is the fix.
 */
export async function adminReopenMarket(marketId: string, officerId: string): Promise<ServiceResult<{ market: StoredMarket }>> {
  return withLock(`market:${marketId}`, async () => {
    const m = await marketStore.get(marketId);
    if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
    if (m.status !== "CLOSED") return { ok: false, error: "Only closed markets can be reopened.", code: "INVALID" };
    if (m.resolutionStage1By) return { ok: false, error: "Cannot reopen — resolution already started.", code: "INVALID" };

    m.status = "LIVE";
    m.updatedAt = new Date().toISOString();
    // Clear stale sentinel recommendation so the resolver queue doesn't show
    // outdated AI assessment if the market is later closed by time.
    m.sentinelOutcome = null;
    m.sentinelEvidence = null;
    m.sentinelReasoning = null;
    m.sentinelSourceUrl = null;
    m.sentinelConfidence = null;
    m.sentinelClosedAt = null;
    await marketStore.set(m);

    audit({
      category: "ADMIN",
      action: "market.reopened",
      actorId: officerId,
      targetType: "Market",
      targetId: m.id,
      payload: { reason: "Sentinel judgment overridden by admin" },
    });

    return { ok: true, data: { market: m } };
  });
}

/**
 * EMERGENCY VOID — single-action "kill switch" for a market that must be pulled
 * immediately (e.g. a political/governmental directive, a bad source, a pricing
 * error). Unlike resolveMarket("VOID") this is ONE atomic admin action (no
 * two-officer dance) and works on a LIVE market mid-trading.
 *
 * What it does, all under the market lock so it's all-or-nothing:
 *   - refunds EVERY open position its FULL stake (no fee — the player didn't
 *     choose to exit; this is a cancellation, so they're made whole),
 *   - zeroes the pools and marks the market VOIDED,
 *   - audits the action (COMPLIANCE) with the mandatory reason + totals.
 *
 * Single-officer is acceptable because the operation can only RETURN players'
 * own stakes — no winnings, no payout, no one profits — so it carries none of
 * the collusion risk that makes resolution two-officer. Idempotent: a market
 * already RESOLVED/VOIDED is rejected, so stakes can never be double-refunded.
 * Already CASHED_OUT positions are skipped (their stake already left the pool).
 */
export async function emergencyVoidMarket(opts: { marketId: string; officerId: string; reason: string }): Promise<ServiceResult<{ refundedCount: number; refundedTzs: number }>> {
  const reason = (opts.reason ?? "").trim();
  if (reason.length < 5) return { ok: false, error: "A reason (≥ 5 characters) is required for an emergency void.", code: "INVALID" };

  // Money-moving void — refunds every open stake. Hard-gate to ADMIN/COMPLIANCE
  // at the SERVICE layer (defense-in-depth): the direct emergencyVoidMarketAction
  // already restricts this, but other callers run under MARKET_OPS (incl.
  // MODERATOR) — e.g. deleting a PUBLISHED AI poll voids its live market. Voiding
  // a live market and moving money is never a moderator action.
  const officer = await db.user.findById(opts.officerId);
  if (!officer || !["ADMIN", "COMPLIANCE"].includes(officer.role)) {
    audit({
      category: "SECURITY",
      action: "market.emergency_void.forbidden",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: opts.marketId,
      payload: { role: officer?.role ?? "unknown", note: "ADMIN/COMPLIANCE required to void a market (money movement)." },
    });
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to void a market.", code: "INVALID" };
  }

  // Officer-conflict hard-block (Elevation #12): same rule as resolveMarket.
  const officerPositions = (await listPositionsForMarket(opts.marketId))
    .filter((p) => p.userId === opts.officerId && (p.status === "OPEN" || p.status === "WIN" || p.status === "LOSS"));
  if (officerPositions.length > 0) {
    audit({
      category: "COMPLIANCE",
      action: "market.emergency_void.conflict_blocked",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: opts.marketId,
      payload: { positionCount: officerPositions.length, positionIds: officerPositions.map((p) => p.id) },
    });
    return { ok: false, error: "You hold a position in this market and cannot void it — assign a different officer.", code: "CONFLICT" };
  }

  const pendingBonusRefunds: Array<{ userId: string; amount: number }> = [];
  const pendingWagerReversals: Array<{ userId: string; stake: number }> = [];
  const result = await withLock(`market:${opts.marketId}`, async () => {
    const m = await marketStore.get(opts.marketId);
    if (!m) return { ok: false as const, error: "Market not found.", code: "NOT_FOUND" as const };
    // The test is whether the MONEY has moved, not what the status says. Since
    // F11 a market can be RESOLVED (verdict recorded) while its pool is still
    // whole and every position OPEN — and that is exactly the state an officer
    // needs to be able to kill: it is the state a market sits in while players
    // are objecting to the verdict. Only a market that has actually settled is
    // beyond an emergency void, because undoing it would mean clawing money back
    // out of players' wallets.
    if (m.settledAt) {
      return { ok: false as const, error: "Market is already settled — its money has moved. Nothing to void.", code: "INVALID" as const };
    }

    const now = new Date().toISOString();
    const grossPool = m.yesPool + m.noPool;

    // Refund every OPEN position its full stake. db.wallet.adjust is atomic, so
    // (like the resolveMarket VOID path) no nested wallet lock is needed.
    const open = (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN");
    let refundedCount = 0;
    let refundedTzs = 0;
    for (const p of open) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      // Split: real portion → real now; bonus portion → bonus wallet after the
      // lock; reverse the bet's turnover (it never settled).
      const bonusPart = p.bonusStakeTzs ?? 0;
      const realPart = p.stake - bonusPart;
      let balanceAfter = w.balance;
      if (realPart > 0) {
        const updated = await db.wallet.adjust(w.id, { balance: realPart });
        balanceAfter = updated?.balance ?? w.balance + realPart;
      }
      p.status = "VOID";
      p.finalPayout = p.stake;
      p.settledAt = now;
      await positionStore.set(p);
      pendingWagerReversals.push({ userId: p.userId, stake: p.stake });
      if (bonusPart > 0) pendingBonusRefunds.push({ userId: p.userId, amount: bonusPart });
      if (realPart > 0 || bonusPart > 0) {
        const emergTxnId = `txn_${randomId(12)}`;
        if (realPart > 0) await db.txn.create({
          id: emergTxnId,
          walletId: w.id, userId: p.userId,
          type: "BET_REFUND", status: "CONFIRMED",
          amount: realPart, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `Emergency refund · "${m.titleEn.slice(0, 60)}" cancelled`,
          positionId: p.id,
          amlReason: null,
          createdAt: now, updatedAt: now, completedAt: now,
        });
        // Dual-write: emergency refund to double-entry ledger (fire-and-forget).
        postLedgerEntries(`refund_${emergTxnId}`, refundEntries({ txnId: emergTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart })).catch(() => {});
      }
      // Player notice — BOTH channels, and both carry the admin's reason so the
      // player knows WHY their market was pulled and that they were made whole.
      notifyMarketCancelled(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id, reason });
      sendEmailToUser(p.userId, (email) => ({
        to: email,
        subject: `Market cancelled — ${formatTzs(p.stake)} refunded`,
        html: marketCancelledRefundHtml({ title: m.titleEn, reason, amount: p.stake, reference: p.id }),
        tag: "market-cancelled-refund",
      })).catch(() => {});
      refundedCount++;
      refundedTzs += p.stake;
    }

    // Pools are now empty (all stakes refunded, seeds returned). Mark VOIDED and
    // stamp both resolution officers as this single emergency operator for the trail.
    m.yesPool = 0;
    m.noPool = 0;
    m.status = "VOIDED";
    m.resolvedOutcome = "VOID";
    m.resolutionStage1By = opts.officerId;
    m.resolutionStage1At = now;
    m.resolutionStage2By = opts.officerId;
    m.resolutionStage2At = now;
    // The money moved HERE — stamp it, or settleDueMarkets would see a VOIDED
    // market with settledAt still null and try to settle it a second time.
    m.settledAt = now;
    // Surface the recorded cancellation reason as the settlement-proof evidence so
    // a voided market tells players WHY it was pulled (same value already sent in
    // the cancellation notice; capped for parity with the ceremony path).
    m.resolutionEvidence = reason ? String(reason).trim().slice(0, 2000) || null : null;
    m.updatedAt = now;
    await marketStore.set(m);
    recordSnapshot(m.id, 0, 0);

    audit({
      category: "COMPLIANCE",
      action: "market.emergency_void",
      actorId: opts.officerId,
      targetType: "Market",
      targetId: m.id,
      payload: { reason, refundedCount, refundedTzs, grossPoolBefore: grossPool, title: m.titleEn },
    });

    // An emergency void does not wait for objections — it is the kill switch. But
    // it has just SETTLED the market, so any objection still open against it would
    // be stranded: un-actionable in the officer queue, and unanswered for the
    // player who filed it. A void refunds every stake in full, which is precisely
    // the VOID remedy, so close them out as that and notify the objectors.
    try {
      const { closeObjectionsForVoidedMarket } = await import("./objections-service");
      await closeObjectionsForVoidedMarket(m.id, opts.officerId, reason);
    } catch (e) {
      // Never let this break the refund path — the money is already back.
      console.error("[emergency-void] could not close objections:", e);
    }

    // Confirm to EVERY admin/officer that the cancellation succeeded — in-app +
    // email — so the whole team has an awareness/audit trail (and the acting
    // officer gets a definitive "done" beyond the result modal). Best-effort.
    const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE", "MODERATOR"]); // audit M5
    for (const o of officers) {
      notifyAdminMarketCancelled(o.id, { title: m.titleEn, reason, refundedCount, refundedTzs }).catch(() => {});
      sendEmailToUser(o.id, (email) => ({
        to: email,
        subject: `Market cancelled · ${m.titleEn.slice(0, 50)}`,
        html: marketCancelledAdminHtml({ title: m.titleEn, reason, refundedCount, refundedTzs }),
        tag: "market-cancelled-admin",
        trackLinks: false,
      })).catch(() => {});
    }

    return { ok: true as const, data: { refundedCount, refundedTzs } };
  });

  // After the market lock: reverse turnover + return bonus principal to bonus
  // (never to real — forfeit if no active grant). See resolveMarket for rationale.
  for (const r of pendingWagerReversals) await reverseWagering(r.userId, r.stake);
  for (const r of pendingBonusRefunds) {
    if (r.amount <= 0) continue;
    const { refundedToBonus } = await refundBonusToActive(r.userId, r.amount);
    if (refundedToBonus < r.amount) {
      audit({ category: "WALLET", action: "bonus.refund_forfeited", actorId: r.userId, targetType: "User", targetId: r.userId, payload: { requested: r.amount, refundedToBonus, forfeited: r.amount - refundedToBonus, reason: "emergency void, no active grant" } });
    }
  }
  return result;
}

/** Seed the demo with a deep, varied catalogue and top up automatically
 *  when fewer than 25 LIVE markets remain — the manager always has at
 *  least 40 markets to drill into without needing to /admin/markets.
 *  Demo · minute-scale markets are refreshed *separately* so the
 *  bet → settle → celebrate loop always has a fresh-soon market to
 *  drill into, regardless of total LIVE count. */
export async function seedDemoMarkets() {
  // Migrate older snapshots: purge any market with category "politics"
  // (pre-Sprint 37 the seed included an LGA-turnout market; the Tanzania
  // Gaming Board licence excludes political-event markets entirely).
  const allMarkets = await marketStore.values();
  for (const m of allMarkets) {
    if ((m as { category: string }).category === "politics") {
      await marketStore.delete(m.id);
    }
  }

  // 1. Auto-resolve expired Demo · markets so the manager sees their
  //    win/loss the moment the countdown hits 0 (no human officer
  //    needed for synthetic markets — production polls a real vendor).
  // 2. Sweep orphaned positions left over from the deletion bug that
  //    Sprint 56.4 fixed; refunds the stake.
  // Both are idempotent; running them on every /markets page hit is
  // safe and keeps state self-healing without a cron.
  autoResolveExpiredDemoMarkets().catch(() => {});
  notifyDueMarketsForResolution().catch(() => {});
  repairOrphanedPositions().catch(() => {});
  // 3. Expire bonus grants past their validity window — removes the unspent
  //    remainder from the bonus wallet and notifies the player. Idempotent and
  //    self-healing like the sweeps above (no cron needed).
  expireActiveGrants().catch(() => {});

  // NOTE: demo "Demo · " markets are no longer seeded (tester feedback) and
  // are hidden from every player listing by isDemoMarket(). Any that already
  // exist stay in the store so their open positions settle and resolve
  // cleanly — we only ever ADD real markets below, never DELETE.

  // Top-up gate: if we already have 25+ LIVE markets, leave them alone.
  // Otherwise we'll re-seed the canonical 40-market catalogue below to
  // bring the count back up. Resolved + voided markets stay in history.
  const liveNow = (await marketStore.values()).filter(m => m.status === "LIVE").length;
  if (liveNow >= 25) return;
  const day = 24 * 3600_000;
  const seed: CreateMarketInput[] = [
    {
      titleEn: "Will the TZS strengthen against the USD by month-end?",
      titleSw: "Je, TZS itaimarika dhidi ya USD kufikia mwisho wa mwezi?",
      category: "macro",
      sourceUrl: "https://www.bot.go.tz/exchangerates",
      resolutionCriterion: "Resolves YES if the BoT mid-rate on the last business day of the calendar month is below the rate on the first business day. Source: Bank of Tanzania official daily mid-rate.",
      resolutionAt: new Date(Date.now() + 7 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will the long rains begin in Dar es Salaam before April 15?",
      titleSw: "Je, masika yataanza Dar es Salaam kabla ya Aprili 15?",
      category: "weather",
      sourceUrl: "https://www.meteo.go.tz",
      resolutionCriterion: "Resolves YES if Dar es Salaam records ≥10mm rainfall on at least three calendar days between March 1 and April 14 inclusive. Source: TMA daily station report.",
      resolutionAt: new Date(Date.now() + 14 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Simba SC win the next Kariakoo Derby?",
      titleSw: "Je, Simba SC watashinda Derby ya Kariakoo ijayo?",
      category: "sports",
      sourceUrl: "https://nbc.co.tz/premier-league",
      resolutionCriterion: "Resolves YES if Simba SC win the scheduled NBC Premier League fixture vs Yanga SC. Draw or Yanga win resolves NO. Source: NBC Premier League official result.",
      resolutionAt: new Date(Date.now() + 3 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will the BoT base rate change at the next MPC meeting?",
      titleSw: "Je, kiwango cha riba cha BoT kitabadilika kwenye mkutano ujao wa MPC?",
      category: "macro",
      sourceUrl: "https://www.bot.go.tz/MonetaryPolicy/",
      resolutionCriterion: "Resolves YES if the announced policy rate differs from the prior rate. Source: BoT MPC press release.",
      resolutionAt: new Date(Date.now() + 21 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Bongo Star Search 2026 finale air on schedule?",
      titleSw: "Je, fainali ya Bongo Star Search 2026 itarushwa kwa wakati uliopangwa?",
      category: "culture",
      sourceUrl: "https://www.itv.co.tz/bongostarsearch",
      resolutionCriterion: "Resolves YES if the finale episode airs on the scheduled date and time per the official broadcast schedule. Source: ITV Tanzania programming.",
      resolutionAt: new Date(Date.now() + 28 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Bitcoin close above $80,000 at end of week?",
      titleSw: "Je, Bitcoin itafungwa juu ya $80,000 mwishoni mwa wiki?",
      category: "crypto",
      sourceUrl: "https://www.coingecko.com/en/coins/bitcoin",
      resolutionCriterion: "Resolves YES if BTC/USD on CoinGecko at 23:59 UTC on Sunday is ≥ 80,000. Source: CoinGecko close price.",
      resolutionAt: new Date(Date.now() + 4 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Mount Kilimanjaro see snow at the summit by mid-June?",
      titleSw: "Je, Mlima Kilimanjaro utakuwa na theluji kileleni ifikapo katikati ya Juni?",
      category: "weather",
      sourceUrl: "https://www.meteo.go.tz",
      resolutionCriterion:
        "Resolves YES if the Tanzania Meteorological Authority records measurable snowfall at the Uhuru Peak weather station between 1 May and 15 June. Source: TMA daily station report.",
      resolutionAt: new Date(Date.now() + 38 * day).toISOString(),
      proposedBy: "system",
    },
    // ── Sports — football fixtures & national teams ──────────────────────
    { titleEn: "Will Yanga SC top the NBC Premier League at the next round?", titleSw: "Je, Yanga SC watakuwa juu ya jedwali la NBC ifikapo raundi ijayo?", category: "sports", sourceUrl: "https://nbc.co.tz/premier-league", resolutionCriterion: "Resolves YES if Yanga SC are top of the official NBC Premier League standings at end of the next scheduled match round. Source: NBC official table.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Taifa Stars qualify for the next AFCON?", titleSw: "Je, Taifa Stars wataitishwa AFCON ijayo?", category: "sports", sourceUrl: "https://www.cafonline.com", resolutionCriterion: "Resolves YES if Tanzania appears on the official CAF AFCON qualified-teams list at qualifier conclusion. Source: CAF Online.", resolutionAt: new Date(Date.now() + 60 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Azam FC reach the CAF Confederation Cup quarter-finals?", titleSw: "Je, Azam FC watafika robo-fainali ya Kombe la Shirikisho la CAF?", category: "sports", sourceUrl: "https://www.cafonline.com/caf-confederation-cup/", resolutionCriterion: "Resolves YES if Azam FC are listed in the official CAF quarter-final draw. Source: CAF Online.", resolutionAt: new Date(Date.now() + 45 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Manchester City win the Premier League this season?", titleSw: "Je, Manchester City watashinda Premier League msimu huu?", category: "sports", sourceUrl: "https://www.premierleague.com/tables", resolutionCriterion: "Resolves YES if Manchester City are crowned champions per the official Premier League final standings. Source: Premier League official site.", resolutionAt: new Date(Date.now() + 80 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Real Madrid reach the Champions League final?", titleSw: "Je, Real Madrid watafika fainali ya Champions League?", category: "sports", sourceUrl: "https://www.uefa.com/uefachampionsleague/", resolutionCriterion: "Resolves YES if Real Madrid appear in the official UEFA Champions League final fixture. Source: UEFA Online.", resolutionAt: new Date(Date.now() + 50 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Tanzania win an Olympic medal at the next Summer Games?", titleSw: "Je, Tanzania itashinda medali ya Olimpiki kwenye michezo ya majira ya joto ijayo?", category: "sports", sourceUrl: "https://olympics.com/en/medals", resolutionCriterion: "Resolves YES if Tanzania appears on the official IOC medal table at games close. Source: olympics.com.", resolutionAt: new Date(Date.now() + 90 * day).toISOString(), proposedBy: "system" },
    // ── Macro — TZ economy / BoT / NBS releases ──────────────────────────
    { titleEn: "Will TZS inflation print below 4.0% next NBS release?", titleSw: "Je, mfumuko wa bei wa TZS utakuwa chini ya 4.0% kwenye taarifa ijayo ya NBS?", category: "macro", sourceUrl: "https://www.nbs.go.tz", resolutionCriterion: "Resolves YES if year-over-year CPI in the next NBS Monthly CPI press release is < 4.0%. Source: NBS official release.", resolutionAt: new Date(Date.now() + 30 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the BoT keep the policy rate unchanged at the next MPC?", titleSw: "Je, BoT itaiacha riba kuu bila mabadiliko kwenye MPC ijayo?", category: "macro", sourceUrl: "https://www.bot.go.tz/MonetaryPolicy/", resolutionCriterion: "Resolves YES if the BoT MPC press release reports an unchanged policy rate vs the prior decision. Source: BoT MPC.", resolutionAt: new Date(Date.now() + 22 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the BoT FX reserves rise above $5.5 billion next monthly print?", titleSw: "Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?", category: "macro", sourceUrl: "https://www.bot.go.tz", resolutionCriterion: "Resolves YES if Bank of Tanzania official monthly FX reserves figure exceeds USD 5.5 billion. Source: BoT monthly bulletin.", resolutionAt: new Date(Date.now() + 33 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Tanzania GDP growth print above 5.5% in the next quarterly NBS release?", titleSw: "Je, ukuaji wa Pato la Taifa utazidi 5.5% kwenye taarifa ya robo mwaka ijayo ya NBS?", category: "macro", sourceUrl: "https://www.nbs.go.tz", resolutionCriterion: "Resolves YES if NBS reports quarterly real GDP growth > 5.5%. Source: NBS quarterly GDP release.", resolutionAt: new Date(Date.now() + 65 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next US Fed FOMC keep rates unchanged?", titleSw: "Je, FOMC ijayo ya Fed itaiacha riba bila mabadiliko?", category: "macro", sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", resolutionCriterion: "Resolves YES if the FOMC statement reports the target range unchanged from the previous decision. Source: Federal Reserve.", resolutionAt: new Date(Date.now() + 26 * day).toISOString(), proposedBy: "system" },
    // ── Weather — TMA station-driven outcomes ─────────────────────────────
    { titleEn: "Will Arusha get measurable rainfall on Saturday?", titleSw: "Je, Arusha kutapata mvua inayopimika Jumamosi?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Arusha TMA station records ≥ 1.0 mm rainfall on the named Saturday. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Mwanza max temperature exceed 32°C this Sunday?", titleSw: "Je, joto la juu Mwanza litazidi nyuzi 32 Jumapili?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Mwanza TMA station's daily Tmax for the named Sunday exceeds 32.0 °C. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Zanzibar see a full sunny day this Friday?", titleSw: "Je, Zanzibar itakuwa na siku kamili ya jua Ijumaa hii?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Zanzibar TMA station records < 0.2 mm rainfall and ≥ 7 hours sunshine on the named Friday. Source: TMA station report.", resolutionAt: new Date(Date.now() + 4 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Dodoma exceed 35°C any day this week?", titleSw: "Je, Dodoma itazidi nyuzi 35 siku yoyote wiki hii?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Dodoma TMA station Tmax exceeds 35 °C on any day in the named week. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 7 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the masika season end before May 31 in Dar es Salaam?", titleSw: "Je, masika yataisha kabla ya Mei 31 Dar es Salaam?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if the TMA officially declares the long-rain season ended on or before May 31 in their seasonal bulletin. Source: TMA seasonal bulletin.", resolutionAt: new Date(Date.now() + 25 * day).toISOString(), proposedBy: "system" },
    // ── Crypto — daily/weekly closes, BTC + ETH + SOL ────────────────────
    { titleEn: "Will Bitcoin close above $90,000 next Sunday?", titleSw: "Je, Bitcoin itafungwa juu ya $90,000 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 90,000. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Ethereum close above $3,500 next Sunday?", titleSw: "Je, Ethereum itafungwa juu ya $3,500 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/ethereum", resolutionCriterion: "Resolves YES if ETH/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 3,500. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Solana close above $200 next Sunday?", titleSw: "Je, Solana itafungwa juu ya $200 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/solana", resolutionCriterion: "Resolves YES if SOL/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 200. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Bitcoin's 7-day move be positive?", titleSw: "Je, mwendo wa Bitcoin wa siku 7 utakuwa chanya?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close 7 days from market open exceeds the open-day close. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 7 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Ethereum hit a new 30-day high before month-end?", titleSw: "Je, Ethereum itafikia kiwango kipya cha juu cha siku 30 kabla ya mwisho wa mwezi?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/ethereum", resolutionCriterion: "Resolves YES if ETH/USD CoinGecko 24h-high exceeds the prior 30-day rolling high before the last calendar day of the month. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 18 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Bitcoin daily close be green?", titleSw: "Je, kufungwa kwa kila siku kwa Bitcoin kutakuwa kijani kesho?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close on the named day exceeds the prior day's close. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 1 * day).toISOString(), proposedBy: "system" },
    // ── Culture — film, music, awards ────────────────────────────────────
    { titleEn: "Will the next Diamond Platnumz single chart top 5 on Boomplay TZ?", titleSw: "Je, wimbo ujao wa Diamond Platnumz utakuwa kati ya 5 bora kwenye Boomplay TZ?", category: "culture", sourceUrl: "https://www.boomplay.com/charts", resolutionCriterion: "Resolves YES if the named single appears in Top 5 on the Boomplay Tanzania weekly chart within 14 days of release. Source: Boomplay.", resolutionAt: new Date(Date.now() + 14 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Wasafi-released video pass 1M views in its first week?", titleSw: "Je, video ijayo ya Wasafi itapita milioni 1 wiki ya kwanza?", category: "culture", sourceUrl: "https://www.youtube.com/@WasafiClassicBaby", resolutionCriterion: "Resolves YES if the named YouTube upload reports ≥ 1,000,000 views 7 days after publish. Source: YouTube public counter.", resolutionAt: new Date(Date.now() + 8 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Bongo Movie Awards 2026 air on schedule?", titleSw: "Je, Tuzo za Filamu za Bongo 2026 zitarushwa kwa wakati?", category: "culture", sourceUrl: "https://www.bongomovie.com", resolutionCriterion: "Resolves YES if the broadcast occurs on the announced date and channel. Source: Official Bongo Movie Awards announcement.", resolutionAt: new Date(Date.now() + 33 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Marvel film open above $100M domestic box office?", titleSw: "Je, filamu ijayo ya Marvel itafungua juu ya $100M ndani ya nchi?", category: "culture", sourceUrl: "https://www.boxofficemojo.com", resolutionCriterion: "Resolves YES if the named Marvel theatrical release reports a US domestic opening weekend gross above $100,000,000. Source: Box Office Mojo.", resolutionAt: new Date(Date.now() + 22 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Sauti Sol release a new single in the next 30 days?", titleSw: "Je, Sauti Sol watatoa wimbo mpya katika siku 30 zijazo?", category: "culture", sourceUrl: "https://www.sautisol.com", resolutionCriterion: "Resolves YES if a new single is released on at least one major streaming platform within 30 days of market open. Source: Spotify/Boomplay artist pages.", resolutionAt: new Date(Date.now() + 30 * day).toISOString(), proposedBy: "system" },
    // ── Sports — boxing & athletics ──────────────────────────────────────
    { titleEn: "Will Hassan Mwakinyo win his next professional bout?", titleSw: "Je, Hassan Mwakinyo atashinda mechi yake ijayo ya kulipwa?", category: "sports", sourceUrl: "https://boxrec.com", resolutionCriterion: "Resolves YES if BoxRec records Mwakinyo's next professional bout as a win by KO/TKO/decision. Source: BoxRec.", resolutionAt: new Date(Date.now() + 28 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will a Tanzanian runner break 28:00 in the next World Athletics 10K?", titleSw: "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?", category: "sports", sourceUrl: "https://worldathletics.org", resolutionCriterion: "Resolves YES if any Tanzanian runner runs a sub-28:00 in an official World Athletics 10,000 m race in the named period. Source: WA results.", resolutionAt: new Date(Date.now() + 70 * day).toISOString(), proposedBy: "system" },
    // ── Macro — global markets ────────────────────────────────────────────
    { titleEn: "Will the S&P 500 close higher this week?", titleSw: "Je, S&P 500 itafungwa juu wiki hii?", category: "macro", sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/", resolutionCriterion: "Resolves YES if the S&P 500 official Friday close exceeds the prior Friday close. Source: S&P Dow Jones Indices.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will gold close above $2,400/oz next Friday?", titleSw: "Je, dhahabu itafungwa juu ya $2,400/oz Ijumaa ijayo?", category: "macro", sourceUrl: "https://www.lbma.org.uk/prices-and-data/precious-metal-prices", resolutionCriterion: "Resolves YES if the LBMA Gold Price PM fix on the named Friday is ≥ 2,400.00 USD/oz. Source: LBMA.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Brent crude close above $80/bbl next Monday?", titleSw: "Je, Brent itafungwa juu ya $80/bbl Jumatatu ijayo?", category: "macro", sourceUrl: "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm", resolutionCriterion: "Resolves YES if EIA Brent spot price on the named Monday closes ≥ 80.00 USD/bbl. Source: EIA.", resolutionAt: new Date(Date.now() + 4 * day).toISOString(), proposedBy: "system" },
    // ── Weather — long-range hurricane / drought ──────────────────────────
    { titleEn: "Will the next Indian Ocean tropical cyclone reach Category 3+?", titleSw: "Je, kimbunga kijacho cha Bahari ya Hindi kitafikia daraja la 3 au juu?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if any tropical cyclone in the SW Indian Ocean basin during the named period reaches Category 3 (≥ 178 km/h sustained) per RSMC La Réunion. Source: RSMC La Réunion bulletin.", resolutionAt: new Date(Date.now() + 45 * day).toISOString(), proposedBy: "system" },
    // Demo markets removed per tester feedback — real markets only.
  ];
  for (const s of seed) {
    // createMarket throws on duplicate id; since we're idempotent on
    // existing-market count, this loop only fires when the count is low.
    try {
      const m = await createMarket(s);
      // Seed a believable history walk so the PriceChart isn't empty on first paint.
      await seedHistory(m.id, m.yesPool, m.noPool);
    } catch {
      // Ignore — likely already present from a prior partial seed.
    }
  }
}
