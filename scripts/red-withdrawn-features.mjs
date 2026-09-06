/**
 * red:withdrawn-features — THE CONTROL FOR §6–§8 OF `test:withdrawn-features` (2026-09-06).
 *
 *   node scripts/red-withdrawn-features.mjs
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. The coverage rule sits at ZERO offenders at
 * HEAD, and a gate at zero is indistinguishable from a gate that cannot find anything. Each
 * mutation is a realistic half-shipping of this withdrawal — one entry point left behind, or the
 * page checking too late — and the gate must catch it BY THE NAMED SECTION, never merely by
 * exiting non-zero. ⚠️ A crash and a catch both exit 1.
 *
 * ⭐ SUCCESSOR TO `red-invite-coming-soon.mjs`, retired with its suite. Its anchors quoted source
 * lines this withdrawal deleted, so it could no longer inject at all — and a red harness that
 * cannot inject is a control that has silently stopped controlling, which is the exact failure
 * the mechanism exists to prevent.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE, via `KP_SRC`, so two sessions sharing this
 * working tree never see a deliberately-broken file. This repo has already had a red harness
 * leave a live payout gate DISABLED in the working tree; that is why the copy is not optional.
 *
 * ⚠️ SCOPE: §1–§5 of the gate are RUNTIME tests that import the real modules from `src/` and do
 * not read `KP_SRC`, so a copied-tree mutation cannot reach them. Their control is the manual
 * harness recorded in docs/BONUS-WITHDRAWAL.md §5. See the anchors file.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH — a harness with a private copy of these mutations would
// hide them from `red-anchors.test.mts` and let them rot in silence. That is precisely how the
// predecessor rotted unnoticed.
import { MUTATIONS } from "./anchors/withdrawn-features.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "withdrawn-features.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/* ⛔ `.trim()` IS LOAD-BEARING — a `startsWith("FAIL")` copied from a flush-left gate matches
   nothing against an indented one and reports every mutation as uncaught. */
const failedSections = (out) =>
  out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("FAIL"))
     .map((l) => l.replace(/^FAIL\s+/, "").split(/\s/)[0]);

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:withdrawn-features — the control for test:withdrawn-features §6–§8");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.trim().startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (every invite surface sits beside the gate)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-withdrawn-"));
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
    const sections = failedSections(res.out);
    const caught = sections.includes(m.expect);
    if (res.code !== 0 && caught) {
      console.log(`  ✓ ${m.name}\n      caught by ${m.expect}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT BY ${m.expect} — exit ${res.code}, failed: [${sections.join(", ") || "none"}]`);
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
