// Exact, counted replacements on a CRLF file: each [from, to] must match exactly once (LF in the patterns is matched as
// CRLF in the file). Usage: import { edit } from "./edit-lib.mjs"; edit("src/…", [[from, to], …]).
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5k/";
export function edit(rel, pairs) {
  const p = /^(?:[A-Za-z]:|\/)/.test(rel) ? rel : ROOT + rel;
  let s = readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  const norm = (x) => (crlf ? x.replace(/\r?\n/g, "\r\n") : x);
  for (const [from, to] of pairs) {
    const f = norm(from), t = norm(to);
    const n = s.split(f).length - 1;
    if (n !== 1) throw new Error(`${rel}: expected one match, found ${n}: ${from.slice(0, 90)}`);
    s = s.replace(f, () => t);
  }
  writeFileSync(p, s);
  console.log(`edited ${rel} (${pairs.length} replacement${pairs.length === 1 ? "" : "s"})`);
}
