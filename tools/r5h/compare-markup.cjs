// R5-H · G-2 · the drawn markup before vs after, per loading file × language × shell. Usage: node compare-markup.cjs before.json after.json
const fs = require("fs");
const B = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), A = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const keys = [...new Set([...Object.keys(B), ...Object.keys(A)])].sort();
const byFile = new Map();
for (const k of keys) {
  const [file] = k.split("|");
  const r = byFile.get(file) ?? { same: 0, differ: [], missing: [] };
  if (!(k in A) || !(k in B)) r.missing.push(k);
  else if (A[k] === B[k]) r.same++;
  else r.differ.push(k);
  byFile.set(file, r);
}
let same = 0, differ = 0;
for (const [file, r] of byFile) {
  same += r.same; differ += r.differ.length;
  const tag = r.differ.length === 0 && r.missing.length === 0 ? "IDENTICAL" : "DIFFERS";
  console.log(`${tag.padEnd(9)} ${file}  (${r.same} identical${r.differ.length ? `, ${r.differ.length} differ: ${r.differ.map((k) => k.split("|").slice(1).join("/")).join(" ")}` : ""}${r.missing.length ? `, missing ${r.missing.length}` : ""})`);
}
console.log(`\n${same} renders byte-identical, ${differ} differ`);
if (process.argv[4]) {
  // Show the first difference of one key.
  const k = process.argv[4];
  const a = A[k] ?? "", b = B[k] ?? "";
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  console.log(`\n${k} first difference at ${i}:\n before: …${b.slice(Math.max(0, i - 120), i + 200)}\n after:  …${a.slice(Math.max(0, i - 120), i + 200)}`);
}
