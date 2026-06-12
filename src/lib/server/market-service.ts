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
import { isLockedOut } from "./responsible-gambling";
import { rateCheck } from "./rate-limit";
import { getEffectiveConfig, payoutForWhole, settledPayoutWhole } from "./market-config";
import { recordSnapshot, seedHistory } from "./market-history";
import { notifyBetPlaced, notifyWin, notifyLoss, notifyRefund, notifyCashout } from "./notification-service";
import { sendEmailToUser, betPlacedHtml, winNotificationHtml, lossNotificationHtml, cashOutReceiptHtml } from "./email";
import { onRecruitBet } from "./affiliate-service";
import { seedMarket, settleHousePosition, canSeedNewMarket, getHousePoolSeedForMarket } from "./house-pool";
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
  category: MarketCategory;
  sourceUrl: string;
  resolutionCriterion: string;
  resolutionAt: string;
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
  potentialPayout: number;
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  finalPayout: number | null;
  placedAt: string;
  settledAt: string | null;
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

export type CreateMarketInput = {
  titleEn: string;
  titleSw: string;
  category: MarketCategory;
  sourceUrl: string;
  resolutionCriterion: string;
  resolutionAt: string;
  proposedBy: string;
};

export async function createMarket(input: CreateMarketInput) {
  const now = new Date().toISOString();
  const id = `mkt_${randomId(10)}`;

  // Seed house liquidity — equal on both sides. Returns 0 if reserve
  // is empty or seeding is disabled (seedPerSide = 0).
  const houseSeed = await seedMarket(id);

  const m: StoredMarket = {
    id,
    titleEn: input.titleEn,
    titleSw: input.titleSw,
    category: input.category,
    sourceUrl: input.sourceUrl,
    resolutionCriterion: input.resolutionCriterion,
    resolutionAt: input.resolutionAt,
    status: "LIVE",
    yesPool: houseSeed,
    noPool: houseSeed,
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
    payload: { titleEn: m.titleEn, category: m.category, sourceUrl: m.sourceUrl, resolutionAt: m.resolutionAt, houseSeedPerSide: houseSeed },
  });
  return m;
}

/** Player buys a position on a market. */
export async function buyPosition(userId: string, opts: { marketId: string; side: Side; stake: number }): Promise<ServiceResult<{ positionId: string; balance: number; payoutIfWin: number }>> {
  const rl = rateCheck(userId, "bet.place");
  if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const lockout = await isLockedOut(userId);
  if (lockout.locked) return { ok: false, error: `Locked until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };

  // Account-level status check — a suspended or closed user must not
  // be able to place bets even if their wallet is still nominally
  // ACTIVE. This is the "ban hammer" path the admin operator uses
  // when a player is under investigation or has been removed.
  const u = await db.user.findById(userId);
  if (!u) return { ok: false, error: "Account not found.", code: "NOT_FOUND" };
  if (u.status === "SUSPENDED" || u.status === "CLOSED") {
    audit({
      category: "COMPLIANCE",
      action: "bet.account_blocked",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      payload: { status: u.status },
    });
    return { ok: false, error: u.status === "SUSPENDED" ? "Account suspended. Contact support." : "Account closed.", code: "SUSPENDED" };
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
  if (Date.parse(market.resolutionAt) <= Date.now()) return { ok: false, error: "Market has closed.", code: "INVALID" };

  return withLock(`wallet:${userId}`, async () => {
    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet || wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet unavailable.", code: "NOT_FOUND" as const };
    if (wallet.balance < opts.stake) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };

    const newBalance = wallet.balance - opts.stake;
    await db.wallet.update(wallet.id, { balance: newBalance });

    const payoutIfWin = await projectedPayout(market, opts.side, opts.stake);
    const positionId = `pos_${randomId(10)}`;
    const placedAt = new Date().toISOString();
    const position: StoredPosition = {
      id: positionId,
      userId,
      marketId: opts.marketId,
      side: opts.side,
      stake: opts.stake,
      potentialPayout: payoutIfWin,
      status: "OPEN",
      finalPayout: null,
      placedAt,
      settledAt: null,
    };
    await positionStore.set(position);

    // Pool mutation must be serialized PER-MARKET, not per-wallet: two
    // different users betting the same market hold different `wallet:` locks,
    // so without this they read-modify-write the same pool concurrently and
    // one stake gets dropped from the pool (breaks payout conservation —
    // winners would later share a pool that's missing money). Re-read inside
    // the market lock so the += applies to the freshest pool values. Lock
    // order is always wallet→market (here and in cashOut), never the reverse,
    // so this nesting cannot deadlock.
    await withLock(`market:${opts.marketId}`, async () => {
      const fresh = await marketStore.get(opts.marketId);
      if (!fresh) return;
      if (opts.side === "YES") fresh.yesPool += opts.stake;
      else                     fresh.noPool  += opts.stake;
      fresh.predictorCount += 1;
      fresh.updatedAt = placedAt;
      await marketStore.set(fresh);
      // Snapshot the new pool for the per-market history chart.
      recordSnapshot(fresh.id, fresh.yesPool, fresh.noPool);
    });

    await db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id, userId,
      type: "BET_PLACED", status: "CONFIRMED",
      amount: -opts.stake, fee: 0, taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `${opts.side} on "${market.titleEn.slice(0, 60)}"`,
      betId: positionId,
      amlReason: null,
      createdAt: placedAt, updatedAt: placedAt, completedAt: placedAt,
    });

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
    });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Bet placed · ${opts.side} on "${market.titleEn.slice(0, 40)}"`,
      html: betPlacedHtml({ side: opts.side, stake: opts.stake, marketTitle: market.titleEn, resolutionDate: market.resolutionAt.slice(0, 10) }),
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

    return { ok: true as const, data: { positionId, balance: newBalance, payoutIfWin } };
  });
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

      // Settle house virtual position for this demo market
      const demoHouseSettle = await settleHousePosition(
        cur.id, outcome, cur.yesPool + cur.noPool, settleCfg.reserveRate,
      );

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
          const newBal = w.balance + payout;
          await db.wallet.update(w.id, { balance: newBal });
          p.status = "WIN"; p.finalPayout = payout; p.settledAt = cur.resolutionStage2At!;
          await positionStore.set(p);
          await db.txn.create({
            id: `txn_${randomId(12)}`,
            walletId: w.id, userId: p.userId,
            type: "BET_PAYOUT", status: "CONFIRMED",
            amount: payout, fee: 0, taxWithheld: 0,
            balanceAfter: newBal, currency: "TZS",
            provider: "INTERNAL", providerRef: null, msisdn: null,
            description: `${outcome} won · "${cur.titleEn.slice(0, 60)}" (auto)`,
            betId: p.id,
            amlReason: null,
            createdAt: cur.resolutionStage2At!, updatedAt: cur.resolutionStage2At!, completedAt: cur.resolutionStage2At!,
          });
          winnersPaid += payout;
          notifyWin(p.userId, payout, cur.titleEn, "/positions");
          sendEmailToUser(p.userId, (email) => ({
            to: email,
            subject: `You won · TZS ${Math.round(payout).toLocaleString("en-US")}`,
            html: winNotificationHtml({ payout, stake: p.stake, marketTitle: cur.titleEn }),
            tag: "win",
          })).catch(() => {});
        } else {
          p.status = "LOSS"; p.finalPayout = 0; p.settledAt = cur.resolutionStage2At!;
          await positionStore.set(p);
          notifyLoss(p.userId, { stake: p.stake, marketTitle: cur.titleEn, marketId: cur.id });
          sendEmailToUser(p.userId, (email) => ({
            to: email,
            subject: `Bet lost · TZS ${Math.round(p.stake).toLocaleString("en-US")}`,
            html: lossNotificationHtml({ stake: p.stake, marketTitle: cur.titleEn }),
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
          housePool: { returnedToReserve: demoHouseSettle.returnedToReserve, reserveFee: demoHouseSettle.reserveFee, lossAbsorbed: demoHouseSettle.lossAbsorbed },
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
    // Orphaned — refund the stake to the wallet, mark VOID, audit.
    const w = await db.wallet.findByUserId(p.userId);
    if (!w) continue;
    const newBal = w.balance + p.stake;
    await db.wallet.update(w.id, { balance: newBal });
    p.status = "VOID";
    p.finalPayout = p.stake;
    p.settledAt = new Date().toISOString();
    await positionStore.set(p);
    await db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: w.id, userId: p.userId,
      type: "BET_REFUND", status: "CONFIRMED",
      amount: p.stake, fee: 0, taxWithheld: 0,
      balanceAfter: newBal, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Refund · orphaned position (market record missing)`,
      betId: p.id,
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
/** Slippage applied to a cash-out — a regulator-aligned 9% deduction so a
 *  cancellation never beats holding to settlement. Per management spec
 *  (license review · 2026-05): 9% of the projected cash-out is withheld. */
export const CASHOUT_SLIPPAGE = 0.09;

/**
 * Compute the current cash-out value of an OPEN position assuming the market
 * resolved on the side the user is on RIGHT NOW. Applies slippage on top of
 * tax + commission so cashing out is always slightly worse than letting it
 * settle (otherwise cash-out becomes a free ratchet).
 *
 * Caller passes the live market pools; we use the same whole-pool formula
 * that the resolver uses, then knock CASHOUT_SLIPPAGE off the gross.
 */
export async function cashOutValue(
  position: Pick<StoredPosition, "side" | "stake">,
  market: Pick<StoredMarket, "id" | "yesPool" | "noPool">,
): Promise<{ value: number; ratio: number; gross: number }> {
  const cfg = await getEffectiveConfig(market.id);
  const winningPool = position.side === "YES" ? market.yesPool : market.noPool;
  if (winningPool <= 0) return { value: 0, ratio: 0, gross: 0 };
  const grossPool = market.yesPool + market.noPool;
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate + cfg.reserveRate + cfg.aggregatorRate));
  const netPool = grossPool * (1 - fee);
  const wouldPay = (position.stake / winningPool) * netPool;
  const gross = Math.round(wouldPay);
  const value = Math.round(wouldPay * (1 - CASHOUT_SLIPPAGE));
  const ratio = position.stake > 0 ? value / position.stake : 0;
  return { value, ratio, gross };
}

export async function cashOutPosition(
  userId: string,
  positionId: string,
): Promise<ServiceResult<{ value: number; balance: number }>> {
  // Cheap pre-lock fast-fail (avoids taking the lock for obviously-bad calls).
  const pre = await positionStore.get(positionId);
  if (!pre) return { ok: false, error: "Position not found.", code: "NOT_FOUND" };
  if (pre.userId !== userId) return { ok: false, error: "Not your position.", code: "INVALID" };

  return withLock(`wallet:${userId}`, async () => {
    // Re-fetch under the lock: a concurrent resolveMarket may have settled this
    // position (and credited the wallet) at an await point between the pre-lock
    // read above and acquiring the lock. Validating the live state here is what
    // prevents a double-settle / double-credit.
    const p = await positionStore.get(positionId);
    if (!p) return { ok: false as const, error: "Position not found.", code: "NOT_FOUND" as const };
    if (p.userId !== userId) return { ok: false as const, error: "Not your position.", code: "INVALID" as const };
    if (p.status !== "OPEN") return { ok: false as const, error: "Position is no longer open.", code: "INVALID" as const };

    const m = await marketStore.get(p.marketId);
    if (!m) return { ok: false as const, error: "Market not found.", code: "NOT_FOUND" as const };
    if (m.status !== "LIVE") return { ok: false as const, error: "Cash-out only available while the market is LIVE.", code: "INVALID" as const };

    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };

    const { value, gross } = await cashOutValue(p, m);
    if (value <= 0) {
      return { ok: false as const, error: "Current cash-out value is zero — your side has no live pool.", code: "INVALID" as const };
    }

    const now = new Date().toISOString();

    // Conservation: the pools must drop by exactly `value` — the amount credited
    // to the wallet — so cashing out can never MINT money. (The old code removed
    // only `p.stake`, leaving the winnings-portion in the opposing pool to be
    // paid out a second time → a money leak in the player's favour.)
    // Economic split: the stake returns from the player's OWN pool; any winnings
    // (value − stake) come from the OPPOSING pool — the losing side funds the
    // winning side. Clamp so neither pool goes negative, then sweep any rounding
    // residual from whichever pool still has room so the total removed === value.
    // cashOutValue caps value ≤ grossPool, so the two pools can always cover it.
    const ownYes = p.side === "YES";
    let ownDebit = Math.min(ownYes ? m.yesPool : m.noPool, Math.min(value, p.stake));
    let oppDebit = Math.min(ownYes ? m.noPool : m.yesPool, Math.max(0, value - ownDebit));
    let residual = value - ownDebit - oppDebit;
    if (residual > 0) {
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

    // Mark the position closed.
    p.status = "CASHED_OUT";
    p.finalPayout = value;
    p.settledAt = now;
    await positionStore.set(p);

    // Credit wallet + record the txn.
    const newBalance = wallet.balance + value;
    await db.wallet.update(wallet.id, { balance: newBalance });
    await db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id, userId,
      type: "CASHOUT",
      status: "CONFIRMED",
      amount: value, fee: Math.max(0, gross - value), taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Cashed out · "${m.titleEn.slice(0, 60)}"`,
      betId: p.id,
      amlReason: null,
      createdAt: now, updatedAt: now, completedAt: now,
    });

    notifyCashout(userId, { amount: value, marketTitle: m.titleEn, marketId: m.id });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Position sold · TZS ${Math.round(value).toLocaleString("en-US")}`,
      html: cashOutReceiptHtml({ value, stake: p.stake, marketTitle: m.titleEn }),
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
        slippage: CASHOUT_SLIPPAGE,
        yesPoolAfter: m.yesPool, noPoolAfter: m.noPool,
      },
    });

    return { ok: true as const, data: { value, balance: newBalance } };
  });
}

export async function resolveMarket(opts: { marketId: string; outcome: Side | "VOID"; officerId: string }): Promise<ServiceResult<{ stage: "stage1" | "complete"; winnersPaid?: number }>> {
  return withLock(`market:${opts.marketId}`, async () => {
  const m = await marketStore.get(opts.marketId);
  if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (m.status === "RESOLVED" || m.status === "VOIDED") return { ok: false, error: "Market already resolved.", code: "INVALID" };

  if (!m.resolutionStage1By) {
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
      payload: { outcome: opts.outcome },
    });
    return { ok: true, data: { stage: "stage1" } };
  }
  if (m.resolutionStage1By === opts.officerId) {
    return { ok: false, error: "Second-officer must be a different reviewer.", code: "INVALID" };
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

  let winnersPaid = 0;
  const settleCfg = await getEffectiveConfig(m.id);
  const grossPool = m.yesPool + m.noPool;
  const winningPool = opts.outcome === "YES" ? m.yesPool : opts.outcome === "NO" ? m.noPool : 0;

  // Settle the house's virtual position — runs for both VOID and real outcomes.
  const houseSettle = await settleHousePosition(
    m.id,
    opts.outcome === "VOID" ? "VOID" : opts.outcome,
    grossPool,
    settleCfg.reserveRate,
  );

  // Settle only OPEN positions. A CASHED_OUT (or otherwise already-settled)
  // position has already paid out and had its stake removed from the pool —
  // re-settling it here would double-credit the player.
  const myPositions = (await listPositionsForMarket(m.id)).filter((p) => p.status === "OPEN");
  if (opts.outcome === "VOID") {
    // Refund everyone
    for (const p of myPositions) {
      const w = await db.wallet.findByUserId(p.userId);
      if (!w) continue;
      const updated = await db.wallet.update(w.id, { balance: w.balance + p.stake });
      const balanceAfter = updated?.balance ?? w.balance + p.stake;
      p.status = "VOID";
      p.finalPayout = p.stake;
      p.settledAt = m.resolutionStage2At!;
      await positionStore.set(p);
      await db.txn.create({
        id: `txn_${randomId(12)}`,
        walletId: w.id, userId: p.userId,
        type: "BET_REFUND", status: "CONFIRMED",
        amount: p.stake, fee: 0, taxWithheld: 0,
        balanceAfter, currency: "TZS",
        provider: "INTERNAL", providerRef: null, msisdn: null,
        description: `Refund · "${m.titleEn.slice(0, 60)}" voided`,
        betId: p.id,
        amlReason: null,
        createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
      });
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
        const updated = await db.wallet.update(w.id, { balance: w.balance + payout });
        const balanceAfter = updated?.balance ?? w.balance + payout;
        p.status = "WIN"; p.finalPayout = payout; p.settledAt = m.resolutionStage2At!;
        await positionStore.set(p);
        await db.txn.create({
          id: `txn_${randomId(12)}`,
          walletId: w.id, userId: p.userId,
          type: "BET_PAYOUT", status: "CONFIRMED",
          amount: payout, fee: 0, taxWithheld: 0,
          balanceAfter, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `${opts.outcome} won · "${m.titleEn.slice(0, 60)}"`,
          betId: p.id,
          amlReason: null,
          createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
        });
        winnersPaid += payout;
        // Win receipt — opens the position so they can see the payout.
        notifyWin(p.userId, payout, m.titleEn, "/positions");
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `You won · TZS ${Math.round(payout).toLocaleString("en-US")}`,
          html: winNotificationHtml({ payout, stake: p.stake, marketTitle: m.titleEn }),
          tag: "win",
        })).catch(() => {});
      } else {
        p.status = "LOSS"; p.finalPayout = 0; p.settledAt = m.resolutionStage2At!;
        await positionStore.set(p);
        // Loss receipt — kit copy reframes loss as "pool grew".
        notifyLoss(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });
        sendEmailToUser(p.userId, (email) => ({
          to: email,
          subject: `Bet lost · TZS ${Math.round(p.stake).toLocaleString("en-US")}`,
          html: lossNotificationHtml({ stake: p.stake, marketTitle: m.titleEn }),
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
      housePool: { returnedToReserve: houseSettle.returnedToReserve, reserveFee: houseSettle.reserveFee, lossAbsorbed: houseSettle.lossAbsorbed },
      stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
      sourceUrl: m.sourceUrl,
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
  repairOrphanedPositions().catch(() => {});

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
