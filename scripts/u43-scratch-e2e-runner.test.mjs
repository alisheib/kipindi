/** Pure premise guard for the three-database U43 money gate runner. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateScratchEndpoint, makeDatabaseNames, databaseUrl, suitePlan, childEnvironment,
} from "./lib/u43-scratch-e2e-plan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runner = readFileSync(resolve(root, "scripts/u43-scratch-e2e-runner.mjs"), "utf8");
const url = "postgresql://postgres:scratch@127.0.0.1:5491/postgres";
let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed++;
  console.log(`PASS ${label}`);
}
function refuses(target, directory = resolve(root, ".pgscratch"), production = false) {
  try { validateScratchEndpoint(target, root, directory, production); return false; }
  catch { return true; }
}

check("exact owned loopback scratch endpoint passes", validateScratchEndpoint(url, root,
  resolve(root, ".pgscratch")).hostname === "127.0.0.1");
check("remote and alternate local database endpoints are refused",
  refuses("postgresql://postgres:scratch@db.example.com:5491/postgres") &&
  refuses("postgresql://postgres:scratch@localhost:5491/postgres") &&
  refuses("postgresql://postgres:scratch@127.0.0.1:5432/postgres") &&
  refuses("postgresql://postgres:scratch@127.0.0.1:5491/other"));
check("another checkout data directory and production mode are refused",
  refuses(url, resolve(root, "..", "another", ".pgscratch")) &&
  refuses(url, resolve(root, ".pgscratch"), true));

const names = makeDatabaseNames("abc123_1");
check("money fault and card databases have distinct generated owned names",
  new Set(Object.values(names)).size === 3 &&
  names.money.startsWith("u43_e2e_money_") && names.fault.startsWith("u43_e2e_fault_") &&
  names.card.startsWith("u43_e2e_card_"));
check("database URL accepts only generated U43 names",
  new URL(databaseUrl(url, names.card)).pathname === `/${names.card}` &&
  (() => { try { databaseUrl(url, "postgres"); return false; } catch { return true; } })());
const suites = suitePlan(names);
check("three E2E suites use three separate databases",
  suites.length === 3 && suites[0].database === names.money &&
  suites[1].database === names.fault && suites[2].database === names.card &&
  new Set(suites.map((s) => s.database)).size === 3);
check("suite files are the required money fault and card entry points",
  suites.map((s) => s.file).join("|") ===
    "scripts/money-e2e.test.mts|scripts/fault-injection-bet.test.mts|scripts/card-flow-e2e.test.mts");

const inherited = { POSTMARK_API_KEY: "should-be-cleared", PAYMENT_API_KEY: "should-be-cleared",
  VERIFY_DATABASE_URL: url };
const child = childEnvironment(inherited, databaseUrl(url, names.money));
check("DAL and target database are set before a child imports services",
  child.DATABASE_URL.endsWith(`/${names.money}`) && child.USE_PRISMA_DAL === "true" &&
  /spawnSync\(process\.execPath, args,[\s\S]*?env: childEnvironment\(process\.env, databaseUrl\(raw, database\)\)/.test(runner));
check("real payment SMS and email credentials cannot enter a child",
  child.PAYMENT_AGGREGATOR === "mock" && child.PAYMENT_API_KEY === "" &&
  child.POSTMARK_API_KEY === "" && child.SMS_PROVIDER === "console" &&
  child.EMAIL_OUTBOX_CAPTURE === "1" && child.VERIFY_DATABASE_URL === undefined);
check("runner checks live PostgreSQL data directory before database creation",
  runner.includes("SELECT setting FROM pg_settings WHERE name = 'data_directory'") &&
  runner.indexOf("validateScratchEndpoint(raw, root, directory") < runner.indexOf("CREATE DATABASE"));
check("runner migrates each newly created database and tracks cleanup ownership",
  runner.includes('await admin.query(`CREATE DATABASE "${name}"`)') &&
  /^\s+created\.push\(name\);\s*$/m.test(runner) &&
  runner.includes('["node_modules/prisma/build/index.js", "migrate", "deploy"]') &&
  runner.includes('for (const name of created.reverse())') &&
  runner.includes('await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)'));
check("fault disposable marker is planted only in the fault database",
  runner.includes('runChild("plant-fault-disposable-marker", ["scripts/load/ci-plant-marker.mjs"], names.fault') &&
  runner.indexOf("plant-fault-disposable-marker") < runner.indexOf("for (const suite of suitePlan(names))"));

console.log(`u43-scratch-e2e-runner: ${passed} passed, 0 failed`);
