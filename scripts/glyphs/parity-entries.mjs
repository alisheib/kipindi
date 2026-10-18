/**
 * PHOSPHOR-MIGRATION W2 · the classic-shell parity entries for the glyph swap, GENERATED from a measured compare
 * (docs/PHOSPHOR-MIGRATION.md §5 W2; the harness: scripts/qa-classic-shell-parity.mjs, `GLYPH_SWAP`).
 *
 *   npm run glyphs:parity-entries -- <baseline.json> <compare.current.json>   writes scripts/qa-parity-glyph-swap.generated.mjs
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
 *
 * ⭐ W3 · `--measured <region,…> --wave <label>`: the regions a wave changes on purpose beyond its glyphs (W3: the
 * classic `header` and `rail`, whose destinations take the pill, the 24px glyphs and NavGlyph's wrapper). A differing
 * field of a named region that is not wholly its glyphs is named instead by MEASURED HUNKS: the baseline's text and the
 * capture's are diffed (lines for a layout, tags and text for markup), and every differing run becomes one exact literal
 * pair — the baseline's run, anchored on the unchanged line or token before it so that no pair is ever empty — for the
 * harness's `replace` (each pair applied in turn by split/join; the baseline must then equal the capture). A region not
 * named, and every other field, keeps the W2 rule: wholly its glyphs, or a failure until a person names it.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NL = "\n";
const ARGS = process.argv.slice(2);
const flag = (name) => { const i = ARGS.indexOf(name); return i >= 0 ? ARGS.splice(i, 2)[1] : undefined; };
const MEASURED = new Set((flag("--measured") ?? "").split(",").filter(Boolean));
const WAVE = flag("--wave") ?? "W2";
const OUT_ARG = flag("--out"); // a trial run writes elsewhere; the committed file is the default
const [BASE, CUR] = ARGS;
if (!BASE || !CUR) {
  console.error("usage: node scripts/glyphs/parity-entries.mjs <baseline.json> <compare.current.json> [--measured header,rail --wave W3]");
  process.exit(2);
}
const OUT = OUT_ARG ?? new URL("../qa-parity-glyph-swap.generated.mjs", import.meta.url);
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

/**
 * W3 · MEASURED HUNKS. A field's text as tokens — a layout's lines, a markup's tags and the text between them — so a pair
 * is always whole lines or whole tags.
 */
const tokensOf = (kind, text) => (kind === "layout" ? text.split(NL) : text.split(/(<[^>]*>)/).filter((t) => t !== ""));
const JOIN = { layout: NL, html: "" };
const count = (text, part) => { let n = 0, at = text.indexOf(part); while (at >= 0) { n++; at = text.indexOf(part, at + 1); } return n; };
/**
 * The exact literal pairs that turn `was` into `now`, or why there are none. The runs that differ are found by a longest
 * common subsequence of the tokens (the common head and tail trimmed first). Each run is widened by the unchanged tokens
 * around it — one before it at first, then more — until its baseline text occurs exactly once in the baseline, so a pair
 * never touches anything but its own place; runs whose windows meet become one pair. Applied in turn by split/join, as
 * the harness applies `replace`, the pairs must turn the baseline into the capture: the caller checks.
 */
function measuredPairs(kind, was, now) {
  const a = tokensOf(kind, was), b = tokensOf(kind, now), J = JOIN[kind];
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s), n = A.length, m = B.length;
  if (n * m > 25e6) return { why: `${n}×${m} tokens differ — too large to measure` };
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  // Runs: the baseline's tokens a[a0..a1) became the capture's b[b0..b1). Between two runs every token is common to both
  // sides, in order, so a window made of whole runs and the common tokens around them reads the same context on both.
  const runs = [];
  for (let i = 0, j = 0, cur = null; i < n || j < m;) {
    if (i < n && j < m && A[i] === B[j]) { if (cur) { runs.push(cur); cur = null; } i++; j++; continue; }
    cur ??= { a0: p + i, a1: p + i, b0: p + j, b1: p + j };
    if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { j++; cur.b1 = p + j; } else { i++; cur.a1 = p + i; }
    if (i >= n && j >= m) runs.push(cur);
  }
  // A window: runs r0..r1 with `before` common tokens ahead of r0 and `after` behind r1. It widens — first ahead, then
  // behind — until its baseline text occurs once; reaching the window before it, it joins it; reaching the next run, it
  // takes it in.
  const windows = [];
  for (let k = 0; k < runs.length;) {
    let r0 = k, r1 = k, before = 1, after = 0;
    for (;;) {
      const prev = windows[windows.length - 1];
      const A0 = Math.max(0, runs[r0].a0 - before);
      if (prev && A0 < prev.A1) { windows.pop(); r0 = prev.r0; before = prev.before; continue; }
      if (r1 + 1 < runs.length && runs[r1].a1 + after > runs[r1 + 1].a0) { r1++; after = 0; continue; }
      const A1 = Math.min(a.length, runs[r1].a1 + after);
      const from = a.slice(A0, A1).join(J);
      if (from !== "" && count(was, from) === 1) {
        windows.push({ r0, r1, before, A0, A1, B0: runs[r0].b0 - (runs[r0].a0 - A0), B1: runs[r1].b1 + (A1 - runs[r1].a1) });
        break;
      }
      if (A0 > 0) before++;
      else if (A1 < a.length) after++;
      else return { why: "a run cannot be told apart from the rest of the text" };
    }
    k = r1 + 1;
  }
  return { pairs: windows.map((w) => [a.slice(w.A0, w.A1).join(J), b.slice(w.B0, w.B1).join(J)]) };
}
const applyReplace = (text, pairs) => pairs.reduce((t, [x, y]) => t.split(x).join(y), text);
/** What a wave changed in each measured region, for the entries' reasons. */
const REASONS = {
  rail: {
    html: "the classic rail's destinations draw through NavGlyph (R-INDICATOR 3B, R-RAIL 4B): each glyph inside GlyphSwap's span at 24px, the current destination's in Fill",
    layout: "the classic rail's boxes and styles: 56×32 pips around 24px glyphs, the labels 3px lower, the centre coin's pull re-derived so it keeps its 14px rise and its label meets the others, and the current pip on the opaque --nav-pill with its lit edge",
  },
  header: {
    html: "the classic header's markup around its destinations",
    layout: "the classic header's desktop links: the current one on the opaque --nav-pill with its lit edge (R-INDICATOR 3B), and every link's transition naming its box-shadow",
  },
};

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
      if (MEASURED.has(name)) {
        // W3 · a region the wave changes on purpose: each differing field named by its measured pairs (above).
        for (const [field, kind, w, n] of [[`regions.${name}.html`, "html", h0, h1], [`regions.${name}.layout`, "layout", l0, l1]]) {
          if (w === n) continue;
          const mp = measuredPairs(kind, w, n);
          if (mp.why) { unexplained.push(`${list} ${k} ${field} — ${mp.why}`); continue; }
          if (applyReplace(w, mp.pairs) !== n) { unexplained.push(`${list} ${k} ${field} — its measured pairs do not reproduce the capture`); continue; }
          const e = entries.get(field) ?? { kind: `measured-${kind}`, cellKeys: [] };
          e.cellKeys.push([k, [w, n], mp.pairs]);
          entries.set(field, e);
        }
        continue;
      }
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
  // W3 · measured pairs pool by their baseline run: the first cell's answer for a run stands, and a cell that drew that
  // run another way is not explained by the pool, so it goes to a further population.
  const mergePairs = (all) => { const seen = new Map(); for (const ps of all) for (const [x, y] of ps) if (!seen.has(x)) seen.set(x, y); return [...seen]; };
  for (const [field, e] of [...entries].sort((p, q) => p[0].localeCompare(q[0]))) {
    let pending = e.cellKeys, round = 0;
    if (e.kind.startsWith("measured-")) {
      const region = field.replace(/^regions[.]|[.](html|layout)$/g, ""), kind = e.kind.slice("measured-".length);
      while (pending.length) {
        round++;
        const pairs = mergePairs(pending.map(([, , ps]) => ps));
        const hit = pending.filter(([, [w, n]]) => applyReplace(w, pairs) === n);
        if (!hit.length) { for (const [k] of pending) unexplained.push(`${list} ${k} ${field} — no pool of measured pairs explains it`); break; }
        pending = pending.filter((c) => !hit.includes(c));
        // Only the pairs this population uses: a pair no hit cell's baseline holds is left out (it explains nothing here).
        // ⚠️ Re-checked as written (W3's review): pairs apply in turn, so a pair whose run only appears once an earlier
        // pair has run would be dropped by that filter; then the whole pool is written instead.
        const kept = pairs.filter(([x]) => hit.some(([, [w]]) => w.includes(x)));
        const used = hit.every(([, [w, n]]) => applyReplace(w, kept) === n) ? kept : pairs;
        const id = `${WAVE.toLowerCase()}-${list}-${region}-${kind}${round > 1 ? `-${round}` : ""}`;
        out[list].push({
          id, field, cells: hit.length, replace: used,
          ...(kind === "layout" && entries.has(`regions.${region}.html`) ? { alongside: `${WAVE.toLowerCase()}-${list}-${region}-html` } : {}),
          reason: `PHOSPHOR-MIGRATION ${WAVE}: ${REASONS[region]?.[kind] ?? `the ${region} region's ${kind}`} — ${used.length} measured pair(s), each a run of the baseline (widened by its unchanged neighbours until it occurs once) and what the first compare drew in its place${round > 1 ? ` — a further population of ${hit.length} cell(s) (${hit.map(([k]) => k).join(" · ")})` : ""}`,
        });
      }
      continue;
    }
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
  ` * GENERATED by scripts/glyphs/parity-entries.mjs from a measured compare — do not edit by hand (PHOSPHOR-MIGRATION ${WAVE}${MEASURED.size ? `; measured regions: ${[...MEASURED].join(", ")}` : ""}).`,
  ` * Baseline ${base.base?.sha ?? "?"} · capture ${cur.base?.sha ?? "?"}. Read by scripts/qa-classic-shell-parity.mjs (GLYPH_SWAP).`,
  " */",
].join(NL);
writeFileSync(OUT, `${header}${NL}export const GLYPH_SWAP = ${JSON.stringify(out)};${NL}`, "utf8");
for (const [list, es] of Object.entries(out)) for (const e of es) console.log(`${list.padEnd(8)} ${e.id.padEnd(48)} ${String(e.cells).padStart(4)} cell(s)`);
console.log(`\n${unexplained.length} field(s) not wholly their glyphs — each stays a failure of the compare until named:`);
for (const u of unexplained.slice(0, 80)) console.log(`  ${u}`);
if (unexplained.length > 80) console.log(`  … and ${unexplained.length - 80} more`);
