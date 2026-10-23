/**
 * ROUND 9 OF THE VISUAL PASS, FIXER A (2026-10-11) — EDGES AND GLYPHS: a glyph's ink sits where its row says, and every
 * sign-out draws a sign-out. Rounds 7–8's read (333 tiles; S/r78/read/triage.md, "R9-A"): R7-F1 the hub's podium glyph
 * 2px low, R8-F1 every sign-out drawing a sign-in, R8-D3 the Toka box 2px short, the edge-icon family (R2-F2 the card's
 * "Maelezo ›", R4-D6 the Wallet's "Risiti zote ›", R2-D5 the deposit head's glyph, R2-F1 the held capsule), three readers'
 * 8px YES/NO pair on the card (R1-D6 R2-D3 R4-D1), and R5's one-sided dashed track ending on a 2px stub (tile 194).
 *
 *   npx tsx scripts/visual-pass-r9a.test.mts        (npm run test:visual-pass-r9a)
 *
 *   §1 A1 every glyph's drawing centred in its box, and inside it — the podium, then the whole family
 *   §2 A2 logOut is a log-out: the door's bracket on the left, the arrow leaving it
 *   §3 A3 the Toka box is a one-row card's height
 *   §4 A4 the edge-icon rule — the engine against this file's own reading of each drawing, the stems against the fonts, the
 *         two eyebrow slots, and every edge mark and eyebrow glyph on a player surface classified
 *   §5 A5 one 12px gap for a pair of buttons, and the card's labels still fit at 320
 *   §6 A6 every dashed track starts and ends on a whole dash
 *   §7 no dictionary word changed
 * The owner's rules (Ali): only perfect visual and logical results; consistency and perfection in each move — a finding is
 * fixed with every sibling it has. Each check stands beside a control or a planted defect.
 * ⛔ It reads, renders and computes in memory; it writes nothing. The on-disk mutation proof is S/r9/a/mutation-r9a.mjs (S =
 * the session scratchpad).
 * ⚠️ This file holds no backslash: every pattern that needs a space, a newline or a special character is built from
 * character codes and bracket classes (the editing tools turn some escapes into control characters).
 *
 * ⭐ RE-POINTED IN THE OPEN 2026-10-17 — PHOSPHOR-MIGRATION W2 (Ali: "Switch to Phosphor"; docs/PHOSPHOR-MIGRATION.md).
 * The drawings this file read from glyphs.tsx's hand-drawn entries are Phosphor's now, shipped as symbols. Every rule
 * stays and reads the drawing that ships (`scripts/lib/glyph-drawings.mts`) with this file's own reader, on the 256 grid
 * and in the weight the size draws (R-WEIGHT: Bold to 26px, Regular from 27px); filled outlines carry no stroke to widen
 * by. The controls and plants that hold the hand-drawn defects (the podium, the coins, the headset, the flame, the sign-
 * out) keep those drawings verbatim on their 24 grid: they prove the reader still sees the defect. What moved: §1.3 names
 * the drawings Phosphor centres by their mass, not their box (its own optical centring); §2 reads the sign-out's door and
 * arrow from its outline, and logIn is retired; §4.2 holds the sprite markup; §4.6 names the one outcome glyph whose ink
 * starts nearer its box; §6.6 has one dashed ring left, the dial's.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { GLYPH_ENTRIES, drawingOf, lineVariant, shippedDrawings, shipsIn, type GlyphVariant } from "./lib/glyph-drawings.mts";

const req = createRequire(import.meta.url);
const CR = String.fromCharCode(13), NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
const QUOTE = String.fromCharCode(34), BACKTICK = String.fromCharCode(96);
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
const j = (v: unknown) => JSON.stringify(v);
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.split(String.fromCharCode(92)).join("/")] : [];
});
/** Player surfaces: everything but the console, the API, the server and the marketing engine (R6-C's population). */
const OUT = new RegExp("^src/(?:app/admin|components/admin|app/api|lib/server|lib/marketing)/");
const PLAYER_TSX = walk("src", new RegExp("[.]tsx$")).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));
/** A stylesheet rule's body by its exact selector (the first one). */
const rule = (sel: string) => {
  const at = CSS.indexOf(`${sel} {`);
  if (at < 0) return "";
  return CSS.slice(at + sel.length + 2, CSS.indexOf("}", at));
};
const tokenPx = (name: string) => Number(new RegExp(`${name}:${WS}*([0-9.]+)px`).exec(CSS)?.[1] ?? NaN);

/* ── the world the components render in ────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type GlyphFn = (p: Record<string, unknown>) => import("react").ReactElement;
const glyphs = req("../src/components/ui/glyphs.tsx") as {
  I: Record<string, GlyphFn>;
  GLYPH_STEM: Record<string, number>;
  edgeGlyph: (n: unknown, e: "start" | "end") => unknown;
};
const { I, GLYPH_STEM } = glyphs;
const render = (el: unknown) => renderToStaticMarkup(el as import("react").ReactElement);

/* ══ AN INDEPENDENT READING OF A DRAWING — this file's own path reader (sampled curves and arcs), never the engine's ══ */
type Pt = [number, number];
type Sub = { verts: Pt[]; samples: Pt[]; arc: boolean };
const NUM = new RegExp("[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?", "y");
function parsePath(d: string): Sub[] {
  const subs: Sub[] = [];
  let i = 0, cmd = "", last = "", x = 0, y = 0, sx = 0, sy = 0, kx = 0, ky = 0;
  let cur: Sub = { verts: [], samples: [], arc: false };
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
    else if (up === "M") { x = ox + num(); y = oy + num(); sx = x; sy = y; cur = { verts: [[x, y]], samples: [[x, y]], arc: false }; subs.push(cur); }
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
      cur.arc = true;
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
type Part = { tag: string; box: { x0: number; y0: number; x1: number; y1: number }; w: number; own: boolean; d?: string };
const attrs = (s: string) => Object.fromEntries([...s.matchAll(new RegExp('([A-Za-z][A-Za-z0-9-]*)="([^"]*)"', "g"))].map((m) => [m[1], m[2]]));
const ELEM = new RegExp("<(path|circle|rect|line|ellipse|polyline)([^>]*?)/?>", "g");
/** A drawing's parts, from its markup: each part's geometry box and its stroke — its own (`stroke-width`, or JSX's
 *  `strokeWidth`), the wrapper's (`base`: the hand-drawn family's G stroked every part at 1.9 on its 24 grid), or none (a
 *  fill). A shipped Phosphor symbol is filled outlines, read with base 0; the house extras stroke their own parts. */
function partsOfMarkup(body: string, base = 1.9): Part[] {
  return [...body.matchAll(ELEM)].map((m) => {
    const a = attrs(m[2]);
    let pts: Pt[] = [];
    const n = (k: string) => Number(a[k] ?? 0);
    if (m[1] === "path") pts = parsePath(a.d).flatMap((s) => s.samples);
    else if (m[1] === "circle") pts = [[n("cx") - n("r"), n("cy") - n("r")], [n("cx") + n("r"), n("cy") + n("r")]];
    else if (m[1] === "ellipse") pts = [[n("cx") - n("rx"), n("cy") - n("ry")], [n("cx") + n("rx"), n("cy") + n("ry")]];
    else if (m[1] === "rect") pts = [[n("x"), n("y")], [n("x") + n("width"), n("y") + n("height")]];
    else if (m[1] === "line") pts = [[n("x1"), n("y1")], [n("x2"), n("y2")]];
    else { const v = (a.points ?? "").split(new RegExp("[ ,]+")).filter(Boolean).map(Number); for (let k = 0; k < v.length; k += 2) pts.push([v[k], v[k + 1]]); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const width = a.strokeWidth ?? a["stroke-width"];
    const stroked = a.stroke ? a.stroke !== "none" : base > 0;
    return { tag: m[1], box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, w: stroked ? Number(width ?? base) : 0, own: width != null || !stroked, d: a.d };
  });
}
const inkBox = (parts: Part[]) => ({
  x0: Math.min(...parts.map((q) => q.box.x0 - q.w / 2)), y0: Math.min(...parts.map((q) => q.box.y0 - q.w / 2)),
  x1: Math.max(...parts.map((q) => q.box.x1 + q.w / 2)), y1: Math.max(...parts.map((q) => q.box.y1 + q.w / 2)),
});
/** A glyph's parts as the family ships it (scripts/lib/glyph-drawings.mts): the drawing its size draws — Bold to 26px,
 *  Regular from 27px — on the 256 grid, filled (no stroke to widen by), or the house extra's own strokes. */
const GRID = 256;
const partsOf = (name: string, s: number) => partsOfMarkup(drawingOf(name, lineVariant(s)) ?? "", 0);
/** A box's geometry, by this file's reader. */
const geometry = (d: string) => {
  const pts = parsePath(d).flatMap((q) => q.samples);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
/** A mark that stands among words, as it draws there: its centreline, stroked at the words' stem (not its own part), and
 *  any solid part (its own) — from the registry's `m`, read by this file's reader, never by its stored reach. */
const markParts = (name: string): Part[] => {
  const m = GLYPH_ENTRIES.get(name)?.mark;
  if (!m) return [];
  return [{ tag: "path", box: geometry(m.d), w: 0, own: false, d: m.d }, ...(m.f ? [{ tag: "path", box: geometry(m.f), w: 0, own: true, d: m.f }] : [])];
};

/* ══ §1 · A1 · A DRAWING IS CENTRED IN ITS BOX, AND INSIDE IT ══════════════════════════════════════════════════════════ */
section("1 · A1 every glyph's drawing centred in its box (the podium, R7-F1) and inside it (the coins' back coin)");
/** A drawing's ink centre against its box's centre, from its markup on its grid (`base`: the stroke of a part without its
 *  own — the hand-drawn family's 1.9, or 0 for a shipped symbol, filled). */
const centreOff = (body: string, grid: number, base = 1.9) => { const b = inkBox(partsOfMarkup(body, base)); return { dx: (b.x0 + b.x1) / 2 - grid / 2, dy: (b.y0 + b.y1) / 2 - grid / 2, b }; };
{
  const pod = centreOff(drawingOf("podium", lineVariant(20)) ?? "", GRID, 0);
  ok(`1.1 · the podium's drawing (Phosphor's ranking, Bold at the hub's 20px) is centred in its viewBox — ink y${pod.b.y0.toFixed(2)}–${pod.b.y1.toFixed(2)} of 256, centre (128, 128) (the hand-drawn one stood y8.05–21.45 of 24, 2.75 units low: 2.29px at 20px)`,
    near(pod.dx, 0, 1e-3) && near(pod.dy, 0, 1e-3) && near(pod.b.y0, 36, 1e-3) && near(pod.b.y1, 220, 1e-3), j(pod));
  const OLD_PODIUM = '<path d="M3.5 20.5h17"/><path d="M9 20.5V9h6v11.5"/><path d="M3.5 20.5v-6H9M20.5 20.5v-4.5H15"/>';
  ok("1.1′ CONTROL · the old drawing reads 2.75 units low by the same reader", near(centreOff(OLD_PODIUM, 24).dy, 2.75, 1e-6));
  // Its rows in the hub: a 56px rung centres a 20px glyph box, so a drawing centred in its box is centred on the row.
  const k20 = 20 / GRID;
  ok(`1.2 · on the hub's Leaderboard row (56px rung, 20px glyph) the ink centre falls on the row's centre — the hand-drawn one fell ${(2.75 * 20 / 24).toFixed(2)}px below (tile 262: ink y624–635, centre 630.0 in the row y600–655, centre 628.0)`,
    near(pod.dy * k20, 0, 1e-3) && near(2.75 * 20 / 24, 2.2917, 1e-3));

  // The census: every drawing the family ships within ONE grid unit of its box's centre (a 24th of the box: 0.83px at the
  // hub's 20px — the hub's other glyphs as the readers measured them) — but the drawings Phosphor sets by eye on its grid,
  // each named with the offset Phosphor drew it at. The house's own drawings (the extras) are box-centred, no exception.
  const U = GRID / 24;
  const PHOSPHOR_PLACED = "Phosphor's own placement — its designers set it on the grid by its mass, not its box — kept as drawn";
  const OPTICAL: Record<string, [dx: number, dy: number, why: string]> = {
    "playBare.bold": [24, 0, "a triangle, centred on its centroid (1.3′)"],
    "playBare.fill": [24, 0, "the same triangle, solid (the How-to card's plate, W2): centred on its centroid (1.3′)"],
    "bot.bold": [0, -12, PHOSPHOR_PLACED], "comment.bold": [0, 16, PHOSPHOR_PLACED], "crown.bold": [-0.01, -12.02, PHOSPHOR_PLACED],
    "gauge.bold": [0, -12, PHOSPHOR_PLACED], "gift.regular": [0, -12.01, PHOSPHOR_PLACED], "gift.bold": [0, -12.01, PHOSPHOR_PLACED],
    "lock.bold": [0, -12, PHOSPHOR_PLACED], "megaphone.bold": [12, -3.99, PHOSPHOR_PLACED],
    "politics.regular": [7.99, 12.09, PHOSPHOR_PLACED], "politics.bold": [8, 12.13, PHOSPHOR_PLACED],
    "shield.bold": [0, 12, PHOSPHOR_PLACED], "shieldAlert.bold": [0, 12, PHOSPHOR_PLACED], "shieldcheck.bold": [0, 12, PHOSPHOR_PLACED], "shieldcheck.regular": [0, 12, PHOSPHOR_PLACED],
    "sofGift.bold": [0, -12.01, PHOSPHOR_PLACED], "sofSalary.bold": [0, -14, PHOSPHOR_PLACED], "unlock.bold": [0, -12, PHOSPHOR_PLACED],
    // MASWALI-BUILD S5 (2026-10-17): Millionea's How to play, Phosphor's book-open-text, which Phosphor draws 16 units low in
    // its Bold, as it draws comment.bold — measured at the merge of W2 (ca1febdc), kept as drawn.
    "howTo.bold": [0, 16, PHOSPHOR_PLACED],
    // PHOSPHOR-MIGRATION W3 (R-INDICATOR 3B): the admin sidebar's destinations ship their Fill, and two new console keys
    // are drawn off their box the same way — each offset read from Phosphor's own path data (the box's extremes are line
    // ends and arc tops), the same family as the entries above: the robot's antenna, the bubble's tail, the bow's loops,
    // the megaphone's mouth, the shield's point; the path's end-dot (journey); and the lock-key's shackle (roles, since W3's review), as lock.bold's.
    "bot.fill": [0, -12, PHOSPHOR_PLACED], "comment.fill": [0, 16, PHOSPHOR_PLACED], "gift.fill": [0, -12.01, PHOSPHOR_PLACED],
    "megaphone.fill": [12.21, -3.98, PHOSPHOR_PLACED], "shieldAlert.fill": [0, 12, PHOSPHOR_PLACED],
    "journey.bold": [0, 12, PHOSPHOR_PLACED], "roles.bold": [0, -12, PHOSPHOR_PLACED], "roles.fill": [0, -12, PHOSPHOR_PLACED],
    // PHOSPHOR-MIGRATION W4 (release 1): status in Fill ships the lock's and the shield-check's solid drawings (a break's
    // notice, a verified flag), each at its Bold's offset; and two new player keys — the activity page's net (plus-minus:
    // the plus over the minus, 12 units high) and the chat's send (the paper plane, 12 units right).
    "lock.fill": [0, -12, PHOSPHOR_PLACED], "shieldcheck.fill": [0, 12, PHOSPHOR_PLACED],
    "net.bold": [0, -11.99, PHOSPHOR_PLACED], "send.bold": [12.03, 0.01, PHOSPHOR_PLACED],
    // PHOSPHOR-MIGRATION release 2: Duotone plates keep the same optical placements as Phosphor's Bold/Fill drawings.
    // These four are measured from the shipped Duotone paths, including each secondary-tone shape.
    "comment.duo": [0, 16, PHOSPHOR_PLACED], "gift.duo": [0, -12.01, PHOSPHOR_PLACED],
    "megaphone.duo": [12, -3.98, PHOSPHOR_PLACED], "shieldcheck.duo": [0, 12, PHOSPHOR_PLACED],
  };
  type Drawn = { key: string; variant: GlyphVariant; body: string | null };
  const census = (list: Drawn[]) => {
    const offs = list.map(({ key, variant, body }) => ({ id: `${key}.${variant}`, ...centreOff(body ?? "", GRID, 0) }));
    return {
      off: offs.filter((c) => !(c.id in OPTICAL) && (Math.abs(c.dx) > U + 1e-9 || Math.abs(c.dy) > U + 1e-9)).map((c) => [c.id, c.dx, c.dy]),
      drift: Object.entries(OPTICAL).filter(([id, [dx, dy]]) => { const c = offs.find((o) => o.id === id); return !c || !near(c.dx, dx, 0.05) || !near(c.dy, dy, 0.05); }).map(([id]) => id),
    };
  };
  const drawings = shippedDrawings();
  const now = census(drawings);
  const houseNamed = Object.keys(OPTICAL).filter((id) => !GLYPH_ENTRIES.get(id.split(".")[0])?.stem.startsWith("p-"));
  ok(`1.3 · every one of the ${drawings.length} drawings the family ships is centred within one grid unit of its box — but the ${Object.keys(OPTICAL).length} Phosphor sets by eye, each at the offset named here; the house's own extras box-centred`,
    drawings.length >= 150 && drawings.every((d) => d.body) && now.off.length === 0 && now.drift.length === 0 && houseNamed.length === 0, j({ ...now, houseNamed }));
  // playBare is Phosphor's play: a triangle's outline and its hole; its CENTROID is centred (the eye centres a triangle on
  // its centroid), its box is not.
  const playSubs = parsePath(attrs((drawingOf("playBare", "bold")?.match(new RegExp("<path([^>]*)/?>")) ?? ["", ""])[1]).d ?? "");
  const centroid = (p: Pt[]) => {
    let A = 0, X = 0, Y = 0;
    for (let k = 0; k < p.length; k++) { const [x0, y0] = p[k], [x1, y1] = p[(k + 1) % p.length]; const c = x0 * y1 - x1 * y0; A += c; X += (x0 + x1) * c; Y += (y0 + y1) * c; }
    return { A: A / 2, x: X / (3 * A), y: Y / (3 * A) };
  };
  const outer = centroid(playSubs[0]?.samples ?? []), hole = centroid(playSubs[1]?.samples ?? []);
  // Its Fill (the How-to card's plate draws it solid) is one closed triangle, with the same reason.
  const fillSubs = parsePath(attrs((drawingOf("playBare", "fill")?.match(new RegExp("<path([^>]*)/?>")) ?? ["", ""])[1]).d ?? "");
  const solid = centroid(fillSubs[0]?.samples ?? []);
  ok(`1.3′ · …and the triangle keeps its reason: the outline of Phosphor's play has its centroid at (${outer.x.toFixed(2)}, ${outer.y.toFixed(2)}) and its Fill, one solid triangle, at (${solid.x.toFixed(2)}, ${solid.y.toFixed(2)}) — each on the box's centre — while each box stands 24 units right`,
    playSubs.length === 2 && Math.sign(outer.A) !== Math.sign(hole.A) && Math.abs(outer.x - 128) <= 1 && Math.abs(outer.y - 128) <= 1e-3
      && fillSubs.length === 1 && Math.abs(solid.x - 128) <= 1 && Math.abs(solid.y - 128) <= 1e-3, j({ outer, hole, solid }));
  const OLD_HEADSET = '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="13" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="13" width="3.8" height="6" rx="1.7"/><path d="M19.1 19v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/>';
  const OLD_FLAME2 = '<path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" />';
  ok("1.3″ PLANT · the old headset (1.25 low, the hub's Msaada row) and the old flame2 (3.5 high, the proposals HOT flag) are each reported by the census rule",
    Math.abs(centreOff(OLD_HEADSET, 24).dy) > 1 && Math.abs(centreOff(OLD_FLAME2, 24).dy) > 1);
  const shifted = drawings.map((d) => (d.key === "checkCircle" ? { ...d, body: '<path d="M60 20H236V236H60Z" fill="currentColor"/>' } : d.key === "lock" ? { ...d, body: '<path d="M28 0H228V220H28Z" fill="currentColor"/>' } : d));
  const planted = census(shifted);
  ok("1.3‴ PLANT · a shipped drawing 20 units off its centre and not named, and a named one moved from its offset, are each reported",
    planted.off.some(([id]) => id === "checkCircle.bold") && planted.drift.includes("lock.bold"), j(planted));
  const shiftedDuo = drawings.map((d) => d.key === "gift" && d.variant === "duo"
    ? { ...d, body: '<path d="M28 0H228V220H28Z" fill="currentColor"/>' } : d);
  ok("1.3⁗ PLANT · a named Duotone drawing moved from its optical offset is reported",
    census(shiftedDuo).drift.includes("gift.duo"));

  // Inside the box: the svg clips at its box, so a drawing past it is cut.
  const outside = drawings.filter(({ body }) => { const b = inkBox(partsOfMarkup(body ?? "", 0)); return b.x0 < -1e-9 || b.y0 < -1e-9 || b.x1 > GRID + 1e-9 || b.y1 > GRID + 1e-9; }).map((d) => `${d.key}.${d.variant}`);
  ok("1.4 · every drawing the family ships stays inside its box, no exception (the hand-drawn coins' back coin reached x26.32 of 24 and lost 2.32 units to the clip; the hand-drawn resolved's ray caps reached 0.25 past it — Phosphor's seal-check stays inside)",
    outside.length === 0 && (() => { const b = inkBox(partsOf("resolved", 20)); return b.x0 >= 0 && b.x1 <= GRID; })(), j(outside));
  const OLD_COINS = '<circle cx="10" cy="10" r="6" /><path d="M14.5 13.5a6 6 0 1 0 0-7" /><path d="M10 8v4M8.5 10.5h3" />';
  const oc = inkBox(partsOfMarkup(OLD_COINS));
  ok(`1.4′ CONTROL · the old coins reached x${oc.x1.toFixed(2)} of 24 — past the box — and Phosphor's ends at x${inkBox(partsOf("coins", 16)).x1.toFixed(2)} of 256`, oc.x1 > 26.3 && inkBox(partsOf("coins", 16)).x1 < GRID);
  // Where the podium is drawn: the leaderboard's two doors — the hub's Leaderboard row, and since PHOSPHOR-MIGRATION W4
  // (§8b, one meaning one glyph) the classic account menu's Leaderboard, which drew a crown — and nowhere else.
  const podiumUses = PLAYER_TSX.concat(walk("src", new RegExp("[.]ts$")).filter((f) => !OUT.test(f))).filter((f) => f !== "src/components/ui/glyphs.tsx")
    .filter((f) => new RegExp('I[.]podium[^A-Za-z]|glyph: "podium"').test(code(f))).sort();
  const PODIUM_DOORS = ["src/components/journey/account/hub-rows.ts", "src/components/layout/avatar-menu.tsx"];
  ok(`1.5 · the podium means the leaderboard — the hub's Bingwa / Leaderboard / 排行榜 row and the account menu's (${podiumUses.join(", ")}), every reader's, guest and member — and nothing else`,
    JSON.stringify(podiumUses) === JSON.stringify(PODIUM_DOORS) && code(PODIUM_DOORS[0]).includes('label: "leaderboard.title", glyph: "podium"')
      && (code(PODIUM_DOORS[1]).match(/I[.]podium[^A-Za-z]/g) ?? []).length === 1 && code(PODIUM_DOORS[1]).includes('{ href: "/leaderboard",    icon: I.podium,'));
}

/* ══ §2 · A2 · logOut IS A LOG-OUT ══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · A2 logOut draws a log-out: the door's frame on the left, the arrow leaving it — and never a sign-in's geometry");
/** A drawing's outline points, sampled by this file's reader. */
const outlinePoints = (markup: string): Pt[] => [...markup.matchAll(ELEM)].flatMap((m) => parsePath(attrs(m[2]).d ?? "").flatMap((s) => s.samples));
/** A door-and-arrow drawing read from its outline: its LEFT edge is the door's frame (the outline stands upright there
 *  for over half the drawing's height) and its RIGHT edge the arrowhead's point (the outline touches it over a short run
 *  only, on the drawing's middle row) — so the arrow leaves the door. A sign-in reads the other way about: the arrow's
 *  tail on the left, the frame on the right. */
function doorArrow(pts: Pt[]) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), tall = y1 - y0, mid = (y0 + y1) / 2;
  const at = (x: number) => pts.filter((p) => Math.abs(p[0] - x) <= 0.5).map((p) => p[1]);
  const left = at(x0), right = at(x1);
  const frame = Math.max(...left) - Math.min(...left), point = Math.max(...right) - Math.min(...right);
  const out = frame > tall / 2 && point < tall / 8 && Math.abs((Math.max(...right) + Math.min(...right)) / 2 - mid) < tall / 16;
  return { ok: out, why: j({ x: [x0, x1], frame, point, pointAt: [Math.min(...right), Math.max(...right)], mid }) };
}
{
  const signOut = drawingOf("logOut", lineVariant(20)) ?? "";
  const out = doorArrow(outlinePoints(signOut));
  ok("2.1 · logOut — Phosphor's sign-out — reads as a log-out from its outline: the door's frame upright on the LEFT (x36, y40–216), the arrowhead's point on the RIGHT at the middle row (x236, y128)", out.ok, out.why);
  const signIn = readFileSync("node_modules/@phosphor-icons/core/assets/bold/sign-in-bold.svg", "utf8");
  ok("2.1′ CONTROL · Phosphor's sign-in (the pinned package's own) is not a log-out by the same reading: its arrow's tail on the left, its frame on the right", !doorArrow(outlinePoints(signIn)).ok);
  ok("2.1″ PLANT · R8-F1's defect — a sign-out drawn as the arrow running into the door (logOut's outline mirrored) — is reported",
    !doorArrow(outlinePoints(signOut).map(([x, y]): Pt => [GRID - x, y])).ok);
  const glyph = render(h(I.logOut, { s: 20 }));
  ok("2.2 · the family has no sign-in to draw by mistake: logIn is retired (nothing drew it), and logOut draws the sprite's sign-out in Bold at 20px",
    !GLYPH_ENTRIES.has("logIn") && GLYPH_ENTRIES.get("logOut")?.stem === "p-sign-out" && glyph.includes('data-g="logOut.bold"') && glyph.includes('#p-sign-out-bold"'), glyph);
  const SIGN_OUTS = ["src/components/journey/account/sign-out-row.tsx", "src/components/layout/avatar-menu.tsx", "src/app/profile/page.tsx", "src/app/profile/sessions/page.tsx"];
  const signOutAt = (f: string, src: string) => f === "src/components/journey/account/sign-out-row.tsx"
    ? /<HubPlate glyph="logOut" variant="danger" \/>/.test(src) && /const Glyph = I\[glyph\];/.test(code("src/components/ui/hub-plate.tsx"))
    : src.includes("<I.logOut");
  ok("2.3 · every sign-out draws it — the hub's Toka, the account menu (classic and journey), /profile and /profile/sessions — and nothing draws logIn",
    SIGN_OUTS.every((f) => signOutAt(f, code(f))) && PLAYER_TSX.every((f) => !code(f).includes("I.logIn")));
  const oldHubSignIn = code(SIGN_OUTS[0]).replace('glyph="logOut"', 'glyph="logIn"');
  ok("2.3′ PLANT · a hub sign-in glyph in the sign-out row fails", oldHubSignIn !== code(SIGN_OUTS[0]) && !signOutAt(SIGN_OUTS[0], oldHubSignIn));
}

/* ══ §3 · A3 · THE TOKA BOX IS A CARD'S HEIGHT ══════════════════════════════════════════════════════════════════════════ */
section("3 · A3 the hub's sign-out box is a one-row card's height: the 56px rung inside a 1px border");
{
  const xl = tokenPx("--h-control-xl");
  /** Every box here is border-box (Tailwind's preflight), so a min-height counts the border. */
  const outer = (body: string) => {
    const m = new RegExp(`min-height:${WS}*(calc[(]var[(]--h-control-xl[)]${WS}*[+]${WS}*([0-9]+)px[)]|var[(]--h-control-xl[)])`).exec(body);
    return m ? xl + Number(m[2] ?? 0) : NaN;
  };
  const card = 2 * 1 + (rule(".kp-hub__row").includes("min-height: var(--h-control-xl)") ? xl : NaN);
  const toka = outer(rule(".kp-hub__exit"));
  ok(`3.1 · a one-row card is ${card}px (its 1px border around the ${xl}px rung) and Toka is ${toka}px — equal (it was ${xl})`,
    card === 58 && toka === card && rule(".kp-hub__card").includes("border: 1px solid var(--border)") && rule(".kp-hub__exit").includes("border: 1px solid var(--border)"));
  ok("3.1′ CONTROL · the old rule (`min-height: var(--h-control-xl)`) reads 56 by the same reckoning", outer("min-height: var(--h-control-xl); padding: 0") === 56);
  ok("3.2 · the boxes are border-box: Tailwind's preflight is on (the config never turns it off)", !new RegExp("preflight[^,}]*false").test(code("tailwind.config.ts")));
}

/* ══ §4 · A4 · THE EDGE-ICON RULE ════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · A4 a glyph at a run's start or end puts its INK on the edge (`edge`), a mark in words strokes at their stem (`text`)");
type Margin = { side: "start" | "end"; px: number; em: number } | null;
const marginOf = (markup: string): Margin => {
  const m = new RegExp("margin-inline-(start|end):(?:calc[(](-?[0-9.]+)px [+] ([0-9.]+)em[)]|(-?[0-9.]+)px)").exec(markup);
  return m ? { side: m[1] as "start" | "end", px: Number(m[2] ?? m[4]), em: Number(m[3] ?? 0) } : null;
};
/** This file's own expectation: the gap between the glyph's box and its ink, from the drawing (and, for a text mark, the
 *  half stem in em beyond its geometry). */
const expected = (name: string, s: number, side: "start" | "end", text?: string): Margin => {
  const parts = text ? markParts(name) : partsOf(name, s);
  const run = text ? parts.filter((q) => !q.own) : [];
  const own = text ? parts.filter((q) => q.own) : parts;
  const k = s / GRID;
  if (side === "end") {
    const reach = Math.max(...own.map((q) => q.box.x1 + q.w / 2), ...run.map((q) => q.box.x1));
    return { side, px: -(GRID - reach) * k, em: text ? GLYPH_STEM[text] / 2 : 0 };
  }
  const reach = Math.min(...own.map((q) => q.box.x0 - q.w / 2), ...run.map((q) => q.box.x0));
  return { side, px: -reach * k, em: text ? GLYPH_STEM[text] / 2 : 0 };
};
const sameMargin = (a: Margin, b: Margin) => !!a && !!b && a.side === b.side && Math.abs(a.px - b.px) <= 0.0015 && Math.abs(a.em - b.em) <= 1e-9;
{
  // 4.1 · the named sites, the engine against this file's reading.
  const CASES: Array<[string, number, "start" | "end", string | undefined, string]> = [
    ["chevronRight", 11, "end", "display-600", "the card's “Maelezo ›” (Sora 600 11.5px)"],
    ["chevronRight", 14, "end", "body-600", "the Wallet's “Risiti zote ›” (Inter 600 13px)"],
    ["chevronRight", 18, "end", undefined, "every hub row's chevron"],
    ["externalLink", 18, "end", undefined, "the hub's staff console mark"],
    ["lock", 16, "start", undefined, "the held capsule's lock"],
    ["arrowDownToLine", 14, "start", undefined, "the deposit head's eyebrow glyph"],
    ["chevronLeft", 11, "start", "mono-400", "the back link"],
    ["ext", 12, "end", "mono-400", "the market page's source link (R4-D's typed 2px, now measured)"],
  ];
  const rows = CASES.map(([n, s, side, text, what]) => {
    const got = marginOf(render(h(I[n], { s, edge: side, text })));
    const want = expected(n, s, side, text);
    return { what, got, want, same: sameMargin(got, want) };
  });
  ok(`4.1 · the engine pulls each named glyph by exactly its ink's gap, as this file reads it from the drawing — ${rows.map((r) => `${r.what}: ${r.got ? `${r.got.px}px${r.got.em ? ` + ${r.got.em}em` : ""}` : "none"}`).join("; ")}`,
    rows.every((r) => r.same), j(rows.filter((r) => !r.same)));
  // The afters, in pixels on the tiles' faces. Phosphor's caret-right, as a mark among words, is its centreline x96–176.
  const mae = expected("chevronRight", 11, "end", "display-600")!;
  const maePx = -mae.px - mae.em * 11.5;
  const caretEnd = geometry(GLYPH_ENTRIES.get("chevronRight")?.mark?.d ?? "").x1;
  ok(`4.1′ · the card's chevron: the hand-drawn one's ink ended ${(9 / 24 * 11 - 0.95 * 11 / 24).toFixed(2)}px short of the card's content edge (the readers: 3–4px; x1228 against x1231); Phosphor's caret ends ${GRID - caretEnd} units of 256 short of its box, so pulled ${maePx.toFixed(2)}px it ends ON it, its stroke ${(GLYPH_STEM["display-600"] * 11.5).toFixed(2)}px where the family's Bold paints ${(24 * 11 / GRID).toFixed(2)}px`,
    near(caretEnd, 176, 1e-6) && near(maePx, (GRID - 176) / GRID * 11 - GLYPH_STEM["display-600"] * 11.5 / 2, 1e-9) && GLYPH_STEM["display-600"] * 11.5 > 1.6);
  const hub = -expected("chevronRight", 18, "end")!.px;
  ok(`4.1″ · the hub's chevrons end on the card-size switch's edge: Phosphor's caret stands ${hub.toFixed(3)}px inside its 18px box, pulled by exactly that (the hand-drawn one stood 6.0375px in — tile 264: ink x345–350 against the switch's x356, its content edge x357)`, near(hub, 4.779, 1e-3));

  // 4.2 · a glyph without `edge` or `text` is exactly the plain sprite reference — the box, the variant its size draws and
  // the symbol it points at, every passed attribute in its order — so nothing else rides on the classic chrome's glyphs,
  // which the parity harness captures by their `data-g` and their href.
  const { GLYPH_SPRITES } = req("../src/components/ui/glyph-registry.generated.ts") as { GLYPH_SPRITES: { app: string; admin: string } };
  const Plain = ({ n, s, className, style, ...p }: Record<string, unknown>) => {
    const e = GLYPH_ENTRIES.get(n as string)!, v = lineVariant(s as number), place = shipsIn(e, v), id = `${e.stem}-${v}`;
    const href = place === "inline" ? `#${id}` : `${place === "admin" ? GLYPH_SPRITES.admin : GLYPH_SPRITES.app}#${id}`;
    return h("svg", { viewBox: "0 0 256 256", width: s, height: s, "aria-hidden": true, "data-g": `${n as string}.${v}`, ...p, className, style }, h("use", { href }));
  };
  const PROPS: Array<Record<string, unknown>> = [{ s: 20 }, { s: 16, className: "kp-x", "aria-hidden": true }, { s: 12, strokeWidth: 2.5 }, { s: 14, style: { opacity: 0.5 }, className: "a b" }];
  const diffs: string[] = [];
  for (const n of ["bell", "wallet", "chevronRight", "lock", "logOut", "receipt"]) for (const p of PROPS) {
    const now = render(h(I[n], p)), want = render(h(Plain, { n, ...p }));
    if (now !== want) diffs.push(`${n} ${j(p)}: ${now} ≠ ${want}`);
  }
  ok("4.2 · CONTROL · without `edge` or `text` a glyph renders exactly the plain sprite reference — every attribute, in its order (6 glyphs × 4 prop sets; bell from the page's inline symbols, the rest from the app sprite)",
    diffs.length === 0 && render(h(I.bell, { s: 20 })).includes('<use href="#p-bell-bold">') && render(h(I.wallet, { s: 20 })).includes(`<use href="${GLYPH_SPRITES.app}#`), j(diffs));

  // 4.3 · the text stroke.
  const tm = render(h(I.chevronRight, { s: 11, text: "display-600", className: "x" }));
  ok("4.3 · a text mark carries its words' stem — `kp-gtext` and `--g-stem` in em — and the sheet strokes it at that length on the screen (`non-scaling-stroke`)",
    tm.includes('class="kp-gtext x"') && tm.includes("--g-stem:0.142em") && CSS.includes(".kp-gtext { stroke-width: var(--g-stem); }") && CSS.includes(".kp-gtext * { vector-effect: non-scaling-stroke; }"), tm);

  // 4.4 · the stems against the faces.
  const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { bbox: { minX: number; maxX: number }; path: { commands: Array<{ command: string; args: number[] }> } } } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
  const bar = (n: string) => { const f = F(n); const g = f.glyphForCodePoint(108); return (g.bbox.maxX - g.bbox.minX) / f.unitsPerEm; };   // Inter's l
  const stemH = (n: string) => {   // JetBrains Mono's H: its left stem, from the outline's straight points
    const f = F(n); const g = f.glyphForCodePoint(72);
    const xs = [...new Set(g.path.commands.filter((c) => c.command === "moveTo" || c.command === "lineTo").map((c) => Math.round(c.args[0])))].sort((a, b) => a - b);
    return (xs[1] - xs[0]) / f.unitsPerEm;
  };
  const faces: Record<string, number> = {
    "body-400": bar("Inter-Regular"), "body-500": bar("Inter-Medium"), "body-700": bar("Inter-Bold"),
    "body-600": (bar("Inter-Medium") + bar("Inter-Bold")) / 2,
    "mono-400": stemH("JetBrainsMono-Regular"), "mono-700": stemH("JetBrainsMono-Bold"),
    "mono-600": (stemH("JetBrainsMono-Regular") + stemH("JetBrainsMono-Bold")) / 2,
  };
  const SORA = { "display-600": 0.142, "display-700": 0.164 };   // Sora v17's I (not in the repo; read from fonts.gstatic.com's TTF)
  const badStem = Object.entries(faces).filter(([k, v]) => Math.abs(GLYPH_STEM[k] - v) > 0.0015);
  ok(`4.4 · every stem is its face's own: ${Object.entries(faces).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(" · ")} (the repo's Inter and JetBrains Mono), display-600/700 Sora's 0.142/0.164`,
    badStem.length === 0 && Object.entries(SORA).every(([k, v]) => GLYPH_STEM[k] === v) && Object.keys(GLYPH_STEM).length === 9, j(badStem));
  ok("4.4′ CONTROL · one value per weight could not say it: at 700 JetBrains Mono's stem is 15% under Inter's", faces["mono-700"] < faces["body-700"] * 0.86);

  // 4.5 · the two eyebrow slots pull a family glyph, and leave anything else as given.
  const { PageHeader } = req("../src/components/ui/page-header.tsx") as { PageHeader: (p: Record<string, unknown>) => unknown };
  const { AuthHeader } = req("../src/components/auth/auth-panel.tsx") as { AuthHeader: (p: Record<string, unknown>) => unknown };
  const ph = render(h(PageHeader as never, { icon: h(I.arrowDownToLine, { s: 14, className: "text-text-subtle" }), eyebrow: "WEKA PESA", title: "Weka pesa" }));
  const phSpan = render(h(PageHeader as never, { icon: h("span", { className: "inline-block h-[14px] w-[14px]" }), eyebrow: "X", title: "Y" }));
  const ah = render(h(AuthHeader as never, { icon: h(I.shieldcheck, { s: 13 }), eyebrow: "2FA", title: "Thibitisha" }));
  const phPull = marginOf(ph);
  ok(`4.5 · PageHeader and AuthHeader pull the eyebrow's glyph onto the column's edge — the deposit head's by ${phPull ? `${(-phPull.px).toFixed(4)}px` : "nothing"} (its ink stood 2.36px in; the readers saw it 1.3px inside the title's ink)`,
    sameMargin(marginOf(ph), expected("arrowDownToLine", 14, "start")) && sameMargin(marginOf(ah), expected("shieldcheck", 13, "start")) && ph.includes('class="text-text-subtle"'));
  ok("4.5′ CONTROL · a slot handed something that is not a glyph draws it as given", !phSpan.includes("margin-inline") && phSpan.includes('<span class="inline-block h-[14px] w-[14px]"></span>'));
  ok('4.5″ · …and the slot does it in its source (edgeGlyph(icon, "start")): a slot without it is reported', code("src/components/ui/page-header.tsx").includes('edgeGlyph(icon, "start")') && code("src/components/auth/auth-panel.tsx").includes('edgeGlyph(icon, "start")'));
  // The deposit return's ghost draws an unpainted clock where the page draws one of four outcome glyphs: they share one
  // ink start, so the ghost's eyebrow lands where the page's does — but the REVERSED outcome's: Phosphor's arrow-counter-
  // clockwise reaches its arrow's foot 8 units nearer its box (x12 against x20), so on a reversed deposit the eyebrow's
  // word stands 8 × 14 / 256 = 0.44px right of the ghost's. Named, not redrawn: under half a pixel, on the rarest outcome.
  const OUTCOMES = ["checkCircle", "alertCircle", "rotateCcw", "clock"];
  const four = OUTCOMES.map((n) => inkBox(partsOf(n, 14)).x0);
  const SHIFTED: Record<string, number> = { rotateCcw: 12 };
  const off4 = OUTCOMES.filter((n, i) => !near(four[i], SHIFTED[n] ?? four[3], 1e-2));
  ok(`4.6 · the deposit return's outcome glyphs share the ghost's ink start (x${four.map((v) => v.toFixed(2)).join(" · ")}), so its unpainted clock lands its eyebrow where the page does — the reversed one ${((four[3] - four[2]) * 14 / GRID).toFixed(2)}px off, named`,
    off4.length === 0 && near(four[3], 20, 1e-2) && code("src/app/wallet/deposit/return/loading.tsx").includes('icon={<I.clock s={14} className="shrink-0 text-transparent" />}')
      && code("src/app/wallet/deposit/return/page.tsx").includes('outcome.state === "REVERSED" ? <I.rotateCcw s={14} className="text-text-muted" /> :'),
    j({ four, off4, ghost: code("src/app/wallet/deposit/return/loading.tsx").includes('<I.clock s={14} className="shrink-0 text-transparent" />') }));

  // 4.7 · the held capsule: lock pulled by its gap, so lock and caption centre between the rings.
  const lock = -expected("lock", 16, "start")!.px;
  const inter = F("Inter-Regular");
  const rsb = (ch: string, size: number) => { const g = inter.glyphForCodePoint(ch.codePointAt(0)!) as unknown as { advanceWidth: number; bbox: { maxX: number } }; return (g.advanceWidth - g.bbox.maxX) / inter.unitsPerEm * size; };
  const pad = Number(new RegExp(`padding: 0 ([0-9]+)px`).exec(rule(".kp-jbal"))?.[1] ?? NaN);
  const left = pad, rights = { sw: pad + rsb("a", 11), en: pad + rsb("n", 11) };
  // The capsule's file also holds the frozen classic capsule (r7c §6.2, byte for byte), so the pull is the journey-only
  // class's, written as its derivation: x0 of the lock's ink × its size / 256 — read back here from the drawing and the call.
  const lockX0 = inkBox(partsOf("lock", 16)).x0;
  const lockCss = new RegExp("margin-inline-start: calc[(]-([0-9.]+) [*] ([0-9]+)px / 256[)];").exec(rule(".kp-jbal__lock"));
  const lockCall = code("src/components/layout/wallet-balance-pill.tsx").includes('{held && <I.lock s={16} className="kp-jbal__lock" />}');
  const engineLock = marginOf(render(h(I.lock, { s: 16, edge: "start" })));
  ok(`4.7 · the held capsule: the lock's ink starts on the ${pad}px padding — pulled by calc(-${lockCss?.[1]} × ${lockCss?.[2]}px / 256), the lock's own ink start (x${lockX0.toFixed(2)}) at its 16px, the engine's edge number (${engineLock?.px}px) — so its contents centre within ${Math.max(...Object.values(rights).map((r) => Math.abs(r - left) / 2)).toFixed(2)}px (sw "…limegandishwa", en "…frozen"); unpulled they would sit ${(lock / 2).toFixed(2)}px right (the hand-drawn lock's 1.35px)`,
    near(lock, 1.75, 1e-9) && !!lockCss && near(Number(lockCss[1]), lockX0, 1e-9) && Number(lockCss[2]) === 16 && lockCall
      && !!engineLock && near(-Number(lockCss[1]) * 16 / GRID, engineLock.px, 0.0015) && Object.values(rights).every((r) => Math.abs(r - left) / 2 < 0.5), j({ rights, lockCss: lockCss?.slice(1), lockCall, engineLock }));
  // 4.8 · the language row's chevron turns about its box: the turn steps back by the difference of the two reaches.
  const down = inkBox(partsOf("chevronDown", 18)), right = inkBox(partsOf("chevronRight", 18));
  const step = ((down.x1 - down.x0) / 2 - (right.x1 - GRID / 2)) * 18 / GRID;
  ok(`4.8 · the hub's language row, open: its turned chevron reaches ${((down.x1 - down.x0) / 2).toFixed(2)} units of 256 from its centre against ${(right.x1 - GRID / 2).toFixed(2)} closed, so the turn steps back ${step.toFixed(4)}px and ends on the same edge (Phosphor's caret turns the same 2.25px the hand-drawn one did)`,
    near(step, 2.25, 1e-3) && CSS.includes(".kp-hub__lang[open] > summary .kp-hub__chev { transform: translateX(-2.25px) rotate(90deg); }"));
  ok("4.9 · the typed margins the rule replaces are gone: the back link's 3px and the source link's 2px",
    !code("src/components/ui/back-link.tsx").includes("-ml-[3px]") && !code("src/app/markets/[id]/page.tsx").includes("-mr-[2px]"));
}

/* ── 4.10 · THE CENSUS: every edge mark on a player surface, classified ────────────────────────────────────────────── */
{
  /** Every chevron, arrow and external mark drawn on a player surface: edge (its ink on its run's edge), text (its words'
   *  stroke), or the reason it keeps its box. A new site fails until it is added here with its class. */
  // Round 10 (R10-A6) moved this pin: a centred control frames its INK, so a Button slot's mark is pulled onto the button's
  // padding by the slot itself at render (`edgeGlyph`, button.tsx) and its SOURCE carries the stroke alone; a hand-built
  // control's mark carries `edge` in its source (kind `text`). R9-A's reason — the spinner's swap — did not hold: Button's
  // spinner was already 2px narrower than its glyph at lg (test:visual-pass-r10 §A6).
  const B = "a Button slot's mark: the slot pulls its ink onto the button's padding at render (edgeGlyph, R10-A6), so its source carries the stroke alone";
  /** Each site's kind says what it must carry: `row` and `ghost` an edge (a row's end mark keeps the family's stroke),
   *  `text` an edge and its words' stroke, `button` and `float-text` the stroke alone (no edge to land on), `float-row`,
   *  `alone` and `frozen` neither. */
  type Kind = "row" | "ghost" | "text" | "button" | "control" | "float-text" | "float-row" | "alone" | "frozen";
  const SITES: Array<[string, string, number, Kind, string]> = [
    ['src/components/journey/bet-sheet/bet-sheet.tsx', '<I.chevronRight s={16} edge="end" text="body-400" />', 4, "text", "S8's pending receipt, declaration and limits links, plus the similar-question link: their 15px body/400 words and the same run's end"],
    ['src/components/journey/bet-sheet/bet-sheet.tsx', '<I.chevronRight s={20} text="body-600" />', 1, "button", B],
    ['src/components/journey/bet-sheet/sheet-parts.tsx', '<I.chevronRight s={16} edge="end" text="body-400" />', 1, "text", "S8's receipt ticket link: its 15px body/400 words, centred by the run's ink"],
    // 2026-10-21 (S5-DESIGN-SLIP, the slip critic's H4/M4): the Millionea confirm's short balance is the bet sheet's own low
    // frame, drawn with the sheet's own marks — its pending, declaration and limits links, and its deposit door's trailing mark.
    ['src/app/millionea/slip/slip-client.tsx', '<I.chevronRight s={16} edge="end" text="body-400" />', 3, "text", "the slip's low frame — the bet sheet's pending receipt, declaration and limits links: their 15px body/400 words and the run's end"],
    ['src/app/millionea/slip/slip-client.tsx', '<I.chevronRight s={20} text="body-600" />', 1, "button", B],
    ['src/app/account/page.tsx', '<I.externalLink s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's staff row end"],
    ['src/app/agent/apply/apply-client.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", B],
    ['src/app/agent/apply/loading.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/apply/loading.tsx', '<I.chevronLeft s={14} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/apply/apply-client.tsx', '<I.chevronLeft s={14} text="body-600" />', 1, "button", B],
    ['src/app/agent/loading.tsx', '<I.arrowRight s={16} text="body-600" />', 1, "button", "its ghost's (ButtonGhost): the page's own mark, unpainted, pulled at render as Button pulls it (R10-A6)"],
    ['src/app/agent/page.tsx', '<I.arrowRight s={16} text="body-600" />', 2, "button", B],
    ['src/app/agent/status/page.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", B],
    ['src/app/auth/admin/page.tsx', '<I.chevronRight s={16} edge="end" className="text-text-subtle group-hover:text-text transition-colors" />', 1, "row", "the player row's end on the staff sign-in"],
    ['src/app/auth/forgot-password/page.tsx', '<I.chevronLeft s={14} edge="start" text="mono-400" />', 1, "text", "a back link's start"],
    ['src/app/auth/login/page.tsx', '<I.arrowRight s={13} edge="end" text="display-700" />', 1, "text", "the error panel's way-on pill's end — round 10 (R10-A6) drew its typed → as the family's arrow at its Sora 700 stem"],
    ['src/app/auth/register/register-form.tsx', '<I.arrowRight s={13} edge="end" text="display-700" />', 1, "text", "the error panel's way-on pill's end — the login page's twin (R10-A6)"],
    ['src/app/auth/reset-password/page.tsx', '<I.chevronLeft s={14} edge="start" text="mono-400" />', 1, "text", "a back link's start"],
    ['src/app/fairness/page.tsx', '<I.ext s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/app/live/featured-contest.tsx', '<I.arrowRight s={14} edge="end" text="body-600" />', 1, "text", "the featured contest's market link ends after its body-600 label"],
    ['src/app/live/loading.tsx', '<I.arrowRight s={14} text="body-600" />', 1, "button", "the featured contest ghost's Button slot keeps the same label stroke"],
    ['src/app/legal/rules/page.tsx', '<I.chevronRight s={14} className="shrink-0 text-text-subtle" />', 1, "frozen", "a rules card's row end — the file is in the published-words population D19a pins byte for byte (test:house-bot-disclosure 5.1) — named for the integrator"],
    ['src/app/markets/[id]/page.tsx', '<I.ext s={11} edge="start" text="mono-400" />', 1, "text", "the source address line's start"],
    ['src/app/markets/[id]/page.tsx', '<I.ext s={12} edge="end" text="mono-400" />', 1, "text", "the source link's end"],
    ['src/app/markets/page.tsx', '<I.chevronRight s={14} edge="end" text="mono-600" />', 1, "text", "the search's All results link's end — PHOSPHOR W4: its words ended in a typed →"],
    ['src/app/profile/activity/page.tsx', '<I.chevronRight s={12} edge="end" text="mono-400" />', 1, "text", "a text link's end"],
    ['src/app/profile/kyc/page.tsx', '<I.arrowRight s={13} edge="end" text="display-600" />', 1, "text", "the footer's wallet link's end — round 10 (R10-A6): its typed arrow became the family's"],
    ['src/app/profile/loading.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-transparent" />', 2, "ghost", "the ghost of /profile's row ends, pulled as the page's are"],
    ['src/app/profile/notifications/page.tsx', '<I.chevronRight s={12} edge="end" text="mono-400" />', 1, "text", "a row cue's end, after its count"],
    ['src/app/profile/page.tsx', '<I.chevronRight s={16} edge="end" />', 2, "row", "the setting rows' and the sign-out row's end"],
    ['src/app/results/millionea-results-view.tsx', '<I.chevronRight s={14} edge="end" text="body-400" />', 1, "text", "the Millionea register link's 14px mark lands after its body text"],
    // RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-DOORS): /results' week rows are the register's one row (`WeekRow`), so their
    // end mark is register-parts.tsx's entry below; the section draws none of its own.
    ['src/app/proposals/[id]/page.tsx', '<I.arrowRight s={15} text="body-600" />', 1, "button", B],
    ['src/app/proposals/[id]/page.tsx', '<I.chevronLeft s={11} edge="start" text="body-400" />', 1, "text", "the back link's start, centred by its ink — PHOSPHOR W4's review: a typed back arrow, written as an escape"],
    ['src/app/proposals/page.tsx', '<I.arrowRight s={12} edge="end" text="mono-400" />', 1, "text", "a link cue's end"],
    ['src/app/proposals/page.tsx', '<I.chevronRight s={14} />', 1, "float-row", "it trails a start-aligned meta row: no edge to land on"],
    ['src/app/wallet/deposit/page.tsx', '<I.chevronLeft s={11} edge="start" text="mono-400" />', 1, "text", "the journey deposit page's server-rendered back link uses the same mark and class as BackLink"],
    ['src/app/wallet/receipt/[id]/page.tsx', '<I.arrowRight s={14} edge="start" />', 1, "control", "the receipt's hand-built return control places its leading mark on the start padding"],
    ['src/app/wallet/receipts/loading.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 rounded bg-bg-overlay/60 text-transparent" />', 1, "ghost", "the ghost of the receipt row's end"],
    ['src/app/wallet/wallet-client.tsx', '<I.chevronRight s={14} edge="end" text="body-600" aria-hidden />', 1, "text", "“Risiti zote ›”"],
    ['src/app/wallet/wallet-client.tsx', '<I.chevronRight s={16} edge="end" className="text-text-subtle" />', 1, "row", "the limits row's end"],
    ['src/components/home/landing-hero.tsx', '<I.arrowRight s={14} edge="end" text="body-600" />', 2, "text", "the home block's two text links"],
    ['src/components/home/landing-hero.tsx', '<I.arrowRight s={16} edge="end" text="body-600" />', 1, "text", "the hero CTA's end: a centred control frames its ink (R10-A6)"],
    ['src/components/home/landing-hero.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/topic-tiles.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/trust-band.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/trust-band.tsx', '<I.externalLink s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/components/home/updown-band.tsx', '<I.chevronRight s={14} edge="end" text="mono-700" />', 1, "text", "a section's see-all"],
    ['src/components/home/updown-band.tsx', '<I.chevronRight s={14} edge="end" text="body-600" />', 3, "text", "the Watch link's end, and the band's two buttons' ends: a centred control frames its ink (R10-A6)"],
    ['src/components/journey/account/hub-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 2, "row", "the hub's row end, and Tafuta's (S7 WP9: a disclosure like the language row, turned by the same rule, 4.8)"],
    ['src/components/journey/account/language-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's row end (and its turn, 4.8)"],
    ['src/components/journey/account/unread-row.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's row end"],
    ['src/components/journey/home/howto-card.tsx', '<I.chevronRight s={20} edge="end" className="kp-jhowto__chev" />', 1, "row", "the journey home's How-to card's end: a door's end mark on its content edge (the Vodacom plan S7, WP6)"],
    ['src/components/layout/avatar-menu.tsx', '<I.arrowRight s={14} className="text-brand-300/70 transition-colors group-hover:text-brand-300" aria-hidden />', 1, "float-row", "the staff link's trailing mark sits in its padded flex row; its box stays in flow, and the link's ink stays brand in both shell modes"],
    ['src/components/layout/needle-drawer.tsx', '<I.chevronRight s={18} edge="end" className="kp-hub__chev" aria-hidden />', 1, "row", "the hub's Needle row end"],
    ['src/components/layout/needle-drawer.tsx', '<I.chevronRight s={14} edge={overhang ? "end" : undefined} className="text-text-subtle" />', 1, "row", "the account menu's Needle row end (PHOSPHOR W4: it was hand-drawn): on the row's edge in the journey's menu, in its box in the classic menu's padded row (test:visual-pass-r4h 6.4)"],
    ['src/components/layout/notifications-panel.tsx', '<I.chevronRight s={11} />', 1, "frozen", "the bell is frozen (qa:bell-untouched) — named for the integrator"],
    ['src/components/markets/market-card.tsx', '<I.chevronRight s={11} edge="end" text="display-600" />', 1, "text", "“Maelezo ›”"],
    ['src/components/markets/market-card.tsx', '<I.chevronRight s={12} edge="end" text="body-400" />', 1, "text", "the rules link's end"],
    ['src/components/markets/resolution-panel.tsx', '<I.ext s={11} edge="end" text="mono-400" />', 1, "text", "a source link's end"],
    ['src/components/markets/side-picker.tsx', '<I.chevronLeft s={10} text="mono-400" />', 1, "float-text", "it leads a right-aligned change-side link: no edge to land on, its words' stroke"],
    ['src/components/onboarding/first-visit-primer.tsx', '<I.chevronRight s={14} edge="end" text="body-600" />', 1, "text", "the primer's Next: a centred control frames its ink (R10-A6)"],
    ['src/components/proposals/proposals-state-views.tsx', '<I.chevronLeft s={15} text="body-600" />', 1, "button", B],
    ['src/components/ui/back-link.tsx', '<I.chevronLeft s={11} edge="start" text="mono-400" />', 1, "text", "the back link's start"],
    ['src/components/ui/date-select.tsx', '<I.chevronLeft s={16} />', 1, "alone", "alone in a control: centred by its box"],
    ['src/components/ui/empty-state-link.tsx', '<I.arrowRight s={size === "sm" ? 13 : 14} edge="end" text="body-600" />', 1, "text", "an empty state's way onward (PHOSPHOR W4: three ways before, one typed →): a centred control frames its ink (R10-A6)"],
    ['src/components/ui/date-select.tsx', '<I.chevronRight s={16} />', 1, "alone", "alone in a control: centred by its box"],
    ['src/components/ui/not-found-view.tsx', '<I.arrowRight s={12} edge="end" text="mono-400" />', 1, "text", "a centred link's end (centred by its ink)"],
    ['src/components/ui/pagination.tsx', '<I.chevronLeft s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronRight s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronsLeft s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/pagination.tsx', '<I.chevronsRight s={14} />', 1, "alone", "alone in a control"],
    ['src/components/ui/propose-promo.tsx', '<I.arrowRight s={18} edge="end" />', 1, "row", "the promo card's row end"],
    ['src/components/ui/route-error.tsx', '<I.arrowRight s={14} edge="end" text="body-600" />', 1, "text", "the error view's way-back button's end: a centred control frames its ink (R10-A6)"],
    ['src/components/updown/round-stake-panel.tsx', '<I.arrowRight s={11} text="mono-600" className="text-body-sm text-text-muted" />', 1, "float-text", "it leads the projected return, the figure at the stake row's end (PHOSPHOR W4: it was hand-drawn): no edge to land on, the figure's stroke"],
    ['src/components/updown/updown-card.tsx', '<I.chevronRight s={10} text="mono-600" />', 1, "button", B],
    ['src/components/wallet/receipt-list-row.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle transition-colors duration-quick group-hover:text-text" aria-hidden />', 1, "row", "the receipt row's end"],
    // S5-DESIGN-DOORS (2026-10-21, R1 M1 L1): the card's end is the How-to card's — 20px, on the head row's axis (`.kp-mln-door`).
    ['src/components/maswali/maswali-home-card.tsx', '<I.chevronRight s={20} edge="end" className="kp-mln-door__chev" />', 1, "row", "the Millionea card's end: the door's head row (plate · title · chevron) on one axis, the How-to card's row"],
    ['src/components/maswali/maswali-home-card-ghost.tsx', '<I.chevronRight s={20} edge="end" className="kp-mln-door__chev" />', 1, "ghost", "the ghost of the card's end, pulled as the card's is and unpainted (`.kp-mln-ghost`), so the facts' column is the card's"],
    ['src/components/maswali/maswali-ticket.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />', 1, "row", "a held Millionea ticket's row end in the hub's buy block (MASWALI-BUILD S5)"],
    // MASWALI-BUILD S5 pages (2026-10-18): Millionea's text links end on their words' stroke; its two list rows end on their edge.
    ['src/components/maswali/maswali-ticket.tsx', '<I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />', 2, "text", "a ticket card's 'view the ticket' door and the stub's question-set link to the week's register (S5-DESIGN-TICKETS M1, M6): each a text link's end after its 13px body/400 words"],
    ['src/components/maswali/maswali-win-ledger.tsx', '<I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />', 1, "text", "a receipt's door to the week's register (S5-DESIGN-TICKETS M6): a text link's end after its body/400 words"],
    // MASWALI-BUILD S5-DESIGN-HUB (2026-10-21): a hub notice's door is the kit NoticeBar's own action now (no mark); the hub
    // draws last week's row end on its edge (P16) and "See all n tickets" ends on its words' stroke (M8).
    ['src/app/millionea/page.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />', 1, "row", "the hub's last-week row end: the register's own row end (P16)"],
    ['src/app/millionea/page.tsx', '<I.chevronRight s={14} edge="end" text="body-400" />', 1, "text", "the hub's \"See all n tickets\" link: its end after the 13px body/400 words (M8)"],
    ['src/app/millionea/millionea-parts.tsx', '<I.chevronRight s={14} edge="end" text="body-400" />', 1, "text", "the reading links' end (how it works, the register, fairness), one mark per link"],
    // RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the week page's "Audit chain" link is gone (the lead's H2 ruling:
    // /fairness's Millionea rows are S6's); each question's source is /fairness's own link now, its external mark after the
    // domain (the critic's H4); How's responsible-play rule opens the player's limits (L13).
    ['src/app/millionea/register/[week]/page.tsx', '<I.ext s={12} edge="end" text="body-400" className="shrink-0" />', 1, "text", "a question's source link: /fairness's external mark at the end of its body/400 domain"],
    ['src/app/millionea/how/page.tsx', '<I.chevronRight s={14} edge="end" text="body-400" />', 1, "text", "How's responsible-play rule's door to the player's limits: a text link's end after its body/400 words"],
    // RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the week's row is the ONE shared row (`WeekRow`, register-parts:
    // the register's index, /results' section), and a ledger's carry row is a door to its week (the critic's M10).
    ['src/app/millionea/register/register-parts.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />', 1, "row", "a week's row end in the register's list (and /results' section)"],
    ['src/components/maswali/maswali-ledger.tsx', '<I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />', 1, "text", "a ledger carry row's door to its week: the end of its 13px body/400 label"],
    // MASWALI-BUILD S5-R3-FIX 8 (2026-10-23): the week's loading drawing sets the carry row's label as its own words, unseen,
    // beside the ledger's own mark drawn unseen, so the label wraps against the page's box — its edge's pull included.
    ['src/app/millionea/register/[week]/register-week-ghost.tsx', '<I.chevronRight s={14} edge="end" text="body-400" className="invisible shrink-0" />', 1, "text", "the week's loading drawing: the ledger carry row's mark, unpainted, its box and edge the page's own beside the label's words set unseen"],
    // S5-DESIGN-DOORS (2026-10-21): the /positions door ends as every other Millionea door — it was the only arrow among them.
    ['src/app/positions/page.tsx', '<I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />', 1, "row", "classic /positions' Millionea row: a door's end on its content edge (D-13 (c)), the register's and /results' row end"],
    // MASWALI-BUILD S5 landing door (2026-10-22; the landing's R19, DESIGN_AUTHORITY §M8a item 21): Millionea's line in the
    // hero's door row ends as the hero's quiet links do — the family's mark after its 13px body/600 words.
    ['src/components/maswali/maswali-landing-line.tsx', '<I.chevronRight s={14} edge="end" text="body-600" />', 1, "text", "the classic landing's Millionea line: its end after the hero's quiet-link words (13px body/600)"],
  ];
  const MARK = new RegExp("<I[.](?:chevronRight|chevronLeft|chevronsRight|chevronsLeft|arrowRight|ext|externalLink)(?![A-Za-z])(?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?/>", "g");
  const marksSeen = (source: (f: string) => string = code) => {
    const seen = new Map<string, number>();
    for (const f of PLAYER_TSX) for (const m of source(f).matchAll(MARK)) { const k = `${f} ${squash(m[0])}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
    return seen;
  };
  const seen = marksSeen();
  const listed = new Map(SITES.map(([f, el, n]) => [`${f} ${el}`, n]));
  const unlisted = [...seen].filter(([k]) => !listed.has(k));
  const missing = [...listed].filter(([k, n]) => seen.get(k) !== n);
  ok(`4.10 · every chevron, arrow and external mark on a player surface is classified — ${[...seen.values()].reduce((a, b) => a + b, 0)} marks at ${seen.size} spellings: ${SITES.filter((s) => s[1].includes("edge=")).reduce((a, s) => a + s[2], 0)} on their run's edge, ${SITES.filter((s) => s[1].includes(" text=")).reduce((a, s) => a + s[2], 0)} at their words' stroke, the rest keeping their box for a stated reason`,
    unlisted.length === 0 && missing.length === 0, j({ unlisted, missing }));
  // A mark between words or in a button keeps its box but takes its words' stroke: every one that sits in a run of words
  // carries `text` (the icon-only controls, the plate, the cube and the two frozen files excepted).
  const WANT: Record<Kind, [boolean, boolean]> = { row: [true, false], ghost: [true, false], text: [true, true], button: [false, true], control: [true, false], "float-text": [false, true], "float-row": [false, false], alone: [false, false], frozen: [false, false] };
  const wrong = SITES.filter(([, el, , kind]) => el.includes(" edge=") !== WANT[kind][0] || el.includes(" text=") !== WANT[kind][1]);
  ok("4.11 · each site carries what its kind says — a row end its edge in the family's stroke, a mark in words its words' stroke (with the edge where its run has one), a button's mark the stroke alone", wrong.length === 0, j(wrong));
  const planted = new Map(seen); planted.set("src/components/markets/market-card.tsx <I.chevronRight s={11} />", 1); planted.delete('src/components/markets/market-card.tsx <I.chevronRight s={11} edge="end" text="display-600" />');
  ok("4.10′ PLANT · “Maelezo ›” without its edge (the old element) is an unclassified site", [...planted].some(([k]) => !listed.has(k)));
  const s8WithoutStroke = marksSeen(f => f === "src/components/journey/bet-sheet/bet-sheet.tsx" ? code(f).replaceAll('s={16} edge="end" text="body-400"', 's={16} edge="end"') : code(f));
  const s8ExtraMark = marksSeen(f => f === "src/components/journey/bet-sheet/sheet-parts.tsx" ? `${code(f)}\nexport const extra = <I.chevronRight s={16} edge="end" text="body-400" />;` : code(f));
  ok("4.10″ PLANT · S8's word links losing their stroke and an extra registered-looking mark both fail the same census",
    [...s8WithoutStroke].some(([k]) => !listed.has(k)) && [...listed].some(([k, n]) => s8ExtraMark.get(k) !== n));
  const staffBrand = '<I.arrowRight s={14} className="text-brand-300/70 transition-colors group-hover:text-brand-300" aria-hidden />';
  const staffOldSplit = '<I.arrowRight s={14} className={journey ? "text-brand-300/70 transition-colors group-hover:text-brand-300" : "text-gold-300/70 transition-colors group-hover:text-gold-300"} aria-hidden />';
  const staffGoldBack = marksSeen(f => f === "src/components/layout/avatar-menu.tsx" ? code(f).replace(staffBrand, staffOldSplit) : code(f));
  ok("4.10‴ PLANT · restoring the staff arrow's old classic-gold split is an unclassified mark",
    code("src/components/layout/avatar-menu.tsx").includes(staffBrand)
      && [...staffGoldBack].some(([k]) => !listed.has(k))
      && [...listed].some(([k, n]) => staffGoldBack.get(k) !== n));
  const oldBoardMark = 'src/app/updown/page.tsx <I.chevronRight s={11} edge="end" text="mono-400" />';
  const boardMarkBack = marksSeen(f => f === "src/app/updown/page.tsx"
    ? `${code(f)}\nconst oldPill = <I.chevronRight s={11} edge="end" text="mono-400" />;`
    : code(f));
  ok("4.10⁗ PLANT · restoring the removed board history-pill chevron is an unclassified mark",
    !seen.has(oldBoardMark) && boardMarkBack.get(oldBoardMark) === 1 && !listed.has(oldBoardMark));
  const oldNotFoundMark = 'src/components/ui/not-found-view.tsx <I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />';
  const notFoundMarkBack = marksSeen(f => f === "src/components/ui/not-found-view.tsx"
    ? `${code(f)}${NL}const oldPlate = <I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />;`
    : code(f));
  ok("4.10⁵ PLANT · restoring the removed not-found plate arrow is unclassified",
    !seen.has(oldNotFoundMark) && notFoundMarkBack.get(oldNotFoundMark) === 1 && !listed.has(oldNotFoundMark));

  // 4.12 · eyebrow glyphs: a glyph that leads an eyebrow line stands on the column's edge.
  const EYEBROW_FIRST = new RegExp(`className="[^"]*eyebrow[^"]*"[^>]*>${WS}*<I[.]([A-Za-z]+)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)/>`, "g");
  const EYEBROW_NEXT = new RegExp(`<I[.]([A-Za-z]+)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)/>${WS}*<p[^>]*className="[^"]*eyebrow`, "g");
  const KEEP_EYEBROW: Record<string, string> = {
    "src/components/profile/password-section.tsx": "one key glyph in the two states of one control (the closed row and the open form) — it holds its card's icon column",
    "src/app/legal/layout.tsx": "the legal head's eyebrow — the file is in the published-words population D19a pins byte for byte (test:house-bot-disclosure 5.1) — named for the integrator",
    "src/components/ui/unsaved-changes.tsx":"the console's pending-changes bar (its SAVED word): admin pages only — players meet only the guard dialog",
  };
  const eyebrows: Array<{ f: string; g: string; edge: boolean }> = [];
  for (const f of PLAYER_TSX) {
    const c = code(f);
    for (const re of [EYEBROW_FIRST, EYEBROW_NEXT]) for (const m of c.matchAll(re)) eyebrows.push({ f, g: m[1], edge: m[2].includes('edge="start"') });
  }
  const loose = eyebrows.filter((e) => !e.edge && !(e.f in KEEP_EYEBROW));
  ok(`4.12 · every glyph that leads an eyebrow line puts its ink on the column's edge — ${eyebrows.length} hand-drawn eyebrows (${[...new Set(eyebrows.map((e) => e.g))].join(", ")}), plus every PageHeader and AuthHeader by their slot; the password section's key keeps its column`,
    eyebrows.length >= 10 && loose.length === 0, j(loose));
}

/* ══ §5 · A5 · ONE 12px GAP FOR A PAIR OF BUTTONS ═══════════════════════════════════════════════════════════════════════ */
section("5 · A5 every pair of buttons stands 12px apart — the card's YES/NO and the home rows' included — and the labels fit at 320");
{
  const sp3 = tokenPx("--sp-3"), sp2 = tokenPx("--sp-2");
  ok(`5.1 · the card's pair and the home rows' pair stand on --sp-3 (${sp3}px), the card's buttons pad --sp-2 (${sp2}px) a side`,
    sp3 === 12 && sp2 === 8 && rule(".mcardp-actions").includes("gap: var(--sp-3);") && rule(".kp-qrow__act").includes("gap: var(--sp-3);")
      && rule(".mcardp-actions .btn").includes("padding: 0 var(--sp-2);"));
  // The census: every element whose own children hold two or more buttons (a `btn` class, a Button, a SubmitButton).
  const TAGRE = new RegExp("<([a-zA-Z][A-Za-z0-9_.]*)((?:[^<>{}]|[{](?:[^{}]|[{][^{}]*[}])*[}])*?)(/?)>|</([a-zA-Z][A-Za-z0-9_.]*)>", "g");
  // A pair can carry its fixed gap as the first cn() argument and add only a
  // conditional layout class afterward (the Maswali slip's action rail does).
  // Read that fixed class rather than treating the entire container as unstyled.
  const CLS = new RegExp('className=(?:"([^"]*)"|[{]`([^`]*)`[}]|[{]cn[(]"([^"]*)")');
  const classOf = (attrs: string) => {
    const c = CLS.exec(attrs);
    return c ? (c[1] ?? c[2] ?? c[3] ?? "") : "";
  };
  const isBtn = (tag: string, a: string) => tag === "Button" || tag === "SubmitButton" || (new RegExp("[ " + QUOTE + "'" + BACKTICK + "]btn[ " + QUOTE + "'" + BACKTICK + "]").test(` ${a} `) && a.includes("btn-"));
  const pairs: Array<{ f: string; line: number; cls: string; n: number }> = [];
  for (const f of PLAYER_TSX) {
    const src = code(f);
    const stack: Array<{ tag: string; cls: string; line: number; n: number }> = [];
    for (const m of src.matchAll(TAGRE)) {
      if (m[4]) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === m[4]) { if (stack[i].n >= 2) pairs.push({ f, ...stack[i] }); stack.length = i; break; }
        continue;
      }
      if (isBtn(m[1], m[2] ?? "") && stack.length) stack[stack.length - 1].n++;
      if (m[3] !== "/") stack.push({ tag: m[1], cls: classOf(m[2] ?? ""), line: src.slice(0, m.index).split(NL).length, n: 0 });
    }
  }
  // S12 (WP9): Juu/Chini's journey arm — its column (`.kp-jud`: "Tumia … badala yake" above the commit) and its Up/Down pair
  // (`.kp-jud__sides`) — both on --sp-3, as the card's pair.
  // 2026-10-21 (S5-DESIGN-SLIP, the slip critic's M3): the Millionea confirm's pinned foot — its commit over its twin way back.
  const CSS_PAIRS: Record<string, string> = { "mcardp-actions": ".mcardp-actions", "kp-qrow__act": ".kp-qrow__act", "kp-wsheet__pair": ".kp-wsheet__pair", "kp-hero__ctas": ".kp-hero__ctas", "kp-jud": ".kp-jud", "kp-jud__sides": ".kp-jud__sides", "kp-mln-confirm__foot": ".kp-mln-confirm__foot" };
  const KEEP_PAIR: Array<[string, string, string]> = [
    ["src/app/agent/apply/apply-client.tsx", "flex items-center justify-between", "Back and Next at the row's two ends (`justify-between`): the gap is a floor, not their distance"],
    ["src/components/onboarding/first-visit-primer.tsx", "mt-6 flex items-center justify-between gap-3", "Back and Next at the row's two ends"],
    ["src/components/home/updown-band.tsx", "", "the score plate's two halves: its 4px gap is the plate's own 4px inset (concentric radii, G2), not a pair"],
    ["src/components/journey/journey-top-bar.tsx", "kp-jhdr__cluster", "the header's control cluster, on the header's own gaps"],
    ["src/app/profile/kyc/page.tsx", "", "either one button or the other (a condition), never two side by side"],
    ["src/app/profile/kyc/page.tsx", "rounded-xl border border-success-border bg-bg-elevated p-5 lg:p-6 text-center", "two branches of one condition"],
    ["src/app/profile/security/security-client.tsx", "rounded-xl glass-panel p-5 space-y-4", "a section's stacked rows, not a pair"],
    ["src/app/updown/history/page.tsx", "mt-6", "two branches of one condition"],
    ["src/app/millionea/tickets/page.tsx", "kp-mln-zh space-y-6", "two branches of one condition (S5-DESIGN-TICKETS M3): the empty list's call and an emptied lens's way out never stand together"],
    ["src/app/watchlist/page.tsx", "space-y-5", "a page's stacked sections, not a pair"],
    ["src/components/journey/bet-sheet/bet-sheet.tsx", "kp-bsheet__footer", "S8's receipt, terminal and editable branches: exactly one Button can render; terminal links are stacked, never a side-by-side button pair"],
    ["src/app/wallet/deposit/journey-deposit-form.tsx", "space-y-5", "the deposit form's field stack: the payment Button and Card link are separate full-width rows after the input fields"],
    ["src/app/wallet/deposit/wait/deposit-waiting-client.tsx", "space-y-5 pb-16", "the receipt page's status sections and conditional full-width actions are stacked as separate rows"],
  ];
  const at12 = (cls: string) => new RegExp("(?:^| )gap(?:-x)?-2(?: |$)").test(cls) || Object.keys(CSS_PAIRS).some((k) => cls.split(" ").includes(k) && rule(CSS_PAIRS[k]).includes("gap: var(--sp-3)"));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-SLIP): the rail's row draws ONE pay control (`payButton`, never swapped
  // for a second — the motion critic's focus note), so no pair stands in it for the census above; its gap is still read
  // from inside its cn(), the class the counts and the control share.
  const railRow = /<div className=\{cn\("flex items-center gap-2", actionLabel && armed && "flex-wrap"\)\}>/.exec(code("src/components/maswali/maswali-slip.tsx"))?.[0] ?? "";
  const slipRail = railRow ? { cls: classOf(railRow) } : null;
  ok("5.2a · the slip action rail's fixed gap inside cn() is read from its source",
    slipRail?.cls === "flex items-center gap-2" && at12(slipRail.cls), j(slipRail));
  const downgradedRail = classOf(' className={cn("flex items-center gap-1.5", actionLabel && "flex-wrap")}');
  ok("5.2a′ RED · the same cn() rail with an 8px gap is rejected",
    downgradedRail === "flex items-center gap-1.5" && !at12(downgradedRail), j({ downgradedRail }));
  const footerBranches = (s: string) => {
    const start = s.indexOf('<div className="kp-bsheet__footer">');
    if (start < 0) return false;
    // The footer's own extent, by its balanced <div>s: since 2026-10-14 the editable branch holds the refusal line's
    // <div> above the CTA, so the first </div> after the footer is no longer the footer's.
    let depth = 0, end = -1;
    for (const m of s.slice(start).matchAll(/<div\b|<\/div>/g)) {
      depth += m[0] === "</div>" ? -1 : 1;
      if (depth === 0) { end = start + (m.index ?? 0); break; }
    }
    if (end < 0) return false;
    const footer = s.slice(start, end);
    // Exactly one Button per branch: receipt → continue, terminal → "Got it" (its links stack), editable → the commit,
    // with only non-button status rows (placing, the refusal line) above it.
    return (footer.match(/<Button\b/g) ?? []).length === 3
      && /\{receipt \? <Button\b[\s\S]*: terminal \? <>[\s\S]*<Button\b[\s\S]*<\/> : <>(?:(?!<Button\b)[\s\S])*\{footerLine && <Button\b[\s\S]*<\/>\}/.test(footer);
  };
  const kept = (p: { f: string; cls: string }) => KEEP_PAIR.some(([f, cls]) => f === p.f && cls === p.cls)
    && (p.f !== "src/components/journey/bet-sheet/bet-sheet.tsx" || p.cls !== "kp-bsheet__footer" || footerBranches(code(p.f)));
  const offPairs = pairs.filter((p) => !at12(p.cls) && !kept(p));
  ok(`5.2 · every pair of buttons on a player surface stands 12px apart (gap-2 on the override scale, or a pair class on --sp-3) — ${pairs.length} containers, ${pairs.filter((p) => kept(p)).length} named for what they are instead (ends of a row, a plate, a cluster, branches)`,
    pairs.length >= 35 && offPairs.length === 0, j(offPairs));
  ok("5.2′ · the error view's pair is on `gap-2` — it stood on the stock 10px step, which R6-C's large-button census could not see (its buttons are `btn-md`)",
    code("src/components/ui/route-error.tsx").includes('<div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">'));
  const plantedPairs = [{ f: "src/components/ui/route-error.tsx", cls: "mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center" }, { f: "x.tsx", cls: "grid grid-cols-2 gap-1.5" }];
  ok("5.2″ PLANT · a 10px pair (the stock 2.5 step) and an 8px pair (1.5) are each reported", plantedPairs.every((p) => !at12(p.cls) && !kept(p)));
  const sheetSource = code("src/components/journey/bet-sheet/bet-sheet.tsx");
  ok("5.2‴ CONTROL · S8's named footer permits only its mutually exclusive action; an added button or lost receipt condition is rejected",
    footerBranches(sheetSource) && !footerBranches(sheetSource.replace('<div className="kp-bsheet__footer">', '<div className="kp-bsheet__footer"><Button>extra</Button>'))
      && !footerBranches(sheetSource.replace('{receipt ? <Button', '{receipt && <Button'))
      && !footerBranches(sheetSource.replace("{footerLine && <Button", "<Button>beside</Button>{footerLine && <Button")));

  // 5.3 · the labels at 320, by the fonts' own advances (no kerning: Inter's kerning only tightens these pairs, so this is
  // an upper bound), every character's tracking counted (a browser adds it after the last one too).
  const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; glyphForCodePoint: (c: number) => { advanceWidth: number } } };
  const fMed = fontkit.openSync("src/lib/server/reports/fonts/Inter-Medium.ttf"), fBold = fontkit.openSync("src/lib/server/reports/fonts/Inter-Bold.ttf");
  const adv = (f: typeof fMed, s: string, size: number) => [...s].reduce((w, ch) => w + (ch.codePointAt(0)! >= 0x3400 ? size : f.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / f.unitsPerEm * size), 0);
  const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, { common: Record<string, string>; market: Record<string, string> }> };
  const words = ["sw", "en", "zh"].flatMap((l) => [dict[l].common.yes, dict[l].common.no, dict[l].market.udUp, dict[l].market.udDown]);
  const PRICE = " @ 99%";
  // The card: Inter 600 13px (Medium and Bold advances averaged), 0.04em = 0.52px tracking inherited by the 11.5px mono price.
  const cardLabel = (w: string, price: boolean) => (adv(fMed, w, 13) + adv(fBold, w, 13)) / 2 + [...w].length * 0.52 + (price ? PRICE.length * (0.6 * 11.5 + 0.52) : 0);
  const content320 = 320 - 2 * 16 - 2 * 1 - 2 * 15;
  const btn = (content320 - sp3) / 2;
  const room = btn - 2 * sp2 - 2 * 1, roomOld = btn - 2 * 10 - 2 * 1;
  const widest = Math.max(...words.flatMap((w) => [cardLabel(w, false), cardLabel(w, true)]));
  ok(`5.3 · at 320 each of the card's buttons is ${btn}px (the content box ${content320}px less 12) and leaves its label ${room}px; the widest label, Swahili's priced "HAPANA @ 99%", is ${widest.toFixed(2)}px — it fits, ${((btn - 2 - widest) / 2).toFixed(2)}px from each border`,
    content320 === 256 && btn === 122 && widest <= room && widest > 100);
  ok(`5.3′ CONTROL · at the old 10px padding the same label ran ${(widest - roomOld).toFixed(2)}px into it (room ${roomOld}px) — the padding is part of the fit, not decoration`, widest > roomOld);
  // The home rows: 288px at 320 (the rule's own note), Inter 700 14px tracked 0.06em = 0.84px, a 13px mono price, 8px padding.
  const rowLabel = (w: string, price: boolean) => adv(fBold, w, 14) + [...w].length * 0.84 + (price ? PRICE.length * (0.6 * 13 + 0.84) : 0);
  const half = (288 - sp3) / 2, rowRoom = half - 2 * 8 - 2;
  const rowWidest = Math.max(...["sw", "en", "zh"].flatMap((l) => [dict[l].common.yes, dict[l].common.no]).flatMap((w) => [rowLabel(w, false), rowLabel(w, true)]));
  ok(`5.4 · the home rows' halves are ${half}px at 320 and the widest label is ${rowWidest.toFixed(2)}px (Inter Bold — the weight it is set in — no kerning) against ${rowRoom}px`, rowWidest <= rowRoom);
}

/* ══ §6 · A6 · EVERY DASHED TRACK STARTS AND ENDS ON A WHOLE DASH ══════════════════════════════════════════════════════ */
section("6 · A6 a dashed track starts and ends on a whole dash at every width — one rule (`.kp-dashfit`), and every sibling");
{
  ok("6.1 · `.kp-dashfit` lays whole tiles with `space` on a layer one gap past its host's end, clipped by the host",
    rule(".kp-dashfit").includes("overflow: hidden;")
      && rule(".kp-dashfit::before").includes("inset-inline-end: calc(var(--dash-len) - var(--dash-pitch));")
      && rule(".kp-dashfit::before").includes("background: var(--dash-tile) 0 0 / var(--dash-pitch) 100% space no-repeat;"));
  // The model of `background-repeat: space` on an area of W + (pitch − dash): n whole tiles, the first at 0, the last ending
  // its dash at W, the spare width shared between them.
  const fit = (W: number, dash: number, pitch: number) => {
    const area = W + pitch - dash, n = Math.floor(area / pitch), s = n > 1 ? (area - n * pitch) / (n - 1) : 0;
    return { n, lastEnd: (n - 1) * (pitch + s) + dash, gap: pitch - dash + s };
  };
  const widths = Array.from({ length: 1300 }, (_, i) => 40 + i);
  const bad = (dash: number, pitch: number) => widths.filter((W) => { const r = fit(W, dash, pitch); return !(r.n >= 2 && near(r.lastEnd, W, 1e-9) && r.gap >= pitch - dash - 1e-9); });
  const r362 = fit(362, 8, 15);
  ok(`6.2 · at every width from 40 to 1339px both tracks end their last dash on the edge with gaps never under their own — the board's one-sided rail at 362px: ${r362.n} dashes, ${r362.gap.toFixed(2)}px apart`,
    bad(8, 15).length === 0 && bad(2, 7).length === 0 && r362.n === 24, j({ rail: bad(8, 15).slice(0, 5), locked: bad(2, 7).slice(0, 5) }));
  ok("6.2′ CONTROL · the old pattern, repeated from the left end, ended the 362px rail on a 2px stub (362 = 24 × 15 + 2)", 362 % 15 === 2 && 362 % 15 < 8);
  const tok = new RegExp(`--bar-empty-track:${WS}*([^;]*);`).exec(CSS)?.[1] ?? "";
  ok("6.3 · the rail's token is ONE dash tile (no repeating gradient), and `.tipbar-empty` lays it by the rule: positioned, its three variables, its 1px ring over the dashes",
    tok === "linear-gradient(90deg, var(--border-strong) 0 8px, transparent 8px)" && tokenPx("--bar-empty-dash") === 8 && tokenPx("--bar-empty-pitch") === 15
      && rule(".tipbar-empty").includes("position: relative;") && rule(".tipbar-empty").includes("--dash-tile: var(--bar-empty-track);")
      && rule(".tipbar-empty").includes("--dash-len: var(--bar-empty-dash);") && rule(".tipbar-empty").includes("--dash-pitch: var(--bar-empty-pitch);")
      && !rule(".tipbar-empty").includes("background") && rule(".tipbar-empty::after").includes("box-shadow: inset 0 0 0 1px var(--border);")
      && code("src/components/brand.tsx").includes('className="tipbar-empty kp-dashfit"'));
  ok("6.4 · Up & Down's locked stretch is an html line of the same rule — whole 2px dashes on a 7px pitch, post to post, in its own ink and 0.55 — no svg line dashes it any more",
    code("src/components/charts/updown-match-track.tsx").includes('<span className="kp-udtrack__locked kp-dashfit" style={at(g.gatePct)} />')
      && !code("src/components/charts/updown-match-track.tsx").includes('<line className="kp-udtrack__locked"')
      && ["position: absolute;", "left: calc(var(--x) + 0.5px);", "right: 0.5px;", "height: 1px;", "color: var(--text-subtle);", "opacity: 0.55;", "--dash-len: 2px;", "--dash-pitch: 7px;", "--dash-tile: linear-gradient(90deg, currentColor 0 2px, transparent 2px);"].every((d) => rule(".kp-udtrack__locked").includes(d)));
  // Fixed-length dashed lines (in a viewBox) end on a whole dash by their numbers; a dashed circle by `pathLength`.
  const wholeEnd = (len: number, dash: number, gap: number) => { const r = len % (dash + gap); return near(r, 0, 1e-9) || r >= dash - 1e-9; };
  const pnl = code("src/components/charts/pnl-chart.tsx");
  const X0 = Number(new RegExp("const X0 = ([0-9.]+)").exec(pnl)?.[1]), X1 = Number(new RegExp("X1 = ([0-9.]+)").exec(pnl)?.[1]);
  const hero = code("src/components/updown/price-hero.tsx");
  const heroLines = [...hero.matchAll(new RegExp('x1="0" y1=[{][A-Za-z]+[}] x2="([0-9.]+)" y2=[{][A-Za-z]+[}][^>]*strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))];
  const roundLine = code("src/components/charts/round-live-line.tsx");
  const roundReference = (s: string) => /<line x1="0" x2="([0-9.]+)" y1=\{y\(openPrice\)\} y2=\{y\(openPrice\)\} stroke="var\(--text-faint\)" strokeWidth="1" strokeDasharray="([0-9.]+) ([0-9.]+)"/.exec(s);
  const roundDash = roundReference(roundLine);
  const pnlLines = [...pnl.matchAll(new RegExp('strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))];
  ok(`6.5 · the P&L and detail chart reference lines, and the round card's ${roundDash?.[1] ?? "missing"}-unit opening reference, each end on a whole dash`,
    pnlLines.length === 3 && pnlLines.every((m) => wholeEnd(X1 - X0, Number(m[1]), Number(m[2])))
      && heroLines.length === 3 && heroLines.every((m) => wholeEnd(Number(m[1]), Number(m[2]), Number(m[3])))
      && !!roundDash && wholeEnd(Number(roundDash[1]), Number(roundDash[2]), Number(roundDash[3])));
  const roundBadSource = roundLine.replace('strokeDasharray="3 4"', 'strokeDasharray="3 3"');
  const roundBad = roundReference(roundBadSource);
  ok("6.5′ PLANT · the round card's opening reference ending on a broken dash is caught",
    roundBadSource !== roundLine && !!roundBad && !wholeEnd(Number(roundBad[1]), Number(roundBad[2]), Number(roundBad[3])));
  const circlePeriods = (src: string) => [...src.matchAll(new RegExp('<circle[^>]*pathLength=[{"]?([0-9.]+)[}"]?[^>]*strokeDasharray="([0-9.]+) ([0-9.]+)"', "g"))].map((m) => Number(m[1]) / (Number(m[2]) + Number(m[3])));
  const DASH_IN_GLYPHS = new RegExp("strokeDasharray|stroke-dasharray");
  // PHOSPHOR-MIGRATION W2: the hand-drawn clockPending's dashed ring went with its family — Phosphor's clock-countdown is a
  // filled outline, no dash — so the dial's empty ring is the one dashed ring left, and the glyph file holds none.
  const rings = circlePeriods(code("src/components/brand.tsx"));
  ok(`6.6 · every dashed ring closes on whole dashes by pathLength — the dial's empty ring: ${rings.map((p) => `${p} periods`).join(", ")}; the glyph family draws none`,
    rings.length === 1 && rings.every((p) => near(p, Math.round(p), 1e-9)) && !DASH_IN_GLYPHS.test(raw("src/components/ui/glyphs.tsx")));
  ok("6.6′ PLANT · the hand-drawn clockPending's ring as it was before R9-A6 — 3.4 + 3 on its 54.04-unit ring, no pathLength — is 8.44 periods", !near((2 * Math.PI * 8.6) / 6.4, Math.round((2 * Math.PI * 8.6) / 6.4), 1e-3));
  // The census: every dash pattern on a player surface is one of these, or not a pattern at all (a ring's progress arc, a
  // draw-on), or a texture.
  const DASHES = new RegExp("strokeDasharray|stroke-dasharray|repeating-linear-gradient|repeating-radial-gradient", "g");
  const KNOWN: Record<string, string> = {
    "src/components/charts/pnl-chart.tsx": "three fixed lines, 6.5", "src/components/updown/price-hero.tsx": "three fixed lines, 6.5",
    "src/components/charts/round-live-line.tsx": "the round card's neutral opening-price reference, 6.5",
    "src/components/brand.tsx": "the dial's empty ring by pathLength, 6.6",
    "src/components/badges/Badge.tsx": "a progress arc (dasharray = its circumference), not a pattern", "src/components/charts/ring.tsx": "donut segments, not a pattern",
    "src/components/positions/countdown-ring.tsx": "a progress arc, not a pattern",
    "src/components/maswali/maswali-unbroken-line.tsx": "a draw-on (`.m-draw`: the dasharray is the path's own length, set only while it draws), not a pattern",
  };
  const found = PLAYER_TSX.filter((f) => DASHES.test(code(f)));
  DASHES.lastIndex = 0;
  const cssDashes = [...CSS.matchAll(new RegExp("[^;{}]*(?:stroke-dasharray|repeating-(?:linear|radial)-gradient)[^;]*;", "g"))].map((m) => squash(m[0]));
  const CSS_KNOWN = [new RegExp("mcardp-spark-line|stroke-dasharray:1;|stroke-dasharray: ?1;|stroke-dasharray:none"), new RegExp("repeating-linear-gradient[(](?:45|-45)deg, transparent 0 22px"), new RegExp("repeating-radial-gradient")];
  ok(`6.7 · every dash pattern on a player surface is accounted for — ${found.length} files and ${cssDashes.length} stylesheet declarations: fitted tracks, fixed lines, rings, progress arcs, a draw-on and two textures`,
    found.every((f) => f in KNOWN) && cssDashes.every((d) => CSS_KNOWN.some((re) => re.test(d))) && !CSS.includes("repeating-linear-gradient(90deg"), j({ files: found.filter((f) => !(f in KNOWN)), css: cssDashes.filter((d) => !CSS_KNOWN.some((re) => re.test(d))) }));
}

/* ══ §7 · NO DICTIONARY WORD CHANGED ════════════════════════════════════════════════════════════════════════════════════ */
section("7 · composition only: the dictionary is the commit's, byte for byte");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).split(CR).join(""); } catch { head = "‹git unavailable›"; }
  ok("7.1 · src/lib/i18n-dict.ts is the commit's own", head === raw("src/lib/i18n-dict.ts"));
}

console.log(`${NL}visual-pass-r9a: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log(`${NL}FAILURES:`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
