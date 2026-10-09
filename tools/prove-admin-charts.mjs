// Ad hoc proof: run admin-charts.test.mts inside a MINI-CLONE of the repo (src + tsconfig + package.json copied,
// node_modules JUNCTIONED) — never the real tree — once per plant of scripts/admin-charts-red.mjs, and print exactly
// which assertion(s) go FAIL. Plants are taken verbatim from the harness.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync, symlinkSync, rmdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = "F:/kipindi-rot3";
const harness = readFileSync(join(ROOT, "scripts/admin-charts-red.mjs"), "utf8").replace(/\r\n/g, "\n");
const start = harness.indexOf("const PLANTS = [");
const end = harness.indexOf("\n];\n", start);
const SHELL = join(ROOT, "src/components/admin/admin-shell.tsx");
const CHARTS = join(ROOT, "src/components/admin/admin-charts.tsx");
const PLANTS = new Function("SHELL", "CHARTS", `return ${harness.slice(start + "const PLANTS = ".length, end + 2)}`)(SHELL, CHARTS);
const eol = (s, crlf) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s.replace(/\r\n/g, "\n"));

const T = mkdtempSync(join(tmpdir(), "ac-proof-"));
const link = join(T, "node_modules");
function run() {
  try {
    const out = execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(T, "scripts/admin-charts.test.mts")], { cwd: T, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
}
try {
  mkdirSync(join(T, "scripts"), { recursive: true });
  cpSync(join(ROOT, "scripts/admin-charts.test.mts"), join(T, "scripts/admin-charts.test.mts"));
  cpSync(join(ROOT, "tsconfig.json"), join(T, "tsconfig.json"));
  cpSync(join(ROOT, "package.json"), join(T, "package.json"));
  cpSync(join(ROOT, "src"), join(T, "src"), { recursive: true });
  symlinkSync(join(ROOT, "node_modules"), link, "junction");

  const base = run();
  console.log(`CONTROL (unmutated mini-clone): exit=${base.code}  ${base.out.split("\n").filter((l) => /passed|failed/.test(l)).join(" ").trim()}`);
  if (base.code !== 0) { console.log(base.out.slice(-1500)); process.exitCode = 1; }
  else for (const p of PLANTS) {
    const rel = p.file ? p.file.slice(ROOT.length + 1) : "src/components/admin/admin-charts.tsx";
    const target = join(T, rel);
    const original = readFileSync(target, "utf8");
    const crlf = original.includes("\r\n");
    const from = eol(p.from, crlf), to = eol(p.to, crlf);
    const hits = original.split(from).length - 1;
    console.log(`\nPLANT: ${p.name}\n  file: ${rel}  anchor occurrences: ${hits}`);
    if (hits !== 1) { console.log("  !! anchor not unique/present"); continue; }
    writeFileSync(target, original.replace(from, to));
    const r = run();
    console.log(`  guard exit=${r.code}`);
    for (const l of r.out.split("\n")) if (/^\s*FAIL/.test(l)) console.log("  " + l.trim().slice(0, 230));
    writeFileSync(target, original);
  }
} finally {
  try { if (existsSync(link)) rmdirSync(link); } catch (e) { console.log("!! could not remove junction:", e.message); }
  if (!existsSync(link)) rmSync(T, { recursive: true, force: true });
  else console.log("!! junction still present, NOT deleting", T);
}
