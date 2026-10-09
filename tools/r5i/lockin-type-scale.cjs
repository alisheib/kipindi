// Lock in R5-I's own −2/−2 in type-scale's ratchets (measured: 742 → 740 sub-floor, 860 → 858 arbitrary size with R5-I's
// files at HEAD vs now); the rest of the slack belongs to the lanes that removed it (the file's own convention, R4).
const fs = require("fs");
const p = "F:/kipindi-r5i/scripts/type-scale.test.mts";
const raw = fs.readFileSync(p, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");
const edits = [
  ["const RATCHET_SUBFLOOR = 747; // ", "const RATCHET_SUBFLOOR = 745; // -2, 2026-10-09 (R5-I, the visual pass's round 5): the old dial's short-balance figures (a 10px SENTENCE, now the 13px factual line Up & Down draws) and the /wallet grant chip's 8px word (now the kit Chip). Only R5-I's own two are locked in; the run measures 740, and the rest belong to the lanes that removed them. // "],
  ["const RATCHET_ARBITRARY_SIZE = 901; // ", "const RATCHET_ARBITRARY_SIZE = 899; // -2, 2026-10-09 (R5-I): the same two sites — a sub-floor sentence and a hand-typed size are one call site counted by two rules. Only R5-I's own two are locked in; the run measures 858. // "],
];
for (const [from, to] of edits) {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log("anchor count", n, from); process.exit(1); }
  s = s.replace(from, () => to);
}
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("locked in");
