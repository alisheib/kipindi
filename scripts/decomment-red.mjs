/**
 * RED harness for `npm run test:decomment`.          `npm run red:decomment`
 *
 * ⭐ WHY. The gate it proves is a gate about INVISIBLE INFRASTRUCTURE. When a
 * comment stripper silently reads less than it should, every guard built on it
 * prints ALL PASS over the hole — which is indistinguishable from health, and is
 * precisely how `E-186` survived until a red mutation MISSED and exposed it. A
 * guard nobody has watched fail is a guard that may be asserting nothing.
 *
 * ⛔ IT DOES NOT WRITE TO src/ OR scripts/. Two sessions share this working tree.
 * Every mutation goes to a COPY of the repo in the OS temp dir; the gate is aimed
 * at it with `DECOMMENT_ROOT` and prints the root it read on every run, so the
 * harness can require proof that the mutant is what it measured.
 *
 * ⛔ AN UNMATCHED ANCHOR IS A BROKEN HARNESS, reported as such and never as a
 * MISS. And "it exited non-zero" is not evidence: the run must name the CHECK
 * that failed, and that check must be the one the mutation targets.
 *
 * ⚠️ Each mutation copies `src/` and `scripts/` and spawns `npx tsx`, so a
 * `tsc --noEmit` started in the same breath can fail spuriously on Windows with
 * no diagnostics. Re-run it before believing it.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/decomment.anchors.mjs";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/decomment.test.mts";

let caught = 0, missed = 0, broken = 0;
const results = [];
const roots = [];

for (const [i, m] of MUTATIONS.entries()) {
  const root = mkdtempSync(join(tmpdir(), "decomment-red-"));
  roots.push(root);
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });

  const label = `${String(i + 1).padStart(2)}. ${m.name}\n        ${m.why}`;
  const p = join(root, m.file);

  if (!existsSync(p)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${m.file} does not exist — this proves NOTHING; fix the anchor`);
    continue;
  }
  const src = readFileSync(p, "utf8");
  if (!src.includes(m.from)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        anchor not found in ${m.file} — this proves NOTHING; fix the anchor`);
    continue;
  }
  writeFileSync(p, src.replace(m.from, m.to), "utf8");

  // The gate under test is the MUTANT's own copy, so a mutation inside
  // scripts/lib/decomment.mts is the module the gate actually imports.
  let out = "", exit = 0;
  try {
    out = execSync(`npx tsx "${join(root, GATE)}"`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DECOMMENT_ROOT: root },
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    exit = e.status ?? 1;
  }

  // "It exited non-zero" is not evidence. Prove the gate read THIS mutant.
  if (!out.includes("DECOMMENT_ROOT override")) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        the gate never reported reading a mutant tree`);
    continue;
  }
  const rootLine = out.split("\n").find((l) => l.trim().startsWith("root:")) ?? "";
  if (!rootLine.includes(root.split("\\").join("/")) && !rootLine.includes(root)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        it read some other tree: ${rootLine.trim()}`);
    continue;
  }

  const failed = out.split("\n").filter((l) => l.trim().startsWith("FAIL "));
  const named = failed.find((l) => l.includes(m.check));

  if (exit !== 0 && named) {
    caught++;
    results.push(`  CAUGHT          ${label}\n        → ${named.trim().slice(0, 130)}`);
  } else if (exit !== 0) {
    missed++;
    results.push(`  WRONG CHECK     ${label}\n        gate failed, but not on "${m.check}" — it failed on: ` +
      (failed.map((l) => l.trim().slice(5, 64)).join(" | ") || "(none named)"));
  } else {
    missed++;
    results.push(`  MISSED          ${label}\n        the gate reported ALL PASS on a mutant tree`);
  }
}

for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* temp dir */ } }

console.log("RED harness — npm run test:decomment (the shared comment stripper)\n");
console.log(results.join("\n"));
console.log(`\n${caught}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken harness`);
process.exit(missed || broken ? 1 : 0);
