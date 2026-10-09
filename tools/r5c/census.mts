// Gold census over F:/kipindi-r5c/src — every comment-stripped site that paints gold, gilt or the warning family.
// Run: cd F:/kipindi-r5c && npx tsx <this file> [--css] [--json out.json]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment, decommentCss } from "file:///F:/kipindi-r5c/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5c";
const files: string[] = [];
const walk = (d: string) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx|ts|css|mts|mjs|js)$/.test(n)) files.push(p);
  }
};
walk(join(ROOT, "src"));

const PATTERNS: Array<[string, RegExp]> = [
  ["tw", /(?<![\w-])(?:[a-z0-9]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:gold|gilt|warning)(?:-[a-zA-Z0-9]+)?(?:\/[\d.\[\]]+)?(?![\w-])/g],
  ["var", /var\(\s*--(?:gold|gilt|warning|border-gold|glow-gold|g-gold|bet-jackpot|bet-streak)[\w-]*\s*\)/g],
  ["cls", /(?<![\w-])(?:gilt-metal|gilt-ink|gilt-sheen|gilt-strong|gilt|mat-tint-gold|mat-tint-warn|shadow-glow-gold|chip-resolved|seal-[\w-]+|btn-gold|g-gold)(?![\w-])/g],
  ["prop", /(?:tone|variant|intent|kind|accent|color)\s*[=:]\s*\{?\s*["'](?:warning|gold|gilt|resolved|win)["']/g],
  ["oklch", /oklch\(\s*[\d.]+%?\s+0?\.\d+\s+(?:7\d|8\d|9\d)(?:\.\d+)?\s*(?:\/\s*[\d.]+%?)?\s*\)/g],
  ["hex", /#(?:E3BC66|D49824|F3CB7A|DFB03B|C69E48|E0B762|DDB45F)\b/gi],
];

type Hit = { file: string; line: number; kind: string; match: string; text: string };
const hits: Hit[] = [];
for (const f of files) {
  const raw = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const code = f.endsWith(".css") ? decommentCss(raw) : decomment(raw);
  const lines = code.split("\n");
  lines.forEach((ln, i) => {
    for (const [kind, re] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of ln.matchAll(re)) {
        // skip the `--gilt*` / `--gold*` / `--warning*` DEFINITIONS themselves are separate (`--x:` not var()).
        hits.push({ file: relative(ROOT, f).replace(/\\/g, "/"), line: i + 1, kind, match: m[0], text: ln.trim().slice(0, 220) });
      }
    }
  });
}
const byFile = new Map<string, Hit[]>();
for (const h of hits) { if (!byFile.has(h.file)) byFile.set(h.file, []); byFile.get(h.file)!.push(h); }
const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
if (jsonAt >= 0) writeFileSync(args[jsonAt + 1], JSON.stringify(hits, null, 1));
const sorted = [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]));
let total = 0;
for (const [f, hs] of sorted) {
  total += hs.length;
  console.log(`\n### ${f} (${hs.length})`);
  for (const h of hs) console.log(`  ${String(h.line).padStart(5)} [${h.kind}] ${h.match}  ::  ${h.text}`);
}
console.log(`\nTOTAL ${total} hits in ${byFile.size} files`);
