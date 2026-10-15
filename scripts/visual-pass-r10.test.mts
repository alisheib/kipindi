/**
 * ROUND 10 OF THE VISUAL PASS (2026-10-11) — the S6 close-out's last round: round 9's two rules (R9-A's edge and stroke
 * rule, `9f369528`; R9-B's possessive hold, `c4f65f6e`) carried to every place they did not reach. Round 9's read (336
 * tiles of 9a740922 — S/r9q4/read/triage.md, readers 4 and 5; docs S6-READ-TRIAGE.md), every finding re-measured on its
 * tile first (the numbers below are those measurements), every sibling found and brought to one convention.
 *
 *   npx tsx scripts/visual-pass-r10.test.mts        (npm run test:visual-pass-r10)
 *
 *   §1 A1 · the filter field's sliders and caret on its edges (tile 163), both shapes, the compact bar's lone glyph, ghosts
 *   §2 A2 · /help's FAQ caret on the row's edge, turning about its own box (tile 192)
 *   §3 A3 · the census R9-A's regex never ran: every chevronDown / chevronUp / arrowUp / arrowDown / arrowLeft, the
 *          hand-drawn field carets, the dynamic arrows, and every arrow character typed on a player surface — classified
 *   §4 A4 · Stat's icon slot pulls its glyph onto the column's edge (tiles 162 187 188) — every call site and its ghosts
 *   §5 A5 · a heading or a title that leads with a glyph puts its ink on its column's edge (tile 162) — the census
 *   §6 A6 · one weight for every arrow among words (tiles 174 198); a centred control frames its ink (tiles 132–137): the
 *          slots, the spinners, the ghosts, every hand-built control, the journey pill's padding, the tags and why
 *   §7 A7 · the search box's two insets (tiles 172 194)
 *   §8 A8 · "Fungua soko →" — the dictionary's arrow is a third weight (S12)
 *   §9 R10-B · banner and notice bodies hold their phrases (tile 185): the helper, the census, every routed body laid out
 *   §10 R10-D · a scrolling strip never ends on a gap (tiles 171 204)
 *   §11 the words: no dictionary string changed
 * The owner's rules (Ali): only perfect visual and logical results; consistency — a finding is fixed with every sibling it
 * has. Each check stands beside a control or a planted defect.
 * ⛔ It reads, renders and computes in memory; it writes nothing. The on-disk mutation proof is S/r10/mutation/ (S = the
 * session scratchpad).
 * ⚠️ This file holds no backslash: every pattern that needs a space, a newline or a special character is built from
 * character codes and bracket classes (the editing tools turn some escapes into control characters).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
const CR = String.fromCharCode(13), NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
const BS = String.fromCharCode(92);
/** Any run of blanks, written without an escape. */
const WS = `[ ${TAB}${NL}]`;
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`${NL}── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => { const s = readFileSync(p, "utf8").split(CR).join(""); return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; };
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(new RegExp(`${WS}+`, "g"), " ").trim();
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.split(BS).join("/")] : [];
});
/** Player surfaces: everything but the console, the API, the server and the marketing engine (R6-C's population). */
const OUT = new RegExp("^src/(?:app/admin|components/admin|app/api|lib/server|lib/marketing)/");
const PLAYER_TSX = walk("src", new RegExp("[.]tsx$")).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));
/** A stylesheet rule's body by its exact selector (the first one), or "". */
const rule = (sel: string) => {
  const at = CSS.indexOf(`${sel} {`);
  return at < 0 ? "" : CSS.slice(at + sel.length + 2, CSS.indexOf("}", at));
};

/* ── the world the components render in ────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const render = (el: unknown) => renderToStaticMarkup(el as import("react").ReactElement);
type GlyphFn = (p: Record<string, unknown>) => import("react").ReactElement;
const G = req("../src/components/ui/glyphs.tsx") as {
  I: Record<string, GlyphFn>;
  GLYPH_STEM: Record<string, number>;
  edgeGlyph: (n: unknown, e: "start" | "end") => unknown;
  glyphInkGaps: (n: unknown) => { start: number; end: number } | null;
  hasWords: (c: unknown) => boolean;
};
const { I, GLYPH_STEM } = G;
const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { advanceWidth: number; bbox: { minX: number; maxX: number }; path: { commands: Array<{ command: string; args: number[] }> } } } };
const FONT = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);

/* ══ AN INDEPENDENT READING OF A DRAWING — R9-A's own reader (sampled curves and arcs), never the engine's ══════════════ */
type Pt = [number, number];
type Sub = { verts: Pt[]; samples: Pt[] };
const NUM = new RegExp("[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?", "y");
function parsePath(d: string): Sub[] {
  const subs: Sub[] = [];
  let i = 0, cmd = "", last = "", x = 0, y = 0, sx = 0, sy = 0, kx = 0, ky = 0;
  let cur: Sub = { verts: [], samples: [] };
  const sep = (c: number) => c === 32 || c === 44 || c === 9 || c === 10 || c === 13;
  const skip = () => { while (i < d.length && sep(d.charCodeAt(i))) i++; };
  const num = () => { skip(); NUM.lastIndex = i; const m = NUM.exec(d); if (!m) throw new Error(`no number at ${i}: ${d}`); i = NUM.lastIndex; return Number(m[0]); };
  const flag = () => { skip(); return d[i++] === "1"; };
  const to = (px: number, py: number) => { cur.verts.push([px, py]); cur.samples.push([px, py]); };
  const sample = (fx: (t: number) => number, fy: (t: number) => number) => { for (let k = 1; k < 400; k++) cur.samples.push([fx(k / 400), fy(k / 400)]); };
  const cub = (a: number, b: number, c: number, e: number) => (t: number) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * e; };
  const qua = (a: number, b: number, e: number) => (t: number) => { const u = 1 - t; return u * u * a + 2 * u * t * b + t * t * e; };
  for (;;) {
    skip();
    if (i >= d.length) break;
    const ch = d[i];
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) { cmd = ch; i++; }
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd >= "a" && cmd <= "z", up = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (up === "Z") { x = sx; y = sy; }
    else if (up === "M") { x = ox + num(); y = oy + num(); sx = x; sy = y; cur = { verts: [[x, y]], samples: [[x, y]] }; subs.push(cur); }
    else if (up === "L") { x = ox + num(); y = oy + num(); to(x, y); }
    else if (up === "H") { x = ox + num(); to(x, y); }
    else if (up === "V") { y = oy + num(); to(x, y); }
    else if (up === "C" || up === "S") {
      const reflect = up === "S" && (last === "C" || last === "S");
      const x1 = up === "C" ? ox + num() : reflect ? 2 * x - kx : x, y1 = up === "C" ? oy + num() : reflect ? 2 * y - ky : y;
      const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
      sample(cub(x, x1, x2, ex), cub(y, y1, y2, ey)); to(ex, ey); kx = x2; ky = y2; x = ex; y = ey;
    } else if (up === "Q" || up === "T") {
      const reflect = up === "T" && (last === "Q" || last === "T");
      const x1 = up === "Q" ? ox + num() : reflect ? 2 * x - kx : x, y1 = up === "Q" ? oy + num() : reflect ? 2 * y - ky : y;
      const ex = ox + num(), ey = oy + num();
      sample(qua(x, x1, ex), qua(y, y1, ey)); to(ex, ey); kx = x1; ky = y1; x = ex; y = ey;
    } else if (up === "A") {
      let rx = Math.abs(num()), ry = Math.abs(num());
      const deg = num(), large = flag(), sweep = flag(), ex = ox + num(), ey = oy + num();
      if (rx && ry && !(x === ex && y === ey)) {
        const ph = (deg * Math.PI) / 180, cp = Math.cos(ph), sp = Math.sin(ph);
        const dx = (x - ex) / 2, dy = (y - ey) / 2, xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
        const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
        if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const den = rx * rx * yp * yp + ry * ry * xp * xp;
        let co = den ? Math.sqrt(Math.max(0, (rx * rx * ry * ry - den) / den)) : 0;
        if (large === sweep) co = -co;
        const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx;
        const cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
        const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
        let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
        if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
        for (let k = 1; k < 2000; k++) {
          const th = t1 + (dt * k) / 2000;
          cur.samples.push([cx + rx * Math.cos(th) * cp - ry * Math.sin(th) * sp, cy + rx * Math.cos(th) * sp + ry * Math.sin(th) * cp]);
        }
      }
      to(ex, ey); x = ex; y = ey;
    } else throw new Error(`command ${cmd} in ${d}`);
    last = up;
  }
  return subs;
}
type Part = { x0: number; x1: number; w: number; own: boolean };
const attrs = (s: string) => Object.fromEntries([...s.matchAll(new RegExp('([A-Za-z][A-Za-z0-9-]*)="([^"]*)"', "g"))].map((m) => [m[1], m[2]]));
const ELEM = new RegExp("<(path|circle|rect|line|ellipse)([^>]*?)/?>", "g");
function partsOfMarkup(body: string, base = 1.9): Part[] {
  return [...body.matchAll(ELEM)].map((m) => {
    const a = attrs(m[2]);
    const n = (k: string) => Number(a[k] ?? 0);
    let xs: number[] = [];
    if (m[1] === "path") xs = parsePath(a.d).flatMap((s) => s.samples.map((p) => p[0]));
    else if (m[1] === "circle") xs = [n("cx") - n("r"), n("cx") + n("r")];
    else if (m[1] === "ellipse") xs = [n("cx") - n("rx"), n("cx") + n("rx")];
    else if (m[1] === "rect") xs = [n("x"), n("x") + n("width")];
    else xs = [n("x1"), n("x2")];
    const stroked = a.stroke !== "none";
    return { x0: Math.min(...xs), x1: Math.max(...xs), w: stroked ? Number(a.strokeWidth ?? base) : 0, own: a.strokeWidth != null || !stroked };
  });
}
const GLYPH_SRC = raw("src/components/ui/glyphs.tsx");
const ENTRY = new RegExp("^[ ]*([A-Za-z0-9_]+): [(]p: GlyphProps[)] => <(G|GL) [{][.][.][.]p[}]>(.*)</(?:G|GL)>,[ ]*$", "gm");
const FAMILY = new Map([...GLYPH_SRC.matchAll(ENTRY)].map((m) => [m[1], { grid: m[2] === "G" ? 24 : 64, body: m[3] }]));
const partsOf = (name: string) => partsOfMarkup(FAMILY.get(name)?.body ?? "");
/** This file's own reading: the gap between a glyph's box and its ink, each side, in px at size `s` (the family's stroke). */
const gapOf = (name: string, s: number) => {
  const ps = partsOf(name);
  const x0 = Math.min(...ps.map((q) => q.x0 - q.w / 2)), x1 = Math.max(...ps.map((q) => q.x1 + q.w / 2));
  return { start: (x0 * s) / 24, end: ((24 - x1) * s) / 24 };
};
/** A text mark's reach (its geometry, the words' stroke beyond it in em): the px part of its pull. */
const runReach = (name: string, side: "start" | "end") => {
  const ps = partsOf(name).filter((q) => !q.own);
  return side === "start" ? Math.min(...ps.map((q) => q.x0)) : 24 - Math.max(...ps.map((q) => q.x1));
};
type Margin = { side: "start" | "end"; px: number; em: number } | null;
const marginOf = (markup: string, side?: "start" | "end"): Margin => {
  const re = new RegExp(`margin-inline-(${side ?? "start|end"}):(?:calc[(](-?[0-9.]+)px [+] ([0-9.]+)em[)]|(-?[0-9.]+)px)`);
  const m = re.exec(markup);
  return m ? { side: m[1] as "start" | "end", px: Number(m[2] ?? m[4]), em: Number(m[3] ?? 0) } : null;
};
/** The pull `edge` should give a glyph, by this file's reading (no `text`): minus its gap. */
const wantPull = (name: string, s: number, side: "start" | "end") => -gapOf(name, s)[side];

/* ══ §1 · A1 · THE FILTER FIELD ═════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · A1 the filter field's sliders and caret stand on its edges (tile 163) — in both shapes, and the ghosts with them");
{
  const FS = "src/components/markets/filter-sheet.tsx";
  const sliders = gapOf("sliders", 15), caret = gapOf("chevronDown", 14);
  // Tile 163 (sw 390): the field's content column x33..357 (16 gutter + 1 border + 16 padding); measured sliders ink x34.74,
  // caret ink end x353.99 — the drawings' own gaps plus 0.15 / 0.06 of anti-aliasing.
  ok(`1.1 · tile 163 re-read: the sliders' ink stood ${sliders.start.toFixed(3)}px in by its drawing (measured 1.74: x34.74 on x33), the caret's ${caret.end.toFixed(3)}px short (measured 3.01: x353.99 on 357)`,
    near(sliders.start, 1.594, 1e-3) && near(caret.end, 2.946, 1e-3) && Math.abs(33 + sliders.start - 34.74) < 0.2 && Math.abs(357 - caret.end - 353.99) < 0.1);
  ok('1.2 · the trigger pulls both by their own gaps, in both shapes: <I.sliders s={15} edge="start" …kp-fsheet-glyph…> and <I.chevronDown s={14} edge="end" …kp-fsheet-caret…>',
    has(FS, '<I.sliders s={15} edge="start" aria-hidden className="kp-fsheet-glyph shrink-0 opacity-80" />') && has(FS, '<I.chevronDown s={14} edge="end" aria-hidden className="kp-fsheet-caret shrink-0 opacity-70" />'));
  const sm = render(h(I.sliders, { s: 15, edge: "start" })), cm = render(h(I.chevronDown, { s: 14, edge: "end" }));
  ok(`1.3 · the engine's pulls are this file's reading of the drawings: sliders ${marginOf(sm)?.px}px, caret ${marginOf(cm)?.px}px — after, ink at x33.00 and x357.00 at sw 390`,
    near(marginOf(sm)?.px ?? 0, wantPull("sliders", 15, "start"), 0.0015) && near(marginOf(cm)?.px ?? 0, wantPull("chevronDown", 14, "end"), 0.0015) && marginOf(sm)?.side === "start" && marginOf(cm)?.side === "end");
  ok("1.3′ PLANT · the trigger as round 9 drew it (no edge) carries no pull, and the field reads 1.59 / 2.95px in again",
    marginOf(render(h(I.sliders, { s: 15 }))) === null && !has(FS, '<I.sliders s={15} aria-hidden className="shrink-0 opacity-80" />'));
  // The caret turns 180° about its own box when open; its drawing is symmetric about the box's centre, so turned it still
  // ends on the edge. The rotation rule is on the caret itself (`.kp-fsheet-caret`), never a wrapper.
  const cb = partsOf("chevronDown");
  ok("1.4 · the caret turns about its own box and its drawing is symmetric about it (x6–18 of 24), so open it ends on the same edge",
    near(Math.min(...cb.map((q) => q.x0)) + Math.max(...cb.map((q) => q.x1)), 24, 1e-9) && CSS.includes(".kp-fsheet[open] > summary .kp-fsheet-caret { transform: rotate(180deg); }"));
  // /markets' compact phone bar folds the label and the caret away: with no count the sliders stands ALONE in the pill.
  const cancel = 'html:not([data-density="comfortable"]) .kp-discovery-bar:has(> [data-bar-row]) .kp-fsheet-trigger:not([data-on]) > .kp-fsheet-glyph { margin-inline-start: 0 !important; }';
  ok("1.5 · alone in /markets' compact pill (label and caret folded, no count) the sliders keeps its box — its pull undone by the compact rule; with a count it leads [sliders][count] and keeps it",
    CSS.includes(cancel) && CSS.includes(".kp-discovery-bar:has(> [data-bar-row]) .kp-fsheet-caret { display: none; }") && code(FS).includes("data-on={count > 0 || undefined}")
      && code(FS).includes("{count > 0 && ("));
  const sliderInk = { l: 2.55, r: 24 - 21.45 };
  ok(`1.5′ CONTROL · the sliders' drawing is centred in its box (ink x2.55–21.45), so alone and unpulled it centres in the pill — pulled, it would stand ${(sliders.start / 2).toFixed(2)}px left`,
    near(sliderInk.l, sliderInk.r, 1e-9) && near(gapOf("sliders", 15).start, gapOf("sliders", 15).end, 1e-9));
  const QBG = "src/components/ui/query-bar-ghost.tsx";
  ok("1.6 · the ghosts draw the page's own glyphs unpainted and pulled as the page's are: FiltersGhost's sliders and caret, SortGhost's and MenuGhost's carets — no bare box stands in for a pulled glyph",
    has(QBG, '<I.sliders s={15} edge="start" aria-hidden className="kp-fsheet-glyph shrink-0" />') && has(QBG, '<I.chevronDown s={14} edge="end" aria-hidden className="kp-fsheet-caret shrink-0" />')
      && (squash(code(QBG)).split('<I.chevronDown s={14} edge="end" aria-hidden className="shrink-0" />').length - 1) === 2
      && !/h-[[]1[45]px[]] w-[[]1[45]px[]] shrink-0" [/]>/.test(code(QBG).replace(/w-[[]13[.]2px[]]/g, "")));
}

/* ══ §2 · A2 · /help's FAQ CARET ════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · A2 /help's FAQ caret stands on the row's edge and turns about its own box (tile 192)");
{
  const HELP = "src/app/help/page.tsx";
  const g = gapOf("chevronDown", 13);
  ok(`2.1 · tile 192 re-read: every "⌄" ended at x1112.10 against the row's edge 1115.0 — its drawing's ${g.end.toFixed(3)}px gap (2.90 measured) — and ends ON the edge now`,
    near(g.end, 2.735, 1e-3) && Math.abs(1115 - g.end - 1112.1) < 0.2 && has(HELP, '<I.chevronDown s={13} edge="end" className="transition-transform group-open:rotate-180" />'));
  ok("2.2 · the turn moved onto the glyph: its span no longer rotates (pulled, the svg overhangs the span, whose centre is then not the drawing's)",
    has(HELP, '<span className="mt-1 shrink-0 text-text-subtle">') && !has(HELP, 'transition-transform group-open:rotate-180">'));
  // The plant: the turn on the span, the glyph pulled. The span is s − gap wide and turns about ITS centre.
  const w = 13 - g.end, inkL = 13 * 6 / 24 - (13 * 1.9 / 24) / 2, inkR = w;
  const turnedL = w - inkR, turnedR = w - inkL;
  ok(`2.2′ PLANT · turned on a span ${w.toFixed(3)}px wide, the open caret's ink would stand ${(inkR - turnedR).toFixed(3)}px left of the edge — the reason the turn is the glyph's`,
    near(inkR - turnedR, g.end, 1e-9) && turnedL >= -1e-9);
  ok("2.3 · the FAQ's leading glyphs stay a centred icon column (a column of row glyphs keeps its box — R9-A)", has(HELP, '<span className="mt-0.5 shrink-0 text-brand-300"><Glyph s={15} /></span>'));
}

/* ══ §3 · A3 · THE CENSUS R9-A NEVER RAN ═════════════════════════════════════════════════════════════════════════════════ */
section("3 · A3 every chevronDown / chevronUp / arrowUp / arrowDown / arrowLeft, the hand-drawn carets and every typed arrow, classified");
{
  /** Kinds: `edge` a run's or a control's end in the family's stroke · `text` an edge and its words' stroke · `slot` the
   *  slot pulls it at render (its source plain) · `tag-text` a tag's arrow among words: its words' stroke, the tag keeps its
   *  box · `ghost` unpainted, pulled as its page's · `alone` alone in a control or a plate · `frozen` classic chrome ·
   *  `journey` pulled in the journey only (shared with frozen classic chrome). */
  type Kind = "edge" | "text" | "slot" | "tag-text" | "ghost" | "alone" | "frozen" | "journey";
  const SITES: Array<[string, string, number, Kind, string]> = [
    ["src/app/auth/2fa/page.tsx", '<I.arrowLeft s={12} edge="start" text="mono-400" className="mt-0.5" />', 1, "text", "the back link's start — it typed ← (the mono face's arrow, a weight under its words); on its first line (3.6)"],
    ["src/app/auth/otp/page.tsx", '<I.arrowLeft s={12} edge="start" text="mono-400" className="mt-0.5" />', 1, "text", "the change-number link's start — it typed ←; on its first line where its words wrap (3.6)"],
    ["src/app/help/page.tsx", '<I.chevronDown s={13} edge="end" className="transition-transform group-open:rotate-180" />', 1, "edge", "each FAQ row's end (§2)"],
    ["src/app/profile/activity/page.tsx", "<I.arrowDown s={14} />", 1, "slot", "a Stat tile's pictogram: the slot pulls it (§4); a deposit pictogram keeps the family's stroke"],
    ["src/app/profile/activity/page.tsx", "<I.arrowUp s={14} />", 1, "slot", "a Stat tile's pictogram: the slot pulls it (§4)"],
    ["src/app/profile/kyc/page.tsx", '<I.arrowLeft s={12} edge="start" text="mono-400" />', 1, "text", "the footer's back link's start — it typed ←"],
    ["src/app/wallet/wallet-client.tsx", '<I.arrowDown s={14} edge="start" text="body-600" />', 1, "text", "“↓ Weka pesa”: an arrow among words leading a centred control (§6)"],
    ["src/app/wallet/wallet-client.tsx", '<I.arrowUp s={14} edge="start" text="body-600" />', 1, "text", "“↑ Toa pesa”"],
    ["src/app/wallet/wallet-client.tsx", "<I.arrowDown s={16} />", 1, "alone", "a history row's credit arrow, alone in its 34px plate"],
    ["src/app/wallet/wallet-client.tsx", "<I.arrowUp s={16} />", 1, "alone", "a history row's debit arrow, alone in its 34px plate"],
    ["src/components/charts/chart-toggle.tsx", '<I.chevronDown s={14} edge="end" className={[ "text-text-muted shrink-0 transition-transform duration-200", open ? "rotate-180" : "", ].join(" ")} />', 1, "edge", "the chart toggle's row end; it turns about its own box"],
    ["src/components/charts/updown-match-track.tsx", "<I.arrowDown s={12} />", 1, "alone", "the track's gutter marks, each alone on its lane"],
    ["src/components/charts/updown-match-track.tsx", "<I.arrowUp s={12} />", 1, "alone", "the track's gutter marks, each alone on its lane"],
    ["src/components/home/updown-band.tsx", '<I.arrowDown s={16} edge="start" text="body-600" />', 1, "text", "the home band's DOWN pick"],
    ["src/components/home/updown-band.tsx", '<I.arrowUp s={16} edge="start" text="body-600" />', 1, "text", "the home band's UP pick"],
    ["src/components/layout/nav-more.tsx", '<I.chevronDown s={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />', 1, "frozen", "the classic More menu's caret (classic chrome, frozen until the flip) — named for the integrator"],
    ["src/components/layout/wallet-balance-pill.tsx", "<I.chevronDown s={12} />", 1, "frozen", "the classic capsule's caret, typed -ml-1 (r7c §6.2 holds the classic capsule byte for byte) — named for the integrator"],
    ["src/components/markets/filter-sheet.tsx", '<I.chevronDown s={14} edge="end" aria-hidden className="kp-fsheet-caret shrink-0 opacity-70" />', 1, "edge", "the filter trigger's end (§1)"],
    ["src/components/markets/menu-shell.tsx", '<I.chevronDown s={14} edge="end" aria-hidden className="kp-menu-caret shrink-0 opacity-70" />', 1, "edge", "the sort/topic menu's end: a centred control (§6)"],
    ["src/components/journey/show-more.tsx", '<I.chevronDown s={18} edge="end" />', 1, "edge", "the journey's one “Onyesha zaidi” (the home's and journey /live's; the Vodacom plan S7, WP7 and WP10's review): the canvas's caret, ending a centred kit control (§6.6), more below"],
    ["src/components/proposals/vote-control.tsx", "<I.chevronDown s={18} />", 1, "alone", "alone in its 36×34 vote button"],
    ["src/components/proposals/vote-control.tsx", "<I.chevronUp s={18} />", 1, "alone", "alone in its 36×34 vote button"],
    ["src/components/ui/language-menu.tsx", '<I.chevronDown s={12} edge={journey ? "end" : undefined} aria-hidden className="kp-menu-caret hidden opacity-70 sm:inline" />', 1, "journey", "the language menu's end: the journey's header pulls it, the frozen classic header keeps its box"],
    ["src/components/ui/query-bar-ghost.tsx", '<I.chevronDown s={14} edge="end" aria-hidden className="kp-fsheet-caret shrink-0" />', 1, "ghost", "FiltersGhost's caret"],
    ["src/components/ui/query-bar-ghost.tsx", '<I.chevronDown s={14} edge="end" aria-hidden className="shrink-0" />', 2, "ghost", "SortGhost's and MenuGhost's carets"],
    ["src/components/updown/round-stake-panel.tsx", '<I.arrowDown s={12} text="body-700" />', 2, "tag-text", "the stake panel chip's side arrow, among its Inter 700 word: the words' stroke (it was a typed 2.5); a chip is a tag and keeps its box"],
    ["src/components/updown/round-stake-panel.tsx", '<I.arrowUp s={12} text="body-700" />', 2, "tag-text", "the stake panel chip's side arrow"],
  ];
  const MARK = new RegExp("<I[.](?:chevronDown|chevronUp|arrowUp|arrowDown|arrowLeft|chevronsUp|chevronsDown)(?![A-Za-z])(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?/>", "g");
  const seen = new Map<string, number>();
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(MARK)) { const k = `${f} ${squash(m[0])}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  const listed = new Map(SITES.map(([f, el, n]) => [`${f} ${el}`, n]));
  const unlisted = [...seen].filter(([k]) => !listed.has(k)), missing = [...listed].filter(([k, n]) => seen.get(k) !== n);
  ok(`3.1 · every chevronDown / chevronUp / arrowUp / arrowDown / arrowLeft on a player surface is classified — ${[...seen.values()].reduce((a, b) => a + b, 0)} marks at ${seen.size} spellings`,
    unlisted.length === 0 && missing.length === 0, j({ unlisted, missing }));
  const WANT: Record<Kind, [boolean, boolean]> = { edge: [true, false], text: [true, true], slot: [false, false], "tag-text": [false, true], ghost: [true, false], alone: [false, false], frozen: [false, false], journey: [true, false] };
  const wrong = SITES.filter(([, el, , kind]) => el.includes(" edge=") !== WANT[kind][0] || el.includes(" text=") !== WANT[kind][1]);
  ok("3.2 · each carries what its kind says — an end mark its edge, an arrow among words its words' stroke, a tag's arrow the stroke alone, an alone or frozen mark neither", wrong.length === 0, j(wrong));
  const planted = new Map(seen); planted.set('src/app/help/page.tsx <I.chevronDown s={13} />', 1);
  ok("3.1′ PLANT · the FAQ caret as round 9 drew it is an unclassified site", [...planted].some(([k]) => !listed.has(k)));
  // The marks named by a variable: the Up & Down verdict's arrow (CSS-pulled in em, §6.4) and the notifications' plates.
  ok("3.3 · the arrows named through a variable are classified too: the Up & Down verdict's (`Arrow`, words' stroke, its pull in em — §6) and the notification plates' (`notification-appearance.ts`, alone in their plates)",
    has("src/components/home/updown-match-words.tsx", '<Arrow key="a" s={16} text="display-700" className="kp-udbug__arrow" />')
      && code("src/lib/notification-appearance.ts").includes('case "DEPOSIT":      return I.arrowDown;') && code("src/lib/notification-appearance.ts").includes('case "WITHDRAW":     return I.arrowUp;'));
  // The two hand-drawn carets (not the family's): the Select's field caret and DateSelect's month title. One pull, derived.
  const CARET = '<path d="M3 4.5l3 3 3-3"', CARET_SVG = '<svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"';
  const caretFiles = PLAYER_TSX.filter((f) => code(f).includes(CARET));
  const sel = req("../src/components/ui/select.tsx") as { FIELD_CARET_PULL: string };
  const ink = partsOfMarkup('<path d="M3 4.5l3 3 3-3" />', 2);
  const caretGap = (Math.min(...ink.map((q) => q.x0 - q.w / 2)) / 12) * 10;
  ok(`3.4 · the two hand-drawn carets end their controls with their ink on the edge: the drawing inks x2–10 of 12, so at 10px it stands ${caretGap.toFixed(3)}px in each side — FIELD_CARET_PULL "${sel.FIELD_CARET_PULL}", on both`,
    j(caretFiles) === j(["src/components/ui/date-select.tsx", "src/components/ui/select.tsx"]) && sel.FIELD_CARET_PULL === `${-r3(caretGap)}px`
      && caretFiles.every((f) => squash(code(f)).includes("style={{ marginInlineEnd: FIELD_CARET_PULL }}") && code(f).includes(CARET_SVG)));
  // Every arrow CHARACTER typed on a player surface (JSX text or a string in it), classified: none ends or starts a run of
  // words in a link or a button any more; those left are data — figures joined or marked — and one path in a sentence.
  const ARROWS = new RegExp(`[${String.fromCharCode(0x2190)}-${String.fromCharCode(0x2193)}${String.fromCharCode(0x2197)}${String.fromCharCode(0x25b2)}${String.fromCharCode(0x25bc)}]`, "g");
  const CHAR_SITES: Record<string, [number, string]> = {
    "src/app/updown/history/page.tsx": [5, "data: a staked → returned pair (twice), an open → close price pair, and each bet chip's ↑/↓ side marker before its figure — the figures' own face"],
    "src/app/legal/privacy/page.tsx": [3, "a path in the privacy policy's sentence (“Profile → Notifications”), in each language — the D19a-pinned legal text, frozen"],
    "src/app/updown/[roundId]/page.tsx": [2, "data: each bet chip's ↑/↓ side marker before its figure"],
    "src/components/ui/query-bar.tsx": [3, "the sort direction: each option's ↑/↓ hint and the direction button's ↑, alone in its 44px button (it turns by data-dir)"],
    "src/components/updown/updown-card.tsx": [1, "data: the open → close price pair (D52 holds the arrow to its figure)"],
    "src/components/markets/market-card.tsx": [2, "data: the day-ago move's ▲/▼ before its points"],
    "src/app/s/optout-refusal.tsx": [1, "a path in a sentence (“Wasifu → Arifa”): the words' own face — S12 with the dictionary's arrows"],
  };
  const charSeen: Record<string, number> = {};
  for (const f of PLAYER_TSX) { const n = [...code(f).matchAll(ARROWS)].length; if (n) charSeen[f] = n; }
  const charBad = Object.entries(charSeen).filter(([f, n]) => CHAR_SITES[f]?.[0] !== n).concat(Object.keys(CHAR_SITES).filter((f) => !(f in charSeen)).map((f) => [f, 0] as [string, number]));
  ok(`3.5 · every arrow character typed on a player surface is classified — ${Object.values(charSeen).reduce((a, b) => a + b, 0)} in ${Object.keys(charSeen).length} files, all data, a sort mark or a path in a sentence; none ends or starts a link's or a button's words`,
    charBad.length === 0, j(charBad));
  ok("3.5′ PLANT · a back link typed as round 9 had it (“← {t.common.back}”) is an unclassified character", (() => {
    const m = [...("<Link>" + String.fromCharCode(0x2190) + " {t.common.back}</Link>").matchAll(ARROWS)].length; return m === 1 && !("src/app/auth/2fa/page.tsx" in charSeen);
  })());
  // 3.6 · the twin foot rows' links share their row with another link, so they can be squeezed: /auth/otp's
  // "BADILISHA NAMBARI" wraps at sw 320–390 and "CHANGE NUMBER" at en 320 (a 224px row: px-3 gutters, the panel's p-6), beside
  // the resend link. The typed arrow stood on the first line, and the glyph stays there: `items-start`, the 12px glyph
  // centred on text-label's line by mt-0.5 — both read from tailwind.config.ts. (Centred on the block, it would sit between
  // the two lines.)
  const TWC = raw("tailwind.config.ts");
  const labelLine = Number(new RegExp('label: +[[]"12px", [{] lineHeight: "([0-9]+)px"').exec(TWC)?.[1] ?? NaN);
  const halfStep = Number(new RegExp('"0[.]5": "([0-9]+)px"').exec(TWC)?.[1] ?? NaN);
  const FOOT_LINK = "inline-flex items-start gap-1.5 font-mono text-label uppercase", FOOT_GLYPH = '<I.arrowLeft s={12} edge="start" text="mono-400" className="mt-0.5" />';
  ok(`3.6 · the twin foot rows' back links keep their arrow on the first line where the words wrap (/auth/otp "BADILISHA" / "NAMBARI" at sw 320–390, "CHANGE" / "NUMBER" at en 320): items-start, the 12px glyph centred on the ${labelLine}px label line by mt-0.5 (${halfStep}px)`,
    labelLine - 12 === 2 * halfStep && ["src/app/auth/2fa/page.tsx", "src/app/auth/otp/page.tsx"].every((f) => code(f).includes(FOOT_LINK) && code(f).includes(FOOT_GLYPH)), j({ labelLine, halfStep }));
}

/* ══ §4 · A4 · STAT'S ICON SLOT ══════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · A4 Stat's icon slot pulls its glyph onto the column's edge (tiles 162 187 188), every call site and its ghosts");
{
  const { Stat } = req("../src/components/ui/stat.tsx") as { Stat: (p: Record<string, unknown>) => unknown };
  const lead = render(h(Stat as never, { label: "KIASI", value: "5", icon: h(I.chart, { s: 14 }) }));
  const end = render(h(Stat as never, { label: "KAMISHENI", value: "5", icon: h(I.percent, { s: 14 }), iconAlign: "end" }));
  const box = render(h(Stat as never, { label: "X", value: "1", icon: h("span", { className: "block h-[14px] w-[14px]" }) }));
  ok(`4.1 · a glyph leading the label row is pulled onto the start edge (${marginOf(lead)?.px}px for the 14px chart), one at the far end onto the end edge (${marginOf(end)?.px}px for the percent)`,
    near(marginOf(lead, "start")?.px ?? 0, wantPull("chart", 14, "start"), 0.0015) && near(marginOf(end, "end")?.px ?? 0, wantPull("percent", 14, "end"), 0.0015));
  ok("4.1′ CONTROL · a slot handed something that is not a glyph draws it as given", !box.includes("margin-inline") && box.includes('<span class="block h-[14px] w-[14px]"></span>'));
  ok("4.1″ · …and the slot does it in its source (edgeGlyph on both arms)",
    has("src/components/ui/stat.tsx", '<span className="shrink-0">{edgeGlyph(icon, "end")}</span></> : <>{edgeGlyph(icon, "start")}{labelRow}</>'));
  // The tiles: each glyph's ink stood inside its column by exactly its drawing's gap (plus anti-aliasing).
  const TILES: Array<[string, string, number, number]> = [
    ["162 KIASI (chart)", "chart", 14, 1.76], ["162 WATABIRI (users)", "users", 14, 1.84], ["162 INATATULIWA (calendarClock)", "calendarClock", 14, 1.07],
    ["187/188 SALIO (wallet)", "wallet", 14, 1.08], ["187/188 HAI (sparkle)", "sparkle", 14, 2.18], ["187/188 IMEKAMILIKA (check)", "check", 14, 2.48],
  ];
  const off = TILES.filter(([, n, s, m]) => Math.abs(gapOf(n, s).start - m) > 0.2);
  ok(`4.2 · re-read on the tiles, each glyph stood in by its own drawing's gap: ${TILES.map(([w, n, s, m]) => `${w} ${gapOf(n, s).start.toFixed(2)} (measured ${m})`).join(", ")} — after, every one on its column's edge`,
    off.length === 0, j(off));
  // Every call site hands the slot a family glyph (so the slot pulls it) — the 11 call sites the read named and /profile/activity's six.
  const STAT = new RegExp(`<Stat${WS}(?:[^<>{}]|[{](?:[^{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*[}])*?icon=[{](<(?:[^<>{}]|[{][^{}]*[}])*?/>)[}]`, "g");
  const calls: Array<[string, string]> = [];
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(STAT)) calls.push([f, squash(m[1])]);
  const notGlyph = calls.filter(([, el]) => !new RegExp("^<I[.][A-Za-z]+ s=[{]14[}]").test(el));
  const byFile = (f: string) => calls.filter(([g]) => g === f).length;
  ok(`4.3 · every Stat icon on a player surface is a family glyph the slot pulls — ${calls.length} sites: the market page 3, /profile 3, /agent 3, the agent dashboard 2, /profile/activity 6, and the ghosts (/agent 3, /profile 3)`,
    notGlyph.length === 0 && byFile("src/app/markets/[id]/page.tsx") === 3 && byFile("src/app/profile/page.tsx") === 3 && byFile("src/app/agent/page.tsx") === 3
      && byFile("src/app/profile/invite/agent-dashboard.tsx") === 2 && byFile("src/app/profile/activity/page.tsx") === 6 && byFile("src/app/agent/loading.tsx") === 3 && byFile("src/app/profile/loading.tsx") === 3,
    j({ notGlyph, n: calls.length }));
  ok("4.3′ CONTROL · /profile's ghost drew bare 14px boxes, which the slot cannot pull — it draws the page's three glyphs, unpainted (labels land where the page's do)",
    !code("src/app/profile/loading.tsx").includes('icon={<span className="block h-[14px] w-[14px]" />}')
      && ["wallet", "sparkle", "check"].every((g) => has("src/app/profile/loading.tsx", `icon={<I.${g} s={14} className="text-transparent" />}`)));
}

/* ══ §5 · A5 · A HEADING'S LEADING GLYPH ═════════════════════════════════════════════════════════════════════════════════ */
section("5 · A5 a heading or a title that leads with a glyph stands it on its column's edge (tile 162) — the census");
{
  const g = gapOf("portfolio", 15);
  ok(`5.1 · tile 162 re-read: "Nafasi zako"'s portfolio glyph stood at x158.12 on the 157.0 edge — its drawing's ${g.start.toFixed(3)}px — and stands on it now`,
    Math.abs(157 + g.start - 158.12) < 0.2 && has("src/app/markets/[id]/page.tsx", '<I.portfolio s={15} edge="start" />'));
  // Every h1–h6, summary or display-weight title on a player surface whose first content is a glyph (directly or in one span).
  const HEAD = new RegExp(`<(h[1-6])${WS}((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)>${WS}*(?:[{][}]${WS}*)*(?:<span[^>]*>${WS}*)?(<(?:I[.][A-Za-z]+|Glyph|Cat|Icon)(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?/>)`, "g");
  const TITLE = new RegExp(`<(p|div|span|summary)${WS}((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?className=(?:"[^"]*"|[{][^}]*[}])(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)>${WS}*(?:[{][}]${WS}*)*(<I[.][A-Za-z]+(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?/>)`, "g");
  const KEEP: Record<string, string> = {
    "src/components/ui/unsaved-changes.tsx": "the console's pending-changes bar (admin pages only — R9-A's own exemption)",
    "src/components/layout/avatar-menu.tsx": "the classic account menu (frozen chrome) — named for the integrator",
  };
  const heads: Array<{ f: string; el: string; edge: boolean }> = [];
  for (const f of PLAYER_TSX) {
    const c = code(f);
    for (const m of c.matchAll(HEAD)) heads.push({ f, el: squash(m[3]), edge: m[3].includes('edge="start"') });
    for (const m of c.matchAll(TITLE)) {
      const cls = m[2];
      const title = (new RegExp("font-display").test(cls) && new RegExp("font-(?:semibold|bold)").test(cls)) || new RegExp('(?:^|[ "])eyebrow(?:[ "]|$)').test(cls);
      if (title) heads.push({ f, el: squash(m[3]), edge: m[3].includes('edge="start"') });
    }
  }
  const loose = heads.filter((x) => !x.edge && !(x.f in KEEP));
  const fixed = ["src/app/markets/[id]/page.tsx", "src/components/markets/resolution-panel.tsx", "src/app/profile/kyc/page.tsx"];
  ok(`5.2 · every heading or title on a player surface that leads with a glyph stands it on its column's edge — ${heads.length} found, the market page's two h2s, the resolution panel's and KYC's “why we ask” brought this round`,
    heads.length >= 12 && loose.length === 0 && fixed.every((f) => heads.some((x) => x.f === f && x.edge)), j(loose));
  ok("5.2′ PLANT · the market page's h2 as round 9 drew it is reported", (() => {
    const m = [...'<h2 className="font-display text-[15px] font-semibold text-text flex items-center gap-2"> <I.portfolio s={15} />'.matchAll(HEAD)];
    return m.length === 1 && !m[0][3].includes("edge=");
  })());
  ok("5.3 · the live wall's category glyph leads its card's eyebrow line (a variable component R9-A's eyebrow census could not read), so it stands on the edge too",
    has("src/app/live/pulse-grid.tsx", '<Cat s={13} edge="start" />{marketCategoryLabel(t, market.category)}'));
}

/* ══ §6 · A6 · ONE WEIGHT FOR EVERY ARROW AMONG WORDS · A CENTRED CONTROL FRAMES ITS INK ═══════════════════════════════ */
section("6 · A6 one weight for every arrow among words; a centred control frames its ink — the rule, the slots, every control, the tags");
{
  // 6.1 · the weights, on the tiles' instruments and from the drawings. The family's 1.9 at 14px against Inter 600's stem.
  const family14 = (1.9 * 14) / 24, text14 = GLYPH_STEM["body-600"] * 14;
  ok(`6.1 · the wallet's ↓/↑ stroke at their words' Inter 600 stem: ${text14.toFixed(3)}px where they drew the family's ${family14.toFixed(3)} (tile 174 read 1.11–1.17; "→ Omba sasa" on 198 read 2.05–2.09)`,
    has("src/app/wallet/wallet-client.tsx", '<I.arrowDown s={14} edge="start" text="body-600" />') && has("src/app/wallet/wallet-client.tsx", '<I.arrowUp s={14} edge="start" text="body-600" />')
      && text14 > 1.6 * family14 && near(family14, 1.108, 1e-3));
  ok("6.1′ · …the home band's Up/Down picks the same, and the stake panel's chip arrows stroke at the chip's Inter 700 (the typed 2.5 is gone)",
    has("src/components/home/updown-band.tsx", '<I.arrowUp s={16} edge="start" text="body-600" />') && has("src/components/home/updown-band.tsx", '<I.arrowDown s={16} edge="start" text="body-600" />')
      && !code("src/components/updown/round-stake-panel.tsx").includes("strokeWidth={2.5}") && has("src/components/updown/round-stake-panel.tsx", '<I.arrowUp s={12} text="body-700" />'));
  // 6.2 · the verdict's arrow: its box is 0.8em of the verdict, so its pull is written in em in the stylesheet, from the drawing.
  const vr = rule(".kp-udbug__arrow").split(";").map((d) => d.trim());
  const reach = runReach("arrowUp", "start"), reachD = runReach("arrowDown", "start");
  const want = `margin-inline-start: calc(${GLYPH_STEM["display-700"] / 2}em - ${reach} / 24 * 0.8em)`;
  ok(`6.2 · the Up & Down verdict's arrow strokes at Sora 700's stem (0.164em, it drew a typed 2.5 — 0.083em) and stands on its centred line's start: ${want}`,
    reach === 6 && reachD === 6 && CSS.includes(`.kp-udbug__arrow { ${want}; }`) && !code("src/components/home/updown-match-words.tsx").includes("strokeWidth={2.5}"), j({ reach, vr }));
  // 6.3 · the slots: Button pulls a worded slot's glyph, never an icon-only one, and its spinner by its own gap.
  const { Button } = req("../src/components/ui/button.tsx") as { Button: unknown };
  const worded = render(h(Button as never, { leading: h(I.user, { s: 16 }), trailing: h(I.arrowRight, { s: 16, text: "body-600" }) }, "Ingia"));
  const alone = render(h(Button as never, { leading: h(I.x, { s: 16 }), "aria-label": "Funga" }));
  const loading = render(h(Button as never, { leading: h(I.user, { s: 16 }), loading: true, size: "lg" }, "Ingia"));
  const loadingAlone = render(h(Button as never, { loading: true, size: "lg", "aria-label": "x" }));
  const sp = (await import("../src/components/ui/spinner.tsx")) as { SPINNER_INK_GAP: number; spinnerPull: (s: number, e?: "start" | "end", slot?: number) => Record<string, string> | undefined };
  const ringInk = partsOfMarkup('<circle cx="12" cy="12" r="9" stroke-width="3" />', 3);
  ok(`6.3 · Button: a worded slot's glyph stands on the padding (leading ${marginOf(worded, "start")?.px}px, trailing ${marginOf(worded, "end")?.px}px + ${marginOf(worded, "end")?.em}em), an icon-only button's keeps its box, and the lg spinner is pulled by its ring's own gap (${sp.SPINNER_INK_GAP} of 24: ${r3(-sp.SPINNER_INK_GAP * 14 / 24)}px)`,
    near(marginOf(worded, "start")?.px ?? 0, wantPull("user", 16, "start"), 0.0015) && marginOf(worded, "end")?.side === "end" && !alone.includes("margin-inline")
      && loading.includes(`margin-inline-start:${r3(-sp.SPINNER_INK_GAP * 14 / 24)}px`) && !loadingAlone.includes("margin-inline")
      && near(Math.min(...ringInk.map((q) => q.x0 - q.w / 2)), sp.SPINNER_INK_GAP, 1e-9));
  // R9-A's reason for boxing a button's glyph: the spinner's swap would move the label. Measured on the boxes: it already did.
  const userOuter = 16 - gapOf("user", 16).start, spinOuter = 14 - (sp.SPINNER_INK_GAP * 14) / 24;
  ok(`6.3′ · the spinner swap moves /agent's lg label by ${Math.abs(userOuter - spinOuter).toFixed(2)}px now (glyph ${userOuter.toFixed(2)} wide, spinner ${spinOuter.toFixed(3)}); boxed, it moved it 2px (16 against 14) — R9-A's reason did not hold`,
    Math.abs(userOuter - spinOuter) < 0.25 && 16 - 14 === 2);
  ok("6.4 · SubmitButton, RgConfirmSubmit, FilterPill and Tabs pull their slot's glyph the same way (a glyph with no words beside it keeps its box), and SubmitButton's spinner takes its pull",
    has("src/components/ui/submit-button.tsx", '{pending ? <Spinner size={14} edge="start" /> : edgeGlyph(icon, "start")}')
      && has("src/components/rg/rg-confirm-submit.tsx", 'const mark = edgeGlyph(icon, "start");') && !squash(code("src/components/rg/rg-confirm-submit.tsx")).includes("{icon}")
      && has("src/components/ui/filter-pill.tsx", '{hasWords(label) ? edgeGlyph(glyph, "start") : glyph}') && has("src/components/ui/tabs.tsx", '{hasWords(item.labelEn) ? edgeGlyph(item.glyph, "start") : item.glyph}'));
  ok("6.4′ CONTROL · hasWords: words, a figure or an element count; white space and nothing do not",
    G.hasWords("Ingia") && G.hasWords(h("span", null, "x")) && G.hasWords(0) && !G.hasWords("  ") && !G.hasWords(null) && !G.hasWords([false, undefined]));
  // 6.5 · the ghosts mirror the pulled slots box for box.
  const { ButtonGhost } = req("../src/components/ui/ghost-text.tsx") as { ButtonGhost: unknown };
  const ghost = render(h(ButtonGhost as never, { size: "lg", leading: h(I.user, { s: 16 }) }, "Ingia"));
  const ghostBox = render(h(ButtonGhost as never, { size: "lg", leading: 16 }, "Ingia"));
  ok("6.5 · ButtonGhost draws the page's own glyph unpainted and pulled as the slot pulls it (a bare number still a box); the three ghosts pass their pages' glyphs",
    near(marginOf(ghost, "start")?.px ?? 0, wantPull("user", 16, "start"), 0.0015) && ghostBox.includes("width:16px") && !ghostBox.includes("margin-inline")
      && has("src/app/agent/apply/loading.tsx", '<ButtonGhost size="md" leading={<I.chevronLeft s={14} text="body-600" />}>') && has("src/app/agent/apply/loading.tsx", '<ButtonGhost size="md" trailing={<I.arrowRight s={14} text="body-600" />}>')
      && has("src/app/agent/loading.tsx", '<ButtonGhost size="lg" leading={<I.arrowRight s={16} text="body-600" />}>') && has("src/app/agent/invite/[token]/loading.tsx", '<ButtonGhost size="lg" leading={<I.mail s={16} />}>'));
  // 6.11 · …and the hand-drawn ghosts draw the glyphs their pages pull (a bare box cannot be pulled): /positions' "View
  // performance" button (its chart), the live wall's tag (the sports glyph its word names), /results' topic pills (each
  // category's own glyph — PillGhost pulls it as FilterPill does).
  const { PillGhost } = req("../src/components/ui/query-bar-ghost.tsx") as { PillGhost: unknown };
  const pillG = render(h(PillGhost as never, { label: "Michezo", glyph: h(I.chart, { s: 14 }) })), pillBare = render(h(PillGhost as never, { label: "Zote" }));
  ok("6.11 · the hand-drawn ghosts draw the glyphs their pages pull, unpainted and pulled the same: /positions' View performance (chart 13), the live wall's tag (football 13), /results' topic pills (PillGhost: each category's own glyph at 14)",
    has("src/app/positions/positions-ghost.tsx", '<I.chart s={13} edge="start" className="shrink-0 text-transparent" />') && has("src/app/positions/page.tsx", '<I.chart s={13} edge="start" />')
      && has("src/app/live/loading.tsx", '<I.football s={13} edge="start" /><GhostText>{t.market.catSports}</GhostText>') && has("src/app/live/pulse-grid.tsx", '<Cat s={13} edge="start" />')
      && near(marginOf(pillG, "start")?.px ?? 0, wantPull("chart", 14, "start"), 0.0015) && !pillBare.includes("<svg")
      && has("src/app/results/loading.tsx", "{topics.map(({ key, label, Glyph }) => <PillGhost key={key} label={label} glyph={<Glyph s={14} />} />)}")
      && has("src/components/ui/filter-pill.tsx", '{hasWords(label) ? edgeGlyph(glyph, "start") : glyph}'), j({ pull: marginOf(pillG, "start") }));
  ok("6.11′ PLANT · /positions' ghost as round 9 drew it (a bare 13px box) is reported",
    !squash(code("src/app/positions/positions-ghost.tsx").replace('<I.chart s={13} edge="start" className="shrink-0 text-transparent" />', '<span className="h-[13px] w-[13px] shrink-0" />')).includes('<I.chart s={13} edge="start"'));
  // 6.6 · every hand-built control: a `.btn` element whose first or last content is a family glyph (directly, in a span, or
  // in a condition) carries `edge`; the classic header's deposit CTA is frozen chrome.
  const OPEN = new RegExp("<([A-Za-z][A-Za-z0-9.]*)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)>", "g");
  const CLS = new RegExp('className=(?:"([^"]*)"|[{]`([^`]*)`[}])');
  const FIRST = new RegExp(`^(?:[{][}]${WS}*)*(?:<span[^>]*>${WS}*)?[{]?[^<{}]*?(?:&&|[?])?${WS}*(<I[.][A-Za-z]+[^>]*/>)`);
  const LAST = new RegExp(`(<I[.][A-Za-z]+[^>]*/>)${WS}*(?:</span>${WS}*)?[)]?${WS}*[}]?$`);
  const btnEnds: Array<{ f: string; at: string; el: string; edge: boolean }> = [];
  for (const f of PLAYER_TSX) {
    const c = code(f);
    for (const m of c.matchAll(OPEN)) {
      if (m[2].trim().endsWith("/")) continue;
      const k = CLS.exec(m[2]);
      const cls = k ? (k[1] ?? k[2] ?? "") : "";
      if (!new RegExp("(?:^| )btn(?: |$)").test(cls)) continue;
      const close = c.indexOf(`</${m[1]}>`, (m.index ?? 0) + m[0].length);
      if (close < 0) continue;
      const body = c.slice((m.index ?? 0) + m[0].length, close).trim();
      const a = FIRST.exec(body), b = LAST.exec(body);
      if (a) btnEnds.push({ f, at: "first", el: squash(a[1]), edge: a[1].includes(" edge=") });
      if (b) btnEnds.push({ f, at: "last", el: squash(b[1]), edge: b[1].includes(" edge=") });
    }
  }
  const FROZEN_BTN = ["src/components/layout/top-app-bar.tsx"];
  const unpulled = btnEnds.filter((x) => !x.edge && !FROZEN_BTN.includes(x.f));
  ok(`6.6 · every hand-built control's end glyph stands on its padding — ${btnEnds.length} glyph ends in .btn controls (doors, pills, the journey header's ⊕, the wallet sheet's doors in the journey); the classic header's ⊕ is frozen chrome, named`,
    btnEnds.length >= 35 && unpulled.length === 0 && btnEnds.some((x) => x.f === "src/components/layout/top-app-bar.tsx" && !x.edge), j(unpulled));
  ok("6.6′ PLANT · the wallet's Withdraw link as round 9 drew it is reported", (() => {
    const body = "<I.arrowUp s={14} /> {t.common.withdraw}";
    const a = FIRST.exec(body); return !!a && !a[1].includes(" edge=");
  })());
  ok("6.6″ · the wallet sheet's doors are pulled in the journey only (the classic capsule opens the same sheet — frozen chrome keeps its boxes)",
    has("src/components/layout/wallet-sheet.tsx", '<I.plus s={16} edge={journey ? "start" : undefined} />') && has("src/components/layout/wallet-sheet.tsx", '<I.arrowUpFromLine s={16} edge={journey ? "start" : undefined} />'));
  // Hand-built text-buttons that are not `.btn`: the notifications' undo, the objection button, the query bar's clear pill.
  ok("6.7 · the hand-built text-buttons beside them too: /notifications' undo, the market page's objection button, the query bar's clear pill",
    has("src/app/notifications/row-actions.tsx", '<I.rotateCcw s={12} edge="start" />') && has("src/components/markets/objection-dialog.tsx", '<I.alertCircle s={13} edge="start" className="shrink-0" />')
      && has("src/components/ui/query-bar.tsx", '<I.x s={14} edge="start" aria-hidden />'));
  // 6.8 · the Withdraw door (tiles 132 134 136): its content sat right of centre by the arrow's box gap less the label's
  // own side bearing; pulled by the gap (2.7px), the group moves left by half of it.
  const door = gapOf("arrowUpFromLine", 16).start;
  const before = { sw: 0.86, en: 1.47, zh: 1.36 };
  const after = Object.fromEntries(Object.entries(before).map(([l, v]) => [l, r3(v - door / 2)]));
  ok(`6.8 · the Withdraw door: its ↑ drew ${door.toFixed(2)}px of empty box on its start, and its content sat ${j(before)} px right of centre (tiles 132 134 136); pulled, it centres to ${j(after)} — inside the label's own side bearing`,
    near(door, 2.7, 1e-6) && Object.values(after).every((v) => Math.abs(v) < 0.5));
  // 6.9 · the journey header's deposit pill: A5's fit rule took 2px of the plus's side (12/10); the plus pulled frees its gap,
  // which is shared evenly, so the pill keeps the width the fit rule measured.
  const plusGap = gapOf("plus", 14).start;
  const pad = 11 + (2.55 * 14) / 48;
  ok(`6.9 · the journey's "+ Weka pesa": the plus stands on the padding and the padding is A5's 22px plus the freed ${plusGap.toFixed(4)}px shared evenly — ${pad}px a side, the pill's width unchanged`,
    near(plusGap, (2.55 * 14) / 24, 1e-9) && near(2 * pad, 22 + plusGap, 1e-9) && CSS.includes("@media (min-width: 360px) { .kp-jhdr__pill { padding: 0 calc(11px + 2.55 * 14px / 48); } }")
      && has("src/components/journey/journey-top-bar.tsx", '<span aria-hidden className="kp-jhdr__plus"><I.plus s={14} edge="start" /></span>'));
  ok("6.9′ CONTROL · kept at 12/10 with the plus pulled, its ink would stand 10px from the start and 12 from the end — 1px off centre", Math.abs(10 - 12) / 2 === 1);
  // 6.10 · the tags keep their box: their caps are tracked, and the tracking after the last letter stands opposite the glyph's
  // gap. Computed for each tag on a player surface (Inter Bold advances for the chips; the glyph's gap from its drawing).
  const interBold = FONT("Inter-Bold");
  const rsb = (ch: string, size: number) => { const g = interBold.glyphForCodePoint(ch.codePointAt(0)!); return ((g.advanceWidth - g.bbox.maxX) / interBold.unitsPerEm) * size; };
  const TAGS: Array<[string, string, number, string, number, number]> = [
    ["the stake panel's ↑ JUU chip (md, 10.5px, 0.06em)", "arrowUp", 12, "U", 10.5, 0.06],
    ["the Up & Down card's lock chip (md, 10.5px, 0.06em)", "lock", 11, "A", 10.5, 0.06],
    ["/profile's role chip (lg, 12px, 0.06em)", "shieldcheck", 11, "N", 12, 0.06],
    ["/profile's email pill (md, 10.5px, 0.06em)", "check", 10, "A", 10.5, 0.06],
  ];
  const tagRows = TAGS.map(([what, g, s, last, size, trk]) => {
    const gap = gapOf(g, s).start, right = trk * size + rsb(last, size);
    return { what, boxed: r3((gap - right) / 2), pulledOnly: r3((0 - right) / 2) };
  });
  const maxBoxed = Math.max(...tagRows.map((t) => Math.abs(t.boxed))), maxPulled = Math.max(...tagRows.map((t) => Math.abs(t.pulledOnly)));
  ok(`6.10 · a tag keeps its box (a label that states, not a control): its caps are tracked, and boxed each stands within ${maxBoxed.toFixed(2)}px of centre by its ink (${tagRows.map((t) => `${t.what} ${t.boxed}`).join("; ")}), where a glyph pull alone would leave it within ${maxPulled.toFixed(2)} the other way — exact centring also takes the trailing tracking back, which R7-C left on centred labels: owner question K42`,
    maxBoxed < 0.75 && maxPulled > 0.4, j(tagRows));
}

/* ══ §7 · A7 · THE SEARCH BOX ════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · A7 the search box's two insets are equal by ink (tiles 172 194)");
{
  const SB = "src/components/ui/search-box.tsx";
  const glass = gapOf("search", 16), info = gapOf("info", 15);
  const pre = Number(new RegExp("padding: 0 10px 0 ([0-9]+)px;").exec(rule(".input-group .prefix"))?.[1] ?? NaN);
  const left0 = pre + glass.start, left1 = pre, right = (40 - 15) / 2 + info.end;
  ok(`7.1 · tiles 172 / 194 re-read: the magnifier stood ${left0.toFixed(2)}px from the left border (measured 16.76) and the ⓘ ${right.toFixed(2)} from the right (13.34 drawn — its 15px box snapped from a half pixel)`,
    Math.abs(left0 - 16.76) < 0.1 && pre === 14 && Math.abs(right - 13.78) < 0.01);
  ok(`7.2 · the magnifier leads the field, so its ink stands on the prefix's ${pre}px padding (edge); the ⓘ is alone in its 40px target and keeps its box — the insets are ${left1.toFixed(2)} and ${right.toFixed(2)}`,
    has(SB, '<I.search s={16} edge="start" />') && Math.abs(left1 - right) < 0.25 && has("src/components/ui/search-help.tsx", '<I.info s={15} aria-hidden />'));
  const gaps = G.glyphInkGaps(h(I.search, { s: 16 }));
  const spin = (await import("../src/components/ui/spinner.tsx")) as { spinnerPull: (s: number, e?: "start" | "end", slot?: number) => Record<string, string> | undefined };
  const pull = spin.spinnerPull(16, "start", gaps?.start) ?? {};
  const spinOuter = 16 + Number.parseFloat(pull.marginInlineStart ?? "0") + Number.parseFloat(pull.marginInlineEnd ?? "0");
  ok(`7.3 · the spinner that takes the magnifier's slot stands on the same edge by its own ink and takes the magnifier's exact width (${spinOuter.toFixed(3)}px, the magnifier ${(16 - (gaps?.start ?? 0)).toFixed(3)}), so the words never move`,
    has(SB, '<Spinner size={16} edge="start" slotPull={GLASS_GAPS?.start} />') && near(spinOuter, 16 - (gaps?.start ?? 0), 0.002) && near(gaps?.start ?? 0, glass.start, 0.0015)
      && pull.marginInlineStart === `${r3(-1.5 * 16 / 24)}px`);
  ok("7.3′ PLANT · without the slot's width the swap would move the typed words by the two gaps' difference", Math.abs(glass.start - 1.5 * 16 / 24) > 1.5);
}

/* ══ §8 · A8 · "Fungua soko →" ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · A8 the dictionary's typed arrow was a third weight — S12 took it out of the label and draws the glyph");
{
  const shaft = (n: string) => {
    const f = FONT(n), g = f.glyphForCodePoint(0x2192);
    let x = 0, y = 0;
    const ys: number[] = [];
    for (const c of g.path.commands) {
      const a = c.args;
      if (c.command === "moveTo") { x = a[0]; y = a[1]; }
      else if (c.command === "lineTo") { if (Math.abs(a[1] - y) < 1 && Math.abs(a[0] - x) > 0.25 * f.unitsPerEm) ys.push(a[1]); x = a[0]; y = a[1]; }
      else { x = a[a.length - 2]; y = a[a.length - 1]; }
    }
    return (Math.max(...ys) - Math.min(...ys)) / f.unitsPerEm;
  };
  const medium = shaft("Inter-Medium"), bold = shaft("Inter-Bold"), at600 = (medium + bold) / 2;
  ok(`8.1 · Inter draws its arrow ${at600.toFixed(4)}em at 600 (Medium ${medium.toFixed(4)}, Bold ${bold.toFixed(4)}) against its 600 stem ${GLYPH_STEM["body-600"]}em: at 14px ${(at600 * 14).toFixed(2)}px between the family's ${((1.9 * 14) / 24).toFixed(2)} and the words' ${(GLYPH_STEM["body-600"] * 14).toFixed(2)} — a third weight (tile 178 read 1.29–1.30 between 1.11 and 2.07)`,
    at600 < GLYPH_STEM["body-600"] * 0.9 && at600 > (1.9 / 24) && near(medium, 0.0928, 1e-3) && near(bold, 0.1167, 1e-3));
  const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, { market: Record<string, string> }> };
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-14 (S12 WP5, word-ledger row 56). This check held the typed arrow IN the label, filed
  // for S12; S12 took it out — "the label without it, the glyph after it" — so it now holds the fix: no arrow character in
  // the label in any language, the family's glyph drawn after the words at the label's weight, and the loading ghost
  // keeping the glyph's room so its row wraps where the page's does.
  const ARROW = String.fromCharCode(0x2192);
  ok(`8.2 · the label carries no typed arrow ("${dict.sw.market.openMarket}" / "${dict.en.market.openMarket}" / "${dict.zh.market.openMarket}"), and /live's button draws the family's glyph after it — its ghost the glyph's room`,
    ["sw", "en", "zh"].every((l) => !dict[l].market.openMarket.includes(ARROW) && dict[l].market.openMarket.trim() === dict[l].market.openMarket)
      && has("src/app/live/featured-contest.tsx", '{openLabel} <I.arrowRight s={14} edge="end" text="body-600" /> </Link>')
      && has("src/app/live/loading.tsx", '<ButtonGhost size="md" trailing={<I.arrowRight s={14} text="body-600" />}>{t.market.openMarket}</ButtonGhost>'));
}

/* ══ §9 · R10-B · BANNER AND NOTICE BODIES ═══════════════════════════════════════════════════════════════════════════════ */
section("9 · R10-B banner and notice bodies hold their phrases as the empty states' do (tile 185) — the helper, the census, the lines");
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
const { dict: DICT } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Record<string, unknown>> };
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(DICT[l], p) ?? `‹no ${p}›`);
const kr = req("../src/components/ui/keep-run.tsx") as { possessiveRanges: (s: string) => Array<[number, number]>; keepRanges: (s: string, r: ReadonlyArray<readonly [number, number]>) => unknown; mergeRanges: (r: ReadonlyArray<readonly [number, number]>) => Array<[number, number]>; runAndDashRanges: (s: string, k?: readonly string[]) => Array<[number, number]> };
const est = req("../src/components/ui/empty-state-text.ts") as { noticeBody: (b: unknown, o?: { centred?: boolean }) => unknown; emptyStateBody: (b: unknown) => unknown; emptyStateRanges: (s: string, k?: readonly string[]) => Array<[number, number]> };
/* ── the line model: R9-B's (R7-A's port of Chromium's balance and the greedy fill over unkerned advances) ── */
type Leaf = { text: string; nowrap: boolean };
function leaves(node: unknown, nowrap = false, out: Leaf[] = []): Leaf[] {
  if (node == null || node === false || node === true) return out;
  if (typeof node === "string" || typeof node === "number") { if (String(node) !== "") out.push({ text: String(node), nowrap }); return out; }
  if (Array.isArray(node)) { for (const n of node) leaves(n, nowrap, out); return out; }
  const el = node as { type?: unknown; props?: { className?: string; children?: unknown } };
  if (el && el.props !== undefined) {
    const nw = nowrap || new RegExp("(?:^| )whitespace-nowrap(?: |$)").test(String(el.props.className ?? ""));
    if (typeof el.type === "function") return leaves((el.type as (p: unknown) => unknown)(el.props), nw, out);
    return leaves(el.props.children, nw, out);
  }
  return out;
}
const INTER = FONT("Inter-Regular");
const CJK = new RegExp(`[${String.fromCharCode(0x3000)}-${String.fromCharCode(0x303f)}${String.fromCharCode(0x3400)}-${String.fromCharCode(0x4dbf)}${String.fromCharCode(0x4e00)}-${String.fromCharCode(0x9fff)}${String.fromCharCode(0xff00)}-${String.fromCharCode(0xffef)}]`);
type Type = { size: number; ls: number };
const width = (s: string, ty: Type) => Array.from(s).reduce((w, ch) => w + (CJK.test(ch) ? ty.size : (INTER.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / INTER.unitsPerEm) * ty.size) + ty.ls, 0);
const CL = new RegExp(`[${String.fromCharCode(0xff0c)}${String.fromCharCode(0x3002)}${String.fromCharCode(0xff1f)}${String.fromCharCode(0xff01)}${String.fromCharCode(0xff1a)}${String.fromCharCode(0xff1b)}${String.fromCharCode(0x3001)}]`);
const IDEO = new RegExp(`[${String.fromCharCode(0x3400)}-${String.fromCharCode(0x4dbf)}${String.fromCharCode(0x4e00)}-${String.fromCharCode(0x9fff)}]`);
const EM = String.fromCharCode(0x2014);
function opportunities(text: string): Set<number> {
  const ops = new Set<number>();
  const c = Array.from(text);
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    if (b === " ") continue;
    if (a === " ") { ops.add(i); continue; }
    if (CL.test(b)) continue;
    if (CL.test(a)) { ops.add(i); continue; }
    if (b === EM) { if (a !== EM) ops.add(i); continue; }
    if (a === EM) { if (b !== EM) ops.add(i); continue; }
    if (a === "/" && new RegExp("[A-Za-z]").test(b)) { ops.add(i); continue; }
    if (a === "-" && new RegExp("[A-Za-z]").test(b) && c[i - 2] !== " ") { ops.add(i); continue; }
    if (IDEO.test(a) || IDEO.test(b)) { ops.add(i); continue; }
  }
  return ops;
}
type Para = { text: string; ops: Set<number>; ty: Type };
function paragraph(ls: Leaf[], ty: Type): Para {
  const text = ls.map((l) => l.text).join("");
  const ops = opportunities(text);
  let pos = 0;
  for (const l of ls) {
    const a = pos, b = pos + l.text.length;
    if (l.nowrap) { for (let p = a + 1; p < b; p++) ops.delete(p); if (l.text.endsWith(" ")) ops.delete(b); }
    pos = b;
  }
  return { text, ops, ty };
}
const trimEnd = (t: string, k: number) => { while (k > 0 && t[k - 1] === " ") k--; return k; };
const lineW = (p: Para, a: number, b: number) => width(p.text.slice(a, trimEnd(p.text, b)), p.ty);
function greedy(p: Para, W: number): { ends: number[]; over: boolean } {
  const n = p.text.length, pts = [...p.ops].filter((x) => x > 0 && x < n).sort((x, y) => x - y).concat(n);
  const ends: number[] = []; let start = 0, over = false;
  while (start < n) {
    let best = -1;
    for (const q of pts) { if (q <= start) continue; if (lineW(p, start, q) <= W + 1e-6) best = q; else break; }
    if (best < 0) { best = pts.find((q) => q > start)!; over = true; }
    ends.push(best); start = best;
  }
  return { ends, over };
}
function balance(p: Para, W: number): number[] {
  const g = greedy(p, W);
  if (g.ends.length <= 1 || g.over) return g.ends;
  let lo = 0, hi = W;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; const gg = greedy(p, mid); if (gg.ends.length > g.ends.length || gg.over) lo = mid; else hi = mid; }
  return greedy(p, hi).ends;
}
const linesOf = (p: Para, ends: number[]) => ends.map((e, i) => p.text.slice(i ? ends[i - 1] : 0, e).trim());
function layout(node: unknown, ty: Type, W: number, mode: "greedy" | "balance") {
  const p = paragraph(typeof node === "string" ? [{ text: node, nowrap: false }] : leaves(node), ty);
  const ends = mode === "balance" ? balance(p, W) : greedy(p, W).ends;
  const ls = linesOf(p, ends);
  return { lines: ls, over: ends.some((e, i) => lineW(p, i ? ends[i - 1] : 0, e) > W + 0.5) };
}
const show = (ls: string[]) => ls.join(" / ");
const EN_DET = new RegExp("(?:^|[ ])(?:your|my|our|their|its)$", "i");
const SW_POSS = new RegExp("^(?:w|y|z|l|ch|vy)(?:angu|ako|ake|etu|enu|ao)(?![A-Za-z])", "i");
const torn = (ls: string[]) => ls.some((l, i) => (i < ls.length - 1 && EN_DET.test(l)) || (i > 0 && SW_POSS.test(l)));
const BODY13: Type = { size: 13, ls: -0.05 }, CAPTION11: Type = { size: 11, ls: 0.2 };
{
  // 9.1 · the helper: the empty state's own ranges, without the centring device (a notice is set left).
  const s = word("sw", "proposals.comingSoonBody");
  const m = render(h("p", null, est.noticeBody(s) as never));
  const en = word("en", "proposals.comingSoonBody");
  ok("9.1 · noticeBody holds the empty state's ranges (each possessive phrase with its connective, each dash with its unit, each pair, each caller's run) and its last two words (R4-I's tail), and hangs no Chinese mark — a notice is set left",
    m.includes('<span class="whitespace-nowrap">masoko yako</span>') && render(h("p", null, est.noticeBody(en) as never)).includes('<span class="whitespace-nowrap">back shortly.</span>')
      && !render(h("p", null, est.noticeBody(word("zh", "proposals.comingSoonBody")) as never)).includes("kp-cjk-mark") && est.noticeBody("Hakuna kitu") === "Hakuna kitu");
  ok("9.1′ CONTROL · a centred notice hangs its Chinese marks as the empty state does (`centred`), the left-set one does not",
    render(h("p", null, est.noticeBody(word("zh", "proposals.comingSoonBody"), { centred: true }) as never)).includes("kp-cjk-mark")
      && render(h("p", null, est.emptyStateBody(word("zh", "proposals.comingSoonBody")) as never)).includes("kp-cjk-mark"));
  // 9.2 · tile 185 reproduced: the banner's body box is the page's 358px less its border, its 24px padding, the 17px glyph
  // and the 16px gap — 275px at sw 390 (measured: text from x74 to the box's inner edge at x349).
  const W390 = 390 - 32 - 2 - 48 - 17 - 16;
  const before = show(layout(s, BODY13, W390, "greedy").lines), after = show(layout(est.noticeBody(s), BODY13, W390, "greedy").lines);
  ok(`9.2 · tile 185 (sw 390, ${W390}px): round 9 drew "${before}" — "masoko" / "yako" torn — and the banner now reads "${after}"`,
    W390 === 275 && before === "Hivi karibuni utaweza kupendekeza masoko / yako mwenyewe na kupata zawadi / yanapoidhinishwa. Rudi tena hivi karibuni."
      && after === "Hivi karibuni utaweza kupendekeza / masoko yako mwenyewe na kupata zawadi / yanapoidhinishwa. Rudi tena hivi karibuni.", j({ before, after }));
}
{
  // 9.3 · the census: every notice body on a player surface whose dictionary text can hold a possessive is routed through
  // the keep (noticeBody, emptyStateBody for a centred one, keepText where its last two words were already kept), or is data.
  const CALLOUT = new RegExp(`<(Callout|NoticeBar)${WS}?((?:[^<>{}]|[{](?:[^{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*[}])*?)>([^]*?)</(?:Callout|NoticeBar)>`, "g");
  const KEY = new RegExp("t[.]([a-zA-Z]+)[.]([a-zA-Z0-9_]+)", "g");
  const holds = (k: string) => LOCALES.some((l) => { const v = at(DICT[l], k); return typeof v === "string" && kr.possessiveRanges(v).length > 0; });
  const ROUTED = new RegExp("(?:noticeBody|emptyStateBody|keepText|endSentence)[(]");
  const rows: Array<{ f: string; keys: string[]; routed: boolean }> = [];
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(CALLOUT)) {
    const keys = [...m[3].matchAll(KEY)].map((k) => `${k[1]}.${k[2]}`).filter((k) => holds(k));
    if (keys.length) rows.push({ f, keys, routed: ROUTED.test(m[3]) });
  }
  const bare = rows.filter((r) => !r.routed);
  ok(`9.3 · every Callout and NoticeBar body whose words can hold a possessive draws through the keep — ${rows.length} bodies (${[...new Set(rows.flatMap((r) => r.keys))].length} dictionary texts)`,
    rows.length >= 10 && bare.length === 0, j(bare));
  ok("9.3′ PLANT · the agent page's refusal as round 9 drew it ({t.agent.applyRefused} bare) is reported", (() => {
    const c = '<Callout tone="neutral" size="md">{t.agent.applyRefused}</Callout>';
    const m = [...c.matchAll(CALLOUT)][0]; return !!m && holds("agent.applyRefused") && !ROUTED.test(m[3]);
  })());
  // The bodies a Callout census cannot see — wrapped, dynamic or a component's own — each routed by name.
  const NAMED: Array<[string, string]> = [
    ["src/components/ui/coming-soon-banner.tsx", '<p className="mt-1 text-body-sm leading-relaxed text-text-muted">{noticeBody(body)}</p>'],
    ["src/components/proposals/proposals-state-views.tsx", "{noticeBody(body, { centred: true })} </Callout>"],
    ["src/components/proposals/proposals-state-views.tsx", '<p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-text-muted">{noticeBody(body, { centred: true })}</p>'],
    ["src/app/agent/page.tsx", "{noticeBody(notice.text)}"],
    ["src/app/profile/responsible-gambling/page.tsx", "{noticeBody(banner.body)}"],
    ["src/components/wallet/payout-status-notice.tsx", "{note ? body : noticeBody(body)}"],
    ["src/components/wallet/kyc-first-deposit-notice.tsx", '{noticeBody(body)}{" "}'],
    ["src/components/layout/app-shell.tsx", '{noticeBody(endedNotice.reason === "displaced"'],
    ["src/components/markets/sell-confirm-modal.tsx", "{noticeBody(isFree ? t.dialog.freeExitExplain : t.dialog.earlyExitExplain)}"],
    ["src/app/wallet/withdraw/page.tsx", '<p className="mt-0.5 text-text-muted text-balance">{noticeBody(body)}</p>'],
    ["src/components/kyc/kyc-gate-panel.tsx", "{noticeBody(copy.body, { centred: true })}</p>"],
    ["src/components/home/landing-hero.tsx", '<p className="kp-mine__held-b">{keepText(t.kycGate.frozenBody)}</p>'],
    ["src/components/layout/wallet-sheet.tsx", '{journey ? keepText(t.kycGate.frozenBody) : keepLastWords(t.kycGate.frozenBody)}'],
    ["src/app/wallet/deposit/page.tsx", "{noticeBody(t.wallet.depositPausedBody, { centred: true })}</p>"],
    ["src/components/markets/resolution-panel.tsx", "{noticeBody({ text: t.market.resFeeCappedNote"],
  ];
  const unrouted = NAMED.filter(([f, s]) => !has(f, s));
  ok(`9.4 · the bodies the census cannot read are routed by name — ${NAMED.length}: the coming-soon and maintenance banners, the blocked composer, the unavailable board, the agent notice, the limits banner, the payout notice (an officer's note stays verbatim), the KYC notice, the session-ended bar, the sell confirm, the withdraw notices, the KYC panel, both held-wallet notices, the deposit pause and the fee note`,
    unrouted.length === 0, j(unrouted));
  const DATA: Array<[string, string]> = [
    ["src/app/agent/apply/apply-client.tsx", "{app.infoRequestNote}"],
    ["src/components/layout/announcement-banner.tsx", "{active.message}"],
    ["src/app/agent/invite/[token]/invite-client.tsx", "{error}</Callout>"],
  ];
  ok("9.5 · data is drawn as given: an officer's note, an operator's announcement, a server's message (as a market title is — R9-B's `phrases: false`)",
    DATA.every(([f, s]) => has(f, s)));
}
{
  // 9.6 · every routed text laid out: at every measure from the narrowest routed one to 1000px (2px apart), in each language,
  // nothing torn, no line over its measure, no last word alone — and the widest held run under the narrowest measure. The
  // narrowest is a small notice in a 440px dialog at 320: 288 − 2 − 2×24 − 58 = 180px (the bet and sell confirms; the
  // objection dialog's is the same at 320, and every page-level notice is wider).
  const NARROWEST = Math.min(320 - 32, 440) - 2 - 48 - 58;
  const TEXTS: Array<[string, Type, "greedy" | "balance", "notice" | "empty"]> = [
    ["proposals.comingSoonBody", BODY13, "greedy", "notice"], ["proposals.maintenanceBody", BODY13, "greedy", "notice"], ["proposals.unavailableBody", BODY13, "greedy", "empty"],
    ["agent.applyRefused", BODY13, "greedy", "notice"], ["agent.stateAgentPaused", BODY13, "greedy", "notice"], ["agent.stateInProgress", BODY13, "greedy", "notice"],
    ["agent.stateUnderReview", BODY13, "greedy", "notice"], ["agent.stateTerminal", BODY13, "greedy", "notice"], ["agent.stateRejected", BODY13, "greedy", "notice"],
    ["agent.stateKycFix", BODY13, "greedy", "notice"], ["agent.stateKycPending", BODY13, "greedy", "notice"], ["agent.stateKycPhotos", BODY13, "greedy", "notice"],
    ["agent.dashPausedBody", BODY13, "greedy", "notice"], ["wallet.returnPendingWarnBody", CAPTION11, "greedy", "notice"], ["dialog.busyHolding", CAPTION11, "greedy", "notice"],
    ["market.notifUnsupported", CAPTION11, "greedy", "notice"], ["market.notifBlocked", CAPTION11, "greedy", "notice"], ["market.objIntro", CAPTION11, "greedy", "notice"],
    ["dialog.freeExitExplain", CAPTION11, "greedy", "notice"], ["dialog.earlyExitExplain", CAPTION11, "greedy", "notice"], ["kycNotice.body", BODY13, "greedy", "notice"],
    ["kycNotice.bodyEmail", BODY13, "greedy", "notice"], ["kycNotice.bodyBoth", BODY13, "greedy", "notice"], ["wallet.payoutsDelayedBody", BODY13, "greedy", "notice"],
    ["wallet.payoutsUnavailableBody", BODY13, "greedy", "notice"], ["auth.signedOutBody", BODY13, "greedy", "notice"], ["auth.sessionEndedBody", BODY13, "greedy", "notice"],
    ["auth.sessionIdleBody", BODY13, "greedy", "notice"], ["wallet.securedBody", BODY13, "balance", "notice"], ["wallet.taxBody", BODY13, "balance", "notice"],
    ["wallet.depositPausedBody", BODY13, "balance", "empty"], ["kycGate.frozenBody", BODY13, "greedy", "notice"],
  ];
  let cells = 0, tornBefore = 0, tornAfter = 0, overAfter = 0, widest = 0, aloneAfter = 0, aloneBefore = 0;
  const bad: string[] = [];
  for (const [k, ty, mode, how] of TEXTS) for (const l of LOCALES) {
    const s = word(l, k).replace(new RegExp("[{]pct[}]", "g"), "5");
    const node = est.noticeBody(s, { centred: how === "empty" });
    for (const lv of leaves(node)) if (lv.nowrap) widest = Math.max(widest, width(lv.text, ty));
    for (let W = NARROWEST; W <= 1000; W += 2) {
      cells++;
      const b = layout(s, ty, W, mode), a = layout(node, ty, W, mode);
      if (torn(b.lines)) tornBefore++;
      if (torn(a.lines)) { tornAfter++; bad.push(`${l} ${k} @${W}: ${show(a.lines)}`); }
      if (a.over && !b.over) { overAfter++; bad.push(`OVER ${l} ${k} @${W}`); }
      // A last line of one word, where the sentence has spaces to keep it company (Chinese breaks between ideographs).
      const lone = (ls: string[]) => l !== "zh" && ls.length > 1 && !ls[ls.length - 1].includes(" ");
      if (lone(b.lines)) aloneBefore++;
      if (lone(a.lines)) { aloneAfter++; bad.push(`ALONE ${l} ${k} @${W}: ${show(a.lines)}`); }
    }
  }
  ok(`9.6 · ${TEXTS.length} routed texts in three languages at every measure from ${NARROWEST} to 1000px (${cells} cells): no possessive torn, no line over its measure, no last word alone; the widest held run is ${widest.toFixed(1)}px, under the narrowest measure (${NARROWEST}px)`,
    NARROWEST === 180 && tornAfter === 0 && overAfter === 0 && aloneAfter === 0 && widest < NARROWEST, bad.slice(0, 6).join(" | "));
  ok(`9.6′ CONTROL · drawn raw, as round 9 drew them, ${tornBefore} of those cells tore a phrase and ${aloneBefore} left a word alone`, tornBefore > 500 && aloneBefore > 0, String([tornBefore, aloneBefore]));
  // 9.7 · the record: each routed body's lines at 320 / 360 / 390 / 412 / 1280 where its measure is the page's own (the
  // nested ones are proven by 9.6 at every measure). Measures: a reading page's content is vw − 32 (1016 at 1280), a
  // form's (576 at 1280); a Callout md's body is its box less 75 (2 + 2×20 + 17 + 16), a FeatureStateBanner's less 83
  // (99 from 1024), a dialog's (bet / sell 440, objection 460) min(vw − 32, max) − 2 − 2×24 (2×32 from 1024) − 58.
  const page = (vw: number, tier: number) => (vw < 1024 ? vw - 32 : Math.min(vw, tier) - 64);
  const dialog = (vw: number, max: number) => Math.min(vw - 32, max) - 2 - (vw < 1024 ? 48 : 64) - 58;
  const SURF: Array<[string, string[], Type, "greedy" | "balance", (vw: number) => number]> = [
    ["the /proposals banner", ["proposals.comingSoonBody", "proposals.maintenanceBody"], BODY13, "greedy", (vw) => page(vw, 1080) - (vw < 1024 ? 83 : 99)],
    ["the /agent notices", ["agent.applyRefused", "agent.stateInProgress", "agent.stateKycPhotos"], BODY13, "greedy", (vw) => page(vw, 1080) - 75],
    ["the payout notice (/wallet/withdraw)", ["wallet.payoutsDelayedBody", "wallet.payoutsUnavailableBody"], BODY13, "greedy", (vw) => page(vw, 640) - 75],
    ["the bet confirm's busy note", ["dialog.busyHolding"], CAPTION11, "greedy", (vw) => dialog(vw, 440)],
    ["the sell confirm's note", ["dialog.freeExitExplain", "dialog.earlyExitExplain"], CAPTION11, "greedy", (vw) => dialog(vw, 440)],
    ["the objection dialog's intro", ["market.objIntro"], CAPTION11, "greedy", (vw) => dialog(vw, 460)],
  ];
  const changed: string[] = [];
  let surfCells = 0, surfTorn = 0, surfOver = 0;
  for (const [name, keys, ty, mode, Wof] of SURF) for (const k of keys) for (const l of LOCALES) for (const vw of [320, 360, 390, 412, 1280]) {
    surfCells++;
    const s = word(l, k), W = Wof(vw);
    const b = layout(s, ty, W, mode), a = layout(est.noticeBody(s), ty, W, mode);
    if (torn(a.lines)) surfTorn++;
    if (a.over) surfOver++;
    if (show(a.lines) !== show(b.lines)) changed.push(`${name} · ${k} · ${l} ${vw} (${W}px): "${show(b.lines)}" → "${show(a.lines)}"`);
  }
  console.log(`${NL}  ── the record: the cells whose lines change (${changed.length} of ${surfCells}) ──`);
  for (const c of changed) console.log(`     ${c}`);
  ok(`9.7 · the record at 320 / 360 / 390 / 412 / 1280 on the page-level surfaces (${surfCells} cells): ${changed.length} change, every one holding a phrase the raw text tore or set alone; none torn, none over`,
    surfTorn === 0 && surfOver === 0 && changed.length > 0);
}

/* ══ §10 · R10-D · A STRIP NEVER ENDS ON A GAP ═══════════════════════════════════════════════════════════════════════════ */
section("10 · R10-D a scrolling strip always shows a word being cut where it hides something (tiles 171 204)");
{
  const ss = (await import("../src/lib/strip-scroll.ts")) as {
    STRIP_FADE: { endInset: number; endRamp: number; startInset: number; startRamp: number }; STRIP_PEEK: number; STRIP_PEEK_REST_MS: number;
    stripPeekCut: (o: { items: Array<{ left: number; right: number; pressed?: boolean }>; scrollLeft: number; clientWidth: number; scrollWidth: number }) => { end: number; start: number };
    STRIP_CUT: { bite: number; endRamp: number; startRamp: number };
  };
  // The fade's numbers are the stylesheet's.
  const twice = (decl: string) => CSS.split(`-webkit-${decl}`).length === 2 && CSS.split(decl).length === 3;
  ok(`10.1 · the fade's geometry is the stylesheet's: transparent ${ss.STRIP_FADE.endInset}px inside the trailing edge after a ${ss.STRIP_FADE.endRamp}px ramp, transparent ${ss.STRIP_FADE.startInset}px inside the leading edge before a ${ss.STRIP_FADE.startRamp}px ramp — each end moved in by its published cut`,
    // Each gradient twice: the prefixed property and the standard one.
    twice("mask-image: linear-gradient(to right, #000 calc(100% - 8px - var(--strip-ramp-end, 64px) - var(--strip-cut-end, 0px)), transparent calc(100% - 8px - var(--strip-cut-end, 0px)));")
      && twice("mask-image: linear-gradient(to right, transparent calc(12px + var(--strip-cut-start, 0px)), #000 calc(12px + var(--strip-ramp-start, 32px) + var(--strip-cut-start, 0px)));")
      && twice("mask-image: linear-gradient(to right, transparent calc(12px + var(--strip-cut-start, 0px)), #000 calc(12px + var(--strip-ramp-start, 32px) + var(--strip-cut-start, 0px)), #000 calc(100% - 8px - var(--strip-ramp-end, 64px) - var(--strip-cut-end, 0px)), transparent calc(100% - 8px - var(--strip-cut-end, 0px)));")
      && CSS.includes("scroll-padding-inline: calc(12px + var(--strip-ramp-start, 32px) + var(--strip-cut-start, 0px)) calc(8px + var(--strip-ramp-end, 64px) + var(--strip-cut-end, 0px));") && CSS.includes('@property --strip-ramp-end { syntax: "<length>"; inherits: false; initial-value: 64px; }') && CSS.includes('@property --strip-ramp-start { syntax: "<length>"; inherits: false; initial-value: 32px; }')
      && ss.STRIP_FADE.endInset === 8 && ss.STRIP_FADE.endRamp === 64 && ss.STRIP_FADE.startInset === 12 && ss.STRIP_FADE.startRamp === 32);
  // Tile 171 (sw 390): the /results lenses, laid out by their own metrics — a pill is 16 + its word (Inter 600 13px) + 8 +
  // its count (JetBrains Mono 11px, 0.6em a digit) + 16, inside a 1px border; 4px apart; the strip's first pill at 12.
  const m = FONT("Inter-Medium"), b = FONT("Inter-Bold");
  const w600 = (s: string) => Array.from(s).reduce((a, ch) => a + ((m.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / m.unitsPerEm + b.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / b.unitsPerEm) / 2) * 13, 0);
  const pill = (wordText: string, count: string) => 2 + 16 + w600(wordText) + 8 + count.length * 0.6 * 11 + 16;
  const lenses: Array<[string, string]> = [["Zote", "6"], ["NDIO", "3"], ["HAPANA", "2"], ["Imebatilishwa", "1"]];
  const items: Array<{ left: number; right: number; pressed?: boolean }> = [];
  let x = 12;
  for (const [wd, n] of lenses) { const w = pill(wd, n); items.push({ left: x, right: x + w, pressed: wd === "Zote" }); x += w + 4; }
  // The strip's padding box starts at x4 on the screen (16 gutter − 12 margin) and ends where the row's 16px gap before the
  // count begins: the count's ink at x319 on the tile, less its 0.6px side bearing — the clip at x302.4, 298.4 in the strip.
  const clip = 319 - 0.6 - 16, W = clip - 4;
  const cut = ss.stripPeekCut({ items, scrollLeft: 0, clientWidth: W, scrollWidth: x - 4 + 12 });
  const fadeEnd = W - ss.STRIP_FADE.endInset - cut.end;
  ok(`10.2 · tile 171 reproduced: the lenses' words fall where the tile has them (NDIO from x${(items[1].left + 4 + 17).toFixed(1)}, measured 115; HAPANA from x${(items[2].left + 4 + 17).toFixed(1)}, measured 200), and the fourth lens's word would start at x${(items[3].left + 4 + 17).toFixed(1)}, past the clip at x${clip.toFixed(1)}; the fade's end now moves in ${cut.end.toFixed(1)}px to x${(fadeEnd + 4).toFixed(1)}, the middle of “HAPANA 2” (x${(items[2].left + 4).toFixed(0)}–${(items[2].right + 4).toFixed(0)}), so that word is cut under the ramp`,
    Math.abs(items[1].left + 4 + 17 - 115) < 2 && Math.abs(items[2].left + 4 + 17 - 200) < 2 && items[3].left + 17 > W && cut.end > 0
      && near(fadeEnd, items[2].right - ss.STRIP_CUT.bite, 0.01) && cut.start === 0, j({ items, W, cut }));
  ok("10.2′ CONTROL · as round 9 drew it (no cut) the transparent end fell on the hidden lens's border and padding, before its first letter, and the ramp lay over HAPANA's count — no word cut",
    items[3].left + 17 > W - ss.STRIP_FADE.endInset && items[2].right < W - ss.STRIP_FADE.endInset && items[2].right > W - ss.STRIP_FADE.endInset - ss.STRIP_FADE.endRamp);
  // Every geometry: random strips (pills 40–160px, gaps 4–16px, widths 160–700px, every scroll position): after the cut the
  // trailing fade's transparent end lies inside a word's pill — or the first hidden pill already shows PEEK of itself — and
  // the pressed pill is never the one cut; nothing is cut when nothing is hidden.
  let rnd = 20261011;
  const rand = () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return rnd / 2147483648; };
  let trials = 0, gapsLeft = 0, pressedCut = 0, idleCut = 0, startBad = 0;
  for (let t = 0; t < 6000; t++) {
    const n = 2 + Math.floor(rand() * 9), its: Array<{ left: number; right: number; pressed?: boolean }> = [];
    let px = 12;
    const pressedAt = Math.floor(rand() * n);
    for (let i = 0; i < n; i++) { const w = 40 + rand() * 120; its.push({ left: px, right: px + w, pressed: i === pressedAt }); px += w + 4 + rand() * 12; }
    const sw = px + 12, cw = 160 + rand() * 540;
    const max = Math.max(0, sw - cw), sl = rand() < 0.5 ? 0 : Math.round(rand() * max);
    const c = ss.stripPeekCut({ items: its, scrollLeft: sl, clientWidth: cw, scrollWidth: sw });
    trials++;
    const hiddenRight = sl + cw < sw - 1, hiddenLeft = sl > 1;
    if (!hiddenRight && c.end > 0) idleCut++;
    if (!hiddenLeft && c.start > 0) idleCut++;
    if (hiddenRight) {
      const r = sl + cw - ss.STRIP_FADE.endInset - c.end;
      const k = its.findIndex((it) => it.right > sl + cw - ss.STRIP_FADE.endInset);
      const peeks = k >= 0 && its[k].left <= sl + cw - ss.STRIP_FADE.endInset - ss.STRIP_PEEK;
      const inWord = its.some((it) => it.left + 1e-9 < r && r < it.right - 1e-9);
      if (!peeks && !inWord && k > 0 && !its[k - 1].pressed) gapsLeft++;
      if (c.end > 0 && its.some((it) => it.pressed && it.left < r && r < it.right)) pressedCut++;
    }
    if (hiddenLeft && c.start > 0) {
      const l = sl + ss.STRIP_FADE.startInset + c.start;
      if (!its.some((it) => it.left < l && l < it.right && !it.pressed)) startBad++;
    }
  }
  ok(`10.3 · ${trials} strips of every shape: the trailing fade never ends on a gap (${gapsLeft}), never cuts the pressed lens (${pressedCut}), never moves where nothing is hidden (${idleCut}); a leading cut always lands in a word (${startBad} misses)`,
    gapsLeft === 0 && pressedCut === 0 && idleCut === 0 && startBad === 0);
  // ⭐ Round 10's read (reader 6): the first draft cut at the item's MIDDLE under the 64px ramp — "Won" kept ≤20% of its
  // ink. Now the cut bites the item's END under a shorter ramp: a pill's word (16px of padding in) keeps its first letter
  // at ≥ 55% ink, for every pill from 52px wide (the shortest lens: a 2–3-letter word, 16px of padding each side).
  const inkAt = (x: number, transparentAt: number, ramp: number) => Math.max(0, Math.min(1, (transparentAt - x) / ramp));
  let unreadable = 0, worst = 1;
  for (let w = 52; w <= 160; w += 2) {
    const right = 300, left = right - w, transparentAt = right - ss.STRIP_CUT.bite;
    const first = inkAt(left + 17, transparentAt, ss.STRIP_CUT.endRamp), tenth = inkAt(left + 27, transparentAt, ss.STRIP_CUT.endRamp);
    worst = Math.min(worst, first);
    if (first < 0.55) unreadable++; void tenth;
  }
  const draft = (w: number) => inkAt(300 - w + 17, 300 - w / 2, ss.STRIP_FADE.endRamp);
  ok(`10.6 · a cut word keeps its first letters: on every pill 52–160px wide the first letter keeps ≥ 55% ink (worst ${(worst * 100).toFixed(0)}%) — the first draft (middle, 64px ramp) kept ${(draft(52) * 100).toFixed(0)}% on a 52px pill`,
    unreadable === 0 && draft(52) < 0.25 && ss.STRIP_CUT.endRamp < ss.STRIP_FADE.endRamp && ss.STRIP_CUT.startRamp < ss.STRIP_FADE.startRamp);

  const SA = "src/components/ui/strip-autoscroll.tsx";
  ok("10.4 · StripAutoScroll publishes the cut wherever the strip rests — the layout phase, its own frame, a resize, the fonts landing, focus moving — from the strip's own items (the lens the reader is on by aria-pressed / aria-current / :focus-within), and clears it when there is none",
    has(SA, "markPeek(rail, scrolling);") && has(SA, "const cut = stripPeekCut({ items, scrollLeft: rail.scrollLeft, clientWidth: rail.clientWidth, scrollWidth: rail.scrollWidth });")
      && has(SA, 'pressed: el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-current") === "page" || el.matches(":focus-within"),') && has(SA, "else rail.style.removeProperty(name);")
      && has(SA, 'for (const [name, v] of [["--strip-cut-end", end], ["--strip-cut-start", start], ["--strip-ramp-end", end > 0 ? STRIP_CUT.endRamp : 0], ["--strip-ramp-start", start > 0 ? STRIP_CUT.startRamp : 0]] as const) {')
      && has(SA, 'rail.addEventListener("focusin", () => markPeek(rail));') && has(SA, 'rail.addEventListener("focusout", () => markPeek(rail));'));
  // 10.5 · the cut never jumps under the reader's finger. Read on every scroll position of tile 171's strip (1px steps), the
  // fade's transparent end (in the strip's own box) jumps each time the rule switches — so the cut is lifted while the strip
  // scrolls and read where it rests, and the two lengths are registered, so each change slides.
  const SW171 = x - 4 + 12;
  let prevEnd = Number.NaN, jumps = 0, maxJump = 0;
  for (let sl = 0; sl <= SW171 - W; sl += 1) {
    const c = ss.stripPeekCut({ items, scrollLeft: sl, clientWidth: W, scrollWidth: SW171 });
    const endAt = W - ss.STRIP_FADE.endInset - c.end;
    if (!Number.isNaN(prevEnd) && Math.abs(endAt - prevEnd) > 2) { jumps++; maxJump = Math.max(maxJump, Math.abs(endAt - prevEnd)); }
    prevEnd = endAt;
  }
  const flat = squash(CSS);
  ok(`10.5 · the cut never jumps under the reader's finger: read on every scroll, tile 171's strip would jump its fade's end ${jumps} time(s), by up to ${maxJump.toFixed(1)}px — so it is lifted while the strip scrolls (never on its own frame), read where it rests (${ss.STRIP_PEEK_REST_MS}ms after the last scroll), and slides: two registered lengths, a ladder transition switched on at the reader's first scroll (no first paint animates)`,
    jumps >= 1 && maxJump > ss.STRIP_PEEK && ss.STRIP_PEEK_REST_MS === 150
      && has(SA, 'rail.addEventListener("scroll", () => markEdges(rail, true), { passive: true });')
      && has(SA, "if (peekReadAt.get(rail) === rail.scrollLeft) return;") && has(SA, 'if (!rail.hasAttribute("data-peek-live")) rail.setAttribute("data-peek-live", "");')
      && has(SA, "publishCut(rail, 0, 0);") && has(SA, "peekRest.set(rail, window.setTimeout(() => { peekRest.delete(rail); markPeek(rail); }, STRIP_PEEK_REST_MS));")
      && has(SA, "if (peekRest.has(rail)) return;")
      && flat.includes('@property --strip-cut-end { syntax: "<length>"; inherits: false; initial-value: 0px; }')
      && flat.includes('@property --strip-cut-start { syntax: "<length>"; inherits: false; initial-value: 0px; }')
      && flat.includes(".kp-strip-fade[data-peek-live] { transition: --strip-cut-end var(--t-base) var(--m-glide), --strip-cut-start var(--t-base) var(--m-glide), --strip-ramp-end var(--t-base) var(--m-glide), --strip-ramp-start var(--t-base) var(--m-glide); }"),
    j({ jumps, maxJump }));
  ok("10.5′ PLANT · the listener as first drafted (every scroll read at once) is reported",
    !squash(code(SA).replace("() => markEdges(rail, true)", "() => markEdges(rail)")).includes("() => markEdges(rail, true)"));
  // ⭐ REGISTERED BY THE VODACOM PLAN S7 (WP7, 2026-10-12): the journey home's topic chips are a scrolling strip of the
  // home's own class — the one fade (`kp-strip-fade`) and the one hook (`data-strip-autoscroll`; StripAutoScroll comes
  // through the home's lazy module) — because QUERY_STRIP_CLASS lives in query-bar.tsx, whose import would bring its
  // client parts into every visitor's first load of `/` (S7-PLAN Risk 5, §0h point 20), and because the canvas's rail
  // bleeds to the screen's edge with nothing beside it (WP7 step 2 item 3); its ghost draws the same strip (A17 item 3).
  const STRIP_FILES: Record<string, string> = {
    "src/components/ui/query-bar.tsx": "the one class",
    "src/components/journey/home/home-chips.tsx": "the journey home's chips: the fade, the hook",
    "src/components/journey/home/journey-home-ghost.tsx": "the journey home's ghost: its chips' strip, aria-hidden",
    "src/app/leaderboard/page.tsx": "the leaderboard product tabs use the same fade and StripAutoScroll hook",
  };
  const holders = PLAYER_TSX.filter((f) => code(f).includes("kp-strip-fade"));
  const stripsOk = (files: string[]) => files.every((f) => f in STRIP_FILES);
  ok("10.4′ · every scrolling strip is one of these: the one class (`QUERY_STRIP_CLASS`), the one hook (`data-strip-autoscroll`) — /results, /wallet, /markets, /positions, /updown history, /proposals, /watchlist, /notifications, receipts — and the journey home's chips, registered with the hook (S7 WP7)",
    code("src/components/ui/query-bar.tsx").includes('"kp-thin-scroll kp-strip-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-2 lg:flex-wrap lg:overflow-visible lg:pr-0"')
      && stripsOk(holders) && squash(code("src/components/journey/home/home-chips.tsx")).includes('data-filter-rail data-strip-autoscroll className="kp-thin-scroll kp-strip-fade kp-jhome__chips"')
      && /<nav className="kp-thin-scroll kp-strip-fade[^\"]*"[^>]*data-strip-autoscroll>\s*<StripAutoScroll \/>/.test(code("src/app/leaderboard/page.tsx")),
    j(holders.filter((f) => !(f in STRIP_FILES))));
  ok("10.4″ PLANT · the strip class typed in a player file nobody registered is reported", !stripsOk([...holders, "src/components/home/landing-hero.tsx"]));
  const plantCut = ss.stripPeekCut({ items: items.map((it) => ({ ...it, pressed: true })), scrollLeft: 0, clientWidth: W, scrollWidth: x - 4 + 12 });
  ok("10.3′ CONTROL · with the pill before the hidden one pressed, the cut stays off it (the active lens is never faded)", plantCut.end === 0);
}

/* ══ §11 · NO DICTIONARY WORD CHANGED ════════════════════════════════════════════════════════════════════════════════════ */
section("11 · composition only: the dictionary is the commit's, byte for byte");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).split(CR).join(""); } catch { head = "‹git unavailable›"; }
  ok("11.1 · src/lib/i18n-dict.ts is the commit's own", head === raw("src/lib/i18n-dict.ts"));
}

section("9b · R10-B the Up & Down empty-side note holds \"dau lako\" / \"your stake\" (round 10's read, tile 166) — all three panels");
{
  const SITES: Array<[string, string]> = [
    ["src/components/updown/updown-stake-controls.tsx", "<span>{noticeBody(emptyCopy)}</span>"],
    ["src/components/updown/round-stake-panel.tsx", "<span>{noticeBody(warnCopy)}</span>"],
    ["src/components/updown/updown-card.tsx", "<span>{noticeBody(outEmptyCopy)}</span>"],
  ];
  const raw9b = SITES.filter(([f, s]) => !has(f, s));
  ok("9b.1 · the note is drawn through noticeBody in the stake controls, the round panel and the board card — never raw", raw9b.length === 0, raw9b.map(([f]) => f).join(" | "));
  const mk = (l: Loc) => String(((DICT[l] as Record<string, Record<string, string>>).market.udNobodyBacked) ?? "").replace("{side}", String((DICT[l] as Record<string, Record<string, string>>).market.udDown));
  const sw = render(h("p", null, est.noticeBody(mk("sw")) as never));
  const en = render(h("p", null, est.noticeBody(mk("en")) as never));
  ok("9b.2 · rendered, sw holds \"dau lako\" (with its last-words tail: \"dau lako litarudi.\") and en \"your stake\" inside one unbreakable run each", /<span class="whitespace-nowrap">[^<]*dau lako[^<]*<\/span>/.test(sw) && /<span class="whitespace-nowrap">[^<]*your stake[^<]*<\/span>/.test(en), JSON.stringify([sw.slice(0, 260), en.slice(0, 200)]));
  const plant = raw("src/components/updown/updown-card.tsx").replace("<span>{noticeBody(outEmptyCopy)}</span>", "<span>{outEmptyCopy}</span>");
  ok("9b.1′ PLANT · the board card drawing its note raw is reported by 9b.1", !squash(decomment(plant)).includes(squash("<span>{noticeBody(outEmptyCopy)}</span>")));
}

section("12 · R10-C /updown's chart is drawn again after its rebuild — the board widened past 1024px (tiles 164)");
{
  const TC = "src/components/charts/terminal-chart.tsx";
  // The rule as a predicate over a source, so a planted regression is judged by the very check.
  const drawsEveryBuild = (src: string) => {
    const s = squash(decomment(src));
    const keyed = s.includes("useEffect(() => { if (feed && engineGen > 0) draw(feed); }, [feed, engineGen, draw]);");
    const counts = s.includes("setEngineGen((g) => g + 1);");
    const noReset = !/setEngineGen\(\s*0\s*\)|setEngineReady\(\s*false\s*\)/.test(s);
    const rebuildsOnHeight = /\}, \[height\]\);/.test(s);
    return keyed && counts && noReset && rebuildsOnHeight;
  };
  const src = raw(TC);
  ok("12.1 · the draw effect keys on the chart's BUILD GENERATION and every build counts it up — a rebuild (300 → 380 when the board widens) is always drawn, never batched to \"unchanged\"", drawsEveryBuild(src));
  const flag = src.replace("const [engineGen, setEngineGen] = useState(0);", "const [engineReady, setEngineReady] = useState(false);").replace("setEngineGen((g) => g + 1);", "setEngineReady(true);").replace("useEffect(() => { if (feed && engineGen > 0) draw(feed); }, [feed, engineGen, draw]);", "useEffect(() => { if (feed && engineReady) draw(feed); }, [feed, engineReady, draw]);");
  ok("12.1′ PLANT · the old true/false flag (cleared by the cleanup, set by the build, batched to unchanged) is reported by 12.1", flag !== src && !drawsEveryBuild(flag));
}

console.log(`${NL}visual-pass-r10: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log(`${NL}FAILURES:`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
