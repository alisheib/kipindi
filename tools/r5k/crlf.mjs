// Normalise the given files (relative to F:/kipindi-r5k) to CRLF — every lone LF becomes CRLF; reports what changed.
// Usage: node crlf.mjs <file> [<file> …]   (with --check: report only)
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5k/";
const check = process.argv.includes("--check");
let bad = 0;
for (const f of process.argv.slice(2).filter((a) => a !== "--check")) {
  const p = f.startsWith("F:") ? f : ROOT + f;
  const s = readFileSync(p, "utf8");
  const lone = (s.match(/(?<!\r)\n/g) ?? []).length;
  if (lone === 0) { console.log(`ok    ${f}`); continue; }
  bad++;
  if (check) { console.log(`LF    ${f} (${lone} lone LF)`); continue; }
  writeFileSync(p, s.replace(/\r?\n/g, "\r\n"));
  console.log(`fixed ${f} (${lone} lone LF → CRLF)`);
}
if (check && bad) process.exit(1);
