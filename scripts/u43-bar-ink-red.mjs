/** Mutation proof reads altered stylesheet copies; it never rewrites the shared source. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { MUTATIONS } from "./anchors/u43-bar-ink.anchors.mjs";

const original = readFileSync("src/app/globals.css", "utf8");
const originalPosition = readFileSync("src/components/positions/pnl-summary-strip.tsx", "utf8");
const copy = join(tmpdir(), `u43-bar-ink-${randomUUID()}.css`);
const positionCopy = join(tmpdir(), `u43-position-needle-${randomUUID()}.tsx`);
let failed = 0;
function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failed++;
}
function run(source, position = originalPosition) {
  writeFileSync(copy, source);
  writeFileSync(positionCopy, position);
  const p = spawnSync("npm", ["run", "test:u43-bar-ink", "--silent"], {
    cwd: process.cwd(), encoding: "utf8", shell: process.platform === "win32",
    env: { ...process.env, U43_BAR_CSS: copy, U43_POSITION_SOURCE: positionCopy },
  });
  return { code: p.status, output: `${p.stdout ?? ""}${p.stderr ?? ""}` };
}
function mutation(name, from, to, expected) {
  check(`${name}: target exists`, original.includes(from));
  if (!original.includes(from)) return;
  const result = run(original.replace(from, to));
  check(`${name}: ${expected} turns red`, result.code !== 0 && result.output.includes(`FAIL ${expected} `));
}
function positionMutation(name, from, to) {
  check(`${name}: target exists`, originalPosition.includes(from));
  if (!originalPosition.includes(from)) return;
  const result = run(original, originalPosition.replace(from, to));
  check(`${name}: 1.5 turns red`, result.code !== 0 && result.output.includes("FAIL 1.5 "));
}
try {
  const baseline = run(original);
  check("baseline guard is green", baseline.code === 0);
  for (const item of MUTATIONS.filter((entry) => entry.kind === "css"))
    mutation(item.name, item.from, item.to, item.expected);
  const override = run(`${original}\n:root {\n  --bar-needle: var(--text);\n}\n`);
  check("a late plain override turns the unique-definition guard red", override.code !== 0 && override.output.includes("FAIL 1.2 "));
  for (const item of MUTATIONS.filter((entry) => entry.kind === "position"))
    positionMutation(item.name, item.from, item.to);
} finally {
  unlinkSync(copy);
  unlinkSync(positionCopy);
}
console.log(`U43 BAR INK RED: ${failed} failed`);
process.exit(failed ? 1 : 0);
