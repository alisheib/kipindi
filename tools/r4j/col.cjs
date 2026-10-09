const fs = require("fs"), path = require("path");
const { PNG } = require("F:/kipindi-r4j/node_modules/pngjs");
const [file, xs, y0, y1] = process.argv.slice(2);
const { width: w, data } = PNG.sync.read(fs.readFileSync(file));
for (const x of xs.split(",").map(Number)) {
  const out = [];
  for (let y = +y0; y < +y1; y++) { const i = (y * w + x) * 4; out.push(`${y}:${data[i]},${data[i + 1]},${data[i + 2]}`); }
  console.log("x" + x, out.join(" "));
}
