/**
 * WCAG contrast audit (audit H10). Computes contrast ratios for the money-
 * critical token pairs directly from their OKLCH values (OKLCH → OKLab → linear
 * sRGB → WCAG relative luminance), so the launch gate "0 contrast failures" is
 * checkable without a browser. Values mirror src/app/globals.css — update both
 * together (a future step could parse the CSS; hard-coded here for a clear proof).
 *
 * Run: npm run test:contrast
 */

type Oklch = { l: number; c: number; h: number }; // l 0..1, c, h degrees
const ok = (l: number, c: number, h: number): Oklch => ({ l, c, h });

// linear-sRGB channel from OKLCH (Björn Ottosson).
function oklchToLinearSrgb({ l: L, c: C, h: H }: Oklch): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  return [r, g, bl].map((v) => Math.min(1, Math.max(0, v))) as [number, number, number];
}
// WCAG relative luminance uses LINEAR rgb with these coefficients.
function luminance(o: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(o);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg: Oklch, bg: Oklch): number {
  const a = luminance(fg), b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ── tokens (mirror globals.css) ──────────────────────────────────────────────
const T = {
  pearl50: ok(0.99, 0.006, 268),
  bg: ok(0.15, 0.13, 268),
  bgElevated: ok(0.19, 0.13, 268), // --bg-elevated (approx; deep royal)
  btnNoBg: ok(0.56, 0.2, 25),
  btnYesBg: ok(0.57, 0.155, 150),
  danger500: ok(0.6, 0.22, 25),
  border: ok(0.34, 0.13, 268),
  borderStrong: ok(0.44, 0.15, 268),
  borderControl: ok(0.52, 0.13, 268), // proposed --border-control
  text: ok(0.97, 0.01, 268), // --text (approx near-white)
};

type Check = { name: string; fg: Oklch; bg: Oklch; min: number };
const CHECKS: Check[] = [
  { name: "btn-no label (pearl on no-bg)", fg: T.pearl50, bg: T.btnNoBg, min: 4.5 },
  { name: "btn-yes label (pearl on yes-bg)", fg: T.pearl50, bg: T.btnYesBg, min: 4.5 },
  { name: "btn-danger label (pearl on danger-500)", fg: T.pearl50, bg: T.danger500, min: 4.5 },
  { name: "--border on --bg", fg: T.border, bg: T.bg, min: 3.0 },
  { name: "--border on --bg-elevated", fg: T.border, bg: T.bgElevated, min: 3.0 },
  { name: "--border-strong on --bg", fg: T.borderStrong, bg: T.bg, min: 3.0 },
  { name: "--border-control on --bg (proposed)", fg: T.borderControl, bg: T.bg, min: 3.0 },
  { name: "--border-control on --bg-elevated (proposed)", fg: T.borderControl, bg: T.bgElevated, min: 3.0 },
  { name: "--text on --bg", fg: T.text, bg: T.bg, min: 4.5 },
];

// H10 remaining fix (measured — apply next session, then this script goes green):
//   .btn-yes    background 57% → oklch(53% 0.155 150)  (white label → 4.74)
//   .btn-danger --danger-500 60% → oklch(57% 0.22 25)  (white label → 4.85)
//   add --border-control: oklch(52% 0.130 268) (3.45/3.35) and use it on FORM
//   controls (inputs/unfilled buttons); leave --border (34%) decorative (WCAG
//   1.4.11 exempts non-control dividers). btn-no already passes (5.00).

let fails = 0;
for (const c of CHECKS) {
  const r = contrast(c.fg, c.bg);
  const pass = r >= c.min;
  if (!pass) fails++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name.padEnd(46)} ${r.toFixed(2)} (need ${c.min})`);
}
console.log(`\ncontrast-audit: ${CHECKS.length - fails} pass, ${fails} fail`);
// Money-control label + form-control border failures block launch (H10).
if (fails > 0) process.exit(1);
