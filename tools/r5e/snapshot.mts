// Snapshot (or compare against a snapshot) every keep helper's markup over a fixed corpus: all dictionary strings, the
// seeded titles, the reviewer's fuzz corpora, and a set of exotic-whitespace cases.
//   node_modules/.bin/tsx snapshot.mts write <file>   ·   node_modules/.bin/tsx snapshot.mts compare <file>
import { readFileSync, writeFileSync } from "node:fs";
import { markup } from "./h.ts";
const kw = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const kr = await import("file:///F:/kipindi-r5e/src/components/ui/keep-run.tsx");
const fn = await import("file:///F:/kipindi-r5e/src/lib/fill-nodes.tsx");
const { dict } = await import("file:///F:/kipindi-r5e/src/lib/i18n-dict.ts");

const corpus = new Set<string>();
const walk = (o: unknown) => { if (typeof o === "string") corpus.add(o); else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v); };
walk(dict);
for (const f of ["src/lib/server/market-service.ts", "src/lib/server/ai-provider.ts", "src/app/api/dev-test/seed-real-markets/route.ts", "scripts/visual-pass-r4h.test.mts"]) {
  const s = readFileSync(`F:/kipindi-r5e/${f}`, "utf8");
  for (const m of s.matchAll(/"((?:[^"\\\n]|\\.){4,200})"/g)) corpus.add(m[1]);
}
function xs(seed: number) { return () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; }; }
{ // fix.ts corpus
  const r = xs(5); const P = ["TZS ", "USD ", "dakika ", "1", "200", "2026-27", "28:00", "万美元", "美元", "年", "月底", "坦桑尼亚", "以上", " ", "超过", "bilioni", " minutes", "-day", "%", "，", "Agosti ", "\u00a0", "Simba", "?"];
  for (let i = 0; i < 20000; i++) { let s = ""; const k = Math.floor(r() * 12); for (let j = 0; j < k; j++) s += P[Math.floor(r() * P.length)]; corpus.add(s); }
}
{ // fuzz2.ts corpus (Latin)
  const r = xs(31337); const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const LAT = ["Act", "2022", "1999", "2026", "3000", "1799", "Toleo", "na", "kanuni", "Phones", "only.", "Hidden!", "Why?", "e.g.", "2026-10-07", "16221", "(Act", "2022)", "2022.", "2022;", "x", "TZS", "4,200.", "Yes!", "Wait...", "U.S.", "1.5", "a.b"];
  const WS = [" ", " ", " ", "  ", "\t", "\n", "\u00a0", "\u2003"];
  for (let i = 0; i < 6000; i++) { let s = ""; const k = Math.floor(r() * 10); for (let j = 0; j < k; j++) s += pick(LAT) + (r() < 0.85 ? pick(WS) : ""); corpus.add(s); }
}
// exotic gaps (the ones the bound is for)
for (const g of ["\u3000\u3000", "\u2003\u2003\u2003", "\u00a0\u00a0", " \u3000 \u3000", "\u3000".repeat(37)]) {
  for (const t of [`dakika${g}28:00`, `TZS${g}4,200`, `5${g}minutes`, `Act${g}2022`, `kwa${g}simu tu.`, `simu tu.${g}`, `6${g}or 7`, `6 or${g}7`, `neno${g}—`, `Bei ya${g}mwisho`, `Juma${g}K`]) corpus.add(t);
}
const FNS: Record<string, (s: string) => unknown> = {
  keepLastWords: kw.keepLastWords, keepSentences: kw.keepSentences, keepYears: kw.keepYears, keepFigures: kw.keepFigures, keepNameEnd: kw.keepNameEnd,
  keepIdRuns: kw.keepIdRuns, keepText: (s) => kr.keepText(s, kr.digitChoice(s)), moneySentence: fn.moneySentence,
};
const snap: Record<string, Record<string, string>> = {};
for (const [k, f] of Object.entries(FNS)) { snap[k] = {}; for (const s of corpus) snap[k][s] = markup(f(s)); }
const [mode, file] = process.argv.slice(2);
if (mode === "write") { writeFileSync(file, JSON.stringify(snap)); console.log(`wrote ${corpus.size} strings × ${Object.keys(FNS).length} helpers`); }
else {
  const old = JSON.parse(readFileSync(file, "utf8")) as typeof snap;
  for (const k of Object.keys(FNS)) {
    const diffs = [...corpus].filter((s) => old[k][s] !== undefined && old[k][s] !== snap[k][s]);
    const exotic = diffs.filter((s) => /[\u00a0\u2000-\u200a\u3000\u202f\u205f\ufeff]/.test(s) || /\s{2,}/.test(s));
    console.log(`${k.padEnd(14)} ${diffs.length} differ (${exotic.length} with a non-collapsible or doubled white space, ${diffs.length - exotic.length} without)`);
    for (const s of diffs.filter((x) => !exotic.includes(x)).slice(0, 5)) console.log(`   PLAIN ${JSON.stringify(s)}\n      old ${old[k][s]}\n      new ${snap[k][s]}`);
    const esc = (x: string) => x.replace(/[  - 　 ]/g, (c) => "<" + c.codePointAt(0)!.toString(16) + ">");
    for (const s of exotic.slice(0, 40)) console.log(`   exotic ${esc(JSON.stringify(s))}\n      old ${esc(old[k][s])}\n      new ${esc(snap[k][s])}`);
  }
}
