// print ±N lines of context around given file:line list
import { readFileSync } from "node:fs";
const N = Number(process.env.N ?? 2);
const items = process.argv.slice(2);
for (const it of items) {
  const [f, l] = it.split(":"); const line = Number(l);
  const lines = readFileSync("F:/kipindi-r5c/" + f, "utf8").split(/\r?\n/);
  console.log(`--- ${f}:${line}`);
  for (let i = Math.max(1, line - N); i <= Math.min(lines.length, line + N); i++) console.log(`${i === line ? ">" : " "}${String(i).padStart(5)} ${lines[i - 1].slice(0, 210)}`);
}
