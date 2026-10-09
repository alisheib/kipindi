// C3: the gold census (scripts/visual-pass-r5c.test.mts §1) against the warning family's other spellings.
// Its scanner regexes are copied verbatim from the suite (lines ~106-123); the registry's file names are read from it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const R = "F:/kipindi-r6c/";
const suite = readFileSync(R + "scripts/visual-pass-r5c.test.mts", "utf8");
const VAR = /var\(\s*--(?:gilt[\w-]*|gold(?:-[\w-]+)?|metal-gold|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak|bar-needle(?:-glow)?|warning-fg)\s*[,)]/g;
const TW = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:(?:gold|gilt)(?:-[a-z0-9]+)?|warning-fg)(?:\/[\w.[\]]+)?(?![\w-])/g;
const NAME = /["'`](?:gold|warning)["'`]/g;
// Sanity: the copies are the suite's own text.
for (const [n, re] of [["VAR", VAR], ["TW", TW]]) console.log(`${n} copied verbatim from the suite: ${suite.includes(re.source)}`);
// What --warning-500 is, by the census's own "gold by any other spelling" rule (hue 70-100, chroma >= 0.04).
const css = readFileSync(R + "src/app/globals.css", "utf8");
const w500 = /--warning-500:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(css);
console.log(`--warning-500 = oklch(${w500[1]}% ${w500[2]} ${w500[3]}) -> census gold rule (C>=0.04 && 70<=H<100): ${Number(w500[2]) >= 0.04 && Number(w500[3]) >= 70 && Number(w500[3]) < 100}`);
for (const tok of ["--warning:", "--warning-bg:", "--warning-border:"]) console.log(`  ${tok} ${new RegExp(tok + "\\s*([^;]+);").exec(css)[1]}`);
// Every warning-family paint in player code that the scanner does NOT count.
const WARN = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|divide)-warning(?:-bg|-border|-500)?(?:\/[\w.[\]]+)?(?![\w-])|var\(--warning(?:-bg|-border|-500)?\)/g;
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx|ts|css)$/.test(f)) files.push(p.replace(/\\/g, "/").slice(R.length)); } };
walk(R + "src");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
let missed = 0;
for (const f of files) {
  if (OUT.test(f)) continue;
  const lines = strip(readFileSync(R + f, "utf8")).split(/\r?\n/);
  const hits = [];
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(WARN)) {
      const counted = [...ln.matchAll(VAR), ...ln.matchAll(TW)].some((c) => c.index <= m.index && m.index < c.index + c[0].length);
      if (!counted) hits.push(`${i + 1}:${m[0]}`);
    }
  });
  if (!hits.length) continue;
  missed += hits.length;
  const registered = suite.includes(`"${f}": [`);
  console.log(`${registered ? "registered  " : "UNREGISTERED"} ${f}  ${hits.join(" ")}`);
}
console.log(`warning-family paints the census does not count: ${missed}`);
