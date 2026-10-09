const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n42. ")) { console.log("already there"); process.exit(0); }
const add = `42. (R5-I) The CLASSIC bell's rose count badge reads 2.64:1 at its gradient's light end (below 4.5) and its "Clear all"
    hovers in the betting NO rose — the journey bell is fixed (brand pip 5.04:1, danger hover); the classic is frozen.
43. (R5-I) The CLASSIC wallet capsule's ±delta is still in the betting YES/NO colours (frozen chrome; the journey's is
    plain text now).
44. (R5-I) The board's "hot" flag chip shares the betting NO rose — split it? (§B2a calls it Ali's call.)
45. (R5-I) The identity crest's "Tipping Sigil" uses the YES/NO split — §B1a says it must not borrow from the mark.
46. (R5-I) Password, 2FA and email refusals a player can fix stay red pop-ups (the feedback law's pins hold them there);
    every other fixable refusal is now a calm message. Keep, or align them too?
47. (R5-I) A bonus that unlocked ("Unlocked") is green (a word is not money, as for invites) — or gold?
48. (R5-I) A rejected source-of-funds declaration is amber on /profile and red on its own page — which one?
49. (R5-I) Payout credits in /wallet's history: neutral (as the Receipts row decided) or gold (money earned, §M3)?
50. (R5-I) On the old dial, reaching a SESSION LIMIT (an RG limit) now shows its unchanged sentence as a message that
    stays until read, instead of the red ✗ pop-up — as Up & Down already does. Confirm?
51. (R5-I) The leaderboard's rate of return is now neutral text with its sign (not green/red, not gold). Right?
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
const s12 = `- (R5-I) The share button's "Couldn't copy" has no next step and no existing key fits.
- (R5-I) The agent application's submit pop-up prints the server's English error (apply-client.tsx ~175) — reason keys.
`;
const anchor2 = "\n\n## S8 (the journey bet sheet)";
if (!s.includes(anchor2)) throw new Error("anchor2");
s = s.replace(anchor2, "\n" + s12.replace(/\n$/, "") + anchor2);
fs.writeFileSync(p, s);
console.log("ok");
