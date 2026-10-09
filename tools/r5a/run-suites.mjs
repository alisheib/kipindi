// Run each suite with `npm run -s <name>` from the worktree, ONE AT A TIME, recording exit code, seconds and the output's
// tail. node run-suites.mjs <log> name1 name2 …
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
const [log, ...names] = process.argv.slice(2);
writeFileSync(log, `# suites run ${new Date().toISOString()} in F:/kipindi-r5a\n`);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
for (const name of names) {
  const t0 = Date.now();
  const r = spawnSync(npm, ["run", "-s", name], { cwd: "F:/kipindi-r5a", encoding: "utf8", shell: true, timeout: 600_000, maxBuffer: 256 << 20 });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const fails = out.split(/\r?\n/).filter((l) => /\bFAIL\b|✗|not ok|Error:|ERR!/.test(l)).slice(0, 12);
  const tail = out.trim().split(/\r?\n/).slice(-4).join(" ⏎ ");
  appendFileSync(log, `\n=== ${name} · exit ${r.status ?? (r.signal ? `signal ${r.signal}` : "?")} · ${secs}s\n${fails.length ? fails.join("\n") + "\n" : ""}… ${tail.slice(0, 900)}\n`);
  console.log(`${name}: exit ${r.status} (${secs}s)`);
}
appendFileSync(log, "\n# done\n");
