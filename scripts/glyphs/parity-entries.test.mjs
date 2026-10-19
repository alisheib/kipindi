/** PHOSPHOR-MIGRATION W6: preserve earlier measured entries while recording only the changed capture section. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GEN = join(ROOT, "scripts/glyphs/parity-entries.mjs");
const folder = mkdtempSync(join(tmpdir(), "phos-parity-"));
if (!resolve(folder).startsWith(resolve(tmpdir(), "phos-parity-"))) throw new Error("temporary fixture escaped its parent");
const baseFile = join(folder, "base.json"), currentFile = join(folder, "current.json");
const previous = { matrix: [{ id: "w3-matrix-header-html", field: "regions.header.html", cells: 1, replace: [["A", "B"]], reason: "earlier measured entry" }], sell: [], book: [], question: [] };
const cell = (html, layout) => ({ regions: { main: { count: 1, html, layout } } });
const base = {
  base: { sha: "baseline" },
  cells: { "player|en|360|/positions": cell("m-old", "l-old") },
  book: { "book-player|en|360|/watchlist": cell("b-same", "b-old") },
  blobs: { "m-old": '<main><div class="old">Empty</div></main>', "l-old": "main 0,0,100x100 base\nmain>div0 0,0,100x42 old", "b-same": "<main>Clock</main>", "b-old": "main>span0 0,0,80x17 same" },
};
const current = {
  base: { sha: "capture" },
  cells: { "player|en|360|/positions": cell("m-new", "l-new") },
  book: { "book-player|en|360|/watchlist": cell("b-same", "b-new") },
  blobs: { "m-new": '<main><div class="new">Empty</div></main>', "l-new": "main 0,0,100x110 base\nmain>div0 0,0,100x56 new", "b-same": "<main>Clock</main>", "b-new": "main>span0 0,0,85x17 same" },
};
const read = (out) => {
  const source = readFileSync(out, "utf8"), prefix = "export const GLYPH_SWAP = ";
  return JSON.parse(source.slice(source.indexOf(prefix) + prefix.length).trim().replace(/;$/, ""));
};
const run = (name, extra) => {
  const out = join(folder, `${name}.mjs`);
  writeFileSync(out, `export const GLYPH_SWAP = ${JSON.stringify(previous)};\n`);
  const result = spawnSync(process.execPath, [GEN, baseFile, currentFile, "--measured", "main", "--wave", "W6", "--out", out, ...extra], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${name}: generator exited ${result.status}: ${result.stderr}`);
  return read(out);
};
const valid = (result) => result.matrix.some((e) => e.id === "w3-matrix-header-html")
  && result.matrix.some((e) => e.id === "w6-matrix-main-html")
  && result.matrix.some((e) => e.id === "w6-matrix-main-layout")
  && result.book.length === 0;

try {
  writeFileSync(baseFile, JSON.stringify(base));
  writeFileSync(currentFile, JSON.stringify(current));
  const green = run("green", ["--sections", "matrix", "--append"]);
  if (!valid(green)) throw new Error("the W3 entry, W6 /positions entries, or time-left exclusion is wrong");
  if (process.argv.includes("--prove-red")) {
    if (valid(run("without-append", ["--sections", "matrix"]))) throw new Error("removing --append escaped the guard");
    if (valid(run("without-sections", ["--append"]))) throw new Error("removing --sections escaped the guard");
    console.log("2/2 dropped-flag plants caught");
  } else console.log("W3 entry kept · W6 matrix recorded · uncounted book clock excluded");
} finally {
  rmSync(folder, { recursive: true, force: true });
}
