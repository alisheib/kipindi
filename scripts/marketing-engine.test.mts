/**
 * test:marketing-engine — the campaign send engine's suite (ENGINE-SPEC §4.9 §E, §4.12 §F, §4.13 §S/§R/§C/§T).
 *
 * ⚠️ U49a's MINIMAL HOST: IT RUNS §F ALONE. U42's builder writes the full host (§E, the enqueue) in another worktree, and
 * the integrator folds §F into it. Each section lives in its own module under `scripts/marketing-engine/` and exports an
 * `EngineSection` — its labels, its assertions (`run(impl, ok)`), the shipped implementation (`real`) and its in-process
 * plants — so a host only has to run every section against `real` and, for `--prove-red`, prove each section's baseline
 * green and then require every plant to fail EXACTLY the labels it names: red anywhere else is reported, never counted
 * as a catch. To fold a section in, import it beside `SECTION_F` and hand it to the same two calls below.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — no file written, no SMS sent, no database: the database variables are removed below,
 * before any server module loads, so the store picks its memory twin. ⛔ This file holds no backslash (an editing tool
 * decodes them).
 *
 * Run: `npm run test:marketing-engine` · Red: `npm run red:marketing-engine`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");
const NL = String.fromCharCode(10);

const { SECTION_F } = await import("./marketing-engine/f-credit.mts");
type EngineSection<I> = import("./marketing-engine/f-credit.mts").EngineSection<I>;

let pass = 0;
let fail = 0;
const failed: string[] = [];
/** While true, the claims are counted and not printed (the red runs print verdicts only). */
let quiet = false;
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else {
    fail++;
    failed.push(label);
  }
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const reset = (): void => {
  pass = 0;
  fail = 0;
  failed.length = 0;
};
const why = (err: unknown): string => String((err as Error)?.message ?? err);

/** A quiet run: this file's lines and the audit module's console echo both held back, so a red run prints verdicts only. */
async function silently(run: () => Promise<void>): Promise<void> {
  const log = console.log;
  console.log = () => {};
  try {
    await run();
  } finally {
    console.log = log;
  }
}

/** One section against its shipped code. A section that throws is a failure of the suite, never a silent pass. */
async function runSection<I>(s: EngineSection<I>): Promise<void> {
  console.log(`── ${s.title}`);
  try {
    await s.run(s.real, ok);
  } catch (err) {
    ok(`§${s.id} · the section ran to its end`, false, `threw: ${why(err)}`);
  }
}

/** ⭐ The red control for one section: its baseline green, then every plant failing EXACTLY the labels it names. */
async function proveSection<I>(s: EngineSection<I>): Promise<boolean> {
  reset();
  try {
    await silently(() => s.run(s.real, ok));
  } catch (err) {
    ok(`§${s.id} · the section ran to its end`, false, `threw: ${why(err)}`);
  }
  if (fail > 0) {
    console.log(`RED CONTROL §${s.id} — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    return false;
  }
  console.log(`RED CONTROL §${s.id} — baseline green (${pass} claims pass for the real code)`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of s.plants) {
    reset();
    let impl: I;
    try {
      impl = { ...s.real, ...plant.impl() };
    } catch (err) {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — the plant could not be built: ${why(err)}`);
      continue;
    }
    try {
      await silently(() => s.run(impl, ok));
    } catch (err) {
      ok(`§${s.id} · the section ran to its end`, false, `threw: ${why(err)}`);
    }
    const got = [...new Set(failed)].sort();
    const want = [...new Set(plant.expect)].sort();
    if (JSON.stringify(got) === JSON.stringify(want)) {
      held++;
      console.log(`  held  ${plant.name}`);
    } else {
      missed.push(plant.name);
      const absent = want.filter((x) => !got.includes(x)).map((x) => x.slice(0, 80));
      const extra = got.filter((x) => !want.includes(x)).map((x) => x.slice(0, 80));
      console.log(`  FAIL  ${plant.name}${absent.length ? `${NL}        did not fail: ${absent.join(" | ")}` : ""}${extra.length ? `${NL}        also failed: ${extra.join(" | ")}` : ""}`);
    }
  }
  console.log(`RED CONTROL §${s.id} — ${held} of ${s.plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}${NL}`);
  return missed.length === 0;
}

if (!PROVE_RED) {
  await runSection(SECTION_F);
  console.log(`${NL}marketing-engine: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  quiet = true;
  const proved = await proveSection(SECTION_F);
  console.log(proved ? "RED PROOF COMPLETE" : "RED PROOF FAILED");
  process.exitCode = proved ? 0 : 1;
}
// ⛔ Explicit: a handle an imported module leaves open must never turn a finished run into a hang on the predeploy chain.
process.exit(process.exitCode ?? 1);
