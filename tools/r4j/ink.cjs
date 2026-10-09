const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [dir, reS, x0, x1, y0, y1, thr] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((f) => new RegExp(reS).test(f)).sort()) {
  const { width: w, data } = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const rows = [];
  let bb = [1e9, 1e9, -1, -1];
  for (let y = +y0; y < +y1; y++) { let n = 0; for (let x = +x0; x < +x1; x++) { const i = (y * w + x) * 4; const r = data[i], g = data[i + 1], b = data[i + 2]; if (r + g + b > +thr && Math.abs(r - b) < 80 && !(g > r + 40)) { n++; bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; } } if (n) rows.push(`${y}:${n}`); }
  console.log(f.slice(0, 50), "ink bbox", bb.join(","), "rows", rows.join(" "));
}
