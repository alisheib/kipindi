const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = "F:/kipindi-r5i";
const changed = cp.execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean).filter((f) => f.startsWith("src/") || f.startsWith("scripts/"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const scripts = Object.entries(pkg.scripts);
const files = fs.readdirSync(path.join(ROOT, "scripts")).filter((n) => /\.(mts|mjs|ts|js|cjs)$/.test(n));
const libFiles = fs.existsSync(path.join(ROOT, "scripts/lib")) ? fs.readdirSync(path.join(ROOT, "scripts/lib")).map((n) => "lib/" + n) : [];
const hitBy = new Map();
for (const f of [...files, ...libFiles]) {
  let txt; try { txt = fs.readFileSync(path.join(ROOT, "scripts", f), "utf8"); } catch { continue; }
  for (const c of changed) {
    const needles = [c, c.replace(/^src\//, ""), c.replace(/^src\//, "@/").replace(/\.(tsx?|css)$/, "")];
    if (needles.some((n) => txt.includes(n))) { if (!hitBy.has(f)) hitBy.set(f, new Set()); hitBy.get(f).add(c); }
  }
}
const names = new Set();
for (const [f, set] of hitBy) {
  for (const [name, cmd] of scripts) {
    if (!/^(test|red):/.test(name)) continue;
    if (cmd.includes("scripts/" + f)) names.add(name);
  }
}
console.log([...names].filter((n) => n.startsWith("test:")).sort().join("\n"));
console.log("--- red:");
console.log([...names].filter((n) => n.startsWith("red:")).sort().join("\n"));
