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
 *   5. After window closes: winners share losers' pool, minus 9% operator margin.
 *      Each winner's payout = stake + (their_stake / winning_pool) × (losing_pool * 0.91)
 *
 * Aligns with Tanzania GBT pari-mutuel licensing + LCCP RTS 7B disclosure.
 */
import { audit } from "./audit";
import { db } from "./store";
import { randomId } from "./crypto";
import { withLock } from "./locks";
import { emit } from "./event-bus";
import { spendBonusLocked, recordWageringLocked, reverseWagering, refundBonusToActive, refundBonusLocked, expireActiveGrants, type BonusAllocation } from "./bonus-service";
import { notifyBonusFulfilled } from "./notification-service";
import { isLockedOut, checkLossLimit } from "./responsible-gambling";
import { rateCheck } from "./rate-limit";
import { getEffectiveConfig, payoutForWhole, settledPayoutWhole } from "./market-config";
import { getConflictedResolutionAllowed } from "./test-overrides";
import { isMaintenanceMode, maintenanceMessage } from "./platform-config";
import { recordSnapshot, seedHistory } from "./market-history";
import { notifyBetPlaced, notifyWin, notifyLoss, notifyRefund, notifyCashout, notifyAdminMarketResolution, notifyMarketCancelled, notifyAdminMarketCancelled, notifyOneSidedRefund, notifySelectionClosed } from "./notification-service";
import { sendEmailToUser, betPlacedHtml, winNotificationHtml, lossNotificationHtml, cashOutReceiptHtml, oneSidedRefundHtml, marketResolutionAdminHtml, marketCancelledRefundHtml, marketCancelledAdminHtml, bonusFulfilledHtml, selectionClosedHtml } from "./email";
import { onRecruitBet } from "./affiliate-service";
import { postLedgerEntries, stakeEntries, settlementPayoutEntries, refundEntries, cashoutEntries } from "./ledger";
import type { ServiceResult } from "./auth-service";
import { marketStore, positionStore } from "./market-dal";

/** @deprecated Kept for backwards compat — use getEffectiveConfig instead. */
export const OPERATOR_MARGIN = 0.09;
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
  resolvedOutcome: Side | "VOID" | null;
  resolutionStage1By: string | null;
  resolutionStage1At: string | null;
  resolutionStage2By: string | null;
  resolutionStage2At: string | null;
  objectionsClosedAt: string | null;
  /** When admins were alerted that this market is closed-by-time and awaiting
   *  their resolution. Set once by the resolution-due sweep so the alert fires
   *  exactly once per market. Null = not yet alerted (or not yet due). */
  resolutionNotifiedAt?: string | null;
  /** When the market's bettors were notified that selections have closed and it
   *  is awaiting results. Set once by the selection-closed sweep so the
   *  "waiting for results" notification fires exactly once per market. */
  selectionClosedNotifiedAt?: string | null;
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
 * Whole-pool pari-mutuel projection.
 *   netPool = (yesPool + noPool + stake) × (1 - tax - commission)
 *   payout  = (stake / winningSidePool) × netPool
 * Under heavy lean, payout/stake can drop below 1.0 — that's the
 * `negative` lean state surfaced by the inline warning.
 *
 * Marketid is optional; without it we use the global config.
 */
export async function projectedPayout(
  m: Pick<StoredMarket, "yesPool" | "noPool"> & { id?: string },
  side: Side,
  stake: number,
): Promise<number> {
  const cfg = await getEffectiveConfig(m.id);
  const r = payoutForWhole({ yesPool: m.yesPool, noPool: m.noPool, side, stake }, cfg);
  return r.payout;
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
    resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null,
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
    payload: { titleEn: m.titleEn, category: m.category, sourceUrl: m.sourceUrl, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt },
  });
  return m;
}

/** Player buys a position on a market. */
export async function buyPosition(userId: string, opts: { marketId: string; side: Side; stake: number; idempotencyKey?: string }): Promise<ServiceResult<{ positionId: string; balance: number; payoutIfWin: number }>> {
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
    return { ok: false, error: `Stake must be a whole number between TZS ${stakeCfg.minStake.toLocaleString()} and TZS ${stakeCfg.maxStake.toLocaleString()}.`, code: "INVALID" };
  }
  if (opts.side !== "YES" && opts.side !== "NO") return { ok: false, error: "Invalid side.", code: "INVALID" };

  const market = await marketStore.get(opts.marketId);
  if (!market) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (market.status !== "LIVE") return { ok: false, error: "Market is not accepting predictions.", code: "INVALID" };
  if (isSelectionClosed(market)) return { ok: false, error: "Selections are closed — waiting for results. · Uchaguzi umefungwa — tunasubiri matokeo.", code: "SELECTION_CLOSED" };
  if (Date.parse(market.resolutionAt) <= Date.now()) return { ok: false, error: "Market has closed.", code: "INVALID" };

  // Daily loss-limit gate (RG / GLI-19). Refuse a bet that would push the player's
  // rolling-24h net real-money loss past their configured cap. Checked here, before
  // any funding/debit, so a rejected bet never moves money.
  const lossCheck = await checkLossLimit(userId, opts.stake);
  if (!lossCheck.allowed) {
    audit({
      category: "COMPLIANCE",
      action: "bet.loss_limit_blocked",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      payload: { stake: opts.stake, reason: lossCheck.reason },
    });
    return { ok: false, error: lossCheck.reason ?? "Daily loss limit reached.", code: "INVALID" };
  }

  let wageringFulfilled: { amountTzs: number }[] = [];
  const result = await withLock(`wallet:${userId}`, async () => {
    // Idempotency: if this key was already used, return the existing position.
    // This prevents double-submit on 2G (same key = same intent, two taps).
    if (opts.idempotencyKey) {
      const existing = await positionStore.findByIdempotencyKey(opts.idempotencyKey);
      if (existing) {
        const w = await db.wallet.findByUserId(userId);
        return { ok: true as const, data: { positionId: existing.id, balance: w?.balance ?? 0, payoutIfWin: existing.potentialPayout } };
      }
    }

    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet || wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet unavailable.", code: "NOT_FOUND" as const };

    // Real-first funding: spend the player's own (withdrawable) balance first,
    // then top up the remainder from the bonus wallet. Both debits run inside
    // THIS wallet lock so the affordability check and the two debits can't be
    // split by a concurrent bet/withdraw (no double-spend).
    const realAvail = wallet.balance;
    const bonusAvail = wallet.bonusBalance ?? 0;
    const realPart = Math.min(opts.stake, realAvail);
    const bonusPart = opts.stake - realPart;
    if (bonusPart > bonusAvail) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };

    let newBalance = realAvail;
    if (realPart > 0) {
      // Atomic, overdraw-guarded debit (WHERE balance >= realPart).
      const debited = await db.wallet.adjust(wallet.id, { balance: -realPart }, { requireBalanceGte: realPart });
      if (!debited) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };
      newBalance = debited.balance;
    }
    let bonusAllocations: BonusAllocation[] = [];
    if (bonusPart > 0) {
      // Lock-free spend — we already hold wallet:<userId>.
      const spend = await spendBonusLocked(userId, bonusPart);
      if (spend.spent < bonusPart) {
        if (realPart > 0) await db.wallet.adjust(wallet.id, { balance: realPart }); // roll back real debit
        return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };
      }
      bonusAllocations = spend.allocations;
    }

    const payoutIfWin = await projectedPayout(market, opts.side, opts.stake);
    const positionId = `pos_${randomId(10)}`;
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
    // defence): a bet that slipped past the pre-lock close checks — placed in
    // the microseconds before the cutoff, or racing a concurrent admin suspend /
    // auto-close — must NOT be allowed to add money to a closed market. If the
    // window closed in-flight we abort the pool write and unwind below.
    let closedInFlight = false;
    await withLock(`market:${opts.marketId}`, async () => {
      const fresh = await marketStore.get(opts.marketId);
      if (!fresh || fresh.status !== "LIVE" || isSelectionClosed(fresh) || Date.parse(fresh.resolutionAt) <= Date.now()) {
        closedInFlight = true;
        return;
      }
      if (opts.side === "YES") fresh.yesPool += opts.stake;
      else                     fresh.noPool  += opts.stake;
      fresh.predictorCount += 1;
      fresh.updatedAt = placedAt;
      await marketStore.set(fresh);
      // Snapshot the new pool for the per-market history chart.
      recordSnapshot(fresh.id, fresh.yesPool, fresh.noPool);
      // SSE: push live odds to all connected clients
      emit("market:odds", { marketId: fresh.id, yesPct: impliedYesPct(fresh) });
    });

    // Closed in-flight → refund every shilling that was debited (real balance +
    // the exact bonus allocations, lock-free since we still hold the wallet lock)
    // and reject. No position, txn, ledger entry, or pool change was committed.
    if (closedInFlight) {
      if (realPart > 0) await db.wallet.adjust(wallet.id, { balance: realPart });
      if (bonusAllocations.length > 0) await refundBonusLocked(userId, bonusAllocations);
      audit({
        category: "BET",
        action: "bet.rejected.closed_in_flight",
        actorId: userId,
        targetType: "Market",
        targetId: opts.marketId,
        payload: { side: opts.side, stake: opts.stake, refundedReal: realPart, refundedBonus: bonusPart },
      });
      return { ok: false as const, error: "Selections closed while placing your bet. · Uchaguzi umefungwa.", code: "SELECTION_CLOSED" as const };
    }

    // Committed — persist the position now that the stake is safely in the pool.
    await positionStore.set(position);

    // The real-wallet ledger records only the REAL cash that left `balance`
    // (-realPart). The bonus-funded portion moves on the bonus wallet and is
    // tracked via BonusGrant + bonus audit entries, not here, so balanceAfter
    // stays reconcilable with the running real-balance sum.
    const betTxnId = `txn_${randomId(12)}`;
    await db.txn.create({
      id: betTxnId,
      walletId: wallet.id, userId,
      type: "BET_PLACED", status: "CONFIRMED",
      amount: -realPart, fee: 0, taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: bonusPart > 0
        ? `${opts.side} on "${market.titleEn.slice(0, 50)}" (incl. TZS ${bonusPart.toLocaleString()} bonus)`
        : `${opts.side} on "${market.titleEn.slice(0, 60)}"`,
      positionId: positionId,
      amlReason: null,
      createdAt: placedAt, updatedAt: placedAt, completedAt: placedAt,
    });
    // Dual-write: post stake to double-entry ledger (fire-and-forget).
    postLedgerEntries(`stake_${betTxnId}`, stakeEntries({ txnId: betTxnId, userId, marketId: opts.marketId, realPart, bonusPart })).catch(() => {});

    audit({
      category: "BET",
      action: "market.position.opened",
      actorId: userId,
      targetType: "Position",
      targetId: positionId,
      payload: { marketId: market.id, side: opts.side, stake: opts.stake, payoutIfWin },
    });
    // Inbox receipt — kit-faithful, opens to the market detail.
    notifyBetPlaced(userId, {
      side: opts.side,
      stake: opts.stake,
      payoutIfWin,
      marketTitle: market.titleEn,
      marketId: market.id,
      positionId,
    });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bet placed · ${opts.side} on "${market.titleEn.slice(0, 40)}"`,
      html: betPlacedHtml({ reference: positionId, side: opts.side, stake: opts.stake, payoutIfWin, marketTitle: market.titleEn, placedAt, resolutionDate: market.resolutionAt.slice(0, 10) }),
      tag: "bet-placed",
    })).catch(() => {});

    // Affiliate program — if this player was referred, accrue the referrer's
    // commission on this stake and fire the first-bet milestone prize. The
    // basis is the operator's commission on the stake; the referral cut is a
    // configured share of that. Best-effort; never blocks the bet.
    try {
      await onRecruitBet(userId, { stake: opts.stake, operatorCommissionRate: stakeCfg.commissionRate });
    } catch (err) {
      audit({ category: "SYSTEM", action: "affiliate.accrual_error", actorId: userId, targetType: "Position", targetId: positionId, payload: { error: String(err) } });
    }

    // Wagering accrues on the FULL stake (turnover) INSIDE this wallet lock, so
    // spend + wagering + any fulfilment are one atomic unit (no race with a
    // concurrent second bet on the same wallet). Turnover from this bet is
    // reversed if the bet is later refunded (see reverseWagering in the void
    // paths) — that's what prevents bonus from clearing to cash with no risk.
    // Best-effort: a wagering hiccup must never fail a placed bet.
    try {
      const wr = await recordWageringLocked(userId, opts.stake);
      wageringFulfilled = wr.fulfilled;
    } catch (err) {
      // Never block a placed bet — but DON'T fail silently: a lost turnover
      // accrual stalls bonus clearing, so leave a trace (mirrors the affiliate
      // accrual_error handling above).
      audit({ category: "SYSTEM", action: "bonus.wagering_error", actorId: userId, targetType: "Position", targetId: positionId, payload: { stake: opts.stake, error: String((err as Error)?.message ?? err) } });
    }

    return { ok: true as const, data: { positionId, balance: newBalance, payoutIfWin } };
  });

  // Dual-channel on the bet-placement fulfilment path too (matches recordWagering).
  for (const g of wageringFulfilled) {
    notifyBonusFulfilled(userId, { amountTzs: g.amountTzs }).catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bonus unlocked · TZS ${Math.round(g.amountTzs).toLocaleString("en-US")}`,
      html: bonusFulfilledHtml({ amountTzs: g.amountTzs }),
      tag: "bonus",
    })).catch(() => {});
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
      cur.objectionsClosedAt = new Date(now + 24 * 3600_000).toISOString();
      cur.resolvedOutcome = outcome;
      cur.status = "RESOLVED";
      cur.updatedAt = cur.resolutionStage2At;
      await marketStore.set(cur);
      recordSnapshot(cur.id, cur.yesPool, cur.noPool);

      let winnersPaid = 0;
      const settleCfg = await getEffectiveConfig(cur.id);

      const winningPool = outcome === "YES" ? cur.yesPool : cur.noPool;
      const myPositions = (await listPositionsForMarket(cur.id)).filter((p) => p.status === "OPEN");
      for (const p of myPositions) {
        const w = await db.wallet.findByUserId(p.userId);
        if (!w) continue;
        if (p.side === outcome) {
          const payout = settledPayoutWhole(
            { yesPool: cur.yesPool, noPool: cur.noPool, side: p.side, stake: p.stake },
            settleCfg,
          );
          const updated = await db.wallet.adjust(w.id, { balance: payout });
          const newBal = updated?.balance ?? w.balance + payout;
          p.status = "WIN"; p.finalPayout = payout; p.settledAt = cur.resolutionStage2At!;
          await positionStore.set(p);
          const demoPayoutTxnId = `txn_${randomId(12)}`;
          await db.txn.create({
            id: demoPayoutTxnId,
            walletId: w.id, userId: p.userId,
            type: "BET_PAYOUT", status: "CONFIRMED",
            amount: payout, fee: 0, taxWithheld: 0,
            balanceAfter: newBal, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `${outcome} won · "${cur.titleEn.slice(0, 60)}" (auto)`,
            positionId: p.id,
            amlReason: null,
            createdAt: cur.resolutionStage2At!, updatedAt: cur.resolutionStage2At!, completedAt: cur.resolutionStage2At!,
          });
          // Dual-write: settlement payout to double-entry ledger (fire-and-forget).
          const grossPool = cur.yesPool + cur.noPool;
          postLedgerEntries(`settle_${demoPayoutTxnId}`, settlementPayoutEntries({
            groupId: `settle_${demoPayoutTxnId}`, userId: p.userId, marketId: cur.id,
            payout, stake: p.stake, grossPool, winningPool,
            rates: { taxRate: settleCfg.taxRate, commissionRate: settleCfg.commissionRate, reserveRate: settleCfg.reserveRate, aggregatorRate: settleCfg.aggregatorRate, traTaxOnCommissionRate: settleCfg.traTaxOnCommissionRate, gbtLevyOnCommissionRate: settleCfg.gbtLevyOnCommissionRate },
          })).catch(() => {});
          winnersPaid += payout;
          // Tamper-evident chain entry for the credit (the txn row is the ledger;
          // this puts the payout in the HMAC audit chain a regulator walks).
          audit({ category: "WALLET", action: "bet.payout", actorId: p.userId, targetType: "Position", targetId: p.id, payload: { marketId: cur.id, outcome, payout, balanceAfter: newBal, auto: true } });
          notifyWin(p.userId, payout, `${cur.titleEn} · ${p.id}`, "/positions");
          sendEmailToUser(p.userId, (email) => ({
            to: email,
            subject: `You won · TZS ${Math.round(payout).toLocaleString("en-US")}`,
            html: winNotificationHtml({ reference: p.id, payout, stake: p.stake, marketTitle: cur.titleEn, settledAt: cur.resolutionStage2At ?? undefined }),
            tag: "win",
          })).catch(() => {});
        } else {
          p.status = "LOSS"; p.finalPayout = 0; p.settledAt = cur.resolutionStage2At!;
          await positionStore.set(p);
          notifyLoss(p.userId, { stake: p.stake, marketTitle: cur.titleEn, marketId: cur.id, positionId: p.id });
          sendEmailToUser(p.userId, (email) => ({
            to: email,
            subject: `Bet lost · TZS ${Math.round(p.stake).toLocaleString("en-US")}`,
            html: lossNotificationHtml({ reference: p.id, stake: p.stake, marketTitle: cur.titleEn, settledAt: cur.resolutionStage2At ?? undefined }),
            tag: "loss",
          })).catch(() => {});
        }
      }
      audit({
        category: "ADMIN",
        action: "market.resolved.demo_auto",
        actorId: "system_demo_auto",
        targetType: "Market",
        targetId: cur.id,
        payload: {
          outcome,
          yesPool: cur.yesPool, noPool: cur.noPool,
          payoutModel: "whole-pool",
          winningPool,
          winnersPaid,
          reason: "Demo market countdown elapsed; no human officer required for synthetic markets",
        },
      });
      return true;
    });
    if (didResolve) resolved++;
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
      await marketStore.set({ ...cur, selectionClosedNotifiedAt: new Date().toISOString() });
      return true;
    });
    if (!stamped) continue;
    notified++;

    // One notification per distinct bettor with an OPEN position (someone may
    // hold both YES and NO — they still get a single "selection closed" note).
    const open = (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN");
    const bettors = Array.from(new Set(open.map((p) => p.userId)));
    for (const userId of bettors) {
      bettorsNotified++;
      notifySelectionClosed(userId, { marketTitle: m.titleEn, marketId: m.id }).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: `Selections closed — waiting for results · ${m.titleEn.slice(0, 50)}`,
        html: selectionClosedHtml({ marketTitle: m.titleEn, closedAt: m.selectionClosedAt ?? m.resolutionAt, resolvesAt: m.resolutionAt, marketId: m.id }),
        tag: "selection-closed",
      })).catch(() => {});
    }
  }
  return { notified, bettors: bettorsNotified };
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

  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role));
  for (const m of due) {
    const stamped = await withLock(`market:${m.id}`, async () => {
      const cur = await marketStore.get(m.id);
      // Re-check inside the lock so two concurrent sweeps can't both alert.
      if (!cur || cur.status !== "LIVE" || cur.resolutionNotifiedAt || Date.parse(cur.resolutionAt) > now) return false;
      await marketStore.set({ ...cur, resolutionNotifiedAt: new Date().toISOString() });
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

/** Two-officer resolution. First call stages, second call (different officer) settles. */
/** Default early-cash-out commission, if no config value is present. The live
 *  rate is `RateConfig.cashOutFeeRate` (admin-tunable at /admin/config) — this
 *  constant is only the cold-start fallback. Per management spec (license
 *  review · 2026-05): 9% of the projected cash-out is withheld to the house. */
export const CASHOUT_SLIPPAGE = 0.09;

/**
 * Early cash-out value of an OPEN position.
 *
 * Management model (2026-06): closing a position before the market resolves
 * simply RETURNS THE PLAYER'S OWN STAKE minus the admin-configured cash-out
 * commission (`cashOutFeeRate`, default 9%). No winnings are paid on an early
 * exit — that would let a player ratchet profit out of the pool without taking
 * resolution risk. Profit is only possible by HOLDING to settlement (normal
 * pari-mutuel rates apply there, untouched by this fee).
 *
 * Conservation: exactly the stake leaves the player's own pool side — `value`
 * goes to the player, `fee` (stake − value) is booked to the house reserve.
 * The `market` pools are not needed for the amount (kept in the signature so
 * the call sites that pass them are unchanged).
 *
 * Returns: value (net to player), gross (= the stake removed from the pool),
 * fee (the house commission), feeRate, ratio.
 */
const GRACE_PERIOD_MS = 5 * 60_000; // 5 minutes

export async function cashOutValue(
  position: Pick<StoredPosition, "side" | "stake" | "placedAt">,
  market: Pick<StoredMarket, "id" | "yesPool" | "noPool" | "resolutionAt">,
): Promise<{ value: number; ratio: number; gross: number; fee: number; feeRate: number; inGracePeriod: boolean }> {
  const cfg = await getEffectiveConfig(market.id);
  // Grace period only applies if: bet was placed < 5 min ago AND the market
  // still has more than 5 min before it closes (prevents last-second abuse).
  const marketClosesIn = Date.parse(market.resolutionAt) - Date.now();
  const inGracePeriod = Boolean(position.placedAt)
    && (Date.now() - Date.parse(position.placedAt) < GRACE_PERIOD_MS)
    && (marketClosesIn > GRACE_PERIOD_MS);
  const feeRate = inGracePeriod ? 0 : Math.min(0.30, Math.max(0, cfg.cashOutFeeRate ?? CASHOUT_SLIPPAGE));
  const gross = Math.max(0, Math.round(position.stake)); // the player's money in the pool
  const value = inGracePeriod ? gross : Math.round(gross * (1 - feeRate)); // full refund in grace
  const cashOutFee = Math.max(0, gross - value);          // our commission (0 in grace)
  const ratio = gross > 0 ? value / gross : 0;
  return { value, ratio, gross, fee: cashOutFee, feeRate, inGracePeriod };
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
    // Allow cash-out on LIVE and CLOSED (sentinel-closed) markets. Players
    // shouldn't be trapped in positions just because the sentinel detected an
    // early outcome. Only block cash-out once the market is actually RESOLVED/VOIDED.
    if (m.status === "RESOLVED" || m.status === "VOIDED") return { ok: false as const, error: "Market has been settled — position is final.", code: "INVALID" as const };

    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };

    const { value, gross, fee: cashOutFee, feeRate, inGracePeriod } = await cashOutValue(p, m);
    if (value <= 0) {
      return { ok: false as const, error: "Current cash-out value is zero — your side has no live pool.", code: "INVALID" as const };
    }

    const now = new Date().toISOString();

    // Conservation: the pool drops by exactly `value` (what the player receives).
    // The fee (`cashOutFee` = gross − value) is NOT removed from the pool — it
    // stays distributed across remaining participants, giving them a marginally
    // better payout at resolution. This keeps the system perfectly conserved:
    // every TZS that ever entered the pool is either paid out at resolution,
    // returned to a cashing-out player, or left in the pool for remaining bettors.
    // (With no house reserve, the fee must stay in the pool; removing gross would
    // destroy it — nothing outside the pool to absorb it.)
    const ownYes = p.side === "YES";
    let ownDebit = Math.min(ownYes ? m.yesPool : m.noPool, Math.min(value, p.stake));
    let oppDebit = Math.min(ownYes ? m.noPool : m.yesPool, Math.max(0, value - ownDebit));
    let residual = value - ownDebit - oppDebit;
    if (residual > 0) {
      // Residual sweep: if `value` > own pool (edge case: concurrent cashouts
      // drained the own side), pull remainder from opposite side.
      const ownRoom = (ownYes ? m.yesPool : m.noPool) - ownDebit;
      const addOwn = Math.min(ownRoom, residual);
      ownDebit += addOwn; residual -= addOwn;
      const oppRoom = (ownYes ? m.noPool : m.yesPool) - oppDebit;
      oppDebit += Math.min(oppRoom, residual);
    }
    if (ownYes) { m.yesPool = Math.max(0, m.yesPool - ownDebit); m.noPool = Math.max(0, m.noPool - oppDebit); }
    else        { m.noPool  = Math.max(0, m.noPool  - ownDebit); m.yesPool = Math.max(0, m.yesPool - oppDebit); }
    m.updatedAt = now;
    await marketStore.set(m);
    recordSnapshot(m.id, m.yesPool, m.noPool);
    // SSE: push updated odds after cash-out changes the pool
    emit("market:odds", { marketId: m.id, yesPct: impliedYesPct(m) });

    // Mark the position closed.
    p.status = "CASHED_OUT";
    p.finalPayout = value;
    p.settledAt = now;
    await positionStore.set(p);

    // Credit wallet + record the txn (atomic +delta on the live row).
    const credited = await db.wallet.adjust(wallet.id, { balance: value });
    const newBalance = credited?.balance ?? wallet.balance + value;
    const cashoutTxnId = `txn_${randomId(12)}`;
    await db.txn.create({
      id: cashoutTxnId,
      walletId: wallet.id, userId,
      type: "CASHOUT",
      status: "CONFIRMED",
      amount: value, fee: cashOutFee, taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Cashed out · "${m.titleEn.slice(0, 60)}"`,
      positionId: p.id,
      amlReason: null,
      createdAt: now, updatedAt: now, completedAt: now,
    });
    // Dual-write: cashout to double-entry ledger (fire-and-forget).
    postLedgerEntries(`cashout_${cashoutTxnId}`, cashoutEntries({ txnId: cashoutTxnId, userId, marketId: m.id, value, fee: cashOutFee })).catch(() => {});

    notifyCashout(userId, { amount: value, marketTitle: m.titleEn, marketId: m.id, inGracePeriod, positionId });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Position sold · TZS ${Math.round(value).toLocaleString("en-US")}`,
      html: cashOutReceiptHtml({ reference: p.id, value, stake: p.stake, marketTitle: m.titleEn, soldAt: now, gracePeriod: inGracePeriod }),
      tag: "cashout",
    })).catch(() => {});

    audit({
      category: "BET",
      action: "market.position.cashed_out",
      actorId: userId,
      targetType: "Position",
      targetId: p.id,
      payload: {
        marketId: m.id, side: p.side, stake: p.stake, value,
        gross, cashOutFee, feeRate,
        yesPoolAfter: m.yesPool, noPoolAfter: m.noPool,
      },
    });

    return { ok: true as const, data: { value, balance: newBalance } };
    });
  });
}

export async function resolveMarket(opts: { marketId: string; outcome: Side | "VOID"; officerId: string; evidence?: string }): Promise<ServiceResult<{ stage: "stage1" | "complete"; winnersPaid?: number }>> {
  // ADM2 ceremony — the officer's declared evidence excerpt (the source quote
  // that justifies the verdict). Recorded into the immutable audit payload at
  // each attestation so the fairness story is provable; capped defensively.
  const evidence = (opts.evidence ?? "").trim().slice(0, 2000) || null;
  // TESTING override (default OFF): when an admin enables it on the resolver
  // queue, a single officer may resolve a market end-to-end even if they hold a
  // position in it — so a tester acting as admin + player can settle a market
  // alone and have their own position pay out normally. It relaxes BOTH the
  // position-conflict block (below) AND the "second officer must differ" gate
  // (stage-2). Every bypass is written to the COMPLIANCE trail; production
  // behaviour is unchanged while the flag is OFF.
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

  // Bonus portions of refunded bets are returned to the bonus wallet AFTER the
  // market lock releases — refundBonusToActive takes the wallet lock, and taking
  // it while holding the market lock would invert buyPosition's wallet→market
  // order and could deadlock. Collected here, applied below.
  const pendingBonusRefunds: Array<{ userId: string; amount: number }> = [];
  // Every refunded bet's turnover must be reversed (it was never risked) so a
  // refunded bonus/real bet can't clear wagering to cash for free.
  const pendingWagerReversals: Array<{ userId: string; stake: number }> = [];
  const result = await withLock(`market:${opts.marketId}`, async (): Promise<ServiceResult<{ stage: "stage1" | "complete"; winnersPaid?: number }>> => {
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
    m.status = "CLOSED";
    m.updatedAt = m.resolutionStage1At;
    await marketStore.set(m);
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
  // Stage 2 — settle
  m.resolutionStage2By = opts.officerId;
  m.resolutionStage2At = new Date().toISOString();
  m.objectionsClosedAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  m.status = opts.outcome === "VOID" ? "VOIDED" : "RESOLVED";
  m.updatedAt = m.resolutionStage2At;
  await marketStore.set(m);
  // Snapshot at the moment of resolution — final point on the chart.
  recordSnapshot(m.id, m.yesPool, m.noPool);
  // SSE: broadcast resolution to all connected clients
  emit("market:resolve", { marketId: m.id, outcome: opts.outcome });

  let winnersPaid = 0;
  const settleCfg = await getEffectiveConfig(m.id);
  const grossPool = m.yesPool + m.noPool;
  const winningPool = opts.outcome === "YES" ? m.yesPool : opts.outcome === "NO" ? m.noPool : 0;

  // Settle only OPEN positions. A CASHED_OUT (or otherwise already-settled)
  // position has already paid out and had its stake removed from the pool —
  // re-settling it here would double-credit the player.
  const myPositions = (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN");

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
      let balanceAfter = w.balance;
      if (realPart > 0) {
        const updated = await db.wallet.adjust(w.id, { balance: realPart });
        balanceAfter = updated?.balance ?? w.balance + realPart;
      }
      p.status = "VOID"; p.finalPayout = p.stake; p.settledAt = m.resolutionStage2At!;
      await positionStore.set(p);
      pendingWagerReversals.push({ userId: p.userId, stake: p.stake });
      if (bonusPart > 0) pendingBonusRefunds.push({ userId: p.userId, amount: bonusPart });
      if (realPart > 0 || bonusPart > 0) {
        const oneSidedTxnId = `txn_${randomId(12)}`;
        if (realPart > 0) await db.txn.create({
          id: oneSidedTxnId,
          walletId: w.id, userId: p.userId,
          type: "BET_REFUND", status: "CONFIRMED",
          amount: realPart, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `One-sided refund · "${m.titleEn.slice(0, 60)}"`,
          positionId: p.id,
          amlReason: null,
          createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
        });
        // Dual-write: one-sided refund to double-entry ledger (fire-and-forget).
        postLedgerEntries(`refund_${oneSidedTxnId}`, refundEntries({ txnId: oneSidedTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart })).catch(() => {});
      }
      notifyOneSidedRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id, positionId: p.id });
      sendEmailToUser(p.userId, (email) => ({
        to: email,
        subject: `Full refund · TZS ${Math.round(p.stake).toLocaleString("en-US")} returned`,
        html: oneSidedRefundHtml({ reference: p.id, stake: p.stake, marketTitle: m.titleEn, settledAt: m.resolutionStage2At ?? undefined }),
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
    return { ok: true, data: { stage: "complete", winnersPaid: 0 } };
  }

  if (opts.outcome === "VOID") {
    // Refund everyone
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      const bonusPart = p.bonusStakeTzs ?? 0;
      const realPart = p.stake - bonusPart;
      let balanceAfter = w.balance;
      if (realPart > 0) {
        const updated = await db.wallet.adjust(w.id, { balance: realPart });
        balanceAfter = updated?.balance ?? w.balance + realPart;
      }
      p.status = "VOID";
      p.finalPayout = p.stake;
      p.settledAt = m.resolutionStage2At!;
      await positionStore.set(p);
      pendingWagerReversals.push({ userId: p.userId, stake: p.stake });
      if (bonusPart > 0) pendingBonusRefunds.push({ userId: p.userId, amount: bonusPart });
      if (realPart > 0 || bonusPart > 0) {
        const refundTxnId = `txn_${randomId(12)}`;
        if (realPart > 0) await db.txn.create({
          id: refundTxnId,
          walletId: w.id, userId: p.userId,
          type: "BET_REFUND", status: "CONFIRMED",
          amount: realPart, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `Refund · "${m.titleEn.slice(0, 60)}" voided`,
          positionId: p.id,
          amlReason: null,
          createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
        });
        // Dual-write: refund to double-entry ledger (fire-and-forget).
        postLedgerEntries(`refund_${refundTxnId}`, refundEntries({ txnId: refundTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart })).catch(() => {});
      }
      notifyRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });
    }
  } else {
    // Whole-pool pari-mutuel distribution.
    //   netPool = grossPool × (1 - totalFee)
    //   payout  = (stake / winningSidePool) × netPool
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      if (p.side === opts.outcome) {
        const payout = settledPayoutWhole(
          { yesPool: m.yesPool, noPool: m.noPool, side: p.side, stake: p.stake },
          settleCfg,
        );
        const updated = await db.wallet.adjust(w.id, { balance: payout });
        const balanceAfter = updated?.balance ?? w.balance + payout;
        p.status = "WIN"; p.finalPayout = payout; p.settledAt = m.resolutionStage2At!;
        await positionStore.set(p);
        const payoutTxnId = `txn_${randomId(12)}`;
        await db.txn.create({
          id: payoutTxnId,
          walletId: w.id, userId: p.userId,
          type: "BET_PAYOUT", status: "CONFIRMED",
          amount: payout, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `${opts.outcome} won · "${m.titleEn.slice(0, 60)}"`,
          positionId: p.id,
          amlReason: null,
          createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
        });
        // Dual-write: settlement payout to double-entry ledger (fire-and-forget).
        postLedgerEntries(`settle_${payoutTxnId}`, settlementPayoutEntries({
          groupId: `settle_${payoutTxnId}`, userId: p.userId, marketId: m.id,
          payout, stake: p.stake, grossPool: m.yesPool + m.noPool, winningPool,
          rates: { taxRate: settleCfg.taxRate, commissionRate: settleCfg.commissionRate, reserveRate: settleCfg.reserveRate, aggregatorRate: settleCfg.aggregatorRate, traTaxOnCommissionRate: settleCfg.traTaxOnCommissionRate, gbtLevyOnCommissionRate: settleCfg.gbtLevyOnCommissionRate },
        })).catch(() => {});
        winnersPaid += payout;
        // Tamper-evident chain entry for the payout credit (txn row is the
        // ledger; this anchors it in the HMAC audit chain too).
        audit({ category: "WALLET", action: "bet.payout", actorId: p.userId, targetType: "Position", targetId: p.id, payload: { marketId: m.id, outcome: opts.outcome, payout, balanceAfter } });
        // Win receipt — opens the position so they can see the payout.
        notifyWin(p.userId, payout, `${m.titleEn} · ${p.id}`, "/positions");
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `You won · TZS ${Math.round(payout).toLocaleString("en-US")}`,
          html: winNotificationHtml({ reference: p.id, payout, stake: p.stake, marketTitle: m.titleEn, settledAt: m.resolutionStage2At ?? undefined }),
          tag: "win",
        })).catch(() => {});
      } else {
        p.status = "LOSS"; p.finalPayout = 0; p.settledAt = m.resolutionStage2At!;
        await positionStore.set(p);
        // Loss receipt — kit copy reframes loss as "pool grew".
        notifyLoss(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id, positionId: p.id });
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `Bet lost · TZS ${Math.round(p.stake).toLocaleString("en-US")}`,
          html: lossNotificationHtml({ reference: p.id, stake: p.stake, marketTitle: m.titleEn, settledAt: m.resolutionStage2At ?? undefined }),
          tag: "loss",
        })).catch(() => {});
      }
    }
  }
  audit({
    category: "ADMIN",
    action: "market.resolved",
    actorId: opts.officerId,
    targetType: "Market",
    targetId: m.id,
    payload: {
      outcome: opts.outcome,
      yesPool: m.yesPool, noPool: m.noPool,
      payoutModel: "whole-pool",
      taxRate: settleCfg.taxRate,
      commissionRate: settleCfg.commissionRate,
      reserveRate: settleCfg.reserveRate,
      aggregatorRate: settleCfg.aggregatorRate,
      grossPool: m.yesPool + m.noPool,
      netPool: Math.round((m.yesPool + m.noPool) * (1 - settleCfg.taxRate - settleCfg.commissionRate - settleCfg.reserveRate - settleCfg.aggregatorRate)),
      winningPool,
      winnersPaid,
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

  return { ok: true, data: { stage: "complete", winnersPaid } };
  }); // end withLock market

  // Apply, now the market lock is released (refund helpers take the wallet lock —
  // taking it inside the market lock would invert buyPosition's wallet→market
  // order and could deadlock). Reverse each refunded bet's turnover first, then
  // return the bonus principal to the bonus wallet. Bonus is NEVER converted to
  // real here: if the source grant is gone, the bonus principal is forfeit (it
  // must never become withdrawable cash without meeting the wagering requirement).
  for (const r of pendingWagerReversals) await reverseWagering(r.userId, r.stake);
  for (const r of pendingBonusRefunds) {
    if (r.amount <= 0) continue;
    const { refundedToBonus } = await refundBonusToActive(r.userId, r.amount);
    if (refundedToBonus < r.amount) {
      audit({ category: "WALLET", action: "bonus.refund_forfeited", actorId: r.userId, targetType: "User", targetId: r.userId, payload: { requested: r.amount, refundedToBonus, forfeited: r.amount - refundedToBonus, reason: "no active grant to hold refunded bonus" } });
    }
  }
  return result;
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
    if (m.status === "RESOLVED" || m.status === "VOIDED") {
      return { ok: false as const, error: "Market is already settled — nothing to void.", code: "INVALID" as const };
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
        subject: `Market cancelled — TZS ${Math.round(p.stake).toLocaleString("en-US")} refunded`,
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

    // Confirm to EVERY admin/officer that the cancellation succeeded — in-app +
    // email — so the whole team has an awareness/audit trail (and the acting
    // officer gets a definitive "done" beyond the result modal). Best-effort.
    const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role));
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
