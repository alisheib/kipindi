// Two captures whose market cell failed the SAME way: the compare must not call them identical.
import { readFileSync, writeFileSync } from "node:fs";
const dir = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/s7a9a/";
for (const [src, out] of [["cap-a.json", "err-a.json"], ["cap-b-same.json", "err-b.json"]]) {
  const cap = JSON.parse(readFileSync(dir + src, "utf8"));
  cap.cells.push({ key: "guest|en|/markets/[id]", viewer: "guest", locale: "en", name: "market", route: "/markets/[id]", error: 'no live question titled "Simba SC wins the NBC Premier League 2026-27"' });
  writeFileSync(dir + out, JSON.stringify(cap));
}
console.log("wrote err-a.json, err-b.json");
