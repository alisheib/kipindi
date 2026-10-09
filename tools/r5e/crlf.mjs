// Normalise each file to CRLF (the repo is autocrlf) and report: node crlf.mjs <file>...
import { readFileSync, writeFileSync } from "node:fs";
for (const p of process.argv.slice(2)) {
  const s = readFileSync(p, "utf8");
  const t = s.replace(/\r?\n/g, "\r\n");
  const lf = (s.match(/(?<!\r)\n/g) ?? []).length;
  if (t !== s) writeFileSync(p, t, "utf8");
  console.log(`${p}: ${lf ? `fixed ${lf} bare LF` : "CRLF ok"}`);
}
