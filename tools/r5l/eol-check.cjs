// R5-L · every changed or new file: CRLF throughout (no bare LF), as the worktree's autocrlf checkout writes them.
const { execSync } = require("child_process");
const fs = require("fs");
const root = "F:/kipindi-r5l/";
const files = execSync("git -C F:/kipindi-r5l status --porcelain", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean)
  .filter((l) => !l.startsWith(" D")).map((l) => l.slice(3).replace(/^"|"$/g, ""));
for (const f of files) {
  const b = fs.readFileSync(root + f);
  let lf = 0, crlf = 0;
  for (let i = 0; i < b.length; i++) if (b[i] === 10) { if (i > 0 && b[i - 1] === 13) crlf++; else lf++; }
  console.log(`${lf ? "MIXED" : "ok   "} ${f} crlf=${crlf} lf=${lf}`);
}
