// The suite's betting-pair census run over HEAD (95ff793b) — git objects only, the working tree untouched — for the
// report's before/after. Prints per-file counts at HEAD and the totals.
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "file:///F:/kipindi-r5i/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5i";
const git = (...a: string[]) => execFileSync("git", ["--no-optional-locks", "-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
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
function hits(file: string, src: string): number {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  let n = 0;
  for (const ln of code.split("\n")) {
    const c = (re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => { for (const m of ln.matchAll(re)) if (keep(m)) n++; };
    c(/var\(\s*--(?:yes|no)-\d{2,3}\s*[,)]/g);
    c(/var\(\s*--(?:bet-win|bet-lose|bet-hot|glow-win|hero-yes-accent|hero-no-accent|hero-tag-yes|bar-(?:fill|glow|label)-(?:yes|no)(?:-strong)?)\s*[,)]/g);
    c(/(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:yes|no)-\d{2,3}(?:\/[\w.[\]]+)?(?![\w-])/g);
    c(/(?<![\w-])(?:btn-yes|btn-no)(?![\w-])/g);
    if (/\.tsx?$/.test(file) && /(?:variant|[tT]one|accent|glow)\b/.test(ln)) c(/["'`](?:yes|no|rose)["'`]/g);
    c(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => bettingHue(Number(m[2]), Number(m[3])));
    c(/#([0-9a-fA-F]{6})\b/g, (m) => { const x = m[1]; const o = toOklch(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)); return bettingHue(o.C, o.H); });
  }
  return n;
}
const files = git("ls-tree", "-r", "--name-only", "HEAD", "src").split("\n").filter((f) => /\.(tsx|ts|css)$/.test(f) && !OUT_OF_SCOPE.test(f));
let total = 0, nfiles = 0;
const rows: string[] = [];
for (const f of files) {
  const n = hits(f, git("show", `HEAD:${f}`));
  if (n) { total += n; nfiles++; rows.push(`${String(n).padStart(4)}  ${f}`); }
}
console.log(rows.join("\n"));
console.log(`HEAD: ${total} uses in ${nfiles} files`);
