/**
 * ⭐ CHART-SPRINT-2 — THE TERMINAL CHART'S DATA IS ARITHMETIC, AND ARITHMETIC IS PROVABLE.
 *
 *   npx tsx scripts/terminal-series.test.mts     (npm run test:terminal-series)
 *
 * `getAssetTerminalSeries` decides everything the trading chart draws: gaps,
 * line-vs-candles, the cadence-derived bucket rung, every candle's OHLC, the
 * per-bucket floor, the forming bucket, the stale-live flag.
 *
 * 🔴 THE FIRST VERSION OF THIS SUITE SEEDED A PER-MINUTE FEED — the exact
 * cadence assumption the code under test had hard-coded, handed back to it as
 * a fixture (the fixture-encodes-the-answer trap, again). The adversarial
 * review executed the real writers and proved reads land only at CHAIN GRID
 * BOUNDARIES: every roundSpanMinutes(duration) = 4–72 minutes. This suite now
 * seeds THE REAL CADENCE (6-minute spacing — a 5m chain) as its primary
 * fixture and keeps a per-minute case only to prove the adaptive rung logic.
 *
 * ⚠️ Blind spots, stated: the Prisma store's translation of the same query
 * (shares the one `where` shape); the canvas renderer (the screenshot pass's
 * job); store-FAILURE propagation (the memory store cannot be made to throw —
 * the route's 503 branch is a 4-line try/catch read in review).
 */
import { assetStore, observationStore } from "../src/lib/server/updown-dal";
import { getAssetTerminalSeries } from "../src/lib/server/updown-board";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const NOW = Date.now();
const MIN = 60_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

async function seedAsset(key: string) {
  const id = `udast_test_${key}`;
  await assetStore.upsert({
    id, key, symbol: `${key}/USD`, nameEn: key.toUpperCase(), nameSw: key.toUpperCase(), nameZh: null,
    iconKey: "btc", priceSourceUrl: "https://example.test", sourceDomain: "example.test",
    category: "crypto", decimals: 2, minMoveTicks: 1, enabled: true, sortOrder: 1,
    createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  });
  return id;
}

async function confirmRead(assetId: string, msAgo: number, price: number) {
  const o = await observationStore.ensure(assetId, iso(msAgo));
  const won = await observationStore.confirm(o.id, {
    price, sourceUrl: "https://example.test", sourceQuotedAt: iso(msAgo),
    evidence: null, confidence: null, model: null, rawHash: null,
  });
  if (!won) throw new Error("seed confirm lost the claim — the harness is broken, not the product");
}

/** THE REAL CADENCE: a 5m chain reads every 6 minutes (duration + result phase). */
const SPAN = 6 * MIN;

console.log("\n§1 · unknown/disabled assets answer null, never an empty chart");
ok("1.1 unknown asset → null", (await getAssetTerminalSeries("nope", "1H")) === null);

console.log("\n§2 · a line window at the REAL cadence — no false gaps");
{
  const a = await seedAsset("tsl");
  // 9 reads, 6 minutes apart, oldest 48 min ago; prices 100..108.
  for (let i = 0; i < 9; i++) await confirmRead(a, (8 - i) * SPAN, 100 + i);
  const r = await getAssetTerminalSeries("tsl", "1H");
  ok("2.1 mode is line for a 1H window", r!.series.mode === "line");
  const pts = r!.series.mode === "line" ? r!.series.points : [];
  ok("2.2 all 9 reads present and NO gap markers at healthy 6-min spacing",
     pts.length === 9 && pts.every((p) => p.price != null), `${pts.length} points`);
  ok("2.3 oldest-first, exact values", pts[0]?.price === 100 && pts[8]?.price === 108);
  ok("2.4 livePrice is the newest confirmed read", r!.livePrice === 108);
  ok("2.5 the fresh feed is NOT stale", r!.liveStale === false, String(r!.liveStale));
  ok("2.6 the cadence was measured, not assumed", r!.medianDeltaMs === SPAN, `${r!.medianDeltaMs}`);
}

console.log("\n§3 · a feed hole becomes a MARKER — threshold derived from the cadence");
{
  const a = await seedAsset("tsg");
  // 6-min cadence with one 42-min hole (> 2.5 × 6min).
  for (const m of [54, 48, 6, 0]) await confirmRead(a, m * MIN, m === 0 ? 61 : m === 6 ? 60 : m === 48 ? 51 : 50);
  const r = await getAssetTerminalSeries("tsg", "1H");
  const pts = r!.series.mode === "line" ? r!.series.points : [];
  const gaps = pts.filter((p) => p.price == null);
  // ONE MARKER PER MISSING GRID STEP — the renderer's time scale is
  // index-spaced, so the outage keeps width only if every step reserves its
  // slot. 42-minute hole at 6-minute cadence → 6 reserved steps.
  ok("3.1 the hole reserves one marker per missing grid step", gaps.length === 6, `${gaps.length}`);
  const first = pts.findIndex((p) => p.price == null);
  const last = pts.length - 1 - [...pts].reverse().findIndex((p) => p.price == null);
  ok("3.2 the marker run sits between the reads it separates",
     pts[first - 1]?.price === 51 && pts[last + 1]?.price === 60);
  ok("3.3 markers are consecutive — one hole, one run of slots",
     last - first + 1 === gaps.length);
}

console.log("\n§4 · candles at the REAL cadence — the rung, the OHLC, the forming edge");
{
  const a = await seedAsset("tsc");
  // 4H of 6-min reads: 40 reads; price = 1000 + (i % 7).
  const total = 40;
  for (let i = 0; i < total; i++) await confirmRead(a, (total - 1 - i) * SPAN, 1000 + (i % 7));
  const r = await getAssetTerminalSeries("tsc", "4H");
  ok("4.1 mode is candles for a full 4H window", r!.series.mode === "candles");
  if (r!.series.mode !== "candles") throw new Error("cannot continue §4");
  const s = r!.series;
  // Smallest rung ≥ 4 × 6min = 24min → 30 minutes.
  ok("4.2 the bucket rung is DERIVED from the cadence (30min for 6-min reads)", s.bucketMs === 30 * MIN, `${s.bucketMs / MIN}min`);
  const done = s.candles.filter((c) => !c.forming);
  ok("4.3 the FORMING bucket is present, flagged, and newest",
     s.candles.some((c) => c.forming) && s.candles[s.candles.length - 1].forming === true);
  const sound = s.candles.every((c) => c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c) && c.n >= 1);
  ok("4.4 every candle honours h ≥ max(o,c), min(o,c) ≥ l", sound);
  // One historical candle re-derived independently from the seed formula.
  const c0 = done[Math.floor(done.length / 2)];
  const bucketReads: number[] = [];
  for (let i = 0; i < total; i++) {
    const t = NOW - (total - 1 - i) * SPAN;
    if (Math.floor(t / s.bucketMs) * s.bucketMs === c0.t) bucketReads.push(1000 + (i % 7));
  }
  ok("4.5 a mid-window candle re-derived to the digit",
     bucketReads.length === c0.n && c0.o === bucketReads[0] && c0.c === bucketReads[bucketReads.length - 1]
       && c0.h === Math.max(...bucketReads) && c0.l === Math.min(...bucketReads),
     `n=${c0.n} o=${c0.o} h=${c0.h} l=${c0.l} c=${c0.c}`);
  ok("4.6 no dropped buckets on a healthy feed", s.gaps.length === 0, `${s.gaps.length} gaps`);
}

console.log("\n§5 · the honesty floors");
{
  // A 4H window with only ~40 minutes of reads → far under half the buckets → LINE.
  const a = await seedAsset("tst");
  for (let i = 0; i < 7; i++) await confirmRead(a, (6 - i) * SPAN, 200 + i);
  const r = await getAssetTerminalSeries("tst", "4H");
  ok("5.1 a thin window degrades to the line form", r!.series.mode === "line", r!.series.mode);
}
{
  // A healthy 4H feed EXCEPT one mid-window outage bucket (one lone read where
  // ~5 are expected) → that bucket is a GAP, and the outage stays visible.
  const a = await seedAsset("tsf");
  const total = 40;
  const rung = 30 * MIN;
  const holeBucket = Math.floor((NOW - 2 * 3600_000) / rung) * rung;
  for (let i = 0; i < total; i++) {
    const msAgo = (total - 1 - i) * SPAN;
    const t = NOW - msAgo;
    const inHole = Math.floor(t / rung) * rung === holeBucket;
    const posInBucket = t - holeBucket;
    // keep exactly ONE read inside the hole bucket (the first sixth of it)
    if (inHole && posInBucket >= rung / 6) continue;
    await confirmRead(a, msAgo, 300 + (i % 5));
  }
  const r = await getAssetTerminalSeries("tsf", "4H");
  ok("5.2 mode stays candles around one bad bucket", r!.series.mode === "candles", r!.series.mode);
  if (r!.series.mode === "candles") {
    ok("5.3 the thin bucket is a GAP, not a candle — and it is REPORTED",
       r!.series.gaps.includes(holeBucket) && !r!.series.candles.some((c) => c.t === holeBucket && !c.forming),
       `gaps=${r!.series.gaps.length}`);
  }
}

console.log("\n§6 · only CONFIRMED reads exist to the chart");
{
  const a = await seedAsset("tsp");
  await confirmRead(a, SPAN, 70);
  await observationStore.ensure(a, iso(0)); // stays PENDING
  const r = await getAssetTerminalSeries("tsp", "30M");
  const pts = r!.series.mode === "line" ? r!.series.points : [];
  ok("6.1 a PENDING boundary is invisible", pts.length === 1 && pts[0].price === 70, `${pts.length} pts`);
}

console.log("\n§7 · the window bound actually bounds");
{
  const a = await seedAsset("tsw");
  await confirmRead(a, 45 * MIN, 900); // outside 30M
  await confirmRead(a, 10 * MIN, 901); // inside
  const r = await getAssetTerminalSeries("tsw", "30M");
  const pts = r!.series.mode === "line" ? r!.series.points : [];
  ok("7.1 a read older than the window is excluded", pts.length === 1 && pts[0].price === 901, `${pts.length} pts`);
}

console.log("\n§8 · the rung adapts — a per-minute feed (a future oracle upgrade) buckets finer");
{
  const a = await seedAsset("tsm");
  const total = 230;
  for (let i = 0; i < total; i++) await confirmRead(a, (total - i) * MIN, 1000 + (i % 7));
  const r = await getAssetTerminalSeries("tsm", "4H");
  ok("8.1 per-minute reads take the 5-minute rung", r!.series.mode === "candles" && r!.series.bucketMs === 5 * MIN,
     r!.series.mode === "candles" ? `${r!.series.bucketMs / MIN}min` : r!.series.mode);
}

console.log("\n§9 · a stalled feed is FLAGGED, never dressed as a flat market");
{
  const a = await seedAsset("tss");
  // Healthy 6-min cadence that STOPPED 50 minutes ago.
  for (let i = 0; i < 10; i++) await confirmRead(a, 50 * MIN + (9 - i) * SPAN, 400 + i);
  const r = await getAssetTerminalSeries("tss", "4H");
  ok("9.1 liveStale is true when the newest read exceeds the cadence tolerance", r!.liveStale === true, String(r!.liveStale));
}

console.log("\n§10 · the style toggle's contract — the player owns the form, honesty owns the floor");
{
  // "line" forces the curve even where candles are possible — and claims nothing.
  const r1 = await getAssetTerminalSeries("tsc", "4H", "line");
  ok("10.1 explicit line wins on a candle-capable window", r1!.series.mode === "line" && r1!.candlesUnavailable === undefined);
  // "candles" on the healthy window answers candles.
  const r2 = await getAssetTerminalSeries("tsc", "4H", "candles");
  ok("10.2 explicit candles answers candles where honest", r2!.series.mode === "candles");
  // "candles" on a too-thin window answers the LINE and SAYS WHY — never invents.
  const r3 = await getAssetTerminalSeries("tst", "4H", "candles");
  ok("10.3 explicit candles on a thin window → line + candlesUnavailable",
     r3!.series.mode === "line" && r3!.candlesUnavailable === true);
  // "candles" can reach a SHORT window the auto rule never candles (1H at
  // per-minute cadence has 12 honest 5-min buckets) — full usage of the data.
  const r4 = await getAssetTerminalSeries("tsm", "1H", "candles");
  ok("10.4 explicit candles unlocks an auto-line window when the data honestly allows",
     r4!.series.mode === "candles", r4!.series.mode);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
