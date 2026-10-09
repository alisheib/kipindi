// Every element whose class list carries `amount` (mono + nowrap) — does its content read dictionary words (a sentence
// held unbreakable, review C7's pattern)? Prints each site with what it holds.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r6c/scripts/lib/decomment.mts";
const R = "F:/kipindi-r6c/";
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk(R + "src");
const OUT = /src\/(?:app\/admin|components\/admin)\//;
let n = 0;
for (const file of files) {
  if (OUT.test(file)) continue;
  const src = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  for (const m of src.matchAll(/<([a-zA-Z][\w.]*)\b([^>]*?\bclassName=(?:"[^"]*\bamount\b[^"]*"|\{[^}]*\bamount\b[^}]*\}|\{`[^`]*\bamount\b[^`]*`\}))[^>]*?(\/?)>/g)) {
    if (m[3] === "/") continue;
    const tag = m[1];
    const start = (m.index ?? 0) + m[0].length;
    // the children, to this tag's matching close (depth-counted on the same tag name)
    let depth = 1, i = start;
    const open = new RegExp(`<${tag.replace(".", "\\.")}\\b[^>]*?(/?)>`, "g"), close = new RegExp(`</${tag.replace(".", "\\.")}>`, "g");
    let end = -1;
    while (depth > 0) {
      open.lastIndex = i; close.lastIndex = i;
      const o = open.exec(src), c = close.exec(src);
      if (!c) break;
      if (o && o.index < c.index) { if (o[1] !== "/") depth++; i = o.index + o[0].length; }
      else { depth--; i = c.index + c[0].length; if (depth === 0) end = c.index; }
    }
    if (end < 0) continue;
    const kids = src.slice(start, end);
    if (/\bt\.[a-zA-Z]+\.[a-zA-Z]+/.test(kids) || /[a-zA-Z]{4,}\s+[a-zA-Z]{3,}/.test(kids.replace(/\{[^}]*\}/g, ""))) {
      n++;
      const line = src.slice(0, m.index).split("\n").length;
      console.log(`${file.slice(R.length)}:${line}  <${tag} …amount…>  ${kids.replace(/\s+/g, " ").trim().slice(0, 140)}`);
    }
  }
}
console.log(`${n} .amount elements hold dictionary words or prose`);
