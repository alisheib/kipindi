#!/usr/bin/env node
/**
 * red:css-vars-defined — proves `test:css-vars-defined` catches what it claims to.
 *
 *   npm run red:css-vars-defined
 *
 * ⛔ IT NEVER TOUCHES REAL SOURCE. The gate reads `CSSVARS_ROOT`, so this copies `src/` to a
 * temp tree, mutates the COPY and re-aims the gate at it — the contract `test:tokens` states
 * in its own header. Two sessions share this working tree; a RED harness that rewrites
 * `src/app/globals.css` and restores it afterwards is one crash away from committing a
 * planted defect, and this repo has already paid for a session sweeping another's file into
 * its commit.
 *
 * ⭐ THE POSITIVE CONTROL IS THE REAL BUG. `gutter-restored` puts back the exact declaration
 * that shipped on 2026-08-15 and was live for 21 days —
 *   `padding: 10px var(--gutter) calc(env(safe-area-inset-bottom,0px) + 14px)`
 * — the one that made the phone filter sheet render with zero padding on all four sides. If
 * that case ever stops going red, this gate has stopped being about anything.
 *
 * ⭐ AND `fallback-is-exempt` IS THE CONTROL IN THE OTHER DIRECTION, which matters just as
 * much: it proves the exemption for `var(--x, fallback)` is a DECISION and not blindness. A
 * gate that goes red on everything is as useless as one that goes red on nothing, and the
 * quickest way to "fix" this suite would be to widen it until nobody can use an optional hook.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GATE = "scripts/css-vars-defined.test.mts";
const REAL = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const runGate = (root) => {
  try {
    const out = execFileSync("npx", ["tsx", GATE], {
      encoding: "utf8", stdio: "pipe", shell: process.platform === "win32",
      env: { ...process.env, CSSVARS_ROOT: root },
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

// ── precondition ───────────────────────────────────────────────────────────
const base = runGate(REAL);
if (base.code !== 0) {
  console.error("REFUSING: test:css-vars-defined is already RED on the untouched tree.");
  console.error(base.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 5).join("\n"));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const CSS = "src/app/globals.css";
const ANCHOR = ".kp-fsheet-panel {";

/** @type {{name:string, why:string, expect:"red"|"green", from:string, to:string, match?:string}[]} */
const CASES = [
  {
    name: "gutter-restored",
    why: "⭐ POSITIVE CONTROL · the real defect, put back verbatim: the sheet's padding references `--gutter`, which is defined nowhere, so the whole shorthand is invalid at computed-value time and every side computes to 0",
    expect: "red",
    match: "--gutter",
    from: "  padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
    to: "  padding: 10px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 14px);",
  },
  {
    name: "typo-in-a-real-token",
    why: "the commonest live shape of this bug: a token that EXISTS is referenced with one character wrong. `--sp-5` is defined; `--sp5` is not, and the declaration silently evaporates",
    expect: "red",
    match: "--sp5",
    from: "  padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
    to: "  padding: var(--sp-3) var(--sp5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
  },
  {
    name: "fallback-is-exempt",
    why: "⭐ CONTROL, THE OTHER WAY · `var(--x, fallback)` cannot compute to nothing, so an undefined name WITH a fallback must stay green. A gate that reddens here would forbid every optional hook and would be switched off within a week",
    expect: "green",
    from: "  padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
    to: "  padding: var(--sp-3) var(--kp-red-probe-absent, 20px) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
  },
  {
    name: "undefined-inside-a-comment",
    why: "⛔ CONTROL · this repo documents its traps in prose, and the gate's FIRST run reported `--royal-N` and `--x` from paragraphs explaining them. A reference that exists only inside a comment must NOT be reported, or the gate teaches people to delete their own documentation",
    expect: "green",
    /* ⚠️ `.kp-fsheet-grab {` and NOT `.kp-fsheet-panel {`: the latter occurs twice, once as
       the rule and once inside the paragraph documenting the `--gutter` defect — which is the
       very hazard this case is about. The harness refuses an ambiguous anchor rather than
       silently mutating the first hit. */
    from: ".kp-fsheet-grab {",
    to: "/* a note mentioning var(--kp-red-probe-in-prose) which is not real code */\n.kp-fsheet-grab {",
  },
];

const tmpRoot = mkdtempSync(join(tmpdir(), "red-cssvars-"));
let caught = 0;
const problems = [];

for (const [i, c] of CASES.entries()) {
  const work = join(tmpRoot, `case${i}`);
  mkdirSync(work, { recursive: true });
  cpSync(join(REAL, "src"), join(work, "src"), { recursive: true });

  const p = join(work, CSS);
  const original = readFileSync(p, "utf8");
  if (!original.includes(c.from)) {
    problems.push(`${c.name}: ANCHOR did not resolve`);
    console.log(`  ${i + 1}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  if (original.split(c.from).length - 1 !== 1) {
    problems.push(`${c.name}: ANCHOR is not unique`);
    console.log(`  ${i + 1}. ANCHOR AMBIGUOUS  ${c.name}`);
    continue;
  }
  writeFileSync(p, original.replace(c.from, c.to), "utf8");

  const r = runGate(work);
  const wentRed = r.code === 1;

  if (c.expect === "red") {
    if (!wentRed) {
      problems.push(`${c.name}: stayed GREEN (exit ${r.code})`);
      console.log(`  ${i + 1}. NOT CAUGHT   ${c.name}`);
    } else if (c.match && !r.out.includes(`FAIL ${c.match} is referenced but never defined`)) {
      const got = r.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ");
      problems.push(`${c.name}: red, but not on "${c.match}" — got ${got || "(no FAIL line)"}`);
      console.log(`  ${i + 1}. WRONG REASON ${c.name}`);
    } else { caught++; console.log(`  ${i + 1}. caught       ${c.name}`); }
  } else {
    if (r.code !== 0) {
      const got = r.out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ");
      problems.push(`${c.name}: expected GREEN, went red — ${got || `exit ${r.code}`}`);
      console.log(`  ${i + 1}. FALSE POSITIVE ${c.name}`);
    } else { caught++; console.log(`  ${i + 1}. stayed green ${c.name}  (correct)`); }
  }
}

/**
 * ⚠️ THE INSTRUMENT'S OWN CONTROL. Aim the gate at a tree with no `src` and it must exit 2 —
 * INCONCLUSIVE — never 0. "Found nothing" and "measured nothing" print the same green tick,
 * and this repo has had a gate that chose its own empty population and stayed green for 200
 * CI runs. This is the assertion that stops that happening to this one.
 */
{
  const empty = join(tmpRoot, "empty");
  mkdirSync(join(empty, "src"), { recursive: true });
  const r = runGate(empty);
  if (r.code === 2) { caught++; console.log(`  ${CASES.length + 1}. exits 2      empty-tree-is-INCONCLUSIVE  (correct)`); }
  else {
    problems.push(`empty-tree-is-INCONCLUSIVE: expected exit 2, got ${r.code}`);
    console.log(`  ${CASES.length + 1}. WRONG        empty-tree-is-INCONCLUSIVE (exit ${r.code})`);
  }
}

rmSync(tmpRoot, { recursive: true, force: true });

const total = CASES.length + 1;
console.log(`\nred:css-vars-defined: ${caught}/${total} behaved correctly`);
if (problems.length > 0) {
  console.log(problems.map((p) => `  ⛔ ${p}`).join("\n"));
  process.exit(1);
}
console.log("⭐ the gate catches the real defect, exempts fallbacks deliberately, ignores prose, and refuses to call an empty scan green.");
