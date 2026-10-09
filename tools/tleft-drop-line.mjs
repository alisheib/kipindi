// usage: node tleft-drop-line.mjs <file> <needle>
// Removes the ONE line (with its CRLF) that contains <needle>; refuses unless exactly one line matches.
import { readFileSync, writeFileSync } from "node:fs";
const [file, needle] = process.argv.slice(2);
const src = readFileSync(file, "utf8");
const lines = src.split("\r\n");
const hits = lines.map((l, i) => (l.includes(needle) ? i : -1)).filter((i) => i >= 0);
if (hits.length !== 1) { console.error(`REFUSING: ${hits.length} lines contain ${JSON.stringify(needle)} in ${file}`); process.exit(2); }
const removed = lines.splice(hits[0], 1)[0];
writeFileSync(file, lines.join("\r\n"), "utf8");
console.log(`removed line ${hits[0] + 1} of ${file}: ${JSON.stringify(removed)}`);
