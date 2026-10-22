// Derives the commit-2 suite (the frame and the pick) from the full suite: drops §14 (the no-week body, commit 3).
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
const crlf = readFileSync(src, "utf8").includes("\r\n");
let s = readFileSync(src, "utf8").replace(/\r\n/g, "\n");
const a = s.indexOf("// ── §14 · L6/L21 · the no-week body");
const b = s.indexOf("// ── §15 ·", a + 1);
if (a < 0 || b < 0) throw new Error("§14 markers not found");
s = s.slice(0, a) + s.slice(b);
const head = "every block sweeping                              §14 L6/L21 the no-week body keeps its day with its clock\n";
if (!s.includes(head)) throw new Error("header line not found");
s = s.replace(head, "every block sweeping\n");
if (/noWeekBody|§14/.test(s)) throw new Error("a commit-3 reference is left");
writeFileSync(out, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log(`wrote ${out} (${crlf ? "CRLF" : "LF"})`);
