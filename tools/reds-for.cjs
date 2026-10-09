// node reds-for.cjs <repoDir> <base> <tip> — every red: twin whose own script, or its test: twin's script, reads a file the
// range base..tip changed (src/, scripts/, public/sw.js, next.config.ts). Prints one name per line (red:all excluded).
const fs = require("fs"), path = require("path"), cp = require("child_process");
const [dir, base, tip] = process.argv.slice(2);
const changed = cp.execSync(`git diff --name-only ${base} ${tip}`, { cwd: dir, encoding: "utf8" })
  .split("\n").filter(Boolean).filter((f) => /^(src\/|scripts\/|public\/sw\.js$|next\.config\.ts$)/.test(f));
const scripts = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).scripts;
const filesOf = (cmd) => (cmd || "").split(/\s+/).filter((w) => /^scripts\/.+\.(m?[jt]s|cjs|mts)$/.test(w));
const needles = (c) => [c, c.replace(/^src\//, ""), c.replace(/^src\//, "@/").replace(/\.(tsx?|css)$/, "")];
const cache = new Map();
const reads = (f) => {
  if (!cache.has(f)) { let t = ""; try { t = fs.readFileSync(path.join(dir, f), "utf8"); } catch {} cache.set(f, t); }
  const t = cache.get(f);
  return changed.some((c) => c === f || needles(c).some((n) => t.includes(n)));
};
const out = [];
for (const [k, v] of Object.entries(scripts)) {
  if (!k.startsWith("red:") || k === "red:all") continue;
  const twin = scripts["test:" + k.slice(4)];
  const files = [...filesOf(v), ...filesOf(twin)];
  if (files.some(reads)) out.push(k);
}
console.log(out.join("\n"));
console.error(`${out.length} red twins read a file changed in ${base}..${tip} (${changed.length} files)`);
