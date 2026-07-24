/**
 * Market + Position DAL — feature-flagged switch between in-memory Maps
 * and Prisma tables for PredictionMarket + Position.
 *
 * Same pattern as store.ts Phase 2: USE_PRISMA_DAL=true flips to Prisma.
 * Until then, the Map-backed implementation runs (zero behavioral change).
 */
import { prisma } from "./prisma";
import { hasDatabase } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { StoredMarket, StoredPosition, MarketStatus, MarketCategory, Side, ProductLineFilter } from "./market-service";

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
    titleZh: r.titleZh ?? null,
    category: r.category as MarketCategory,
    sourceUrl: r.sourceUrl,
    resolutionCriterion: r.resolutionCriterion,
    resolutionAt: iso(r.resolutionAt)!,
    selectionClosedAt: iso(r.selectionClosedAt) ?? null,
    status: r.status as MarketStatus,
    yesPool: num(r.yesPool),
    noPool: num(r.noPool),
    predictorCount: r.predictorCount,
    // The poll's frozen rates. Settlement prices against this, never live config.
    feeSnapshot: (r.feeSnapshot as StoredMarket["feeSnapshot"]) ?? null,
    resolvedOutcome: r.resolvedOutcome as Side | "VOID" | null,
    resolutionStage1By: r.resolutionStage1By,
    resolutionStage1At: iso(r.resolutionStage1At),
    resolutionStage2By: r.resolutionStage2By,
    resolutionStage2At: iso(r.resolutionStage2At),
    objectionsClosedAt: iso(r.objectionsClosedAt),
    settledAt: iso(r.settledAt),
    resolutionEvidence: r.resolutionEvidence ?? null,
    resolutionNotifiedAt: iso(r.resolutionNotifiedAt) ?? null,
    selectionClosedNotifiedAt: iso(r.selectionClosedNotifiedAt) ?? null,
    closingSoonNotifiedAt: iso(r.closingSoonNotifiedAt) ?? null,
    sentinelOutcome: r.sentinelOutcome ?? null,
    sentinelEvidence: r.sentinelEvidence ?? null,
    sentinelReasoning: r.sentinelReasoning ?? null,
    sentinelSourceUrl: r.sentinelSourceUrl ?? null,
    sentinelConfidence: r.sentinelConfidence ?? null,
    sentinelClosedAt: iso(r.sentinelClosedAt) ?? null,
    resolutionMode: (r.resolutionMode as StoredMarket["resolutionMode"]) ?? null,
    resolveClaimedAt: iso(r.resolveClaimedAt) ?? null,
    // Coerced, not trusted: a row read before the column existed (or through an old
    // client) has no value, and every such row is a long-form poll.
    productLine: r.productLine === "UPDOWN" ? "UPDOWN" : "MARKET",
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
    idempotencyKey: r.idempotencyKey ?? null,
  };
}

// ---------------------------------------------------------------------------
// Market store interface
// ---------------------------------------------------------------------------

export interface MarketStore {
  // tx: read THROUGH the enclosing lock's transaction. The bet path holds one
  // transaction for the whole bet (see locks.ts); reading on a separate pool
  // connection would both cost an extra connection and miss this transaction's
  // own uncommitted writes.
  get(id: string, tx?: Prisma.TransactionClient | null): Promise<StoredMarket | null>;
  // tx (bet-stake single-tx): pass a Prisma transaction client to persist the
  // pool mutation in the SAME transaction as the stake's wallet/txn/ledger
  // movement, so a mid-bet failure rolls the pool increment back with the debit.
  // Ignored by the in-memory store (same contract as PositionStore.set below).
  set(m: StoredMarket, tx?: Prisma.TransactionClient | null): Promise<void>;
  /**
   * Narrow UPDATE of ONLY the named columns.
   *
   * `set` is a FULL-ROW upsert whose update block rewrites yesPool/noPool/
   * predictorCount unconditionally. Every sweep that merely stamps a timestamp on
   * a LIVE market used to read the row, spread it, and write the whole thing
   * back — so a bet that incremented the pool between that read and that write
   * had its stake ERASED. The market advisory lock was the only thing preventing
   * it. Stamping narrowly removes the lost-update window itself, which is what
   * makes it safe to stop taking the market lock on the bet path.
   */
  stamp(id: string, fields: Partial<StoredMarket>, tx?: Prisma.TransactionClient | null): Promise<void>;
  /**
   * Atomic pool delta — `yesPool`/`noPool`/`predictorCount` by increment, never
   * by read-modify-write. Mirrors db.wallet.adjust: the database computes the new
   * value, so concurrent writers cannot clobber each other.
   */
  addToPool(
    id: string,
    deltas: { yesPool?: number; noPool?: number; predictorCount?: number },
    tx?: Prisma.TransactionClient | null,
  ): Promise<{ yesPool: number; noPool: number } | null>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  values(): Promise<StoredMarket[]>;
  /**
   * Every market with a PENDING time-based transition — i.e. what the per-market
   * scheduler must arm a timer for: LIVE markets (closing-soon / selection-closed /
   * resolve triggers) and adjudicated-but-unsettled markets (settle trigger).
   *
   * A TARGETED, INDEXED query — never `values()`. The scheduler hydrates + reconciles
   * off this, so on a board with thousands of settled markets it reads only the
   * handful still in flight (status is indexed; settledAt filters the small residue).
   *
   * `productLine` defaults to `"MARKET"`: Up & Down rounds are driven by their own
   * per-CHAIN scheduler, so the per-market scheduler must not arm timers for them.
   */
  pending(productLine?: ProductLineFilter): Promise<StoredMarket[]>;
  /**
   * THE BOARD QUERY — an INDEXED `findMany`, pushed down to Postgres.
   *
   * This replaces `values()` on every listing path. `values()` reads the ENTIRE table
   * and the caller filters in JS; that was survivable while the table held tens of
   * long-form polls, and stops being survivable the moment Up & Down starts emitting
   * a row every few minutes (~300k rows/year). Served by
   * `@@index([productLine, status, resolutionAt])`.
   *
   * `productLine` is REQUIRED here on purpose — a caller must state which product it
   * means rather than inheriting a silent default at this layer. `listMarkets()` in
   * market-service.ts is where the `"MARKET"` default lives, in one place, next to
   * the rule that explains it.
   */
  listBoard(q: {
    productLine: ProductLineFilter;
    status?: MarketStatus;
    category?: MarketCategory;
    /** Cap the rows returned. Omit for "all of them" (the historical behaviour). */
    limit?: number;
  }): Promise<StoredMarket[]>;
}

export interface PositionStore {
  get(id: string): Promise<StoredPosition | null>;
  // tx (audit C3): pass a Prisma transaction client to persist the position in
  // the SAME transaction as its wallet/txn/ledger movement (settlement), so a
  // credit and its "paid" mark commit together — no double-pay on resume, no
  // ledger loss. Ignored by the in-memory store.
  set(p: StoredPosition, tx?: Prisma.TransactionClient | null): Promise<void>;
  values(): Promise<StoredPosition[]>;
  listForUser(userId: string, limit?: number): Promise<StoredPosition[]>;
  listForMarket(marketId: string): Promise<StoredPosition[]>;
  // tx: see MarketStore.get — the idempotency probe runs inside the bet's
  // transaction so it costs no extra pool connection.
  findByIdempotencyKey(key: string, tx?: Prisma.TransactionClient | null): Promise<StoredPosition | null>;
}

// ---------------------------------------------------------------------------
// Memory implementations (current behavior, sync but wrapped in Promise)
// ---------------------------------------------------------------------------

const memoryMarkets: MarketStore = {
  async get(id, _tx) { return markets.get(id) ?? null; },
  async set(m, _tx) { markets.set(m.id, m); },
  async stamp(id, fields, _tx) {
    const cur = markets.get(id);
    if (cur) markets.set(id, { ...cur, ...fields });
  },
  async addToPool(id, deltas, _tx) {
    const cur = markets.get(id);
    if (!cur) return null;
    // The in-memory Map is single-process and every caller is serialized by the
    // in-memory mutex, so a read-modify-write is safe HERE (it is not on Postgres).
    cur.yesPool += deltas.yesPool ?? 0;
    cur.noPool += deltas.noPool ?? 0;
    cur.predictorCount += deltas.predictorCount ?? 0;
    cur.updatedAt = new Date().toISOString();
    return { yesPool: cur.yesPool, noPool: cur.noPool };
  },
  async delete(id) { markets.delete(id); },
  async has(id) { return markets.has(id); },
  async values() { return Array.from(markets.values()); },
  async pending(productLine = "MARKET") {
    return Array.from(markets.values())
      .filter((m) => productLine === "ALL" || (m.productLine ?? "MARKET") === productLine)
      .filter((m) => m.status === "LIVE" || ((m.status === "RESOLVED" || m.status === "VOIDED") && !m.settledAt));
  },
  async listBoard(q) {
    const rows = Array.from(markets.values())
      .filter((m) => q.productLine === "ALL" || (m.productLine ?? "MARKET") === q.productLine)
      .filter((m) => !q.status || m.status === q.status)
      .filter((m) => !q.category || m.category === q.category)
      // Same ordering as the Prisma implementation, so a test that passes in memory
      // means the same thing in production.
      .sort((a, b) => a.resolutionAt.localeCompare(b.resolutionAt));
    return q.limit != null ? rows.slice(0, q.limit) : rows;
  },
};

const memoryPositions: PositionStore = {
  async get(id) { return positions.get(id) ?? null; },
  async set(p, _tx) { positions.set(p.id, p); },
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
  async findByIdempotencyKey(key, _tx) {
    for (const p of positions.values()) if (p.idempotencyKey === key) return p;
    return null;
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

/** Columns `stamp` is allowed to write, and how to coerce each to a DB value.
 *  An allowlist rather than a spread so `stamp` can never be handed a whole
 *  StoredMarket and quietly become the full-row write it exists to replace. */
const STAMPABLE: Record<string, (v: unknown) => unknown> = {
  status: (v) => v,
  resolvedOutcome: (v) => v,
  resolutionEvidence: (v) => v,
  resolutionStage1By: (v) => v,
  resolutionStage2By: (v) => v,
  settledAt: (v) => (v ? new Date(v as string) : null),
  resolutionStage1At: (v) => (v ? new Date(v as string) : null),
  resolutionStage2At: (v) => (v ? new Date(v as string) : null),
  objectionsClosedAt: (v) => (v ? new Date(v as string) : null),
  resolutionNotifiedAt: (v) => (v ? new Date(v as string) : null),
  selectionClosedNotifiedAt: (v) => (v ? new Date(v as string) : null),
  closingSoonNotifiedAt: (v) => (v ? new Date(v as string) : null),
  selectionClosedAt: (v) => (v ? new Date(v as string) : null),
  sentinelOutcome: (v) => v,
  sentinelEvidence: (v) => v,
  sentinelReasoning: (v) => v,
  sentinelSourceUrl: (v) => v,
  sentinelConfidence: (v) => v,
  sentinelClosedAt: (v) => (v ? new Date(v as string) : null),
  resolutionMode: (v) => v,
  resolveClaimedAt: (v) => (v ? new Date(v as string) : null),
  updatedAt: (v) => (v ? new Date(v as string) : new Date()),
};

const prismaMarkets: MarketStore = {
  async get(id, tx) {
    const r = await (tx ?? pc()).predictionMarket.findUnique({ where: { id } });
    return r ? toStoredMarket(r) : null;
  },
  async stamp(id, fields, tx) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = STAMPABLE[k];
      if (!coerce) throw new Error(`marketStore.stamp: '${k}' is not a stampable column (pool/title fields must not be written this way)`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    if (!("updatedAt" in data)) data.updatedAt = new Date();
    await (tx ?? pc()).predictionMarket.update({ where: { id }, data });
  },
  async addToPool(id, deltas, tx) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (deltas.yesPool !== undefined) data.yesPool = { increment: deltas.yesPool };
    if (deltas.noPool !== undefined) data.noPool = { increment: deltas.noPool };
    if (deltas.predictorCount !== undefined) data.predictorCount = { increment: deltas.predictorCount };
    // RETURNING, not updateMany: recordSnapshot and the SSE odds push need the
    // TRUE committed pools, not the values this caller believed it was writing.
    const row = await (tx ?? pc()).predictionMarket.update({
      where: { id }, data, select: { yesPool: true, noPool: true },
    });
    return { yesPool: num(row.yesPool), noPool: num(row.noPool) };
  },
  async set(m, tx) {
    await (tx ?? pc()).predictionMarket.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        productLine: m.productLine ?? "MARKET",
        proposedBy: m.proposedBy,
        createdAt: new Date(m.createdAt),
      },
      update: {
        titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        // `productLine` is deliberately ABSENT from the update block: a row's product
        // is fixed at creation. Allowing an update would let a stale in-memory copy
        // silently reclassify a settled Up & Down round as a long-form poll, moving
        // its money between product lines in every report after the fact.
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
  async pending(productLine = "MARKET") {
    // Indexed on status; the OR keeps the settle candidates (adjudicated, money not
    // yet moved) without a second query. The residue is tiny relative to the table.
    const rows = await pc().predictionMarket.findMany({
      where: {
        ...(productLine === "ALL" ? {} : { productLine }),
        OR: [
          { status: "LIVE" },
          { status: { in: ["RESOLVED", "VOIDED"] }, settledAt: null },
        ],
      },
    });
    return rows.map(toStoredMarket);
  },
  async listBoard(q) {
    const rows = await pc().predictionMarket.findMany({
      where: {
        ...(q.productLine === "ALL" ? {} : { productLine: q.productLine }),
        ...(q.status ? { status: q.status } : {}),
        ...(q.category ? { category: q.category } : {}),
      },
      // Matches the old in-JS `sort((a,b) => a.resolutionAt.localeCompare(b.resolutionAt))`
      // so callers see byte-identical ordering — this change is a query-plan change,
      // not a behaviour change.
      orderBy: { resolutionAt: "asc" },
      ...(q.limit != null ? { take: q.limit } : {}),
    });
    return rows.map(toStoredMarket);
  },
};

const prismaPositions: PositionStore = {
  async get(id) {
    const r = await pc().position.findUnique({ where: { id } });
    return r ? toStoredPosition(r) : null;
  },
  async set(p, tx) {
    await (tx ?? pc()).position.upsert({
      where: { id: p.id },
      create: {
        id: p.id, userId: p.userId, marketId: p.marketId,
        side: p.side, stake: p.stake, bonusStakeTzs: p.bonusStakeTzs ?? 0,
        potentialPayout: p.potentialPayout,
        status: p.status, finalPayout: p.finalPayout,
        placedAt: new Date(p.placedAt),
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
        idempotencyKey: p.idempotencyKey ?? null,
      },
      // Mirror the full mutable field set so this DAL matches the in-memory
      // store's full-replace semantics (positions.set(p.id, p)). Previously only
      // status/finalPayout/settledAt were written, so a future mutation of any
      // other field would persist in tests but silently no-op in production.
      update: {
        userId: p.userId, marketId: p.marketId,
        side: p.side, stake: p.stake, bonusStakeTzs: p.bonusStakeTzs ?? 0,
        potentialPayout: p.potentialPayout,
        status: p.status, finalPayout: p.finalPayout,
        placedAt: new Date(p.placedAt),
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
        idempotencyKey: p.idempotencyKey ?? null,
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
  async findByIdempotencyKey(key, tx) {
    const r = await (tx ?? pc()).position.findUnique({ where: { idempotencyKey: key } });
    return r ? toStoredPosition(r) : null;
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
