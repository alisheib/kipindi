// Money figures rendered as JSX children: is the figure in the mono `.amount` face and kept whole?
// Heuristic: for each `{formatTzs…(` child expression, find the innermost enclosing JSX opening tag and read its
// className / component. Prints only the sites NOT inside .amount / font-mono / Cash / Stat money / nowrap.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const R = "F:/kipindi-rev/";
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/").slice(R.length)); } };
walk(R + "src");
const changed = new Set(readFileSync("C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/review6/C/stat.txt", "utf8")
  .split("\n").map((l) => l.trim().split(/\s+\|/)[0]).filter(Boolean));
const blank = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, a) => a + " ".repeat(m.length - a.length));
let n = 0, flagged = 0;
for (const f of files) {
  if (OUT.test(f)) continue;
  const src = blank(readFileSync(R + f, "utf8"));
  for (const m of src.matchAll(/\{\s*(?:`[^`]*\$\{)?\s*formatTzs(?:Compact|Signed|Abs)?\(/g)) {
    n++;
    // innermost opening tag before the site that is not closed before it
    const before = src.slice(0, m.index);
    let depth = 0, open = -1;
    const tags = [...before.matchAll(/<\/?([A-Za-z][\w.]*)\b[^<>]*?(\/?)>/g)];
    for (let i = tags.length - 1; i >= 0; i--) {
      const t = tags[i];
      if (t[0].startsWith("</")) depth++;
      else if (t[2] === "/") continue;
      else if (depth === 0) { open = i; break; }
      else depth--;
    }
    if (open < 0) continue; // not inside JSX children (e.g. a prop value)
    const tag = tags[open][0];
    const ok = /\bamount\b|font-mono|whitespace-nowrap|tabular-nums/.test(tag) || /^<(Cash|Stat|MoneyText|Amount)\b/.test(tag);
    // a prop like value={formatTzs(...)} is not a child: skip when the `{` follows `=`
    if (/=\s*$/.test(before)) continue;
    if (ok) continue;
    flagged++;
    const line = before.split("\n").length;
    console.log(`${changed.has(f) ? "touched " : "        "} ${f}:${line}  ${tag.replace(/\s+/g, " ").slice(0, 150)}`);
  }
}
console.log(`\n${n} money child sites scanned; ${flagged} not in .amount / mono / nowrap / Cash / Stat`);
