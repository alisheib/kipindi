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
import { ALLOWED_DURATIONS, OBSERVATION_GRID_MINUTES, landsOnGrid } from "../src/lib/updown-durations";
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
ok("§1 ⛔ 3 does NOT land on the grid — the reason it was not added", !landsOnGrid(3));
ok("§1 ⛔ nor does 7", !landsOnGrid(7));
ok("§1 0, negatives and fractions are refused",
  !landsOnGrid(0) && !landsOnGrid(-5) && !landsOnGrid(7.5));

// §2 · Ali's request — the free ones are present, the costly one is not
ok("§2 ⭐ 10-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(10));
ok("§2 ⭐ 30-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(30));
ok("§2 ⭐ 60-minute rounds exist", (ALLOWED_DURATIONS as readonly number[]).includes(60));
ok("§2 ⛔ 3-minute rounds are NOT silently added — it is a cost decision (E-62)",
  !(ALLOWED_DURATIONS as readonly number[]).includes(3),
  "adding 3 needs the provider-quota measurement and a grid decision, not a constant edit");
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
