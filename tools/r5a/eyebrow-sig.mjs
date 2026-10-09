// The eyebrow gate's signature for a site (scripts/design-gate/eyebrow-sweep.mjs, `sig`), for the lines that hold `needle`.
import { readFileSync } from "node:fs";
process.chdir("F:/kipindi-r5a");
function decomment(src) {
  let out = "", i = 0, mode = 0, quote = "";
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (mode === 0) {
      if (c === "/" && n === "*") { mode = 1; out += "  "; i += 2; continue; }
      if (c === "/" && n === "/") { mode = 2; out += "  "; i += 2; continue; }
      if (c === '"' || c === "'") { mode = 3; quote = c; out += c; i++; continue; }
      if (c === "`") { mode = 4; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 1) { if (c === "*" && n === "/") { mode = 0; out += "  "; i += 2; continue; } out += c === "\n" ? "\n" : " "; i++; continue; }
    if (mode === 2) { if (c === "\n") { mode = 0; out += "\n"; i++; continue; } out += " "; i++; continue; }
    if (c === "\\") { out += "  "; i += 2; continue; }
    if ((mode === 3 && c === quote) || (mode === 4 && c === "`")) mode = 0;
    out += c; i++;
  }
  return out;
}
const sig = (lines, i) => {
  const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
  let tail = "";
  for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
    const t = (lines[j] ?? "").replace(/\s+/g, " ").trim();
    if (t) { tail = t; break; }
  }
  return (head + " ↵ " + tail).slice(0, 170);
};
for (const [file, needle] of [["src/app/results/page.tsx", "tracking-[0.16em] font-bold text-gold-300"], ["src/app/updown/page.tsx", "tracking-[0.10em] text-text-faint\">"]]) {
  const lines = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n")).split("\n");
  lines.forEach((l, i) => { if (l.includes(needle)) console.log(JSON.stringify(`${file.replace(/^src\//, "")} :: ${sig(lines, i)}`)); });
}
