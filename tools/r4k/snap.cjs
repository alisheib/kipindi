// Hash every tracked-modified and untracked file in the worktree (and the files the proof plants into).
const fs = require("node:fs");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");
const root = "F:/kipindi-r4k";
const files = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean).map((l) => l.slice(3).trim());
const out = {};
for (const f of files.sort()) { const p = `${root}/${f}`; if (fs.existsSync(p) && fs.statSync(p).isFile()) out[f] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16); }
const file = process.argv[2];
if (process.argv[3] === "--compare") {
  const before = JSON.parse(fs.readFileSync(file, "utf8"));
  const diff = Object.keys({ ...before, ...out }).filter((k) => before[k] !== out[k]);
  console.log(diff.length ? `DIFFER: ${diff.join(", ")}` : `identical: ${Object.keys(out).length} files`);
} else { fs.writeFileSync(file, JSON.stringify(out, null, 1)); console.log(`snapshot: ${Object.keys(out).length} files`); }
