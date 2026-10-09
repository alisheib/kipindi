import { h, markup, textOf, a11yTextOf, keyIssues, captureWarnings, show } from "./h.ts";
import { keepLastWords, keepSentences, keepYears, keepFigures, keepNameEnd, keepIdRuns } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { hangCjkMarks } from "F:/kipindi-vis/src/lib/cjk-marks.tsx";
import { DotSeq } from "F:/kipindi-vis/src/components/ui/dot-seq.tsx";
import { moneyRuns, moneySentence } from "F:/kipindi-vis/src/lib/fill-nodes.tsx";
import { KeepHyphenated } from "F:/kipindi-vis/src/app/live/pulse-grid.tsx";

// ---- deterministic PRNG
let seed = Number(process.env.SEED ?? 12345);
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1_000_000) / 1_000_000; };
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

const SW = ["Je", "Simba", "itashinda", "Ligi", "Kuu", "ya", "NBC", "msimu", "wa", "atavunja", "kwenye", "10K?", "kinachofuata.", "Hakuna", "kinachofichwa.", "Kwa", "simu", "tu.", "pochi", "yako.", "imerejeshwa", "Soko", "limefutwa", "Toleo", "Imeoanishwa", "na", "Sheria", "kanuni", "Ushindi", "Kwanza", "tarehe", "dakika", "saa", "sekunde", "siku", "wiki", "mwezi", "miezi", "mwaka", "miaka", "nyuzi", "asilimia", "milioni", "bilioni", "Agosti", "Mei", "Juni", "Julai", "Machi", "Septemba"];
const EN = ["Will", "the", "price", "exceed", "minutes", "minute", "hours", "days", "day", "years", "million", "billion", "percent", "degrees", "April", "May", "June", "December", "30-day", "7-day", "month-end?", "Man-City", "First", "Win", "Phones", "only.", "Nothing", "is", "hidden.", "e.g.", "Dr.", "U.S.", "Act", "Personal", "Data", "Protection", "TZS", "USD", "KES", "on", "by", "World", "Athletics", "Premier", "League?", "Wait...", "what?!", "Yes!", "no."];
const ZH = ["达累斯萨拉姆", "七月降雨", "超过", "毫米", "辛巴", "俱乐部", "赢得", "赛季", "超级联赛", "你好", "世界", "这是什么", "注意", "仅限手机", "不会隐藏任何内容", "分钟", "美元", "以上", "年", "月", "世界杯", "比赛", "场"];
const MARKS = ["。", "，", "、", "；", "：", "！", "？", "？！", "。”", "，”", "」", "）", "》", "【", "——", "…", "·", "“", "”"];
const NUMS = ["2026-27", "1-2", "10–20", "24/7", "28:00", "2,650", "5.5", "$5.5", "€10", "£3", "50%", "50-60%", "1,000,000", "0", "16221", "2022", "1800", "2999", "3000", "1799", "2026-10-07", "200", "7", "10", "4,200", "1,015.50", "9.9M", "1.5K", "5,000,000,", "1,0000", "007", "3.14159", "2026/27", "1:0"];
const MONEY = ["TZS 4,200", "TZS\u00a04,200", "TZS 1,015.50", "TZS 9.9M", "TZS 5,000,000,", "USD 5", "KES 100", "TZS 0", "TZS 1.5K", "TZS 10,000", "TZS 1,000,000"];
const EMOJI = ["👍", "👍🏽", "🇹🇿", "👨‍👩‍👧", "❤️", "👩‍💻", "🏳️‍🌈", "e\u0301", "Zoë", "😀😀", "𠀀𠀁"];
const WS = [" ", " ", " ", "  ", "\t", "\n", "\u00a0", "\u3000", "\u200b", "\u2060", "\u202f", "\r\n"];
const SPECIAL = ["<", ">", "&", "\"", "'", "&amp;", "<b>x</b>", "{x}", "$", "%", "-", "–", "/", " · ", "·", " ·", "· ", " ·  · ", "\\"];
const LONG = () => pick(["a", "超", "1", "x-", "ab", "TZS", "。"]).repeat(1 + Math.floor(rnd() * 60));

function token(): string {
  const r = rnd();
  if (r < 0.18) return pick(SW);
  if (r < 0.32) return pick(EN);
  if (r < 0.46) return pick(ZH);
  if (r < 0.56) return pick(NUMS);
  if (r < 0.62) return pick(MONEY);
  if (r < 0.70) return pick(MARKS);
  if (r < 0.76) return pick(EMOJI);
  if (r < 0.84) return pick(SPECIAL);
  if (r < 0.88) return LONG();
  return String.fromCodePoint(Math.floor(rnd() * 0x3000) + 0x20);
}
function gen(): string {
  const n = Math.floor(rnd() * 14);
  let s = "";
  for (let i = 0; i < n; i++) {
    const r = rnd();
    s += token();
    if (r < 0.65) s += pick(WS);
    else if (r < 0.72) s += " · ";
  }
  if (rnd() < 0.15) s = pick(WS) + s;
  if (rnd() < 0.1) s = s.trimEnd();
  return s;
}

// ---- checks
type Fn = { name: string; run: (s: string) => unknown; a11y?: boolean; extra?: (s: string, node: unknown, html: string) => string | null };
const IDEO = /[㐀-䶿一-鿿豈-﫿]/;
const spans = (html: string) => [...html.matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => textOf(m[1]));
const UNIT_BEFORE_RE = /^(?:dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni|TZS|USD|KES|January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Machi|Aprili|Mei|Juni|Julai|Agosti|Septemba|Oktoba|Novemba|Desemba)\s+/;
const FNS: Fn[] = [
  { name: "keepLastWords", run: keepLastWords, extra: (s, node) => {
    if (IDEO.test(s) && node !== s) return "ideograph text not returned untouched";
    return null;
  } },
  { name: "keepSentences", run: keepSentences },
  { name: "keepYears", run: keepYears, extra: (_s, _n, html) => {
    const bad = spans(html).find((x) => !/^\S+\s+(?:1[89]|2\d)\d{2}$/.test(x));
    return bad !== undefined ? `odd year run ${show(bad)}` : null;
  } },
  { name: "keepFigures", run: keepFigures, extra: (_s, _n, html) => {
    for (const x of spans(html)) {
      const core = x.replace(UNIT_BEFORE_RE, "");
      if (!/^[$€£]?\d/.test(core)) return `run does not start at a number or a unit word: ${show(x)}`;
    }
    return null;
  } },
  { name: "keepNameEnd", run: keepNameEnd },
  { name: "keepIdRuns", run: keepIdRuns, extra: (s, _n, html) => {
    const r = spans(html);
    if (Array.from(s).length > 7 && r.some((x) => Array.from(x).length < 4)) return `short run ${show(JSON.stringify(r))}`;
    return null;
  } },
  { name: "hangCjkMarks", run: hangCjkMarks, a11y: true, extra: (s, node) => {
    if (!/[。，、；：！？]/.test(s) && node !== s) return "text without a mark not returned as the same string";
    return null;
  } },
  { name: "moneyRuns", run: moneyRuns },
  { name: "moneySentence", run: moneySentence },
  { name: "DotSeq", run: (s) => h(DotSeq, { text: s }) },
  { name: "DotSeq+stack+mono", run: (s) => h(DotSeq, { text: s, stack: true, mono: true }) },
  { name: "DotSeq/moneyRuns", run: (s) => h(DotSeq, { text: s, renderPart: moneyRuns }) },
  { name: "DotSeq/keepYears", run: (s) => h(DotSeq, { text: s, mono: true, renderPart: keepYears }) },
  { name: "DotSeq/keepLastWords", run: (s) => h(DotSeq, { text: s, stack: true, renderPart: keepLastWords }) },
  { name: "KeepHyphenated", run: (s) => h(KeepHyphenated, { text: s }) },
];

const N = Number(process.env.N ?? 4000);
const inputs: string[] = [];
for (let i = 0; i < N; i++) inputs.push(gen());
// fixed edge inputs
inputs.push("", " ", "  ", "a", "ab", "a b", "a b c", " a b c ", "a  b", "\n", "。", "，", "a。b", "你好。", "你好，世界。", "？！", "1", "12", "1 2 3",
  "x".repeat(10000), "a ".repeat(5000), "超".repeat(3000), "TZS 4,200 TZS 4,200", " · ", "A · B", "A ·  · B", "A · · B", " · A", "A · ", "·", "A·B",
  "Act 2022", "Act 2022 2023", "2022", "Toleo 2026-10-07 · Imeoanishwa na Personal Data Protection Act 2022 na kanuni zake.");

const stats: Record<string, { pass: number; fail: number; samples: string[] }> = {};
for (const f of FNS) stats[f.name] = { pass: 0, fail: 0, samples: [] };
for (const s of inputs) {
  for (const f of FNS) {
    const st = stats[f.name];
    const errs: string[] = [];
    let node: unknown;
    let html = "";
    const cw = captureWarnings(() => { node = f.run(s); html = markup(node); });
    if (cw.warnings.length) errs.push("react warning: " + cw.warnings[0].slice(0, 120));
    const got = f.a11y ? a11yTextOf(html) : textOf(html);
    if (got !== s) errs.push(`text ${show(got)} != input`);
    if (typeof node === "string" && node !== s) errs.push("returned a different string");
    const ki = keyIssues(node);
    if (ki.length) errs.push("keys: " + ki.slice(0, 3).join("; "));
    const ex = f.extra?.(s, node, html);
    if (ex) errs.push(ex);
    if (errs.length) { st.fail++; if (st.samples.length < 6) st.samples.push(`${show(s.length > 120 ? s.slice(0, 120) + "…" : s)} → ${errs.join(" | ")}`); }
    else st.pass++;
  }
}
for (const [k, v] of Object.entries(stats)) {
  console.log(`${k.padEnd(22)} pass ${v.pass} fail ${v.fail}`);
  for (const x of v.samples) console.log("    " + x.slice(0, 400));
}
