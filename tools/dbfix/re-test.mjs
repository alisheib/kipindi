// Build dirRe exactly as db-scratch.mts does for a data directory, then ask PowerShell's -match about sample lines.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const norm = (p) => resolve(p).replace(/\\/g, "/").toLowerCase();
const ps = (s) => s.replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&");
const dir = norm("F:\\kipindi-wp12\\.pgscratch").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dirRe = ps(`\\s-d\\s+(\\x22${dir}\\x22|${dir})(\\s|$)`);
const bin = '"f:/kipindi-a8j/node_modules/@embedded-postgres/windows-x64/native/bin/postgres.exe"';
const cases = [
  [`${bin} -d f:/kipindi-wp12/.pgscratch -p 5471 -c listen_addresses=127.0.0.1`, true],
  [`${bin} -d f:/kipindi-wp12/.pgscratch`, true],
  [`${bin} -d "f:/kipindi-wp12/.pgscratch" -p 5471`, true],
  [`${bin} -d f:/kipindi-wp12/.pgscratch/sub -p 5471`, false],
  [`${bin} -d "f:/kipindi-wp12/.pgscratch - copy" -p 5471`, false],
  [`${bin} -d f:/kipindi-wp12b/.pgscratch -p 5481`, false],
  [`${bin} -d f:/kipindi-wp12/.pgscratch2 -p 5471`, false],
  [`"f:/kipindi-wp12/x/postgres.exe" -c data_directory=f:/kipindi-wp12/.pgscratch`, false],
];
const script = cases.map(([c], i) => `'${i} ' + ('${ps(c)}' -match '${dirRe}')`).join("; ");
const out = execFileSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim().split(/\r?\n/);
let bad = 0;
for (const [i, line] of out.entries()) {
  const got = line.endsWith("True");
  const ok = got === cases[i][1];
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} expected ${cases[i][1] ? "match   " : "no match"} · ${cases[i][0].slice(bin.length + 1)}`);
}
console.log(`regex as PowerShell received it: ${dirRe}\n${bad ? bad + " WRONG" : "all " + cases.length + " as expected"}`);
