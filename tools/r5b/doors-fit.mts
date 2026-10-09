// R5-B · F11: do the journey's longer door words fit /wallet's header at 320/360/390 (two md pills side by side, gap 8)?
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r5b/src/lib/i18n-dict.ts";
const fontkit = createRequire("F:/kipindi-r5b/package.json")("fontkit");
const semi = fontkit.openSync("F:/kipindi-r5b/src/lib/server/reports/fonts/Inter-Bold.ttf");
const w = (s: string) => semi.layout(s).positions.reduce((a: number, p: { xAdvance: number }) => a + p.xAdvance, 0) / semi.unitsPerEm * 14;
// .btn-md: 16px padding a side, 8px gap, a 14px glyph, 1px border a side.
const pill = (label: string) => 1 + 16 + 14 + 8 + w(label) + 16 + 1;
for (const l of ["sw", "en", "zh"] as const) {
  const d = dict[l];
  const before = pill(d.common.deposit) + 8 + pill(d.common.withdraw);
  const after = pill(d.journey.depositAction) + 8 + pill(d.journey.withdrawAction);
  console.log(`${l}: before ${before.toFixed(1)} (${d.common.deposit} / ${d.common.withdraw}) · after ${after.toFixed(1)} (${d.journey.depositAction} / ${d.journey.withdrawAction}) · columns 288 (320) 328 (360) 358 (390)`);
}
