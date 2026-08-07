/**
 * THE KEYFRAME REGISTRY — one name, one definition, and no motion defined twice.
 *
 *   npm run test:keyframes                 # the gate
 *   npm run red:keyframes                  # the proof it can fail (mutates a COPY)
 *
 * ⛔ WHY THIS EXISTS. `INTAKE.md` §2 says of an incoming `@keyframes`: *"do not add a
 * second name for a motion that already exists"*, and §3b says a delivery is a
 * REPLACEMENT, never an addition. Neither was checkable. The material commission adds
 * TWELVE names to a corpus that already held 67 across four stylesheets plus more
 * inside component `style` blocks — and its own header miscounted that corpus as 33
 * while defining twelve under a heading that says six.
 *
 * ⭐ WHAT A DUPLICATE ACTUALLY COSTS, and it is worse than untidiness: the LAST
 * `@keyframes` of a given name wins for the whole document, silently, wherever it
 * sits. So a second definition does not shadow one rule — it retunes every consumer
 * of that motion in the product, and nothing errors.
 *
 * ⚠️ ONE SHAPE OF DUPLICATE IS LEGITIMATE AND MUST NOT BE FAILED: a redefinition
 * inside `@media (prefers-reduced-motion: reduce)`. `globals.css` uses it deliberately
 * — `press-pop`, `vote-pop`, `streak-tick`, `toggle-glow`, `count-up-flash`,
 * `seal-impress`, `celebrate-pop`, `win-burst` all flatten to their end state there.
 * That is M6 being obeyed, and a gate that called it drift would push somebody to
 * DELETE a calm branch. So the rule is: at most one definition at TOP LEVEL per name,
 * and any number of at-rule overrides.
 */
import { readFileSync, globSync } from "node:fs";
import postcss from "postcss";

const ROOT = process.env.KF_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSS_FILES = globSync("src/**/*.css", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
const TSX_FILES = globSync("src/**/*.tsx", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
console.log(`keyframe-registry: reading ${ROOT}`);

type Def = { name: string; file: string; line: number; atRules: string[] };
const defs: Def[] = [];
let parseFailures = 0;

function collect(file: string, text: string, lineOffset = 0) {
  let root: postcss.Root;
  try {
    root = postcss.parse(text, { from: file });
  } catch (e) {
    // ⛔ Unparseable is a FAILURE, not an empty result. A gate that returns "no
    // keyframes" for a file it could not read reports that file as clean.
    console.log(`  FAIL 0.0 ${file} does not parse as CSS — ${(e as Error).message}`);
    parseFailures++;
    return;
  }
  root.walkAtRules(/^(-\w+-)?keyframes$/, (at) => {
    const atRules: string[] = [];
    for (let p = at.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "atrule") atRules.unshift(`@${(p as postcss.AtRule).name} ${(p as postcss.AtRule).params}`.trim());
    }
    defs.push({ name: at.params.trim(), file, line: (at.source?.start?.line ?? 1) + lineOffset, atRules });
  });
}

for (const rel of CSS_FILES) collect(rel, readFileSync(`${ROOT}/${rel}`, "utf8"));
for (const rel of TSX_FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8");
  for (const m of text.matchAll(/<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) {
    collect(rel, m[1], text.slice(0, m.index!).split("\n").length - 1);
  }
}

/** Every `animation` / `animation-name` reference in the corpus, so dead names show. */
const referenced = new Set<string>();
for (const rel of [...CSS_FILES, ...TSX_FILES]) {
  const raw = readFileSync(`${ROOT}/${rel}`, "utf8");
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of text.matchAll(/animation(?:-name)?\s*:\s*([^;}"'`]+)/g)) {
    for (const tok of m[1].split(",")) {
      for (const w of tok.trim().split(/\s+/)) {
        if (/^[A-Za-z_-][\w-]*$/.test(w)) referenced.add(w);
      }
    }
  }
}

let failed = parseFailures;
const say = (ok: boolean, msg: string) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

const topLevel = defs.filter((d) => d.atRules.length === 0);
const overrides = defs.filter((d) => d.atRules.length > 0);
const names = new Set(defs.map((d) => d.name));
console.log(`\nKEYFRAME REGISTRY · ${CSS_FILES.length} stylesheet(s) + ${TSX_FILES.length} component file(s)`);
console.log(`  ${defs.length} definitions · ${names.size} unique names · ${topLevel.length} top-level · ${overrides.length} at-rule override(s)\n`);

/* ═══ 1 · ONE TOP-LEVEL DEFINITION PER NAME ═══════════════════════════════════ */
const byName = new Map<string, Def[]>();
for (const d of topLevel) byName.set(d.name, [...(byName.get(d.name) ?? []), d]);
const dupes = [...byName].filter(([, v]) => v.length > 1);
say(dupes.length === 0, `1.1 ⭐ no name is defined twice at top level (the LAST one silently wins document-wide)`);
for (const [n, v] of dupes) console.log(`         ${n} — ${v.map((d) => `${d.file}:${d.line}`).join(" , ")}`);

/* ═══ 2 · EVERY at-rule OVERRIDE IS A CALM BRANCH, NOT A SECOND TUNING ════════
   An override outside a reduced-motion context is the drift rule 1.1 forbids,
   wearing an at-rule as a disguise. */
const badOverrides = overrides.filter((d) => !d.atRules.some((a) => /prefers-reduced-motion/.test(a)));
say(badOverrides.length === 0, `2.1 every at-rule keyframe override is a prefers-reduced-motion calm branch`);
for (const d of badOverrides) console.log(`         ${d.file}:${d.line}  ${d.name} inside ${d.atRules.join(" > ")}`);

/**
 * 2.2 — 🔴 A KEYFRAME NAMED BY A TOP-LEVEL RULE MUST BE DEFINED AT TOP LEVEL, and this
 * is the rule that found a real one: `.win-card { animation: win-burst … }` sits at top
 * level while the ONLY `@keyframes win-burst` is inside `@media (prefers-reduced-motion:
 * reduce)`. So for every ordinary visitor that rule names a keyframe **that does not
 * exist** — no animation at all — while a reduce-motion user gets the flattened fade.
 * The motion exists only for the users who asked not to have it.
 *
 * ⛔ AND THE FIRST VERSION OF THIS CHECK WAS WRONG IN A WAY THAT WOULD HAVE COST WORK.
 * It asked "does every at-rule override have a top-level base?" and reported FIVE hits.
 * Four were correct code: `cm-msg-fade`, `cm-sheet-fade`, `needle-sheet-rise` and
 * `needle-sheet-pop` are each declared AND consumed inside the same at-rule — a
 * calm-only motion, where the reduced branch swaps in a plain fade rather than
 * flattening an existing one. That is a legitimate and rather good pattern, and a gate
 * that condemned it would have sent somebody to delete four working calm branches.
 * ⭐ The defect is not "an override without a base". It is "a TOP-LEVEL reference
 * without a TOP-LEVEL definition" — which is one file-scope question, not two.
 */
/**
 * 🔴 AND THE SECOND VERSION STILL HAD A HOLE, WHICH ITS OWN RED HARNESS FOUND. It kept
 * only tokens that matched a KNOWN keyframe name (`names.has(w)`) so as not to flag
 * `both`, `infinite` and the easing keywords — and that filter silently excused the
 * worse case: a top-level rule naming a keyframe that exists **nowhere at all**. The
 * mutation "delete `mark-breathe`" left the gate GREEN over an animation that could
 * never run. ⛔ A filter written to avoid false positives had bought a false negative.
 *
 * ⭐ The fix is to name the KEYWORDS instead of the names. Every identifier in an
 * `animation` shorthand is either one of the fixed set below, or it is a keyframe name —
 * and a keyframe name referenced at top level must be DEFINED at top level.
 */
const ANIM_KEYWORDS = new Set([
  "none", "infinite", "alternate", "alternate-reverse", "reverse", "normal",
  "forwards", "backwards", "both", "running", "paused",
  "linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end",
  "initial", "inherit", "unset", "revert", "revert-layer",
]);
const topLevelDefined = new Set(topLevel.map((d) => d.name));
const topLevelRefs: { name: string; file: string; line: number }[] = [];
for (const rel of CSS_FILES) {
  const raw = readFileSync(`${ROOT}/${rel}`, "utf8");
  let root: postcss.Root;
  try { root = postcss.parse(raw, { from: rel }); } catch { continue; }
  root.walkDecls(/^animation(-name)?$/, (d) => {
    // only declarations that are NOT nested in an at-rule
    for (let p = d.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule") return;
    // ⚠️ `var()`, `steps()`, `cubic-bezier()` and every time value are dropped by the
    // identifier test: a bare identifier is the only thing that can be a name.
    for (const tok of d.value.replace(/\b[\w-]*\([^()]*\)/g, " ").split(",")) {
      for (const w of tok.trim().split(/\s+/)) {
        if (/^[A-Za-z_-][\w-]*$/.test(w) && !ANIM_KEYWORDS.has(w)) {
          topLevelRefs.push({ name: w, file: rel, line: d.source?.start?.line ?? 0 });
        }
      }
    }
  });
}
const unplayable = topLevelRefs.filter((r) => !topLevelDefined.has(r.name));
say(unplayable.length === 0, `2.2 ⭐ every keyframe named by a TOP-LEVEL rule is DEFINED at top level (otherwise the motion never plays)`);
for (const r of unplayable) {
  const where = names.has(r.name)
    ? "exists ONLY inside a reduced-motion branch — it plays for reduce users and NOBODY else"
    : "is not defined ANYWHERE — this animation can never run";
  console.log(`         ${r.file}:${r.line}  "${r.name}" ${where}`);
}

/* ═══ 3 · THE MATERIAL COMMISSION'S OWN NAMES ════════════════════════════════
   ⭐ Pinned by NAME, so this gate says which atom regressed rather than "a
   keyframe is missing". The delivery's §B defines twelve under a heading that
   claims six, and §C reuses six more that must already exist. */
const ATOM_B_NEW = [
  "glyph-settle", "glyph-nudge-up", "glyph-nudge-down", "glyph-swap-out", "glyph-swap-in",
  "glyph-ring", "mark-flip", "mark-pending-tilt", "needle-sweep", "needle-settle",
  "seal-recoil", "crest-settle",
];
const missing = ATOM_B_NEW.filter((n) => !names.has(n));
say(missing.length === 0, `3.1 all ${ATOM_B_NEW.length} keyframes from material.css §B are present (ATOM B)`);
for (const n of missing) console.log(`         ${n} is not defined anywhere`);

const REUSED = ["seal-impress", "seal-place", "badge-seal-rays", "win-aura-breathe", "shimmer-gilt", "count-up-flash", "m-scrim-in"];
const missingReused = REUSED.filter((n) => !names.has(n));
say(missingReused.length === 0, `3.2 every keyframe §C REUSES rather than redefines still exists`);
for (const n of missingReused) console.log(`         ${n} — §C references it; deleting it would break a utility silently`);

/**
 * 3.3 — 🔴 THE `shimmer-gilt` TWO-LAYER RULE, AND NO OTHER GATE CAN SEE IT.
 * A single `background-position` value applies to EVERY background layer, and
 * `.gilt-metal` declares two (sheen + metal ramp). With one value the gold ramp
 * itself translates ±200% — the metal slides off the button. Measured in a browser
 * on a paused timeline: 2 layers × 1 value → `-200% 0, -200% 0`; 2 layers × 2 values
 * → `-200% 0, 0px 0px`; and 1 layer × 2 values is byte-identical to 1 value, which is
 * what makes the two-value form safe for every consumer.
 * ⛔ This is a PAINT bug inside a hover animation: nothing else in this repo — not
 * tsc, not the build, not a contrast gate, not a screenshot of a resting button —
 * can distinguish it from correct.
 */
const sg = topLevel.find((d) => d.name === "shimmer-gilt");
let sgOk = false;
if (sg) {
  const text = readFileSync(`${ROOT}/${sg.file}`, "utf8");
  const at = postcss.parse(text, { from: sg.file });
  at.walkAtRules(/^(-\w+-)?keyframes$/, (node) => {
    if (node.params.trim() !== "shimmer-gilt") return;
    // Every step that sets background-position must give a value PER LAYER (2+).
    const steps: string[] = [];
    node.walkDecls("background-position", (d) => steps.push(d.value));
    sgOk = steps.length > 0 && steps.every((v) => v.split(",").length >= 2);
  });
}
say(sgOk, `3.3 ⭐ shimmer-gilt writes a background-position PER LAYER (one value would slide the metal off the button)`);

/* ═══ REPORTED, NEVER SILENT ═════════════════════════════════════════════════
   ⚠️ A dead keyframe is not failed here, deliberately. §B lands twelve names whose
   consumers arrive with §C — INTAKE §3 step 2 asks for exactly that — so failing on
   "no consumer" would fail the integration ORDER the playbook prescribes. It is
   printed instead, and the number must fall as §C and the component atoms land. */
const dead = [...names].filter((n) => !referenced.has(n)).sort();
console.log(`\n  names with no consumer yet: ${dead.length}  (⚠️ printed, not failed — §B lands before §C by design)`);
for (const n of dead) console.log(`      · ${n}${ATOM_B_NEW.includes(n) ? "   ← ATOM B, consumer arrives with §C" : ""}`);
const perFile = new Map<string, number>();
for (const d of defs) perFile.set(d.file, (perFile.get(d.file) ?? 0) + 1);
console.log(`\n  definitions per file:`);
for (const [f, n] of [...perFile].sort()) console.log(`      ${String(n).padStart(3)}  ${f}`);
console.log("");
console.log(failed ? `KEYFRAME REGISTRY — ${failed} check(s) FAILED\n` : `KEYFRAME REGISTRY — all checks passed\n`);
process.exit(failed ? 1 : 0);
