// R5-L · the second hop: anchors files that name a touched file, the scripts that import those anchors, their npm names,
// and whether each script drives a browser or a server (never run those here).
const fs = require("fs"), cp = require("child_process");
const touched = [
  ...cp.execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\r?\n/),
  ...cp.execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).trim().split(/\r?\n/),
].filter((f) => f.startsWith("src/"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const all = cp.execSync("git ls-files scripts", { encoding: "utf8" }).trim().split(/\r?\n/);
const anchors = all.filter((f) => /\.anchors\.mjs$/.test(f)).filter((f) => {
  const s = fs.readFileSync(f, "utf8");
  return touched.some((t) => s.includes(t) || s.includes(t.replace(/^src\//, "")));
});
const out = new Map();
for (const f of all.filter((x) => /\.(mjs|mts|ts|js)$/.test(x) && !/\.anchors\.mjs$/.test(x))) {
  const s = fs.readFileSync(f, "utf8");
  const hit = anchors.filter((a) => s.includes(a.replace(/^scripts\//, "")) || s.includes(a.split("/").pop()));
  if (!hit.length) continue;
  const base = f.replace(/^scripts\//, "");
  const names = Object.entries(pkg).filter(([k, v]) => /^(test|red):/.test(k) && v.split(/\s+/).some((w) => w.endsWith(base))).map(([k]) => k);
  const browser = /chromium|playwright|localhost|\bBASE\b/.test(s);
  out.set(f, `${names.join(" ") || "—"} ${browser ? "BROWSER/SERVER" : "static"} <- ${hit.map((a) => a.split("/").pop()).join(", ")}`);
}
console.log("anchors naming a touched file:", anchors.map((a) => a.split("/").pop()).join(", "));
for (const [f, v] of out) console.log(`${f}: ${v}`);
