// Scratch anchor audit (NOT repo code): parse scripts/anchors/*.anchors.mjs TEXTUALLY in a tree, resolve each mutation's
// `file` and `from`, and count `from` in that tree's file. Usage: node anchor-audit.mjs <repo> <tree> <filesListPath> [baseTree]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const [repo, tree, listPath, baseTree] = process.argv.slice(2);
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const blob = (t, p) => { try { return git("cat-file", "-p", `${t}:${p}`).replace(/\r\n/g, "\n"); } catch { return null; } };
const watched = new Set(readFileSync(listPath, "utf8").split(/\r?\n/).filter(Boolean));
const anchorFiles = git("ls-tree", "--name-only", `${tree}:scripts/anchors`).split("\n").filter((f) => f.endsWith(".mjs")).map((f) => `scripts/anchors/${f}`);

// A tiny evaluator for the shapes anchors use: string literals, consts, + concatenation, [..].join(X), String.fromCharCode(10).
function lexString(src, i) {
  const q = src[i]; let out = ""; i++;
  while (i < src.length && src[i] !== q) {
    if (src[i] === "\\") {
      const c = src[i + 1];
      const map = { n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'", '"': '"', "`": "`", $: "$", "0": "\0" };
      if (c === "u") { const h = src.slice(i + 2, i + 6); out += String.fromCharCode(parseInt(h, 16)); i += 6; continue; }
      if (c === "x") { out += String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16)); i += 4; continue; }
      if (c === "\n") { i += 2; continue; }
      out += map[c] ?? c; i += 2; continue;
    }
    if (q === "`" && src[i] === "$" && src[i + 1] === "{") return { err: "template-interp", end: i };
    out += src[i]; i++;
  }
  return { val: out, end: i + 1 };
}
function evalExpr(src, i, consts) {
  // returns { val, end } or { err }
  const skip = () => { while (i < src.length && /[\s]/.test(src[i])) i++; while (src.startsWith("//", i)) { i = src.indexOf("\n", i); if (i < 0) i = src.length; while (i < src.length && /\s/.test(src[i])) i++; } };
  let acc = null;
  const term = () => {
    skip();
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { const r = lexString(src, i); if (r.err) return r; i = r.end; return { val: r.val }; }
    if (c === "[") {
      i++; const items = [];
      for (;;) { skip(); if (src[i] === "]") { i++; break; } const r = evalExpr(src, i, consts); if (r.err) return r; items.push(r.val); i = r.end; skip(); if (src[i] === ",") i++; }
      skip();
      if (src.startsWith(".join(", i)) { i += 6; const r = evalExpr(src, i, consts); if (r.err) return r; i = r.end; skip(); if (src[i] === ")") i++; return { val: items.join(r.val) }; }
      return { err: "array-without-join" };
    }
    if (src.startsWith("String.fromCharCode(", i)) { i += 20; const m = /^\s*(\d+)\s*\)/.exec(src.slice(i)); if (!m) return { err: "fromCharCode" }; i += m[0].length; return { val: String.fromCharCode(Number(m[1])) }; }
    if (src.startsWith("String(", i)) { i += 7; const m = /^\s*(\d+)\s*\)/.exec(src.slice(i)); if (!m) return { err: "String()" }; i += m[0].length; return { val: m[1] }; }
    const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
    if (m) {
      i += m[0].length;
      // method chains like X.replace("a", "b") are evaluated for .replace / .split().join()
      let v = consts.get(m[0]); if (v === undefined) return { err: `ident ${m[0]}` };
      for (;;) {
        skip();
        if (src.startsWith(".replace(", i)) { i += 9; const a = evalExpr(src, i, consts); if (a.err) return a; i = a.end; skip(); i++; const b = evalExpr(src, i, consts); if (b.err) return b; i = b.end; skip(); i++; v = v.replace(a.val, b.val); continue; }
        break;
      }
      return { val: v };
    }
    return { err: `unparsed ${JSON.stringify(src.slice(i, i + 20))}` };
  };
  const t0 = term(); if (t0.err) return { err: t0.err }; acc = t0.val;
  for (;;) {
    skip();
    if (src[i] === "+") { i++; const t = term(); if (t.err) return { err: t.err }; acc += t.val; continue; }
    break;
  }
  return { val: acc, end: i };
}
const report = [];
for (const af of anchorFiles) {
  const src = blob(tree, af); if (!src) continue;
  const consts = new Map();
  for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*/gm)) {
    const r = evalExpr(src, m.index + m[0].length, consts);
    if (!r.err) consts.set(m[1], r.val);
  }
  // each `file:` … `from:` pair inside an object
  for (const m of src.matchAll(/\bfile:\s*/g)) {
    const f = evalExpr(src, m.index + m[0].length, consts);
    if (f.err) continue;
    const objEnd = src.indexOf("\n  }", m.index);
    const fromAt = src.slice(m.index, objEnd > 0 ? objEnd : undefined).search(/\bfrom:\s*/);
    if (fromAt < 0) continue;
    const fm = /\bfrom:\s*/.exec(src.slice(m.index + fromAt));
    const fr = evalExpr(src, m.index + fromAt + fm[0].length, consts);
    const nameM = /name:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)/.exec(src.slice(Math.max(0, m.index - 600), m.index).split(/\n  \{/).pop() ?? "");
    const file = f.val;
    if (!watched.has(file)) continue;
    const body = blob(tree, file);
    const count = (s, sub) => (s === null ? -1 : sub === "" ? -2 : s.split(sub).length - 1);
    const n = fr.err ? null : count(body, fr.val);
    const nb = baseTree && !fr.err ? count(blob(baseTree, file), fr.val) : null;
    const markers = body ? (body.match(/^(<<<<<<< |>>>>>>> )/gm) ?? []).length / 2 : 0;
    if (fr.err || n !== 1 || (nb !== null && nb !== 1)) report.push({ anchor: af.replace("scripts/anchors/", ""), name: nameM ? nameM[1].slice(1, 90) : "?", file, final: fr.err ? `UNPARSED(${fr.err})` : n, base: nb, conflictsInFile: markers });
  }
}
console.log(JSON.stringify(report, null, 1));
console.log(`checked anchors in ${anchorFiles.length} files; ${report.length} need a look`);
