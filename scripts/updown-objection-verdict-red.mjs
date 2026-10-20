/** Physical red plants for the officer-corrected Up & Down money verdict. */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { MUTATIONS } from "./anchors/updown-objection-verdict.anchors.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const objectionPath = join(root, "src/lib/server/objections-service.ts");
const healerPath = join(root, "src/lib/server/updown-service.ts");
const marketPath = join(root, "src/lib/server/market-service.ts");
const boardPath = join(root, "src/lib/server/updown-board.ts");
const original = new Map([
  [objectionPath, readFileSync(objectionPath, "utf8")],
  [healerPath, readFileSync(healerPath, "utf8")],
  [marketPath, readFileSync(marketPath, "utf8")],
  [boardPath, readFileSync(boardPath, "utf8")],
]);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const eol = (s, before) => before.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s;
const plants = MUTATIONS;

let caught = 0;
const env = { ...process.env, SMS_PROVIDER: "console", UPDOWN_SCHEDULER: "false", UPDOWN_HEALER: "false" };
delete env.DATABASE_URL;
delete env.VERIFY_DATABASE_URL;
for (const plant of plants) {
  const path = join(root, plant.file);
  const before = original.get(path);
  const current = readFileSync(path, "utf8");
  if (sha(current) !== sha(before)) throw new Error("source changed before plant; refusing to mutate");
  const from = eol(plant.from, before), to = eol(plant.to, before);
  if (current.split(from).length !== 2) throw new Error(`red anchor absent or ambiguous: ${plant.name}`);
  writeFileSync(path, current.replace(from, to));
  try {
    let output = "", failed = false;
    try {
      output = execSync("npx tsx scripts/updown-objection-verdict.test.mts", {
        cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000,
      });
    } catch (error) {
      failed = true;
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    if (!failed || !output.includes(plant.failure)) {
      throw new Error(`mutation not caught by its owning assertion: ${plant.name}`);
    }
    caught++;
    console.log(`RED ${plant.name}`);
  } finally {
    writeFileSync(path, before);
    if (sha(readFileSync(path, "utf8")) !== sha(before)) throw new Error(`restore failed: ${plant.name}`);
  }
}
console.log(`ALL PASS — ${caught}/${plants.length} mutations caught; source restored`);
