// Contact sheets of the phone rail for the lead's eye: each tile's BOTTOM band (the rail and its labels) cropped and laid
// out in a labelled grid, one sheet per question. node rail-sheets.mjs <tilesDir> <outDir>
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire("C:/50pick-ssd/maswali-coord-20261019/package.json");
const { chromium } = require("playwright");
const [dir, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
const b64 = (f) => "data:image/png;base64," + readFileSync(join(dir, f)).toString("base64");
const L = ["sw", "en", "zh"];
const who = ["a-guest", "the-demo-player", "a-held-wallet"];
const pick = (re) => files.filter((f) => re.test(f)).sort();
// Each crop: the tile at its natural width, showing only its bottom `band` px (object-position bottom).
const sheet = async (name, items, band, colW) => {
  const cells = items.map((f) => `<figure><div class="c" style="width:${colW}px;height:${band}px"><img src="${b64(f)}"></div><figcaption>${f.replace(/\.png$/, "")}</figcaption></figure>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:#fff;font:11px/1.3 Consolas,monospace;display:flex;flex-wrap:wrap;gap:10px;width:${Math.max(3 * (colW + 12), 1200)}px}
  figure{margin:0}.c{overflow:hidden;position:relative;border:1px solid #c8c8c8}.c img{position:absolute;left:0;bottom:0}figcaption{max-width:${colW}px;word-break:break-all}</style>${cells}`;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Math.max(3 * (colW + 12), 1200) + 20, height: 400 } });
  await p.setContent(html, { waitUntil: "load" }); await p.screenshot({ path: join(out, name + ".png"), fullPage: true }); await b.close();
  console.log("sheet", name, items.length);
};
// 1 · the rail at every phone width, per reader, sw/en/zh side by side.
for (const w of who) await sheet(`rail-${w}`, L.flatMap((l) => pick(new RegExp(`^${w}-${l}-(320|360|412)x780-rail\\.png$`))), 120, 420);
// 2 · More's sheet at 360 (the whole tile: More is a sheet over the page).
await sheet("more-360", L.flatMap((l) => who.map((w) => `${w}-${l}-360x780-more.png`)).filter((f) => files.includes(f)), 520, 370);
// 3 · the lit states at 360 (guest and player, sw first).
for (const w of ["a-guest", "the-demo-player"]) await sheet(`lit-${w}`, ["sw", "en", "zh"].flatMap((l) => pick(new RegExp(`^${w}-${l}-360-(lit|focus)-[a-z-]+\\.png$`))), 110, 370);
// 4 · landscape and tablet.
await sheet("wide", L.flatMap((l) => pick(new RegExp(`^a-guest-${l}-(740x360|768x780)-rail\\.png$`))), 110, 780);
