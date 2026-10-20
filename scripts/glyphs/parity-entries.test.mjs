/** PHOSPHOR-MIGRATION W6: preserve earlier entries and exclude unchanged clock cells. */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GEN = join(ROOT, "scripts/glyphs/parity-entries.mjs");
// The generator executes with virtual files. Red plants never mutate the checkout.
const generator = readFileSync(GEN, "utf8")
  .replace('import { readFileSync, writeFileSync } from "node:fs";', "")
  .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(GEN).href));
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
function run(extra) {
  const files = new Map([
    ["base.json", JSON.stringify(base)], ["current.json", JSON.stringify(current)],
    ["out.mjs", `export const GLYPH_SWAP = ${JSON.stringify(previous)};\n`],
  ]);
  const read = (path) => { if (!files.has(path)) throw new Error(`unexpected read: ${path}`); return files.get(path); };
  const write = (path, value) => { if (path !== "out.mjs") throw new Error(`unexpected output: ${path}`); files.set(path, value); };
  const virtualProcess = { argv: [process.execPath, GEN, "base.json", "current.json", "--measured", "main", "--wave", "W6", "--out", "out.mjs", ...extra], exit: (code) => { throw new Error(`generator exited ${code}`); } };
  new Function("readFileSync", "writeFileSync", "process", "console", generator)(read, write, virtualProcess, { log() {}, error() {} });
  const source = files.get("out.mjs"), prefix = "export const GLYPH_SWAP = ";
  return JSON.parse(source.slice(source.indexOf(prefix) + prefix.length).trim().replace(/;$/, ""));
}
const valid = (result) => result.matrix.some((e) => e.id === "w3-matrix-header-html")
  && result.matrix.some((e) => e.id === "w6-matrix-main-html")
  && result.matrix.some((e) => e.id === "w6-matrix-main-layout")
  && result.book.length === 0;
if (!valid(run(["--sections", "matrix", "--append"]))) throw new Error("the W3 entry, W6 /positions entries, or time-left exclusion is wrong");
if (process.argv.includes("--prove-red")) {
  if (valid(run(["--sections", "matrix"]))) throw new Error("removing --append escaped the guard");
  if (valid(run(["--append"]))) throw new Error("removing --sections escaped the guard");
  console.log("2/2 dropped-flag plants caught");
} else console.log("W3 entry kept · W6 matrix recorded · uncounted book clock excluded");
