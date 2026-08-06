/**
 * E-111 · NO CREST STROKE MAY RENDER SUB-PIXEL AT ANY SIZE THE PRODUCT USES.
 *
 *   npm run test:crest-legibility
 *
 * 🔴 WHY THIS EXISTS. `identity-avatar.tsx` draws four generative heraldic crests into a
 * `viewBox="0 0 100 100"`, so a stroke of `w` units renders as `w × size / 100` CSS px. The
 * crests shipped with hairlines of 0.7–0.8u and gilt rings of 1u — and at the six sizes the
 * component is actually used at, **not one stroke reached a single CSS pixel**. The heraldic
 * layer was drawn, shipped, and invisible; what reached the screen was initials in a circle.
 *
 * ⛔ THE CHECK IS ARITHMETIC ON THE RENDERED VALUE, NOT A GREP FOR A HELPER. Asserting that the
 * file "calls `su()`" would pass over `su(0.01, size)`, which is the symbol without the
 * behaviour — the mistake this campaign has made six times. So: parse every stroke expression,
 * evaluate it at every real size, and require ≥ 1 CSS px.
 */
import { readFileSync } from "node:fs";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const FILE = "src/components/ui/identity-avatar.tsx";
/** Every size `Avatar` maps to — the only sizes that can reach a screen. */
const SIZES = [20, 28, 40, 48, 56, 80];
/** The floor. Below this a stroke is a grey smear on a 1× display. */
const MIN_PX = 1;

const src = readFileSync(FILE, "utf8");
const su = (cssPx: number, size: number) => (cssPx * 100) / size;

console.log("\n── 1 · every stroke, evaluated at every size it can render at ──");
{
  // `strokeWidth={Math.max(A, su(B, size))}` and the bare `strokeWidth="A"` form.
  const dyn = [...src.matchAll(/strokeWidth=\{Math\.max\(([\d.]+),\s*su\(([\d.]+),\s*size\)\)\}/g)]
    .map((m) => ({ raw: m[0], base: +m[1], min: +m[2] }));
  const fixed = [...src.matchAll(/strokeWidth="([\d.]+)"/g)].map((m) => ({ raw: m[0], base: +m[1], min: 0 }));

  // ⛔ REFUSE TO PASS VACUOUSLY. `[].every()` is true, so an empty parse would score green
  // with the feature deleted.
  ok("1.0 the probe actually found strokes to measure", dyn.length + fixed.length >= 10,
    `${dyn.length} floored + ${fixed.length} fixed`);

  const bad: string[] = [];
  for (const s of [...dyn, ...fixed]) {
    for (const size of SIZES) {
      // 10u is the guilloché rosette band — a filled design element, not a hairline, and it
      // is 2px even at 20px. Excluded by VALUE, not by position in the file.
      if (s.base >= 6) continue;
      const units = s.min ? Math.max(s.base, su(s.min, size)) : s.base;
      const px = (units * size) / 100;
      if (px < MIN_PX - 1e-9) bad.push(`${s.raw} → ${px.toFixed(2)}px @${size}`);
    }
  }
  ok(`1.1 ⭐ no stroke renders below ${MIN_PX} CSS px at 20/28/40/48/56/80`,
    bad.length === 0, bad.slice(0, 4).join(" · "));
}

console.log("\n── 2 · the pips are a mark, not a speck ──");
{
  const m = /r=\{Math\.max\(([\d.]+),\s*su\(([\d.]+),\s*size\)\)\}/.exec(src);
  ok("2.0 the pip radius is floored at all", !!m, "no floored r={} found");
  if (m) {
    const worst = Math.min(...SIZES.map((s) => (Math.max(+m[1], su(+m[2], s)) * s) / 100));
    ok("2.1 ⭐ the chief pips are at least 1px in radius at every size",
      worst >= 1 - 1e-9, `smallest ${worst.toFixed(2)}px`);
  }
}

console.log("\n── 3 · the floor preserves the designed weight where it was already right ──");
{
  // ⛔ A floor that OVERRODE the design at 80px would be a taste change smuggled in as a fix.
  const dyn = [...src.matchAll(/Math\.max\(([\d.]+),\s*su\(([\d.]+),\s*size\)\)/g)].map((m) => ({ base: +m[1], min: +m[2] }));
  const overridden = dyn.filter((s) => su(s.min, 80) > s.base);
  ok("3.1 at 80px the original designed widths still win for the outer rings",
    overridden.every((s) => s.base < 1.5), `${overridden.length} lifted at 80px`);
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
