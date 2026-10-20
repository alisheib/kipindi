/** Physical reversal proof for ordinary refund atomicity. Run alone. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { MUTATIONS } from "./anchors/settle-refund-atomic.anchors.mjs";

const marketPath = "src/lib/server/market-service.ts";
const bonusPath = "src/lib/server/bonus-service.ts";
const env = { ...process.env, EMAIL_OUTBOX_CAPTURE: "1", POSTMARK_API_KEY: "", SMS_PROVIDER: "console" };
delete env.DATABASE_URL;
delete env.VERIFY_DATABASE_URL;
const run = () => {
  const r = spawnSync("npx", ["tsx", "scripts/settle-refund-atomic.test.mts"], {
    encoding: "utf8", shell: process.platform === "win32", env,
  });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const green = run();
if (green.code !== 0 || !green.out.includes("settle-refund-atomic: 28 passed, 0 failed (memory)")) {
  console.error("REFUSING: memory control is not green");
  process.exit(1);
}

const cases = MUTATIONS;

let caught = 0;
for (const plant of cases) {
  const original = readFileSync(plant.file, "utf8");
  const begin = original.indexOf(plant.start);
  const end = original.indexOf(plant.end, begin + plant.start.length);
  if (begin < 0 || end < 0 || end <= begin) throw new Error(`${plant.name}: scope absent`);
  const scope = original.slice(begin, end);
  const from = original.includes("\r\n") ? plant.from.replace(/\n/g, "\r\n") : plant.from;
  const to = original.includes("\r\n") ? plant.to.replace(/\n/g, "\r\n") : plant.to;
  if (scope.split(from).length !== 2) throw new Error(`${plant.name}: exact plant anchor is not unique`);
  const mutated = original.slice(0, begin) + scope.replace(from, to) + original.slice(end);
  try {
    writeFileSync(plant.file, mutated, "utf8");
    const red = run();
    if (red.code === 0 || !red.out.includes(plant.expect)) {
      throw new Error(`${plant.name}: expected failure at ${plant.expect} was not observed`);
    }
    caught++;
    console.log(`caught ${plant.name} at ${plant.expect}`);
  } finally {
    writeFileSync(plant.file, original, "utf8");
  }
  if (readFileSync(plant.file, "utf8") !== original) throw new Error(`${plant.name}: source restoration failed`);
}
const restored = run();
if (restored.code !== 0 || !restored.out.includes("settle-refund-atomic: 28 passed, 0 failed (memory)")) {
  throw new Error("green control failed after source restoration");
}
console.log(`settle-refund-atomic red: ${caught}/${cases.length} caught, source restored, green control passed`);
