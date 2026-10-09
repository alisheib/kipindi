// Which package.json test:* scripts read a touched file: grep scripts/ (recursively) for each touched path (and its
// import-specifier forms), then map each hit script file to the test:* entries that run it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
process.chdir("F:/kipindi-r5a");
const touched = execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\r?\n/).filter((f) => f.startsWith("src/"));
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f).split("\\").join("/");
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(m?[jt]s|mts|cjs)$/.test(f)) files.push(p);
  }
};
walk("scripts");
const keysFor = (f) => {
  const noExt = f.replace(/\.(tsx?|css)$/, "");
  const ks = [f, noExt.replace(/^src\//, "@/"), noExt];
  if (f.endsWith("globals.css")) ks.push("globals.css");
  return ks;
};
const hits = new Map();
for (const s of files) {
  const src = readFileSync(s, "utf8");
  for (const t of touched) if (keysFor(t).some((k) => src.includes(k))) { if (!hits.has(s)) hits.set(s, new Set()); hits.get(s).add(t); }
}
const pkg = JSON.parse(readFileSync("package.json", "utf8")).scripts;
const tests = new Map();
for (const [name, cmd] of Object.entries(pkg)) {
  if (!name.startsWith("test:")) continue;
  for (const s of hits.keys()) if (cmd.split(/\s+/).includes(s)) { if (!tests.has(name)) tests.set(name, new Set()); for (const t of hits.get(s)) tests.get(name).add(t); }
}
const registered = new Set(Object.values(pkg).flatMap((c) => c.split(/\s+/)));
const helperHits = [...hits.keys()].filter((s) => !registered.has(s));
console.log("TESTS (" + tests.size + "):", [...tests.keys()].sort().join(" "));
console.log("\nHELPERS / UNREGISTERED reading touched paths:", helperHits.join(" "));
