// Swap the filter sheet's close block (from the round-5 note to the end of the old <button>) for the new one, CRLF kept.
import { readFileSync, writeFileSync } from "node:fs";
const F = "F:/kipindi-r5a/src/components/markets/filter-sheet.tsx";
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5a/fs-new-block.txt";
const raw = readFileSync(F, "utf8");
const start = raw.indexOf("          {/* ⭐ THE ONE ✕ (round 5 follow-up");
const endMarker = "            <I.x s={16} />\r\n          </button>\r\n";
const end = raw.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error(`markers ${start} ${end}`);
const block = readFileSync(S, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
const out = raw.slice(0, start) + block + raw.slice(end + endMarker.length);
writeFileSync(F, out);
console.log("swapped", end + endMarker.length - start, "→", block.length, "bytes; LF-only lines:", (out.match(/(?<!\r)\n/g) ?? []).length);
