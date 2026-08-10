/**
 * MEASURE AN ASSET AGAINST THE PROVIDER'S OWN TAPE, and store the profile the playbook reads.
 *
 *   npx tsx scripts/ops-updown-profile.mts XAU/USD BTC/USD      # measure these
 *   npx tsx scripts/ops-updown-profile.mts --enabled            # every enabled asset
 *   npx tsx scripts/ops-updown-profile.mts --days 14 ETH/USD    # longer window
 *   npx tsx scripts/ops-updown-profile.mts --dry XAU/USD        # print, write nothing
 *
 * ⛔ READ-ONLY AGAINST THE PLATFORM. It writes one `SystemConfig` row per symbol and touches
 * nothing else — no market, no round, no wallet, no ledger. Safe on a schedule, safe on prod.
 *
 * ⭐ IT IS ALSO THE DISCOVERY PATH. Point it at any TwelveData symbol and it screens one that has
 * never been listed — which is the whole reason the playbook exists, because the two advice
 * sources that came before it can only learn from rounds we already ran.
 *
 * ⚠️ Needs `TWELVEDATA_API_KEY`. Without a `DATABASE_URL` the save is a no-op by design
 * (`config-store` no-ops), so `--dry` and a local run print the same numbers either way.
 */
import { pathToFileURL } from "node:url";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";
import type { AssetProfile } from "../src/lib/updown-playbook.ts";
import { buildPlaybook, judgeAsset, DEFAULT_POLICY } from "../src/lib/updown-playbook.ts";
import { saveProfile, loadProfile } from "../src/lib/server/updown-playbook-store.ts";

const API = "https://api.twelvedata.com/time_series";
/** ⚠️ TwelveData sits behind Cloudflare and answers a default Node/py agent with `error 1010`.
 *  A browser UA is not a trick here — it is the documented cost of their edge. */
const UA = { "User-Agent": "Mozilla/5.0 (compatible; 50pick-ops/1.0)" };
const MAX_BARS = 5000;

type Bar = { datetime: string; open: number; close: number };

const argv = process.argv.slice(2);
const flag = (n: string, d: number) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d;
};
const DAYS = flag("days", 7);
const DRY = argv.includes("--dry");
const symbols = argv.filter((a) => !a.startsWith("--") && /^[A-Z0-9]+\/[A-Z]{3}$/.test(a));

/** Median, ignoring non-finite entries. Sorted copy — never mutates the caller's array. */
const median = (xs: number[]): number => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
};
const pvar = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
};

async function fetchBars(symbol: string, days: number, key: string): Promise<Bar[]> {
  const end = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  const seen = new Map<string, Bar>();
  let cur = new Date(end.getTime() - days * 86_400_000);
  while (cur < end) {
    const next = new Date(Math.min(cur.getTime() + (MAX_BARS - 1) * 60_000, end.getTime()));
    const q = new URLSearchParams({
      symbol, interval: "1min", outputsize: String(MAX_BARS), timezone: "UTC", order: "ASC",
      apikey: key,
      start_date: cur.toISOString().slice(0, 19).replace("T", " "),
      end_date: next.toISOString().slice(0, 19).replace("T", " "),
    });
    const r = await fetch(`${API}?${q}`, { headers: UA });
    const j = (await r.json()) as { status?: string; message?: string; values?: Array<Record<string, string>> };
    if (j.status === "error") throw new Error(`${symbol}: ${j.message ?? "provider error"}`);
    for (const v of j.values ?? []) {
      seen.set(v.datetime!, { datetime: v.datetime!, open: Number(v.open), close: Number(v.close) });
    }
    cur = new Date(next.getTime() + 60_000);
    await new Promise((res) => setTimeout(res, 1000));   // stay clear of the per-minute credit cap
  }
  return [...seen.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
}

/**
 * ⛔ THE SHUT-MINUTE FILTER MIRRORS `market-calendar.ts` AND MUST KEEP MIRRORING IT. Counting a
 * weekend minute as a normal one would tell an operator gold is calmer than it is, on the strength
 * of a synthesised tape nobody can bet into. Guarded at `test:updown-playbook` §5.
 */
const isShut = (category: string, d: Date): boolean => {
  if (category !== "macro") return false;
  const dow = d.getUTCDay(), h = d.getUTCHours();
  return dow === 6 || (dow === 0 && h < 22) || (dow === 5 && h >= 21);
};

export function profileFromBars(symbol: string, category: string, floor: number, bars: Bar[]): AssetProfile {
  const ts = bars.map((b) => new Date(`${b.datetime.replace(" ", "T")}Z`));
  const open = new Map(bars.map((b) => [b.datetime, b.open]));
  const key = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const spanMin = Math.round((ts[ts.length - 1]!.getTime() - ts[0]!.getTime()) / 60_000) + 1;

  let still = 0;
  for (let i = 1; i < bars.length; i++) if (bars[i]!.open === bars[i - 1]!.open) still++;

  const medianMove: Record<number, number> = {};
  const refundRate: Record<number, number> = {};
  const persistence: Record<number, number> = {};
  for (const D of ALLOWED_DURATIONS) {
    const moves: number[] = [];
    let same = 0, decided = 0;
    for (const t of ts) {
      if (isShut(category, t)) continue;
      const a = open.get(key(t));
      const b = open.get(key(new Date(t.getTime() + D * 60_000)));
      const p = open.get(key(new Date(t.getTime() - D * 60_000)));
      if (a == null || b == null) continue;
      moves.push(Math.abs(b - a));
      if (p != null && Math.abs(a - p) >= floor && Math.abs(b - a) >= floor) {
        decided++;
        if ((a - p > 0) === (b - a > 0)) same++;
      }
    }
    if (!moves.length) continue;
    medianMove[D] = median(moves);
    refundRate[D] = moves.filter((m) => m < floor).length / moves.length;
    // ⚠️ A directional edge on a handful of rounds is noise wearing a percentage sign. Below this
    // the key is simply absent, which the engine reads as "unmeasured" rather than "fine".
    if (decided > 200) persistence[D] = same / decided;
  }

  const hourly: number[][] = Array.from({ length: 24 }, () => []);
  for (let i = 1; i < bars.length; i++) {
    const t = ts[i]!;
    if (isShut(category, t)) continue;
    hourly[t.getUTCHours()]!.push(Math.abs(bars[i]!.open - bars[i - 1]!.open));
  }

  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!.open;
    if (prev > 0) rets.push((bars[i]!.open - prev) / prev);
  }
  const q = 30, n = Math.floor(rets.length / q) * q;
  const one = pvar(rets.slice(0, n));
  const agg: number[] = [];
  for (let i = 0; i < n; i += q) agg.push(rets.slice(i, i + q).reduce((a, b) => a + b, 0));
  const varianceRatio30 = one > 0 ? pvar(agg) / (q * one) : NaN;

  return {
    symbol, measuredAt: new Date().toISOString(),
    days: Math.round(spanMin / 1440), coverage: bars.length / spanMin, floor,
    stillMinutes: still / Math.max(1, bars.length - 1),
    medianMove, refundRate, persistence,
    hourlyMedianMove: hourly.map((v) => (v.length ? median(v) : NaN)),
    hourlySamples: hourly.map((v) => v.length),
    varianceRatio30,
  };
}

async function main() {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) { console.error("TWELVEDATA_API_KEY is not set."); process.exit(2); }
  let targets = symbols;
  if (argv.includes("--enabled")) {
    const { SYMBOL_CATALOGUE } = await import("../src/lib/server/updown-symbols.ts");
    targets = SYMBOL_CATALOGUE.filter((s) => !s.unsupported).map((s) => s.symbol);
  }
  if (!targets.length) { console.error("Give one or more symbols, e.g. XAU/USD — or --enabled."); process.exit(2); }

  const { findSymbol } = await import("../src/lib/server/updown-symbols.ts");
  for (const symbol of targets) {
    try {
      const spec = findSymbol(symbol);
      const category = spec?.category ?? (symbol.startsWith("X") ? "macro" : "crypto");
      const bars = await fetchBars(symbol, DAYS, key);
      if (bars.length < 500) { console.log(`  ${symbol.padEnd(10)} SKIP — only ${bars.length} bars`); continue; }
      // ⛔ The floor is the CATALOGUE's where one exists. For an unlisted symbol we propose two
      // ticks of the provider's own observed precision — a starting point an operator confirms,
      // never a value this script silently adopts on a money path.
      const observedTick = Math.min(
        ...bars.slice(1).map((b, i) => Math.abs(b.open - bars[i]!.open)).filter((d) => d > 1e-12),
      );
      const floor = spec ? spec.minMoveTicks * 10 ** -spec.decimals : Number((2 * observedTick).toPrecision(6));
      const p = profileFromBars(symbol, category, floor, bars);
      const book = buildPlaybook(symbol, p, DEFAULT_POLICY, ALLOWED_DURATIONS, spec?.minDurationMinutes ?? null, Date.now());
      const verdict = judgeAsset(p, DEFAULT_POLICY, Date.now());
      console.log(
        `  ${symbol.padEnd(10)} ${(verdict.level === 3 ? "REFUSED" : verdict.level === 2 ? "caution" : "clean").padEnd(8)}` +
        ` floor ${String(floor).padEnd(9)} min ${String(book.minDurationMinutes ?? "-").padStart(3)}` +
        ` rec ${(book.recommendedDurations.join(",") || "—").padEnd(15)} dead ${book.deadHoursUtc.join(",") || "—"}`);
      console.log(`             ${verdict.reason}`);
      if (!DRY) {
        await saveProfile(p);
        // ⛔ VERIFY THE WRITE, NEVER ASSUME IT. `saveConfig` is deliberately never-throws (a
        // config write must not break an admin action), which means a dead database returns
        // silently — and this line printed "saved" over a save that never happened, caught in
        // testing 2026-08-10. A job that reports success it did not achieve is the same defect
        // class as a settlement note describing evidence we do not have.
        const back = await loadProfile(symbol);
        if (back && back.measuredAt === p.measuredAt) console.log(`             saved · read back OK`);
        else { console.log(`             ⛔ SAVE DID NOT PERSIST — check DATABASE_URL`); process.exitCode = 1; }
      }
    } catch (e) {
      console.log(`  ${symbol.padEnd(10)} ERROR ${(e as Error).message.slice(0, 110)}`);
    }
  }
}

/**
 * ⛔ RUN-IF-MAIN, COMPARED AS URLs — NEVER BY GLUEING A PATH ONTO "file://".
 *
 * This line was `import.meta.url === \`file://${process.argv[1]}\`` and it silently did NOTHING
 * ON WINDOWS. There, `process.argv[1]` is `F:\kipindi-main\scripts\…` while `import.meta.url` is
 * `file:///F:/kipindi-main/scripts/…` — different separators, different slash count, so the
 * comparison is false forever. `main()` never ran, the process exited 0, and it printed nothing at
 * all: the operator saw a clean run that had done nothing. On Linux the two happen to match, which
 * is exactly why it passed every test here and failed the first time it met a real machine.
 *
 * ⚠️ This is E-133 in a new costume. `test:design-one-door` compared `docs\X.md` against
 * `docs/X.md`; `test:updown-push` had the CRLF version. The rule generalises and is worth carrying:
 * **compare normalised values, or you are comparing the filesystem instead of the thing you meant.**
 * `pathToFileURL` is the normalisation for this one. Guarded by `test:updown-playbook` §11.
 */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
