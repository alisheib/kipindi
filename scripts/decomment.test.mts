/**
 * THE COMMENT-STRIPPER GUARD.                              `npm run test:decomment`
 *
 * Almost every static guard in this repo greps source for a defect, and almost
 * every one must remove comments first, because this repo documents its traps in
 * prose — a guard that greps raw text matches the paragraph explaining the fix
 * instead of the fix. That helper was copy-pasted into 23 files in FOUR spellings.
 *
 * ⭐ WHY A GUARD AND NOT JUST A SHARED MODULE. A comment stripper is invisible
 * infrastructure: when it silently reads less than it should, every gate built on
 * it prints ALL PASS over the hole, which is indistinguishable from health. That
 * is exactly what `E-186` was — 7,581 characters of `src` unreadable to three
 * checks that all reported PASS. So the stripper needs a test of its own, and the
 * test needs to prove the BLINDNESS is real rather than assert it in prose.
 *
 * ⛔ WHAT THIS FILE PINS, WHICH IS NOT WHAT `E-186` CONCLUDED. That finding's
 * repair was "strip line comments FIRST, then block comments." Measured on
 * 2026-08-23, that repair is blind in the opposite direction and this repo really
 * does trip it — see §5, which re-derives the whole thing from source rather than
 * quoting a number. There is no safe ORDER. §1 pins the SCANNER.
 *
 * ⛔ EVERY "keeps" ASSERTION HERE IS PAIRED WITH A CONTROL THAT MUST FAIL IF THE
 * STRIPPER STOPS STRIPPING. A helper that returns its input unchanged would
 * satisfy every "this survived" check in §1 while asserting nothing at all; §1.4
 * and §1.5 are what make the rest of §1 mean something.
 *
 * `DECOMMENT_ROOT` aims the file-scanning halves (§2, §4, §5) at a COPY of the
 * tree, the way `MEASURE_ROOT` does for `test:measure`, so `red:decomment` can
 * prove each check without writing to `src/`. The root is printed on every run,
 * so aiming it elsewhere can never be silent.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment, BLIND } from "./lib/decomment.mts";

const ROOT = process.env.DECOMMENT_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCRIPTS = join(ROOT, "scripts");
const SRC = join(ROOT, "src");

let pass = 0, fail = 0;
const log = (m: string) => console.log(m);
const section = (t: string) => log(`\n── ${t} ${"─".repeat(Math.max(0, 74 - t.length))}`);
function check(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; log(`  PASS ${label}`); }
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Comment-stripper guard");
log(`  root: ${ROOT}${process.env.DECOMMENT_ROOT ? "   (DECOMMENT_ROOT override)" : ""}`);

function walk(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, re, out);
    else if (re.test(e)) out.push(p);
  }
  return out;
}
const BS = String.fromCharCode(92);
const rel = (p: string) => p.split(BS).join("/").replace(ROOT.split(BS).join("/").replace(/\/$/, "") + "/", "");

// ── 1 · The shared helper is right in BOTH directions ───────────────────────────
section("1 · the scanner survives both hazards, and still actually strips");

// A `/*` inside a `//` line comment. Faithful to src/app/proposals/page.tsx, which
// is where E-186 was found: block-comments-first reads this as a comment opener.
const HAZARD_A = [
  '// an honest, guided "not available" state — deep links to /proposals/* are',
  'const KEEP_A = "max-w-[1080px]";',
  "/* an ordinary block comment later in the file */",
  "const TAIL_A = 1;",
].join("\n");

// A `//` inside a block comment that closes on the SAME line, with another block
// comment later for the orphaned opener to run to. Faithful to
// scripts/criterion-i18n.test.mts, where this costs 7,488 characters.
const HAZARD_B = [
  "/** a claim in a `//` line must never satisfy a check. */",
  'const KEEP_B = "real code";',
  "/* an ordinary block comment later in the file */",
  "const TAIL_B = 2;",
].join("\n");

check("1.1 a `/*` inside a `//` line does not swallow the code after it",
  decomment(HAZARD_A).includes("KEEP_A") && decomment(HAZARD_A).includes("TAIL_A"),
  "this is E-186: block-comments-first opens a comment nobody wrote");

check("1.2 a `//` inside a block comment does not swallow that block's terminator",
  decomment(HAZARD_B).includes("KEEP_B") && decomment(HAZARD_B).includes("TAIL_B"),
  "this is the hazard the E-186 repair introduced — line-comments-first eats the `*/`");

check("1.3 a `://` URL is not mistaken for a line comment",
  decomment('const u = "https://50pick.tz/help";').includes("50pick.tz/help"));

// ⛔ THE CONTROLS. Without these, a helper that returned its input unchanged would
// pass 1.1, 1.2 and 1.3 — and assert nothing whatsoever.
check("1.4 CONTROL: a line comment really is removed",
  !decomment("const a = 1; // seedHistory is fabricated here").includes("seedHistory"),
  "if this passes trivially, every `survives` check above is vacuous");

check("1.5 CONTROL: a block comment really is removed",
  !decomment("const a = 1; /* seedHistory is fabricated here */").includes("seedHistory"),
  "if this passes trivially, every `survives` check above is vacuous");

check("1.6 CONTROL: an unterminated block runs to EOF, as a compiler would read it",
  !decomment("const a = 1; /* opened and never closed\nconst b = 2;").includes("const b"));

// ── 2 · Nobody carries a private copy any more ──────────────────────────────────
section("2 · one helper, imported — not twenty-three copies");

// ⛔ COUNT BY THE ORDERING AS A FIXED STRING, NEVER BY THE NAME `decomment`.
// A name-based grep undercounts: the copies were spelled `decomment`,
// `stripComments`, and inline, and on 2026-08-22 grepping the name said 18 when
// the true population was 22. These are the two orderings, both retired.
const BLOCK_FIRST = String.raw`s.replace(/\/\*[\s\S]*?\*\//g, "").replace(`;
const LINE_FIRST = String.raw`s.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*`;

// The only files allowed to spell an ordering: the module that keeps them as
// EVIDENCE, the mutation anchors that re-introduce them to prove they are blind,
// and this file, whose §2 has to name them in order to search for them.
const SPELLING_ALLOWED = new Set([
  "scripts/lib/decomment.mts",
  "scripts/anchors/decomment.anchors.mjs",
  "scripts/decomment.test.mts",
]);

/**
 * ⛔ THE STRIPPERS THAT HAVE NOT MOVED YET. MAY ONLY SHRINK.
 *
 * ⚠️ **THE POPULATION WAS BIGGER THAN THE FIXED-STRING COUNT SAID.** `E-186` told
 * the next session to count these by searching for the ORDERING as a fixed string,
 * because grepping the NAME `decomment` undercounts. That advice is right about the
 * name and WRONG about the total: the fixed string finds 22, and there are 39.
 * `orphan-actions.test.mts` carried the identical two-regex ordering and was missed
 * only because it spells the parameter `src` instead of `s`; the rest pad comments
 * with spaces, use a lookbehind, or add a JSX clause. **A stripper is a SHAPE, not a
 * string** — which is why 2.2 looks for the declaration and not for the body.
 *
 * ⭐ EVERY ONE OF THESE 14 ALSO STRIPS BLOCK COMMENTS FIRST, so all of them carry
 * the `E-186` blindness. They are filed rather than half-converted because their
 * OUTPUT semantics genuinely differ from `decomment`'s, and swapping them blind
 * would change what their gates read:
 *
 *   · six pad each comment with SPACES to preserve byte offsets, because they slice
 *     the source by index afterwards. They need a `blankComments()` built on the
 *     same scanner — it does not exist yet, and adding an unused export is not a fix.
 *   · five substitute a single `" "` so two tokens either side cannot fuse.
 *   · two strip deliberately LESS than a full stripper would, and tightening them
 *     is a change to what those gates assert, not to how they read.
 *   · one is plain `.mjs` run by `node`, which cannot import a `.mts` module at all.
 *
 * ⛔ Do not "tidy" any of them into `decomment` without capturing that gate's full
 * output before and after and reading the diff. That is how the three that DID move
 * were proven safe — and how `market-override-scope` was caught reading 4 characters
 * more (two `{}` its JSX clause used to delete), which was checked before it shipped.
 */
const STRIPPER_RATCHET = new Set([
  // ── Pad with spaces to preserve byte offsets; they slice by index ──────────
  "scripts/admin-act-gate.test.mts",
  "scripts/admin-soft-gate.test.mts",
  "scripts/design-frozen.test.mts",
  "scripts/label-lexicon.test.mts",
  "scripts/stacking-contract.test.mts",
  "scripts/tap-target.test.mts",
  // ── Substitute a single " " so tokens either side cannot fuse ─────────────
  "scripts/chat-availability.test.mts",
  "scripts/market-result-announce.test.mts",
  "scripts/updown-movement.test.mts",
  "scripts/updown-pricing.test.mts",
  "scripts/updown-result-announce.test.mts",
  // ── Deliberately partial: tightening them changes what the gate asserts ────
  "scripts/failure-reasons.test.mts",      // whole-line `//` only, split-based
  "scripts/token-collision.test.mts",      // block comments only
  // ── Plain node: cannot import a .mts module ───────────────────────────────
  "scripts/orphan-scripts.mjs",
]);

const scriptFiles = walk(SCRIPTS, /\.(mts|mjs)$/);
const spelled = scriptFiles.map(rel).filter((f) => !SPELLING_ALLOWED.has(f))
  .filter((f) => {
    const s = readFileSync(join(ROOT, f), "utf8");
    return s.includes(BLOCK_FIRST) || s.includes(LINE_FIRST);
  });
check("2.1 no script spells a comment-stripping ORDER of its own",
  spelled.length === 0,
  spelled.length ? `${spelled.length}: ${spelled.join(", ")}` : "");

// ⛔ Look for the SHAPE — a declaration — not for any spelling of the body. The
// body is what both previous counts keyed on, and both undercounted.
const defined = scriptFiles.map(rel).filter((f) => !SPELLING_ALLOWED.has(f))
  .filter((f) => /(?:^|\n)\s*(?:const|function)\s+(?:decomment|stripComments)\s*[=(]/
    .test(readFileSync(join(ROOT, f), "utf8")));
const unratcheted = defined.filter((f) => !STRIPPER_RATCHET.has(f));
check("2.2 no NEW script defines a comment stripper of its own",
  unratcheted.length === 0,
  unratcheted.length ? `${unratcheted.length} not on the ratchet: ${unratcheted.join(", ")}` : "");

const goneFromRatchet = [...STRIPPER_RATCHET].filter((f) => !defined.includes(f));
check(`2.2b the ratchet may only SHRINK (${defined.length} private strippers left, ratchet lists ${STRIPPER_RATCHET.size})`,
  goneFromRatchet.length === 0,
  goneFromRatchet.length
    ? `these moved to the shared helper — delete them from STRIPPER_RATCHET: ${goneFromRatchet.join(", ")}`
    : "");

const importers = scriptFiles.map(rel)
  .filter((f) => readFileSync(join(ROOT, f), "utf8").includes('from "./lib/decomment.mts"'));
check(`2.3 CONTROL: the shared helper is actually imported (${importers.length} scripts)`,
  importers.length >= 20,
  "If nothing imports it, 2.1 and 2.2 pass because the strippers were deleted, not shared.");
check(`2.4 CONTROL: the scan read a plausible number of scripts (${scriptFiles.length})`,
  scriptFiles.length > 100,
  "A near-empty walk makes 2.1 and 2.2 assert nothing.");

// ── 3 · The two retired orders really ARE blind ─────────────────────────────────
section("3 · the blindness is demonstrated, not asserted in prose");

check("3.1 block-comments-first loses the code after a `/*` in a `//` line   (E-186)",
  !BLIND.blockFirst(HAZARD_A).includes("KEEP_A"),
  "If this fails, HAZARD_A stopped reproducing the bug and 1.1 proves nothing.");

check("3.2 line-comments-first loses the code after a `//` inside a block comment",
  !BLIND.lineFirst(HAZARD_B).includes("KEEP_B"),
  "If this fails, HAZARD_B stopped reproducing the bug and 1.2 proves nothing.");

check("3.3 …and each retired order is FINE on the other's hazard — neither is simply worse",
  BLIND.blockFirst(HAZARD_B).includes("KEEP_B") && BLIND.lineFirst(HAZARD_A).includes("KEEP_A"),
  "This is the point: an ORDER is a choice of which blindness to have, not a fix.");

// ── 4 · The equivalence claim is re-derived over src/, not quoted ────────────────
section("4 · adopting the scanner changed no verdict — measured, not asserted");

const srcFiles = walk(SRC, /\.(tsx?|mts)$/);
const differs: string[] = [];
let blockFirstLoss = 0;
const holed: string[] = [];
for (const f of srcFiles) {
  const s = readFileSync(f, "utf8");
  const good = decomment(s);
  if (good !== BLIND.lineFirst(s)) differs.push(rel(f));
  const d = good.length - BLIND.blockFirst(s).length;
  if (d !== 0) { blockFirstLoss += d; holed.push(rel(f)); }
}
// ⛔ A TRIPWIRE, NOT A BUG REPORT. This pins the claim that swapping in the scanner
// changed no gate's verdict on the day it landed. If it ever fails, the scanner is
// still the correct one — what has happened is that some file in src/ gained a `//`
// inside a block comment, i.e. a construct the retired repair would have been BLIND
// over. Read the named files, confirm that is what they contain, then re-baseline
// this check with the reason written here. Do not "fix" it by changing the scanner.
check(`4.1 the scanner is byte-identical to the E-186 repair across all of src/ (${srcFiles.length} files)`,
  differs.length === 0,
  differs.length
    ? `differs in ${differs.length}: ${differs.slice(0, 5).join(", ")} — the scanner is still right; ` +
      "these files gained a construct line-comments-first would have been blind over. Re-baseline with a reason."
    : "");
check(`4.2 CONTROL: src/ was actually walked (${srcFiles.length} files)`, srcFiles.length > 500);
log(`  note  the retired block-first order is blind over ${holed.length} file(s), ${blockFirstLoss} characters:`);
for (const f of holed) log(`          ${f}`);

// ── 5 · scripts/ is in scope, so the reverse hazard is not hypothetical ─────────
section("5 · why the fix is a scanner and not a flip");

// `pii-in-logs.test.mts` §3 strips comments from every top-level script. So the
// files a stripper must read correctly include this repo's own guards — and those
// are full of prose that quotes comment syntax on purpose.
const piiSrc = readFileSync(join(SCRIPTS, "pii-in-logs.test.mts"), "utf8");
check("5.1 a guard really does strip comments from scripts/, not only from src/",
  /readdirSync\(join\(root, "scripts"\)\)/.test(piiSrc),
  "pii-in-logs §3 scans scripts/*.mts; if that stopped, 5.2 is about nothing.");

let worst = { f: "", loss: 0 };
for (const f of scriptFiles) {
  const s = readFileSync(f, "utf8");
  const loss = decomment(s).length - BLIND.lineFirst(s).length;
  if (loss > worst.loss) worst = { f: rel(f), loss };
}
check(`5.2 the E-186 repair would go blind over a script this repo really reads`,
  worst.loss > 500,
  "If nothing trips it any more, keep the scanner anyway — but re-derive this note.");
log(`  note  worst case: ${worst.f} — ${worst.loss} characters lost to line-comments-first`);

const scanSet = readdirSync(SCRIPTS).filter((f) => /\.(mts|mjs)$/.test(f)).map((f) => `scripts/${f}`);
check("5.3 …and that script is inside the set pii-in-logs §3 scans",
  worst.f !== "" && scanSet.includes(worst.f),
  `${worst.f} is not in the ${scanSet.length}-file scan set`);

log(`\n${fail === 0 ? "ALL PASS" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
