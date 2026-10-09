const toSrgb = (L, C, H) => {
  const h = H * Math.PI / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = (x) => { x = Math.max(0, Math.min(1, x)); return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)); };
  return [enc(r), enc(g), enc(bb)];
};
const toks = {
  "gold-50": [98, .030, 84], "gold-100": [94, .058, 84], "gold-200": [90, .095, 84], "gold-300 (=gilt, warning-fg)": [86, .110, 84],
  "gold-400 (=gilt-strong)": [80, .1141, 84], "gold-500 (=gold)": [72, .114, 84], "gold-600": [64, .102, 84], "gold-700": [56, .092, 84],
  "gilt-metal 0%": [91, .090, 84], "gilt-metal 48%": [79, .114, 84], "gilt-metal 100%": [72, .114, 84],
  "gilt-ink 50%": [84, .114, 84], "gilt-ink 100%": [77, .120, 84],
  "warning-500": [78, .13, 86], "border-gold": [78, .115, 84],
  "brand-500": [63, .180, 262], "brand-400": [72, .160, 262], "brand-300": [82, .120, 262], "brand-200": [88, .090, 262],
  "info-500": [64, .17, 268], "info-fg": [86, .10, 268], "royal-300": [76, .130, 268], "royal-400": [60, .180, 268],
  "accent-300": [80, .095, 195], "aqua-300": [80, .100, 195], "text-subtle": [70, .080, 268], "text-muted": [86, .040, 268],
  "live-400": [64, .20, 25], "claret-300": [72, .140, 15],
};
for (const [k, [L, C, H]] of Object.entries(toks)) console.log(k.padEnd(32), toSrgb(L / 100, C, H).join(","));
