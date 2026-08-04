/**
 * ops · Can a 1-minute BAR settle a round? — the measurement that gates the whole
 *       time-series settlement rebuild (campaign §6c, 2026-08-04).
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * Settlement today reads `/quote`, which only answers "what is the price NOW". Miss the
 * instant and the number is gone forever, so the round VOIDs — that is E-69 (a round
 * resolved 529s late with `closePrice NULL` while the source never failed), E-63 (SOL:
 * 290 of 290 rounds source-failed) and E-68.
 *
 * The proposed fix is to settle from `time_series?interval=1min` — a DATED bar, which
 * returns the same number whether asked at the boundary or hours later. `fetchBars` in
 * `ops-updown-margin-study.mts` proves that works for bars that are HOURS old.
 *
 * ⛔ IT HAS NEVER BEEN PROVEN FOR THE BOUNDARY ITSELF, AND THAT IS THE WHOLE QUESTION.
 * A bar labelled T covers [T, T+60s) and is aggregated by the provider. Two properties
 * decide whether the design is buildable at all:
 *
 *   1. LATENCY   — how soon after T does a bar labelled T exist?
 *   2. STABILITY — once it appears, does its `open` ever CHANGE on a later fetch?
 *
 * If `open` is stable from first appearance, "price at T = open of bar T" is immutable and
 * the rebuild is sound. If it drifts while the bar forms, the rule is NOT immutable, a
 * round could settle differently depending on when it was read, and the design needs
 * rework rather than implementation. There is no way to answer this from documentation.
 *
 * ── AND THE TIMEZONE TRAP, WHICH MAY ALREADY BE LIVE ─────────────────────────
 * `time_series`'s `timezone` parameter defaults to **`Exchange`**, not UTC. `fetchBars`
 * parses `datetime` by appending `"Z"` — i.e. it ASSUMES UTC. On 2026-08-04 a single run
 * returned XAU/USD bars ending `17:20` while BTC/USD from the same run ended `07:19`, ten
 * hours apart. If that is the exchange-local default rather than a data quirk, then gold's
 * bars are being read at the WRONG INSTANTS, and a settlement built on them would move
 * money on the wrong minute. §A answers it with one paired call per symbol.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 * Writes NOTHING. `DATABASE_URL` is deleted before any import, so no observation, round,
 * asset or usage row can be touched. Costs roughly 8 + (polls) provider credits and ZERO
 * Anthropic tokens.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 * Run THROUGH railway so the production key is injected and never written down:
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-bars.mts
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-bars.mts --symbol ETH/USD
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-bars.mts --skip-stability
 *
 * ⚠️ PowerShell splats a comma-separated argument into SEPARATE arguments. Quote any list:
 *   ... --symbols "BTC/USD,ETH/USD"
 */

// ⛔ BEFORE ANY IMPORT — the same rule `ops-updown-probe-feed.mts` and
// `ops-updown-margin-study.mts` document. `railway run` injects the INTERNAL DATABASE_URL,
// which does not resolve from a laptop; leaving it set would hang any DAL call. Deleting it
// is also what guarantees this probe cannot write to the live money database.
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;

const KEY = process.env.TWELVEDATA_API_KEY ?? "";
if (!KEY) {
  console.error("TWELVEDATA_API_KEY is not set. Run through `railway run -s 50pick --`.");
  process.exit(2);
}

const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : d;
};
const has = (n: string) => process.argv.includes(`--${n}`);

const symbols = (arg("symbols") ?? arg("symbol") ?? "BTC/USD,ETH/USD,SOL/USD,XAU/USD")
  .split(",").map((s) => s.trim()).filter(Boolean);
const stabilitySymbol = arg("stability-symbol") ?? symbols[0]!;

type Bar = { datetime: string; open: string; high: string; low: string; close: string };
type Series = { meta?: Record<string, unknown>; values?: Bar[]; status?: string; message?: string; code?: number };

/** One `time_series` read. 1 credit per call regardless of outputsize (provider docs). */
async function series(symbol: string, opts: { tz?: string; size?: number }): Promise<Series> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("outputsize", String(opts.size ?? 3));
  if (opts.tz) url.searchParams.set("timezone", opts.tz);
  url.searchParams.set("apikey", KEY);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  return (await res.json()) as Series;
}

const iso = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// §A · TIMEZONE — is `datetime` UTC, and does the default differ?
// ═══════════════════════════════════════════════════════════════════════════
console.log("═══ §A · TIMEZONE — does the provider label bars in UTC by default?");
console.log("    Our reader appends \"Z\" to `datetime`, so anything but UTC settles the wrong minute.\n");

let tzFindings = 0;
for (const symbol of symbols) {
  try {
    const [withUtc, withDefault] = await Promise.all([
      series(symbol, { tz: "UTC" }),
      series(symbol, {}),
    ]);
    const a = withUtc.values?.[0]?.datetime;
    const b = withDefault.values?.[0]?.datetime;
    if (!a || !b) {
      console.log(`  ${symbol.padEnd(9)} ⚠️  no values — ${withUtc.message ?? withDefault.message ?? "empty response"}`);
      continue;
    }
    const skewMin = Math.round((Date.parse(`${a.replace(" ", "T")}Z`) - Date.parse(`${b.replace(" ", "T")}Z`)) / 60_000);
    const exch = String((withDefault.meta as Record<string, unknown> | undefined)?.exchange_timezone ?? "?");
    const flag = skewMin === 0 ? "✅ same" : `🔴 DIFFER by ${skewMin} min`;
    if (skewMin !== 0) tzFindings++;
    console.log(`  ${symbol.padEnd(9)} utc=${a}  default=${b}  ${flag}`);
    console.log(`  ${"".padEnd(9)} exchange_timezone=${exch}`);
  } catch (e) {
    console.log(`  ${symbol.padEnd(9)} ❌ ${(e as Error).message}`);
  }
}
console.log(
  tzFindings === 0
    ? "\n  → Default already matches UTC for every symbol probed. Passing timezone=UTC is still\n    correct (it removes the dependency on a default), but nothing is mis-labelled today.\n"
    : `\n  🔴 ${tzFindings} symbol(s) label bars in a NON-UTC zone by default. Any reader that appends\n     "Z" is settling those on the wrong minute. timezone=UTC is mandatory, not hygiene.\n`,
);

// ═══════════════════════════════════════════════════════════════════════════
// §C · LABELLING — does `datetime` mark the bar's START or its END?
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ THIS IS THE MONEY-CRITICAL ONE. Settle on the wrong minute and every round is
// decided by a price from a different moment than the one the player was shown.
//
// The provider's docs imply START labelling. But §B measured a bar labelled T whose
// `close` was already final five seconds after T — which a still-forming [T, T+60)
// bar cannot be. So the docs are not sufficient evidence for OUR feed.
//
// The decisive test is CONTIGUITY, and it also happens to make the question moot when it
// passes: if `close` of the bar labelled T−1 equals `open` of the bar labelled T, then both
// describe the SAME INSTANT — the seam between the two minutes — and "price at T" is
// unambiguous no matter which end the label refers to. If they DIFFER, the bars are not
// contiguous, the seam is undefined, and a settlement rule must name one of them explicitly.
console.log("═══ §C · LABELLING — are consecutive bars contiguous at the seam?");
console.log("    If close(T−1) == open(T) the seam is one unambiguous price and labelling is moot.\n");

for (const symbol of symbols) {
  try {
    const s = await series(symbol, { tz: "UTC", size: 6 });
    const vals = (s.values ?? []).slice().reverse(); // provider returns newest-first
    if (vals.length < 3) { console.log(`  ${symbol.padEnd(9)} ⚠️  only ${vals.length} bars`); continue; }
    console.log(`  ${symbol}`);
    let seams = 0, matches = 0;
    for (let i = 1; i < vals.length; i++) {
      const prev = vals[i - 1]!, cur = vals[i]!;
      const same = Number(prev.close) === Number(cur.open);
      seams++; if (same) matches++;
      console.log(
        `    ${prev.datetime.slice(11)}→${cur.datetime.slice(11)}  ` +
          `close(prev)=${prev.close.padEnd(12)} open(cur)=${cur.open.padEnd(12)} ` +
          (same ? "✅ same instant" : `🔴 gap ${(Number(cur.open) - Number(prev.close)).toFixed(4)}`),
      );
    }
    console.log(
      matches === seams
        ? `    → contiguous on ${seams}/${seams} seams: "price at T" is unambiguous.\n`
        : `    🔴 ${seams - matches}/${seams} seams DISAGREE — the settlement rule must name one end explicitly.\n`,
    );
  } catch (e) {
    console.log(`  ${symbol.padEnd(9)} ❌ ${(e as Error).message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// §B · LATENCY + STABILITY — the gate
// ═══════════════════════════════════════════════════════════════════════════
if (has("skip-stability")) {
  console.log("═══ §B skipped (--skip-stability)");
  process.exit(0);
}

console.log(`═══ §B · LATENCY + STABILITY on ${stabilitySymbol}`);
console.log("    Waiting for the next whole minute, then polling the bar labelled at that minute.\n");

// Align to the next whole minute so T is a clean boundary — exactly what a round would use.
const nextMinuteMs = Math.ceil(Date.now() / 60_000) * 60_000;
await sleep(Math.max(0, nextMinuteMs - Date.now()) + 500);

const T = nextMinuteMs;
const label = iso(T).slice(0, 16); // "YYYY-MM-DD HH:MM" — how the provider labels a 1min bar
console.log(`  T = ${label} (UTC)\n`);
console.log("   after T  bar T?   open           close          open changed?");
console.log("   ───────  ──────   ────────────   ────────────   ─────────────");

const offsetsSec = [5, 15, 30, 65, 90, 120, 180];
let firstOpen: string | null = null;
let firstSeenAt: number | null = null;
let openChanged = false;

for (const off of offsetsSec) {
  await sleep(Math.max(0, T + off * 1000 - Date.now()));
  let bar: Bar | undefined;
  try {
    const s = await series(stabilitySymbol, { tz: "UTC", size: 5 });
    bar = s.values?.find((v) => v.datetime.startsWith(label));
  } catch (e) {
    console.log(`   +${String(off).padStart(4)}s  ❌ ${(e as Error).message}`);
    continue;
  }
  if (!bar) {
    console.log(`   +${String(off).padStart(4)}s  no       —              —              —`);
    continue;
  }
  if (firstOpen === null) { firstOpen = bar.open; firstSeenAt = off; }
  const changed = bar.open !== firstOpen;
  if (changed) openChanged = true;
  console.log(
    `   +${String(off).padStart(4)}s  yes      ${bar.open.padEnd(12)}   ${bar.close.padEnd(12)}   ` +
      (firstSeenAt === off ? "(first sighting)" : changed ? `🔴 WAS ${firstOpen}` : "✅ unchanged"),
  );
}

console.log("\n═══ VERDICT");
if (firstOpen === null) {
  console.log("  🔴 The bar labelled T never appeared within 180s.");
  console.log("     Settlement cannot depend on a bar that is not published in time for the round.");
  console.log("     ⛔ STOP — the design needs rework, not implementation.");
  process.exitCode = 1;
} else if (openChanged) {
  console.log(`  🔴 \`open\` CHANGED after first publication (first seen +${firstSeenAt}s).`);
  console.log("     \"price at T = open of bar T\" is NOT immutable, so the same round could settle");
  console.log("     differently depending on when it was read.");
  console.log("     ⛔ STOP — the design needs rework, not implementation.");
  process.exitCode = 1;
} else {
  console.log(`  ✅ Bar T first available at +${firstSeenAt}s, and \`open\` never changed thereafter.`);
  console.log("     \"price at T = open of bar T\" is immutable from first publication.");
  console.log("     → The rebuild is sound on this point. Record the latency: a round's close must not");
  console.log(`       be attempted before +${firstSeenAt}s, and being LATE costs nothing.`);
}
