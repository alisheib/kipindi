// DIAGNOSTIC / PATCH HELPER ONLY (scratchpad). The --tracking census of scripts/design-gate/eyebrow-sweep.mjs as a
// function: returns the undeclared sites (with the exact key that would declare each) and the stale declarations.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const CARRIER = /\brow-link\b/;

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

export async function census(root, rolesPath) {
  const { INLINE_EYEBROWS, NOT_EYEBROW } = await import(pathToFileURL(rolesPath).href + "?v=" + Date.now());
  const SRC = join(root, "src");
  const walk = (d, re = /\.tsx?$/) => readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p, re) : (re.test(e) ? [p] : []);
  });
  let onClass = 0, inlineOk = 0, other = 0, onRowLink = 0;
  const undeclared = [], badInline = [];
  const seenNot = new Map(), seenInline = new Map();
  for (const f of walk(SRC)) {
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
      undeclared.push({ where: `${rel}:${i + 1}`, rel, line: i + 1, tracked: TRACK_TOKEN.test(line), key: k });
    });
  }
  const missNot = [...NOT_EYEBROW].filter(([k, v]) => (seenNot.get(k) ?? 0) !== (Array.isArray(v) ? v[1] : 1)).map(([k, v]) => ({ key: k, role: v, seen: seenNot.get(k) ?? 0 }));
  const missInl = [...INLINE_EYEBROWS].filter(([k, n]) => (seenInline.get(k) ?? 0) !== n).map(([k, n]) => ({ key: k, want: n, seen: seenInline.get(k) ?? 0 }));
  return { onClass, inlineOk, other, onRowLink, undeclared, badInline, missNot, missInl };
}
