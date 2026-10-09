// Offline: measure the /positions body's layout pairs (baseline line -> branch line) per width and locale, from the
// two capture files; report which lines are shared by en and sw, and print them as JS literals.
const fs = require("fs");
const path = require("path");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const base = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json"), "utf8"));
const cur = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json.current.json"), "utf8"));
const NL = "\n";
const lay = (c, store) => store[c.regions.main.layout];
const pairsOf = (k) => {
  const a = lay(base.cells[k], base.blobs).split(NL), b = lay(cur.cells[k], cur.blobs).split(NL);
  if (a.length !== b.length) throw new Error(`${k}: line count ${a.length} vs ${b.length}`);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    // Only the box may move: the path and the signature stay.
    const [pa, ga, sa] = a[i].split(" "), [pb, gb, sb] = b[i].split(" ");
    if (pa !== pb || sa !== sb) throw new Error(`${k}: line ${i} moves more than its box: ${a[i]} -> ${b[i]}`);
    out.push([a[i], b[i]]);
  }
  return out;
};
const res = {};
for (const w of [360, 768, 1024, 1280]) {
  for (const l of ["en", "sw"]) {
    const ref = pairsOf(`player|${l}|${w}|/positions`);
    for (const v of ["held", "unverified"]) {
      const p = pairsOf(`${v}|${l}|${w}|/positions`);
      if (JSON.stringify(p) !== JSON.stringify(ref)) throw new Error(`${v}|${l}|${w}: pairs differ from the player's`);
    }
    res[`${l}|${w}`] = ref;
  }
}
const shared = {}, own = { en: {}, sw: {} };
for (const w of [360, 768, 1024, 1280]) {
  const en = res[`en|${w}`], sw = res[`sw|${w}`];
  const enSet = new Set(en.map((p) => JSON.stringify(p))), swSet = new Set(sw.map((p) => JSON.stringify(p)));
  shared[w] = en.filter((p) => swSet.has(JSON.stringify(p)));
  own.en[w] = en.filter((p) => !swSet.has(JSON.stringify(p)));
  own.sw[w] = sw.filter((p) => !enSet.has(JSON.stringify(p)));
  console.log(`${w}: en ${en.length} pairs, sw ${sw.length}, shared ${shared[w].length}, en-only ${own.en[w].length}, sw-only ${own.sw[w].length}`);
}
// Each line's box change, as dy / dh
for (const w of [360, 768, 1024, 1280]) for (const [a, b] of [...shared[w], ...own.en[w], ...own.sw[w]]) {
  const g = (s) => s.split(" ")[1].match(/^(-?[\d.]+),(-?[\d.]+),([\d.]+)x([\d.]+)$/).slice(1).map(Number);
  const [x0, y0, w0, h0] = g(a), [x1, y1, w1, h1] = g(b);
  if (x0 !== x1 || w0 !== w1) throw new Error(`x or width moves: ${a} -> ${b}`);
  const dy = y1 - y0, dh = h1 - h0;
  if (!((dy === 0 && dh === -14) || (dy === -14 && dh === 0))) throw new Error(`not a 14px crop: ${a} -> ${b}`);
}
console.log("every moved line: x and width unchanged; either its top 14px higher or its height 14px less");
const lit = (p) => `[${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}]`;
let out = "";
for (const w of [360, 768, 1024, 1280]) out += `  // ${w}\n` + shared[w].map((p) => `  ${lit(p)},`).join("\n") + "\n";
out += "EN\n";
for (const w of [360, 768, 1024, 1280]) out += own.en[w].map((p) => `  ${lit(p)},`).join("\n") + "\n";
out += "SW\n";
for (const w of [360, 768, 1024, 1280]) out += own.sw[w].map((p) => `  ${lit(p)},`).join("\n") + "\n";
fs.writeFileSync(path.join(S, "r4f/pairs-literal.txt"), out);
console.log("written pairs-literal.txt");
