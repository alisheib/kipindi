/**
 * test:demo-seed-clock · red:demo-seed-clock
 *   npm run test:demo-seed-clock     ·     npm run red:demo-seed-clock   (--prove-red: every defect below planted IN MEMORY, each caught)
 *
 * The demo catalogue (`seedDemoMarkets`, src/lib/server/market-service.ts — reached only through the dev-test doors) reads
 * the clock ONCE: every row's `resolutionAt` is `now + N * day` from a single `Date.now()`, so rows with the same offset are
 * the same instant. Each row used to read the clock itself; whether two rows with one offset tied then hung on a
 * millisecond tick while the array was built, and "Recently resolved" (latest `resolutionAt` first, ties in catalogue
 * order) showed a different three cards from run to run — classic parity v4 check 4.8 failed on seed noise alone
 * (VODACOM-PLAN §0k, 2026-10-15: measured on the candidate server, Brent stamped one millisecond after BTC $80k).
 *
 *  1. one-read      — the function holds exactly one `Date.now(`, as the statement `const now = Date.now();`, before the array
 *  2. rows-use-now  — every `resolutionAt:` in the array is `new Date(now + N * day).toISOString()`
 *  3. ticking-clock — the catalogue, evaluated AS WRITTEN against a clock that moves 1 ms on EVERY read, gives equal offsets
 *                     equal instants (as many distinct instants as distinct offsets), and the strip's rows tie as the
 *                     baseline read them: Yanga = Arusha (+5 d), and BTC $80k = Zanzibar = Brent (+4 d)
 */
import { readFileSync } from "node:fs";

const SRC = "src/lib/server/market-service.ts";
const PROVE_RED = process.argv.includes("--prove-red");
const REAL = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");

type Verdict = { id: string; ok: boolean; detail: string };

/** The function's text, from its signature to the first closing brace at column 0. */
function fnBody(src: string): string {
  const start = src.indexOf("export async function seedDemoMarkets() {");
  if (start < 0) throw new Error("seedDemoMarkets is not in " + SRC);
  const end = src.indexOf("\n}\n", start);
  if (end < 0) throw new Error("seedDemoMarkets has no closing brace at column 0");
  return src.slice(start, end + 2);
}

/** The catalogue array's text (`const seed … = [` … `  ];`). */
function arrayText(body: string): string {
  const a = body.indexOf("const seed: CreateMarketInput[] = [");
  if (a < 0) throw new Error("the catalogue array `const seed: CreateMarketInput[] = [` is not in seedDemoMarkets");
  const b = body.indexOf("\n  ];", a);
  if (b < 0) throw new Error("the catalogue array has no `  ];`");
  return body.slice(a, b + 5);
}

function check(src: string): Verdict[] {
  const body = fnBody(src);
  const arr = arrayText(body);
  const out: Verdict[] = [];

  // 1 — one read, a statement, before the array (whole-line comments are not code: this function's own comment names the
  // old per-row read; a `//` inside a string, e.g. a source URL on a row's line, is left alone)
  const code = body.replace(/^\s*\/\/.*$/gm, "");
  const reads = (code.match(/Date\.now\(/g) ?? []).length;
  const stmt = /^ {2}const now = Date\.now\(\);$/m.exec(body);
  const before = !!stmt && stmt.index < body.indexOf("const seed: CreateMarketInput[] = [");
  out.push({ id: "1.one-read", ok: reads === 1 && before, detail: `${reads} Date.now( read(s); the statement ${stmt ? (before ? "stands before the array" : "comes AFTER the array") : "is missing"}` });

  // 2 — every row's instant is `now + N * day`
  const exprs = [...arr.matchAll(/resolutionAt:\s*([^\n]*?\.toISOString\(\))/g)].map((m) => m[1]);
  const bad = exprs.filter((e) => !/^new Date\(now \+ [\d.]+ \* day\)\.toISOString\(\)$/.test(e));
  out.push({ id: "2.rows-use-now", ok: exprs.length >= 30 && bad.length === 0, detail: `${exprs.length} row(s); ${bad.length} not \`now + N * day\`${bad.length ? `: ${bad[0]}` : ""}` });

  // 3 — evaluated as written, against a clock that ticks on every read
  let t = 1_800_000_000_000;
  const RealDate = globalThis.Date;
  const TickDate = function (ms: number) { return new RealDate(ms); } as unknown as DateConstructor;
  (TickDate as unknown as { now: () => number }).now = () => ++t;
  const from = body.indexOf("  const day = 24 * 3600_000;");
  const runnable = body.slice(from, body.indexOf("\n  ];", from) + 5).replace("const seed: CreateMarketInput[] =", "const seed =") + "\nreturn seed;";
  let rows: Array<{ titleEn: string; resolutionAt: string }> = [];
  let evalError = "";
  try {
    rows = new Function("Date", runnable)(TickDate);
  } catch (e) {
    evalError = String((e as Error)?.message ?? e);
  }
  const offsets = new Set((arr.match(/now \+ ([\d.]+) \* day|Date\.now\(\) \+ ([\d.]+) \* day/g) ?? []).map((s) => s.replace(/.*\+ /, "")));
  const instants = new Set(rows.map((r) => r.resolutionAt));
  const at = (needle: string) => rows.find((r) => r.titleEn.includes(needle))?.resolutionAt ?? `(no row "${needle}")`;
  const five = [at("Yanga SC top the NBC Premier League"), at("Arusha get measurable rainfall")];
  const four = [at("Bitcoin close above $80,000"), at("Zanzibar see a full sunny day"), at("Brent")];
  const tiesHold = new Set(five).size === 1 && new Set(four).size === 1 && five[0] > four[0];
  out.push({
    id: "3.ticking-clock",
    ok: !evalError && rows.length === exprs.length && instants.size === offsets.size && tiesHold,
    detail: evalError ? `the catalogue did not evaluate: ${evalError}` : `${rows.length} row(s), ${instants.size} instant(s) for ${offsets.size} offset(s); +5 d ${new Set(five).size === 1 ? "tie" : "SPLIT"}, +4 d ${new Set(four).size === 1 ? "tie" : "SPLIT"}`,
  });
  return out;
}

let failed = 0;
for (const v of check(REAL)) {
  console.log(`${v.ok ? "PASS" : "FAIL"} ${v.id} — ${v.detail}`);
  if (!v.ok) failed++;
}

if (PROVE_RED) {
  // Every plant mutates seedDemoMarkets ONLY — market-service.ts has other `const now = Date.now();` lines.
  const start = REAL.indexOf("export async function seedDemoMarkets() {");
  const stop = REAL.indexOf("\n}\n", start) + 2;
  const inFn = (mutate: (body: string) => string) => (s: string) => s.slice(0, start) + mutate(s.slice(start, stop)) + s.slice(stop);
  const plant = (label: string, mutateBody: (s: string) => string, expect: string[]) => {
    const planted = inFn(mutateBody)(REAL);
    if (planted === REAL) throw new Error(`stale plant: ${label}`);
    let verdicts: Verdict[];
    try { verdicts = check(planted); } catch (e) { verdicts = [{ id: "threw", ok: false, detail: String((e as Error).message) }]; }
    const caught = expect.every((id) => verdicts.some((v) => v.id === id && !v.ok)) || verdicts.some((v) => v.id === "threw");
    console.log(`${caught ? "PASS" : "FAIL"} plant "${label}" caught by ${expect.join(" + ")}`);
    if (!caught) {
      failed++;
      for (const v of verdicts) console.log(`      ${v.ok ? "pass" : "fail"} ${v.id} — ${v.detail}`);
    }
  };
  plant("every row reads the clock again", (s) => s.replace(/new Date\(now \+ /g, "new Date(Date.now() + "), ["1.one-read", "2.rows-use-now", "3.ticking-clock"]);
  plant("one row reads the clock again", (s) => s.replace("new Date(now + ", "new Date(Date.now() + "), ["1.one-read", "2.rows-use-now"]);
  plant("the read moves after the array", (s) => s.replace("  const now = Date.now();\n", "").replace("\n  ];\n  for (const s of seed) {", "\n  ];\n  const now = Date.now();\n  for (const s of seed) {"), ["1.one-read", "3.ticking-clock"]);
  plant("a Brent row offset drifts to +4.0001 d", (s) => {
    const i = s.indexOf("Brent");
    const j = s.indexOf("new Date(now + 4 * day)", i);
    return j < 0 ? s : s.slice(0, j) + "new Date(now + 4.0001 * day)" + s.slice(j + "new Date(now + 4 * day)".length);
  }, ["3.ticking-clock"]);
}

console.log(`\ntest:demo-seed-clock — ${failed === 0 ? "all pass" : `${failed} failure(s)`}`);
process.exit(failed === 0 ? 0 : 1);
