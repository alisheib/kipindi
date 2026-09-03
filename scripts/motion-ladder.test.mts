/**
 * E-113 · NO COMPONENT MAY HARDCODE A CSS DURATION — the ladder is the only source.
 *
 *   npm run test:motion-ladder
 *
 * `motion.css` defines six rungs (`--t-flick` 90ms → `--t-max` 620ms) and five easings, and the
 * material audit found **16 components carrying raw `150ms` / `200ms` / inline `cubic-bezier()`
 * in `transition:` and `animation:` strings**. A ladder half the product ignores is not a
 * system; it is a suggestion, and every hardcoded value is a place the next tuning pass will
 * silently miss.
 *
 * ⛔ THIS IS A RATCHET, LIKE `test:design-frozen`. The allowlist below may only SHRINK. Adding
 * an entry is re-opening the hole — put the value on the ladder instead.
 *
 * ⚠️ SCOPED TO CSS STRINGS. A `setTimeout(…, 300)`, a `durationMs` prop or a number in prose is
 * not a hardcoded transition, and flagging those would make the guard noise that gets muted.
 * Only lines carrying `transition:` or `animation:` are read.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 TWO HOLES CLOSED 2026-08-21, AND BOTH WERE IN THE SCAN RATHER THAN IN THE RULE — which
 * is the shape of every blind spot this campaign has found. A gate reporting `0 offenders`
 * over the wrong corpus reads exactly like a gate reporting `0 offenders`.
 *
 *   1 · IT ONLY EVER WALKED `src/components`. A component is not the only place a CSS string
 *       is written: `src/lib/i18n.tsx` carries a whole `<style>` block for the locale-switch
 *       overlay, and `src/app/admin/kyc/[id]/kyc-doc-viewer.tsx` sets `transition` inline on
 *       the document image. Both held raw timings for the guard's entire life. It now walks
 *       ALL of `src/**` and §1.3 pins that widening so it cannot silently revert.
 *
 *   2 · IT ONLY RECOGNISED `ms`. `transition: "stroke-dashoffset 0.5s linear"` is 500ms — a
 *       ladder-range duration written in the other unit — and `\d{2,4}ms` cannot see it. It
 *       was sitting in `src/components/positions/countdown-ring.tsx`, INSIDE the directory
 *       the guard did walk, for its entire life. Sub-second `s` values now count.
 *       ⚠️ Deliberately SUB-SECOND ONLY. `2.4s`, `3.6s` and `64s` are ambient-loop periods;
 *       the ladder's top rung is `--t-max` at 620ms, so it has no rung to offer them and
 *       flagging them would make this guard noise that gets muted. That is a scope decision,
 *       written down, not an oversight.
 *
 * ⭐ AND THE MEASURED COST OF FIXING THE SCAN IS FOUR ENTRIES ON A RATCHET THAT HAD REACHED
 * ZERO. Say that plainly rather than quietly: the list below going 0 → 4 is not a regression
 * in the product, it is the first honest count.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 A THIRD HOLE CLOSED 2026-09-03 (PV-14), AND IT WAS THE WHOLE POINT OF THE GUARD:
 * ⭐ **THIS RATCHET HAD NEVER READ A STYLESHEET IN ITS LIFE.** `walk()` accepted `.tsx` and
 * `.ts` and nothing else, so all six `.css` files under `src/` — including `motion.css`, the
 * ladder this file exists to enforce — were outside the corpus from the day it was written.
 * Its own header says it was built for "16 components carrying raw `150ms` / `200ms` /
 * inline `cubic-bezier()` in `transition:` and `animation:` strings". Those strings live in
 * stylesheets more than anywhere else.
 *
 * ⛔ AND §1.3 — THE ANTI-NARROWING PIN ADDED IN 2026-08-21 FOR EXACTLY THIS FAILURE — PASSED
 * THROUGHOUT. It pins the walk by DIRECTORY (`src/app/`, `src/lib/`, `src/components/`), and
 * every one of those directories holds `.tsx` files, so the pin was satisfied while an entire
 * FILE TYPE was invisible. A pin on one axis certifies nothing about another: that is the same
 * lesson as hole 1, one level of abstraction up, and it is why §2.2 below pins the EXTENSION
 * set and `src/styles/` — a fourth directory §1.3 never named at all.
 *
 * WHAT WAS LIVING IN THE BLIND SPOT: a complete FOURTH motion vocabulary.
 * `src/styles/chat/chat-tokens.css` declared `--cm-ease-{glide,arrive,sink,conduct}` +
 * `--cm-dur-*` — eight hand-typed cubic-beziers and millisecond literals answering to nothing
 * in `motion.css` — under a header reading "brief names → kit easings" while resolving to none
 * of them; plus four hand-typed `animation:`/`transition:` shorthands in `chat-styles.css`
 * bypassing even that layer. It is the precise defect `state-tokens.css` deleted from ITSELF
 * on 2026-08-21 and wrote the obituary of twice in its own header. All twelve are on the
 * ladder now; `--cm-*-sink` was deleted outright (zero consumers, measured).
 *
 * ⚠️ WIDENING THE CORPUS FORCED TWO SCOPE DECISIONS TO BE WRITTEN DOWN RATHER THAN IMPLIED,
 * because both were previously true only by accident of the corpus:
 *   · `motion.css` IS the definition site. It must declare raw curves and raw rungs — that is
 *     what it is for — so it is exempt BY NAME (`DEFINITION_SITE`), printed every run, never
 *     silently skipped. Nothing else may declare a motion value: that is §3.
 *   · AMBIENT LOOP PERIODS keep their raw value. Hole 2 already carved this out for the `s`
 *     unit ("`2.4s` is a loop period the ladder has no rung for"), but in a stylesheet the
 *     same loops are written in `ms` — `2600ms`, `1400ms` — which `RAW_MS` matches. The rule
 *     is `motion.css`'s own frozen census and `state-tokens.css`'s wording, applied verbatim:
 *     a loop may keep its PERIOD, and ⛔ it does NOT get to keep a hand-typed CURVE.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Files still holding raw timings, as measured 2026-08-06. THIS LIST MAY ONLY SHRINK.
 */
const ALLOWLIST = new Set<string>([
  // ⭐ EMPTY, AND IT GOT THERE THE WAY A RATCHET IS SUPPOSED TO — 5 → 2 → 0 in one day.
  //
  // 📌 Started at 5. `needle.tsx`, `reward-burst.tsx` and `win-celebration.tsx` were listed on
  // the assumption they carried raw timings and §1.2 proved they do not — a ratchet that
  // catches its own author's guesses is doing its job.
  //
  // 📌 The last two, `updown-card.tsx` and `round-countdown.tsx`, were a **SCHEDULING**
  // exemption and never a design one: another session was live in `src/components/updown/` on
  // 2026-08-06, so they were left alone to avoid a collision. That session finished its Up &
  // Down work the same day and cleared them itself — both held the identical literal
  // `color 240ms ease`, now `var(--t-base) var(--m-glide)`.
  // ⚠️ `--t-base` (220ms) is the nearest rung and was chosen to PRESERVE the behaviour. The
  // ladder's semantics would argue for `--t-flick` (a colour change travels nowhere), but
  // 240 → 90 is a feel change on the clock counting out a player's last seconds to bet — a
  // deliberate design call, not a side effect of a token migration.
  //
  // ⛔ THIS LIST MAY ONLY SHRINK. Adding an entry re-opens the hole; put the value on the
  // ladder instead.
  //
  // ⚠️ 2026-08-21 — 0 → 4, AND NOT ONE OF THE FOUR IS NEW CODE. All four predate the ratchet
  // and were invisible to it: three sat outside `src/components`, and the fourth wrote its
  // duration in seconds. Each is a real defect, filed rather than fixed because every one of
  // these files is outside this session's ownership.
  //
  // 📌 `src/lib/i18n.tsx` — `.lcl-scrim { animation: lcl-fade 180ms ease-out }` in the
  //    locale-switch overlay's <style> block. 180 → `--t-quick` (160) or `--t-base` (220).
  // 📌 `src/app/admin/kyc/[id]/kyc-doc-viewer.tsx` — `transition: "transform 0.2s"` on the
  //    KYC document image. 200ms is `--t-base` (220) within a rounding the eye cannot hold.
  // 📌 `src/components/positions/countdown-ring.tsx` — `transition: "stroke-dashoffset 0.5s
  //    linear"`. A ring that redraws once a second; `--t-stage` (520) is the rung.
  // 📌 `src/components/ui/spinner.tsx` — ✅ **LEFT THIS LIST 2026-09-03, AND ITS OWN ENTRY
  //    PREDICTED HOW.** It read: *"700ms is a LOOP PERIOD, and the ladder deliberately stops at
  //    `--t-max` (620) because it describes one-shot motion. Moving this to a rung would change
  //    the spinner's feel to satisfy a guard, which is the wrong way round. It stays listed —
  //    visible, not silently exempt — until the ladder gains a period rung."* PV-14 gave it the
  //    general rule instead of a rung: `isAmbientLoop` states, once, that an `infinite`
  //    animation keeps its raw PERIOD and never a hand-typed curve. `animation: "spin 0.7s
  //    linear infinite"` is that case exactly and is its only motion line (verified, not
  //    assumed), so the file-level exemption is now unnecessary and §1.2 said so itself the
  //    first time the widened guard ran. ⭐ A per-file exemption replaced by a written rule is
  //    the ratchet working; keeping the entry once the rule covered it would have hidden the
  //    next offender in that file behind a reason that no longer applied.
  //    (See `test:reduce-motion` §2.5 for the *other*, unrelated reason this atom is special.)
  //
  // ⚠️ SO THE ARITHMETIC OF 2026-09-03 IS 4 → 5 → 4, NOT 4 → 5: `needle.css` joined as a
  // scheduling exemption and `spinner.tsx` left because it no longer needs one. Both moves are
  // named above. The list is the same LENGTH by coincidence and is not the same list.
  //
  // ⚠️ 2026-09-03 (PV-14) — 4 → 5, AND IT IS A SCHEDULING EXEMPTION, NOT A DESIGN ONE. Say
  // that in the same words the entry above it used, because it is the same situation:
  //
  // 📌 `src/components/layout/needle.css` — five raw timings, invisible until the walk started
  //    reading stylesheets today: `transition: opacity {220,320,160,200}ms linear` on
  //    `#shadow`/`#wake`/`#glow`/the blur layer, and `animation: needle-wake-breathe 3.6s
  //    cubic-bezier(0.65,0,0.35,1) infinite` — a loop, so its 3.6s PERIOD is legitimately out
  //    of scope, but the curve is byte-identical to `--m-breathe` and is the one part of that
  //    line the loop carve-out does not cover.
  //    ⛔ NOT FIXED HERE BECAUSE ANOTHER SESSION OWNS THIS FILE RIGHT NOW (the Needle fidget
  //    is live in this shared working tree). Editing it would collide, and a collision is a
  //    worse outcome than a listed, dated, reasoned exemption. Exactly the call made for
  //    `updown-card.tsx`/`round-countdown.tsx` above — and note how that ended: the owning
  //    session cleared its own two entries the same day. ▶ The needle session (or whoever
  //    follows it) removes this line; the fix is four `var(--t-*)` and one `var(--m-breathe)`.
  "src/lib/i18n.tsx",
  "src/app/admin/kyc/[id]/kyc-doc-viewer.tsx",
  "src/components/positions/countdown-ring.tsx",
  "src/components/layout/needle.css",
]);

/**
 * ⛔ THE LADDER'S OWN FILE IS EXEMPT, BY NAME AND OUT LOUD. `motion.css` declares the six rungs
 * and the five curves; a guard that flagged it would be demanding the definition site define
 * nothing. It is printed on every run (see the footer) so the exemption can never become an
 * assumption — and §3 is the other half of the same rule: `motion.css` may declare a motion
 * value and NOTHING ELSE MAY.
 */
const DEFINITION_SITE = "src/app/motion.css";

/**
 * `--dur-stage` is a raw 820ms declared in `globals.css`, and it is NOT a §3 offender: it was
 * examined and deliberately frozen by a prior ruling, recorded at `motion.css:138` — *"Also
 * frozen, recorded rather than migrated: `--dur-stage` stays 820ms for the countdown ring
 * only"*. 820 is above `--t-max` (620), which is the ceiling by design, so the ladder has no
 * rung to offer it. Named here rather than pattern-excluded, so that a SECOND off-ladder token
 * appearing in `globals.css` tomorrow is a failure and not a free ride on this one's reason.
 */
const FROZEN_DECLARATIONS = new Set<string>(["--dur-stage"]);

/**
 * An `animation:` that runs `infinite` is an AMBIENT LOOP, and the ladder tops out at `--t-max`
 * (620ms) because it describes one-shot motion — so a loop's PERIOD has no rung to move to and
 * keeping it raw is the correct answer, not a hole. This is hole 2's carve-out (`2.4s`) stated
 * for the `ms` unit, which is how the same loops are spelled inside a stylesheet.
 *
 * ⛔ IT COVERS THE PERIOD ONLY. `state-tokens.css`'s header is the rule, verbatim: *"What they
 * do NOT get to keep is a hand-typed CURVE."* A loop line still fails on `cubic-bezier(`.
 */
const isAmbientLoop = (line: string) => /\banimation\s*:/.test(line) && /\binfinite\b/.test(line);

const RAW_MS = /\b\d{2,4}ms\b/;
/* Sub-second only — see hole 2 in the header. `0.5s` is 500ms wearing the other unit; `2.4s`
   is a loop period the ladder has no rung for and is deliberately NOT matched.
   ⛔ THE LEADING LOOKBEHIND IS LOAD-BEARING and cost this rule a red run. `\b0?\.\d+s\b`
   looks sub-second and is not: in `2.2s` there is a word boundary between the `2` and the
   `.`, so it happily matched `.2s` and condemned every ambient loop in the product — three
   files the paragraph above explicitly says are out of scope. A guard whose first act is to
   contradict its own written scope is the guard nobody will trust the next time. */
const RAW_SUBSEC = /(?<![\d.])0?\.\d+s\b/;
const RAW_BEZIER = /cubic-bezier\(/;

/** `ML_ROOT` re-aims the whole gate at a scratch tree, so a RED harness never mutates `src/`. */
const ROOT = (process.env.ML_ROOT ?? ".").replace(/\\/g, "/").replace(/\/$/, "");

/**
 * ⛔ `.css` IS LOAD-BEARING AND WAS MISSING FOR THE GUARD'S ENTIRE LIFE — see hole 3. The set
 * is pinned by §2.2 so a future narrowing of this line goes red and NAMES the extension,
 * rather than reporting a clean sweep over a corpus with the stylesheets taken out.
 */
const EXTS = [".tsx", ".ts", ".css"] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.endsWith(x))) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

let pass = 0; const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

/* `SRC` is the real directory on disk; `rel` is the repo-relative key the allowlist and every
   printed line use, so a run under `ML_ROOT` names the same paths as a run in the repo. */
const SRC = join(ROOT, "src").replace(/\\/g, "/");
const files = walk(SRC).map((p) => `src/${p.slice(SRC.length + 1)}`);
const offenders: string[] = [];
const usedExemptions = new Set<string>();

for (const f of files) {
  /* ⛔ BLOCK COMMENTS ARE BLANKED, NOT SKIPPED LINE-BY-LINE. Half this repo's motion files
     open with a long `/** … *\/` explaining which rung replaced which raw value, and those
     explanations name the raw values. The old line-start test caught the `*` continuation
     lines but not the FIRST line of such a block, nor a wrapped sentence that happens to
     start with a word. Blanking preserves newlines so `i + 1` still points at the real line. */
  const raw = readFileSync(`${SRC}/${f.slice(4)}`, "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const hits: string[] = [];
  src.split("\n").forEach((line, i) => {
    if (!/transition\s*:|animation\s*:/.test(line)) return;
    if (/^\s*\/\//.test(line)) return;   // a `//` comment explaining one is not one
    /* An ambient loop keeps its PERIOD (no rung exists above 620ms) but never a hand-typed
       curve — see `isAmbientLoop`. Before the corpus included stylesheets this branch was
       unreachable, because loops are spelled `2.4s` in a .tsx and `RAW_SUBSEC` skips those. */
    if (isAmbientLoop(line)) { if (RAW_BEZIER.test(line)) hits.push(`${f}:${i + 1}`); return; }
    if (RAW_MS.test(line) || RAW_SUBSEC.test(line) || RAW_BEZIER.test(line)) hits.push(`${f}:${i + 1}`);
  });
  if (!hits.length) continue;
  if (f === DEFINITION_SITE) continue;   // the ladder itself — printed in the footer, not silent
  if (ALLOWLIST.has(f)) { usedExemptions.add(f); continue; }
  offenders.push(hits[0] + (hits.length > 1 ? ` (+${hits.length - 1} more)` : ""));
}

/* ── §3's population, gathered in the same pass shape: a custom-property DECLARATION that
   hand-types a curve or a duration. This shape is invisible to §1.1 in EVERY file type, not
   just the ones the walk used to miss — `--cm-ease-arrive: cubic-bezier(…)` carries neither
   `transition:` nor `animation:`, so no per-line filter keyed on those words can ever see it.
   That is why it is its own section rather than a widened regex. */
const declOffenders: string[] = [];
for (const f of files) {
  if (f === DEFINITION_SITE) continue;
  const raw = readFileSync(`${SRC}/${f.slice(4)}`, "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  src.split("\n").forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (/transition\s*:|animation\s*:/.test(line)) return;   // §1.1's population, not this one
    const decl = /^\s*(--[a-z0-9-]+)\s*:/.exec(line);
    if (!decl) return;
    if (FROZEN_DECLARATIONS.has(decl[1])) return;
    if (RAW_BEZIER.test(line) || RAW_MS.test(line) || RAW_SUBSEC.test(line)) {
      declOffenders.push(`${f}:${i + 1} ${decl[1]}`);
    }
  });
}

console.log(`\n── ${files.length} source files scanned under ${ROOT}/src ──\n`);
ok("1.0 the probe actually read source (never measure an empty list)", files.length > 50, `${files.length}`);
ok("1.1 ⭐ no file outside the allowlist hardcodes a CSS duration or easing",
  offenders.length === 0, offenders.slice(0, 6).join(" · "));

// ⛔ A stale exemption is how a ratchet quietly stops ratcheting: the file gets cleaned, the
// entry stays, and the next offender hides behind it.
const stale = [...ALLOWLIST].filter((f) => !usedExemptions.has(f));
ok("1.2 the ratchet holds no stale exemptions", stale.length === 0, stale.join(", "));

/**
 * 1.3 — ⭐ THE SCAN STILL REACHES PAST `src/components`, PINNED BY DIRECTORY.
 *
 * ⛔ This is the E-108 rule applied to a corpus rather than to a locator: a gate that walks
 * the wrong tree reports `0 offenders` in the same words as a gate that walks the right one,
 * and its red harness — mutating a file inside the tree it DOES walk — agrees with it. For
 * the whole life of this guard, everything under `src/app/` and `src/lib/` was invisible, and
 * nothing about its output said so.
 *
 * Both directories are pinned because both hold a REAL raw timing today (see the entries in
 * the allowlist). If one of them ever stops being scanned — a reverted glob, a `walk()` root
 * put back to `src/components` — this line goes red and names the directory, instead of the
 * ratchet quietly reporting a clean sweep over two thirds of the corpus.
 */
const REACHED = ["src/app/", "src/lib/", "src/components/"];
const unreached = REACHED.filter((d) => !files.some((f) => f.startsWith(d)));
ok("1.3 ⭐ the scan reaches src/app, src/lib AND src/components (a narrowed walk reports 0 in the same words)",
  unreached.length === 0, unreached.join(", "));

/**
 * §2 — ⭐ THE CORPUS INCLUDES STYLESHEETS, PINNED BY EXTENSION (PV-14, 2026-09-03).
 *
 * ⛔ §1.3 pins the walk by DIRECTORY and that was not enough: all three of its directories held
 * `.tsx` files, so it passed green for the whole life of the guard while `walk()` accepted no
 * `.css` at all. A pin on one axis certifies nothing about another. §2 pins the OTHER axis —
 * the extension set, and the fourth directory §1.3 never named — so the two together describe
 * the corpus in both dimensions.
 *
 * ⚠️ §2.1 asserts a COUNT, not merely presence. A single stray `.css` reaching the walk would
 * satisfy "at least one" while a whole directory of them was skipped, and `src/` holds six.
 */
console.log("\n§2 · the corpus — stylesheets are in it, pinned by extension");
const cssFiles = files.filter((f) => f.endsWith(".css"));
const tsxFiles = files.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
ok("2.1 ⭐ the walk reads STYLESHEETS (it read none at all until 2026-09-03 — hole 3)",
  cssFiles.length >= 6, `${cssFiles.length} .css file(s): ${cssFiles.join(", ") || "NONE"}`);
ok("2.2 …and still reads .tsx/.ts — the widening added a type, it did not swap one",
  tsxFiles.length > 50, `${tsxFiles.length}`);
ok("2.3 ⭐ src/styles/ is reached — the directory §1.3 does not name, and where the fourth motion vocabulary lived",
  files.some((f) => f.startsWith("src/styles/")), "no file under src/styles/ was scanned");
ok("2.4 the ladder's own file is in the corpus (it is EXEMPT by name, which is not the same as absent)",
  files.includes(DEFINITION_SITE), `${DEFINITION_SITE} not found`);

/**
 * §3 — ⭐ ONLY `motion.css` MAY DECLARE A MOTION VALUE.
 *
 * The other half of hole 3, and the shape that no `transition:`/`animation:` line filter can
 * ever catch: `--cm-ease-arrive: cubic-bezier(0.16, 0.84, 0.36, 1)` is a motion value declared
 * as a custom property, on a line carrying neither keyword. Eight of them shipped in
 * `chat-tokens.css` for the life of the chat surface.
 *
 * ⛔ THIS IS THE §0a RULE WITH TEETH: a namespace over the ladder (`--cm-*` exists for a real
 * name collision with `globals.css`) is legitimate; a namespace that re-declares the VALUES is
 * a second ladder, and two ladders do not stay equal. The one exemption, `--dur-stage`, is
 * named in `FROZEN_DECLARATIONS` with the prior ruling that froze it.
 */
console.log("\n§3 · only motion.css may DECLARE a curve or a duration");
ok("3.1 ⭐ no custom property outside motion.css hand-types a cubic-bezier or a raw duration",
  declOffenders.length === 0, declOffenders.slice(0, 8).join(" · "));
ok("3.2 the frozen-declaration list is not empty (a silent pattern-exclusion would read the same)",
  FROZEN_DECLARATIONS.size >= 1, `${FROZEN_DECLARATIONS.size}`);

console.log(`\n  (ratchet holds ${ALLOWLIST.size} file(s) — the list may only shrink)`);
for (const f of [...ALLOWLIST].sort()) console.log(`      · ${f}`);
console.log(`  (exempt by name, not skipped silently: ${DEFINITION_SITE} — the definition site)`);
console.log(`  (frozen declarations, each with a prior ruling: ${[...FROZEN_DECLARATIONS].join(", ")})`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
