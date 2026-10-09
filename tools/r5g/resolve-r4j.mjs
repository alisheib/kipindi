// R5-G port · visual-pass-r4j 3.4: R5-H's rows (the drawings read their own words), the deposit row taking R5-G's journey answer.
import { readFileSync, writeFileSync } from "node:fs";
const P = "F:/kipindi-r5g/scripts/visual-pass-r4j.test.mts";
const s = readFileSync(P, "utf8");
const EOL = s.includes("\r\n") ? "\r\n" : "\n";
const start = s.indexOf("<<<<<<< ours");
const mid = s.indexOf("=======", start);
const end = s.indexOf(">>>>>>> theirs", mid);
if (start < 0 || mid < 0 || end < 0) { console.log("conflict not found"); process.exit(1); }
const endLine = s.indexOf(EOL, end) + EOL.length;
const ours = s.slice(s.indexOf(EOL, start) + EOL.length, mid);
const depositOld = `    ['"/wallet/deposit": <DepositGhost />', 'import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";', "src/app/wallet/deposit/loading.tsx", "return <DepositGhost />;"],`;
const depositNew = `    ['"/wallet/deposit": <DepositGhost journey />', 'import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";', "src/app/wallet/deposit/loading.tsx", "return <DepositGhost journey={journey} />;"],`;
if (!ours.includes(depositOld)) { console.log("R5-H's deposit row not found"); process.exit(1); }
const note = [
  "  // ⚠️ …AND THE DEPOSIT DRAWING TAKES THE JOURNEY ANSWER (R5-G, G-1): its head is the page's own for either reader",
  "  // (`money-names.ts`) — the root ghost (a journey reader's alone) hands it `journey`, its loading file the per-request one.",
].join(EOL) + EOL;
const resolved = ours.replace("  const own: Array<[string, string, string, string]> = [", note + "  const own: Array<[string, string, string, string]> = [").replace(depositOld, depositNew);
writeFileSync(P, s.slice(0, start) + resolved + s.slice(endLine));
const out = readFileSync(P, "utf8");
console.log("r4j resolved; markers left:", (out.match(/^(<<<<<<<|=======|>>>>>>>)/gm) || []).length);
