// The linear readers against the patterns they replaced (the same KEPT_SPACE), on a corpus built to hit their edges:
// words glued to years and punctuation, runs of spaces of every kind, digit choices in chains. Code points as numbers.
import { markup } from "./h.ts";
const kw = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const kr = await import("file:///F:/kipindi-r5e/src/components/ui/keep-run.tsx");
const K = kw.KEPT_SPACE;
const OLD_LAST_KEPT = new RegExp(`\\S+${K}\\S+(?:${K})?$`);
const OLD_LAST_ANY = new RegExp(`\\S+${K}\\S+\\s*$`);
const OLD_YEAR = new RegExp(`\\S+${K}(?:1[89]|2\\d)\\d{2}(?=$|[\\s.,;:!?)\\]。，；：])`, "g");
const OLD_DIGIT = new RegExp(`\\d+${K}\\S{1,3}${K}\\d+`, "g");
const c = (n: number) => String.fromCharCode(n);
const TOK = ["Act", "2022", "2022,", ",Law", "1999.", "(Act", "2022)", "3000", "1799", "16221", "6", "or", "au", "7", "16", "x", "a", "b", "Phones", "only.",
  " ", " ", "  ", "\t", "\n", c(0xa0), c(0x3000), c(0x2003), c(0x3002), "-", "—", "1", "12", "或"];
let seed = 99; const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
let n = 0, bad = 0;
const fail = (what: string, s: string, a: unknown, b: unknown) => { bad++; if (bad <= 8) console.log(`DIFF ${what} ${JSON.stringify(s)} old ${JSON.stringify(a)} new ${JSON.stringify(b)}`); };
for (let i = 0; i < 100000; i++) {
  let s = ""; const k = Math.floor(r() * 9);
  for (let j = 0; j < k; j++) s += TOK[Math.floor(r() * TOK.length)];
  n++;
  // keepLastWords' start (kept trailing space) and keepText's tail (any trailing space, trimmed)
  const a1 = s.search(OLD_LAST_KEPT), b1 = kw.lastTwo(s, "kept")?.[0] ?? -1;
  if (a1 !== b1) fail("lastTwo kept", s, a1, b1);
  const m2 = OLD_LAST_ANY.exec(s), a2 = m2 ? [m2.index, m2.index + m2[0].trimEnd().length] : null, b2 = kw.lastTwo(s, "any");
  if (JSON.stringify(a2) !== JSON.stringify(b2)) fail("lastTwo any", s, a2, b2);
  // keepYears: the old runs vs the drawn runs
  const a3 = [...s.matchAll(OLD_YEAR)].map((m) => [m.index, m[0]]);
  const b3 = [...markup(kw.keepYears(s)).matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (JSON.stringify(a3.map((x) => x[1])) !== JSON.stringify(b3)) fail("keepYears", s, a3.map((x) => x[1]), b3);
  // digitChoice
  const a4 = [...s.matchAll(OLD_DIGIT)].map((m) => m[0]), b4 = kr.digitChoice(s);
  if (JSON.stringify(a4) !== JSON.stringify(b4)) fail("digitChoice", s, a4, b4);
}
console.log(`${n} strings × 4 readers · differences ${bad}`);
const big = (t: string) => t.repeat(Math.ceil(20000 / t.length)).slice(0, 20000);
for (const [name, s] of [["a", big("a")], ["1", big("1")], ["ideo-stop", big(c(0x3002))], ["Act ", big("Act ")], ["2022,", big("2022,")]] as const) {
  const t: string[] = [];
  for (const [label, f] of [["lastTwo", () => kw.lastTwo(s, "kept")], ["keepYears", () => kw.keepYears(s)], ["digitChoice", () => kr.digitChoice(s)], ["keepText", () => kr.keepText(s)]] as const) {
    const t0 = performance.now(); f(); t.push(`${label} ${(performance.now() - t0).toFixed(1)}ms`);
  }
  console.log(`20,000 × ${name}: ${t.join(" · ")}`);
}
