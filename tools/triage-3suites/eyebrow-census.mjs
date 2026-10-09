// DIAGNOSTIC ONLY (scratchpad) — a faithful copy of the --tracking census in
// scripts/design-gate/eyebrow-sweep.mjs, printing EVERYTHING instead of stopping at the first exit code:
//   · undeclared sites, each with the exact key that would declare it
//   · declarations that match nothing (stale reads) or match a different number of times
// Usage: node eyebrow-census.mjs [rolesModulePath]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "F:/kipindi-rot2";
const rolesPath = process.argv[2] || join(ROOT, "scripts/design-gate/eyebrow-roles.mjs");
const { INLINE_EYEBROWS, NOT_EYEBROW } = await import(pathToFileURL(rolesPath).href);

const CARRIER = /\brow-link\b/;
const SRC = join(ROOT, "src");
const walk = (d, re = /\.tsx$/) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p, re) : (re.test(e) ? [p] : []);
});

function decomment(src) {
  let out = "", i = 0, mode = 0, quote = "";
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (mode === 0) {
      if (c === "/" && n === "*") { mode = 1; out += "  "; i += 2; continue; }
      if (c === "/" && n === "/") { mode = 2; out += "  "; i += 2; continue; }
      if (c === '"' || c === "'") { mode = 3; quote = c; out += c; i++; continue; }
      if (c === "`") { mode = 4; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 1) { if (c === "*" && n === "/") { mode = 0; out += "  "; i += 2; continue; } out += c === "\n" ? "\n" : " "; i++; continue; }
    if (mode === 2) { if (c === "\n") { mode = 0; out += "\n"; i++; continue; } out += " "; i++; continue; }
    if (c === "\\") { out += "  "; i += 2; continue; }
    if ((mode === 3 && c === quote) || (mode === 4 && c === "`")) mode = 0;
    out += c; i++;
  }
  return out;
}

const TRACK_TOKEN = /\btracking-(?:\[[^\]]*\]|(?:wide|wider|widest)\b)/;
const sig = (lines, i) => {
  const head = (lines[i] ?? "").replace(/\s+/g, " ").trim();
  let tail = "";
  for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
    const t = (lines[j] ?? "").replace(/\s+/g, " ").trim();
    if (t) { tail = t; break; }
  }
  return (head + " ↵ " + tail).slice(0, 170);
};

let onClass = 0, inlineOk = 0, other = 0, onRowLink = 0;
const undeclared = [], badInline = [];
const seenNot = new Map(), seenInline = new Map();

for (const f of walk(SRC, /\.tsx?$/)) {
  const raw = readFileSync(f, "utf8");
  if (!/uppercase/.test(raw) && !CARRIER.test(raw)) continue;
  const rel = relative(SRC, f).split(/[\\/]/).join("/");
  const code = decomment(raw).split("\n");
  const lines = raw.split("\n");
  code.forEach((c, i) => {
    if (!/\buppercase\b/.test(c) && !CARRIER.test(c)) return;
    const line = lines[i];
    if (/\beyebrow\b/.test(c)) { onClass++; return; }
    if (/\brow-link\b/.test(c)) { onRowLink++; return; }
    const k = `${rel} :: ${sig(lines, i)}`;
    if (INLINE_EYEBROWS.has(k)) {
      seenInline.set(k, (seenInline.get(k) ?? 0) + 1);
      const win = lines.slice(Math.max(0, i - 6), i + 7).join(" ");
      if (!/letterSpacing:\s*"0\.14em"|letter-spacing:\s*0\.14em/.test(win)) badInline.push(`${rel}:${i + 1}`);
      else inlineOk++;
      return;
    }
    if (NOT_EYEBROW.has(k)) { seenNot.set(k, (seenNot.get(k) ?? 0) + 1); other++; return; }
    undeclared.push({ where: `${rel}:${i + 1}`, tracked: TRACK_TOKEN.test(line), key: k });
  });
}

const missNot = [...NOT_EYEBROW].filter(([k, v]) => (seenNot.get(k) ?? 0) !== (Array.isArray(v) ? v[1] : 1));
const missInl = [...INLINE_EYEBROWS].filter(([k, n]) => (seenInline.get(k) ?? 0) !== n);

console.log(`onClass=${onClass} inlineOk=${inlineOk} other=${other} onRowLink=${onRowLink}`);
console.log(`\nUNDECLARED (${undeclared.length}):`);
for (const u of undeclared) console.log(`  ${u.where}  ${u.tracked ? "tracked" : "untracked"}\n    KEY: ${JSON.stringify(u.key)}`);
console.log(`\nSTALE / MISCOUNTED NOT_EYEBROW (${missNot.length}):`);
for (const [k, v] of missNot) console.log(`  seen=${seenNot.get(k) ?? 0} want=${Array.isArray(v) ? v[1] : 1} role=${JSON.stringify(v)}\n    KEY: ${JSON.stringify(k)}`);
console.log(`\nSTALE / MISCOUNTED INLINE (${missInl.length}):`);
for (const [k, n] of missInl) console.log(`  seen=${seenInline.get(k) ?? 0} want=${n}\n    KEY: ${JSON.stringify(k)}`);
console.log(`\nbadInline (${badInline.length}): ${badInline.join(", ")}`);
