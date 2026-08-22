/**
 * RED harness for `npm run test:keyframes`.
 *
 *   node scripts/keyframe-registry-red.mjs
 *
 * ⭐ WHY. Every check in that gate is green, and green is what a gate that reads nothing
 * prints. Two of its rules are also the only things in this repo that can see their
 * defect at all — a duplicate `@keyframes` retunes every consumer of that motion
 * silently, and `shimmer-gilt`'s layer count is a PAINT bug inside a hover animation.
 * Neither shows up in `tsc`, in the build, in a contrast gate, or in a still.
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every mutation
 * goes to a COPY of `src/` in the OS temp dir and the gate is aimed at it with
 * `KF_ROOT`; the gate prints the root it read on every run, so pointing it elsewhere
 * can never be silent. The tree is asserted unchanged at the end.
 *
 * ⛔ An unmatched anchor is a BROKEN HARNESS, reported as such and never as a MISS. And
 * "it exited non-zero" is not evidence: the run must name the CHECK that failed and
 * prove it read the mutant.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/keyframe-registry.test.mts";
const TRACKED = globSync("src/**/*.{css,tsx}", { cwd }).map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(TRACKED.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

const MUTATIONS = [
  {
    // 🔴 A SECOND DEFINITION OF ONE MOTION. The last `@keyframes` of a name wins for the
    // whole document, wherever it sits — so this does not shadow one rule, it retunes
    // every consumer of `seal-impress` in the product, with nothing to notice.
    // ⚠️ RE-ANCHORED 2026-08-22. This pointed at the comment `/* ---------- Settling shimmer
    // ---------- */`, which stage 08 deleted along with 73 unrendered classes — so the
    // mutation stopped applying and this check silently stopped being proven. The harness
    // reported "anchor missing", not a pass, which is the only reason it surfaced.
    // ⛔ Anchored on the DEFINITION the rule is about, not on decoration near it: if
    // `seal-impress` is ever renamed or retuned, this mutation SHOULD fail loudly rather
    // than quietly stop testing anything.
    name: "define seal-impress a second time — the LAST one silently wins document-wide",
    check: "1.1",
    file: "src/app/globals.css",
    from: `@keyframes seal-impress { 0% { transform: scale(2.2);`,
    to: `@keyframes seal-impress { 0% { transform: scale(1); } 100% { transform: scale(1); } }
@keyframes seal-impress { 0% { transform: scale(2.2);`,
  },
  {
    // ⛔ An at-rule override that is NOT a calm branch is rule 1.1's drift wearing a
    // media query as a disguise — a second tuning that only applies on wide screens.
    name: "retune mark-breathe inside a width media query — a second tuning, not a calm branch",
    check: "2.1",
    file: "src/app/globals.css",
    // ⚠️ RE-ANCHORED 2026-08-15. This pointed at a `@media (min-width: 1024px)` block whose
    // first rule was `.app-topbar` — a pairing that no longer exists anywhere in the sheet, so
    // the mutation could not be injected and the harness said so honestly into a runner that
    // had already exited (§8). ⛔ The mutation is about WHERE a keyframe is defined, not about
    // which rule follows it: any real width query serves, and this one is unique.
    from: `@media (min-width: 1024px) {
  .kp-band { padding-block: var(--rh-section); }`,
    to: `@media (min-width: 1024px) {
  @keyframes mark-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
  .kp-band { padding-block: var(--rh-section); }`,
  },
  {
    // 🔴 A KEYFRAME DEFINED NOWHERE AT ALL — `wc-trophy-pulse`'s shipped state, which
    // rule 2.2's FIRST version could not see. ⭐ THIS MUTATION IS WHY THE RULE IS RIGHT
    // NOW: it walked straight through the original, because that version only kept
    // identifier tokens matching a KNOWN keyframe name (to avoid flagging `both`,
    // `infinite`, the easings) — and a name defined nowhere matches nothing, so it was
    // excused. A filter written against false positives had bought a false negative.
    name: "delete mark-breathe outright — a top-level rule naming a keyframe that exists NOWHERE",
    check: "2.2",
    file: "src/app/globals.css",
    from: `@keyframes mark-breathe { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(0.6deg) scale(1.015); } }`,
    to: `/* deleted by the red harness */`,
  },
  {
    // 🔴 AND THE OTHER SHAPE, WHICH IS `win-burst`'s EXACT SHIPPED STATE: the definition
    // exists, but ONLY inside the calm branch — so the motion plays for reduce-motion
    // users and for nobody else, the precise inverse of what a calm branch is for.
    // Named separately because the two fail for different reasons and a gate that
    // conflated them could be green on one while catching the other.
    name: "move mark-breathe's definition INTO the calm branch — it plays for reduce users ONLY",
    check: "2.2",
    file: "src/app/globals.css",
    from: `@keyframes mark-breathe { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(0.6deg) scale(1.015); } }`,
    to: `/* relocated by the red harness */`,
    also: {
      from: `@media (prefers-reduced-motion: reduce) {
  /* presses / votes / streaks: no transform, just the resting state */`,
      to: `@media (prefers-reduced-motion: reduce) {
  @keyframes mark-breathe { 0%, 100% { transform: none; } 50% { transform: none; } }
  /* presses / votes / streaks: no transform, just the resting state */`,
    },
  },
  {
    // ⛔ §B half-landed. A missing name from the commission has to be named, not
    // reported as "a keyframe is missing" — a gate that cannot say which atom regressed
    // sends the next session reading the whole file.
    name: "drop mark-flip — §B is half-landed",
    check: "3.1",
    file: "src/app/globals.css",
    from: `@keyframes mark-flip {`,
    to: `@keyframes mark-flip-DROPPED {`,
  },
  {
    // ⛔ §C REUSES six existing names rather than redefining them, which means a
    // clean-up sweep can delete one and break a utility with nothing to notice.
    name: "delete badge-seal-rays — §C's .seal-sheen would break silently",
    check: "3.2",
    file: "src/app/globals.css",
    from: `@keyframes badge-seal-rays {`,
    to: `@keyframes badge-seal-rays-GONE {`,
  },
  {
    // 🔴 THE PAINT BUG, RESTORED EXACTLY. One value applies to EVERY background layer,
    // and `.gilt-metal` has two — so the gold ramp itself translates ±200% and the metal
    // slides off the button. Measured in a browser on a paused timeline before the fix.
    // ⛔ No other check in this repo can see it: it is inside a hover animation, and a
    // still of a resting button is identical either way.
    name: "put shimmer-gilt back to ONE background-position — the metal slides off the button",
    check: "3.3",
    file: "src/app/globals.css",
    from: `@keyframes shimmer-gilt { 0% { background-position: -200% 0, 0 0; } 100% { background-position: 200% 0, 0 0; } }`,
    to: `@keyframes shimmer-gilt { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

console.log(`\nRED · test:keyframes — ${MUTATIONS.length} mutations, each on a COPY\n`);

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(lf(m.from))) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  let mutated = base.replace(lf(m.from), lf(m.to));
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  // ⚠️ A second edit, for mutations that RELOCATE rather than delete. ⛔ Its anchor is
  // checked as strictly as the first: a patch script that reports success on one
  // replacement of two has already cost this campaign a session (ATOM 12).
  if (m.also) {
    if (!mutated.includes(lf(m.also.from))) {
      console.log(`  ✗ ${m.name}\n      ⛔ SECOND ANCHOR NOT FOUND — the harness is broken, not the gate.`);
      missed.push(`${m.name} (second anchor missing)`);
      continue;
    }
    const before2 = mutated;
    mutated = mutated.replace(lf(m.also.from), lf(m.also.to));
    if (mutated === before2) {
      console.log(`  ✗ ${m.name}\n      ⛔ SECOND MUTATION IS A NO-OP — the harness is broken, not the gate.`);
      missed.push(`${m.name} (second no-op)`);
      continue;
    }
  }
  const root = mkdtempSync(join(tmpdir(), `kf-red-${i}-`));
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync(`npx tsx "${GATE}"`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, KF_ROOT: root } });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  const failedCheck = new RegExp(`^\\s*FAIL ${m.check.replace(".", "\\.")} `, "m").test(out);
  const ranTheMutant = out.includes(root);
  const ok = exitCode !== 0 && ranTheMutant && failedCheck;

  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith(`FAIL ${m.check}`)) ?? "";
    console.log(`  ✓ ${m.name}\n      →${line.replace(/^\s*FAIL/, " FAIL")}`);
  } else {
    console.log(`  ✗ ${m.name}\n      exit=${exitCode} ranTheMutant=${ranTheMutant} check ${m.check} failed=${failedCheck}`);
    if (!ranTheMutant) console.log(`      ⛔ the gate did not report reading ${root} — it may have read the REAL tree`);
    missed.push(m.name);
  }
}

const touched = TRACKED.filter((f) => readFileSync(join(cwd, f), "utf8") !== ORIGINAL.get(f));
console.log(`\n  src/ files modified by this harness: ${touched.length}` + (touched.length ? ` ⛔ ${touched.join(", ")}` : "  ✓ none"));
console.log(`\nRED · ${caught}/${MUTATIONS.length} caught\n`);
if (missed.length) for (const n of missed) console.log(`  MISSED: ${n}`);
process.exit(caught === MUTATIONS.length && touched.length === 0 ? 0 : 1);
