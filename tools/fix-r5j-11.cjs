// r5j 1.1 on the merged branch: R5-K's rebuilt classic positions ghost draws its count slot as the shape "00" (R5-K's
// convention: figures as shapes) — classified beside its siblings, not a count.
const fs = require("fs");
const p = "F:/kipindi-vis/scripts/visual-pass-r5j.test.mts";
let s = fs.readFileSync(p, "utf8");
const a = `  "src/app/wallet/wallet-ghost.tsx :: slot {n} :: \\"00\\"": "the loading ghost's two placeholder digits, not a count — R5-K/L's ghosts",`;
if (s.split(a).length !== 2) throw new Error("anchor");
const nl = s.includes("\r\n") ? "\r\n" : "\n";
s = s.replace(a, a + nl + `  "src/app/positions/positions-ghost.tsx :: slot {n} :: \\"00\\"": "the loading ghost's two placeholder digits, not a count — R5-K's ghosts (merged 2026-10-09)",`);
fs.writeFileSync(p, s);
console.log("ok");
