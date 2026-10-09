// R5-L · read-only: every backed-up file still byte-identical in the worktree (no git involved).
const fs = require("fs"), path = require("path");
const B = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/rebase/files/";
const W = "F:/kipindi-r5l/";
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let same = 0; const diff = [];
for (const f of walk(B)) {
  const rel = path.relative(B, f).split(path.sep).join("/");
  const a = fs.readFileSync(f), b = fs.existsSync(W + rel) ? fs.readFileSync(W + rel) : null;
  if (b && a.equals(b)) same++; else diff.push(rel);
}
console.log(`identical ${same}, different ${diff.length}${diff.length ? ": " + diff.join(", ") : ""}; loading-shared.tsx present: ${fs.existsSync(W + "src/app/agent/loading-shared.tsx")}`);
