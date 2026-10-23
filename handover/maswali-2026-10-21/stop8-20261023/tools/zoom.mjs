// zoom.mjs <png> <out> <cropTopPx> <scale> — crop a tile from cropTop to its bottom and scale it up (pixelated) for a close read.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("C:/50pick-ssd/maswali-coord-20261019/package.json");
const { chromium } = require("playwright");
const [src, out, top, scale] = process.argv.slice(2);
const data = "data:image/png;base64," + readFileSync(src).toString("base64");
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(`<img id=i src="${data}">`); await p.waitForFunction(() => document.getElementById("i").complete);
const { w, h } = await p.evaluate(() => ({ w: document.getElementById("i").naturalWidth, h: document.getElementById("i").naturalHeight }));
const s = Number(scale), t = Number(top);
await p.setViewportSize({ width: Math.ceil(w * s), height: Math.ceil((h - t) * s) });
await p.setContent(`<body style="margin:0;overflow:hidden"><div style="width:${w * s}px;height:${(h - t) * s}px;overflow:hidden;position:relative"><img src="${data}" style="position:absolute;top:${-t * s}px;left:0;width:${w * s}px;height:${h * s}px;image-rendering:pixelated"></div></body>`);
await p.screenshot({ path: out }); await b.close(); console.log("zoom", w, "x", h - t, "×", s);
