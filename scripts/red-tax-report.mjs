/**
 * red:tax-report — proving `test:tax-report` can actually fail.
 *
 * ⭐ A GUARD THAT HAS NEVER GONE RED IS A GREEN LIGHT OVER AN UNREAD ROAD. Every mutation in
 * `scripts/anchors/tax-report.anchors.mjs` restores a way the Government Tax Report could state a
 * wrong figure to TRA or GBT, or call wrong books right; if the suite still passes, the check that
 * claims to catch it does not.
 *
 * ⛔ MUTATES A PRIVATE COPY, NEVER THIS CHECKOUT — the `red:refused-funds` construction. Parallel sessions
 * share these trees, and a harness that edited files in place would leave a deliberately broken money file
 * one `git add` away from a live deploy.
 * ⚠️ THE COPY LIVES INSIDE THE REPO (`.red-tax-report-<pid>/`, git-ignored), deliberately: `node_modules` is
 * found by walking up from the copied files, and the copied `tsconfig.json` points `@/…` at the copied
 * `src/` — so a defect planted in a module that another module imports through `@/` is SEEN. A copy in the
 * system temp folder cannot resolve `@prisma/client` at all (measured 2026-10-03). It is deleted on exit,
 * crash or signal.
 * ⭐ THE UNMUTATED COPY MUST BE GREEN FIRST — that proves the copy resolves and runs, so a mutation that turns
 * it red is the defect, not a broken copy.
 *
 * npm run red:tax-report
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
// ⛔ IMPORTED, not a private copy: `red-anchors.test.mts` audits declared anchors without running them.
import { MUTATIONS } from "./anchors/tax-report.anchors.mjs";
// ⛔ THE SAME RESOLVER `test:red-anchors` §3 AUDITS WITH — never a second implementation.
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SUITE = "scripts/tax-report.test.mts";
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const SCRATCH = join(ROOT, `.red-tax-report-${process.pid}`);
const COPY = ["src", "scripts/lib", SUITE, "tsconfig.json", "package.json"];

const leftovers = readdirSync(ROOT).filter((n) => /^\.red-tax-report-\d+$/.test(n));
if (leftovers.length) console.log(`NOTE a previous run's copy is still on disk (${leftovers.join(", ")}) — not touched; delete it once no run is live`);
if (!existsSync(TSX)) {
  console.error(`REFUSING TO RUN — ${TSX} is missing; install dependencies first.`);
  process.exit(1);
}

const cleanup = () => { try { rmSync(SCRATCH, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* reported by red:all */ } };
process.on("exit", cleanup);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));
process.on("uncaughtException", (err) => { console.error(err); process.exit(1); });

for (const rel of COPY) {
  const dest = join(SCRATCH, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(ROOT, rel), dest, { recursive: true });
}

/** The suite resolves its root from its own location inside the copy — so `TAX_SRC` must be ABSENT, not empty. */
const SUITE_ENV = { ...process.env };
delete SUITE_ENV.TAX_SRC;

function runSuite() {
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING — the suite prints a line per assertion.
    const out = execFileSync(process.execPath, [TSX, SUITE], {
      cwd: SCRATCH, stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
      env: SUITE_ENV,
    });
    return { red: false, output: out };
  } catch (e) {
    const timedOut = e.code === "ETIMEDOUT" || e.signal === "SIGTERM";
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}${timedOut ? "\n(suite TIMED OUT)" : ""}` };
  }
}

/** ⚠️ The suite prints verdicts INDENTED (`  FAIL 2.1 …`). `.trim()` is load-bearing. */
const failedSections = (out) => out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("FAIL ")).map((l) => l.slice(5).trim().split(/[\s·]/)[0]);

console.log("\nred:tax-report — proving the Government Tax Report's guard can actually fail\n");
{
  const base = runSuite();
  if (base.red) {
    console.error(`REFUSING TO RUN — the suite is RED on the unmutated copy:\n${base.output.split("\n").filter((l) => /FAIL|Error/.test(l)).slice(0, 20).join("\n") || base.output.slice(-2000)}`);
    process.exit(2);
  }
  console.log("  ok   green on the unmutated copy\n");
}

let proven = 0;
const misses = [];
for (const m of MUTATIONS) {
  const path = join(SCRATCH, m.file);
  const original = readFileSync(path, "utf8");
  let mutated;
  try {
    mutated = injectDefect(original, m.from, m.to);
  } catch (e) {
    console.log(`  MISS ${m.name}\n         THIS MUTATION PROVES NOTHING — ${e.message}`);
    misses.push(m.name);
    continue;
  }
  writeFileSync(path, mutated);
  try {
    const r = runSuite();
    const failed = failedSections(r.output);
    if (r.red && failed.includes(m.expect)) {
      proven++;
      console.log(`  ok   ${m.name}\n         caught by §${m.expect}`);
    } else {
      console.log(`  MISS ${m.name}\n         expected §${m.expect} to fail; red=${r.red}, failed=[${failed.join(", ") || "none"}]`);
      misses.push(m.name);
    }
  } finally {
    writeFileSync(path, original);
  }
}

console.log(`\nred:tax-report: ${proven}/${MUTATIONS.length} defects provably caught`);
if (misses.length) {
  console.error("\nThese mutations were NOT caught — the guard does not cover what it claims:");
  for (const n of misses) console.error(`  · ${n}`);
  process.exit(1);
}
console.log("red:tax-report: OK — every declared way this report could misstate a tax figure is caught.");
