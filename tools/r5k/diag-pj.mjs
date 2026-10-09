// Why does git merge-file see package.json as one whole-file conflict? Compare the three inputs' bytes and line endings.
import { readFileSync } from "node:fs";
const T = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5k/rebase/pj/";
for (const f of ["mine", "base", "theirs"]) {
  const b = readFileSync(T + f);
  const s = b.toString("utf8");
  const lines = s.split("\n");
  const crlf = lines.filter((l) => l.endsWith("\r")).length;
  console.log(`${f}: ${b.length} bytes, ${lines.length - 1} newlines, ${crlf} CRLF, BOM ${b[0] === 0xef}, first bytes ${[...b.subarray(0, 8)].join(",")}, ends ${[...b.subarray(b.length - 4)].join(",")}`);
}
const a = readFileSync(T + "base", "utf8").split("\n"), m = readFileSync(T + "mine", "utf8").split("\n");
let i = 0; while (i < a.length && a[i] === m[i]) i++;
console.log(`first differing line (base vs mine): ${i + 1}: base ${JSON.stringify(a[i]?.slice(0, 80))} · mine ${JSON.stringify(m[i]?.slice(0, 80))}`);
