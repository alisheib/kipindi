// Every file the worktree changed (and every untracked one under src/ and scripts/): lines ending LF-only in a CRLF file,
// raw invisible characters gained against the tip. `node eol-check.mjs [--fix]` from anywhere.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ROOT = "F:/kipindi-r5j";
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
const files = [...new Set([...git("diff", "--name-only").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
const fix = process.argv.includes("--fix");
let bad = 0;
for (const f of files) {
  const p = `${ROOT}/${f}`;
  if (!existsSync(p) || f.endsWith(".sh")) continue;
  const s = readFileSync(p, "utf8");
  const lf = (s.match(/\n/g) || []).length, crlf = (s.match(/\r\n/g) || []).length;
  const mixed = lf !== crlf;
  const RANGES = /[\u00a0\u200b\u200c\u200d\u2060\u202f\ufeff]/g;
  const now = (s.match(RANGES) || []).length;
  let tip = 0;
  try { tip = (git("show", `HEAD:${f}`).match(RANGES) || []).length; } catch { tip = 0; }
  const gained = now > tip;
  if (mixed || gained) {
    bad++;
    console.log(`${f}: ${mixed ? `MIXED EOL (lf ${lf}, crlf ${crlf})` : "eol ok"}${gained ? ` · invisible chars ${tip}→${now}` : ""}`);
    if (fix && mixed) { writeFileSync(p, s.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")); console.log("  fixed → CRLF"); }
  }
}
console.log(`${files.length} changed/untracked files; ${bad ? `${bad} flagged` : "all CRLF, no invisible character gained"}`);
