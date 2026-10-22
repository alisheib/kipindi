/** U43 money-quote red proof: restore the old pre-lock pool and run real bets.
 * Coordinate a source freeze before this disk mutation; it restores byte-for-byte. */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/u43-commit-payout.anchors.mjs";

const [mutation] = MUTATIONS;
const file = new URL(`../${mutation.file}`, import.meta.url);
const cwd = fileURLToPath(new URL("..", import.meta.url));
const original = readFileSync(file);
const changed = injectDefect(original.toString("utf8"), mutation.from, mutation.to);
if (changed === original.toString("utf8")) throw new Error("The payout regression was not planted");
let restored = false;
function restore() {
  if (restored) return;
  writeFileSync(file, original);
  restored = true;
}
process.prependListener("exit", restore);
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(signal, () => { restore(); process.exit(1); });
}

let output = "";
let failed = false;
try {
  writeFileSync(file, changed);
  try {
    output = execSync("npm run test:u43-commit-payout", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000,
    });
  } catch (error) {
    failed = true;
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
} finally {
  restore();
}
if (!readFileSync(file).equals(original)) throw new Error("Payout source was not restored byte-for-byte");
if (!failed || !output.includes("FAIL locked-pool projection wiring")
  || !output.includes("FAIL race after competing bet")) {
  throw new Error(`The old pre-lock quote was not caught by source and real-bet guards: ${output.slice(-1200)}`);
}
console.log("RED old pre-lock quote caught by source and real-bet race; source restored byte-for-byte");
