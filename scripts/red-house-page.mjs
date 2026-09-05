/**
 * red:house-page — proving `test:house-page` can actually fail.
 *
 * ⭐ A GUARD THAT HAS NEVER GONE RED IS A GREEN LIGHT OVER AN UNREAD ROAD. Every mutation
 * restores a way `/admin/house` could misstate the owner's money with `tsc` clean, the build
 * green and every arithmetic suite passing — which is exactly the class `test:house-page` was
 * written for, so it is the class most in need of a control.
 *
 * ⛔ MUTATES A COPY OF `src/`, NEVER THIS CHECKOUT. Two sessions share this working tree, and a
 * harness that edited files in place would put a deliberately broken source file under another
 * session's editor — one `git add -A` away from a live real-money deploy. The suite reads from
 * `HP_ROOT`; this harness points it at a temp tree.
 *
 * npm run red:house-page
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ⛔ IMPORTED, not a private copy: `red-anchors.test.mts` audits declared anchors without
// running them, and it can only do that while the mutations are importable data.
import { MUTATIONS } from "./anchors/house-page.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "house-page.test.mts");

function runGate(rootDir) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, HP_ROOT: rootDir },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** A fresh copy of `src/` under a temp parent, so the suite's `join(ROOT, "src/…")` resolves. */
function freshTree() {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-house-page-"));
  cpSync(join(REPO, "src"), join(dir, "src"), { recursive: true });
  return dir;
}

/** ⚠️ The suite prints verdicts INDENTED (`  FAIL 2.1 · …`). A `startsWith("FAIL")` copied from
 *  a flush-left gate matches nothing and reports every mutation as uncaught — which accuses a
 *  working guard. `.trim()` is load-bearing. */
function failedSections(out) {
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).trim().split(/[\s·]/)[0]);
}

console.log("\nred:house-page — proving the structural guard can actually fail\n");

// ── GREEN FIRST. A suite already red proves nothing about any mutation. ──────────────────
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

console.log(`\nred:house-page: ${proven}/${MUTATIONS.length} defects provably caught`);
if (misses.length) {
  console.error("\nThese mutations were NOT caught — the guard does not cover what it claims:");
  for (const n of misses) console.error(`  · ${n}`);
  process.exit(1);
}
console.log("red:house-page: OK — every structural way this page could misstate the owner's money is caught.");
