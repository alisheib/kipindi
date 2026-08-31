/**
 * red:cn-collision — THE CONTROL FOR `test:cn-collision` (the cn() collision, §K rule 7d).
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. That gate sits green at HEAD, and a green
 * gate is indistinguishable from a gate that cannot fail until something has been planted for
 * it to find.
 *
 * ⛔ EVERY MUTATION RUNS ON A COPY OF THE TREE; the real `src/` is never written. The copy is a
 * temp dir and the gate is pointed at it through KP_SRC.
 *
 * ⭐ AND EACH CASE MUST FAIL FOR ITS OWN REASON. It is not enough that the gate went red — the
 * mutation names the assertion it should break (`expect`), and this harness checks THAT LINE
 * printed FAIL. A control that accepts any red would keep "passing" after the gate started
 * failing for an unrelated reason, which is how a control quietly stops controlling.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/cn-collision.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "cn-collision.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: srcRoot }, shell: process.platform === "win32",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

/**
 * ⛔ THE COPY LIVES INSIDE THE REPO, AND THAT IS NOT TIDINESS. This gate IMPORTS the mutated
 * `src/lib/utils.ts`, which imports `clsx` — so a copy under the OS temp dir cannot resolve
 * `node_modules`, and the mutation dies with MODULE_NOT_FOUND instead of failing an assertion.
 * ⭐ It went red either way, and that is the trap: "the gate went red" is not "the gate caught
 * it". This harness checks that the EXPECTED ASSERTION failed, which is the only reason the
 * crash was noticed rather than banked as a control that holds.
 * ⚠️ `.cn-red-tmp` is removed in `finally` AND on entry, and is listed in `.gitignore` — which
 * it was NOT when this comment first claimed it was. Caught by running `git check-ignore`
 * instead of re-reading my own sentence.
 */
function withCopy(fn) {
  const dir = join(REPO, ".cn-red-tmp");
  rmSync(dir, { recursive: true, force: true });
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:cn-collision — the control for the cn() collision");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
console.log(`  HEAD · exit ${base.code}`);
if (base.code !== 0) {
  console.log("\n🔴 HEAD is already red — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.includes("FAIL")).join("\n"));
  process.exit(1);
}

let bad = 0;
for (const mut of MUTATIONS) {
  const rel = mut.file.replace(/^src\//, "");
  const res = withCopy((src) => {
    const f = join(src, rel);
    let s;
    try { s = readFileSync(f, "utf8"); } catch { return { missing: true }; }
    // ⛔ An EXACT anchor. If it stops matching, that is ANCHOR ROT and is reported — never
    // skipped quietly, because an anchor that no longer matches is a control that no longer
    // controls while still printing a tidy summary.
    if (!s.includes(mut.from)) return { rot: true };
    writeFileSync(f, s.replace(mut.from, mut.to));
    return runGate(src);
  });
  if (res.missing || res.rot) {
    console.log(`  🔴 ${mut.name}\n       ${res.missing ? "FILE NOT FOUND" : "ANCHOR ROT — re-anchor in scripts/anchors/cn-collision.anchors.mjs"}: ${mut.file}`);
    bad = 1;
    continue;
  }
  const wentRed = res.code !== 0;
  // ⭐ The RIGHT line went red, not merely some line.
  /* ⛔ THIS GATE PRINTS A 🔴 CENSUS, NOT "FAIL" LINES — requiring the word FAIL here is how a
     CRASH scored as a catch on the first run: the mutation died on MODULE_NOT_FOUND (the temp
     copy could not resolve `clsx`), the exit was non-zero, and only the expected-text check
     refused it. So: the expected text must appear ANYWHERE in the output, AND the exit must be
     non-zero. Both, or the control is trusting a red it has not read. */
  const rightReason = res.out.includes(mut.expect);
  const ok = wentRed && rightReason;
  console.log(`  ${ok ? "✅" : "🔴"} ${mut.name}`);
  console.log(`       exit ${res.code} · expected assertion "${mut.expect}" → ${rightReason ? "FAILED as intended" : "DID NOT fail"}`);
  if (wentRed && !rightReason) {
    console.log("       🔴 WRONG REASON — the gate went red, but not on the assertion this case exists to prove.");
  }
  if (!wentRed) console.log("       🔴 the gate did NOT notice. It is blind to the thing it claims to test.");
  if (!ok) bad = 1;
}

console.log(bad ? "\n🔴 the control did not hold." : "\n✅ every planted defect is caught, and each on its own assertion.");
process.exit(bad);
