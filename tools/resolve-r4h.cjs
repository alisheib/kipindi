// R4-H onto R4-K: package.json keeps both suites; the market h1 keeps R4-K's class (the watermark's room) and takes
// R4-H's keepFigures child. CRLF kept.
const fs = require("fs");
const R = "F:/kipindi-vis/";
{
  const p = R + "package.json";
  let s = fs.readFileSync(p, "utf8");
  const re = /<<<<<<< ours\r?\n((?:\s*"(?:test|red):visual-pass-r4k"[^\n]*\n)+)=======\r?\n(\s*"test:visual-pass-r4h"[^\n]*\n)>>>>>>> theirs\r?\n/;
  if (!re.test(s)) throw new Error("package.json shape");
  s = s.replace(re, (_, a, b) => a + b);
  fs.writeFileSync(p, s);
}
{
  const p = R + "src/app/markets/[id]/page.tsx";
  let s = fs.readFileSync(p, "utf8");
  const re = /<<<<<<< ours\r?\n(\s*className="[^"]*pr-\[calc\(2em\+12px\)\][^"]*"\r?\n)\s*>\{pickLocalized\(locale, m\.titleEn, m\.titleSw, m\.titleZh\)\}<\/h1>\r?\n=======\r?\n\s*className="[^"]*"\r?\n(\s*>\{\/\* `keepFigures`[^\n]*<\/h1>\r?\n)>>>>>>> theirs\r?\n/;
  if (!re.test(s)) throw new Error("h1 shape");
  s = s.replace(re, (_, cls, child) => cls + child);
  if (/<<<<<<<|>>>>>>>/.test(s)) throw new Error("still conflicted");
  fs.writeFileSync(p, s);
}
console.log("resolved");
