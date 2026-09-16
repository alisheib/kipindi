/**
 * red:blackball — proves `test:blackball` catches each defect the Blackball transport was
 * written to avoid, each on its OWN assertion.
 *
 * ⭐ WHY THIS HARNESS EXISTS AT ALL. `test:blackball` prints 45 green lines against a stubbed
 * gateway. Green against a stub is the cheapest lie in the building: a suite that had quietly
 * stopped exercising the adapter would print exactly the same 45 lines. The only question worth
 * asking is the standing one — *would it still pass if the thing it checks for were absent?* —
 * and the only honest way to answer it is to make the thing absent and watch.
 *
 * ── HOW IT MUTATES, AND WHY NOT THE USUAL COPIED TREE ────────────────────────────────────────
 *
 * `red:dal-parity` copies its subject into a scratch directory and re-aims the gate with `KP_SRC`,
 * because that gate reads source as TEXT and a path is all it needs. This gate does not read text —
 * it IMPORTS the module and drives it. `sms-blackball.ts` resolves `@/lib/phone-normalize` through
 * the project's path alias, which only exists relative to this tree, so a copy outside it cannot
 * even load. So this harness mutates the real file and restores it.
 *
 * ⛔ THAT IS THE DANGEROUS SHAPE, AND IT IS HANDLED EXPLICITLY. `docs/FAILURE-INVENTORY.md` §3.8
 * records a harness that printed "tree restored" while leaving a mutation on disk, which was then
 * swept into a commit and deployed. Four properties keep this one honest:
 *
 *   1. THE RESTORE IS FROM BYTES HELD IN MEMORY, never from git. A harness that ran
 *      `git checkout` would destroy the uncommitted work of the session running it — which has
 *      already happened once on this machine.
 *   2. A BACKUP IS WRITTEN TO DISK FIRST and removed only after a verified restore, so a crash or
 *      a Ctrl-C between write and restore leaves a recoverable file rather than a mutated one.
 *      A leftover backup on startup is treated as exactly that, and restored before anything else.
 *   3. EVERY CASE RESTORES IN A `finally`, so a throw inside one case cannot carry its mutation
 *      into the next.
 *   4. THE FINAL CHECK IS BYTE-IDENTITY against the original, not a claim. If the file differs by
 *      a single byte the harness exits non-zero and says so, whatever the case results were.
 *
 * ⛔ AND IT REFUSES TO START ON A RED TREE. If `test:blackball` is already failing, every case
 * would "catch" its defect for a reason that has nothing to do with the defect.
 *
 * The mutations are DATA, in `scripts/anchors/blackball.anchors.mjs`, so `test:red-anchors` §3 can
 * audit that every anchor still resolves exactly once without running any of this.
 *
 * Run: npm run red:blackball
 */
import { readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/blackball.anchors.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = "scripts/blackball-adapter.test.mts";
const BACKUP_SUFFIX = ".red-blackball.bak";

const abs = (rel) => join(ROOT, rel);

/** Run the gate. Returns its combined output and exit code; never throws. */
function runGate() {
  try {
    const out = execFileSync("npx", ["tsx", GATE], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
}

/** The set of FAILing assertion labels in one gate run. */
function failedLabels(out) {
  return out
    .split(/\r?\n/)
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).split(" — ")[0].trim());
}

// ── Recover from an interrupted earlier run BEFORE touching anything ──────────
{
  const files = [...new Set(MUTATIONS.map((m) => m.file))];
  for (const f of files) {
    const bak = abs(f + BACKUP_SUFFIX);
    if (existsSync(bak)) {
      console.error(`recovering: a backup from an interrupted run was found — restoring ${f}`);
      copyFileSync(bak, abs(f));
      rmSync(bak);
    }
  }
}

// ── Precondition: the gate must be GREEN on the untouched tree ────────────────
const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:blackball is already RED on the untouched tree.");
  console.error(failedLabels(base.out).slice(0, 8).join("\n"));
  process.exit(1);
}
console.log("precondition: the gate is GREEN on the untouched tree\n");

// ── Snapshot every file we will touch ─────────────────────────────────────────
const ORIGINAL = new Map();
for (const f of new Set(MUTATIONS.map((m) => m.file))) {
  ORIGINAL.set(f, readFileSync(abs(f)));
}

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  const path = abs(m.file);
  const bak = path + BACKUP_SUFFIX;
  let mutated;
  try {
    mutated = injectDefect(readFileSync(path, "utf8"), m.from, m.to);
  } catch (err) {
    problems.push(`ANCHOR FAIL · ${m.name} — ${err.message}`);
    console.log(`ANCHOR FAIL  ${m.name}\n             ${err.message}`);
    continue;
  }

  try {
    copyFileSync(path, bak);
    writeFileSync(path, mutated, "utf8");
    const r = runGate();
    const failed = failedLabels(r.out);

    if (r.code === 0) {
      problems.push(`NOT CAUGHT · ${m.name} — the gate stayed GREEN with the defect present`);
      console.log(`NOT CAUGHT   ${m.name}\n             the gate stayed GREEN with the defect present`);
    } else if (!failed.includes(m.expect)) {
      // ⛔ RED FOR THE WRONG REASON IS NOT CAUGHT. The whole point of naming the expected label
      // is that a suite which collapsed for an unrelated reason must not be able to print PASS.
      problems.push(
        `WRONG REASON · ${m.name} — expected "${m.expect}" to fail; got: ${failed.slice(0, 3).join(" | ") || "(no FAIL lines)"}`,
      );
      console.log(
        `WRONG REASON ${m.name}\n             expected "${m.expect}"\n             got: ${failed.slice(0, 3).join(" | ") || "(no FAIL lines)"}`,
      );
    } else {
      caught++;
      console.log(`caught       ${m.name}\n             → ${m.expect}`);
    }
  } finally {
    // Property 3: restore in a `finally`, so a throw cannot carry a mutation forward.
    writeFileSync(path, ORIGINAL.get(m.file));
    if (existsSync(bak)) rmSync(bak);
  }
}

// ── Property 4: byte-identity, measured — not a claim ─────────────────────────
let dirty = [];
for (const [f, bytes] of ORIGINAL) {
  if (!readFileSync(abs(f)).equals(bytes)) dirty.push(f);
}
if (dirty.length) {
  console.error(`\n⛔ TREE NOT RESTORED — these files differ from their original bytes: ${dirty.join(", ")}`);
  process.exit(1);
}

// ── And the gate must be GREEN again, for the same reason as the precondition ──
const after = runGate();
if (after.code !== 0) {
  console.error("\n⛔ the gate is RED on the restored tree — the restore did not put things back.");
  console.error(failedLabels(after.out).slice(0, 8).join("\n"));
  process.exit(1);
}

console.log(`\ntree restored (byte-identical) · gate GREEN again`);
console.log(`red:blackball — ${caught}/${MUTATIONS.length} defects caught on their own assertion`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
