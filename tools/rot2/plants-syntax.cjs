// READ-ONLY. For each mutation in a harness: apply it IN MEMORY (as the harness does) and
//   (1) syntax-check the mutated source with the TypeScript parser (a plant must be real code, not a typo),
//   (2) print the changed region so the plant can be read.
// usage: node plants-syntax.cjs <repoRoot> <harness.cjs> <e64|announce> [onlyNamePrefix]
const { readFileSync } = require("node:fs");
const path = require("node:path");
const [root, harness, kind, only] = process.argv.slice(2);
const ts = require(path.join(root, "node_modules", "typescript"));

const src = readFileSync(path.isAbsolute(harness) ? harness : path.join(root, harness), "utf8");
let table;
if (kind === "e64") {
  const body = src.slice(src.indexOf("const FILE ="), src.indexOf("/** Try the anchor as written"));
  const t = new Function(`${body}; return { FILE, MUTATIONS };`)();
  table = t.MUTATIONS.map((m) => ({ ...m, file: t.FILE }));
} else {
  const body = src.slice(src.indexOf("const ANN ="), src.indexOf("function resolve("));
  table = new Function(`${body}; return { MUTATIONS };`)().MUTATIONS;
}

function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  return text.includes(crlf) ? crlf : null;
}
function syntaxErrors(file, text) {
  const out = ts.transpileModule(text, {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

let bad = 0;
for (const m of table) {
  if (only && !m.name.startsWith(only) && !m.name.includes(only)) continue;
  const file = path.join(root, m.file);
  const original = readFileSync(file, "utf8");
  const find = resolve(original, m.find);
  if (!find) { console.log(`\n### ${m.name}\n   ANCHOR NOT FOUND`); bad++; continue; }
  let mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (m.also) {
    const f2 = resolve(mutated, m.also.find);
    if (!f2) { console.log(`\n### ${m.name}\n   SECOND ANCHOR NOT FOUND`); bad++; continue; }
    mutated = mutated.replace(f2, m.also.with.replace(/\n/g, f2.includes("\r\n") ? "\r\n" : "\n"));
  }
  const errs = syntaxErrors(m.file, mutated);
  const baseErrs = syntaxErrors(m.file, original);
  // changed region: common prefix/suffix by lines
  const a = original.split("\n"), b = mutated.split("\n");
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let ja = a.length - 1, jb = b.length - 1; while (ja >= i && jb >= i && a[ja] === b[jb]) { ja--; jb--; }
  console.log(`\n### ${m.name}`);
  console.log(`   file=${m.file}  syntax errors: original=${baseErrs.length} mutated=${errs.length}${errs.length ? "  <-- " + errs[0] : ""}`);
  console.log(`   lines ${i + 1}..${ja + 1} (original) become ${i + 1}..${jb + 1} (mutated)`);
  const show = (arr, s, e, tag) => { for (let k = s; k <= Math.min(e, s + 14); k++) console.log(`   ${tag} ${arr[k]?.replace(/\r$/, "")}`); if (e - s > 14) console.log(`   ${tag} … (${e - s - 14} more lines)`); };
  show(a, i, ja, "-");
  show(b, i, jb, "+");
  if (errs.length > baseErrs.length) bad++;
}
console.log(bad ? `\n${bad} problem(s)` : "\nall plants parse as real code");
