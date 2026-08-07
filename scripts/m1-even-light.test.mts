/**
 * M1 — ONE LAMP. The ratchet over one-sided inner lights.
 *
 *   npm run test:m1-light        # the gate
 *   node scripts/m1-even-light-red.mjs   # the proof it can fail
 *
 * THE LAW (design-system v2, 11-material/EXTEND.md M1):
 *   "Every lit surface catches a soft, EVEN 1px inner ring (--edge-lit) carrying
 *    a 4% royal tint, never pure white — and never a one-sided line; the
 *    direction of the light lives in the WASH (--light-angle, 166deg) …
 *    There is no second lamp; a surface lit from below or from the right is a bug."
 *
 * So the machine-checkable half is pure geometry, and it does not need a colour:
 *
 *   ⭐ AN INSET LAYER THAT CARRIES *LIGHT* IS COMPLIANT IFF ITS X AND Y OFFSETS
 *      ARE BOTH ZERO.
 *
 *   inset 0 0 0 1px …    even 1px ring          ✅ M1
 *   inset 0 0 8px …      even soft inner glow   ✅ M1 (still no direction)
 *   inset 0 1px 0 …      a line on the TOP edge ⛔ direction in the edge
 *   inset 0 -1px 0 …     a line on the BOTTOM   ⛔ ditto
 *
 * ⛔ NON-INSET LAYERS ARE NOT JUDGED HERE, and that is deliberate rather than an
 * omission. A cast is *supposed* to be directional — M1 says "shadows fall
 * straight down" — so `0 8px 22px -10px` is the law being obeyed, not broken.
 * Scoring it would make the gate fail on correct code, which is the failure mode
 * this campaign has paid for more often than any other.
 *
 * 🔴 AND THE FIRST VERSION OF THIS GATE DID EXACTLY THAT, ON ITS FIRST RUN. Judging
 * every offset inset as a lamp condemned three sites that are all correct:
 *
 *   · `.cm-composer` — `inset 0 2px 4px oklch(6% …)`. A DARK, blurred, top-inner
 *     shadow is a SUNKEN WELL, which M1 blesses by name (`--edge-shade`, "inset
 *     wells only"). ⭐ A dark inset is never a second lamp: it is the absence of
 *     light, which is what the one lamp already implies at a lower lip.
 *   · `.admin-tbl tbody tr:hover td:first-child` — `inset 3px 0 0 var(--brand-500)`.
 *     An opaque, zero-blur, purely HORIZONTAL bar is a structural accent RAIL — a
 *     border drawn as a shadow to avoid shifting the layout. M1's lamp hangs high
 *     above the plane; nothing reads a 3px solid brand-blue bar as illumination.
 *
 * So the gate reads a lightness — from the source text, where the value is an
 * authored `oklch(L% …)` or a `var()` it can resolve in the same corpus. ⚠️ This
 * is NOT the §5b rule-12 trap: that one is about scraping `getComputedStyle`,
 * which hands back `lab()` and gets read as RGB. Here the author's own L is on
 * the page. ⛔ A lightness this file CANNOT resolve is treated as a LAMP, because
 * a gate that waves through what it could not read is not a gate.
 *
 * ⛔ THE ALLOWLIST MAY ONLY SHRINK, and a stale entry FAILS. An exemption that
 * outlives its violation is how a ratchet quietly stops ratcheting: the number
 * stays put and reads as "still to do" when the work is already done.
 */
import { readFileSync } from "node:fs";
import { m1Corpus } from "./m1-corpus.mjs";

// ⛔ RE-AIMABLE, AND IT PRINTS WHAT IT READ. Two sessions share this working
// tree, so the RED harness copies the stylesheets somewhere else and points the
// gate at the copy rather than mutating `src/` — the same rule `CONTRAST_CSS`
// follows next door. A gate you can re-aim is only honest if it says where it
// looked, so it does, on every run.
const ROOT = process.env.M1_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 THE CORPUS IS MORE THAN ONE LANGUAGE — 2026-08-07 (ATOM E), AND THIS RATCHET HAD
 * BEEN DECLARING ITSELF COMPLETE OVER A CORPUS THAT EXCLUDED HALF THE PRODUCT.
 *
 * It read `src/**` stylesheets only. On 2026-08-06 (ATOM 8) it printed
 * `one-sided LAMPS still to convert: 0 · ⭐ THE M1 SWEEP IS COMPLETE`, and that sentence
 * was believed — by me, in this file's own comments. Measured the day after, over `.tsx`
 * inline `boxShadow:` values and `<style>` blocks: **FIVE one-sided inner lamps**, two of
 * them PURE WHITE (which M1 bans a second time over), and **two of them on the wallet** —
 * the money surface. `page.tsx:316` · `page.tsx:385` · `wallet-client.tsx:53` ·
 * `wallet-client.tsx:129` · `cashback-promo.tsx:40`.
 *
 * ⭐ THE LESSON IS ONE THE SIBLING GATES ALREADY LEARNED AND THIS ONE DID NOT.
 * `test:contrast` learned "the corpus is more than one FILE" at E-121, when `.cm-send`
 * sat at 2.55 against a 3.0 floor because the chat lived in a stylesheet nobody read.
 * `test:reduce-motion` was written reading `.tsx` `<style>` blocks from its first line,
 * because two of the loops it governs exist only there. **A ratchet that reports 0 is
 * making a claim about a CORPUS, and the corpus is part of the claim.**
 *
 * ⛔ So "0" now means 0 across both languages, and the count it prints is honest.
 */
// ⛔ ONE definition of the corpus, shared with the RED harness — see m1-corpus.mjs. Two
// copies of a file list is what took `red:contrast` from 21/21 to 0/21 in a single edit.
const { css: CSS_FILES, tsx: TSX_FILES, all: FILES } = m1Corpus(ROOT);
console.log(`m1-even-light: reading ${ROOT}`);
console.log(`  corpus: ${CSS_FILES.length} stylesheet(s) + ${TSX_FILES.length} component file(s)`);

/**
 * The permanent exception, and the ONLY one the law grants.
 * M1's own text blesses a bottom shade for a SUNKEN WELL — a surface below the
 * plane catches no light on its lower lip. `--edge-shade`'s own comment says
 * "inset wells only". ⛔ A raised surface is not a well: `.btn-primary` carried
 * this shape as the lower half of a bevel and lost it in ATOM 5.
 */
const LAW_EXCEPTIONS = [{ file: "src/app/globals.css", token: "--edge-shade" }];

/**
 * ⭐ EMPTY — THE SWEEP IS COMPLETE, 2026-08-06 (ATOM 8 · 2c-c).
 *
 * Seeded at ATOM 5 with 12 entries covering 13 one-sided lights across two
 * stylesheets, and drained in three legs: 2c-a the button family (ATOM 5), 2c-b
 * the three floating rungs (ATOM 6), 2c-c the toast, `.glass-panel`, the two
 * `.pbar` fills and six chat sites (this one). `hits` now reads 0.
 *
 * ⛔ SO THIS LIST'S MEANING HAS CHANGED, AND THAT IS THE POINT. While it had
 * entries, rule 1.1 asked "is every one-sided light either the law's exception or
 * on the schedule?" Empty, it asks the only question worth asking afterwards:
 * **is there a one-sided inner light anywhere in `src/**` at all?** A new entry
 * here would re-open a hole that is now closed, so the answer to "the gate is
 * failing, can I add an exemption" is no — convert the site, or argue that it is
 * a well or a rail and let the classifier say so out loud.
 */
const PENDING: { file: string; snippet: string; atom: string }[] = [];

/** Strip every colour function so only geometry keywords/lengths remain. */
const stripColour = (s: string) =>
  s.replace(/(oklch|oklab|lab|lch|rgba?|hsla?|color-mix|color|var)\([^()]*(\([^()]*\)[^()]*)*\)/g, " ")
    .replace(/#[0-9a-f]{3,8}\b/gi, " ")
    .replace(/\b(transparent|currentcolor|white|black)\b/gi, " ");

/**
 * 🔴 JS STRING SYNTAX IS NOT GEOMETRY — and leaving it in made this gate condemn its own fix.
 *
 * A CSS declaration's value is bare: `inset 0 0 0 1px oklch(…)`. A JSX inline style's value
 * is a JS STRING, sometimes concatenated: `boxShadow: "inset 0 0 0 1px oklch(…)" + "…"`. With
 * the quotes left in, the first geometry token of an even ring came out as `"` rather than
 * `0`, so `zero(g[0])` was false and a perfectly even ring was reported as a one-sided LAMP.
 *
 * ⛔ WHICH MEANS THE FIRST `.tsx` RUN OF THIS GATE WAS RIGHT BY ACCIDENT. It flagged seven
 * real one-sided lamps — every one of them genuinely `inset 0 1px 0`, verifiable by eye — but
 * it would have flagged them identically had they been even, and it DID flag the three even
 * rings that replaced them. **A check that cannot tell the fix from the defect is not
 * measuring the thing it names**, even on a run where its output happens to be correct.
 */
const stripJs = (s: string) => s.replace(/["'`]|\s\+\s/g, " ");

/** Split a shadow value into layers on TOP-LEVEL commas only. */
function layers(value: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) { out.push(value.slice(start, i)); start = i + 1; }
  }
  out.push(value.slice(start));
  return out.map((l) => l.trim()).filter(Boolean);
}

/** Every `--x: oklch(L% …)` in the corpus, so a `var()` in a shadow is resolvable. */
const TOKEN_L = new Map<string, number>();
for (const rel of FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)%/gi)) {
    if (!TOKEN_L.has(m[1])) TOKEN_L.set(m[1], Number(m[2]));
  }
}

/**
 * The lightness this layer paints with, 0–100, or null when it cannot be read.
 * ⛔ null is NOT "probably fine" — the caller treats it as a lamp.
 */
function layerLightness(layer: string): number | null {
  const lit = /oklch\(\s*([\d.]+)%/i.exec(layer);
  if (lit) return Number(lit[1]);
  if (/\b(?:#fff(?:f{1,5})?\b|white\b)/i.test(layer)) return 100;
  if (/\b(?:#000(?:0{1,5})?\b|black\b)/i.test(layer)) return 0;
  const v = /var\(\s*--([a-z0-9-]+)/i.exec(layer);
  if (v && TOKEN_L.has(v[1])) return TOKEN_L.get(v[1])!;
  return null;
}

/**
 * At or below this lightness an inset is the ABSENCE of light — a well, which M1
 * blesses. Above it, the layer is lighter than a surface it could plausibly sit
 * on, so it has to be even.
 *
 * 🔴 15 IS MEASURED, NOT CHOSEN FOR ROUNDNESS, AND THE FIRST VALUE WAS WRONG.
 * A ceiling of 45 waved through `.cm-bubble`'s `inset 0 1px 0 oklch(35% …)` — and
 * that bubble's own background starts at `oklch(24% …)`, so a 35% line on it is a
 * TOP-EDGE HIGHLIGHT, exactly the lamp M1 bans. "Dark" is relative to the surface,
 * and an absolute ceiling only works if it sits under the DARKEST surface in the
 * system: `--bg-inset` is 11% and `--bg` is 13.5%. The two genuine wells in the
 * corpus both paint at 6%.
 * ⚠️ THIS ASSUMES A DARK THEME, which is the only theme this product has. A light
 * surface would carry a well that is darker than it and still well above 15%, so
 * a light mode makes this rule wrong and it has to become surface-relative then.
 */
const SHADE_CEILING = 15;

type Hit = { file: string; line: number; decl: string; layer: string; kind: "lamp" | "well" | "rail" };
const hits: Hit[] = [];
const benign: Hit[] = [];

for (const rel of FILES) {
  const text = readFileSync(`${ROOT}/${rel}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  /**
   * Every declaration whose property is a shadow: `box-shadow` in CSS and inside a `.tsx`
   * `<style>` block, **`boxShadow` in a JSX inline style object**, and any custom property
   * whose name contains `shadow`, `edge` or `elev` (the token ladder lives there).
   *
   * ⛔ `boxShadow` IS THE WHOLE REASON THIS RATCHET'S "0" WAS FALSE. Five one-sided lamps
   * live in JSX inline styles, where the property is camelCased and so matched nothing.
   * ⚠️ The delimiter had to grow a `,` too: in CSS a declaration follows `;` or `{`, but in
   * a style object it follows the previous property's comma — so a corpus that included
   * `.tsx` files but kept the CSS delimiter would have read the files and still found
   * nothing, which is the more dangerous half of the same bug.
   */
  const re = /(^|[;{,])\s*((?:box-shadow)|(?:boxShadow)|(?:--[a-z0-9-]*(?:shadow|edge|elev)[a-z0-9-]*))\s*:([^;}]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const prop = m[2].trim();
    const value = m[3];
    const line = text.slice(0, m.index).split("\n").length;
    for (const layer of layers(value)) {
      if (!/\binset\b/i.test(layer)) continue; // a cast is meant to be directional
      const g = stripJs(stripColour(layer)).replace(/\binset\b/gi, " ").trim().split(/\s+/).filter(Boolean);
      if (g.length < 2) continue; // `inset var(--x)` — geometry lives in the token
      const zero = (t: string) => /^-?0(?:[a-z%]*)$/i.test(t);
      if (zero(g[0]) && zero(g[1])) continue; // both offsets zero → even
      const row = { file: rel, line, decl: prop, layer: layer.replace(/\s+/g, " ").trim() };
      const L = layerLightness(layer);
      // A DARK inset is a sunken well — the absence of light, not a second lamp.
      if (L !== null && L <= SHADE_CEILING) { benign.push({ ...row, kind: "well" }); continue; }
      // An opaque, zero-blur, purely HORIZONTAL inset is a structural accent rail
      // (a border drawn as a shadow so it costs no layout), not illumination.
      if (!zero(g[0]) && zero(g[1]) && (g.length < 3 || zero(g[2])) && !/\/\s*[\d.]+\s*\)/.test(layer)) {
        benign.push({ ...row, kind: "rail" });
        continue;
      }
      hits.push({ ...row, kind: "lamp" });
    }
  }
}

let failed = 0;
const say = (ok: boolean, msg: string) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

console.log(`\nM1 — one lamp · ${FILES.length} css file(s)\n`);

// ⛔ LAW_EXCEPTIONS is NOT consulted here. --edge-shade is a WELL, so the dark-inset
// rule already classifies it as not-light and it never reaches this list; keeping a
// second path that could also admit it would be two answers to one question.
const allowed = (h: Hit) =>
  PENDING.some((p) => p.file === h.file && (h.layer.includes(p.snippet) || h.decl === p.snippet.replace(/:$/, "")));

const unexpected = hits.filter((h) => !allowed(h));
say(unexpected.length === 0, `1.1 ⭐ no one-sided inner light outside the law exception and the pending list`);
for (const h of unexpected) console.log(`         ${h.file}:${h.line}  ${h.decl}: ${h.layer}`);

// ⛔ A stale exemption FAILS. Same rule as test:design-frozen's — an allowlist
// entry that no longer matches anything means the work is done and the number is
// lying about how much is left.
const stale = PENDING.filter(
  (p) => !hits.some((h) => h.file === p.file && (h.layer.includes(p.snippet) || h.decl === p.snippet.replace(/:$/, ""))),
);
say(stale.length === 0, `1.2 the pending list holds no stale entries (it may only SHRINK)`);
for (const p of stale) console.log(`         ${p.file} — "${p.snippet}" (${p.atom}) is CONVERTED; delete this entry`);

// The law exception must still exist AND still classify as a well — if it ever
// reads as a lamp, either the token was lightened or SHADE_CEILING has drifted.
const lawPresent = LAW_EXCEPTIONS.every((e) =>
  benign.some((b) => b.file === e.file && b.decl === e.token && b.kind === "well"),
);
say(lawPresent, `1.3 the documented sunken-well exception (--edge-shade) is declared and still reads as a WELL`);

// ⛔ REPORTED, NEVER SILENT. A category the gate declines to fail on has to be
// printed, or "0 failures" stops meaning "0 one-sided lights" and nobody can tell
// which. Every line below was looked at once and classified for a written reason.
// ⚠️ `hits` can exceed PENDING's length: one entry covers a snippet that appears
// in a rule AND in its :hover. The number to watch is hits, and it must reach 0.
console.log(`\n  one-sided LAMPS still to convert:      ${hits.length}` +
  (PENDING.length === 0 && hits.length === 0
    ? `  ⭐ THE M1 SWEEP IS COMPLETE — no one-sided inner light anywhere in src/**`
    : `  (pending list: ${PENDING.length} entries — the ratchet is done when this reads 0)`));
console.log(`  classified as NOT light, and why:     ${benign.length}`);
for (const b of benign) {
  const why = b.kind === "well"
    ? "dark inset = a sunken well; M1 blesses it (--edge-shade, 'inset wells only')"
    : "opaque zero-blur horizontal bar = a structural accent RAIL, not illumination";
  console.log(`      · ${b.file}:${b.line}  ${b.layer}\n          ${why}`);
}
console.log("");
console.log(failed ? `M1 — ${failed} check(s) FAILED\n` : `M1 — all checks passed\n`);
process.exit(failed ? 1 : 0);
