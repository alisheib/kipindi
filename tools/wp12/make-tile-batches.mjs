// make-tile-batches.mjs <tilesDir> <outDir> [maxPerBatch=56]
// Splits qa:journey-shell's tiles into reading batches for subagents: tiles in sequence order, a batch never larger than
// maxPerBatch, and a section kept whole where it fits (a big section is split, never mixed mid-way with another). Writes
// one brief per batch (tile-brief.md with {SECTIONS} and {FILES} filled: absolute paths, one per line) and an index.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const [, , tilesDir, outDir, maxArg] = process.argv;
const MAX = Number(maxArg ?? 56);
const here = dirname(fileURLToPath(import.meta.url));
const brief = readFileSync(join(here, "tile-brief.md"), "utf8").replace(/ — fill \{SECTIONS\} and \{FILES\}/, "");
const tiles = readdirSync(tilesDir).filter((f) => f.endsWith(".png"))
  .map((f) => ({ f, seq: Number(f.split("--")[0]), section: f.split("--")[1] ?? "?" }))
  .sort((a, b) => a.seq - b.seq);
if (!tiles.length) throw new Error(`no tiles in ${tilesDir}`);
const sections = [];
for (const t of tiles) {
  const last = sections.at(-1);
  if (last && last.name === t.section) last.tiles.push(t); else sections.push({ name: t.section, tiles: [t] });
}
const batches = [];
let cur = [];
const flush = () => { if (cur.length) batches.push(cur); cur = []; };
for (const s of sections) {
  if (cur.length + s.tiles.length > MAX) flush();
  for (let i = 0; i < s.tiles.length; i += MAX) {
    const part = s.tiles.slice(i, i + MAX);
    if (cur.length + part.length > MAX) flush();
    cur.push(...part);
  }
}
flush();
mkdirSync(outDir, { recursive: true });
const index = [];
batches.forEach((b, i) => {
  const secs = [...new Set(b.map((t) => t.section))];
  const files = b.map((t) => resolve(tilesDir, t.f)).join("\n");
  const text = brief.replaceAll("{SECTIONS}", secs.join(", ")).replaceAll("{FILES}", `${b.length} files, listed at the end`) +
    `\n\n## The ${b.length} tiles, in order\n${files}\n`;
  const p = join(outDir, `batch-${String(i + 1).padStart(2, "0")}.md`);
  writeFileSync(p, text);
  index.push(`batch ${i + 1}: ${b.length} tiles · ${secs.join(" ")} · seq ${b[0].seq}-${b.at(-1).seq} · ${p}`);
});
writeFileSync(join(outDir, "index.txt"), index.join("\n") + "\n");
console.log(`${tiles.length} tiles in ${sections.length} section runs → ${batches.length} batches\n${index.join("\n")}`);
