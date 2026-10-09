import { dict } from "file:///F:/kipindi-r5b/src/lib/i18n-dict.ts";
for (const l of ["en", "sw", "zh"] as const) console.log(l, JSON.stringify(dict[l].common.monthsShort));
