// Turns the characters that were meant as escapes back into escapes, in the given files (no escape sequence appears in
// this script: every code point is a number). Usage: node fix-escapes.mjs <file>...
import { readFileSync, writeFileSync } from "node:fs";
const RANGES = [
  [0x00a0, 0x00a0], [0x0300, 0x036f], [0x0600, 0x06ff], [0x0900, 0x097f], [0x0e00, 0x0eff], [0x1100, 0x11ff],
  [0x2000, 0x200f], [0x2028, 0x202f], [0x205f, 0x206f], [0x20d0, 0x20ff], [0x2212, 0x2212], [0x3000, 0x3000], [0x303f, 0x303f],
  [0xa960, 0xa97f], [0xac00, 0xd7a3], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xff00, 0xff00], [0xff61, 0xff9f], [0xffef, 0xffef],
];
const BS = String.fromCharCode(92);
const conv = (cp) => RANGES.some(([a, b]) => cp >= a && cp <= b);
for (const p of process.argv.slice(2)) {
  const s = readFileSync(p, "utf8");
  let n = 0;
  const out = Array.from(s).map((c) => {
    const cp = c.codePointAt(0);
    if (cp <= 0xffff && conv(cp)) { n++; return BS + "u" + cp.toString(16).padStart(4, "0"); }
    return c;
  }).join("");
  writeFileSync(p, out, "utf8");
  console.log(`${p}: ${n} characters written back as escapes`);
}
