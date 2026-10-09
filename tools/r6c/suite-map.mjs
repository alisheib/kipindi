// Which package.json scripts run a file under scripts/ that reads a file this change touched? Run from the worktree root.
// Spellings matched per touched file: its path from src/ without extension ("app/profile/page", "components/layout/app-shell"),
// its distinctive basename ("app-shell", "avatar-menu" — not "page"/"loading"), and a path.join spelling of its last two
// segments ("profile", "page"). Helpers count for every script that imports them (transitively).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const ROOT = process.cwd();
const touched = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).split("\n").map((l) => l.slice(3).trim()).filter((f) => f.startsWith("src/"));
const GENERIC = new Set(["page", "loading", "globals", "error", "layout", "route", "index", "actions"]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = touched.flatMap((f) => {
  const noExt = f.replace(/^src\//, "").replace(/\.(tsx|ts|css|mts)$/, "");
  const parts = noExt.split("/");
  const base = parts[parts.length - 1];
  const out = [new RegExp(esc(noExt).replace(/\\\[/g, "\\\\?\\[").replace(/\\\]/g, "\\\\?\\]"))];
  if (!GENERIC.has(base)) out.push(new RegExp(`(?<![\\w-])${esc(base)}(?:\\.(?:tsx|ts|css))?(?![\\w-])`));
  if (parts.length >= 2) out.push(new RegExp(`["'\`]${esc(parts[parts.length - 2])}["'\`]\\s*,\\s*["'\`]${esc(base)}`));
  if (f.endsWith("globals.css")) out.push(/globals\.css/);
  return out.map((re) => ({ f, re }));
});
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const direct = new Map();
for (const f of files) for (const { f: t, re } of patterns) if (re.test(src.get(f))) { if (!direct.has(f)) direct.set(f, new Set()); direct.get(f).add(t); }
const importersOf = new Map();
for (const f of files) for (const m of src.get(f).matchAll(/(?:import|from|import\()\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g)) {
  const target = resolve(dirname(f), m[1]);
  for (const cand of [target, target + ".mts", target + ".ts", target + ".mjs"]) if (src.has(cand)) { if (!importersOf.has(cand)) importersOf.set(cand, new Set()); importersOf.get(cand).add(f); }
}
const reach = new Set(direct.keys());
let grew = true;
while (grew) { grew = false; for (const f of [...reach]) for (const imp of importersOf.get(f) ?? []) if (!reach.has(imp)) { reach.add(imp); grew = true; } }
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rel = (f) => relative(ROOT, f).split("\\").join("/");
const names = [];
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^(test|red):/.test(name)) continue;
  const hit = [...reach].find((f) => cmd.includes(rel(f)));
  if (hit) names.push(name);
}
console.log(names.sort().join("\n"));
console.error(`${touched.length} touched src files · ${direct.size} scripts read one directly · ${reach.size} with importers · ${names.length} package scripts`);
