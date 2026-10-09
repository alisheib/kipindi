// Scratch: list diff lines containing pictographic symbols, and say whether each is an ADDED line (mine) or context.
import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split(String.fromCharCode(10));
const pict = /[☀-➿️\u{1F300}-\u{1FAFF}]/u;
let n = 0;
lines.forEach((l, i) => {
  if (pict.test(l)) {
    n++;
    const kind = l.startsWith("+") && !l.startsWith("+++") ? "ADDED " : l.startsWith("-") && !l.startsWith("---") ? "REMOVED" : "context";
    console.log(`${String(i + 1).padStart(4)} ${kind}: ${l.slice(0, 120)}`);
  }
});
console.log(n === 0 ? "none" : `${n} line(s)`);
