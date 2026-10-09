// Exact, counted string replacements in a CRLF file; refuses if a "from" is not found exactly `n` times.
const fs = require("fs");
const [file, specFile] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
let s = fs.readFileSync(file, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
for (const { from, to, n = 1 } of spec) {
  const count = s.split(from).length - 1;
  if (count !== n) { console.error(`REFUSED: ${JSON.stringify(from).slice(0, 120)} found ${count}×, expected ${n}`); process.exit(1); }
  s = s.split(from).join(to);
}
if (crlf) s = s.replace(/\n/g, "\r\n");
fs.writeFileSync(file, s);
console.log(`ok ${file}: ${spec.length} replacement(s)`);
