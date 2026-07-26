/**
 * resolveRange — the platform-wide date+hour+minute window resolver.
 *
 *   npx tsx scripts/date-range.test.mts   (npm run test:date-range)
 *
 * TIME IS CRITICAL: every report, export, and financial figure is scoped by this. A
 * wrong boundary silently mis-attributes money to the wrong day/hour. This proves the
 * resolver is EAT-correct (UTC+3, no DST), minute-precise on custom windows, and never
 * produces an inverted, future, or unbounded window.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { resolveRange, parseEatLocal, MAX_RANGE_MS } from "../src/lib/server/date-range.ts";
import { startOfEatDay, startOfEatMonth, EAT_OFFSET_MS } from "../src/lib/server/report-money.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const HOUR = 3_600_000, DAY = 86_400_000;
// A fixed "now": 2026-07-26 12:30 EAT  ==  2026-07-26 09:30 UTC.
const NOW = Date.UTC(2026, 6, 26, 9, 30);

// ── parseEatLocal — the wall-clock → epoch bridge ────────────────────────────
{
  const midnight = parseEatLocal("2026-07-26");
  ok("1 · a date-only string is 00:00 EAT", midnight?.ms === Date.UTC(2026, 6, 26, 0, 0) - EAT_OFFSET_MS && midnight?.hasTime === false);
  const wall = parseEatLocal("2026-07-26T14:30");
  ok("2 · a wall-clock is interpreted as EAT (−3h to UTC)", wall?.ms === Date.UTC(2026, 6, 26, 14, 30) - EAT_OFFSET_MS && wall?.hasTime === true);
  ok("3 · 14:30 EAT is 11:30 UTC", wall?.ms === Date.UTC(2026, 6, 26, 11, 30));
  ok("4 · junk / impossible dates are rejected",
     parseEatLocal("nope") === null && parseEatLocal("2026-13-01") === null && parseEatLocal("2026-02-31") === null && parseEatLocal("") === null && parseEatLocal(null) === null);
  ok("5 · out-of-range time is rejected", parseEatLocal("2026-07-26T25:00") === null && parseEatLocal("2026-07-26T12:70") === null);
}

// ── Presets — EAT-correct bounds ─────────────────────────────────────────────
{
  ok("6 · Last hour", (() => { const r = resolveRange({ range: "1h" }, NOW); return r.start === NOW - HOUR && r.end === NOW; })());
  ok("7 · Last 6 hours", (() => { const r = resolveRange({ range: "6h" }, NOW); return r.start === NOW - 6 * HOUR; })());
  ok("8 · Last 24 hours", (() => { const r = resolveRange({ range: "24h" }, NOW); return r.start === NOW - 24 * HOUR; })());
  ok("9 · Today starts at EAT midnight (not UTC midnight)", (() => {
    const r = resolveRange({ range: "today" }, NOW);
    return r.start === startOfEatDay(NOW) && r.end === NOW && r.start === Date.UTC(2026, 6, 26, 0, 0) - EAT_OFFSET_MS;
  })());
  ok("10 · Yesterday is the full prior EAT day", (() => {
    const r = resolveRange({ range: "yesterday" }, NOW);
    return r.start === startOfEatDay(NOW) - DAY && r.end === startOfEatDay(NOW);
  })());
  ok("11 · 7d / 30d", (() => {
    const a = resolveRange({ range: "7d" }, NOW), b = resolveRange({ range: "30d" }, NOW);
    return a.start === NOW - 7 * DAY && b.start === NOW - 30 * DAY;
  })());
  ok("12 · Month to date starts at EAT month start", (() => {
    const r = resolveRange({ range: "mtd" }, NOW);
    return r.start === startOfEatMonth(NOW) && r.start === Date.UTC(2026, 6, 1, 0, 0) - EAT_OFFSET_MS;
  })());
  ok("13 · unknown preset falls back to the default (7d)", (() => {
    const r = resolveRange({ range: "bogus" }, NOW);
    return r.preset === "7d" && r.start === NOW - 7 * DAY;
  })());
}

// ── Custom windows — minute precision + safety ───────────────────────────────
{
  const r = resolveRange({ range: "custom", from: "2026-07-20T08:15", to: "2026-07-20T09:45" }, NOW);
  ok("14 · a custom window is minute-precise", r.start === Date.UTC(2026, 6, 20, 5, 15) && r.end === Date.UTC(2026, 6, 20, 6, 45), `start ${r.start} end ${r.end}`);
  ok("15 · custom is detected by from/to even without range=custom", (() => {
    const x = resolveRange({ from: "2026-07-20T08:15", to: "2026-07-20T09:45" }, NOW);
    return x.preset === "custom" && x.start === Date.UTC(2026, 6, 20, 5, 15);
  })());
  ok("16 · a date-only 'to' includes that whole EAT day", (() => {
    const x = resolveRange({ range: "custom", from: "2026-07-20", to: "2026-07-20" }, NOW);
    // start = 20th 00:00 EAT, end = 21st 00:00 EAT (whole day inclusive)
    return x.start === Date.UTC(2026, 6, 20, 0, 0) - EAT_OFFSET_MS && x.end === Date.UTC(2026, 6, 21, 0, 0) - EAT_OFFSET_MS;
  })());
  ok("17 · an INVERTED range is corrected (start ≤ end)", (() => {
    const x = resolveRange({ range: "custom", from: "2026-07-22T10:00", to: "2026-07-20T10:00" }, NOW);
    return x.start <= x.end;
  })());
  ok("18 · end is never in the future (clamped to now)", (() => {
    const x = resolveRange({ range: "custom", from: "2026-07-20", to: "2027-01-01" }, NOW);
    return x.end === NOW;
  })());
  ok("19 · an over-long window is capped (no unbounded scan)", (() => {
    const x = resolveRange({ range: "custom", from: "2000-01-01", to: "2026-07-20" }, NOW);
    return x.end - x.start <= MAX_RANGE_MS;
  })());
  ok("20 · a window is never zero/negative", (() => {
    const x = resolveRange({ range: "custom", from: "2026-07-26T09:30", to: "2026-07-26T09:30" }, NOW);
    return x.end > x.start;
  })());
}

// ── Round-trip: the URL a picker emits resolves back to the same instants ─────
{
  const from = "2026-07-15T06:00", to = "2026-07-16T18:30";
  const r = resolveRange({ range: "custom", from, to }, NOW);
  ok("21 · round-trip from/to survive resolution",
     r.start === parseEatLocal(from)!.ms && r.end === parseEatLocal(to)!.ms && r.from === from && r.to === to);
  ok("22 · every bounded preset yields a sane, capped window",
     ["1h", "6h", "24h", "today", "yesterday", "7d", "30d", "mtd", "qtd", "28d"].every((id) => {
       const x = resolveRange({ range: id }, NOW);
       return x.end > x.start && x.end <= NOW && (x.end - x.start) <= MAX_RANGE_MS + DAY;
     }));
  ok("23 · 'all' is the one deliberately-unbounded window (from epoch to now)", (() => {
    const x = resolveRange({ range: "all" }, NOW);
    return x.start === 0 && x.end === NOW;
  })());
}

console.log(`\ndate-range: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error("\n✗ RANGE RESOLVER WRONG — every report/export/financial window would be mis-scoped.\n"); process.exit(1); }
console.log("date-range: OK — EAT-correct, minute-precise, inversion/future/unbounded all guarded");
