// R5-A merged onto R5-C/R5-E: the /results notable flag is R5-C's brand ink AND R5-A's tracked span; the regulator
// pattern names its zero-width break hint as an escape (R5-E's census: no raw invisible character in player code).
const fs = require("fs");
const R = "F:/kipindi-vis/";
const edit = (p, pairs) => {
  let s = fs.readFileSync(R + p, "utf8");
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(p + " anchor: " + a.slice(0, 80)); s = s.replace(a, b); }
  fs.writeFileSync(R + p, s);
};
// 1 · keep-words.tsx — the literal U+200B in REGULATOR → the escape \u200B (same pattern, nothing invisible in the source)
edit("src/components/ui/keep-words.tsx", [[
  "const REGULATOR = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\u200B?博彩委员会/;",
  "// The zh name's zero-width break hint is written as its escape (`\\u200B`): no raw invisible character in the source\r\n" +
  "// (test:visual-pass-r5e §6.5, round 5's census).\r\n" +
  "const REGULATOR = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\\u200B?博彩委员会/;",
]]);
// 2 · r5a 7.2 — the spotlight flag's ink is R5-C's brand-300 since the merge
edit("scripts/visual-pass-r5a.test.mts", [[
  `res.includes("uppercase tracking-[0.16em] font-bold text-gold-300")`,
  `res.includes("uppercase tracking-[0.16em] font-bold text-brand-300") /* the ink R5-C's gold audit gave the flag (merged 2026-10-09) */`,
]]);
// 3 · r5c 2.4 — the label sits in R5-A's tracked span (F19) since the merge
edit("scripts/visual-pass-r5c.test.mts", [[
  String.raw`/text-brand-300">\s*<I\.crown s=\{13\} \/> \{t\.results\.notableResult\}/.test(featured)`,
  String.raw`/text-brand-300">\s*<I\.crown s=\{13\} \/> <span className="kp-track-end kp-track-end--16">\{t\.results\.notableResult\}<\/span>/.test(featured) /* the label in R5-A's tracked span (F19), merged 2026-10-09 */`,
]]);
console.log("ok");
