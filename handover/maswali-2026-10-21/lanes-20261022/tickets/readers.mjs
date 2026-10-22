// readers.mjs (lane TICKETS): every script that reads a changed path, and the package.json entries that run each.
// node readers.mjs <worktree> <pattern>...   (patterns are fixed strings, matched with git grep -l -F in scripts/)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [root, ...patterns] = process.argv.slice(2);
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const files = new Set();
for (const p of patterns) {
  let out = "";
  try { out = execFileSync("git", ["grep", "-l", "-F", p, "--", "scripts/"], { cwd: root, encoding: "utf8" }); } catch { out = ""; }
  for (const f of out.split(/\r?\n/).filter(Boolean)) files.add(f);
}
// A script reached through a lib or an anchor file: who imports it.
const viaImport = (f) => {
  const base = f.replace(/^scripts\//, "").replace(/\.(m?ts|mjs|js)$/, "");
  let out = "";
  try { out = execFileSync("git", ["grep", "-l", "-F", base.split("/").pop(), "--", "scripts/"], { cwd: root, encoding: "utf8" }); } catch { out = ""; }
  return out.split(/\r?\n/).filter(Boolean).filter((x) => x !== f);
};
const rows = [];
for (const f of [...files].sort()) {
  const entries = Object.entries(pkg.scripts).filter(([, cmd]) => cmd.includes(f) || cmd.includes(f.replace(/^scripts\//, "scripts/"))).map(([k]) => k);
  rows.push({ file: f, entries, via: entries.length ? [] : viaImport(f) });
}
for (const r of rows) console.log(`${r.file}\t${r.entries.join(" ") || "-"}${r.via.length ? `\tvia: ${r.via.join(" ")}` : ""}`);
