/**
 * HOUSE-BOT MONEY — the money seam on a real Postgres AND on the in-memory store (PLAN §12, N1 Tests).
 *
 *   npm run test:house-bot-money
 *
 * ⛔ WHAT THIS GUARDS. A house stake moves real money from a real account through the player's own bet
 * path. This suite drives `placeHouseBet` end to end on both stores and asserts the money facts: the
 * marker on the position and on every transaction of it, cash only, no wagering, no early exit, the
 * refusals that must leave money and intent untouched (a superseded intent rolls back, a stale one
 * never writes), settlement paying and refunding marked rows with the marker, and — on Postgres — the
 * trial balance tying afterwards and `lockedForHouse`'s SQL agreeing with the JS exit window on the A14
 * grid.
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/house-bot-money-cases.mts` runs in two child processes
 * (the stores choose their backend at import), and every line it prints carries its store. A case that
 * passes in memory and fails on Postgres is a FAIL here, never an average.
 *
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP. Without `VERIFY_DATABASE_URL` (set by `db-scratch --run`)
 * the Postgres half is NOT MEASURED and the suite exits 3.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
const mask = (u: string) => u.replace(/:[^:@/]*@/, ":***@");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

function runChild(store: "postgres" | "memory", env: Record<string, string>): { pass: number; fail: number; exit: number } {
  const r = spawnSync("npx", ["tsx", "scripts/lib/house-bot-money-cases.mts"], {
    cwd: ROOT, env: { ...process.env, ...env, HB_MONEY_STORE: store }, encoding: "utf8",
    shell: process.platform === "win32", timeout: 20 * 60_000, maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ""}`;
  process.stdout.write(out);
  if (r.stderr) process.stderr.write(r.stderr);
  const m = /@@SUMMARY (\{.*\})/.exec(out);
  const s = m ? JSON.parse(m[1]) as { pass: number; fail: number } : { pass: 0, fail: 0 };
  return { ...s, exit: r.status ?? 1 };
}

// ── memory ─────────────────────────────────────────────────────────────────────────────────────
const mem = runChild("memory", { DATABASE_URL: "", USE_PRISMA_DAL: "false" });
ok("0.mem · the memory run exits 0 with assertions and no failure", mem.exit === 0 && mem.pass >= 30 && mem.fail === 0,
  `exit ${mem.exit} · ${mem.pass} passed · ${mem.fail} failed`);

// ── postgres ───────────────────────────────────────────────────────────────────────────────────
if (!RAW) {
  console.error("\n!! NOT MEASURED — the Postgres half needs a local cluster. Run `npm run test:house-bot-money`, which boots one.");
  console.log(`\nhouse-bot-money: ${pass} passed, ${fail} failed — Postgres NOT MEASURED`);
  process.exit(3);
}
{
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* reported below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error(`!! refusing: this suite drops and creates a database and runs only against a loopback cluster (${mask(RAW)}).`);
    process.exit(2);
  }
}
const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_money_${process.pid}`;
const url = `${BASE}/${DB}`;
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000,
  });
  ok("0.pg.migrate · prisma migrate deploy applies every migration to the scratch database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-3).join(" "));
  if (mig.status === 0) {
    const pgRun = runChild("postgres", { DATABASE_URL: url, USE_PRISMA_DAL: "true" });
    ok("0.pg · the Postgres run exits 0 with assertions and no failure", pgRun.exit === 0 && pgRun.pass >= 30 && pgRun.fail === 0,
      `exit ${pgRun.exit} · ${pgRun.pass} passed · ${pgRun.fail} failed`);
  }
} finally {
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  await drop.end();
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-money: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
