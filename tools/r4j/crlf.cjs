// Normalise the given files to CRLF (the worktree's convention under core.autocrlf=true). Reports what changed.
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, "utf8");
  const lf = s.replace(/\r\n/g, "\n");
  const out = lf.replace(/\n/g, "\r\n");
  if (out !== s) { fs.writeFileSync(f, out); console.log("CRLF  " + f); } else console.log("ok    " + f);
}
