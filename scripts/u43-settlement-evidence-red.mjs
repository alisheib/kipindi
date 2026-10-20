/** Replant the false band explanation and prove the real closeRound guard catches it. */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/u43-settlement-evidence.anchors.mjs";

const [mutation] = MUTATIONS;
const file = new URL(`../${mutation.file}`, import.meta.url);
const cwd = fileURLToPath(new URL("..", import.meta.url));
const original = readFileSync(file);
const changed = injectDefect(original.toString("utf8"), mutation.from, mutation.to);
if (changed === original.toString("utf8")) throw new Error("The evidence lie was not planted");
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
    output = execSync("npm run test:u43-settlement-evidence", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000,
    });
  } catch (error) {
    failed = true;
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
} finally {
  restore();
}
if (!readFileSync(file).equals(original)) throw new Error("Evidence source was not restored byte-for-byte");
if (!failed || !output.includes("FAIL source mismatch precedes band evidence")
  || !output.includes("FAIL source mismatch evidence names the wrong source without a false band claim")) {
  throw new Error(`The false band explanation was not caught by source and real-round guards: ${output.slice(-1200)}`);
}
console.log("RED false band explanation caught by source and real-round evidence guards; source restored byte-for-byte");
