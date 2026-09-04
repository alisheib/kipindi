/**
 * The terminal chart's VENDOR-BARS tier (CHART-SPRINT-2; Ali, 2026-09-04:
 * "you have full TwelveData API access… covers the widest range possible with
 * optimal querying").
 *
 * The oracle's confirmed reads are the MONEY truth — rounds settle on them and
 * nothing here touches that. But the vendor's own /time_series bars are the
 * market's real OHLC at native resolutions, and charting them is what every
 * trading product does. This module fetches them SERVER-side so the vendor
 * never reaches the player wire (E-53: the client sees generic series data and
 * the public source-class label, nothing more).
 *
 * ⚠️ DOCTRINE INHERITED FROM `TwelveDataBarFeed` (updown-feed.ts), not
 * re-invented:
 *  · the asset's stored priceSourceUrl HOST is the security boundary; the
 *    PATH is provider detail this module forces to /time_series;
 *  · `timezone=UTC` is pinned — the provider defaults to Exchange time and
 *    the difference is silent on crypto and 600 minutes on gold (E-71);
 *  · a garbage bar (non-finite, h < max(o,c), l > min(o,c)) is REFUSED row by
 *    row — provider faults look like decimal shifts, not volatility.
 *
 * OPTIMAL QUERYING (verified against the provider's docs, 2026-09-04):
 * /time_series costs 1 credit PER CALL regardless of outputsize — so each
 * range is ONE call sized to its whole window, cached in-process for
 * CACHE_TTL_MS across every viewer, behind the route's own CDN cache. Peak
 * spend is bounded by (assets × ranges viewed) / 30s, independent of players.
 *
 * `fetchImpl` is injectable so the unit suite drives this against fixtures —
 * the network path itself is proven by the live probes after deploy.
 */
import type { StoredAsset } from "./updown-dal";
import type { TerminalRange } from "./updown-board";
// The money path's own use-time host gate — the SAME defence-in-depth the
// settlement reader carries (re-sign panel: a doc that names a check the code
// does not perform is the checks-that-lie class; now the code performs it).
import { hostMatchesDomain } from "./updown-feed";

export type VendorBar = { t: number; o: number; h: number; l: number; c: number; v: number | null };

/** One call = one credit = the whole window at its native resolution. */
export const VENDOR_PLAN: Record<TerminalRange, { interval: string; outputsize: number; intervalMs: number }> = {
  "15M": { interval: "1min", outputsize: 16, intervalMs: 60_000 },
  "30M": { interval: "1min", outputsize: 31, intervalMs: 60_000 },
  "1H": { interval: "1min", outputsize: 61, intervalMs: 60_000 },
  "6H": { interval: "5min", outputsize: 73, intervalMs: 5 * 60_000 },
  "12H": { interval: "5min", outputsize: 145, intervalMs: 5 * 60_000 },
  "24H": { interval: "15min", outputsize: 97, intervalMs: 15 * 60_000 },
  "7D": { interval: "1h", outputsize: 169, intervalMs: 3600_000 },
};

const CACHE_TTL_MS = 30_000;
/** Failure TTL — shorter, so recovery is quick but an incident is one billable
 *  call per window per TTL, not one per viewer. ⚠️ Both bounds are PER-PROCESS;
 *  they multiply under the multi-container programme. */
const FAIL_TTL_MS = 15_000;
const cache = new Map<string, { at: number; bars: VendorBar[] | null }>();

/** Provider rows are "YYYY-MM-DD HH:MM:SS" in the REQUESTED zone (UTC, pinned). */
function parseUtc(dt: string): number {
  return Date.parse(dt.includes("T") ? `${dt}Z` : `${dt.replace(" ", "T")}Z`);
}

/**
 * The window's real vendor bars, oldest→newest — or null (missing key, host
 * not the trusted one, provider refusal/garbage), and the caller falls back to
 * the confirmed-reads tier. Never throws.
 */
export async function vendorBarsFor(
  asset: Pick<StoredAsset, "id" | "symbol" | "priceSourceUrl" | "sourceDomain">,
  range: TerminalRange,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<VendorBar[] | null> {
  if (!apiKey) return null;
  const plan = VENDOR_PLAN[range];
  if (!plan) return null;
  // Use-time trust recheck — the settlement reader's own gate, applied to the
  // second path that carries this credential.
  if (!hostMatchesDomain(asset.priceSourceUrl, asset.sourceDomain)) return null;

  const key = `${asset.id}:${range}`;
  const hit = cache.get(key);
  // A cached NULL is a real answer too: during a vendor incident the credit
  // bound must hold (one billable failure per TTL, everyone else falls to the
  // confirmed-reads tier instantly, no 8s timeout queue).
  if (hit && Date.now() - hit.at < (hit.bars ? CACHE_TTL_MS : FAIL_TTL_MS)) return hit.bars;

  let url: URL;
  try {
    url = new URL(asset.priceSourceUrl);
  } catch {
    return null;
  }
  url.pathname = "/time_series";
  url.search = "";
  url.searchParams.set("symbol", asset.symbol);
  url.searchParams.set("interval", plan.interval);
  url.searchParams.set("outputsize", String(plan.outputsize));
  url.searchParams.set("timezone", "UTC"); // E-71 — never the provider's silent Exchange default
  url.searchParams.set("apikey", apiKey);

  const fail = (): null => { cache.set(key, { at: Date.now(), bars: null }); return null; };
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fail();
    const body = (await res.json()) as { values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }> };
    if (!Array.isArray(body.values) || body.values.length === 0) return fail();
    const bars: VendorBar[] = [];
    for (const v of body.values) {
      const t = parseUtc(v.datetime);
      const o = Number(v.open), h = Number(v.high), l = Number(v.low), c = Number(v.close);
      // Row-level refusal: a provider fault (decimal shift, zero, swapped
      // fields) must never reach a money surface as a candle.
      if (![t, o, h, l, c].every(Number.isFinite)) continue;
      if (h < Math.max(o, c) || l > Math.min(o, c)) continue;
      const vol = v.volume != null ? Number(v.volume) : NaN;
      bars.push({ t, o, h, l, c, v: Number.isFinite(vol) && vol >= 0 ? vol : null });
    }
    if (bars.length === 0) return fail();
    bars.sort((a, b) => a.t - b.t);
    cache.set(key, { at: Date.now(), bars });
    return bars;
  } catch {
    return fail();
  }
}

/** Test hook — the suite clears the cache between fixtures. */
export function __clearVendorCacheForTests(): void {
  cache.clear();
}
