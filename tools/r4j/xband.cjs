const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [dir, reS, ya, yb] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((f) => new RegExp(reS).test(f)).sort()) {
  const { width: w, height: h, data } = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  let x0 = w, x1 = -1;
  for (let y = +ya; y <= +yb; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (Math.abs(data[i] - 8) + Math.abs(data[i + 1]) + Math.abs(data[i + 2] - 41) > 6) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
  console.log(f.slice(0, 55), `y${ya}-${yb}: x${x0}-${x1}`);
}
