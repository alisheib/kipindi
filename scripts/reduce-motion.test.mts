/**
 * M6 — EVERY ANIMATION STILL WORKS WITH MOTION OFF. The gate over all THREE gates.
 *
 *   npm run test:reduce-motion            # the gate
 *   npm run red:reduce-motion             # the proof it can fail (mutates a COPY)
 *
 * THE LAW (docs/DESIGN_AUTHORITY.md §M6):
 *   "Every mat / g / seal / crest state has a written prefers-reduced-motion
 *    branch AND the html.kp-reduce-motion mirror: end frames render, nothing
 *    invisible. A new animation lands with its branch in the same change or it
 *    does not land."
 *
 * (⚠️ The four class families are written without their leading dots and trailing
 *  stars on purpose: a `star slash` pair anywhere in this comment closes it, and
 *  the law's own wording — `.mat-*` followed by `/.g-*` — does exactly that. It
 *  cost this file its first run, and globals.css a whole token block once before.)
 *
 * ⛔ AND THE DELIVERY COUNTED TWO GATES WHERE THIS PRODUCT HAS THREE.
 * `theme-provider.tsx:36-46` is the authority on what actually gets set:
 *
 *   the user switched Reduce motion off  → html.kp-reduce-motion + data-motion="minimal"
 *   detectLowEnd() is true               → data-motion="reduced"   ← OUR TARGET DEVICE
 *   otherwise                            → data-motion="full"
 *   (the OS `prefers-reduced-motion` media query is a fourth, independent path)
 *
 * So a low-end Android — the device this product is built for — gets NEITHER the
 * media query nor the class. It gets `reduced`, whose entire contract is "ambient
 * loops off, entrances kept", and that contract is a HAND-WRITTEN LIST in
 * globals.css §6. A list is only a gate if something checks it, and until
 * 2026-08-07 nothing did: measured, it named 14 loops, MISSED 15, and carried one
 * dead entry (`.wc-rays`, deleted with the drawn rays it animated).
 *
 * ⭐ WHAT THIS GATE READS, AND THE TRAP IT WOULD HAVE FALLEN INTO.
 * `src/**\/*.css` is not the corpus. Two of the loops the third gate already
 * covers — `.notif-badge-pulse` and `.csrf-rest-ring` — exist ONLY inside inline
 * `<style>{` … `}</style>` blocks in a `.tsx`. A gate that read stylesheets alone
 * would have reported both as UNLISTED and sent somebody to "fix" a rule that is
 * already right, or worse, to delete the two live entries as stale. Both file
 * kinds are read here, and the gate prints which corpus each hit came from.
 *
 * ⛔ EVERY CHECK BELOW IS FALSIFIABLE ON A COPY. `RM_ROOT` re-aims the whole gate
 * at a scratch tree, because two sessions share this working directory and a RED
 * harness that mutates `src/` is a defect with a 50% chance of shipping.
 */
import { readFileSync, globSync } from "node:fs";
import postcss from "postcss";

const ROOT = process.env.RM_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSS_FILES = globSync("src/**/*.css", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
const TSX_FILES = globSync("src/**/*.tsx", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
console.log(`reduce-motion: reading ${ROOT}`);

/* ── the corpus ─────────────────────────────────────────────────────────────
   ⛔ READ WITH POSTCSS — THE TOKENIZER THE BUILD ITSELF USES — AND FOR A REASON
   THIS GATE PAID FOR ON ITS FIRST DAY. It shipped with a hand-rolled brace
   walker, and the walker made the same mistake as the comment it was reading:
   a `star star slash star` glob written inside a CSS comment closes that comment
   early, so eleven lines of English became part of the selector list of the very
   rule this gate exists to protect. postcss reported that selector as prose —
   i.e. the browser drops the whole rule — while the walker happily extracted the
   fragments it expected to find and printed "all checks passed".

   ⭐ THE LESSON, WRITTEN WHERE THE NEXT SESSION WILL SEE IT: a gate that parses a
   language with a regex agrees with your typos. Use the real parser, and let a
   selector that is not a selector be visible AS one.                           */
type Rule = { file: string; line: number; at: string[]; sel: string; body: string };

function blankComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** Every rule in one stylesheet, with the at-rule chain it sits inside. */
function walk(file: string, text: string, lineOffset = 0): Rule[] {
  const out: Rule[] = [];
  let root;
  try {
    root = postcss.parse(text, { from: file });
  } catch (e) {
    // ⛔ UNPARSEABLE IS A FAILURE, NOT A ZERO. A gate that returns "no rules" for
    // a file it could not read reports the whole file as compliant.
    console.log(`  FAIL 0.0 ${file} does not parse as CSS — ${(e as Error).message}`);
    parseFailures++;
    return out;
  }
  root.walkRules((r) => {
    const at: string[] = [];
    for (let p = r.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "atrule") at.unshift(`@${(p as postcss.AtRule).name} ${(p as postcss.AtRule).params}`);
    }
    // A keyframe step (`0%`, `from`) is not a rule this gate reasons about.
    if (at.some((a) => /^@keyframes\b/.test(a))) return;
    out.push({
      file,
      line: (r.source?.start?.line ?? 1) + lineOffset,
      at,
      sel: r.selector.replace(/\s+/g, " ").trim(),
      body: r.nodes
        .filter((n): n is postcss.Declaration => n.type === "decl")
        .map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""}`)
        .join("; "),
    });
  });
  return out;
}
let parseFailures = 0;

const rules: Rule[] = [];
for (const rel of CSS_FILES) rules.push(...walk(rel, readFileSync(`${ROOT}/${rel}`, "utf8")));
/* Inline `<style>{` … `}</style>` — the second half of the corpus. The offset is
   carried so a reported line number points at the real .tsx line, not at line 1
   of an extracted fragment. */
for (const rel of TSX_FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8");
  for (const m of text.matchAll(/<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) {
    rules.push(...walk(rel, m[1], text.slice(0, m.index!).split("\n").length - 1));
  }
}

/* ═══ THE THIRD HALF OF THE CORPUS — A JSX `style` ATTRIBUTE ═════════════════
 * ⛔ THE HEADER ABOVE ALREADY CELEBRATED READING `<style>` BLOCKS AND THAT WAS STILL
 * ONLY TWO THIRDS OF THE PROBLEM. Three infinite loops once lived in inline `style`
 * attributes — one of them rendering on `/live`, a player board — and no motion gate
 * in this repo could see any of them, because every one of them parses CSS. Stage 6
 * moved those three onto classes inside `<style>` blocks, which fixed the three and
 * left the HOLE exactly as wide as it was: the next inline loop hides the same way.
 *
 * ⭐ AND AN INLINE LOOP IS NOT MERELY UNSEEN — IT IS UNGATEABLE. The third gate works
 * by selector (`[data-motion="reduced"] .thing { animation: none }`). An inline style
 * has no selector to hang an override on, and specificity puts it above any class rule
 * that tried. So on a low-end Android — the device this product is built for — an
 * inline `infinite` keeps running no matter what §6's list says. The only two things
 * that reach it are the universal `!important` clamps, i.e. the OS media query and the
 * explicit "Reduce motion" switch. `reduced` cannot touch it.
 *
 * ⚠️ THIS READER IS A DELIBERATE SECOND COPY of the one in `keyframe-registry.test.mts`,
 * and the duplication is recorded rather than hidden. `scripts/` may not gain a shared
 * module in this change (file ownership), and the E-108 repair — four copies of one
 * locator, each fixed once and handing the bug back to the others — is why BOTH copies
 * carry pinned sites (§2.5 here, §2.3 there). A copy that silently stops matching goes
 * red on its own pins instead of quietly agreeing that all is well.
 */
type JsxAnim = { file: string; line: number; raw: string; name: string | null; infinite: boolean };

const ANIM_KEYWORDS = new Set([
  "none", "infinite", "alternate", "alternate-reverse", "reverse", "normal",
  "forwards", "backwards", "both", "running", "paused",
  "linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end",
  "initial", "inherit", "unset", "revert", "revert-layer",
]);

/**
 * Every `animation:` / `animationName:` written as a QUOTED value — which is exactly
 * what distinguishes a JSX style object from CSS. A CSS declaration has no quote after
 * the colon; a JSX one is nothing but a quote after the colon.
 *
 * ⛔ COMMENTS ARE BLANKED FIRST, AND NOT FOR TIDINESS. `spinner.tsx` explains this very
 * defect inside its JSDoc and writes "`animation:`" followed by a backtick while doing
 * so; read raw, that sentence parses as a template literal and the reader invents a
 * keyframe called "` followed by". Blanking preserves byte offsets, so a reported line
 * number still points at the real line — this is the same lesson as §2.2's corpus, where
 * a class named in an EXPLANATION made a dead gate entry read as live.
 */
function readJsxAnimations(file: string, text: string): JsxAnim[] {
  const src = text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p: string) => p + " ".repeat(m.length - p.length));
  const out: JsxAnim[] = [];
  for (const m of src.matchAll(/\banimation(Name)?\s*:\s*(`[^`]*`|"[^"]*"|'[^']*')/g)) {
    const raw = m[2].slice(1, -1);
    const flat = raw.replace(/\$\{[^}]*\}/g, " ").replace(/\b[\w-]*\([^()]*\)/g, " ");
    const words = flat.split(/\s+/).filter(Boolean);
    const name = m[1] === "Name"
      ? (words[0] ?? null)
      : (words.find((w) => /^[A-Za-z_-][\w-]*$/.test(w) && !ANIM_KEYWORDS.has(w)) ?? null);
    out.push({ file, line: src.slice(0, m.index!).split("\n").length, raw, name, infinite: /\binfinite\b/.test(raw) });
  }
  return out;
}

const jsxAnims: JsxAnim[] = [];
for (const rel of TSX_FILES) jsxAnims.push(...readJsxAnimations(rel, readFileSync(`${ROOT}/${rel}`, "utf8")));

let failed = parseFailures;
const say = (ok: boolean, msg: string) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };
console.log(`\nM6 — three gates · ${CSS_FILES.length} stylesheet(s) + ${TSX_FILES.length} component file(s) · ${rules.length} rules\n`);

/* ═══ RULE 0 — THE FILE SAYS WHAT IT LOOKS LIKE IT SAYS ══════════════════════
   Both checks here exist because of one real defect, on 2026-08-07: a glob written
   inside a CSS comment closed it early, eleven lines of English joined the third
   gate's selector list, and the browser would have dropped the whole rule. No
   existing gate in the repo could see it — `tsc` does not read CSS, `next build`
   does not fail on a dropped rule, and every design gate greps text.            */

/* 0.1 — ⭐ THE COMMENT-CLOSE TRAP, DETECTED AT ITS ACTUAL SIGNATURE.
   The naive version of this check looks for a starred path inside a comment, and it
   is blind to the very defect it is written for: once a star-slash has closed the
   comment early, the text is no longer *inside* a comment and there is nothing left
   to match. ⭐ What IS unambiguous is the wreckage such a typo leaves in the token
   stream, because CSS comments do not nest and both of these are impossible in a
   correct stylesheet:

     · a `star slash` while NOT inside a comment  → a stray CLOSER. Something closed
       the comment before the author's own terminator got there. THIS is the fatal
       signature, and the 2026-08-07 defect produced it exactly.
     · a `slash star` while already inside one     → the sibling keystroke, harmless
       on its own (comments do not nest) but it is how the fatal one gets typed.

   ⛔ THIS SUBSUMES `test:design-frozen`'s narrower `--token-*` rule, which was
   deleted in the same commit rather than left beside it — one fact, one home
   (design-system/README §0). That rule matched a token family glued to a slash and
   would NOT have caught a path written in prose. */
const strays: string[] = [];
for (const rel of CSS_FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8");
  let inComment = false;
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);
    const where = () => `${rel}:${text.slice(0, i).split("\n").length}  …${text.slice(Math.max(0, i - 48), i + 8).replace(/\s+/g, " ")}…`;
    if (!inComment && pair === "/*") { inComment = true; i++; continue; }
    if (inComment && pair === "*/") { inComment = false; i++; continue; }
    if (!inComment && pair === "*/") { strays.push(`⛔ stray CLOSER — a comment ended early  ${where()}`); i++; continue; }
    if (inComment && pair === "/*") { strays.push(`⚠️ opener inside a comment — a glob in prose  ${where()}`); i++; continue; }
  }
}
say(strays.length === 0, `0.1 ⭐ no stray comment delimiter in any stylesheet (the shape of a comment that ended early)`);
for (const n of strays) console.log(`         ${n}`);

// 0.2 — every selector in the corpus is plausibly a selector. A dropped rule is
// invisible at runtime and invisible to every other gate in this repo; the giveaway
// is a selector carrying spaces where no combinator could be, i.e. English.
const prose = rules.filter((r) =>
  r.sel.split(",").some((p) => /[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(p.trim()) && !/[.#[:]/.test(p.trim().split(/\s+/)[0])),
);
say(prose.length === 0, `0.2 no rule's selector reads as PROSE (the shape of a rule the browser has dropped)`);
for (const r of prose) console.log(`         ${r.file}:${r.line}  ${r.sel.slice(0, 90)}…`);

/* ═══ RULE 1 — THE CALM CLAMP: ONE declaration set, one home, delay included ══ */

/** A universal clamp: a rule whose selector is `*`-based and which zeroes time. */
const isUniversalClamp = (r: Rule) =>
  /(^|,)\s*(?:[^,]*\s)?\*(?:::(?:before|after))?\s*(?:,|$)/.test(r.sel) &&
  /animation-duration\s*:\s*0/.test(r.body);

const clamps = rules.filter(isUniversalClamp);
const gateOf = (r: Rule): string | null => {
  if (r.at.some((a) => /prefers-reduced-motion\s*:\s*reduce/.test(a))) return "prefers-reduced-motion";
  if (/kp-reduce-motion/.test(r.sel) && /data-motion="minimal"/.test(r.sel)) return "kp-reduce-motion + minimal";
  if (/kp-reduce-motion/.test(r.sel)) return "kp-reduce-motion";
  if (/data-motion="minimal"/.test(r.sel)) return "minimal";
  return null;
};

say(clamps.length > 0, `1.0 a universal calm clamp exists at all`);
for (const c of clamps) console.log(`         ${c.file}:${c.line}  [${gateOf(c) ?? "⛔ UNGATED"}]`);

// 1.1 — no copy is ungated. An unconditional `* { animation-duration: 0 }` would
// kill every animation in the product for everybody, so this is worth its own line.
const ungated = clamps.filter((c) => gateOf(c) === null);
say(ungated.length === 0, `1.1 every universal clamp is inside one of the three gates`);
for (const c of ungated) console.log(`         ${c.file}:${c.line}  ${c.sel}`);

// 1.2 — ONE copy per gate. Four copies of this block existed before 2026-08-07
// (two in globals.css, two in motion.css) and they had already drifted: only two
// carried `scroll-behavior`, and NONE carried `animation-delay`.
const byGate = new Map<string, Rule[]>();
for (const c of clamps) {
  const g = gateOf(c) ?? "ungated";
  byGate.set(g, [...(byGate.get(g) ?? []), c]);
}
const dupes = [...byGate].filter(([, v]) => v.length > 1);
say(dupes.length === 0, `1.2 ⭐ exactly ONE clamp per gate — no second copy anywhere in src/**`);
for (const [g, v] of dupes) for (const c of v) console.log(`         [${g}] ${c.file}:${c.line}`);

// 1.3 — THE BUG THIS GATE WAS OPENED FOR. Zeroing the duration does not zero the
// WAIT: a delayed keyframe holds its FIRST frame for the delay and then jumps to
// its last, and with `both`/`backwards` fill that frame is usually opacity: 0.
const noDelay = clamps.filter((c) => !/animation-delay\s*:\s*0/.test(c.body));
say(noDelay.length === 0, `1.3 ⭐ every clamp zeroes animation-delay, not just animation-duration`);
for (const c of noDelay) console.log(`         ${c.file}:${c.line}  [${gateOf(c)}] holds a delayed keyframe on its FIRST frame`);

// 1.4 — the clamps AGREE. Two blocks are unavoidable (CSS cannot put a media
// query and a class in one selector); two blocks that say different things are
// the drift this rule exists to stop.
const decls = (r: Rule) =>
  r.body.split(";").map((d) => d.trim()).filter(Boolean)
    .map((d) => d.replace(/\s+/g, "")).sort().join(" | ");
const sets = new Set(clamps.map(decls));
say(sets.size <= 1, `1.4 the gates' clamp bodies are IDENTICAL (they may not drift apart again)`);
if (sets.size > 1) for (const c of clamps) console.log(`         ${c.file}:${c.line}  ${decls(c)}`);

// 1.5 — ⛔ A PIN, NOT A GAP. transition-delay must NOT be clamped, and a future
// session "completing the list" is the failure mode. A transition's delay is
// usually INTENT: `.kp-tooltip-popover` waits 300ms so a pointer passing over a
// control does not fire the tooltip, and holding the pre-hover state through that
// wait is correct behaviour rather than a stuck frame.
const clampsTransitionDelay = clamps.filter((c) => /transition-delay\s*:/.test(c.body));
say(clampsTransitionDelay.length === 0, `1.5 ⛔ transition-delay is NOT clamped — a hover-intent delay is intent, not motion`);
for (const c of clampsTransitionDelay) console.log(`         ${c.file}:${c.line} clamps transition-delay; see the block comment before "completing" it`);

/* ═══ RULE 2 — THE THIRD GATE COVERS WHAT IT CLAIMS TO ═══════════════════════ */

/**
 * ⭐ KEPT AT `reduced` — deliberately still looping on a low-end device, each for
 * a written reason. ⛔ This list may only SHRINK, and a stale entry FAILS: an
 * exemption that outlives its loop is how a ratchet quietly stops ratcheting.
 */
const KEPT: { sel: string; why: string }[] = [
  { sel: ".live-dot", why: "liveness itself. Re-declared at reduced as opacity-only m-breathe with box-shadow: none — the cheap form, not the loud one" },
  { sel: ".cm-status-dot", why: "same rule, support-chat side" },
  { sel: ".m-live-pip", why: "the kit's liveness pip — the same signal as .live-dot and already the cheap opacity-only m-breathe" },
  { sel: ".m-urgent", why: "a STATE signal (time running out), not decoration; m-breathe is opacity-only" },
  { sel: ".countdown--urgent", why: "cd-pulse is 60s steps(1) — one recomputation a minute, a re-trigger tick rather than motion" },
  { sel: ".countdown--critical", why: "same 60s steps(1) tick" },
];

const REDUCED_ATTR = '[data-motion="reduced"]';
const reducedRules = rules.filter((r) => r.sel.includes(REDUCED_ATTR));

// 2.0 — ⭐ THE THIRD GATE'S LIST IS STILL A SELECTOR LIST. Every comma-separated
// fragment of a rule that mentions the attribute must itself carry it. This is the
// check that would have caught the leaked comment directly: the first fragment was
// English, so it named no tier and the browser dropped all 27 entries with it.
// ⚠️ It asks for `data-motion=`, not for `reduced` specifically: one list may
// legitimately name two tiers (globals.css:2389 covers `.prog-sweep::after` at both
// `reduced` and `minimal`), and a check that demanded the one tier would have
// condemned a correct rule — the failure mode this campaign has paid for most.
const malformed = reducedRules.flatMap((r) =>
  r.sel.split(",").map((s) => s.trim()).filter((s) => s && !s.includes("data-motion="))
    .map((s) => `${r.file}:${r.line}  fragment "${s.slice(0, 70)}" names no motion tier`),
);
say(malformed.length === 0, `2.0 ⭐ every fragment of a third-gate selector list carries the tier attribute`);
for (const m of malformed) console.log(`         ${m}`);
/** Every selector fragment the third gate names, split off the shared attribute. */
const reducedTargets = reducedRules.flatMap((r) =>
  r.sel.split(",").map((s) => s.trim()).filter((s) => s.includes(REDUCED_ATTR))
    .map((s) => s.split(REDUCED_ATTR).slice(1).join(" ").trim()).filter(Boolean),
);

/** Rules that run a loop. `infinite` in an animation shorthand or longhand. */
const loops = rules.filter(
  (r) => /animation(?:-iteration-count)?\s*:[^;]*\binfinite\b/.test(r.body) && !r.sel.includes(REDUCED_ATTR),
);

/**
 * Does the third gate, or the KEPT list, name this rule's own selector?
 *
 * 🔴 THE FIRST VERSION USED A BARE `includes()` AND WAS UNFALSIFIABLE. Renaming the
 * gate entry `.dial-coach` to `.dial-coach-was-here` still satisfied it, because
 * `".dial-coach-was-here".includes(".dial-coach")` is true — so a typo'd, renamed
 * or half-deleted entry went on reporting coverage. The RED harness caught it on
 * its first run (mutation 7 broke the entry and 2.1 stayed green), which is the
 * whole argument for writing the harness before believing the gate.
 * ⛔ A selector name must match to its END: `[.#]name` followed by anything that
 * cannot continue an identifier.
 */
const namesKey = (target: string, key: string) =>
  new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9_-])`, "i").test(target);

const namedBy = (list: string[], sel: string) => {
  const parts = sel.split(",").map((s) => s.trim());
  return parts.every((p) => {
    // the terminal simple selector is what a gate entry has to name
    const keys = [...p.matchAll(/[.#][a-z0-9_-]+/gi)].map((m) => m[0]);
    if (!keys.length) return false;
    return list.some(
      (t) => keys.every((k) => namesKey(t, k)) && (!/::/.test(p) || t.includes(p.slice(p.indexOf("::")))),
    );
  });
};

const unlisted = loops.filter((r) => !namedBy(reducedTargets, r.sel) && !namedBy(KEPT.map((k) => k.sel), r.sel));
say(unlisted.length === 0, `2.1 ⭐ every infinite animation is switched off at "reduced" or KEPT with a reason`);
for (const r of unlisted) console.log(`         ${r.file}:${r.line}  ${r.sel}\n             ${r.body.slice(0, 96)}`);

/**
 * 2.2 — no DEAD entry in the third gate. `.wc-rays` sat in the list naming a class
 * that had been deleted with the drawn rays M3 bans: a list claiming coverage it
 * does not have reads exactly like a list that has it.
 *
 * 🔴 AND THE FIRST VERSION OF THIS CHECK CONDEMNED A LIVE RULE, on its first run.
 * It looked for the bare name behind a `[.\s"'` … `]` class, which does not include
 * `#` — so `#needle-root #wake.on`, alive at `needle.css:46`, read as dead and the
 * gate's advice was to delete a rule that is doing its job. **An ID selector is
 * authored with a `#`.** The token is now searched WITH its own punctuation, which
 * is also what makes the compound `.on` resolvable: as a bare word it appears in
 * hundreds of places, as `.on` in exactly the vendored rule that declares it.
 */
/* 🔴 AND THE SECOND VERSION OF THIS CHECK WAS ALSO GREEN OVER A DEAD ENTRY, for a
   different reason: the corpus was RAW TEXT, so a class named in PROSE read as live
   code. The commit that fixed `.wc-rays` also wrote the words ".wc-rays" into a
   globals.css comment explaining the removal — and that comment was enough to make
   a re-added `.wc-rays` entry pass. ⛔ Comments are blanked here. A class mentioned
   in an explanation is not a class anything renders. */
const corpus = [
  ...CSS_FILES.map((f) => readFileSync(`${ROOT}/${f}`, "utf8")),
  ...TSX_FILES.map((f) => readFileSync(`${ROOT}/${f}`, "utf8")),
]
  .map(blankComments)
  .map((t) => t.replace(/\/\/[^\n]*/g, " "))   // and `.tsx` line comments
  .join("\n")
  // The gate's own list must not vouch for itself. Every entry in it carries the
  // attribute on its own line (that is the house style for this list, and 1.2
  // keeps it the only such list), so dropping those lines removes exactly the
  // self-reference and nothing else.
  .split("\n").filter((l) => !l.includes('data-motion="reduced"')).join("\n");
const dead = reducedTargets.filter((t) => {
  const keys = [...t.matchAll(/[.#][a-z0-9_-]+/gi)].map((m) => m[0]);
  if (!keys.length) return false;
  // Every simple selector in the entry must still be authored somewhere, WITH its
  // own leading `.` or `#` — that is how a selector is written in CSS and how a
  // compound like `.on` stays distinguishable from the English word.
  return keys.some((k) => !corpus.includes(k));
});
say(dead.length === 0, `2.2 the third gate names no DEAD selector (it would claim coverage it has not got)`);
for (const t of dead) console.log(`         ${REDUCED_ATTR} ${t} — nothing in src/** carries this any more; delete the entry`);

// 2.3 — the KEPT list holds no stale entries. Same ratchet rule as test:m1-light's
// pending list and test:design-frozen's allowlist.
const staleKept = KEPT.filter((k) => !loops.some((r) => namedBy([k.sel], r.sel)));
say(staleKept.length === 0, `2.3 the KEPT list holds no stale entries (it may only SHRINK)`);
for (const k of staleKept) console.log(`         "${k.sel}" no longer names an infinite loop; delete the exemption`);

/* ═══ RULE 2b — THE HALF OF THE CORPUS NO SELECTOR CAN REACH ════════════════ */

/**
 * 2.4 — ⭐ THE JSX READER FOUND THE THING IT MEANT TO FIND, and this line comes FIRST
 * on purpose. E-108's lesson is that a guard and its own red proof can agree with each
 * other and both be wrong: two guards located a handoff with a pattern nothing had used
 * since session 23, validated a block from session ~16, and stayed green — while the RED
 * harness mutated the same dead block. A reader that matches NOTHING makes 2.5 below
 * report a clean sweep over a corpus it never opened.
 *
 * So the reader is PINNED to sites measured 2026-08-21, file plus keyframe name. If a
 * regex is ever loosened or tightened by accident the pins vanish and this line names
 * the file. ⚠️ A pin is a RATCHET ENTRY, not a law: moving a site onto a class is the
 * direction this campaign wants (a class is gateable, an inline style is not), and doing
 * so means DELETING its pin in the same change. The list may shrink; it may not rot.
 */
const JSX_PINS: { file: string; name: string; why: string }[] = [
  { file: "src/components/ui/spinner.tsx", name: "spin", why: "the one inline loop we keep — see JSX_KEPT" },
  { file: "src/components/markets/operation-result-modal.tsx", name: "orm-pop", why: "one-shot: every money confirmation's crest" },
  // ⛔ `toast.tsx` / `toast-bar` WAS PINNED HERE AND IS DELETED, 2026-09-04 — the same
  // prescription this check's own failure message gives, and the same move `cd-rise` made
  // below.
  //
  // It moved onto `.toast-countdown`, and the reason is this rule's own subject. As an
  // INLINE style the countdown was ungateable, so both hard clamps zeroed it and `forwards`
  // held the EMPTY frame: a reduced-motion player read "your time is up" under a toast the
  // JS timer was still holding for its full 4.5–8 seconds (E-269). A class is gateable, so
  // `motion.css` can now say what the calm state should be — the rail stays FULL, which is
  // true — and the duration crosses over as `--toast-dwell`, which is data, not motion.
  // Keeping the pin would hold this guard permanently red to commemorate a defect it
  // existed to find.
  // ⛔ `date-select.tsx` / `cd-rise` WAS PINNED HERE AND IS DELETED, 2026-08-22, exactly as
  // this check's own failure message prescribes: *"if it moved onto a class, DELETE this pin."*
  //
  // It moved. Stage 10 pinned it and, IN THE SAME COMMIT, fixed the site it pinned — the
  // dialog named `cd-rise` in an inline style and no `@keyframes cd-rise` existed anywhere,
  // so the declaration was inert and the calendar simply appeared. The repair replaced it
  // with the kit's `.m-dialog-in`, which is a CLASS, so the JSX inline-style reader can never
  // see it again and 2.4 went red on a tree that was strictly more correct than the one the
  // pin was written against. Keeping the pin would mean holding a guard permanently red to
  // commemorate a bug that was fixed.
];
const missedPins = JSX_PINS.filter((p) => !jsxAnims.some((a) => a.file === p.file && a.name === p.name));
say(missedPins.length === 0, `2.4 ⭐ the JSX inline-style reader still finds all ${JSX_PINS.length} pinned sites (a reader that matches nothing passes everything)`);
for (const p of missedPins) {
  console.log(`         ${p.file} no longer yields "${p.name}" — ${p.why}`);
  console.log(`             either the reader's regex broke, or the site moved onto a class. If it moved, DELETE this pin.`);
}

/**
 * 2.5 — ⛔ NO NEW INFINITE ANIMATION MAY BE WRITTEN INTO A JSX `style` ATTRIBUTE.
 *
 * This is the gate the blind spot needed. `KEPT` above is an exemption from being
 * *switched off*; this list is an exemption from being *reachable at all*, which is a
 * strictly worse thing to be, so it is kept separately and starts at ONE.
 *
 * ⭐ WHY THE ONE ENTRY STAYS, IN THE FILE'S OWN WORDS (`spinner.tsx`, §M5/§M6):
 * the kit Spinner IS the in-flight indicator — the answer to "did my tap land?" — and
 * it exists only while a real operation is outstanding. The third gate is a THROTTLE for
 * AMBIENT loops on low-end Android, which is exactly the device where a submit takes
 * longest; stopping the spinner there turns a slow deposit into a frozen button. The two
 * hard clamps still reach it (`animation-duration: 0.01ms !important` beats an inline
 * style), and the stopped ring stays VISIBLE — 0.25 stroke-opacity plus a 90° arc — so
 * the pending state is never conveyed by motion alone.
 *
 * ⛔ AND `button.tsx`'s OWN SPINNER IS NOT AN EXEMPTION AND MUST NOT BECOME ONE. It
 * spins via Tailwind's `animate-spin` CLASS and sets only `animationDuration` inline,
 * so it is reachable by a selector and does not appear here. That is the pattern any
 * new looping element must copy: put the loop on a class, keep the numbers inline.
 */
const JSX_KEPT: { file: string; name: string; why: string }[] = [
  {
    file: "src/components/ui/spinner.tsx",
    name: "spin",
    why: "§M5 names this atom as THE in-flight indicator. Not ambient, not decoration — it exists only while an operation is outstanding, and silence is the wrong answer to \"still working\" on the slowest device. Both universal clamps still reach it and the stopped ring stays visible.",
  },
];
const jsxLoops = jsxAnims.filter((a) => a.infinite);
const jsxUngated = jsxLoops.filter((a) => !JSX_KEPT.some((k) => k.file === a.file && k.name === a.name));
say(jsxUngated.length === 0, `2.5 ⭐ no infinite animation is written into a JSX style attribute (${JSX_KEPT.length} kept, list may only SHRINK)`);
for (const a of jsxUngated) {
  console.log(`         ${a.file}:${a.line}  animation: "${a.raw}"`);
  console.log(`             ⛔ an inline style carries no selector, so [data-motion="reduced"] can NEVER stop this.`);
  console.log(`                Move the loop onto a class and add that class to globals.css §6 — or, if it must`);
  console.log(`                keep running on a low-end device, add it to JSX_KEPT with the reason written out.`);
}

// 2.6 — the same ratchet rule as 2.3: an exemption that outlives its loop is how a
// list quietly stops ratcheting, and it reads exactly like a list that is still true.
const staleJsxKept = JSX_KEPT.filter((k) => !jsxLoops.some((a) => a.file === k.file && a.name === k.name));
say(staleJsxKept.length === 0, `2.6 the JSX_KEPT list holds no stale entries (it may only SHRINK)`);
for (const k of staleJsxKept) console.log(`         ${k.file} no longer runs an inline infinite "${k.name}"; delete the exemption`);

/* ═══ REPORTED, NEVER SILENT ═════════════════════════════════════════════════ */
// ⚠️ "NAMED BY", NOT "SWITCHED OFF" — and the distinction is not pedantry. Two of
// these (.live-dot, .cm-status-dot) are named by the third gate in order to be
// RE-DECLARED as a cheaper loop, not stopped. A line reading "switched off: 27"
// would be a number that quietly means something else than it says, which is the
// shape of every check this campaign has caught lying.
console.log(`\n  infinite loops in the corpus:          ${loops.length}`);
console.log(`  named by the third gate:               ${loops.filter((r) => namedBy(reducedTargets, r.sel)).length}` +
  `  (2 of them re-declared cheaper, not stopped)`);
console.log(`  deliberately KEPT, with a reason:      ${KEPT.length}`);
for (const k of KEPT) console.log(`      · ${k.sel}\n          ${k.why}`);
const fromTsx = loops.filter((r) => r.file.endsWith(".tsx"));
console.log(`  found only in an inline <style> block: ${fromTsx.length}` +
  (fromTsx.length ? `  ⭐ a .css-only gate would have called these unlisted` : ""));
for (const r of fromTsx) console.log(`      · ${r.file}:${r.line}  ${r.sel}`);

/* ⚠️ AND THE THIRD CORPUS, NAMED SEPARATELY BECAUSE IT OBEYS DIFFERENT RULES. These
   are not rules with selectors; nothing in globals.css §6 can reach them. The count of
   INFINITE ones is the number that matters, and it is the one 2.5 ratchets. */
console.log(`\n  animations in a JSX style attribute:    ${jsxAnims.length}` +
  `  (no selector — only the two universal clamps reach these)`);
for (const a of jsxAnims.sort((x, y) => x.file.localeCompare(y.file))) {
  console.log(`      · ${a.file}:${a.line}  ${a.name ?? "⛔ no name parsed"}${a.infinite ? "   ← INFINITE, ungateable at \"reduced\"" : ""}`);
}
console.log(`  of those, INFINITE:                    ${jsxLoops.length}  (${JSX_KEPT.length} kept with a reason — the list may only shrink)`);
for (const k of JSX_KEPT) console.log(`      · ${k.file}  ${k.name}\n          ${k.why}`);
console.log("");
console.log(failed ? `M6 — ${failed} check(s) FAILED\n` : `M6 — all checks passed\n`);
process.exit(failed ? 1 : 0);
