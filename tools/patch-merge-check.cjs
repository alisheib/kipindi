// merge-check.sh: list files may name red: twins too (each runs after the suites, beside the merge's own reds).
const fs = require("fs");
const p = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/merge-check.sh";
let s = fs.readFileSync(p, "utf8");
const a = 'for(const f of process.argv.slice(1)) for(const l of fs.readFileSync(f,"utf8").split("\\n")){const m=/^(test:[a-z0-9:-]+)/.exec(l.trim()); if(m) names.add(m[1]);}';
const b = 'const listedReds=new Set();\nfor(const f of process.argv.slice(1)) for(const l of fs.readFileSync(f,"utf8").split(/\\s+/)){const m=/^((?:test|red):[a-z0-9:-]+)/.exec(l.trim()); if(m) (m[1].startsWith("red:")?listedReds:names).add(m[1]);}';
if (s.split(a).length !== 2) throw new Error("anchor a");
s = s.replace(a, b);
const c = 'const reds=Object.keys(p).filter(k=>k.startsWith("red:")&&k!=="red:all"&&!db(k)&&';
if (s.split(c).length !== 2) throw new Error("anchor c");
s = s.replace(c, 'const reds=Object.keys(p).filter(k=>k.startsWith("red:")&&k!=="red:all"&&!db(k)&&(listedReds.has(k)||');
// close the extra parenthesis: the reds filter ends with `.some(f=>changed.includes(f))).sort();`
const d = '.some(f=>changed.includes(f))).sort();';
if (s.split(d).length !== 2) throw new Error("anchor d");
s = s.replace(d, '.some(f=>changed.includes(f)))).sort();');
fs.writeFileSync(p, s);
console.log("ok");
