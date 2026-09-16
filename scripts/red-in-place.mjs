/**
 * ONE definition of "mutate real source, run a gate, put it back".
 *
 * ⛔ WHY THIS IS SHARED AND NOT COPY-PASTED INTO EACH HARNESS. `red-anchor.mjs`'s header
 * records the same lesson for anchors: the restore logic is the dangerous part, and a copy
 * of it in every harness is a copy that can drift. `docs/FAILURE-INVENTORY.md` §3.9 records
 * a harness that printed "tree restored" while leaving two mutations on disk, because its
 * restore set was a hard-coded list of six files that did not include the seventh it had
 * started mutating. One of those escapes — a bare `if (true)` — was swept into a commit and
 * deployed to 50pick.tz, where for two hours every hedging player read a false statement
 * about their own money (§3.8). That is what this module exists to make impossible.
 *
 * ── WHY IN-PLACE AT ALL, RATHER THAN THE COPIED TREE `red:dal-parity` USES ───────────────
 * That harness copies its subject into a scratch directory and re-aims the gate with
 * `KP_SRC`, because its gate reads source as TEXT and a path is all it needs. A gate that
 * IMPORTS its subject cannot be re-aimed that way: the modules resolve `@/…` through the
 * project's path alias, which only exists relative to this tree, so a copy outside it will
 * not even load. In-place is the only honest option for an import-driven gate, so the
 * safety has to be explicit rather than structural.
 *
 * ── THE FOUR PROPERTIES ─────────────────────────────────────────────────────────────────
 *  1. THE RESTORE IS FROM BYTES HELD IN MEMORY, never from git. A harness that ran
 *     `git checkout` would destroy the uncommitted work of the session running it — which
 *     has already happened once on this machine.
 *  2. A BACKUP IS WRITTEN TO DISK FIRST and removed only after a verified restore, so a
 *     crash or a Ctrl-C between write and restore leaves a recoverable file rather than a
 *     mutated one. A leftover backup on startup is treated as exactly that.
 *  3. EVERY CASE RESTORES IN A `finally`, so a throw inside one case cannot carry its
 *     mutation into the next.
 *  4. THE FINAL CHECK IS BYTE-IDENTITY against the original, measured — not a claim.
 *
 * ⛔ AND IT REFUSES TO START ON A RED TREE. If the gate is already failing, every case
 * would "catch" its defect for a reason that has nothing to do with the defect.
 *
 * ⭐ A CASE IS ONLY CAUGHT IF THE GATE FAILS ON *ITS OWN* NAMED ASSERTION. Matching on the
 * label rather than on a non-zero exit is what stops a defect caught for the WRONG reason —
 * or a suite that collapsed entirely — from counting as caught.
 */
import { readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { injectDefect } from "./red-anchor.mjs";

const BACKUP_SUFFIX = ".red-in-place.bak";

/** The set of FAILing assertion labels in one gate run. */
function failedLabels(out) {
  return out
    .split(/\r?\n/)
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).split(" — ")[0].trim());
}

/**
 * @param {{root: string, gate: string, mutations: Array<{name:string,file:string,from:string,to:string,expect:string}>, label: string}} opts
 * @returns {number} process exit code
 */
export function runInPlaceRed({ root, gate, mutations, label }) {
  const abs = (rel) => join(root, rel);

  const runGate = () => {
    try {
      return { code: 0, out: execFileSync("npx", ["tsx", gate], {
        cwd: root, encoding: "utf8", stdio: "pipe", shell: process.platform === "win32",
      }) };
    } catch (e) {
      return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
    }
  };

  // Property 2, first half: recover from an interrupted earlier run before touching anything.
  for (const f of new Set(mutations.map((m) => m.file))) {
    const bak = abs(f + BACKUP_SUFFIX);
    if (existsSync(bak)) {
      console.error(`recovering: a backup from an interrupted run was found — restoring ${f}`);
      copyFileSync(bak, abs(f));
      rmSync(bak);
    }
  }

  const base = runGate();
  if (base.code !== 0) {
    console.error(`REFUSING: ${gate} is already RED on the untouched tree.`);
    console.error(failedLabels(base.out).slice(0, 8).join("\n"));
    return 1;
  }
  console.log("precondition: the gate is GREEN on the untouched tree\n");

  const ORIGINAL = new Map();
  for (const f of new Set(mutations.map((m) => m.file))) ORIGINAL.set(f, readFileSync(abs(f)));

  let caught = 0;
  const problems = [];

  for (const m of mutations) {
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
        problems.push(`WRONG REASON · ${m.name} — expected "${m.expect}"; got: ${failed.slice(0, 3).join(" | ") || "(no FAIL lines)"}`);
        console.log(`WRONG REASON ${m.name}\n             expected "${m.expect}"\n             got: ${failed.slice(0, 3).join(" | ") || "(no FAIL lines)"}`);
      } else {
        caught++;
        console.log(`caught       ${m.name}\n             → ${m.expect}`);
      }
    } finally {
      // Property 3.
      writeFileSync(path, ORIGINAL.get(m.file));
      if (existsSync(bak)) rmSync(bak);
    }
  }

  // Property 4 — measured, not claimed.
  const dirty = [...ORIGINAL].filter(([f, bytes]) => !readFileSync(abs(f)).equals(bytes)).map(([f]) => f);
  if (dirty.length) {
    console.error(`\n⛔ TREE NOT RESTORED — these files differ from their original bytes: ${dirty.join(", ")}`);
    return 1;
  }
  const after = runGate();
  if (after.code !== 0) {
    console.error("\n⛔ the gate is RED on the restored tree — the restore did not put things back.");
    console.error(failedLabels(after.out).slice(0, 8).join("\n"));
    return 1;
  }

  console.log(`\ntree restored (byte-identical) · gate GREEN again`);
  console.log(`${label} — ${caught}/${mutations.length} defects caught on their own assertion`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    return 1;
  }
  return 0;
}
