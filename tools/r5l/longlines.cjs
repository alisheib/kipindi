// R5-L · list comment/code lines over 120 characters that this branch ADDED (git diff), per file.
const { execSync } = require("child_process");
const diff = execSync("git -C F:/kipindi-r5l diff -U0", { encoding: "utf8", maxBuffer: 64 << 20 });
let file = null; const out = [];
for (const line of diff.split(/\r?\n/)) {
  if (line.startsWith("+++ ")) { file = line.slice(6); continue; }
  if (line.startsWith("+") && !line.startsWith("+++")) { const l = line.slice(1).replace(/\r$/, ""); if ([...l].length > 120) out.push(`${file}: ${[...l].length}: ${l.trim().slice(0, 90)}`); }
}
const fs = require("fs");
for (const f of ["scripts/visual-pass-r5l.test.mts", "src/components/ui/ghost-kit.tsx", "src/components/ui/query-bar-ghost.tsx"]) {
  fs.readFileSync("F:/kipindi-r5l/" + f, "utf8").split(/\r?\n/).forEach((l, i) => { if ([...l].length > 120) out.push(`${f}:${i + 1}: ${[...l].length}: ${l.trim().slice(0, 90)}`); });
}
console.log(out.length ? out.join("\n") : "none");
