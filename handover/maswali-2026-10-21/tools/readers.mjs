// readers.mjs <tree> <base-ref> — which package.json red:* / qa:* / e2e:* scripts read a file changed in <base-ref>...HEAD.
// A script "reads" a path when its own file, or a scripts/ module it imports (transitively, relative imports only),
// names the path (repo-relative, with or without its extension) as a string. Prints one key per line with the paths.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const [tree, base] = process.argv.slice(2);
const git = (...a) => execFileSync("git", ["-C", tree, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
const changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean)
  .filter((f) => !f.startsWith("docs/") && !f.endsWith(".md") && !f.startsWith("public/icons/") && f !== "package.json" && f !== "package-lock.json");
const pkg = JSON.parse(readFileSync(join(tree, "package.json"), "utf8"));

const fileCache = new Map();
const read = (abs) => { if (!fileCache.has(abs)) { try { fileCache.set(abs, readFileSync(abs, "utf8")); } catch { fileCache.set(abs, ""); } } return fileCache.get(abs); };
const IMPORT_RE = /(?:import|export)[^'"`]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const EXTS = ["", ".mjs", ".mts", ".ts", ".js", ".cjs"];
function closure(entryAbs) {
  const seen = new Set(); const stack = [entryAbs];
  while (stack.length) {
    const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
    const src = read(f); let m; IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src))) {
      const spec = m[1] ?? m[2]; const baseAbs = resolve(dirname(f), spec);
      for (const e of EXTS) { const c = baseAbs + e; if (existsSync(c) && c.includes(`${join(tree, "scripts")}`)) { stack.push(c); break; } }
    }
  }
  return [...seen];
}
const needles = changed.map((p) => ({ p, a: p, b: p.replace(/\.(tsx?|mts|mjs|css)$/, "") }));
const out = [];
for (const [key, cmd] of Object.entries(pkg.scripts)) {
  if (!/^(red|qa|e2e):/.test(key)) continue;
  const files = [...cmd.matchAll(/scripts\/[\w./-]+\.(?:mjs|mts|ts|js|cjs)/g)].map((m) => join(tree, m[0]));
  if (!files.length) continue;
  const all = new Set(files.flatMap((f) => closure(f)));
  const hits = new Set();
  for (const f of all) { const src = read(f); for (const n of needles) if (src.includes(n.a) || src.includes(`"${n.b}"`) || src.includes(`'${n.b}'`) || src.includes(`${n.b}"`)) hits.add(n.p); }
  if (hits.size) out.push(`${key}\t${hits.size}\t${[...hits].slice(0, 6).join(" ")}${hits.size > 6 ? " …" : ""}`);
}
console.log(`changed (non-doc) files: ${changed.length}; readers: ${out.length}`);
console.log(out.join("\n"));
