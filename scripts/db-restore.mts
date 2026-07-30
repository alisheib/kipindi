/**
 * `npm run db:restore -- --file <backup>` — put a backup back.
 *
 * The other two scripts are safe by construction: `db:backup` only reads, and
 * `db:verify-backup` restores into a throwaway database and REFUSES production
 * outright. This one is different, and the difference is the whole design:
 *
 *   🔴 THIS IS THE ONLY SCRIPT IN THE REPO THAT DESTROYS DATA ON PURPOSE.
 *
 * It replaces every table it restores. On the day it is used for real, production IS
 * the correct target — refusing production the way the verifier does would make it
 * useless exactly when it matters. So it cannot be blocked; it can only be made
 * impossible to run by accident.
 *
 * HOW THAT IS DONE — four gates, each catching a different mistake:
 *
 *   1. It prints WHAT it is about to restore (when it was taken, row counts, wallet
 *      totals, audit head) BEFORE asking for anything. Restoring a three-week-old
 *      backup over good data is a worse outcome than not restoring at all, and the
 *      only defence is seeing the date first.
 *   2. `--yes-restore-over <dbname>` must name the target database exactly. A
 *      copy-pasted command from a runbook cannot silently hit a different database
 *      than the one the operator was reading about.
 *   3. Targeting a PRODUCTION host additionally needs
 *      `--i-understand-this-overwrites-production`. Two independent confirmations,
 *      because the destructive case deserves more than one.
 *   4. A target that already has tables is refused unless `--drop-existing`. Replaying
 *      into a populated database half-fails on existing objects and leaves a mixture
 *      of old and new rows — the one state worse than either.
 *
 * AND IT PROVES THE RESTORE LANDED. A replay that reports success but comes back with
 * fewer rows, or a wallet total that moved, is a silent data loss. Row counts and every
 * money invariant are recomputed against the manifest afterwards; any mismatch exits
 * non-zero and says so. Restoring is not the last step — checking is.
 *
 * ⛔ It NEVER records backup health. Only `db:verify-backup` may do that, because only
 * that script proves a backup restores into a clean database. A successful recovery
 * says nothing about whether TOMORROW's backup is good.
 *
 * Usage:
 *   npm run db:restore -- --file backups/50pick-full-<stamp>.sql.gz.enc \
 *     --target "$DATABASE_URL" --yes-restore-over kipindi_scratch
 *   # add --drop-existing when the target already has tables
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import pg from "pg";
import {
  BACKUP_KEY_ENV,
  backupKey,
  isSealed,
  openBackup,
  readManifest,
  maskUrl,
  type BackupManifest,
} from "../src/lib/server/backup/core.ts";

// Same list the verifier guards with. Kept identical on purpose: one definition of
// "this is production" across the whole backup toolchain.
const PRODUCTION_HOSTS = [/rlwy\.net$/i, /railway\.app$/i, /railway\.internal$/i, /50pick\.tz$/i];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

let failures = 0;
function ok(label: string, pass: boolean, extra?: string) {
  if (pass) console.log(`   ok   ${label}${extra ? `  ${extra}` : ""}`);
  else { failures++; console.log(`   FAIL ${label}${extra ? `  ${extra}` : ""}`); }
}

function die(msg: string): never {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

/** Human-readable summary of what is inside the artifact, before anything is touched. */
function describeManifest(m: BackupManifest): void {
  const ageMs = Date.now() - Date.parse(m.takenAt);
  const ageH = ageMs / 3_600_000;
  const rows = Object.values(m.tables).reduce((a, b) => a + b, 0);

  console.log("This backup contains:");
  console.log(`   taken at     ${m.takenAt}   (${ageH < 1 ? "<1" : Math.round(ageH)}h ago)`);
  console.log(`   source       ${m.source}`);
  console.log(`   server       ${m.server}`);
  console.log(`   tables       ${Object.keys(m.tables).length}  ·  ${rows.toLocaleString("en-US")} rows`);
  console.log(`   wallets      balance ${m.money.walletBalanceSum} · pending ${m.money.walletPendingSum} · hold ${m.money.walletHoldSum}`);
  console.log(`   ledger       ${m.money.ledgerEntries} entries · net ${m.money.ledgerNetSum} · unbalanced groups ${m.money.ledgerUnbalancedGroups}`);
  console.log(`   audit        ${m.audit.entries} entries · head ${m.audit.headEntryHash?.slice(0, 16) ?? "(none)"}…`);
  // Read defensively: artifacts written before manifest v2 have no such field.
  if (m.undeclaredTables?.length) {
    console.log(`   undeclared   ${m.undeclaredTables.join(", ")}  (dumped by introspection —`);
    console.log(`                the source database was ahead of the schema it was dumped with)`);
  }

  // Age is stated loudly rather than blocked: only the operator knows whether an old
  // backup is the right one. Being told is the point.
  if (ageH > 36) {
    console.log(`\n   ⚠️  This backup is ${Math.round(ageH)} hours old. Anything that happened since`);
    console.log(`       is NOT in it and will be gone after the restore.`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const file = arg("file");
  if (!file) die("!! --file <backup> is required.");

  const target = arg("target") ?? process.env.DATABASE_URL;
  if (!target) die("!! No target. Pass --target <url> or set DATABASE_URL.");

  // ── Open the artifact ────────────────────────────────────────────────────────
  console.log(`\nReading ${file}`);
  // Annotated, not inferred: readFileSync gives a Buffer<ArrayBuffer> and openBackup
  // returns Buffer<ArrayBufferLike>, so the reassignment below does not typecheck against
  // an inferred type. Only ever caught once tsconfig.backup.json started checking .mts.
  let buf: Buffer = readFileSync(file);

  if (isSealed(buf)) {
    // The SAME name db:backup sealed it under and db:verify-backup opens it with.
    // This read used to go straight to an env var called BACKUP_PASSPHRASE — a name
    // neither of the other two scripts has ever written or read — so an operator set
    // up to take and verify backups could not open one, and would find that out
    // during a recovery. See `backupKey()` in backup/core.ts.
    let pass: string | null = null;
    try {
      pass = backupKey();
    } catch (e) {
      die(`!! ${(e as Error).message}`);
    }
    if (!pass) die(`!! Sealed backup but ${BACKUP_KEY_ENV} is not set.`);
    try {
      buf = openBackup(buf, pass);
    } catch {
      // AES-GCM: a wrong key and a corrupted byte are indistinguishable, and both
      // mean the same thing operationally — this artifact cannot be trusted.
      die(`!! Could not open the backup. Wrong ${BACKUP_KEY_ENV}, or the file is corrupt.`);
    }
  }
  const sql = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8");
  console.log(`   ${(sql.length / 1_048_576).toFixed(1)} MiB of SQL · sha256 ${createHash("sha256").update(sql).digest("hex").slice(0, 16)}…\n`);

  const manifest = readManifest(sql);
  if (!manifest) die("!! No manifest in this file — it was not produced by db:backup. Refusing.");

  // ── Gate 1: show the operator what they are about to do ──────────────────────
  describeManifest(manifest);

  // ── Gate 2: the target must be named explicitly ──────────────────────────────
  const targetUrl = new URL(target);
  const targetDb = targetUrl.pathname.replace(/^\//, "");
  const targetHost = targetUrl.hostname;
  const isProd = PRODUCTION_HOSTS.some((re) => re.test(targetHost));

  console.log(`Target:   ${maskUrl(target)}`);
  console.log(`          database "${targetDb}" on ${targetHost}${isProd ? "   🔴 PRODUCTION" : ""}\n`);

  const named = arg("yes-restore-over");
  if (named !== targetDb) {
    die(
      `!! REFUSING — confirm the target by name.\n` +
        `   This will REPLACE every table in "${targetDb}".\n\n` +
        `   Re-run with:  --yes-restore-over ${targetDb}\n\n` +
        (named ? `   You passed "${named}", which is not the target database.` : "   (no --yes-restore-over given)"),
    );
  }

  // ── Gate 3: production needs a second, different confirmation ────────────────
  if (isProd && !has("i-understand-this-overwrites-production")) {
    die(
      `!! REFUSING — "${targetHost}" is a PRODUCTION host.\n` +
        `   Restoring here destroys live player balances, the settlement ledger and the\n` +
        `   audit chain, and replaces them with the state above. If that is genuinely\n` +
        `   what you intend, add:\n\n` +
        `     --i-understand-this-overwrites-production\n`,
    );
  }

  // ── Gate 4: never replay into a populated database by accident ───────────────
  const client = new pg.Client({ connectionString: target });
  client.on("error", (e) => console.warn(`   note: connection error: ${e.message}`));
  await client.connect();

  try {
    const existing = await client.query<{ n: string }>(
      `select count(*)::text n from information_schema.tables where table_schema = 'public'`,
    );
    const tableCount = Number(existing.rows[0].n);

    if (tableCount > 0) {
      if (!has("drop-existing")) {
        die(
          `!! REFUSING — "${targetDb}" already has ${tableCount} table(s).\n` +
            `   Replaying over them half-fails on objects that already exist and leaves a\n` +
            `   MIXTURE of old and restored rows, which is worse than either. To wipe the\n` +
            `   public schema first, add:\n\n` +
            `     --drop-existing\n`,
        );
      }
      console.log(`Dropping the existing public schema (${tableCount} tables)...`);
      await client.query(`drop schema public cascade`);
      await client.query(`create schema public`);
      console.log("   done\n");
    }

    // ── Replay ─────────────────────────────────────────────────────────────────
    // One simple-protocol query: schema, extensions, data and sequence resets inside
    // the BEGIN/COMMIT the dump carries. Either all of it lands or none does — a
    // partial restore is the state we refuse to create.
    console.log("Restoring...");
    const t0 = Date.now();
    await client.query(sql);
    console.log(`   replayed in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    // ── Prove it landed ────────────────────────────────────────────────────────
    // A replay that "succeeded" but lost rows is silent data loss. This is the step
    // that turns "the command exited 0" into "the data is back".
    console.log("Row counts vs manifest:");
    for (const [table, expected] of Object.entries(manifest.tables)) {
      const r = await client.query<{ n: string }>(
        `select count(*)::text n from "public".${JSON.stringify(table)}`,
      );
      const actual = Number(r.rows[0].n);
      ok(table.padEnd(24), actual === expected, `${actual} / ${expected}`);
    }

    console.log("\nMoney invariants vs manifest:");
    const m = await client.query<{
      balance: string; pending: string; hold: string; bonus: string;
      ledger_entries: string; ledger_net: string; unbalanced: string;
    }>(`select
          coalesce((select sum("balance") from "public"."Wallet"), 0)::text as balance,
          coalesce((select sum("pending") from "public"."Wallet"), 0)::text as pending,
          coalesce((select sum("hold")    from "public"."Wallet"), 0)::text as hold,
          -- 🔴 This summed a column named "bonus". There is no such column: it is
          -- "bonusBalance" (prisma/schema.prisma). Postgres threw HERE, AFTER the replay
          -- above had already COMMITTED, so db:restore reported "restore failed ...
          -- nothing was committed" while every shilling was in fact back. A false
          -- negative during a recovery, which is the one moment nobody can afford to
          -- re-litigate what the tool is telling them. Never found because the script
          -- had never been run against a real backup, and because test:backup asserted
          -- the SQL's surrounding STRINGS rather than its column names.
          coalesce((select sum("bonusBalance") from "public"."Wallet"), 0)::text as bonus,
          (select count(*)::text from "public"."LedgerEntry") as ledger_entries,
          coalesce((select sum("amount") from "public"."LedgerEntry"), 0)::text as ledger_net,
          coalesce((select count(*) from (
            select "groupId" from "public"."LedgerEntry" group by "groupId" having sum("amount") <> 0
          ) g), 0)::text as unbalanced`);
    const r = m.rows[0];
    const eq = (a: string, b: string) => Number(a) === Number(b);
    ok("wallet balance sum".padEnd(24), eq(r.balance, manifest.money.walletBalanceSum), `${r.balance} / ${manifest.money.walletBalanceSum}`);
    ok("wallet pending sum".padEnd(24), eq(r.pending, manifest.money.walletPendingSum), `${r.pending} / ${manifest.money.walletPendingSum}`);
    ok("wallet hold sum".padEnd(24), eq(r.hold, manifest.money.walletHoldSum), `${r.hold} / ${manifest.money.walletHoldSum}`);
    ok("wallet bonus sum".padEnd(24), eq(r.bonus, manifest.money.walletBonusSum), `${r.bonus} / ${manifest.money.walletBonusSum}`);
    ok("ledger entries".padEnd(24), Number(r.ledger_entries) === manifest.money.ledgerEntries, `${r.ledger_entries} / ${manifest.money.ledgerEntries}`);
    ok("ledger net sum".padEnd(24), eq(r.ledger_net, manifest.money.ledgerNetSum), `${r.ledger_net} / ${manifest.money.ledgerNetSum}`);
    ok("unbalanced groups".padEnd(24), Number(r.unbalanced) === manifest.money.ledgerUnbalancedGroups, `${r.unbalanced} / ${manifest.money.ledgerUnbalancedGroups}`);

    console.log("\nAudit chain:");
    const a = await client.query<{ n: string; head: string | null }>(
      `select (select count(*)::text from "public"."AuditLog") as n,
              (select "entryHash" from "public"."AuditLog" order by "seq" desc limit 1) as head`,
    );
    ok("entries".padEnd(24), Number(a.rows[0].n) === manifest.audit.entries, `${a.rows[0].n} / ${manifest.audit.entries}`);
    ok("head hash".padEnd(24), a.rows[0].head === manifest.audit.headEntryHash,
      `${a.rows[0].head?.slice(0, 16) ?? "(none)"}… / ${manifest.audit.headEntryHash?.slice(0, 16) ?? "(none)"}…`);
  } finally {
    await client.end().catch(() => {});
  }

  console.log("\n" + "=".repeat(70));
  if (failures) {
    console.log(`RESTORE COMPLETED BUT ${failures} CHECK(S) FAILED.`);
    console.log("The data is in the database but does NOT match the manifest. Treat this as");
    console.log("a partial recovery: do not resume trading until the differences are understood.");
    console.log("=".repeat(70) + "\n");
    process.exit(1);
  }
  console.log("RESTORE VERIFIED — every row count, money invariant and the audit head match.");
  console.log("");
  console.log("⛔ This did NOT update backup health on /admin/compliance. Only");
  console.log("   `npm run db:verify-backup` may do that, because only it proves a backup");
  console.log("   restores into a CLEAN database. Run it against tomorrow's backup as usual.");
  console.log("=".repeat(70) + "\n");
}

main().catch((e) => {
  console.error("\n!! restore failed:", (e as Error)?.message ?? e);
  console.error("   Nothing was committed if the failure was inside the replay — the dump\n" +
                "   carries its own BEGIN/COMMIT, so a mid-replay error rolls the whole thing back.\n");
  process.exit(1);
});
