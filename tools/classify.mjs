// Classify npm test scripts exactly as scripts/test-all.mjs does (db / port / pure). Run from the worktree root:
//   node classify.mjs test:a test:b ...
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const HAZARD = /\.listen\(|createServer\(|(?:localhost|127\.0\.0\.1):\d{4}|writeFileSync\(\s*[`'"][^`'"]*(?:tmp|temp|scratch|\.50pick)/i;
const src = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const out = { pure: [], db: [], port: [] };
for (const k of process.argv.slice(2)) {
  const cmd = pkg.scripts[k] ?? "";
  const targets = [...cmd.matchAll(/scripts\/[\w/.-]+\.(?:mts|mjs|cjs|ts)/g)].map((m) => m[0]);
  const cls = targets.some((f) => f.includes("db-scratch")) ? "db" : targets.some((f) => HAZARD.test(src(f))) ? "port" : "pure";
  out[cls].push(k);
}
for (const [c, ks] of Object.entries(out)) console.log(`${c.toUpperCase()} (${ks.length}): ${ks.join(" ")}`);
