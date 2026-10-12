import { readFileSync, writeFileSync } from "node:fs";
const D = process.argv[2];
const b = (n) => readFileSync(`${D}/omega/s7a9a/${n}.mjs`, "utf8");
const breaks = [
  ["broken-markers", `if (k.t === "comment" && k.data === "$!") { counts.markers++;`, `if (k.t === "comment" && k.data === "$!!") { counts.markers++;`],
  ["broken-comments", "if (k.t === \"comment\") { sink.push(", "if (k.t === \"comment\") { continue; sink.push("],
  ["broken-segment-ids", "return `${v[0]}:~`;", "return v;"],
  ["broken-main", "if (main) walk(k.kids, 0, out.main);", ""],
  ["broken-shell-time", "|requestAnimationFrame\(function\(\)\{\$RT=)/", ")/"],
  ["broken-template-owner", "if (k.tag === \"head\" || headOwned(k) || isDigestTemplate(k)) continue;", "if (k.tag === \"head\" || headOwned(k)) continue;"],
  ["broken-growth", "const grew = COUNTS.filter((k) => fb.bailouts.counts[k] > fa.bailouts.counts[k]);", "const grew = [];"],
];
const m = b("broken-markers");
const [_, from, to] = breaks[0];
if (m.split(to).length !== 2) { console.log("markers anchor count", m.split(to).length - 1); process.exit(1); }
const orig = m.replace(to, from);
let ok = true;
for (const [name, f, t] of breaks) {
  const n = orig.split(f).length - 1;
  const same = orig.replace(f, t) === b(name);
  console.log(`${name}: from occurs ${n}x; reproduces broken copy: ${same}`);
  if (!same) ok = false;
}
writeFileSync(`${D}/qa-served-skeleton.reconstructed.mjs`, orig);
console.log(ok ? "RECONSTRUCTED EXACTLY" : "MISMATCH", orig.length, "chars", orig.includes("\r\n") ? "CRLF" : "LF");
