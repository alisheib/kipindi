// node reds-final.cjs <repoDir> <base> <tip> > wm16-reds.txt — the red twins the final proof runs: every red whose OWN
// guard script (or its test twin's) the pass changed in base..tip, the red twins the round-5 helpers ran, and the
// previous list (S/wm16-reds.txt). One line, space-separated, sorted, red:all excluded.
const fs = require("fs"), path = require("path"), cp = require("child_process");
const [dir, base, tip] = process.argv.slice(2);
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const p = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).scripts;
const ch = new Set(cp.execSync(`git diff --name-only ${base} ${tip}`, { cwd: dir, encoding: "utf8" }).split("\n").filter(Boolean));
const files = (c) => (c || "").split(/\s+/).filter((w) => /^scripts\//.test(w));
const set = new Set();
for (const [k, v] of Object.entries(p)) {
  if (!k.startsWith("red:") || k === "red:all") continue;
  if ([...files(v), ...files(p["test:" + k.slice(4)])].some((f) => ch.has(f))) set.add(k);
}
for (const k of ["red:feedback-law", "red:journey-shell", "red:visual-pass-r4k", "red:simple-journey-flag", "red:offline-neutral", "red:journey-tickets"]) set.add(k);
for (const k of fs.readFileSync(path.join(S, "wm16-reds.txt"), "utf8").split(/\s+/).filter(Boolean)) set.add(k);
const missing = [...set].filter((k) => !p[k]);
if (missing.length) console.error("not in package.json (dropped): " + missing.join(" "));
console.log([...set].filter((k) => p[k]).sort().join(" "));
console.error(`${[...set].filter((k) => p[k]).length} red twins`);
