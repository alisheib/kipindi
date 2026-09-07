/**
 * red:agent-* — proves each agent-programme guard can actually FAIL, on its own assertion.
 *
 * Same discipline as `red:rg-doors`: reintroduce the REAL defect in the working tree, run the
 * gate, assert it goes red on the case the mutation targets (`FAIL <expect>`), restore the file
 * in `finally`, and prove the gate is green again afterwards. The mutations are DATA in
 * `scripts/anchors/agent.anchors.mjs`, imported here so `test:red-anchors` can audit them
 * without running them.
 *
 * ⛔ The suites are ENGINE guards — they import `src/` — so a scratch copy cannot be pointed at
 * with an env var; the mutation is applied in place and restored. A crash mid-run is restored
 * by the `finally`; a killed process is not, which is why every run starts by asserting the
 * tree is green BEFORE mutating it.
 *
 * Run: `node scripts/red-agent.mjs <gate>` — e.g. `npm run red:commission-bounded`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/agent.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const gate = process.argv[2];
if (!gate) { console.error("usage: node scripts/red-agent.mjs <gate>  (one of: " + [...new Set(MUTATIONS.map((m) => m.gate))].join(", ") + ")"); process.exit(2); }
const SUITE = join(here, `${gate}.test.mts`);
const mine = MUTATIONS.filter((m) => m.gate === gate);
if (mine.length === 0) { console.error(`⛔ no anchors declared for gate "${gate}" in scripts/anchors/agent.anchors.mjs`); process.exit(2); }

function runGate() {
  const r = spawnSync("npx", ["tsx", SUITE], { cwd: REPO, encoding: "utf8", shell: process.platform === "win32", timeout: 600_000 });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}
const failLabels = (out) => out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("FAIL ")).map((l) => l.slice(5).trim());

console.log(`\nred:${gate} — proving test:${gate} can fail\n`);

// ── GREEN FIRST. A suite already red proves nothing about any mutation. ──
{
  const base = runGate();
  if (base.code !== 0) {
    console.error("⛔ THE SUITE IS NOT GREEN ON THE UNMODIFIED TREE. Fix that before reading any result below.");
    console.error(failLabels(base.out).join("\n"));
    process.exit(2);
  }
  console.log("  ok   green on the unmodified tree");
}

let proven = 0;
const misses = [];
for (const m of mine) {
  const path = join(REPO, m.file);
  const original = readFileSync(path, "utf8");
  let mutated;
  try { mutated = injectDefect(original, m.from, m.to); }
  catch (e) { misses.push(`ANCHOR FAIL · ${m.name} — ${e.message}`); console.log(`  ✗    ANCHOR FAIL · ${m.name} — ${e.message}`); continue; }
  let r;
  try {
    writeFileSync(path, mutated);
    r = runGate();
  } finally {
    writeFileSync(path, original);
  }
  const labels = failLabels(r.out);
  const hit = labels.some((l) => l.startsWith(m.expect));
  if (r.code !== 0 && hit) { proven++; console.log(`  ✓    RED on "${m.expect}" · ${m.name}`); }
  else if (r.code !== 0) { misses.push(`${m.name} — went red, but not on "${m.expect}": ${labels.slice(0, 3).join(" | ")}`); console.log(`  ✗    WRONG REASON · ${m.name}\n         expected FAIL ${m.expect}, got: ${labels.slice(0, 3).join(" | ") || "(no FAIL line)"}`); }
  else { misses.push(`${m.name} — the suite stayed GREEN with the defect in place`); console.log(`  ✗    STILL GREEN · ${m.name}`); }
}

// ── GREEN AGAIN — the tree is restored, and the suite says so. ──
{
  const after = runGate();
  if (after.code !== 0) {
    console.error("⛔ THE SUITE IS RED AFTER RESTORE — the working tree was not put back. Check `git status`.");
    console.error(failLabels(after.out).join("\n"));
    process.exit(2);
  }
  console.log("  ok   green again after restore");
}

console.log(`\nred:${gate}: ${proven}/${mine.length} proven RED${misses.length ? `\n  ${misses.join("\n  ")}` : ""}`);
process.exit(misses.length ? 1 : 0);
