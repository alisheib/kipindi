import fs from "node:fs";
const p = process.argv[2];
const lines = [
  "- (correction: run3 ran 18:24-18:32Z, not ~18:50Z.) run3 = 149 suites: 144 OK + 5 RED. Two reds are the dev-server suites above (not",
  "  runnable here). Three were pins my change moved, fixed:",
  "  · test:visual-pass-r3c 9.4 pinned `<DotSeq text={paid ? inviteEarnSub : inviteFriendsSub} />` on the invite page -> re-pinned to",
  "    `<DotSeq text={inviteLine(t, { agent: false, paid })} />` + inviteLine's body in invite-name.ts (same words for a player).",
  "  · test:visual-pass-r4h 6.5 pinned the menu map's arm ORDER (invite-unpaid, /positions, journeyName). My reorder (journeyName",
  "    first) was not needed: invitePaid = payable || agentInGoodStanding, so inviteAgent implies invitePaid and the unpaid arm",
  "    already says inviteFriends. Restored the base order byte-for-byte (smaller hunk); r6c's run-the-code checks unchanged.",
  "  · test:visual-pass-r5e 2.1 pinned PositionCard's class with `line-clamp-2` -> re-pinned without it (C17).",
  "  C17 sibling: /fairness' resolved table keeps `line-clamp-2` (a browsing list of other markets, the board's Q6 case).",
  "- run4 started: 36 suites (3 re-pinned + every avatar-menu reader + required list + red twins + the 8 modal.tsx readers + r6c).",
];
fs.appendFileSync(p, lines.join("\r\n") + "\r\n");
