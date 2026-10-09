import { readFileSync, writeFileSync } from "node:fs";
const p = "F:/kipindi-r5e/src/lib/fill-nodes.tsx";
let s = readFileSync(p, "utf8");
const eol = s.includes("\r\n") ? "\r\n" : "\n";
const oldLine = "const MONEY_RUN = /TZS[\\u00a0 ]\\d+(?:,\\d{3})*(?:\\.\\d+)?[KMB]?/g;";
if (!s.includes(oldLine)) { console.error("old line not found"); process.exit(1); }
const note = [
  "// ⭐ Round 5 (2026-10-09, review 3's doubt): a signed figure is read whole too, in the platform's two spellings —",
  "// `formatTzs` / `formatTzsCompact` put the minus after the code (\"TZS −4,200\", \"TZS −1.2M\"), `formatTzsSigned` puts its",
  "// sign before it (\"−TZS 1,234\", \"+TZS 1,234\"). The minus is U+2212, never a hyphen, so no hyphen of a sentence is taken.",
].join(eol);
const newLine = "const MONEY_RUN = /[+\\u2212]?TZS[\\u00a0 ]\\u2212?\\d+(?:,\\d{3})*(?:\\.\\d+)?[KMB]?/g;";
s = s.replace(oldLine, `${note}${eol}${newLine}`);
writeFileSync(p, s);
console.log("ok", eol === "\r\n" ? "CRLF" : "LF");
