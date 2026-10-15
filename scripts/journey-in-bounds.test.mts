/**
 * test:journey-in-bounds — S16's "measures in bounds", as Ali defined it on 2026-10-14 (S13 Point 12), built as the pure
 * `inBoundsVerdict` in `src/lib/journey/measures.ts`:
 *
 *   seven days after launch, each of the five measures is AT OR ABOVE its 14-day pre-launch baseline, and no harm marker
 *   (RAPID_DEPOSIT_ESCALATION, CHASING_LOSSES daily counts) rises above its baseline.
 *
 *   npm run test:journey-in-bounds
 *   npm run red:journey-in-bounds      (--prove-red: each defect planted IN MEMORY must be caught by its own case)
 *
 *   IB.1  not launched → not yet           IB.2  six of seven days → not yet, even with a measure below
 *   IB.3  1, 2, 5 at or above; 3 and 4 have no baseline BY DESIGN (excluded and named, never a pass, never a zero) → in bounds
 *   IB.4  equal is "at or above"           IB.5  one tenth below → out of bounds, naming the measure
 *   IB.6  compared on the PRINTED shares (one decimal), so the verdict agrees with every screen and file
 *   IB.7  a held baseline (two counters disagree) is not a figure → not yet, never compared as 100%
 *   IB.8  an after figure that could not be read → not yet, never "at or above"
 *   IB.9  a harm marker's average above its baseline → out of bounds   IB.10 equal → not above
 *   IB.11 an after day the harm watch did not count → not yet, never read as 0
 *   IB.12 no counted baseline day → not yet   IB.13 the harm counts not read → not yet
 *   IB.14 a measure below AND a figure missing → out of bounds (a definite failure is not hidden)
 *   IB.15 the harm comparison is on the average daily count, not the busiest day
 *   IB.16 only the agency's five are judged (4b is a comparison row)   IB.17 the reasons say what they decided
 */
process.exitCode = 1;
const M = await import("../src/lib/journey/measures.ts");
type Mod = typeof M;
type Cell = import("../src/lib/journey/measures.ts").Cell;
type Win = import("../src/lib/journey/measures.ts").DayWindow;
const PROVE_RED = process.argv.includes("--prove-red");
const j = (v: unknown) => JSON.stringify(v);

const win = (days: number, notLaunched = false): Win => ({
  key: "after7", variant: "new", asked: 7, days: Array.from({ length: days }, (_, i) => `2026-11-${String(3 + i).padStart(2, "0")}`),
  skipped: [], notLaunched, pruned: false, fromDay: "2026-11-03", toDay: "2026-11-09",
});
const before14: Win = { key: "before", variant: "old", asked: 14, days: Array.from({ length: 14 }, (_, i) => `2026-10-${String(19 + i).padStart(2, "0")}`), skipped: [], notLaunched: false, pruned: false, fromDay: "2026-10-19", toDay: "2026-11-01" };
const byKey = Object.fromEntries(M.MEASURES.map((m) => [m.key, m])) as Record<string, import("../src/lib/journey/measures.ts").MeasureDef>;
const cell = (key: string, side: "before" | "after", n: number | null, d: number | null, over: Partial<import("../src/lib/journey/measures.ts").CellContext> = {}): Cell =>
  M.cellFor(n, d, { measure: byKey[key], side, window: side === "before" ? before14 : win(7), campaign: null, readable: true, s9: true, ...over });
/** A healthy set: 1, 2, 5 comparable (at or above); 3 and 4 have no baseline by design. */
function cells(over: Partial<Record<string, { before: Cell; after: Cell }>> = {}) {
  return {
    homeToSheet: { before: cell("homeToSheet", "before", 40, 400), after: cell("homeToSheet", "after", 50, 400) },
    sheetToBet: { before: cell("sheetToBet", "before", 30, 100), after: cell("sheetToBet", "after", 35, 100) },
    shortToDeposit: { before: cell("shortToDeposit", "before", null, 20), after: cell("shortToDeposit", "after", 6, 20) },
    depositToBet: { before: cell("depositToBet", "before", null, null), after: cell("depositToBet", "after", 4, 6) },
    timeToFirstBet: { before: cell("timeToFirstBet", "before", 20, 50), after: cell("timeToFirstBet", "after", 22, 50) },
    ...over,
  } as Parameters<Mod["inBoundsVerdict"]>[0]["cells"];
}
const harm = (rb: Array<number | null>, ra: Array<number | null>, cb = [1, 1, 1], ca: Array<number | null> = [0, 0, 0, 0, 0, 0, 0]) => ({
  rapidDeposit: { before: rb, after: ra }, chasingLosses: { before: cb, after: ca },
});
const HEALTHY_HARM = harm([2, 1, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 1], [1, 1, 0, 1, 1, 0, 1]);

async function run(impl: Mod, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`); else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const V = (o: { after7?: Win; cells?: ReturnType<typeof cells>; harm?: ReturnType<typeof harm> | null }) =>
    impl.inBoundsVerdict({ after7: o.after7 ?? win(7), cells: o.cells ?? cells(), harm: o.harm === undefined ? HEALTHY_HARM : o.harm });

  const v1 = V({ after7: win(0, true) });
  ok("IB.1 · not launched → not yet", v1.verdict === "not-yet" && v1.reason === "Not yet: not launched.", j(v1.reason));
  const v2 = V({ after7: win(6), cells: cells({ sheetToBet: { before: cell("sheetToBet", "before", 30, 100), after: cell("sheetToBet", "after", 10, 100) } }) });
  ok("IB.2 · six of seven days → not yet, even with a measure below (the rule is read at seven days)", v2.verdict === "not-yet" && /6 of 7 days/.test(v2.reason), j(v2.reason));
  const v3 = V({});
  const st = Object.fromEntries(v3.measures.map((m) => [m.key, m.status]));
  ok("IB.3 · 1, 2 and 5 at or above, 3 and 4 EXCLUDED (no pre-launch baseline by design — never a pass, never a zero) → in bounds",
    v3.verdict === "in-bounds" && st.homeToSheet === "at-or-above" && st.sheetToBet === "at-or-above" && st.timeToFirstBet === "at-or-above"
      && st.shortToDeposit === "excluded" && st.depositToBet === "excluded" && v3.measures.filter((m) => m.status === "excluded").every((m) => m.before === null), j(v3));
  const v4 = V({ cells: cells({ sheetToBet: { before: cell("sheetToBet", "before", 30, 100), after: cell("sheetToBet", "after", 30, 100) } }) });
  ok("IB.4 · an after share EQUAL to its baseline is 'at or above'", v4.verdict === "in-bounds" && v4.measures.find((m) => m.key === "sheetToBet")?.status === "at-or-above", j(v4.reason));
  const v5 = V({ cells: cells({ homeToSheet: { before: cell("homeToSheet", "before", 401, 1000), after: cell("homeToSheet", "after", 400, 1000) } }) });
  ok("IB.5 · one tenth of a point below → out of bounds, naming measure 1", v5.verdict === "out-of-bounds" && v5.reason === "Out of bounds: measure 1 below the pre-launch baseline.", j(v5.reason));
  // 42.46% and 42.45% both print 42.5%: the verdict reads what is printed.
  const v6 = V({ cells: cells({ timeToFirstBet: { before: cell("timeToFirstBet", "before", 4246, 10000), after: cell("timeToFirstBet", "after", 4245, 10000) } }) });
  ok("IB.6 · compared on the printed one-decimal shares (42.46% and 42.45% both print 42.5% — at or above)",
    v6.verdict === "in-bounds" && v6.measures.find((m) => m.key === "timeToFirstBet")?.before === 425 && v6.measures.find((m) => m.key === "timeToFirstBet")?.after === 425, j(v6.measures));
  const v7 = V({ cells: cells({ sheetToBet: { before: cell("sheetToBet", "before", 120, 100), after: cell("sheetToBet", "after", 80, 100) } }) });
  ok("IB.7 · a HELD baseline (two counters disagree) is not a figure → not yet; never compared as 100%",
    v7.verdict === "not-yet" && v7.measures.find((m) => m.key === "sheetToBet")?.status === "undecided" && /two counters disagree/.test(v7.reason), j(v7.reason));
  const v8 = V({ cells: cells({ homeToSheet: { before: cell("homeToSheet", "before", 40, 400), after: cell("homeToSheet", "after", null, null, { readable: false }) } }) });
  ok("IB.8 · an after figure that could not be read → not yet, never 'at or above'",
    v8.verdict === "not-yet" && v8.measures.find((m) => m.key === "homeToSheet")?.status === "undecided" && /could not be read/.test(v8.reason), j(v8.reason));
  const v9 = V({ harm: harm([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 1, 2, 1, 1, 1, 1]) });
  ok("IB.9 · a harm marker whose average daily count rises above its baseline → out of bounds, named",
    v9.verdict === "out-of-bounds" && v9.harm.find((h) => h.key === "rapidDeposit")?.status === "above" && /rapid deposits above the baseline/.test(v9.reason), j(v9.reason));
  const v10 = V({ harm: harm([1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) });
  ok("IB.10 · an average equal to the baseline is not above", v10.verdict === "in-bounds" && v10.harm.every((h) => h.status === "not-above"), j(v10.harm));
  const v11 = V({ harm: harm([1, 1, 1], [0, 0, null, 0, 0, 0, 0]) });
  ok("IB.11 · an after day the harm watch did not count → not yet (never read as 0)",
    v11.verdict === "not-yet" && v11.harm.find((h) => h.key === "rapidDeposit")?.status === "undecided" && /6 of 7 days after launch were counted/.test(v11.reason), j(v11.reason));
  const v12 = V({ harm: harm([null, null], [0, 0, 0, 0, 0, 0, 0]) });
  ok("IB.12 · no counted baseline day → not yet", v12.verdict === "not-yet" && /no baseline day was counted/.test(v12.reason), j(v12.reason));
  const v13 = V({ harm: null });
  ok("IB.13 · the harm counts not read → not yet", v13.verdict === "not-yet" && /the harm counts were not read/.test(v13.reason), j(v13.reason));
  const v14 = V({ harm: null, cells: cells({ sheetToBet: { before: cell("sheetToBet", "before", 30, 100), after: cell("sheetToBet", "after", 20, 100) } }) });
  ok("IB.14 · a measure below with a figure missing elsewhere → OUT of bounds (a definite failure is not hidden)", v14.verdict === "out-of-bounds", j(v14.reason));
  // Average after 2/7 ≈ 0.29 against a baseline average of 1: not above, though one day (2) beats the baseline average.
  const v15 = V({ harm: harm([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [2, 0, 0, 0, 0, 0, 0]) });
  ok("IB.15 · the harm comparison is on the AVERAGE daily count (one busy day is not a rise)", v15.verdict === "in-bounds" && v15.harm.find((h) => h.key === "rapidDeposit")?.status === "not-above", j(v15.harm));
  ok("IB.16 · only the agency's five measures are judged (4b, the comparison row, is not one of them)",
    j(v3.measures.map((m) => m.key)) === j(["homeToSheet", "sheetToBet", "shortToDeposit", "depositToBet", "timeToFirstBet"]) && j(impl.S13_RULINGS.inBounds.measures) === j(v3.measures.map((m) => m.key)));
  ok("IB.17 · the in-bounds reason names what was judged and what had no baseline",
    v3.reason === "In bounds: measures 1, 2 and 5 at or above the pre-launch baseline (3 and 4 have no pre-launch baseline), and neither harm marker's average daily count above its baseline.", j(v3.reason));
  return failed;
}

if (!PROVE_RED) {
  console.log("journey-in-bounds — S16's measures in bounds (Ali's rule, 2026-10-14)");
  const failed = await run(M, (l) => console.log(l));
  console.log(`\nIN BOUNDS — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  type IBInput = Parameters<Mod["inBoundsVerdict"]>[0];
  const wrap = (f: (i: IBInput) => IBInput): Mod => ({ ...M, inBoundsVerdict: (i) => M.inBoundsVerdict(f(i)) });
  const plants: Array<{ name: string; expect: RegExp; impl: Mod }> = [
    { name: "'at or above' made strict (equal fails)", expect: /^IB\.4 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.after.tenths !== null && v.before.tenths !== null && v.after.tenths === v.before.tenths ? { ...v, after: { ...v.after, tenths: v.after.tenths - 1 } } : v])) as IBInput["cells"] })) },
    { name: "compared on the exact shares, not the printed ones", expect: /^IB\.6 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.before.n !== null && v.before.d && v.after.n !== null && v.after.d && v.after.n / v.after.d < v.before.n / v.before.d && v.after.tenths === v.before.tenths ? { ...v, after: { ...v.after, tenths: (v.after.tenths as number) - 1 } } : v])) as IBInput["cells"] })) },
    { name: "a missing baseline (no offer) read as 0% — a fabricated pass", expect: /^IB\.3 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.before.status === "no-offer" || v.before.status === "not-recorded" ? { ...v, before: { ...v.before, status: "figure", tenths: 0, text: "0.0%" } } : v])) as IBInput["cells"] })) },
    { name: "a missing baseline read as a failure", expect: /^IB\.3 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.before.status === "no-offer" ? { ...v, before: { ...v.before, status: "figure", tenths: 1000, text: "100.0%" }, after: { ...v.after, status: "figure", tenths: 0, text: "0.0%" } } : v])) as IBInput["cells"] })) },
    { name: "a held baseline compared as 100%", expect: /^IB\.7 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.before.status === "held" ? { ...v, before: { ...v.before, status: "figure" } } : v])) as IBInput["cells"] })) },
    { name: "decided on a partial window", expect: /^IB\.2 /, impl: wrap((i) => ({ ...i, after7: { ...i.after7, days: [...i.after7.days, "x", "y", "z"] } })) },
    { name: "an unreadable after figure read as at or above", expect: /^IB\.8 /,
      impl: wrap((i) => ({ ...i, cells: Object.fromEntries(Object.entries(i.cells).map(([k, v]) => [k, v.after.status === "unreadable" ? { ...v, after: { ...v.before } } : v])) as IBInput["cells"] })) },
    { name: "a harm rise ignored (the harm clause dropped)", expect: /^IB\.9 /, impl: wrap((i) => ({ ...i, harm: i.harm && { rapidDeposit: { ...i.harm.rapidDeposit, after: i.harm.rapidDeposit.after.map(() => 0) }, chasingLosses: i.harm.chasingLosses } })) },
    { name: "an uncounted harm day read as 0", expect: /^IB\.11 /, impl: wrap((i) => ({ ...i, harm: i.harm && { rapidDeposit: { ...i.harm.rapidDeposit, after: i.harm.rapidDeposit.after.map((x) => x ?? 0) }, chasingLosses: i.harm.chasingLosses } })) },
    { name: "harm not read treated as no rise", expect: /^IB\.13 /, impl: wrap((i) => ({ ...i, harm: i.harm ?? { rapidDeposit: { before: [0], after: [0, 0, 0, 0, 0, 0, 0] }, chasingLosses: { before: [0], after: [0, 0, 0, 0, 0, 0, 0] } } })) },
    { name: "a missing figure hides a definite failure (undecided ranked first)", expect: /^IB\.14 /,
      impl: { ...M, inBoundsVerdict: (i) => { const r = M.inBoundsVerdict(i); return r.verdict === "out-of-bounds" && (r.measures.some((m) => m.status === "undecided") || r.harm.some((h) => h.status === "undecided")) ? { ...r, verdict: "not-yet", reason: "Not yet." } : r; } } },
    { name: "harm compared on the busiest day", expect: /^IB\.15 /, impl: wrap((i) => ({ ...i, harm: i.harm && { rapidDeposit: { ...i.harm.rapidDeposit, after: i.harm.rapidDeposit.after.map(() => Math.max(...i.harm!.rapidDeposit.after.map((x) => x ?? 0))) }, chasingLosses: i.harm.chasingLosses } })) },
    { name: "4b judged as one of the five", expect: /^IB\.16 /, impl: { ...M, S13_RULINGS: { ...M.S13_RULINGS, inBounds: { ...M.S13_RULINGS.inBounds, measures: [...M.S13_RULINGS.inBounds.measures, "depositToAnyBet"] } } } as unknown as Mod },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(M, () => {});
  say("the REAL verdict passes every case", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl, () => {});
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
