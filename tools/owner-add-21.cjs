const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n21. ")) { console.log("already there"); process.exit(0); }
const add = `
21. A self-excluded person CANNOT re-register with the same phone or email (proved, R4-I) — but a NEW phone + email opens
    a fresh account: nothing at sign-up ties a person to an excluded account (exclusion and caps are per account; the
    KYC one-document rule only catches it at withdrawal, and only if the excluded account had verified its ID).
    Closing it needs person-level matching at sign-up — a policy decision (and new words).
22. Times are never labelled "EAT" anywhere today; break/exclusion ends now show date AND time in the reader's
    language ("hadi 10 Okt, 05:05"). Add "EAT" (everywhere, not just here)?
23. The old dial's thumb text is under the reading floor (its side word ~5.8px, multiplier ~11.6px at 360; a 10px
    "HAPANA" cannot fit a 43px thumb) — drop it or move it out of the thumb? (S8 replaces the dial in the journey.)
24. qa:bar-geometry is red on MAIN (88 failures, a stale instrument) — repair it so it guards again (tooling task).
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
fs.writeFileSync(p, s);
console.log("ok");
