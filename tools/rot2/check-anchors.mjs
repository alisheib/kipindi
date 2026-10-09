// usage: node check-anchors.mjs <repoRoot> <harness.cjs> <e64|announce>
// READ-ONLY. Evaluates the harness's own MUTATIONS table (without running the harness) and asks the
// repo's shared resolver (scripts/red-anchor.mjs) whether every anchor resolves EXACTLY ONCE in its
// target file. For `also` anchors it applies the first replacement in memory first, as the harness does.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [root, harness, kind] = process.argv.slice(2);
const { resolveAnchor, toEol } = await import(pathToFileURL(`${root}/scripts/red-anchor.mjs`).href);

const src = readFileSync(/^([A-Za-z]:|\/)/.test(harness) ? harness : `${root}/${harness}`, "utf8");
let table;
if (kind === "e64") {
  const start = src.indexOf("const FILE =");
  const end = src.indexOf("/** Try the anchor as written");
  const body = src.slice(start, end);
  table = new Function(`${body}; return { FILE, MUTATIONS };`)();
  table = table.MUTATIONS.map((m) => ({ ...m, file: table.FILE }));
} else {
  const start = src.indexOf("const ANN =");
  const end = src.indexOf("function resolve(");
  const body = src.slice(start, end);
  table = new Function(`${body}; return { MUTATIONS };`)().MUTATIONS;
}

let bad = 0;
for (const m of table) {
  const text = readFileSync(`${root}/${m.file}`, "utf8");
  const r = resolveAnchor(text, m.find);
  let line = `${r.ok ? "OK  once " : "BAD       "} [${m.file}] ${m.name.slice(0, 70)}`;
  if (!r.ok) { bad++; line += `  <-- ${r.reason} (count ${r.count})`; }
  console.log(line);
  if (r.ok && m.also) {
    const mutated = text.replace(r.needle, toEol(m.with, r.eol));
    const r2 = resolveAnchor(mutated, m.also.find);
    console.log(`${r2.ok ? "OK  once " : "BAD       "}   ↳ also-anchor ${JSON.stringify(m.also.find)}`);
    if (!r2.ok) { bad++; console.log(`      <-- ${r2.reason} (count ${r2.count})`); }
  }
}
console.log(bad === 0 ? "\nALL ANCHORS RESOLVE EXACTLY ONCE" : `\n${bad} anchor(s) do NOT resolve exactly once`);
process.exit(bad === 0 ? 0 : 1);
