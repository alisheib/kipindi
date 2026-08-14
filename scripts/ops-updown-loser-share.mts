#!/usr/bin/env tsx
/**
 * ONE-OFF · A2 — move every Up & Down chain onto `loser-share` (13% of the LOSING side).
 *
 * 🔴 WHY A SCRIPT AND NOT A CONSTANT. `rateProfileFor` returns
 * `chain.rateProfile ?? cfg.defaultRateProfile`, and **every live chain carries its own
 * copy**. Changing `DEFAULT_UPDOWN_CONFIG` and the persisted `updown.config` moves what a
 * NEW chain inherits and nothing else — the 16 chains on the board would keep minting
 * capped-commission rounds indefinitely. `test:updown-cutover` §4.5 asserts that precedence
 * precisely so nobody concludes the constant was the whole job.
 *
 * ⛔ THIS TOUCHES NO MONEY AND NO ROUND. It writes one JSON column on the CHAIN row, through
 * the product's own `updateChain`, which audits (`updown.chain.updated`) and whose own note
 * says it: "Affects FUTURE rounds only — existing rounds keep the rates frozen onto them at
 * creation." A round that has already opened settles by the snapshot it froze, forever. ⛔ No
 * `feeSnapshot` is rewritten, backfilled or migrated by this or by anything else.
 *
 * ⚠️ DRY RUN BY DEFAULT — prints every change and writes nothing without `--commit`.
 * ⚠️ It refuses to touch a chain whose profile is NOT the exact retired default. An operator
 * who deliberately set something else keeps it, and is listed as skipped rather than
 * silently overwritten.
 * ⚠️ It prints the number of rounds currently OPEN on each chain, because those are the rows
 * that will still settle by the old model after this runs — that is correct, and an operator
 * reading the board needs to know it rather than discover it.
 *
 *   railway run -s 50pick -- node scripts/live/ops/mkenv.cjs     # get a live DATABASE_URL
 *   npx tsx scripts/ops-updown-loser-share.mts
 *   npx tsx scripts/ops-updown-loser-share.mts --commit
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(join(__dirname, "live", "ops", ".env"), "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
    }
  } catch { /* checked below */ }
}
const DB = process.env.DATABASE_URL;
if (!DB) { console.error("FATAL: DATABASE_URL is not set and scripts/live/ops/.env was not readable."); process.exit(1); }
const host = (() => { try { return new URL(DB).host; } catch { return "unparseable"; } })();
if (host.endsWith(".railway.internal")) {
  console.error(`FATAL: DATABASE_URL points at ${host}, which resolves nowhere off-platform.`);
  console.error("       Every read would silently return DEFAULTS. Run mkenv.cjs first.");
  process.exit(1);
}
process.env.USE_PRISMA_DAL ??= "true";
process.env.SESSION_SECRET ??= "ops-only-session-secret-32chars-minimum";

const COMMIT = process.argv.includes("--commit");

const pg = (await import("pg")).default;
const { chainStore } = await import("../src/lib/server/updown-dal.ts");
const { updateChain, DEFAULT_UPDOWN_CONFIG, getUpDownConfig } = await import("../src/lib/server/updown-config.ts");
const { auditFlush } = await import("../src/lib/server/audit.ts");

const TARGET = DEFAULT_UPDOWN_CONFIG.defaultRateProfile;

const c = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = (sql: string, p?: unknown[]) => c.query(sql, p as never[]).then((r) => r.rows as Record<string, string>[]);

// ── 0 · IDENTITY ─────────────────────────────────────────────────────────────
const [meta] = await q(`select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
const [n] = await q(`
  select (select count(*) from "User")::int as users,
         (select count(*) from "PredictionMarket" where status='LIVE')::int as live`);
console.log("=== IDENTITY ===");
console.log(`host=${host}  db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);
console.log(`users=${n.users}  marketsLive=${n.live}`);
console.log("⭐ cross-check against https://www.50pick.tz/api/health before believing anything below.\n");

// ── 1 · WHAT THE PERSISTED PRODUCT DEFAULT SAYS RIGHT NOW ────────────────────
const cfg = await getUpDownConfig();
console.log(`=== PRODUCT DEFAULT (SystemConfig["updown.config"].defaultRateProfile) ===`);
console.log(`  ${JSON.stringify(cfg.defaultRateProfile)}`);
if (cfg.defaultRateProfile.feeModel !== "loser-share") {
  console.log(`  ⚠️ still ${cfg.defaultRateProfile.feeModel}. The v4 reconcile runs on the app's first`);
  console.log(`     read after deploy — deploy the code before running this, or a NEW chain created`);
  console.log(`     afterwards will inherit the retired model while these 16 carry the new one.`);
}
console.log(`  target: ${JSON.stringify(TARGET)}\n`);

// ── 2 · THE CHAINS, AND WHAT IS STILL OPEN ON EACH ───────────────────────────
const rows = await q(`
  select ch.id, a.symbol, ch."durationMinutes", ch.state, ch."rateProfile"::text as profile,
         (select count(*) from "UpDownRound" r
           join "PredictionMarket" m on m.id = r."marketId"
          where r."chainId" = ch.id and m.status = 'LIVE')::int as open_rounds
    from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId"
   order by a.symbol, ch."durationMinutes"`);

console.log(`=== ${rows.length} CHAIN(S) ===`);
type Job = { id: string; label: string; from: string };
const todo: Job[] = [];
let openTotal = 0;
for (const r of rows) {
  const p = r.profile ? JSON.parse(r.profile) : null;
  const label = `${r.symbol.padEnd(8)} ${String(r.durationMinutes).padStart(3)}m ${r.state.padEnd(8)}`;
  openTotal += Number(r.open_rounds);
  const isRetiredDefault =
    p && p.feeModel === "capped-commission" && p.commissionRate === 0.13 &&
    Math.abs((p.feeCeilingRate ?? 0) - 1 / 3) < 1e-9;
  const already = p && p.feeModel === "loser-share";
  const state = already ? "ALREADY loser-share" : isRetiredDefault ? "→ MIGRATE" : p ? "SKIP (deliberate profile)" : "SKIP (inherits — nothing to write)";
  console.log(`  ${label} ${String(state).padEnd(30)} open rounds=${r.open_rounds}  ${p ? JSON.stringify(p) : "null"}`);
  if (isRetiredDefault) todo.push({ id: r.id, label: label.trim(), from: JSON.stringify(p) });
}

console.log(`\n  ${todo.length} to migrate · ${rows.length - todo.length} skipped`);
console.log(`  ⚠️ ${openTotal} round(s) are LIVE right now. Every one of them keeps the model it froze at`);
console.log(`     open and settles by it — that is the no-mix guarantee, not a gap.\n`);

if (!COMMIT) {
  console.log(`DRY RUN — nothing written. Re-run with --commit to migrate these ${todo.length} chain(s).`);
  await c.end();
  process.exit(0);
}

// ── 3 · THE WRITE — through updateChain, one at a time, each audited ─────────
let done = 0;
for (const t of todo) {
  const before = await chainStore.get(t.id);
  if (!before) { console.log(`  ✗ ${t.label} — vanished between read and write; skipped`); continue; }
  const p = before.rateProfile as Record<string, unknown> | null;
  if (!p || p.feeModel !== "capped-commission") {
    console.log(`  ✗ ${t.label} — profile changed between read and write (${JSON.stringify(p)}); skipped`);
    continue;
  }
  const res = await updateChain(t.id, { rateProfile: { ...TARGET } }, "ops_a2");
  if (!res.ok) { console.log(`  ✗ ${t.label} — ${res.error}`); continue; }
  done++;
  console.log(`  ✓ ${t.label} — ${t.from} → ${JSON.stringify(TARGET)}`);
}
await auditFlush();

// ── 4 · READ IT BACK OFF THE DATABASE, not off the return value ─────────────
const after = await q(`
  select a.symbol, ch."durationMinutes", ch."rateProfile"::text as profile
    from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId"
   order by a.symbol, ch."durationMinutes"`);
console.log(`\n=== AFTER, read back from the DB ===`);
let onNew = 0, onOld = 0;
for (const r of after) {
  const p = r.profile ? JSON.parse(r.profile) : null;
  if (p?.feeModel === "loser-share") onNew++; else onOld++;
  console.log(`  ${r.symbol.padEnd(8)} ${String(r.durationMinutes).padStart(3)}m  ${p?.feeModel ?? "inherit"}  ${r.profile}`);
}
console.log(`\n  ${onNew}/${after.length} chains on loser-share · ${onOld} not · ${done} written this run`);
if (onOld > 0) console.log(`  ⚠️ ${onOld} chain(s) are NOT on loser-share. If any was skipped as "deliberate", that is correct — check the list above.`);

await c.end();
process.exit(0);
