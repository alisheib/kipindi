/** Physical reversals for the two-winner settlement fault guard. Run alone. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/settle-winner-atomic.anchors.mjs";

const target = "src/lib/server/market-service.ts";
const tsx = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const suite = "scripts/settle-winner-atomic.test.mts";
const env = { ...process.env, EMAIL_OUTBOX_CAPTURE: "1", POSTMARK_API_KEY: "", SMS_PROVIDER: "console" };
delete env.DATABASE_URL;
const scratch = env.VERIFY_DATABASE_URL;

function run(postgres = false) {
  const runEnv = { ...env };
  if (!postgres) delete runEnv.VERIFY_DATABASE_URL;
  const r = spawnSync(process.execPath, [tsx, suite], {
    encoding: "utf8", env: runEnv, maxBuffer: 10 * 1024 * 1024,
  });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function green(result, store) {
  return result.code === 0 && new RegExp(`settle-winner-atomic: \\d+ passed, 0 failed \\(${store}\\)`).test(result.out);
}

if (!green(run(), "memory")) throw new Error("REFUSING: memory control is not green before mutation");

const memoryPlants = MUTATIONS.filter((plant) => plant.store === "memory");

// PostgreSQL alone can see a position written outside the transaction. The
// second-winner failure then leaves the first WIN mark committed and retry skips
// it; memory's map cannot model this database-only defect.
const pgPlants = MUTATIONS.filter((plant) => plant.store === "postgres");

async function prove(plants, postgres) {
  let caught = 0;
  for (const plant of plants) {
    const original = readFileSync(target, "utf8");
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const from = plant.from.replace(/\n/g, eol);
    const to = plant.to.replace(/\n/g, eol);
    const start = original.indexOf("export async function settleMarket(");
    const end = original.indexOf("// ── SETTLEMENT IS NOW PER-MARKET", start);
    if (start < 0 || end < 0 || end <= start) throw new Error(`${plant.name}: settleMarket scope absent`);
    const scope = original.slice(start, end);
    if (scope.split(from).length !== 2) throw new Error(`${plant.name}: mutation anchor is not unique in settleMarket`);
    const mutated = original.slice(0, start) + scope.replace(from, to) + original.slice(end);
    try {
      writeFileSync(target, mutated, "utf8");
      const red = run(postgres);
      if (red.code === 0 || !red.out.includes(plant.expect)) {
        throw new Error(`${plant.name}: targeted failure absent; tail=${red.out.slice(-1500)}`);
      }
      caught++;
      console.log(`caught ${plant.name} at ${plant.expect}`);
    } finally {
      writeFileSync(target, original, "utf8");
    }
    if (readFileSync(target, "utf8") !== original) throw new Error(`${plant.name}: source was not byte-restored`);
  }
  const control = run(postgres);
  if (!green(control, postgres ? "PostgreSQL" : "memory")) {
    throw new Error(`${postgres ? "PostgreSQL" : "memory"} control is not green after restoration; tail=${control.out.slice(-1500)}`);
  }
  return caught;
}

const memoryCaught = await prove(memoryPlants, false);
let pgCaught = 0;
if (scratch) {
  if (!green(run(true), "PostgreSQL")) throw new Error("REFUSING: PostgreSQL control is not green before mutation");
  pgCaught = await prove(pgPlants, true);
}
console.log(`settle-winner-atomic red: memory ${memoryCaught}/${memoryPlants.length}, ` +
  `PostgreSQL ${scratch ? `${pgCaught}/${pgPlants.length}` : "not run"}; source byte-restored; controls green`);
