// R5-B · F10: every quoted title / note / reason / label that a notice cut with `.slice(0, n)` goes through `clipQuote`.
// Prints each replacement; keeps CRLF; refuses to touch anything it does not name.
const fs = require("fs");
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const re = /((?:opts\.)?(?:marketTitle(?:\.(?:en|sw|zh))?|title(?:\.(?:en|sw|zh))?|titleEn|note|reason|playerLabel)|market\.title(?:En|Sw)|\(market\.titleZh \?\? market\.titleEn\))\.slice\(0, (\d+)\)/g;
let n = 0;
const out = src.replace(re, (m, what, len) => {
  n++;
  const line = src.slice(0, src.indexOf(m)).split("\n").length;
  const target = what.startsWith("(") ? what.slice(1, -1) : what;
  console.log(`  L${line}: ${m}  →  clipQuote(${target}, ${len})`);
  return `clipQuote(${target}, ${len})`;
});
const left = (out.match(/\.slice\(0, \d+\)/g) || []);
console.log(`${file}: ${n} replaced; .slice(0, n) left: ${left.length} → ${left.join(" | ")}`);
if (process.argv[3] === "--write") fs.writeFileSync(file, out);
