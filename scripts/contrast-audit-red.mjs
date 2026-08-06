/**
 * RED harness for `npm run test:contrast`.
 *
 *   node scripts/contrast-audit-red.mjs
 *
 * ⭐ WHY THIS EXISTS AT ALL. Before 2026-08-06 five of the gate's inputs were
 * typed by hand — and one of them, `--text`, had drifted to `0.97 / 0.010`
 * against a real `oklch(98% 0.012 268)`. A hand-typed input makes a contrast
 * gate UNFALSIFIABLE in the exact place it matters: you can break the token in
 * globals.css and the ratio does not move, because the ratio was never reading
 * the token. Every mutation below breaks a colour the product actually paints,
 * and a MISS means the gate is still scoring something else.
 *
 * ⛔ IT DOES NOT REWRITE globals.css. Two sessions share this working tree, and
 * the house mutate-then-restore pattern opens a window in which the other
 * session's `next build` reads a deliberately-broken stylesheet. Each mutation
 * is written to a COPY in the OS temp dir and the gate is aimed at it with
 * `CONTRAST_CSS`. The gate prints the path it read on every run, so pointing it
 * somewhere else can never be silent.
 *
 * Rules, as everywhere else in this campaign: an unmatched anchor is a BROKEN
 * HARNESS and is reported as such, not as a MISS. And "it exited non-zero" is
 * not evidence on its own — the run must also name the check that failed, or a
 * typo in the script would read as a caught defect.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GLOBALS = join(cwd, "src/app/globals.css");
const ORIGINAL = readFileSync(GLOBALS, "utf8");
const TMP = mkdtempSync(join(tmpdir(), "contrast-red-"));

/**
 * `kind` says what a catch looks like, and they are NOT the same thing:
 *   "fail"  — the gate runs and reports a contrast FAILURE (a real AA break)
 *   "throw" — the gate refuses to run at all (a parse/definition defect). A gate
 *             that shrugs and scores a default here is how the 2026-07-29 drift
 *             survived, so refusing is the correct behaviour and is asserted.
 */
const MUTATIONS = [
  {
    // 🔴 THE DRIFT ITSELF. With `text` hand-typed, this edit moved nothing.
    name: "darken --text to a mid grey — body ink that cannot be read on the canvas",
    kind: "fail",
    from: `  --text:          oklch(98% 0.012 268);`,
    to: `  --text:          oklch(30% 0.012 268);`,
  },
  {
    name: "revert .btn-yes fill to its pre-H10 57% — white label back to 4.05",
    kind: "fail",
    from: `  background: oklch(53% 0.155 150);`,
    to: `  background: oklch(57% 0.155 150);`,
  },
  {
    name: "lighten .btn-no fill — the NO button's label stops clearing AA",
    kind: "fail",
    from: `  background: oklch(56% 0.200 25);`,
    to: `  background: oklch(72% 0.200 25);`,
  },
  {
    name: "revert --danger-500 to its pre-H10 60% — white label back to 4.28",
    kind: "fail",
    from: `  --danger-500:  oklch(57% 0.22 25);`,
    to: `  --danger-500:  oklch(66% 0.22 25);`,
  },
  {
    name: "dim --pearl-50 — every solid button label at once",
    kind: "fail",
    from: `  --pearl-50:    oklch(99% 0.006 268);`,
    to: `  --pearl-50:    oklch(64% 0.006 268);`,
  },
  {
    // The gold pairs had NEVER been checked. This proves they are checked now.
    name: "darken --gilt to 45% — money ink on the canvas (M4: money is read)",
    kind: "fail",
    from: `  --gilt:          oklch(86% 0.13 82);`,
    to: `  --gilt:          oklch(45% 0.13 82);`,
  },
  {
    name: "darken --gold-500 — .btn-gold's own dark label on its own fill",
    kind: "fail",
    from: `  --gold-500: oklch(72% 0.14 78);`,
    to: `  --gold-500: oklch(38% 0.14 78);`,
  },
  {
    // ⛔ INTAKE §2a, the trap ATOM 2a walks into next: the browser takes the
    // LAST declaration, this gate takes the FIRST. Before ATOM 2d the gate
    // scored the top copy and said PASS while the product rendered the bottom.
    name: "re-declare --bg at the top of :root instead of editing line 244 (INTAKE §2a)",
    kind: "throw",
    from: `  --gold-50:  oklch(98% 0.025 82);`,
    to: `  --bg: oklch(45% 0.130 268);\n  --gold-50:  oklch(98% 0.025 82);`,
  },
  {
    // A control whose fill stops being scoreable must STOP the gate, not be
    // skipped. A silently-skipped control is a green tick over an unread label.
    name: "make .btn-gold's fill a color-mix() the parser cannot score",
    kind: "throw",
    from: `  background: var(--gold-500);\n  color: var(--gold-fg);`,
    to: `  background: color-mix(in oklab, var(--gold-500) 90%, black);\n  color: var(--gold-fg);`,
  },
  {
    name: "rename --gilt out from under the gate — a token the gate names must exist",
    kind: "throw",
    from: `  --gilt:          oklch(86% 0.13 82);`,
    to: `  --gilt-legacy:   oklch(86% 0.13 82);`,
  },
];

// ⛔ Normalise line endings before matching — a tracked CRLF file makes a
// multi-line `\n` anchor match NOTHING, the copy is written unchanged, and the
// run reports MISS as if the gate were weak. That trap has cost this campaign
// three sessions.
const lf = (s) => s.replace(/\r\n/g, "\n");
const base = lf(ORIGINAL);

let caught = 0;
const missed = [];

for (const [i, m] of MUTATIONS.entries()) {
  if (!base.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const path = join(TMP, `globals-${i}.css`);
  const mutated = base.replace(m.from, m.to);
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(path, mutated);

  let exitCode = 0;
  let out = "";
  try {
    out = execSync("npx tsx scripts/contrast-audit.mts", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CONTRAST_CSS: path },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  // ⛔ "exit non-zero" alone is not evidence. A gate that crashed on a typo
  // would score as a catch. Demand the SHAPE the mutation should produce.
  const named = /^FAIL\s+(.+?)\s+([\d.]+) \(need/m.exec(out);
  // ⛔ ANCHOR ON `Error:`, NOT ON THE MESSAGE TEXT. The first version of this
  // line was `/contrast-audit: .+/` and it matched the SOURCE ECHO tsx prints
  // above a stack trace — the literal `contrast-audit: --${name} is not
  // declared in ${GLOBALS}` from the file, un-interpolated. It scored a catch
  // off a template literal it had read rather than an error the gate had
  // thrown, which is a check that passes without testing what it names.
  const threw = /(?:^|\n)(?:Error|\w*Error): (contrast-audit: [^\n]+)/.exec(out);
  const readTheCopy = out.includes(path);
  const ok =
    exitCode !== 0 &&
    readTheCopy &&
    (m.kind === "fail" ? Boolean(named) : Boolean(threw) && !named);

  if (ok) {
    caught++;
    const why = m.kind === "fail" ? `FAIL ${named[1].trim()} → ${named[2]}` : `refused: ${threw[1].slice(0, 110)}`;
    console.log(`  ✓ RED  ${m.name}\n         → ${why}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — CONTRAST_CSS was ignored"
      : `exit ${exitCode}, expected a ${m.kind.toUpperCase()}`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

// The tree is never touched, but assert it anyway: a harness that claims not to
// mutate is exactly the claim worth checking.
if (readFileSync(GLOBALS, "utf8") !== ORIGINAL) {
  console.log("\n⛔ globals.css CHANGED. This harness must never write to the shared tree.");
  process.exit(1);
}

console.log(`\nRED HARNESS (contrast) — ${caught}/${MUTATIONS.length} caught · globals.css untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
