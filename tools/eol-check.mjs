// Usage: node eol-check.mjs <repoRoot> <file...> — prints, per file, total lines and how many end in LF without CR.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const [root, ...files] = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  const s = readFileSync(join(root, f), "utf8");
  const lf = (s.match(/\n/g) ?? []).length;
  const crlf = (s.match(/\r\n/g) ?? []).length;
  const bareLf = lf - crlf;
  if (bareLf > 0) bad++;
  console.log(`${bareLf === 0 ? "CRLF ok " : "MIXED!! "} ${f}  lines=${lf} bareLF=${bareLf}`);
}
process.exit(bad ? 1 : 0);
