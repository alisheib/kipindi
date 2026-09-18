/**
 * THE RENDERER'S DATA CONTRACT — the guard for the crash that took the Up & Down board
 * off ONE player's phone (Ali, 2026-09-18) while every other phone and every suite was fine.
 *
 *   npx tsx scripts/chart-series.test.mts   (npm run test:chart-series)
 *
 * lightweight-charts throws `Assertion failed: data must be asc ordered by time` on a tie,
 * and that throw escapes the draw effect and unmounts the whole route — the player is told
 * THE PAGE is broken. §1 is the contract. §2 is the correctness rule inside it: a gap marker
 * is a whitespace item, and if it ever won a tie it would draw a hole over a price the
 * platform really read.
 *
 * ⛔ §3 IS THE ONE THAT WOULD HAVE CAUGHT THE ORIGINAL BUG. Two of the three call sites
 * already sorted — and sorting is not the contract, because the times being sorted are
 * MILLISECONDS and the renderer takes SECONDS. §3 feeds it the real shape: distinct
 * millisecond readings that collide the moment they are rounded.
 */
import { ascUnique } from "../src/components/charts/chart-series.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/** The library's own precondition, asked of a result. */
function strictlyAscending(items: readonly { time: number }[]): boolean {
  for (let i = 1; i < items.length; i++) if (items[i].time <= items[i - 1].time) return false;
  return true;
}

// ── §1 · the contract ────────────────────────────────────────────────────────
ok("empty stays empty", ascUnique([]).length === 0);
ok("one item is untouched", ascUnique([{ time: 5, value: 1 }]).length === 1);

const unsorted = [{ time: 30, value: 3 }, { time: 10, value: 1 }, { time: 20, value: 2 }];
const sorted = ascUnique(unsorted);
ok("§1 unsorted input comes back ascending", strictlyAscending(sorted), JSON.stringify(sorted));
ok("§1 nothing is lost when there are no ties", sorted.length === 3);
ok("§1 the input array is not mutated", unsorted[0].time === 30);

const tied = [{ time: 10, value: 1 }, { time: 10, value: 2 }, { time: 11, value: 3 }];
const untied = ascUnique(tied);
ok("§1 a tie is collapsed", untied.length === 2, JSON.stringify(untied));
ok("§1 the result satisfies the library's precondition", strictlyAscending(untied));
ok("§1 the NEWEST reading for that second wins", untied[0].value === 2, JSON.stringify(untied[0]));

// ── §2 · a gap marker must never erase a real price ──────────────────────────
// Whitespace = `{ time }` with no value. The feed emits one per missing grid step, and at
// the line/area site they are pushed into the SAME array as the readings.
const priceThenGap = ascUnique([{ time: 60, value: 101.5 }, { time: 60 }]);
ok("§2 whitespace AFTER a reading does not erase it", priceThenGap.length === 1 && priceThenGap[0].value === 101.5, JSON.stringify(priceThenGap));
const gapThenPrice = ascUnique([{ time: 60 }, { time: 60, value: 101.5 }]);
ok("§2 whitespace BEFORE a reading does not erase it", gapThenPrice.length === 1 && gapThenPrice[0].value === 101.5, JSON.stringify(gapThenPrice));
const twoGaps = ascUnique([{ time: 60 }, { time: 60 }]);
ok("§2 two whitespace slots collapse to one", twoGaps.length === 1 && twoGaps[0].value === undefined);
// A candle is data too — `close`, not `value`.
const candleVsGap = ascUnique([{ time: 60 }, { time: 60, open: 1, high: 2, low: 0.5, close: 1.5 }]);
ok("§2 a candle beats a gap marker", candleVsGap.length === 1 && candleVsGap[0].close === 1.5, JSON.stringify(candleVsGap));
// Whitespace at a time of its own is preserved — the outage must keep its width.
const realGap = ascUnique([{ time: 60, value: 1 }, { time: 120 }, { time: 180, value: 2 }]);
ok("§2 a gap at its OWN time is kept (the outage keeps its width)", realGap.length === 3 && realGap[1].value === undefined);

// ── §3 · THE ACTUAL BUG: distinct milliseconds, identical seconds ────────────
// `terminal-chart.tsx` maps every server timestamp through `Math.round(ms / 1000)`.
const at = (ms: number) => Math.round(ms / 1000);
// Two confirmed reads 400ms apart — ordinary when reads are written in one burst
// (a round boundary, or the self-healer working through a backlog).
const burst = [1789720565100, 1789720565500, 1789720566000].map((ms, i) => ({ time: at(ms), value: 100 + i }));
ok("§3 the raw mapped payload DOES tie (this is the defect)", !strictlyAscending(burst), JSON.stringify(burst.map((b) => b.time)));
const fixed = ascUnique(burst);
ok("§3 ascUnique makes it drawable", strictlyAscending(fixed), JSON.stringify(fixed));
// ⚠️ `Math.round`, not floor: 565500ms rounds UP to …566, so the pair that collides is the
// SECOND and THIRD reading (both …566), and the surviving value is the third one's. Writing
// this assertion from the arithmetic I assumed rather than the arithmetic in the code is how
// the first draft of this line failed — the rounding mode is part of the contract.
ok("§3 and keeps the newest price for the shared second", fixed[fixed.length - 1].value === 102, JSON.stringify(fixed));

// The reported failure, reproduced exactly: index=1 duplicating index=0.
const reported = ascUnique([{ time: 1789720565, value: 1 }, { time: 1789720565, value: 2 }]);
ok("§3 the reported assertion (index=1, time == prev time) cannot recur", strictlyAscending(reported) && reported.length === 1);

// A sub-second cadence: the gap filler steps by the median delta, which can be < 1000ms.
const subSecond = [0, 400, 800, 1200, 1600].map((ms) => ({ time: at(1789720565000 + ms) }));
ok("§3 a sub-second gap filler collapses instead of throwing", strictlyAscending(ascUnique(subSecond)), JSON.stringify(ascUnique(subSecond).map((x) => x.time)));

// ── §4 · every call site's real shape survives a round trip ──────────────────
const volume = [{ time: 5, value: 10, color: "a" }, { time: 5, value: 20, color: "b" }, { time: 6, value: 30, color: "c" }];
const vol = ascUnique(volume);
ok("§4 the volume histogram's items keep their colour", vol.length === 2 && vol[0].color === "b", JSON.stringify(vol));
ok("§4 volume is drawable", strictlyAscending(vol));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
