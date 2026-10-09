// R5-G · line endings: every file the worktree changed or added must be CRLF throughout (the repo is autocrlf).
// `node eol.mjs` reports; `node eol.mjs --fix` rewrites bare LF to CRLF in the files that hold any.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-r5g";
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
const changed = git("diff", "--name-only").split("\n").filter(Boolean);
const added = git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
const fix = process.argv.includes("--fix");
let bad = 0;
for (const rel of [...new Set([...changed, ...added])]) {
  const p = join(ROOT, rel);
  const s = readFileSync(p, "utf8");
  const bare = (s.match(/(^|[^\r])\n/g) || []).length;
  const crlf = (s.match(/\r\n/g) || []).length;
  if (bare > 0) {
    bad++;
    if (fix) {
      writeFileSync(p, s.replace(/\r?\n/g, "\r\n"));
      console.log(`FIXED ${rel}: ${bare} bare LF → CRLF`);
    } else console.log(`BARE  ${rel}: ${bare} bare LF, ${crlf} CRLF`);
  } else console.log(`ok    ${rel}: ${crlf} CRLF`);
}
console.log(bad ? `${bad} file(s) with bare LF${fix ? " — fixed" : ""}` : "every changed or added file is CRLF");
