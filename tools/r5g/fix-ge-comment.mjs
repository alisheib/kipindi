// R5-G · decode the \uXXXX text inside global-error.tsx's new comment block only (the regex below it keeps its escapes).
import { readFileSync, writeFileSync } from "node:fs";
const P = "F:/kipindi-r5g/src/app/global-error.tsx";
const s = readFileSync(P, "utf8");
const start = s.indexOf("/**\r\n * \\u2b50 THE REGULATOR'S NAME IS ONE NAME HERE TOO");
const end = s.indexOf("const REGULATOR_NAME = ", start);
if (start < 0 || end < 0) { console.log("block not found", start, end); process.exit(1); }
const block = s.slice(start, end);
const fixed = block.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
writeFileSync(P, s.slice(0, start) + fixed + s.slice(end));
console.log(`decoded ${(block.match(/\\u[0-9a-fA-F]{4}/g) || []).length} escapes in the comment block; regex line untouched:`,
  /const REGULATOR_NAME = \/Gaming Board of Tanzania\|Bodi ya Michezo ya Kubahatisha Tanzania\|\\u5766/.test(readFileSync(P, "utf8")));
