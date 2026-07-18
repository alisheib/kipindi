/**
 * TEST-FLOAT GUARD — proof that the money-minting seeder can never run on real money.
 *
 * ⚠️ WHY THIS TEST EXISTS: `npm start` is
 *     prisma migrate deploy && node scripts/seed-test-float.mjs && next start
 * so the float seeder executes on EVERY production deploy. It tops every ACTIVE
 * wallet up to a TZS 1,000,000 floor — i.e. it MINTS MONEY. The only thing standing
 * between that and a live wallet is one strict check: TEST_FUNDING === "true".
 *
 * If that guard is ever weakened (loosened to a truthy check, defaulted on, or
 * moved after the DB connect), the next deploy would credit fake money into real
 * player wallets and the ledger would never balance again. So the guard is pinned
 * here, from the outside, by running the real script as a child process.
 *
 * The DATABASE_URL used below is deliberately UNREACHABLE: if the guard ever stops
 * short-circuiting first, the script would try to connect and this test would see
 * it — the skip must happen BEFORE any database work.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SEEDER = join(here, "seed-test-float.mjs");
/** Points at a closed port — connecting would fail loudly. Nothing may reach it. */
const UNREACHABLE_DB = "postgresql://postgres:pw@127.0.0.1:1/nonexistent?schema=public";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

function runSeeder(env: Record<string, string | undefined>) {
  const base = { ...process.env };
  delete base.TEST_FUNDING;
  delete base.DATABASE_URL;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete base[k]; else base[k] = v;
  }
  const r = spawnSync(process.execPath, [SEEDER], { encoding: "utf8", env: base, timeout: 30_000 });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, status: r.status };
}

const SKIPPED = /skipping wallet top-up/i;

// ── THE LIVE-MONEY CASE: TEST_FUNDING unset, a reachable-looking DB present ──
{
  const r = runSeeder({ DATABASE_URL: UNREACHABLE_DB });
  ok("LIVE (TEST_FUNDING unset) → seeder SKIPS, mints nothing", SKIPPED.test(r.out), r.out.slice(0, 160));
  ok("LIVE → skips BEFORE touching the database", !/ECONNREFUSED|connect|P1001|Can't reach/i.test(r.out), r.out.slice(0, 160));
  ok("LIVE → exits 0 (must never block next start)", r.status === 0, `status=${r.status}`);
}

// ── Explicit off switches ────────────────────────────────────────────────────
for (const v of ["false", "0", "", "yes", "1", "TRUE", "True"]) {
  const r = runSeeder({ TEST_FUNDING: v, DATABASE_URL: UNREACHABLE_DB });
  // The guard is a STRICT === "true". Anything else — including truthy-looking
  // values and wrong case — must be treated as OFF.
  ok(`TEST_FUNDING=${JSON.stringify(v)} → treated as OFF (strict equality)`, SKIPPED.test(r.out), r.out.slice(0, 120));
}

// ── The pre-launch case: enabled, but no database → still a safe no-op ───────
{
  const r = runSeeder({ TEST_FUNDING: "true" });
  ok("TEST_FUNDING=true without DATABASE_URL → no-op", /skipping|no DATABASE_URL/i.test(r.out), r.out.slice(0, 160));
  ok("no-DB case still exits 0", r.status === 0, `status=${r.status}`);
}

// ── The guard must be the FIRST thing the script does ────────────────────────
{
  const src = spawnSync(process.execPath, ["-e", `process.stdout.write(require('fs').readFileSync(${JSON.stringify(SEEDER)},'utf8'))`], { encoding: "utf8" }).stdout ?? "";
  const guardAt = src.indexOf('TEST_FUNDING !== "true"');
  const prismaAt = src.search(/new PrismaClient|\$connect|prisma\./);
  ok("the TEST_FUNDING guard exists verbatim (strict !== \"true\")", guardAt > -1);
  ok("the guard precedes any Prisma/database use", guardAt > -1 && (prismaAt === -1 || guardAt < prismaAt), `guard@${guardAt} prisma@${prismaAt}`);
}

console.log(`\ntest-float-guard: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
