/**
 * Up & Down configuration — the asset registry, the chain registry, and the
 * product-level thresholds.
 *
 * ⛔ ONE CONTROL, ONE PLACE. Everything here is edited from `/admin/updown/*` and
 * NOWHERE else. In particular it is NOT mirrored into `/admin/config` (which owns the
 * long-form poll rates) and the AI pause switch is NOT here — that lives in the
 * AI-toolkit dropdown, the single home for every AI switch on the platform.
 *
 * What this module is careful about, and why:
 *
 *  1. THE SOURCE GATE. An asset's price source must be an ENABLED trusted source in
 *     the existing registry (`source-registry.ts`). There is no second allowlist. A
 *     round captures its source link at generation and resolves against that same
 *     link, so an untrusted domain here would put an unverifiable source behind real
 *     money.
 *
 *  2. THE RATE PROFILE runs through the SAME validator as global config
 *     (`validateRateConfig`), so the winner-floor guardrail applies identically. A
 *     chain cannot be configured with rates under which a correct call loses money.
 *
 *  3. THE GRID IS DERIVED, NEVER ACCUMULATED. `boundaryAfter` computes
 *     `anchor + k·duration` from an instant, so a restart, a missed fire or a slow
 *     tick cannot drift the schedule. Nothing increments a "next boundary" cursor.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { loadConfig, saveConfig } from "./config-store";
import { isSourceTrusted, normalizeDomain } from "./source-registry";
import { validateRateConfig } from "./market-config";
import { assetStore, chainStore, type StoredAsset, type StoredChain, type ChainState } from "./updown-dal";
import type { RateConfig } from "./market-config";
import type { MarketCategory } from "./market-service";

// ---------------------------------------------------------------------------
// Product-level configuration
// ---------------------------------------------------------------------------

const UPDOWN_CONFIG_KEY = "updown.config";

/** The durations a chain may run. Not free-form: each duration is a separate chain
 *  with its own timer and its own liquidity, and the 5-minute grid is what lets a
 *  15- and 30-minute round share observations with the 5-minute ones. A 7-minute
 *  duration would not land on the grid and would break that sharing. */
export const ALLOWED_DURATIONS = [5, 15, 30] as const;
export type Duration = (typeof ALLOWED_DURATIONS)[number];

export type UpDownConfig = {
  /**
   * How far the source's OWN quoted timestamp may sit from the grid boundary before
   * the reading is refused. This is the honesty control: an LLM web-search cannot
   * report the price at an exact second, so we bound how stale a reading may be and
   * show the source's time rather than pretending it is ours.
   */
  maxStalenessSeconds: number;
  /** Minimum AI confidence (0-100) to accept a price observation. */
  confidenceThreshold: number;
  /** Attempts before a boundary is declared FAILED and its rounds VOID + refund. */
  maxObservationAttempts: number;
  /** Backoff between attempts, in seconds, index-matched to the attempt number. */
  retryBackoffSeconds: number[];
  /** Default stake bounds when a chain does not override them. */
  defaultMinStake: number;
  defaultMaxStake: number;
  /**
   * The fee profile a NEW chain gets by default. Ali, 2026-07-24:
   * `capped-commission` at 13% of the pool, ceiling ⅓ of the smaller side —
   * exactly TZS 1,300 on a balanced TZS 10,000 pool, using maths that already
   * exists and is already tested. Outcome-NEUTRAL, unlike the `loser-share` model
   * the long-form polls use, and the ceiling preserves the winner floor.
   *
   * Frozen onto each round at creation, so the two models never mix.
   */
  defaultRateProfile: Partial<RateConfig>;
};

export const DEFAULT_UPDOWN_CONFIG: UpDownConfig = {
  maxStalenessSeconds: 90,
  confidenceThreshold: 85,
  maxObservationAttempts: 4,
  retryBackoffSeconds: [15, 45, 120],
  defaultMinStake: 100,
  defaultMaxStake: 100_000,
  defaultRateProfile: {
    feeModel: "capped-commission",
    commissionRate: 0.13,
    feeCeilingRate: 1 / 3,
    // Display-only: the "× 1.4 est." headline on the Up/Down buttons. It is an
    // ESTIMATE, never fixed odds — the card carries the qualifier that says so.
    estimatedWinningsRate: 0.4,
    showEstimatedWinnings: true,
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_CONFIG: UpDownConfig | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_CONFIG_HYDRATED: boolean | undefined;
}

function cfgStore(): UpDownConfig {
  return (globalThis.__50PICK_UPDOWN_CONFIG ??= { ...DEFAULT_UPDOWN_CONFIG });
}

async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED) return;
  globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED = true;
  const stored = await loadConfig<Partial<UpDownConfig>>(UPDOWN_CONFIG_KEY);
  // Merge OVER the defaults, so a newly-added field gets its default rather than
  // undefined on a deployment whose persisted blob predates it.
  if (stored) globalThis.__50PICK_UPDOWN_CONFIG = { ...DEFAULT_UPDOWN_CONFIG, ...stored };
}

export async function getUpDownConfig(): Promise<UpDownConfig> {
  await ensureHydrated();
  return { ...cfgStore() };
}

export async function setUpDownConfig(
  updates: Partial<UpDownConfig>,
  officerId: string,
): Promise<{ ok: true; config: UpDownConfig; warn?: string } | { ok: false; error: string }> {
  await ensureHydrated();

  if (updates.maxStalenessSeconds !== undefined) {
    const s = updates.maxStalenessSeconds;
    // Upper bound is not arbitrary: at 300s a 5-minute round could settle against a
    // reading taken a whole round away from its own boundary, which is no longer a
    // price "at" that instant in any meaningful sense.
    if (!Number.isFinite(s) || s < 5 || s > 300) {
      return { ok: false, error: "Staleness window must be 5-300 seconds. Above 300s a 5-minute round could settle on a reading a whole round old." };
    }
  }
  if (updates.confidenceThreshold !== undefined) {
    const c = updates.confidenceThreshold;
    if (!Number.isFinite(c) || c < 50 || c > 100) {
      return { ok: false, error: "Confidence threshold must be 50-100." };
    }
  }
  if (updates.maxObservationAttempts !== undefined) {
    const a = updates.maxObservationAttempts;
    if (!Number.isFinite(a) || a < 1 || a > 10) {
      return { ok: false, error: "Observation attempts must be 1-10." };
    }
  }
  if (updates.defaultMinStake !== undefined || updates.defaultMaxStake !== undefined) {
    const lo = updates.defaultMinStake ?? cfgStore().defaultMinStake;
    const hi = updates.defaultMaxStake ?? cfgStore().defaultMaxStake;
    if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
    if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };
  }

  let warn: string | undefined;
  if (updates.defaultRateProfile !== undefined) {
    // THE SAME validator global config uses — including the winner-floor guardrail.
    const v = validateRateConfig(updates.defaultRateProfile);
    if (!v.ok) return { ok: false, error: v.reason };
    warn = v.warn;
  }

  const before = { ...cfgStore() };
  globalThis.__50PICK_UPDOWN_CONFIG = { ...before, ...updates };
  void saveConfig(UPDOWN_CONFIG_KEY, cfgStore());
  audit({
    category: "ADMIN",
    action: "updown.config.updated",
    actorId: officerId,
    targetType: "UpDownConfig",
    targetId: "global",
    payload: { before, after: cfgStore(), changes: updates, warn: warn ?? null },
  });
  return { ok: true, config: { ...cfgStore() }, warn };
}

// ---------------------------------------------------------------------------
// The grid — pure, so it is exhaustively testable without a clock or a timer
// ---------------------------------------------------------------------------

/**
 * The first grid boundary STRICTLY AFTER `fromMs`.
 *
 * Derived as `anchor + k·duration`, never accumulated from a previous value, so a
 * restart, a missed fire or a slow tick cannot drift the grid. Given the same anchor
 * and duration, every instance and every restart computes the same boundaries —
 * which is what lets a 5-, 15- and 30-minute chain agree on the instants they share.
 */
export function boundaryAfter(anchorMs: number, durationMinutes: number, fromMs: number): number {
  const step = durationMinutes * 60_000;
  if (step <= 0) throw new Error("boundaryAfter: duration must be positive");
  // Math.floor (not trunc) so a `fromMs` BEFORE the anchor still lands correctly on
  // a negative k rather than skipping forward a whole step.
  const k = Math.floor((fromMs - anchorMs) / step) + 1;
  return anchorMs + k * step;
}

/** The grid boundary at or before `atMs` — i.e. the start of the round covering it. */
export function boundaryAtOrBefore(anchorMs: number, durationMinutes: number, atMs: number): number {
  const step = durationMinutes * 60_000;
  if (step <= 0) throw new Error("boundaryAtOrBefore: duration must be positive");
  return anchorMs + Math.floor((atMs - anchorMs) / step) * step;
}

/**
 * A clean grid anchor: the next whole 5-minute mark at or after `fromMs`, on the
 * minute, with seconds and milliseconds zeroed.
 *
 * Anchoring every chain to the 5-minute grid is what makes observation sharing work
 * — a 15- and a 30-minute round only land on the same instants as the 5-minute
 * rounds if all three are anchored to the same lattice.
 */
export function cleanGridAnchor(fromMs: number): number {
  const FIVE_MIN = 5 * 60_000;
  return Math.ceil(fromMs / FIVE_MIN) * FIVE_MIN;
}

// ---------------------------------------------------------------------------
// Asset registry
// ---------------------------------------------------------------------------

export type AssetInput = {
  key: string;
  symbol: string;
  nameEn: string;
  nameSw: string;
  nameZh?: string | null;
  iconKey: string;
  priceSourceUrl: string;
  category?: MarketCategory;
  decimals?: number;
  minMoveTicks?: number;
  sortOrder?: number;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function validateAsset(input: AssetInput): Promise<{ ok: true; domain: string } | { ok: false; error: string }> {
  const key = (input.key ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(key)) {
    return { ok: false, error: "Asset key must be 2-12 characters, A-Z and 0-9 only (e.g. XAU)." };
  }
  for (const [label, v] of [["English name", input.nameEn], ["Swahili name", input.nameSw], ["symbol", input.symbol], ["icon", input.iconKey]] as const) {
    if (!v || !String(v).trim()) return { ok: false, error: `Asset ${label} is required.` };
  }
  const decimals = input.decimals ?? 2;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
    return { ok: false, error: "Decimals must be a whole number 0-8." };
  }
  const ticks = input.minMoveTicks ?? 1;
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 10_000) {
    return { ok: false, error: "Minimum move must be a whole number of ticks, 1-10000." };
  }

  // THE SOURCE GATE. One allowlist on the platform, not two.
  let domain: string;
  try {
    domain = normalizeDomain(new URL(input.priceSourceUrl).hostname);
  } catch {
    return { ok: false, error: "Price source must be a valid URL." };
  }
  const category = (input.category ?? "macro") as MarketCategory;
  const trusted = await isSourceTrusted(input.priceSourceUrl, category);
  if (!trusted.ok) {
    return {
      ok: false,
      error: `${trusted.reason}. Add the domain at /admin/sources under "${category}" and enable it first — a round resolves against this exact link, so it must be an approved source.`,
    };
  }
  return { ok: true, domain };
}

export async function listAssets(opts?: { enabledOnly?: boolean }): Promise<StoredAsset[]> {
  return assetStore.list(opts);
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  return assetStore.get(id);
}

export async function createAsset(input: AssetInput, officerId: string): Promise<ServiceResult<StoredAsset>> {
  const v = await validateAsset(input);
  if (!v.ok) return { ok: false, error: v.error };
  const key = input.key.trim().toUpperCase();
  if (await assetStore.getByKey(key)) {
    return { ok: false, error: `Asset "${key}" already exists.` };
  }
  const now = new Date().toISOString();
  const row: StoredAsset = {
    id: `uda_${randomId(8)}`,
    key,
    symbol: input.symbol.trim(),
    nameEn: input.nameEn.trim(),
    nameSw: input.nameSw.trim(),
    nameZh: input.nameZh?.trim() || null,
    iconKey: input.iconKey.trim(),
    priceSourceUrl: input.priceSourceUrl.trim(),
    sourceDomain: v.domain,
    category: input.category ?? "macro",
    decimals: input.decimals ?? 2,
    minMoveTicks: input.minMoveTicks ?? 1,
    // NEW ASSETS START DISABLED. Enabling is a separate, audited act — creating a row
    // must never be enough to put an asset in front of real money.
    enabled: false,
    sortOrder: input.sortOrder ?? 0,
    createdBy: officerId,
    createdAt: now,
    updatedAt: now,
  };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.asset.created", actorId: officerId,
    targetType: "UpDownAsset", targetId: row.id,
    payload: { key: row.key, symbol: row.symbol, priceSourceUrl: row.priceSourceUrl, sourceDomain: row.sourceDomain, decimals: row.decimals, minMoveTicks: row.minMoveTicks },
  });
  return { ok: true, data: row };
}

export async function updateAsset(id: string, input: Partial<AssetInput>, officerId: string): Promise<ServiceResult<StoredAsset>> {
  const cur = await assetStore.get(id);
  if (!cur) return { ok: false, error: "Asset not found." };
  const merged: AssetInput = {
    key: input.key ?? cur.key,
    symbol: input.symbol ?? cur.symbol,
    nameEn: input.nameEn ?? cur.nameEn,
    nameSw: input.nameSw ?? cur.nameSw,
    nameZh: input.nameZh !== undefined ? input.nameZh : cur.nameZh,
    iconKey: input.iconKey ?? cur.iconKey,
    priceSourceUrl: input.priceSourceUrl ?? cur.priceSourceUrl,
    category: (input.category ?? cur.category) as MarketCategory,
    decimals: input.decimals ?? cur.decimals,
    minMoveTicks: input.minMoveTicks ?? cur.minMoveTicks,
    sortOrder: input.sortOrder ?? cur.sortOrder,
  };
  const v = await validateAsset(merged);
  if (!v.ok) return { ok: false, error: v.error };
  // The key is the identity reports group by, so a rename must not collide.
  const newKey = merged.key.trim().toUpperCase();
  if (newKey !== cur.key) {
    const clash = await assetStore.getByKey(newKey);
    if (clash && clash.id !== id) return { ok: false, error: `Asset "${newKey}" already exists.` };
  }
  const row: StoredAsset = {
    ...cur,
    key: newKey,
    symbol: merged.symbol.trim(),
    nameEn: merged.nameEn.trim(),
    nameSw: merged.nameSw.trim(),
    nameZh: merged.nameZh?.trim() || null,
    iconKey: merged.iconKey.trim(),
    priceSourceUrl: merged.priceSourceUrl.trim(),
    sourceDomain: v.domain,
    category: merged.category ?? "macro",
    decimals: merged.decimals ?? 2,
    minMoveTicks: merged.minMoveTicks ?? 1,
    sortOrder: merged.sortOrder ?? 0,
    updatedAt: new Date().toISOString(),
  };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.asset.updated", actorId: officerId,
    targetType: "UpDownAsset", targetId: id,
    payload: { before: cur, after: row },
  });
  return { ok: true, data: row };
}

export async function setAssetEnabled(id: string, enabled: boolean, officerId: string): Promise<ServiceResult<StoredAsset>> {
  const cur = await assetStore.get(id);
  if (!cur) return { ok: false, error: "Asset not found." };
  if (enabled) {
    // Re-check the source at ENABLE time, not just at create time: a trusted source
    // can be disabled at /admin/sources after the asset was created, and enabling an
    // asset whose source is no longer approved would put an unverifiable link behind
    // real money.
    const trusted = await isSourceTrusted(cur.priceSourceUrl, cur.category as MarketCategory);
    if (!trusted.ok) {
      return { ok: false, error: `Cannot enable: ${trusted.reason}. Re-approve the source at /admin/sources first.` };
    }
  } else {
    // Disabling an asset must not silently strand running chains. Refuse, and make
    // the operator stop them explicitly — stopping a chain is itself an audited act.
    const running = (await chainStore.list({ assetId: id })).filter((c) => c.state === "RUNNING");
    if (running.length > 0) {
      return { ok: false, error: `Stop this asset's ${running.length} running chain(s) before disabling it.` };
    }
  }
  const row = { ...cur, enabled, updatedAt: new Date().toISOString() };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: enabled ? "updown.asset.enabled" : "updown.asset.disabled",
    actorId: officerId, targetType: "UpDownAsset", targetId: id,
    payload: { key: cur.key },
  });
  return { ok: true, data: row };
}

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

export type ChainInput = {
  assetId: string;
  durationMinutes: Duration;
  minStake?: number | null;
  maxStake?: number | null;
  rateProfile?: Partial<RateConfig> | null;
};

export async function listChains(opts?: { assetId?: string; state?: ChainState }): Promise<StoredChain[]> {
  return chainStore.list(opts);
}

export async function getChain(id: string): Promise<StoredChain | null> {
  return chainStore.get(id);
}

export async function createChain(input: ChainInput, officerId: string): Promise<ServiceResult<StoredChain>> {
  const asset = await assetStore.get(input.assetId);
  if (!asset) return { ok: false, error: "Asset not found." };
  if (!ALLOWED_DURATIONS.includes(input.durationMinutes)) {
    return { ok: false, error: `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes — other values would not land on the 5-minute grid, which is what lets rounds share price observations.` };
  }
  const existing = (await chainStore.list({ assetId: input.assetId })).find((c) => c.durationMinutes === input.durationMinutes);
  if (existing) return { ok: false, error: `${asset.key} already has a ${input.durationMinutes}-minute chain.` };

  const cfg = await getUpDownConfig();
  const lo = input.minStake ?? cfg.defaultMinStake;
  const hi = input.maxStake ?? cfg.defaultMaxStake;
  if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
  if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };

  const profile = input.rateProfile ?? cfg.defaultRateProfile;
  const v = validateRateConfig(profile);
  if (!v.ok) return { ok: false, error: v.reason };

  const now = new Date().toISOString();
  const row: StoredChain = {
    id: `udc_${randomId(8)}`,
    assetId: input.assetId,
    durationMinutes: input.durationMinutes,
    // NEW CHAINS START STOPPED. Creating a chain must never start emitting rounds —
    // starting is a separate, audited act, and it is the first rung of the rollback
    // ladder in the other direction too.
    state: "STOPPED",
    gridAnchorAt: new Date(cleanGridAnchor(Date.now())).toISOString(),
    nextBoundaryAt: null,
    currentRoundId: null,
    minStake: input.minStake ?? null,
    maxStake: input.maxStake ?? null,
    rateProfile: profile as Record<string, unknown>,
    createdBy: officerId,
    createdAt: now,
    updatedAt: now,
  };
  await chainStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.chain.created", actorId: officerId,
    targetType: "UpDownChain", targetId: row.id,
    payload: { assetKey: asset.key, durationMinutes: row.durationMinutes, rateProfile: profile, minStake: row.minStake, maxStake: row.maxStake, warn: v.warn ?? null },
  });
  return { ok: true, data: row };
}

export async function updateChain(
  id: string,
  updates: { minStake?: number | null; maxStake?: number | null; rateProfile?: Partial<RateConfig> | null },
  officerId: string,
): Promise<ServiceResult<StoredChain>> {
  const cur = await chainStore.get(id);
  if (!cur) return { ok: false, error: "Chain not found." };

  const cfg = await getUpDownConfig();
  const lo = updates.minStake !== undefined ? (updates.minStake ?? cfg.defaultMinStake) : (cur.minStake ?? cfg.defaultMinStake);
  const hi = updates.maxStake !== undefined ? (updates.maxStake ?? cfg.defaultMaxStake) : (cur.maxStake ?? cfg.defaultMaxStake);
  if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
  if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };

  const patch: Partial<StoredChain> = {};
  if (updates.minStake !== undefined) patch.minStake = updates.minStake;
  if (updates.maxStake !== undefined) patch.maxStake = updates.maxStake;
  if (updates.rateProfile !== undefined) {
    const profile = updates.rateProfile ?? cfg.defaultRateProfile;
    const v = validateRateConfig(profile);
    if (!v.ok) return { ok: false, error: v.reason };
    patch.rateProfile = profile as Record<string, unknown>;
  }
  await chainStore.patch(id, patch);
  audit({
    category: "ADMIN", action: "updown.chain.updated", actorId: officerId,
    targetType: "UpDownChain", targetId: id,
    // A rate change here reprices FUTURE rounds only — every round already created
    // carries its own frozen snapshot. Recording both sides makes that provable.
    payload: { before: { minStake: cur.minStake, maxStake: cur.maxStake, rateProfile: cur.rateProfile }, changes: patch, note: "Affects FUTURE rounds only — existing rounds keep the rates frozen onto them at creation." },
  });
  const after = await chainStore.get(id);
  return after ? { ok: true, data: after } : { ok: false, error: "Chain disappeared during update." };
}

/**
 * Start / pause / stop a chain — the operator's primary control and the first rung
 * of the rollback ladder (a pause needs no deploy and lets in-flight rounds settle
 * normally).
 *
 * Arming the timer is deliberately NOT done here: this module owns configuration,
 * the scheduler owns time. `updown-scheduler.ts` reacts to the state change.
 */
export async function setChainState(id: string, state: ChainState, officerId: string): Promise<ServiceResult<StoredChain>> {
  const cur = await chainStore.get(id);
  if (!cur) return { ok: false, error: "Chain not found." };
  if (cur.state === state) return { ok: true, data: cur };

  if (state === "RUNNING") {
    const asset = await assetStore.get(cur.assetId);
    if (!asset) return { ok: false, error: "Chain's asset no longer exists." };
    if (!asset.enabled) return { ok: false, error: `Enable the asset "${asset.key}" before starting its chains.` };
    // Re-check the source at START time for the same reason as at ENABLE time: the
    // operator may have disabled the domain since. A chain that cannot resolve is a
    // chain that takes bets it must then void.
    const trusted = await isSourceTrusted(asset.priceSourceUrl, asset.category as MarketCategory);
    if (!trusted.ok) {
      return { ok: false, error: `Cannot start: ${trusted.reason}. Re-approve the source at /admin/sources first.` };
    }
  }

  const patch: Partial<StoredChain> = { state };
  if (state === "RUNNING") {
    // Re-anchor on start so a chain resumed after a long pause does not compute
    // boundaries from a stale anchor far in the past.
    const anchorMs = cleanGridAnchor(Date.now());
    patch.gridAnchorAt = new Date(anchorMs).toISOString();
    patch.nextBoundaryAt = new Date(boundaryAfter(anchorMs, cur.durationMinutes, Date.now())).toISOString();
  } else {
    // PAUSED/STOPPED: clear the next boundary so nothing reads a schedule for a
    // chain that is not running. In-flight rounds are NOT touched — they settle
    // through the normal path.
    patch.nextBoundaryAt = null;
  }
  await chainStore.patch(id, patch);
  audit({
    category: "ADMIN",
    action: state === "RUNNING" ? "updown.chain.started" : state === "PAUSED" ? "updown.chain.paused" : "updown.chain.stopped",
    actorId: officerId, targetType: "UpDownChain", targetId: id,
    payload: { from: cur.state, to: state, durationMinutes: cur.durationMinutes, note: "In-flight rounds are unaffected and settle through the normal path." },
  });
  const after = await chainStore.get(id);
  return after ? { ok: true, data: after } : { ok: false, error: "Chain disappeared during state change." };
}

/** The stake bounds in force for a chain — its own override, else the product default. */
export async function stakeBoundsFor(chain: StoredChain): Promise<{ min: number; max: number }> {
  const cfg = await getUpDownConfig();
  return { min: chain.minStake ?? cfg.defaultMinStake, max: chain.maxStake ?? cfg.defaultMaxStake };
}

/** The rate profile a chain freezes onto its rounds — its own, else the default. */
export async function rateProfileFor(chain: StoredChain): Promise<Partial<RateConfig>> {
  const cfg = await getUpDownConfig();
  return (chain.rateProfile as Partial<RateConfig> | null) ?? cfg.defaultRateProfile;
}

/** Test helper — drop the hydrated config cache so a case starts from defaults. */
export function __resetUpDownConfig(): void {
  globalThis.__50PICK_UPDOWN_CONFIG = undefined;
  globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED = undefined;
}
