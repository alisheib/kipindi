// R5-D: walk the VALUE-import graph from a client entry; flag anything that cannot load in the browser.
const fs = require("fs");
const path = require("path");
const ROOT = "F:/kipindi-r5d/";
const entry = process.argv[2] || "src/components/journey/route-ghost-lazy.tsx";
const exts = [".ts", ".tsx", "/index.ts", "/index.tsx", ""];
const resolve = (from, spec) => {
  let base = null;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(from), spec);
  else return null;
  for (const e of exts) { const p = base + e; if (fs.existsSync(ROOT + p) && fs.statSync(ROOT + p).isFile()) return p; }
  return "UNRESOLVED:" + base;
};
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const seen = new Map();
const bad = [];
const walk = (file, via) => {
  if (seen.has(file)) return;
  seen.set(file, via);
  const src = strip(fs.readFileSync(ROOT + file, "utf8"));
  const specs = [];
  for (const m of src.matchAll(/^\s*import\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    // `import { type A, b }` still loads; `import type` does not.
    specs.push(m[2]);
  }
  for (const m of src.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) specs.push(m[1]);
  for (const spec of specs) {
    if (/^(next\/headers|server-only|next\/server|node:|fs$|path$|crypto$|@prisma|prisma)/.test(spec)) bad.push(`${file} -> ${spec}`);
    if (spec.startsWith("@/lib/server/")) bad.push(`${file} -> ${spec} (a server module, value import)`);
    const r = resolve(file, spec);
    if (r && r.startsWith("UNRESOLVED")) bad.push(`${file} -> ${spec} (unresolved)`);
    else if (r) walk(r, file);
  }
};
walk(entry, "(entry)");
console.log(`${entry}: ${seen.size} modules reached`);
console.log([...seen.keys()].join("\n"));
console.log(bad.length ? `\nNOT CLIENT-SAFE:\n${bad.join("\n")}` : "\nall client-safe (no next/headers, no server module, no node built-in)");
