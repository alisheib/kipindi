// Derive every npm script that reads a changed path: node readers.mjs <tree> <base> <out>
// For each file changed base..HEAD, every scripts/ file that names it (its repo path, or for a src/ file its import alias
// or bare file name where unique), then every package.json script that runs one of those files (or the file itself).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const [tree, base, out] = process.argv.slice(2);
const git = (...a) => execFileSync("git", a, { cwd: tree, encoding: "utf8", maxBuffer: 64 << 20 });
const SKIP = (process.env.SKIP || "").split(",").filter(Boolean);
const changed = git("diff", "--name-only", `${base}..HEAD`).split(/\r?\n/).filter(Boolean).filter((f) => !SKIP.includes(f));
const pkg = JSON.parse(readFileSync(`${tree}/package.json`, "utf8")).scripts;
const scriptFiles = new Set();
for (const f of changed) {
  const needles = [f];
  if (f.startsWith("src/")) needles.push(`@/${f.slice(4).replace(/\.(tsx?|css)$/, "")}`);
  if (f.startsWith("scripts/")) scriptFiles.add(f);
  for (const n of needles) {
    let hits = "";
    try { hits = git("grep", "-l", "-F", n, "--", "scripts/"); } catch { hits = ""; }
    for (const h of hits.split(/\r?\n/).filter(Boolean)) scriptFiles.add(h);
  }
}
const names = new Set();
for (const [name, cmd] of Object.entries(pkg)) {
  for (const sf of scriptFiles) if (cmd.includes(sf)) names.add(name);
}
// A harness that imports a reader (a red twin's runner, an anchors file) reaches its suite through package.json too.
const list = [...names].sort();
writeFileSync(out, list.join("\n") + "\n");
console.log(`changed ${changed.length} files; ${scriptFiles.size} scripts/ files read them; ${list.length} npm scripts`);
console.log(changed.join(" "));
