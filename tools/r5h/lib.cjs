// R5-H · shared helpers for the scratch edit scripts: read a worktree file LF-normalised, replace text that must match
// exactly once, write it back with CRLF (the worktree's endings). New files are written CRLF too.
const fs = require("fs");
const ROOT = "F:/kipindi-r5h/";
const rd = (p) => fs.readFileSync(ROOT + p, "utf8").replace(/\r\n/g, "\n");
const wr = (p, s) => fs.writeFileSync(ROOT + p, s.replace(/\r?\n/g, "\r\n"));
const exists = (p) => fs.existsSync(ROOT + p);
function once(s, from, to, label) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: expected exactly one match, found ${n}: ${JSON.stringify(from.slice(0, 120))}`);
  return s.replace(from, () => to);
}
function edit(p, fn) {
  const before = rd(p);
  const after = fn(before);
  if (after === before) throw new Error(`${p}: no change`);
  wr(p, after);
  console.log(`edited ${p}`);
}
function create(p, s) {
  if (exists(p)) throw new Error(`${p}: already exists`);
  wr(p, s);
  console.log(`created ${p}`);
}
module.exports = { ROOT, rd, wr, exists, once, edit, create };
