const fs = require("fs");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [src, out, x0, y0, cw, ch, k] = process.argv.slice(2).map((v, i) => (i < 2 ? v : +v));
const a = PNG.sync.read(fs.readFileSync(src));
const o = new PNG({ width: cw * k, height: ch * k });
for (let y = 0; y < ch * k; y++) for (let x = 0; x < cw * k; x++) {
  const sx = x0 + Math.floor(x / k), sy = y0 + Math.floor(y / k);
  const i = (sy * a.width + sx) * 4, j = (y * o.width + x) * 4;
  o.data[j] = a.data[i]; o.data[j + 1] = a.data[i + 1]; o.data[j + 2] = a.data[i + 2]; o.data[j + 3] = 255;
  // grid line every 10px
  if ((sx % 10 === 0 && x % k === 0) || (sy % 10 === 0 && y % k === 0)) { o.data[j] = 255; o.data[j + 1] = 0; o.data[j + 2] = 0; }
}
fs.writeFileSync(out, PNG.sync.write(o));
