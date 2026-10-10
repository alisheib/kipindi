// 2026-10-10 ~03:55 EAT: VODACOM-PLAN §0 IN FLIGHT, and the marketing tracker's owed item 3 (asked by asheib-73).
const fs = require("fs");
function edit(p, pairs) {
  let s = fs.readFileSync(p, "utf8");
  for (const [a, b] of pairs) { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`${p}: ${n} × ${a.slice(0, 80)}`); s = s.replace(a, () => b); }
  fs.writeFileSync(p, s);
}
const R = "F:/kipindi-vdocs/docs/";
edit(R + "VODACOM-PLAN.md", [
  ["**⏳ IN FLIGHT (updated 2026-10-09 ~23:55 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**",
   "**⏳ IN FLIGHT (updated 2026-10-10 ~03:55 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**"],
  ["The S6 visual pass is on `origin/vodacom-visual` (`422832b1`, NOT live): rounds 1–4, the edge read, round 5 (R5-A…R5-L) and round 6 (R6-A — no bet offered during a break —, R6-B, R6-C) ALL merged; nothing waits on a WIP branch. R5-L proved on the merged tree (107 suites, 14 red twins, seven mutation proofs); the R6 trio's combined check (every suite reading a touched file and all fourteen proofs) was running at ~23:55 — the handover says how to rerun it if it is not reported done there. Then main merged in (one conflict, `email.ts`: keep the branch's side — main's hotfix plus R5-B's F9), the final proof (M16a–d), round 6's read, and live only when a read finds nothing. The questions for Ali (79, plus the S12 word list)",
   "The S6 visual pass is on `origin/vodacom-visual` (`4b754b89`, NOT live): rounds 1–4, the edge read, round 5 (R5-A…R5-L) and round 6 (R6-A — no bet offered during a break —, R6-B, R6-C) ALL merged, and main merged in up to `e7a979c6`; nothing waits on a WIP branch. Proved on the merged branch: 340 suites (green but two environment reds), 26 of 28 red twins (two owed a long turn), and all fourteen mutation proofs — 511 of 511 planted defects caught. Found and fixed on the way: the verdict fan-out now awaits its notices (the settlement gate's three refusal controls had passed with their guards deleted since R5-B; `red:officer-hold` 13/13 again), and on main `e7a979c6` re-pinned house-bots' line-pinned money writes that my RG hotfix 2cd2239e had moved (test:house-bot-reports green again; red:house-bot-c5 99/99). Next: the final proof (M16a–d) with the database suites, round 6's read, and live only when a read finds nothing. The questions for Ali (79, plus the S12 word list)"],
]);
edit(R + "MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md", [
  ["  3. The whole `red:house-bot-console` and `red:house-bot-c5`, each alone in a quiet lock turn (owed since STEPS 49–53;\n     the STEP log says why each run was cut short or refused).\n",
   "  3. The whole `red:house-bot-console` and `red:house-bot-c5`, each alone in a quiet lock turn (owed since STEPS 49–53;\n     the STEP log says why each run was cut short or refused).\n" +
   "     2026-10-10 (the Vodacom lane, OMEGA): `red:house-bot-c5` ran whole on main `e7a979c6` — 99 caught, 0 missed, 0 wrong\n" +
   "     assertion, 0 stale, 0 files left dirty (its baseline had refused: the RG hotfix 2cd2239e moved six of 0.232's\n" +
   "     line-pinned writes, re-pinned in e7a979c6). `red:house-bot-console` fails its plant 1.548 (\"the fix is in the crumb\n" +
   "     builder's own home, keyed by the SECTION KEY\") on main at 9aa4eec2 and before that day's hotfixes (9cb95938~1).\n"],
]);
console.log("ok");
