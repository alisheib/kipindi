/**
 * red:chart-one-home — THE CONTROL FOR `test:chart-one-home` (CHART-SPRINT D).
 *
 *   node scripts/red-chart-one-home.mjs
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. The gate is at zero on every check at
 * HEAD, and a gate at zero is indistinguishable from a gate that cannot see. Each
 * mutation restores one shape of the defect class — a stray private chart, a stale
 * exemption, a charting dependency, a dead member — and the gate must fail the check
 * that NAMES it, not merely exit non-zero.
 *
 * ⛔ MUTATIONS RUN ON A COPY, via KP_SRC/KP_PKG — the red-chip-one-home mechanism. Two
 * sessions share this working tree; a harness that edits src/ in place can leave the
 * repo dirty if it dies halfway.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/chart-one-home.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "chart-one-home.test.mts");

function runGate(srcRoot, pkgPath) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot, KP_PKG: pkgPath },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:chart-one-home — the control for test:chart-one-home (CHART-SPRINT D)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"), join(REPO, "package.json"));
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (test:chart-one-home green — one home, no strays)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-chart-"));
  const src = join(dir, "src");
  const pkg = join(dir, "package.json");
  cpSync(join(REPO, "src"), src, { recursive: true });
  copyFileSync(join(REPO, "package.json"), pkg);
  try {
    const path = join(dir, m.file);
    const body = readFileSync(path, "utf8");
    if (!body.includes(m.from)) {
      console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is stale, not the gate.`);
      bad++;
      continue;
    }
    writeFileSync(path, body.replace(m.from, m.to));

    const res = runGate(src, pkg);
    // ⛔ "exit non-zero" is not evidence: it must fail the check the mutation NAMES.
    const named = new RegExp(`^FAIL ${esc(m.expect)}`, "m").test(res.out);
    if (res.code !== 0 && named) {
      const line = res.out.split("\n").find((l) => l.startsWith(`FAIL ${m.expect}`));
      console.log(`  ✓ ${m.name}\n      caught: ${line?.trim().slice(0, 160)}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT — exit ${res.code}, named check failed: ${named}`);
      console.log(res.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
