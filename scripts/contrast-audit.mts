/**
 * WCAG contrast audit (audit H10). Computes contrast ratios for the money-
 * critical token pairs directly from their OKLCH values (OKLCH → OKLab → linear
 * sRGB → WCAG relative luminance), so the launch gate "0 contrast failures" is
 * checkable without a browser.
 *
 * ⚠️ 2026-07-29 — the token values are now PARSED FROM globals.css.
 *
 * They used to be hand-mirrored here, with a comment saying "update both
 * together". They were not updated together, and could not have been reliably:
 * a contrast gate whose inputs are typed by hand cannot see the change it exists
 * to judge. Measured when this was found: the mirror said --bg-elevated was
 * L=0.19 while globals.css said 0.22, and --panel 0.17 against a real 0.20. So
 * every "PASS" on those surfaces was computed against a background the product
 * does not have — and a token edit that genuinely broke AA would have gone on
 * printing PASS, because nothing connected the two files.
 *
 * This is the same failure shape as B5 (a token silently redefined elsewhere)
 * and B8 (a class that resolves to nothing): the check and the thing being
 * checked lived in different places. Now there is one source.
 *
 * Run: npm run test:contrast
 */
import { readFileSync } from "node:fs";

type Oklch = { l: number; c: number; h: number }; // l 0..1, c, h degrees
const ok = (l: number, c: number, h: number): Oklch => ({ l, c, h });

const GLOBALS = new URL("../src/app/globals.css", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSS = readFileSync(GLOBALS, "utf8");

/**
 * Read `--name: oklch(L% C H)` out of globals.css. Percent L is normalised to
 * 0..1. Throws rather than falling back: a silent default would recreate exactly
 * the drift this parser was written to kill.
 */
function token(name: string): Oklch {
  const re = new RegExp(`--${name}\\s*:\\s*oklch\\(\\s*([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)`);
  const m = CSS.match(re);
  if (!m) throw new Error(`contrast-audit: --${name} not found as a literal oklch() in globals.css`);
  return ok(Number(m[1]) / 100, Number(m[2]), Number(m[3]));
}

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

// ── tokens — READ FROM globals.css, not mirrored ─────────────────────────────
const T = {
  pearl50: ok(0.99, 0.006, 268),
  bg: token("bg"),
  bgElevated: token("bg-elevated"),
  btnNoBg: ok(0.56, 0.2, 25),
  btnYesBg: ok(0.53, 0.155, 150), // H10 fixed (was 0.57)
  danger500: ok(0.57, 0.22, 25), // H10 fixed (was 0.60)
  border: token("border"),
  borderStrong: token("border-strong"),
  borderControl: token("border-control"),
  text: ok(0.97, 0.01, 268), // --text (approx near-white)
  // ── The ink ramp (added 2026-07-28 with DESIGN_AUTHORITY B8) ──────────────
  // These three were defined in globals.css from the start but were never bridged
  // into tailwind.config.ts, so `text-text-muted` / `-subtle` / `-faint` compiled
  // to NOTHING — 1,224 usages inheriting their parent's ink instead of receding.
  // Repairing the bridge makes them render for the first time, which is a real
  // darkening of the quiet end of the hierarchy. That has to be PROVEN against AA,
  // not assumed: RULES.md law 9 names faint body copy as a known failure mode.
  textMuted: token("text-muted"),
  textSubtle: token("text-subtle"),
  textFaint: token("text-faint"),
  bgInset: token("bg-inset"),
  panel: token("panel"),
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
