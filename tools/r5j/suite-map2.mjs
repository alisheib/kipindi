// Per changed file: the package.json test/red suites whose script (or a helper it imports, transitively) names it.
// node <this> [file-to-skip ...]   (run anywhere)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";
const ROOT = "F:/kipindi-r5j";
const skip = new Set(process.argv.slice(2));
const changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only"], { encoding: "utf8" }).split("\n").filter((f) => f.startsWith("src/") && !skip.has(f));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patternsFor = (f) => {
  const noSrc = f.replace(/^src\//, "").replace(/\.(tsx?|css)$/, "");
  const parts = noSrc.split("/");
  const out = [new RegExp(esc(noSrc).replace(/\\\[/g, "\\\\?\\[").replace(/\\\]/g, "\\\\?\\]"))];
  if (parts.length >= 2) out.push(new RegExp(`["'\`]${esc(parts[parts.length - 2])}["'\`]\\s*,\\s*["'\`]${esc(parts[parts.length - 1])}`));
  const base = basename(noSrc);
  if (!/^(page|layout|loading|actions|route|index|_components|utils|globals|query)$/.test(base)) out.push(new RegExp(`[/"'\`]${esc(base)}(?:\\.tsx?)?["'\`]`));
  if (base === "globals") out.push(/globals\.css/);
  return out;
};
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const importersOf = new Map();
for (const f of files) for (const m of src.get(f).matchAll(/(?:import|from|import\()\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
  const target = resolve(dirname(f), m[1]);
  for (const cand of [target, target + ".mts", target + ".ts", target + ".mjs"]) if (src.has(cand)) { if (!importersOf.has(cand)) importersOf.set(cand, new Set()); importersOf.get(cand).add(f); }
}
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rel = (f) => relative(ROOT, f).split("\\").join("/");
const all = new Map();
for (const c of changed) {
  const direct = files.filter((f) => patternsFor(c).some((re) => re.test(src.get(f))));
  const reach = new Set(direct);
  let grew = true;
  while (grew) { grew = false; for (const f of [...reach]) for (const imp of importersOf.get(f) ?? []) if (!reach.has(imp)) { reach.add(imp); grew = true; } }
  const suites = Object.entries(pkg.scripts).filter(([n, cmd]) => /^(test|red):/.test(n) && n !== "red:all" && [...reach].some((f) => cmd.includes(rel(f)))).map(([n]) => n);
  console.log(`${c}: ${suites.length} — ${suites.join(" ")}`);
  for (const s of suites) { if (!all.has(s)) all.set(s, new Set()); all.get(s).add(c); }
}
console.log(`\nUNION ${all.size}:`);
console.log([...all.keys()].sort().join("\n"));
