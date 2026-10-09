// keep-run's dash rule: the linear scan (`dashRanges`) against the regex it replaced, over the dictionary (placeholders
// filled), the reviewer's corpora and a dash-heavy random corpus; then the timing of both on the adversarial input.
const kw = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const kr = await import("file:///F:/kipindi-r5e/src/components/ui/keep-run.tsx");
const { dict } = await import("file:///F:/kipindi-r5e/src/lib/i18n-dict.ts");
const IDEO = "㐀-䶿一-鿿豈-﫿";
const OLD = new RegExp(`(?:[^\\s\\-–—/${IDEO}]+|\\S)(?:${kw.KEPT_SPACE}[—–](?=\\s|$)|—+)`, "gu");
const old = (t: string) => [...t.matchAll(OLD)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
const corpus: string[] = [];
const walk = (o: unknown) => { if (typeof o === "string") corpus.push(o.replace(/\{yes\}/g, "NDIO").replace(/\{no\}/g, "HAPANA")); else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v); };
walk(dict);
let seed = 4242; const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const P = ["a", "word", "e-mail", "否", "作", "”", "“", "—", "——", " — ", " –", "– ", "10–20", " ", "  ", String.fromCharCode(0x3000), String.fromCharCode(0xa0), "/", "-", "x", "👍", "。", "，", "HAPANA", "kufupishwa"];
for (let i = 0; i < 40000; i++) { let s = ""; const k = Math.floor(r() * 10); for (let j = 0; j < k; j++) s += P[Math.floor(r() * P.length)]; corpus.push(s); }
let diff = 0;
const shown: string[] = [];
for (const s of corpus) {
  const a = JSON.stringify(old(s)), b = JSON.stringify(kr.dashRanges(s));
  if (a !== b) { diff++; if (shown.length < 12) shown.push(`${JSON.stringify(s)}  old ${a}  new ${b}`); }
}
console.log(`${corpus.length} strings · dash ranges differ in ${diff}`);
for (const x of shown) console.log("   " + x);
const big = "。".repeat(10000), big2 = "word ".repeat(2000) + "— x";
for (const [name, s] of [["'。'*10000", big], ["'word '*2000 + '— x'", big2]] as const) {
  let t0 = performance.now(); old(s); const t1 = performance.now() - t0;
  t0 = performance.now(); kr.dashRanges(s); const t2 = performance.now() - t0;
  console.log(`timing ${name}: regex ${t1.toFixed(1)} ms · scan ${t2.toFixed(2)} ms`);
}
