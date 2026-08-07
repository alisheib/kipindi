/**
 * ⭐ DID THE RULE SURVIVE THE BUILD? — the instrument this campaign learned it needed.
 *
 *   npm run build && npm run qa:bundle-css
 *
 * ⛔ WHY THIS EXISTS, MEASURED 2026-08-07 (ATOM A). A CSS rule can be perfectly
 * present in `src/` and completely absent from the product, with no error anywhere:
 * a single stray `star slash` inside a comment ended it eleven lines early, the
 * prose that followed became the head of a selector list, and the browser dropped
 * the entire `[data-motion="reduced"]` rule — all 27 entries of the third
 * reduced-motion gate. `tsc` does not read CSS. `next build` exits 0. Every design
 * gate in this repo greps the SOURCE, so every one of them was green.
 *
 * ⭐ SO: FOR A CSS ATOM, THE SOURCE IS NOT EVIDENCE. The shipped bundle is. This
 * reads `.next/static/chunks/*.css` — post-PostCSS, post-Tailwind, post-minifier —
 * and asserts that named rules are actually in it. It is the CSS half of the same
 * argument `qa:button-contrast` makes for colour: read the artefact, not the intent.
 *
 * ⛔ IT IS NOT A SWEEP AND IT DOES NOT REPLACE LOOKING. It answers exactly one
 * question — "is this declaration in the file the browser downloads?" — which is the
 * question no other gate here can answer. A rule can survive the build and still be
 * overridden, mis-scoped or invisible; that is what the probes and the 4× crops are
 * for.
 *
 * ADDING AN EXPECTATION: append to EXPECT. `must` is a regex over the concatenated
 * bundle; `mustNot` is the same, inverted, for a pin (something that must stay OUT).
 * Name the atom, so a failure says which piece of work regressed.
 */
import { globSync, readFileSync } from "node:fs";

/**
 * ⭐ TWO TARGETS, ONE EXPECTATION LIST — and that is the whole design.
 *
 *   npm run qa:bundle-css                # the local build, .next/static/chunks
 *   npm run qa:bundle-css -- --live      # PRODUCTION's own stylesheets, fetched
 *
 * `--live` is also the honest **deploy detector** for a CSS atom. There is no
 * commit-SHA health endpoint on this service, and "the push succeeded" says nothing
 * about what the browser is being served. So the thing that proves the deploy landed
 * is the same thing that proves the atom landed: the rule is in the stylesheet
 * production hands out. ⛔ Two separate scripts for the two targets would be two
 * lists drifting apart, which is the defect this repo has paid for most.
 */
const LIVE = process.argv.includes("--live");
const BASE = process.env.LIVE_BASE ?? "https://50pick.tz";
const ROOT = process.env.BUNDLE_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

let FILES = [];
let css = "";
let markup = "";
if (LIVE) {
  console.log(`bundle-css-probe: reading PRODUCTION ${BASE}`);
  const html = await (await fetch(BASE, { headers: { "cache-control": "no-cache" } })).text();
  markup = html;
  // Next emits the app's stylesheets as <link rel="stylesheet" href="/_next/static/…">.
  const hrefs = [...new Set([...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]))];
  if (hrefs.length === 0) {
    console.log(`\n⛔ NO STYLESHEET LINK FOUND in ${BASE} — the page shape changed, or the fetch was blocked.`);
    console.log(`   ⚠️ Exiting 2 · INCONCLUSIVE, never 0: "found nothing" must not read as "all checks passed".\n`);
    process.exit(2);
  }
  for (const h of hrefs) {
    const r = await fetch(`${BASE}${h}`, { headers: { "cache-control": "no-cache" } });
    if (!r.ok) { console.log(`\n⛔ ${h} → HTTP ${r.status}\n`); process.exit(2); }
    css += `\n${await r.text()}`;
    FILES.push(h);
  }
} else {
  console.log(`bundle-css-probe: reading ${ROOT}`);
  FILES = globSync(".next/static/chunks/*.css", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
  if (FILES.length === 0) {
    console.log(`\n⛔ NO CSS BUNDLE FOUND under .next/static/chunks/ — run \`npm run build\` first.`);
    console.log(`   ⚠️ Exiting 2 · INCONCLUSIVE, never 0: "nothing to check" must not read as "all checks passed".\n`);
    process.exit(2);
  }
  css = FILES.map((f) => readFileSync(`${ROOT}/${f}`, "utf8")).join("\n");
}

/** ⚠️ The minifier drops spaces and the quotes around attribute values, so every
 *  pattern below is written to tolerate both forms: `[data-motion="reduced"] .x`
 *  ships as `[data-motion=reduced] .x`. A pattern that assumed the authored
 *  spelling would MISS a rule that is present, which is the worse error here. */
const T = String.raw`\[data-motion=.?reduced.?\] ?`;

const EXPECT = [
  // ── ATOM A · 2026-08-07 — the calm clamp and the third gate ────────────────
  { atom: "A", must: /prefers-reduced-motion[^}]*\{[^}]*animation-delay: ?0/, what: "the OS gate zeroes animation-delay, not only duration" },
  { atom: "A", must: /kp-reduce-motion[^{]*\{[^}]*animation-delay: ?0/, what: "the in-app Reduce-motion switch zeroes animation-delay" },
  { atom: "A", must: /data-motion=.?minimal.?\][^{]*\{[^}]*animation-delay: ?0/, what: "the minimal tier zeroes animation-delay" },
  { atom: "A", must: new RegExp(`${T}\\.dial-coach`), what: "⭐ the third gate's rule SURVIVED the build (its inline-<style> loop is listed)" },
  { atom: "A", must: new RegExp(`${T}#needle-root ?#wake\\.on`), what: "the needle's wake halo is gated from outside the vendored file" },
  { atom: "A", must: new RegExp(`${T}\\.m-ambient`), what: "the 64s promoted-layer spin is gated on the target device" },
  { atom: "A", must: new RegExp(`${T}\\.cm-typing span`), what: "the chat typing dots are gated" },
  // ⛔ A PIN, NOT A FEATURE: clamping transition-delay would turn .kp-tooltip's
  // 300ms hover-intent wait into a hair-trigger. See motion.css's block comment.
  { atom: "A", mustNot: /(?:kp-reduce-motion|data-motion=.?minimal.?\])[^{]*\{[^}]*transition-delay/, what: "transition-delay is NOT clamped — hover-intent survives the calm" },

  // ── ATOM B · 2026-08-07 — §B's twelve keyframes and the shimmer-gilt repair ──
  // ⚠️ A keyframe with no consumer is exactly what INTAKE §3 step 2 asks for, and it is
  // also the thing a minifier is most entitled to drop. So these are checked in the
  // BUNDLE rather than the source: if the build ever starts tree-shaking unused
  // keyframes, §C would land on top of nothing and every gate reading source would
  // still be green.
  { atom: "B", must: /@keyframes glyph-settle\b/, what: "the glyph arrival primitive survived into the bundle (M5)" },
  { atom: "B", must: /@keyframes glyph-nudge-up\b/, what: "glyph directional emphasis, up" },
  { atom: "B", must: /@keyframes glyph-nudge-down\b/, what: "glyph directional emphasis, down" },
  { atom: "B", must: /@keyframes glyph-swap-out\b/, what: "glyph state morph, outgoing half" },
  { atom: "B", must: /@keyframes glyph-swap-in\b/, what: "glyph state morph, incoming half" },
  { atom: "B", must: /@keyframes glyph-ring\b/, what: "the bell's decaying pivot" },
  { atom: "B", must: /@keyframes mark-flip\b/, what: "the mark flips on its own needle axis (M8)" },
  { atom: "B", must: /@keyframes mark-pending-tilt\b/, what: "the settling-round ±2° breath" },
  { atom: "B", must: /@keyframes needle-sweep\b/, what: "the needle sweeps to the winning vector — WIN only (M7)" },
  { atom: "B", must: /@keyframes needle-settle\b/, what: "the loss settles crisply against the position (M7)" },
  { atom: "B", must: /@keyframes seal-recoil\b/, what: "the impress recoil, on `translate` so it composes with seal-impress" },
  { atom: "B", must: /@keyframes crest-settle\b/, what: "crest arrival — the smaller cousin of seal-impress" },
  // ⭐ THE ONE NO OTHER CHECK CAN SEE. A single background-position applies to EVERY
  // layer, and `.gilt-metal` has two — one value slides the metal off the button. The
  // minifier may drop the space after the comma, so both spellings are accepted.
  { atom: "B", must: /@keyframes shimmer-gilt\s*\{[^}]*background-position:\s*-?200%\s+0(?:px)?\s*,\s*0/, what: "⭐ shimmer-gilt ships a background-position PER LAYER (one value slides the metal off the button)" },
  // ⛔ PINS: two rules deleted in ATOM B because they named a keyframe that could never
  // run. If either comes back, an animation that plays for nobody comes back with it.
  { atom: "B", mustNot: /animation:\s*win-burst/, what: "`.win-card` stays deleted — win-burst existed only in the calm branch" },
  { atom: "B", mustNot: /animation:\s*wc-trophy-pulse/, what: "`.win-trophy-halo` stays deleted — wc-trophy-pulse is defined nowhere" },

  // ── ATOM C · 2026-08-07 — §C's utilities and the four deferred gilt tokens ──
  { atom: "C", must: /\.mat-raised\s*\{[^}]*--wash-raised/, what: "rung 1 ships and reads the wash (M2)" },
  { atom: "C", must: /\.mat-float\s*\{[^}]*--elev-float/, what: "rung 2 ships" },
  { atom: "C", must: /\.mat-modal\s*\{[^}]*--elev-modal/, what: "rung 3 ships" },
  { atom: "C", must: /\.mat-toast\s*\{[^}]*--elev-toast/, what: "rung 4 ships" },
  { atom: "C", must: /\.mat-inset\s*\{[^}]*--wash-inset/, what: "the sunken well ships" },
  // ⭐ D-6.6's ONE send-back: a tint that composes with ANY rung. It works only because
  // every rung opens its box-shadow with the `--mat-tint` slot — if a rung ever loses
  // the slot, the tint silently stops applying and nothing else would notice.
  { atom: "C", must: /\.mat-tint-yes\s*\{\s*--mat-tint:/, what: "⭐ the rung-independent tint ships (D-6.6's send-back, repaired)" },
  { atom: "C", must: /\.mat-raised\s*\{[^}]*var\(--mat-tint/, what: "⭐ rung 1 still opens its box-shadow with the tint SLOT — the tint composes only through it" },
  { atom: "C", must: /\.gilt-metal\s*\{[^}]*--gilt-sheen[^}]*--gilt-metal/, what: "the money CTA ships with sheen over metal, in that layer order" },
  /**
   * ⭐ THE E-124 CORRECTION, ASSERTED IN THE SPELLING THAT ACTUALLY SHIPS.
   * 🔴 The first version of this expectation looked for `oklch(79% 0.114 84)` and FAILED
   * on a correct bundle — **no `oklch()` survives the build at all.** Next emits each
   * colour twice: a `#hex` fallback and a `lab()` form for browsers that take it. So an
   * expectation written in the authored syntax cannot pass, and "the atom did not land"
   * and "the probe is reading the wrong language" look identical from the outside. That
   * is §5b rule 12 one layer along: assert the value the platform HANDS BACK.
   * ⭐ Verified by round-trip rather than by eye — the shipped `lab(75.8327% 8.07038
   * 48.5249)` converts back through D50→XYZ→linear-sRGB→OKLab to **L 79.00% · C 0.1140 ·
   * H 83.99**, i.e. the measured trademark chroma, not the delivery's 0.095. `#ddb45f` is
   * that same stop in the fallback, and it can only arise from the corrected chroma.
   * ⚠️ Deliberately brittle: if the build ever changes how it emits colour this FAILS
   * loudly and someone looks, which is the right outcome, not a false alarm.
   */
  { atom: "C", must: /--gilt-metal:[^;}]*(?:#ddb45f|lab\(75\.83)/, what: "⭐ the metal's body chroma is the MEASURED 0.114, not the delivery's 0.095 (E-124) — checked in the shipped hex/lab, since no oklch() survives the build" },
  { atom: "C", must: /\.gilt-ink\s*\{[^}]*background-clip:\s*text/, what: "money ink ships as background-clipped type (M4)" },
  { atom: "C", must: /\.mark-pending\s*\{[^}]*mark-pending-tilt/, what: "the settling breath ships" },
  { atom: "C", must: /\[data-motion=.?reduced.?\] ?\.mark-pending/, what: "⭐ …and it is gated on the target device — test:reduce-motion rule 2.1 forced this line" },
  // ⛔ PINS on two corrections to the delivery that a future paste would undo.
  { atom: "C", mustNot: /\.gilt-metal:focus-visible\s*\{[^}]*outline:\s*none/, what: "⛔ the money CTA keeps a real `outline` on focus — a box-shadow ring is invisible in forced-colors (E-129)" },
  { atom: "C", mustNot: /--gilt-bloom/, what: "⛔ `--gilt-bloom` is never landed — MANIFEST, M3 and §C all say the bloom is removed" },

  // ── ATOM D · 2026-08-07 — the first surface a PLAYER can see ────────────────
  // ⭐ The market card and the Up & Down card are both `.mcardp`. This is the first
  // consumer of the wash and the ladder, so these are the expectations that turn
  // "the tokens exist" into "the product uses them".
  { atom: "D", must: /\.mcardp\s*\{[^}]*var\(--wash-raised\)/, what: "⭐ the card is painted by the WASH, not a flat fill — the visible half of M1" },
  { atom: "D", must: /\.mcardp\s*\{[^}]*var\(--elev-raised\)/, what: "the card picks rung 1 rather than composing a shadow (M2)" },
  { atom: "D", must: /\.mcardp:hover\s*\{[^}]*var\(--elev-raised-hover\)/, what: "…and its hover takes the rung's own hover cast" },
  // ⛔ PIN: the bespoke card cast the ladder replaced must not come back. INTAKE §3b —
  // a token that lands while the literal survives has bought nothing.
  { atom: "D", mustNot: /\.mcardp:hover\s*\{[^}]*0 14px 34px/, what: "⛔ the hand-written hover cast stays deleted (the ladder covers it)" },
  { atom: "D", mustNot: /\.mcardp\s*\{[^}]*background:\s*var\(--bg-elevated\)/, what: "⛔ the card's flat fill stays replaced — and `--bg-elevated` itself is untouched (INTAKE §2b)" },

  /**
   * ── ATOM E · 2026-08-07 — M1 over the corpus it had never read ────────────────
   * ⚠️ These seven conversions live in `.tsx` INLINE STYLES, so they are not in the CSS
   * bundle at all — this probe cannot see them and must not pretend to. The falsifiable
   * check for that work is `test:m1-light` (now reading 6 stylesheets + 430 component
   * files, printing 0) plus `red:m1-light` 8/8, which includes a one-sided lamp restored
   * in a `.tsx` and a must-stay-GREEN even ring. ⛔ Recorded here so a future reader does
   * not add an expectation that can never match and then "fix" the product to satisfy it.
   * What IS checkable here is that the tokens those seven sites now reference still ship.
   */
  { atom: "E", must: /--edge-lit:/, what: "`--edge-lit` ships — seven .tsx lamps were converted to reference it or an even ring" },
  { atom: "E", must: /--edge-lit-strong:/, what: "`--edge-lit-strong` ships — the active/rest pairing in the top bar depends on it" },
  /**
   * ⭐ THE MARKUP HALF — the only thing that can detect a `.tsx` deploy. These read the
   * served HTML, which is where an inline style ends up. ⛔ The two `mustNot`s are the pins
   * that matter: they are the exact old values, so if a revert or a stale rollout puts them
   * back, the deploy detector says so instead of reporting 44/44 on an unrelated stylesheet.
   */
  { atom: "E", where: "html", must: /var\(--edge-lit-strong\)/, what: "⭐ the served MARKUP carries the bottom nav's even ring (the .tsx deploy actually landed)" },
  { atom: "E", where: "html", must: /var\(--edge-lit\)/, what: "…and the top bar's rest-state even ring" },
  { atom: "E", where: "html", mustNot: /inset 0 1px 0 oklch\(100% 0 0 \/ 0\.12\)/, what: "⛔ the bottom nav's pure-white top-only line stays gone" },
  { atom: "E", where: "html", mustNot: /inset 0 -1px 0 oklch\(0% 0 0 \/ 0\.20\)/, what: "⛔ …and its bottom shade, the other half of the bevel M1 bans" },
  { atom: "E", where: "html", mustNot: /inset 0 1px 0 oklch\(100% 0 0 \/ 0\.10\)/, what: "⛔ the top bar's rest-state pure-white line stays gone" },
];

let failed = 0;
let skipped = 0;
console.log(`\n${FILES.length} bundle(s) · ${css.length.toLocaleString()} bytes` +
  (LIVE ? ` · ${markup.length.toLocaleString()} bytes of served markup` : "") + `\n`);
for (const e of EXPECT) {
  /**
   * ⭐ AN EXPECTATION MAY TARGET THE MARKUP INSTEAD OF THE STYLESHEET (`where: "html"`),
   * AND THAT GAP COST A FALSE ALARM ON 2026-08-07.
   *
   * ATOM E-1 converted seven one-sided lamps that live in `.tsx` INLINE STYLES — nothing
   * about them reaches the CSS bundle. I used `-- --live` as the deploy detector anyway,
   * it reported 44/44 on the stylesheet, and I then read the live DOM **inside the rollout
   * window** and found the OLD values on the bottom nav and the top bar. For several
   * minutes the evidence said the product had not changed. It had: the served HTML already
   * carried `var(--edge-lit-strong)`, and a re-read showed `0px 0px 0px 1px inset`
   * everywhere. ⛔ **A CSS-only detector cannot gate a change that is not in the CSS**, and
   * "the probe passed" is not "the deploy landed" unless the probe reads the thing that
   * changed.
   *
   * ⚠️ Markup expectations are LIVE-ONLY and are SKIPPED (never silently passed) in the
   * local mode, because there is no server to ask. A skip prints; it does not count as ok.
   */
  const target = e.where === "html" ? markup : css;
  if (e.where === "html" && !LIVE) {
    skipped++;
    console.log(`  skip [ATOM ${e.atom}] ${e.what}\n         (markup expectation — needs \`-- --live\`; there is no served HTML locally)`);
    continue;
  }
  const hit = e.must ? e.must.test(target) : !e.mustNot.test(target);
  if (!hit) failed++;
  console.log(`  ${hit ? "ok  " : "FAIL"} [ATOM ${e.atom}] ${e.what}`);
  if (!hit) console.log(`         pattern: ${(e.must ?? e.mustNot).source.slice(0, 120)}  (in the ${e.where === "html" ? "served MARKUP" : "CSS bundle"})`);
}

// Reported, never silent: a count that moves when a list grows or shrinks.
console.log(`\n  [data-motion="reduced"] entries in the shipped bundle: ${(css.match(/\[data-motion=.?reduced.?\]/g) || []).length}`);
console.log(`  files: ${FILES.join(", ")}`);
console.log(`\n${failed ? `bundle-css-probe — ${failed} expectation(s) FAILED` : "bundle-css-probe — every expected rule is in the shipped CSS"}\n`);
process.exit(failed ? 1 : 0);
