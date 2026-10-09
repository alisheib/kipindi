import fs from "node:fs";
const p = process.argv[2];
const lines = [
  "- run5 (37 suites) ALL OK: r6c 86/86, popup-fit (5 clipping popups, was 6), r5e 60, red twins (enter-where-pressed 103/103,",
  "  journey-shell 188/188, journey-tickets 111/111, marketing-optout), the required list, dead-css OK.",
  "- Ghosts of the back-link pages (kyc, invite, RG, notifications loading.tsx) are generic PageLoader: no back-link words to",
  "  follow. Name for R5-L: a rebuilt invite/agent ghost that draws the back link reads journey.tabAccount in the journey.",
  "- Mutation proof started (39 plants) after hashing all 64 changed files (pre-mutation-sha.txt).",
];
fs.appendFileSync(p, lines.join("\r\n") + "\r\n");
