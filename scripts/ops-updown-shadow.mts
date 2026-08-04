/**
 * ops · SHADOW MODE — read BOTH settlement readers at the same boundary, record the delta,
 *       branch NOTHING on it. Campaign §6ad phase 1c, 2026-08-04.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT OPTIONAL ──────────────────────────────
 * The rebuild switches settlement from `/quote` to the `open` of the 1-minute bar labelled T.
 * That switch moves real money. Before it is flipped, the platform should be able to answer
 * one question with measurements rather than reasoning:
 *
 *   **If we had settled the last N boundaries with the NEW reader instead of the old one,
 *   how different would the settled price have been?**
 *
 * ⛔ AND THE ANSWER IS USELESS UNLESS IT IS DECOMPOSED. A raw `quote − barOpen` delta blends
 * two completely different things, and they call for opposite responses:
 *
 *   1. **TIMING.** `/quote` answers "the price NOW", and its own `last_quote_at` was measured
 *      at 29–45s behind wall-clock (E-25). So a quote taken at the boundary describes an
 *      instant ~40s BEFORE it. The bar's `open` describes T exactly. A delta from this is the
 *      OLD reader being wrong, not the new one — the correction is the point of the rebuild.
 *   2. **DISAGREEMENT.** The two endpoints genuinely publishing different numbers for the same
 *      instant. THAT would be a reason to stop and resolve before switching.
 *
 * This script separates them: it checks whether the quote's price falls inside the range of the
 * bar covering the quote's OWN minute. If it does, the readers agree about the world and the
 * whole delta is timing. If it does not, they disagree about the world — and that is a finding.
 *
 * ── THE BAND IT IS ALL MEASURED AGAINST ──────────────────────────────────────
 * At the tick-floor margin (Ali's decision, §6ad item 4) the winning band is
 * `minMoveTicks × 10^-decimals` — for BTC at `decimals: 2` that is CENTS on a $63,000 asset.
 * Every delta below is therefore also reported as a multiple of that band, because "$6" means
 * nothing on its own and "300× the winning band" means everything.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 * Writes NOTHING to the database — `DATABASE_URL` is deleted before any import, so no
 * observation, round or money row can be touched. It appends one JSONL line per sample to
 * `.qa-artifacts/updown-shadow.jsonl` so a long run accumulates and can be resumed, and it
 * spends 2 provider credits per asset per sample.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-shadow.mts --samples 30
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-shadow.mts --report      # summarise, no calls
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-shadow.mts --weekend     # §D, replay a shut market
 *
 * ⚠️ PowerShell splats a comma-separated argument into SEPARATE arguments. Quote any list:
 *   ... --symbols "BTC/USD,ETH/USD"
 */

// ⛔ BEFORE ANY IMPORT — `railway run` injects the INTERNAL DATABASE_URL, which does not
// resolve from a laptop. Deleting it is also what guarantees this sampler cannot write.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;

import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const KEY = process.env.TWELVEDATA_API_KEY ?? "";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : d;
};
const has = (n: string) => process.argv.includes(`--${n}`);

const OUT_DIR = ".qa-artifacts";
const OUT = `${OUT_DIR}/updown-shadow.jsonl`;

/**
 * The live enabled assets, with the precision and tick floor they are configured with ON
 * PRODUCTION (read 2026-08-04, not assumed).
 *
 * ⚠️ `XAU` really is `minMoveTicks: 1`, not 15. There are TWO gold assets on the same symbol —
 * `GOLD` (disabled, ticks 15) and `XAU` (ENABLED, ticks 1) — and every one of the 1,291 live
 * gold rounds ran on the ticks-1 one. See E-73.
 */
const ASSETS: Record<string, { decimals: number; minMoveTicks: number; category: string }> = {
  "BTC/USD": { decimals: 2, minMoveTicks: 1, category: "crypto" },
  "ETH/USD": { decimals: 2, minMoveTicks: 1, category: "crypto" },
  "SOL/USD": { decimals: 2, minMoveTicks: 1, category: "crypto" },
  "XAU/USD": { decimals: 2, minMoveTicks: 1, category: "macro" },
};

const symbols = (arg("symbols") ?? arg("symbol") ?? Object.keys(ASSETS).join(","))
  .split(",").map((s) => s.trim()).filter(Boolean);
const samples = Number(arg("samples", "30"));

type Sample = {
  ts: string;
  symbol: string;
  /** The boundary this sample is ABOUT — minute-aligned, exactly what a round would use. */
  boundary: string;
  quotePrice: number | null;
  /** The provider's OWN time for that quote (`last_quote_at`), never ours. */
  quoteQuotedAt: string | null;
  /** How far the quote's own instant sits from the boundary. This is the TIMING term. */
  quoteSkewSec: number | null;
  /** THE NEW SETTLEMENT PRICE: `open` of the bar labelled `boundary`. */
  barOpen: number | null;
  /** The bar covering the QUOTE'S own minute — used to test genuine disagreement. */
  quoteMinuteBar: { datetime: string; low: number; high: number } | null;
  /** True when the quote's price sits inside its own minute's bar range, i.e. the two
   *  endpoints agree about the world and the delta is purely timing. */
  readersAgree: boolean | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  /** The winning band at the tick floor, and the delta as a multiple of it. */
  bandAbs: number;
  deltaInBands: number | null;
  note?: string;
};

const iso = (ms: number) => new Date(ms).toISOString();
const label = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────────────────────────────────────────
// The two readers, asked about the SAME instant
// ───────────────────────────────────────────────────────────────────────────

/** `/quote` — the reader in production today. 1 credit. */
async function readQuote(symbol: string): Promise<{ price: number; quotedAt: string } | { err: string }> {
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", KEY);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const j = (await res.json()) as Record<string, unknown>;
    if (typeof j.code === "number" && j.code >= 400) return { err: `provider ${j.code} ${String(j.message ?? "")}` };
    const price = Number(j.close ?? j.price);
    // ⛔ `last_quote_at`, NOT `timestamp` — E-25. `timestamp` is the 1-DAY bar with no
    // `interval`, i.e. the start of today, and reading it makes every staleness gate
    // structurally unsatisfiable. The money path has this exact comment; so does this probe,
    // because an ops tool that asks a different question than the engine is worse than none.
    const ts = Number(j.last_quote_at ?? j.timestamp);
    if (!Number.isFinite(price) || price <= 0) return { err: `unusable close "${String(j.close)}"` };
    if (!Number.isFinite(ts) || ts <= 0) return { err: "no usable timestamp" };
    return { price, quotedAt: new Date(ts * 1000).toISOString() };
  } catch (e) {
    return { err: (e as Error).message?.slice(0, 120) ?? "fetch failed" };
  }
}

/** `time_series?interval=1min` — the reader the rebuild switches to. 1 credit for the window. */
async function readBars(symbol: string): Promise<Array<{ datetime: string; open: number; high: number; low: number; close: number }> | { err: string }> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("outputsize", "8");
  // ⛔ E-71 — `timezone` defaults to `Exchange`, measured at 600 minutes off for gold.
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", KEY);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const j = (await res.json()) as { values?: Array<Record<string, string>>; code?: number; message?: string; status?: string };
    if ((typeof j.code === "number" && j.code >= 400) || j.status === "error") {
      return { err: `provider ${j.code ?? ""} ${String(j.message ?? "")}` };
    }
    if (!Array.isArray(j.values) || j.values.length === 0) return { err: "no bars" };
    // ⛔ Provider order is NEWEST-FIRST (`order` defaults to `desc`). Sorted, never assumed.
    return j.values
      .map((v) => ({
        datetime: String(v.datetime ?? ""),
        open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
      }))
      .filter((b) => b.datetime && Number.isFinite(b.open))
      .sort((a, b) => Date.parse(`${a.datetime.replace(" ", "T")}Z`) - Date.parse(`${b.datetime.replace(" ", "T")}Z`));
  } catch (e) {
    return { err: (e as Error).message?.slice(0, 120) ?? "fetch failed" };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// One paired sample at one boundary
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⛔ THE TWO READERS MUST BE ASKED AT THE MOMENT EACH WOULD REALLY HAVE BEEN ASKED, or the
 * comparison is rigged against one of them.
 *
 *   · `/quote` is fired AT the boundary (T+1s) — that is when production calls it, and it can
 *     only ever answer "now", so asking it later would charge the old reader for seconds of
 *     market drift it never actually suffered.
 *   · the bar is fetched at **T+12s**, because bar T does not exist before then.
 *
 * ⚠️ MEASURED 2026-08-04, and the first version of this script got it wrong: bar T is NOT
 * available at +6s. Polled every few seconds across 125s on all four symbols, the first
 * sighting was **+10s on every one**, and `open` never changed thereafter. +6s returned
 * `no-bar` for BTC, ETH and SOL and looked like a provider fault; it was the probe being early.
 */
async function sampleOne(symbol: string, boundaryMs: number): Promise<Sample> {
  const a = ASSETS[symbol] ?? { decimals: 2, minMoveTicks: 1, category: "crypto" };
  const bandAbs = a.minMoveTicks * Math.pow(10, -a.decimals);
  const base: Sample = {
    ts: new Date().toISOString(), symbol, boundary: iso(boundaryMs),
    quotePrice: null, quoteQuotedAt: null, quoteSkewSec: null,
    barOpen: null, quoteMinuteBar: null, readersAgree: null,
    deltaAbs: null, deltaPct: null, bandAbs, deltaInBands: null,
  };

  // ① the OLD reader, at the instant it would really have been called
  const q = await readQuote(symbol);
  if ("err" in q) base.note = `quote: ${q.err}`;
  else {
    base.quotePrice = Number(q.price.toFixed(a.decimals));
    base.quoteQuotedAt = q.quotedAt;
    base.quoteSkewSec = Math.round((Date.parse(q.quotedAt) - boundaryMs) / 1000);
  }

  // ② the NEW reader, once bar T exists
  await sleep(Math.max(0, boundaryMs + 12_000 - Date.now()));
  const bars = await readBars(symbol);
  if ("err" in bars) {
    base.note = `${base.note ? base.note + " | " : ""}bars: ${bars.err}`;
    return base;
  }

  const lbl = label(boundaryMs);
  const bar = bars.find((b) => b.datetime.startsWith(lbl));
  if (!bar) {
    base.note = `${base.note ? base.note + " | " : ""}no bar labelled ${lbl} (returned ${bars[0]?.datetime} … ${bars[bars.length - 1]?.datetime})`;
    return base;
  }
  base.barOpen = Number(bar.open.toFixed(a.decimals));

  // ── The decomposition: TIMING, or genuine DISAGREEMENT? ──────────────────
  //
  // ⛔ THIS DELIBERATELY DOES NOT USE `last_quote_at`, AND THAT IS ITSELF A FINDING (E-74).
  // Measured on a raw `/quote` called at T+8s: `last_quote_at` came back as **T+60s** — the
  // NEXT whole minute, 52 seconds IN THE FUTURE. The provider rounds it UP to a minute label
  // rather than reporting the instant the price was quoted. So `/quote` cannot date a price to
  // better than a minute, and it currently names a minute that has not happened yet.
  //
  // The honest test is therefore against the bar covering the minute we ACTUALLY called in —
  // which is the boundary minute T. If the quote's price sits inside bar T's own range, the
  // two endpoints agree about the world and the delta is pure timing. If it sits outside,
  // they disagree about the world, and that is what must be resolved before the switch.
  base.quoteMinuteBar = { datetime: bar.datetime, low: bar.low, high: bar.high };
  if (base.quotePrice != null) {
    // Tolerance of one band — quote and bar round independently, and reporting rounding as
    // disagreement is how a correct feed gets condemned.
    base.readersAgree = base.quotePrice >= bar.low - bandAbs && base.quotePrice <= bar.high + bandAbs;
  }

  if (base.quotePrice != null && base.barOpen != null) {
    base.deltaAbs = Number((base.quotePrice - base.barOpen).toFixed(a.decimals));
    base.deltaPct = (base.deltaAbs / base.barOpen) * 100;
    base.deltaInBands = Math.abs(base.deltaAbs) / bandAbs;
  }
  return base;
}

// ───────────────────────────────────────────────────────────────────────────
// Reporting
// ───────────────────────────────────────────────────────────────────────────

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
function pct(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}

function report(): void {
  if (!existsSync(OUT)) { console.log(`no samples yet at ${OUT}`); return; }
  const rows: Sample[] = readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const paired = rows.filter((r) => r.deltaAbs != null);

  console.log(`\n═══ SHADOW REPORT — ${rows.length} samples, ${paired.length} with BOTH readers\n`);
  console.log("  symbol     n   median|Δ|   p90|Δ|    median Δ    band     median Δ in bands   quote skew   readers");
  console.log("  ─────────  ──  ──────────  ─────────  ──────────  ───────  ─────────────────   ──────────   ───────");

  for (const symbol of [...new Set(rows.map((r) => r.symbol))].sort()) {
    const rs = paired.filter((r) => r.symbol === symbol);
    if (rs.length === 0) { console.log(`  ${symbol.padEnd(9)}   0   (no paired samples)`); continue; }
    const abs = rs.map((r) => Math.abs(r.deltaAbs!));
    const signed = rs.map((r) => r.deltaAbs!);
    const bands = rs.map((r) => r.deltaInBands!);
    const skews = rs.map((r) => r.quoteSkewSec!).filter((x) => Number.isFinite(x));
    const judged = rs.filter((r) => r.readersAgree != null);
    const agree = judged.filter((r) => r.readersAgree).length;
    console.log(
      `  ${symbol.padEnd(9)}  ${String(rs.length).padStart(2)}  ` +
      `${median(abs)!.toFixed(2).padStart(10)}  ${pct(abs, 90)!.toFixed(2).padStart(9)}  ` +
      `${median(signed)!.toFixed(2).padStart(10)}  ${rs[0]!.bandAbs.toFixed(2).padStart(7)}  ` +
      `${median(bands)!.toFixed(1).padStart(17)}   ${(median(skews) ?? 0).toFixed(0).padStart(8)}s   ` +
      `${judged.length ? `${agree}/${judged.length}` : "—"}`,
    );
  }

  const judgedAll = paired.filter((r) => r.readersAgree != null);
  const disagree = judgedAll.filter((r) => !r.readersAgree);
  console.log("\n═══ VERDICT\n");
  console.log(`  Boundaries sampled with both readers: ${paired.length}${paired.length >= 100 ? "  ✅ ≥100" : "  ⚠️  target is ≥100"}`);
  if (judgedAll.length === 0) {
    console.log("  ⚠️  No sample could be decomposed — the quote's own minute was never in the bar window.");
  } else if (disagree.length === 0) {
    console.log(`  ✅ ${judgedAll.length}/${judgedAll.length} samples: the quote's price sits INSIDE the bar covering its own`);
    console.log("     minute. The two endpoints agree about the world — every delta above is TIMING,");
    console.log("     i.e. `/quote` describing an instant ~40s before the boundary it was asked about.");
    console.log("     ⭐ That is the OLD reader being wrong, and correcting it is the point of the rebuild.");
  } else {
    console.log(`  🔴 ${disagree.length}/${judgedAll.length} samples: the quote's price fell OUTSIDE its own minute's bar`);
    console.log("     range. The two endpoints disagree about the world, not merely about the instant.");
    console.log("     ⛔ RESOLVE THIS BEFORE THE SWITCH — it is not a timing artefact.");
    for (const d of disagree.slice(0, 8)) {
      console.log(`       ${d.symbol} ${d.boundary} quote=${d.quotePrice} vs bar[${d.quoteMinuteBar?.low}, ${d.quoteMinuteBar?.high}] @${d.quoteMinuteBar?.datetime}`);
    }
  }
  const noted = rows.filter((r) => r.note);
  if (noted.length) {
    console.log(`\n  ${noted.length} sample(s) carried a refusal — these are DATA, not errors:`);
    const byNote = new Map<string, number>();
    for (const n of noted) {
      const k = n.note!.replace(/\d{4}-\d{2}-\d{2}[ T][\d:]+/g, "<t>").slice(0, 90);
      byNote.set(k, (byNote.get(k) ?? 0) + 1);
    }
    for (const [k, v] of [...byNote].sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(4)} × ${k}`);
  }
  console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// §D · THE WEEKEND ARM — replayed, because `/quote` cannot be
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ A PAIRED WEEKEND DELTA IS IMPOSSIBLE BY CONSTRUCTION, NOT BY CHOICE. `/quote` only ever
// answers "the price NOW", so there is no way to ask it what gold was worth last Saturday.
// Saying so plainly is better than quietly sampling something else and calling it a weekend.
//
// What CAN be replayed is the half that matters: does the provider publish bars for a market
// that was SHUT? E-36 measured 1,440 gold bars on a Saturday, and under bar settlement there
// is no staleness rule left to catch a frozen holiday — the calendar gate is the only thing
// standing between those phantom bars and a settled round.
async function weekendArm(): Promise<void> {
  console.log("═══ §D · WEEKEND — does the provider publish bars for a SHUT market?\n");
  console.log("    `/quote` cannot be replayed, so this arm is bar-only and says so.");
  console.log("    Sat 2026-08-01 / Sun 2026-08-02, XAU/USD — a market that was closed.\n");

  for (const day of ["2026-08-01", "2026-08-02"]) {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", "1min");
    url.searchParams.set("start_date", `${day} 00:00:00`);
    url.searchParams.set("end_date", `${day} 23:59:00`);
    url.searchParams.set("outputsize", "5000");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", KEY);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      const j = (await res.json()) as { values?: Array<Record<string, string>>; message?: string };
      const n = j.values?.length ?? 0;
      const opens = (j.values ?? []).map((v) => Number(v.open)).filter(Number.isFinite);
      const spread = opens.length ? Math.max(...opens) - Math.min(...opens) : 0;
      console.log(`  ${day}  bars=${String(n).padStart(5)}  open range=$${spread.toFixed(2)}  ${n > 0 ? "🔴 the provider DOES publish a shut market" : "✅ none"}`);
      if (n > 0) {
        console.log(`           ⛔ Under bar settlement nothing but the CALENDAR GATE stops these settling a round.`);
        console.log(`              It must run BEFORE any fetch — which is where readPrice already puts it (E-36).`);
      }
    } catch (e) {
      console.log(`  ${day}  ❌ ${(e as Error).message}`);
    }
  }
  console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

if (has("report")) { report(); process.exit(0); }

if (!KEY) {
  console.error("TWELVEDATA_API_KEY is not set. Run through `railway run -s 50pick --`.");
  process.exit(2);
}

mkdirSync(OUT_DIR, { recursive: true });

if (has("weekend")) { await weekendArm(); process.exit(0); }

console.log(`═══ SHADOW MODE — ${symbols.length} symbols × ${samples} boundaries`);
console.log(`    Both readers, same instant, delta recorded ONLY. Nothing branches on it.`);
console.log(`    ~${symbols.length * samples * 2} provider credits. Appending to ${OUT}\n`);

for (let i = 0; i < samples; i++) {
  // Align to the next whole minute — exactly the boundary a round would carry, and the only
  // kind of instant a 1-minute bar can be labelled with (E-70 / `e85a7a71`).
  const nextMinuteMs = Math.ceil((Date.now() + 1000) / 60_000) * 60_000;
  // Wake AT the boundary: `sampleOne` fires `/quote` immediately (that is when production
  // calls it) and waits for +12s itself before asking for bar T.
  await sleep(Math.max(0, nextMinuteMs + 1_000 - Date.now()));

  const results = await Promise.all(symbols.map((s) => sampleOne(s, nextMinuteMs)));
  for (const r of results) appendFileSync(OUT, JSON.stringify(r) + "\n");

  const line = results.map((r) =>
    r.deltaAbs != null
      ? `${r.symbol.split("/")[0]} Δ${r.deltaAbs >= 0 ? "+" : ""}${r.deltaAbs.toFixed(2)}(${r.deltaInBands!.toFixed(0)}b)${r.readersAgree === false ? "🔴" : ""}`
      : `${r.symbol.split("/")[0]} —`,
  ).join("  ");
  console.log(`  ${label(nextMinuteMs)}  ${line}`);
}

report();
