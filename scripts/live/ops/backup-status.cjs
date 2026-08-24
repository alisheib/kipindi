#!/usr/bin/env node
/**
 * backup-status.cjs — "is there a backup I could actually restore from?", answered.
 *
 *   node scripts/live/ops/backup-status.cjs
 *
 * 🔴 WHY THIS EXISTS. On 2026-08-25 the nightly backup was found to have failed on
 * ELEVEN consecutive nights. The last verified, restorable artifact was 2026-08-13,
 * 11.8 days old, on a licensed real-money platform. Nothing was broken about the
 * alarm: `/admin/compliance` had been showing the amber "stale" state for ten of
 * those days, exactly as designed. **The alarm was correct and nobody was looking
 * at it**, which is a different failure and needs a different instrument — one an
 * operator or a session RUNS, like `census.cjs`, rather than one that waits to be
 * noticed.
 *
 * ⛔ IT IS READ-ONLY AND IT WRITES NOTHING. In particular it does NOT record a
 * failure into `__BACKUP_LAST_RUN__`: that row holds the last GOOD run, and
 * overwriting it with a failure would destroy the single most useful fact an
 * operator has in an incident — the date of the newest artifact that is known to
 * restore. A status tool that erases the status is not a status tool.
 *
 * ⚠️ IT EXITS NON-ZERO WHEN THE LAST VERIFIED BACKUP IS OLDER THAN THE STALENESS
 * WINDOW, so it can be put in a checklist and mean something. The window is read
 * from the product's own `BACKUP_STALE_AFTER_MS`, not restated here — one home per
 * fact; a second copy of that number would drift from the card it is meant to agree
 * with.
 *
 * ⚠️ DATABASE_URL comes from `scripts/live/ops/.env`, never from `railway run` —
 * Railway injects `postgres.railway.internal`, which does not resolve off-cluster.
 */
const fs = require("node:fs");
const path = require("node:path");
const REPO = process.env.KP_REPO || path.resolve(__dirname, "..", "..", "..");
const { Client } = require(path.join(REPO, "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

/** The staleness window, read from the product rather than restated. */
function staleAfterMs() {
  const src = fs.readFileSync(path.join(REPO, "src/lib/server/backup/state.ts"), "utf8");
  const m = src.match(/BACKUP_STALE_AFTER_MS\s*=\s*([0-9*\s]+);/);
  if (!m) {
    console.error("⛔ could not read BACKUP_STALE_AFTER_MS from src/lib/server/backup/state.ts.");
    console.error("   Refusing to guess: a staleness check with an invented window is worse than none.");
    process.exit(2);
  }
  // eslint-disable-next-line no-new-func -- a digits-and-asterisks arithmetic literal, matched above.
  return Function(`"use strict";return (${m[1]})`)();
}

const hrs = (ms) => (ms / 3600000).toFixed(1);

(async () => {
  const WINDOW = staleAfterMs();
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Identity first, so the numbers can be cross-checked. A probe that cannot prove
  // which database it read is not evidence.
  const [meta] = await c.query(`select current_database() db, now()::text server_now`).then((r) => r.rows);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server_now=${meta.server_now}`);

  const rows = await c.query(
    `select value, "updatedAt"::text from "SystemConfig" where key = '__BACKUP_LAST_RUN__'`,
  ).then((r) => r.rows);

  console.log("\n=== LAST RECORDED BACKUP ===");
  if (!rows.length) {
    console.log("⛔ NO BACKUP HAS EVER BEEN RECORDED — there is nothing to restore from.");
    await c.end();
    process.exit(1);
  }

  const run = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
  // ⚠️ The server's own clock, not this laptop's — a local `Date.now()` here would
  // silently add this machine's drift to the age. (This one runs ~93s slow.)
  const ageMs = Date.parse(meta.server_now.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")) - Date.parse(run.finishedAt);
  if (!Number.isFinite(ageMs)) {
    console.error(`⛔ could not compute an age from server_now=${meta.server_now} finishedAt=${run.finishedAt}`);
    console.error("   Refusing to report a status derived from NaN — that is how a failure prints as a pass.");
    await c.end();
    process.exit(2);
  }

  console.log(`finishedAt : ${run.finishedAt}`);
  console.log(`age        : ${hrs(ageMs)} h  (${(ageMs / 86400000).toFixed(1)} days)`);
  console.log(`ok         : ${run.ok}`);
  console.log(`verified   : ${run.verified}   ${run.verified ? "(restored into a scratch database and re-checked)" : "(NOT restored — a dump is not a backup)"}`);
  console.log(`size       : ${(Number(run.sizeBytes || 0) / 1048576).toFixed(2)} MB · ${run.rows} rows · sealed=${run.sealed}`);
  console.log(`destination: ${run.destination}`);
  if (run.error) console.log(`error      : ${run.error}`);
  if (Array.isArray(run.sourceWarnings) && run.sourceWarnings.length) {
    // ⛔ These are problems in the SOURCE, not in the backup. A faithful copy of an
    // unhealthy database is a GOOD backup and a BAD situation, and conflating the two
    // is how a perfect artifact got reported as "DO NOT TRUST THIS BACKUP" once.
    console.log(`\n⚠️  SOURCE warnings carried in the manifest (about the DATABASE, not the artifact):`);
    run.sourceWarnings.forEach((w) => console.log(`     - ${w}`));
  }

  console.log("\n=== VERDICT ===");
  console.log(`staleness window: ${hrs(WINDOW)} h (from the product's BACKUP_STALE_AFTER_MS)`);
  const problems = [];
  if (!run.ok) problems.push("the last run FAILED");
  if (!run.verified) problems.push("the last run was never restored, so it is a dump and not a backup");
  if (ageMs > WINDOW) problems.push(`the last verified backup is ${(ageMs / 86400000).toFixed(1)} days old`);

  if (problems.length === 0) {
    console.log(`✅ RESTORABLE — verified ${hrs(ageMs)} h ago, inside the window.`);
    await c.end();
    return;
  }
  console.log("🔴 NOT OK:");
  problems.forEach((p) => console.log(`   - ${p}`));
  console.log("\n   Next: check the nightly's recent conclusions —");
  console.log("     gh run list --workflow=backup-nightly.yml --limit 12");
  console.log("   and read the FIRST failure's text before believing a cause.");
  await c.end();
  process.exit(1);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(2);
});
