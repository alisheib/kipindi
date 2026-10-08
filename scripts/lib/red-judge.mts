/**
 * THE VERDICT OF AN IN-PROCESS RED RUN - one judge for the harnesses that are "a guard suite run with a flag".
 *
 * Some harnesses in the red fleet are not a script of their own. They are a guard suite run with a flag
 * (`tsx scripts/social-links.test.mts --prove-red-rel`): the flag plants a defect IN MEMORY, the suite runs
 * as usual, and the run is only worth something if the suite goes red ON THE ASSERTION THE PLANT WAS WRITTEN
 * FOR. This module is that judgement, written once, so that no harness hand-rolls its own and gets the exit
 * code backwards.
 *
 * WHY IT EXISTS (2026-10-08). `red:social-home`, `-token`, `-rel`, `-promo` and `-panel` were written on
 * 2026-09-12 to exit 1 when the guard went red - which is the guard WORKING. `red:all` reads exit 0 as a pass
 * (`passed = r.status === 0` in scripts/red-all.mjs), so all five read FAIL on a healthy tree, about 1.5 s
 * each, with a tail that never named the assertion. And the mistake ran in BOTH directions: the four
 * social-links flags exited 0 when the plant was NOT caught (the suite stayed green), so a toothless guard
 * would have read PASS in the fleet. A red proof whose polarity is inverted is worse than none, because
 * either reading of its exit code is wrong half the time.
 *
 * THE CONTRACT (the fleet's own: 0 = every planted defect was caught).
 *
 *   exit 0  the plain suite is green, every plant took, every plant tripped the assertion(s) it names, and
 *           NOTHING else failed.
 *   exit 2  a CONTROL STOPPED FIRING: a plant did not take (STALE - its anchor no longer matches, or matches
 *           twice) or the suite stayed green over it (MISSED). A section that stopped checking must never
 *           look like a pass or like an ordinary red.
 *   exit 1  the controls fired but the proof is unsound: the plain suite is itself red (so a red under a
 *           plant proves nothing), or an assertion failed that no plant names (the plant is not the single
 *           defect it claims to be).
 *
 * WHAT IT DOES NOT DO. It does not apply a plant - each harness does that in its own terms - and it reads no
 * file. It is a pure function over what the harness hands it, plus one helper that runs the plain suite as a
 * child process, because "the plain suite is green" is only believable when the plain suite says so.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** An assertion a plant is written to trip: its exact label, or a pattern over labels (a numbered suite's leading id). */
export type Trip = string | RegExp;

export type RedPlant = {
  /** Short name for the report (a flag, or a plant id). */
  name: string;
  /** The defect, in a phrase. */
  what: string;
  /** Every one of these must be among the failures. Most plants trip one assertion; some legitimately trip two. */
  trips: Trip[];
  /** False when the plant did not take - an anchor that stopped matching, or matches twice. It cannot be judged. */
  applied: boolean;
  staleReason?: string;
};

export type RedRun = {
  plants: RedPlant[];
  /** The label of every assertion that FAILED in the planted run. */
  failed: string[];
  /** Whether the plain suite, run on its own, exits 0. */
  baselineClean: boolean;
  baselineNote?: string;
};

export type RedVerdict = { code: 0 | 1 | 2; caught: number; total: number; lines: string[] };

const tripHits = (t: Trip, failed: string[]): string[] =>
  failed.filter((l) => (typeof t === "string" ? l === t : new RegExp(t.source, t.flags.replace(/[gy]/g, "")).test(l)));

export function judgeRedRun(run: RedRun): RedVerdict {
  const lines: string[] = [];
  const claimed = new Set<string>();
  let caught = 0;
  let silent = 0; // a control that stopped firing: STALE or MISSED

  lines.push(`  ${run.baselineClean ? "✓" : "✗"} baseline  ${run.baselineNote ?? (run.baselineClean ? "the plain suite is green" : "the plain suite is red")}`);
  for (const p of run.plants) {
    if (!p.applied) {
      silent++;
      lines.push(`  ✗ STALE     ${p.name} - ${p.what} - the plant did not take: ${p.staleReason ?? "no reason given"}`);
      continue;
    }
    const found = p.trips.map((t) => ({ t, labels: tripHits(t, run.failed) }));
    for (const f of found) for (const l of f.labels) claimed.add(l);
    const absent = found.filter((f) => f.labels.length === 0).map((f) => String(f.t));
    if (absent.length === 0) {
      caught++;
      lines.push(`  ✓ CAUGHT    ${p.name} - ${p.what} - tripped: ${found.flatMap((f) => f.labels).join(" | ")}`);
    } else {
      silent++;
      lines.push(`  ✗ MISSED    ${p.name} - ${p.what} - the suite did not fail on: ${absent.join(" | ")}`);
    }
  }
  const strays = run.failed.filter((l) => !claimed.has(l));
  for (const l of strays) lines.push(`  ✗ STRAY     failed, and no plant names it: ${l}`);

  const credited = run.baselineClean ? caught : 0; // a red under a red baseline proves nothing
  const total = run.plants.length;
  const unsound = !run.baselineClean || strays.length > 0;
  lines.push("");
  lines.push(`${credited}/${total} planted defects caught on their named assertion${run.baselineClean ? "" : " - the plain suite is itself red, so the proof is void"}${strays.length ? ` - ${strays.length} stray failure(s)` : ""}`);
  const code: 0 | 1 | 2 = total === 0 || silent > 0 ? 2 : unsound ? 1 : 0;
  return { code, caught: credited, total, lines };
}

/**
 * Run the harness's own file with NO flag and report whether it exits 0. Pass the harness's `import.meta.url`.
 * The child gets the parent's loader flags (`process.execArgv`), which is how `tsx` is carried into it.
 */
export function runPlain(harnessUrl: string): { clean: boolean; note: string } {
  const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(harnessUrl)], {
    encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) return { clean: false, note: `the plain suite could not be run: ${r.error.message}` };
  const tail = (r.stdout ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) ?? "";
  return r.status === 0
    ? { clean: true, note: `the plain suite is green - ${tail}` }
    : { clean: false, note: `the plain suite is itself RED (exit ${r.status}) - ${tail}` };
}

/** Any `--prove-red*` argument that is not one of the flags the harness knows. A typo would otherwise run the plain suite and read green. */
export function strayRedFlags(known: readonly string[]): string[] {
  return process.argv.slice(2).filter((a) => a.startsWith("--prove-red") && !known.includes(a));
}

/**
 * The judge's own controls, run before every red verdict: a judge nobody has watched fail is a green light of
 * unknown wiring. Returns the problems found (empty = the judge can tell the six outcomes apart).
 */
export function judgeSelfTest(): string[] {
  const problems: string[] = [];
  const plant = (over: Partial<RedPlant> = {}): RedPlant => ({ name: "p", what: "a plant", trips: ["A"], applied: true, ...over });
  const run = (over: Partial<RedRun> = {}): RedRun => ({ plants: [plant()], failed: ["A"], baselineClean: true, ...over });
  const expect = (what: string, got: number, want: number) => {
    if (got !== want) problems.push(`${what}: the judge exits ${got}, it must exit ${want}`);
  };
  expect("a plant that trips exactly its named assertion", judgeRedRun(run()).code, 0);
  expect("a plant the suite stayed green over (MISSED)", judgeRedRun(run({ failed: [] })).code, 2);
  expect("a plant that did not take (STALE)", judgeRedRun(run({ plants: [plant({ applied: false })], failed: [] })).code, 2);
  expect("the suite failing on a DIFFERENT assertion than the one named", judgeRedRun(run({ failed: ["B"] })).code, 2);
  expect("an extra failure beside the named one (STRAY)", judgeRedRun(run({ failed: ["A", "B"] })).code, 1);
  expect("a red plain suite (the proof is void)", judgeRedRun(run({ baselineClean: false })).code, 1);
  expect("a pattern trip matches a numbered label by its id", judgeRedRun(run({ plants: [plant({ trips: [/^1\.2 /] })], failed: ["1.2 never in the opening seconds"] })).code, 0);
  expect("a plant that names two assertions needs both", judgeRedRun(run({ plants: [plant({ trips: ["A", "B"] })], failed: ["A"] })).code, 2);
  expect("a run with no plants is not a pass", judgeRedRun({ plants: [], failed: [], baselineClean: true }).code, 2);
  if (judgeRedRun(run({ baselineClean: false })).caught !== 0) problems.push("a red plain suite must credit nothing");
  return problems;
}
