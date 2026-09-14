/**
 * RED DRIVE for `test:refused-funds` — plant each of five S1 defects, prove the suite fails on that defect's OWN
 * assertion, and never touch the working tree.   `npm run red:refused-funds`
 *
 * ⭐ WHY A COPY OF THE TREE, AND NOT THE IN-PLACE MUTATION THE REST OF THE FLEET USES. Three of this harness's
 * targets — `wallet-service.ts`, `kyc-service.ts`, `refused-funds.ts` — are the money files several sessions edit
 * at once. The in-place harnesses either refuse to start when a target differs from git HEAD (unrunnable on any
 * working day those files are open) or plant the defect in the shared file for the length of a suite run, where a
 * parallel session's test, build or `git add -A` can read it. The second is the failure this repo has already paid
 * for: two concurrent red runs left the live payout gate disabled on disk. So, like `red:dal-parity`, the defect is
 * planted in a PRIVATE copy — here the whole `src/` tree, because this suite is behavioural — and the suite runs
 * against that copy. There is nothing to restore in the working tree, and nothing another process can see.
 *
 * ⚠️ THE COPY LIVES INSIDE THE REPO (`.red-refused-funds-<pid>/`), deliberately: `node_modules` is found by walking
 * up from the copied files, and the copied `tsconfig.json` points `@/…` at the copied `src/`. It is not matched by
 * `tsconfig.json`'s `include`, and it is deleted on exit, crash or signal. `red:all` fingerprints the tree before and
 * after each harness, so a copy left behind by a killed process is reported there by path.
 * ⭐ THE UNMUTATED COPY MUST BE GREEN FIRST — that proves the copy resolves and runs at all, so a mutation that turns
 * it red is the defect, not a broken copy.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
// ⛔ THE MUTATIONS LIVE IN A SIDECAR, so `test:red-anchors` §3 re-resolves every one without running this.
import { MUTATIONS as DEFECTS } from "./anchors/refused-funds.anchors.mjs";
// ⛔ THE SAME RESOLVER `test:red-anchors` §3 AUDITS WITH — never a second implementation.
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SUITE = "scripts/refused-funds.test.mts";
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const SCRATCH = join(ROOT, `.red-refused-funds-${process.pid}`);
/** What the suite needs to run on its own: the source, the suite and its helpers, and the two files that decide
 *  how `@/…` and the module type resolve. */
const COPY = ["src", "scripts/lib", SUITE, "tsconfig.json", "package.json"];
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const leftovers = readdirSync(ROOT).filter((n) => /^\.red-refused-funds-\d+$/.test(n));
if (leftovers.length) console.log(`NOTE a previous run's copy is still on disk (${leftovers.join(", ")}) — not touched; delete it once no run is live`);
if (!existsSync(TSX)) {
  console.error(`REFUSING TO RUN — ${TSX} is missing; install dependencies first.`);
  process.exit(1);
}

const targets = [...new Set(DEFECTS.map((d) => d.file))];
const treeBefore = new Map(targets.map((f) => [f, sha(join(ROOT, f))]));

const cleanup = () => { try { rmSync(SCRATCH, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* reported below */ } };
process.on("exit", cleanup);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));
process.on("uncaughtException", (err) => { console.error(err); process.exit(1); });

for (const rel of COPY) {
  const dest = join(SCRATCH, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(ROOT, rel), dest, { recursive: true });
}

function runSuite() {
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING — the suite prints a line per assertion, with payloads.
    execFileSync(process.execPath, [TSX, SUITE], {
      cwd: SCRATCH, stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 240_000,
      env: { ...process.env, EMAIL_OUTBOX_CAPTURE: "1" },
    });
    return { red: false, output: "" };
  } catch (e) {
    const timedOut = e.code === "ETIMEDOUT" || e.signal === "SIGTERM";
    return { red: true, output: `${e.stdout ?? ""}${e.stderr ?? ""}${timedOut ? "\n(suite TIMED OUT)" : ""}` };
  }
}

{
  const base = runSuite();
  if (base.red) {
    const fails = base.output.split("\n").filter((l) => l.startsWith("FAIL"));
    console.error(`REFUSING TO RUN — the suite is RED on the unmutated copy:\n${fails.join("\n") || base.output.slice(-2000)}`);
    process.exit(1);
  }
  console.log("precondition: the suite is GREEN on the unmutated copy\n");
}

let caught = 0, missed = 0, unrestored = 0;
for (const d of DEFECTS) {
  const path = join(SCRATCH, d.file);
  const original = readFileSync(path, "utf8");
  let mutated;
  try {
    mutated = injectDefect(original, d.from, d.to);
  } catch (err) {
    // ⛔ AN ANCHOR THAT NO LONGER RESOLVES IS A FAILURE, NOT A SKIP.
    console.log(`STALE ${d.name} — ${err.message}; the harness is measuring nothing`);
    missed++;
    continue;
  }
  writeFileSync(path, mutated);
  const { red, output } = runSuite();
  writeFileSync(path, original);
  if (readFileSync(path, "utf8") !== original) unrestored++;
  const fails = output.split("\n").filter((l) => l.startsWith("FAIL"));
  // ⛔ CAUGHT ON ITS *OWN* ASSERTION, not merely caught.
  const own = fails.find((l) => l.includes(d.check));
  if (red && own) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim().slice(0, 240)}`); }
  else if (red) { missed++; console.log(`WRONG-ASSERTION ${d.name} — red, but NOT on "${d.check}"\n        ↳ ${(fails[0] ?? output.split("\n").slice(-3).join(" ")).trim().slice(0, 240)}`); }
  else { missed++; console.log(`MISSED ${d.name} — the suite stayed GREEN with this defect planted`); }
}

// The working tree is never written; measured anyway. A difference here is a concurrent edit by someone else.
const changed = targets.filter((f) => sha(join(ROOT, f)) !== treeBefore.get(f));
for (const f of changed) console.log(`NOTE ${f} changed during the run — not by this harness (it writes only ${SCRATCH}); re-run to measure the new text`);

console.log(`\nrefused-funds RED: ${caught} caught, ${missed} missed, ${unrestored} copy file(s) not restored, ${changed.length} tree file(s) changed by others`);
if (missed > 0 || unrestored > 0) process.exit(1);
