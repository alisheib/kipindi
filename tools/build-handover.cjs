// Builds docs/design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md in F:/kipindi-vdocs from the
// hand-written head and the scratchpad's briefs and owner lists (appendices). CRLF, as the repo's docs.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const OUT = "F:/kipindi-vdocs/docs/design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md";
const rd = (p) => fs.readFileSync(S + "/" + p, "utf8").replace(/\r\n/g, "\n");
let head = rd("handover-head.md");
const swap = (a, b) => { if (!head.includes(a)) throw new Error("head anchor: " + a.slice(0, 60)); head = head.replace(a, b); };
swap("(updated 2026-10-09 ~19:10 EAT)", "(updated 2026-10-09 ~19:40 EAT)");
swap("- Two red twins green again (the colour gate judges the standalone /offline document against its own tokens;\n  implicit-submit's plants).",
  "- Two red twins green again (the colour gate judges the standalone /offline document against its own tokens;\n  implicit-submit's plants).\n- **R5-H** — every loading ghost a client reference instead of a drawn tree in every refresh (/wallet/receipts 16.9 KB\n  → 0.5 KB per refresh), the ghosts' bands fixed, the journey flag and the not-found mark in the first paint they\n  belong to. Committed and pushed `9677a3f5` while its merged-tree proof was still running (181 suites, the red twins,\n  all seven round-5 mutation proofs) — anything it finds is fixed forward.");
swap("- **R5-H** (merge staged, its proof running): every loading ghost a client reference instead of a drawn tree in every\n  refresh (/wallet/receipts 16.9 KB → 0.5 KB per refresh), the ghosts' bands fixed, the journey flag and the\n  not-found mark in the first paint. Pushed to `origin/vodacom-visual` as soon as its proof is green.\n",
  "- **R5-H's merged-tree proof** (the commit is pushed; see §2).\n");
swap("- **R5-G** (helper, worktree `F:\\kipindi-r5g`): one page, one name for the journey's money pages and every door; the\n  regulator's name everywhere it renders. Brief: appendix B.",
  "- **R5-G** (helper, worktree `F:\\kipindi-r5g`): one page, one name for the journey's money pages and every door; the\n  regulator's name everywhere it renders — FINISHED on `eaed15d0` (61 checks, 30/30 plants), now being ported onto\n  `9677a3f5` (R5-H reshaped the loading ghosts it touches). Its finished work is pushed as `origin/vodacom-visual-r5g-wip`\n  (`a32c3317`, the snapshot before the port). Brief: appendix B.");
swap("## 4 · Ready to start",
  "## 3a · Also pushed\n- `origin/vodacom-visual-tools` — the session's working tools (lock-turn chains, merge checks, briefs, triage notes,\n  owner lists, every round's mutation proof, the probes; no tiles or logs). Its `README-TOOLS.md` maps them.\n\n## 4 · Ready to start");
swap("## 4 · Ready to start (Ali: \"allocate more agents\" once marketing is done)",
  "## 4 · Started on OMEGA at ~19:45 EAT (Ali: \"allocate more agents\"; static work only until the marketing session\n" +
  "frees the machine's memory — no dev server, build, tsc, browser or battery). Worktrees `F:\\kipindi-r5j`, `-r5k`,\n" +
  "`-r5l`, and `F:\\kipindi-rev` (the reviewers' stable copy at `9677a3f5`). If OMEGA is gone, start each again from its\n" +
  "brief on the latest `origin/vodacom-visual`:");
const app = (title, file) => `\n---\n\n## Appendix ${title}\n\n` + rd(file).replace(/^# /m, "### ").replace(/^## /gm, "#### ");
let out = head
  + app("A · the rules every helper follows (briefs/r5-common.md)", "briefs/r5-common.md")
  + app("B · R5-G's brief", "briefs/r5g-brief.md")
  + app("C · R5-J's brief", "briefs/r5j-brief.md")
  + app("D · R5-K / R5-L's brief", "briefs/r5k-brief.md")
  + app("E · the reviewers' brief", "briefs/review-r6-brief.md")
  + app("F · the questions for Ali, plain", "visual/owner-plain.md")
  + app("G · the questions for Ali, the full record (with S12 and S8)", "visual/owner-items.md");
out = out.split("\n").join("\r\n");
fs.writeFileSync(OUT, out);
console.log("wrote", OUT, out.length, "chars");
