// Splice the widened ✕ census and the in-flight rule into §8 of the suite (CRLF kept), and import CloseX.
import { readFileSync, writeFileSync } from "node:fs";
const F = "F:/kipindi-r5a/scripts/visual-pass-r5a.test.mts";
const N = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5a/s8-new.txt";
let raw = readFileSync(F, "utf8");
const start = raw.indexOf("  // THE CENSUS: every ✕ glyph on a player surface, and what it is.");
const endKey = "show({ unclassified, missing: Object.keys(CENSUS).filter((f) => !xFiles.includes(f)) }));\r\n";
const end = raw.indexOf(endKey, start);
if (start < 0 || end < 0) throw new Error(`markers ${start} ${end}`);
const block = readFileSync(N, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
raw = raw.slice(0, start) + block + raw.slice(end + endKey.length);
const imp = 'import { POOL_FLOORS } from "../src/lib/markets/discovery.ts";\r\n';
if (!raw.includes(imp)) throw new Error("import anchor");
raw = raw.replace(imp, imp + 'import { CloseX } from "../src/components/ui/modal.tsx";\r\n');
writeFileSync(F, raw);
console.log("spliced; LF-only lines:", (raw.match(/(?<!\r)\n/g) ?? []).length);
