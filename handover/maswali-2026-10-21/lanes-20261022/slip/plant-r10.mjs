// plant-r10.mjs — on-disk mutation proof for visual-pass-r10 1.4 (run from the slip worktree).
// Plants the caret's turn onto its wrapper in globals.css, runs the suite, expects "FAIL 1.4 ·", restores the file
// byte for byte, and runs the suite again (green). Prints one verdict line per step.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CSS = "src/app/globals.css";
const run = () => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", "scripts/visual-pass-r10.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
const original = readFileSync(CSS, "utf8");
const cases = [
  ["moved onto the wrapper", ".kp-fsheet[open] > summary .kp-fsheet-caret,", ".kp-fsheet[open] > summary,"],
  ["the wrapper beside the caret", ".kp-fsheet[open] > summary .kp-fsheet-caret,", ".kp-fsheet[open] > summary .kp-fsheet-caret, .kp-fsheet[open] > summary,"],
];
let bad = 0;
try {
  for (const [name, from, to] of cases) {
    if (original.split(from).length !== 2) { console.log(`ANCHOR ${name}: not exactly once`); bad++; continue; }
    writeFileSync(CSS, original.replace(from, to), "utf8");
    const r = run();
    writeFileSync(CSS, original, "utf8");
    const fails = r.out.split("\n").filter((l) => l.includes("FAIL ")).map((l) => l.trim().slice(0, 90));
    const caught = r.code !== 0 && fails.some((l) => l.startsWith("FAIL 1.4 ·"));
    console.log(`${caught ? "caught" : "NOT CAUGHT"} — ${name}: rc=${r.code}; FAIL lines: ${JSON.stringify([...new Set(fails)])}`);
    if (!caught) bad++;
  }
} finally {
  writeFileSync(CSS, original, "utf8");
}
const restored = readFileSync(CSS, "utf8") === original;
const after = run();
const sum = after.out.split("\n").find((l) => l.startsWith("visual-pass-r10:")) ?? "(no summary)";
console.log(`restored byte for byte: ${restored} · after restore rc=${after.code} · ${sum}`);
process.exit(bad === 0 && restored && after.code === 0 ? 0 : 1);
