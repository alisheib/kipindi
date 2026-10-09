// Builds docs/design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md in F:/kipindi-vdocs from the
// hand-written head (handover-head.md) and the scratchpad's briefs and owner lists (appendices). CRLF, as the docs.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const OUT = "F:/kipindi-vdocs/docs/design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md";
const rd = (p) => fs.readFileSync(S + "/" + p, "utf8").replace(/\r\n/g, "\n");
const app = (title, file) => `\n---\n\n## Appendix ${title}\n\n` + rd(file).replace(/^# /m, "### ").replace(/^## /gm, "#### ");
let out = rd("handover-head.md")
  + app("A · the rules every helper follows (briefs/r5-common.md)", "briefs/r5-common.md")
  + app("B · R5-G's brief (merged)", "briefs/r5g-brief.md")
  + app("C · R5-J's brief", "briefs/r5j-brief.md")
  + app("D · R5-K / R5-L's brief", "briefs/r5k-brief.md")
  + app("E · the reviewers' brief", "briefs/review-r6-brief.md")
  + app("F · the questions for Ali, plain", "visual/owner-plain.md")
  + app("G · the questions for Ali, the full record (with S12 and S8)", "visual/owner-items.md")
  + app("H · R6-A's brief (responsible gambling)", "briefs/r6a-brief.md")
  + app("I · R6-B's brief (runtime, security, text)", "briefs/r6b-brief.md")
  + app("J · R6-C's brief (cross-surface consistency)", "briefs/r6c-brief.md");
out = out.split("\n").join("\r\n");
fs.writeFileSync(OUT, out);
console.log("wrote", OUT, out.length, "chars");
