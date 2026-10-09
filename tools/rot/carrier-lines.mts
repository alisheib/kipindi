// Scratch: for each named file, show the exact lines (after decomment) on which §2.1's BLOCK_RE / LINE_RE match.
import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-rot3/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-rot3";
const BLOCK_RE = /\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\//;
const LINE_RE = /\/(?:\(\^\|\[\^:"'`\\w\/\]\)|\(\^\|\[\^:\]\)|\^\\s\*|\(\?<!:\))?\\\/\\\/[^/]*\//;
for (const f of process.argv.slice(2)) {
  const raw = readFileSync(`${ROOT}/${f}`, "utf8");
  const s = decomment(raw);
  const lines = s.split("\n");
  console.log(`=== ${f}  (BLOCK_RE ${BLOCK_RE.test(s)} · LINE_RE ${LINE_RE.test(s)})`);
  lines.forEach((l, i) => {
    if (BLOCK_RE.test(l) || LINE_RE.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 200)}`);
  });
}
