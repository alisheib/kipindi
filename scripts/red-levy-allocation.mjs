/**
 * red:levy-allocation — proving `test:levy-allocation` can actually fail.
 *
 * ⭐ A GUARD THAT HAS NEVER GONE RED IS A GREEN LIGHT OVER AN UNREAD ROAD. Mutation 1 is the
 * PRE-FIX SOURCE VERBATIM — the arithmetic that booked a statutory levy the ledger and
 * `levySplit` disagreed about on 43 of production's 203 fee-bearing settlements. Mutations
 * 4-6 are OVER-CORRECTIONS: ways a "fix" could drift into reversing something `RULES.md`
 * records as decided (a levy is charged on OUR fee only — §2.2; a player is charged the pool
 * fee and the withdrawal fee and NOTHING else — §2.8). Mutation 7 attacks the gate's own
 * positive control: if §3 stops failing, §1 is asserting nothing and the gate has gone blind.
 *
 * ⛔ MUTATES A COPY OF `src/`, NEVER THIS CHECKOUT. Sessions share this working tree, and a
 * harness that edited files in place would leave a deliberately broken money file under
 * another session's editor — one `git add -A` away from a live real-money deploy. The copy
 * lives INSIDE the repo so `@prisma/client` still resolves, and is removed in `finally`.
 *
 * npm run red:levy-allocation
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ⛔ IMPORTED, NOT INLINE — and `red:bonus-withdrawable` is why. On 2026-09-09 a money fix
// threaded `tx` through the line that harness anchored; its inline string did not follow, so
// it reported "anchor missing" (a WARNING) while the gate above it printed green. Declared
// anchors are audited by `test:red-anchors` §3 on every run, which fails when one stops
// resolving. `injectDefect` is the SAME resolver §3 certifies with — a second implementation
// here could pass an anchor the harness then could not find, a guard agreeing with itself.
// It also handles the CRLF/LF mismatch that this file previously worked around by hand.
import { MUTATIONS as DECLARED } from "./anchors/levy-allocation.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "levy-allocation.test.mts");

/**
 * PRIMARY mutations are the ones applied on their own; an entry carrying `combineInto` is the
 * second half of another and is applied WITH it, never alone. Same pairing rule
 * `measure-red.mjs` uses, and `test:red-anchors` §3 fails when a `combineInto` names nothing.
 */
const PRIMARY = DECLARED.filter((m) => !m.combineInto);
const partsOf = (m) => [m, ...DECLARED.filter((x) => x.combineInto === m.name)];

function runGate(rootDir) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, LEVY_ROOT: rootDir },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** ⚠️ The gate prints verdicts INDENTED (`  FAIL 2.2 · …`). `.trim()` is load-bearing —
 *  a flush-left `startsWith("FAIL")` matches nothing and reports every mutation as
 *  UNCAUGHT, which accuses a working guard of being blind. */
function failedSections(out) {
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("FAIL "))
    .map((l) => l.slice(5).trim().split(/[\s·]/)[0]);
}

let tmp;
try {
  // ── The control: the gate must PASS on unmutated source, or every RED below is noise.
  const clean = runGate(REPO);
  if (clean.code !== 0) {
    console.error("CONTROL FAILED — the gate does not pass on this checkout. Fix that first.\n");
    console.error(clean.out);
    process.exit(1);
  }
  console.log("control · gate PASSES on unmutated source\n");

  let caught = 0;
  let rotted = 0;
  for (const m of PRIMARY) {
    tmp = mkdtempSync(join(REPO, ".red-levy-"));
    cpSync(join(REPO, "src"), join(tmp, "src"), { recursive: true });

    // ⛔ `injectDefect` THROWS on an anchor that is missing, ambiguous, or that produced an
    // identical file — it never silently no-ops, and it resolves \n anchors inside CRLF
    // sources so this harness no longer hand-rolls that. That is the whole difference from
    // the `includes()` loop it replaces: a rotted anchor is an ERROR that fails the run,
    // not a warning printed beside a green tally. `red:bonus-withdrawable` lost a mutation
    // that way on 2026-09-09 and only a parallel session noticed.
    let ok = true;
    for (const part of partsOf(m)) {
      const target = join(tmp, part.file);
      try {
        writeFileSync(target, injectDefect(readFileSync(target, "utf8"), part.from, part.to));
      } catch (err) {
        console.log(`  ⛔ ANCHOR ROTTED · ${part.name} — ${(err && err.message) || err}`);
        console.log(`     ${part.file} moved under this anchor. This mutation proved NOTHING.`);
        ok = false; rotted++;
        break;
      }
    }
    if (!ok) { rmSync(tmp, { recursive: true, force: true }); tmp = undefined; continue; }

    const r = runGate(tmp);
    const red = r.code !== 0;
    if (red) caught++;
    const parts = partsOf(m).length;
    console.log(`  ${red ? "RED " : "MISS"} ${m.name}${parts > 1 ? ` (+${parts - 1} paired)` : ""}`);
    if (red) console.log(`         caught by: ${[...new Set(failedSections(r.out))].join(", ")}`);
    rmSync(tmp, { recursive: true, force: true }); tmp = undefined;
  }

  console.log(`\n${caught}/${PRIMARY.length} mutations caught${rotted ? ` · ⛔ ${rotted} ANCHOR(S) ROTTED` : ""}`);
  // ⛔ A ROTTED ANCHOR FAILS THE RUN. It is not a lesser outcome than a missed defect: both
  // mean this harness did not prove what it claims, and only one of the two is visible.
  process.exit(caught === PRIMARY.length && rotted === 0 ? 0 : 1);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
