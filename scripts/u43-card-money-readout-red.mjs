/** Physical reversals of the card's pending and realized-money labels. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { MUTATIONS as plants } from "./anchors/u43-card-money-readout.anchors.mjs";

const path = resolve("src/components/updown/updown-card.tsx");
const before = readFileSync(path, "utf8");
const sha = (value) => createHash("sha256").update(value).digest("hex");
let caught = 0;
for (const plant of plants) {
  if (sha(readFileSync(path, "utf8")) !== sha(before)) throw new Error("card changed during red fleet");
  if (before.split(plant.from).length !== 2) throw new Error(`red anchor absent or ambiguous: ${plant.name}`);
  writeFileSync(path, before.replace(plant.from, plant.to));
  try {
    let output = "", failed = false;
    try {
      output = execFileSync("npx", ["tsx", "scripts/u43-card-money-readout.test.mts"], {
        cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32", timeout: 30_000,
      });
    } catch (error) {
      failed = true;
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    if (!failed || !output.includes(plant.failure)) throw new Error(`plant escaped guard: ${plant.name}`);
    caught++;
    console.log(`RED ${plant.name}`);
  } finally {
    writeFileSync(path, before);
    if (sha(readFileSync(path, "utf8")) !== sha(before)) throw new Error(`restore failed: ${plant.name}`);
  }
}
execFileSync("npx", ["tsx", "scripts/u43-card-money-readout.test.mts"], {
  cwd: process.cwd(), stdio: "pipe", shell: process.platform === "win32", timeout: 30_000,
});
console.log(`ALL PASS — ${caught}/${plants.length} mutations caught; source restored`);
