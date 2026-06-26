/**
 * Market + Position DAL — feature-flagged switch between in-memory Maps
 * and Prisma tables for PredictionMarket + Position.
 *
 * Same pattern as store.ts Phase 2: USE_PRISMA_DAL=true flips to Prisma.
 * Until then, the Map-backed implementation runs (zero behavioral change).
 */
import { prisma } from "./prisma";
import { hasDatabase } from "./prisma";
import type { StoredMarket, StoredPosition, MarketStatus, MarketCategory, Side } from "./market-service";

// ---------------------------------------------------------------------------
// Globals — same Maps as before, just accessed through this DAL
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKETS: Map<string, StoredMarket> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_POSITIONS: Map<string, StoredPosition> | undefined;
}
const markets: Map<string, StoredMarket> = globalThis.__50PICK_MARKETS ?? (globalThis.__50PICK_MARKETS = new Map());
const positions: Map<string, StoredPosition> = globalThis.__50PICK_POSITIONS ?? (globalThis.__50PICK_POSITIONS = new Map());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredMarket(r: any): StoredMarket {
  return {
    id: r.id,
    titleEn: r.titleEn,
    titleSw: r.titleSw,
    category: r.category as MarketCategory,
    sourceUrl: r.sourceUrl,
    resolutionCriterion: r.resolutionCriterion,
    resolutionAt: iso(r.resolutionAt)!,
    status: r.status as MarketStatus,
    yesPool: num(r.yesPool),
    noPool: num(r.noPool),
    predictorCount: r.predictorCount,
    resolvedOutcome: r.resolvedOutcome as Side | "VOID" | null,
    resolutionStage1By: r.resolutionStage1By,
    resolutionStage1At: iso(r.resolutionStage1At),
    resolutionStage2By: r.resolutionStage2By,
    resolutionStage2At: iso(r.resolutionStage2At),
    objectionsClosedAt: iso(r.objectionsClosedAt),
    resolutionNotifiedAt: iso(r.resolutionNotifiedAt) ?? null,
    sentinelOutcome: r.sentinelOutcome ?? null,
    sentinelEvidence: r.sentinelEvidence ?? null,
    sentinelReasoning: r.sentinelReasoning ?? null,
    sentinelSourceUrl: r.sentinelSourceUrl ?? null,
    sentinelConfidence: r.sentinelConfidence ?? null,
    sentinelClosedAt: iso(r.sentinelClosedAt) ?? null,
    proposedBy: r.proposedBy,
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredPosition(r: any): StoredPosition {
  return {
    id: r.id,
    userId: r.userId,
    marketId: r.marketId,
    side: r.side as Side,
    stake: num(r.stake),
    bonusStakeTzs: r.bonusStakeTzs != null ? num(r.bonusStakeTzs) : 0,
    potentialPayout: num(r.potentialPayout),
    status: r.status as StoredPosition["status"],
    finalPayout: r.finalPayout != null ? num(r.finalPayout) : null,
    placedAt: iso(r.placedAt)!,
    settledAt: iso(r.settledAt),
  };
}

// ---------------------------------------------------------------------------
// Market store interface
// ---------------------------------------------------------------------------

export interface MarketStore {
  get(id: string): Promise<StoredMarket | null>;
  set(m: StoredMarket): Promise<void>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  values(): Promise<StoredMarket[]>;
}

export interface PositionStore {
  get(id: string): Promise<StoredPosition | null>;
  set(p: StoredPosition): Promise<void>;
  values(): Promise<StoredPosition[]>;
  listForUser(userId: string, limit?: number): Promise<StoredPosition[]>;
  listForMarket(marketId: string): Promise<StoredPosition[]>;
}

// ---------------------------------------------------------------------------
// Memory implementations (current behavior, sync but wrapped in Promise)
// ---------------------------------------------------------------------------

const memoryMarkets: MarketStore = {
  async get(id) { return markets.get(id) ?? null; },
  async set(m) { markets.set(m.id, m); },
  async delete(id) { markets.delete(id); },
  async has(id) { return markets.has(id); },
  async values() { return Array.from(markets.values()); },
};

const memoryPositions: PositionStore = {
  async get(id) { return positions.get(id) ?? null; },
  async set(p) { positions.set(p.id, p); },
  async values() { return Array.from(positions.values()); },
  async listForUser(userId, limit = 100) {
    return Array.from(positions.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .slice(0, limit);
  },
  async listForMarket(marketId) {
    return Array.from(positions.values()).filter((p) => p.marketId === marketId);
  },
};

// ---------------------------------------------------------------------------
// Prisma implementations
// ---------------------------------------------------------------------------

function pc() {
  const c = prisma();
  if (!c) throw new Error("market-dal: DATABASE_URL required");
  return c;
}

const prismaMarkets: MarketStore = {
  async get(id) {
    const r = await pc().predictionMarket.findUnique({ where: { id } });
    return r ? toStoredMarket(r) : null;
  },
  async set(m) {
    await pc().predictionMarket.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        titleEn: m.titleEn, titleSw: m.titleSw,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        resolutionAt: new Date(m.resolutionAt),
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        proposedBy: m.proposedBy,
        createdAt: new Date(m.createdAt),
      },
      update: {
        titleEn: m.titleEn, titleSw: m.titleSw,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        resolutionAt: new Date(m.resolutionAt),
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
      },
    });
  },
  async delete(id) {
    await pc().predictionMarket.delete({ where: { id } }).catch(() => {});
  },
  async has(id) {
    const r = await pc().predictionMarket.findUnique({ where: { id }, select: { id: true } });
    return !!r;
  },
  async values() {
    const rows = await pc().predictionMarket.findMany();
    return rows.map(toStoredMarket);
  },
};

const prismaPositions: PositionStore = {
  async get(id) {
    const r = await pc().position.findUnique({ where: { id } });
    return r ? toStoredPosition(r) : null;
  },
  async set(p) {
    await pc().position.upsert({
      where: { id: p.id },
      create: {
        id: p.id, userId: p.userId, marketId: p.marketId,
        side: p.side, stake: p.stake, bonusStakeTzs: p.bonusStakeTzs ?? 0,
        potentialPayout: p.potentialPayout,
        status: p.status, finalPayout: p.finalPayout,
        placedAt: new Date(p.placedAt),
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
      },
      update: {
        status: p.status, finalPayout: p.finalPayout,
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
      },
    });
  },
  async values() {
    const rows = await pc().position.findMany();
    return rows.map(toStoredPosition);
  },
  async listForUser(userId, limit = 100) {
    const rows = await pc().position.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      take: limit,
    });
    return rows.map(toStoredPosition);
  },
  async listForMarket(marketId) {
    const rows = await pc().position.findMany({ where: { marketId } });
    return rows.map(toStoredPosition);
  },
};

// ---------------------------------------------------------------------------
// Feature-flagged exports
// ---------------------------------------------------------------------------

// Prisma whenever a DATABASE_URL is configured (always in prod) — matches
// store.ts. No longer requires the USE_PRISMA_DAL flag, so forgetting it can't
// silently revert markets to in-memory. (store.ts holds the prod hard-lock that
// refuses to boot production without a database; this module loads alongside it.)
const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

export const marketStore: MarketStore = usePrisma ? prismaMarkets : memoryMarkets;
export const positionStore: PositionStore = usePrisma ? prismaPositions : memoryPositions;
