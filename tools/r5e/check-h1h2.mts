import { markup, textOf, keyIssues } from "./h.ts";
const tip = await import("./orig/keep-words.tsx");
const now = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const esc = (s: string) => s.replace(/[\u00a0\u2000-\u200f\u3000\ufe0f]/g, (c) => "\\u" + c.codePointAt(0)!.toString(16).padStart(4, "0"));
const show = (n: unknown) => esc(markup(n).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
const T = ["达累斯萨拉姆七月降雨超过200毫米", "降雨超过200毫米", "超过 200 毫米", "达到1,000美元", "高于5.5%", "2026-27赛季", "在28:00分钟内", "TZS 4,200以上",
  "比特币价格能否在2026年8月底前超过15万美元？", "Simba SC能否赢得2026年坦桑尼亚超级联赛？", "坦桑尼亚2026年第三季度GDP增长能否超过6%？", "达累斯萨拉姆2026年7月降雨量能否超过200毫米？",
  "Diamond Platnumz能否在2026年10月前发行新专辑？", "Simba SC 会赢得 2027/28 赛季 NBC 超级联赛冠军吗？", "奖金会超过TZS 1,000,000吗？", "Simba watapata TZS 1 bilioni?",
  "Je, atavunja dakika 28:00 kwenye 10K?", "tarehe 1 Agosti", "30-day trial", "$5.5 bilioni", "TZS 4,200", "Will Simba win the 2026-27 NBC Premier League?",
  "比特币8月1日收于10万美元以上", "美元兑坦桑尼亚先令二季度末收于2,650以下", "Dakika 90 za mwisho?", "Saa 3 usiku?", "Atavunja 28:00 dakika?", "Will Ethereum hit a new 30-Day high?", "Bei TZS \u22124,200?"];
for (const t of T) {
  const a = show(tip.keepFigures(t)), b = show(now.keepFigures(t));
  console.log(a === b ? `   same  ${a}` : `   tip   ${a}\n   now   ${b}`);
  if (textOf(markup(now.keepFigures(t))) !== t) console.log("   !!! TEXT CHANGED");
}
console.log("== keepNameEnd");
for (const n of ["Juma K", "Mwanaisha Khamis", "AB", "百里呼延", "Ali \u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "Neema \u{1F469}\u200D\u{1F4BB}", "Juma \u{1F3F3}\uFE0F\u200D\u{1F308}", "Asha \u{1F44D}\u{1F3FD}", "Ali \u{1F1F9}\u{1F1FF}", "Zoe\u0308", "Namba 1\uFE0F\u20E3",
  "AB" + "\u3000".repeat(37) + "C", "AB" + "\u2003".repeat(37) + "C", "AB" + " ".repeat(37) + "C", "Player #A3F2K8", "张三\u3000丰", "Juma\u00a0K",
  "ab\u{1F1F9}\u{1F1FF}\u{1F1F0}\u{1F1EA}\u{1F1FA}", "Ali \u{1F1F9}\u{1F1FF}\u{1F1F0}\u{1F1EA}", "प्रकाश क्ष्म", "한국어 사람", "Juma K "]) {
  const a = show(tip.keepNameEnd(n)), b = show(now.keepNameEnd(n));
  console.log(a === b ? `   same  ${a.slice(0, 80)}` : `   tip   ${a.slice(0, 80)}\n   now   ${b.slice(0, 80)}`);
  const node = now.keepNameEnd(n);
  if (textOf(markup(node)) !== n || keyIssues(node).length) console.log("   !!! TEXT/KEYS");
}
