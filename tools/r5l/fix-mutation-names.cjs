// R5-L · the mutation proof's anchors follow the one helper (GhostText for Words; the kit's pill AND count import), and
// one on-disk plant breaks the helper's word bar itself.
const fs = require("fs");
const P = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/mutation-r5l.mjs";
let s = fs.readFileSync(P, "utf8");
const swap = (from, to) => { const n = s.split(from).length - 1; if (n < 1) throw new Error("missing: " + from.slice(0, 80)); s = s.split(from).join(to); };
const BS = String.fromCharCode(92); // a backslash, as the plant table's source writes `\n`
swap("label={<Words>{t.agent.statEarn}</Words>}", "label={<GhostText>{t.agent.statEarn}</GhostText>}");
swap(`'<p className="pt-1 text-body-sm leading-snug"><Words>{step}</Words></p>'`, `'<p className="pt-1 text-body-sm leading-snug"><GhostText>{step}</GhostText></p>'`);
swap(`'<Words ink={i === 0 ? "title" : "line"}>{label}</Words>', "{label}"`,
  "'kp-shimmer-track\" : \"\"}`}>" + BS + "n                <GhostText>{label}</GhostText>', 'kp-shimmer-track\" : \"\"}`}>" + BS + "n                {label}'");
swap(`'import { PillGhost } from "@/components/ui/query-bar-ghost";` + BS + `n', 'import { PillGhost as KitPill } from "@/components/ui/query-bar-ghost";` + BS + `nvoid KitPill;`,
  `'import { CountGhost, PillGhost } from "@/components/ui/query-bar-ghost";` + BS + `n', 'import { CountGhost, PillGhost as KitPill } from "@/components/ui/query-bar-ghost";` + BS + `nvoid KitPill;`);
swap(`  ["9.2", "src/app/wallet/money-bar-ghost.tsx",`,
  `  ["9.1", "src/components/ui/ghost-kit.tsx", 'text-transparent box-decoration-clone";', 'text-transparent";', "the helper's word bar on the first line only (no box-decoration-clone)"],\n  ["9.2", "src/app/wallet/money-bar-ghost.tsx",`);
fs.writeFileSync(P, s);
console.log("mutation anchors updated");
