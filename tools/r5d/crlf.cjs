// Normalize the given files to CRLF (the repo is autocrlf); report each file's line count.
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, "utf8");
  const t = s.replace(/\r?\n/g, "\r\n");
  if (t !== s) fs.writeFileSync(f, t);
  console.log(`${t === s ? "kept " : "FIXED"} ${f} (${t.split("\r\n").length - 1} lines)`);
}
