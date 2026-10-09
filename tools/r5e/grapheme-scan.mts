// keepNameEnd's CHARACTER pattern against Node's ICU grapheme segmentation, code point by code point.
// UNDER-JOIN = the pattern puts a unit boundary where ICU has none (a cut there would land INSIDE a cluster — H3).
// OVER-JOIN  = the pattern joins what ICU separates (the kept end grows by a character — harmless).
import { readFileSync } from "node:fs";
import { loadCharacter } from "./pattern.mts";
const CHARACTER = loadCharacter(process.env.PAT);
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
console.log(`node ${process.version} · ICU ${process.versions.icu} · Unicode ${process.versions.unicode}`);

/** Boundaries (UTF-16 offsets, excluding 0 and length) of the pattern's units, whitespace runs counted as their own units. */
function patternBounds(s: string): Set<number> {
  const b = new Set<number>();
  let last = 0;
  for (const m of s.matchAll(CHARACTER)) {
    const at = m.index ?? 0;
    // whitespace between units: each whitespace code unit is its own unit
    for (let k = last; k < at; k++) b.add(k);
    b.add(at); last = at + m[0].length;
  }
  for (let k = last; k < s.length; k++) b.add(k);
  b.add(s.length); b.delete(0); b.delete(s.length);
  return b;
}
function icuBounds(s: string): Set<number> {
  const b = new Set<number>();
  for (const g of seg.segment(s)) b.add(g.index);
  b.delete(0);
  return b;
}
const hex = (cp: number) => "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
const ranges = (cps: number[]) => {
  const out: string[] = []; let i = 0;
  while (i < cps.length) { let j = i; while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++; out.push(i === j ? hex(cps[i]) : `${hex(cps[i])}..${hex(cps[j])}`); i = j + 1; }
  return out;
};
type Ctx = { name: string; make: (x: string) => string; at: (x: string) => number };
const CTX: Ctx[] = [
  { name: "a + X", make: (x) => "a" + x, at: () => 1 },
  { name: "X + a", make: (x) => x + "a", at: (x) => x.length },
  { name: "क् + X", make: (x) => "क्" + x, at: () => 2 },
  { name: "ᄀ(L) + X", make: (x) => "\u1100" + x, at: () => 1 },
  { name: "가(LV) + X", make: (x) => "가" + x, at: () => 1 },
  { name: "각(LVT) + X", make: (x) => "각" + x, at: () => 1 },
  { name: "👩‍ + X", make: (x) => "👩\u200D" + x, at: () => 3 },
  { name: "🇹 + X", make: (x) => "\u{1F1F9}" + x, at: () => 2 },
  { name: "space + X", make: (x) => " " + x, at: () => 1 },
];
for (const c of CTX) {
  const under: number[] = [], over: number[] = [];
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const x = String.fromCodePoint(cp);
    const s = c.make(x);
    const at = c.at(x);
    const p = patternBounds(s).has(at), i = icuBounds(s).has(at);
    if (p && !i) under.push(cp);
    else if (!p && i) over.push(cp);
  }
  console.log(`\n[${c.name}] under-join ${under.length}: ${ranges(under).slice(0, 40).join(" ")}${under.length > 40 ? " …" : ""}`);
  console.log(`   over-join ${over.length}: ${ranges(over).slice(0, 12).join(" ")}${over.length > 12 ? " …" : ""}`);
}
