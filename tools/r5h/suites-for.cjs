// R5-H · every suite under scripts/ that reads a touched file (by its path or its src-relative path), with its npm names.
// Run from the worktree:  node <this file>
const fs = require("fs");
const cp = require("child_process");
const touched = [
  ...cp.execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\r?\n/),
  ...cp.execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).trim().split(/\r?\n/),
].filter((f) => f.startsWith("src/"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const files = cp.execSync("git ls-files scripts", { encoding: "utf8" }).trim().split(/\r?\n/).filter((f) => /\.(mts|mjs|ts|js|cjs|cts)$/.test(f));
const out = [];
const names = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const by = touched.filter((t) => s.includes(t) || s.includes(t.replace(/^src\//, "")) || s.includes(t.replace(/^src\//, "@/").replace(/\.tsx?$/, "")));
  if (!by.length) continue;
  const base = f.replace(/^scripts\//, "");
  const n = Object.entries(pkg).filter(([k, v]) => /^(test|red):/.test(k) && v.split(/\s+/).some((w) => w.endsWith(base))).map(([k]) => k);
  n.forEach((x) => names.add(x));
  out.push(`${f} [${n.join(" ") || "—"}] <- ${by.join(", ")}`);
}
console.log(out.join("\n"));
console.log(`\nNPM: ${[...names].sort().join(" ")}`);
