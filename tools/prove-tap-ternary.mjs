// Ad hoc proof for the 5.1 className-extraction repair: on a COPY of src, change generate-button.tsx's ternary so its
// dense arm no longer NAMES the rung, and demand 5.1 convicts it (and that the untouched ternary is acquitted).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = "F:/kipindi-rot3";
const FILE = "src/app/admin/reports/generate-button.tsx";
const CASES = [
  { name: "UNTOUCHED ternary (names btn-xs inside the ${} )", edit: (s) => s, wantFail51: false },
  { name: "dense arm hand-types 30px instead of naming the rung", edit: (s) => s.replace('"btn-xs" : "btn-sm"', '"h-[30px]" : "btn-sm"'), wantFail51: true },
  { name: "dense arm hand-types the rung's VALUE (32px) instead of naming it", edit: (s) => s.replace('"btn-xs" : "btn-sm"', '"h-[32px]" : "btn-sm"'), wantFail51: true },
];
for (const c of CASES) {
  const dir = mkdtempSync(join(tmpdir(), "tt-proof-"));
  try {
    const src = join(dir, "src");
    cpSync(join(REPO, "src"), src, { recursive: true });
    const f = join(dir, FILE);
    const s = readFileSync(f, "utf8");
    const t = c.edit(s);
    if (c.wantFail51 && t === s) { console.log(`!! ${c.name}: edit did not land`); continue; }
    writeFileSync(f, t);
    const r = spawnSync(process.execPath, [join(REPO, "node_modules/tsx/dist/cli.mjs"), join(REPO, "scripts/tap-target.test.mts")], { cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: src } });
    const out = (r.stdout || "") + (r.stderr || "");
    const fails = out.split("\n").filter((l) => /^FAIL/.test(l));
    const f51 = fails.find((l) => l.startsWith("FAIL 5.1"));
    console.log(`\nCASE: ${c.name}\n  gate exit=${r.status}  5.1 failed=${Boolean(f51)}  (wanted ${c.wantFail51})  other FAILs: ${fails.filter((l) => !l.startsWith("FAIL 5.1")).map((l) => l.slice(0, 6)).join(",") || "none"}`);
    if (f51) console.log("  " + f51.slice(0, 300));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
