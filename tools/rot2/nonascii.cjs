// usage: node nonascii.cjs <file> <fromLine> <toLine>
// Prints every non-ASCII code point (with line number) in the given 1-based line range.
const { readFileSync } = require("node:fs");
const [file, from, to] = process.argv.slice(2);
const lines = readFileSync(file, "utf8").split("\n");
const a = Number(from), b = Number(to);
for (let i = a; i <= b; i++) {
  const line = lines[i - 1] ?? "";
  const found = [];
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    if (cp > 126 || (cp < 32 && cp !== 13)) found.push(`U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
  }
  const cr = line.endsWith("\r") ? "CRLF" : "LF";
  console.log(`${String(i).padStart(4)} ${cr}  ${found.length ? found.join(" ") : "(ascii)"}`);
}
