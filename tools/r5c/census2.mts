// R5-C · the gold census as the suite will count it — prints per-file counts and every hit.
// Run: cd F:/kipindi-r5c && npx tsx <this file> [--json out.json]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment, decommentCss } from "file:///F:/kipindi-r5c/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5c";
const EXCLUDE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const files: string[] = [];
const walk = (d: string) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts|css)$/.test(n)) files.push(relative(ROOT, p).replace(/\\/g, "/"));
  }
};
walk(join(ROOT, "src"));

const toOklch = (r8: number, g8: number, b8: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
  return { L, C, H };
};
const goldHue = (C: number, H: number) => C >= 0.04 && H >= 70 && H < 100;

type Hit = { kind: string; match: string; line: number };
export function goldHits(file: string, raw: string): Hit[] {
  const src = raw.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(src) : decomment(src);
  const out: Hit[] = [];
  const lines = code.split("\n");
  lines.forEach((ln, i) => {
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1 });
    };
    push("var", /var\(\s*--(?:gilt[\w-]*|gold(?:-[\w-]+)?|metal-gold|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak|bar-needle(?:-glow)?|warning-fg)\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:(?:gold|gilt)(?:-[a-z0-9]+)?|warning-fg)(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])(?:gilt-metal|gilt-ink|btn-gold|mat-tint-gilt|chip-resolved)(?![\w-])/g);
    if (file.endsWith(".tsx")) push("name", /["'`](?:gold|warning)["'`]/g);
    else if (file.endsWith(".ts")) push("name", /["'`]gold["'`]/g);
    if (file.endsWith(".tsx")) {
      push("comp", /<(?:GiltCorner|RewardBurst)\b/g);
      push("seal", /<Chip\b[^>]*\bvariant=(?:"resolved"|\{[^}]*"resolved"[^}]*\})/g);
      push("struck", /\bstruck=\{/g);
      push("gilt-class", /className=(?:"|\{`|\{")[^"`]*(?<![\w-])gilt(?![\w-])/g);
    }
    push("oklch", /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => goldHue(Number(m[2]), Number(m[3])));
    push("hex", /#([0-9a-fA-F]{6})\b/g, (m) => { const h = m[1]; const o = toOklch(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)); return goldHue(o.C, o.H); });
  });
  return out;
}

const per = new Map<string, Hit[]>();
for (const f of files) {
  if (EXCLUDE.test(f)) continue;
  const hits = goldHits(f, readFileSync(join(ROOT, f), "utf8"));
  if (hits.length) per.set(f, hits);
}
const sorted = [...per.entries()].sort((a, b) => a[0].localeCompare(b[0]));
let total = 0;
for (const [f, hs] of sorted) {
  total += hs.length;
  console.log(`\n### ${f} (${hs.length})`);
  for (const h of hs) console.log(`  ${String(h.line).padStart(5)} [${h.kind}] ${h.match}`);
}
console.log(`\nTOTAL ${total} hits in ${per.size} files`);
console.log("\nREGISTRY:");
for (const [f, hs] of sorted) console.log(`  ["${f}", ${hs.length}],`);
const args = process.argv.slice(2);
const j = args.indexOf("--json");
if (j >= 0) writeFileSync(args[j + 1], JSON.stringify(Object.fromEntries(sorted.map(([f, hs]) => [f, hs])), null, 1));
