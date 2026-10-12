// Scratch: counts how often each of OMEGA's mutant `from` strings occurs in the v3 file (each must occur exactly once),
// and runs the same count for this session's extra mutants (mutate-extra.mjs), when present.
import { existsSync, readFileSync } from "node:fs";
const src = readFileSync("C:/kipindi-s7/scripts/qa-classic-shell-parity.mjs", "utf8");
const listOf = (file, name) => {
  const text = readFileSync(new URL(file, import.meta.url), "utf8");
  const start = text.indexOf(`const ${name} = [`);
  const end = text.indexOf("\n];", start) + 3;
  return new Function(`${text.slice(start, end)}; return ${name};`)();
};
let bad = 0, all = 0;
for (const [file, name] of [["./mutate.mjs", "MUTANTS"], ["./mutate-extra.mjs", "EXTRA"]]) {
  if (!existsSync(new URL(file, import.meta.url))) continue;
  for (const m of listOf(file, name)) {
    for (const [from] of m.edits ?? [[m.from]]) {
      all++;
      const n = src.split(from).length - 1;
      if (n !== 1) bad++;
      console.log(`${n === 1 ? "once" : `x${n}  `}  ${file.slice(2)} ${m.check} — ${m.why}`);
    }
  }
}
console.log(`${all - bad}/${all} anchors occur exactly once`);
process.exit(bad ? 1 : 0);
