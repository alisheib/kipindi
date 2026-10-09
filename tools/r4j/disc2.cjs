const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [dir, reS] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((f) => new RegExp(reS).test(f)).sort()) {
  const { width: w, height: h, data } = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  let bb = [w, h, -1, -1], n = 0;
  for (let y = 0; y < h; y++) for (let x = Math.floor(w * 0.85); x < w; x++) {
    const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    // the disc's green: rgb ~ (40-60, 140-170, 100-130)
    if (g > 120 && g > r + 60 && g > b + 15 && r < 110) { n++; bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; }
  }
  console.log(f.slice(0, 52).padEnd(52), n ? `x${bb[0]}-${bb[2]} y${bb[1]}-${bb[3]} n${n}` : "none");
}
