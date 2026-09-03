/**
 * red:invite-coming-soon — THE CONTROL FOR `test:invite-coming-soon` (2026-09-03).
 *
 *   node scripts/red-invite-coming-soon.mjs
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. The coverage rule sits at ZERO offenders at
 * HEAD, and a gate at zero is indistinguishable from a gate that cannot find anything. Each
 * mutation is a realistic half-shipping of this feature — one surface left behind, the page
 * checking too late, a locale forgotten — and the gate must catch it BY THE NAMED SECTION, never
 * merely by exiting non-zero. ⚠️ A crash and a catch both exit 1.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE, via `KP_SRC`, so two sessions sharing this
 * working tree never see a deliberately-broken file.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH — a harness with a private copy of these mutations would
// hide them from `red-anchors.test.mts` and let them rot in silence.
import { MUTATIONS } from "./anchors/invite-coming-soon.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "invite-coming-soon.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/* ⛔ `.trim()` IS LOAD-BEARING — this gate indents its verdicts (`  FAIL 2.1 …`), and a
   `startsWith("FAIL")` copied from a flush-left gate matches nothing and reports every mutation
   as uncaught. Same trap `red-motion-ladder.mjs` hit the same day. */
const failedSections = (out) =>
  out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("FAIL"))
     .map((l) => l.replace(/^FAIL\s+/, "").split(/\s/)[0]);

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:invite-coming-soon — the control for test:invite-coming-soon");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.trim().startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (every invite surface consults the one switch)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-invite-"));
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
      console.log(`  ✓ ${m.name}\n      caught by §${m.expect}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT BY §${m.expect} — exit ${res.code}, failed: [${sections.join(", ") || "none"}]`);
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
