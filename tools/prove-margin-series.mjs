// Ad hoc proof: run margin-series.test.mts against a COPY (never the real tree), once per plant of the harness,
// and print exactly which assertion(s) go FAIL. Plants are taken verbatim from scripts/margin-series-red.mjs.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const ROOT = "F:/kipindi-rot3";
const harness = readFileSync(join(ROOT, "scripts/margin-series-red.mjs"), "utf8").replace(/\r\n/g, "\n");
const start = harness.indexOf("const PLANTS = [");
const end = harness.indexOf("\n];\n", start);
const SRC = join(ROOT, "src/lib/server/analytics.ts");
const FINANCE = join(ROOT, "src/app/admin/finance/page.tsx");
const PLANTS = new Function("SRC", "FINANCE", `return ${harness.slice(start + "const PLANTS = ".length, end + 2)}`)(SRC, FINANCE);
const eol = (s, crlf) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s.replace(/\r\n/g, "\n"));

for (const p of PLANTS) {
  const T = mkdtempSync(join(tmpdir(), "ms-proof-"));
  try {
    mkdirSync(join(T, "scripts"), { recursive: true });
    cpSync(join(ROOT, "scripts/margin-series.test.mts"), join(T, "scripts/margin-series.test.mts"));
    for (const f of [SRC, FINANCE]) {
      const rel = f.slice(ROOT.length + 1);
      mkdirSync(dirname(join(T, rel)), { recursive: true });
      cpSync(f, join(T, rel));
    }
    const rel = p.file.slice(ROOT.length + 1);
    const target = join(T, rel);
    const original = readFileSync(target, "utf8");
    const crlf = original.includes("\r\n");
    const from = eol(p.from, crlf), to = eol(p.to, crlf);
    const hits = original.split(from).length - 1;
    console.log(`\nPLANT: ${p.name}\n  anchor occurrences in file: ${hits}`);
    if (hits !== 1) { console.log("  !! anchor not unique/present"); continue; }
    writeFileSync(target, original.replace(from, to));
    let out = "", code = 0;
    try { out = execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(T, "scripts/margin-series.test.mts")], { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); }
    catch (e) { code = e.status ?? -1; out = `${e.stdout ?? ""}${e.stderr ?? ""}`; }
    console.log(`  guard exit=${code}`);
    for (const l of out.split("\n")) if (/^\s*FAIL/.test(l)) console.log("  " + l.trim().slice(0, 200));
  } finally {
    rmSync(T, { recursive: true, force: true });
  }
}
