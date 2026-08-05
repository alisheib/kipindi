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
import { adviseFromHistory, type FeedAdvice, type FeedHistory } from "./updown-feed-advice";
import { abandonAfterSeconds, getUpDownConfig } from "./updown-config";

type Row = {
  key: string;
  readings: bigint | number;
  confirmed: bigint | number;
  failed: bigint | number;
  median_lag_s: number | null;
  max_lag_s: number | null;
};

const n = (v: bigint | number | null | undefined) => (v == null ? 0 : Number(v));

/**
 * ⚠️ TEST SEAM, in the same spirit as `__resetUpDownMemoryStores`. The measured gate's whole
 * point is that it refuses a write, and a refusal that is never driven end to end is a claim
 * rather than a control — but the history lives in SQL, so the in-memory suites would otherwise
 * only ever see "unmeasured" and could not prove the server half at all.
 *
 * ⛔ Nothing in `src/app` imports this, and it is inert until something calls it.
 */
let historyOverride: Map<string, FeedHistory> | null = null;
export function __setFeedHistoryForTests(m: Map<string, FeedHistory> | null): void {
  historyOverride = m;
}

/** Every enabled asset's measured record, keyed by asset key. Empty when there is no DB. */
export async function feedHistoryByAssetKey(): Promise<Map<string, FeedHistory>> {
  if (historyOverride) return historyOverride;
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
  return all.get(assetKey) ?? emptyHistory(assetKey);
}

const emptyHistory = (assetKey: string): FeedHistory => ({
  assetKey, readings: 0, confirmed: 0, failed: 0, medianLagSeconds: null, maxLagSeconds: null,
});

/** What the console shows an operator about one asset, beside the advice it drives. */
export type FeedRecord = { history: FeedHistory; okPct: number | null };

/**
 * ⛔ ONE LOAD, THEN A PURE FUNCTION — because the console asks this question 6 times per
 * enabled asset (once per allowed duration) plus once for the asset itself, and a per-question
 * round trip would be an N+1 across a table that grows by one row per asset per boundary.
 *
 * The returned closure is synchronous and pure, which is what lets `symbolReadiness` stay a pure
 * function that the form and the server gate can both call. ⚠️ The deadline is read from the
 * LIVE config here and passed in, never defaulted inside the advice engine: a code default is
 * not a live setting, and quoting the wrong deadline in a warning is E-84 in a new place.
 */
export async function feedAdviceLookup(): Promise<{
  advise: (assetKey: string, durationMinutes?: number) => FeedAdvice;
  record: (assetKey: string) => FeedRecord;
  abandonAfterSeconds: number;
}> {
  const [byKey, cfg] = await Promise.all([feedHistoryByAssetKey(), getUpDownConfig()]);
  const deadline = abandonAfterSeconds(cfg);
  const historyFor = (assetKey: string) => byKey.get(assetKey) ?? emptyHistory(assetKey);
  return {
    abandonAfterSeconds: deadline,
    advise: (assetKey, durationMinutes) =>
      adviseFromHistory(historyFor(assetKey), { durationMinutes, abandonAfterSeconds: deadline }),
    record: (assetKey) => {
      const history = historyFor(assetKey);
      return { history, okPct: history.readings > 0 ? (history.confirmed / history.readings) * 100 : null };
    },
  };
}

/** The advice for ONE asset at ONE duration. For the server gate, which handles one write. */
export async function feedAdviceFor(assetKey: string, durationMinutes?: number): Promise<FeedAdvice> {
  return (await feedAdviceLookup()).advise(assetKey, durationMinutes);
}
