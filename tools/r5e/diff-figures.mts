// keepFigures, three versions over the same corpora: the tip (orig/), the reviewer's prototype (review/fix.ts's two
// edits, rebuilt here from the tip's lists), and the worktree. Prints every class of difference with examples.
// Run from F:/kipindi-r5e:  node_modules/.bin/tsx <S>/r5e/diff-figures.mts
import { readFileSync } from "node:fs";
import { markup, textOf, keyIssues, React } from "./h.ts";
const tip = await import("./orig/keep-words.tsx");
const now = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");

// ── the reviewer's prototype (fix.ts), verbatim lists ──
const src = readFileSync(new URL("./orig/keep-words.tsx", import.meta.url), "utf8");
const MONTHS = src.match(/const MONTHS = "([^"]+)"/)![1];
const UB = `dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni|TZS|USD|KES|${MONTHS}`;
const UA = `minutes?|hours?|seconds?|days?|weeks?|months?|years?|degrees?|percent|million|billion|milioni|bilioni|${MONTHS}`;
const ZH_UNIT = "万美元|亿美元|万先令|亿先令|美元|先令|欧元|英镑|毫米|厘米|公里|千米|公斤|千克|毫升|分钟|小时|赛季|季度|百分点|摄氏度|个月|年底|年初|月底|月初|月中|[年月日号时分秒天周岁米克吨升元万亿场球届次名个度轮局倍]";
const FIG = new RegExp(`(?:\\b(${UB})(\\s+))?([$€£]?\\d+(?:[.,:]\\d+)*(?:[-–/]\\d+(?:[.,:]\\d+)*)*%?)(?:(\\s?(?:${ZH_UNIT}))|(-[a-z]+)\\b|(\\s+)(${UA})\\b)?`, "g");
const BRK = /[\s\-–/㐀-䶿一-鿿豈-﫿]/;
function reviewer(text: string): React.ReactNode {
  if (!/\d/.test(text)) return text;
  const out: React.ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(FIG)) {
    const [, before, gap, num, ideo, hyph, space, after] = m;
    const tail = ideo ?? hyph ?? (after !== undefined ? space + after : "");
    const head = before !== undefined && (tail === "" || /^(?:TZS|USD|KES)$/.test(before)) ? before + gap : "";
    const start = (m.index ?? 0) + (before !== undefined && head === "" ? before.length + gap.length : 0);
    const run = head + num + tail;
    if (!BRK.test(run)) continue;
    out.push(text.slice(from, start), React.createElement("span", { key: `f${out.length}`, className: "whitespace-nowrap" }, run));
    from = start + run.length;
  }
  if (out.length === 0) return text;
  out.push(text.slice(from));
  return out;
}

const br = (n: unknown) => markup(n).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]");

// ── corpora ──
function xorshift(seed: number) { return () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; }; }
// (1) fix.ts's corpus, seed 5, 20,000
const P1 = ["TZS ", "USD ", "dakika ", "1", "200", "2026-27", "28:00", "万美元", "美元", "年", "月底", "坦桑尼亚", "以上", " ", "超过", "bilioni", " minutes", "-day", "%", "，", "Agosti ", "\u00a0", "Simba", "?"];
const c1: string[] = [];
{ const r = xorshift(5); for (let i = 0; i < 20000; i++) { let s = ""; const k = Math.floor(r() * 12); for (let j = 0; j < k; j++) s += P1[Math.floor(r() * P1.length)]; c1.push(s); } }
// (2) every seeded title in the repo (fixtures, AI examples, the dev seed, r4h's catalogue)
const files = ["src/lib/server/market-service.ts", "src/lib/server/ai-provider.ts", "src/app/api/dev-test/seed-real-markets/route.ts", "scripts/visual-pass-r4h.test.mts", "src/lib/server/ai-poll-generation.ts"];
const c2 = new Set<string>();
for (const f of files) {
  const s = readFileSync(`F:/kipindi-r5e/${f}`, "utf8");
  for (const m of s.matchAll(/(?:title(?:En|Sw|Zh)|\ben|\bsw|\bzh):\s*"((?:[^"\\]|\\.)*)"/g)) if (/\d/.test(m[1])) c2.add(m[1]);
  for (const m of s.matchAll(/"([^"\n]*\d[^"\n]*)"/g)) if (/[？?]$/.test(m[1]) || /[㐀-鿿]/.test(m[1])) c2.add(m[1]);
}
// (3) hand cases: the reviewer's (a)/(b) lists, the doubts, and the extensions the previous run made
const c3 = ["超过15万美元？", "比特币8月1日收于10万美元以上", "2026年坦桑尼亚", "2026年第三季度", "7月降雨量", "10月前", "Simba watapata TZS 1 bilioni?", "TZS 4,200以上", "奖金会超过TZS 1,000,000吗？",
  "Atavunja dakika 28:00?", "Atavunja 28:00 dakika?", "Dakika 90 za mwisho?", "Saa 3 usiku?", "Will Ethereum hit a new 30-Day high?", "8月10日", "8月100日", "12月31日前", "2026年8月1日", "3月5号",
  "Tarehe 1 Agosti", "Milioni 5 za", "Siku 7 zijazo", "Wiki 2", "Nyuzi 32", "TZS −4,200", "USD 5 million", "KES 100 milioni", "TZS 10,000 milioni", "TZS 1,000,000 bilioni", "in 90 Minutes?", "5 Days"];
const corpora: Array<[string, string[]]> = [["fix.ts seed 5", c1], ["seeded titles", [...c2]], ["hand", c3]];

for (const [name, corpus] of corpora) {
  let textBad = 0, keyBad = 0, tipVsNow = 0, revVsNow = 0;
  const classes = new Map<string, string[]>();
  const note = (k: string, s: string) => { const a = classes.get(k) ?? []; if (a.length < 5) a.push(s); classes.set(k, a); };
  for (const s of corpus) {
    const n = now.keepFigures(s);
    if (textOf(markup(n)) !== s) textBad++;
    if (keyIssues(n).length) keyBad++;
    const a = br(tip.keepFigures(s)), b = br(reviewer(s)), c = br(n);
    if (a !== c) tipVsNow++;
    if (b !== c) {
      revVsNow++;
      const k = /\d月\d{1,2}[日号]/.test(s) ? "月+day" : /\b(?:Dakika|Saa|Sekunde|Siku|Wiki|Mwezi|Miezi|Mwaka|Miaka|Nyuzi|Asilimia|Tarehe|Milioni|Bilioni)\s/.test(s) || /\d\s+(?:Minutes?|Hours?|Seconds?|Days?|Weeks?|Months?|Years?|Degrees?|Percent|Million|Billion|Milioni|Bilioni)\b/.test(s) ? "capital unit" : /-[A-Z]/.test(s) ? "hyphen capital" : "OTHER";
      note(k, `${JSON.stringify(s)}\n        reviewer ${b}\n        now      ${c}`);
    }
  }
  console.log(`\n=== ${name}: ${corpus.length} strings · text changed ${textBad} · key issues ${keyBad} · differ tip→now ${tipVsNow} · differ reviewer→now ${revVsNow}`);
  for (const [k, v] of classes) { console.log(`  [${k}]`); for (const x of v) console.log("     " + x); }
}
console.log("\n=== the hand cases, tip → now");
for (const s of c3) { const a = br(tip.keepFigures(s)), c = br(now.keepFigures(s)); console.log(a === c ? `   same ${c}` : `   tip  ${a}\n   now  ${c}`); }
console.log("\n=== seeded titles whose runs changed tip → now");
for (const s of c2) { const a = br(tip.keepFigures(s)), c = br(now.keepFigures(s)); if (a !== c) console.log(`   tip  ${a}\n   now  ${c}`); }
