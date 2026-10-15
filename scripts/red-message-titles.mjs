/**
 * red:message-titles — proves `test:message-titles` catches each defect it exists for, each on ITS OWN named check (the
 * Vodacom plan's S12, WP12 and WP13, 2026-10-14).
 *
 * The discipline of `red:share-preview`: put the real defect into the real product file, require the gate to go red on
 * the assertion that names it (a red for the wrong reason proves nothing), then restore — byte for byte, checked. The
 * gate here is the suite's MEMORY child (`scripts/lib/message-titles-child.mts`): every plant is code, which the memory
 * store runs exactly as Postgres does, and the Postgres half is the suite's own business.
 *
 * The cases are DATA in `scripts/anchors/message-titles.anchors.mjs`, audited by `test:red-anchors` §3 (each anchor
 * resolves exactly once). Among them the three the plan names — the switch forced on now, a cross-language fallback, a
 * short title no officer approved — and each call-site family's own bypass.
 *
 * ⚠️ It writes real files and restores them in `finally`. Run it alone, never beside another red harness on the same
 * tree, and read `git status` afterwards.
 *
 * Run: npm run red:message-titles
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS as CASES } from "./anchors/message-titles.anchors.mjs";

const CHILD = "scripts/lib/message-titles-child.mts";
const runGate = () => {
  const r = spawnSync("npx", ["tsx", CHILD], {
    encoding: "utf8", shell: process.platform === "win32", timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, HB_MONEY_STORE: "memory", DATABASE_URL: "", USE_PRISMA_DAL: "false" },
  });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const failedLabels = (out) => out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("FAIL [memory] ")).map((l) => l.slice("FAIL [memory] ".length));

const before = runGate();
if (before.code !== 0) {
  console.error("REFUSING: the memory child of test:message-titles is already RED on the untouched tree.");
  console.error(failedLabels(before.out).slice(0, 8).join("\n") || before.out.slice(-1500));
  process.exit(1);
}
console.log("precondition: the gate is GREEN on the untouched tree\n");

let caught = 0;
const problems = [];
for (const [i, c] of CASES.entries()) {
  const original = readFileSync(c.file, "utf8");
  let mutated;
  try { mutated = injectDefect(original, c.from, c.to); }
  catch (e) { problems.push(`case ${i + 1}: ANCHOR — ${e.message}`); console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`); continue; }
  try {
    writeFileSync(c.file, mutated, "utf8");
    const r = runGate();
    const labels = failedLabels(r.out);
    if (r.code === 0) { problems.push(`case ${i + 1} (${c.name}): stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`); }
    else if (!labels.some((l) => l.startsWith(`${c.expect} `))) {
      problems.push(`case ${i + 1} (${c.name}): red, but not on ${c.expect} — ${labels.slice(0, 3).join(" | ") || r.out.slice(-400)}`);
      console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
    } else { caught++; console.log(`  ${i + 1}. caught on ${c.expect.padEnd(22)} ${c.name} (${labels.length} check(s) red)`); }
  } finally {
    writeFileSync(c.file, original, "utf8");
  }
  if (readFileSync(c.file, "utf8") !== original) problems.push(`${c.file} not restored`);
}

const after = runGate();
if (after.code !== 0) problems.push("gate RED after restore");
console.log(`\n${caught}/${CASES.length} caught · green after restore: ${after.code === 0}`);
if (problems.length) { console.error("\nPROBLEMS:"); problems.forEach((p) => console.error("  ✗ " + p)); process.exit(1); }
console.log("RED PROOF COMPLETE");
