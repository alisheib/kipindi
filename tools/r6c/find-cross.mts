// Which <svg> in a file does r5a's widened census read as a ✕ (two segments, a square's two diagonals)?
import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-r6c/scripts/lib/decomment.mts";
const file = process.argv[2];
const src = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
const segmentsOf = (svg: string): number[][] => {
  const segs: number[][] = [];
  for (const m of svg.matchAll(/<path\b[^>]*?\sd=(?:"([^"]*)"|\{"([^"]*)"\})/g)) {
    const toks = (m[1] ?? m[2] ?? "").match(/[MmLlZz]|-?\d*\.?\d+/g) ?? [];
    let cmd = "M", x = 0, y = 0, sx = 0, sy = 0;
    for (let i = 0; i < toks.length;) {
      if (/[A-Za-z]/.test(toks[i])) { cmd = toks[i++]; if (cmd === "Z" || cmd === "z") { segs.push([x, y, sx, sy]); x = sx; y = sy; } continue; }
      const a = Number(toks[i++]), b = Number(toks[i++]);
      if (cmd === "M" || cmd === "m") { x = cmd === "m" ? x + a : a; y = cmd === "m" ? y + b : b; sx = x; sy = y; cmd = cmd === "m" ? "l" : "L"; }
      else { const nx = cmd === "l" ? x + a : a, ny = cmd === "l" ? y + b : b; segs.push([x, y, nx, ny]); x = nx; y = ny; }
    }
  }
  for (const m of svg.matchAll(/<line\b([^>]*)>/g)) {
    const at = (k: string) => Number(new RegExp(`\\b${k}=(?:"|\\{)([-\\d.]+)`).exec(m[1])?.[1]);
    segs.push([at("x1"), at("y1"), at("x2"), at("y2")]);
  }
  return segs;
};
for (const m of src.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) {
  const segs = segmentsOf(m[0]);
  if (segs.length === 2) console.log(`line ${src.slice(0, m.index).split("\n").length}: ${JSON.stringify(segs)}\n${m[0].slice(0, 400)}\n`);
}
