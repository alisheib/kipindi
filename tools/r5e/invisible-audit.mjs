// For every file the worktree changes (and every untracked one), count the invisible / joining characters now and at the
// tip. A count that grew means an escape was decoded into a raw character somewhere. (Code points as numbers only.)
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ROOT = "F:/kipindi-r5e";
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
const files = [...new Set([...git("diff", "--name-only").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
const RANGES = [[0x00a0, 0x00a0], [0x0300, 0x036f], [0x2000, 0x200f], [0x2028, 0x202f], [0x205f, 0x206f], [0x20d0, 0x20ff], [0x3000, 0x3000], [0xfe00, 0xfe0f], [0xfeff, 0xfeff]];
const count = (s) => { const m = {}; for (const c of s) { const cp = c.codePointAt(0); if (RANGES.some(([a, b]) => cp >= a && cp <= b)) { const k = "U+" + cp.toString(16).toUpperCase().padStart(4, "0"); m[k] = (m[k] ?? 0) + 1; } } return m; };
let grew = 0;
for (const f of files) {
  if (!existsSync(`${ROOT}/${f}`)) continue;
  const now = count(readFileSync(`${ROOT}/${f}`, "utf8"));
  let tip = {};
  try { tip = count(git("show", `1699302a:${f}`)); } catch { tip = {}; }
  const diff = Object.entries(now).filter(([k, v]) => v > (tip[k] ?? 0));
  if (diff.length) { grew++; console.log(`${f}: ${diff.map(([k, v]) => `${k} ${tip[k] ?? 0}→${v}`).join(", ")}`); }
}
console.log(grew ? `${grew} file(s) gained raw invisible characters` : "no changed file gained a raw invisible character");
