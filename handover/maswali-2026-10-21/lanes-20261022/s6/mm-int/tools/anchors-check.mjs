// Read-only helper (not repo code): for anchor files in tree TA, extract { file, from } pairs and count each `from`
// in the target file as it stands in trees MERGED, T and INT. Usage:
//   node anchors-check.mjs <repo> <TA> <MERGED> <T> <INT> <targets-list-file> <anchor-file>...
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [repo, TA, MERGED, TT, INT, targetsList, ...anchorFiles] = process.argv.slice(2);
const targets = new Set(readFileSync(targetsList, "utf8").split(/\r?\n/).filter(Boolean));
const cache = new Map();
const blob = (tree, path) => {
  const k = `${tree}:${path}`;
  if (cache.has(k)) return cache.get(k);
  let v = null;
  try { v = execFileSync("git", ["-C", repo, "cat-file", "-p", k], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).replace(/\r\n/g, "\n"); } catch { v = null; }
  cache.set(k, v);
  return v;
};

// Minimal JS tokenizer for string literals, identifiers and punctuation.
function tokenize(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = "";
      while (j < n && src[j] !== c) {
        if (src[j] === "\\") {
          const e = src[j + 1];
          if (e === "n") s += "\n"; else if (e === "t") s += "\t"; else if (e === "r") s += "\r";
          else if (e === "u") { if (src[j + 2] === "{") { const k = src.indexOf("}", j); s += String.fromCodePoint(parseInt(src.slice(j + 3, k), 16)); j = k - 1; } else { s += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16)); j += 4; } }
          else if (e === "\n") { /* line continuation */ }
          else s += e;
          j += 2;
        } else { s += src[j]; j++; }
      }
      out.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (c === "`") {
      let j = i + 1, s = "", dyn = false, depth = 0;
      while (j < n) {
        if (src[j] === "\\") { const e = src[j + 1]; s += e === "n" ? "\n" : e === "t" ? "\t" : e; j += 2; continue; }
        if (src[j] === "$" && src[j + 1] === "{") { dyn = true; depth = 1; j += 2; while (j < n && depth > 0) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; } continue; }
        if (src[j] === "`") break;
        s += src[j]; j++;
      }
      out.push({ t: dyn ? "tpl" : "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++; out.push({ t: "id", v: src.slice(i, j) }); i = j; continue; }
    if (/\s/.test(c)) { i++; continue; }
    out.push({ t: "p", v: c });
    i++;
  }
  return out;
}

function evalExpr(toks, k, consts) {
  // literal/identifier (+ literal/identifier)* ; stops at , or } or ]
  let s = "", ok = true, any = false;
  while (k < toks.length) {
    const tk = toks[k];
    if (tk.t === "str") { s += tk.v; any = true; k++; }
    else if (tk.t === "id" && consts.has(tk.v) && !(toks[k + 1] && toks[k + 1].t === "p" && (toks[k + 1].v === "[" || toks[k + 1].v === "(" || toks[k + 1].v === "."))) { s += consts.get(tk.v); any = true; k++; }
    else { ok = false; break; }
    if (toks[k] && toks[k].t === "p" && toks[k].v === "+") { k++; continue; }
    break;
  }
  if (toks[k] && !(toks[k].t === "p" && (toks[k].v === "," || toks[k].v === "}" || toks[k].v === "]" || toks[k].v === ";" || toks[k].v === ")"))) ok = false;
  return { ok: ok && any, v: s };
}

const results = [];
for (const af of anchorFiles) {
  const src = blob(TA, af);
  if (src === null) { results.push({ af, err: "anchor file missing in TA" }); continue; }
  const toks = tokenize(src);
  const consts = new Map();
  for (let k = 0; k + 3 < toks.length; k++) {
    if (toks[k].t === "id" && (toks[k].v === "const" || toks[k].v === "let") && toks[k + 1].t === "id" && toks[k + 2].t === "p" && toks[k + 2].v === "=") {
      const e = evalExpr(toks, k + 3, consts);
      if (e.ok) consts.set(toks[k + 1].v, e.v);
    }
  }
  // find object literals with both file: and from:
  for (let k = 0; k < toks.length; k++) {
    if (!(toks[k].t === "id" && toks[k].v === "file" && toks[k + 1] && toks[k + 1].t === "p" && toks[k + 1].v === ":")) continue;
    const fe = evalExpr(toks, k + 2, consts);
    if (!fe.ok) continue;
    const file = fe.v;
    if (!targets.has(file)) continue;
    // scan backward to the object's opening brace and forward to its closing brace
    let depth = 0, start = k;
    for (let b = k; b >= 0; b--) { const tk = toks[b]; if (tk.t === "p" && tk.v === "}") depth++; if (tk.t === "p" && tk.v === "{") { if (depth === 0) { start = b; break; } depth--; } }
    depth = 0; let end = toks.length - 1;
    for (let f = start + 1; f < toks.length; f++) { const tk = toks[f]; if (tk.t === "p" && tk.v === "{") depth++; if (tk.t === "p" && tk.v === "}") { if (depth === 0) { end = f; break; } depth--; } }
    let name = "", from = null, fromOk = true;
    for (let f = start + 1; f < end; f++) {
      if (toks[f].t === "id" && toks[f + 1] && toks[f + 1].t === "p" && toks[f + 1].v === ":" ) {
        if (toks[f].v === "name" || toks[f].v === "id") { const e = evalExpr(toks, f + 2, consts); if (e.ok && !name) name = e.v; }
        if (toks[f].v === "from" || toks[f].v === "anchor" || toks[f].v === "find") { const e = evalExpr(toks, f + 2, consts); if (e.ok) from = e.v; else fromOk = false; }
      }
    }
    if (from === null) { if (!fromOk) results.push({ af, file, name, err: "from not a static literal" }); continue; }
    const count = (s, sub) => { if (s === null) return "n/a"; let c = 0, p = 0; while ((p = s.indexOf(sub, p)) !== -1) { c++; p += Math.max(1, sub.length); } return c; };
    results.push({ af, file, name, m: count(blob(MERGED, file), from), t: count(blob(TT, file), from), i: count(blob(INT, file), from), from: from.slice(0, 110).replace(/\n/g, "\\n") });
  }
}
for (const r of results) {
  if (r.err) { console.log(`?? ${r.af} :: ${r.file ?? ""} ${r.name ?? ""} — ${r.err}`); continue; }
  const flag = r.m === 1 ? "ok " : "BAD";
  if (flag === "BAD" || process.env.ALL) console.log(`${flag} merged=${r.m} T=${r.t} int=${r.i} | ${r.af} | ${r.file} | ${r.name} | ${r.from}`);
}
console.log(`checked ${results.filter((r) => !r.err).length} anchored entries; ${results.filter((r) => !r.err && r.m !== 1).length} not exactly once in MERGED; ${results.filter((r) => r.err).length} unparsed`);
