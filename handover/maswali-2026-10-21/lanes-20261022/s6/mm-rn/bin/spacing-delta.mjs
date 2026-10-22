// Scratch (NOT repo code): the spacing-scale census's USE count, per file, base vs tip, over src/*.ts(x) a lane changed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const [repo, base, tip, prefixFile] = process.argv.slice(2);
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const blob = (t, p) => { try { return git("cat-file", "-p", `${t}:${p}`); } catch { return null; } };
const line = readFileSync(prefixFile, "utf8");
const PREFIX = /const PREFIX = "([^"]+)";/.exec(line)[1];
const FORBIDDEN = ["2.5", "3.5", "14", "16", "20", "24", "28", "32"];
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(${FORBIDDEN.map((k) => k.replace(".", "\\.")).join("|")})\\b`, "g");
// An approximate decomment: block comments, then line comments outside strings (good enough for a delta).
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const files = git("diff", "--name-only", base, tip, "--", "src").split("\n").filter((f) => /\.tsx?$/.test(f));
let delta = 0;
for (const f of files) {
  const a = blob(base, f), b = blob(tip, f);
  const n = (s) => (s === null ? 0 : [...decomment(s).matchAll(USE)].length);
  const d = n(b) - n(a);
  if (d !== 0) { console.log(`${f}: ${n(a)} -> ${n(b)} (${d > 0 ? "+" : ""}${d})`); delta += d; }
}
console.log(`total delta ${delta} over ${files.length} changed src files`);
