const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const dir = process.argv[2];
const re = new RegExp(process.argv[3] || "^(2[7-9][0-9]|3[0-4][0-9])--s5");
for (const f of fs.readdirSync(dir).filter((f) => re.test(f)).sort()) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const { width: w, height: h, data } = png;
  const px = (x, y) => { const i = (y * w + x) * 4; return `${data[i]},${data[i + 1]},${data[i + 2]}`; };
  const band = (y0, y1) => { const s = new Map(); for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const k = px(x, y); s.set(k, (s.get(k) || 0) + 1); } return s; };
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${k}x${n}`).join(" ");
  const hdr = band(0, 54), rail = band(h - 64, h), all = band(0, h);
  console.log(f.slice(0, 50).padEnd(50), `${w}x${h}`, "hdr", hdr.size, top(hdr), "| rail", rail.size, top(rail), "| all", all.size);
}
