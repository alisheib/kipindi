/**
 * Three independent, disposable PostgreSQL E2E databases for the U43 money gate.
 * Run only through `KP_SCRATCH_PORT=5491 npm run db:scratch -- --run node ...`.
 * This process creates, migrates and drops only the databases it names here.
 */
import pg from "pg";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateScratchEndpoint, makeDatabaseNames, databaseUrl, suitePlan, childEnvironment,
} from "./lib/u43-scratch-e2e-plan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (resolve(process.cwd()) !== root) throw new Error("Run U43 scratch E2E from its checkout root");
const raw = process.env.VERIFY_DATABASE_URL ?? "";
validateScratchEndpoint(raw, root, null, process.env.NODE_ENV === "production");
const tag = `${Date.now().toString(36)}_${process.pid.toString(36)}_${randomBytes(4).toString("hex")}`;
const names = makeDatabaseNames(tag);
const outDir = resolve(root, ".qa-shots", "u43-money-gates", `e2e-${tag}`);
mkdirSync(outDir, { recursive: true });
const admin = new pg.Client({ connectionString: raw });
const created = [];
let connected = false;
let failed = 0;

function redact(value) {
  return String(value).replaceAll(raw, "[scratch database URL redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, "[scratch database URL redacted]");
}
function runChild(label, args, database, timeout = 30 * 60_000) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: childEnvironment(process.env, databaseUrl(raw, database)),
    shell: false,
    encoding: "utf8",
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });
  const logPath = resolve(outDir, `${label}.log`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`;
  writeFileSync(logPath, redact(output), "utf8");
  const code = result.status ?? 1;
  console.log(`${code === 0 ? "PASS" : "FAIL"} ${label} exit=${code} log=${logPath}`);
  if (code !== 0) failed++;
  return code === 0;
}

try {
  await admin.connect();
  connected = true;
  const directory = (await admin.query("SELECT setting FROM pg_settings WHERE name = 'data_directory'"))
    .rows[0]?.setting ?? "";
  validateScratchEndpoint(raw, root, directory, process.env.NODE_ENV === "production");
  for (const name of Object.values(names)) {
    // Names are generated and checked by makeDatabaseNames; never accept an
    // arbitrary SQL identifier from an environment variable or command line.
    await admin.query(`CREATE DATABASE "${name}"`);
    created.push(name);
    if (!runChild(`migrate-${name}`, ["node_modules/prisma/build/index.js", "migrate", "deploy"], name, 5 * 60_000)) {
      throw new Error("Scratch migration failed; E2E suites were not run");
    }
  }
  // The fault suite refuses a database without this exact disposable marker.
  // Plant it only in the isolated fault DB after its migrations have landed.
  if (!runChild("plant-fault-disposable-marker", ["scripts/load/ci-plant-marker.mjs"], names.fault, 60_000)) {
    throw new Error("Fault database marker failed; E2E suites were not run");
  }
  for (const suite of suitePlan(names)) {
    runChild(suite.label, ["node_modules/tsx/dist/cli.mjs", suite.file], suite.database);
  }
} catch (error) {
  failed++;
  const logPath = resolve(outDir, "runner-error.log");
  writeFileSync(logPath, redact(error instanceof Error ? error.message : String(error)), "utf8");
  console.error(`FAIL U43 scratch E2E setup or cleanup; see ${logPath}`);
} finally {
  if (connected) {
    for (const name of created.reverse()) {
      try { await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`); }
      catch (error) {
        failed++;
        const logPath = resolve(outDir, `drop-${name}.log`);
        writeFileSync(logPath, redact(error instanceof Error ? error.message : String(error)), "utf8");
        console.error(`FAIL drop of owned U43 scratch database; see ${logPath}`);
      }
    }
    await admin.end().catch(() => { failed++; });
  }
}
console.log(`U43 scratch E2E ${failed === 0 ? "PASS" : "FAIL"}; failures=${failed}; logs=${outDir}`);
process.exitCode = failed === 0 ? 0 : 1;
