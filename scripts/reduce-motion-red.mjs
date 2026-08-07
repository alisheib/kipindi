/**
 * RED harness for `npm run test:reduce-motion`.
 *
 *   node scripts/reduce-motion-red.mjs
 *
 * ⭐ WHY. Every check in that gate is green right now, and green is also what a
 * gate that reads nothing prints. Nine mutations, each breaking exactly one check,
 * are the difference between "the third gate is covered" and "something ran".
 *
 * ⭐ AND ONE OF THEM RESTORES THE PRODUCTION BUG THIS ATOM CLOSED. Mutation 4 takes
 * `animation-delay: 0s !important` back out of the clamp — the state the product
 * shipped in until 2026-08-07, where a player who had switched Reduce motion ON
 * waited up to 360ms in front of an invisible market grid. If check 1.3 does not
 * fail on that, the clamp is decoration.
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every
 * mutation goes to a COPY of `src/` in the OS temp dir and the gate is aimed at it
 * with `RM_ROOT`; the gate prints the root it read on every run, so pointing it
 * elsewhere can never be silent. The tree is asserted unchanged at the end — a
 * harness that claims not to mutate is exactly the claim worth checking.
 *
 * ⛔ An unmatched anchor is a BROKEN HARNESS and is reported as such, never as a
 * MISS. And "it exited non-zero" is not evidence: the run must name the CHECK that
 * failed and prove it read the mutant, or a typo in this file scores as a catch.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/reduce-motion.test.mts";
const TRACKED = globSync("src/**/*.{css,tsx}", { cwd }).map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(TRACKED.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

/* ⚠️ The second clamp is a TOP-LEVEL rule and the first is nested in an @media, so
   their bodies are indented 2 and 4 spaces respectively. The first version of
   mutation 5 anchored on the 4-space form and reported ANCHOR NOT FOUND — which is
   the harness working as designed: it refused to score a miss it had caused. */
const CLAMP_BODY_2SP = `  animation-duration: 0.01ms !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;`;

const MUTATIONS = [
  {
    // 🔴 THE 2026-08-07 DEFECT, RESTORED EXACTLY. A glob written in prose inside the
    // §6 comment: the star-slash in it CLOSES the comment eleven lines early, the
    // English that follows becomes the head of the third gate's selector list, and
    // the browser drops all 27 entries. ⛔ Nothing else in this repo can see it —
    // tsc does not read CSS and `next build` does not fail on a dropped rule.
    name: "write a glob inside the §6 comment — the comment ends early and the third gate is DROPPED",
    check: "0.1",
    file: "src/app/globals.css",
    from: `   ⛔ THIS LIST IS THE THIRD GATE, IT IS THE ONLY ONE, AND IT IS NOW ENFORCED.`,
    to: `   ⛔ rule 2.1 walks every stylesheet matching src/**/*.css and every component.
   ⛔ THIS LIST IS THE THIRD GATE, IT IS THE ONLY ONE, AND IT IS NOW ENFORCED.`,
  },
  {
    // ⭐ THE SAME DEFECT SEEN FROM THE OTHER END, and the reason 0.2 exists as well
    // as 0.1: a comment can be closed early by a star-slash the author never meant,
    // and once that has happened there is nothing textual left to detect — the file
    // simply holds one comment and some prose. What survives is the SYMPTOM: a rule
    // whose selector is English. This mutation injects that symptom directly.
    name: "leak prose into the third gate's selector list — the rule the browser drops",
    check: "0.2",
    file: "src/app/globals.css",
    from: `[data-motion="reduced"] .cm-bubble::after,`,
    to: `and in the inline style blocks of every component file,\n[data-motion="reduced"] .cm-bubble::after,`,
  },
  {
    // 🔴 No clamp at all. The `all` flag matters: there are two, and breaking one
    // would leave the other to satisfy 1.0 — which is how a "no clamp" check ends
    // up unfalsifiable in a file that has two of them.
    name: "take the duration clamp off BOTH gates — no calm clamp exists",
    check: "1.0",
    file: "src/app/motion.css",
    all: true,
    from: `animation-duration: 0.01ms !important;`,
    to: `animation-duration: 1ms !important;`,
  },
  {
    // ⛔ An UNGATED universal clamp kills every animation in the product for every
    // user. It is the one way this block can be catastrophically wrong, and it
    // looks almost identical to the correct version.
    name: "strip the gate off the second clamp — a bare `*` clamp for everybody",
    check: "1.1",
    file: "src/app/motion.css",
    from: `html.kp-reduce-motion *, html.kp-reduce-motion *::before, html.kp-reduce-motion *::after,
[data-motion="minimal"] *, [data-motion="minimal"] *::before, [data-motion="minimal"] *::after {`,
    to: `*, *::before, *::after {`,
  },
  {
    // 🔴 THE PRE-2026-08-07 STATE, EXACTLY: a second copy of the media clamp living
    // in globals.css beside the one in motion.css. Four copies of this block
    // existed and had already drifted; the gate has to refuse the second.
    name: "put a second prefers-reduced-motion clamp back in globals.css",
    check: "1.2",
    file: "src/app/globals.css",
    from: `/* ---------- Reduced-motion respect ----------`,
    to: `@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
/* ---------- Reduced-motion respect ----------`,
  },
  {
    // ⭐ THE ONE THAT MATTERS — the shipped defect, restored. Duration zeroed, delay
    // untouched: `.market-grid > *` holds `m-settle-in`'s opacity-0 first frame for
    // up to 360ms, `.stagger-item` for 4 × --m-stagger, `.win-seal` for 160ms.
    name: "un-clamp animation-delay — a delayed keyframe holds its FIRST frame again",
    check: "1.3",
    file: "src/app/motion.css",
    from: `    animation-duration: 0.01ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`,
    to: `    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`,
  },
  {
    // ⛔ DRIFT, which is what actually happened: of the four old copies only two
    // carried `scroll-behavior`. Two blocks are unavoidable; two blocks saying
    // different things is the defect.
    name: "drop scroll-behavior from the class/attribute clamp only — the gates disagree",
    check: "1.4",
    file: "src/app/motion.css",
    from: `${CLAMP_BODY_2SP}
}`,
    to: `  animation-duration: 0.01ms !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}`,
  },
  {
    // ⛔ THE OVER-CORRECTION. "animation-delay was missing, so transition-delay must
    // be too" is a plausible next edit and it is wrong: it turns .kp-tooltip's
    // 300ms hover-intent wait into a hair-trigger. The pin has to be falsifiable
    // or it is just a comment.
    name: "clamp transition-delay too — hover-intent becomes a hair-trigger",
    check: "1.5",
    file: "src/app/motion.css",
    from: `    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`,
    to: `    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
}`,
  },
  {
    // 🔴 A LOOP THAT LIVES IN AN INLINE <style> BLOCK. `.dial-coach` is the exact
    // loop a `.css`-only census missed, so this mutation is also the proof that the
    // gate reads the second half of its corpus.
    name: "drop .dial-coach from the third gate — an inline-<style> loop goes unlisted",
    check: "2.1",
    file: "src/app/globals.css",
    from: `[data-motion="reduced"] .dial-coach `,
    to: `[data-motion="reduced"] .dial-coach-was-here `,
  },
  {
    // 🔴 `.wc-rays` FOR REAL: an entry naming a class nothing carries any more. The
    // list still LOOKS like coverage, which is why it survived months of green runs.
    name: "point a third-gate entry at a class that does not exist",
    check: "2.2",
    file: "src/app/globals.css",
    from: `[data-motion="reduced"] .ud-point,`,
    to: `[data-motion="reduced"] .ud-point,\n[data-motion="reduced"] .wc-rays,`,
  },
  {
    // ⛔ A TIERLESS FRAGMENT. Forgetting the attribute on one line of a long list is
    // the ordinary way this rule breaks: `[data-motion="reduced"] .a, .b` applies
    // `.b` to EVERY user at every tier, which is the opposite of a throttle. Named
    // separately from mutation 2 because the two shapes fail for different reasons —
    // that one is prose, this one is valid CSS doing the wrong thing.
    name: "drop the tier attribute from one entry — the rule fires for everybody",
    check: "2.0",
    file: "src/app/globals.css",
    from: `[data-motion="reduced"] .ud-count-pulse,`,
    to: `.ud-count-pulse,`,
  },
  {
    // ⛔ A STALE EXEMPTION. If .m-urgent stops looping, its KEPT entry is a licence
    // nobody is using — and a ratchet with dead entries reads as "still to do" when
    // the work is done.
    name: "make .m-urgent finite — its KEPT exemption goes stale",
    check: "2.3",
    file: "src/app/motion.css",
    from: `.m-urgent           { animation: m-breathe 1000ms var(--m-breathe) infinite; }`,
    to: `.m-urgent           { animation: m-breathe 1000ms var(--m-breathe) 1; }`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

console.log(`\nRED · test:reduce-motion — ${MUTATIONS.length} mutations, each on a COPY\n`);

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(lf(m.from))) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const mutated = m.all
    ? base.replaceAll(lf(m.from), lf(m.to))
    : base.replace(lf(m.from), lf(m.to));
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }

  // The whole corpus is copied, both halves of it: the gate reads `.tsx` inline
  // <style> blocks as well as stylesheets, and a copy holding only the `.css` files
  // would make three loops vanish and mutation 7 unfalsifiable for the wrong reason.
  const root = mkdtempSync(join(tmpdir(), `reduce-red-${i}-`));
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync(`npx tsx "${GATE}"`, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, RM_ROOT: root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  // ⛔ Demand the SHAPE: the NAMED check must be the one that failed, and the run
  // must be provably the MUTATED one — the gate echoes the root it read, so that
  // string is the evidence. "exit 1" alone would score a crash as a catch.
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

// ⛔ THE CLAIM WORTH CHECKING. A harness that says it never writes to src/ should
// prove it, on the same run, against the bytes it read at the start.
const touched = TRACKED.filter((f) => readFileSync(join(cwd, f), "utf8") !== ORIGINAL.get(f));
console.log(`\n  src/ files modified by this harness: ${touched.length}` + (touched.length ? ` ⛔ ${touched.join(", ")}` : "  ✓ none"));

console.log(`\nRED · ${caught}/${MUTATIONS.length} caught\n`);
if (missed.length) for (const n of missed) console.log(`  MISSED: ${n}`);
process.exit(caught === MUTATIONS.length && touched.length === 0 ? 0 : 1);
