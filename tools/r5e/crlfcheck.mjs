// Report (and with --fix, normalise) line endings of every changed or untracked file in the worktree.
// Usage (from anywhere): node crlfcheck.mjs [--fix]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ROOT = "F:/kipindi-r5e";
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
const files = [...new Set([...git("diff", "--name-only").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
let bad = 0;
for (const f of files) {
  const p = `${ROOT}/${f}`;
  if (!existsSync(p)) { console.log(`${f}: deleted`); continue; }
  const s = readFileSync(p, "utf8");
  const bare = (s.match(/(^|[^\r])\n/g) ?? []).length;
  if (bare) {
    bad++;
    if (process.argv.includes("--fix")) { writeFileSync(p, s.replace(/\r?\n/g, "\r\n"), "utf8"); console.log(`${f}: FIXED ${bare} bare LF`); }
    else console.log(`${f}: ${bare} bare LF`);
  } else console.log(`${f}: CRLF ok`);
}
process.exit(bad && !process.argv.includes("--fix") ? 1 : 0);
