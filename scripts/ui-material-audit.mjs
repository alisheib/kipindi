/**
 * A MATERIAL + MOTION AUDIT OF THE WHOLE UI KIT.
 *
 *   node scripts/ui-material-audit.mjs
 *
 * The celebration critique was written from screenshots of six surfaces. Ali asked for the whole
 * kit, once, so this reads every component and scores it on the four things that separate a
 * product that feels expensive from one that does not:
 *
 *   LIGHT      does it have a gradient / specular / inner highlight, or is it a flat fill?
 *   ELEVATION  does it sit on a plane — a shadow or a ring — or share the page's surface?
 *   MOTION     does it animate at all?
 *   TOKENS     if it animates, does it use the kit vocabulary (`--m-` / `--t-`) or hardcoded ms?
 *              ⚠️ Do NOT write the glob form of those token names inside a block comment — the
 *              `*` followed by `/` closes it. This file crashed on exactly that, which is the
 *              trap already recorded against the design system's own tokens.
 *
 * ⛔ THIS IS A PRE-FLIGHT, NOT A VERDICT. A component can score 0 and be correct — a text input
 * should not glow. The output is a map of where material is ABSENT, to be read by a human
 * against what each component is FOR. It ranks; it does not judge.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";

const ROOTS = ["src/components/ui", "src/components/updown", "src/components/markets",
  "src/components/layout", "src/components/brand", "src/components/admin", "src/components/wallet"];

const files = [];
for (const r of ROOTS) {
  let entries = [];
  try { entries = readdirSync(r); } catch { continue; }
  for (const e of entries) {
    const p = `${r}/${e}`;
    if (!e.endsWith(".tsx")) continue;
    if (statSync(p).isFile()) files.push(p);
  }
}

const has = (s, re) => re.test(s);
const rows = files.map((f) => {
  const src = readFileSync(f, "utf8");
  // ⛔ Strip comments — this file is full of prose about gradients and animation, and a guard
  // that greps a defect will otherwise match the comment explaining it.
  const s = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const light     = has(s, /gradient|specular|inset 0|backdrop-filter|blur\(/i);
  const elevation = has(s, /shadow|--shadow-|ring-|elevat/i);
  const motion    = has(s, /animation|animate|transition|keyframes|@keyframes|motion|\bease\b/i);
  const tokens    = has(s, /--m-[a-z]|--t-[a-z]|var\(--ease|var\(--dur/);
  // hardcoded timing that bypasses the ladder
  const hardMs    = [...s.matchAll(/(?<!var\(--[a-z-]{1,20}\s*,\s*)\b(\d{2,4})ms\b/g)].map((m) => m[1]);
  const score = (light ? 0 : 1) + (elevation ? 0 : 1) + (motion ? 0 : 1);
  return { f: f.replace("src/components/", ""), light, elevation, motion, tokens, hardMs: hardMs.length, score, lines: src.split("\n").length };
});

const mark = (b) => (b ? "✅" : "  ");
rows.sort((a, b) => b.score - a.score || b.lines - a.lines);

console.log(`\n${rows.length} components audited across ${ROOTS.length} directories\n`);
console.log("  gap  light elev  motion tok  hard-ms  component");
console.log("  ───  ───── ────  ────── ───  ───────  ─────────");
for (const r of rows) {
  const flag = r.score === 3 ? "🔴" : r.score === 2 ? "🟠" : r.score === 1 ? "🟡" : "  ";
  console.log(`  ${flag} ${r.score}   ${mark(r.light)}    ${mark(r.elevation)}    ${mark(r.motion)}   ${mark(r.tokens)}   ${String(r.hardMs).padStart(4)}    ${r.f}`);
}

const n = rows.length;
const pc = (k) => `${rows.filter(k).length}/${n} (${Math.round(rows.filter(k).length / n * 100)}%)`;
console.log(`\n── the shape of it ──`);
console.log(`   have NO light (flat fill only):        ${pc((r) => !r.light)}`);
console.log(`   have NO elevation (share the plane):   ${pc((r) => !r.elevation)}`);
console.log(`   have NO motion at all:                 ${pc((r) => !r.motion)}`);
console.log(`   animate but bypass the token ladder:   ${pc((r) => r.motion && !r.tokens)}`);
console.log(`   carry hardcoded ms timings:            ${pc((r) => r.hardMs > 0)}`);
console.log(`\n   🔴 all three absent: ${rows.filter((r) => r.score === 3).length} components`);
