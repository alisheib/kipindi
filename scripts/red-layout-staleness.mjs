/**
 * `npm run red:layout-staleness` — DOES `test:layout-staleness` ACTUALLY CATCH ANYTHING?
 *
 *   node scripts/red-layout-staleness.mjs
 *
 * For each mutation declared in `scripts/anchors/layout-staleness.anchors.mjs`: inject the defect
 * into real source, run the guarded suite, and require it to go RED — then restore.
 *
 * ── ⛔ WHAT COUNTS AS A CATCH, AND WHY THE BAR IS THIS HIGH ────────────────────────────────
 * A catch requires ALL THREE:
 *   1. the suite exits NON-ZERO, and
 *   2. it reports at least ONE failing check, and
 *   3. the NAMED check for this mutation is among the failures.
 *
 * ⛔ (1) alone is what a previous harness in this repo settled for, and it printed "✓ RED" for
 * three mutations the guard silently passed — because it only checked that the FILE had changed.
 * ⛔ (2) without (3) is nearly as weak: a mutation that crashes the suite exits non-zero with no
 * failing check, and a mutation that breaks some unrelated check proves the guard is noisy, not
 * that it is aimed. (3) is what makes each row a statement about a specific defect.
 *
 * ── ⭐ AND THE MIRROR: THE SUITE MUST BE GREEN BEFORE AND AFTER ────────────────────────────
 * A guard that fails WITHOUT the defect is worse than no guard — it cries wolf and gets deleted.
 * So this harness proves the suite green on untouched source FIRST (refusing to run otherwise,
 * because mutating a tree that is already red measures nothing), and green AGAIN after every
 * file has been restored. ⛔ Restoration runs in a `finally` and is verified byte-for-byte: a
 * mutation left on disk with `git diff` printing nothing is how a defect ships to 50pick.tz.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/layout-staleness.anchors.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SUITE = "scripts/layout-staleness.test.mts";

function runSuite() {
  const r = spawnSync("npx", ["tsx", SUITE], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 300_000 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const failures = [...out.matchAll(/^\s*FAIL (.+)$/gm)].map((m) => m[1]);
  const tally = /layout-staleness: (\d+) passed, (\d+) failed/.exec(out);
  return { code: r.status, out, failures, passed: Number(tally?.[1] ?? -1), failed: Number(tally?.[2] ?? -1) };
}

let caught = 0;
const misses = [];

console.log("\nred:layout-staleness — E-70. The mutations put a per-page decision BACK into a layout, or cut a link out of the balance chain.\n");

// ── The mirror, first half. A red baseline makes every result below meaningless. ────────────
{
  const base = runSuite();
  if (base.code !== 0 || base.failed !== 0) {
    console.error(`⛔ BASELINE IS NOT GREEN (exit ${base.code}, ${base.failed} failed). Refusing to mutate — a`);
    console.error("   harness that starts from a red tree cannot attribute anything it then observes.");
    console.error(base.out.split("\n").filter((l) => /FAIL|Error/.test(l)).slice(0, 20).join("\n"));
    process.exit(1);
  }
  console.log(`  baseline · the suite is GREEN on untouched source — ${base.passed} passed\n`);
}

// ── The fleet ──────────────────────────────────────────────────────────────────────────────
// ⛔ A MUTATION MUST REMOVE THE WHOLE CONTROL, NOT ITS FIRST LAYER. Where a rule is enforced in
// two places, an edit to one of them leaves the other standing, the suite green, and this harness
// reporting a MISS against a platform that is safe. `combineInto` names the primary a partner
// edit belongs to; partners are applied WITH it and never run on their own.
// ⭐ This is not theoretical here: `cancelled-grants-become-reversible` was a miss on the first
// run for exactly this reason — the store-level filter is defence-in-depth and the service-level
// partition is the real control.
const primaries = MUTATIONS.filter((m) => !m.combineInto);
const touched = new Map(); // rel -> original text
try {
  for (const m of primaries) {
    const partners = MUTATIONS.filter((x) => x.combineInto === m.name);
    const edits = [m, ...partners];
    let broken = false;
    for (const e of edits) {
      const path = `${ROOT}/${e.file}`;
      const original = touched.has(e.file) ? touched.get(e.file) : readFileSync(path, "utf8");
      if (!touched.has(e.file)) touched.set(e.file, original);
      try {
        writeFileSync(path, injectDefect(readFileSync(path, "utf8"), e.from, e.to));
      } catch (err) {
        // ⛔ NOT a miss and NOT a pass — the harness itself is broken, and saying so loudly is the
        // whole point of `red-anchor.mjs`. An anchor that silently edited nothing would let this
        // print a catch it never made.
        console.log(`  ⛔ HARNESS ERROR  ${e.name} — ${err.message}`);
        misses.push(`${e.name} (anchor unresolvable: ${err.message})`);
        broken = true;
        break;
      }
    }
    if (broken) {
      for (const [rel, original] of touched) writeFileSync(`${ROOT}/${rel}`, original);
      touched.clear();
      continue;
    }

    const r = runSuite();
    for (const [rel, original] of touched) writeFileSync(`${ROOT}/${rel}`, original);
    touched.clear();

    const exited = r.code !== 0;
    const reported = r.failures.length > 0;
    const named = r.failures.some((f) => f.includes(m.check));

    if (exited && reported && named) {
      caught++;
      console.log(`  ✓ RED  ${m.name}${partners.length ? ` (+${partners.length} paired edit${partners.length > 1 ? "s" : ""})` : ""}`);
      console.log(`         └ caught by: ${m.check.slice(0, 96)}`);
    } else {
      const why = !exited ? `suite exited 0 — THE DEFECT SHIPPED UNSEEN`
                : !reported ? `exited ${r.code} but reported no failing check — a crash, not a catch`
                : `failed, but NOT on its named check — the guard is noisy, not aimed. failures: ${r.failures.map((f) => f.slice(0, 40)).join(" | ")}`;
      console.log(`  ✗ MISS ${m.name}`);
      console.log(`         └ ${why}`);
      misses.push(`${m.name} — ${why}`);
    }
  }
} finally {
  // ⛔ ALWAYS. A thrown error mid-run must not leave a mutation on disk.
  for (const [rel, original] of touched) {
    writeFileSync(`${ROOT}/${rel}`, original);
    console.log(`  ⚠️ restored ${rel} from the finally block`);
  }
}

// ── The mirror, second half. Every file restored, and the suite green again. ────────────────
{
  const after = runSuite();
  const restored = after.code === 0 && after.failed === 0;
  console.log(`\n  restore · the suite is ${restored ? "GREEN" : "🔴 NOT GREEN"} again after every file was put back` +
              `${restored ? "" : ` (exit ${after.code}, ${after.failed} failed) — ⛔ CHECK git diff BEFORE COMMITTING`}`);
  if (!restored) misses.push("the tree was not restored cleanly");
}

console.log(`\nred:layout-staleness: ${caught}/${primaries.length} defects caught` +
            ` (${MUTATIONS.length - primaries.length} paired edit${MUTATIONS.length - primaries.length === 1 ? "" : "s"} applied with their primaries)`);
if (misses.length) {
  console.log("\n⛔ NOT CAUGHT:");
  for (const s of misses) console.log(`   · ${s}`);
  process.exit(1);
}
console.log("Every declared defect is caught by a named check, and the tree is clean.\n");
