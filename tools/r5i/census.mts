// R5-I census: every use of the betting pair (--yes-*/--no-*, yes-/no- utility classes, chip/btn yes/no, bet-win/lose,
// and hand-typed oklch/hex near hue 22 / 152) in player code. Run from the worktree: npx tsx <this> [--json out]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment, decommentCss } from "file:///F:/kipindi-r5i/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5i";
const OUT_OF_SCOPE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const toOklch = (r8: number, g8: number, b8: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
};
const bettingHue = (C: number, H: number) => C >= 0.04 && ((H >= 19 && H < 24) || (H >= 145 && H < 160));
type Hit = { kind: string; match: string; line: number; text: string };
function hits(file: string, src: string): Hit[] {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  const out: Hit[] = [];
  code.split("\n").forEach((ln, i) => {
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1, text: ln.trim().slice(0, 220) });
    };
    push("var", /var\(\s*--(?:yes|no)-\d{2,3}\s*[,)]/g);
    push("alias", /var\(\s*--(?:bet-win|bet-lose|bar-glow-yes|bar-glow-no|bar-yes[\w-]*|bar-no[\w-]*|yes|no)\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:yes|no)-\d{2,3}(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])(?:chip-yes|chip-no|btn-yes|btn-no|chip-hot-rose)(?![\w-])/g);
    push("oklch", /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => bettingHue(Number(m[2]), Number(m[3])));
    push("hex", /#([0-9a-fA-F]{6})\b/g, (m) => {
      const x = m[1]; const o = toOklch(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
      return bettingHue(o.C, o.H);
    });
  });
  return out;
}
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts|css)$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
});
const census: Record<string, Hit[]> = {};
for (const f of walk(join(ROOT, "src"))) {
  if (OUT_OF_SCOPE.test(f)) continue;
  const h = hits(f, readFileSync(join(ROOT, f), "utf8"));
  if (h.length) census[f] = h;
}
const files = Object.keys(census).sort();
let total = 0;
for (const f of files) {
  total += census[f].length;
  console.log(`\n${f}  (${census[f].length})`);
  for (const x of census[f]) console.log(`  ${String(x.line).padStart(5)} [${x.kind}] ${x.match}  ::  ${x.text}`);
}
console.log(`\nTOTAL ${total} hits in ${files.length} files`);
const json = process.argv.indexOf("--json");
if (json > 0) writeFileSync(process.argv[json + 1], JSON.stringify(Object.fromEntries(files.map((f) => [f, census[f].length])), null, 1));
