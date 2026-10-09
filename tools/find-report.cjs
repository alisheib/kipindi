// node find-report.cjs <needle> [outfile] — print the transcript lines' text containing <needle> (subagent hand-backs).
const fs = require("fs");
const T = "C:/Users/asheib/.claude/projects/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15.jsonl";
const needle = process.argv[2];
const out = process.argv[3];
const lines = fs.readFileSync(T, "utf8").split("\n");
const found = [];
const texts = (v, acc) => {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => texts(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => texts(x, acc));
  return acc;
};
lines.forEach((l, i) => {
  if (!l.includes(needle)) return;
  let j; try { j = JSON.parse(l); } catch { return; }
  for (const t of texts(j, [])) if (t.includes(needle)) found.push({ line: i + 1, text: t });
});
for (const f of found) console.log(`line ${f.line}: ${f.text.length} chars — ${f.text.slice(0, 160).replace(/\s+/g, " ")}`);
if (out && found.length) fs.writeFileSync(out, found[found.length - 1].text);
