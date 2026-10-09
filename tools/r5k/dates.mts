import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const { dict } = req("F:/kipindi-r5k/src/lib/i18n-dict.ts");
const { formatEatDateTime, formatEatDate } = req("F:/kipindi-r5k/src/lib/eat-day.ts");
const { formatTzs } = req("F:/kipindi-r5k/src/lib/utils.ts");
const now = Date.parse("2026-10-09T12:00:00Z");
for (const l of ["sw", "en", "zh"]) {
  const t = dict[l];
  console.log(l, JSON.stringify(formatEatDateTime(Date.parse("2026-10-03T09:41:00Z"), now, t.common.monthsShort, l)), JSON.stringify(formatEatDateTime(now - 3600e3, now, t.common.monthsShort, l)), JSON.stringify(formatEatDate(Date.parse("2026-10-03T09:41:00Z"), now, t.common.monthsShort, l)));
}
console.log(formatTzs(10000), formatTzs(1000000));
