/**
 * R4-J's VERDICT ON A RE-TAKEN TILE SET — the browser-side half of the proof, read off the PNGs and the log that
 * `qa-journey-edges-r4j.mjs` (the edges drive with R4-J's two additions) writes. It takes no screenshot itself.
 *
 *   cd <a checkout with node_modules>      (pngjs is resolved from the working directory, as the drive resolves playwright)
 *   node <S>/r4j/r4j-verdict.mjs <tilesDir>
 *
 *   V1 E36       every Slow 3G mid-load frame draws the header (not one flat colour over y0–53) and, below 1024, the rail
 *   V2 E37 E41   no tap frame is blank, and none is dimmed: the header band's colour is the loaded page's (a cross-fade
 *                composites two half-opaque snapshots: 4,0,69 against 5,2,79 on tiles 292 301 315 333 338)
 *   V3 E38       each mid-load and tap frame's first block and column stand where the loaded page's do (±6px)
 *   V4 E40       the Needle, at rest, keeps ≥ 8px between its ink and the /markets caption's (s4 markets-card tiles)
 *   V5 not-found the not-found pages carry the mark, light no tab, show the chat bubble and the Needle, and log no
 *                error beyond the document's own 404
 *   V6 E39       (information) the tab title during a tap — "" is the framework's streamed metadata (see the report)
 * Run it on the ORIGINAL tiles (S/edges/tiles) to see it fail on what the readers saw: that is its control.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "qa-journey-edges.json"))) {
  console.error("usage: node r4j-verdict.mjs <tilesDir holding qa-journey-edges.json>");
  process.exit(2);
}
const { PNG } = createRequire(join(process.cwd(), "package.json"))("pngjs");
const LOG = JSON.parse(readFileSync(join(dir, "qa-journey-edges.json"), "utf8"));
const tiles = LOG.entries.filter((e) => e.kind === "tile" && e.file && existsSync(join(dir, e.file)));
const cache = new Map();
const img = (e) => {
  if (!cache.has(e.file)) cache.set(e.file, PNG.sync.read(readFileSync(join(dir, e.file))));
  return cache.get(e.file);
};
const BG = [8, 0, 41];
const px = (p, x, y) => { const i = (y * p.width + x) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2]]; };
const near = (a, b, t = 8) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= t;
function band(p, y0, y1, x0 = 0, x1 = p.width) {
  const m = new Map();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = px(p, x, y).join(","); m.set(k, (m.get(k) ?? 0) + 1); }
  const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return { distinct: m.size, dominant: top ? top[0].split(",").map(Number) : null };
}
/** Runs of rows (below the 56px header) holding anything but the page colour. */
function runs(p, from = 56, to = p.height - 70) {
  const out = [];
  for (let y = from; y < to; y++) {
    let any = false;
    for (let x = 0; x < p.width && !any; x++) if (!near(px(p, x, y), BG)) any = true;
    const r = out[out.length - 1];
    if (any) { if (r && r[1] === y - 1) r[1] = y; else out.push([y, y]); }
  }
  return out;
}
function columnX(p, y0, y1) {
  let a = p.width, b = -1;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < p.width; x++) if (!near(px(p, x, y), BG)) { a = Math.min(a, x); b = Math.max(b, x); }
  return [a, b];
}

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const loadedOf = (e, routeName) => tiles.find((t) => t.scenario === e.scenario && t.route === `${routeName}-loaded` && t.locale === e.locale && t.width === e.width);

console.log("\nV1 · E36 · the header and the rail on every mid-load frame");
for (const e of tiles.filter((t) => t.scenario === "s5-slow3g" && t.route.endsWith("-mid-load"))) {
  const p = img(e);
  const hdr = band(p, 0, 54);
  const rail = band(p, p.height - 64, p.height);
  const railOk = e.width >= 1024 || (rail.distinct >= 10 && !near(rail.dominant, BG, 0));
  ok(`${e.file} · header ${hdr.distinct} colours${e.width < 1024 ? `, rail ${rail.distinct} (dominant ${rail.dominant})` : ""}`, hdr.distinct >= 30 && railOk);
}

console.log("\nV2 · E37 E41 · tap frames: never blank, never dimmed");
for (const e of tiles.filter((t) => t.scenario === "s5-slow3g" && t.route.endsWith("-tap-mid"))) {
  const p = img(e);
  const all = band(p, 0, p.height);
  const ref = loadedOf(e, e.route.replace(/-tap-mid$/, ""));
  const hdr = band(p, 0, 54).dominant;
  const want = ref ? band(img(ref), 0, 54).dominant : null;
  ok(`${e.file} · ${all.distinct} colours; header ${hdr} against the loaded ${want}`, all.distinct > 100 && !!want && near(hdr, want, 2));
}

console.log("\nV3 · E38 · the ghost stands where the page lands (first block and column, ±6px)");
/** The colour most of a row is painted (a card's panel, the hero's band, the page). */
function rowColour(p, y) {
  const m = new Map();
  for (let x = 0; x < p.width; x += 2) { const k = px(p, x, y).join(","); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
}
/** Where the preview strip under the header ends: the first of three rows whose colour is not the strip's (row 60's). */
function stripEnd(p) {
  const s = rowColour(p, 60);
  for (let y = 61; y < p.height - 3; y++) if ([0, 1, 2].every((d) => !near(rowColour(p, y + d), s, 6))) return y;
  return 61;
}
/** The page's ink below the strip: the first row with ≥ 3 pixels off both its row's colour and the page's, and the
 *  ink's left and right over the next 160 rows. A ghost's bars and a page's words both count: each is ink on its panel;
 *  the page's own colour beside a panel is not (a card's row is mostly card). */
function firstBlock(p) {
  const from = stripEnd(p);
  const ink = (x, y, c) => { const v = px(p, x, y); return !near(v, c, 30) && !near(v, BG, 30); };
  for (let y = from; y < p.height - 70; y++) {
    const c = rowColour(p, y);
    let n = 0;
    for (let x = 0; x < p.width; x++) if (ink(x, y, c)) n++;
    if (n >= 3) {
      // The column: its left edge is the ink's (a word or a bar on its panel); its right edge is the panels' (a card,
      // a band), read only from 1024, where the Needle's gutter (the right 40px) lies outside every column.
      let a = p.width, b = -1;
      for (let yy = y; yy < Math.min(p.height - 70, y + 160); yy++) {
        const cc = rowColour(p, yy);
        for (let x = 0; x < p.width - 40; x++) {
          if (ink(x, yy, cc)) a = Math.min(a, x);
          if (!near(px(p, x, yy), BG, 30)) b = Math.max(b, x);
        }
      }
      return { y, x0: a, x1: b, from };
    }
  }
  return null;
}
for (const e of tiles.filter((t) => t.scenario === "s5-slow3g" && /-(mid-load|tap-mid)$/.test(t.route))) {
  const name = e.route.replace(/-(mid-load|tap-mid)$/, "");
  const ref = loadedOf(e, name);
  if (!ref) { ok(`${e.file} · a loaded tile to compare with`, false, "none in the log"); continue; }
  const g = firstBlock(img(e)), l = firstBlock(img(ref));
  if (!g || !l) { ok(`${e.file} · a first block in both frames`, false, JSON.stringify({ ghost: g, page: l })); continue; }
  // Below 1024 the right edge is the Needle's gutter's too, so the column is held by its left edge there.
  const right = e.width < 1024 || Math.abs(g.x1 - l.x1) <= 6;
  ok(`${e.file} · first block y${g.y} vs y${l.y}, column x${g.x0}–${e.width < 1024 ? "" : g.x1} vs x${l.x0}–${e.width < 1024 ? "" : l.x1}`,
    Math.abs(g.y - l.y) <= 6 && Math.abs(g.x0 - l.x0) <= 6 && right);
}

console.log("\nV4 · E40 · the Needle at rest, clear of the /markets caption");
for (const e of tiles.filter((t) => t.scenario.startsWith("s4") && t.route === "markets-card")) {
  const p = img(e);
  const green = [];
  for (let y = 56; y < p.height; y++) for (let x = Math.floor(p.width * 0.85); x < p.width; x++) {
    const [r, g, b] = px(p, x, y);
    if (g > 120 && g > r + 60 && g > b + 15 && r < 110) green.push([x, y]);
  }
  if (!green.length) { ok(`${e.file} · no disc on screen`, e.outside ? e.outside.needle === false || e.outside.needle === null : true); continue; }
  const top = Math.min(...green.map((g) => g[1])), bottom = Math.max(...green.map((g) => g[1]));
  const left = Math.min(...green.map((g) => g[0]));
  // The caption's ink: bright pixels in the sticky bar's caption rows, left of the disc's band.
  let ct = Infinity, cb = -Infinity;
  for (let y = 90; y < 150; y++) for (let x = Math.floor(p.width * 0.5); x < Math.min(p.width, left - 1); x++) {
    const [r, g, b] = px(p, x, y);
    if (r + g + b > 330 && !(g > r + 40)) { ct = Math.min(ct, y); cb = Math.max(cb, y); }
  }
  // The disc's ink reaches ~4px past its green face (the rim, then the glow), so 8px of clearance from the face is 4 from the rim.
  const clear = !Number.isFinite(cb) || top - 4 >= cb + 8 || bottom + 4 <= ct - 8;
  ok(`${e.file} · disc face y${top}–${bottom}, caption ink y${ct}–${cb}, resting ${e.outside?.needleResting ?? "unknown"}`, clear && e.outside?.needleResting !== false);
}

console.log("\nV5 · not-found pages: the mark, no tab lit, the overlays shown, a clean console");
for (const e of tiles.filter((t) => t.scenario === "s6-notfound")) {
  const lit = e.header?.lit ?? [];
  const docErr = e.httpStatus >= 400 ? 1 : 0;
  const errs = (e.consoleErrors ?? []).length;
  const o = e.outside;
  const overlays = !e.route.startsWith("markets-") || (o?.chat === true && o?.needle === true);
  ok(`${e.file} · mark ${o?.notFoundMark}, lit ${JSON.stringify(lit)}, chat ${o?.chat}, needle ${o?.needle}, console ${errs} (the document's own: ${docErr})`,
    o?.notFoundMark === true && lit.length === 0 && overlays && errs <= docErr);
}

console.log("\nV6 · E39 · (information) the tab title during a tap");
for (const e of tiles.filter((t) => t.scenario === "s5-slow3g" && t.route.endsWith("-tap-mid"))) console.log(`  ${e.file} · title ${JSON.stringify(e.outside?.title ?? e.title)}`);

console.log(`\nr4j-verdict: ${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
