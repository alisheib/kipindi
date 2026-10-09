// For each package test: script, which touched files its script names — to prune the suite list.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const ROOT = process.cwd();
const touched = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).split("\n").map((l) => l.slice(3).trim()).filter((f) => f.startsWith("src/"));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GENERIC = new Set(["page", "loading", "globals", "error", "layout", "route", "index", "actions"]);
const pat = touched.map((f) => {
  const noExt = f.replace(/^src\//, "").replace(/\.(tsx|ts|css|mts)$/, "");
  const parts = noExt.split("/"); const base = parts.at(-1);
  const res = [new RegExp(esc(noExt).replace(/\\\[/g, "\\\\?\\[").replace(/\\\]/g, "\\\\?\\]"))];
  if (!GENERIC.has(base)) res.push(new RegExp(`(?<![\\w-])${esc(base)}(?:\\.(?:tsx|ts|css))?(?![\\w-])`));
  if (parts.length >= 2) res.push(new RegExp(`["'\`]${esc(parts.at(-2))}["'\`]\\s*,\\s*["'\`]${esc(base)}`));
  if (f.endsWith("globals.css")) res.push(/globals\.css/);
  return { f, res };
});
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const out = [];
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^test:/.test(name)) continue;
  const m = /scripts\/[\w./-]+\.(?:mts|mjs|ts|cjs|js)/.exec(cmd);
  if (!m) continue;
  let s = ""; try { s = readFileSync(join(ROOT, m[0]), "utf8"); } catch { continue; }
  const why = pat.filter(({ res }) => res.some((re) => re.test(s))).map(({ f }) => f.replace(/^src\//, ""));
  if (why.length) out.push(`${name}\t${why.join(", ")}`);
}
console.log(out.join("\n"));
