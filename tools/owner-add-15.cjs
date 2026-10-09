const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n15. ")) { console.log("already there"); process.exit(0); }
const add = `
15. The OFFLINE page now uses the system font (R4-G, cec24e83): it is a person-free document the phone app keeps, and
    the brand fonts live under build-hashed names only the app knows (the error page already does the same). Bringing
    Sora/Inter to it = self-hosting the font files — a small asset decision.
16. During a responsible-gambling BREAK (edge scenario 1): the sentences that tell the player to bet NOW are being
    removed (as for a held wallet), but the generic product lines stay — the home tagline "Chagua upande, weka dau…",
    the trust line "Weka na toa pesa kwa M-Pesa…", "Kuwa wa kwanza kutabiri". And the hub still offers Invite friends,
    Propose & earn and Become an agent: does "no promotions during a break" cover referral and earn offers?
17. Right after SELF-EXCLUDING, the same phone is a guest again: the bet panel's first button is Sign up, "Anza
    kutabiri" and live NDIO/HAPANA show. Should a device that has just excluded be treated differently (e.g. no
    sign-up prompts for the exclusion period)? (Whether the same phone/email can open a NEW account is being proved.)
18. The English motto "The wisdom of YES & NO." sits under the Swahili and Chinese headings — a brand line by design?
19. Enlarged text (a phone's larger default font) changes nothing on player pages: the type scale is in px. Browser
    zoom works (WCAG 1.4.4 is met by zoom); honouring the phone's font-size setting would be a type-scale project.
20. Item 10 extended: the Needle on the profile card's corner at 768 (14–17px inside) and 1024 (0px), and at 740×360
    landscape both the Needle and the chat bubble on the profile card.
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
fs.writeFileSync(p, s);
console.log("ok");
