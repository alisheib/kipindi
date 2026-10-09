// prep-r5 — split round 5's tiles into reader prompts (after tile-diff has written diff-r5).
//   node prep-r5.cjs <readers>
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const T = S + "/visual/tiles-r5", D = S + "/visual/diff-r5";
const n = Number(process.argv[2] || 6);
const files = fs.readdirSync(T).filter((f) => f.endsWith(".png")).sort();
if (!files.length) throw new Error("no tiles in " + T);
const tpl = fs.readFileSync(S + "/visual/reader-prompt-r5.md", "utf8");
const per = Math.ceil(files.length / n);
for (let i = 0; i < n; i++) {
  const g = files.slice(i * per, (i + 1) * per);
  if (!g.length) continue;
  const p = tpl.split("{S}").join(S).split("{TILES}").join(T).split("{DIFFS}").join(D)
    .split("{N}").join(String(g.length)).split("{LIST}").join(g.join("\n"));
  fs.writeFileSync(S + "/visual/reader-r5-" + (i + 1) + ".txt", p);
  console.log("r5-" + (i + 1), g.length, g[0].slice(0, 44), "…", g[g.length - 1].slice(0, 44));
}
