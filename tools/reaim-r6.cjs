// After R6 merged onto R5-L (2026-10-09): eight plants re-aimed at the code R6-C moved or renamed. The -wip copies are
// rebuilt from the -vis ones (ROOT F:/kipindi-wip).
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/";
function edit(p, pairs) {
  let s = fs.readFileSync(S + p, "utf8");
  for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${p}: ${n} × ${a.slice(0, 90)}`); s = s.replace(a, () => b); }
  fs.writeFileSync(S + p, s);
  const wip = p.replace(/(\.[cm]?js)$/, "-wip$1");
  fs.writeFileSync(S + wip, s.replace("F:/kipindi-vis", "F:/kipindi-wip"));
}
// R6-C P38: the return ghost draws its pair now (R5-K's rebuild, on `gap-2` since the merge) — plant the old 10px on it.
edit("r6c/mutation-r6c-vis.mjs", [[
  `    '<div className="h-[var(--h-control-md)] w-full rounded-control bg-bg-overlay kp-shimmer-track" />',\n    '<div className="flex flex-col sm:flex-row gap-2.5"><div className="h-[var(--h-control-md)] w-full rounded-control bg-bg-overlay kp-shimmer-track" /></div>', ["16.4"]],`,
  `    // merged 2026-10-09: R5-K's rebuilt ghost draws the pair, on the page's gap-2 — the plant takes it back to 10px\n    '<div className="flex flex-col sm:flex-row gap-2" aria-hidden>',\n    '<div className="flex flex-col sm:flex-row gap-2.5" aria-hidden>', ["16.4"]],`,
]]);
// R5-A F17: the KYC door's key is R6-C's (C13) and the journey menu's map is one entry a line since R6-C.
edit("r5a/mutate-r5a-vis.mjs", [
  [`'label: "profile.verifyIdentity", sub: "profile.verifyIdSub"', 'label: "common.verifyId", sub: "profile.verifyIdSub"', "5.1"],`,
   `'label: "profile.kycIdentityVerification", sub: "profile.verifyIdSub"', 'label: "common.verifyId", sub: "profile.verifyIdSub"', "5.1"], // R6-C's key (merged 2026-10-09)`],
  [`'"/leaderboard": t.leaderboard.title, ', "", "5.3"],`,
   `'"/leaderboard": t.leaderboard.title,', "", "5.3"], // one entry a line since R6-C (merged 2026-10-09)`],
]);
// R5-K: the return pair on gap-2, the KYC row's new name, the performance drawing in performance-ghost.tsx.
edit("r5k/mutation-r5k-vis.mjs", [
  ['["3.1", "src/app/wallet/deposit/return/loading.tsx", `<div className="flex flex-col sm:flex-row gap-[10px]" aria-hidden>`, `<div className="flex flex-col sm:flex-row gap-2" aria-hidden>`, "the return\'s buttons 12px apart (the page\'s are 10)"],',
   '["3.1", "src/app/wallet/deposit/return/loading.tsx", `<div className="flex flex-col sm:flex-row gap-2" aria-hidden>`, `<div className="flex flex-col sm:flex-row gap-[10px]" aria-hidden>`, "the return\'s buttons 10px apart (the page\'s are 12 since R6-C)"],'],
  ['["5.5", "src/app/profile/loading.tsx", `  [t.profile.verifyIdentity, t.profile.verifyIdSub],\\n`, ``, "a settings row short"],',
   '["5.5", "src/app/profile/loading.tsx", `  [t.profile.kycIdentityVerification, t.profile.verifyIdSub],\\n`, ``, "a settings row short"], // R6-C\'s name (merged 2026-10-09)'],
  ['["7.1", "src/app/positions/performance/loading.tsx",', '["7.1", "src/app/positions/performance/performance-ghost.tsx", /* R6-C moved the drawing */'],
  ['["7.2", "src/app/positions/performance/loading.tsx",', '["7.2", "src/app/positions/performance/performance-ghost.tsx",'],
  ['["7.3", "src/app/positions/performance/loading.tsx",', '["7.3", "src/app/positions/performance/performance-ghost.tsx",'],
]);
console.log("ok");
