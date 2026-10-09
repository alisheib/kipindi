// Which suites read the files this change touched? Run from the worktree root: node <this file>
// 1. find every file under scripts/ that names a changed file (several spellings of each path);
// 2. follow imports upward: a helper/anchors file counts for every script that imports it (transitively);
// 3. map the resulting script files to the package.json scripts that run them.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const ROOT = process.cwd();
const PATTERNS = [
  /ticket-card/, /position-card/, /resolution-panel/,
  /responsible-gambling[/"'`,\s]*(?:page|["'`])/, /responsible-gambling\/page/,
  /watchlist\/page/, /["'`]watchlist["'`]\s*,\s*["'`]page/,
  /wallet\/deposit\/page/, /["'`]deposit["'`]\s*,\s*["'`]page/,
  /profile\/sessions\/page/, /["'`]sessions["'`]\s*,\s*["'`]page/,
  /positions\/performance\/page/, /["'`]performance["'`]\s*,\s*["'`]page/,
  /positions\/page/, /["'`]positions["'`]\s*,\s*["'`]page/,
  /markets\/\[id\]\/page/, /markets\/\\\[id\\\]/, /["'`]\[id\]["'`]\s*,\s*["'`]page/,
];
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const direct = new Set(files.filter((f) => PATTERNS.some((re) => re.test(src.get(f)))));

// importers: who imports whom (relative specifiers only)
const importersOf = new Map();
for (const f of files) {
  for (const m of src.get(f).matchAll(/(?:import|from|import\()\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
    const target = resolve(dirname(f), m[1]);
    for (const cand of [target, target + ".mts", target + ".ts", target + ".mjs"]) {
      if (src.has(cand)) { if (!importersOf.has(cand)) importersOf.set(cand, new Set()); importersOf.get(cand).add(f); }
    }
  }
}
const reach = new Set(direct);
let grew = true;
while (grew) { grew = false; for (const f of [...reach]) for (const imp of importersOf.get(f) ?? []) if (!reach.has(imp)) { reach.add(imp); grew = true; } }

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rel = (f) => relative(ROOT, f).split("\\").join("/");
const runners = (f) => Object.entries(pkg.scripts).filter(([, cmd]) => cmd.includes(rel(f))).map(([k]) => k);
const rows = [...reach].sort().map((f) => ({ file: rel(f), direct: direct.has(f), scripts: runners(f) }));
for (const r of rows) console.log(`${r.direct ? "D" : "i"} ${r.file}  ->  ${r.scripts.join(", ") || "(no package.json script)"}`);
const test = [...new Set(rows.flatMap((r) => r.scripts))].filter((k) => k.startsWith("test:")).sort();
console.log(`\nTEST SCRIPTS (${test.length}): ${test.join(" ")}`);
const other = [...new Set(rows.flatMap((r) => r.scripts))].filter((k) => !k.startsWith("test:")).sort();
console.log(`\nOTHER SCRIPTS (${other.length}): ${other.join(" ")}`);
