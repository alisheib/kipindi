/**
 * red:motion-ladder — THE CONTROL FOR `test:motion-ladder` (PV-14, 2026-09-03).
 *
 *   node scripts/red-motion-ladder.mjs
 *
 * ⛔ THIS GUARD RAN FOR ITS WHOLE LIFE WITHOUT A CONTROL. It is the ratchet the design record
 * cites for "the motion tokens are pinned", it reached an allowlist of zero once, and nobody
 * had ever watched it fail. It was green over an entire missing FILE TYPE (its hole 3) and over
 * a fourth motion vocabulary in `src/styles/chat/`. §5 of `.claude/skills/pv10-validate-as-you-go`
 * is the law being paid here: **write the mutation before you believe the check.**
 *
 * FIVE MUTATIONS, AND THE LAST ONE IS THE POINT OF THE ROW:
 *   1-4 · content reversions, declared in `anchors/motion-ladder.anchors.mjs` (so
 *         `red-anchors.test.mts` can audit them without running this harness). Each restores a
 *         literal that shipped, or probes the loop carve-out's boundary; each must be caught by
 *         a NAMED section, not merely by a non-zero exit.
 *   5   · ⭐ THE CORPUS MUTATION. Not a content edit, so it cannot be an anchor: it removes
 *         every `.css` file from the copied tree and asserts §2 goes RED. This is the control
 *         for the failure the row actually found — *"a gate reporting `0 offenders` over the
 *         wrong corpus reads exactly like a gate reporting `0 offenders`."* Note what it proves
 *         and what it must NOT: §1.1 stays GREEN under this mutation (the offenders left with
 *         the files), so §1.1 alone can never tell you the stylesheets are being read. Only §2
 *         can. If §2 ever passes here, the extension pin is decoration and hole 3 is reopened.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE, via `ML_ROOT` — the gate's own scratch-root
 * env var — so two sessions sharing this working tree never see a deliberately-broken file.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// ⛔ ONE DEFINITION, IMPORTED BY BOTH — same law as `tap-rung.anchors.mjs`/`red-tap-rung.mjs`.
// A harness with its own private copy of these mutations would hide them from the fleet
// auditor and let them rot in silence.
import { MUTATIONS } from "./anchors/motion-ladder.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "motion-ladder.test.mts");

/** `ML_ROOT` is the PARENT of `src` — the gate joins `src` onto it itself. */
function runGate(rootDir) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8",
    env: { ...process.env, ML_ROOT: rootDir },
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** A fresh copy of `src/` under a temp parent, so the gate's `join(ROOT,"src")` resolves. */
function freshTree() {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-mladder-"));
  cpSync(join(REPO, "src"), join(dir, "src"), { recursive: true });
  return dir;
}

/**
 * ⛔ `.trim()` IS LOAD-BEARING AND COST THIS HARNESS A FULL FALSE-NEGATIVE RUN. This gate prints
 * its verdicts INDENTED (`  FAIL 3.1 …`), so a `line.startsWith("FAIL")` copied from a harness
 * whose gate prints flush-left matched nothing. Every mutation then reported
 * `NOT CAUGHT — exit 1, failed: [none]` while the gate underneath was failing the right section
 * by name. ⭐ Note which way that error pointed: the harness UNDER-reported, so it accused a
 * working guard rather than certifying a broken one. The dangerous version of this bug is the
 * mirror image — scoring "exit non-zero" as "caught" — which is why this parser demands a
 * NAMED section and never trusts the exit code alone. A crash and a catch both exit 1.
 */
const failedSections = (out) =>
  out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("FAIL"))
     .map((l) => l.replace(/^FAIL\s+/, "").split(/\s/)[0]);

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:motion-ladder — the control for test:motion-ladder (PV-14)");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(REPO);
if (base.code !== 0) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n"));
  process.exit(1);
}
console.log("  HEAD   exit 0 (test:motion-ladder green — the ladder is clean at zero)");

let bad = 0;
for (const m of MUTATIONS) {
  const dir = freshTree();
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
    const sections = failedSections(res.out);
    const caughtByName = sections.includes(m.expect);
    if (res.code !== 0 && caughtByName) {
      console.log(`  ✓ ${m.name}\n      caught by §${m.expect}`);
    } else {
      console.log(`  ✗ ${m.name}\n      ⛔ NOT CAUGHT BY §${m.expect} — exit ${res.code}, failed: [${sections.join(", ") || "none"}]`);
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ── MUTATION 5 · THE CORPUS. See the header for why this one cannot be an anchor. */
{
  const dir = freshTree();
  try {
    let removed = 0;
    const strip = (d) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) strip(p);
        else if (e.endsWith(".css")) { unlinkSync(p); removed++; }
      }
    };
    strip(join(dir, "src"));

    const res = runGate(dir);
    const sections = failedSections(res.out);
    /* §2.1 is the count pin and §2.3/§2.4 name the directory and the definition site. All three
       describe the corpus, so all three must notice it emptied of stylesheets. */
    const corpusCaught = ["2.1", "2.3", "2.4"].every((s) => sections.includes(s));
    /* ⭐ AND THE OTHER HALF OF THE PROOF: §1.1 must still be GREEN. The offenders left with the
       files, so the offender count is honestly zero over a corpus that is missing a file type —
       which is exactly the reading that hid hole 3 for the guard's whole life. If §1.1 failed
       here, this control would be proving something other than what it claims. */
    const offendersStillGreen = !sections.includes("1.1");
    if (res.code !== 0 && corpusCaught && offendersStillGreen) {
      console.log(`  ✓ CORPUS · ${removed} stylesheet(s) removed from the tree\n      caught by §2.1 + §2.3 + §2.4, and §1.1 stayed GREEN (0 offenders over the wrong corpus)`);
    } else {
      console.log(`  ✗ CORPUS · ${removed} stylesheet(s) removed from the tree`);
      console.log(`      ⛔ exit ${res.code} · §2 caught: ${corpusCaught} · §1.1 green: ${offendersStillGreen} · failed: [${sections.join(", ") || "none"}]`);
      bad++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const total = MUTATIONS.length + 1;
console.log(`\n${total - bad}/${total} mutations caught`);
process.exit(bad ? 1 : 0);
