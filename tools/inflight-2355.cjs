// VODACOM-PLAN §0 IN FLIGHT, 2026-10-09 ~23:55 EAT: every round's work merged on origin/vodacom-visual (422832b1).
const fs = require("fs");
const p = "F:/kipindi-vdocs/docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const pairs = [
  ["**⏳ IN FLIGHT (updated 2026-10-09 ~22:15 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**",
   "**⏳ IN FLIGHT (updated 2026-10-09 ~23:55 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**"],
  ["The S6 visual pass is on `origin/vodacom-visual` (`6f5b24c0`, NOT live): rounds 1–4, the edge read and round 5 (R5-A…R5-I, R5-K) merged and proved on the merged tree, plus the route entrance fix proven in a browser. Finished and waiting to merge, each on its WIP branch: R5-J, R6-A (no bet offered during a break), R6-B, R6-C, R5-L (snapshot). Then the rebase on main, the final proof (M16a–d), round 6's read, and live only when a read finds nothing. The questions for Ali (78, plus the S12 word list)",
   "The S6 visual pass is on `origin/vodacom-visual` (`422832b1`, NOT live): rounds 1–4, the edge read, round 5 (R5-A…R5-L) and round 6 (R6-A — no bet offered during a break —, R6-B, R6-C) ALL merged; nothing waits on a WIP branch. R5-L proved on the merged tree (107 suites, 14 red twins, seven mutation proofs); the R6 trio's combined check (every suite reading a touched file and all fourteen proofs) was running at ~23:55 — the handover says how to rerun it if it is not reported done there. Then main merged in (one conflict, `email.ts`: keep the branch's side — main's hotfix plus R5-B's F9), the final proof (M16a–d), round 6's read, and live only when a read finds nothing. The questions for Ali (79, plus the S12 word list)"],
];
for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${n} × ${a.slice(0, 80)}`); s = s.replace(a, () => b); }
fs.writeFileSync(p, s);
console.log("ok");
