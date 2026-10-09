// The server-side import closure of a src entry: static (non-type) and dynamic imports among src files; it stops at
// "use client" modules (each is a client entry, the code that joins the segment's client chunk) and lists them.
const fs = require("fs"), path = require("path");
const ROOT = "F:/kipindi-r4j";
const exts = [".tsx", ".ts", ".mts", ".js", ".mjs", "/index.tsx", "/index.ts"];
function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of exts) if (fs.existsSync(base + e)) return base + e;
  return null;
}
const STATIC = /(?:^|\n)[ \t]*(?:import|export)[ \t]+(type[ \t]+)?(?:\{[^}]*\}|\*[^;\n]*?|[A-Za-z_$][\w$]*(?:[ \t]*,[ \t]*\{[^}]*\})?)[ \t\r\n]*from[ \t]*["']([^"']+)["']/g;
const SIDE = /(?:^|\n)[ \t]*import[ \t]*["']([^"']+)["']/g;
const DYN = /import\(\s*["']([^"']+)["']\s*\)/g;
const isClient = (s) => /^\uFEFF?\s*["']use client["']/.test(s) || /^\uFEFF?\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use client["']/.test(s);
function closure(entry) {
  const seen = new Set(), clients = new Set(), server = [];
  const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
  const walk = (f) => {
    if (seen.has(f)) return; seen.add(f);
    const raw = fs.readFileSync(f, "utf8");
    if (rel(f) !== entry && isClient(raw)) { clients.add(rel(f)); return; }
    server.push(rel(f));
    const specs = [];
    for (const m of raw.matchAll(STATIC)) if (!m[1]) specs.push(m[2]);
    for (const m of raw.matchAll(SIDE)) specs.push(m[1]);
    for (const m of raw.matchAll(DYN)) specs.push(m[1]);
    for (const s of specs) { const r = resolve(f, s); if (r) walk(r); }
  };
  walk(path.join(ROOT, entry));
  return { clients: [...clients].sort(), server: server.sort() };
}
module.exports = { closure };
if (require.main === module) {
  for (const e of process.argv.slice(2)) { const c = closure(e); console.log(e, "\n  client entries (" + c.clients.length + "):", c.clients.join(", "), "\n  server modules:", c.server.length); }
}
