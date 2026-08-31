/**
 * red:tap-floor — THE CONTROL FOR `test:tap-target` §5 (DG-A-08, DESIGN-GATE-2026-08-28).
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. §5 sits at ZERO findings at HEAD, and a gate
 * at zero is indistinguishable from a gate that cannot find anything — session 82's contrast
 * fix scored the real shipped defect as PASS until its own control caught it.
 *
 * Each mutation must (a) make the gate exit non-zero, (b) fail the CHECK IT NAMES and not some
 * other one, and (c) leave the population unchanged — a control that shrinks the denominator
 * has changed the subject rather than planted a defect.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE AND THE ORIGINAL IS NEVER WRITTEN. The copy
 * is a temp dir; the gate is pointed at it through KP_SRC.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS, VACUITY_DIR } from "./anchors/tap-floor.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "tap-target.test.mts");

/** Run the gate against a given src root; return what §5 said. */
function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, KP_SRC: srcRoot },
    shell: process.platform === "win32",
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const pop = /(\d+) admin files · (\d+) declaring a height · (\d+) drawn as a box/.exec(out);
  return {
    code: r.status,
    files: pop ? Number(pop[1]) : null,
    declaring: pop ? Number(pop[2]) : null,
    padded: pop ? Number(pop[3]) : null,
    failed: new Set([...out.matchAll(/^FAIL (\d+\.\d+)/gm)].map((m) => m[1])),
    out,
  };
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-tapfloor-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:tap-floor — the control for test:tap-target §5 (DG-A-08)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
console.log(`  HEAD   exit ${base.code} · ${base.files} admin files · ${base.declaring} declaring · ${base.padded} padded`);
if (base.code !== 0 || base.failed.size) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}

let bad = 0;

for (const mut of MUTATIONS) {
  const res = withCopy((src) => {
    const rel = mut.file.replace(/^src\//, "");
    const path = join(src, rel);
    const body = readFileSync(path, "utf8");
    const hits = body.split(mut.from).length - 1;
    if (hits !== 1) return { anchor: hits };
    writeFileSync(path, body.replace(mut.from, mut.to));
    return { anchor: 1, ...runGate(src) };
  });

  if (res.anchor !== 1) {
    console.log(`\n🔴 ${mut.name}\n     anchor matched ${res.anchor}× in ${mut.file} — it must match exactly once`);
    bad++; continue;
  }
  const firedRight = res.failed.has(mut.expect);
  const exited = res.code !== 0;
  /* ⭐ "STEADY" MEANS THE DECLARED DELTA, NOT ALWAYS ZERO — and the difference is the point.
     Replacing a kit `<Button>` with a raw padded `<button>` is the DEFECT, and it necessarily
     adds one raw tag to 5.2's population. Demanding a frozen denominator there would have made
     the control unable to replant the very thing §5.2 was written for. What must never happen
     is the population SHRINKING, or moving by an amount nobody declared. */
  const wantPadded = base.padded + (mut.paddedDelta ?? 0);
  const steady = res.files === base.files && res.declaring === base.declaring && res.padded === wantPadded;
  const okAll = firedRight && exited && steady;
  console.log(`\n  ${okAll ? "✅" : "🔴"} ${mut.name}`);
  console.log(`     exit ${res.code} · failed {${[...res.failed].join(", ") || "none"}} · expected §${mut.expect}`);
  console.log(`     population ${res.files}/${res.declaring}/${res.padded} vs expected ${base.files}/${base.declaring}/${wantPadded}${steady ? "  (as declared)" : "  ⛔ MOVED"}`);
  if (!okAll) bad++;
}

/* The vacuity floor: with the console gone, 5.1 and 5.2 have nothing to look at and would both
   print green. 5.3 must be the thing that fails. */
{
  const res = withCopy((src) => {
    rmSync(join(src, VACUITY_DIR.replace(/^src\//, "")), { recursive: true, force: true });
    return runGate(src);
  });
  const okAll = res.code !== 0 && res.failed.has("5.3");
  console.log(`\n  ${okAll ? "✅" : "🔴"} VACUITY — the admin surface is deleted; 0 findings must NOT read as a pass`);
  console.log(`     exit ${res.code} · failed {${[...res.failed].join(", ") || "none"}} · expected §5.3`);
  console.log(`     population ${res.files}/${res.declaring}/${res.padded}`);
  if (!okAll) bad++;
}

console.log(`\n${bad === 0 ? "✅ every case makes §5 fail on its own assertion." : `🔴 ${bad} case(s) did not.`}`);
process.exit(bad ? 1 : 0);
