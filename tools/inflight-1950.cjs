// IN FLIGHT ~19:50 EAT (2026-10-09): replace the ~17:00 paragraph's lead with the handover pointer. Run in F:/kipindi-vdocs.
const fs = require("fs");
const p = "F:/kipindi-vdocs/docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const start = "**⏳ IN FLIGHT (updated 2026-10-09 ~17:00 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane** ▶ ";
const end = "  (the other sessions on";
const i = s.indexOf(start), j = s.indexOf(end, i);
if (i < 0 || j < 0 || s.split(start).length !== 2) throw new Error("anchors");
const next = "**⏳ IN FLIGHT (updated 2026-10-09 ~19:50 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane** ▶ " +
  "**EVERYTHING IS PUSHED — resume from [S6-VISUAL-PASS-STATE.md](design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md)** " +
  "(Ali, 2026-10-09: push all progress, we may continue on another machine tomorrow). The S6 visual pass is on " +
  "`origin/vodacom-visual` (`9677a3f5`, NOT live): rounds 1–4, the edge read and round 5's R5-A, R5-B, R5-C, R5-D, R5-E, " +
  "R5-F, R5-H and R5-I merged, each proved on the merged tree (every suite reading a touched file, the red twins, every " +
  "round-5 mutation proof); R5-G's finished work is `origin/vodacom-visual-r5g-wip` (being ported onto the tip); the " +
  "session's tools are `origin/vodacom-visual-tools`. Running on OMEGA: R5-G's port, R5-J (counts and figures), R5-K/R5-L " +
  "(the loading ghosts that still don't match their pages), three independent reviewers — static work only until the " +
  "marketing session frees the machine. Then the final proof (M16a–d), round 6's read, and live only when a read finds " +
  "nothing. Live from this lane today: the security hotfixes `9cb95938` and `118fc75c`. The questions for Ali (51, plus " +
  "the S12 word list) are in the handover file's appendices.";
s = s.slice(0, i) + next + s.slice(j);
fs.writeFileSync(p, s);
console.log("ok");
