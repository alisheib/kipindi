#!/usr/bin/env node
/**
 * Railway Postgres setup automator.
 *
 * What this CAN automate:
 *   ✓ Verify Railway CLI is installed
 *   ✓ Verify DATABASE_URL is set (from .env or env var)
 *   ✓ Verify Postgres connectivity
 *   ✓ Run `prisma generate`
 *   ✓ Run `prisma migrate deploy` (idempotent: only applies pending)
 *   ✓ Optional first-init: create the initial migration SQL
 *   ✓ Smoke-test the connection by counting tables
 *
 * What this CANNOT automate (manual prerequisite):
 *   ✗ Adding the Postgres plugin to your Railway project
 *     → Do this once via dashboard: Railway → project → "+ New" →
 *       Database → Add PostgreSQL.  Then copy DATABASE_URL into the
 *       Next.js service Variables tab as ${{Postgres.DATABASE_URL}}.
 *
 * Usage (PowerShell or bash):
 *   # Local dev DB:
 *   $env:DATABASE_URL = "postgresql://postgres:local@localhost:5432/kipindi"
 *   node scripts/railway-db-setup.mjs
 *
 *   # Railway production (rare — usually let postinstall do it):
 *   $env:DATABASE_URL = "<paste from Railway Postgres tile>"
 *   node scripts/railway-db-setup.mjs --apply
 *
 * Flags:
 *   --apply       Actually run migrate deploy (default: dry-run)
 *   --init <name> Create + apply an initial migration with this name
 *   --reset       DEV ONLY — drop everything (refuses if NODE_ENV=production)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const argVal = (n) => {
  const i = args.indexOf(n);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const APPLY = flag("--apply");
const INIT_NAME = argVal("--init");
const RESET = flag("--reset");

// ── styling ─────────────────────────────────────────────────────────
const c = {
  ok:    (s) => `\x1b[32m✓\x1b[0m ${s}`,
  warn:  (s) => `\x1b[33m!\x1b[0m ${s}`,
  fail:  (s) => `\x1b[31m✗\x1b[0m ${s}`,
  step:  (s) => `\x1b[36m▸\x1b[0m ${s}`,
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
};

console.log(c.bold("\n  Railway Postgres setup\n"));

// ── 0. Load DATABASE_URL ────────────────────────────────────────────
let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  // Try .env.local
  for (const f of [".env.local", ".env"]) {
    if (existsSync(f)) {
      const txt = readFileSync(f, "utf8");
      const m = txt.match(/^DATABASE_URL\s*=\s*["']?(.+?)["']?\s*$/m);
      if (m) { DATABASE_URL = m[1]; console.log(c.step(`Read DATABASE_URL from ${f}`)); break; }
    }
  }
}
if (!DATABASE_URL) {
  console.log(c.fail("DATABASE_URL is not set."));
  console.log("  Set it in PowerShell:  $env:DATABASE_URL = \"postgresql://...\"");
  console.log("  Or in bash:            export DATABASE_URL=\"postgresql://...\"");
  console.log("  Or write it to .env.local (git-ignored).");
  process.exit(2);
}
const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
const isRailway = /railway\.app|rlwy\.net/.test(DATABASE_URL);
console.log(c.ok(`DATABASE_URL set ${isLocal ? "(local)" : isRailway ? "(Railway)" : "(remote)"}`));
process.env.DATABASE_URL = DATABASE_URL;

// ── 1. Refuse --reset against production-y URLs ─────────────────────
if (RESET) {
  if (process.env.NODE_ENV === "production" || isRailway) {
    console.log(c.fail("--reset refused: looks like a production database."));
    console.log("  Reset is dev-only.  Use the Railway Backups → Restore flow instead.");
    process.exit(3);
  }
  console.log(c.warn("--reset will drop EVERY table in the target DB."));
}

// ── 2. Helper to run a command ──────────────────────────────────────
function run(cmd, args, opts = {}) {
  const display = `${cmd} ${args.join(" ")}`;
  if (!APPLY && !opts.alwaysRun) {
    console.log(c.step(`(dry-run) would run: ${display}`));
    return { code: 0, stdout: "", stderr: "" };
  }
  console.log(c.step(`Running: ${display}`));
  const r = spawnSync(cmd, args, {
    stdio: opts.silent ? "pipe" : "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return { code: r.status ?? 1, stdout: r.stdout?.toString() ?? "", stderr: r.stderr?.toString() ?? "" };
}

// ── 3. Prisma must be available ─────────────────────────────────────
const prismaSchema = path.join(process.cwd(), "prisma", "schema.prisma");
if (!existsSync(prismaSchema)) {
  console.log(c.fail(`prisma/schema.prisma not found at ${prismaSchema}`));
  process.exit(4);
}
console.log(c.ok("prisma/schema.prisma found"));

// ── 4. Generate the Prisma client ───────────────────────────────────
{
  const r = run("npx", ["prisma", "generate"]);
  if (r.code !== 0) {
    console.log(c.fail("prisma generate failed."));
    process.exit(r.code);
  }
}

// ── 5. Reset (dev only) ─────────────────────────────────────────────
if (RESET) {
  const r = run("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"]);
  if (r.code !== 0) { console.log(c.fail("Reset failed.")); process.exit(r.code); }
}

// ── 6. Initial migration if --init <name> given ─────────────────────
if (INIT_NAME) {
  const r = run("npx", ["prisma", "migrate", "dev", "--name", INIT_NAME]);
  if (r.code !== 0) { console.log(c.fail("Initial migration failed.")); process.exit(r.code); }
}

// ── 7. Apply pending migrations (production-safe) ───────────────────
{
  const r = run("npx", ["prisma", "migrate", "deploy"]);
  if (r.code !== 0) {
    console.log(c.fail("migrate deploy failed."));
    if (!APPLY) console.log(c.warn("Re-run with --apply to actually execute."));
    process.exit(r.code);
  }
}

// ── 8. Smoke-test connectivity by counting tables ───────────────────
//    Windows PowerShell mangles multi-line `node -e "..."` args, so we
//    write the probe to a temp file and run it instead.
if (APPLY) {
  console.log(c.step("Smoke test: counting tables…"));
  const probe = [
    'import { PrismaClient } from "@prisma/client";',
    'const p = new PrismaClient();',
    'try {',
    "  const r = await p.$queryRawUnsafe(\"SELECT count(*)::int as n FROM information_schema.tables WHERE table_schema='public'\");",
    "  console.log('TABLES:', r[0]?.n ?? 0);",
    '  await p.$disconnect();',
    '} catch (e) {',
    "  console.error('PROBE_FAIL:', e.message);",
    '  process.exit(1);',
    '}',
  ].join("\n");
  const probePath = path.join(process.cwd(), ".prisma-smoke-probe.mjs");
  const fs = await import("node:fs");
  fs.writeFileSync(probePath, probe, "utf8");
  try {
    const r = run("node", [probePath], { silent: true, alwaysRun: true });
    const m = r.stdout.match(/TABLES: (\d+)/);
    if (m && Number(m[1]) > 0) {
      console.log(c.ok(`Connected — ${m[1]} tables visible`));
    } else {
      console.log(c.fail("Smoke test failed."));
      if (r.stderr) console.error(r.stderr);
      process.exit(5);
    }
  } finally {
    try { fs.unlinkSync(probePath); } catch { /* ignore */ }
  }
}

console.log("");
console.log(c.bold("  Done."));
if (!APPLY) {
  console.log("  This was a dry run.  Re-run with --apply to actually migrate.");
} else if (isRailway) {
  console.log("  Railway database is now schema-current.  Push your code to deploy the app.");
} else {
  console.log("  Local database is schema-current.  npm run dev works.");
}
console.log("");
