/**
 * THE FEED'S OWN TRACK RECORD, read from what actually happened here.
 *
 * Every reading the platform has ever taken is already on `UpDownObservation` — `boundaryAt`,
 * `confirmedAt`, `state`. That is a real and growing history at no extra provider cost, and it
 * is what `updown-feed-advice` turns into the sentences the console shows an operator.
 *
 * ⚠️ `confirmedAt - boundaryAt` is how long after a boundary a reading became USABLE. It folds
 * in both the provider's publication delay and our own retry ladder, and that is deliberate:
 * the operator's question is "how long until this asset can settle a round", not "what is the
 * provider's raw latency". Do not quote it as the latter.
 *
 * ⛔ Aggregated in SQL rather than by pulling rows into memory. This table grows by one row per
 * asset per boundary — a RUNNING 3-minute chain adds ~360 a day — so a `findMany` here would be
 * a slow leak that only shows up months in.
 */
import { prisma, hasDatabase } from "./prisma";
import type { FeedHistory } from "./updown-feed-advice";

type Row = {
  key: string;
  readings: bigint | number;
  confirmed: bigint | number;
  failed: bigint | number;
  median_lag_s: number | null;
  max_lag_s: number | null;
};

const n = (v: bigint | number | null | undefined) => (v == null ? 0 : Number(v));

/** Every enabled asset's measured record, keyed by asset key. Empty when there is no DB. */
export async function feedHistoryByAssetKey(): Promise<Map<string, FeedHistory>> {
  const out = new Map<string, FeedHistory>();
  if (!hasDatabase()) return out;
  // `prisma` is a factory, not the client — it returns null when no database is configured,
  // which is the in-memory test path.
  const pc = prisma();
  if (!pc) return out;

  const rows = await pc.$queryRaw<Row[]>`
    select a."key"                                                        as key,
           count(*)                                                       as readings,
           count(*) filter (where o."state" = 'CONFIRMED')                as confirmed,
           count(*) filter (where o."state" = 'FAILED')                   as failed,
           percentile_disc(0.5) within group (
             order by extract(epoch from (o."confirmedAt" - o."boundaryAt"))
           ) filter (where o."state" = 'CONFIRMED')                       as median_lag_s,
           max(extract(epoch from (o."confirmedAt" - o."boundaryAt")))
             filter (where o."state" = 'CONFIRMED')                       as max_lag_s
    from "UpDownObservation" o
    join "UpDownAsset" a on a."id" = o."assetId"
    group by a."key"
  `.catch(() => [] as Row[]);

  for (const r of rows) {
    out.set(r.key, {
      assetKey: r.key,
      readings: n(r.readings),
      confirmed: n(r.confirmed),
      failed: n(r.failed),
      medianLagSeconds: r.median_lag_s == null ? null : Math.round(Number(r.median_lag_s)),
      maxLagSeconds: r.max_lag_s == null ? null : Math.round(Number(r.max_lag_s)),
    });
  }
  return out;
}

/** One asset's record, or a zeroed one so callers never branch on undefined. */
export async function feedHistoryFor(assetKey: string): Promise<FeedHistory> {
  const all = await feedHistoryByAssetKey();
  return all.get(assetKey) ?? {
    assetKey, readings: 0, confirmed: 0, failed: 0, medianLagSeconds: null, maxLagSeconds: null,
  };
}
