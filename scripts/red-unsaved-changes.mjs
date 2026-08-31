/**
 * red:unsaved-changes — THE CONTROL FOR `test:unsaved-changes` (DG-S-04, §K rule 7d).
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
import { MUTATIONS } from "./anchors/unsaved-changes.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "unsaved-changes.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: srcRoot }, shell: process.platform === "win32",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-unsaved-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:unsaved-changes — the control for DG-S-04");
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
    console.log(`  🔴 ${mut.name}\n       ${res.missing ? "FILE NOT FOUND" : "ANCHOR ROT — re-anchor in scripts/anchors/unsaved-changes.anchors.mjs"}: ${mut.file}`);
    bad = 1;
    continue;
  }
  const wentRed = res.code !== 0;
  // ⭐ The RIGHT line went red, not merely some line.
  const rightReason = res.out.split("\n").some((l) => l.includes("FAIL") && l.includes(mut.expect));
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
