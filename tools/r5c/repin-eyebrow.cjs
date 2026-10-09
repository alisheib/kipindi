// Re-pin eyebrow-roles.mjs: swap each stale key for the site's new signature (eyebrow-sweep.mjs's own `sig`), role kept.
const fs = require("fs");
const ROOT = "F:/kipindi-r5c/";
const sig = (lines, i) => {
  const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
  let tail = "";
  for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
    const t = (lines[j] ?? "").replace(/\s+/g, " ").trim();
    if (t) { tail = t; break; }
  }
  return (head + " ↵ " + tail).slice(0, 170);
};
// [rel (under src/), line (1-based), line number of the stale entry in eyebrow-roles.mjs]
const SITES = [
  ["app/markets/[id]/page.tsx", 536, 245],
  ["app/profile/page.tsx", 447, 256],
  ["app/results/page.tsx", 621, 258],
  ["app/wallet/wallet-client.tsx", 300, 280],
  ["app/wallet/wallet-client.tsx", 371, 279],
  ["components/layout/avatar-menu.tsx", 302, 301],
  ["components/onboarding/first-visit-primer.tsx", 225, 315],
  ["components/ui/cashback-promo.tsx", 76, 322],
];
const P = ROOT + "scripts/design-gate/eyebrow-roles.mjs";
const raw = fs.readFileSync(P, "utf8");
const crlf = raw.includes("\r\n");
const rows = raw.replace(/\r\n/g, "\n").split("\n");
for (const [rel, line, row] of SITES) {
  const lines = fs.readFileSync(ROOT + "src/" + rel, "utf8").split("\n");
  const key = `${rel} :: ${sig(lines, line - 1)}`;
  const old = rows[row - 1];
  const m = /^(\s*)\["(?:[^"\\]|\\.)*", ("[A-Z_]+")\],?$/.exec(old);
  if (!m || !old.includes(rel)) { console.log("NO MATCH at row", row, old.slice(0, 120)); process.exit(1); }
  rows[row - 1] = `${m[1]}[${JSON.stringify(key)}, ${m[2]}],`;
  console.log(`row ${row}: ${rel}:${line} → ${m[2]}\n   ${key}`);
}
let out = rows.join("\n");
if (crlf) out = out.replace(/\n/g, "\r\n");
fs.writeFileSync(P, out);
console.log("written", crlf ? "(CRLF)" : "(LF)");
