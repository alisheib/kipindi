// R5-G · run every suite, one at a time, from the worktree; record each exit code and its last summary lines.
// Usage: node run-suites.mjs <out.txt> name1 name2 ...
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

const [out, ...names] = process.argv.slice(2);
writeFileSync(out, `# R5-G suite run — ${new Date().toISOString()} — F:\\kipindi-r5g\n`);
for (const name of names) {
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", name], { cwd: "F:/kipindi-r5g", encoding: "utf8", shell: true, timeout: 900_000, maxBuffer: 256 * 1024 * 1024 });
  const all = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const lines = all.split(/\r?\n/).filter((l) => l.trim());
  const fails = lines.filter((l) => /^\s*(FAIL|✗|MISSED|not ok)\b|^\s*FAIL\s/.test(l)).slice(0, 8);
  const tail = lines.slice(-3).map((l) => l.slice(0, 220));
  const code = r.status ?? (r.signal ? `signal ${r.signal}` : "null");
  appendFileSync(out, `\n== ${name} EXIT ${code} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n${fails.map((l) => `   ${l.slice(0, 260)}`).join("\n")}${fails.length ? "\n" : ""}${tail.map((l) => `   … ${l}`).join("\n")}\n`);
  console.log(`${name} EXIT ${code}`);
}
appendFileSync(out, "\n# done\n");
