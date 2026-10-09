import { markup } from "./h.ts";
import { keepFigures } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
const T = [
  "Diamond Platnumz能否在2026年10月前发行新专辑？",
  "SGR多多马-辛吉达段能否在2026年12月前投入运营？",
  "Simba SC 会赢得 2027/28 赛季 NBC 超级联赛冠军吗？",
  "Simba SC能否赢得2026年坦桑尼亚超级联赛？",
  "坦桑尼亚2026年第三季度GDP增长能否超过6%？",
  "比特币价格能否在2026年8月底前超过15万美元？",
  "比特币能否在2026年8月底前超过15万美元？",
  "涨跌 · 亏损 TZS 11,300",
  "达累斯萨拉姆2026年7月降雨量能否超过200毫米？",
];
for (const t of T) {
  const out = markup(keepFigures(t)).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]");
  console.log(out);
}
