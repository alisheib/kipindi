// OFFLINE REPLAY of qa:classic-shell-parity — no server, no browser. The harness is a top-level script (it asks a live
// server's /api/health and launches Chromium before anything else), so its pure parts are cut out of its OWN source text,
// verbatim, and run here: (1) --prove-red's synthetic control (§P ① to ②b, everything before "③ The browser"), and
// (2) its §4 compare block, on the two capture files. Nothing is re-implemented.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = process.env.HARNESS ?? "F:/kipindi-r4f/scripts/qa-classic-shell-parity.mjs";
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const src = readFileSync(HARNESS, "utf8").replace(/\r\n/g, "\n");
const cut = (from, to, { inclusiveTo = false } = {}) => {
  const a = src.indexOf(from);
  if (a < 0 || src.indexOf(from, a + 1) >= 0) throw new Error(`marker not unique: ${from}`);
  const b = src.indexOf(to, a);
  if (b < 0) throw new Error(`end marker missing: ${to}`);
  return src.slice(a, inclusiveTo ? b + to.length : b);
};
const A = cut('const NL = "\\n";', "const argv = process.argv.slice(2);");
const B = cut('const KIND = "kp-classic-shell-parity";', "/** What changes between two servers of the SAME tree");
const C = cut("/** What changes between two servers of the SAME tree", "// ── the run ──");
const D = cut("async function proveRed() {", "  // ③ The browser:") + "}\n";
const E = cut("    console.log(`\\n§4 · parity with the baseline", "    if (differing || sellDiffering) {");

const prelude = `
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createHash } from "node:crypto";
const TREE = "F:/kipindi-r4f/";
const BASE = "http://localhost:3041";
const EMAIL_BAR_GONE = !existsSync(join(TREE, "src/components/layout/email-verify-banner.tsx"));
export const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(\`  \${pass ? "PASS" : "FAIL"} \${name}\${detail ? \` — \${String(detail).slice(0, 300)}\` : ""}\`); };
`;
const tail = `
export { EXPECTED_DIFFS, SELL_EXPECTED_DIFFS, diffCells, fieldsOf, partialExpected, missingAlongside, proveRed };
export async function compare(baseline, current) {
  const cells = current.cells, sellCells = current.sell, blobs = current.blobs;
${E}
  return { differing, sellDiffering, hits: [...hits], sellHits: [...sellHits] };
}
`;
const mod = prelude + A + B + C + D + tail;
const out = join(HERE, "replay-gen.mjs");
writeFileSync(out, mod, "utf8");
const R = await import(pathToFileURL(out).href);

console.log(`harness: ${HARNESS}`);
console.log("\n=== (1) --prove-red's synthetic control (§P ① to ②b), offline ===");
await R.proveRed();
const p = R.results.filter(Boolean).length;
console.log(`  ${p}/${R.results.length} synthetic P checks passed`);

console.log("\n=== (2) §4 compare: the baseline vs the visual-pass branch's capture, offline ===");
const base = JSON.parse(readFileSync(join(S, "visual/parity-main-d9b7a5b6.json"), "utf8"));
const cur = JSON.parse(readFileSync(join(S, "visual/parity-main-d9b7a5b6.json.current.json"), "utf8"));
const n0 = R.results.length;
// the compare declares `differing`/`sellDiffering` itself (let inside E) — the wrapper's are shadowed, so read the prints
const r = await R.compare(base, cur);
const cmpResults = R.results.slice(n0);
console.log(`  compare: ${cmpResults.filter(Boolean).length}/${cmpResults.length} checks passed`);
const hits = new Map(r.hits);
for (const e of R.EXPECTED_DIFFS.filter((x) => x.id.startsWith("positions-"))) console.log(`  HIT ${e.id}: ${hits.get(e.id) ?? 0} of ${e.cells}`);

// Which cells each new entry covers, and every field still unnamed (by field, with its cell count).
const NL = "\n";
const cover = new Map(), unnamed = new Map();
for (const k of Object.keys(cur.cells).sort()) {
  const route = k.split("|")[3];
  const d = R.diffCells(route, base.cells[k], cur.cells[k], base.blobs, cur.blobs);
  for (const e of d.expected) { if (!cover.has(e.id)) cover.set(e.id, []); cover.get(e.id).push(k); }
  for (const u of d.unexpected) { if (!unnamed.has(u.field)) unnamed.set(u.field, []); unnamed.get(u.field).push(k); }
}
console.log("\n  cells each entry covers:");
for (const [id, ks] of cover) console.log(`    ${id} (${ks.length}): ${ks.join(" ")}`);
console.log("  fields still unnamed:");
for (const [f, ks] of unnamed) console.log(`    ${f}: ${ks.length} cell(s)`);

// (3) The footer once (A) ships: the classic footer's markup without the journey's balance class, against the baseline.
console.log("\n=== (3) the footer fields once (A) ships ===");
const CLASSIC = 'group-hover:border-text-subtle transition-colors">', JOURNEY = 'group-hover:border-text-subtle transition-colors text-balance">';
let htmlEqual = 0, htmlTotal = 0, layoutEqual = 0, layoutLines = new Map();
for (const k of Object.keys(cur.cells).sort()) {
  const f = (c, store, kind) => store[c.regions.footer[kind]];
  const was = f(base.cells[k], base.blobs, "html"), now = f(cur.cells[k], cur.blobs, "html");
  htmlTotal++;
  if (now.split(JOURNEY).length !== 2) throw new Error(`${k}: the balance class is not on exactly one span`);
  if (now.split(JOURNEY).join(CLASSIC) === was) htmlEqual++;
  const lw = f(base.cells[k], base.blobs, "layout").split(NL), ln = f(cur.cells[k], cur.blobs, "layout").split(NL);
  if (lw.join(NL) === ln.join(NL)) { layoutEqual++; continue; }
  for (let i = 0; i < lw.length; i++) if (lw[i] !== ln[i]) {
    const path = lw[i].split(" ")[0], sigSame = lw[i].split(" ")[2] === ln[i].split(" ")[2];
    const key = `${path}${sigSame ? "" : " (SIGNATURE MOVES)"}`;
    layoutLines.set(key, (layoutLines.get(key) ?? 0) + 1);
  }
}
console.log(`  footer html: with the one balance class taken off its span, ${htmlEqual} of ${htmlTotal} cells equal the baseline byte for byte`);
console.log(`  footer layout: ${layoutEqual} of ${htmlTotal} cells already equal; in the rest, only these lines move (box only, signature kept unless marked):`);
for (const [k, n] of layoutLines) console.log(`    ${k}: ${n} cell(s)`);

// (4) SIMULATED, NOT MEASURED: the branch's capture with its footer as (A) serves it — the footer region's markup is the
// baseline's byte for byte (proved in (3) by taking the one class off); its boxes are taken to be the baseline's, which a
// browser compare must confirm (the moving lines in (3) are the balance's own reflow of the proposals link).
console.log("\n=== (4) SIMULATED post-(A) compare: the branch capture with the classic footer's region set to the baseline's ===");
const sim = JSON.parse(JSON.stringify(cur));
for (const k of Object.keys(sim.cells)) {
  const fb = base.cells[k].regions.footer;
  sim.cells[k].regions.footer = { ...fb };
  for (const id of [fb.html, fb.layout]) if (id) sim.blobs[id] = base.blobs[id];
  // the layout's own signature blobs are referenced by id inside the layout text; copy any the branch lacks
  for (const line of (base.blobs[fb.layout] ?? "").split("\n")) { const sig = line.split(" ")[2]; if (sig && !(sig in sim.blobs)) sim.blobs[sig] = base.blobs[sig]; }
}
const n1 = R.results.length;
await R.compare(base, sim);
const simResults = R.results.slice(n1);
console.log(`  simulated compare: ${simResults.filter(Boolean).length}/${simResults.length} checks passed`);
