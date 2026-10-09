// sRGB + WCAG contrast for the report's "after" inks and the owner's warning re-hue proposal.
const toSrgbLin = (L, C, H) => {
  const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((x) => Math.max(0, Math.min(1, x)));
};
const enc = (x) => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
const Y = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (fg, bg) => { const a = Y(fg), b = Y(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const T = {
  "bg": [6.5, 0.130, 268], "bg-elevated": [22, 0.140, 268], "bg-overlay": [11, 0.110, 268],
  "text": [98, 0.012, 268], "text-muted": [86, 0.040, 268], "text-subtle": [70, 0.080, 268], "border": [36, 0.130, 268], "border-strong": [44, 0.150, 268],
  "brand-300": [82, 0.120, 262], "brand-400": [72, 0.160, 262], "brand-500": [63, 0.180, 262],
  "metal-gold": [76, 0.068, 88], "gold-300 (gilt)": [86, 0.110, 84], "warning-500 (now)": [78, 0.13, 86],
  "claret-400": [60, 0.160, 15], "success-fg": [84, 0.11, 166], "info-fg": [86, 0.10, 268], "danger-fg": [82, 0.16, 25],
  "PROPOSAL warning-500": [74, 0.15, 62], "PROPOSAL warning-fg": [84, 0.115, 66],
};
const lin = Object.fromEntries(Object.entries(T).map(([k, [L, C, H]]) => [k, toSrgbLin(L / 100, C, H)]));
for (const [k, v] of Object.entries(lin)) {
  if (k.startsWith("bg")) continue;
  console.log(`${k.padEnd(24)} rgb(${v.map(enc).join(",")})  on bg-elevated ${ratio(v, lin["bg-elevated"]).toFixed(2)}:1  on bg ${ratio(v, lin["bg"]).toFixed(2)}:1`);
}
