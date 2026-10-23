// par-diffs.mjs <compare.log> — every ✗ line of a parity compare, grouped by what differs, so each kind can be named.
import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter((l) => /^\s+✗ /.test(l));
const groups = new Map();
for (const l of lines) {
  const body = l.replace(/^\s+✗ /, "");
  const [cell, ...rest] = body.split(" — ");
  const detail = rest.join(" — ");
  let kind;
  if (/data-viewer=\\?"guest/.test(detail)) kind = "main gains data-viewer=\"guest\" (DOM attribute)";
  else if (/regions\.main\.layout/.test(detail)) kind = "main layout: " + detail.replace(/[0-9]+ of [0-9]+/, "N of M").slice(0, 160);
  else if (/Timeout/.test(detail)) kind = "capture timeout";
  else kind = detail.replace(/character [0-9]+/, "character N").slice(0, 200);
  if (!groups.has(kind)) groups.set(kind, []);
  groups.get(kind).push(cell);
}
for (const [k, cells] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${cells.length} × ${k}`);
  for (const c of cells.slice(0, 40)) console.log("     " + c);
}
