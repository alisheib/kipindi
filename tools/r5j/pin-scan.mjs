// Every removed line of the worktree's diff, reduced to a distinctive fragment, searched for in scripts/ — a suite that
// quotes a line I changed is a pin I may have moved. node <this>
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
const ROOT = "F:/kipindi-r5j";
const diff = execFileSync("git", ["-C", ROOT, "diff", "-U0", "--", "src"], { encoding: "utf8", maxBuffer: 64 << 20 });
const removed = [];
let file = "";
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) file = line.slice(6);
  else if (line.startsWith("-") && !line.startsWith("---")) {
    const t = line.slice(1).trim();
    // skip comment-only lines
    if (!t || /^(\/\/|\*|\/\*|\{\/\*)/.test(t)) continue;
    removed.push({ file, t });
  }
}
// distinctive fragments: code tokens of 14+ chars from each removed line
const frags = new Map();
for (const { file, t } of removed) {
  const cands = t.match(/[A-Za-z_.{}()"'`$\[\]+=<>:, /-]{14,}/g) ?? [];
  for (const c of cands) {
    const s = c.trim();
    if (s.length < 14) continue;
    if (/^(className=|import \{|from "|export function|const |return )/.test(s) && s.length < 30) continue;
    frags.set(s, file);
  }
}
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const st = statSync(p); if (st.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(m?[jt]s|cjs|mts|mjs|json)$/.test(n)) files.push(p); } };
walk(join(ROOT, "scripts"));
const texts = files.map((f) => [relative(ROOT, f).split("\\").join("/"), readFileSync(f, "utf8")]);
let hits = 0;
for (const [frag, src] of frags) {
  const where = texts.filter(([, s]) => s.includes(frag)).map(([f]) => f);
  if (where.length && where.length < 25) { hits++; console.log(`${src} :: ${JSON.stringify(frag).slice(0, 120)}\n    ${where.join(" · ")}`); }
}
console.log(`\n${removed.length} removed code lines, ${frags.size} fragments, ${hits} quoted in scripts/`);
