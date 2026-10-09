const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/owner-items.md";
let s = fs.readFileSync(p, "utf8");
if (s.includes("\n28. ")) { console.log("already there"); process.exit(0); }
const add = `
28. (R5-C, the second gold audit) The WARNING colour is the money gold today (\`--warning-fg: var(--gilt)\`, an owner token):
    every real warning — a refused sign-in, "more info needed" on KYC, a withdrawal hold — paints in money's gold. Proposed:
    an amber off gold's hue (\`--warning-500: oklch(74% 0.15 62)\`, \`--warning-fg: oklch(84% 0.115 66)\`, 7.5:1 / 10.8:1);
    chip.tsx's warning/paused and the warning toast would read the same tokens (feedback-law §2 is re-decided with it).
29. Classic chrome still carries gold that is not money (frozen for S6/S7): the "• Juu na Chini" dots (top-app-bar.tsx
    :533, \`.kp-rail__dot\`) → brand or none; the classic bell, language tick and avatar-menu rows → the journey's
    colours; the live-ticker separator → \`--border-strong\`; the classic header's "INAKUJA" tag (kept tinted there).
30. The claret rule's gold midpoint (\`.claret-rule\`, \`var(--gilt) 50%\`) → \`var(--claret-300) 50%\` (and the offline page's
    copy).
31. The legal pages' RG links are gold (Terms ×6, RG policy ×3) → brand. It changes the Terms/RG text hashes, so it ships
    with the next policy version.
32. Gold questions: the landing's pool and paid-out totals in gold (money, Q5) vs D5's inducement clause; the empty-state
    illustrations' one gold accent (§C7) vs Q5; the crest's raw metal (chroma 0.13) vs \`--metal-gold\` (0.068); §C5 "no
    streak flames" — the hot chip and streak chain are still flames (now metal, not gold).
33. (R5-A) The grid cards' pool figure has no word beside it ("TZS 1.2M" alone): at 320 the worst case (7-digit pool +
    "dakika 59 zimebaki" + the info button) uses 257.6 of 258px, so even one glyph wraps a fixed-height card. Smaller
    type, a second line (taller cards), or leave it (screen readers now hear "Bwawa")?
34. (R5-A) Every dialog's close ✕ now stands on its title's first line (one convention); the confirm dialog's ✕ moved off
    the medallion's centre to the title's capitals. Confirm the look.
35. (R5-A) "One page, one name" in the journey: the proposals doors now read the page's own name "Mapendekezo ya Masoko /
    Market Proposals" (the "earn" wording "Pendekeza na upate zawadi" is gone from the journey's doors). OK?
36. (R5-A) Swahili leaderboard name: "Bingwa" (the page's own name, now on the journey's doors) or "Jedwali la Washindi"
    (the classic nav)? One of them should change everywhere (S12 if the page changes).
37. (R5-A) Legal titles keep a connective with its noun: "Kanuni / za Michezo" (not "Kanuni za / Michezo"), "Terms / of
    Service", "Sera / ya Faragha" at the narrow widths where they wrap — rule: no line ends on a connective.
`;
const anchor = "\n## S12 (live-word corrections";
if (!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, add + anchor);
const s12 = `- (R5-A) A key for the rules page's name ("Kanuni za Michezo / Game Rules / 游戏规则") for the hub row and footer link,
  which say "RTP ya mchezo na sheria / Game RTP & rules".
- (R5-A) sw AML door "Sera ya AML / KYC" vs the page title "Sera ya Kuzuia Uoshaji wa Fedha na KYC".
- (R5-A) sw "Weka mipaka" (the doors) vs the limits page's h1 "Vikomo".
- (R5-A) sw LIVE: "Mubashara" (the page) vs "hai" in count lines ("40 hai").
- (R5-A) zh regulator: the footer's 坦桑尼亚博彩委员会 vs the agent page's 坦桑尼亚博彩管理委员会.
- (R5-A) sw \`proposals.earned\` reads "umepataa" (likely a typo for "umepata").
- (R5-C) The factual validation toasts have no next-step line (F4) — new keys.
`;
const anchor2 = "\n## S8 (the journey bet sheet)";
if (!s.includes(anchor2)) throw new Error("anchor2");
s = s.replace(anchor2, "\n" + s12.replace(/\n$/, "") + anchor2);
fs.writeFileSync(p, s);
console.log("ok");
