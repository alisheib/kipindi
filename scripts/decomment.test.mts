/**
 * THE COMMENT-STRIPPER GUARD.                              `npm run test:decomment`
 *
 * Almost every static guard here greps source for a defect, and almost every one
 * must remove comments first, because this repo documents its traps in prose — a
 * guard that greps raw text matches the paragraph explaining the fix instead of the
 * fix. That helper was copy-pasted across the script fleet in four spellings.
 *
 * ⭐ WHY A GUARD AND NOT JUST A SHARED MODULE. A comment stripper is invisible
 * infrastructure: when it silently reads less than it should, every gate built on it
 * prints ALL PASS over the hole, which is indistinguishable from health. That was
 * `E-186` (7,581 characters of `src` unreadable to three checks that all passed),
 * and then `E-189` — the first version of the shared scanner had no string-literal
 * state, so a `/*` inside a template literal opened a block comment that ran to EOF
 * and flipped a real `pii-in-logs` verdict. Both were found by mutation, not review.
 *
 * ⛔ THREE THINGS THIS FILE HAS ALREADY BEEN WRONG ABOUT. They are written here
 * because each was corrected by measurement after being asserted confidently:
 *   · "flip the two replaces" — no. Each ORDER is blind in one direction (§3).
 *   · "count the ORDERING as a fixed string" — no. That finds 22; the population is
 *     40, and inline copies have no declaration at all. **A stripper is a SHAPE.**
 *     §2 counts by shape, over every script extension, and cannot be dodged by
 *     renaming the helper or by inlining it.
 *   · "a .mjs cannot import a .mts module" — false on Node 24, which this repo pins.
 *
 * ⛔ EVERY "keeps" ASSERTION IS PAIRED WITH A CONTROL THAT MUST FAIL IF THE STRIPPER
 * STOPS STRIPPING. A helper returning its input unchanged would satisfy every
 * "this survived" check in §1 while asserting nothing; §1.7 and §1.8 stop that.
 *
 * `DECOMMENT_ROOT` aims the file-scanning halves at a COPY of the tree, the way
 * `MEASURE_ROOT` does for `test:measure`, so `red:decomment` can prove each check
 * without writing to `src/`. The root is printed on every run.
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

const BS = String.fromCharCode(92);
const BT = String.fromCharCode(96);
const rel = (p: string) => p.split(BS).join("/").replace(ROOT.split(BS).join("/").replace(/\/$/, "") + "/", "");
function walk(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, re, out);
    else if (re.test(e)) out.push(p);
  }
  return out;
}

// ── 1 · behaviour ───────────────────────────────────────────────────────────────
section("1 · the scanner survives every hazard, and still actually strips");

const HAZARD_A = [
  '// an honest, guided "not available" state — deep links to /proposals/* are',
  'const KEEP_A = "max-w-[1080px]";',
  "/* an ordinary block comment later in the file */",
  "const TAIL_A = 1;",
].join("\n");

const HAZARD_B = [
  "/** a claim in a `//` line must never satisfy a check. */",
  'const KEEP_B = "real code";',
  "/* an ordinary block comment later in the file */",
  "const TAIL_B = 2;",
].join("\n");

// E-189: a comment delimiter inside a STRING, with a later block comment for the
// bogus opener to run to. This is the shape that flipped a live pii-in-logs verdict.
const HAZARD_C = [
  'const msg = "expected redirect to /auth/*, landed on x";',
  "const KEEP_C = 3;",
  "/* an ordinary block comment later in the file */",
  "const TAIL_C = 4;",
].join("\n");

const HAZARD_D = [
  "const msg = " + BT + "expected redirect to /auth/*, landed on ${url}" + BT + ";",
  "const KEEP_D = 5;",
  "/* an ordinary block comment later in the file */",
  "const TAIL_D = 6;",
].join("\n");

check("1.1 a `/*` inside a `//` line does not swallow the code after it   (E-186)",
  decomment(HAZARD_A).includes("KEEP_A") && decomment(HAZARD_A).includes("TAIL_A"));

check("1.2 a `//` inside a block comment does not swallow that block's terminator",
  decomment(HAZARD_B).includes("KEEP_B") && decomment(HAZARD_B).includes("TAIL_B"));

check("1.3 a comment delimiter inside a STRING literal opens nothing   (E-189)",
  decomment(HAZARD_C).includes("KEEP_C") && decomment(HAZARD_C).includes("TAIL_C"),
  "this is the regression that flipped a live pii-in-logs verdict");

check("1.4 a comment delimiter inside a TEMPLATE literal opens nothing   (E-189)",
  decomment(HAZARD_D).includes("KEEP_D") && decomment(HAZARD_D).includes("TAIL_D"),
  "full-flow-audit.mjs lost 88% of itself to exactly this");

check("1.5 an UNTERMINATED block comment keeps the rest, it does not swallow to EOF",
  decomment("const a = 1; /* opened and never closed\nconst KEEP_E = 7;").includes("KEEP_E"),
  "text wrongly kept is a loud false positive; text wrongly removed is a silent false negative");

// ⛔ THE URL MUST BE UNQUOTED. A quoted one proves nothing about the `://` carve-out
// any more, because §1.3's literal handling protects it whether the carve-out exists
// or not — `red:decomment` caught this check passing on a tree with the carve-out
// deleted, which is a MISS, and a miss is a finding. JSX text is where a bare `://`
// really occurs, so that is what this measures.
check("1.6 an UNQUOTED `://` URL is not mistaken for a line comment",
  decomment("<a href={x}>https://50pick.tz/help</a>; const KEEP_F = 8;").includes("KEEP_F"),
  "without the carve-out the rest of the line is eaten as a comment");

// ⛔ THE CONTROLS — without these, a helper returning its input passes all of §1.
check("1.7 CONTROL: a line comment really is removed",
  !decomment("const a = 1; // seedHistory is fabricated here").includes("seedHistory"),
  "if this passes trivially, every `survives` check above is vacuous");

check("1.8 CONTROL: a block comment really is removed",
  !decomment("const a = 1; /* seedHistory is fabricated here */").includes("seedHistory"),
  "if this passes trivially, every `survives` check above is vacuous");

check("1.9 newlines survive, so the line numbers of surviving code do not move",
  decomment("const a = 1;\n/* two\n   lines */\nconst b = 2;\n").split("\n").length ===
  "const a = 1;\n/* two\n   lines */\nconst b = 2;\n".split("\n").length,
  "a guard that reports a line number needs this to be true");

// ── 2 · one helper — counted by SHAPE, over every script extension ──────────────
section("2 · one helper, imported — counted by shape, not by name");

// The two canonical comment-stripping regex literals, as SHAPES. A rename cannot
// dodge these, and neither can inlining — which is how the two earlier counts
// (name → 18, ordering-as-fixed-string → 22) both undercounted a population of 40.
const BLOCK_RE = /\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\//;
const LINE_RE = /\/(?:\(\^\|\[\^:"'`\\w\/\]\)|\(\^\|\[\^:\]\)|\^\\s\*|\(\?<!:\))?\\\/\\\/[^/]*\//;

// The only files allowed to carry one: the module that keeps the retired orders as
// EVIDENCE, this file (its fixtures and these very detectors), and the mutation
// anchors that re-introduce them to prove they are blind.
const ALLOWED = new Set([
  "scripts/lib/decomment.mts",
  "scripts/decomment.test.mts",
  "scripts/anchors/decomment.anchors.mjs",
]);

// ⚠️ EVERY script extension. The first version walked only .mts/.mjs and could not
// see 56 .cjs/.js files — in a RATCHET, whose entire purpose is to fire on a file
// that does not exist yet, that is a hole even while the count happens to be right.
const scriptFiles = walk(SCRIPTS, /\.(mts|mjs|cjs|ts|js)$/);
const carriers = scriptFiles.map(rel).filter((f) => !ALLOWED.has(f))
  .filter((f) => { const s = readFileSync(join(ROOT, f), "utf8"); return BLOCK_RE.test(s) || LINE_RE.test(s); });

/**
 * ⛔ THE MIGRATION IS NOT FINISHED, AND THIS NUMBER IS THE HONEST STATE OF IT.
 * MAY ONLY SHRINK.
 *
 * 26 scripts were moved onto the shared scanner on 2026-08-23. That did NOT empty
 * the field: several of those 26 carry a SECOND, INLINE stripper further down
 * (`outcome-display.test.mts:143`, `feedback-law.test.mts:123`), and a first pass
 * that looked for a DECLARATION named `decomment`/`stripComments` could see neither.
 * Others strip SQL or CSS comments, which are a different language and must not be
 * forced onto a JS helper. The rest fall into three groups:
 *   · pad each comment with SPACES to preserve byte offsets they later slice by —
 *     they need a `blankComments()` on the same scanner, which does not exist yet;
 *   · substitute a single `" "` so two tokens either side cannot fuse;
 *   · strip deliberately LESS, so tightening them changes what the gate asserts.
 * ⛔ Do not convert any of them without capturing that gate's FULL output before and
 * after and reading the diff. That is how the 26 were proven safe — and how
 * `market-override-scope` was caught reading 4 characters more before it shipped.
 */
const CARRIER_CEILING = 55;

check(`2.1 the private-stripper population may only shrink (${carriers.length}, ceiling ${CARRIER_CEILING})`,
  carriers.length <= CARRIER_CEILING,
  carriers.length > CARRIER_CEILING
    ? `${carriers.length - CARRIER_CEILING} new: ${carriers.slice(0, 6).join(", ")}`
    : "");
check(`2.2 …and if it drops, LOWER THE CEILING in the same commit (${carriers.length} vs ${CARRIER_CEILING})`,
  carriers.length >= CARRIER_CEILING,
  "a ceiling above the real count stops being a ratchet");

const importers = scriptFiles.map(rel)
  .filter((f) => readFileSync(join(ROOT, f), "utf8").includes('from "./lib/decomment.mts"'));
check(`2.3 CONTROL: the shared helper is actually imported (${importers.length} scripts)`,
  importers.length >= 20,
  "If nothing imports it, 2.1 passes because the strippers were deleted, not shared.");
check(`2.4 CONTROL: the scan read a plausible number of scripts (${scriptFiles.length})`,
  scriptFiles.length > 400,
  "A near-empty walk makes the ratchet assert nothing.");

// ── 3 · the retired orders really ARE blind ─────────────────────────────────────
section("3 · the blindness is demonstrated, not asserted in prose");

check("3.1 block-comments-first loses the code after a `/*` in a `//` line   (E-186)",
  !BLIND.blockFirst(HAZARD_A).includes("KEEP_A"),
  "If this fails, HAZARD_A stopped reproducing the bug and 1.1 proves nothing.");
check("3.2 line-comments-first loses the code after a `//` inside a block comment",
  !BLIND.lineFirst(HAZARD_B).includes("KEEP_B"),
  "If this fails, HAZARD_B stopped reproducing the bug and 1.2 proves nothing.");
check("3.3 …and each retired order is FINE on the other's hazard — neither is simply worse",
  BLIND.blockFirst(HAZARD_B).includes("KEEP_B") && BLIND.lineFirst(HAZARD_A).includes("KEEP_A"),
  "An ORDER is a choice of which blindness to have, not a fix.");
check("3.4 …and BOTH are blind to a delimiter inside a string   (E-189 was not new)",
  !BLIND.blockFirst(HAZARD_C).includes("KEEP_C") && !BLIND.lineFirst(HAZARD_C).includes("KEEP_C"),
  "the scanner is the first version of this helper that reads literals at all");

// ── 4 · agreement with an independently written reference tokeniser ─────────────
section("4 · the contract, checked against a second implementation");

/**
 * A deliberately DIFFERENT algorithm: an explicit state machine, where the shipped
 * helper is a scanner with early-continues. Two implementations that disagree mean
 * one of them is wrong, and that disagreement is the only automatic way to catch
 * the class of bug `E-189` was — a whole state the author forgot existed.
 */
type S = "code" | "line" | "block" | "sq" | "dq" | "tpl";
function reference(src: string): string {
  let out = "", st: S = "code", i = 0, depth = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (st === "code") {
      if (c === "/" && d === "/" && src[i - 1] !== ":") { st = "line"; i += 2; continue; }
      if (c === "/" && d === "*") {
        if (src.indexOf("*/", i + 2) === -1) { out += src.slice(i); break; }
        st = "block"; i += 2; continue;
      }
      if (c === "'") { st = "sq"; out += c; i++; continue; }
      if (c === '"') { st = "dq"; out += c; i++; continue; }
      if (c === BT) { st = "tpl"; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (st === "line") { if (c === "\n") { out += c; st = "code"; } i++; continue; }
    if (st === "block") {
      if (c === "*" && d === "/") { st = "code"; i += 2; continue; }
      if (c === "\n") out += c;
      i++; continue;
    }
    // literals
    if (c === BS) { out += c + (src[i + 1] ?? ""); i += 2; continue; }
    if (st === "sq" && (c === "'" || c === "\n")) { out += c; st = "code"; i++; continue; }
    if (st === "dq" && (c === '"' || c === "\n")) { out += c; st = "code"; i++; continue; }
    if (st === "tpl") {
      if (c === BT && depth === 0) { out += c; st = "code"; i++; continue; }
      if (c === "$" && d === "{") depth++;
      if (c === "}" && depth > 0) depth--;
    }
    out += c; i++;
  }
  return out;
}

const corpus = [...walk(SRC, /\.(tsx?|mts)$/), ...scriptFiles];
const disagree: string[] = [];
for (const f of corpus) {
  const s = readFileSync(f, "utf8");
  if (decomment(s) !== reference(s)) disagree.push(rel(f));
}
check(`4.1 the shipped scanner agrees with an independent tokeniser on every file (${corpus.length})`,
  disagree.length === 0,
  disagree.length ? `${disagree.length} disagree: ${disagree.slice(0, 5).join(", ")}` : "");
check(`4.2 CONTROL: the corpus was actually walked (${corpus.length} files)`, corpus.length > 1000);

// ── 5 · scripts/ is in scope, so this is not hypothetical ──────────────────────
section("5 · why the fix is a literal-aware scanner and not an ordering");

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
check("5.2 the E-186 repair would go blind over a script this repo really reads",
  worst.loss > 500,
  "If nothing trips it any more, keep the scanner anyway — but re-derive this note.");
log(`  note  worst case: ${worst.f} — ${worst.loss} characters lost to line-comments-first`);

const scanSet = readdirSync(SCRIPTS).filter((f) => /\.(mts|mjs)$/.test(f)).map((f) => `scripts/${f}`);
check("5.3 …and that script is inside the set pii-in-logs §3 scans",
  worst.f !== "" && scanSet.includes(worst.f),
  `${worst.f} is not in the ${scanSet.length}-file scan set`);

log(`\n${fail === 0 ? "ALL PASS" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
