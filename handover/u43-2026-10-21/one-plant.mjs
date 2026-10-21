// One declared plant, proven by hand: node one-plant.mjs <tree> <anchorsFile> <namePrefix> <labelPrefix>
// Applies the named MUTATIONS entry on disk, runs the house-bot-reports MEMORY child, reports whether a FAIL line starts
// with <labelPrefix>, and restores the file byte for byte (verified).
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const [tree, anchors, namePrefix, labelPrefix] = process.argv.slice(2);
const mod = await import(pathToFileURL(join(tree, anchors)).href);
const plant = mod.MUTATIONS.find((m) => m.name.startsWith(namePrefix));
if (!plant) throw new Error(`no plant named ${namePrefix}`);
const target = join(tree, plant.file);
const original = readFileSync(target);
const text = original.toString("utf8");
const at = text.split(plant.from).length - 1;
if (at !== 1) throw new Error(`plant anchor occurs ${at} times`);
let out = "";
try {
  writeFileSync(target, text.replace(plant.from, plant.to));
  const r = spawnSync(process.execPath, ["--import", "tsx", "scripts/lib/house-bot-reports-cases.mts"], {
    cwd: tree, encoding: "utf8", maxBuffer: 64 << 20, timeout: 900_000,
    env: { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" },
  });
  out = `${r.stdout}\n${r.stderr}`;
} finally {
  writeFileSync(target, original);
}
if (!readFileSync(target).equals(original)) throw new Error("RESTORE MISMATCH");
const fails = out.split(/\r?\n/).filter((l) => l.includes("FAIL"));
const caught = fails.some((l) => l.includes(`FAIL [memory] ${labelPrefix}`));
console.log(`${caught ? "CAUGHT" : "MISSED"} ${plant.name}`);
for (const l of fails.slice(0, 6)) console.log("  " + l.slice(0, 220));
console.log("restored byte-for-byte");
