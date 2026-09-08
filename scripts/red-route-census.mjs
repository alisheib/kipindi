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

const DOC = "docs/PLAYER-QUERY-CAMPAIGN.md";
const PROBE_DIR = "src/app/__red_census_probe__";
const PROBE = `${PROBE_DIR}/page.tsx`;

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

const originalDoc = readFileSync(DOC, "utf8");
let caught = 0;
const problems = [];
const CASES = [];

/* ── 1 · a route on disk with no ruling ──────────────────────────────────────────────────── */
CASES.push({
  name: "route-ships-without-a-ruling",
  expect: "NO RULING for: /__red_census_probe__",
  apply() {
    mkdirSync(PROBE_DIR, { recursive: true });
    writeFileSync(PROBE, "export default function Probe() { return null; }\n", "utf8");
  },
  undo() { rmSync(PROBE_DIR, { recursive: true, force: true }); },
});

/* ── 2 · a ruling removed while the route stays ──────────────────────────────────────────── */
CASES.push({
  name: "ruling-deleted-from-the-census",
  expect: "NO RULING for: /agent/status",
  /**
   * 🔴 THE FIRST DRAFT USED `/help` AND STAYED GREEN — and the gate was RIGHT, not blind. `/help`
   * is named TWICE in §4: once in the bucket-D table row and again in a detailed ruling below it.
   * Deleting the table row left the real ruling standing, so the route still had one.
   *
   * ⭐ A MUTATION THAT DOES NOT REPRODUCE ITS DEFECT IS A RED PROOF THAT PASSES BY LUCK — the
   * failure task 6.6 already recorded on `qa:count-truth`, where a verbatim `/results` defect
   * stayed green because all three notables happened to land on one page. Re-derived instead of
   * guessed: `/agent/status` is named EXACTLY ONCE in §4, so removing that span removes the whole
   * ruling.
   *
   *     node -e "…count backticked routes inside §4…"   →  45 routes named exactly once
   */
  apply() {
    const cut = originalDoc.replace("`/agent` · `/agent/apply` · `/agent/status`", "`/agent` · `/agent/apply`");
    if (cut === originalDoc) throw new Error("anchor for the /agent/status ruling not found — the census changed shape");
    writeFileSync(DOC, cut, "utf8");
  },
  undo() { writeFileSync(DOC, originalDoc, "utf8"); },
});

/* ── 3 · the gate's own eyesight ─────────────────────────────────────────────────────────── */
CASES.push({
  name: "census-section-cannot-be-parsed",
  expect: "2.2 CONTROL",
  apply() {
    // ⛔ Rename the heading the gate slices on. Every route then reads as undeclared — but the
    //    assertion that must fire FIRST is the CONTROL, because a gate that cannot see its own
    //    subject must say so rather than reporting 52 findings.
    const broken = originalDoc.replace("## §4 — THE CENSUS", "## §4x — THE CENSUS");
    if (broken === originalDoc) throw new Error("anchor for the §4 heading not found");
    writeFileSync(DOC, broken, "utf8");
  },
  undo() { writeFileSync(DOC, originalDoc, "utf8"); },
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
//    could have failed to remove while every other signal looked clean.
if (readFileSync(DOC, "utf8") !== originalDoc) problems.push(`${DOC} NOT RESTORED — the working tree is dirty`);
if (existsSync(PROBE_DIR)) problems.push(`${PROBE_DIR} NOT REMOVED — the working tree is dirty`);
const after = runGate();
if (after.code !== 0) problems.push("the gate is RED after restore");

console.log(`\n${caught}/${CASES.length} cases caught · doc restored: ${readFileSync(DOC, "utf8") === originalDoc} · probe removed: ${!existsSync(PROBE_DIR)} · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
if (caught === 0) { console.error("\n✗ ZERO cases exercised — this run proves nothing about the gate."); process.exit(1); }
console.log("RED PROOF COMPLETE — test:route-census refuses every defect it names.");
