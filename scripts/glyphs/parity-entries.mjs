/**
 * PHOSPHOR-MIGRATION W2 · the classic-shell parity entries for the glyph swap, GENERATED from a measured compare
 * (docs/PHOSPHOR-MIGRATION.md §5 W2; the harness: scripts/qa-classic-shell-parity.mjs, `GLYPH_SWAP`).
 *
 *   node scripts/glyphs/parity-entries.mjs <baseline.json> <compare.current.json>   writes scripts/qa-parity-glyph-swap.generated.mjs
 *
 * For every cell the two captures share (the matrix, the Sell cells and their first paints, the book, the question page)
 * and every region field that differs, it asks whether the difference is WHOLLY the family's glyphs:
 *   · markup — outside its top-level <svg> elements the region is byte for byte the baseline's, and every <svg> that
 *     differs is a family glyph in the capture (`data-g`);
 *   · layout — every line of such a glyph's block (its own line and its descendants') may differ; every other line is the
 *     baseline's, or the same element (path) in the same computed style at another box — a box moved by a glyph beside
 *     it, since nothing else in the region changed.
 * Such a field contributes exact maps (old svg → new svg, old block → new block, old line → new line) to its list's one
 * entry for that field; a field that is not wholly its glyphs contributes nothing and is printed, so it stays a failure
 * of the compare until a person names it. Each entry's `cells` is the number of cells its maps explain, re-checked here
 * with the harness's own rule (apply the maps; the baseline must then equal the capture). ⛔ Never a wildcard: every map
 * key is a whole element, block or line of the baseline, and every value the capture's.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NL = "\n";
const [, , BASE, CUR] = process.argv;
if (!BASE || !CUR) {
  console.error("usage: node scripts/glyphs/parity-entries.mjs <baseline.json> <compare.current.json>");
  process.exit(2);
}
const OUT = new URL("../qa-parity-glyph-swap.generated.mjs", import.meta.url);
const base = JSON.parse(readFileSync(BASE, "utf8"));
const cur = JSON.parse(readFileSync(CUR, "utf8"));

/** Each top-level <svg>…</svg> of a markup, as [start, end] — the harness's own reading (svgSpans). */
function svgSpans(text) {
  const spans = [];
  let at = 0;
  for (;;) {
    const open = text.indexOf("<svg", at);
    if (open < 0) break;
    let depth = 1, i = open + 4;
    while (depth > 0) {
      const o = text.indexOf("<svg", i), c = text.indexOf("</svg>", i);
      if (c < 0) break;
      if (o >= 0 && o < c) { depth++; i = o + 4; } else { depth--; i = c + 6; }
    }
    if (depth !== 0) break;
    spans.push([open, i]);
    at = i;
  }
  return spans;
}
const splitSvg = (text) => {
  const svgs = [], rest = [];
  let at = 0;
  for (const [a, b] of svgSpans(text)) { rest.push(text.slice(at, a)); svgs.push(text.slice(a, b)); at = b; }
  rest.push(text.slice(at));
  return { svgs, rest };
};
/** The harness's applyGlyphSwap, kept in step with it (the compare re-checks every entry against the harness itself). */
function apply(kind, text, maps) {
  if (kind === "html") {
    let out = "", at = 0;
    for (const [a, b] of svgSpans(text)) { const svg = text.slice(a, b); out += text.slice(at, a) + (Object.hasOwn(maps.svg, svg) ? maps.svg[svg] : svg); at = b; }
    return out + text.slice(at);
  }
  const lines = text.split(NL), out = [];
  for (let i = 0; i < lines.length; i++) {
    const path = lines[i].slice(0, lines[i].indexOf(" "));
    const last = path.slice(path.lastIndexOf(">") + 1);
    if (/^svg[0-9]+$/.test(last)) {
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(`${path}>`)) j++;
      const block = lines.slice(i, j).join(NL);
      if (Object.hasOwn(maps.block, block)) { out.push(maps.block[block]); i = j - 1; continue; }
    }
    out.push(Object.hasOwn(maps.line, lines[i]) ? maps.line[lines[i]] : lines[i]);
  }
  return out.join(NL);
}

/** A layout's svg blocks, in document order: [the svg line's path, the block's text]; and every line by its path. */
function layoutParts(text) {
  const lines = text.split(NL), blocks = [], byPath = new Map(), inBlock = new Set();
  for (let i = 0; i < lines.length; i++) {
    const path = lines[i].slice(0, lines[i].indexOf(" "));
    byPath.set(path, lines[i]);
    const last = path.slice(path.lastIndexOf(">") + 1);
    if (/^svg[0-9]+$/.test(last) && ![...inBlock].some((p) => path.startsWith(`${p}>`))) {
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(`${path}>`)) j++;
      blocks.push([path, lines.slice(i, j).join(NL)]);
      inBlock.add(path);
    }
  }
  return { lines, blocks, byPath, inBlock };
}
const sigOf = (line) => line.slice(line.lastIndexOf(" ") + 1);
/** Two computed styles (a baseline line's and a capture line's) that are the same but for their resolved margins. */
const marginOnly = (ida, idb) => {
  const sa = base.blobs[ida], sb = cur.blobs[idb];
  if (typeof sa !== "string" || typeof sb !== "string") return false;
  const rest = (s) => s.split(NL).filter((l) => !/^margin-(?:top|right|bottom|left):/.test(l)).join(NL);
  return rest(sa) === rest(sb);
};
const geoOf = (line) => { const a = line.indexOf(" "), b = line.lastIndexOf(" "); return line.slice(a + 1, b); };

/** One region field of one cell: the maps that explain its difference wholly, or the reason it is not the glyphs alone. */
function explainHtml(was, now) {
  const a = splitSvg(was), b = splitSvg(now);
  if (a.svgs.length !== b.svgs.length) return { why: `${a.svgs.length} svg in the baseline, ${b.svgs.length} in the capture` };
  for (let i = 0; i < a.rest.length; i++) if (a.rest[i] !== b.rest[i]) return { why: "the markup outside its svgs differs" };
  const svg = {}, glyphIdx = [];
  for (let i = 0; i < a.svgs.length; i++) {
    if (a.svgs[i] === b.svgs[i]) continue;
    if (!/ data-g="[A-Za-z0-9]+[.][a-z]+"/.test(b.svgs[i].slice(0, b.svgs[i].indexOf(">") + 1))) return { why: `svg ${i} differs and is not a family glyph` };
    if (Object.hasOwn(svg, a.svgs[i]) && svg[a.svgs[i]] !== b.svgs[i]) return { why: `svg ${i}: one drawing became two` };
    svg[a.svgs[i]] = b.svgs[i];
    glyphIdx.push(i);
  }
  return { svg, glyphIdx };
}
function explainLayout(was, now, glyphIdx) {
  const a = layoutParts(was), b = layoutParts(now);
  if (a.blocks.length !== b.blocks.length) return { why: `${a.blocks.length} svg blocks in the baseline, ${b.blocks.length} in the capture` };
  const block = {}, line = {}, glyphPaths = new Set();
  for (const i of glyphIdx ?? []) {
    const [pa, ta] = a.blocks[i] ?? [], [pb, tb] = b.blocks[i] ?? [];
    if (pa !== pb) return { why: `svg block ${i} is ${pa} in the baseline and ${pb} in the capture` };
    if (ta !== tb) { if (Object.hasOwn(block, ta) && block[ta] !== tb) return { why: `block ${pa}: one became two` }; block[ta] = tb; }
    glyphPaths.add(pa);
  }
  const inGlyph = (p) => [...glyphPaths].some((g) => p === g || p.startsWith(`${g}>`));
  const restA = a.lines.filter((l) => !inGlyph(l.slice(0, l.indexOf(" ")))), restB = b.lines.filter((l) => !inGlyph(l.slice(0, l.indexOf(" "))));
  if (restA.length !== restB.length) return { why: `${restA.length} lines outside the glyphs in the baseline, ${restB.length} in the capture` };
  for (let i = 0; i < restA.length; i++) {
    if (restA[i] === restB[i]) continue;
    const pa = restA[i].slice(0, restA[i].indexOf(" ")), pb = restB[i].slice(0, restB[i].indexOf(" "));
    if (pa !== pb) return { why: `line ${i}: ${pa} in the baseline, ${pb} in the capture` };
    if (sigOf(restA[i]) !== sigOf(restB[i])) {
      // An `auto` margin that absorbs the new width of a glyph the element HOLDS is layout, not style: its computed style
      // is the baseline's but for its resolved margins (W2: the question header's ml-auto row around its Source ↗ mark).
      // An element that holds no changed glyph keeps the rule — a margin that moved for any other reason is not explained.
      const holdsGlyph = [...glyphPaths].some((g) => g.startsWith(`${pa}>`));
      if (!(holdsGlyph && marginOnly(sigOf(restA[i]), sigOf(restB[i])))) return { why: `${pa} changed its computed style` };
    }
    if (Object.hasOwn(line, restA[i]) && line[restA[i]] !== restB[i]) return { why: `${pa}: one line became two` };
    line[restA[i]] = restB[i];
  }
  return { block, line, moved: Object.keys(line).length };
}

const SECTIONS = [["matrix", "cells"], ["sell", "sell"], ["book", "book"], ["question", "question"]];
const out = { matrix: [], sell: [], book: [], question: [] };
const unexplained = [];
const regionsOf = (cell) => {
  const r = { ...(cell?.regions ?? {}) };
  if (cell?.served?.regions) for (const [k, v] of Object.entries(cell.served.regions)) r[`served:${k}`] = v;
  return r;
};
for (const [list, key] of SECTIONS) {
  const was = base[key] ?? {}, now = cur[key] ?? {};
  /** field → { kind, maps, cells: Set } */
  const entries = new Map();
  for (const k of Object.keys(now).sort()) {
    const A = was[k], B = now[k];
    if (!A || !B || A.error || B.error) continue;
    const ra = regionsOf(A), rb = regionsOf(B);
    for (const name of Object.keys(rb)) {
      if (name.startsWith("served:")) continue; // a first paint is compared through SELL_FIRST_PAINT; its glyphs are the button's own
      const x = ra[name], y = rb[name];
      if (!x || !y || x.count === 0 || y.count === 0) continue;
      const h0 = base.blobs[x.html] ?? "", h1 = cur.blobs[y.html] ?? "";
      const l0 = base.blobs[x.layout] ?? "", l1 = cur.blobs[y.layout] ?? "";
      if (h0 === h1 && l0 === l1) continue;
      const html = explainHtml(h0, h1);
      if (html.why) { unexplained.push(`${list} ${k} regions.${name}.html — ${html.why}`); continue; }
      const lay = explainLayout(l0, l1, html.glyphIdx);
      if (lay.why) { unexplained.push(`${list} ${k} regions.${name}.layout — ${lay.why}`); continue; }
      for (const [field, kind, maps] of [[`regions.${name}.html`, "html", { svg: html.svg, block: {}, line: {} }], [`regions.${name}.layout`, "layout", { svg: {}, block: lay.block, line: lay.line }]]) {
        const changed = kind === "html" ? h0 !== h1 : l0 !== l1;
        if (!changed) continue;
        const e = entries.get(field) ?? { kind, cellKeys: [] };
        e.cellKeys.push([k, kind === "html" ? [h0, h1] : [l0, l1], maps]);
        entries.set(field, e);
      }
    }
  }
  // Each entry's population, by the harness's own rule: its maps applied, the baseline must equal the capture. Every cell's
  // maps are pooled; a cell the pool cannot explain (one of its glyph boxes rounds to another half pixel than the same box
  // elsewhere, so two cells map one baseline block two ways) goes to a further entry, pooled from such cells alone. The
  // harness tries a field's entries in order, so each entry is the hit for exactly its own cells.
  const merge = (all) => { const m = { svg: {}, block: {}, line: {} }; for (const x of all) for (const part of ["svg", "block", "line"]) Object.assign(m[part], x[part]); return m; };
  for (const [field, e] of [...entries].sort((p, q) => p[0].localeCompare(q[0]))) {
    let pending = e.cellKeys, round = 0;
    while (pending.length) {
      round++;
      const maps = merge(pending.map(([, , m]) => m));
      const hit = pending.filter(([, [w, n]]) => apply(e.kind, w, maps) === n);
      if (!hit.length) { for (const [k] of pending) unexplained.push(`${list} ${k} ${field} — no pool of maps explains it (maps of other cells collide)`); break; }
      pending = pending.filter((c) => !hit.includes(c));
      const id = `glyph-swap-${list}-${field.replace(/^regions[.]/, "").replace(/[.]/g, "-")}${round > 1 ? `-${round}` : ""}`;
      const htmlId = `glyph-swap-${list}-${field.replace(/^regions[.]/, "").replace(/[.]layout$/, "-html").replace(/[.]/g, "-")}`;
      const further = round > 1 ? ` — a further population: ${hit.length} cell(s) where a box of the same glyphs rounds to another half pixel than in the first (${hit.map(([k]) => k).join(" · ")})` : "";
      out[list].push({
        id, field, cells: hit.length, glyphs: maps,
        ...(e.kind === "layout" && entries.has(field.replace(/[.]layout$/, ".html")) ? { alongside: htmlId } : {}),
        reason: (e.kind === "html"
          ? `PHOSPHOR-MIGRATION W2: every family glyph in ${field.replace(/^regions[.]|[.]html$/g, "")} is drawn by Phosphor — its <svg> becomes the sprite reference (data-g, <use href>), ${Object.keys(maps.svg).length} drawings named old → new, measured by the first compare`
          : `PHOSPHOR-MIGRATION W2: the lines those glyphs draw in ${field.replace(/^regions[.]|[.]layout$/g, "")} — each glyph's block (its <use> where its shapes were) and ${Object.keys(maps.line).length} other line(s) whose box a glyph beside it moved (or whose auto margin absorbed a glyph it holds), each in its own computed style — measured by the first compare`) + further,
      });
    }
  }
}

const header = [
  "/**",
  " * GENERATED by scripts/glyphs/parity-entries.mjs from a measured compare — do not edit by hand (PHOSPHOR-MIGRATION W2).",
  ` * Baseline ${base.base?.sha ?? "?"} · capture ${cur.base?.sha ?? "?"}. Read by scripts/qa-classic-shell-parity.mjs (GLYPH_SWAP).`,
  " */",
].join(NL);
writeFileSync(OUT, `${header}${NL}export const GLYPH_SWAP = ${JSON.stringify(out)};${NL}`, "utf8");
for (const [list, es] of Object.entries(out)) for (const e of es) console.log(`${list.padEnd(8)} ${e.id.padEnd(48)} ${String(e.cells).padStart(4)} cell(s)`);
console.log(`\n${unexplained.length} field(s) not wholly their glyphs — each stays a failure of the compare until named:`);
for (const u of unexplained.slice(0, 80)) console.log(`  ${u}`);
if (unexplained.length > 80) console.log(`  … and ${unexplained.length - 80} more`);
