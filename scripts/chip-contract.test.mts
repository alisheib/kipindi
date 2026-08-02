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
import { readFileSync } from "node:fs";
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
