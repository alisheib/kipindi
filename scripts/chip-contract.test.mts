/**
 * ⭐ G-7 — THE SHARED `Chip` MUST SURVIVE A LABEL LONGER THAN ITS CONTAINER.
 *
 *   npx tsx scripts/chip-contract.test.mts     (npm run test:chip-contract)
 *
 * 🔴 THE FINDING (G-7, live QA campaign, measured on PRODUCTION 2026-08-02). `Chip` was
 * `white-space: nowrap` with a **fixed `height`** (18/21/25px per size). Both are right
 * for a short status pill and both are wrong for a phrase: the chip could neither wrap
 * nor grow, so a long label was simply drawn OUTSIDE its column — with no ellipsis, and
 * with nothing for a document-level overflow check to notice. Reproduced live by giving
 * a real chip a real call site's label: *"Sportradar + GBT integrity unit"* rendered
 * **206×18 inside a 198px column, 8px outside it**.
 *
 * ⚠️ WHY THIS GUARD IS A SOURCE CONTRACT AND THE REAL EVIDENCE IS NOT.
 * A survey of live chips CANNOT catch this and did not: session 9 patched the one known
 * offender **at its call site**, so all **84** chips measured across 7 routes × 4 widths
 * came back clean while the shared component stayed broken for the next long label.
 * The defect is LATENT, and a latent defect has nothing to measure until someone ships
 * the label that trips it. So the live proof is `live/s10-g7-inject.mjs` (a real chip,
 * real deployed CSS, a real container width), and THIS file exists only to stop the two
 * properties that caused it from coming back — which is a source-level fact.
 *
 * ⛔ The `minHeight` swap must stay a NO-OP for one-line chips. `height: auto` +
 * `minHeight: <the old height>` renders a one-line chip at exactly its old height,
 * because its content box is shorter than the min. Verified live: all 84 chips unchanged
 * at 18px after the fix. If a future edit makes the content box TALLER than the min
 * (a bigger `lineHeight`, more `paddingBlock`), every chip on the platform grows — §3
 * pins the arithmetic so that cannot happen silently.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
// ⛔ ONE HOME FOR COMMENT-STRIPPING — see the note at §4's decomment use. `decommentCss` is the
// CSS-aware variant (a `//` inside a `url()` is not a comment); `decomment` is the TS/TSX one.
import { decomment, decommentCss } from "./lib/decomment.mts";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/components/ui/chip.tsx"), "utf8");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

console.log("\n§1 · the two properties that caused G-7 are gone");
ok("1.1 the chip is not whitespace-nowrap via className",
   !/inline-flex[^"]*whitespace-nowrap/.test(src),
   "a chip that cannot wrap is drawn outside its column");
ok("1.2 the chip does not force white-space:nowrap in its style",
   !/whiteSpace:\s*["']nowrap["']/.test(src));
ok("1.3 the chip caps its width at its container",
   /max-w-full/.test(src),
   "without max-w-full it lays out at max-content and hangs off the card");
ok("1.4 the size table's height is applied as minHeight, not height",
   /minHeight:\s*height/.test(src) && /height:\s*["']auto["']/.test(src));

console.log("\n§2 · the size table still exists and still drives the pill's size");
const sizes = [...src.matchAll(/height:\s*(\d+),\s*padding:/g)].map((m) => Number(m[1]));
ok("2.1 every size still declares a height", sizes.length >= 6, `found ${sizes.length}: ${sizes.join(", ")}`);
ok("2.2 the smallest pill is still the kit's 18px", Math.min(...sizes) === 18, `min ${Math.min(...sizes)}`);

console.log("\n§3 · the swap is a NO-OP for one-line chips — the arithmetic, pinned");
// A one-line chip renders at max(minHeight, fontSize x lineHeight + 2 x paddingBlock).
// If the right-hand side ever exceeds the left, EVERY chip on the platform grows.
const lineHeight = Number(/lineHeight:\s*([\d.]+),/.exec(src)?.[1] ?? NaN);
const padBlock = Number(/paddingBlock:\s*([\d.]+),/.exec(src)?.[1] ?? NaN);
ok("3.1 lineHeight and paddingBlock are readable", Number.isFinite(lineHeight) && Number.isFinite(padBlock),
   `lineHeight=${lineHeight} paddingBlock=${padBlock}`);
const pairs = [...src.matchAll(/height:\s*(\d+),\s*padding:[^,]+,\s*fontSize:\s*([\d.]+)/g)]
  .map((m) => ({ h: Number(m[1]), fs: Number(m[2]) }));
ok("3.2 the size table pairs parsed", pairs.length >= 6, `${pairs.length} pairs`);
for (const p of pairs) {
  const content = p.fs * lineHeight + 2 * padBlock;
  // ⚠️ `NaN <= h` is false, so an unreadable value fails — correctly, but it must not
  // then print "under the min" and read like a different failure than it is.
  ok(`3.x a ${p.h}px chip (font ${p.fs}) still renders at ${p.h}px on one line`,
     Number.isFinite(content) && content <= p.h,
     !Number.isFinite(content)
       ? "could not read lineHeight/paddingBlock — the sizing model changed shape"
       : `content box would be ${content.toFixed(2)}px — ${content > p.h ? "TALLER than the min, so every chip on the platform grows" : "under the min"}`);
}

// ===========================================================================
console.log("\n§4 · ONE DEFINITION — the chip is the COMPONENT, and the CSS family is gone");
// ===========================================================================
/**
 * ⭐ PV-13c (2026-09-03). Stage 9 ruled on 2026-08-21 that `<Chip>` is the chip's one
 * definition and the `.chip` / `.chip-*` CSS family is "the copy that goes". That migration
 * then sat half-done for six weeks — **twelve** raw `className="chip chip-*"` call sites across
 * twelve files kept the family alive — and the two definitions DRIFTED exactly as chip.tsx's own
 * header predicted: the component's `signal` variant still held the **aqua** §B4 bans while the
 * CSS class had been corrected to royal by owner ruling. Nothing rendered that variant, so
 * nothing caught it.
 *
 * ⛔ NOTHING ELSE WOULD CATCH THE REGRESSION EITHER, and that was checked rather than assumed:
 * `test:bridge`'s resolve rule covers Tailwind UTILITIES (colour, shadow), not a bare CSS class
 * name, and `test:dead-css` looks the other way (a rule with no consumer, not a class with no
 * rule). So a future `className="chip chip-pending"` would render an UNSTYLED span — visibly
 * wrong, and green in CI. This section is that missing half.
 *
 * ⚠️ `KP_SRC` lets `red:chip-one-home` aim this at a mutated COPY of the tree — the same
 * mechanism `red:tap-floor` and `red:tap-rung` use, and for the same reason: two sessions share
 * this working tree, so a harness that edits `src/` in place can leave the repo dirty if it dies
 * halfway.
 */
{
  const SRC = process.env.KP_SRC || join(ROOT, "src");
  const CSS = join(SRC, "app/globals.css");
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((e) => {
      const p = join(d, e);
      return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(e) ? [p] : [];
    });
  /* Comments are blanked so this row's OWN provenance notes are not read as call sites.
     ⛔ THIS USED TO BE A PRIVATE FOUR-LINE STRIPPER AND `test:decomment` §2.1 CAUGHT IT — the
     may-only-shrink carrier ratchet went 55 → 56 the moment this file was merged, which is the
     ratchet doing exactly its job. A comment stripper is a solved problem with one home
     (`scripts/lib/decomment.mts`); a private copy is a second definition that drifts silently,
     and this one already had: it blanked `//` only when not preceded by `:`, a URL guard the
     shared module handles properly along with strings, regexes and template literals. */
  const cssText = readFileSync(CSS, "utf8");
  // ⛔ The RULE, not a mention: `.chip {` / `.chip-x {` at a declaration position. The
  // provenance comment left in globals.css names these classes on purpose and must not fail.
  const cssRules = [...decommentCss(cssText).matchAll(/(?:^|\n)\s*\.chip(-[a-z-]+)?\s*(?:,[^{\n]*)?\{/g)].map((m) => m[0].trim());
  ok("4.1 globals.css declares NO .chip / .chip-* rule — the component is the only definition",
     cssRules.length === 0,
     `${cssRules.length} rule(s) still declared: ${cssRules.join(" · ").slice(0, 160)}`);

  const hits: string[] = [];
  let scanned = 0;
  for (const f of walk(SRC)) {
    if (f.replace(/\\/g, "/").endsWith("src/components/ui/chip.tsx")) continue;   // the definition itself
    scanned++;
    const body = decomment(readFileSync(f, "utf8"));
    // A raw chip class at a call site, in any of the shapes the twelve migrated sites used:
    // a bare string, a `cn(...)` argument, or a `"chip " + (...)` concatenation.
    for (const m of body.matchAll(/["'`]\s*chip(?:\s|["'`])|["'`]chip-(?:yes|no|live|resolved|pending|objection|signal|new|hot-rose|strong)\b/g)) {
      hits.push(`${f.replace(/\\/g, "/").split("/src/")[1] ?? f}: ${m[0].trim()}`);
    }
  }
  ok("4.2 no call site spells a chip as a CSS class — a tone is a `variant`, a size is a `size`",
     hits.length === 0,
     `${hits.length}: ${hits.slice(0, 6).join(" · ")}`);
  // ⛔ A COVERAGE FLOOR. 4.2 reads "0 hits" the same way whether the tree is clean or the walk
  // reached nothing — the vacuous pass this campaign has shipped before.
  ok("4.3 CONTROL — the scan reached the tree, so 0 hits means 0 defects and not 0 reach",
     scanned > 300, `${scanned} .tsx files scanned (floor 300)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
