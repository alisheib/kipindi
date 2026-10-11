/**
 * 50pick custom line-icon family — 24px grid · 1.9 stroke · round joins.
 * Ported from Claude Design's Identity Sprint. One coherent heraldic set:
 * categories · actions · nav · status · trust + decoratives (crown/shield/seal).
 * Pure SVG, dependency-free, currentColor. Use `<I.crypto s={14} />`.
 *
 * TWO grids, ONE weight: `G` draws the 24-grid icons, `GL` the 64-grid
 * empty-state line-arts, and both stroke at 1.9. (The 56-grid badge medallions
 * in `src/components/badges/icons.tsx` are a separate documented tier at 2.2.)
 */
import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode, type SVGProps } from "react";

/* ⭐ DG-A-19 — `s` IS THE SIZE PROP. THE `size` ALIAS IS GONE, AND ITS REASON WAS SPENT.
   It read: *"`size` is accepted as a lucide-compatible alias so icons swap from lucide → I.*
   without renaming every call site's prop."* That migration finished — `da19ead5`, 2026-06-06 —
   so the alias had stopped buying anything and was only costing the kit two spellings for one
   idea, which is what DG-A-19 files. Measured before removing it: **64 call sites in 30 files
   wrote `size=` against 608 writing `s=`, and every single one of the 64 was under
   `src/app/admin/`** — so the drift was one surface, not the platform.
   ⭐ The removal is zero-visual by construction (`width={s ?? size}` returned the same number
   either way) and it needs NO new guard: deleting `size?: number` from this type makes a
   reintroduction a COMPILE ERROR, and `tsc --noEmit` already runs in the pipeline. A guard you
   get for free by deleting something is better than one you have to write. */
/** The side of its run a glyph stands on: its ink, not its box, lands on that edge (R9-A4, `edge` below). */
export type GlyphEdge = "start" | "end";
/** The face and weight of the words a mark stands among: it strokes at their stem (R9-A4, `text` and `GLYPH_STEM` below). */
export type GlyphText = keyof typeof GLYPH_STEM;
type GlyphProps = { s?: number; edge?: GlyphEdge; text?: GlyphText } & Omit<SVGProps<SVGSVGElement>, "ref">;

/* ⭐ DG-A-19, THE OTHER HALF — THE SIZE SPREAD, AND WHY IT SURVIVED A CONSOLIDATION.
   The prop half above closed. The size half did not: admin carries SIXTEEN distinct glyph
   sizes (10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,28) across ~326 call sites, and the
   per-context constants DG-A-19 specifies existed NOWHERE in `src/`.

   ⛔ THE FINDING SAT IN NO STEP ROW OF THE DESIGN GATE'S WORK ORDER, so the gate closed
   45/45 without it. A score computed over a hand-chosen population cannot see what was
   never added to the population — the gate was not wrong, it was simply never asked.

   ⭐ WHERE THE DRIFT ACTUALLY COMES FROM, measured rather than assumed: `IconPlate` says in
   as many words that *"the glyph inside is the caller's — it is NOT scaled here."* That is a
   deliberate choice for a plate whose contents vary, but it means every plate caller picks a
   glyph size by hand, and at 40px they picked 17, 20 and 21. `plateGlyph` closes that: the
   glyph is DERIVED from the plate edge, so the pair can no longer disagree.

   ⚠️ THESE VALUES ARE TODAY'S PIXELS, NOT A NEW SCALE. 36→19, 44→23 and 48→24 are what the
   call sites already render, so adopting them is zero-visual BY CONSTRUCTION. Only 40 moves
   anything, because 40 is where the call sites contradicted each other; 20 is the value four
   of the six already used. ⛔ Do not "tidy" these into a ratio — a ratio is what produced the
   four arbitrary plate radii B10.2 had to overrule. */
export const GLYPH = {
  /** Inside a line of text, on the text's own baseline. */
  inline: 12,
  /** The lead glyph of a table/list ROW. */
  row: 16,
  /** The lead glyph of a CARD or section head. */
  card: 18,
} as const;

/* ⛔ THERE IS DELIBERATELY NO `notice` OR `empty` HERE, AND THE REASON IS THE POINT.
   The first draft of this block had both. Then the call sites were read instead of imagined:
   dialog notices render at 20 (`emergency-void-control`, `void-round-control`) AND at 24
   (`kyc-doc-viewer`); empty states at 20 (`admin/page`) AND at 28 (`kyc-doc-viewer`). Naming a
   constant `notice: 24` would not have RECORDED that context — it would have INVENTED one, and
   then moved four working screens to satisfy it. ⭐ A constant must describe what is there; the
   moment it describes what you wish were there, every site it "fixes" is a change you cannot
   justify from a measurement. Those contexts get constants when someone has actually ruled on
   them — until then the ratchet below stops them SPREADING, which is the part that was urgent. */

/** The glyph that sits centred on an `IconPlate` of the given edge, derived — never hand-picked. */
export function plateGlyph(plateEdge: 36 | 40 | 44 | 48): number {
  return { 36: 19, 40: 20, 44: 23, 48: 24 }[plateEdge];
}

/* ⭐ R9-A4 (round 9 of the visual pass, 2026-10-11) · THE EDGE-ICON RULE — A GLYPH AT A RUN'S START OR END PUTS ITS INK ON
   THAT EDGE. Every drawing here pads itself inside its 24-unit box (a chevron's point stands at x15 of 24, its stroke 0.95
   beyond), so a glyph that ended a link or a row stopped 3–6px short of the edge its neighbours end on: the card's
   "Maelezo ›" 3.7px short of the card's content edge (tiles 133–160), the Wallet's "Risiti zote ›" 5px (172), the hub's
   chevrons 6px inside the card-size switch's edge (264), the deposit head's glyph 2.4px inside its title (round 7's D5),
   and the held capsule's lock 2.7px inside its padding, which set its contents 1px right of centre (088, 089). Rounds 3
   and 4 answered two of these with typed numbers (a 3px negative start margin on the back link's chevron, 2px at the
   source link's end).
   `edge` replaces every such number with one rule: the glyph is pulled past its run's edge by exactly the gap between its
   box and its ink, measured from the drawing itself (its paths, circles, rects and lines, and their stroke), so the ink
   lands on the edge at any size and a redrawn glyph cannot leave a stale number behind.
   ⭐ `text` IS THE OTHER HALF — A MARK INSIDE A LINE OF WORDS STROKES AT THE WORDS' OWN STEM. At 11px the family's 1.9-unit
   stroke paints 0.87px, and on tile 194 the card's chevron read 0.6px across its arm against 2.0px for "Maelezo"'s Sora
   600 stems. A chevron, an arrow or an external-link mark that ends or starts a run of words is typography, so it takes
   the run's weight: its stroke is the stem of the run's face and weight (`GLYPH_STEM`, in em of the run's own type size,
   never scaled by the glyph's box: `.kp-gtext` in globals.css) — in a button too, where the mark keeps its box but not a
   lighter stroke. A pictogram beside words (the receipt, the wallet, a trend arrow) keeps the family's stroke.
   ⛔ WHAT KEEPS ITS BOX, AND WHY: a glyph inside a button (the button's even padding frames glyph and label as one group,
   and a pending spinner takes the glyph's slot — SubmitButton swaps them — so a pulled glyph would make the label jump), a
   glyph alone in a control or a plate (its box centres it, and its drawing is centred in the box — the census below), a
   column of row glyphs (the hub's, a menu's: they align on one axis, whatever each draws), and a glyph between words.
   `test:visual-pass-r9a` holds every site to one of these. */

/** A stem as a fraction of its type size, for each face and weight a mark is set among — read from the faces themselves:
 *  `body` is Inter (its `l`: 400 0.0879 · 500 0.1074 · 700 0.1465, the repo's own TTFs; 600 between 500 and 700), `display`
 *  Sora (its `I`: 600 0.142 · 700 0.164, Sora v17 as fonts.gstatic.com serves it), `mono` JetBrains Mono (its `H`: 400
 *  0.090 · 700 0.125, the repo's TTFs; 600 between). A weight alone could not say it: at 700 JetBrains Mono's stem is 15%
 *  under Inter's and 24% under Sora's. `test:visual-pass-r9a` §4 reads the Inter and JetBrains Mono values from the files. */
export const GLYPH_STEM = {
  "body-400": 0.088, "body-500": 0.107, "body-600": 0.127, "body-700": 0.147,
  "display-600": 0.142, "display-700": 0.164,
  "mono-400": 0.09, "mono-600": 0.108, "mono-700": 0.125,
} as const;

const NUMBER = /[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?/y;

/** How far a path's geometry reaches left and right, in grid units, stroke left out: exact for lines, arcs and curves. */
function pathReachX(d: string): [number, number] {
  let lo = Infinity, hi = -Infinity;
  const at = (x: number) => { if (x < lo) lo = x; if (x > hi) hi = x; };
  let i = 0, cmd = "", last = "", x = 0, y = 0, sx = 0, sy = 0, kx = 0, ky = 0;
  // Separators: space, comma, tab, line feed, carriage return (by code, so this file holds no escape sequence).
  const skip = () => { while (i < d.length && [32, 44, 9, 10, 13].includes(d.charCodeAt(i))) i++; };
  const num = () => {
    skip();
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) throw new Error(`glyph path: no number at ${i} in "${d}"`);
    i = NUMBER.lastIndex;
    return Number(m[0]);
  };
  const flag = () => { skip(); return d[i++] === "1"; };
  /** A cubic's turning points between its ends: the roots of its derivative inside (0, 1). */
  const cubic = (p0: number, p1: number, p2: number, p3: number) => {
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
    const ts: number[] = [];
    if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); }
    else { const q = b * b - 4 * a * c; if (q >= 0) { const r = Math.sqrt(q); ts.push((-b + r) / (2 * a), (-b - r) / (2 * a)); } }
    for (const t of ts) if (t > 0 && t < 1) { const u = 1 - t; at(u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3); }
  };
  const quad = (p0: number, p1: number, p2: number) => {
    const den = p0 - 2 * p1 + p2;
    if (Math.abs(den) > 1e-12) { const t = (p0 - p1) / den; if (t > 0 && t < 1) { const u = 1 - t; at(u * u * p0 + 2 * u * t * p1 + t * t * p2); } }
  };
  /** An arc's turning points: its centre (SVG's endpoint-to-centre conversion), then the two angles where x turns, if swept. */
  const arc = (x1: number, y1: number, rx: number, ry: number, deg: number, large: boolean, sweep: boolean, x2: number, y2: number) => {
    if (!rx || !ry || (x1 === x2 && y1 === y2)) return;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const phi = (deg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
    const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const top = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
    const bottom = rx * rx * yp * yp + ry * ry * xp * xp;
    let co = bottom ? Math.sqrt(Math.max(0, top / bottom)) : 0;
    if (large === sweep) co = -co;
    const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx;
    const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
    let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    else if (sweep && dt < 0) dt += 2 * Math.PI;
    // x(θ) = cx + rx·cosφ·cosθ − ry·sinφ·sinθ turns where tanθ = −(ry·sinφ)/(rx·cosφ): at θ* and θ* + π.
    const turn = Math.atan2(-ry * sp, rx * cp), full = 2 * Math.PI;
    for (const c of [turn, turn + Math.PI]) {
      const into = sweep ? (((c - t1) % full) + full) % full : (((t1 - c) % full) + full) % full;
      if (into <= Math.abs(dt)) at(cx + rx * cp * Math.cos(c) - ry * sp * Math.sin(c));
    }
  };
  for (;;) {
    skip();
    if (i >= d.length) break;
    const ch = d[i];
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) { cmd = ch; i++; }
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd >= "a" && cmd <= "z";
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "Z": x = sx; y = sy; break;
      case "M": x = ox + num(); y = oy + num(); sx = x; sy = y; at(x); break;
      case "L": x = ox + num(); y = oy + num(); at(x); break;
      case "H": x = ox + num(); at(x); break;
      case "V": y = oy + num(); break;
      case "C": {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        void y1; cubic(x, x1, x2, ex); kx = x2; ky = y2; x = ex; y = ey; at(x); break;
      }
      case "S": {
        const x1 = last === "C" || last === "S" ? 2 * x - kx : x;
        const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x, x1, x2, ex); kx = x2; ky = y2; x = ex; y = ey; at(x); break;
      }
      case "Q": {
        const x1 = ox + num(), y1 = oy + num(), ex = ox + num(), ey = oy + num();
        quad(x, x1, ex); kx = x1; ky = y1; x = ex; y = ey; at(x); break;
      }
      case "T": {
        const reflect = last === "Q" || last === "T";
        const x1 = reflect ? 2 * x - kx : x, y1 = reflect ? 2 * y - ky : y;
        const ex = ox + num(), ey = oy + num();
        quad(x, x1, ex); kx = x1; ky = y1; x = ex; y = ey; at(x); break;
      }
      case "A": {
        const rx = num(), ry = num(), deg = num(), large = flag(), sweep = flag(), ex = ox + num(), ey = oy + num();
        arc(x, y, rx, ry, deg, large, sweep, ex, ey); x = ex; y = ey; at(x); break;
      }
      default: throw new Error(`glyph path: command "${cmd}" in "${d}"`);
    }
    last = cmd.toUpperCase();
  }
  return [lo, hi];
}

/** Each part of a drawing: how far its geometry reaches across the row, and how it is stroked — at its own width, at the
 *  wrapper's (`own: false`), or not at all (a filled part). */
type Part = { x0: number; x1: number; w: number; own: boolean };
function partsOf(children: ReactNode, base: number): Part[] {
  const out: Part[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const p = c.props as Record<string, unknown>;
    const n = (k: string) => Number(p[k] ?? 0);
    let x0: number, x1: number;
    if (c.type === "path") [x0, x1] = pathReachX(String(p.d));
    else if (c.type === "circle") { x0 = n("cx") - n("r"); x1 = n("cx") + n("r"); }
    else if (c.type === "ellipse") { x0 = n("cx") - n("rx"); x1 = n("cx") + n("rx"); }
    else if (c.type === "rect") { x0 = n("x"); x1 = n("x") + n("width"); }
    else if (c.type === "line") { x0 = Math.min(n("x1"), n("x2")); x1 = Math.max(n("x1"), n("x2")); }
    else return;
    const stroked = p.stroke !== "none";
    out.push({ x0, x1, w: stroked ? (p.strokeWidth != null ? Number(p.strokeWidth) : base) : 0, own: p.strokeWidth != null || !stroked });
  });
  return out;
}

const fix = (v: number) => Math.round(v * 1000) / 1000;

/** What an edge glyph or a text mark adds to its svg: the pull past its run's edge (a negative inline margin, the gap
 *  between its box and its ink) and the text stroke. A text mark's stroke is its words' stem in em, so the half of it
 *  that sits beyond the geometry joins the margin in em too. */
function glyphFit(children: ReactNode, size: number, edge: GlyphEdge | undefined, text: GlyphText | undefined, p: GlyphProps): { className?: string; style: CSSProperties } {
  // `--g-stem` is defined here, as a key (where `test:css-vars-defined` reads a definition); `.kp-gtext` strokes with it.
  const style: Record<string, string | number> = { ...(p.style as Record<string, string | number> | undefined), ...(text ? { "--g-stem": `${GLYPH_STEM[text]}em` } : {}) };
  const k = size / 24;
  if (edge) {
    const parts = partsOf(children, p.strokeWidth != null ? Number(p.strokeWidth) : 1.9);
    const runParts = text ? parts.filter((q) => !q.own) : [];
    const ownParts = text ? parts.filter((q) => q.own) : parts;
    const halfStem = text ? GLYPH_STEM[text] / 2 : 0;
    if (edge === "end") {
      const reach = Math.max(...ownParts.map((q) => q.x1 + q.w / 2), ...runParts.map((q) => q.x1));
      style.marginInlineEnd = runParts.length ? `calc(${fix(-(24 - reach) * k)}px + ${halfStem}em)` : `${fix(-(24 - reach) * k)}px`;
    } else {
      const reach = Math.min(...ownParts.map((q) => q.x0 - q.w / 2), ...runParts.map((q) => q.x0));
      style.marginInlineStart = runParts.length ? `calc(${fix(-reach * k)}px + ${halfStem}em)` : `${fix(-reach * k)}px`;
    }
  }
  return { className: text ? (p.className ? `kp-gtext ${p.className}` : "kp-gtext") : p.className, style: style as CSSProperties };
}

/* ⛔ A glyph without `edge` or `text` renders exactly the markup it always did (the same attributes, in the same order):
   the classic chrome's glyphs are captured by `qa:classic-shell-parity`, and none of them asks for either. */
const G = ({ children, s, edge, text, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={s ?? 24} height={s ?? 24} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p} {...(edge || text ? glyphFit(children, s ?? 24, edge, text, p) : {})}>{children}</svg>
);

/** Is this node one of the family's glyphs? A slot that leads or ends a run (PageHeader's and AuthHeader's eyebrow) pulls
 *  a glyph to its edge, and leaves anything else as given. */
export function edgeGlyph(node: ReactNode, edge: GlyphEdge): ReactNode {
  if (!isValidElement(node) || !GLYPH_SET.has(node.type)) return node;
  return cloneElement(node as ReactElement<GlyphProps>, { edge });
}

/* The ONE 64-grid wrapper — every empty-state line-art uses it.
 *
 * ⚠️ There used to be two (`GL` at 1.9 and `G64` at 2.2), so neighbouring empty
 * states were drawn 16% apart in weight: the markets/positions/leaderboard arts
 * at 1.9 and the proposals/KYC/fairness/RG/admin arts at 2.2. The kit's own
 * empty-state note (the BONUS block below) specifies 1.9 — the same weight as
 * the 24-grid family — so 1.9 is the tier and `G64` is gone.
 *
 * The 56-grid BADGE set (`src/components/badges/icons.tsx`) is a DIFFERENT,
 * deliberate tier at 2.2: those are filled medallions read at ~32–56px, not
 * line-arts, and they are not neighbours of anything drawn here. */
// A 64-grid line-art is never an edge glyph or a text mark: the two props are dropped here, never passed to the DOM.
const GL = ({ children, s, edge: _edge, text: _text, ...p }: GlyphProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" width={s ?? 64} height={s ?? 64} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

const Ibase = {
  /* categories */
  football: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9.2" /><path d="M12 8.4L15.4 10.9L14.1 14.9H9.9L8.6 10.9Z" /><line x1="12" y1="8.4" x2="12" y2="2.8" /><line x1="15.4" y1="10.9" x2="20.8" y2="9.2" /><line x1="14.1" y1="14.9" x2="17.4" y2="19.5" /><line x1="9.9" y1="14.9" x2="6.6" y2="19.5" /><line x1="8.6" y1="10.9" x2="3.2" y2="9.2" /></G>,
  politics: (p: GlyphProps) => <G {...p}><path d="M3.5 8L12 3L20.5 8H3.5Z" /><line x1="7" y1="10.5" x2="7" y2="16.5" /><line x1="12" y1="10.5" x2="12" y2="16.5" /><line x1="17" y1="10.5" x2="17" y2="16.5" /><line x1="4.5" y1="18.5" x2="19.5" y2="18.5" /><line x1="3" y1="21" x2="21" y2="21" /></G>,
  forex: (p: GlyphProps) => <G {...p}><path d="M19.5 8.5A8 8 0 0 0 5.5 5.8" /><path d="M5.3 1.8L5.5 6L9.7 6.4" /><path d="M4.5 15.5A8 8 0 0 0 18.5 18.2" /><path d="M18.7 22.2L18.5 18L14.3 17.6" /></G>,
  weather: (p: GlyphProps) => <G {...p}><path d="M6.5 14H17.5A3.6 3.6 0 0 0 17.9 6.8A5.2 5.2 0 0 0 7.9 5.6A4.2 4.2 0 0 0 6.5 14Z" /><line x1="9.5" y1="17" x2="8" y2="20.5" /><line x1="13.5" y1="17" x2="12" y2="20.5" /><line x1="17.5" y1="17" x2="16" y2="20.5" /></G>,
  economy: (p: GlyphProps) => <G {...p}><path d="M4 3.5V19.5H21" /><path d="M6.5 15.5L11 11L13.5 13L19 7" /><path d="M15.5 6.5H19.5V10.5" /></G>,
  crypto: (p: GlyphProps) => <G {...p}><path d="M12 3L19.5 7.5V16.5L12 21L4.5 16.5V7.5Z" /><circle cx="12" cy="12.2" r="2.2" /><line x1="13.9" y1="11.1" x2="19.5" y2="7.5" /><line x1="12" y1="14.4" x2="12" y2="21" /><line x1="10.1" y1="11.1" x2="4.5" y2="7.5" /></G>,
  entertainment: (p: GlyphProps) => <G {...p}><ellipse cx="12" cy="6.5" rx="6.5" ry="2.4" /><path d="M5.5 6.5C5.5 12 7 15.5 8 19" /><path d="M18.5 6.5C18.5 12 17 15.5 16 19" /><path d="M8 19A4.5 1.8 0 0 0 16 19" /><line x1="8" y1="9.5" x2="13.5" y2="15.5" /><line x1="16" y1="9.5" x2="10.5" y2="15.5" /></G>,
  tech: (p: GlyphProps) => <G {...p}><line x1="12" y1="21" x2="12" y2="10" /><circle cx="12" cy="7.5" r="2" /><path d="M9 10A4.2 4.2 0 0 1 9 5" /><path d="M6.8 11.5A7.4 7.4 0 0 1 6.8 3.5" /><path d="M15 5A4.2 4.2 0 0 1 15 10" /><path d="M17.2 3.5A7.4 7.4 0 0 1 17.2 11.5" /><line x1="7" y1="21" x2="17" y2="21" /></G>,
  /* actions */
  trade: (p: GlyphProps) => <G {...p}><path d="M8 4v16M8 20l-3-3M8 20l3-3" /><path d="M16 20V4M16 4l-3 3M16 4l3 3" /></G>,
  watch: (p: GlyphProps) => <G {...p}><path d="M6 4h12v16l-6-4-6 4z" /></G>,
  share: (p: GlyphProps) => <G {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></G>,
  comment: (p: GlyphProps) => <G {...p}><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 10h7M8.5 7.5h4" /></G>,
  bell: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /></G>,
  search: (p: GlyphProps) => <G {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></G>,
  filter: (p: GlyphProps) => <G {...p}><path d="M4 5h16l-6 7v5l-4 2v-7z" /></G>,
  plus: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></G>,
  /* nav */
  home: (p: GlyphProps) => <G {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></G>,
  markets: (p: GlyphProps) => <G {...p}><path d="M12 4v16" /><path d="M6 7h12" /><path d="M6 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M18 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M8.5 20h7" /></G>,
  portfolio: (p: GlyphProps) => <G {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18M14 12v2.5h-4V12" /></G>,
  trophy: (p: GlyphProps) => <G {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" /></G>,
  profile: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  /* status */
  live: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5.4" /><circle cx="12" cy="12" r="9" /></G>,
  /* Centred (R9-A1's census; no call site draws it today): 2 units low (ink y8.25–19.75). Raised 2: y6.25–17.75. */
  tipping: (p: GlyphProps) => <G {...p}><line x1="4" y1="11.8" x2="20" y2="7.2" /><path d="M10.3 12.6L13.7 12.6L12 9.6Z" /><line x1="4.6" y1="12.2" x2="4.6" y2="15" /><path d="M2.2 15A2.5 2.5 0 0 0 7 15" /><line x1="19.4" y1="7.6" x2="19.4" y2="10.4" /><path d="M17 10.4A2.5 2.5 0 0 0 21.8 10.4" /><line x1="8.5" y1="16.5" x2="15.5" y2="16.5" /></G>,
  hot: (p: GlyphProps) => <G {...p}><path d="M12 2.8C14.6 6 18 8.8 18 13.2A6 6 0 0 1 6 13.2C6 8.8 9.4 6 12 2.8Z" /><path d="M12 10.5C13.3 12.2 14.6 13.3 14.6 15.2A2.6 2.6 0 0 1 9.4 15.2C9.4 13.3 10.7 12.2 12 10.5Z" /></G>,
  soon: (p: GlyphProps) => <G {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3c0 4 8 4.5 8 9s-8 5-8 9M16 3c0 4-8 4.5-8 9s8 5 8 9" /></G>,
  resolved: (p: GlyphProps) => <G {...p}><path d="M7.5 12.3l3.2 3.7L16.8 8.2" /><line x1="21.3" y1="12" x2="23.3" y2="12" /><line x1="18.6" y1="5.4" x2="20" y2="4" /><line x1="12" y1="2.7" x2="12" y2="0.7" /><line x1="5.4" y1="5.4" x2="4" y2="4" /><line x1="2.7" y1="12" x2="0.7" y2="12" /><line x1="5.4" y1="18.6" x2="4" y2="20" /><line x1="12" y1="21.3" x2="12" y2="23.3" /><line x1="18.6" y1="18.6" x2="20" y2="20" /></G>,
  void: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></G>,
  /* trust / misc */
  shieldcheck: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M8.6 11.8l2.6 3L15.6 9" /></G>,
  bolt: (p: GlyphProps) => <G {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></G>,
  wallet: (p: GlyphProps) => <G {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h.01M3 9h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3" /></G>,
  /* heraldic decoratives */
  crown: (p: GlyphProps) => <G {...p}><path d="M4.5 16.5V9.5L9 12.5L12 6.5L15 12.5L19.5 9.5V16.5Z" /><line x1="5" y1="19.5" x2="19" y2="19.5" /><circle cx="4.5" cy="7.3" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="4.3" r="1.1" fill="currentColor" stroke="none" /><circle cx="19.5" cy="7.3" r="1.1" fill="currentColor" stroke="none" /></G>,
  shield: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M12 5.6L17.4 7.7V11.5C17.4 15.3 15.2 17.6 12 18.9C8.8 17.6 6.6 15.3 6.6 11.5V7.7Z" /></G>,
  sparkle: (p: GlyphProps) => <G {...p}><path d="M12 3.5Q13.1 9.9 19.5 11Q13.1 12.1 12 18.5Q10.9 12.1 4.5 11Q10.9 9.9 12 3.5Z" /><circle cx="18.5" cy="5" r="1.2" fill="currentColor" stroke="none" /></G>,
  star: (p: GlyphProps) => <G {...p}><path d="M12 3L14.3 9.3L21 9.6L15.7 13.7L17.6 20.2L12 16.4L6.4 20.2L8.3 13.7L3 9.6L9.7 9.3Z" /></G>,
  /* Centred (R9-A1's census): the flame filled only the box's top half (ink y2.05–14.95), so the proposals board's HOT flag
     drew it 3.5 units high in its pill. Lowered 3.5: ink y5.55–18.45. */
  flame2: (p: GlyphProps) => <G {...p}><path d="M12 6.5c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 14.5 10 16 11 15.5c-.5-2 .5-7 1-9z" /></G>,
  /* ---- kit50.jsx extended set — replaces lucide-react for consistency ---- */
  check: (p: GlyphProps) => <G {...p}><path d="M5 12.5l4.5 4.5L19 7" /></G>,
  x: (p: GlyphProps) => <G {...p}><path d="M6 6l12 12M18 6L6 18" /></G>,
  info: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></G>,
  ext: (p: GlyphProps) => <G {...p}><path d="M14 5h5v5M19 5l-8 8M12 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6" /></G>,
  phone: (p: GlyphProps) => <G {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></G>,
  globe: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18" /></G>,
  chart: (p: GlyphProps) => <G {...p}><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" /></G>,
  warning: (p: GlyphProps) => <G {...p}><path d="M12 4.2 21 19.5H3z" /><path d="M12 10v4.5M12 17.4h.01" /></G>,
  alertCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></G>,
  eye: (p: GlyphProps) => <G {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></G>,
  eyeOff: (p: GlyphProps) => <G {...p}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5.1c6 0 9.5 6.9 9.5 6.9a17.3 17.3 0 0 1-3.1 3.9M6.5 6.6A17.2 17.2 0 0 0 2.5 12S6 18.9 12 18.9a10.5 10.5 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></G>,
  edit: (p: GlyphProps) => <G {...p}><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17z" /><path d="M13.5 7.5l3 3" /></G>,
  camera: (p: GlyphProps) => <G {...p}><path d="M4 8h3l1.5-2.2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></G>,
  trash: (p: GlyphProps) => <G {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.9 13a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L18.5 7M10 11v6M14 11v6" /></G>,
  flag: (p: GlyphProps) => <G {...p}><path d="M5.5 21V4M5.5 4.5h11l-2.2 3.2 2.2 3.2h-11" /></G>,
  menu: (p: GlyphProps) => <G {...p}><path d="M4 7h16M4 12h16M4 17h16" /></G>,
  chevronDown: (p: GlyphProps) => <G {...p}><path d="M6 9l6 6 6-6" /></G>,
  chevronUp: (p: GlyphProps) => <G {...p}><path d="M6 15l6-6 6 6" /></G>,
  chevronRight: (p: GlyphProps) => <G {...p}><path d="M9 6l6 6-6 6" /></G>,
  chevronLeft: (p: GlyphProps) => <G {...p}><path d="M15 6l-6 6 6 6" /></G>,
  /* Double chevrons — "jump to the first/last page", the pager's edge controls.
     Two copies of the single chevron above, six units apart, so the pair spans 6..18 and
     reads as the SAME mark doubled rather than as a new one. ⛔ They live here because the
     kit is extended, never hand-rolled: an inline <svg> in `pagination.tsx` would be a
     second icon family inside one component, at whatever stroke that file felt like. */
  chevronsLeft: (p: GlyphProps) => <G {...p}><path d="M18 6l-6 6 6 6" /><path d="M12 6l-6 6 6 6" /></G>,
  chevronsRight: (p: GlyphProps) => <G {...p}><path d="M6 6l6 6-6 6" /><path d="M12 6l6 6-6 6" /></G>,
  checkCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M8.4 12.4l2.5 2.5 4.7-5.2" /></G>,
  bellRing: (p: GlyphProps) => <G {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /><path d="M3.6 6.4A6 6 0 0 1 6 3M20.4 6.4A6 6 0 0 0 18 3" /></G>,
  bellOff: (p: GlyphProps) => <G {...p}><path d="M8.6 4.2A5 5 0 0 1 17 8c0 2.6.6 4 1.2 5M16.5 16.5H5c.5-1 2-2 2-6 0-.4 0-.7.05-1M10.5 20a1.7 1.7 0 0 0 3 0M3 3l18 18" /></G>,
  trendingUp: (p: GlyphProps) => <G {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5M21 7h-5" /></G>,
  trendingDown: (p: GlyphProps) => <G {...p}><path d="M3 7l6 6 4-4 8 8" /><path d="M21 17v-5M21 17h-5" /></G>,
  clock: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></G>,
  arrowDown: (p: GlyphProps) => <G {...p}><path d="M12 5v14M6 13l6 6 6-6" /></G>,
  arrowUp: (p: GlyphProps) => <G {...p}><path d="M12 19V5M6 11l6-6 6 6" /></G>,
  arrowRight: (p: GlyphProps) => <G {...p}><path d="M5 12h14M13 6l6 6-6 6" /></G>,
  play: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5.5 3.5L10 15.5z" fill="currentColor" stroke="none" /></G>,
  download: (p: GlyphProps) => <G {...p}><path d="M12 5v10M7 12l5 5 5-5M5 19h14" /></G>,
  upload: (p: GlyphProps) => <G {...p}><path d="M12 15V5M7 8l5-5 5 5M5 19h14" /></G>,
  copy: (p: GlyphProps) => <G {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></G>,
  lock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></G>,
  unlock: (p: GlyphProps) => <G {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.4-2" /></G>,
  user: (p: GlyphProps) => <G {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></G>,
  users: (p: GlyphProps) => <G {...p}><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><circle cx="17" cy="9" r="2.5" /><path d="M20.5 19a4 4 0 0 0-5-3.6" /></G>,
  settings: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="3" /><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></G>,
  /* ⭐ A SIGN-OUT LEAVES (R9-A2, round 9 of the visual pass, 2026-10-11; tile 294 and every hub tile with Toka / Sign out /
     退出登录): this drew `logIn`'s geometry — the door's bracket on the RIGHT and the arrow running INTO it — so every
     sign-out on the platform (the hub's Toka, the avatar menu, /profile, /profile/sessions) showed a sign-in. Now the
     standard log-out: the bracket on the LEFT (x3–9) and the arrow leaving it, its head at x21 pointing away. The same
     grid, stroke, caps and reach as `logIn` (ink x2.05–21.95, y2.05–21.95), so it stands where it stood. */
  logOut: (p: GlyphProps) => <G {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></G>,
  logIn: (p: GlyphProps) => <G {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M3 12h12M10 7l5 5-5 5" /></G>,
  gift: (p: GlyphProps) => <G {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" /><path d="M7.5 8C7.5 6 9 4.5 10.5 4.5S12 6 12 8M16.5 8c0-2-1.5-3.5-3-3.5S12 6 12 8" /></G>,
  receipt: (p: GlyphProps) => <G {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2z" /><path d="M8 10h8M8 14h5" /></G>,
  /* ⭐ INSIDE ITS BOX, AND CENTRED (R9-A1's census): the back coin's arc swept out to x25.37 (ink x26.32), past the box's
     x24, so every coins glyph lost the right edge of its back coin to the svg's clip (1.35px at 14px); and the pair stood
     high (ink y3.05–16.95). The same two coins, moved 2.5 left and 2 down: ink x0.55–23.82, y5.05–18.95, nothing cut. */
  coins: (p: GlyphProps) => <G {...p}><circle cx="7.5" cy="12" r="6" /><path d="M12 15.5a6 6 0 1 0 0-7" /><path d="M7.5 10v4M6 12.5h3" /></G>,
  ticket: (p: GlyphProps) => <G {...p}><path d="M2 9a3 3 0 0 1 0 6v4h20v-4a3 3 0 0 1 0-6V5H2z" /><path d="M13 5v2M13 17v2M13 11v2" /></G>,
  /* aliases — map lucide naming to kit naming */
  listChecks: (p: GlyphProps) => <G {...p}><path d="M3 6h2.5M3 12h2.5M3 18h2.5M8 6h13M8 12h13M8 18h13" /><path d="M1 5.5l1 1 2-2M1 11.5l1 1 2-2M1 17.5l1 1 2-2" /></G>,
  layoutGrid: (p: GlyphProps) => <G {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></G>,
  /* The Needle as a ROW GLYPH (round 4, 2026-10-09, tiles 122–130): the brand mark's own geometry — a disc and the needle
     across it on its pivot, tilted as the mark's (38,8)→(62,92) is — on this family's grid: the disc is `globe`'s and
     `checkCircle`'s r9 ring, the needle reaches the ring's centre line at both ends, one ink and one 1.9 stroke.
     `NeedleMark` (needle-drawer.tsx) keeps its half-ink disc for the account menu and the drawer, where it is the mark. */
  needle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M9.43 3l5.14 18" /></G>,
  radio: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></G>,
  pause: (p: GlyphProps) => <G {...p}><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></G>,
  /* Play without the ring — `pause`'s partner in a toggle. `play` above sits in a circle and
     `pause` does not, so swapping the two on one control jumps in weight and outline every press.
     Same 5..19 vertical span as the bars, filled, so the pair reads as one mark changing state. */
  playBare: (p: GlyphProps) => <G {...p}><path d="M8.5 5.5v13L19 12z" fill="currentColor" /></G>,
// ───────────────────────── A1 · player-facing ─────────────────────────

  /* Mail — help, forgot-password, account */
  mail: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M3 7l8.4 5.4a1.9 1.9 0 0 0 2 0L22 7" /></G>,

  /* Calendar — proposals/new, account (DOB) */
  calendar: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /></G>,

  /* MonitorSmartphone — a logged-in device (profile · sessions) */
  device: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="12" height="9.5" rx="2" /><path d="M6 17.5h5" /><path d="M8.5 13.5V17.5" /><rect x="16" y="9" width="5.5" height="11.5" rx="1.6" /><path d="M18.4 18h.7" /></G>,

  /* Vibrate — haptics toggle (settings · sound & feedback) */
  vibrate: (p: GlyphProps) => <G {...p}><rect x="9" y="5" width="6" height="14" rx="1.6" /><path d="M5.5 8.5l-1.5 3.5 1.5 3.5" /><path d="M18.5 8.5l1.5 3.5-1.5 3.5" /></G>,

  /* Smartphone — mobile handset (distinct from `phone` call-handset) */
  smartphone: (p: GlyphProps) => <G {...p}><rect x="5.5" y="2.5" width="13" height="19" rx="2.6" /><path d="M10 18.5h4" /></G>,

  /* ShieldQuestion — recovery / "why we ask" (uses kit shield path) */
  shieldQuestion: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M9.7 9.6a2.6 2.6 0 0 1 4.4 1.6c0 1.6-2.1 1.7-2.1 3" /><path d="M12 16.4h.01" /></G>,

  /* FileSignature — SOF declaration (document being signed) */
  fileSignature: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /><path d="M14 3v5h5" /><path d="M8 16.5c.8-1.3 1.5-1.3 2 0 .4-1.4 1.1-1.7 1.9-.8" /><path d="M8 19.5h6.5" /></G>,

  /* Link2 — referral link */
  link: (p: GlyphProps) => <G {...p}><path d="M9 17H7.4a5 5 0 0 1 0-10H9" /><path d="M15 7h1.6a5 5 0 0 1 0 10H15" /><path d="M8 12h8" /></G>,

  /* ⛔ `messageWhatsapp` WAS HERE AND IS DELETED (2026-09-12). It was a hand-drawn approximation
     of the WhatsApp mark, and the product now ships the real one — `WhatsAppMark` in
     `src/components/ui/social-marks.tsx`, in the vendor's own `#25D366`. Ali: *"we now have a
     real icon; everywhere we used to have WhatsApp logos and icons, replace with the new one."*
     ⭐ It is DELETED rather than left orphaned because a second drawing of the same mark is a
     second definition site, and the one nobody is watching is the one a future call site picks.
     Its three consumers — the market share sheet, the position share button and the invite
     screen — all import the real mark now. */

// ───────────────────────────── A2 · admin ─────────────────────────────

  /* KeyRound — API key / TOTP */
  keyRound: (p: GlyphProps) => <G {...p}><circle cx="7.5" cy="15.5" r="4" /><path d="M10.4 12.7L20 3.1" /><path d="M16.5 6.6l2.4 2.4M14.6 8.5l1.9 1.9" /></G>,

  /* Megaphone — affiliate / promotion */
  megaphone: (p: GlyphProps) => <G {...p}><path d="M4 11l15-4.5v11L4 13z" /><path d="M11 16.5a2.7 2.7 0 0 1-5.2-1.4" /><path d="M19 9.5a2.5 2.5 0 0 1 0 4" /></G>,

  /* Database — data / snapshot */
  database: (p: GlyphProps) => <G {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13" /><path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" /></G>,

  /* Server — system / infra */
  server: (p: GlyphProps) => <G {...p}><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M6.5 7h.01M6.5 17h.01" /><path d="M10.5 7h6.5M10.5 17h6.5" /></G>,

  /* Landmark — civic building / treasury. B9 optical redraw: the old apex-roof
     + a separate entablature line ~1px below it merged into a blur at 12/14px.
     Redrawn to the kit's canonical geometry (same as `bank`): one closed pediment
     (no redundant entablature) + a breathing gap before the columns start. */
  landmark: (p: GlyphProps) => <G {...p}><path d="M12 3 3.5 8.5h17z" /><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5" /><path d="M3.5 21h17" /></G>,

  /* FileText — report / document */
  fileText: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.5 12.5h7M8.5 16h5" /></G>,

  /* FileCheck — verified document / candidate approved */
  fileCheck: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.6 14.6l1.8 1.8 3.5-3.9" /></G>,

  /* FileSpreadsheet — XLSX export */
  fileSpreadsheet: (p: GlyphProps) => <G {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 17h8M12 13v4" /></G>,

  /* Brain — AI market generation */
  brain: (p: GlyphProps) => <G {...p}><path d="M12 4.5A3 3 0 0 0 9 7 3 3 0 0 0 6.5 11 2.8 2.8 0 0 0 6.5 15.5 3 3 0 0 0 9.5 19 2.6 2.6 0 0 0 12 20.5" /><path d="M12 4.5A3 3 0 0 1 15 7 3 3 0 0 1 17.5 11 2.8 2.8 0 0 1 17.5 15.5 3 3 0 0 1 14.5 19 2.6 2.6 0 0 1 12 20.5" /><path d="M12 4.5V20.5" /><path d="M9.3 10.2c1 .4 1.5 1.2 1.5 2.3M14.7 10.2c-1 .4-1.5 1.2-1.5 2.3" /></G>,

  /* Bot — AI assistant / poll bot */
  bot: (p: GlyphProps) => <G {...p}><path d="M12 8V4.5H8.5" /><circle cx="12" cy="3.5" r="1.1" fill="currentColor" stroke="none" /><rect x="4" y="8" width="16" height="12" rx="2.5" /><path d="M2 14h2M20 14h2" /><path d="M9 13v2M15 13v2" /></G>,

  /* ShieldAlert — compliance alert (uses kit shield path) */
  shieldAlert: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M12 8.5v4.2M12 16h.01" /></G>,

  /* ShieldOff — suspended / unprotected (uses kit shield path + slash) */
  shieldOff: (p: GlyphProps) => <G {...p}><path d="M12 2.8L20 5.8V11.5C20 16.8 16.7 20 12 21.6C7.3 20 4 16.8 4 11.5V5.8Z" /><path d="M4.8 4.5l14.4 14.4" /></G>,

  /* HeartPulse — responsible-gambling health */
  heartPulse: (p: GlyphProps) => <G {...p}><path d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" /><path d="M3.4 12h6l.6-1.2 2 4.6 2-7 1.5 3.6h5.2" /></G>,

  /* RotateCcw — restore / undo (moderation) */
  rotateCcw: (p: GlyphProps) => <G {...p}><path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" /><path d="M3 3.5V8h4.5" /></G>,

  /* Archive — retention / archive */
  archive: (p: GlyphProps) => <G {...p}><rect x="3" y="4" width="18" height="4.6" rx="1.5" /><path d="M4.5 8.6V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.6" /><path d="M9.5 12.2h5" /></G>,

  /* XCircle — declined / reject (circle variant) */
  xCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></G>,

  /* AlertOctagon — stop / critical (octagon) */
  alertOctagon: (p: GlyphProps) => <G {...p}><path d="M8.4 2.5h7.2L21.5 8.4v7.2L15.6 21.5H8.4L2.5 15.6V8.4z" /><path d="M12 8v4.5M12 16h.01" /></G>,

  /* ArrowUpFromLine — withdraw / payout out */
  arrowUpFromLine: (p: GlyphProps) => <G {...p}><path d="M18 9l-6-6-6 6" /><path d="M12 3v13.5" /><path d="M5 21h14" /></G>,

  /* ArrowDownToLine — deposit / funds in */
  arrowDownToLine: (p: GlyphProps) => <G {...p}><path d="M12 3v13.5" /><path d="M6 10.5l6 6 6-6" /><path d="M5 21h14" /></G>,

  /* ScrollText — legal / terms */
  scrollText: (p: GlyphProps) => <G {...p}><path d="M15 12h-5M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h11a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></G>,


/* ─────────────────── BONUS · empty-state line-arts (Part C) ───────────────────
 * Larger viewBox (0 0 64 64) so they read at ~64px in an empty panel.
 * Same 1.9 stroke + round joins; render with a dedicated wrapper, e.g.:
 *
 *   const GL = ({ children, s = 64, ...p }: GlyphProps & {children: React.ReactNode}) => (
 *     <svg viewBox="0 0 64 64" width={s} height={s} fill="none" stroke="currentColor"
 *          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
 *   );
 *
 * Use color: var(--text-subtle); center in the empty panel.
 */

  
/* markets — nothing live in this category */
  /* Centred (R9-A1's census, 64-grid; no call site draws it today): 3 units high. Lowered 3. */
  emptyMarkets: (p: GlyphProps) => <GL {...p}><path d="M32 9v20" /><path d="M16 14h32" /><path d="M16 14l-6.5 15a6.5 6.5 0 0 0 13 0z" /><path d="M48 14l-6.5 15a6.5 6.5 0 0 0 13 0z" /><path d="M22 55h20" /><path d="M32 29v26" /><circle cx="50" cy="53" r="2" fill="currentColor" stroke="none" /></GL>,

  /* positions — you haven't staked anything */
  emptyPositions: (p: GlyphProps) => <GL {...p}><rect x="8" y="18" width="48" height="34" rx="4" /><path d="M22 18v-3a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v3" /><path d="M8 32h48" /><path d="M37 32v6h-10v-6" /><path d="M24 45h7" /></GL>,

  /* leaderboard — no players ranked this round */
  emptyLeaderboard: (p: GlyphProps) => <GL {...p}><path d="M19 12h26v9a13 13 0 0 1-26 0z" /><path d="M19 16h-7v3a7 7 0 0 0 7 7M45 16h7v3a7 7 0 0 1-7 7" /><path d="M32 34v6M25 52h14M27 52l1.5-8h7l1.5 8" /><path d="M32 20l1.4 2.9 3.2.4-2.3 2.2.6 3.1L32 29.3l-2.9 1.3.6-3.1-2.3-2.2 3.2-.4z" fill="currentColor" stroke="none" /></GL>,
};

/* ── Controlled-Poll glyph additions ──
   Spread last into `I`, so anything named here wins over `Ibase`.
   ⚠️ `percent` and `activity` used to be defined in BOTH objects — the Ibase copy
   of each was shadowed by the redraw below and could never render, so a fix
   applied to the wrong one would have looked like a no-op. Both dead copies are
   deleted; every key now has exactly ONE definition across the two objects. */
const Iplus = {

  // ── Controlled Poll ──
  calendarClock: (p: GlyphProps) => <G {...p}><path d="M21 7.8V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21H8"/><path d="M16 2.5v4M8 2.5v4M3 9.5h5.5"/><circle cx="16" cy="16" r="5.6"/><path d="M16 13.5V16l2 1.5"/></G>,
  hourglassHalf: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M9.6 19.7h4.8L12 17z" fill="currentColor" stroke="none"/><circle cx="12" cy="14.6" r=".8" fill="currentColor" stroke="none"/></G>,
  hourglassOff: (p: GlyphProps) => <G {...p}><path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.7a2 2 0 0 0 .59 1.42L12 12l3.91-4.38A2 2 0 0 0 16.5 6.2V2.5"/><path d="M16.5 21.5v-3.7a2 2 0 0 0-.59-1.42L12 12l-3.91 4.38a2 2 0 0 0-.59 1.42v3.7"/><path d="M4 4l16 16"/></G>,
  target: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></G>,
  sliders: (p: GlyphProps) => <G {...p}><path d="M3.5 6h8.5M16.5 6h4M3.5 12h3M11 12h9.5M3.5 18h11M19 18h1.5"/><path d="M14 3.8v4.4M8.5 9.8v4.4M16.5 15.8v4.4"/></G>,
  calendarRange: (p: GlyphProps) => <G {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="8" cy="13.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M9.4 14.1l5.2 2.3" strokeWidth="1.3"/></G>,
  gauge: (p: GlyphProps) => <G {...p}><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.2-4.2"/><circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none"/><path d="M4 16h1.6M18.4 16H20"/></G>,
  shuffle: (p: GlyphProps) => <G {...p}><path d="M2.5 18h1.6c1.3 0 2.5-.6 3.2-1.7l6.4-8.6c.8-1.1 2-1.7 3.3-1.7h4.5"/><path d="M17.5 2l4 4-4 4"/><path d="M2.5 6h2c1.5 0 2.9.8 3.6 2.1"/><path d="M21.5 18h-5.5c-1.3 0-2.6-.7-3.3-1.8l-.6-.8"/><path d="M17.5 14l4 4-4 4"/></G>,
  circleStop: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><rect x="9" y="9" width="6" height="6" rx="1"/></G>,
  timerReset: (p: GlyphProps) => <G {...p}><path d="M10 2.5h4"/><path d="M4.5 13a7.7 7.7 0 0 1 7.7-6.7 7.7 7.7 0 1 1-5.1 13.5L4.5 17.6"/><path d="M9 17.2H4.5v4.5"/><path d="M12.2 14v-3.8"/></G>,
  listFilter: (p: GlyphProps) => <G {...p}><path d="M3.5 6h13M3.5 12h9M3.5 18h5.5"/><path d="M15 11.5h6.5L19 14.8v4.4l-1.5-1.2v-3.2z"/></G>,
  stepForward: (p: GlyphProps) => <G {...p}><path d="M6.5 5.2 15.6 12l-9.1 6.8z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/></G>,

  // ── Payments & money ──
  cardPay: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/></G>,
  bank: (p: GlyphProps) => <G {...p}><path d="M12 3 3.5 8.5h17z"/><path d="M5.5 12v6.5M10 12v6.5M14 12v6.5M18.5 12v6.5"/><path d="M3.5 21h17"/></G>,
  mobileMoney: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="12" r="3.1"/><path d="M12 10.6v2.8M10.5 5.5h3"/></G>,
  cashOut: (p: GlyphProps) => <G {...p}><rect x="2.5" y="7" width="12.5" height="10" rx="2"/><circle cx="8.75" cy="12" r="2.2"/><path d="M17 12h4.5M19.4 9.7l2.3 2.3-2.3 2.3"/></G>,
  /* Centred (R9-A1's census; no call site draws it today): 1.15 left, 0.48 high. Moved 1 right and 0.5 down. */
  cashback: (p: GlyphProps) => <G {...p}><circle cx="14" cy="14" r="5.2"/><path d="M14 12.1v3.8"/><path d="M4.5 5V9.5H9"/><path d="M4.8 9.3A9.2 9.2 0 0 1 13.6 4.9"/></G>,
  percent: (p: GlyphProps) => <G {...p}><path d="M18.5 5.5l-13 13"/><circle cx="7.3" cy="7.3" r="2.7"/><circle cx="16.7" cy="16.7" r="2.7"/></G>,

  // ── Source of funds ──
  sofSalary: (p: GlyphProps) => <G {...p}><rect x="3.5" y="8" width="17" height="11.5" rx="2.2"/><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8"/><circle cx="12" cy="13.7" r="1.3" fill="currentColor" stroke="none"/></G>,
  sofBusiness: (p: GlyphProps) => <G {...p}><path d="M5 9 6 4.5h12L19 9M4 9h16"/><path d="M5.5 9v10.5h13V9"/><path d="M10.3 19.5V14h3.4v5.5"/></G>,
  sofSavings: (p: GlyphProps) => <G {...p}><path d="M6.5 6.5h11"/><path d="M8.5 6.5V4.5h7v2"/><path d="M6.5 6.5v9.8a4.2 4.2 0 0 0 4.2 4.2h2.6a4.2 4.2 0 0 0 4.2-4.2V6.5"/><circle cx="12" cy="13.8" r="1.3" fill="currentColor" stroke="none"/></G>,
  sofInvestment: (p: GlyphProps) => <G {...p}><path d="M3.5 4v16.5H21"/><path d="M6.5 15.5l4-4.5 3 2.6 5.5-6.6"/><path d="M15.7 7h3.4v3.4"/></G>,
  /* Centred (R9-A1's census): 1.42 units low (ink y4.38–22.45). Raised 1.5: ink y2.88–20.95. */
  sofGift: (p: GlyphProps) => <G {...p}><rect x="4.5" y="10" width="15" height="10" rx="1.5"/><rect x="3.5" y="6.5" width="17" height="3.5" rx="1"/><path d="M12 6.5v13.5"/><path d="M12 6.5c-1.6-3.4-5.9-3.3-5.9-1.1S10 7.9 12 6.5zM12 6.5c1.6-3.4 5.9-3.3 5.9-1.1S14 7.9 12 6.5z"/></G>,

  // ── Devices & sessions ──
  devicePhone: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.8 18.5h2.4"/></G>,
  deviceDesktop: (p: GlyphProps) => <G {...p}><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3.5M8 20.5h8"/></G>,
  deviceTablet: (p: GlyphProps) => <G {...p}><rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12" cy="18.6" r=".9" fill="currentColor" stroke="none"/></G>,

  // ── Help & support ──
  compass: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/></G>,
  idCard: (p: GlyphProps) => <G {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="10.3" r="1.9"/><path d="M5.2 15.6a2.9 2.9 0 0 1 5.6 0"/><path d="M13.8 9.5h5M13.8 12.5h5M13.8 15.5h3"/></G>,
  /* Centred (R9-A1's census): the boom hung the drawing 1.25 units low (ink y3.55–22.95), 1.0px under the hub's Msaada row
     centre at 20px. Raised 1.25: ink y2.3–21.7. */
  headset: (p: GlyphProps) => <G {...p}><path d="M4.5 12.75v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3" y="11.75" width="3.8" height="6" rx="1.7"/><rect x="17.2" y="11.75" width="3.8" height="6" rx="1.7"/><path d="M19.1 17.75v.6a2.4 2.4 0 0 1-2.4 2.4h-3.2"/></G>,
  questionCircle: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.6c0 1.7-2.6 2.1-2.6 3.6"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/></G>,

  // ── Status & tags ──
  sealCheck: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8 12.4l2.7 2.7 5.3-6"/></G>,
  voidX: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/></G>,
  /* The dashed ring closes on whole dashes (R9-A6, the fitted-track rule): 3.4 + 3 on the ring's 54.04 units was 8.44
     periods, so the last 2.8-unit dash ran into the first at three o'clock. `pathLength` makes the ring 8 whole periods. */
  clockPending: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6" pathLength="51.2" strokeDasharray="3.4 3"/><path d="M12 7.5V12l3 2"/></G>,
  lockSide: (p: GlyphProps) => <G {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></G>,
  /* Centred (R9-A1's census; no call site draws it today): 1.62 right, 0.62 low. Moved 1.5 left and 0.5 up. */
  sparkleNew: (p: GlyphProps) => <G {...p}><path d="M10.5 3.5l1.7 4.3L16.5 9.5l-4.3 1.7L10.5 15.5l-1.7-4.3L4.5 9.5l4.3-1.7z"/><path d="M17 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" strokeWidth="1.4"/></G>,
  flame: (p: GlyphProps) => <G {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></G>,
  tippingScales: (p: GlyphProps) => <G {...p}><path d="M12 3.5v17M8 20.5h8"/><path d="M5 8.5l14-2.4"/><path d="M5 8.5l-2.2 4.3a2.6 2.6 0 0 0 4.4 0zM19 6.1l-2.2 4.3a2.6 2.6 0 0 0 4.4 0z" strokeWidth="1.6"/></G>,
  /* ⭐ CENTRED IN ITS BOX (R9-A1, round 9 of the visual pass, 2026-10-11; tiles 262 266 and every hub tile): the podium
     stood on the box's floor — ink y8.05–21.45, its centre 2.75 units under the box's — so the Bingwa / Leaderboard / 排行榜
     row's glyph sat 2.0px below the row's centre at 20px (262: ink y624–635 in the row y600–655) where every other hub
     glyph centres. The same drawing, raised 2.75: ink y5.3–18.7. Its one use is that hub row. */
  podium: (p: GlyphProps) => <G {...p}><path d="M3.5 17.75h17"/><path d="M9 17.75V6.25h6v11.5"/><path d="M3.5 17.75v-6H9M20.5 17.75v-4.5H15"/></G>,

  // ── System ──
  qr: (p: GlyphProps) => <G {...p}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v3.2M14 20.5h3.2M20 20.3l.01.01"/></G>,
  wifiOff: (p: GlyphProps) => <G {...p}><path d="M8.5 13.2a6.3 6.3 0 0 1 7 0"/><path d="M5 10a10.6 10.6 0 0 1 4.2-2.3M14.8 7.7A10.6 10.6 0 0 1 19 10"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/></G>,
  activity: (p: GlyphProps) => <G {...p}><path d="M2.5 12h4L9.2 5.5l5.6 13L17.5 12h4"/></G>,

  // ── Utility ──
  externalLink: (p: GlyphProps) => <G {...p}><path d="M13.5 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5v-7"/><path d="M13 11 20.5 3.5M15 3.5h5.5V9"/></G>,
  sortAsc: (p: GlyphProps) => <G {...p}><path d="M4 7h9M4 12h6.5M4 17h4"/><path d="M17.5 17V7M14.5 10l3-3 3 3"/></G>,
  sortDesc: (p: GlyphProps) => <G {...p}><path d="M4 7h4M4 12h6.5M4 17h9"/><path d="M17.5 7v10M14.5 14l3 3 3-3"/></G>,
  dragHandle: (p: GlyphProps) => <G {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></G>,
  csvExport: (p: GlyphProps) => <G {...p}><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M12 18.5v-6M9.2 15.3 12 12.5l2.8 2.8"/></G>,
  ussd: (p: GlyphProps) => <G {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M9.9 9.9l4.2 4.2M14.1 9.9l-4.2 4.2M12 9v6M9.4 12h5.2" strokeWidth="1.5"/></G>,
  simCard: (p: GlyphProps) => <G {...p}><path d="M14.5 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V7.5z"/><rect x="9" y="11" width="6" height="6.5" rx="1.3"/><path d="M12 11v6.5"/></G>,
  attest: (p: GlyphProps) => <G {...p}><path d="M4.5 8.5 9 4l4 4-4.5 4.5z"/><path d="M11 10.5l8 8"/><path d="M13.5 21h6.5" strokeWidth="1.7"/></G>,
  reconcile: (p: GlyphProps) => <G {...p}><path d="M12 4v16M8.5 20h7"/><path d="M5.5 8h13"/><path d="M5.5 8l-2 4a2.4 2.4 0 0 0 4 0zM18.5 8l-2 4a2.4 2.4 0 0 0 4 0z" strokeWidth="1.6"/></G>,

  /* ⛔ NO SOCIAL GLYPHS HERE, DELIBERATELY. Instagram and TikTok are drawn in their own
     colours from `src/components/ui/social-marks.tsx`. They cannot live in this family:
     `G` hard-codes `fill="none" stroke="currentColor" strokeWidth="1.9"`, which is the
     contract that makes 178 glyphs agree, and a gradient-bearing multi-fill vendor logo
     cannot satisfy it. A house-line interpretation WAS drawn and measured first — at the
     16px ship size its TikTok note read as a generic music note, so it was cut. */

  // ── Categories (reference) ──
  catSports: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M12 8.8L15.04 11.01L13.88 14.59L10.12 14.59L8.96 11.01Z"/><path d="M12 8.8V3.4M15.04 11.01L20.18 9.34M13.88 14.59L17.06 18.96M10.12 14.59L6.94 18.96M8.96 11.01L3.82 9.34"/></G>,
  /* Centred (R9-A1's census; no call site draws it today): 1.25 units low. Raised 1.25. */
  catMacro: (p: GlyphProps) => <G {...p}><path d="M3.5 19.25h17"/><path d="M4.5 15.25l4.5-5 3 2.7 6.5-7.7"/><path d="M15.3 4.75h3.5v3.5"/></G>,
  /* Centred (R9-A1's census; no call site draws it today): 1.0 right, 0.53 low. Moved 1 left and 0.5 up. */
  catWeather: (p: GlyphProps) => <G {...p}><path d="M16 16H7a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 7.1a4.2 4.2 0 0 1-1 8.9z"/><path d="M7.8 19v1.6M11.2 19v1.6M14.6 19v1.6"/></G>,
  catCrypto: (p: GlyphProps) => <G {...p}><circle cx="12" cy="12" r="8.6"/><path d="M9.8 8h3.4a2 2 0 0 1 0 4H9.8m0 0h4a2 2 0 0 1 0 4H9.8M9.8 8v8"/><path d="M11.5 6.3V8M13.5 16v1.7"/></G>,
  catCulture: (p: GlyphProps) => <G {...p}><path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z"/></G>,
  catTech: (p: GlyphProps) => <G {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 6.5v-3M15 6.5v-3M9 17.5v3M15 17.5v3M6.5 9h-3M6.5 15h-3M17.5 9h3M17.5 15h3"/></G>,
  catForex: (p: GlyphProps) => <G {...p}><path d="M4 8h13M14 4.8 17.2 8 14 11.2"/><path d="M20 16H7M10 12.8 6.8 16l3.2 3.2" /></G>,
  catOther: (p: GlyphProps) => <G {...p}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8.6"/></G>,

  // ── Empty-state illustrations (64-grid) ──
  emptyProposals: (p: GlyphProps) => <GL {...p}><path d="M10 32l4-6h36l4 6"/><rect x="10" y="32" width="44" height="20" rx="4"/><path d="M26 29h12"/><path d="M26 23v-9a3 3 0 0 1 3-3h8l7 7v5"/><path d="M37 11v6h7"/><path d="M29.5 17.5l2.7 2.7 4.3-5"/></GL>,
  /* Centred (R9-A1's census, 64-grid; no call site draws it today): 2 right, 3 high. Moved 2 left and 3 down. */
  kycRail: (p: GlyphProps) => <GL {...p}><rect x="16" y="11" width="28" height="18" rx="3"/><circle cx="24" cy="18" r="2.6"/><path d="M20.5 24.5a3.6 3.6 0 0 1 7 0"/><path d="M34 16h7M34 21h5"/><path d="M6 49h48"/><circle cx="12" cy="49" r="4" fill="currentColor" stroke="none"/><circle cx="26" cy="49" r="4" fill="currentColor" stroke="none"/><circle cx="40" cy="49" r="4"/><circle cx="54" cy="49" r="4"/></GL>,
  fairnessChain: (p: GlyphProps) => <GL {...p}><circle cx="13" cy="34" r="8"/><circle cx="32" cy="34" r="8"/><circle cx="51" cy="34" r="8"/><path d="M21 34h3M40 34h3"/><path d="M28.5 34l2.5 2.5 4.5-5"/><path d="M32 23v-4"/></GL>,
  rgSelfCare: (p: GlyphProps) => <GL {...p}><path d="M8 46h48"/><path d="M20 46a12 12 0 0 1 24 0"/><path d="M32 24v-7M17.5 29.5l-5-5M46.5 29.5l5-5M12 38H5M59 38h-7"/></GL>,
  /* Centred (R9-A1's census, 64-grid; no call site draws it today): 3.5 right, 2 high. Moved 3.5 left and 2 down. */
  adminGeneric: (p: GlyphProps) => <GL {...p}><rect x="12.5" y="11" width="28" height="44" rx="4"/><rect x="20.5" y="7" width="12" height="7" rx="2.5"/><path d="M18.5 24h16M18.5 32h16M18.5 40h9"/><circle cx="39.5" cy="45" r="7.5"/><path d="M45 50.5l6.5 6.5"/></GL>,
};

export const I = { ...Ibase, ...Iplus } as const;

/** Every glyph component of the family — how `edgeGlyph` knows a slot was handed a glyph and not something else. */
const GLYPH_SET: ReadonlySet<unknown> = new Set<unknown>(Object.values(I));

export type GlyphKey = keyof typeof I;

/** Map a market category to its sigil. Falls back to the markets glyph. */
const CATEGORY_GLYPH: Record<string, GlyphKey> = {
  sports: "football", football: "football",
  politics: "politics", macro: "economy", economy: "economy", forex: "forex",
  weather: "weather", crypto: "crypto",
  culture: "entertainment", entertainment: "entertainment", tech: "tech",
  mixed: "shuffle", other: "markets", infrastructure: "landmark",
};
export function categoryGlyph(category: string): GlyphKey {
  return CATEGORY_GLYPH[category?.toLowerCase?.() ?? ""] ?? "markets";
}

