/**
 * red:tab-anchors — THE CONTROL FOR `test:tab-anchors` (§K rule 7d ③).
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. That gate sits green at HEAD, and a green gate
 * is indistinguishable from one that cannot fail until something is planted for it to find.
 *
 * ⭐ THE CASES LIVE IN `scripts/anchors/tab-anchors.anchors.mjs`, which is the house convention
 * and what `test:red-anchors` §4 ratchets toward — a harness that declares its anchors can be
 * audited for anchor rot by something other than itself.
 *
 *
 * ⛔ EVERY MUTATION RUNS ON A COPY; the real `src/` is never written. Each case names the
 * assertion it must break, and the harness checks THAT LINE printed FAIL — a control that
 * accepts any red keeps "passing" after the gate starts failing for an unrelated reason.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/tab-anchors.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "tab-anchors.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: srcRoot }, shell: process.platform === "win32",
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-anchors-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:tab-anchors — the control for §K rule 7d ③");
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
    /* ⛔ An EXACT anchor. If it stops matching that is ANCHOR ROT and is reported, never skipped
       quietly — an anchor that no longer matches is a control that no longer controls while
       still printing a tidy summary. */
    if (!s.includes(mut.from)) return { rot: true };
    writeFileSync(f, s.replace(mut.from, mut.to));
    return runGate(src);
  });
  if (res.missing || res.rot) {
    console.log(`  🔴 ${mut.name}\n       ${res.missing ? "FILE NOT FOUND" : "ANCHOR ROT — re-anchor in this file"}: ${mut.file}`);
    bad = 1;
    continue;
  }
  const wentRed = res.code !== 0;
  const rightReason = res.out.split("\n").some((l) => l.includes("FAIL") && l.includes(mut.expect));
  const good = wentRed && rightReason;
  console.log(`  ${good ? "✅" : "🔴"} ${mut.name}`);
  console.log(`       exit ${res.code} · expected "${mut.expect}" → ${rightReason ? "FAILED as intended" : "DID NOT fail"}`);
  if (wentRed && !rightReason) console.log("       🔴 WRONG REASON — red, but not on the assertion this case exists to prove.");
  if (!wentRed) console.log("       🔴 the gate did NOT notice. It is blind to the thing it claims to test.");
  if (!good) bad = 1;
}

console.log(bad ? "\n🔴 the control did not hold." : "\n✅ every planted defect is caught, and each on its own assertion.");
process.exit(bad);
