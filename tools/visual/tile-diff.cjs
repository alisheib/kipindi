// tile-diff.cjs <beforeDir> <afterDir> <outDir>
// For every tile in both folders (matched by name): equal, or the changed regions (boxes of changed pixels, merged
// when within 12px), the share of pixels changed, and an overlay PNG (the AFTER tile dimmed, changed pixels red).
// A size change (a page grew or shrank) is reported as such, with the first changed row. Writes diff.json + overlays.
// Run with NODE_PATH pointing at a node_modules that holds pngjs.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const [before, after, out] = process.argv.slice(2);
if (!before || !after || !out) { console.error("usage: tile-diff.cjs <before> <after> <out>"); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const THRESH = 40;   // R+G+B difference that counts as a changed pixel (anti-aliasing noise sits below)
const MERGE = 12;    // px: boxes closer than this merge into one region

const read = (f) => PNG.sync.read(fs.readFileSync(f));
const names = fs.readdirSync(after).filter((f) => f.endsWith(".png")).sort();
const result = { before, after, tiles: [] };

// Match by the name WITHOUT its sequence number: a capture that gains a cell renumbers every tile after it.
const key = (n) => n.replace(/^\d+--/, "");
const beforeByKey = new Map(fs.readdirSync(before).filter((f) => f.endsWith(".png")).map((f) => [key(f), f]));
for (const name of names) {
  const bf = beforeByKey.has(key(name)) ? path.join(before, beforeByKey.get(key(name))) : path.join(before, name);
  if (!fs.existsSync(bf)) { result.tiles.push({ name, status: "new" }); continue; }
  const A = read(bf), B = read(path.join(after, name));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const sized = A.width !== B.width || A.height !== B.height;
  // changed pixels → row-band boxes
  const boxes = [];
  let changed = 0, firstRow = -1;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * A.width + x) * 4, ib = (y * B.width + x) * 4;
      const d = Math.abs(A.data[ia] - B.data[ib]) + Math.abs(A.data[ia + 1] - B.data[ib + 1]) + Math.abs(A.data[ia + 2] - B.data[ib + 2]);
      if (d > THRESH) { mask[y * w + x] = 1; changed++; if (firstRow < 0) firstRow = y; }
    }
  }
  if (changed === 0 && !sized) { result.tiles.push({ name, status: "equal" }); continue; }
  // boxes: scan 8px cells, then merge
  const C = 8;
  for (let cy = 0; cy < h; cy += C) for (let cx = 0; cx < w; cx += C) {
    let hit = false;
    for (let y = cy; y < Math.min(h, cy + C) && !hit; y++) for (let x = cx; x < Math.min(w, cx + C); x++) if (mask[y * w + x]) { hit = true; break; }
    if (hit) boxes.push([cx, cy, Math.min(w, cx + C), Math.min(h, cy + C)]);
  }
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < boxes.length && !merged; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a[0] - MERGE <= b[2] && b[0] - MERGE <= a[2] && a[1] - MERGE <= b[3] && b[1] - MERGE <= a[3]) {
        boxes[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
        boxes.splice(j, 1); merged = true; break;
      }
    }
  }
  // overlay: AFTER dimmed to 35%, changed pixels red
  const O = new PNG({ width: B.width, height: B.height });
  for (let y = 0; y < B.height; y++) for (let x = 0; x < B.width; x++) {
    const i = (y * B.width + x) * 4;
    const hot = x < w && y < h && mask[y * w + x];
    O.data[i] = hot ? 255 : Math.round(B.data[i] * 0.35);
    O.data[i + 1] = hot ? 32 : Math.round(B.data[i + 1] * 0.35);
    O.data[i + 2] = hot ? 32 : Math.round(B.data[i + 2] * 0.35);
    O.data[i + 3] = 255;
  }
  const overlay = path.join(out, name.replace(/\.png$/, "--diff.png"));
  fs.writeFileSync(overlay, PNG.sync.write(O));
  result.tiles.push({
    name, status: sized ? "resized" : "changed",
    size: sized ? { before: [A.width, A.height], after: [B.width, B.height] } : undefined,
    changedPct: +(100 * changed / (w * h)).toFixed(3), firstChangedRow: firstRow,
    regions: boxes.map(([x0, y0, x1, y1]) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })).slice(0, 40),
    overlay,
  });
}
fs.writeFileSync(path.join(out, "diff.json"), JSON.stringify(result, null, 1));
const c = (s) => result.tiles.filter((t) => t.status === s).length;
console.log(`tiles ${result.tiles.length} · equal ${c("equal")} · changed ${c("changed")} · resized ${c("resized")} · new ${c("new")}`);
