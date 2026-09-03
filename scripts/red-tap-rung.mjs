/**
 * red:tap-rung — THE CONTROL FOR `test:tap-target` §6 (PV-13a/PV-13b, 2026-09-03).
 *
 *   node scripts/red-tap-rung.mjs
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE — same law as `red-tap-floor.mjs`
 * (§5's own control): §6 sits at ZERO findings at HEAD, and a gate at zero is
 * indistinguishable from a gate that cannot find anything. Each mutation reverts one
 * of the two PV-13 fixes to the EXACT literal it shipped with in production, and the
 * gate must catch it by name (§6.2), not by some other, unrelated check.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE, via `KP_SRC` — same mechanism as
 * `red-tap-floor.mjs`, so two sessions sharing this working tree never see a
 * deliberately-broken file.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH — same law as `tap-floor.anchors.mjs`/`red-tap-floor.mjs`.
// `red-anchors.test.mts` audits every declared anchor without running the harness that injects
// it; a harness with its own private copy of these mutations would hide them from that fleet
// auditor and let them rot in silence.
import { MUTATIONS } from "./anchors/tap-rung.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "tap-target.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:tap-rung — the control for test:tap-target §6 (PV-13a/PV-13b)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (test:tap-target green — both PV-13 fixes ship)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-taprung-"));
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
    const failed62 = /^FAIL 6\.2/m.test(res.out);
    if (res.code !== 0 && failed62) {
      const line = res.out.split("\n").find((l) => l.startsWith("FAIL 6.2"));
      console.log(`  ✓ ${m.name}\n      caught: ${line?.trim()}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT — exit ${res.code}, §6.2 failed: ${failed62}`);
      console.log(res.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
