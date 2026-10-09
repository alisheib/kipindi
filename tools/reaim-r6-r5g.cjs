// After R6 merged onto R5-L (2026-10-09): R5-G's P16 and P30 re-aimed at R6-C's code (C1's one name; the menu map one
// entry a line). The -wip copy is rebuilt from the -vis one.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/";
const p = "r5g/mutation-r5g-vis.mjs";
let s = fs.readFileSync(S + p, "utf8");
const pairs = [
  ['"if (dashboard) return { title: t.agent.dashTitle };", "if (dashboard) return { title: t.profile.inviteEarn };", ["3.5"]],',
   '"return { title: inviteName(t, { agent: dashboard, paid: payable }) };", "return { title: dashboard ? t.profile.inviteEarn : inviteName(t, { agent: false, paid: payable }) };", ["3.5"]], // R6-C\'s one name (merged 2026-10-09)'],
  ['"\\"/profile/kyc\\": t.profile.verifyIdentity, \\"/leaderboard\\": t.leaderboard.title, \\"/proposals\\"", "\\"/profile/kyc\\": t.profile.verifyIdentity, \\"/proposals\\"", ["2.2"]],',
   '"\\"/leaderboard\\": t.leaderboard.title,", "", ["2.2"]], // one entry a line since R6-C (merged 2026-10-09)'],
];
for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${n} × ${a.slice(0, 90)}`); s = s.replace(a, () => b); }
fs.writeFileSync(S + p, s);
fs.writeFileSync(S + p.replace(/\.mjs$/, "-wip.mjs"), s.replace("F:/kipindi-vis", "F:/kipindi-wip"));
console.log("ok");
