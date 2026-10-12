// Every difference between the baseline and the compare's capture, per differing cell: html as a token diff, layout lines.
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const c = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const blob = (d, v) => (typeof v === "string" && d.blobs && d.blobs[v] !== undefined ? d.blobs[v] : v);
const summary = new Map();
const walk = (cellsB, cellsC, dB, dC, tag) => {
  for (const key of Object.keys(cellsB)) {
    const x = cellsB[key], y = cellsC[key];
    if (!y) { console.log("MISSING", key); continue; }
    for (const reg of Object.keys(x.regions || {})) {
      for (const f of ["html", "layout"]) {
        const vb = blob(dB, x.regions[reg]?.[f]), vc = blob(dC, y.regions?.[reg]?.[f]);
        if (JSON.stringify(vb) === JSON.stringify(vc)) continue;
        let sig;
        if (f === "html") {
          let i = 0; while (i < vb.length && vb[i] === vc[i]) i++;
          let j = 0; while (j < vb.length - i && j < vc.length - i && vb[vb.length - 1 - j] === vc[vc.length - 1 - j]) j++;
          sig = `html: ${JSON.stringify(vb.slice(i, vb.length - j))} → ${JSON.stringify(vc.slice(i, vc.length - j))}`;
        } else {
          const lb = Array.isArray(vb) ? vb : String(vb).split("\n"), lc = Array.isArray(vc) ? vc : String(vc).split("\n");
          const sb = new Set(lb.map(String)), sc = new Set(lc.map(String));
          const gone = lb.map(String).filter((l) => !sc.has(l)), added = lc.map(String).filter((l) => !sb.has(l));
          sig = `layout: -${gone.length} +${added.length} | gone: ${gone.join(" ;; ").slice(0, 600)} | added: ${added.join(" ;; ").slice(0, 600)}`;
        }
        const k = `${tag} ${reg} ${sig}`;
        if (!summary.has(k)) summary.set(k, []);
        summary.get(k).push(key);
      }
    }
  }
};
walk(b.cells, c.cells, b, c, "cell");
if (b.sell && c.sell) walk(b.sell.cells ?? b.sell, c.sell.cells ?? c.sell, b, c, "sell");
for (const [k, keys] of summary) console.log(`\n[${keys.length} cells] ${k}\n   cells: ${keys.join(", ").slice(0, 400)}`);
