import { readFileSync } from "node:fs";
import { MUTATIONS } from "file:///F:/kipindi-rot3/scripts/anchors/decomment.anchors.mjs";
const root = "F:/kipindi-rot3/";
for (const m of MUTATIONS) {
  const raw = readFileSync(root + m.file, "utf8");
  const lf = raw.replace(/\r\n/g, "\n");
  const count = (s, f) => { let c = 0, i = -1; while ((i = s.indexOf(f, i + 1)) !== -1) c++; return c; };
  console.log(m.name.padEnd(55), "raw:", count(raw, m.from), "lf-normalised:", count(lf, m.from));
}
