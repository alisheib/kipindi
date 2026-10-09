// Runs npm scripts one at a time from F:/kipindi-r3c and records each exit code and output tail.
// node run-suites.cjs <listfile> <outdir>      (listfile: one script name per line; "!cmd ..." runs a raw command)
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const [, , listFile, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const names = fs.readFileSync(listFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
const summary = path.join(outDir, "summary.tsv");
fs.writeFileSync(summary, "");
for (const name of names) {
  const t0 = Date.now();
  const raw = name.startsWith("!");
  const cmd = raw ? name.slice(1) : `npm run -s ${name}`;
  const env = { ...process.env };
  if (raw && /MEMORY=1/.test(cmd)) Object.assign(env, { DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" });
  const r = spawnSync(cmd.replace("MEMORY=1 ", ""), { cwd: "F:/kipindi-r3c", shell: true, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 15 * 60_000, env });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const safe = name.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
  fs.writeFileSync(path.join(outDir, `${safe}.log`), out);
  const code = r.status === null ? `KILLED(${r.signal ?? "timeout"})` : String(r.status);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  fs.appendFileSync(summary, `${name}\t${code}\t${secs}s\n`);
  console.log(`${code === "0" ? "ok  " : "FAIL"} ${name} (${code}, ${secs}s)`);
}
console.log("DONE");
