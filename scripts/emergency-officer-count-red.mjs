/** Physical mutation proof for the officer count copy. Restores exact bytes. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MUTATIONS as plants } from "./anchors/emergency-officer-count.anchors.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const notification = join(root, "src/lib/server/notification-service.ts");
const email = join(root, "src/lib/server/email.ts");
const originals = new Map([notification, email].map((path) => [path, readFileSync(path)]));
const env = { ...process.env, POSTMARK_API_KEY: "", VAPID_PRIVATE_KEY: "", SMS_PROVIDER: "console",
  UPDOWN_SCHEDULER: "false", UPDOWN_HEALER: "false" };
delete env.DATABASE_URL;
delete env.VERIFY_DATABASE_URL;
let caught = 0;
for (const plant of plants) {
  const path = join(root, plant.file);
  const before = originals.get(path);
  if (!before || !readFileSync(path).equals(before)) throw new Error(`source changed before plant: ${plant.name}`);
  const current = before.toString("utf8");
  if (current.split(plant.from).length !== 2) throw new Error(`red anchor absent or ambiguous: ${plant.name}`);
  writeFileSync(path, current.replace(plant.from, plant.to));
  try {
    let output = "", failed = false;
    try {
      output = execFileSync(process.execPath, [join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/emergency-officer-count.test.mts"], {
        cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      });
    } catch (error) {
      failed = true;
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    if (!failed || !output.includes(plant.failure)) {
      throw new Error(`mutation not caught by its owning assertion: ${plant.name}\n${output.slice(-1800)}`);
    }
    caught++;
    console.log(`RED ${plant.name}`);
  } finally {
    writeFileSync(path, before);
    if (!readFileSync(path).equals(before)) throw new Error(`byte restore failed: ${plant.name}`);
  }
}
console.log(`ALL PASS — ${caught}/${plants.length} mutations caught; source restored byte-for-byte`);
