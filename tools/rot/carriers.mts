// Scratch: replicate decomment.test.mts §2.1's carrier computation over any tree root (argv[2]).
// Same regexes, same ALLOWED set, same walk, same decomment-before-look.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-rot3/scripts/lib/decomment.mts";

const ROOT = (process.argv[2] ?? "F:/kipindi-rot3").replace(/\\/g, "/");
const SCRIPTS = join(ROOT, "scripts");
const BS = String.fromCharCode(92);
const rel = (p: string) => p.split(BS).join("/").replace(ROOT.split(BS).join("/").replace(/\/$/, "") + "/", "");
function walk(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, re, out);
    else if (re.test(e)) out.push(p);
  }
  return out;
}
const BLOCK_RE = /\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\//;
const LINE_RE = /\/(?:\(\^\|\[\^:"'`\\w\/\]\)|\(\^\|\[\^:\]\)|\^\\s\*|\(\?<!:\))?\\\/\\\/[^/]*\//;
const ALLOWED = new Set(["scripts/lib/decomment.mts", "scripts/decomment.test.mts", "scripts/anchors/decomment.anchors.mjs"]);
const scriptFiles = walk(SCRIPTS, /\.(mts|mjs|cjs|ts|js)$/);
const carriers = scriptFiles.map(rel).filter((f) => !ALLOWED.has(f))
  .filter((f) => { const s = decomment(readFileSync(join(ROOT, f), "utf8")); return BLOCK_RE.test(s) || LINE_RE.test(s); });
console.log(JSON.stringify({ root: ROOT, files: scriptFiles.length, count: carriers.length, carriers }, null, 1));
