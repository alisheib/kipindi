/**
 * test:contacts-import — the ONE runner for the contact importer's pure modules (decision C21, U28a 2026-10-01).
 *
 * ⭐ ONE RUNNER, ONE SECTION MODULE PER UNIT. Several units assert here — U28 the field list, U31 the import
 * decision, U26 the vCard reader, U25 the CSV reader, U27b the XLSX reader, U32 the commit and pre-flight — often
 * built in parallel. Each owns ONE module under `scripts/contacts-import/` and never edits another's; this file only
 * lists them, loads them, runs them and counts. A unit that lands adds ONE line to `REGISTRY` below, and nothing
 * else here changes.
 *
 * ⭐ THE SECTION CONTRACT (`ImportSection`): a module exports one object with a `name` and the `owner` unit;
 * `real()`, which builds the SHIPPED implementation bundle; `run(ctx)`, which asserts through `ctx.ok` against
 * `ctx.impl`; and `plants`, each a defect built IN MEMORY as a replacement bundle, plus the label of the ONE
 * assertion that must go red for it. The export's NAME is the module's own business — the runner finds the section
 * by its shape — and so is the bundle type: the runner never looks inside one.
 *
 * ⛔ NOTHING UNDER `scripts/contacts-import/` RUNS UNSEEN. The runner lists that directory through `scriptFiles()`
 * (`scripts/lib/tracked-files.mts`, the repo's ONE scripts walker — never a second one) and LOADS every module it
 * finds, registered or not, so an unregistered module's results still print. But the run FAILS on any file there
 * that is not named in `REGISTRY`, on any registered module that is missing, does not load or exports no section,
 * and on an empty registry — an empty population reads exactly like a passing one. Helpers shared by sections
 * belong in `scripts/lib/`, not here. The count of modules on disk is printed every run.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` runs every section against its shipped bundle first (the
 * baseline, which must be green), then runs each plant and requires the MATCHING assertion to fail — red on
 * some other line is reported as a problem, never counted as a catch, and a proof that ran no plant at all is a
 * problem too (0/0 is not a proof). This file and every section module make no file-writing call, comments
 * included: `test:red-anchors` counts an in-process red only while that holds.
 *
 * ⛔ A SECTION THAT ASSERTS NOTHING FAILS THE RUN, and so does one with no plants under `--prove-red`. An empty
 * section reads exactly like a passing one, and an unproven assertion is a comment.
 *
 * ⛔ A THROW IS A FAIL, NEVER A CRASH. A module that does not load, a section (or a plant's bundle) that throws,
 * is recorded as a failed assertion with its message, so one broken unit cannot hide the others' results.
 *
 * Run:  npm run test:contacts-import
 * Red:  npm run red:contacts-import
 */
process.exitCode = 1;

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT, scriptFiles } from "./lib/tracked-files.mts";

/* ══ THE SECTION CONTRACT ═══════════════════════════════════════════════════════════════════════ */

/** Record one assertion. The label is its identity: a red plant names the label it must turn red. */
export type Check = (label: string, cond: boolean, detail?: string) => void;

export type SectionContext<I> = {
  /** The bundle under test — the shipped one, or a plant's. */
  readonly impl: I;
  readonly ok: Check;
  /** A line of context, such as a population count. Printed, never counted. */
  readonly log: (line: string) => void;
};

export type RedPlant<I> = {
  readonly name: string;
  /** The label of the ONE assertion this defect must turn red. */
  readonly expect: string;
  /** Builds the defective bundle, in memory. */
  readonly impl: () => I;
};

export type ImportSection<I> = {
  readonly name: string;
  /** The unit that owns the section module (U28a, U31, U25, U26, U27b, U32). */
  readonly owner: string;
  readonly real: () => I;
  readonly run: (ctx: SectionContext<I>) => void | Promise<void>;
  readonly plants: readonly RedPlant<I>[];
};

// Each section carries its own bundle type; the runner only hands a section's bundle back to that section.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySection = ImportSection<any>;

/* ══ THE REGISTRY ═══════════════════════════════════════════════════════════════════════════════ */

type Registered = {
  /** The module's file name under `scripts/contacts-import/`. */
  readonly file: string;
  readonly owner: string;
  /** What it asserts, for the log. */
  readonly covers: string;
};

/** Where the section modules live, repo-relative, as `scriptFiles()` spells paths. */
const SECTION_DIR = "scripts/contacts-import/";
/** ⭐ A registry entry names its module `scripts/`-relative (`contacts-import/fields.mts`): the orphan gate
 *  (`test:orphans`) follows only a LITERAL path in code, so a bare `fields.mts` left all six sections reading as scripts
 *  nothing runs, while this runner ran them on every pass. */
const SCRIPTS_DIR = "scripts/";

/**
 * ⭐ THE REGISTRY — a fixed list of module paths (`scripts/`-relative), in landing order. A unit adds ONE line here. A module on disk
 * that is missing from this list fails the run; a module listed here that is missing from disk fails it too.
 */
const REGISTRY: readonly Registered[] = [
  { file: "contacts-import/fields.mts", owner: "U28a", covers: "src/lib/contacts/{contact-fields,csv-write,sample-sheet}.ts" },
  { file: "contacts-import/decide.mts", owner: "U31", covers: "src/lib/contacts/import-decide.ts — the import decision" },
  { file: "contacts-import/vcard.mts", owner: "U26", covers: "src/lib/contacts/vcard.ts — the vCard reader" },
  { file: "contacts-import/csv.mts", owner: "U25", covers: "src/lib/contacts/import-parse.ts — the CSV reader" },
  { file: "contacts-import/xlsx.mts", owner: "U27b", covers: "src/lib/server/contacts/{import-xlsx,import-xlsx-run}.ts — the XLSX reader and its officer wrapper" },
  { file: "contacts-import/field-rules.mts", owner: "vb5", covers: "src/lib/contacts/contact-fields.ts — the shared field rules: phone runs, the email rule, the form's problems, the filter's tag reader" },
  // S15 (U30/U31-B/U32 as built) · the check (the pre-flight the decisions file called `preflight.mts`) and the commit,
  // both driven on the memory twin through `scripts/lib/contacts-import-world.mts`.
  { file: "contacts-import/check.mts", owner: "S15", covers: "src/lib/server/contacts/import-check.ts — the check's five boxes, the labels, the changes pages, the facts loader" },
  { file: "contacts-import/commit.mts", owner: "S15", covers: "src/lib/server/contacts/import-commit.ts + import-actions.ts — the start, the commit step, pause · resume · cancel, the failures, the result" },
  { file: "contacts-import/flow.mts", owner: "S15", covers: "src/lib/contacts/{import-read,import-loop}.ts — the browser's reader and the one loop driver" },
];

/* ══ THE HARNESS ════════════════════════════════════════════════════════════════════════════════ */

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0;
let fail = 0;
const failed: string[] = [];
let prefix = "";

const ok: Check = (label, cond, detail = "") => {
  const full = `${prefix}${label}`;
  if (cond) pass++;
  else {
    fail++;
    failed.push(full);
  }
  console.log(`${cond ? "PASS" : "FAIL"} ${full}${detail ? ` — ${detail}` : ""}`);
};
const log = (line: string): void => console.log(`     ${line}`);
const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const reset = (): void => {
  pass = 0;
  fail = 0;
  failed.length = 0;
};

/** A value shaped like `ImportSection` — how the runner finds a module's section whatever its export is called. */
function isSection(x: unknown): x is AnySection {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return typeof s.name === "string" && typeof s.owner === "string" && typeof s.real === "function"
    && typeof s.run === "function" && Array.isArray(s.plants);
}

type Loaded = { readonly file: string; readonly sections: readonly AnySection[]; readonly problem: string | null };

/** Loads one module and picks out its section(s). A module that throws on load is a recorded problem, never a crash. */
async function load(file: string): Promise<Loaded> {
  try {
    const mod = (await import(pathToFileURL(join(REPO_ROOT, SCRIPTS_DIR, file)).href)) as Record<string, unknown>;
    const sections = [...new Set(Object.values(mod).filter(isSection))];
    return {
      file,
      sections,
      problem: sections.length === 0 ? `${file} exports no section (an object with name, owner, real, run and plants)` : null,
    };
  } catch (e) {
    return { file, sections: [], problem: `${file} does not load — ${message(e)}` };
  }
}

/** Runs one section against one bundle and returns how many assertions it made. */
async function runSection(section: AnySection, impl: unknown, tag: string): Promise<number> {
  prefix = tag;
  const before = pass + fail;
  try {
    await section.run({ impl, ok, log });
  } catch (e) {
    ok(`${section.name} · the section threw`, false, message(e));
  }
  prefix = "";
  return pass + fail - before;
}

/* ── discovery: what is on disk, against what is registered ───────────────────────────────────── */

const onDisk = scriptFiles()
  .filter((p) => p.startsWith(SECTION_DIR))
  .map((p) => p.slice(SCRIPTS_DIR.length))
  .sort();
const registeredFiles = REGISTRY.map((r) => r.file);
const duplicateFiles = [...new Set(registeredFiles.filter((f, i) => registeredFiles.indexOf(f) !== i))];
const unregistered = onDisk.filter((f) => !registeredFiles.includes(f));
const missing = registeredFiles.filter((f) => !onDisk.includes(f));

// Load every registered module that exists, in registry order, then every unregistered one, so nothing on disk
// runs unseen — an unregistered module's results print, and the registry check below still fails the run.
const loaded: Loaded[] = [];
for (const file of [...new Set(registeredFiles)].filter((f) => onDisk.includes(f)).concat(unregistered)) loaded.push(await load(file));
const loadProblems = [...missing.map((f) => `${f} is registered but not on disk`), ...loaded.flatMap((l) => (l.problem ? [l.problem] : []))];

const SECTIONS: readonly AnySection[] = loaded.flatMap((l) => l.sections);
const names = SECTIONS.map((s) => s.name);
const duplicateNames = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];

const populationLine =
  `${onDisk.length} module(s) under ${SECTION_DIR}: ${onDisk.join(", ") || "none"} · ${REGISTRY.length} registered · ${SECTIONS.length} section(s) loaded`;
const unregisteredDetail = [
  unregistered.length ? `not registered: ${unregistered.join(", ")}` : "",
  duplicateFiles.length ? `registered twice: ${duplicateFiles.join(", ")}` : "",
].filter((s) => s !== "").join(" · ");

if (!PROVE_RED) {
  log(populationLine);
  ok("registry · every module under scripts/contacts-import/ is registered by name, once", unregistered.length === 0 && duplicateFiles.length === 0,
    unregisteredDetail || `${onDisk.length} on disk, all registered`);
  ok("registry · every registered module is on disk, and every module found loads and exports a section", loadProblems.length === 0,
    loadProblems.join(" | ") || `${loaded.length} module(s) loaded`);
  ok("registry · at least one section runs — an empty registry is not a pass", SECTIONS.length >= 1, `${SECTIONS.length} section(s)`);
  ok("registry · every section has its own name", duplicateNames.length === 0, duplicateNames.join(", "));
  for (const section of SECTIONS) {
    console.log("");
    console.log(`── section ${section.name} (${section.owner})`);
    let impl: unknown;
    try {
      impl = section.real();
    } catch (e) {
      ok(`${section.name} · the shipped bundle builds`, false, message(e));
      continue;
    }
    const made = await runSection(section, impl, "");
    ok(`${section.name} · the section asserted something`, made > 0, `${made} assertion(s)`);
  }
  console.log("");
  console.log(`contacts-import: ${pass} passed, ${fail} failed across ${SECTIONS.length} section(s)`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  console.log(populationLine);
  console.log("");
  if (unregistered.length > 0 || duplicateFiles.length > 0) problems.push(`REGISTRY: ${unregisteredDetail}`);
  for (const p of loadProblems) problems.push(`REGISTRY: ${p}`);
  if (SECTIONS.length === 0) problems.push("REGISTRY: no section loaded — an empty registry proves nothing");
  if (duplicateNames.length > 0) problems.push(`REGISTRY: two sections share a name (${duplicateNames.join(", ")})`);

  for (const section of SECTIONS) {
    reset();
    console.log(`── baseline · ${section.name} (${section.owner})`);
    let impl: unknown;
    try {
      impl = section.real();
    } catch (e) {
      problems.push(`BASELINE ${section.name}: the shipped bundle does not build — ${message(e)}`);
      continue;
    }
    const made = await runSection(section, impl, `base:${section.name}:`);
    if (made === 0) problems.push(`BASELINE ${section.name}: asserted nothing`);
    if (fail !== 0) problems.push(`BASELINE ${section.name}: the shipped code is already red (${failed.join(" | ")})`);
    if (section.plants.length === 0) problems.push(`${section.name}: no red plants — an unproven section`);
    console.log(`   baseline ${section.name}: ${pass} passed, ${fail} failed`);
    console.log("");
  }

  let cases = 0;
  let caught = 0;
  for (const section of SECTIONS) {
    for (const [i, plant] of section.plants.entries()) {
      cases++;
      reset();
      const tag = `red:${section.name}.${i + 1}:`;
      const id = `${section.name} case ${i + 1} (${plant.name})`;
      console.log(`── ${section.name} case ${i + 1}: ${plant.name}`);
      let impl: unknown;
      try {
        impl = plant.impl();
      } catch (e) {
        problems.push(`${id}: the plant does not build — ${message(e)}`);
        continue;
      }
      await runSection(section, impl, tag);
      if (fail === 0) problems.push(`${id}: stayed GREEN`);
      else if (!failed.includes(`${tag}${plant.expect}`)) problems.push(`${id}: red, but not on "${plant.expect}" — got ${failed.join(" | ")}`);
      else {
        caught++;
        console.log(`   caught → ${plant.expect}`);
      }
      console.log("");
    }
  }
  if (cases === 0) problems.push("RED PROOF: no plant ran — 0/0 caught is not a proof");

  console.log(`${caught}/${cases} caught across ${SECTIONS.length} section(s)`);
  if (problems.length > 0) {
    console.log("");
    console.log("PROBLEMS:");
    for (const p of problems) console.log(`  ✗ ${p}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
