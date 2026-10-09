// Ad hoc: derive two throwaway variants of scripts/contrast-audit-red.mjs that SIMULATE the old defect
// (the copied root lacks src/components/ui/chip.tsx) to exercise the two new code paths:
//   A) control ON  -> must stop at the CONTROL with the ENOENT tail and exit 1
//   B) control OFF -> every non-parse-time mutation must MISS with the new "CRASHED" explanation
import { readFileSync, writeFileSync } from "node:fs";

const SP = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
let src = readFileSync("F:/kipindi-rot3/scripts/contrast-audit-red.mjs", "utf8").replace(/\r\n/g, "\n");

// aim the variant at the real repo even though it lives in the scratchpad
src = src.replace(
  'const cwd = new URL("..", import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/, "$1");',
  'const cwd = "F:/kipindi-rot3/";',
);
src = src.replace('from "./contrast-corpus.mjs"', 'from "file:///F:/kipindi-rot3/scripts/contrast-corpus.mjs"');
// simulate the old defect: the copy has no chip.tsx
src = src.replace(
  "filter: (p) => statSync(p).isDirectory() || /\\.tsx?$/.test(p),",
  "filter: (p) => statSync(p).isDirectory() || (/\\.tsx?$/.test(p) && !p.endsWith('chip.tsx')),",
);
for (const need of ['const cwd = "F:/kipindi-rot3/";', "file:///F:/kipindi-rot3/scripts/contrast-corpus.mjs", "!p.endsWith('chip.tsx')"]) {
  if (!src.includes(need)) throw new Error("variant patch did not land: " + need);
}
writeFileSync(`${SP}/variant-control-on.mjs`, src);

// B: neutralise the control's early exit so the loop runs (and must explain the crashes)
const off = src.replace("    process.exit(1);\n  }\n}\n\nlet caught = 0;", "    /* control exit disabled in variant B */\n  }\n}\n\nlet caught = 0;");
if (off === src) throw new Error("variant B patch did not land");
writeFileSync(`${SP}/variant-control-off.mjs`, off);
console.log("variants written");
