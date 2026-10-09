// Quick WCAG probe for candidate pairs (same math as the suite's §5).
const lin2srgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const oklch = (L, C, H) => {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, bl].map((c) => Math.min(1, Math.max(0, lin2srgb(c))));
};
const lum = (c) => { const f = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pearl = oklch(0.99, 0.006, 268);
const probe = (name, bg) => console.log(name.padEnd(40), ratio(pearl, bg).toFixed(2));
probe("pearl on brand-500 63%", oklch(0.63, 0.18, 262));
probe("pearl on brand-600 54%", oklch(0.54, 0.165, 262));
probe("pearl on royal-500 48%", oklch(0.48, 0.2, 268));
probe("pearl on no-400 72% (rose top)", oklch(0.72, 0.18, 22));
probe("pearl on no-600 52% (rose bottom)", oklch(0.52, 0.19, 22));
probe("pearl on danger-500 57%", oklch(0.57, 0.22, 25));
probe("pearl on btn-primary top 53%/268", oklch(0.53, 0.2, 268));
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const card = oklch(0.24, 0.145, 268);
const row = over(oklch(0.11, 0.11, 268), 0.4, card); // bg-bg-overlay/40 over the card
const dim = (fg, bg) => [over(fg, 0.7, card), over(bg, 0.7, card)];
const chips = {
  pending: [oklch(0.82, 0.12, 262), over(oklch(0.54, 0.165, 262), 0.26, row)],
  success: [oklch(0.84, 0.11, 166), over(oklch(0.62, 0.12, 166), 0.18, row)],
  neutral: [oklch(0.86, 0.04, 268), over(oklch(0.34, 0.09, 268), 0.5, row)],
  oldWarning: [oklch(0.86, 0.11, 84), over(oklch(0.78, 0.13, 86), 0.18, row)],
};
for (const [k, [fg, bg]] of Object.entries(chips)) { const [f2, b2] = dim(fg, bg); console.log(k.padEnd(12), "row", ratio(fg, bg).toFixed(2), "dimmed .7", ratio(f2, b2).toFixed(2)); }
