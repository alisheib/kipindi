/**
 * test:maswali-time — EAST AFRICA WEEKS AND EVENT CLOCKS ACROSS THE CLOCK CHANGES (MASWALI-BUILD S2).
 *
 *   npx tsx scripts/maswali-time.test.mts     (npm run test:maswali-time)
 *
 *   §1 the EAT week: Monday 00:00 EAT, ISO week numbers at the year's edges, the EAT-midnight boundary
 *   §2 the template close: Friday 18:00 EAT, including Friday 25 December 2026 and Friday 1 January 2027
 *   §3 ⭐ event clocks: Europe falls back Sunday 25 October 2026, the US Sunday 1 November 2026 — an hour that happens
 *      twice is refused, a skipped hour is refused, and the hours either side convert exactly
 */
import { eatIsoWeek, eatWeekAt, eatWeekCode, eatWeekStartMs } from "../src/lib/eat-day.ts";
import { isKnownZone, utcToZonedLocal, zonedToUtcMs } from "../src/lib/maswali-time.ts";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const at = (iso: string) => Date.parse(iso);
const utc = (local: string, zone: string) => { const r = zonedToUtcMs(local, zone); return r.ok ? new Date(r.utcMs).toISOString() : r.reason; };

// ── §1 · the EAT week ───────────────────────────────────────────────────────
console.log("\n§1 · the East Africa week");
{
  // Monday 26 October 2026 00:00 EAT = Sunday 25 October 21:00 UTC.
  const monday = at("2026-10-25T21:00:00.000Z");
  ok("1.1 · the week of Wed 28 Oct starts Mon 26 Oct 00:00 EAT (Sun 21:00 UTC)", eatWeekStartMs(at("2026-10-28T09:00:00Z")) === monday);
  ok("1.2 · ⭐ the EAT-midnight edge: Sun 25 Oct 20:59:59 UTC is still the PREVIOUS week", eatWeekStartMs(at("2026-10-25T20:59:59Z")) === monday - 7 * 86_400_000);
  ok("1.3 · …and 21:00:00 UTC is the new one", eatWeekStartMs(at("2026-10-25T21:00:00Z")) === monday);
  ok("1.4 · that week is ISO 2026-W44 → MLN-2026-W44", JSON.stringify(eatIsoWeek(monday)) === JSON.stringify({ year: 2026, week: 44 }) && eatWeekCode("MLN", monday) === "MLN-2026-W44");
  ok("1.5 · Thu 31 Dec 2026 is ISO 2026-W53", JSON.stringify(eatIsoWeek(at("2026-12-31T09:00:00Z"))) === JSON.stringify({ year: 2026, week: 53 }));
  ok("1.6 · Fri 1 Jan 2027 is still ISO 2026-W53 (its Thursday is in 2026)", eatWeekCode("MLN", at("2027-01-01T09:00:00Z")) === "MLN-2026-W53");
  ok("1.7 · Mon 4 Jan 2027 is ISO 2027-W01", eatWeekCode("MLN", at("2027-01-04T09:00:00Z")) === "MLN-2027-W01");
  ok("1.8 · ⛔ a bad prefix is refused", (() => { try { eatWeekCode("mln", monday); return false; } catch { return true; } })());
}

// ── §2 · the template close ─────────────────────────────────────────────────
console.log("\n§2 · the template close, Friday 18:00 EAT");
{
  const w44 = eatWeekStartMs(at("2026-10-28T09:00:00Z"));
  ok("2.1 · Fri 30 Oct 2026 18:00 EAT = 15:00 UTC", new Date(eatWeekAt(w44, 5, "18:00")).toISOString() === "2026-10-30T15:00:00.000Z");
  ok("2.2 · the open, Mon 00:00 EAT, is the week's start", eatWeekAt(w44, 1, "00:00") === w44);
  const xmas = eatWeekStartMs(at("2026-12-23T09:00:00Z"));
  ok("2.3 · ⭐ Friday 25 December 2026's close is 15:00 UTC — the holiday review's week (§6 runbook)", new Date(eatWeekAt(xmas, 5, "18:00")).toISOString() === "2026-12-25T15:00:00.000Z");
  const ny = eatWeekStartMs(at("2026-12-30T09:00:00Z"));
  ok("2.4 · Friday 1 January 2027's close is 15:00 UTC, in week MLN-2026-W53", new Date(eatWeekAt(ny, 5, "18:00")).toISOString() === "2027-01-01T15:00:00.000Z" && eatWeekCode("MLN", ny) === "MLN-2026-W53");
  ok("2.5 · the final deadline, Monday 23:59 of the results week", new Date(eatWeekAt(w44 + 7 * 86_400_000, 1, "23:59")).toISOString() === "2026-11-02T20:59:00.000Z");
  ok("2.6 · ⛔ a malformed clock is refused", (() => { try { eatWeekAt(w44, 5, "6pm"); return false; } catch { return true; } })());
}

// ── §3 · event clocks ───────────────────────────────────────────────────────
console.log("\n§3 · ⭐ event clocks across the clock changes");
{
  ok("3.0 · the zones the questions use are known", ["Europe/London", "America/New_York", "Africa/Dar_es_Salaam", "Europe/Madrid"].every(isKnownZone) && !isKnownZone("Mars/Olympus"));
  // Europe/London: BST (UTC+1) until 02:00 local on Sun 25 Oct 2026, then GMT (UTC+0); 01:00–01:59 happens twice.
  ok("3.1 · Sat 24 Oct 15:00 London (BST) = 14:00 UTC", utc("2026-10-24T15:00", "Europe/London") === "2026-10-24T14:00:00.000Z");
  ok("3.2 · Sun 25 Oct 00:30 London (still BST) = Sat 23:30 UTC", utc("2026-10-25T00:30", "Europe/London") === "2026-10-24T23:30:00.000Z");
  ok("3.3 · ⛔ Sun 25 Oct 01:30 London happens TWICE — refused, never guessed", utc("2026-10-25T01:30", "Europe/London") === "ambiguous");
  ok("3.4 · Sun 25 Oct 14:00 London (GMT) = 14:00 UTC", utc("2026-10-25T14:00", "Europe/London") === "2026-10-25T14:00:00.000Z");
  ok("3.5 · Madrid falls back the same night: Sun 25 Oct 16:00 (CET) = 15:00 UTC", utc("2026-10-25T16:00", "Europe/Madrid") === "2026-10-25T15:00:00.000Z");
  // America/New_York: EDT (UTC−4) until 02:00 local on Sun 1 Nov 2026, then EST (UTC−5).
  ok("3.6 · Sat 31 Oct 20:00 New York (EDT) = Sun 00:00 UTC", utc("2026-10-31T20:00", "America/New_York") === "2026-11-01T00:00:00.000Z");
  ok("3.7 · ⛔ Sun 1 Nov 01:30 New York happens TWICE — refused", utc("2026-11-01T01:30", "America/New_York") === "ambiguous");
  ok("3.8 · Sun 1 Nov 13:00 New York (EST) = 18:00 UTC", utc("2026-11-01T13:00", "America/New_York") === "2026-11-01T18:00:00.000Z");
  ok("3.9 · ⛔ Sun 29 Mar 2026 01:30 London never happens (spring forward) — refused", utc("2026-03-29T01:30", "Europe/London") === "nonexistent");
  ok("3.10 · Dar es Salaam never changes: 19:30 EAT = 16:30 UTC", utc("2026-10-30T19:30", "Africa/Dar_es_Salaam") === "2026-10-30T16:30:00.000Z");
  ok("3.11 · ⛔ a malformed local time and an unknown zone are refused", utc("2026-10-30 19:30", "Europe/London") === "malformed" && utc("2026-02-30T10:00", "Europe/London") === "malformed" && utc("2026-10-30T19:30", "Mars/Olympus") === "unknown_zone");
  ok("3.12 · the round trip prints the source's own clock", utcToZonedLocal(at("2026-10-25T14:00:00Z"), "Europe/London") === "2026-10-25T14:00" && utcToZonedLocal(at("2026-10-24T14:00:00Z"), "Europe/London") === "2026-10-24T15:00");
}

console.log(`\n${"═".repeat(70)}\n  MASWALI TIME: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
