// R5-D: walk the SERVER graph — from every src/app module without "use client", through every value import of a module
// without "use client" — and list each import of a "use client" module whose names are not components. On the server such
// a name is a client reference: a component can be rendered, but a constant cannot be indexed and a function not called.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { posix } from "node:path";
import { decomment } from "file:///F:/kipindi-r5d/scripts/lib/decomment.mts";
const ROOT = process.argv[2] || "F:/kipindi-r5d";
const all: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(`${ROOT}/${d}`)) { const p = posix.join(d, n); if (statSync(`${ROOT}/${p}`).isDirectory()) walk(p); else if (/\.(tsx?|mts)$/.test(n)) all.push(p); } };
walk("src");
const cache = new Map<string, string>();
const src = (p: string) => { if (!cache.has(p)) cache.set(p, decomment(readFileSync(`${ROOT}/${p}`, "utf8").replace(/\r\n/g, "\n").replace(/^\uFEFF/, ""))); return cache.get(p)!; };
const isClient = (p: string) => /^\s*["']use client["']/.test(src(p));
const resolve = (from: string, spec: string) => {
  const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(from), spec) : null;
  if (!base) return null;
  for (const e of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) { const p = base + e; if (existsSync(`${ROOT}/${p}`) && statSync(`${ROOT}/${p}`).isFile()) return p; }
  return null;
};
type Edge = { from: string; to: string; names: string[] };
const edges = (f: string): Edge[] => {
  const out: Edge[] = [];
  for (const m of src(f).matchAll(/^\s*(?:import|export)\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    const to = resolve(f, m[2]); if (!to) continue;
    const clause = m[1]; const names: string[] = [];
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause.trim()); if (def) names.push(`default:${def[1]}`);
    const braces = /\{([^}]*)\}/.exec(clause); if (braces) for (const part of braces[1].split(",")) { const n = part.trim(); if (n && !/^type\s/.test(n)) names.push(n.split(/\s+as\s+/)[0].trim()); }
    if (/\*/.test(clause)) names.push("*");
    out.push({ from: f, to, names });
  }
  for (const m of src(f).matchAll(/^\s*import\s+["']([^"']+)["']/gm)) { const to = resolve(f, m[1]); if (to) out.push({ from: f, to, names: [] }); }
  return out;
};
const component = (n: string) => n.startsWith("default:") ? /^[A-Z]/.test(n.slice(8)) : /^[A-Z][a-z0-9]/.test(n) || /^[A-Z]$/.test(n);
const seen = new Set<string>(); const stack = all.filter((p) => p.startsWith("src/app/") && !isClient(p));
const roots = stack.length;
const bad: string[] = [];
while (stack.length) {
  const f = stack.pop()!; if (seen.has(f)) continue; seen.add(f);
  for (const e of edges(f)) {
    if (isClient(e.to)) { const wrong = e.names.filter((n) => !component(n)); if (wrong.length) bad.push(`${e.from}  →  ${e.to}: ${wrong.join(", ")}`); }
    else stack.push(e.to);
  }
}
console.log(bad.length ? bad.join("\n") : "(none)");
console.log(`\n${roots} server entries under src/app, ${seen.size} server modules walked`);
