// apply-pairs.cjs <repo> <file-in-repo> <pairs.json> [<inflight-block-file>]
// Each pair's `old` must occur exactly once (CRLF in the working copy is read as LF and written back as CRLF).
// With a block file, the IN FLIGHT paragraph (from "**⏳ IN FLIGHT" to the line ending "the handover draft supersedes.)")
// is replaced by it. Nothing is written unless every replacement resolves.
const fs = require("fs");
const [, , repo, rel, pairsFile, blockFile] = process.argv;
const p = repo + "/" + rel;
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
let v = raw.replace(/\r\n/g, "\n");
const pairs = JSON.parse(fs.readFileSync(pairsFile, "utf8"));
for (const { label, old, new: neu } of pairs) {
  const i = v.indexOf(old);
  if (i < 0 || v.indexOf(old, i + 1) >= 0) throw new Error(`${label}: not exactly once`);
  v = v.slice(0, i) + neu + v.slice(i + old.length);
}
if (blockFile) {
  const block = fs.readFileSync(blockFile, "utf8").replace(/\r\n/g, "\n");
  const i = v.indexOf("**⏳ IN FLIGHT (updated ");
  if (i < 0 || v.indexOf("**⏳ IN FLIGHT (updated ", i + 1) >= 0) throw new Error("IN FLIGHT start not exactly once");
  const end = "an early start that the handover draft supersedes.)\n";
  const j = v.indexOf(end, i);
  if (j < 0 || j - i > 6000) throw new Error("IN FLIGHT end");
  v = v.slice(0, i) + block + v.slice(j + end.length);
}
fs.writeFileSync(p, crlf ? v.replace(/\n/g, "\r\n") : v);
console.log(`applied ${pairs.length} pair(s)${blockFile ? " + the IN FLIGHT block" : ""}`);
