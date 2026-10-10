// 2026-10-10: the money books' bar ghost imports the kit's FiltersGhost too; R5-L's 9.2 plant ("a second pill ghost")
// re-aimed at the new import line, in both the -vis and the -wip proof scripts.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/";
const a = `'import { CountGhost, PillGhost } from "@/components/ui/query-bar-ghost";\\n', 'import { CountGhost, PillGhost as KitPill } from "@/components/ui/query-bar-ghost";`;
const b = `/* 2026-10-10: FiltersGhost too */ 'import { CountGhost, FiltersGhost, PillGhost } from "@/components/ui/query-bar-ghost";\\n', 'import { CountGhost, FiltersGhost, PillGhost as KitPill } from "@/components/ui/query-bar-ghost";`;
for (const f of ["r5l/mutation-r5l-vis.mjs", "r5l/mutation-r5l-vis-wip.mjs"]) {
  let s = fs.readFileSync(S + f, "utf8");
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: ${n} matches`);
  fs.writeFileSync(S + f, s.replace(a, () => b));
  console.log("ok", f);
}
