/**
 * THE HOUSE EXTRAS — the three glyphs Phosphor has no match for, drawn in Phosphor's grammar (PHOSPHOR-MIGRATION §4):
 * the 256 grid, round caps and joins, Regular at a 16-unit stroke, Bold at 24, Fill as one solid shape with even-odd
 * knock-outs, Duotone as a 0.2 tone under the Regular drawing.
 *
 *   needle      — the brand's own mark: a disc and the needle across it, tilted as the mark's (38,8)→(62,92) is. Its
 *                 geometry is the house `needle` scaled from the 24 grid (×32/3): ring r96, needle (100.59,32)→(155.41,224).
 *                 Fill is the disc split by the needle — the mark's two halves in one ink.
 *   mobileMoney — Phosphor's own handset (device-mobile) with a coin on its screen.
 *   ussd        — Phosphor's own handset with a six-armed star on its screen (a USSD dial string, *150*00#).
 *
 * Every drawing is data, so `test:glyph-map` reads its bounds and the contact sheet shows it to Ali before the swap.
 */
export type Variant = "regular" | "bold" | "fill" | "duo";
/** One drawing: SVG elements inside a 256-grid symbol. `stroke` parts carry their own width; `fill` parts are solid. */
export type Drawing = Array<{ d: string; stroke?: number; evenodd?: boolean; tone?: boolean }>;

const C = 128;
const ring = (r: number) => `M${C - r} ${C}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const fix = (v: number) => Math.round(v * 100) / 100;

/** The needle's axis through the centre, as a unit vector, and its normal. */
const NX = 155.41 - 100.59, NY = 224 - 32, NL = Math.hypot(NX, NY);
const U = [NX / NL, NY / NL] as const;
const N = [-U[1], U[0]] as const;

/** The needle as a knock-out band of half-width h across a disc of radius r: its four corners lie on the circle. */
function band(r: number, h: number): string {
  const t = Math.sqrt(r * r - h * h);
  const p = (s: number, k: number) => [fix(C + s * h * N[0] + k * t * U[0]), fix(C + s * h * N[1] + k * t * U[1])];
  const [a, b, c, d] = [p(1, -1), p(1, 1), p(-1, 1), p(-1, -1)];
  return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}L${d[0]} ${d[1]}Z`;
}

/** Phosphor's device-mobile body on the 256 grid: outer x56–200, y16–240, corner 24 (from its Fill drawing). */
const PHONE_BODY = "M176 16H80A24 24 0 0 0 56 40V216a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40A24 24 0 0 0 176 16Z";
/** Its two bars, which the Fill drawing keeps as knock-outs. */
const PHONE_BARS = "M80 32h96a8 8 0 0 1 8 8v8H72V40A8 8 0 0 1 80 32ZM176 224H80a8 8 0 0 1-8-8v-8H184v8A8 8 0 0 1 176 224Z";
/** The handset as a centreline drawing, so Regular and Bold differ only by stroke width. */
const PHONE_LINE = "M80 24H176A16 16 0 0 1 192 40V216A16 16 0 0 1 176 232H80A16 16 0 0 1 64 216V40A16 16 0 0 1 80 24ZM64 56H192M64 200H192";
const SCREEN = "M64 56H192V200H64Z";

/** A six-armed star of half-width h and arm length l, as one outline (no overlaps), for the Fill knock-out. */
function star(l: number, h: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = ((90 + 60 * k) * Math.PI) / 180, d = [Math.cos(a), -Math.sin(a)], n = [-d[1], d[0]];
    const b = ((120 + 60 * k) * Math.PI) / 180, m = [Math.cos(b), -Math.sin(b)];
    pts.push(`${fix(C + l * d[0] - h * n[0])} ${fix(C + l * d[1] - h * n[1])}`);
    pts.push(`${fix(C + l * d[0] + h * n[0])} ${fix(C + l * d[1] + h * n[1])}`);
    pts.push(`${fix(C + 2 * h * m[0])} ${fix(C + 2 * h * m[1])}`);
  }
  return `M${pts.join("L")}Z`;
}
const STAR_LINES = (() => {
  const out: string[] = [];
  for (const deg of [90, 30, 150]) {
    const a = (deg * Math.PI) / 180, dx = 36 * Math.cos(a), dy = -36 * Math.sin(a);
    out.push(`M${fix(C - dx)} ${fix(C - dy)}L${fix(C + dx)} ${fix(C + dy)}`);
  }
  return out.join("");
})();

export const EXTRAS: Record<string, Record<Variant, Drawing>> = {
  needle: {
    regular: [{ d: ring(96), stroke: 16 }, { d: "M100.59 32L155.41 224", stroke: 16 }],
    bold: [{ d: ring(96), stroke: 24 }, { d: "M100.59 32L155.41 224", stroke: 24 }],
    fill: [{ d: ring(104) + band(104, 8), evenodd: true }],
    duo: [{ d: ring(96), tone: true }, { d: ring(96), stroke: 16 }, { d: "M100.59 32L155.41 224", stroke: 16 }],
  },
  mobileMoney: {
    regular: [{ d: PHONE_LINE, stroke: 16 }, { d: ring(30), stroke: 16 }, { d: "M128 116V140", stroke: 16 }],
    bold: [{ d: PHONE_LINE, stroke: 24 }, { d: ring(28), stroke: 24 }, { d: "M128 118V138", stroke: 24 }],
    fill: [{ d: PHONE_BODY + PHONE_BARS + ring(38) + "M120 112H136V144H120Z", evenodd: true }],
    duo: [{ d: SCREEN, tone: true }, { d: PHONE_LINE, stroke: 16 }, { d: ring(30), stroke: 16 }, { d: "M128 116V140", stroke: 16 }],
  },
  ussd: {
    regular: [{ d: PHONE_LINE, stroke: 16 }, { d: STAR_LINES, stroke: 16 }],
    bold: [{ d: PHONE_LINE, stroke: 24 }, { d: STAR_LINES, stroke: 24 }],
    fill: [{ d: PHONE_BODY + PHONE_BARS + star(40, 8), evenodd: true }],
    duo: [{ d: SCREEN, tone: true }, { d: PHONE_LINE, stroke: 16 }, { d: STAR_LINES, stroke: 16 }],
  },
};
