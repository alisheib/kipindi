/**
 * red:contrast-callsite — THE CONTROL FOR `test:contrast` §P-u2 (PV-10, 2026-09-03).
 *
 *   node scripts/contrast-callsite-red.mjs
 *
 * ⛔ WHY A SEPARATE HARNESS FROM `red:contrast`. `contrast-audit-red.mjs` mutates the
 * four-file CSS corpus (`CONTRAST_CORPUS`) into a small per-mutation temp dir — enough
 * for every check that reads a stylesheet rule or a token. §P-u2 reads `.tsx` SOURCE
 * (a `<button>`'s own JSX children), which lives nowhere in that corpus, so the same
 * narrow copy would leave the mutated file simply absent from the population — an
 * exit-0 "PASS" that proves nothing, the exact shape `red-tap-floor.mjs` was built to
 * avoid for `test:tap-target` §5. This follows THAT harness's pattern instead: a FULL
 * `src/` copy per mutation, pointed at with `CONTRAST_ROOT` (§P-u2 walks
 * `join(ROOT, "src")`, and the CSS corpus resolves under the same root, so one copy
 * serves both halves of the gate).
 *
 * Each mutation must (a) make the gate exit non-zero, (b) fail §P-u2 BY NAME and not
 * some other check, (c) leave the population size sane (the CONTROL row below), and
 * (d) prove the harness read the copy, not the real tree.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH — same law as every other `*.anchors.mjs` in this fleet.
// `red-anchors.test.mts` audits every declared anchor without running the harness that injects
// it; a harness with its own private copy of these mutations would hide them from that fleet
// auditor and let them rot in silence.
import { MUTATIONS } from "./anchors/contrast-callsite.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "contrast-audit.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, CONTRAST_ROOT: srcRoot },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:contrast-callsite — the control for test:contrast §P-u2 (PV-10)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(REPO);
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (test:contrast green — the fix ships)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-contrast-callsite-"));
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

    const res = runGate(dir);
    const failedPu2 = /^FAIL\s+§P-u2 no call-site opacity/m.test(res.out);
    const readTheCopy = res.out.includes("checked") && res.code !== 0;
    if (res.code !== 0 && failedPu2 && readTheCopy) {
      const line = res.out.split("\n").find((l) => l.includes(m.file.split("/").pop()));
      console.log(`  ✓ ${m.name}\n      caught: ${line?.trim() ?? "(§P-u2 failed, detail line not matched)"}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT — exit ${res.code}, §P-u2 failed: ${failedPu2}`);
      console.log(res.out.split("\n").filter((l) => l.startsWith("FAIL") || l.startsWith("PASS  §P-u2")).join("\n"));
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${MUTATIONS.length - bad}/${MUTATIONS.length} mutations caught`);
process.exit(bad ? 1 : 0);
