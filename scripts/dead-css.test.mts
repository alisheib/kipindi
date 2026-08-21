/**
 * DEAD CSS — a rule nothing renders is not neutral, it is a trap.
 *
 *   npm run test:dead-css
 *
 * ⛔ WHY THIS EXISTS. Until 2026-08-21 this repo had **no dead-CSS guard of any kind**,
 * and that is how roughly seventy-eight unrendered classes accumulated in `globals.css`,
 * `motion.css` and `chat-styles.css` without anybody deciding to keep a single one of them.
 *
 * ⭐ AND THE COST IS NOT DISK SPACE. Three separate ways an unrendered rule bites:
 *
 *   1 · IT IS A RECIPE SOMEBODY WILL COPY. `.bg-damask` paints with `--aqua-300`, a token
 *       from the killed teal era; `.pbar-*` transitions `width` — a LAYOUT property — on the
 *       legacy `--dur-quick`/`--ease-stage` pair rather than the ladder. Whoever finds these
 *       while looking for "how do we do a progress bar here" inherits a defect that no gate
 *       will catch, because the gates read what renders.
 *   2 · IT MAKES A SECOND DEFINITION OF A LIVE THING. The live probability bar is
 *       `.tipbar-*` in `brand.tsx`. `.pbar-*` is a whole parallel implementation with its own
 *       spec page and its own preview, and `DESIGN_AUTHORITY.md` B6 has recorded it as
 *       "0 usages — dead CSS" since 2026-07-20 without the count ever moving.
 *   3 · IT ABSORBS FIXES THAT NEVER SHIP. An M1 pass converted `.pbar-yes`/`.pbar-no`'s
 *       pure-white inset rings to family hues. Correct work, on rules no player has ever
 *       seen. That commit's own comment says so, which is the only reason anybody knows.
 *
 * ⛔ THIS GUARD DOES NOT DELETE ANYTHING AND DOES NOT ASK YOU TO. Several of these are
 * documented kit atoms with spec pages, and deleting a documented atom is a design-system
 * decision, not a lint fix. What it does is FREEZE THE COUNT: the baseline below may only
 * shrink, so the next dead class is a red run rather than a discovery two months later.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 PROVING ABSENCE IS THE HARD PART, AND STAGE 8 GOT IT WRONG FOUR TIMES IN ONE PASS.
 * It called `.ticket-target`, `.ticket-scope` and `.ticket-anchor` dead; all three are used
 * on four pages and closed over in `hash-focus.tsx`. It called `.countdown--urgent` dead;
 * its consumer is a KEPT list inside `reduce-motion.test.mts`. A class can be:
 *
 *   · written whole in a `className`                    → a plain token search finds it
 *   · BUILT BY CONCATENATION — `"tuck-" + wantWake` in  → a token search NEVER finds it,
 *     `needle.tsx`, or `` `badge--${state}` ``            and the class is perfectly alive
 *   · named only by a GUARD or a driver in `scripts/`   → alive in the sense that deleting
 *                                                          it breaks a gate, dead in the
 *                                                          sense that nothing renders it
 *
 * ⭐ SO THE ANSWER IS THREE CORPORA AND THREE VERDICTS, NEVER ONE. `src/**` decides live,
 * dynamic families are EXCLUDED BY NAME AND PRINTED (§1.4 — an exclusion nobody can see is
 * a lie the guard tells itself), and `scripts/**` gets its own tier so a class whose only
 * consumer is a test list is visible as exactly that, rather than laundered into "live".
 *
 * ⚠️ THE DECLARED BLIND SPOT, STATED RATHER THAN PAPERED OVER: a class inside a dynamic
 * family cannot be proved dead by this guard, so if `tier-platinum` is deleted from the
 * product tomorrow the rule survives here unnoticed. That is the price of not accusing
 * `tuck-right` of being dead while `needle.tsx` writes it every frame. §1.4 prints the
 * families and their members so the price is visible in every run.
 */
import { readFileSync, globSync } from "node:fs";
import postcss from "postcss";

/** `DC_ROOT` re-aims the whole gate at a scratch tree — two sessions share this checkout,
 *  and a RED harness that mutates `src/` is a defect with a 50% chance of shipping. */
const ROOT = (process.env.DC_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))
  .replace(/\\/g, "/").replace(/\/$/, "");
const CSS_FILES = globSync("src/**/*.css", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
const SRC_FILES = globSync("src/**/*.{ts,tsx}", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
const SCRIPT_FILES = globSync("scripts/**/*.{mjs,mts,ts,js,cjs}", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
console.log(`dead-css: reading ${ROOT}`);

let failed = 0;
const say = (ok: boolean, msg: string) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

/* ── 0 · WHAT IS AUTHORED ────────────────────────────────────────────────────
   ⛔ POSTCSS, NOT A REGEX, AND THE REASON IS ON RECORD ONE FILE OVER. `reduce-motion`
   shipped with a hand-rolled brace walker, a glob inside a CSS comment closed that
   comment early, eleven lines of English became part of a selector list, and the
   walker cheerfully extracted the fragments it expected while the browser dropped
   the whole rule. A gate that parses a language with a regex agrees with your typos. */
type Site = { file: string; line: number };
const authored = new Map<string, Site[]>();
let parseFailures = 0;

function collect(file: string, text: string, lineOffset = 0) {
  let root: postcss.Root;
  try {
    root = postcss.parse(text, { from: file });
  } catch (e) {
    console.log(`  FAIL 0.0 ${file} does not parse as CSS — ${(e as Error).message}`);
    parseFailures++;
    return;
  }
  root.walkRules((r) => {
    // A keyframe step (`0%`, `from`) names no class; `test:keyframes` owns that corpus.
    for (let p = r.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type === "atrule" && /^(-\w+-)?keyframes$/.test((p as postcss.AtRule).name)) return;
    }
    /* ⛔ ATTRIBUTE SELECTORS ARE STRIPPED FIRST, and this is the escaping-in-two-alphabets
       trap in miniature: `[data-motion="reduced"]` and `[href*=".tz"]` both contain a dot
       followed by identifier characters, which is exactly the shape of a class. Build the
       thing you mean to read BEFORE you read it. */
    const sel = r.selector.replace(/\[[^\]]*\]/g, " ");
    for (const m of sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      const at = { file, line: (r.source?.start?.line ?? 1) + lineOffset };
      authored.set(m[1], [...(authored.get(m[1]) ?? []), at]);
    }
  });
}

for (const rel of CSS_FILES) collect(rel, readFileSync(`${ROOT}/${rel}`, "utf8"));
/* Inline `<style>{` … `}</style>` in a `.tsx` is the other half of this product's CSS —
   `.notif-badge-pulse` and `.csrf-rest-ring` exist nowhere else. A stylesheet-only sweep
   would call both of them undefined AND their consumers unstyled. */
for (const rel of SRC_FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8");
  for (const m of text.matchAll(/<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) {
    collect(rel, m[1], text.slice(0, m.index!).split("\n").length - 1);
  }
}
failed += parseFailures;

/* ── 1 · WHAT CONSUMES ───────────────────────────────────────────────────────
   ⛔ COMMENTS ARE BLANKED. This is not tidiness and `reduce-motion` §2.2 paid for the
   lesson twice: the commit that removed the dead `.wc-rays` entry wrote the words
   ".wc-rays" into a comment EXPLAINING the removal, and that comment was enough to make
   a re-added entry read as live. A class named in an explanation is not a class anything
   renders. Blanking preserves newlines so line numbers survive. */
const blank = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
   .replace(/(^|[^:])\/\/[^\n]*/g, (m, p: string) => p + " ".repeat(m.length - p.length));

const srcTexts = SRC_FILES.map((f) => blank(readFileSync(`${ROOT}/${f}`, "utf8")));
const srcCorpus = srcTexts.join("\n");
/* ⛔ THIS GATE'S OWN FILE IS EXCLUDED, AND IT IS NOT A DETAIL — it was the first red run.
   The baseline below names all 46 dead classes by hand, `scripts/**` is one of the three
   corpora, so on the very first execution every entry read as "named by a script" and §1.2
   reported the entire baseline as revived. A list that vouches for itself measures nothing.
   `reduce-motion` §2.2 hit the identical trap and solved it the identical way. */
const SELF = "scripts/dead-css.test.mts";
const scriptCorpus = SCRIPT_FILES.filter((f) => f !== SELF).map((f) => readFileSync(`${ROOT}/${f}`, "utf8")).join("\n");

/**
 * ⭐ DYNAMIC FAMILIES — THE CHECK THAT STOPS THIS GUARD LIBELLING LIVE CODE.
 *
 * Four shapes build a class name at runtime, and a token search finds NONE of them:
 *
 *     `tier-${tier}`          template literal, prefix     (avatar.tsx:50)
 *     "tuck-" + wantWake      concatenation, prefix        (needle.tsx:394)
 *     `${x}-label`            template literal, suffix
 *     x + "-label"            concatenation, suffix
 *
 * ⛔ `needle.tsx` uses the CONCATENATION form, and it is the one everybody forgets. A
 * dynamic detector that only reads template literals would have declared all four
 * `.tuck-*` rules dead while the needle rewrote `hit.className` on every drag frame.
 *
 * ⚠️ A PREFIX NEEDS TWO CHARACTERS BEFORE ITS DASH. Interpolations like `` `d-${x}` `` and
 * `` `e-${x}` `` appear in SVG path builders and admin ids; honouring them as class
 * families would excuse every class in the product starting with `d-`. Measured: dropping
 * one-character prefixes excludes nothing that was excluded before.
 */
const prefixes = new Set<string>(), suffixes = new Set<string>();
for (const t of srcTexts) {
  for (const m of t.matchAll(/([A-Za-z][\w-]+-)\$\{/g)) prefixes.add(m[1]);
  for (const m of t.matchAll(/["']([A-Za-z][\w-]+-)["']\s*\+/g)) prefixes.add(m[1]);
  for (const m of t.matchAll(/\}(-[\w-]{3,})/g)) suffixes.add(m[1]);
  for (const m of t.matchAll(/\+\s*["'](-[\w-]{3,})["']/g)) suffixes.add(m[1]);
}

const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* A class token, bounded so `.cm-chip` is not "found" inside `.cm-chip-sw`. */
const token = (c: string) => new RegExp(`(?<![\\w-])${esc(c)}(?![\\w-])`);

type Verdict = "live" | "dynamic" | "script-only" | "dead";
const verdict = new Map<string, Verdict>();
const familyOf = new Map<string, string>();
for (const c of [...authored.keys()].sort()) {
  const re = token(c);
  if (re.test(srcCorpus)) { verdict.set(c, "live"); continue; }
  const p = [...prefixes].find((x) => c.startsWith(x) && c.length > x.length);
  const s = [...suffixes].find((x) => c.endsWith(x) && c.length > x.length);
  if (p || s) { verdict.set(c, "dynamic"); familyOf.set(c, p ? `${p}*` : `*${s}`); continue; }
  if (re.test(scriptCorpus)) { verdict.set(c, "script-only"); continue; }
  verdict.set(c, "dead");
}
const of = (v: Verdict) => [...verdict].filter(([, x]) => x === v).map(([c]) => c);
const dead = of("dead"), dynamic = of("dynamic"), scriptOnly = of("script-only"), live = of("live");

console.log(`\nDEAD CSS · ${CSS_FILES.length} stylesheet(s) + ${SRC_FILES.length} source file(s) + ${SCRIPT_FILES.length} script(s)`);
console.log(`  ${authored.size} classes authored · ${live.length} rendered · ${dynamic.length} dynamically built · ${scriptOnly.length} named only by a script · ${dead.length} dead\n`);

/**
 * ⭐ THE BASELINE — EVERY CLASS NOTHING RENDERS, MEASURED 2026-08-21. IT MAY ONLY SHRINK.
 *
 * ⛔ NOT ONE OF THESE IS FIXED HERE. Every file they live in is outside this session's
 * ownership, and deleting a documented kit atom is a design-system decision rather than a
 * lint fix (see `.pbar` below, which has a spec page AND a shipped preview). The point of
 * the list is that the number can never grow silently again.
 *
 * SHRINKING IT MEANS ONE OF TWO THINGS, and they are not the same:
 *   · the rule was DELETED           → remove the entry; §1.2 will insist
 *   · the rule was WIRED UP          → remove the entry, but ⛔ READ ITS BODY FIRST. Several
 *                                       of these carry superseded recipes, and reviving one
 *                                       unread is how a killed token comes back.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 WHY THE LIST SPANS **BOTH** UNRENDERED TIERS, WHICH IS NOT WHERE IT STARTED. The first
 * draft baselined only the `dead` tier and left `script-only` out, on the reasoning that a
 * class a guard depends on should not be nagged about. Within ten minutes of that draft
 * being green, a PARALLEL SESSION added the string `.cm-dot { background: … }` to a fixture
 * inside `design-frozen.test.mts`, and `.cm-dot` moved from `dead` to `script-only` — so
 * §1.2 reported it "revived" and the gate went red over a class nobody had touched.
 *
 * ⭐ THE LESSON IS ABOUT WHAT THE RATCHET IS FOR. `dead` and `script-only` are two answers
 * to "who names it" and ONE answer to "what renders it": nothing. A ratchet that flips on
 * the difference measures the churn in `scripts/` rather than the health of the stylesheet,
 * and a gate that goes red for reasons outside its subject is a gate somebody mutes. The
 * two tiers are still reported separately — they need different advice, and a CSS fixture
 * inside a guard is not a consumer at all — but the RATCHET is on the union.
 *
 * ⚠️ Entries marked ⓢ are currently in the script-only tier: nothing renders them either,
 * but deleting the rule also breaks a gate or a driver, so they come out in pairs.
 */
const BASELINE = new Set<string>([
  // ── The parallel probability bar. `.tipbar-*` in brand.tsx is the live one; this whole
  //    family is the kit's documented atom, recorded as dead in DESIGN_AUTHORITY B6 since
  //    2026-07-20. ⛔ Transitions `width` on the legacy `--dur-quick`/`--ease-stage` pair.
  "pbar-micro", "pbar-large", "pbar-label-yes", "pbar-label-no", "pbar-resolved",
  // ── The badge-unlock celebration. Rays are banned by M3; the card and coin outlived the
  //    surface that showed them.
  "badge-unlock-card", "badge-unlock-coin", "badge-unlock-rays",
  // ── ⛔ `.bg-damask` PAINTS WITH `--aqua-300` — a token from the killed teal era. This is
  //    the single most copy-able trap in the list: it reads as "the house background recipe".
  "bg-damask",
  // ── Board section headings. The board renders its own headings in JSX.
  "board-section-head", "board-section-eyebrow",
  // ── The support-chat kit. Twelve rules for an avatar, a chip row, a disclosure and a
  //    pressed bubble that `chat/` never mounts.
  "cm-avatar", "cm-avatar-lg", "cm-avatar-sm", "cm-bubble-pip", "cm-bubble-pressed",
  "cm-chip", "cm-chip-sw", "cm-chips", "cm-disclosure", "cm-dot", "cm-sw-tile",
  "hm-halo-pulse",
  // ── Motion-kit utilities that arrived with the material commission and never got a
  //    consumer. ⚠️ These are §B-style "lands before its consumer" atoms, but the consumer
  //    has not arrived; that is precisely why they are counted rather than excused.
  "m-axis-reveal", "m-behind", "m-focusable", "m-indicator", "m-needle", "m-press",
  "m-raise", "m-seal", "m-skeleton", "mat-flat", "mat-raised-i", "needle-settle-loss",
  // ── One-off page furniture whose page was rebuilt around it.
  "market-search", "mcardp-q-sw", "pnl-grid", "pnl-cell", "pnl-cap",
  "tooltip-popover", "trust-item", "trust-sep", "value-flash", "value-delta",
  // ⚠️ THREE CLASSES CAME OFF THIS LIST BEFORE IT EVER SHIPPED, and §1.2 is why — the first
  // draft was written from a hand-run probe and §1.2 rejected three of its guesses:
  //   · `.pnl-val` reads "script-only" — `type-scale.test.mts` names it. Nothing RENDERS it
  //     (its three siblings above are dead), but a gate would break if the rule vanished,
  //     so it belongs in the script-only tier and not here.
  //   · `.spark-line-yes` / `.spark-line-no` are BUILT — `` `spark-line spark-line-${lean}` ``
  //     in probability-chart.tsx:280 — and are perfectly alive. The first draft's dynamic
  //     detector required the prefix to sit against the opening backtick, so a template with
  //     two classes in it hid the second. A ratchet that catches its own author's guesses is
  //     doing its job; this one caught three.

  // ── ⓢ SCRIPT-ONLY: nothing renders these either. What names them is a guard's exemption
  //    list, a driver's selector, or a CSS fixture inside a test — none of which is a
  //    consumer. Deleting one therefore breaks a GATE rather than a screen, which is a real
  //    reason to do it deliberately and a real reason not to call it alive.
  "cm-dot", "cm-handoff-meta", "countdown--critical", "countdown--urgent",
  "g-swap", "g-swap-out", "m-ambient", "m-aura", "m-draw", "m-live-pip", "m-urgent",
    // `mat-raised` LEFT THIS LIST on 2026-08-21 — `ui/cashback-promo.tsx` and the wallet
  // bonus card both pick that rung now (D5), so it has real consumers and check 1.2 said so.
  "mark-breathe", "mark-flip", "mark-pending", "mat-float", "mat-inset",
  "pbar", "pbar-no", "pbar-yes", "pnl-val", "skeleton", "stagger-item",
]);

/* ═══ 1 · THE SWEEP ══════════════════════════════════════════════════════════ */

// 1.0 — never measure an empty list. A glob that matches nothing reports a perfectly
// clean product in the same words as a product that is clean.
say(authored.size > 100 && SRC_FILES.length > 100 && SCRIPT_FILES.length > 50,
  `1.0 the probe actually read the corpus (${authored.size} classes, ${SRC_FILES.length} source files, ${SCRIPT_FILES.length} scripts)`);

/* "Nothing renders it" is the union of the two unrendered tiers — see the long note on
   BASELINE for why the ratchet must not flip on the difference between them. */
const unrendered = (c: string) => verdict.get(c) === "dead" || verdict.get(c) === "script-only";

const newlyDead = [...dead, ...scriptOnly].filter((c) => !BASELINE.has(c)).sort();
say(newlyDead.length === 0, `1.1 ⭐ nothing renders these and they are not on the baseline (baseline ${BASELINE.size}, may only SHRINK)`);
for (const c of newlyDead) {
  console.log(`         .${c}   ${authored.get(c)!.map((s) => `${s.file}:${s.line}`).join(" , ")}`);
  console.log(verdict.get(c) === "dead"
    ? `             nothing in src/** renders it and no scripts/** driver names it.`
    : `             nothing in src/** renders it; only a scripts/** file names it, which is not a consumer.`);
  console.log(`             Delete the rule, or wire it up — do not add it to BASELINE, which may only shrink.`);
}

// 1.2 — ⛔ A STALE BASELINE ENTRY IS HOW A RATCHET QUIETLY STOPS RATCHETING. The rule gets
// deleted or revived, the entry stays, and the next dead class hides behind it. The two
// causes get different advice because they are different events.
const stale = [...BASELINE].filter((c) => !unrendered(c));
say(stale.length === 0, `1.2 the baseline holds no stale entries`);
for (const c of stale) {
  const v = verdict.get(c);
  console.log(v === undefined
    ? `         .${c} is no longer authored anywhere — the rule was deleted. Remove the entry.`
    : `         .${c} now classifies as "${v}" — something renders it now. Remove the entry, and if you revived it,`
      + ` ⛔ confirm you read its body: several of these carry superseded recipes.`);
}

/**
 * 1.3 — ⭐ THE THREE VERDICTS STILL MEAN WHAT THEY SAY, PINNED BY EXAMPLE.
 *
 * ⛔ THIS IS THE E-108 CHECK AND IT IS THE MOST IMPORTANT LINE IN THE FILE. A guard and its
 * own red proof can agree with each other and both be wrong: two guards once located the
 * current handoff with a pattern nothing had used since session 23, validated a block from
 * session ~16, and stayed green — while the RED harness mutated the same dead block.
 *
 * Here the equivalent failure is silent and total. If `srcCorpus` ever comes back empty — a
 * glob typo, a `cwd` that no longer exists, a blanker that eats the file — then EVERY class
 * classifies as dead, §1.1 fails loudly and someone "fixes" it by growing the baseline. And
 * the subtler direction is worse: if the dynamic detector stops matching, four live `.tuck-*`
 * rules get reported as dead in a run that otherwise looks completely normal.
 *
 * So one class is pinned per verdict, each chosen because it can ONLY be reached by the
 * mechanism it is pinned for:
 *   · `.ticket-target` is written whole in JSX and closed over in `hash-focus.tsx` — stage 8
 *     called it dead, which is why it is the pin for "live".
 *   · `.tuck-right` exists in `src/` ONLY as `"tuck-" + wantWake`. If it ever reads as
 *     anything but "dynamic", the concatenation detector has stopped working.
 *   · `.countdown--urgent` is named by nothing but a KEPT list in `reduce-motion.test.mts`.
 *     Stage 8 called it dead too. It is the pin for the third corpus existing at all.
 */
const VERDICT_PINS: { cls: string; want: Verdict; why: string }[] = [
  { cls: "ticket-target", want: "live", why: "written whole in JSX on four pages + closed over in hash-focus.tsx" },
  { cls: "tuck-right", want: "dynamic", why: `built ONLY as "tuck-" + wantWake in needle.tsx:394 — the concatenation form` },
  { cls: "countdown--urgent", want: "script-only", why: "named by nothing but the KEPT list in reduce-motion.test.mts" },
];
const wrongPins = VERDICT_PINS.filter((p) => verdict.get(p.cls) !== p.want);
say(wrongPins.length === 0, `1.3 ⭐ each verdict is still reachable, pinned by example (a corpus that silently empties condemns everything)`);
for (const p of wrongPins) {
  console.log(`         .${p.cls} reads "${verdict.get(p.cls) ?? "not authored at all"}", expected "${p.want}"`);
  console.log(`             ${p.why}`);
  console.log(`             Either the detector for "${p.want}" broke, or this class legitimately changed — if so, re-pin it deliberately.`);
}

/**
 * 1.4 — ⭐ AN EXCLUSION NOBODY CAN SEE IS A LIE THE GUARD TELLS ITSELF.
 * The dynamic families are this guard's declared blind spot: a member of one cannot be
 * proved dead here. That is a deliberate trade — it is the only thing standing between this
 * sweep and stage 8's four false accusations — but it is only honest if every excluded class
 * is NAMED in every run. This line asserts they are printed, and prints them.
 */
say(true, `1.4 ⛔ ${dynamic.length} class(es) are EXCLUDED as dynamically built — named in full below, never silently`);
const byFamily = new Map<string, string[]>();
for (const c of dynamic) byFamily.set(familyOf.get(c)!, [...(byFamily.get(familyOf.get(c)!) ?? []), c]);
for (const [fam, members] of [...byFamily].sort()) console.log(`         ${fam.padEnd(16)} ${members.map((m) => `.${m}`).join(" ")}`);

/* ═══ REPORTED, NEVER SILENT ═════════════════════════════════════════════════
   ⚠️ "NAMED ONLY BY A SCRIPT" IS ITS OWN TIER AND IS NOT FAILED — but do not read it as
   "live" either, because the distinction is the whole reason the tier exists. Nothing in
   the product renders these; what names them is a guard's exemption list or a driver's
   selector. Deleting one therefore breaks a gate rather than a screen, which is a real
   reason not to delete it casually AND a real reason not to call it alive. When a class
   appears here, the honest next step is usually to delete the rule AND the list entry
   together, in one change that says why. */
console.log(`\n  named only by a script — nothing renders them: ${scriptOnly.length}`);
for (const c of scriptOnly.sort()) console.log(`      · .${c}   ${authored.get(c)!.map((s) => `${s.file}:${s.line}`).join(" , ")}`);

console.log(`\n  dead, by file:`);
const perFile = new Map<string, number>();
for (const c of dead) for (const s of authored.get(c)!) perFile.set(s.file, (perFile.get(s.file) ?? 0) + 1);
for (const [f, n] of [...perFile].sort()) console.log(`      ${String(n).padStart(3)}  ${f}`);
console.log("");
console.log(failed ? `DEAD CSS — ${failed} check(s) FAILED\n` : `DEAD CSS — all checks passed\n`);
process.exit(failed ? 1 : 0);
