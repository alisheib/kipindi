// R5-D · F1 siblings: every generateMetadata in src/app — what it awaits, whether it can throw / notFound / redirect.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { posix } from "node:path";
import { decomment } from "file:///F:/kipindi-r5d/scripts/lib/decomment.mts";
const ROOT = "F:/kipindi-r5d/";
function fnText(src: string, head: string): string {
  const at = src.indexOf(head);
  if (at < 0) return "";
  let i = src.indexOf("(", at), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "(") depth++; else if (src[i] === ")" && --depth === 0) break; }
  const open = src.indexOf("{", i);
  depth = 0;
  for (let k = open; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) return src.slice(at, k + 1); }
  return "";
}
const files: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(ROOT + d)) { const p = posix.join(d, n); if (statSync(ROOT + p).isDirectory()) walk(p); else if (/\.tsx?$/.test(n)) files.push(p); } };
walk("src/app");
for (const f of files) {
  const src = decomment(readFileSync(ROOT + f, "utf8").replace(/\r\n/g, "\n"));
  const fn = fnText(src, "export async function generateMetadata");
  if (!fn) continue;
  const awaits = [...fn.matchAll(/await\s+([A-Za-z_$][\w$.]*)\s*\(/g)].map((m) => m[1]).filter((n) => !["params", "searchParams"].includes(n));
  const others = [...new Set(awaits)].filter((n) => !["getServerT"].includes(n));
  const deciding = /\bnotFound\(\)|\bredirect\(|\bthrow\b/.test(fn);
  const hasTry = /\btry\s*\{/.test(fn);
  if (others.length || deciding) console.log(`${f}\n   awaits: ${others.join(", ") || "-"} | try: ${hasTry} | notFound/redirect/throw: ${deciding}`);
}
