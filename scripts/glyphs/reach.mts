/**
 * How far an SVG path's geometry reaches, in both axes — exact for lines, arcs and curves.
 *
 * The house family's engine (`pathReachX` in src/components/ui/glyphs.tsx) answered this for x at RUNTIME, from the drawn
 * children. The Phosphor migration answers it once, at codegen, for every glyph and every weight, so the runtime reads
 * numbers. The method is the house one, kept line for line, with y added: a cubic's or a quad's turning points are the
 * roots of its derivative inside (0, 1); an arc's are where its parametric x or y turns, if the sweep passes them.
 * `test:glyph-map` checks the readings against shapes whose bounds are known by construction.
 */
const NUMBER = /[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?/y;

export type Box = [x0: number, x1: number, y0: number, y1: number];

export function pathBounds(d: string): Box {
  let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
  const at = (x: number, y: number) => {
    if (x < xlo) xlo = x;
    if (x > xhi) xhi = x;
    if (y < ylo) ylo = y;
    if (y > yhi) yhi = y;
  };
  const atX = (x: number) => { if (x < xlo) xlo = x; if (x > xhi) xhi = x; };
  const atY = (y: number) => { if (y < ylo) ylo = y; if (y > yhi) yhi = y; };
  let i = 0, cmd = "", last = "", x = 0, y = 0, sx = 0, sy = 0, kx = 0, ky = 0;
  // Separators: space, comma, tab, line feed, carriage return (by code, so this file holds no escape sequence).
  const skip = () => { while (i < d.length && [32, 44, 9, 10, 13].includes(d.charCodeAt(i))) i++; };
  const num = () => {
    skip();
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) throw new Error(`path: no number at ${i} in "${d.slice(0, 60)}"`);
    i = NUMBER.lastIndex;
    return Number(m[0]);
  };
  const flag = () => { skip(); return d[i++] === "1"; };
  /** A cubic's turning points between its ends, in one axis. */
  const cubic = (p0: number, p1: number, p2: number, p3: number, put: (v: number) => void) => {
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
    const ts: number[] = [];
    if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); }
    else { const q = b * b - 4 * a * c; if (q >= 0) { const r = Math.sqrt(q); ts.push((-b + r) / (2 * a), (-b - r) / (2 * a)); } }
    for (const t of ts) if (t > 0 && t < 1) { const u = 1 - t; put(u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3); }
  };
  const quad = (p0: number, p1: number, p2: number, put: (v: number) => void) => {
    const den = p0 - 2 * p1 + p2;
    if (Math.abs(den) > 1e-12) { const t = (p0 - p1) / den; if (t > 0 && t < 1) { const u = 1 - t; put(u * u * p0 + 2 * u * t * p1 + t * t * p2); } }
  };
  /** An arc's turning points: its centre (SVG's endpoint-to-centre conversion), then the angles where x and y turn. */
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
    const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
    let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    else if (sweep && dt < 0) dt += 2 * Math.PI;
    const full = 2 * Math.PI;
    const swept = (c: number) => {
      const into = sweep ? (((c - t1) % full) + full) % full : (((t1 - c) % full) + full) % full;
      return into <= Math.abs(dt);
    };
    // x(θ) = cx + rx·cosφ·cosθ − ry·sinφ·sinθ turns where tanθ = −(ry·sinφ)/(rx·cosφ).
    const tx = Math.atan2(-ry * sp, rx * cp);
    for (const c of [tx, tx + Math.PI]) if (swept(c)) atX(cx + rx * cp * Math.cos(c) - ry * sp * Math.sin(c));
    // y(θ) = cy + rx·sinφ·cosθ + ry·cosφ·sinθ turns where tanθ = (ry·cosφ)/(rx·sinφ).
    const ty = Math.atan2(ry * cp, rx * sp);
    for (const c of [ty, ty + Math.PI]) if (swept(c)) atY(cy + rx * sp * Math.cos(c) + ry * cp * Math.sin(c));
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
      case "M": x = ox + num(); y = oy + num(); sx = x; sy = y; at(x, y); break;
      case "L": x = ox + num(); y = oy + num(); at(x, y); break;
      case "H": x = ox + num(); at(x, y); break;
      case "V": y = oy + num(); at(x, y); break;
      case "C": {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x, x1, x2, ex, atX); cubic(y, y1, y2, ey, atY); kx = x2; ky = y2; x = ex; y = ey; at(x, y); break;
      }
      case "S": {
        const x1 = last === "C" || last === "S" ? 2 * x - kx : x, y1 = last === "C" || last === "S" ? 2 * y - ky : y;
        const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x, x1, x2, ex, atX); cubic(y, y1, y2, ey, atY); kx = x2; ky = y2; x = ex; y = ey; at(x, y); break;
      }
      case "Q": {
        const x1 = ox + num(), y1 = oy + num(), ex = ox + num(), ey = oy + num();
        quad(x, x1, ex, atX); quad(y, y1, ey, atY); kx = x1; ky = y1; x = ex; y = ey; at(x, y); break;
      }
      case "T": {
        const reflect = last === "Q" || last === "T";
        const x1 = reflect ? 2 * x - kx : x, y1 = reflect ? 2 * y - ky : y;
        const ex = ox + num(), ey = oy + num();
        quad(x, x1, ex, atX); quad(y, y1, ey, atY); kx = x1; ky = y1; x = ex; y = ey; at(x, y); break;
      }
      case "A": {
        const rx = num(), ry = num(), deg = num(), large = flag(), sweep = flag(), ex = ox + num(), ey = oy + num();
        arc(x, y, rx, ry, deg, large, sweep, ex, ey); x = ex; y = ey; at(x, y); break;
      }
      default: throw new Error(`path: command "${cmd}" in "${d.slice(0, 60)}"`);
    }
    last = cmd.toUpperCase();
  }
  return [xlo, xhi, ylo, yhi];
}

/** The union of boxes, widened by half a stroke where the geometry is stroked (a centreline drawing). */
export function unionBoxes(boxes: Array<{ box: Box; stroke: number }>): Box {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const { box, stroke } of boxes) {
    const h = stroke / 2;
    x0 = Math.min(x0, box[0] - h); x1 = Math.max(x1, box[1] + h);
    y0 = Math.min(y0, box[2] - h); y1 = Math.max(y1, box[3] + h);
  }
  return [x0, x1, y0, y1];
}

export const round2 = (v: number) => Math.round(v * 100) / 100;
