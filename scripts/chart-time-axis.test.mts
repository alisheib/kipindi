/**
 * D46 · THE PROBABILITY AXIS IS A TIME AXIS — and this suite asserts the quantity the renderer
 * actually turns into pixels.
 *
 *   npm run test:time-axis
 *
 * 🔴 WHAT WENT WRONG. lightweight-charts' time scale is ORDINAL: every item in `setData` gets one
 * slot and the engine multiplies slot distance by one uniform `barSpacing`. The market detail
 * page fed it only the readings, under CALENDAR labels — so a two-day interval and a one-day
 * interval both drew 153px (critics panel, measured), and the slope stated a rate of change the
 * data does not support, on the page where a player is about to stake money.
 *
 * ⛔ SO THE ASSERTION IS NOT "the chart looks right" AND NOT A PIXEL. It is the INDEX DISTANCE
 * between two readings, because index distance is the only thing the engine scales. A DOM or
 * canvas probe would also have been the wrong instrument here: `qa:chart-axis` probes SVG text
 * over five ADMIN routes and would report a confident zero on `/markets/[id]`, which renders a
 * canvas.
 *
 * ⛔ AND THE FIXTURE HAS UNEVEN GAPS BY CONSTRUCTION. An evenly-spaced fixture CANNOT CONTAIN
 * this defect: with equal gaps, index spacing and elapsed time already agree, so every assertion
 * below would pass against the unfixed code. §0 trap 3 — "would this still pass if the feature
 * were absent?" — is answered here by §5, which runs the same assertion against the UNFILLED data
 * and REQUIRES it to fail. That is a real product mutation (the absence of the fill), not a plant.
 *
 * ⚠️ THE GUARANTEE IS A TOLERANCE, AND THAT IS DELIBERATE. `timeGridFill` bounds its own item
 * count, so `step` is `max(smallest gap, ceil(span / maxSlots))` and proportionality holds to
 * within one `step`. Asserting exact equality would assert something no bounded grid can give,
 * and the first long-window market would fail it.
 */
import { ascUnique, timeGridFill } from "../src/components/charts/chart-series.ts";
// ⛔ Imported, not copied. The budget and the library floor are DECISIONS that live beside the
// chart; a second copy here would let them drift and the suite would certify the old pair.
import { MAX_TIME_SLOTS, MIN_PLOT_PX, MIN_BAR_SPACING } from "../src/components/charts/market-curve.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (cond: boolean, what: string) => { if (cond) pass++; else fails.push(what); };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

type Reading = { time: number; value: number };

/** Modelled on live market `mkt_07204d65ca88106b160c`: 11 readings over ~112h, gaps 95s to 2.6d. */
const MINUTE = 60, HOUR = 3600, DAY = 86400;
const GAPS = [95, 4 * MINUTE, 11 * MINUTE, 2 * HOUR, 9 * HOUR, 26 * HOUR, Math.round(2.6 * DAY), 3 * HOUR, 40 * MINUTE, 7 * MINUTE];
const T0 = 1_700_000_000;
const READINGS: Reading[] = (() => {
  const out: Reading[] = [{ time: T0, value: 50 }];
  let t = T0;
  for (const [i, g] of GAPS.entries()) { t += g; out.push({ time: t, value: 40 + ((i * 7) % 45) }); }
  return out;
})();
const SPAN = READINGS[READINGS.length - 1].time - READINGS[0].time;

/** The step `timeGridFill` will have chosen, recomputed here from its documented rule. */
const stepFor = (readings: Reading[], maxSlots = 4000) => {
  const span = readings[readings.length - 1].time - readings[0].time;
  let smallest = Infinity;
  for (let i = 1; i < readings.length; i++) {
    const d = readings[i].time - readings[i - 1].time;
    if (d > 0 && d < smallest) smallest = d;
  }
  return Math.max(smallest, Math.ceil(span / maxSlots));
};

/** Index of each reading in the emitted array, by time. */
const indexByTime = (items: Array<{ time: number }>) => {
  const m = new Map<number, number>();
  items.forEach((it, i) => m.set(it.time, i));
  return m;
};

/**
 * The one measurement that matters: for every consecutive pair of readings, does
 * (index distance × step) equal the elapsed time, to within one step?
 */
const proportionality = (items: Array<{ time: number }>, readings: Reading[], step: number) => {
  const idx = indexByTime(items);
  const rows: Array<{ gap: number; slots: number; drawn: number; off: number }> = [];
  for (let i = 1; i < readings.length; i++) {
    const a = idx.get(readings[i - 1].time), b = idx.get(readings[i].time);
    if (a === undefined || b === undefined) return null; // a reading went missing — caller reports it
    const gap = readings[i].time - readings[i - 1].time;
    const slots = b - a;
    const drawn = slots * step;
    rows.push({ gap, slots, drawn, off: Math.abs(drawn - gap) });
  }
  return rows;
};

console.log("\nD46 · CHART TIME AXIS");
console.log(`  fixture: ${READINGS.length} readings over ${(SPAN / HOUR).toFixed(1)}h · gaps ${Math.min(...GAPS)}s to ${(Math.max(...GAPS) / DAY).toFixed(2)}d`);

// ── §1 · the readings survive, exactly ───────────────────────────────────────────────────────
console.log("\n§1 · every reading survives the fill, unchanged");
const filled = timeGridFill(READINGS) as Array<{ time: number; value?: number }>;
const kept = filled.filter((it) => it.value !== undefined);
ok(kept.length === READINGS.length, `§1 ${kept.length} readings survived, expected ${READINGS.length}`);
ok(
  kept.every((it, i) => it.time === READINGS[i].time && it.value === READINGS[i].value),
  "§1 a reading's time or value was altered by the fill",
);
console.log(`  ok   ${kept.length} readings in, ${kept.length} out, values identical`);

// ── §2 · the gaps carry NO value ─────────────────────────────────────────────────────────────
console.log("\n§2 · a gap is whitespace, never an invented probability");
const ws = filled.filter((it) => it.value === undefined);
ok(ws.length > 0, "§2 the fill emitted no whitespace at all — there is nothing reserving the gaps");
ok(ws.every((it) => !("value" in it) || it.value === undefined), "§2 a whitespace item carries a value — that is an interpolated probability, which breaks A-5");
ok(ws.every((it) => Number.isFinite(it.time)), "§2 a whitespace item has a non-finite time");
console.log(`  ok   ${ws.length} whitespace slots, none carrying a value`);

// ── §3 · index distance is proportional to elapsed time ──────────────────────────────────────
console.log("\n§3 · index distance x step == elapsed time, within one step");
const step = stepFor(READINGS);
const rows = proportionality(filled, READINGS, step);
if (!rows) fails.push("§3 a reading was missing from the filled series — proportionality was not measured");
else {
  console.log(`  step ${step}s (smallest gap ${Math.min(...GAPS)}s, span/maxSlots ${Math.ceil(SPAN / 4000)}s)`);
  for (const r of rows) {
    const flag = r.off <= step ? "ok  " : "FAIL";
    console.log(`  ${flag} gap ${String(r.gap).padStart(7)}s -> ${String(r.slots).padStart(4)} slots = ${String(r.drawn).padStart(7)}s drawn (off by ${r.off}s)`);
  }
  for (const r of rows) ok(r.off <= step, `§3 a ${r.gap}s interval drew as ${r.drawn}s (${r.slots} slots) — off by ${r.off}s, more than one step (${step}s)`);
  // and the defect's own signature: two intervals of different length must not draw the same width
  const bySlots = new Map<number, number[]>();
  for (const r of rows) { const a = bySlots.get(r.slots) ?? []; a.push(r.gap); bySlots.set(r.slots, a); }
  const collisions = [...bySlots.entries()].filter(([, gaps]) => new Set(gaps).size > 1 && Math.max(...gaps) / Math.min(...gaps) > 2);
  ok(collisions.length === 0, `§3 intervals differing by more than 2x share a slot count: ${JSON.stringify(collisions)}`);
}

// ── §4 · bounded, and the renderer's contract still holds ────────────────────────────────────
console.log("\n§4 · bounded item count, and still asc-unique for the renderer");
ok(filled.length <= 4000 + READINGS.length, `§4 the fill emitted ${filled.length} items, past its own maxSlots bound`);
const small = timeGridFill(READINGS, { maxSlots: 50 }) as Array<{ time: number }>;
ok(small.length <= 50 + READINGS.length, `§4 maxSlots:50 emitted ${small.length} items`);
const unique = ascUnique(filled);
ok(unique.length === filled.length, "§4 the fill produced a duplicate or out-of-order time — ascUnique had to collapse one");
ok(unique.every((it, i) => i === 0 || it.time > unique[i - 1].time), "§4 the result is not strictly ascending, which throws in lightweight-charts and takes the route with it");
const keptAfterUnique = (ascUnique(filled) as Array<{ value?: number }>).filter((it) => it.value !== undefined).length;
ok(keptAfterUnique === READINGS.length, `§4 ascUnique dropped a reading (${keptAfterUnique} of ${READINGS.length}) — a whitespace marker won a tie against a real price`);
console.log(`  ok   ${filled.length} items at maxSlots 4000, ${small.length} at 50, strictly ascending, all ${keptAfterUnique} readings intact`);

// ── §5 · THE RED CONTROL: the same assertion, against the absence of the fill ────────────────
console.log("\n§5 · RED — the assertion must FAIL on the unfilled series");
const rawRows = proportionality(READINGS, READINGS, step);
let rawViolations = 0;
if (rawRows) for (const r of rawRows) if (r.off > step) rawViolations++;
console.log(`  unfilled: every interval is 1 slot = ${step}s drawn, whatever its real length`);
if (rawRows) for (const r of rawRows.slice(0, 4)) console.log(`       gap ${String(r.gap).padStart(7)}s -> ${r.slots} slot = ${r.drawn}s drawn (off by ${r.off}s)`);
ok(rawViolations > 0, "§5 BROKEN HARNESS: the proportionality assertion PASSES on the unfilled series, so it cannot detect D46 at all");
console.log(`  ok   ${rawViolations} of ${rawRows?.length ?? 0} intervals violate it without the fill — the assertion can fail`);

// ── §6 · degenerate inputs are returned untouched, not mangled ───────────────────────────────
console.log("\n§6 · nothing to fill is not an error");
ok((timeGridFill([]) as unknown[]).length === 0, "§6 an empty series did not come back empty");
ok((timeGridFill([{ time: 1, value: 5 }]) as unknown[]).length === 1, "§6 a single reading was altered");
const sameSecond = timeGridFill([{ time: 7, value: 1 }, { time: 7, value: 2 }]) as unknown[];
ok(sameSecond.length === 2, `§6 two readings in one second produced ${sameSecond.length} items — a zero step must not build a grid`);
console.log("  ok   empty, single and same-second series pass through unchanged");

// ── §7 · the slot budget and the library floor must agree ────────────────────────────────────
console.log("");
console.log("§7 · the fill's slot budget fits the narrowest plot at the library's own floor");
// ⛔ THIS IS THE ASSERTION THAT STOPS D46's FIX BECOMING A WORSE DEFECT. `timeGridFill` reserving
// 2,000 slots is only honest if `fitContent()` can actually SHOW 2,000 slots. lightweight-charts
// refuses to go below `minBarSpacing` px per slot, so a budget above (plot px / minBarSpacing)
// clamps the view and shows the player a SLICE of their market's history, looking entirely normal.
// The library's default floor is 0.5px, which on a 210px plot is a ceiling of 420 — five times
// under the budget. Both numbers live in `market-curve.tsx` and are asserted here together, so
// neither can be raised alone.
const fittable = Math.floor(MIN_PLOT_PX / MIN_BAR_SPACING);
console.log(`  plot ${MIN_PLOT_PX}px / floor ${MIN_BAR_SPACING}px = ${fittable} slots fittable · budget ${MAX_TIME_SLOTS}`);
ok(MAX_TIME_SLOTS <= fittable, `§7 the fill may emit ${MAX_TIME_SLOTS} slots but only ${fittable} fit at minBarSpacing ${MIN_BAR_SPACING} on a ${MIN_PLOT_PX}px plot — fitContent would clamp and hide most of the window`);
// and the same test against the library's DEFAULT floor, to record why it had to be changed
const atDefault = Math.floor(MIN_PLOT_PX / 0.5);
ok(atDefault < MAX_TIME_SLOTS, `§7 the library default floor (0.5px) now fits ${atDefault} slots, at or above the ${MAX_TIME_SLOTS} budget — if that is genuinely true, the explicit minBarSpacing is no longer needed and this assertion should be revisited rather than deleted`);
console.log(`  ok   ${MAX_TIME_SLOTS} <= ${fittable}; and the library default (0.5px) would fit only ${atDefault}, which is why it is overridden`);
// the fill must actually honour the budget it is handed
const budgeted = timeGridFill(READINGS, { maxSlots: MAX_TIME_SLOTS }) as Array<{ time: number }>;
ok(budgeted.length <= MAX_TIME_SLOTS + READINGS.length, `§7 the fill emitted ${budgeted.length} items against a ${MAX_TIME_SLOTS} budget`);
console.log(`  ok   the live-shaped fixture fills to ${budgeted.length} items under the ${MAX_TIME_SLOTS} budget`);

// ── verdict ──────────────────────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(88));
for (const f of fails) console.log("  FAIL " + f);
console.log(`CHART TIME AXIS — ${pass} passed, ${fails.length} failed`);
process.exitCode = fails.length ? 1 : 0;
