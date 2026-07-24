/**
 * Up & Down DAL — assets, chains, rounds and the observation ledger.
 *
 * Mirrors `market-dal.ts`: one interface per entity, a Prisma implementation and an
 * in-memory implementation, selected by whether a DATABASE_URL is configured. Tests
 * drive the in-memory pair; production always uses Prisma.
 *
 * ⚠️ NOTHING HERE MOVES MONEY. Every round is also a `PredictionMarket` row
 * (`productLine: "UPDOWN"`), and all stakes, pools, payouts, refunds, ledger entries
 * and audit rows live on THAT side, in the code the long-form polls already use. These
 * tables carry the price story only. If you find yourself adding a balance to this
 * file, stop — it belongs in market-service/wallet-service.
 *
 * The one genuinely subtle thing in here is the observation store; see §Observations.
 */
import { prisma, hasDatabase } from "./prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------
//
// Defined HERE rather than in a service, so the DAL has no import back into the
// service layer. `market-dal.ts` imports its types from `market-service.ts`, which
// works but keeps the two modules mutually entangled; there is no reason to repeat
// that in new code.

export type ChainState = "RUNNING" | "PAUSED" | "STOPPED";
export type RoundOutcome = "UP" | "DOWN" | "VOID";
export type ObservationState = "PENDING" | "CONFIRMED" | "FAILED";

/** Why a round returned every stake instead of paying a winner. Recorded for the
 *  audit trail and the ops readout; the player is refunded in full either way. */
export type VoidReason = "no-move" | "source-failed" | "operator";

export type StoredAsset = {
  id: string;
  /** Stable machine key ("XAU"). Never renamed — reports group by it. */
  key: string;
  symbol: string;
  nameEn: string;
  nameSw: string;
  nameZh: string | null;
  iconKey: string;
  /** The source link a round captures at generation and resolves against. */
  priceSourceUrl: string;
  sourceDomain: string;
  category: string;
  decimals: number;
  minMoveTicks: number;
  enabled: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredChain = {
  id: string;
  assetId: string;
  durationMinutes: number;
  state: ChainState;
  /** Grid origin. Boundaries are DERIVED as anchor + k·duration, never accumulated,
   *  so a restart or a missed fire cannot drift the grid. */
  gridAnchorAt: string;
  nextBoundaryAt: string | null;
  currentRoundId: string | null;
  minStake: number | null;
  maxStake: number | null;
  /** Partial RateConfig this chain freezes onto each round it creates. */
  rateProfile: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredRound = {
  id: string;
  chainId: string;
  /** The PredictionMarket this round IS — where its money lives. */
  marketId: string;
  roundNumber: number;
  opensAt: string;
  closesAt: string;
  boundaryAt: string;
  openObservationId: string | null;
  closeObservationId: string | null;
  openPrice: number | null;
  closePrice: number | null;
  outcome: RoundOutcome | null;
  voidReason: VoidReason | null;
  resolvedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredObservation = {
  id: string;
  assetId: string;
  boundaryAt: string;
  state: ObservationState;
  price: number | null;
  sourceUrl: string | null;
  /** The timestamp THE SOURCE ITSELF quoted — not our boundary. These are different
   *  numbers, and the difference is the honest part: every surface shows this one. */
  sourceQuotedAt: string | null;
  evidence: string | null;
  confidence: number | null;
  model: string | null;
  rawHash: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  failReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const dt = (s: string | null | undefined): Date | null => (s ? new Date(s) : null);
const num = (d: unknown): number | null => (d == null ? null : Number(d));

/* eslint-disable @typescript-eslint/no-explicit-any */
function toAsset(r: any): StoredAsset {
  return {
    id: r.id, key: r.key, symbol: r.symbol,
    nameEn: r.nameEn, nameSw: r.nameSw, nameZh: r.nameZh ?? null,
    iconKey: r.iconKey,
    priceSourceUrl: r.priceSourceUrl, sourceDomain: r.sourceDomain, category: r.category,
    decimals: r.decimals, minMoveTicks: r.minMoveTicks,
    enabled: r.enabled, sortOrder: r.sortOrder,
    createdBy: r.createdBy, createdAt: iso(r.createdAt)!, updatedAt: iso(r.updatedAt)!,
  };
}

function toChain(r: any): StoredChain {
  return {
    id: r.id, assetId: r.assetId, durationMinutes: r.durationMinutes,
    state: r.state as ChainState,
    gridAnchorAt: iso(r.gridAnchorAt)!,
    nextBoundaryAt: iso(r.nextBoundaryAt),
    currentRoundId: r.currentRoundId ?? null,
    minStake: r.minStake ?? null, maxStake: r.maxStake ?? null,
    rateProfile: (r.rateProfile as Record<string, unknown> | null) ?? null,
    createdBy: r.createdBy, createdAt: iso(r.createdAt)!, updatedAt: iso(r.updatedAt)!,
  };
}

function toRound(r: any): StoredRound {
  return {
    id: r.id, chainId: r.chainId, marketId: r.marketId, roundNumber: r.roundNumber,
    opensAt: iso(r.opensAt)!, closesAt: iso(r.closesAt)!, boundaryAt: iso(r.boundaryAt)!,
    openObservationId: r.openObservationId ?? null,
    closeObservationId: r.closeObservationId ?? null,
    openPrice: num(r.openPrice), closePrice: num(r.closePrice),
    outcome: (r.outcome as RoundOutcome | null) ?? null,
    voidReason: (r.voidReason as VoidReason | null) ?? null,
    resolvedAt: iso(r.resolvedAt), settledAt: iso(r.settledAt),
    createdAt: iso(r.createdAt)!, updatedAt: iso(r.updatedAt)!,
  };
}

function toObservation(r: any): StoredObservation {
  return {
    id: r.id, assetId: r.assetId, boundaryAt: iso(r.boundaryAt)!,
    state: r.state as ObservationState,
    price: num(r.price),
    sourceUrl: r.sourceUrl ?? null, sourceQuotedAt: iso(r.sourceQuotedAt),
    evidence: r.evidence ?? null, confidence: r.confidence ?? null,
    model: r.model ?? null, rawHash: r.rawHash ?? null,
    attempts: r.attempts ?? 0, lastAttemptAt: iso(r.lastAttemptAt),
    failReason: r.failReason ?? null,
    createdAt: iso(r.createdAt)!, confirmedAt: iso(r.confirmedAt),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function pc() {
  const c = prisma();
  if (!c) throw new Error("updown-dal: DATABASE_URL required");
  return c;
}

/** True when a Prisma error is a unique-constraint violation. The observation store
 *  races on `@@unique([assetId, boundaryAt])` BY DESIGN, so this is a normal control
 *  path there, not an error. */
function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002";
}

// ---------------------------------------------------------------------------
// Store interfaces
// ---------------------------------------------------------------------------

export interface AssetStore {
  get(id: string): Promise<StoredAsset | null>;
  getByKey(key: string): Promise<StoredAsset | null>;
  list(opts?: { enabledOnly?: boolean }): Promise<StoredAsset[]>;
  upsert(a: StoredAsset): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ChainStore {
  get(id: string): Promise<StoredChain | null>;
  list(opts?: { assetId?: string; state?: ChainState }): Promise<StoredChain[]>;
  /** Chains the scheduler must arm — an indexed query on ([state, nextBoundaryAt]),
   *  never a full scan. This is the boot-hydrate read. */
  running(): Promise<StoredChain[]>;
  upsert(c: StoredChain): Promise<void>;
  /** Narrow field update. Deliberately NOT a full-row write: a chain row is touched
   *  by the scheduler on every boundary while an admin may be editing it, and a
   *  full-row upsert would let one clobber the other (the same lost-update bug
   *  `marketStore.stamp` exists to prevent). */
  patch(id: string, fields: Partial<StoredChain>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RoundStore {
  get(id: string): Promise<StoredRound | null>;
  getByMarketId(marketId: string): Promise<StoredRound | null>;
  /** The round a chain is currently running, if any. */
  latestForChain(chainId: string): Promise<StoredRound | null>;
  list(opts?: { chainId?: string; limit?: number; unsettledOnly?: boolean }): Promise<StoredRound[]>;
  create(r: StoredRound): Promise<void>;
  patch(id: string, fields: Partial<StoredRound>): Promise<void>;
}

export interface ObservationStore {
  get(id: string): Promise<StoredObservation | null>;
  find(assetId: string, boundaryAt: string): Promise<StoredObservation | null>;
  /**
   * Get-or-create the PENDING observation for this (asset, boundary).
   *
   * Idempotent and race-safe: two chains hitting the same boundary in the same
   * instant (a 5-min and a 15-min round both closing at 14:30) both call this, and
   * exactly one row results. The loser of the race catches P2002 and re-reads.
   */
  ensure(assetId: string, boundaryAt: string): Promise<StoredObservation>;
  /**
   * CLAIM-THE-ROW confirm. Writes the price only if the row is still PENDING.
   *
   * ⛔ This is the guarantee the whole feature rests on. An observation is written
   * ONCE and read many times, so round N's close IS round N+1's open, to the digit.
   * A conditional update (not a blind write) means a second confirmation — a retry
   * that raced, a duplicate fire, a second instance — CANNOT overwrite a price that
   * has already been used to settle money. Returns false when it did not win.
   */
  confirm(id: string, fields: {
    price: number; sourceUrl: string; sourceQuotedAt: string;
    evidence: string | null; confidence: number | null; model: string | null; rawHash: string | null;
  }): Promise<boolean>;
  /** Record a failed attempt (bumps `attempts`); does not change state. */
  recordAttempt(id: string, failReason: string | null): Promise<void>;
  /** Terminal failure — every round bounded by this observation VOIDs and refunds.
   *  Conditional on PENDING for the same reason as `confirm`. */
  fail(id: string, failReason: string): Promise<boolean>;
  list(opts?: { assetId?: string; state?: ObservationState; limit?: number }): Promise<StoredObservation[]>;
}

// ---------------------------------------------------------------------------
// In-memory implementations (dev + tests)
// ---------------------------------------------------------------------------

declare global {
  /* eslint-disable no-var */
  var __50PICK_UD_ASSETS: Map<string, StoredAsset> | undefined;
  var __50PICK_UD_CHAINS: Map<string, StoredChain> | undefined;
  var __50PICK_UD_ROUNDS: Map<string, StoredRound> | undefined;
  var __50PICK_UD_OBS: Map<string, StoredObservation> | undefined;
  /* eslint-enable no-var */
}
const memAssets = globalThis.__50PICK_UD_ASSETS ?? (globalThis.__50PICK_UD_ASSETS = new Map());
const memChains = globalThis.__50PICK_UD_CHAINS ?? (globalThis.__50PICK_UD_CHAINS = new Map());
const memRounds = globalThis.__50PICK_UD_ROUNDS ?? (globalThis.__50PICK_UD_ROUNDS = new Map());
const memObs = globalThis.__50PICK_UD_OBS ?? (globalThis.__50PICK_UD_OBS = new Map());

/** The in-memory stand-in for `@@unique([assetId, boundaryAt])`. */
const obsKey = (assetId: string, boundaryAt: string) => `${assetId}@${boundaryAt}`;

const memoryAssets: AssetStore = {
  async get(id) { return memAssets.get(id) ?? null; },
  async getByKey(key) { return [...memAssets.values()].find((a) => a.key === key) ?? null; },
  async list(opts) {
    return [...memAssets.values()]
      .filter((a) => !opts?.enabledOnly || a.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  },
  async upsert(a) { memAssets.set(a.id, { ...a }); },
  async delete(id) { memAssets.delete(id); },
};

const memoryChains: ChainStore = {
  async get(id) { return memChains.get(id) ?? null; },
  async list(opts) {
    return [...memChains.values()]
      .filter((c) => !opts?.assetId || c.assetId === opts.assetId)
      .filter((c) => !opts?.state || c.state === opts.state)
      .sort((a, b) => a.assetId.localeCompare(b.assetId) || a.durationMinutes - b.durationMinutes);
  },
  async running() {
    return [...memChains.values()]
      .filter((c) => c.state === "RUNNING")
      .sort((a, b) => (a.nextBoundaryAt ?? "").localeCompare(b.nextBoundaryAt ?? ""));
  },
  async upsert(c) { memChains.set(c.id, { ...c }); },
  async patch(id, fields) {
    const cur = memChains.get(id);
    if (cur) memChains.set(id, { ...cur, ...fields, updatedAt: new Date().toISOString() });
  },
  async delete(id) { memChains.delete(id); },
};

const memoryRounds: RoundStore = {
  async get(id) { return memRounds.get(id) ?? null; },
  async getByMarketId(marketId) { return [...memRounds.values()].find((r) => r.marketId === marketId) ?? null; },
  async latestForChain(chainId) {
    return [...memRounds.values()]
      .filter((r) => r.chainId === chainId)
      .sort((a, b) => b.roundNumber - a.roundNumber)[0] ?? null;
  },
  async list(opts) {
    const rows = [...memRounds.values()]
      .filter((r) => !opts?.chainId || r.chainId === opts.chainId)
      .filter((r) => !opts?.unsettledOnly || !r.settledAt)
      .sort((a, b) => b.boundaryAt.localeCompare(a.boundaryAt));
    return opts?.limit != null ? rows.slice(0, opts.limit) : rows;
  },
  async create(r) { memRounds.set(r.id, { ...r }); },
  async patch(id, fields) {
    const cur = memRounds.get(id);
    if (cur) memRounds.set(id, { ...cur, ...fields, updatedAt: new Date().toISOString() });
  },
};

const memoryObservations: ObservationStore = {
  async get(id) { return memObs.get(id) ?? null; },
  async find(assetId, boundaryAt) {
    return [...memObs.values()].find((o) => o.assetId === assetId && o.boundaryAt === boundaryAt) ?? null;
  },
  async ensure(assetId, boundaryAt) {
    const existing = await memoryObservations.find(assetId, boundaryAt);
    if (existing) return existing;
    const row: StoredObservation = {
      id: `udo_${obsKey(assetId, boundaryAt)}`,
      assetId, boundaryAt, state: "PENDING",
      price: null, sourceUrl: null, sourceQuotedAt: null,
      evidence: null, confidence: null, model: null, rawHash: null,
      attempts: 0, lastAttemptAt: null, failReason: null,
      createdAt: new Date().toISOString(), confirmedAt: null,
    };
    memObs.set(row.id, row);
    return row;
  },
  async confirm(id, fields) {
    const cur = memObs.get(id);
    // The in-memory mirror of the conditional UPDATE ... WHERE state = 'PENDING'.
    if (!cur || cur.state !== "PENDING") return false;
    memObs.set(id, {
      ...cur, state: "CONFIRMED",
      price: fields.price, sourceUrl: fields.sourceUrl, sourceQuotedAt: fields.sourceQuotedAt,
      evidence: fields.evidence, confidence: fields.confidence, model: fields.model, rawHash: fields.rawHash,
      confirmedAt: new Date().toISOString(),
    });
    return true;
  },
  async recordAttempt(id, failReason) {
    const cur = memObs.get(id);
    if (cur) memObs.set(id, { ...cur, attempts: cur.attempts + 1, lastAttemptAt: new Date().toISOString(), failReason });
  },
  async fail(id, failReason) {
    const cur = memObs.get(id);
    if (!cur || cur.state !== "PENDING") return false;
    memObs.set(id, { ...cur, state: "FAILED", failReason });
    return true;
  },
  async list(opts) {
    const rows = [...memObs.values()]
      .filter((o) => !opts?.assetId || o.assetId === opts.assetId)
      .filter((o) => !opts?.state || o.state === opts.state)
      .sort((a, b) => b.boundaryAt.localeCompare(a.boundaryAt));
    return opts?.limit != null ? rows.slice(0, opts.limit) : rows;
  },
};

// ---------------------------------------------------------------------------
// Prisma implementations
// ---------------------------------------------------------------------------

const prismaAssets: AssetStore = {
  async get(id) { const r = await pc().upDownAsset.findUnique({ where: { id } }); return r ? toAsset(r) : null; },
  async getByKey(key) { const r = await pc().upDownAsset.findUnique({ where: { key } }); return r ? toAsset(r) : null; },
  async list(opts) {
    const rows = await pc().upDownAsset.findMany({
      where: opts?.enabledOnly ? { enabled: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
    return rows.map(toAsset);
  },
  async upsert(a) {
    const data = {
      key: a.key, symbol: a.symbol,
      nameEn: a.nameEn, nameSw: a.nameSw, nameZh: a.nameZh,
      iconKey: a.iconKey,
      priceSourceUrl: a.priceSourceUrl, sourceDomain: a.sourceDomain, category: a.category,
      decimals: a.decimals, minMoveTicks: a.minMoveTicks,
      enabled: a.enabled, sortOrder: a.sortOrder, createdBy: a.createdBy,
    };
    await pc().upDownAsset.upsert({
      where: { id: a.id },
      create: { id: a.id, ...data, createdAt: new Date(a.createdAt) },
      update: data,
    });
  },
  async delete(id) { await pc().upDownAsset.delete({ where: { id } }).catch(() => {}); },
};

/** Columns `patch` may write on a chain. An allowlist, not a spread, so a caller
 *  cannot hand it a whole row and quietly turn it back into the full-row write it
 *  exists to replace (same reasoning as `STAMPABLE` in market-dal.ts). */
const CHAIN_PATCHABLE: Record<string, (v: unknown) => unknown> = {
  state: (v) => v,
  gridAnchorAt: (v) => dt(v as string),
  nextBoundaryAt: (v) => dt(v as string),
  currentRoundId: (v) => v,
  minStake: (v) => v,
  maxStake: (v) => v,
  rateProfile: (v) => v,
};

const prismaChains: ChainStore = {
  async get(id) { const r = await pc().upDownChain.findUnique({ where: { id } }); return r ? toChain(r) : null; },
  async list(opts) {
    const rows = await pc().upDownChain.findMany({
      where: { ...(opts?.assetId ? { assetId: opts.assetId } : {}), ...(opts?.state ? { state: opts.state } : {}) },
      orderBy: [{ assetId: "asc" }, { durationMinutes: "asc" }],
    });
    return rows.map(toChain);
  },
  async running() {
    // Served by @@index([state, nextBoundaryAt]) — the scheduler's boot-hydrate read.
    const rows = await pc().upDownChain.findMany({
      where: { state: "RUNNING" },
      orderBy: { nextBoundaryAt: "asc" },
    });
    return rows.map(toChain);
  },
  async upsert(c) {
    const data = {
      assetId: c.assetId, durationMinutes: c.durationMinutes, state: c.state,
      gridAnchorAt: new Date(c.gridAnchorAt),
      nextBoundaryAt: dt(c.nextBoundaryAt),
      currentRoundId: c.currentRoundId,
      minStake: c.minStake, maxStake: c.maxStake,
      rateProfile: (c.rateProfile ?? undefined) as never,
      createdBy: c.createdBy,
    };
    await pc().upDownChain.upsert({
      where: { id: c.id },
      create: { id: c.id, ...data, createdAt: new Date(c.createdAt) },
      update: data,
    });
  },
  async patch(id, fields) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = CHAIN_PATCHABLE[k];
      if (!coerce) throw new Error(`chainStore.patch: '${k}' is not a patchable column`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    await pc().upDownChain.update({ where: { id }, data });
  },
  async delete(id) { await pc().upDownChain.delete({ where: { id } }).catch(() => {}); },
};

const ROUND_PATCHABLE: Record<string, (v: unknown) => unknown> = {
  openObservationId: (v) => v,
  closeObservationId: (v) => v,
  openPrice: (v) => v,
  closePrice: (v) => v,
  outcome: (v) => v,
  voidReason: (v) => v,
  resolvedAt: (v) => dt(v as string),
  settledAt: (v) => dt(v as string),
};

const prismaRounds: RoundStore = {
  async get(id) { const r = await pc().upDownRound.findUnique({ where: { id } }); return r ? toRound(r) : null; },
  async getByMarketId(marketId) {
    const r = await pc().upDownRound.findUnique({ where: { marketId } });
    return r ? toRound(r) : null;
  },
  async latestForChain(chainId) {
    const r = await pc().upDownRound.findFirst({ where: { chainId }, orderBy: { roundNumber: "desc" } });
    return r ? toRound(r) : null;
  },
  async list(opts) {
    const rows = await pc().upDownRound.findMany({
      where: {
        ...(opts?.chainId ? { chainId: opts.chainId } : {}),
        ...(opts?.unsettledOnly ? { settledAt: null } : {}),
      },
      orderBy: { boundaryAt: "desc" },
      ...(opts?.limit != null ? { take: opts.limit } : {}),
    });
    return rows.map(toRound);
  },
  async create(r) {
    await pc().upDownRound.create({
      data: {
        id: r.id, chainId: r.chainId, marketId: r.marketId, roundNumber: r.roundNumber,
        opensAt: new Date(r.opensAt), closesAt: new Date(r.closesAt), boundaryAt: new Date(r.boundaryAt),
        openObservationId: r.openObservationId, closeObservationId: r.closeObservationId,
        openPrice: r.openPrice, closePrice: r.closePrice,
        outcome: r.outcome, voidReason: r.voidReason,
        resolvedAt: dt(r.resolvedAt), settledAt: dt(r.settledAt),
        createdAt: new Date(r.createdAt),
      },
    });
  },
  async patch(id, fields) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = ROUND_PATCHABLE[k];
      if (!coerce) throw new Error(`roundStore.patch: '${k}' is not a patchable column`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    await pc().upDownRound.update({ where: { id }, data });
  },
};

const prismaObservations: ObservationStore = {
  async get(id) { const r = await pc().upDownObservation.findUnique({ where: { id } }); return r ? toObservation(r) : null; },
  async find(assetId, boundaryAt) {
    const r = await pc().upDownObservation.findUnique({
      where: { assetId_boundaryAt: { assetId, boundaryAt: new Date(boundaryAt) } },
    });
    return r ? toObservation(r) : null;
  },
  async ensure(assetId, boundaryAt) {
    const found = await prismaObservations.find(assetId, boundaryAt);
    if (found) return found;
    try {
      const r = await pc().upDownObservation.create({
        data: { assetId, boundaryAt: new Date(boundaryAt), state: "PENDING" },
      });
      return toObservation(r);
    } catch (e) {
      // Lost the race — another chain created the row for this same boundary between
      // our find and our create. That is the DESIGNED behaviour of the unique index,
      // not an error: re-read and use theirs, so both callers share one observation.
      if (!isUniqueViolation(e)) throw e;
      const again = await prismaObservations.find(assetId, boundaryAt);
      if (!again) throw e; // genuinely unexpected — do not paper over it
      return again;
    }
  },
  async confirm(id, fields) {
    // CLAIM THE ROW: `updateMany` with state in the WHERE, so a second confirmation
    // cannot overwrite a price that has already settled money. `count` tells us
    // whether we won.
    const { count } = await pc().upDownObservation.updateMany({
      where: { id, state: "PENDING" },
      data: {
        state: "CONFIRMED",
        price: fields.price,
        sourceUrl: fields.sourceUrl,
        sourceQuotedAt: new Date(fields.sourceQuotedAt),
        evidence: fields.evidence,
        confidence: fields.confidence,
        model: fields.model,
        rawHash: fields.rawHash,
        confirmedAt: new Date(),
      },
    });
    return count === 1;
  },
  async recordAttempt(id, failReason) {
    await pc().upDownObservation.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), failReason },
    });
  },
  async fail(id, failReason) {
    const { count } = await pc().upDownObservation.updateMany({
      where: { id, state: "PENDING" },
      data: { state: "FAILED", failReason },
    });
    return count === 1;
  },
  async list(opts) {
    const rows = await pc().upDownObservation.findMany({
      where: { ...(opts?.assetId ? { assetId: opts.assetId } : {}), ...(opts?.state ? { state: opts.state } : {}) },
      orderBy: { boundaryAt: "desc" },
      ...(opts?.limit != null ? { take: opts.limit } : {}),
    });
    return rows.map(toObservation);
  },
};

// ---------------------------------------------------------------------------
// Exports — Prisma whenever a database is configured (always in production)
// ---------------------------------------------------------------------------

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

export const assetStore: AssetStore = usePrisma ? prismaAssets : memoryAssets;
export const chainStore: ChainStore = usePrisma ? prismaChains : memoryChains;
export const roundStore: RoundStore = usePrisma ? prismaRounds : memoryRounds;
export const observationStore: ObservationStore = usePrisma ? prismaObservations : memoryObservations;

/** Test helper — wipe the in-memory stores between cases. No-op against Prisma, so a
 *  test that forgets to guard it cannot truncate a real database. */
export function __resetUpDownMemoryStores(): void {
  if (usePrisma) return;
  memAssets.clear(); memChains.clear(); memRounds.clear(); memObs.clear();
}

/** Exported for the service layer's transaction-aware paths (Phase 3). */
export type UpDownTx = Prisma.TransactionClient;
