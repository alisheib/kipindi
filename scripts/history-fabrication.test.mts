/**
 * Market-history no-fabrication guard.
 *
 * The bug this exists to prevent (found 2026-07-20):
 *
 *   `market-history.ts` exported `seedHistory()`, which generated a synthetic
 *   random walk — a seeded LCG (`h * 1103515245 + 12345`) producing 16 fake
 *   price points landing on the market's current YES probability. Every render
 *   of `/markets/[id]` called it before drawing the chart.
 *
 *   Because history lived in a process-local Map, and every push to main is a
 *   live deploy, that Map was wiped several times a week. So `hasHistory()`
 *   returned false for EVERY market after each deploy and the fabrication fired
 *   for all of them — not the "legacy demo markets" its comment claimed.
 *
 *   Real players, on a licensed real-money platform, were shown invented price
 *   history and could bet on the strength of it.
 *
 * The platform's own A-5 no-fabrication rule (cited in market-card.tsx) says a
 * chart renders REAL history or nothing. The card obeyed it — which is exactly
 * why its sparkline was blank while the detail chart showed a confident curve.
 *
 * Four rules, pinned here:
 *   1. No history seeder exists, and no synthetic-series generator lives in the
 *      history module.
 *   2. A market with too little real history renders NOTHING, not a guess.
 *   3. What comes back is exactly what was recorded — no interpolation.
 *   4. The write path never rejects (callers are fire-and-forget on the bet
 *      path; an unhandled rejection would kill the container mid-bet).
 *
 * Run: npm run test:history
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");
/** Strip comments — the deletion note deliberately names seedHistory in prose. */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("market-history no-fabrication guard\n");

// ---------------------------------------------------------------------------
// STATIC — the generator must not come back, in any spelling.
// ---------------------------------------------------------------------------
log("static:");

const files = walk(SRC);
const HISTORY_MODULE = join(SRC, "lib", "server", "market-history.ts");

// 1a. No seeder, under any of the obvious names, anywhere in real code.
const SEEDER = /\b(seedHistory|fabricateHistory|synthHistory|generateHistory|fakeHistory|mockHistory)\s*[({=]/;
const seeders = files.filter((f) => SEEDER.test(decomment(readFileSync(f, "utf8"))));
check(
  "no history seeder is defined or called",
  seeders.length === 0,
  seeders.map(rel).join(", "),
);

// 1b. The history module contains no pseudo-random generator at all. This is
//     broader than the name check on purpose: the original bug would have
//     survived a rename, and a reviewer reading a renamed copy would not spot it.
const historySrc = decomment(readFileSync(HISTORY_MODULE, "utf8"));
const LCG = /1103515245|1664525|22695477|69069|\bxorshift\b/i;
check(
  "history module has no LCG / pseudo-random series generator",
  !LCG.test(historySrc),
  "a seeded generator in this module can only be there to invent points",
);

// 1c. Math.random is allowed ONLY for the retention-prune sampling, never to
//     build a value that reaches a chart.
const randomLines = historySrc
  .split("\n")
  .map((l, i) => [i + 1, l] as const)
  .filter(([, l]) => /Math\.random\s*\(/.test(l));
check(
  "Math.random in the history module is only used for prune sampling",
  randomLines.every(([, l]) => /PRUNE_EVERY/.test(l)),
  randomLines.filter(([, l]) => !/PRUNE_EVERY/.test(l)).map(([n]) => `line ${n}`).join(", "),
);

// 1d. The write path must be guarded. recordSnapshot and the Prisma append are
//     called fire-and-forget from the bet path; an unhandled rejection is fatal.
const recordBody = historySrc.slice(
  historySrc.indexOf("export async function recordSnapshot"),
  historySrc.indexOf("export async function getHistory"),
);
check(
  "recordSnapshot swallows its own errors (fire-and-forget callers)",
  /try\s*{/.test(recordBody) && /catch/.test(recordBody),
  "an unhandled rejection here takes the container down mid-bet",
);

// ---------------------------------------------------------------------------
// BEHAVIOURAL — the real module, driven. Static checks alone proved weak on the
// sibling settled-outcome guard, where four trivial rewrites slipped past.
// ---------------------------------------------------------------------------
log("\nbehavioural:");

const { recordSnapshot, getProbabilityChart, getCardChart, getHistory } = await import(
  "../src/lib/server/market-history.ts"
);

const EMPTY = `mkt_guard_empty_${Date.now()}`;
const ONE = `mkt_guard_one_${Date.now()}`;
const MANY = `mkt_guard_many_${Date.now()}`;

// 2. A market with NO history renders nothing at all.
const emptyChart = await getProbabilityChart(EMPTY);
check(
  "market with no history → no chart series",
  Object.keys(emptyChart.series).length === 0 && emptyChart.ranges.length === 0,
  JSON.stringify(emptyChart),
);
const emptySpark = await getCardChart(EMPTY);
check(
  "market with no history → empty sparkline, no move24h",
  emptySpark.spark.length === 0 && emptySpark.move24h === undefined,
  JSON.stringify(emptySpark),
);

// 2b. ONE point is still not a line. The old code would have invented 16.
await recordSnapshot(ONE, 600, 400);
const oneChart = await getProbabilityChart(ONE);
const oneSpark = await getCardChart(ONE);
check(
  "single data point → still no chart (a line needs two real points)",
  oneChart.ranges.length === 0 && oneSpark.spark.length === 0,
  JSON.stringify({ ranges: oneChart.ranges, spark: oneSpark.spark }),
);

// 3. What is recorded is what comes back — exactly.
await recordSnapshot(MANY, 500, 500); // 50%
await recordSnapshot(MANY, 700, 300); // 70%
await recordSnapshot(MANY, 900, 100); // 90%
const stored = await getHistory(MANY);
check(
  "history returns exactly the points recorded, oldest first",
  stored.length === 3 &&
    Math.round(stored[0].yes * 100) === 50 &&
    Math.round(stored[1].yes * 100) === 70 &&
    Math.round(stored[2].yes * 100) === 90,
  JSON.stringify(stored.map((s) => Math.round(s.yes * 100))),
);

const manySpark = await getCardChart(MANY);
check(
  "sparkline contains only recorded values, none invented",
  manySpark.spark.length === 3 && manySpark.spark.every((p) => [50, 70, 90].includes(p)),
  JSON.stringify(manySpark.spark),
);

// 4. The write path never rejects, whatever it is handed.
let threw = false;
try {
  // 0/0 pools (a voided market), and an id that exists in no store.
  await recordSnapshot(`mkt_guard_missing_${Date.now()}`, 0, 0);
} catch {
  threw = true;
}
check("recordSnapshot never rejects", !threw);

// ---------------------------------------------------------------------------
log("");
if (fail) {
  log(`market-history guard: ${fail} FAILED`);
  process.exit(1);
}
log("market-history guard: all checks passed");
