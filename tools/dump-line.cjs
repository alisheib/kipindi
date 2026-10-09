// node dump-line.cjs <lineNo> <needle> <outfile> — write the longest string at that transcript line containing <needle>.
const fs = require("fs");
const T = "C:/Users/asheib/.claude/projects/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15.jsonl";
const [ln, needle, out] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const l = fs.readFileSync(T, "utf8").split("\n")[ln - 1];
const acc = [];
const walk = (v) => { if (typeof v === "string") acc.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
walk(JSON.parse(l));
const best = acc.filter((s) => s.includes(needle)).sort((a, b) => b.length - a.length)[0] || "";
fs.writeFileSync(out, best);
console.log(best.length, "chars;", best.split("\n").slice(0, 6).join(" | ").slice(0, 400));
