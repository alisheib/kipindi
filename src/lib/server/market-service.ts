/**
 * Market service — binary YES/NO prediction markets, pari-mutuel pool.
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
import { notifyBetPlaced, notifyWin, notifyLoss } from "./notification-service";
import type { ServiceResult } from "./auth-service";

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

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKETS: Map<string, StoredMarket> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_POSITIONS: Map<string, StoredPosition> | undefined;
}
const markets: Map<string, StoredMarket> = globalThis.__50PICK_MARKETS ?? (globalThis.__50PICK_MARKETS = new Map());
const positions: Map<string, StoredPosition> = globalThis.__50PICK_POSITIONS ?? (globalThis.__50PICK_POSITIONS = new Map());

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
export function projectedPayout(
  m: Pick<StoredMarket, "yesPool" | "noPool"> & { id?: string },
  side: Side,
  stake: number,
): number {
  const cfg = getEffectiveConfig(m.id);
  const r = payoutForWhole({ yesPool: m.yesPool, noPool: m.noPool, side, stake }, cfg);
  return r.payout;
}

export function listMarkets(filter?: { status?: MarketStatus; category?: MarketCategory }): StoredMarket[] {
  return Array.from(markets.values())
    .filter((m) => !filter?.status   || m.status === filter.status)
    .filter((m) => !filter?.category || m.category === filter.category)
    .sort((a, b) => a.resolutionAt.localeCompare(b.resolutionAt));
}

export function getMarket(id: string): StoredMarket | null {
  return markets.get(id) ?? null;
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

export function createMarket(input: CreateMarketInput): StoredMarket {
  const now = new Date().toISOString();
  const m: StoredMarket = {
    id: `mkt_${randomId(10)}`,
    titleEn: input.titleEn,
    titleSw: input.titleSw,
    category: input.category,
    sourceUrl: input.sourceUrl,
    resolutionCriterion: input.resolutionCriterion,
    resolutionAt: input.resolutionAt,
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
  markets.set(m.id, m);
  audit({
    category: "ADMIN",
    action: "market.created",
    actorId: input.proposedBy,
    targetType: "Market",
    targetId: m.id,
    payload: { titleEn: m.titleEn, category: m.category, sourceUrl: m.sourceUrl, resolutionAt: m.resolutionAt },
  });
  return m;
}

/** Player buys a position on a market. */
export async function buyPosition(userId: string, opts: { marketId: string; side: Side; stake: number }): Promise<ServiceResult<{ positionId: string; balance: number; payoutIfWin: number }>> {
  const rl = rateCheck(userId, "bet.place");
  if (!rl.allowed) return { ok: false, error: "Slow down.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const lockout = isLockedOut(userId);
  if (lockout.locked) return { ok: false, error: `Locked until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };

  // Stake bounds come from runtime config — global with optional per-market override.
  const stakeCfg = getEffectiveConfig(opts.marketId);
  if (!Number.isInteger(opts.stake) || opts.stake < stakeCfg.minStake || opts.stake > stakeCfg.maxStake) {
    return { ok: false, error: `Stake must be a whole number between TZS ${stakeCfg.minStake.toLocaleString()} and TZS ${stakeCfg.maxStake.toLocaleString()}.`, code: "INVALID" };
  }
  if (opts.side !== "YES" && opts.side !== "NO") return { ok: false, error: "Invalid side.", code: "INVALID" };

  const market = markets.get(opts.marketId);
  if (!market) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (market.status !== "LIVE") return { ok: false, error: "Market is not accepting predictions.", code: "INVALID" };
  if (Date.parse(market.resolutionAt) <= Date.now()) return { ok: false, error: "Market has closed.", code: "INVALID" };

  return withLock(`wallet:${userId}`, async () => {
    const wallet = db.wallet.findByUserId(userId);
    if (!wallet || wallet.status !== "ACTIVE") return { ok: false as const, error: "Wallet unavailable.", code: "NOT_FOUND" as const };
    if (wallet.balance < opts.stake) return { ok: false as const, error: "Not enough balance.", code: "INVALID" as const };

    const newBalance = wallet.balance - opts.stake;
    db.wallet.update(wallet.id, { balance: newBalance });

    const payoutIfWin = projectedPayout(market, opts.side, opts.stake);
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
    positions.set(positionId, position);

    if (opts.side === "YES") market.yesPool += opts.stake;
    else                     market.noPool  += opts.stake;
    market.predictorCount += 1;
    market.updatedAt = placedAt;
    markets.set(market.id, market);
    // Snapshot the new pool for the per-market history chart.
    recordSnapshot(market.id, market.yesPool, market.noPool);

    db.txn.create({
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
    return { ok: true as const, data: { positionId, balance: newBalance, payoutIfWin } };
  });
}

export function listPositionsForUser(userId: string, limit = 100): StoredPosition[] {
  return Array.from(positions.values())
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, limit);
}

export function listPositionsForMarket(marketId: string): StoredPosition[] {
  return Array.from(positions.values()).filter((p) => p.marketId === marketId);
}

/** Two-officer resolution. First call stages, second call (different officer) settles. */
/** Slippage applied to a cash-out — a small penalty so it never beats holding. */
export const CASHOUT_SLIPPAGE = 0.02;

/**
 * Compute the current cash-out value of an OPEN position assuming the market
 * resolved on the side the user is on RIGHT NOW. Applies slippage on top of
 * tax + commission so cashing out is always slightly worse than letting it
 * settle (otherwise cash-out becomes a free ratchet).
 *
 * Caller passes the live market pools; we use the same whole-pool formula
 * that the resolver uses, then knock CASHOUT_SLIPPAGE off the gross.
 */
export function cashOutValue(
  position: Pick<StoredPosition, "side" | "stake">,
  market: Pick<StoredMarket, "id" | "yesPool" | "noPool">,
): { value: number; ratio: number } {
  const cfg = getEffectiveConfig(market.id);
  const winningPool = position.side === "YES" ? market.yesPool : market.noPool;
  if (winningPool <= 0) return { value: 0, ratio: 0 };
  const grossPool = market.yesPool + market.noPool;
  const fee = Math.min(0.99, Math.max(0, cfg.taxRate + cfg.commissionRate));
  const netPool = grossPool * (1 - fee);
  const wouldPay = (position.stake / winningPool) * netPool;
  const value = Math.round(wouldPay * (1 - CASHOUT_SLIPPAGE));
  const ratio = position.stake > 0 ? value / position.stake : 0;
  return { value, ratio };
}

export async function cashOutPosition(
  userId: string,
  positionId: string,
): Promise<ServiceResult<{ value: number; balance: number }>> {
  const p = positions.get(positionId);
  if (!p) return { ok: false, error: "Position not found.", code: "NOT_FOUND" };
  if (p.userId !== userId) return { ok: false, error: "Not your position.", code: "INVALID" };
  if (p.status !== "OPEN") return { ok: false, error: "Position is no longer open.", code: "INVALID" };

  const m = markets.get(p.marketId);
  if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (m.status !== "LIVE") return { ok: false, error: "Cash-out only available while the market is LIVE.", code: "INVALID" };

  return withLock(`wallet:${userId}`, async () => {
    const wallet = db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };

    const { value } = cashOutValue(p, m);
    if (value <= 0) {
      return { ok: false as const, error: "Current cash-out value is zero — your side has no live pool.", code: "INVALID" as const };
    }

    const now = new Date().toISOString();

    // Pull the stake out of the corresponding side's pool.
    if (p.side === "YES") m.yesPool = Math.max(0, m.yesPool - p.stake);
    else                  m.noPool  = Math.max(0, m.noPool  - p.stake);
    m.updatedAt = now;
    markets.set(m.id, m);
    recordSnapshot(m.id, m.yesPool, m.noPool);

    // Mark the position closed.
    p.status = "CASHED_OUT";
    p.finalPayout = value;
    p.settledAt = now;
    positions.set(p.id, p);

    // Credit wallet + record the txn.
    const newBalance = wallet.balance + value;
    db.wallet.update(wallet.id, { balance: newBalance });
    db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id, userId,
      type: "CASHOUT",
      status: "CONFIRMED",
      amount: value, fee: Math.round(p.stake * CASHOUT_SLIPPAGE), taxWithheld: 0,
      balanceAfter: newBalance, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null,
      description: `Cashed out · "${m.titleEn.slice(0, 60)}"`,
      betId: p.id,
      amlReason: null,
      createdAt: now, updatedAt: now, completedAt: now,
    });

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
  const m = markets.get(opts.marketId);
  if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
  if (m.status === "RESOLVED" || m.status === "VOIDED") return { ok: false, error: "Market already resolved.", code: "INVALID" };

  if (!m.resolutionStage1By) {
    m.resolutionStage1By = opts.officerId;
    m.resolutionStage1At = new Date().toISOString();
    m.resolvedOutcome = opts.outcome;
    m.status = "CLOSED";
    m.updatedAt = m.resolutionStage1At;
    markets.set(m.id, m);
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
  // Stage 2 — settle
  m.resolutionStage2By = opts.officerId;
  m.resolutionStage2At = new Date().toISOString();
  m.objectionsClosedAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  m.status = opts.outcome === "VOID" ? "VOIDED" : "RESOLVED";
  m.updatedAt = m.resolutionStage2At;
  markets.set(m.id, m);
  // Snapshot at the moment of resolution — final point on the chart.
  recordSnapshot(m.id, m.yesPool, m.noPool);

  let winnersPaid = 0;
  const myPositions = listPositionsForMarket(m.id);
  if (opts.outcome === "VOID") {
    // Refund everyone
    for (const p of myPositions) {
      const w = db.wallet.findByUserId(p.userId);
      if (!w) continue;
      db.wallet.update(w.id, { balance: w.balance + p.stake });
      p.status = "VOID";
      p.finalPayout = p.stake;
      p.settledAt = m.resolutionStage2At!;
      positions.set(p.id, p);
      db.txn.create({
        id: `txn_${randomId(12)}`,
        walletId: w.id, userId: p.userId,
        type: "BET_REFUND", status: "CONFIRMED",
        amount: p.stake, fee: 0, taxWithheld: 0,
        balanceAfter: w.balance + p.stake, currency: "TZS",
        provider: "INTERNAL", providerRef: null, msisdn: null,
        description: `Refund · "${m.titleEn.slice(0, 60)}" voided`,
        betId: p.id,
        amlReason: null,
        createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
      });
    }
  } else {
    // Whole-pool pari-mutuel distribution.
    //   netPool = (yesPool + noPool) × (1 - tax - commission)
    //   payout  = (stake / winningSidePool) × netPool
    const settleCfg = getEffectiveConfig(m.id);
    const winningPool = opts.outcome === "YES" ? m.yesPool : m.noPool;
    for (const p of myPositions) {
      const w = db.wallet.findByUserId(p.userId);
      if (!w) continue;
      if (p.side === opts.outcome) {
        const payout = settledPayoutWhole(
          { yesPool: m.yesPool, noPool: m.noPool, side: p.side, stake: p.stake },
          settleCfg,
        );
        db.wallet.update(w.id, { balance: w.balance + payout });
        p.status = "WIN"; p.finalPayout = payout; p.settledAt = m.resolutionStage2At!;
        positions.set(p.id, p);
        db.txn.create({
          id: `txn_${randomId(12)}`,
          walletId: w.id, userId: p.userId,
          type: "BET_PAYOUT", status: "CONFIRMED",
          amount: payout, fee: 0, taxWithheld: 0,
          balanceAfter: w.balance + payout, currency: "TZS",
          provider: "INTERNAL", providerRef: null, msisdn: null,
          description: `${opts.outcome} won · "${m.titleEn.slice(0, 60)}"`,
          betId: p.id,
          amlReason: null,
          createdAt: m.resolutionStage2At!, updatedAt: m.resolutionStage2At!, completedAt: m.resolutionStage2At!,
        });
        winnersPaid += payout;
        // Win receipt — opens the position so they can see the payout.
        notifyWin(p.userId, payout, m.titleEn, "/positions");
      } else {
        p.status = "LOSS"; p.finalPayout = 0; p.settledAt = m.resolutionStage2At!;
        positions.set(p.id, p);
        // Loss receipt — kit copy reframes loss as "pool grew".
        notifyLoss(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });
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
      grossPool: m.yesPool + m.noPool,
      netPool: Math.round((m.yesPool + m.noPool) * (1 - settleCfg.taxRate - settleCfg.commissionRate)),
      winningPool,
      winnersPaid,
      stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
      sourceUrl: m.sourceUrl,
    },
  });
  return { ok: true, data: { stage: "complete", winnersPaid } };
}

/** Seed the demo with a deep, varied catalogue and top up automatically
 *  when fewer than 25 LIVE markets remain — the manager always has at
 *  least 40 markets to drill into without needing to /admin/markets. */
export function seedDemoMarkets() {
  // Migrate older snapshots: purge any market with category "politics"
  // (pre-Sprint 37 the seed included an LGA-turnout market; the Tanzania
  // Gaming Board licence excludes political-event markets entirely).
  for (const [id, m] of markets.entries()) {
    if ((m as { category: string }).category === "politics") {
      markets.delete(id);
    }
  }
  // Top-up gate: if we already have 25+ LIVE markets, leave them alone.
  // Otherwise we'll re-seed the canonical 40-market catalogue below to
  // bring the count back up. Resolved + voided markets stay in history.
  const liveNow = Array.from(markets.values()).filter(m => m.status === "LIVE").length;
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

    // ────────────────────────────────────────────────────────────────────
    // DEMO — minute-scale + hour-scale markets so the operator can place
    // a bet, watch it land in the resolver queue, and run it through
    // two-officer settlement *during* a single demo session. Without
    // these, every market is days out and the celebration loop never
    // closes inside the meeting.
    // ────────────────────────────────────────────────────────────────────
    { titleEn: "Demo · 5-minute coin flip — will the next 5 minutes resolve YES?", titleSw: "Demo · sarafu ya dakika 5 — je, dakika 5 zijazo zitafungwa na YES?", category: "culture", sourceUrl: "https://www.itv.co.tz", resolutionCriterion: "Demo market — resolves at the discretion of the demo operator. For training and walk-throughs only.", resolutionAt: new Date(Date.now() + 5 * 60_000).toISOString(), proposedBy: "system" },
    { titleEn: "Demo · 15-minute hot market — will the demo close YES in 15 min?", titleSw: "Demo · soko la moto la dakika 15 — je, demo itafungwa na YES baada ya dakika 15?", category: "sports", sourceUrl: "https://nbc.co.tz/premier-league", resolutionCriterion: "Demo market — operator-resolved for live walk-throughs.", resolutionAt: new Date(Date.now() + 15 * 60_000).toISOString(), proposedBy: "system" },
    { titleEn: "Demo · 30-minute warm-up — outcome at 30-min mark?", titleSw: "Demo · soko la dakika 30 — matokeo baada ya dakika 30?", category: "macro", sourceUrl: "https://www.bot.go.tz", resolutionCriterion: "Demo market — operator-resolved for live walk-throughs.", resolutionAt: new Date(Date.now() + 30 * 60_000).toISOString(), proposedBy: "system" },
    { titleEn: "Demo · 1-hour TZS spot — TZS-USD higher in 1 hour?", titleSw: "Demo · TZS dhidi ya USD ndani ya saa 1?", category: "macro", sourceUrl: "https://www.bot.go.tz", resolutionCriterion: "Demo market — operator-resolved for live walk-throughs.", resolutionAt: new Date(Date.now() + 60 * 60_000).toISOString(), proposedBy: "system" },
    { titleEn: "Demo · 2-hour BTC drift — Bitcoin higher in 2 hours?", titleSw: "Demo · Bitcoin baada ya saa 2 — itakuwa juu zaidi?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Demo market — operator-resolved for live walk-throughs.", resolutionAt: new Date(Date.now() + 2 * 3600_000).toISOString(), proposedBy: "system" },
    { titleEn: "Demo · 6-hour weather check — Dar rainfall in 6 hours?", titleSw: "Demo · mvua Dar baada ya saa 6?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Demo market — operator-resolved for live walk-throughs.", resolutionAt: new Date(Date.now() + 6 * 3600_000).toISOString(), proposedBy: "system" },
  ];
  for (const s of seed) {
    // createMarket throws on duplicate id; since we're idempotent on
    // existing-market count, this loop only fires when the count is low.
    try {
      const m = createMarket(s);
      // Seed a believable history walk so the PriceChart isn't empty on first paint.
      seedHistory(m.id, m.yesPool, m.noPool);
    } catch {
      // Ignore — likely already present from a prior partial seed.
    }
  }
}
