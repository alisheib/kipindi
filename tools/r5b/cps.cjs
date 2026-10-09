// Prints chosen lines of a file with every non-ASCII character as U+XXXX.
const [, , file, ...lines] = process.argv;
const s = require("fs").readFileSync(file, "utf8").split(/\r?\n/);
for (const n of lines.map(Number)) {
  const out = [...s[n - 1]].map((c) => (c.codePointAt(0) < 0x7f && c.codePointAt(0) >= 0x20 ? c : `<U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}>`)).join("");
  console.log(n, out);
}
