// replace.mjs <file> <jsonSpecFile> — exact-string replacements, each with an expected count; refuses on any mismatch.
// spec: [{ "from": "...", "to": "...", "count": N }]  (count = the exact number of occurrences that must exist)
// Line endings: the working tree is CRLF (core.autocrlf=true); a spec is written with "\n" and converted to the file's own.
import { readFileSync, writeFileSync } from "node:fs";
const [file, specFile] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specFile, "utf8"));
let text = readFileSync(file, "utf8");
const crlf = text.includes("\r\n");
const eol = (s) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s);
for (const { from: f0, to: t0, count } of spec) {
  const from = eol(f0), to = eol(t0);
  const n = text.split(from).length - 1;
  if (n !== count) { console.error(`${file}: expected ${count} of ${JSON.stringify(f0).slice(0, 120)}, found ${n}`); process.exit(2); }
  text = text.split(from).join(to);
}
writeFileSync(file, text, "utf8");
console.log(`${file}: ${spec.length} replacement(s) applied (${crlf ? "CRLF" : "LF"})`);
