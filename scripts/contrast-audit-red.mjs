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
 * ⛔ IT DOES NOT REWRITE THE STYLESHEETS. Two sessions share this working tree,
 * and the house mutate-then-restore pattern opens a window in which the other
 * session's `next build` reads a deliberately-broken stylesheet. Each mutation
 * is written to a COPY of the WHOLE CORPUS in the OS temp dir and the gate is
 * aimed at it with `CONTRAST_ROOT`. The gate prints every path it read on every
 * run, so pointing it somewhere else can never be silent.
 *
 * ⚠️ IT USED TO AIM AT ONE FILE (`CONTRAST_CSS`), and that stopped being safe the
 * moment the gate grew a second stylesheet (ATOM 8). A one-file override made the
 * gate skip its four support-chat checks — so this harness would have reported a
 * full sheet of catches while the controls E-121 was FILED against were not in
 * the run at all. A harness must exercise the gate that ships, not a subset of it.
 *
 * Rules, as everywhere else in this campaign: an unmatched anchor is a BROKEN
 * HARNESS and is reported as such, not as a MISS. And "it exited non-zero" is
 * not evidence on its own — the run must also name the check that failed, or a
 * typo in the script would read as a caught defect.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/**
 * The gate's corpus, in the gate's own order — IMPORTED, never re-listed.
 * 🔴 This file used to carry its own copy of the list, and on 2026-08-07 the gate
 * gained a fourth sheet (`motion.css`, because §C put the money CTA there). This
 * harness went from **21/21 caught to 0/21** in that one edit: it was still copying
 * three files, so every mutation ran against a corpus the gate refused to start on —
 * and "0/21" is indistinguishable from "the gate has stopped working". One definition,
 * imported by both, is the same repair E-108 forced on the handoff locator.
 */
import { CONTRAST_CORPUS as CORPUS } from "./contrast-corpus.mjs";
const ORIGINALS = new Map(CORPUS.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));
const GLOBALS = join(cwd, "src/app/globals.css");
const ORIGINAL = ORIGINALS.get("src/app/globals.css");
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
    // ⚠️ RE-ANCHORED at ATOM 12 — --gilt is now the ALIAS var(--gold-300), so the
    // way to darken money ink is to darken the ramp step it points at. ⭐ That is a
    // STRONGER mutation than the old one: it only fails if the gate followed the
    // var() chain, which is machinery ATOM 8 had to add.
    from: `  --gold-300: oklch(86% 0.110 84);`,
    to: `  --gold-300: oklch(45% 0.110 84);`,
  },
  {
    name: "darken --gold-500 — .btn-gold's own dark label on its own fill",
    kind: "fail",
    from: `  --gold-500: oklch(72% 0.114 84);`,
    to: `  --gold-500: oklch(38% 0.114 84);`,
  },
  {
    // 🔴 E-119 ITSELF, PUT BACK. This is the falsifiable half of ATOM 3: if the
    // gradient parser were not reading `.btn-primary`'s ramp, restoring the 60%
    // light stop would move nothing — which is exactly the state the gate was in
    // before, when it had no way to score a gradient at all.
    name: "restore .btn-primary's 60% light stop — E-119, the white label back to 4.0",
    kind: "fail",
    from: `  background: linear-gradient(180deg, oklch(53% 0.20 268) 0%, oklch(48% 0.20 268) 100%);`,
    to: `  background: linear-gradient(180deg, oklch(60% 0.20 268) 0%, oklch(48% 0.20 268) 100%);`,
  },
  {
    // The hover half. A filter is a RASTER effect, so nothing that reads the
    // stylesheet can see it without simulating it — and an unexercised simulation
    // is indistinguishable from one that returns the resting number.
    name: "crank .btn-primary's hover brightness to 1.30 — a raster-only failure",
    kind: "fail",
    from: `.btn-primary:hover:not(:disabled) { filter: brightness(var(--btn-hover-gain))`,
    to: `.btn-primary:hover:not(:disabled) { filter: brightness(1.30)`,
  },
  {
    // A ramp whose stops cannot all be resolved must STOP the gate. Scoring the
    // two stops out of three that happen to be literals reports a number for a
    // surface only partly read — the shape of defect E-118 fixed next door.
    name: "make one of .btn-primary's gradient stops an unscoreable color-mix()",
    kind: "throw",
    from: `oklch(53% 0.20 268) 0%, oklch(48% 0.20 268) 100%);`,
    to: `oklch(53% 0.20 268) 0%, color-mix(in oklab, oklch(48% 0.20 268) 80%, black) 100%);`,
  },
  {
    // ⛔ A FILTER FUNCTION THIS MODEL DOES NOT IMPLEMENT MUST REFUSE, NOT ROUND
    // DOWN TO 1.0. `contrast()` would quietly change what the eye receives and
    // the gate would keep printing the resting ratio over it.
    name: "add an unmodelled contrast() to .btn-primary's hover filter",
    kind: "throw",
    from: `.btn-primary:hover:not(:disabled) { filter: brightness(var(--btn-hover-gain))`,
    to: `.btn-primary:hover:not(:disabled) { filter: contrast(0.4) brightness(var(--btn-hover-gain))`,
  },
  {
    // 🔴 E-120 ITSELF, PUT BACK — and this one mutation breaks FOUR buttons at
    // once, which is the whole argument for the gain being a single token: a
    // per-rule literal can only be wrong one button at a time, but it can also
    // only be FIXED one button at a time, and that is how three of five drifted
    // under the floor without anyone choosing it.
    name: "raise --btn-hover-gain to 1.20 — the whole solid family loses AA on hover",
    kind: "fail",
    from: `  --btn-hover-gain: 1.03;`,
    to: `  --btn-hover-gain: 1.20;`,
  },
  {
    // A hover gain that is not a number must STOP the gate. `Number("")` is 0,
    // which would model a hover that paints the button BLACK and print a
    // flattering ratio for it — a default is never the safe answer here.
    name: "make --btn-hover-gain non-numeric — an unreadable AA input",
    kind: "throw",
    from: `  --btn-hover-gain: 1.03;`,
    to: `  --btn-hover-gain: var(--something-else);`,
  },
  {
    // INTAKE §2a applies to a NUMERIC token exactly as it does to a colour: the
    // browser takes the last declaration and this gate takes the first.
    name: "re-declare --btn-hover-gain a second time (INTAKE §2a, numeric)",
    kind: "throw",
    from: `  --btn-hover-gain: 1.03;`,
    to: `  --btn-hover-gain: 1.03;\n  --btn-hover-gain: 1.25;`,
  },
  {
    // ⛔ INTAKE §2a, the trap ATOM 2a walks into next: the browser takes the
    // LAST declaration, this gate takes the FIRST. Before ATOM 2d the gate
    // scored the top copy and said PASS while the product rendered the bottom.
    name: "re-declare --bg at the top of :root instead of editing line 244 (INTAKE §2a)",
    kind: "throw",
    // ⚠️ RE-ANCHORED at ATOM 12: the gold ramp moved to hue 84 on the MEASURED
    // trademark (E-124), so the old literal is gone. Any `:root` line serves —
    // this mutation is about the DUPLICATE `--bg`, not about gold.
    from: `  --gold-50:  oklch(98% 0.030 84);`,
    to: `  --bg: oklch(45% 0.130 268);\n  --gold-50:  oklch(98% 0.030 84);`,
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
    // ⚠️ RE-ANCHORED at ATOM 12: --gilt is now an ALIAS, var(--gold-300) — which
    // is itself worth exercising, because the gate had to learn to follow a var()
    // chain to score it at all.
    from: `  --gilt:          var(--gold-300);`,
    to: `  --gilt-legacy:   var(--gold-300);`,
  },

  // ── The support chat — the second stylesheet (ATOM 8 · E-121) ──────────────
  {
    // 🔴 E-121 ITSELF, PUT BACK. This is the declaration that shipped: the hover
    // swaps the fill to a LIGHTER blue under a white glyph, 3.58 → 2.55 against a
    // 3.0 floor. ⛔ If the corpus were still one file this mutation would change
    // nothing the gate reads, which is precisely why the defect survived — so a
    // MISS here means the second sheet is not really in the run.
    // ⚠️ THE FILTER STAYS. Removing it as well makes the gate REFUSE (no filter to
    // read) — a different signal that would have hidden what this is testing. The
    // mutation under test is the FILL SWAP, and it must be scored, not dodged.
    name: "E-121 restored — .cm-send:hover swaps its fill to the lighter --brand-400",
    kind: "fail",
    file: "src/styles/chat/chat-styles.css",
    from: `  filter: brightness(var(--btn-hover-gain));\n  transform: translateY(-1px);`,
    to: `  filter: brightness(var(--btn-hover-gain));\n  background: var(--brand-400);\n  transform: translateY(-1px);`,
  },
  {
    // The rest state, so the pair is covered in both directions: a fill two steps
    // lighter fails even without a hover.
    name: ".cm-send's resting fill lightened to --brand-300 — the glyph goes under 3.0",
    kind: "fail",
    file: "src/styles/chat/chat-styles.css",
    from: `  background: var(--brand-500);\n  color: #fff;`,
    to: `  background: var(--brand-300);\n  color: #fff;`,
  },
  {
    // ⭐ THE HEX PARSER, WHICH IS NEW AND THEREFORE UNPROVEN. `#fff` is the first
    // hex this gate has ever read, and if `parseHex()` returned white for anything
    // hex-shaped the gate would score 3.58 whatever the glyph became.
    // ⚠️ THE FIRST VERSION OF THIS MUTATION WAS WRONG AND THE HARNESS WAS AT
    // FAULT, NOT THE GATE: it used `#222`, a near-BLACK glyph, which on a mid-blue
    // fill measures 4.55 and correctly PASSES. Dark ink on mid ink is legible.
    // `#888` is chosen because its luminance sits almost exactly on --brand-500's,
    // so the true ratio is ~1.0 — and a parser that shrugged and returned white
    // would score 3.58 and pass. It can only fail if the VALUE was read.
    name: "make .cm-send's glyph #888 — the hex parser must read the VALUE, not just the shape",
    kind: "fail",
    file: "src/styles/chat/chat-styles.css",
    from: `  color: #fff;\n  border: 1px solid var(--brand-400);`,
    to: `  color: #888;\n  border: 1px solid var(--brand-400);`,
  },
  {
    // A chat control that stops being scoreable must STOP the gate, exactly as a
    // globals one does. The two sheets are not held to different standards.
    name: "make .cm-escalate's ramp unscoreable — the chat sheet gets no softer treatment",
    kind: "throw",
    file: "src/styles/chat/chat-styles.css",
    from: `  background: linear-gradient(180deg, var(--claret-hover), var(--claret));`,
    to: `  background: linear-gradient(180deg, color-mix(in oklab, var(--claret-hover) 80%, black), var(--claret));`,
  },
  {
    // ── §C's MONEY CONTROL (2026-08-07, ATOM C) ──────────────────────────────
    // ⭐ THE FOURTH SHEET, PROVEN READ. `.gilt-metal` lives in `motion.css`, which this
    // gate could not see until ATOM C, and a control the gate cannot see is a control
    // it cannot fail on — E-121's whole lesson. Lightening the ink on the earned-money
    // CTA can only be caught if `motion.css` is genuinely in the corpus.
    name: "lighten .gilt-metal's ink to near-white — the money CTA's label goes unreadable",
    kind: "fail",
    file: "src/app/motion.css",
    from: `  color: var(--gold-fg);`,
    to: `  color: oklch(96% 0.02 84);`,
  },
  {
    // ⭐ AND THE RAMP ITSELF, WHICH LIVES IN A TOKEN RATHER THAN IN THE RULE.
    // `tokenGradient()` was added for exactly this shape: `.gilt-metal` says
    // `background-image: var(--gilt-sheen), var(--gilt-metal)`, so the ramp a label
    // sits on is the TOKEN's value. Darkening the body stop must move the number, or
    // the pair is decorative — the same "scored on one stop / not scored at all" hole
    // that let `.btn-primary` ship at 4.0:1 (E-119).
    name: "darken --gilt-metal's body stop to 28% — the token ramp must actually be read",
    kind: "fail",
    file: "src/app/globals.css",
    from: `                 oklch(91% 0.090 84) 0%, oklch(79% 0.114 84) 48%,`,
    to: `                 oklch(91% 0.090 84) 0%, oklch(28% 0.114 84) 48%,`,
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
  // ⛔ A mutation may name ANY sheet in the corpus. Defaulting to globals kept the
  // old anchors working unchanged while letting the chat mutations exist at all.
  const file = m.file ?? "src/app/globals.css";
  const fileBase = lf(ORIGINALS.get(file) ?? "");
  if (!fileBase.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  // A ROOT per mutation, holding a copy of the whole corpus with exactly one
  // sheet altered — so the gate under test is byte-for-byte the shipping gate.
  const root = join(TMP, `root-${i}`);
  for (const f of CORPUS) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    cpSync(join(cwd, f), join(root, f));
  }
  const mutated = fileBase.replace(m.from, m.to);
  if (mutated === fileBase) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(join(root, file), mutated);
  const path = root;

  let exitCode = 0;
  let out = "";
  try {
    out = execSync("npx tsx scripts/contrast-audit.mts", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CONTRAST_ROOT: root },
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
      ? "the gate did NOT read the mutated copy — CONTRAST_ROOT was ignored"
      : `exit ${exitCode}, expected a ${m.kind.toUpperCase()}`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

// The tree is never touched, but assert it anyway: a harness that claims not to
// mutate is exactly the claim worth checking. ⚠️ ALL THREE SHEETS, not just
// globals — the corpus grew and this assertion did not, briefly, which would have
// let a chat mutation write to the shared tree unnoticed.
for (const [f, text] of ORIGINALS) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the shared tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (contrast) — ${caught}/${MUTATIONS.length} caught · ${ORIGINALS.size} sheet(s) untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
