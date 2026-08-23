/**
 * RED harness for `npm run test:measure` — the B7 measure + landmark gate.
 *
 *   node scripts/measure-red.mjs
 *
 * ⭐ WHY. On 2026-08-22 the landmark half of that gate was added, and the
 * hand-typed-width ratchet fell 59 → 12. Both are checks that print PASS when
 * they read nothing at all, and this repo has shipped exactly that mistake four
 * times in one session. A guard nobody has watched fail is a guard that may be
 * asserting nothing.
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every
 * mutation goes to a COPY of the repo in the OS temp dir and the gate is aimed at
 * it with `MEASURE_ROOT`; the gate prints the root it read on every run, so
 * pointing it elsewhere can never be silent. The tree is asserted unchanged at
 * the end.
 *
 * ⛔ An unmatched anchor is a BROKEN HARNESS, reported as such and never as a
 * MISS. And "it exited non-zero" is not evidence: the run must name the CHECK
 * that failed and prove it read the mutant.
 *
 * ⚠️ RUNNING `tsc` IMMEDIATELY AFTER THIS CAN FAIL SPURIOUSLY ON WINDOWS. Each
 * mutation copies `src/` and `scripts/` into the OS temp dir and spawns `npx tsx`,
 * so a `tsc --noEmit` started in the same breath can hit file contention and exit
 * non-zero with no diagnostics. Observed once on 2026-08-23; three clean re-runs
 * immediately after were exit 0. If `tsc` fails right after this harness and
 * prints nothing, re-run it before believing it.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MUTATIONS as DECLARED } from "./anchors/measure.anchors.mjs";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/measure-system.test.mts";

/**
 * ⛔ THE ANCHORS ARE A SIDECAR, NOT AN INLINE ARRAY — `scripts/anchors/measure.anchors.mjs`.
 * `test:red-anchors` audits declared anchors without executing this file, and holds a ceiling
 * of undeclared harnesses that may only shrink. An inline array raises that ceiling and, worse,
 * cannot be audited at all: three inline anchors in `updown-push-red.mjs` rotted silently
 * against rewritten code on 2026-08-22.
 *
 * Entries carrying `combineInto` are not mutations of their own — they are applied together
 * with the mutation they name. That is how the inverted stripper proof gets BOTH of its
 * anchors audited instead of hiding one in an unaudited `also` field.
 */
const MUTATIONS = DECLARED.filter((m) => !m.combineInto).map((m) => ({
  ...m,
  also: DECLARED.filter((x) => x.combineInto === m.name),
}));


let broken = 0;
let caught = 0;
let missed = 0;
const results = [];

for (const [i, m] of MUTATIONS.entries()) {
  const root = mkdtempSync(join(tmpdir(), "measure-red-"));
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });

  const edits = [m, ...m.also];   // `also` is a LIST — entries that name this one in combineInto
  let anchor = "";
  for (const e of edits) {
    const p = join(root, e.file);
    if (!existsSync(p)) { anchor = `${e.file} does not exist`; break; }
    const src = readFileSync(p, "utf8");
    if (!src.includes(e.from)) { anchor = `anchor not found in ${e.file}`; break; }
    writeFileSync(p, src.replace(e.from, e.to), "utf8");
  }

  const label = `${String(i + 1).padStart(2)}. ${m.name}${m.also.length ? ` (+${m.also.length} paired)` : ""}\n        ${m.why}`;
  if (anchor) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${anchor} — this proves NOTHING; fix the anchor`);
    continue;
  }

  // ⛔ ANY edit under `scripts/` needs the MUTANT's copy of the gate — the gate
  // itself, or now `scripts/lib/decomment.mts`, the shared stripper it imports.
  // Running the repo's copy would import the repo's stripper, so the mutation
  // would land on nothing while the inverted proof still reported PROVEN BLIND.
  const touchesScripts = edits.some((e) => e.file.startsWith("scripts/"));
  const gatePath = touchesScripts ? join(root, GATE) : join(cwd, GATE);
  let out = "";
  let exit = 0;
  try {
    out = execSync(`npx tsx "${gatePath}"`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, MEASURE_ROOT: root },
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    exit = e.status ?? 1;
  }

  // "It exited non-zero" is not evidence. Prove the gate actually read the mutant.
  if (!out.includes("MEASURE_ROOT override")) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        the gate never reported reading the mutant tree`);
    continue;
  }

  const failed = out.split("\n").filter((l) => l.trim().startsWith("FAIL "));
  const named = failed.find((l) => l.includes(m.check));

  if (m.expectPass) {
    if (exit === 0) {
      caught++;
      results.push(`  PROVEN BLIND    ${label}\n        gate reported ALL PASS with an allowlist entry deleted — it could not see the file`);
    } else {
      missed++;
      results.push(`  UNEXPECTED      ${label}\n        the old stripper caught it after all; the blindness claim needs re-deriving`);
    }
  } else if (exit !== 0 && named) {
    caught++;
    results.push(`  CAUGHT          ${label}\n        → ${named.trim().slice(0, 120)}`);
  } else if (exit !== 0) {
    missed++;
    results.push(`  WRONG CHECK     ${label}\n        gate failed, but not on "${m.check}" — it failed on: ${failed.map((l) => l.trim().slice(5, 60)).join(" | ") || "(none named)"}`);
  } else {
    missed++;
    results.push(`  MISSED          ${label}\n        the gate reported ALL PASS on a mutant tree`);
  }
}

console.log("RED harness — npm run test:measure (B7 measure + landmark)\n");
console.log(results.join("\n"));
console.log(`\n${caught}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken harness`);
process.exit(missed || broken ? 1 : 0);
