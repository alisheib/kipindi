// Remove a backslash before a backtick inside R4-I comment blocks of the given files (the Edit tool kept them literally).
const fs = require("fs");
process.chdir("F:/kipindi-r4i");
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, "utf8");
  const out = s.replace(/\\`/g, "`");
  const n = (s.match(/\\`/g) || []).length;
  if (n) fs.writeFileSync(f, out);
  console.log(f, "removed", n);
}
