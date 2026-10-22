// plant.mjs <spec.json> — on-disk mutation proofs, run from the slip worktree.
// spec: [{ name, file, from, to, suite, expect: [prefix of a FAIL line, …] }]
// Each case: the anchor must occur exactly once; the file is planted, the suite runs, every expected FAIL prefix must
// appear (and the run must exit non-zero); the file is restored byte for byte. After all cases each suite runs again on
// the restored tree and must exit 0. Prints one verdict line per case and per suite.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
const run = (suite) => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", suite], { encoding: "utf8", stdio: "pipe", shell: true }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
const failLines = (out) => out.split("\n").map((l) => l.trim()).filter((l) => /^(?:FAIL|✗)\s/.test(l) || / FAIL /.test(` ${l} `));
let bad = 0;
const originals = new Map();
try {
  for (const c of spec) {
    const original = originals.get(c.file) ?? readFileSync(c.file, "utf8");
    originals.set(c.file, original);
    // The file's own line endings: an anchor written with \n is matched as \r\n in a CRLF working file.
    const crlf = original.includes("\r\n");
    const from = crlf ? c.from.split("\n").join("\r\n") : c.from, to = crlf ? c.to.split("\n").join("\r\n") : c.to;
    if (original.split(from).length !== 2) { console.log(`ANCHOR  ${c.name}: not exactly once in ${c.file}`); bad++; continue; }
    writeFileSync(c.file, original.replace(from, to), "utf8");
    const r = run(c.suite);
    writeFileSync(c.file, original, "utf8");
    const fl = failLines(r.out);
    const hit = c.expect.map((p) => fl.some((l) => l.replace(/^(?:FAIL|✗)\s+/, "").startsWith(p) || l.includes(`FAIL ${p}`)));
    const caught = r.code !== 0 && hit.every(Boolean);
    console.log(`${caught ? "caught    " : "NOT CAUGHT"} ${c.name} (${c.suite}) rc=${r.code} — expected ${JSON.stringify(c.expect)} → ${JSON.stringify(hit)}; FAIL lines: ${JSON.stringify([...new Set(fl.map((l) => l.slice(0, 110)))].slice(0, 6))}`);
    if (!caught) bad++;
  }
} finally {
  for (const [f, o] of originals) writeFileSync(f, o, "utf8");
}
const restored = [...originals].every(([f, o]) => readFileSync(f, "utf8") === o);
console.log(`restored byte for byte: ${restored}`);
for (const suite of [...new Set(spec.map((c) => c.suite))]) {
  const r = run(suite);
  const sum = r.out.split("\n").filter((l) => /passed|PASS|FAIL\(S\)|failed/.test(l)).slice(-1)[0]?.trim() ?? "(no summary)";
  console.log(`after restore ${suite}: rc=${r.code} · ${sum}`);
  if (r.code !== 0) bad++;
}
process.exit(bad === 0 && restored ? 0 : 1);
