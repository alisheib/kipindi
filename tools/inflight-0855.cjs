// VODACOM-PLAN §0 IN FLIGHT, 2026-10-10 ~08:55 EAT.
const fs = require("fs");
const p = "F:/kipindi-vdocs/docs/VODACOM-PLAN.md";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const a1 = "**⏳ IN FLIGHT (updated 2026-10-10 ~03:55 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**";
const b1 = "**⏳ IN FLIGHT (updated 2026-10-10 ~08:55 EAT) — OMEGA-COMPILE01 holds the whole Vodacom lane**";
const startKey = "The S6 visual pass is on `origin/vodacom-visual` (`4b754b89`, NOT live):";
const endKey = "The questions for Ali (79, plus the S12 word list)";
if (s.split(a1).length !== 2) throw new Error("head");
const i = s.indexOf(startKey), j = s.indexOf(endKey);
if (i < 0 || j < 0 || j < i) throw new Error("body anchors");
s = s.replace(a1, b1);
const i2 = s.indexOf(startKey), j2 = s.indexOf(endKey);
s = s.slice(0, i2) +
  "The S6 visual pass is on `origin/vodacom-visual` (`5c13a9a2`, NOT live): every round merged, main merged in up to `e7a979c6`. The final proof's turns A–C ran on OMEGA: typecheck 0, test:all 500/507 (the one branch-only red the known D19a legal-chrome pin), seals 504 + 276 cells clean, needle-rest, bar geometry, header fit, preview green, local qa:live 334/334 after one real defect it found was fixed (/profile/invite on in-memory servers), classic parity 37/39 with two intended difference families still to register. Round 6's read of 333 tiles is done — its record is the handover's triage file (`tools/visual/triage-r6.md` on origin/vodacom-visual-tools): two fixes made (the hub's Sign out ink; /results' spotlight flag, a regression), the rest OPEN for the next round, then re-tile and re-read; live only when a read finds nothing. " +
  s.slice(j2);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
