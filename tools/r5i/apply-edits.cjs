// Apply exact, single-occurrence replacements to files in the R5-I worktree, keeping each file's line endings.
// Usage: node apply-edits.cjs <spec.cjs>   — the spec module exports [{ file, from, to }] (LF-written anchors).
// Every anchor must match EXACTLY once in the LF-normalised text, or nothing is written for that file.
const fs = require("fs");
const path = require("path");
const ROOT = "F:/kipindi-r5i/";
const spec = require(path.resolve(process.argv[2]));
const byFile = new Map();
for (const e of spec) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}
let bad = 0;
for (const [file, edits] of byFile) {
  const p = ROOT + file;
  const raw = fs.readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  let ok = true;
  for (const e of edits) {
    const n = text.split(e.from).length - 1;
    const want = e.count ?? 1;
    if (n !== want) { console.log(`✗ ${file}: anchor matched ${n}× (want ${want}) — ${JSON.stringify(e.from.slice(0, 90))}`); ok = false; continue; }
    text = text.split(e.from).join(e.to);
  }
  if (!ok) { bad++; continue; }
  fs.writeFileSync(p, crlf ? text.replace(/\n/g, "\r\n") : text);
  console.log(`✓ ${file}: ${edits.length} edit(s)${crlf ? " (CRLF kept)" : ""}`);
}
process.exit(bad ? 1 : 0);
