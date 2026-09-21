/**
 * THE TWO-STORE POPULATION-FLOOR LINE, and the ONE rule that excuses it — shared by `red-house-bot-engine.mjs`
 * (C5 alerts; the harness that refused to run at all between 2026-09-16 and 2026-09-21).
 *
 * `scripts/lib/house-bot-two-stores.mts` asserts THREE things in one line per child:
 *
 *     ok("0.mem · the memory run exits 0 with assertions and no failure",
 *        mem.exit === 0 && mem.pass >= minFor("memory") && mem.fail === 0,
 *        `exit ${mem.exit} · ${mem.pass} passed (at least ${minFor("memory")}) · ${mem.fail} failed`);
 *
 * A red drive filtered to some sections (`HB_ENGINE_SECTIONS=13`) runs a fraction of the suite, so the POPULATION
 * FLOOR — and ONLY the population floor — cannot be met. That one line is benign under a filter. Nothing else is.
 *
 * ⛔ WHY THIS FILE EXISTS. `FLOOR` used to live inline in the harness and read `… (\d+) passed · (\d+) failed`.
 * The runner's detail string later gained its `(at least N)` clause and the regex was never moved with it, so
 * `FLOOR.exec(line)` was `null` forever, `benignFloor` could never return true, and the harness declared its own
 * baseline RED and refused before injecting a single mutation — 7 declarations went UNMEASURED for five days.
 * ⭐ A PATTERN THAT HAS DRIFTED FROM ITS SUBJECT IS NOT A GUARD, AND CORRECTING IT IS NOT WIDENING AN EXEMPTION.
 * `red-engine-floor.test.mts` now derives the printed line FROM `house-bot-two-stores.mts` ITSELF and fails the
 * moment the two disagree again, so the next reword is caught by a test instead of by a silent refusal.
 */

/** The label half alone — used ONLY to notice that a floor line stopped parsing. Never to excuse one. */
export const FLOOR_LABEL =
  /^\s*FAIL 0\.(?:mem|pg) · the (?:memory|Postgres) run exits 0 with assertions and no failure — /;

/** The whole line, anchored at both ends: exit · passed · the floor it was measured against · failed. */
export const FLOOR =
  /^\s*FAIL 0\.(?:mem|pg) · the (?:memory|Postgres) run exits 0 with assertions and no failure — exit (\d+) · (\d+) passed \(at least (\d+)\) · (\d+) failed\s*$/;

/**
 * Is this FAIL line the population floor, and NOTHING else?
 *
 * ⭐ NARROWER THAN THE ORIGINAL, NOT LOOSER. The runner's assertion has three limbs; the line is excused only when
 * the floor is the ONLY limb that failed:
 *   · a filter is on                     — an unfiltered run must meet its floor, so nothing is ever excused there;
 *   · `exit 0`                           — a child that died is red;
 *   · `0 failed`                         — a child with a failing assertion is red;
 *   · `passed > 0`                       — a child that asserted nothing at all is red;
 *   · `passed < the floor`               — ⭐ NEW: the shortfall is real. A line claiming more passes than its own
 *                                          floor cannot be a floor failure at all, and is no longer excused.
 */
export const benignFloor = (filtered, line) => {
  if (!filtered) return false;
  const m = FLOOR.exec(line);
  if (!m) return false;
  const [, exit, passed, floor, failed] = m;
  return exit === "0" && failed === "0" && Number(passed) > 0 && Number(passed) < Number(floor);
};

/**
 * A floor line the pattern can no longer read. It stays RED (failing closed is right), but it is NAMED, so the next
 * drift is a sentence on the screen instead of a mystery refusal.
 */
export const floorShapeDrifted = (line) => FLOOR_LABEL.test(line) && !FLOOR.test(line);
