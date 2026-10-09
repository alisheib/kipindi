// R5-B · repair: clipQuote's two character classes, written as \u escapes (a Git Bash heredoc ate the first attempt's
// backslashes). Written with the Write tool, so every backslash below is the one the source needs. CRLF kept.
const fs = require("fs");
const f = "src/lib/notification-text.ts";
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
const lines = raw.replace(/\r\n/g, "\n").split("\n");
const iC = lines.findIndex((l) => l.startsWith("const CJK = /["));
const iJ = lines.findIndex((l) => l.startsWith("const TRAILING_JUNK = /["));
if (iC < 0 || iJ < 0) { console.error("anchors"); process.exit(1); }
lines[iC] = String.raw`const CJK = /[⺀-鿿豈-﫿　-〿＀-￯]/;`;
lines[iJ] = String.raw`const TRAILING_JUNK = /[\s,;:.·\-–—(\[{“‘«「『（【〈《〔…、，：；。]+$/u;`;
const out = lines.join("\n");
fs.writeFileSync(f, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log(lines[iC]);
console.log(lines[iJ]);
