import { readFileSync } from "node:fs";
import { decomment } from "F:/kipindi-vis/scripts/lib/decomment.mts";
const src = readFileSync("F:/kipindi-vis/scripts/decomment.test.mts", "utf8");
const B = eval(src.match(/const BLOCK_RE = (.*);/)![1]);
const L = eval(src.match(/const LINE_RE = (.*);/)![1]);
for (const f of process.argv.slice(2)) {
  const s = decomment(readFileSync(f, "utf8"));
  const m = s.match(B) ?? s.match(L);
  console.log(f.split("/").pop(), m ? "CARRIER: " + m[0].slice(0, 120) : "clean");
}
