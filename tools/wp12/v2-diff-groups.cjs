// Group EVERY difference between the v2 baseline (7c859cdf) and today's capture, across all cells, by region and by
// the text around the first difference — so each group can be attributed to one served commit.
const fs = require("fs");
const S = process.argv[2];
const base = JSON.parse(fs.readFileSync(`${S}/wp12/parity-v2-7c859cdf-omega.json`, "utf8"));
const cur = JSON.parse(fs.readFileSync(`${S}/wp12/parity-v2-7c859cdf-omega.json.current.json`, "utf8"));
// Cells live under `cells`; a region's html is stored as a hash into the file's own `blobs` table.
const B = base.cells, C = cur.cells;
const deref = (file, v) => (typeof v === "string" && file.blobs && Object.prototype.hasOwnProperty.call(file.blobs, v) ? String(file.blobs[v]) : v);
const groups = new Map();
const add = (key, cell) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(cell); };
const firstDiff = (a, b) => {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { at: i, was: a.slice(Math.max(0, i - 40), i + 60), now: b.slice(Math.max(0, i - 40), i + 60) };
};
const cells = Object.keys(B);
let compared = 0;
for (const k of cells) {
  const x = B[k], y = C[k];
  if (!y) { add("MISSING in today's capture", k); continue; }
  compared++;
  for (const r of ["header", "rail", "footer", "emailBar"]) {
    const a = x.regions?.[r] ?? {}, b = y.regions?.[r] ?? {};
    for (const f of ["html", "count"]) {
      const av = a[f] === undefined ? "" : String(deref(base, a[f])), bv = b[f] === undefined ? "" : String(deref(cur, b[f]));
      if (av !== bv) {
        const d = firstDiff(av, bv);
        add(`${r}.${f} · was …${JSON.stringify(d.was).slice(0, 110)}… now …${JSON.stringify(d.now).slice(0, 110)}…`, k);
      }
    }
  }
  for (const f of ["status", "footerPaddingBottom", "scrollPaddingBottom"]) {
    if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) add(`${f} · ${JSON.stringify(x[f])} → ${JSON.stringify(y[f])}`, k);
  }
}
console.log(`${compared} of ${cells.length} cells compared; ${groups.size} distinct difference group(s):\n`);
for (const [g, ks] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(ks.length).padStart(4)} cell(s) · ${g}`);
  console.log(`       e.g. ${ks.slice(0, 3).join(" · ")}`);
}
