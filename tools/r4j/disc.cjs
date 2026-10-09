const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [dir, reS, x0s, y0s, y1s] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((f) => new RegExp(reS).test(f)).sort()) {
  const { width: w, height: h, data } = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const X0 = +x0s, Y0 = +y0s, Y1 = +y1s;
  // green disc: g > r+30 and g > b
  let bb = [w, h, -1, -1];
  // text: bright pixels (sum > 400), in rows Y0..Y1, x>=X0
  const rowsText = new Map();
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < w; x++) {
    const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > r + 40 && g > b + 10 && g > 80) { bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; }
  }
  console.log(f.slice(0, 50), "green disc bbox x", bb[0], "-", bb[2], "y", bb[1], "-", bb[3]);
}
