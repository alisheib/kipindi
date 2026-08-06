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
    name: "give .glass-panel's one-sided inset an unresolvable colour — unreadable must mean LAMP",
    check: "1.1",
    file: "src/app/globals.css",
    from: `inset 0 1px 0 oklch(100% 0 0 / 0.08)`,
    to: `inset 0 1px 0 var(--no-such-token-anywhere)`,
  },
  {
    // The stale-exemption half. Converting a pending site WITHOUT removing its
    // entry must fail — otherwise the pending count freezes and reads as "still
    // to do" long after the work is done, which is a ratchet that stopped.
    name: "convert .pbar-yes but leave its pending entry — a stale exemption",
    check: "1.2",
    file: "src/app/globals.css",
    from: `box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.22)`,
    to: `box-shadow: inset 0 0 0 1px oklch(100% 0 0 / 0.22)`,
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

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
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
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/m1-even-light.test.mts", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, M1_ROOT: root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  // ⛔ Demand the SHAPE: the NAMED check must be the one that failed, and the
  // gate must have read the copy. "exit 1" alone would score a crash as a catch.
  const failedCheck = new RegExp(`^\\s*FAIL ${m.check.replace(".", "\\.")} `, "m").test(out);
  const readTheCopy = out.includes(root);
  const ok = exitCode !== 0 && readTheCopy && failedCheck;

  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith(`FAIL ${m.check}`)) ?? "";
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 108)}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — M1_ROOT was ignored"
      : exitCode === 0
        ? "the gate PASSED over a stylesheet that breaks it"
        : `exit ${exitCode}, but check ${m.check} was not the one that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of ORIGINAL) {
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
