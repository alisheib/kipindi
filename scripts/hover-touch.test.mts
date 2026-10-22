/**
 * test:hover-touch — A HOVER IS A POINTER'S: NO LIFT, NO SHEEN STICKS TO A TAPPED CONTROL (MASWALI-BUILD S5-FIX-PLATFORM
 * D11; the motion critic's M1 and L6, 2026-10-21).
 *
 *   npx tsx scripts/hover-touch.test.mts     (npm run test:hover-touch)
 *
 * On a touch screen `:hover` sticks to the last element tapped. The kit's `.btn:hover` lift (globals.css) therefore kept a
 * tapped answer raised 2px, and `.gilt-metal:hover` (motion.css) played its once-only sheen at the press of a money commit.
 * L17 (2026-09-27) gated the four fills' hover to pointers that hover; this holds the lift and the sheen to the same rule:
 *   §1 every `.btn:hover` and `.gilt-metal:hover` rule in the app's CSS stands inside `@media (hover: hover)` — and so do
 *      L17's fills, which it must not have undone
 *   §2 PLANTS: each rule as it was (outside the block) is reported
 * The behaviour — a touch-emulated tap leaves no lift and plays no sheen, a mouse hover still lifts and sheens — is
 * `qa:hover-touch` (a running server), reported with the commit.
 * Reads globals.css and motion.css; no server, no browser.
 */
import { readFileSync } from "node:fs";
import { decommentCss } from "./lib/decomment.mts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const j = (v: unknown) => JSON.stringify(v);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Every style rule in a stylesheet with the at-rule preludes it stands inside (a small brace walker, comments out). */
function rules(css: string): Array<{ selector: string; within: string[] }> {
  const s = decommentCss(css);
  const out: Array<{ selector: string; within: string[] }> = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{") {
      const prelude = s.slice(start, i).trim();
      if (prelude.startsWith("@")) stack.push(prelude.replace(/\s+/g, " "));
      else {
        out.push({ selector: prelude.replace(/\s+/g, " "), within: [...stack] });
        // skip the declaration block (no nesting inside a style rule in this codebase)
        let depth = 1;
        for (i = i + 1; i < s.length && depth > 0; i++) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; }
        i--;
      }
      start = i + 1;
    } else if (c === "}") {
      stack.pop();
      start = i + 1;
    } else if (c === ";" && stack.length >= 0 && s.slice(start, i).trim().startsWith("@")) {
      start = i + 1; // an at-rule without a block (@import, @charset)
    }
  }
  return out;
}
const HOVER_GATE = "@media (hover: hover)";
/** A rule that APPLIES the hover: the reduced-motion clamps (`animation: none` under prefers-reduced-motion) only take
 *  motion away, on every pointer, and rightly stand outside the gate. */
const applying = (r: { within: string[] }) => !r.within.some((w) => w.includes("prefers-reduced-motion"));
/** The hover rules named by `pattern` that do NOT stand inside the hover gate. */
const ungated = (css: string, pattern: RegExp) =>
  rules(css).filter((r) => pattern.test(r.selector) && applying(r) && !r.within.includes(HOVER_GATE)).map((r) => `${r.selector} (within ${j(r.within)})`);
const found = (css: string, pattern: RegExp) => rules(css).filter((r) => pattern.test(r.selector) && applying(r)).length;

const GLOBALS = read("src/app/globals.css"), MOTION = read("src/app/motion.css");
const BTN_LIFT = /(^|,\s*)\.btn:hover(:not\(:disabled\))?\s*($|,)/;
const GILT = /(^|,\s*)\.gilt-metal:hover\s*($|,)/;
const FILLS = /(^|,\s*)\.btn-(primary|yes|no|danger|gold):hover(:not\(:disabled\))?\s*($|,)/;

console.log("§1 · the lift, the sheen and the fills answer a pointer that hovers, never a tap");
{
  const lift = ungated(GLOBALS, BTN_LIFT), sheen = ungated(MOTION, GILT), fills = ungated(GLOBALS, FILLS);
  ok(`1.1 · the kit button's hover lift (\`.btn:hover\`, globals.css: ${found(GLOBALS, BTN_LIFT)} rule) stands inside ${HOVER_GATE}`,
    found(GLOBALS, BTN_LIFT) === 1 && lift.length === 0, j(lift));
  ok(`1.2 · struck gilt's hover — its lift and its once-only sheen (\`.gilt-metal:hover\`, motion.css: ${found(MOTION, GILT)} rule) — stands inside ${HOVER_GATE}`,
    found(MOTION, GILT) === 1 && sheen.length === 0 && /\.gilt-metal:hover \{[^}]*animation: shimmer-gilt/.test(decommentCss(MOTION).replace(/\s+/g, " ")), j(sheen));
  ok(`1.3 · L17's five fills keep their gate (${found(GLOBALS, FILLS)} rules)`, found(GLOBALS, FILLS) === 5 && fills.length === 0, j(fills));
  ok("1.4 · CONTROL · the walker sees the gate: the fills are found inside it, and a rule outside any block is found outside",
    rules(GLOBALS).some((r) => FILLS.test(r.selector) && r.within.includes(HOVER_GATE)) && rules(".x:hover { a: b; }")[0]?.within.length === 0);
}

console.log("\n§2 · PLANTS — each rule as it was is reported");
{
  const liftAsWas = GLOBALS.replace(/@media \(hover: hover\) \{\s*(\.btn:hover:not\(:disabled\)\s*\{[^}]*\})\s*\}/, "$1");
  const sheenAsWas = MOTION.replace(/@media \(hover: hover\) \{\s*(\.gilt-metal:hover \{[^}]*\})\s*\}/, "$1");
  ok("2.1 · the lift outside the gate (the rule as it stood) is reported", liftAsWas !== GLOBALS && ungated(liftAsWas, BTN_LIFT).length === 1);
  ok("2.2 · the sheen outside the gate (the rule as it stood) is reported", sheenAsWas !== MOTION && ungated(sheenAsWas, GILT).length === 1);
}

console.log(`\nhover-touch: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exitCode = 1; }
