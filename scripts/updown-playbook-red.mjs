/**
 * RED proof for `updown-playbook.test.mts`.
 *
 * Plants a real defect in the engine, requires the suite to EXIT NON-ZERO and report at least one
 * failure, then restores the file byte-for-byte and re-verifies it is green again.
 *
 * ⛔ Checking only that the file CHANGED is the trap this harness exists to avoid: a mutation the
 * guard never reads looks identical to a guard that works. Each mutation below names the check it
 * is meant to break, and a mutation that does not break it is reported as a MISS, not a pass.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "src", "lib", "updown-playbook.ts");
const SUITE = join(HERE, "updown-playbook.test.mts");
const original = readFileSync(ENGINE, "utf8");

const MUTATIONS = [
  { name: "escalate-only removed (a looser catalogue floor wins)",
    from: "if (catalogueMin != null && catalogueMin > measured) {",
    to:   "if (catalogueMin != null && catalogueMin < measured) {" },
  { name: "the directional gate stops being symmetric",
    from: ".map(([d, v]) => ({ d: Number(d), e: Math.abs(v - 0.5), v }))",
    to:   ".map(([d, v]) => ({ d: Number(d), e: v - 0.5, v }))" },
  { name: "dead-window ratio compared the wrong way",
    from: "return usable.filter((x) => x.v < policy.deadWindowRatio * base)",
    to:   "return usable.filter((x) => x.v > policy.deadWindowRatio * base)" },
  { name: "a stale profile is allowed to clear concerns",
    from: "return Number.isFinite(ageDays) && ageDays <= policy.maxProfileAgeDays;",
    to:   "return true;" },
  { name: "an unmeasured length reads as fine instead of unknown",
    from: "if (r == null || !Number.isFinite(r)) { dis.push(d); continue; }",
    to:   "if (r == null || !Number.isFinite(r)) { rec.push(d); continue; }" },
  { name: "the warn/block clamp is dropped, so a bad config inverts the bands",
    from: "if (out.warnRefundRate > out.blockRefundRate) out.warnRefundRate = out.blockRefundRate;",
    to:   "" },
  { name: "coverage is no longer checked",
    from: "if (prof.coverage < policy.minCoverage) {",
    to:   "if (false) {" },
];

// ⛔ RESOLVE THE TSX CLI AND RUN IT WITH `process.execPath` — never `execFileSync("npx", …)`.
// On Windows `npx` is `npx.cmd`, which execFileSync cannot spawn without a shell: it throws
// ENOENT, and the catch below turns that into `{ code: 1, out: "" }` — INDISTINGUISHABLE from
// "the suite failed". This harness then aborted with *"the suite is RED before any mutation —
// fix that first"* on a suite that passes 82/82, and it has done so since the day it was
// written. It ran for 0.5s and nobody looked, because `red:all` was an `&&` chain that had
// already exited long before reaching it (§8).
//
// ⚠️ THREE OTHER HARNESSES ALREADY CARRIED THIS EXACT WARNING IN THEIR OWN HEADERS
// (`settle-atomicity-red`, `margin-series-red`, `admin-soft-gate-red`) and four more use the
// `shell: process.platform === "win32"` form. This was the last one still spawning `npx`
// directly — the copy-paste trap `red-anchor.mjs`'s header describes, in a different place.
const TSX = join(HERE, "..", "node_modules", "tsx", "dist", "cli.mjs");
const run = () => {
  try {
    const out = execFileSync(process.execPath, [TSX, SUITE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

let caught = 0;
try {
  const base = run();
  if (base.code !== 0) {
    console.log("✗ the suite is RED before any mutation — fix that first");
    process.exit(1);
  }
  console.log("baseline green ✓\n");

  for (const m of MUTATIONS) {
    if (!original.includes(m.from)) {
      console.log(`  MISS  ${m.name} — anchor text not found, the mutation edited nothing`);
      continue;
    }
    writeFileSync(ENGINE, original.replace(m.from, m.to), "utf8");
    const r = run();
    const failed = /FAIL\s+updown-playbook/.test(r.out) || /^\s*FAIL /m.test(r.out);
    if (r.code !== 0 && failed) { caught++; console.log(`  ✓ RED  ${m.name}`); }
    else console.log(`  ✗ MISS ${m.name} — exit=${r.code}, the guard stayed quiet`);
    writeFileSync(ENGINE, original, "utf8");
  }
} finally {
  writeFileSync(ENGINE, original, "utf8");   // this tree is shared — always restore
}

const restored = readFileSync(ENGINE, "utf8") === original;
console.log(`\nrestored byte-for-byte: ${restored ? "yes" : "NO — CHECK THE FILE"}`);
console.log(`${caught}/${MUTATIONS.length} mutations caught`);
process.exit(caught === MUTATIONS.length && restored ? 0 : 1);
