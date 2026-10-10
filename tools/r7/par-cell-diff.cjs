// Print the element lines that differ in one parity cell's region between the baseline and the current capture.
const fs = require("fs");
const [base, cur, cellKey, region] = process.argv.slice(2);
const B = JSON.parse(fs.readFileSync(base, "utf8")), C = JSON.parse(fs.readFileSync(cur, "utf8"));
const find = (cap) => { const all = [...(cap.cells ?? []), ...(cap.sell ?? []), ...(cap.sellCells ?? [])]; return all.find((c) => (c.key ?? c.id ?? "") === cellKey) ?? null; };
const b = find(B), c = find(C);
if (!b || !c) { console.log("cell not found", !!b, !!c, Object.keys(B)); process.exit(1); }
const get = (o, path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const lb = get(b, region) ?? [], lc = get(c, region) ?? [];
const arr = (v) => Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
const A = arr(lb), D = arr(lc);
console.log(`${cellKey} ${region}: base ${A.length} lines, current ${D.length} lines`);
for (let i = 0; i < Math.max(A.length, D.length); i++) if (A[i] !== D[i]) console.log(`#${i}\n  - ${String(A[i]).slice(0, 400)}\n  + ${String(D[i]).slice(0, 400)}`);
