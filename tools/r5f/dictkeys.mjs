// r5f — print every value of the given dictionary keys in src/lib/i18n-dict.ts (read-only lookup).
//   node dictkeys.mjs <worktree> key1 key2 ...
import { readFileSync } from "node:fs";
const [wt, ...keys] = process.argv.slice(2);
const src = readFileSync(`${wt}/src/lib/i18n-dict.ts`, "utf8");
for (const k of keys) {
  const re = new RegExp(`\\b${k}\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\`)`, "g");
  const hits = [];
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    hits.push(`L${line} ${m[1]}`);
  }
  console.log(`${k}: ${hits.length ? hits.join("  |  ") : "(none)"}`);
}
