// Run npm test scripts ONE AT A TIME (light, in-memory suites only), recording each exit code and last output line.
// Usage (from the worktree root): node run-suites.mjs <outDir> <script...>
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, ...keys] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const summary = join(outDir, "summary.txt");
writeFileSync(summary, `started ${new Date().toISOString()} · ${keys.length} suites\n`);
for (const k of keys) {
  const t0 = Date.now();
  const r = spawnSync(`npm run -s ${k}`, { shell: true, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  writeFileSync(join(outDir, `${k.replace(/[:/]/g, "_")}.log`), out);
  const last = out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("(node:") && !l.startsWith("(Use `node")).pop() ?? "";
  const code = r.status ?? (r.signal ? `signal ${r.signal}` : "?");
  appendFileSync(summary, `${code === 0 ? "OK  " : "RED "} exit=${code}  ${k}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  ::  ${last.slice(0, 220)}\n`);
}
appendFileSync(summary, `finished ${new Date().toISOString()}\n`);
