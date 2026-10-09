// Runs npm scripts ONE AT A TIME from F:/kipindi-r6b, recording each exit code, its time and its last lines; each full
// output is kept in out/<name>.txt beside this file.   node run-suites.mjs <summary.log> <names-file>
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "F:/kipindi-r6b";
const HERE = dirname(fileURLToPath(import.meta.url));
const [OUT, NAMES] = process.argv.slice(2);
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
const list = readFileSync(NAMES, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
mkdirSync(join(HERE, "out"), { recursive: true });
writeFileSync(OUT, `# ${list.length} suites, started ${new Date().toISOString()}\n`);
for (const k of list) {
  if (!pkg.scripts[k]) { appendFileSync(OUT, `${k}\tMISSING\n`); continue; }
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", k], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
  const all = (String(r.stdout ?? "") + String(r.stderr ?? "")).trim();
  writeFileSync(join(HERE, "out", `${k.replace(/[:/]/g, "_")}.txt`), all);
  const tail = all.split("\n").slice(-3).join(" ⏎ ").slice(0, 400);
  appendFileSync(OUT, `${k}\texit ${r.status}${r.signal ? ` (${r.signal})` : ""}\t${((Date.now() - t0) / 1000).toFixed(0)}s\t${tail}\n`);
}
appendFileSync(OUT, `# done ${new Date().toISOString()}\n`);
