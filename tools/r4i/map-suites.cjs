// Which package.json test scripts read a file this change touches (by its path, with or without src/, or by an import of it).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
process.chdir("F:/kipindi-r4i");
const changed = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" }).split("\n").filter(Boolean)
  .concat(execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\n").filter(Boolean))
  .filter((f) => f.startsWith("src/"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const scripts = Object.entries(pkg.scripts).filter(([k]) => /^(test|red):/.test(k));
const fileOf = (cmd) => (cmd.match(/scripts\/[\w./-]+\.(mts|mjs|ts|js|cjs)/g) || []);
const memo = new Map();
const readDeep = (f, seen = new Set()) => {
  if (seen.has(f) || !fs.existsSync(f)) return "";
  seen.add(f);
  let s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    const p = path.normalize(path.join(path.dirname(f), m[1])).replace(/\\/g, "/");
    if (p.startsWith("scripts/")) s += "\n" + readDeep(p, seen);
  }
  return s;
};
const hits = {};
for (const [name, cmd] of scripts) {
  const files = fileOf(cmd);
  let text = "";
  for (const f of files) text += readDeep(f);
  if (!text) continue;
  const touched = changed.filter((c) => {
    const noSrc = c.replace(/^src\//, "");
    const noExt = noSrc.replace(/\.(tsx?|mts)$/, "");
    return text.includes(c) || text.includes(noSrc) || text.includes(`/${noExt}"`) || text.includes(`/${noExt}.ts`) || text.includes(`/${noExt}.tsx`) || text.includes(`@/${noExt}`);
  });
  if (touched.length) hits[name] = touched;
}
for (const [k, v] of Object.entries(hits).sort()) console.log(k, "←", v.join(", "));
console.log("\nTOTAL", Object.keys(hits).length);
