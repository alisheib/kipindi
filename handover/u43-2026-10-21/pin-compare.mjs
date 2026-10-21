// Compare the nine-line money writes at the old pinned lines (base commit) with the new lines (working tree).
// Usage: node pin-compare.mjs <tree> <baseRef> <file> <oldLines,comma> <newLines,comma>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const [tree, baseRef, file, oldCsv, newCsv] = process.argv.slice(2);
const base = execFileSync("git", ["-C", tree, "show", `${baseRef}:${file}`], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r/g, "").split("\n");
const cur = readFileSync(`${tree}/${file}`, "utf8").replace(/\r/g, "").split("\n");
const olds = oldCsv.split(",").map(Number), news = newCsv.split(",").map(Number);
const h = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
let same = 0;
olds.forEach((o, i) => {
  const n = news[i];
  const a = base.slice(o - 1, o - 1 + 9).join("\n"), b = cur.slice(n - 1, n - 1 + 9).join("\n");
  const ok = a === b;
  if (ok) same++;
  console.log(`${o} -> ${n}: ${ok ? "IDENTICAL" : "DIFFERENT"} ${h(a)} ${h(b)} | ${cur[n - 1].trim().slice(0, 70)}`);
  if (!ok) { console.log("  base:\n" + a.split("\n").map((l) => "    " + l).join("\n")); console.log("  now:\n" + b.split("\n").map((l) => "    " + l).join("\n")); }
});
console.log(`${same}/${olds.length} identical`);
