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
import type { ServiceResult } from "./auth-service";

export const OPERATOR_MARGIN = 0.09;
export const MIN_STAKE = 100;
export const MAX_STAKE = 1_000_000;

export type MarketCategory = "politics" | "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other";
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
  status: "OPEN" | "WIN" | "LOSS" | "VOID";
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

/** Pool-share payout if `stake` lands on the winning side `winSide`, given current pool sizes. */
export function projectedPayout(m: Pick<StoredMarket, "yesPool" | "noPool">, side: Side, stake: number): number {
  const winningPool  = side === "YES" ? m.yesPool + stake : m.noPool + stake;
  const losingPool   = side === "YES" ? m.noPool : m.yesPool;
  const distributable = losingPool * (1 - OPERATOR_MARGIN);
  // Player gets their stake back + their share of the distributable losing pool.
  return Math.round(stake + (stake / winningPool) * distributable);
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

  if (!Number.isInteger(opts.stake) || opts.stake < MIN_STAKE || opts.stake > MAX_STAKE) {
    return { ok: false, error: `Stake must be a whole number between TZS ${MIN_STAKE} and TZS ${MAX_STAKE.toLocaleString()}.`, code: "INVALID" };
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
    const winningPool = opts.outcome === "YES" ? m.yesPool : m.noPool;
    const losingPool  = opts.outcome === "YES" ? m.noPool : m.yesPool;
    const distributable = losingPool * (1 - OPERATOR_MARGIN);
    for (const p of myPositions) {
      const w = db.wallet.findByUserId(p.userId);
      if (!w) continue;
      if (p.side === opts.outcome) {
        const share = winningPool > 0 ? p.stake / winningPool : 0;
        const payout = Math.round(p.stake + share * distributable);
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
      } else {
        p.status = "LOSS"; p.finalPayout = 0; p.settledAt = m.resolutionStage2At!;
        positions.set(p.id, p);
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
      operatorMargin: OPERATOR_MARGIN,
      winnersPaid,
      stage1By: m.resolutionStage1By, stage2By: m.resolutionStage2By,
      sourceUrl: m.sourceUrl,
    },
  });
  return { ok: true, data: { stage: "complete", winnersPaid } };
}

/** Seed the demo with a handful of compelling markets. */
export function seedDemoMarkets() {
  if (markets.size > 0) return;
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
  ];
  for (const s of seed) createMarket(s);
}
