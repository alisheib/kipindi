// anchor-diff.mjs <repo> <treeA> <treeB> — for EVERY declared red mutation (scripts/anchors/*.anchors.mjs at treeB),
// count how often its `from` occurs in its file at each tree (LF-normalised, as a plain substring) and list every
// mutation whose count differs: an anchor one tree resolves and the other does not is that diff's doing.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const [, , repo, A, B] = process.argv;
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 1 << 27 });
const files = git("ls-tree", "--name-only", `${B}:scripts/anchors`).split("\n").filter((f) => f.endsWith(".anchors.mjs"));
const dir = mkdtempSync(join(tmpdir(), "anchors-"));
const cache = new Map();
const read = (tree, file) => {
  const k = `${tree}:${file}`;
  if (!cache.has(k)) { try { cache.set(k, git("show", k).replace(/\r\n/g, "\n")); } catch { cache.set(k, null); } }
  return cache.get(k);
};
const count = (src, from) => (src === null ? -1 : src.split(from.replace(/\r\n/g, "\n")).length - 1);
let total = 0, diffs = 0, unresolvedBoth = 0;
for (const f of files) {
  const p = join(dir, f);
  writeFileSync(p, git("show", `${B}:scripts/anchors/${f}`));
  let mod;
  try { mod = await import(pathToFileURL(p).href); } catch (e) { console.log(`?? ${f}: cannot import (${String(e.message).slice(0, 80)})`); continue; }
  const lists = Object.values(mod).filter((v) => Array.isArray(v) && v.length && typeof v[0] === "object" && "from" in v[0]);
  for (const list of lists) for (const m of list) {
    if (typeof m.from !== "string" || typeof m.file !== "string") continue;
    total++;
    const a = count(read(A, m.file), m.from), b = count(read(B, m.file), m.from);
    if (a !== b) { diffs++; console.log(`DIFF ${f} · ${m.name ?? "?"} · ${m.file}: ${A}=${a} ${B}=${b}`); }
    else if (a !== 1) unresolvedBoth++;
  }
}
console.log(`${total} declared mutations from ${files.length} files: ${diffs} resolve differently between ${A} and ${B}; ${unresolvedBoth} resolve the same way but not exactly once on both (not this diff's doing)`);
