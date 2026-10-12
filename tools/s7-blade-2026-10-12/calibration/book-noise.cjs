// S7 WP1 calibration, offline: what do two fresh servers of ONE tree disagree on in the book cells? Reads the v3 baseline
// and the null compare's capture (both captured with every book normaliser OFF), and for each candidate text
// normaliser set reports how many book-cell fields still differ. Layout lines are diffed raw (a page-kind normaliser,
// chart-paths, acts at capture time and cannot be applied here) and the differing lines are classified.
const fs = require("fs");
const [baseFile, curFile, harness] = process.argv.slice(2);
const b = JSON.parse(fs.readFileSync(baseFile, "utf8"));
const c = JSON.parse(fs.readFileSync(curFile, "utf8"));
const blob = (d, v) => (typeof v === "string" && d.blobs && d.blobs[v] !== undefined ? d.blobs[v] : v);

// The harness's own normalisers, read from its source (each `apply` is a pure string function).
const src = fs.readFileSync(harness, "utf8");
const start = src.indexOf("const BOOK_NORMALISERS = [");
const end = src.indexOf("\n];", start);
const CHART_SVGS = "svg.mcardp-spark, svg.kp-udtrack__svg";
const NORMS = eval(src.slice(start + "const BOOK_NORMALISERS = ".length, end + 3));
const TEXT = NORMS.filter((n) => n.kind === "text");
console.log("text normalisers:", TEXT.map((n) => n.id).join(", "));

const fields = [];
for (const key of Object.keys(b.book)) {
  const x = b.book[key], y = c.book[key];
  if (!y) { console.log("MISSING in current:", key); continue; }
  for (const reg of Object.keys(x.regions || {})) for (const f of ["html", "layout"]) {
    fields.push({ key, where: `${reg}.${f}`, a: blob(b, x.regions[reg][f]), z: blob(c, y.regions?.[reg]?.[f]) });
  }
  fields.push({ key, where: "head", a: blob(b, x.head), z: blob(c, y.head) });
}
const asText = (v) => (v == null ? "" : Array.isArray(v) ? v.join("\n") : typeof v === "string" ? v : JSON.stringify(v));
const same = (set) => fields.filter((F) => {
  const run = (s) => set.reduce((t, n) => n.apply(t), asText(s));
  return run(F.a) !== run(F.z);
});
const raw = same([]);
console.log(`\nfields: ${fields.length} · differ raw: ${raw.length} (${[...new Set(raw.map((F) => F.where))].join(", ")})`);
// Greedy: the smallest set of text normalisers that removes the most differences, one at a time.
let chosen = [], left = raw;
for (;;) {
  let best = null;
  for (const n of TEXT.filter((n) => !chosen.includes(n))) {
    const r = same([...chosen, n]).length;
    if (r < left.length && (!best || r < best.r)) best = { n, r };
  }
  if (!best) break;
  chosen.push(best.n); left = same(chosen);
  console.log(`+ ${best.n.id}: ${left.length} field(s) still differ`);
}
console.log(`\nchosen: [${chosen.map((n) => n.id).join(", ")}] · still differ: ${left.length}`);
// What is left, classified by its first differing line.
const firstDiff = (A, Z) => {
  const a = asText(A).split("\n"), z = asText(Z).split("\n");
  for (let i = 0; i < Math.max(a.length, z.length); i++) if (a[i] !== z[i]) return [a[i] ?? "(none)", z[i] ?? "(none)", i];
  return ["", "", -1];
};
const groups = new Map();
for (const F of left) {
  const run = (s) => chosen.reduce((t, n) => n.apply(t), asText(s));
  const [p, q] = firstDiff(run(F.a), run(F.z));
  const sig = `${F.where} :: ${String(p).slice(0, 150)} → ${String(q).slice(0, 150)}`;
  const k = `${F.where} :: ${String(p).replace(/[\d.]+/g, "#").slice(0, 80)}`;
  if (!groups.has(k)) groups.set(k, { n: 0, sig, keys: [] });
  const g = groups.get(k); g.n++; g.keys.push(F.key);
}
for (const g of [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 25)) console.log(`\n[${g.n}] ${g.sig}\n   e.g. ${g.keys.slice(0, 4).join(" ; ")}`);
