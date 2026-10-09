// Which package.json test/red scripts read the files R3-C touched? node suite-map.mjs (cwd = worktree root)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const changed = execSync("git status --porcelain", { cwd: ROOT }).toString().split("\n").filter(Boolean).map((l) => l.slice(3).trim())
  .filter((p) => p.startsWith("src/") || p.startsWith("scripts/"));
// spellings: the path, the path without extension, and the last two segments without extension
const pats = [];
for (const p of changed) {
  const noExt = p.replace(/\.(tsx?|mts|mjs|css)$/, "");
  const segs = noExt.split("/");
  const tail2 = segs.slice(-2).join("/");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  pats.push({ file: p, re: new RegExp(`${esc(noExt)}(?:\\.(?:tsx?|mts|mjs|css))?["'\`]|${esc(p)}|["'\`/]${esc(tail2)}(?:\\.(?:tsx?|css))?["'\`]`) });
}
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const directBy = new Map();
for (const f of files) for (const { file, re } of pats) if (re.test(src.get(f))) { if (!directBy.has(f)) directBy.set(f, new Set()); directBy.get(f).add(file); }
const importersOf = new Map();
for (const f of files) {
  for (const m of src.get(f).matchAll(/(?:import|from|import\()\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
    const target = resolve(dirname(f), m[1]);
    for (const cand of [target, target + ".mts", target + ".ts", target + ".mjs"]) {
      if (src.has(cand)) { if (!importersOf.has(cand)) importersOf.set(cand, new Set()); importersOf.get(cand).add(f); }
    }
  }
}
const reach = new Set(directBy.keys());
let grew = true;
while (grew) { grew = false; for (const f of [...reach]) for (const imp of importersOf.get(f) ?? []) if (!reach.has(imp)) { reach.add(imp); grew = true; } }
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rel = (f) => relative(ROOT, f).split("\\").join("/");
const runners = (f) => Object.entries(pkg.scripts).filter(([, cmd]) => cmd.includes(rel(f))).map(([k]) => k);
const byScript = new Map();
for (const f of reach) for (const s of runners(f)) { if (!byScript.has(s)) byScript.set(s, new Set()); for (const c of directBy.get(f) ?? ["(via import)"]) byScript.get(s).add(c); }
const keys = [...byScript.keys()].sort();
for (const k of keys) console.log(`${k.padEnd(44)} ${[...byScript.get(k)].join(", ")}`);
console.log(`\nTEST (${keys.filter((k) => k.startsWith("test:")).length}): ${keys.filter((k) => k.startsWith("test:")).join(" ")}`);
console.log(`\nRED (${keys.filter((k) => k.startsWith("red:")).length}): ${keys.filter((k) => k.startsWith("red:")).join(" ")}`);
console.log(`\nOTHER: ${keys.filter((k) => !k.startsWith("test:") && !k.startsWith("red:")).join(" ")}`);
