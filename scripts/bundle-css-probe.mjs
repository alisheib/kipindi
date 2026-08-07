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
if (LIVE) {
  console.log(`bundle-css-probe: reading PRODUCTION ${BASE}`);
  const html = await (await fetch(BASE, { headers: { "cache-control": "no-cache" } })).text();
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
];

let failed = 0;
console.log(`\n${FILES.length} bundle(s) · ${css.length.toLocaleString()} bytes\n`);
for (const e of EXPECT) {
  const hit = e.must ? e.must.test(css) : !e.mustNot.test(css);
  if (!hit) failed++;
  console.log(`  ${hit ? "ok  " : "FAIL"} [ATOM ${e.atom}] ${e.what}`);
  if (!hit) console.log(`         pattern: ${(e.must ?? e.mustNot).source.slice(0, 120)}`);
}

// Reported, never silent: a count that moves when a list grows or shrinks.
console.log(`\n  [data-motion="reduced"] entries in the shipped bundle: ${(css.match(/\[data-motion=.?reduced.?\]/g) || []).length}`);
console.log(`  files: ${FILES.join(", ")}`);
console.log(`\n${failed ? `bundle-css-probe — ${failed} expectation(s) FAILED` : "bundle-css-probe — every expected rule is in the shipped CSS"}\n`);
process.exit(failed ? 1 : 0);
