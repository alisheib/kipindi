// Offline: which fields differ between the parity baseline and the branch's capture, per cell.
const fs = require("fs");
const path = require("path");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const base = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json"), "utf8"));
const cur = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json.current.json"), "utf8"));
const NL = "\n";
function fieldsOf(cell, store) {
  const f = { status: String(cell.status), landed: String(cell.landed), overlays: (cell.overlays ?? []).join(NL), journey: (cell.journey ?? []).join(","),
    raw: cell.raw ? `${cell.raw.shell ? "shell" : "no shell"} · ${cell.raw.trace.join(",")}` : "(unread)", pageErrors: (cell.pageErrors ?? []).join(NL),
    footerPaddingBottom: String(cell.footerPaddingBottom), scrollPaddingBottom: String(cell.scrollPaddingBottom) };
  for (const [name, r] of Object.entries(cell.regions ?? {})) {
    f[`regions.${name}.count`] = String(r.count);
    f[`regions.${name}.html`] = r.html ? store[r.html] ?? `(missing blob ${r.html})` : "";
    f[`regions.${name}.layout`] = r.layout ? store[r.layout] ?? `(missing blob ${r.layout})` : "";
  }
  if (cell.notFound) { f["notFound.title"] = cell.notFound.title; f["notFound.robots"] = cell.notFound.robots.join(NL); f["notFound.main"] = cell.notFound.main; }
  return f;
}
const byField = new Map();
const keys = Object.keys(cur.cells).sort();
for (const k of keys) {
  const a = fieldsOf(base.cells[k], base.blobs), b = fieldsOf(cur.cells[k], cur.blobs);
  for (const field of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[field] ?? "(absent)") === (b[field] ?? "(absent)")) continue;
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field).push(k);
  }
}
for (const [f, ks] of byField) {
  console.log(`${f}: ${ks.length} cells`);
  const groups = {};
  for (const k of ks) { const [v, l, w, r] = k.split("|"); const g = `${l}|${w}`; groups[g] = (groups[g] ?? 0) + 1; }
  console.log("   by locale|width:", JSON.stringify(groups));
  const routes = {}; for (const k of ks) { const r = k.split("|")[3]; routes[r] = (routes[r] ?? 0) + 1; } console.log("   by route:", JSON.stringify(routes));
  const viewers = {}; for (const k of ks) { const v = k.split("|")[0]; viewers[v] = (viewers[v] ?? 0) + 1; } console.log("   by viewer:", JSON.stringify(viewers));
}
// Distinct (was, now) pairs per field
for (const [f, ks] of byField) {
  const pairs = new Map();
  for (const k of ks) {
    const a = fieldsOf(base.cells[k], base.blobs)[f], b = fieldsOf(cur.cells[k], cur.blobs)[f];
    const key = a + "\u0000" + b;
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(k);
  }
  console.log(`\n${f}: ${pairs.size} distinct (baseline, branch) pairs`);
}
// Sell cells
const sk = Object.keys(cur.sell ?? {});
console.log("\nsell cells in current:", sk.length, "baseline:", Object.keys(base.sell ?? {}).length);
