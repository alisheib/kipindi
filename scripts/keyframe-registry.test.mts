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

/**
 * Identifiers that can appear in an `animation` shorthand and are NEVER a keyframe
 * name. Declared HERE rather than beside check 2.2 (which is its other consumer)
 * because the JSX reader below runs first and would hit its temporal dead zone.
 */
const ANIM_KEYWORDS = new Set([
  "none", "infinite", "alternate", "alternate-reverse", "reverse", "normal",
  "forwards", "backwards", "both", "running", "paused",
  "linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end",
  "initial", "inherit", "unset", "revert", "revert-layer",
]);

/* ═══ THE BLIND SPOT THIS FILE DOCUMENTED AND DID NOT READ ═══════════════════
 * ⛔ `src/components/ui/spinner.tsx`'s own header states the defect in as many
 * words: *"`test:keyframes` finds consumers by scanning for `animation:` followed
 * by a name, and its capture class excludes the quote character — so an animation
 * written in a JSX style attribute registers as NO consumer at all."* It was
 * right, and it stayed right. Measured on 2026-08-21 the registry reported FOUR
 * names as having no consumer and THREE of them were rendering at that moment:
 *
 *     spin       every SubmitButton on the platform — deposit and withdraw included
 *     toast-bar  the countdown hairline under every toast
 *     orm-pop    the OperationResultModal crest, i.e. every money confirmation
 *
 * ⭐ A "no consumer" line is a DELETION INVITATION, so this was not untidiness: the
 * registry's standing advice was to delete the spinner every pending button uses.
 *
 * ⭐ WHY THE OLD SCAN COULD NOT SEE THEM, precisely — and it is one character.
 * Its capture class is `[^;}"'` + backtick + `]`, which stops at the first quote.
 * A CSS declaration (`animation: spin 0.7s linear infinite;`) has no quote after
 * the colon; a JSX one (`animation: "spin 0.7s linear infinite"`) is nothing BUT
 * a quote after the colon. The corpus split cleanly in two and half of it was
 * invisible — the same shape as `test:bridge`'s class regex listing `/` as a legal
 * terminator, which hid 577 usages for its whole life.
 */
type JsxAnim = { file: string; line: number; raw: string; name: string | null; infinite: boolean };

/**
 * Every `animation:` / `animationName:` written as a QUOTED value — i.e. in a JSX
 * style object rather than in CSS. Both string forms and the template-literal form
 * are read, because `toast.tsx` interpolates the duration into its.
 *
 * ⛔ COMMENTS ARE BLANKED FIRST AND THAT IS CORRECTNESS, NOT TIDINESS. `spinner.tsx`
 * explains this very defect inside its JSDoc and writes "`animation:`" followed by a
 * backtick while doing so; read raw, that sentence parses as a template literal and
 * the reader invents a keyframe called "` followed by". Blanking preserves byte
 * offsets so a reported line number still points at the real line.
 */
function readJsxAnimations(file: string, text: string): JsxAnim[] {
  const src = text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p: string) => p + " ".repeat(m.length - p.length));
  const out: JsxAnim[] = [];
  for (const m of src.matchAll(/\banimation(Name)?\s*:\s*(`[^`]*`|"[^"]*"|'[^']*')/g)) {
    const raw = m[2].slice(1, -1);
    // `${…}` is data (toast durations); `var(…)` / `cubic-bezier(…)` are not names.
    const flat = raw.replace(/\$\{[^}]*\}/g, " ").replace(/\b[\w-]*\([^()]*\)/g, " ");
    const words = flat.split(/\s+/).filter(Boolean);
    const name = m[1] === "Name"
      ? (words[0] ?? null)
      : (words.find((w) => /^[A-Za-z_-][\w-]*$/.test(w) && !ANIM_KEYWORDS.has(w)) ?? null);
    out.push({
      file,
      line: src.slice(0, m.index!).split("\n").length,
      raw,
      name,
      infinite: /\binfinite\b/.test(raw),
    });
  }
  return out;
}

const jsxAnims: JsxAnim[] = [];
for (const rel of TSX_FILES) jsxAnims.push(...readJsxAnimations(rel, readFileSync(`${ROOT}/${rel}`, "utf8")));
for (const a of jsxAnims) if (a.name) referenced.add(a.name);

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
 * `animation` shorthand is either one of `ANIM_KEYWORDS` — declared at the top of this
 * file, because the JSX reader needs the same set and runs earlier — or it is a keyframe
 * name, and a keyframe name referenced at top level must be DEFINED at top level.
 */
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

/**
 * 2.3 — ⭐ THE JSX READER FOUND THE THING IT MEANT TO FIND.
 *
 * ⛔ THIS CHECK EXISTS BECAUSE OF E-108's LESSON, NOT BECAUSE OF A TIDINESS URGE:
 * *a guard and its own red proof can agree with each other and both be wrong.* Two
 * guards once located the current handoff with a pattern no handoff had used since
 * session 23, validated a block from session ~16, and stayed green — while the RED
 * harness mutated the same dead block. A reader that silently matches NOTHING passes
 * every downstream check it feeds, and 2.4 below would report "all clear" over a
 * corpus it never opened.
 *
 * So the reader is PINNED to sites measured on 2026-08-21. Each pin is a file plus the
 * keyframe name that file's inline style must still name. If a regex here is ever
 * loosened or tightened by accident, the pins vanish and this line goes red naming the
 * file, instead of 2.4 quietly agreeing that everything is fine.
 *
 * ⚠️ A PIN IS A RATCHET ENTRY, NOT A LAW. If a site legitimately moves onto a class
 * (which is the direction this campaign wants — a class is gateable, an inline style is
 * not), DELETE its pin in the same change. The list may shrink; it may not silently rot.
 */
const JSX_PINS: { file: string; name: string; why: string }[] = [
  { file: "src/components/ui/spinner.tsx", name: "spin", why: "every SubmitButton on the platform" },
  { file: "src/components/markets/operation-result-modal.tsx", name: "orm-pop", why: "every money confirmation's crest" },
  // `date-select.tsx::cd-rise` LEFT THIS LIST on 2026-08-21 — the site moved onto the kit
  // class `.m-dialog-in`, which is what a pin leaving is supposed to look like.
  //
  // `toast.tsx::toast-bar` LEFT IT on 2026-09-04, the same way and for a reason this file
  // will appreciate: as an INLINE style the countdown was ungateable, so both reduced-motion
  // clamps zeroed it and `forwards` held the EMPTY frame — the hairline read "your time is
  // up" under a toast the JS timer was still holding for its full 4.5–8 seconds (E-262). It
  // now rides `.toast-countdown`, declared in `motion.css`, which is what lets a stylesheet
  // give it a calm state at all; only `--toast-dwell` stays inline, because a dwell is data.
  // 2.2 sees it as a CSS consumer from here on, which is the stronger half of this registry.
];
const missedPins = JSX_PINS.filter((p) => !jsxAnims.some((a) => a.file === p.file && a.name === p.name));
say(missedPins.length === 0, `2.3 ⭐ the JSX inline-style reader still finds all ${JSX_PINS.length} pinned sites (a reader that matches nothing passes everything)`);
for (const p of missedPins) {
  console.log(`         ${p.file} no longer yields "${p.name}" — ${p.why}`);
  console.log(`             either the reader's regex broke, or the site moved onto a class. If it moved, DELETE this pin.`);
}

/**
 * 2.4 — 🔴 A KEYFRAME NAMED FROM JSX MUST BE DEFINED AT TOP LEVEL. Same law as 2.2,
 * over the half of the corpus 2.2 cannot see. An inline `style` attribute is the most
 * top-level context there is — it carries no media query and no `[data-motion]` — so a
 * name it references that exists only inside a reduced-motion branch plays for reduce
 * users and nobody else, and a name that exists nowhere plays for nobody at all.
 *
 * ⛔ AND IT FOUND ONE ON ITS FIRST RUN, IN A LIVE DIALOG. `date-select.tsx:349` renders
 * the portalled date-picker with `style={{ animation: "cd-rise var(--t-base)
 * var(--ease-arrive)" }}` and there is **no `@keyframes cd-rise` anywhere in `src/`** —
 * the only other occurrence of the name in the whole repo is a line in
 * `docs/SESSION-PROMPT-DESIGN-PERFECTION.md` proposing that `cd-rise` be replaced by
 * `.m-dialog-in` and *"delete both"*. Half of that instruction was carried out. So the
 * dialog every DateSelect on the platform opens has no entrance at all, and the four
 * things that would normally catch a broken animation cannot: `tsc` does not read CSS
 * strings, the build does not resolve keyframe names, a screenshot of a settled dialog
 * looks correct, and until this line existed no gate read a JSX style attribute.
 *
 * ✅ AND IT WAS FIXED THE SAME DAY IT WAS FOUND. The dialog now carries `.m-dialog-in`,
 * the kit's modal arrival — one entrance, already branched for all three reduce-motion
 * gates, which a bespoke keyframe would have had to re-earn. The baseline below is
 * EMPTY, which is the state it is supposed to reach: it may only shrink, and check 2.5
 * fails the moment an entry outlives the defect it names — that is what told me to
 * empty it rather than leaving a stale line behind a passing suite.
 */
const JSX_UNDEFINED_BASELINE = new Set<string>([]);
const jsxUnplayable = jsxAnims.filter((a) => a.name && !topLevelDefined.has(a.name));
const jsxNew = jsxUnplayable.filter((a) => !JSX_UNDEFINED_BASELINE.has(`${a.file}::${a.name}`));
say(jsxNew.length === 0, `2.4 ⭐ every keyframe named by a JSX inline style is DEFINED at top level (baseline: ${JSX_UNDEFINED_BASELINE.size}, may only shrink)`);
for (const a of jsxNew) {
  const where = names.has(a.name!)
    ? "exists ONLY inside an at-rule branch — an inline style is in no branch, so it never plays"
    : "is not defined ANYWHERE — this animation can never run";
  console.log(`         ${a.file}:${a.line}  "${a.name}" ${where}   (value: ${a.raw})`);
}
const staleJsxBaseline = [...JSX_UNDEFINED_BASELINE].filter(
  (k) => !jsxUnplayable.some((a) => `${a.file}::${a.name}` === k),
);
say(staleJsxBaseline.length === 0, `2.5 the 2.4 baseline holds no stale entries (a fixed site must leave the list)`);
for (const k of staleJsxBaseline) console.log(`         "${k}" is no longer undefined — delete it from JSX_UNDEFINED_BASELINE`);

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
say(missing.length === 0, `3.1 all ${ATOM_B_NEW.length} keyframes from the delivery's §B are present (ATOM B)`);
for (const n of missing) console.log(`         ${n} is not defined anywhere`);

/* `win-aura-breathe` left this list on 2026-08-07 (DA-8/E-128): its only consumer
   `.win-aura-anim` was dead (zero call sites) and both were deleted. §C's aura is
   its own `m-aura`; nothing in motion.css ever referenced win-aura-breathe. */
const REUSED = ["seal-impress", "seal-place", "badge-seal-rays", "shimmer-gilt", "count-up-flash", "m-scrim-in"];
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
/* ⭐ AND THIS LINE IS ONLY TRUSTWORTHY BECAUSE `referenced` NOW INCLUDES THE JSX
   CORPUS. Before 2026-08-21 it read 4 and three of the four were live — see the
   block comment above `readJsxAnimations`. If a name below surprises you, check
   whether it is written into a `style` attribute before you delete anything. */
const dead = [...names].filter((n) => !referenced.has(n)).sort();
console.log(`\n  names with no consumer yet: ${dead.length}  (⚠️ printed, not failed — §B lands before §C by design)`);
for (const n of dead) console.log(`      · ${n}${ATOM_B_NEW.includes(n) ? "   ← ATOM B, consumer arrives with §C" : ""}`);

/* ⚠️ THE JSX HALF OF THE CORPUS, NAMED. An inline `style` animation cannot be reached
   by `[data-motion="reduced"]` — there is no selector to hang the override on — so it
   is only ever stopped by the two universal clamps. `test:reduce-motion` §2.4 is the
   gate that holds that line; this is the inventory. */
console.log(`\n  animations written in a JSX style attribute: ${jsxAnims.length}` +
  `  (invisible to every motion gate in this repo until 2026-08-21)`);
for (const a of jsxAnims.sort((x, y) => x.file.localeCompare(y.file))) {
  console.log(`      · ${a.file}:${a.line}  ${a.name ?? "⛔ no name parsed"}${a.infinite ? "   ← INFINITE" : ""}`);
}
const perFile = new Map<string, number>();
for (const d of defs) perFile.set(d.file, (perFile.get(d.file) ?? 0) + 1);
console.log(`\n  definitions per file:`);
for (const [f, n] of [...perFile].sort()) console.log(`      ${String(n).padStart(3)}  ${f}`);
console.log("");
console.log(failed ? `KEYFRAME REGISTRY — ${failed} check(s) FAILED\n` : `KEYFRAME REGISTRY — all checks passed\n`);
process.exit(failed ? 1 : 0);
