// Copy reviewer C's scripts into r6c/rev/, pointed at F:/kipindi-r6c instead of F:/kipindi-rev.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const from = S + "/review6/C/s/";
const to = S + "/r6c/rev/";
mkdirSync(to, { recursive: true });
for (const f of readdirSync(from)) {
  const s = readFileSync(from + f, "utf8").split("F:/kipindi-rev").join("F:/kipindi-r6c");
  writeFileSync(to + f, s);
  console.log("copied", f);
}
