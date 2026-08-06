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
// ⭐ G1 · the duration gate's SECOND axis. The feed history above answers "can this be PRICED in
// time"; this answers "does it MOVE enough to be DECIDED". Same table, different question.
import {
  judgeMovement, MIN_MOVE_SAMPLES,
  type MovementAdvice, type MovementProfile, type MoveWindow,
} from "../updown-movement";

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

// ─────────────────────────────────────────────────────────────────────────────
// G1 · HOW FAR THE ASSET ACTUALLY TRAVELS — the second axis of the duration gate
// ─────────────────────────────────────────────────────────────────────────────

type MoveRow = { key: string; floor_abs: number; gap_min: number; n: bigint | number; p10: number; p50: number };

/** ⚠️ TEST SEAM, the same one `__setFeedHistoryForTests` exists for and for the same reason:
 *  the profile lives in SQL, so an in-memory suite could otherwise only ever see "unmeasured"
 *  and could not drive the refusal this gate is for. Nothing in `src/app` imports it. */
let movementOverride: Map<string, MovementProfile> | null = null;
export function __setMovementProfilesForTests(m: Map<string, MovementProfile> | null): void {
  movementOverride = m;
}

/**
 * Every asset's measured movement, keyed by asset key.
 *
 * ⛔ THE PAIRS ARE FORMED IN SQL, NOT IN MEMORY. `UpDownObservation` grows by one row per asset
 * per boundary; pulling it into node to pair it would be the leak `feedHistoryByAssetKey`'s
 * header already warns about, squared.
 *
 * ⚠️ BOUNDED THREE WAYS on purpose. **(a)** only the last 30 days, so the cost cannot grow with
 * the table for ever; **(b)** only pairs up to 65 minutes apart, which is the longest round the
 * platform offers; **(c)** only buckets that reached `MIN_MOVE_SAMPLES`, so a two-sample window
 * cannot become a claim.
 *
 * ⚠️ THE GAPS ARE WHATEVER THE DATA HAS, NOT A LIST WE CHOSE. The first version of this query
 * filtered `gap_min in (1,3,5,10,15,30,60)` — the ALLOWED_DURATIONS — and returned almost
 * nothing, including **zero rows for gold**. Real boundaries sit **18 minutes** apart on a
 * 15-minute chain, because a round's span is its duration PLUS its result phase. Asking the data
 * only about the numbers we expected made a well-measured asset look unmeasured.
 */
export async function movementByAssetKey(): Promise<Map<string, MovementProfile>> {
  if (movementOverride) return movementOverride;
  const out = new Map<string, MovementProfile>();
  if (!hasDatabase()) return out;
  const pc = prisma();
  if (!pc) return out;

  const rows = await pc.$queryRaw<MoveRow[]>`
    with obs as (
      select a."key" as key,
             power(10, -a."decimals") * a."minMoveTicks" as floor_abs,
             o."boundaryAt" as at, o."price" as price
        from "UpDownObservation" o
        join "UpDownAsset" a on a."id" = o."assetId"
       where o."state" = 'CONFIRMED'
         and o."price" is not null
         and o."boundaryAt" >= now() - interval '30 days'
    ),
    pairs as (
      select x.key, x.floor_abs,
             round(extract(epoch from (y.at - x.at)) / 60)::int as gap_min,
             abs(y.price - x.price) as move
        from obs x
        join obs y
          on y.key = x.key
         and y.at > x.at
         and y.at - x.at <= interval '65 minutes'
    )
    select key, floor_abs, gap_min,
           count(*) as n,
           percentile_disc(0.10) within group (order by move) as p10,
           percentile_disc(0.50) within group (order by move) as p50
      from pairs
     where gap_min > 0
     group by key, floor_abs, gap_min
    having count(*) >= ${MIN_MOVE_SAMPLES}
     order by key, gap_min
  `.catch(() => [] as MoveRow[]);

  for (const row of rows) {
    const key = row.key;
    const prev = out.get(key);
    const w: MoveWindow = {
      gapMinutes: Number(row.gap_min),
      samples: n(row.n),
      p10Abs: Number(row.p10),
      medianAbs: Number(row.p50),
    };
    if (prev) prev.windows.push(w);
    else out.set(key, { assetKey: key, tickFloorAbs: Number(row.floor_abs), windows: [w] });
  }
  for (const p of out.values()) p.windows.sort((a, b) => a.gapMinutes - b.gapMinutes);
  return out;
}

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
  /** ⭐ G1 · the second axis. Null when no duration is in question — "does gold move enough" is
   *  not a question; "does gold move enough in three minutes" is. */
  movement: (assetKey: string, durationMinutes?: number) => MovementAdvice | undefined;
  /** The raw profile, for the console's own column. */
  profile: (assetKey: string) => MovementProfile | undefined;
  record: (assetKey: string) => FeedRecord;
  abandonAfterSeconds: number;
}> {
  const [byKey, moveByKey, cfg] = await Promise.all([
    feedHistoryByAssetKey(), movementByAssetKey(), getUpDownConfig(),
  ]);
  const deadline = abandonAfterSeconds(cfg);
  const historyFor = (assetKey: string) => byKey.get(assetKey) ?? emptyHistory(assetKey);
  return {
    abandonAfterSeconds: deadline,
    advise: (assetKey, durationMinutes) =>
      adviseFromHistory(historyFor(assetKey), { durationMinutes, abandonAfterSeconds: deadline }),
    movement: (assetKey, durationMinutes) =>
      durationMinutes == null ? undefined : judgeMovement(moveByKey.get(assetKey), durationMinutes),
    profile: (assetKey) => moveByKey.get(assetKey),
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

/**
 * ⭐ G1 · the MOVEMENT verdict for ONE asset at ONE duration — the server gate's second axis.
 *
 * ⛔ A SEPARATE FUNCTION FROM `feedAdviceFor`, DELIBERATELY. Folding movement into `FeedAdvice`
 * would put two different failure modes behind one `level`, and the whole point of G1 is that
 * they are different: "we cannot price it in time" and "it does not move enough to decide" have
 * the same symptom (a refund) and completely different remedies.
 */
export async function movementAdviceFor(assetKey: string, durationMinutes: number): Promise<MovementAdvice> {
  return judgeMovement((await movementByAssetKey()).get(assetKey), durationMinutes);
}
