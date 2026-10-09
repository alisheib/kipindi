// R5-B · F10: clipQuote's character classes written as escapes (the ranges end on invisible code points), and its junk set
// gains the Chinese opening brackets and an ellipsis of its own. CRLF kept; each anchor must match once.
const fs = require("fs");
const f = "src/lib/notification-text.ts";
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");
const lines = s.split("\n");
const find = (pred, what) => { const i = lines.findIndex(pred); if (i < 0 || lines.findIndex((l, j) => j > i && pred(l)) >= 0) { console.error(`anchor ${what}`); process.exit(1); } return i; };
const i45 = find((l) => l.includes("it never ends on a space, a comma, a colon"), "45");
if (!lines[i45 + 1].includes('quote before the "\u2026" (a closing quote stays')) { console.error("anchor 46"); process.exit(1); }
lines.splice(i45, 2,
  " *   \u00B7 it never ends on a space, a comma, a colon, a semicolon, a full stop, a dash, a middle dot, an ellipsis of its own or",
  " *     an opening bracket or quote \u2014 Latin or Chinese (\u300C\u300E\uFF08\u3010\u3008\u300A\u3014) \u2014 before the \"\u2026\" (a closing quote stays: it",
  " *     belongs to the words before it).");
const iC = find((l) => l.startsWith("const CJK = /["), "CJK");
lines[iC] = "const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;";
const iJ = find((l) => l.startsWith("const TRAILING_JUNK = /["), "JUNK");
lines[iJ] = "const TRAILING_JUNK = /[\s,;:.\u00B7\-\u2013\u2014(\[{\u201C\u2018\u00AB\u300C\u300E\uFF08\u3010\u3008\u300A\u3014\u2026\u3001\uFF0C\uFF1A\uFF1B\u3002]+$/u;";
const iP = find((l) => l.includes(" * Pure, so a writer (`notification-service.ts`) and a suite can run the same rule."), "pure");
lines.splice(iP + 1, 0, " * \u26A0\uFE0F Rows already written keep their text: a notice is a record of what was said, and nothing rewrites it.");
s = lines.join("\n");
fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
