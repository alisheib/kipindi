// R5-D: every server module (no directive) in src that imports a VALUE from a "use client" module — the names it takes.
// A client module's exports reach a server module as references: a component can be rendered, nothing else can be
// read or called (Next's flight loader replaces the module with a client-module proxy on the server).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { posix } from "node:path";
import { decomment } from "file:///F:/kipindi-r5d/scripts/lib/decomment.mts";
const ROOT = process.argv[2] || "F:/kipindi-r5d";
const files: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(`${ROOT}/${d}`)) { const p = posix.join(d, n); if (statSync(`${ROOT}/${p}`).isDirectory()) walk(p); else if (/\.(tsx?|mts)$/.test(n)) files.push(p); } };
walk("src");
const text = new Map<string, string>();
const src = (p: string) => { if (!text.has(p)) text.set(p, decomment(readFileSync(`${ROOT}/${p}`, "utf8").replace(/\r\n/g, "\n").replace(/^\uFEFF/, ""))); return text.get(p)!; };
const directive = (p: string) => /^\s*["']use client["']/.test(src(p)) ? "client" : /^\s*["']use server["']/.test(src(p)) ? "server-action" : "none";
const resolve = (from: string, spec: string) => {
  const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(from), spec) : null;
  if (!base) return null;
  for (const e of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) { const p = base + e; if (existsSync(`${ROOT}/${p}`) && statSync(`${ROOT}/${p}`).isFile()) return p; }
  return null;
};
const out: string[] = [];
for (const f of files) {
  if (directive(f) !== "none") continue;
  for (const m of src(f).matchAll(/^\s*import\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    const to = resolve(f, m[2]);
    if (!to || directive(to) !== "client") continue;
    const clause = m[1];
    const names: string[] = [];
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause.trim()); if (def) names.push(`default as ${def[1]}`);
    const braces = /\{([^}]*)\}/.exec(clause); if (braces) for (const part of braces[1].split(",")) { const n = part.trim(); if (n && !/^type\s/.test(n)) names.push(n); }
    if (/\*\s+as\s+/.test(clause)) names.push(clause.trim());
    const bad = names.filter((n) => { const local = n.split(/\s+as\s+/).pop()!.trim(); const imported = n.split(/\s+as\s+/)[0].trim(); return !/^[A-Z]/.test(imported === "default" ? local : imported) || /^[A-Z][A-Z0-9_]+$/.test(imported); });
    if (bad.length) out.push(`${f}  ←  ${to}: ${bad.join(", ")}`);
  }
}
console.log(out.length ? out.join("\n") : "(none)");
console.log(`\n${files.length} files scanned`);
