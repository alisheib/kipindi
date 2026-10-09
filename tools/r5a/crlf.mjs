// Normalise a file to CRLF (the repo is autocrlf): every lone LF becomes CRLF; existing CRLF untouched.
import { readFileSync, writeFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const s = readFileSync(f, "utf8");
  const out = s.replace(/\r?\n/g, "\r\n");
  if (out !== s) { writeFileSync(f, out); console.log(`CRLF: ${f}`); } else console.log(`ok:   ${f}`);
}
