// Run npm scripts one at a time from the worktree; record each exit code and the tail of its output.
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const root = "F:/kipindi-r4k";
const pkg = JSON.parse(fs.readFileSync(`${root}/package.json`, "utf8")).scripts;
const outDir = process.argv[2];
const names = process.argv.slice(3);
const results = [];
for (const name of names) {
  if (!pkg[name]) { results.push(`${name}: NO SUCH SCRIPT`); console.log(`${name}: NO SUCH SCRIPT`); continue; }
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", name], { cwd: root, encoding: "utf8", shell: true, timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  fs.writeFileSync(`${outDir}/suite-${name.replace(/[:/]/g, "_")}.txt`, out);
  const tail = out.trim().split("\n").filter((l) => l.trim()).slice(-2).map((l) => l.trim().slice(0, 160)).join(" | ");
  const line = `${name}: exit ${r.status}${r.error ? ` (${r.error.message})` : ""} · ${((Date.now() - t0) / 1000).toFixed(0)}s · ${tail}`;
  results.push(line);
  console.log(line);
}
fs.appendFileSync(`${outDir}/suites.txt`, results.join("\n") + "\n");
