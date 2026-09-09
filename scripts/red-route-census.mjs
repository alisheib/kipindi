#!/usr/bin/env node
/**
 * RED PROOF for `npm run test:route-census`.
 *
 * ⛔ THIS ONE MUTATES A DOC AND A DIRECTORY, NOT A MODULE, because that is what the gate reads.
 * Two directions, because the gate has two and each catches a different rot:
 *   · a ROUTE added to disk with no ruling in §4 — the defect the gate exists for;
 *   · a RULING removed from §4 while the route stays — the same defect arriving from the other
 *     side, which is how a census goes stale during a refactor.
 * And two controls on the gate's own eyesight, because both §1 arms are satisfied by a broken
 * reader: a glob that matches nothing and a §4 that fails to slice both produce empty sets and a
 * cheerful pass.
 *
 * ⚠️ IT CREATES AND DELETES A REAL FILE under `src/app`. The path is deliberately absurd
 * (`__red_census_probe__`) so it cannot collide with anything, it is removed in a `finally`, and
 * its absence is VERIFIED afterwards rather than assumed — a red harness on this platform once
 * left a live payout gate disabled while its own cleanliness check reported clean.
 *
 * Run: npm run red:route-census
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { MUTATIONS } from "./anchors/route-census.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

// ⛔ EVERY PATH AND EVERY ANCHOR IS DERIVED FROM THE DECLARATION, never restated here. Restating
// them is `RULES.md` §7's "a number written twice", and the half that rots is always the copy
// nobody is looking at — which for a red harness means it stops planting its defect while still
// printing a verdict. `test:red-anchors` §3 audits that declaration; it can only audit what is
// declared, which is the whole reason this harness now has a file in `scripts/anchors/`.
const PATH_CASE = MUTATIONS.find((m) => m.kind === "path");
const PROBE_DIR = PATH_CASE.dir;
const DOCS = [...new Set(MUTATIONS.filter((m) => m.file).map((m) => m.file))];

const runGate = () => {
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/route-census.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:route-census is already RED on the untouched tree — fix that first, or a mutation cannot be shown to cause anything.");
  console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 4).join("\n"));
  process.exit(1);
}
console.log("precondition: the gate is GREEN on the untouched tree\n");

// ⚠️ SNAPSHOT EVERY DOCUMENT BEFORE THE FIRST MUTATION, so `undo` restores bytes rather than
//    re-deriving them. A restore that rebuilds text is a second implementation of the mutation.
const originals = new Map(DOCS.map((f) => [f, readFileSync(f, "utf8")]));
let caught = 0;
const problems = [];

/* ── the cases, BUILT FROM THE DECLARATION ───────────────────────────────────────────────────
 *
 * ⛔ THE MUTATIONS ARE DATA IN `anchors/route-census.anchors.mjs`; only the MECHANICS live here.
 * That split is what lets `test:red-anchors` §3 audit this harness statically — until it existed,
 * this was one of the harnesses the §4 ratchet had to count as un-audited, and the ratchet was
 * raised to make room for it instead. See that file's header for why two of these three cases
 * were anchorable all along.
 *
 * ⚠️ EACH `apply` RE-CHECKS WHAT THE DECLARATION CLAIMS rather than trusting it. The auditor runs
 * at a different time — `test:red-anchors` reads and never mutates — so a tree that changed
 * between the audit and this run would otherwise let a creation-mutation overwrite a real file.
 */
const CASES = MUTATIONS.map((m) => {
  if (m.kind === "path") {
    return {
      name: m.name,
      expect: m.expect,
      apply() {
        // ⛔ THE ABSENCE IS VERIFIED HERE TOO, not just declared. `undo` is a RECURSIVE DELETE of
        //    this directory; if the path had become real, this harness would remove live source
        //    and its own restore check would still report the tree clean.
        if (existsSync(m.path)) {
          throw new Error(`${m.path} already exists — refusing to overwrite it, and refusing to rm -rf ${m.dir} afterwards`);
        }
        mkdirSync(m.dir, { recursive: true });
        writeFileSync(m.path, m.content, "utf8");
      },
      undo() { rmSync(m.dir, { recursive: true, force: true }); },
    };
  }
  return {
    name: m.name,
    expect: m.expect,
    apply() {
      // ⛔ `injectDefect` REFUSES A NO-OP AND REFUSES AN AMBIGUOUS ANCHOR. The hand-rolled
      //    `replace` this used to do would silently write the file back unchanged if the anchor
      //    had rotted — the case would then run against a pristine tree and report the gate
      //    "did not catch" a defect that was never planted.
      writeFileSync(m.file, injectDefect(readFileSync(m.file, "utf8"), m.from, m.to), "utf8");
    },
    undo() { writeFileSync(m.file, originals.get(m.file), "utf8"); },
  };
});

for (const [i, c] of CASES.entries()) {
  let r;
  try {
    c.apply();
    r = runGate();
  } catch (e) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR — ${e.message}`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    try { c.undo(); } catch { /* best effort */ }
    continue;
  } finally {
    try { c.undo(); } catch (e) { problems.push(`case ${i + 1}: UNDO FAILED — ${e.message}`); }
  }

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    const lines = r.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 2).map((l) => l.trim());
    problems.push(`case ${i + 1} (${c.name}): red, but no failure mentioned "${c.expect}" — got ${lines.join(" | ") || "(no FAIL line)"}`);
    console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${i + 1}. caught       ${c.name}  →  ${c.expect}`);
  }
}

// ⚠️ RESTORATION IS MEASURED, NOT INFERRED — including the probe DIRECTORY, which a `finally`
//    could have failed to remove while every other signal looked clean. Every document the
//    declaration named is compared, not just the one that happens to be first.
const docsRestored = DOCS.every((f) => readFileSync(f, "utf8") === originals.get(f));
for (const f of DOCS) {
  if (readFileSync(f, "utf8") !== originals.get(f)) problems.push(`${f} NOT RESTORED — the working tree is dirty`);
}
if (existsSync(PROBE_DIR)) problems.push(`${PROBE_DIR} NOT REMOVED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("the gate is RED after restore");

console.log(`\n${caught}/${CASES.length} cases caught · ${DOCS.length} doc(s) restored: ${docsRestored} · probe removed: ${!existsSync(PROBE_DIR)} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
if (caught === 0) { console.error("\n✗ ZERO cases exercised — this run proves nothing about the gate."); process.exit(1); }
console.log("RED PROOF COMPLETE — test:route-census refuses every defect it names.");
