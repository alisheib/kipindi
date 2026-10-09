// Every <ConfirmModal …> without `loading`: print its onConfirm, so a request kept in flight behind an open dialog shows.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r5a/scripts/lib/decomment.mts";

const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p.replace(/\\/g, "/")); } };
walk("F:/kipindi-r5a/src");
function openingTag(src: string, at: number): string {
  let depth = 0, i = at, q: string | null = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { if (depth > 0 || c === '"') { q = c; continue; } }
    if (c === "{") depth++; else if (c === "}") depth--; else if (c === ">" && depth === 0) break;
  }
  return src.slice(at, i + 1);
}
for (const f of files) {
  const src = decomment(readFileSync(f, "utf8").replace(/\r\n/g, "\n"));
  const re = /<ConfirmModal(?=[\s>])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const tag = openingTag(src, m.index);
    if (/\sloading=/.test(tag)) continue;
    const line = src.slice(0, m.index).split("\n").length;
    const oc = /onConfirm=\{([\s\S]*?)\}\s*\n\s*(?:[a-zA-Z]+=|\/?>)/.exec(tag)?.[1] ?? "?";
    console.log(`${f.replace("F:/kipindi-r5a/", "")}:${line}\n   onConfirm=${oc.replace(/\s+/g, " ").slice(0, 260)}`);
  }
}
