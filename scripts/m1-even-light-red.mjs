/**
 * RED harness for `npm run test:m1-light`.
 *
 *   node scripts/m1-even-light-red.mjs
 *
 * ⭐ WHY. A ratchet is the easiest kind of gate to write wrong, because the state
 * it is usually in — everything on the allowlist, nothing unexpected — is also
 * the state a completely broken gate reports. The three checks have to be shown
 * failing, one at a time, against a stylesheet that breaks each one.
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every
 * mutation goes to a COPY of the stylesheets in the OS temp dir and the gate is
 * aimed at it with `M1_ROOT`; the gate prints the root it read on every run, so
 * pointing it elsewhere can never be silent. The tree is asserted unchanged at
 * the end — a harness that claims not to mutate is exactly the claim worth
 * checking.
 *
 * Rules, as everywhere in this campaign: an unmatched anchor is a BROKEN HARNESS
 * and is reported as such, never as a MISS. And "it exited non-zero" is not
 * evidence — the run must name the CHECK that failed, or a typo in this file
 * would score as a caught defect.
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
    // 🔴 ATOM 5 UNDONE. If the geometry rule were not reading `.btn-yes`, putting
    // the top-only line back would move nothing — which is the state the repo was
    // in before this gate existed, when nothing checked M1 at all.
    name: "put .btn-yes's top-only highlight back — a one-sided lamp returns",
    check: "1.1",
    file: "src/app/globals.css",
    from: `box-shadow: inset 0 0 0 1px oklch(80% 0.14 152 / 0.4), 0 1px 2px`,
    to: `box-shadow: inset 0 1px 0 oklch(80% 0.14 152 / 0.4), 0 1px 2px`,
  },
  {
    // ⛔ A LIGHTNESS THE GATE CANNOT READ MUST COUNT AS A LAMP. The tempting
    // default is the other way — "I could not parse it, so leave it alone" — and
    // that is how a gate ends up green over the one declaration nobody could read.
    // ⚠️ RE-ANCHORED at ATOM 8: `.glass-panel`'s one-sided pure-white inset is
    // gone (it takes `var(--edge-lit)` now), so this breaks the CONVERTED rule
    // instead — which is strictly better, because it also proves the conversion
    // is what the gate is reading.
    name: "give .glass-panel an unresolvable one-sided inset — unreadable must mean LAMP",
    check: "1.1",
    file: "src/app/globals.css",
    from: `  box-shadow: var(--edge-lit), 0 8px 24px -6px oklch(6% 0.08 268 / 0.45);`,
    to: `  box-shadow: inset 0 1px 0 var(--no-such-token-anywhere), 0 8px 24px -6px oklch(6% 0.08 268 / 0.45);`,
  },
  {
    // 🔴 ATOM 8 UNDONE — the toast, whose old value was `--shadow-card-top`'s
    // pre-merge literal retyped by hand. With the pending list now EMPTY, this is
    // the shape that proves the sweep stays swept: there is no entry left to
    // license it, so a regression anywhere fails on sight.
    name: "put the toast's top-edge line back — a converted site regresses with no exemption left",
    check: "1.1",
    file: "src/app/globals.css",
    from: `  box-shadow: var(--edge-lit-strong), var(--shadow-4);`,
    to: `  box-shadow: 0 1px 0 oklch(98% 0.01 268 / 0.08) inset, var(--shadow-4);`,
  },
  {
    // The stale-exemption half — rule 1.2. ⛔ IT CANNOT BE PROVEN BY MUTATING CSS
    // ANY MORE, and that is a direct consequence of the sweep finishing: with
    // PENDING empty there is no entry a stylesheet edit could strand. So this one
    // mutates the GATE'S OWN SOURCE on a copy instead, re-adding an exemption for
    // a site that no longer matches anything. ⭐ Without it, rule 1.2 would sit
    // permanently green and unexercised, which is precisely the state E-122 found
    // rule 1 of `test:tokens` in after six years of never failing.
    kind: "gate",
    name: "re-add a pending entry for an already-converted site — a stale exemption",
    check: "1.2",
    from: `const PENDING: { file: string; snippet: string; atom: string }[] = [];`,
    to: `const PENDING: { file: string; snippet: string; atom: string }[] = [\n  { file: "src/app/globals.css", snippet: "oklch(100% 0 0 / 0.22)", atom: "red-harness only" },\n];`,
  },
  {
    // 🔴 ATOM 2c-b UNDONE — and this one is the reason the pending entry had to be
    // DELETED rather than left in place "for safety". While `--shadow-modal` was on
    // the pending list, restoring its pure-white top line would have been WAVED
    // THROUGH by rule 1.1, because that is exactly what a pending entry licenses. So
    // the mutation below could not have been caught yesterday and can today, and the
    // gate now defends the three floating rungs the same way it defends the buttons.
    name: "put --shadow-modal's pure-white top-edge line back — the floating rung un-converts",
    check: "1.1",
    file: "src/app/globals.css",
    from: `  --shadow-modal:   var(--edge-lit-strong),\n                    0 30px 80px oklch(5% 0.05 268 / 0.65);`,
    to: `  --shadow-modal:   0 30px 80px oklch(5% 0.05 268 / 0.65), inset 0 1px 0 oklch(100% 0 0 / 0.06);`,
  },
  {
    // 🔴 THE CEILING ITSELF. --edge-shade is the ONE exception the law grants, and
    // it is granted because the value is DARK. Lighten it and it stops being the
    // absence of light and becomes a second lamp — the gate must notice, or the
    // exception becomes a hole anything can be pushed through.
    name: "lighten --edge-shade to 60% — the sunken-well exception stops being a shade",
    check: "1.3",
    file: "src/app/globals.css",
    from: `--edge-shade:      inset 0 -1px 0 oklch(6% 0.03 268 / 0.30);`,
    to: `--edge-shade:      inset 0 -1px 0 oklch(60% 0.03 268 / 0.30);`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

const GATE_SRC = "scripts/m1-even-light.test.mts";
const GATE_ORIGINAL = readFileSync(join(cwd, GATE_SRC), "utf8");

for (const [i, m] of MUTATIONS.entries()) {
  // Two kinds of mutation, and the difference is WHICH artefact is under test:
  // `css` breaks a stylesheet and asks whether the gate notices; `gate` breaks
  // the gate's own allowlist and asks whether it notices ITSELF being stale.
  const isGate = m.kind === "gate";
  const base = lf(isGate ? GATE_ORIGINAL : (ORIGINAL.get(m.file) ?? ""));
  const where = isGate ? GATE_SRC : m.file;
  if (!base.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${where} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const root = mkdtempSync(join(tmpdir(), `m1-red-${i}-`));
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
  // ⛔ EITHER WAY THE WRITE LANDS IN THE TEMP DIR, NEVER IN THE SHARED TREE. A
  // mutated gate is run from a copy under `scripts/` inside the temp root and
  // aimed back at the REAL stylesheets with M1_ROOT, so the only variable is the
  // allowlist. (The gate resolves M1_ROOT from the env, not from its own path.)
  let gateEntry = "scripts/m1-even-light.test.mts";
  if (isGate) {
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, GATE_SRC), mutated);
    gateEntry = join(root, GATE_SRC);
  } else {
    writeFileSync(join(root, m.file), mutated);
  }

  let exitCode = 0, out = "";
  try {
    out = execSync(`npx tsx "${gateEntry}"`, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, M1_ROOT: isGate ? cwd : root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  // ⛔ Demand the SHAPE: the NAMED check must be the one that failed, and the run
  // must be provably the MUTATED one. "exit 1" alone would score a crash as a catch.
  // ⚠️ The proof differs by kind, and conflating them would have made the gate
  // mutation unfalsifiable: a `css` run is aimed at the temp copy, so the root it
  // prints IS the evidence; a `gate` run is aimed at the REAL stylesheets on
  // purpose (the allowlist is the only variable), so the root proves nothing and
  // the injected entry's own label does.
  const failedCheck = new RegExp(`^\\s*FAIL ${m.check.replace(".", "\\.")} `, "m").test(out);
  const ranTheMutant = isGate ? out.includes("red-harness only") : out.includes(root);
  const ok = exitCode !== 0 && ranTheMutant && failedCheck;

  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith(`FAIL ${m.check}`)) ?? "";
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 108)}`);
  } else {
    missed.push(m.name);
    const why = !ranTheMutant
      ? (isGate ? "the MUTATED GATE did not run — its injected entry never appeared in the output" : "the gate did NOT read the mutated copy — M1_ROOT was ignored")
      : exitCode === 0
        ? "the gate PASSED over a stylesheet that breaks it"
        : `exit ${exitCode}, but check ${m.check} was not the one that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of [...ORIGINAL, [GATE_SRC, GATE_ORIGINAL]]) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the shared tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (m1-light) — ${caught}/${MUTATIONS.length} caught · src/ untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
