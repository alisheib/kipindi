// Which package.json suites read the files this worktree changed? Run from F:\kipindi-r5j: node <this file>
// 1. every file under scripts/ naming a changed file (its path in several spellings);
// 2. a helper/anchors file counts for every script importing it (transitively);
// 3. those script files mapped to the package.json scripts that run them.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "F:/kipindi-r5j";
const changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only"], { encoding: "utf8" }).split("\n").filter((f) => f.startsWith("src/"));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patternsFor = (f) => {
  const noSrc = f.replace(/^src\//, "").replace(/\.(tsx?|css)$/, "");
  const parts = noSrc.split("/");
  const out = [new RegExp(esc(noSrc).replace(/\\\[/g, "\\\\?\\[").replace(/\\\]/g, "\\\\?\\]"))];
  // join("…", "dir", "page.tsx") spellings: the last two segments as separate string literals
  if (parts.length >= 2) out.push(new RegExp(`["'\`]${esc(parts[parts.length - 2])}["'\`]\\s*,\\s*["'\`]${esc(parts[parts.length - 1])}`));
  // a unique basename (not page/layout/loading/actions/route/index) also counts
  const base = basename(noSrc);
  if (!/^(page|layout|loading|actions|route|index|_components|utils|globals)$/.test(base)) out.push(new RegExp(`[/"'\`]${esc(base)}(?:\\.tsx?)?["'\`]`));
  if (base === "globals") out.push(/globals\.css/);
  if (base === "utils") out.push(/lib\/utils/);
  return out;
};
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const reasons = new Map();
for (const f of files) {
  for (const c of changed) if (patternsFor(c).some((re) => re.test(src.get(f)))) { if (!reasons.has(f)) reasons.set(f, new Set()); reasons.get(f).add(c); }
}
const importersOf = new Map();
for (const f of files) {
  for (const m of src.get(f).matchAll(/(?:import|from|import\()\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
    const target = resolve(dirname(f), m[1]);
    for (const cand of [target, target + ".mts", target + ".ts", target + ".mjs"]) {
      if (src.has(cand)) { if (!importersOf.has(cand)) importersOf.set(cand, new Set()); importersOf.get(cand).add(f); }
    }
  }
}
const reach = new Set(reasons.keys());
let grew = true;
while (grew) { grew = false; for (const f of [...reach]) for (const imp of importersOf.get(f) ?? []) if (!reach.has(imp)) { reach.add(imp); grew = true; } }
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rel = (f) => relative(ROOT, f).split("\\").join("/");
const suites = new Set();
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^(test|red):/.test(name)) continue;
  for (const f of reach) if (cmd.includes(rel(f))) suites.add(name);
}
console.log(`${changed.length} changed src files; ${reach.size} script files reach them; ${suites.size} test/red suites:`);
for (const s of [...suites].sort()) console.log(s);
