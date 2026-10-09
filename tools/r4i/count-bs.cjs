// Count backslash-backtick pairs in the working file and in HEAD, per changed file.
const fs = require("fs");
const { execFileSync } = require("child_process");
process.chdir("F:/kipindi-r4i");
const files = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" }).split("\n").filter(Boolean);
const extra = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\n").filter(Boolean);
const pair = "\\" + "`";
for (const f of [...files, ...extra]) {
  const now = fs.readFileSync(f, "utf8").split(pair).length - 1;
  let head = 0;
  try { head = execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 64e6 }).split(pair).length - 1; } catch { head = -1; }
  if (now !== head) console.log(f, "head", head, "now", now);
}
