/**
 * THE PRICE THE UP & DOWN CLOSENESS RULE MAY USE (04 A15; PLAN I2 as amended by A15).
 *
 * `udPriceForDecision(assetId)` answers with the freshest price a player could also see, and never pays for it:
 *   1. the terminal chart's cached 1-minute vendor bar, when it is under 120 s old — read from the cache ONLY
 *      (`peekVendorBar`); a cache miss is not a reason to call the metered vendor;
 *   2. else the latest CONFIRMED observation, when the source quoted it under 60 s ago — the public board's own
 *      "live price" read (`observationStore.list({ state: "CONFIRMED", limit: 1 })`);
 *   3. else null, and the decision is UD_STALE_PRICE.
 *
 * ⛔ AGE IS MEASURED FROM THE BAR'S OPEN. A bar still forming carries a close up to a minute newer than its `t`; counting
 * from `t` can only call a fresh price stale, never a stale one fresh.
 *
 * ⛔ A READ THAT FAILS IS NO PRICE. The observation read is caught and answers null — the decision skips; it never
 * falls back to an older price.
 */
import { observationStore } from "../updown-dal";
import { peekVendorBar } from "../updown-terminal-vendor";
import { UD_OBSERVATION_MAX_AGE_SEC, UD_VENDOR_BAR_MAX_AGE_SEC } from "@/lib/house-bot/constants";
import type { UdPrice } from "./decide";

export async function udPriceForDecision(assetId: string, opts: { nowMs?: number } = {}): Promise<UdPrice> {
  const nowMs = opts.nowMs ?? Date.now();
  const bar = peekVendorBar(assetId);
  if (bar) {
    const ageSec = Math.max(0, (nowMs - bar.t) / 1000);
    if (ageSec < UD_VENDOR_BAR_MAX_AGE_SEC) return { price: bar.c, source: "vendor_bar", ageSec: Math.floor(ageSec) };
  }
  const latest = (await observationStore.list({ assetId, state: "CONFIRMED", limit: 1 }).catch(() => []))[0];
  if (latest && latest.price != null && latest.sourceQuotedAt) {
    const ageSec = Math.max(0, (nowMs - Date.parse(latest.sourceQuotedAt)) / 1000);
    if (Number.isFinite(ageSec) && ageSec < UD_OBSERVATION_MAX_AGE_SEC) return { price: latest.price, source: "observation", ageSec: Math.floor(ageSec) };
  }
  return null;
}
