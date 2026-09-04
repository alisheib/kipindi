/**
 * red:presence-class — THE CONTROL FOR `test:presence-class` (PRESENCE, 2026-09-04).
 *
 *   node scripts/red-presence-class.mjs
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation below must make the suite exit non-zero
 * AND report the NAMED section it claims. A crash and a catch both exit 1, so the exit code
 * alone certifies nothing — this parser demands the section by name.
 *
 * ⛔ EVERY MUTATION RUNS ON A COPY OF `src/`, never on the working tree. Two sessions share
 * this checkout: a harness that mutated in place would put a deliberately broken source file
 * under another session's editor and one `git add -A` away from a live real-money deploy.
 * The suite honours `PC_ROOT` for exactly this. Same construction as `red-motion-ladder.mjs`,
 * and it is why this harness needs no revert step at all — there is nothing to put back.
 *
 * ⭐ THREE OF THESE DEFECTS WERE LIVE ON PRODUCTION ON THE MORNING OF 2026-09-04 (E-259's two
 * halves and E-261). They are not hypotheticals; they are the tree as it stood.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH the harness and `red-anchors.test.mts`. A harness with a
// private copy of its mutations hides them from the fleet auditor and lets them rot in silence.
import { MUTATIONS } from "./anchors/presence-class.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "presence-class.test.mts");

function runGate(rootDir) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, PC_ROOT: rootDir },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** A fresh copy of `src/` under a temp parent, so the suite's `join(ROOT, "src/…")` resolves. */
function freshTree() {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-presence-"));
  cpSync(join(REPO, "src"), join(dir, "src"), { recursive: true });
  return dir;
}

/** ⚠️ The suite prints its verdicts INDENTED (`  FAIL 3.1 · …`). A `startsWith("FAIL")` copied
 *  from a flush-left gate matches nothing and makes every mutation report "not caught" — which
 *  accuses a working guard. `.trim()` is load-bearing. */
function failedSections(out) {
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).trim().split(/[\s·]/)[0]);
}

console.log("\nred:presence-class — proving the guard can actually fail\n");

// ── GREEN FIRST. A suite that is already red proves nothing about any mutation. ──────────
{
  const clean = freshTree();
  const r = runGate(clean);
  rmSync(clean, { recursive: true, force: true });
  if (r.code !== 0) {
    console.error("⛔ THE SUITE IS NOT GREEN ON THE UNMODIFIED TREE. Fix that before reading any result below.");
    console.error(r.out.split(/\r?\n/).filter((l) => l.includes("FAIL")).join("\n"));
    process.exit(2);
  }
  console.log("  ok   green on the unmodified tree\n");
}

let proven = 0;
const misses = [];

for (const m of MUTATIONS) {
  const dir = freshTree();
  try {
    const path = join(dir, m.file);
    const src = readFileSync(path, "utf8");
    let mutated;
    try {
      mutated = injectDefect(src, m.from, m.to);
    } catch (e) {
      console.log(`  MISS ${m.name}\n         THIS MUTATION PROVES NOTHING — ${e.message}`);
      misses.push(m.name);
      continue;
    }
    writeFileSync(path, mutated);

    const r = runGate(dir);
    const failed = failedSections(r.out);
    const caught = r.code !== 0 && failed.includes(m.expect);
    if (caught) {
      proven++;
      console.log(`  ok   ${m.name}\n         caught by §${m.expect}`);
    } else {
      console.log(`  MISS ${m.name}\n         expected §${m.expect} to fail; exit=${r.code}, failed=[${failed.join(", ") || "none"}]`);
      misses.push(m.name);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nred:presence-class: ${proven}/${MUTATIONS.length} defects provably caught`);
if (misses.length) {
  console.error("\nThese mutations were NOT caught — the guard does not cover what it claims:");
  for (const n of misses) console.error(`  · ${n}`);
  process.exit(1);
}
console.log("red:presence-class: OK — every defect this guard claims to catch, it catches.");
