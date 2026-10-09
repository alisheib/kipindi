// Read-only validation of qa-first-load's reader against an existing real Turbopack build (no kp-head tie: this
// bypasses the HEAD check on purpose, because that build is another tree's; nothing is written anywhere).
import { pathToFileURL } from "node:url";
const [script, nextDir, ...routes] = process.argv.slice(2);
const m = await import(pathToFileURL(script).href);
const t0 = Date.now();
const build = m.loadBuild(nextDir);
console.log(`loaded ${build.chunks.size} client chunks, ${build.symbolOf.size} loadable ids in ${Date.now() - t0} ms`);
const res = m.readAll(build, routes, { table: m.MARKERS.filter((r) => r.stage === "S6") });
console.log("controlOk", res.controlOk, "|", res.plant.text);
for (const r of res.routes) {
  if (r.missing) { console.log(r.route, "MISSING", r.missing); continue; }
  console.log(`${r.route}: ${r.reading.entries.size} entries; control ${r.found}`);
  for (const { row, j } of r.rows) console.log(`   ${row.id.padEnd(22)} ${String(j?.struct ?? j?.module ?? "-").padEnd(50)} ${j?.mark}  ${j?.verdict}`);
  console.log("   others:", r.others.map((o) => `${o.sym}: ${o.struct}`).join(" ; "));
}
console.log("bad", res.bad);
