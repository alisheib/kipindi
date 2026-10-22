/** Mutation proof for U43 B2. Each injected defect must trip its named guard. */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS as mutations } from "./anchors/u43-b2.anchors.mjs";

const cwd = fileURLToPath(new URL("..", import.meta.url));

let caught = 0;
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const selected = only
  ? mutations.filter((mutation) => mutation.name === only)
  : mutations;
if (selected.length === 0) throw new Error(`Unknown B2 mutation: ${only}`);
for (const mutation of selected) {
  const file = new URL(`../${mutation.file}`, import.meta.url);
  const original = readFileSync(file, "utf8");
  const changed = injectDefect(original, mutation.from, mutation.to);
  if (changed === original) throw new Error(`Mutation did not change ${mutation.name}`);
  writeFileSync(file, changed);
  try {
    let output = "", failed = false;
    try {
      output = execSync("npm run test:u43-b2", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      failed = true;
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    if (!failed || !output.includes(`FAIL ${mutation.expected}`)) {
      throw new Error(`Guard missed ${mutation.name}: ${output.slice(-900)}`);
    }
    caught++;
    console.log(`RED ${mutation.name}`);
  } finally {
    writeFileSync(file, original);
  }
}
console.log(`RED PROOF ${caught}/${selected.length}`);
