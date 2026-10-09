// R5-G port · package.json: keep R5-I's suite line and mine, side by side (CRLF kept).
import { readFileSync, writeFileSync } from "node:fs";
const P = "F:/kipindi-r5g/package.json";
const s = readFileSync(P, "utf8");
const conflict = /<<<<<<< ours\r?\n(    "test:visual-pass-r5i": "tsx scripts\/visual-pass-r5i\.test\.mts",\r?\n)=======\r?\n(    "test:visual-pass-r5g": "tsx scripts\/visual-pass-r5g\.test\.mts",\r?\n)>>>>>>> theirs\r?\n/;
if (!conflict.test(s)) { console.log("conflict block not found as expected"); process.exit(1); }
const out = s.replace(conflict, (_, ours, theirs) => ours + theirs);
writeFileSync(P, out);
JSON.parse(out); // still valid JSON
console.log("package.json resolved; markers left:", (out.match(/^(<<<<<<<|=======|>>>>>>>)/gm) || []).length);
