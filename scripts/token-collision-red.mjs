/**
 * RED harness for `npm run test:tokens`.
 *
 *   node scripts/token-collision-red.mjs
 *
 * ⭐ WHY, and why only now. Rule 1 of that gate has been green since 2026-07-20
 * and nobody had ever seen it fail, because the state it is usually in — no
 * collisions — is also the state a completely broken rule reports. E-122 proved
 * the cost of that: the rule was scoped to a HAND-LISTED set of token families,
 * three colour tokens outside the list had two definition sites each, and the
 * gate said ALL PASS over a chat surface rendering eight points darker than its
 * own token file states. A rule nobody has watched fail is a rule nobody knows
 * the shape of.
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every
 * mutation goes to a COPY of the stylesheets in the OS temp dir and the gate is
 * aimed at it with `TOKENS_ROOT`; the gate prints the root it read on every run,
 * so pointing it elsewhere can never be silent. The tree is asserted unchanged at
 * the end.
 *
 * And "it exited non-zero" is not evidence — each run must name the CHECK that
 * failed, or a typo in this file would score as a caught defect.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSS_FILES = globSync("src/**/*.css", { cwd }).map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(CSS_FILES.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

const MUTATIONS = [
  {
    // 🔴 E-122 PUT BACK, EXACTLY. This is the declaration that was live in the
    // repo for months while the gate reported ALL PASS. If rule 1b is scoped or
    // anchored wrongly, this comes back green and says so.
    name: "re-declare --gilt in chat-tokens.css — the E-122 shape, a colour token in two files",
    check: "⭐ no token AT ALL defined in two files",
    file: "src/styles/chat/chat-tokens.css",
    from: `  --gilt-edge:      color-mix(in oklab, var(--gilt) 55%, transparent);`,
    to: `  --gilt:           oklch(86% 0.13 82);\n  --gilt-edge:      color-mix(in oklab, var(--gilt) 55%, transparent);`,
  },
  {
    // ⛔ THE DECLARATION-BOUNDARY ANCHOR. A naive `(--[a-z0-9-]+)\s*:` also matches
    // inside a value — `color-mix(in oklab, var(--gilt) 55%, transparent)` does not,
    // but a fallback like `var(--x, --y: z)` or a data-URI would. This mutation puts
    // a token NAME inside a value in a second file and the gate must NOT count it:
    // a false collision is as damaging as a missed one, because the fix for it is to
    // delete a live declaration.
    name: "a token name that appears inside a VALUE must not count as a declaration",
    check: null, // expects the gate to stay GREEN
    file: "src/app/motion.css",
    from: `:root {`,
    to: `:root {\n  --red-probe-only: var(--gilt, --claret-hover);`,
  },
  {
    // The motion-family rule that has guarded this file since 2026-07-20, shown
    // failing for the first time. `--dur-*` is in GUARDED.
    // ⚠️ THE TOKEN HAS TO EXIST ELSEWHERE OR THERE IS NO COLLISION. The first
    // version of this mutation shadowed `--dur-base`, which this repo does not
    // have — so it created a single, legal declaration and the gate passed. That
    // was a broken harness reported as a passing gate, which is the exact
    // confusion the header refuses to allow. `--dur-micro` is real
    // (globals.css:254) and shadowing it is the 2026-07-20 defect verbatim.
    name: "shadow --dur-micro into a second file — the original 2026-07-20 defect class",
    check: "no motion/elevation token defined in two files",
    file: "src/app/state-tokens.css",
    from: `:root {`,
    to: `:root {\n  --dur-micro: 999ms;`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const root = mkdtempSync(join(tmpdir(), `tok-red-${i}-`));
  for (const f of CSS_FILES) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    cpSync(join(cwd, f), join(root, f));
  }
  const mutated = base.replace(m.from, m.to);
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/token-collision.test.mts", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, TOKENS_ROOT: root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  const readTheCopy = out.includes(root);
  if (m.check === null) {
    // ⭐ A "must stay GREEN" case. Without one of these, a rule that fails on
    // EVERYTHING scores a perfect RED sheet.
    const ok = exitCode === 0 && readTheCopy;
    if (ok) { caught++; console.log(`  ✓ GREEN ${m.name}\n         → the gate correctly did NOT fire`); }
    else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → ${!readTheCopy ? "TOKENS_ROOT was ignored" : "the gate fired on a value, not a declaration"}`);
    }
    continue;
  }

  const failedCheck = out.split("\n").some((l) => l.trim().startsWith("FAIL") && l.includes(m.check));
  const ok = exitCode !== 0 && readTheCopy && failedCheck;
  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith("FAIL") && l.includes(m.check)) ?? "";
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 130)}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — TOKENS_ROOT was ignored"
      : exitCode === 0
        ? "the gate PASSED over a stylesheet that breaks it"
        : `exit ${exitCode}, but "${m.check}" was not the check that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of ORIGINAL) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the shared tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (tokens) — ${caught}/${MUTATIONS.length} caught · src/ untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
