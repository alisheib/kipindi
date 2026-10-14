/**
 * ⭐ THE DESK'S OWN FRESH PRICE (N4 — Ali, 2026-10-14: "Yes, fetch fresh prices"; amends 04 A15 and PLAN I2).
 *
 * 🔴 WHY. Measured on production over the seven days to 2026-10-14: 669 Up & Down rounds were planned and then lost
 * at fire as UD_STALE_PRICE. The desk could read only prices somebody else had paid for — the chart's cache, which a
 * PLAYER warms by opening the chart, and the oracle's reading at each round's boundary (published ~91 s after it) —
 * so between boundaries, with no chart open, its price aged past `UD_VENDOR_BAR_MAX_AGE_SEC` and every decision on it
 * was refused. N3 times an opener to the price it has; this gives the desk a price of its own.
 *
 * WHAT IT DOES — on the engine's leader only (the planner's lease), every `DESK_PRICE_TICK_MS`:
 *  · nothing with no TwelveData key, with a credit ceiling of 0, or while the master switch is OFF;
 *  · the assets it prices are those of RUNNING chains that at least one ACTIVE account's rules cover with an automatic
 *    mode on — asked of `rulesCoverTarget`, the predicate the planner itself uses, never a copy of it;
 *  · each such asset at most once per `refreshSec`: ONE /time_series call for the newest two 1-minute bars (one
 *    credit), through the chart's own fetcher, so the host gate and the row refusals are the same code;
 *  · the newest bar goes to the vendor module's `deskBars` (`publishDeskBar`), where `peekVendorBar` serves it on the
 *    same terms as every other bar: newest `t` wins, and the caller judges its age from the bar's OPEN;
 *  · every attempt counts one credit against the EAT day's ceiling, success or not; at the ceiling it stops until the
 *    next EAT day, and the desk falls back to the free sources exactly as before N4.
 *
 * ⛔ A DECISION STILL NEVER PAYS. Nothing here runs inside a decision, a hook or a bet: the refresher has its own
 * timer, and `udPriceForDecision` stays a read. A slow provider delays only this timer.
 * ⛔ THE INFORMATION EDGE IS UNCHANGED (04 A13, PLAN I2 as amended by N4). A 1-minute bar is the market price a player
 * sees on the chart; it says nothing about a result, and the closeness rule still judges it at decision and at fire.
 * ⚠️ THE CREDIT COUNT IS THIS PROCESS'S: a restart begins the day's count again. The refresh interval bounds the real
 * spend whatever the count says — at most one call per covered asset per `refreshSec` — and production runs ONE
 * container (F7), so the count and the spend are the same thing there.
 */
import {
  DESK_PRICE_DEFAULT_CREDITS_PER_DAY, DESK_PRICE_DEFAULT_REFRESH_SEC, DESK_PRICE_MAX_REFRESH_SEC, DESK_PRICE_MIN_REFRESH_SEC,
  DESK_PRICE_PLAN,
} from "@/lib/house-bot/constants";
import { eatDayKey } from "@/lib/house-bot/clock";
import { ENTRY_MODES, parseHouseBotRules, rulesCoverTarget } from "@/lib/house-bot/rules";
import { houseBotControlStore, houseBotStore } from "../house-bot-dal";
import { assetStore, chainStore, type StoredAsset } from "../updown-dal";
import { fetchVendorBars, publishDeskBar } from "../updown-terminal-vendor";
import type { EngineTicks } from "./engine";
import { loadParseContext } from "./rules-context";

export type DeskPriceConfig = {
  /** The provider key the chart already uses; none → the refresher does nothing and spends nothing. */
  apiKey: string | undefined;
  /** Credits a day, a whole number ≥ 0; 0 switches the refresher off. */
  creditsPerDay: number;
  /** The least time between two fetches of one asset. */
  refreshSec: number;
};

/**
 * The refresher's settings, from the environment.
 * ⛔ A CEILING THAT IS NOT A WHOLE NUMBER ≥ 0 SPENDS NOTHING — "abc", "-5" and "2.5" all read as 0 (off), never as the
 * default: a mistyped limit on a metered call must not turn into the larger figure.
 */
export function deskPriceConfig(env: Record<string, string | undefined> = process.env): DeskPriceConfig {
  const rawCredits = env.HOUSE_DESK_PRICE_CREDITS_PER_DAY;
  const credits = rawCredits == null || rawCredits.trim() === "" ? DESK_PRICE_DEFAULT_CREDITS_PER_DAY : Number(rawCredits.trim());
  const rawRefresh = env.HOUSE_DESK_PRICE_REFRESH_SEC;
  const refresh = rawRefresh == null || rawRefresh.trim() === "" ? DESK_PRICE_DEFAULT_REFRESH_SEC : Number(rawRefresh.trim());
  return {
    apiKey: env.TWELVEDATA_API_KEY ? env.TWELVEDATA_API_KEY : undefined,
    creditsPerDay: Number.isInteger(credits) && credits >= 0 ? credits : 0,
    refreshSec: Number.isFinite(refresh)
      ? Math.min(DESK_PRICE_MAX_REFRESH_SEC, Math.max(DESK_PRICE_MIN_REFRESH_SEC, Math.round(refresh)))
      : DESK_PRICE_DEFAULT_REFRESH_SEC,
  };
}

type AssetFacts = { lastAttemptMs: number | null; lastOkMs: number | null; lastBarT: number | null; lastFailed: boolean };
type DeskPriceState = { day: string; used: number; ceilingDay: string | null; lastPassMs: number | null; assets: Map<string, AssetFacts> };

/** One record per process, kept on `globalThis` so a re-imported module (dev, tests) still counts one day once. */
function deskState(): DeskPriceState {
  const g = globalThis as unknown as { __kpHouseDeskPrice?: DeskPriceState };
  return (g.__kpHouseDeskPrice ??= { day: "", used: 0, ceilingDay: null, lastPassMs: null, assets: new Map() });
}

/** Test hook — a fresh day, no credits used, no asset facts. */
export function __resetDeskPriceForTests(): void {
  const s = deskState();
  s.day = ""; s.used = 0; s.ceilingDay = null; s.lastPassMs = null; s.assets.clear();
}

const assetIdOf = (chainKey: string) => chainKey.slice(0, chainKey.lastIndexOf(":"));

/**
 * The assets the desk needs a price for: those of RUNNING chains that an ACTIVE account, whose rules parse, covers in
 * at least one automatic mode. An account whose rules do not parse covers nothing — the planner skips it the same way.
 */
export async function deskPricedAssets(): Promise<StoredAsset[]> {
  const running = await chainStore.running();
  if (running.length === 0) return [];
  const keys = [...new Set(running.map((c) => `${c.assetId}:${c.durationMinutes}`))];
  const ctx = await loadParseContext();
  const covered = new Set<string>();
  for (const bot of await houseBotStore.listNonRemoved()) {
    if (bot.status !== "ACTIVE") continue;
    const parsed = parseHouseBotRules(bot.rules, ctx);
    if (!parsed.ok) continue;
    for (const key of keys) {
      if (covered.has(key)) continue;
      if (ENTRY_MODES.some((mode) => rulesCoverTarget(parsed.rules, { product: "UPDOWN", chainKey: key }, mode))) covered.add(key);
    }
  }
  const ids = [...new Set([...covered].map(assetIdOf))].sort();
  const assets = await Promise.all(ids.map((id) => assetStore.get(id)));
  return assets.filter((a): a is StoredAsset => a != null && a.enabled);
}

export type DeskPricePassResult = {
  status: "no-key" | "off" | "switch-off" | "no-assets" | "ran";
  /** Assets fetched this pass, with a bar kept. */
  fetched: string[];
  /** Assets fetched this pass that returned no usable bar (each still cost its credit). */
  failed: string[];
  /** Assets fetched less than `refreshSec` ago, left alone. */
  notDue: string[];
  /** The day's ceiling stopped this pass before every due asset was fetched. */
  ceiling: boolean;
  creditsUsedToday: number;
};

export type DeskPriceDeps = { nowMs?: number; config?: DeskPriceConfig; fetchImpl?: typeof fetch };

/** One refresher pass. Never throws on a provider fault (the fetcher answers null); a store fault propagates to the tick. */
export async function deskPricePass(deps: DeskPriceDeps = {}): Promise<DeskPricePassResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const cfg = deps.config ?? deskPriceConfig();
  const s = deskState();
  const day = eatDayKey(nowMs);
  if (s.day !== day) { s.day = day; s.used = 0; }
  s.lastPassMs = nowMs;
  const result: DeskPricePassResult = { status: "ran", fetched: [], failed: [], notDue: [], ceiling: false, creditsUsedToday: s.used };
  if (!cfg.apiKey) return { ...result, status: "no-key" };
  if (cfg.creditsPerDay <= 0) return { ...result, status: "off" };
  if (!(await houseBotControlStore.get()).enabled) return { ...result, status: "switch-off" };
  const assets = await deskPricedAssets();
  if (assets.length === 0) return { ...result, status: "no-assets" };
  for (const asset of assets) {
    const facts = s.assets.get(asset.id) ?? { lastAttemptMs: null, lastOkMs: null, lastBarT: null, lastFailed: false };
    if (facts.lastAttemptMs != null && nowMs - facts.lastAttemptMs < cfg.refreshSec * 1000) {
      result.notDue.push(asset.id);
      continue;
    }
    if (s.used >= cfg.creditsPerDay) {
      result.ceiling = true;
      s.ceilingDay = day;
      break;
    }
    s.used += 1;
    facts.lastAttemptMs = nowMs;
    const bars = await fetchVendorBars(asset, DESK_PRICE_PLAN, cfg.apiKey, deps.fetchImpl ?? fetch);
    const newest = bars && bars.length > 0 ? bars[bars.length - 1] : null;
    if (newest) {
      publishDeskBar(asset.id, newest);
      facts.lastOkMs = nowMs;
      facts.lastBarT = newest.t;
      facts.lastFailed = false;
      result.fetched.push(asset.id);
    } else {
      facts.lastFailed = true;
      result.failed.push(asset.id);
    }
    s.assets.set(asset.id, facts);
  }
  return { ...result, creditsUsedToday: s.used };
}

export type DeskPriceHealth = {
  /** A key is set and the ceiling is above 0. */
  configured: boolean;
  creditsPerDay: number;
  creditsUsedToday: number;
  ceilingReachedToday: boolean;
  refreshSec: number;
  lastPassAt: string | null;
  assets: { assetId: string; lastOkAt: string | null; lastBarAt: string | null; failing: boolean }[];
};

/** THIS process's refresher, for the owner's engine card. No key, no URL, no provider message. */
export function deskPriceHealth(nowMs: number = Date.now(), cfg: DeskPriceConfig = deskPriceConfig()): DeskPriceHealth {
  const s = deskState();
  const today = eatDayKey(nowMs);
  const iso = (v: number | null) => (v == null ? null : new Date(v).toISOString());
  return {
    configured: Boolean(cfg.apiKey) && cfg.creditsPerDay > 0,
    creditsPerDay: cfg.creditsPerDay,
    creditsUsedToday: s.day === today ? s.used : 0,
    ceilingReachedToday: s.ceilingDay === today,
    refreshSec: cfg.refreshSec,
    lastPassAt: iso(s.lastPassMs),
    assets: [...s.assets.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([assetId, f]) => ({ assetId, lastOkAt: iso(f.lastOkMs), lastBarAt: iso(f.lastBarT), failing: f.lastFailed })),
  };
}

/** The tick the engine runs on its own timer, only while this instance holds the planner's lease. */
export function deskPriceTicks(): Pick<EngineTicks, "deskPriceTick"> {
  return {
    deskPriceTick: async () => {
      await deskPricePass();
    },
  };
}
