// A candidate fix for keepFigures (two edits), proved text-safe here. Nothing in the repo is touched.
import { readFileSync } from "node:fs";
import { markup, textOf, keyIssues, React } from "./h.ts";
import { keepFigures } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";

const src = readFileSync("F:/kipindi-vis/src/components/ui/keep-words.tsx", "utf8");
const MONTHS = src.match(/const MONTHS = "([^"]+)"/)![1];
const UNIT_BEFORE = `dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni|TZS|USD|KES|${MONTHS}`;
const UNIT_AFTER = `minutes?|hours?|seconds?|days?|weeks?|months?|years?|degrees?|percent|million|billion|milioni|bilioni|${MONTHS}`;
// EDIT 1: a closed list of Chinese units, longest first, instead of "any one or two ideographs".
const ZH_UNIT = "万美元|亿美元|万先令|亿先令|美元|先令|欧元|英镑|毫米|厘米|公里|千米|公斤|千克|毫升|分钟|小时|赛季|季度|百分点|摄氏度|个月|年底|年初|月底|月初|月中|[年月日号时分秒天周岁米克吨升元万亿场球届次名个度轮局倍]";
const FIGURE = new RegExp(
  `(?:\\b(${UNIT_BEFORE})(\\s+))?([$€£]?\\d+(?:[.,:]\\d+)*(?:[-–/]\\d+(?:[.,:]\\d+)*)*%?)`
    + `(?:(\\s?(?:${ZH_UNIT}))|(-[a-z]+)\\b|(\\s+)(${UNIT_AFTER})\\b)?`,
  "g",
);
const BREAKABLE = /[\s\-–/㐀-䶿一-鿿豈-﫿]/;
const CURRENCY = /^(?:TZS|USD|KES)$/;
export function keepFiguresFixed(text: string): React.ReactNode {
  if (!/\d/.test(text)) return text;
  const out: React.ReactNode[] = [];
  let from = 0;
  for (const m of text.matchAll(FIGURE)) {
    const [, before, gap, num, ideo, hyph, space, after] = m;
    const tail = ideo ?? hyph ?? (after !== undefined ? space + after : "");
    // EDIT 2: a currency code before the number stays with it even when a unit follows (a figure is "TZS" + digits).
    const head = before !== undefined && (tail === "" || CURRENCY.test(before)) ? before + gap : "";
    const start = (m.index ?? 0) + (before !== undefined && head === "" ? before.length + gap.length : 0);
    const run = head + num + tail;
    if (!BREAKABLE.test(run)) continue;
    out.push(text.slice(from, start), React.createElement("span", { key: `f${out.length}`, className: "whitespace-nowrap" }, run));
    from = start + run.length;
  }
  if (out.length === 0) return text;
  out.push(text.slice(from));
  return out;
}

const show = (n: React.ReactNode) => markup(n).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]");
const T = ["达累斯萨拉姆七月降雨超过200毫米", "降雨超过200毫米", "超过 200 毫米", "达到1,000美元", "高于5.5%", "2026-27赛季", "在28:00分钟内", "TZS 4,200以上",
  "比特币价格能否在2026年8月底前超过15万美元？", "Simba SC能否赢得2026年坦桑尼亚超级联赛？", "坦桑尼亚2026年第三季度GDP增长能否超过6%？", "达累斯萨拉姆2026年7月降雨量能否超过200毫米？",
  "Diamond Platnumz能否在2026年10月前发行新专辑？", "Simba SC 会赢得 2027/28 赛季 NBC 超级联赛冠军吗？", "奖金会超过TZS 1,000,000吗？", "Simba watapata TZS 1 bilioni?",
  "Je, atavunja dakika 28:00 kwenye 10K?", "tarehe 1 Agosti", "30-day trial", "$5.5 bilioni", "TZS 4,200", "Will Simba win the 2026-27 NBC Premier League?"];
for (const t of T) {
  const a = show(keepFigures(t));
  const b = show(keepFiguresFixed(t));
  console.log(a === b ? `   same  ${a}` : `   tip   ${a}\n   fixed ${b}`);
}
let seed = 5;
const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const P = ["TZS ", "USD ", "dakika ", "1", "200", "2026-27", "28:00", "万美元", "美元", "年", "月底", "坦桑尼亚", "以上", " ", "超过", "bilioni", " minutes", "-day", "%", "，", "Agosti ", "\u00a0", "Simba", "?"];
let bad = 0;
for (let i = 0; i < 20000; i++) {
  let s = "";
  const k = Math.floor(r() * 12);
  for (let j = 0; j < k; j++) s += P[Math.floor(r() * P.length)];
  const n = keepFiguresFixed(s);
  if (textOf(markup(n)) !== s || keyIssues(n).length) bad++;
}
console.log("fixed keepFigures text-safety: 20000 cases, failures", bad);
