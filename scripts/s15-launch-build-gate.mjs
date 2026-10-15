/**
 * A release-path gate, not just an optional npm predeploy task. `prebuild`,
 * `start`, and next.config.ts call it, including direct `next build/start`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { s15LaunchBuildDecision } from "./lib/s15-launch-build-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let source;
try {
  source = readFileSync(resolve(root, "src/lib/feature-state.ts"), "utf8");
} catch {
  console.error("S15 launch build gate REFUSED: feature-state.ts is unreadable");
  process.exit(2);
}
const decision = s15LaunchBuildDecision(source);
if (decision.kind === "refuse") {
  console.error(`S15 launch build gate REFUSED: ${decision.reason}`);
  process.exit(2);
}
if (decision.kind === "candidate") {
  console.log("S15 launch build gate: isolated prelaunch candidate; production publication is still blocked");
  process.exit(0);
}
if (decision.kind === "preview") process.exit(0);

const gate = spawnSync(process.execPath, [resolve(root, "scripts/s15-release-preflight.mjs")], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (gate.error || gate.status !== 0) {
  if (gate.error) console.error(`S15 launch build gate REFUSED: ${gate.error.message}`);
  process.exit(gate.status || 2);
}
