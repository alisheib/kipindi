// R5-L · the patched tip against onto-tip, line endings aside: every file the same, none missing either side.
const fs = require("fs"), path = require("path");
const H = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/merge/";
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const rel = (root) => new Set(walk(root).map((f) => path.relative(root, f).split(path.sep).join("/")));
const a = rel(H + "verify"), b = rel(H + "onto-tip");
const norm = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const bad = [];
for (const f of new Set([...a, ...b])) {
  if (!a.has(f) || !b.has(f)) { bad.push(`${f}: only in ${a.has(f) ? "verify" : "onto-tip"}`); continue; }
  if (norm(H + "verify/" + f) !== norm(H + "onto-tip/" + f)) bad.push(`${f}: differs`);
}
console.log(bad.length ? bad.join("\n") : `VERIFY: the patch takes the tip's ${a.size} files to onto-tip exactly (line endings aside)`);
