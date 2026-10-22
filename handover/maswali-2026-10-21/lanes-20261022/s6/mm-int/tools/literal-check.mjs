// Read-only helper (not repo code). For each script R (in tree MERGED) and each target file F it names (from the
// targets list), take every static string literal (>= MIN chars) in R; flag a literal that occurs in T's F (or INT's F)
// but not in MERGED's F, or that occurs once in T's F but more than once in MERGED's F.
// Usage: node literal-check.mjs <repo> <MERGED> <T> <INT> <targets-list> <script>... | @<file-with-script-list>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [repo, MERGED, TT, INT, targetsList, ...scriptArgs] = process.argv.slice(2);
const lines = (s) => s.split("\n").map((x) => x.replace(/\r$/, "")).filter(Boolean);
const scripts = scriptArgs.flatMap((a) => (a.startsWith("@") ? lines(readFileSync(a.slice(1), "utf8")) : [a]));
const MIN = Number(process.env.MIN ?? 18);
const targets = lines(readFileSync(targetsList, "utf8"));
const cache = new Map();
const blob = (tree, path) => {
  const k = `${tree}:${path}`;
  if (cache.has(k)) return cache.get(k);
  let v = null;
  try { v = execFileSync("git", ["-C", repo, "cat-file", "-p", k], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).split("\r\n").join("\n"); } catch { v = null; }
  cache.set(k, v);
  return v;
};
function literals(src) {
  const out = [];
  let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); if (e < 0) break; i = e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1, s = "", dyn = false;
      while (j < n && src[j] !== c) {
        if (src[j] === "\\") {
          const e = src[j + 1];
          if (e === "n") s += "\n"; else if (e === "t") s += "\t";
          else if (e === "u") { if (src[j + 2] === "{") { const k = src.indexOf("}", j); s += String.fromCodePoint(parseInt(src.slice(j + 3, k), 16)); j = k - 1; } else { s += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16)); j += 4; } }
          else s += e;
          j += 2; continue;
        }
        if (c === "`" && src[j] === "$" && src[j + 1] === "{") { dyn = true; let d = 1; j += 2; while (j < n && d > 0) { if (src[j] === "{") d++; else if (src[j] === "}") d--; j++; } s += "\u0000"; continue; }
        if (c !== "`" && src[j] === "\n") break;
        s += src[j]; j++;
      }
      if (!dyn) out.push(s); else for (const part of s.split("\u0000")) out.push(part);
      i = j + 1; continue;
    }
    i++;
  }
  return out.filter((s) => s.length >= MIN);
}
const count = (s, sub) => { if (s === null) return -1; let c = 0, p = 0; while ((p = s.indexOf(sub, p)) !== -1) { c++; p += sub.length; } return c; };
let flagged = 0;
for (const r of scripts) {
  const src = blob(MERGED, r);
  if (src === null) continue;
  const named = targets.filter((f) => src.includes(f) || src.includes(f.replace(/^src\//, "")));
  if (named.length === 0) continue;
  const lits = [...new Set(literals(src))];
  for (const f of named) {
    const m = blob(MERGED, f), t = blob(TT, f), it = blob(INT, f);
    if (m === null) continue;
    for (const L of lits) {
      if (L.includes(f)) continue;
      const cm = count(m, L), ct = count(t, L), ci = count(it, L);
      const lost = cm === 0 && (ct > 0 || ci > 0);
      const ambiguous = cm > 1 && (ct === 1 || ci === 1);
      if (lost || ambiguous) {
        flagged++;
        console.log(`${lost ? "LOST" : "AMBIG"} merged=${cm} T=${ct} int=${ci} | ${r} | ${f} | ${L.slice(0, 120).split("\n").join("\\n")}`);
      }
    }
  }
}
console.log(`flagged ${flagged}`);
