// test:css-vars-defined — a standalone document is its own scope. src/lib/offline-document.ts (R4-G) writes the
// person-free /offline page with its OWN token map and loads no app stylesheet, so its `"--gilt": …` keys certified the
// app's --gilt: red:css-vars-defined's E-286 control (the real --gilt declaration deleted) went uncaught.
// Also: red:implicit-submit's withdraw/deposit plants anchor on the `submitsForm` line alone (R5-C put a comment
// between it and `trigger={`, so the two-line anchor occurred 0 times).
const fs = require("fs");
const R = "F:/kipindi-vis/";
const edit = (p, pairs) => {
  let s = fs.readFileSync(R + p, "utf8");
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(p + " anchor: " + a.slice(0, 90)); s = s.replace(a, b); }
  fs.writeFileSync(R + p, s);
};
const NL = "\r\n";
const crlf = (t) => t.split("\n").join(NL);

edit("scripts/css-vars-defined.test.mts", [
  [crlf("const defined = new Set<string>();\n/** name -> where it is referenced without a fallback */\nconst used = new Map<string, { file: string; line: number; text: string }[]>();\n"),
   crlf(`const defined = new Set<string>();
/** name -> where it is referenced without a fallback */
const used = new Map<string, { file: string; line: number; text: string }[]>();
/* ⭐ A STANDALONE DOCUMENT IS ITS OWN SCOPE (round 5 of the visual pass, 2026-10-09 — red:css-vars-defined's E-286
   control had gone uncaught since round 4). \`src/lib/offline-document.ts\` writes the person-free /offline page (R4-G)
   with its OWN token map — that document loads no app stylesheet — so its \`"--gilt": …\` keys define --gilt for THAT
   page only. Counted with the app's, they certified the app's --gilt: delete the real declaration from globals.css and
   the gate stayed green. A standalone document's definitions now certify only its own uses, and every token it uses
   must be defined inside it — nothing else reaches that page. */
const STANDALONE = new Set(["src/lib/offline-document.ts"]);
const scoped = new Map<string, { defined: Set<string>; used: Map<string, { file: string; line: number; text: string }[]> }>();
`)],
  [crlf("for (const f of files) {\n  const raw = readFileSync(f, \"utf8\");\n  const isCss = f.endsWith(\".css\");\n  const src = isCss ? decommentCss(raw) : decomment(raw);\n"),
   crlf(`for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const isCss = f.endsWith(".css");
  const src = isCss ? decommentCss(raw) : decomment(raw);
  const rel = relative(ROOT, f).split("\\\\").join("/");
  const scope = STANDALONE.has(rel) ? { defined: new Set<string>(), used: new Map<string, { file: string; line: number; text: string }[]>() } : null;
  if (scope) scoped.set(rel, scope);
  const defined = scope ? scope.defined : globalDefined;
  const used = scope ? scope.used : globalUsed;
`)],
  [crlf("console.log(`css-vars-defined: read ${files.length} files under ${SRC}`);\n"),
   crlf(`const defined = globalDefined, used = globalUsed;
console.log(\`css-vars-defined: read \${files.length} files under \${SRC}\`);
`)],
  [crlf("for (const [name, sites] of orphans) {\n  console.log(`FAIL ${name} is referenced but never defined`);\n  for (const s of sites) console.log(`       ${s.file}:${s.line}  ${s.text}`);\n}\n"),
   crlf(`for (const [name, sites] of orphans) {
  console.log(\`FAIL \${name} is referenced but never defined\`);
  for (const s of sites) console.log(\`       \${s.file}:\${s.line}  \${s.text}\`);
}
// Each standalone document against its own definitions (it loads no app stylesheet).
let scopedOrphans = 0;
for (const [file, sc] of scoped) {
  console.log(\`  standalone \${file}: \${sc.defined.size} defined · \${sc.used.size} referenced without a fallback\`);
  for (const [name, sites] of sc.used) {
    if (sc.defined.has(name)) continue;
    scopedOrphans++;
    console.log(\`FAIL \${name} is referenced but never defined in the standalone \${file}\`);
    for (const s of sites) console.log(\`       \${s.file}:\${s.line}  \${s.text}\`);
  }
}
if (STANDALONE.size !== scoped.size) {
  console.log(\`FAIL a standalone document is missing from the scan: \${[...STANDALONE].filter((f) => !scoped.has(f)).join(", ")}\`);
  scopedOrphans++;
}
`)],
]);
// a standalone orphan fails the gate too
edit("scripts/css-vars-defined.test.mts", [
  [crlf("if (orphans.length > 0) {\n  console.log(`\\ncss-vars-defined: ${orphans.length} undefined custom ${orphans.length === 1 ? \"property\" : \"properties\"}.`);"),
   crlf("if (orphans.length > 0 || scopedOrphans > 0) {\n  console.log(`\\ncss-vars-defined: ${orphans.length + scopedOrphans} undefined custom ${orphans.length + scopedOrphans === 1 ? \"property\" : \"properties\"}.`);")],
]);
// the two global collections get their names
edit("scripts/css-vars-defined.test.mts", [
  [crlf("const defined = new Set<string>();\n/** name -> where it is referenced without a fallback */\nconst used = new Map<string, { file: string; line: number; text: string }[]>();\n/* ⭐ A STANDALONE"),
   crlf("const globalDefined = new Set<string>();\n/** name -> where it is referenced without a fallback */\nconst globalUsed = new Map<string, { file: string; line: number; text: string }[]>();\n/* ⭐ A STANDALONE")],
]);

edit("scripts/implicit-submit.test.mts", [
  ['      world: () => one(WITHDRAW, L("      submitsForm", "      trigger={"), "      trigger={") },',
   '      // Anchored on the prop\'s own line (R5-C put a note between it and `trigger={`, 2026-10-09).\r\n      world: () => one(WITHDRAW, L("      submitsForm", ""), "") },'],
  ['      world: () => one(DEPOSIT, L("      submitsForm", "      trigger={"), "      trigger={") },',
   '      world: () => one(DEPOSIT, L("      submitsForm", ""), "") },'],
]);
console.log("ok");
