#!/usr/bin/env node
/**
 * RED PROOF for `npm run qa:count-truth`.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the driver EXIT NON-ZERO *and*
 * report a failure naming the right thing. Every mutation is reverted and the file verified
 * byte-for-byte afterwards. A mutation whose anchor is missing is reported as PROVING NOTHING,
 * never skipped quietly — a stale anchor is an ABSENT test that fails in the direction of
 * looking fine.
 *
 * ⚠️ THIS HARNESS MUTATES A RUNNING PRODUCT, WHICH THE STATIC ONES DO NOT. `qa:count-truth` reads
 * a real page, so the dev server has to RECOMPILE between the mutation and the measurement. Two
 * consequences, both handled below rather than hoped away:
 *   · every case waits for the route to actually reflect the change before measuring, and
 *   · `--only` scopes each case to the route its mutation touches, so a four-case proof is four
 *     short drives rather than four full sweeps.
 *
 * 🔴 AND THE WORKING TREE IS THE THING AT RISK. A previous red harness on this platform left a
 * live payout gate DISABLED in the working tree when two runs overlapped, and its own "0 files
 * left dirty" check reported clean. So: the baseline is captured BEFORE anything is touched, the
 * restore is verified by comparison rather than assumed, and the driver is re-run at the end to
 * prove the tree is genuinely back.
 *
 * ⛔ Needs the dev server up and a populated fixture — the same preconditions as the driver.
 *
 * Run: npm run red:count-truth
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/count-truth.anchors.mjs";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
const DRIVER = "scripts/live/count-truth-drive.mjs";

/** Which route each mutation is proved on — see the header on scoping. */
const ROUTE_FOR = {
  "count-ignores-other-axes": "/watchlist",
  "count-off-by-one": "/watchlist",
  "pages-overlap": "/results",
  "duplicate-row-id": "/watchlist",
};

const runDriver = (only) => {
  const args = [DRIVER, BASE];
  if (only) args.push(`--only=${only}`);
  try {
    const out = execFileSync("node", args, { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

/** Give the dev server time to recompile the mutated route, then confirm it is serving. */
const settle = async (route) => {
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch { /* server mid-restart */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

const base = runDriver(null);
if (base.code !== 0) {
  console.error("REFUSING: qa:count-truth is already RED on the untouched tree — fix that first, or a mutation cannot be shown to cause anything.");
  console.error(base.out.split("\n").filter((l) => l.includes("✗")).slice(0, 6).join("\n"));
  process.exit(1);
}
console.log("precondition: the driver is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(MUTATIONS.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

/**
 * ⛔ A THIRD OUTCOME, AND IT IS NOT A PASS — borrowed from `qa:player-filters`, which invented it
 * for the same reason. Some mutations only reproduce their defect on data of a particular SHAPE:
 * `pages-overlap` is about rows crossing a page boundary, so on an archive that fits in one page
 * the mutated code and the correct code are identical. ⭐ Reporting that as "stayed GREEN" is a
 * false finding about a gate that is fine; reporting it as caught would be a lie. It is neither —
 * it is printed loudly, counted separately, never added to `caught`, and named in the summary.
 */
const skips = [];
const meets = async (req) => {
  if (!req) return true;
  if (req.minPages) {
    try {
      const html = await (await fetch(`${BASE}${req.route}`)).text();
      const promised = Number((html.match(/data-result-count="(\d+)"/) ?? [])[1] ?? 0);
      const rows = (html.match(/data-row-id=/g) ?? []).length;
      // Fewer rows than promised means the set does not fit on one page.
      return rows > 0 && promised > rows;
    } catch { return false; }
  }
  return true;
};

let caught = 0;
const problems = [];
for (const [i, c] of MUTATIONS.entries()) {
  const original = originals.get(c.file);
  const route = ROUTE_FOR[c.name] ?? null;
  if (!(await meets(c.requires))) {
    skips.push(`${c.name}: the fixture cannot exercise it — ${JSON.stringify(c.requires)} is not satisfied`);
    console.log(`  ${i + 1}. 🔶 NOT EXERCISED  ${c.name}  (fixture shape, not a result)`);
    continue;
  }
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }

  writeFileSync(c.file, mutated, "utf8");
  const served = await settle(route ?? "/");
  const r = served ? runDriver(route) : { code: -1, out: "" };
  writeFileSync(c.file, original, "utf8");
  await settle(route ?? "/");

  if (!served) {
    problems.push(`case ${i + 1} (${c.name}): the route never came back after the mutation — PROVED NOTHING`);
    console.log(`  ${i + 1}. NO SERVER    ${c.name}`);
  } else if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).slice(0, 3).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but no failure mentioned "${c.expect}" — got ${lines.join(" | ") || "(no ✗ line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught       ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED. "No problems, therefore the tree is clean" is the
//    reasoning that left a payout gate disabled; the question has its own answer.
const unrestored = [...originals].filter(([f, original]) => readFileSync(f, "utf8") !== original).map(([f]) => f);
for (const f of unrestored) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
const after = runDriver(null);
if (after.code !== 0) problems.push("the driver is RED after restore");

console.log(`\n${caught}/${MUTATIONS.length - skips.length} exercised cases caught · ${skips.length} not exercised · files restored: ${unrestored.length === 0 ? "all" : unrestored.join(", ")} · green after restore: ${after.code === 0}`);
for (const s of skips) console.log(`  🔶 ${s}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
// ⛔ A run that skipped everything cannot read as coverage.
if (caught === 0) { console.error("\n✗ ZERO cases exercised — this run proves nothing about the gate."); process.exit(1); }
console.log(`RED PROOF COMPLETE — qa:count-truth refuses every defect it names${skips.length ? ", except the ones this fixture cannot pose" : ""}.`);
