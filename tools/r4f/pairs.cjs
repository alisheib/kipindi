// Offline: print the distinct (baseline, branch) pairs of one field, line-diffed for layouts and char-diffed for html.
const fs = require("fs");
const path = require("path");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const base = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json"), "utf8"));
const cur = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json.current.json"), "utf8"));
const [region, kind] = process.argv.slice(2);
const NL = "\n";
const get = (cell, store) => { const r = cell.regions?.[region]; return r && r[kind] ? store[r[kind]] : ""; };
const pairs = new Map();
for (const k of Object.keys(cur.cells).sort()) {
  const a = get(base.cells[k], base.blobs), b = get(cur.cells[k], cur.blobs);
  if (a === b) continue;
  const key = a + "\u0000" + b;
  if (!pairs.has(key)) pairs.set(key, { a, b, keys: [] });
  pairs.get(key).keys.push(k);
}
for (const { a, b, keys } of pairs.values()) {
  console.log(`\n=== ${keys.length} cells: ${keys.join(" ")}`);
  if (kind === "layout") {
    const la = a.split(NL), lb = b.split(NL);
    console.log(`   lines ${la.length} → ${lb.length}`);
    for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) console.log(`   - ${la[i]}\n   + ${lb[i]}`);
  } else {
    // token diff on the html: split on '<'
    const ta = a.split("<"), tb = b.split("<");
    console.log(`   tags ${ta.length} → ${tb.length}`);
    for (let i = 0; i < Math.max(ta.length, tb.length); i++) if (ta[i] !== tb[i]) console.log(`   - <${ta[i]}\n   + <${tb[i]}`);
  }
}
