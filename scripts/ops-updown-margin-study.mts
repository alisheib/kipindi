/**
 * ops · What margin actually resolves a round? — the measurement behind finding E-32.
 *
 * ── WHY THIS EXISTS (2026-08-02) ─────────────────────────────────────────────
 * `updown.config.defaultMarginBps` is **50 = 0.5%** for every duration and every asset
 * class. `computeTargets` freezes UP at `base + 0.5%` and DOWN at `base − 0.5%`, and
 * anything between those two lines VOIDs and refunds every stake.
 *
 * On 2026-08-02 the first five rounds the platform has ever settled were measured
 * (campaign §6q). Their real moves were 0.168%, 0.048%, 0.089%, 0.030% and 0.002% —
 * so **all five** would have voided at the product default while the feed worked
 * perfectly. A chain left on the default produces a round history indistinguishable
 * from a broken feed (findings E-16 / E-25), which is the worst possible failure mode:
 * safe, silent, and it looks like the thing that was just fixed.
 *
 * Five rounds is an anecdote. This tool turns the question into a measurement: it pulls
 * real 1-minute bars from the SAME provider the money path reads, slices them into
 * non-overlapping windows of each round duration the platform offers, and reports, for
 * each candidate margin, **what fraction of rounds would VOID**.
 *
 * That is the number the decision actually turns on. A margin is not a fairness knob:
 *   · too WIDE  → the game barely ever resolves, every stake refunds, no commission is
 *                 ever earned, and players see a history full of VOID
 *   · too NARROW → sub-tick noise decides real money, and the "50pick factor" that makes
 *                 this a prediction rather than a coin flip is gone
 *
 * ── WHAT IT IS NOT ───────────────────────────────────────────────────────────
 * It is **not** a recommendation engine. It reports void rates against a real sample and
 * names the sample; choosing the margin is a pricing decision for the operator.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 * Writes NOTHING. `DATABASE_URL` is deleted before any import, so no round, asset or
 * usage row can be touched. Costs ONE provider credit per symbol (the live plan is
 * 800/day) and ZERO Anthropic tokens.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 * Run THROUGH railway so the production key is injected and never written down:
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-margin-study.mts
 *   railway run -s 50pick -- npm run ops:updown-margin-study -- --symbols BTC/USD,XAU/USD
 *   railway run -s 50pick -- npm run ops:updown-margin-study -- --durations 5,15 --json
 *
 * Options: --symbols a,b,c · --durations 5,15,30,60 · --bars N (default 5000, the
 *          provider max) · --json (machine-readable, for a doc table)
 */

// ⛔ BEFORE ANY IMPORT — the same rule `ops-updown-probe-feed.mts` documents. `railway run`
// injects the INTERNAL DATABASE_URL, which does not resolve from a laptop; leaving it set
// would hang any DAL call. Deleting it is also what guarantees this study cannot write to
// the live money database.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.SESSION_SECRET ??= "study-only-session-secret-32chars-a";
process.env.OTP_PEPPER ??= "study-only-otp-pepper-16";

import { writeFileSync } from "node:fs";
// The REAL money-path function, imported rather than re-derived — a study that
// re-implements the arithmetic it is studying can agree with itself and still be wrong.
//
// ⚠️ ITS IMPORT GRAPH TALKS TO THE DATABASE, and `--json` must survive that. `computeTargets`
// is pure, but the module it lives in reaches `config-store`, which hydrates other config
// blobs and logs a wall of `prisma:error` to STDOUT when it cannot reach the DB. Harmless —
// it is the proof this study writes nothing — but it corrupts machine-readable output, so
// `--out` writes the JSON to a FILE instead of trying to keep stdout clean.
//
// ⚠️ AND DO NOT "FIX" THIS BY MAKING IT A DYNAMIC `await import`. `tsx` transpiles this file
// to CJS, so static imports are hoisted ABOVE the `delete process.env.DATABASE_URL` lines
// while a dynamic one runs after them — and `store.ts` throws a FATAL guard when
// DATABASE_URL is absent. The static form is load-bearing, not stylistic.
import { computeTargets } from "../src/lib/server/updown-config.ts";

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d;
};
const has = (n: string) => process.argv.includes(`--${n}`);

/** The margins offered for comparison, in basis points. 50 is the current product default. */
// ⚠️ 1 bps granularity matters at the short end and is not padding: on a 5-minute crypto
// round the whole usable range turns out to sit between 0 and 3 bps, so a table sampled at
// 0/2/5 cannot answer the question. `marginBps` is validated as an INTEGER, so 1 bps is the
// finest the product can express — which is itself part of the finding.
const CANDIDATES = [0, 1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 35, 50, 75, 100, 150, 200];

/**
 * The live asset rows this study models. `decimals`/`minMoveTicks` are the LIVE values,
 * because `computeTargets` floors the margin at `minMoveTicks × 10^-decimals` — so on GOLD
 * (ticks 15) a margin of 0 is not "no band", it is a $0.15 band, and the void rate at 0
 * is genuinely different per asset. Read from /admin/updown, not assumed.
 */
const ASSETS: Record<string, { klass: string; decimals: number; minMoveTicks: number }> = {
  "BTC/USD": { klass: "crypto", decimals: 2, minMoveTicks: 1 },
  "ETH/USD": { klass: "crypto", decimals: 2, minMoveTicks: 1 },
  "XAU/USD": { klass: "metals", decimals: 2, minMoveTicks: 15 },
  "EUR/USD": { klass: "forex", decimals: 5, minMoveTicks: 1 },
};

/**
 * Is this instant inside the asset class's real trading week?
 *
 * ⚠️ THIS IS NOT DEFENSIVE TIDYING — it is the correction for a measurement that was lying.
 * The first run of this study reported gold's median 5-minute move as **0.004%** and EUR/USD's
 * as 0.007%, which would have been quoted to Ali as "these assets barely move". Both numbers
 * were polluted: the provider returns **1,440 one-minute bars on a Saturday**, with high > low
 * and NO gaps, for two markets that are shut all Saturday. Inspected minute by minute, those
 * bars pin their **open** to the same value (4042.684 on gold, every single minute) while the
 * close jitters ±0.1 around it — synthetic noise around a frozen anchor, not trading. Friday's
 * bars behave correctly (each open ≈ the previous close).
 *
 * So: for forex and metals, only Mon-Fri inside the real session is a measurement. Crypto
 * trades genuinely 24/7 and is not filtered. The SHUT windows are not discarded — they are
 * reported separately, because what happens in them is finding E-36.
 *
 * Session (UTC): opens Sunday 22:00, closes Friday 21:00. Conservative on both edges.
 */
function inTradingWeek(ms: number, klass: string): boolean {
  if (klass === "crypto") return true;
  const d = new Date(ms);
  const dow = d.getUTCDay(), h = d.getUTCHours();
  if (dow === 6) return false;                    // Saturday: shut all day
  if (dow === 0) return h >= 22;                  // Sunday: opens 22:00
  if (dow === 5) return h < 21;                   // Friday: closes 21:00
  return true;
}

const symbols = (arg("symbols") ?? "BTC/USD,ETH/USD,XAU/USD,EUR/USD").split(",").map((s) => s.trim()).filter(Boolean);
const durations = (arg("durations") ?? "5,15,30,60").split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
const bars = Number(arg("bars", "5000"));
const asJson = has("json");

const key = process.env.TWELVEDATA_API_KEY ?? "";
if (!key) {
  console.error("❌ TWELVEDATA_API_KEY is not set — run this THROUGH `railway run -s 50pick --`.");
  process.exit(1);
}

type Bar = { t: number; o: number; c: number; h: number; l: number };

/**
 * 1-minute bars, oldest-first. The provider returns newest-first, and getting that
 * backwards silently inverts every window's open and close — which would not change a
 * void rate (|move| is symmetric) but WOULD invert every UP/DOWN split, so it is fixed
 * here rather than assumed.
 */
async function fetchBars(symbol: string): Promise<Bar[]> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("outputsize", String(bars));
  url.searchParams.set("apikey", key);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = (await res.json()) as { status?: string; message?: string; values?: Array<Record<string, string>> };
  if (!res.ok || body.status === "error" || !Array.isArray(body.values)) {
    throw new Error(`${symbol}: ${body.message ?? `HTTP ${res.status}`}`);
  }
  return body.values
    .map((v) => ({
      t: Date.parse(`${v.datetime!.replace(" ", "T")}Z`),
      o: Number(v.open), c: Number(v.close), h: Number(v.high), l: Number(v.low),
    }))
    .filter((b) => Number.isFinite(b.t) && Number.isFinite(b.o) && Number.isFinite(b.c))
    .sort((a, b) => a.t - b.t);
}

/**
 * Slice bars into windows of `minutes`, aligned to the grid the engine actually uses
 * (a chain emits at every `durationMinutes` boundary of the clock, not from an arbitrary
 * offset), and take each window's FIRST open and LAST close — exactly the two readings a
 * round takes at its own two boundaries.
 *
 * ⚠️ Windows with a GAP are dropped, not filled. A shut market leaves minutes missing, and
 * a window stitched across a session break would report the weekend's move as a 5-minute
 * one — which is how a study of gold overstates its volatility by an order of magnitude.
 */
function windows(barsIn: Bar[], minutes: number): Array<{ open: number; close: number; from: number }> {
  const span = minutes * 60_000;
  const byWindow = new Map<number, Bar[]>();
  for (const b of barsIn) {
    const k = Math.floor(b.t / span) * span;
    (byWindow.get(k) ?? byWindow.set(k, []).get(k)!).push(b);
  }
  const out: Array<{ open: number; close: number; from: number }> = [];
  for (const [k, group] of [...byWindow.entries()].sort((a, b) => a[0] - b[0])) {
    if (group.length < minutes) continue; // incomplete or gapped — not a real round window
    out.push({ open: group[0]!.o, close: group[group.length - 1]!.c, from: k });
  }
  return out;
}

const results: Array<Record<string, unknown>> = [];

for (const symbol of symbols) {
  const meta = ASSETS[symbol] ?? { klass: "unknown", decimals: 2, minMoveTicks: 1 };
  let all: Bar[];
  try {
    all = await fetchBars(symbol);
  } catch (e) {
    console.log(`❌ ${symbol} — ${(e as Error).message}\n`);
    process.exitCode = 1;
    continue;
  }
  if (!asJson) {
    const from = new Date(all[0]!.t).toISOString().slice(0, 16).replace("T", " ");
    const to = new Date(all[all.length - 1]!.t).toISOString().slice(0, 16).replace("T", " ");
    console.log(`── ${symbol}  (${meta.klass}, decimals ${meta.decimals}, minMoveTicks ${meta.minMoveTicks})`);
    console.log(`   ${all.length} one-minute bars   ${from}Z → ${to}Z   last ${all[all.length - 1]!.c}\n`);
  }

  for (const minutes of durations) {
    const allW = windows(all, minutes);
    const w = allW.filter((x) => inTradingWeek(x.from, meta.klass));
    const shut = allW.filter((x) => !inTradingWeek(x.from, meta.klass));

    // ── E-36. What would a chain DO if it ran while the market was shut? ──────────
    // The documented decision in `updown-feed.ts:237` is that no market-hours gate is
    // needed, because "a shut market stops advancing last_quote_at" and, failing that,
    // "the minMoveTicks no-move rule voids and refunds — that failure is safe".
    // Measured here against the provider actually in production, BOTH halves are false:
    // `last_quote_at` advances every minute through the weekend, and the price is not
    // frozen but jittering, so a share of those rounds RESOLVE — paying real money on a
    // price no market made. Printed as a share, per margin, so the claim is a number.
    if (shut.length >= 20) {
      const resolveAt = (bps: number) => {
        let r = 0;
        for (const x of shut) {
          const { upTarget, downTarget } = computeTargets(x.open, bps, meta);
          if (x.close >= upTarget || x.close <= downTarget) r++;
        }
        return ((r / shut.length) * 100).toFixed(1);
      };
      results.push({ symbol, klass: meta.klass, minutes, marketShut: true, windows: shut.length,
        resolvePctAt0: Number(resolveAt(0)), resolvePctAt5: Number(resolveAt(5)), resolvePctAt50: Number(resolveAt(50)) });
      if (!asJson) {
        console.log(`   ${String(minutes).padStart(2)}m · ⚠️  MARKET SHUT: ${shut.length} windows the provider still quoted — ` +
          `${resolveAt(0)}% would RESOLVE at margin 0, ${resolveAt(5)}% at 0.05%, ${resolveAt(50)}% at 0.50%`);
        console.log(`        → real money settled on synthetic weekend prices. Finding E-36.`);
      }
    }

    if (w.length < 20) {
      if (!asJson) console.log(`   ${minutes}m — only ${w.length} complete windows in the sample; skipped\n`);
      continue;
    }
    const moves = w.map((x) => Math.abs(x.close - x.open) / x.open).sort((a, b) => a - b);
    const pct = (p: number) => moves[Math.min(moves.length - 1, Math.floor(p * moves.length))]! * 100;

    // The void rate is computed through `computeTargets` — the REAL money-path function,
    // including its `minMoveTicks` floor — not through a re-derived formula. A study that
    // re-implements the arithmetic it is studying can agree with itself and still be wrong.
    const row: Record<string, unknown> = {
      symbol, klass: meta.klass, minutes, windows: w.length,
      medianPct: Number(pct(0.5).toFixed(4)), p75Pct: Number(pct(0.75).toFixed(4)),
      p90Pct: Number(pct(0.9).toFixed(4)), maxPct: Number((moves[moves.length - 1]! * 100).toFixed(4)),
    };
    const voids: Record<string, number> = {};
    for (const bps of CANDIDATES) {
      let v = 0;
      for (const x of w) {
        const { upTarget, downTarget } = computeTargets(x.open, bps, meta);
        if (x.close < upTarget && x.close > downTarget) v++;
      }
      voids[String(bps)] = Number(((v / w.length) * 100).toFixed(1));
    }
    row.voidRatePct = voids;
    results.push(row);

    if (!asJson) {
      console.log(`   ${String(minutes).padStart(2)}m · ${String(w.length).padStart(4)} windows · ` +
        `median move ${pct(0.5).toFixed(3)}% · p90 ${pct(0.9).toFixed(3)}% · max ${(moves[moves.length - 1]! * 100).toFixed(3)}%`);
      const cells = CANDIDATES.map((b) => `${(b / 100).toFixed(2)}%:${String(voids[String(b)]).padStart(5)}%`);
      for (let i = 0; i < cells.length; i += 5) console.log(`        void  ${cells.slice(i, i + 5).join("  ")}`);
      console.log("");
    }
  }
}

const out = arg("out");
if (out) {
  writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`\n  wrote ${results.length} rows → ${out}`);
}
if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log("──────────────────────────────────────────────────────");
  console.log("  void rate = share of real windows whose close landed INSIDE the band");
  console.log("  → every one of those refunds: no winner, no loser, no commission.");
  console.log("  The product default is 0.50%. Compare its column against 0.05-0.15%.");
}
