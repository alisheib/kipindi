// R6-A · run suites STRICTLY ONE AT A TIME from F:\kipindi-r6a (`npm run -s <name>`), logging name, exit code and seconds
// to S\r6a\suites-<tag>.tsv and each red's tail to S\r6a\suites-<tag>-reds.txt. Usage: node run-suites.cjs <tag> <name...>
// or node run-suites.cjs <tag> --list <file of names, one per line or tab-separated first column>.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const S = path.dirname(__filename);
const ROOT = "F:/kipindi-r6a";
const [tag, ...rest] = process.argv.slice(2);
let names = rest;
if (rest[0] === "--list") names = fs.readFileSync(rest[1], "utf8").split(/\r?\n/).map((l) => l.split("\t")[0].trim()).filter((n) => /^(test|red):/.test(n));
const seen = new Set();
names = names.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
const TSV = path.join(S, `suites-${tag}.tsv`), REDS = path.join(S, `suites-${tag}-reds.txt`);
fs.writeFileSync(TSV, `# R6-A suites (${tag}) · ${new Date().toISOString()} · ${names.length} suites\n`);
fs.writeFileSync(REDS, "");
let i = 0;
for (const name of names) {
  i++;
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", name], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 900_000, maxBuffer: 256 * 1024 * 1024 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const code = r.status === null ? `signal:${r.signal ?? "timeout"}` : String(r.status);
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const summary = (out.match(/^.*\b(\d+) passed[^\n]*$/m)?.[0] ?? out.trim().split("\n").filter(Boolean).slice(-1)[0] ?? "").trim().slice(0, 200);
  fs.appendFileSync(TSV, `${name}\t${code}\t${secs}s\t${summary}\n`);
  if (code !== "0") fs.appendFileSync(REDS, `===== ${name} (exit ${code}, ${secs}s)\n${out.trim().split("\n").slice(-40).join("\n")}\n\n`);
  console.log(`[${i}/${names.length}] ${name} exit=${code} ${secs}s`);
}
console.log("done");
