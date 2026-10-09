// The eyebrow gate's signature for given file:line sites (the same `sig` eyebrow-sweep.mjs writes).
import { readFileSync } from "node:fs";
const sig = (lines, i) => {
  const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
  let tail = "";
  for (let k = i + 1; k < Math.min(i + 3, lines.length); k++) {
    const t = (lines[k] ?? "").replace(/\s+/g, " ").trim();
    if (t) { tail = t; break; }
  }
  return (head + " ↵ " + tail).slice(0, 170);
};
for (const arg of process.argv.slice(2)) {
  const [rel, line] = arg.split(":");
  const lines = readFileSync(`F:/kipindi-r5k/src/${rel}`, "utf8").split("\n");
  console.log(JSON.stringify(`${rel} :: ${sig(lines, Number(line) - 1)}`));
}
