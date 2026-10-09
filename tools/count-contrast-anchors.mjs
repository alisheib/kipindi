// Ad hoc: count how many times each contrast-audit-red.mjs mutation `from` occurs in its sheet (LF-normalised).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cwd = "F:/kipindi-rot3";
const src = readFileSync(join(cwd, "scripts/contrast-audit-red.mjs"), "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("const MUTATIONS = [");
const end = src.indexOf("\n];\n", start);
const literal = src.slice(start + "const MUTATIONS = ".length, end + 2);
const MUTATIONS = (0, eval)(literal);
const lf = (s) => s.replace(/\r\n/g, "\n");
let i = 0;
for (const m of MUTATIONS) {
  const file = m.file ?? "src/app/globals.css";
  const body = lf(readFileSync(join(cwd, file), "utf8"));
  const n = body.split(m.from).length - 1;
  console.log(`${String(++i).padStart(2)} ${n === 1 ? "ok " : "!! "} x${n}  [${m.kind}] ${m.name.slice(0, 80)}  (${file})`);
}
console.log(`${MUTATIONS.length} mutations`);
