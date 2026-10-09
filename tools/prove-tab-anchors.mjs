// Ad hoc proof: run tab-anchors.test.mts via KP_SRC on a COPY of src, once per declared mutation, and print every FAIL line.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MUTATIONS } from "file:///F:/kipindi-rot3/scripts/anchors/tab-anchors.anchors.mjs";

const REPO = "F:/kipindi-rot3";
for (const m of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), "ta-proof-"));
  try {
    const src = join(dir, "src");
    cpSync(join(REPO, "src"), src, { recursive: true });
    const f = join(src, m.file.replace(/^src\//, ""));
    const s = readFileSync(f, "utf8");
    const hits = s.split(m.from).length - 1;
    writeFileSync(f, s.replace(m.from, m.to));
    const r = spawnSync("npx", ["tsx", join(REPO, "scripts/tab-anchors.test.mts")], { cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: src }, shell: true });
    const out = (r.stdout || "") + (r.stderr || "");
    console.log(`\nPLANT: ${m.name}\n  anchor occurrences: ${hits}   gate exit=${r.status}   found-links line: ${(out.match(/§1 · .*/) || [""])[0]}`);
    for (const l of out.split("\n")) if (/FAIL/.test(l)) console.log("  " + l.trim().slice(0, 220));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
