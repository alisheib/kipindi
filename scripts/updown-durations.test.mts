/**
 * E-62 · THE ROUND DURATIONS, AND THE GRID RULE THAT GOVERNS THEM.
 *
 *   npx tsx scripts/updown-durations.test.mts     (npm run test:updown-durations)
 *
 * Ali asked for "3 and 30 and 60 also". The original analysis answered *"30 already exists and
 * 10 never did"* and stopped — never noticing that the values it dismissed were the ones with
 * **no obstacle at all**. 10, 30 and 60 each divide the 5-minute observation grid exactly, so a
 * round of that length reuses the reading the grid already produces at its boundary: one paid
 * provider read serves every chain landing there. 3 does not divide it, and is the only value
 * in the request that costs anything (~480 extra reads/day/asset against a ~800/day plan).
 *
 * ⛔ THIS ASSERTS THE RULE, NOT A LIST. A snapshot of four numbers would pass while someone
 * added 7 or 3 by hand; `landsOnGrid` is what makes an addition checkable.
 */
import {
  ALLOWED_DURATIONS, OBSERVATION_GRID_MINUTES, landsOnGrid,
  MINUTES_PER_DAY, latticeBoundaryAtOrBefore,
} from "../src/lib/updown-durations";
import { readFileSync } from "node:fs";

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// §1 · the rule
ok("§1 the grid is 5 minutes", OBSERVATION_GRID_MINUTES === 5);
for (const d of ALLOWED_DURATIONS) {
  ok(`§1 ${d}m lands on the grid`, landsOnGrid(d),
    "an off-grid duration needs its own paid read at most boundaries");
}
// ⭐ THE RULE CHANGED 2026-08-04, AND THE OLD ASSERTION WAS RIGHT WHEN WRITTEN.
// It read: "⛔ 3 does NOT land on the grid — the reason it was not added". Under the
// 5-minute observation grid that was true and load-bearing. The rule is now the EPOCH
// LATTICE — a duration is allowed if it divides 1440 — because the grid's own premise
// (chains emitting on timers onto shared instants) stopped holding when Ali made generation
// manual. Manual rounds do not coincide, so nothing was being shared and 3 was costing
// nothing to exclude but the product's shortest duration.
ok("§1 ⭐ 3 DOES land on the epoch lattice — 1440 / 3 = 480 boundaries a day", landsOnGrid(3));
ok("§1 ⛔ 7 still does not — it does not divide the day, so its boundaries drift across midnight",
  !landsOnGrid(7));
ok("§1 ⛔ nor does 50", !landsOnGrid(50));
ok("§1 0, negatives and fractions are refused",
  !landsOnGrid(0) && !landsOnGrid(-5) && !landsOnGrid(7.5));
// ⛔ THE INVARIANT, not a list check: every duration offered must divide the day, or two
// consecutive days use different instants and no two chains can ever share a reading.
ok("§1 ⭐ EVERY allowed duration divides the day evenly",
  ALLOWED_DURATIONS.every((d) => MINUTES_PER_DAY % d === 0),
  ALLOWED_DURATIONS.map((d) => `${d}→${MINUTES_PER_DAY % d}`).join(" "));
// ⭐ And the sharing the 5-minute grid existed to provide still happens — better, in fact:
// 3 and 15 meet every 15 minutes, all six meet at the hour.
{
  const at = Date.parse("2026-08-04T12:00:00.000Z");
  ok("§1 ⭐ all six durations share the top of the hour — the lattice preserves observation sharing",
    ALLOWED_DURATIONS.every((d) => latticeBoundaryAtOrBefore(at, d) === at));
  const quarter = Date.parse("2026-08-04T12:15:00.000Z");
  ok("§1 ⭐ 3 and 15 share the quarter hour, which the 5-minute grid could never give them",
    latticeBoundaryAtOrBefore(quarter, 3) === quarter && latticeBoundaryAtOrBefore(quarter, 15) === quarter);
}

// §2 · Ali's request — the free ones are present, the costly one is not
ok("§2 ⭐ 10-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(10));
ok("§2 ⭐ 30-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(30));
ok("§2 ⭐ 60-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(60));
// ⭐ INVERTED 2026-08-04. This required 3 to be ABSENT, and that ratchet did its job: it
// failed the moment 3 was added, forcing the lattice change to be argued rather than typed.
// It now requires 3 to be PRESENT **and** the lattice rule to be what admits it — so adding a
// duration by editing the constant alone still fails, which was always the real point.
ok("§2 ⭐ 3-minute rounds exist — Ali's request, unblocked by the epoch lattice",
  (ALLOWED_DURATIONS as readonly number[]).includes(3));
ok("§2 ⛔ …and the RULE is what admits it, not the constant — a duration that fails the lattice cannot be listed",
  ALLOWED_DURATIONS.every((d) => landsOnGrid(d)),
  "adding a duration means satisfying the lattice, not editing an array");
ok("§2 the list is sorted and unique",
  ALLOWED_DURATIONS.every((d, i, a) => i === 0 || d > a[i - 1]!));

// §3 · ONE SOURCE — the defect that cost the whole request
{
  const dur = read("../src/lib/updown-durations.ts");
  ok("§3 the shared module has NO imports", !/^\s*import\s/m.test(dur),
    "client components import it; a server import would break the bundle");
  const cfg = read("../src/lib/server/updown-config.ts");
  ok("§3 the server re-exports the shared list", /from "@\/lib\/updown-durations"/.test(cfg));
  ok("§3 …and no longer declares its own", !/const ALLOWED_DURATIONS = \[/.test(cfg));
  for (const f of ["../src/app/admin/updown/updown-controls.tsx",
                   "../src/app/admin/updown/proposals/proposal-actions.tsx"]) {
    const s = read(f);
    ok(`§3 ${f.split("/").pop()} uses the shared list`, /const DURATIONS = ALLOWED_DURATIONS/.test(s),
      "a hand-copied array makes a new duration unreachable from the console");
    ok(`§3 …and imports it`, /from "@\/lib\/updown-durations"/.test(s));
  }
}

console.log(`\nE-62 · durations — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
