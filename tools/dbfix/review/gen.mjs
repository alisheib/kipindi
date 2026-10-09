// Generates harness.mts from the EXACT lines of da35f89c:scripts/db-scratch.mts (no hand copying).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const src = execFileSync("git", ["-C", "F:/kipindi-c5docs", "show", "da35f89c:scripts/db-scratch.mts"], { encoding: "utf8" });
const L = src.split(/\r?\n/);
const line = (n) => L[n - 1];
const expect = (n, startsWith) => {
  if (!line(n).trimStart().startsWith(startsWith)) throw new Error(`line ${n} is not ${startsWith}: ${line(n)}`);
  return line(n);
};
const normLine = expect(110, "const norm =");
const markerLine = expect(111, "const marker = norm(process.cwd());").replace("process.cwd()", "cwd");
const psLine = expect(114, "const ps =");
const dirReLine = expect(115, "const dirRe =");
const knownLine = expect(116, "const known =");
expect(120, "`$all =");
let tpl = L.slice(119, 129).join("\n");
if (!tpl.trimEnd().endsWith("`],")) throw new Error("template end not found: " + tpl.slice(-40));
tpl = tpl.trimEnd().slice(0, -2); // drop the trailing "],"
const out = `// GENERATED from da35f89c:scripts/db-scratch.mts lines 110-129 (process.cwd() -> cwd, DATA_DIR -> param)
import { resolve } from "node:path";
export function build(cwd: string, deadParents: number[] = []): string {
  const DATA_DIR = resolve(cwd, ".pgscratch");
${normLine}
${markerLine}
${psLine}
${dirReLine}
${knownLine}
  return (
${tpl}
  );
}
`;
writeFileSync(new URL("./harness.mts", import.meta.url), out);
console.log(out);
