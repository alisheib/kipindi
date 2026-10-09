// The `test:*` entries of package.json's predeploy chain that are PURE by test-all.mjs's own classifier (no db-scratch,
// no socket/localhost/tmp-write hazard), minus the ones already run. Prints them space-separated.
// Usage (from the worktree root): node predeploy-pure.mjs <already-run-summary.txt>
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const already = new Set([...readFileSync(process.argv[2], "utf8").matchAll(/exit=\S+\s+(test:[\w:-]+)/g)].map((m) => m[1]));
const HAZARD = /\.listen\(|createServer\(|(?:localhost|127\.0\.0\.1):\d{4}|writeFileSync\(\s*[`'"][^`'"]*(?:tmp|temp|scratch|\.50pick)/i;
const src = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const chain = [...(pkg.scripts.predeploy ?? "").matchAll(/npm run (test:[\w:-]+)/g)].map((m) => m[1]);
const out = [], skipped = { db: [], port: [], done: [] };
for (const k of [...new Set(chain)]) {
  if (already.has(k)) { skipped.done.push(k); continue; }
  const cmd = pkg.scripts[k] ?? "";
  const targets = [...cmd.matchAll(/scripts\/[\w/.-]+\.(?:mts|mjs|cjs|ts)/g)].map((m) => m[0]);
  if (targets.some((f) => f.includes("db-scratch")) || /db-scratch|db:scratch/.test(cmd)) { skipped.db.push(k); continue; }
  if (targets.some((f) => HAZARD.test(src(f)))) { skipped.port.push(k); continue; }
  out.push(k);
}
console.error(`predeploy test:* = ${new Set(chain).size} · already run ${skipped.done.length} · db ${skipped.db.length} · port ${skipped.port.length} · to run ${out.length}`);
console.error(`db: ${skipped.db.join(" ")}`);
console.error(`port: ${skipped.port.join(" ")}`);
console.log(out.join(" "));
