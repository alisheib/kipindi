// Measurement helper for R3-C. node m.cjs <cmd> <tile> ...
//  bands <png> y0 y1 x0 x1 thr [bgx bgy]  -> horizontal text bands (rows with ink) with first/last ink x
//  cols  <png> y0 y1 x0 x1 thr [bgx bgy]  -> vertical bands (columns with ink) with first/last ink y
//  px    <png> x y [x y ...]               -> pixel colours
//  hline <png> y x0 x1                     -> run-length of colours along a row
//  vline <png> x y0 y1                     -> run-length of colours along a column
//  crop  <png> x0 y0 x1 y1 scale out.png   -> upscaled crop to view
const fs = require("fs");
const path = require("path");
const { PNG } = require(path.join("F:/kipindi-r3c/node_modules/pngjs"));
const T = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/visual/tiles-m/";
function load(f) {
  let p = f;
  if (!fs.existsSync(p)) {
    const pre = f.padStart(3, "0");
    const hit = fs.readdirSync(T).find((n) => n.startsWith(pre + "--"));
    if (hit) p = T + hit;
    else {
      const T2 = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/wp12/tiles-h/";
      const hit2 = fs.readdirSync(T2).find((n) => n.startsWith(f.replace(/^h/, "") + "--"));
      if (f.startsWith("h") && hit2) p = T2 + hit2;
    }
  }
  return PNG.sync.read(fs.readFileSync(p));
}
const [, , cmd, file, ...a] = process.argv;
const img = load(file);
const W = img.width, H = img.height;
const get = (x, y) => { const i = (y * W + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const diff = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
if (cmd === "size") { console.log(W, H); }
if (cmd === "bands" || cmd === "cols") {
  const [y0, y1, x0, x1, thr, bx, by] = a.map(Number);
  const bg = get(bx ?? x0, by ?? y0);
  const ink = (x, y) => diff(get(x, y), bg) > thr;
  if (cmd === "bands") {
    let band = null;
    const out = [];
    for (let y = y0; y <= Math.min(y1, H - 1); y++) {
      let f = -1, l = -1;
      for (let x = x0; x <= Math.min(x1, W - 1); x++) if (ink(x, y)) { if (f < 0) f = x; l = x; }
      if (f >= 0) { if (!band) band = { y0: y, y1: y, f, l }; else { band.f = Math.min(band.f, f); band.l = Math.max(band.l, l); band.y1 = y; } }
      else if (band) { out.push(band); band = null; }
    }
    if (band) out.push(band);
    console.log("bg", hex(bg));
    for (const b of out) console.log(`y ${b.y0}-${b.y1} (h${b.y1 - b.y0 + 1})  x ${b.f}..${b.l} (w${b.l - b.f + 1})`);
  } else {
    let band = null;
    const out = [];
    for (let x = x0; x <= Math.min(x1, W - 1); x++) {
      let f = -1, l = -1;
      for (let y = y0; y <= Math.min(y1, H - 1); y++) if (ink(x, y)) { if (f < 0) f = y; l = y; }
      if (f >= 0) { if (!band) band = { x0: x, x1: x, f, l }; else { band.f = Math.min(band.f, f); band.l = Math.max(band.l, l); band.x1 = x; } }
      else if (band) { out.push(band); band = null; }
    }
    if (band) out.push(band);
    console.log("bg", hex(bg));
    for (const b of out) console.log(`x ${b.x0}-${b.x1} (w${b.x1 - b.x0 + 1})  y ${b.f}..${b.l} (h${b.l - b.f + 1})`);
  }
}
if (cmd === "px") { for (let i = 0; i < a.length; i += 2) console.log(a[i], a[i + 1], hex(get(+a[i], +a[i + 1])), get(+a[i], +a[i + 1]).join(",")); }
if (cmd === "hline" || cmd === "vline") {
  const [k, s0, s1] = a.map(Number);
  let run = null; const out = [];
  for (let s = s0; s <= s1; s++) {
    const c = cmd === "hline" ? get(s, k) : get(k, s);
    const h = hex(c);
    if (run && run.h === h) run.e = s; else { if (run) out.push(run); run = { h, s, e: s }; }
  }
  out.push(run);
  for (const r of out) console.log(`${r.s}-${r.e} ${r.h}`);
}
if (cmd === "crop") {
  const [x0, y0, x1, y1, sc] = a.slice(0, 5).map(Number);
  const outp = a[5];
  const w = (x1 - x0 + 1) * sc, h = (y1 - y0 + 1) * sc;
  const o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = get(x0 + Math.floor(x / sc), y0 + Math.floor(y / sc));
    const i = (y * w + x) * 4; o.data[i] = c[0]; o.data[i + 1] = c[1]; o.data[i + 2] = c[2]; o.data[i + 3] = 255;
  }
  fs.writeFileSync(outp, PNG.sync.write(o));
  console.log("wrote", outp, w, h);
}
