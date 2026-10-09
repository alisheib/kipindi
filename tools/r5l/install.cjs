// R5-L · copy staged files (S/r5l/stage/<repo path>) into the worktree with CRLF endings.
// Usage: node install.cjs <repo path> [<repo path> ...]
const fs = require("fs");
const path = require("path");
const { put } = require("./lib.cjs");
const STAGE = path.join(__dirname, "stage");
for (const p of process.argv.slice(2)) {
  const src = path.join(STAGE, p);
  if (!fs.existsSync(src)) throw new Error(`no staged file ${src}`);
  put(p, fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n"));
}
