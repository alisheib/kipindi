const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n25. ")) { console.log("already there"); process.exit(0); }
const add = `
25. The journey header's focus rings end 2px from the next control at 390 (the balance ring → the gold pill; "Ingia" →
    "Jisajili"): the S4 fit rule's 6px phone gaps hold a 4px ring. Accept, or widen the gaps (costs 320px fit slack —
    10.7px left today)?
26. Chinese text in boxes sits ~1.5px high (17 | 20 against Latin's 19 | 18): ideographs sit ~0.12em higher than
    Latin capitals on the same baseline, on every zh box. Accept, or adopt a platform-wide CJK vertical trim?
27. The cashback promo's "Weka sasa / Deposit now" — keep the promo's own wording, or match the journey's "Weka pesa"?
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
fs.writeFileSync(p, s);
console.log("ok");
