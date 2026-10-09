// Every npm script whose test file reads a touched path (full path, or src-relative path without its extension).
const fs = require("fs"); const path = require("path"); const cp = require("child_process");
const touched = cp.execSync("git diff --name-only && git ls-files --others --exclude-standard", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean).filter((f) => f.startsWith("src/") || f.startsWith("public/"));
const scripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const files = [];
const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.posix.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(mts|mjs|cjs|ts|js)$/.test(n)) files.push(p); } };
walk("scripts");
const readers = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const hits = touched.filter((t) => s.includes(t) || s.includes(t.replace(/^src\//, "").replace(/\.(tsx?|js)$/, "")));
  if (hits.length) readers.set(f, hits);
}
const byScript = [];
for (const [name, cmd] of Object.entries(scripts)) for (const [f, hits] of readers) if (cmd.includes(f)) byScript.push([name, f, hits.length]);
const tests = byScript.filter(([n]) => n.startsWith("test:")).map(([n]) => n);
const reds = byScript.filter(([n]) => !n.startsWith("test:")).map(([n, f]) => `${n} (${f})`);
const orphans = [...readers.keys()].filter((f) => !byScript.some(([, g]) => g === f));
console.log("TEST SCRIPTS:", [...new Set(tests)].sort().join(" "));
console.log("\nOTHER SCRIPTS (red twins etc.):", [...new Set(reds)].sort().join(" | "));
console.log("\nREADERS WITH NO npm SCRIPT (anchors/libs/data):", orphans.join(" "));
