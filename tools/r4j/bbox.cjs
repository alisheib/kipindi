const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const dir = process.argv[2];
const re = new RegExp(process.argv[3]);
const y0 = +(process.argv[4] || 60);
for (const f of fs.readdirSync(dir).filter((f) => re.test(f)).sort()) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const { width: w, height: h, data } = png;
  const bg = [8, 0, 41];
  let x0 = w, x1 = -1, ya = h, yb = -1;
  const rows = [];
  for (let y = y0; y < h - 70; y++) { let any = false; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]); if (d > 6) { any = true; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < ya) ya = y; if (y > yb) yb = y; } } if (any) rows.push(y); }
  // runs of rows
  const runs = []; for (const y of rows) { const r = runs[runs.length - 1]; if (r && y === r[1] + 1) r[1] = y; else runs.push([y, y]); }
  console.log(f.slice(0, 55), `bbox x${x0}-${x1} y${ya}-${yb}`, "runs", runs.slice(0, 8).map((r) => r.join("-")).join(" "));
}
