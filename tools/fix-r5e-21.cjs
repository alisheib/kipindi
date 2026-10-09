// test:visual-pass-r5e 2.1 on the merged branch: R5-C's gold audit moved the /results notable title's hover ink from
// `group-hover:text-gold-100` to `group-hover:text-brand-200`; the balance pin follows it (the title is balanced).
const fs = require("fs");
const p = "F:/kipindi-vis/scripts/visual-pass-r5e.test.mts";
let s = fs.readFileSync(p, "utf8");
const a = "      balanced: (s) => cls(s, `font-semibold leading-tight text-text text-balance group-hover:text-gold-100\">`) },\r\n";
if (s.split(a).length !== 2) throw new Error("anchor");
s = s.replace(a,
  "      // The hover ink is R5-C's (the second gold audit moved it gold-100 → brand-200 on this title; merged 2026-10-09).\r\n" +
  "      balanced: (s) => cls(s, `font-semibold leading-tight text-text text-balance group-hover:text-brand-200\">`) },\r\n");
fs.writeFileSync(p, s);
console.log("ok");
