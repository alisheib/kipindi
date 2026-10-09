const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n38. ")) { console.log("already there"); process.exit(0); }
const add = `38. (R5-E) Very wide figures on a market's page title at 320: the line holds 220px; "TZS 10,000,000" (229px) and
    "USD 100 million" (221.5px) are kept whole, and a "?" after one reaches the faint watermark. No real title has one
    today. Accept, a smaller title below 360, or another technique?
39. (R5-E) Chinese titles now break far less inside words (balanced lines), but a few still split a word at 320 (e.g.
    "…7月降 / 雨…"): zero needs phrase segmentation no browser offers. Accept?
40. (R5-E) Every toast's money amounts are now in the figures' font (mono, §M4) — bet placed, sold, payouts, Up & Down
    results, the refused sale — in both shells. Confirm?
41. (R5-E) A month and its year may now wrap apart ("December" / "2026") so a long date fits a phone title. Confirm?
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
fs.writeFileSync(p, s);
console.log("ok");
