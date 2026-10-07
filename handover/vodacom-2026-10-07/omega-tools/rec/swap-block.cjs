// swap-block.cjs <repo> <file-in-repo> <start-marker> <end-marker> <new-block-file>
// Replaces the text from the first <start-marker> through the first <end-marker> after it (inclusive) with the new
// block's contents. Each marker must occur; the start exactly once. CRLF in the working copy is kept.
const fs = require("fs");
const [, , repo, rel, start, end, blockFile] = process.argv;
const p = repo + "/" + rel;
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
const v = raw.replace(/\r\n/g, "\n");
const block = fs.readFileSync(blockFile, "utf8").replace(/\r\n/g, "\n");
const i = v.indexOf(start);
if (i < 0 || v.indexOf(start, i + 1) >= 0) throw new Error("start marker not exactly once");
const j = v.indexOf(end, i);
if (j < 0) throw new Error("end marker not found after start");
const out = v.slice(0, i) + block + v.slice(j + end.length);
fs.writeFileSync(p, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log(`replaced ${j + end.length - i} chars with ${block.length}`);
