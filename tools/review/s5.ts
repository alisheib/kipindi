import { markup } from "./h.ts";
import { keepFigures } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { keepFiguresFixed } from "./fix.ts";
const br = (n: unknown) => markup(n).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]");
for (const t of ["比特币8月1日收于10万美元以上", "美元兑坦桑尼亚先令二季度末收于2,650以下", "比特币能否在2026年8月底前超过15万美元？"]) {
  console.log("tip  ", br(keepFigures(t)));
  console.log("fixed", br(keepFiguresFixed(t)));
}
