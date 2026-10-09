import { h, markup, textOf, keyIssues, captureWarnings, show, React } from "./h.ts";
import { keepFigures, keepLastWords } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { keepUnits } from "F:/kipindi-vis/src/components/ui/keep-units.tsx";
import { KeepHyphenated } from "F:/kipindi-vis/src/app/live/pulse-grid.tsx";

// 0. Does the server renderer warn on a missing key? (decides whether we rely on React or on keyIssues)
const w = captureWarnings(() => markup([h("span", null, "a"), h("span", null, "b")]));
console.log("Fizz key warning on unkeyed list:", w.warnings.length ? w.warnings[0].slice(0, 80) : "(none)");
console.log("keyIssues on unkeyed list:", keyIssues([h("span", null, "a"), h("span", null, "b")]));

const titles = [
  "达累斯萨拉姆七月降雨超过200毫米",
  "降雨超过200毫米",
  "超过200毫米",
  "超过 200 毫米",
  "达到1,000美元",
  "高于5.5%",
  "2026-27赛季",
  "辛巴俱乐部赢得2026-27赛季NBC超级联赛",
  "在28:00分钟内",
  "TZS 4,200以上",
  "7月降雨超过200毫米",
  "2026年世界杯",
  "坦桑尼亚2026年世界杯预选赛",
  "达累斯萨拉姆7月降雨",
  "5场比赛",
  "Je, atavunja dakika 28:00 kwenye 10K?",
  "Will Simba win the 2026-27 NBC Premier League?",
];
for (const t of titles) {
  const kf = markup(keepFigures(t)).replace(/^<div>|<\/div>$/g, "");
  const ku = markup(keepUnits(t)).replace(/^<div>|<\/div>$/g, "");
  const kh = markup(h(KeepHyphenated, { text: t })).replace(/^<div>|<\/div>$/g, "");
  console.log(show(t));
  console.log("   keepFigures   :", kf.replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
  console.log("   keepUnits(old):", ku.replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
  console.log("   /live wall    :", kh.replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
  if (textOf(markup(keepFigures(t))) !== t) console.log("   !!! TEXT CHANGED");
}
void keepLastWords; void React;
