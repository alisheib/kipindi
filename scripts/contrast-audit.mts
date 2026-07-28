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
  btnYesBg: ok(0.53, 0.155, 150), // H10 fixed (was 0.57)
  danger500: ok(0.57, 0.22, 25), // H10 fixed (was 0.60)
  border: ok(0.34, 0.13, 268),
  borderStrong: ok(0.44, 0.15, 268),
  borderControl: ok(0.52, 0.13, 268), // proposed --border-control
  text: ok(0.97, 0.01, 268), // --text (approx near-white)
  // ── The ink ramp (added 2026-07-28 with DESIGN_AUTHORITY B8) ──────────────
  // These three were defined in globals.css from the start but were never bridged
  // into tailwind.config.ts, so `text-text-muted` / `-subtle` / `-faint` compiled
  // to NOTHING — 1,224 usages inheriting their parent's ink instead of receding.
  // Repairing the bridge makes them render for the first time, which is a real
  // darkening of the quiet end of the hierarchy. That has to be PROVEN against AA,
  // not assumed: RULES.md law 9 names faint body copy as a known failure mode.
  textMuted: ok(0.86, 0.040, 268),  // --text-muted
  textSubtle: ok(0.70, 0.080, 268), // --text-subtle
  textFaint: ok(0.60, 0.090, 268),  // --text-faint
  bgInset: ok(0.13, 0.12, 268),     // --bg-inset (sunken field wells)
  panel: ok(0.17, 0.13, 268),       // --panel (sidebar / card surface)
};

// `decorative: true` = WCAG 1.4.11 exempt (a divider that is NOT the sole means
// of identifying a control). Printed for reference but never fails the gate.
type Check = { name: string; fg: Oklch; bg: Oklch; min: number; decorative?: boolean };
const CHECKS: Check[] = [
  { name: "btn-no label (pearl on no-bg)", fg: T.pearl50, bg: T.btnNoBg, min: 4.5 },
  { name: "btn-yes label (pearl on yes-bg)", fg: T.pearl50, bg: T.btnYesBg, min: 4.5 },
  { name: "btn-danger label (pearl on danger-500)", fg: T.pearl50, bg: T.danger500, min: 4.5 },
  { name: "--border-control on --bg (form controls)", fg: T.borderControl, bg: T.bg, min: 3.0 },
  { name: "--border-control on --bg-elevated (form controls)", fg: T.borderControl, bg: T.bgElevated, min: 3.0 },
  { name: "--text on --bg", fg: T.text, bg: T.bg, min: 4.5 },
  { name: "--border on --bg (decorative — exempt)", fg: T.border, bg: T.bg, min: 3.0, decorative: true },
  { name: "--border-strong on --bg (decorative — exempt)", fg: T.borderStrong, bg: T.bg, min: 3.0, decorative: true },

  // The ink ramp, on every surface it actually lands on. Body copy => 4.5.
  { name: "--text-muted on --bg", fg: T.textMuted, bg: T.bg, min: 4.5 },
  { name: "--text-muted on --bg-elevated", fg: T.textMuted, bg: T.bgElevated, min: 4.5 },
  { name: "--text-muted on --panel", fg: T.textMuted, bg: T.panel, min: 4.5 },
  { name: "--text-subtle on --bg", fg: T.textSubtle, bg: T.bg, min: 4.5 },
  { name: "--text-subtle on --bg-elevated", fg: T.textSubtle, bg: T.bgElevated, min: 4.5 },
  { name: "--text-subtle on --panel", fg: T.textSubtle, bg: T.panel, min: 4.5 },
  { name: "--text-subtle on --bg-inset", fg: T.textSubtle, bg: T.bgInset, min: 4.5 },
  { name: "--text-faint on --bg", fg: T.textFaint, bg: T.bg, min: 4.5 },
  { name: "--text-faint on --bg-elevated", fg: T.textFaint, bg: T.bgElevated, min: 4.5 },
  { name: "--text-faint on --panel", fg: T.textFaint, bg: T.panel, min: 4.5 },
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
  const tag = c.decorative ? (pass ? "PASS" : "INFO") : pass ? "PASS" : "FAIL";
  if (!pass && !c.decorative) fails++;
  console.log(`${tag}  ${c.name.padEnd(52)} ${r.toFixed(2)} (need ${c.min})`);
}
console.log(`\ncontrast-audit: ${fails} gate failure(s) (decorative dividers are WCAG 1.4.11-exempt)`);
if (fails > 0) process.exit(1);
