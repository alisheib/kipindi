// Light pre-check while the full `tsc --noEmit -p .` waits for the shared lock: type-check only the files this
// pass touched (plus whatever they import, which the compiler must read for types) and report diagnostics
// in those files. Not a substitute for the full run.
const path = require("path");
const ts = require(path.join("F:/kipindi-v1/node_modules/typescript"));
const root = "F:/kipindi-v1";
const cfgPath = path.join(root, "tsconfig.json");
const cfg = ts.readConfigFile(cfgPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
const files = process.argv.slice(2).map((f) => path.join(root, f).replace(/\\/g, "/"));
const program = ts.createProgram(files, { ...parsed.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined });
const diags = ts.getPreEmitDiagnostics(program).filter((d) => !d.file || files.includes(d.file.fileName.replace(/\\/g, "/")));
for (const d of diags) {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  if (d.file) {
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    console.log(`${d.file.fileName}:${line + 1}:${character + 1} TS${d.code} ${msg}`);
  } else console.log(`TS${d.code} ${msg}`);
}
console.log(`checked ${files.length} root files (${program.getSourceFiles().length} loaded): ${diags.length} diagnostic(s)`);
process.exit(diags.length ? 1 : 0);
