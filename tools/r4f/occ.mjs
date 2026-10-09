import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const R = await import(pathToFileURL("C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r4f/replay-gen.mjs").href);
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const base = JSON.parse(readFileSync(S + "/visual/parity-main-d9b7a5b6.json", "utf8"));
const cur = JSON.parse(readFileSync(S + "/visual/parity-main-d9b7a5b6.json.current.json", "utf8"));
const count = (s, x) => s.split(x).length - 1;
const bad = [];
for (const e of R.EXPECTED_DIFFS.filter((x) => x.id.startsWith("positions-"))) {
  const kind = e.field.endsWith(".html") ? "html" : "layout";
  for (const k of Object.keys(base.cells)) {
    const m = base.cells[k].regions.main; if (!m) continue;
    const was = base.blobs[m[kind]], now = cur.blobs[cur.cells[k].regions.main[kind]];
    // in each cell the entry hits: every pair's from occurs at most once in the baseline, its to at most once in the capture,
    // and no pair's to is another pair's from (no chain)
    const d = R.diffCells("/positions", base.cells[k], cur.cells[k], base.blobs, cur.blobs);
    if (!d.expected.some((x) => x.id === e.id)) continue;
    let applied = 0;
    for (const [x, y] of e.replace) {
      const nx = count(was, x), ny = count(now, y);
      if (nx > 1 || ny > 1) bad.push(`${e.id} ${k}: from x${nx} to x${ny}: ${x.slice(0, 50)}`);
      if (nx === 1) applied++;
    }
    const froms = new Set(e.replace.map((p) => p[0]));
    for (const [, y] of e.replace) if (froms.has(y)) bad.push(`${e.id}: a to is a from: ${y}`);
    if (k.startsWith("player|en|360")) console.log(`${e.id} @ ${k}: ${applied} of ${e.replace.length} pairs apply`);
  }
}
console.log(bad.length ? bad.join("\n") : "every applied pair occurs once in its baseline text and once in the capture; no chain");
