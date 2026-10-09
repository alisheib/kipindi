// Count stock-scale (inverted/unscaled) spacing utilities per file in main (118fc75c) vs HEAD, comments stripped roughly.
import { execSync } from "node:child_process";
const repo = "F:/kipindi-r6c";
const re = /(?<![\w-])(?:[a-z0-9-]+:)*-?(?:m|p|gap|space|inset|top|bottom|left|right|w|h|min-w|min-h|max-w|max-h|mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|ps|pe|ms|me|gap-x|gap-y|space-x|space-y|scroll-m[tblrxy]?|scroll-p[tblrxy]?|translate-[xy]|size|basis)-(2\.5|3\.5)(?![\w.-])/g;
const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const ls = (rev) => execSync(`git -C ${repo} ls-tree -r --name-only ${rev} -- src`, { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter((f) => /\.(tsx|ts)$/.test(f) && !/^src\/(app\/admin|components\/admin)\//.test(f));
const count = (rev, f) => { try { const s = execSync(`git -C ${repo} show ${rev}:"${f}"`, { encoding: "utf8", maxBuffer: 64 << 20 }); return [...strip(s).matchAll(re)].length; } catch { return 0; } };
const changed = execSync(`git -C ${repo} diff --name-only 118fc75c HEAD -- src`, { encoding: "utf8" }).split("\n").filter((f) => /\.(tsx|ts)$/.test(f) && !/^src\/(app\/admin|components\/admin)\//.test(f));
let a = 0, b = 0;
for (const f of changed) { const x = count("118fc75c", f), y = count("HEAD", f); a += x; b += y; if (x !== y) console.log(`${String(x).padStart(3)} -> ${String(y).padStart(3)}  ${f}`); }
console.log(`changed player files: 2.5/3.5 uses ${a} -> ${b}`);
