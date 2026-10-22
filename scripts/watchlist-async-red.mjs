/** The bounded eventual assertion must catch a missing alert and a duplicate. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MUTATIONS } from "./anchors/watchlist-async.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "src/lib/server/market-service.ts");
const original = readFileSync(target, "utf8");
const dirty = spawnSync("git", ["diff", "--quiet", "--", "src/lib/server/market-service.ts"], { cwd: root });
if (dirty.status !== 0) throw new Error("RED refused: market-service.ts has local edits");

const env = {
  Path: process.env.Path ?? process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  WINDIR: process.env.WINDIR,
  COMSPEC: process.env.COMSPEC,
  USERPROFILE: process.env.USERPROFILE,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  APPDATA: process.env.APPDATA,
  TEMP: "C:/50pick-ssd/tmp",
  TMP: "C:/50pick-ssd/tmp",
  NODE_ENV: "test",
  USE_PRISMA_DAL: "false",
  HB_MONEY_STORE: "memory",
  MARKET_SCHEDULER: "false",
};
for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
const run = () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/watchlist-alerts.test.mts"], {
    cwd: root, env, encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
  });
  return { code: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
};

const baseline = run();
if (baseline.code !== 0) throw new Error(`Watchlist baseline is red before mutation\n${baseline.output}`);
let caught = 0;
for (const plant of MUTATIONS) {
  let result;
  try {
    writeFileSync(target, injectDefect(original, plant.from, plant.to));
    result = run();
  } finally {
    writeFileSync(target, original);
  }
  if (readFileSync(target, "utf8") !== original) throw new Error(`Restore mismatch: ${plant.name}`);
  const found = result.code !== 0 && result.output.includes(`FAIL ${plant.expect}`);
  console.log(`${found ? "CAUGHT" : "MISSED"} ${plant.name}`);
  if (!found) throw new Error(`RED did not catch ${plant.name}\n${result.output}`);
  caught++;
}
if (run().code !== 0) throw new Error("Watchlist guard red after source restore");
console.log(`Watchlist asynchronous notification RED: ${caught}/${MUTATIONS.length} caught; source restored`);
