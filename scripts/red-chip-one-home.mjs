/**
 * red:chip-one-home — THE CONTROL FOR `test:chip-contract` §4 (PV-13c, 2026-09-03).
 *
 *   node scripts/red-chip-one-home.mjs
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. §4 is at zero on both halves at HEAD, and a
 * check at zero is indistinguishable from a check that cannot find anything. Each mutation puts
 * back one of the two shapes PV-13c deleted, and the gate must fail the check that NAMES it —
 * not merely exit non-zero.
 *
 * ⛔ MUTATIONS RUN ON A COPY, via `KP_SRC` — the same mechanism `red-tap-floor.mjs` and
 * `red-tap-rung.mjs` use. Two sessions share this working tree; a harness that edits `src/` in
 * place can leave the repo dirty if it dies halfway.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/chip-one-home.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "chip-contract.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:chip-one-home — the control for test:chip-contract §4 (PV-13c)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (test:chip-contract green — the chip has one definition)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-chip-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try {
    const path = join(dir, m.file);
    const body = readFileSync(path, "utf8");
    if (!body.includes(m.from)) {
      console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is stale, not the gate.`);
      bad++;
      continue;
    }
    writeFileSync(path, body.replace(m.from, m.to));

    const res = runGate(src);
    // ⛔ "exit non-zero" is not evidence: it must fail the check the mutation NAMES.
    const named = new RegExp(`^FAIL ${m.expect.replace(".", "\\.")}`, "m").test(res.out);
    if (res.code !== 0 && named) {
      const line = res.out.split("\n").find((l) => l.startsWith(`FAIL ${m.expect}`));
      console.log(`  ✓ ${m.name}\n      caught by §${m.expect}: ${line?.trim().slice(0, 150)}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT — exit ${res.code}, §${m.expect} failed: ${named}`);
      console.log(res.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
