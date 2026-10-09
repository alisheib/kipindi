// keepRegulator: match the zh name's zero-width break hint as any format character (\p{Cf}) — the source then names
// no invisible character, raw or escaped (test:visual-pass-r5e §6.5's census flags both).
const fs = require("fs");
const p = "F:/kipindi-vis/src/components/ui/keep-words.tsx";
let s = fs.readFileSync(p, "utf8");
const a = "// The zh name's zero-width break hint is written as its escape (`\\u200B`): no raw invisible character in the source\r\n" +
  "// (test:visual-pass-r5e §6.5, round 5's census).\r\n" +
  "const REGULATOR = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\\u200B?博彩委员会/;";
const b = "// The zh name carries the dictionary's zero-width break hint between its two words; it is matched as any format\r\n" +
  "// character (`\\p{Cf}`), so the source names no invisible character (test:visual-pass-r5e §6.5, round 5's census).\r\n" +
  "const REGULATOR = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\\p{Cf}?博彩委员会/u;";
if (s.split(a).length !== 2) throw new Error("anchor");
s = s.replace(a, b);
fs.writeFileSync(p, s);
const re = /Gaming Board of Tanzania|Bodi ya Michezo ya Kubahatisha Tanzania|坦桑尼亚\p{Cf}?博彩委员会/u;
const dict = fs.readFileSync("F:/kipindi-vis/src/lib/i18n-dict.ts", "utf8");
const hits = [...dict.matchAll(/licensedByGbt:\s*("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]));
console.log("dictionary sentences:", hits.length, hits.map((t) => re.test(t)));
console.log("zh with hint", re.test("坦桑尼亚\u200B博彩委员会"), "· without", re.test("坦桑尼亚博彩委员会"), "· a real space (must not)", re.test("坦桑尼亚 博彩委员会"));
