/**
 * `npm run db:verify-backup -- --file <backup>` — prove a backup actually restores.
 *
 * A backup you have never restored is not a backup. It is a file you feel good
 * about. This replaces the feeling with evidence, and it is the ONLY thing in this
 * repo permitted to record a healthy backup state for `/admin/compliance`.
 *
 *   npm run db:verify-backup -- --file backups/50pick-full-<stamp>.sql.gz.enc
 *   npm run db:verify-backup -- --file <f> --record     # also update the compliance card
 *
 * WHAT IT DOES
 *   1. Opens the sealed artifact (AES-256-GCM ⇒ a wrong key or one flipped byte
 *      fails here, loudly, rather than restoring plausible garbage).
 *   2. Creates a THROWAWAY database on the scratch cluster and restores from empty.
 *   3. Checks every table's row count against the manifest.
 *   4. Recomputes every money invariant on the RESTORED data — wallet totals,
 *      ledger net, unbalanced groups, the audit chain head.
 *   5. Runs the platform's OWN `trialBalance()` and `verifyChainFull()` against the
 *      restored database. This is the part that matters: the proof is that 50pick's
 *      real integrity code passes on the recovered data, not that a bespoke query
 *      in this file agrees with a bespoke query in the dump. A gate that
 *      re-implements what it is checking is how three "green" gates in this repo
 *      sat on top of broken things.
 *   6. Confirms `AuditLog.seq` resumes ABOVE the restored maximum — otherwise the
 *      site comes back up looking perfect and then cannot write a single audit row.
 *   7. Checks referential integrity across the money tables.
 *   8. Prints a real restored wallet and its ledger trail, so a human can read it.
 *   9. Drops the throwaway database.
 *
 * PRODUCTION IS NEVER THE TARGET. The scratch cluster is rejected outright if it
 * resolves to a known production host — there is no override flag, because there is
 * no legitimate reason to restore a backup over the live money database as a test.
 * (`db:restore` is the deliberate, separately-guarded tool for a real recovery.)
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import pg from "pg";
import {
  isSealed,
  maskUrl,
  openBackup,
  readManifest,
  type BackupManifest,
} from "../src/lib/server/backup/core.ts";
import type { BackupRun } from "../src/lib/server/backup/state.ts";
import { BACKUP_STATE_KEY } from "../src/lib/server/backup/state.ts";

/** Hosts that are the live business. Never a verification target. */
const PRODUCTION_HOSTS = [/rlwy\.net$/i, /railway\.app$/i, /railway\.internal$/i, /50pick\.tz$/i];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

const failures: string[] = [];
let checks = 0;
function ok(label: string, cond: boolean, detail = ""): void {
  checks++;
  if (cond) console.log(`   OK   ${label}${detail ? `  ${detail}` : ""}`);
  else {
    console.log(`   FAIL ${label}${detail ? `  ${detail}` : ""}`);
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Decimal-safe comparison: these are money strings from Postgres, not floats. */
function sameMoney(a: string, b: string): boolean {
  const n = (s: string): number => Math.round(Number(s) * 100);
  return n(a) === n(b);
}

async function main(): Promise<void> {
  const file = arg("file");
  if (!file) {
    console.error("usage: npm run db:verify-backup -- --file <backup.sql.gz[.enc]> [--record]");
    process.exit(1);
  }

  // ── Scratch target ────────────────────────────────────────────────────────
  const scratchAdminUrl = arg("scratch") ?? process.env.VERIFY_DATABASE_URL;
  if (!scratchAdminUrl) {
    console.error(
      "No scratch cluster. Set VERIFY_DATABASE_URL (or pass --scratch <url>) to a\n" +
        "disposable Postgres this script may create and drop databases on.\n" +
        "  local: postgresql://postgres:pw@localhost:5433/postgres\n" +
        "  CI:    the workflow's own postgres service",
    );
    process.exit(1);
  }
  const scratchHost = new URL(scratchAdminUrl).hostname;
  if (PRODUCTION_HOSTS.some((re) => re.test(scratchHost))) {
    console.error(
      `\n!! REFUSING — the scratch cluster resolves to "${scratchHost}", which is production.\n` +
        `   Verification restores a full copy of the database; it never runs against the\n` +
        `   live money cluster. There is no override for this.\n`,
    );
    process.exit(2);
  }

  // ── 1. Open the artifact ──────────────────────────────────────────────────
  const raw = readFileSync(file);
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const sealed = isSealed(raw);
  let sql: string;
  if (sealed) {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key) {
      console.error("!! This backup is sealed and BACKUP_ENCRYPTION_KEY is not set.");
      process.exit(2);
    }
    // Throws on a wrong key or a single corrupted byte — GCM authenticates.
    sql = gunzipSync(openBackup(raw, key)).toString("utf8");
  } else {
    sql = gunzipSync(raw).toString("utf8");
  }

  const manifest: BackupManifest | null = readManifest(sql);
  if (!manifest) {
    console.error("!! This backup has no manifest — it cannot self-verify. Re-take it with db:backup.");
    process.exit(2);
  }

  const expectedRows = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
  console.log(`Backup:   ${file}`);
  console.log(`Sealed:   ${sealed ? "yes (AES-256-GCM, opened OK)" : "NO — plaintext"}`);
  console.log(`sha256:   ${sha256}`);
  console.log(`Taken:    ${manifest.takenAt}  from ${manifest.source}`);
  console.log(`Expects:  ${expectedRows} rows / ${Object.keys(manifest.tables).length} tables · ` +
    `${manifest.money.walletBalanceSum} TZS in ${manifest.tables.Wallet ?? 0} wallets · ` +
    `${manifest.audit.entries} audit entries\n`);

  // ── 2. Throwaway database ─────────────────────────────────────────────────
  const scratchName = `kipindi_verify_${manifest.takenAt.replace(/\D/g, "").slice(0, 14)}_${process.pid}`;
  const admin = new pg.Client({ connectionString: scratchAdminUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${JSON.stringify(scratchName)}`);
  await admin.query(`CREATE DATABASE ${JSON.stringify(scratchName)}`);
  await admin.end();

  const scratchUrl = (() => {
    const u = new URL(scratchAdminUrl);
    u.pathname = `/${scratchName}`;
    return u.toString();
  })();
  console.log(`Scratch:  ${maskUrl(scratchUrl)}\n`);

  let recorded: BackupRun | null = null;
  // Held outside the try so `finally` can close it before dropping the database.
  // An ioredis-style trap applies to pg too: a Client with no 'error' listener
  // re-throws an async server notice as an uncaught exception, which killed the
  // process before main().catch could report WHY the restore failed.
  let client: pg.Client | null = null;

  try {
    client = new pg.Client({ connectionString: scratchUrl });
    client.on("error", (e) => console.warn(`   note: scratch connection error: ${e.message}`));
    await client.connect();

    console.log("Restoring from empty...");
    const t0 = Date.now();
    // One simple-protocol query: the whole file, schema + data + sequences, inside
    // the BEGIN/COMMIT the dump carries. Either all of it lands or none does.
    await client.query(sql);
    console.log(`   restored in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    // ── 3. Extensions. The restore already proved they install (the GIN indexes
    //      would not build otherwise) — this proves the manifest describes reality.
    if (manifest.extensions?.length) {
      console.log("Extensions:");
      const ex = await client.query<{ name: string; version: string }>(
        `select extname as name, extversion as version from pg_extension`,
      );
      const present = new Map(ex.rows.map((r) => [r.name, r.version]));
      for (const want of manifest.extensions) {
        ok(want.name.padEnd(22), present.has(want.name), `${present.get(want.name) ?? "MISSING"} / ${want.version}`);
      }
      console.log("");
    }

    // ── 4. Row counts ────────────────────────────────────────────────────────
    console.log("Row counts vs manifest:");
    for (const [table, expected] of Object.entries(manifest.tables)) {
      const r = await client.query<{ n: string }>(`select count(*)::text n from "public".${JSON.stringify(table)}`);
      const actual = Number(r.rows[0].n);
      ok(table.padEnd(22), actual === expected, `${actual} / ${expected}`);
    }

    // ── 4. Money invariants, recomputed on the RESTORED data ─────────────────
    console.log("\nMoney invariants on the restored database:");
    const m = await client.query<{
      balance: string; pending: string; hold: string; bonus: string;
      ledger_entries: string; ledger_net: string; unbalanced: string;
    }>(`select
          coalesce((select sum("balance")      from "public"."Wallet"), 0)::text as balance,
          coalesce((select sum("pending")      from "public"."Wallet"), 0)::text as pending,
          coalesce((select sum("hold")         from "public"."Wallet"), 0)::text as hold,
          coalesce((select sum("bonusBalance") from "public"."Wallet"), 0)::text as bonus,
          (select count(*) from "public"."LedgerEntry")::text                    as ledger_entries,
          coalesce((select sum("amount") from "public"."LedgerEntry"), 0)::text  as ledger_net,
          (select count(*)::text from (select "groupId" from "public"."LedgerEntry"
             group by "groupId" having sum("amount") <> 0) g)                    as unbalanced`);
    const got = m.rows[0];
    ok("wallet balance total", sameMoney(got.balance, manifest.money.walletBalanceSum), `${got.balance} / ${manifest.money.walletBalanceSum}`);
    ok("wallet pending total", sameMoney(got.pending, manifest.money.walletPendingSum), `${got.pending} / ${manifest.money.walletPendingSum}`);
    ok("wallet hold total", sameMoney(got.hold, manifest.money.walletHoldSum), `${got.hold} / ${manifest.money.walletHoldSum}`);
    ok("wallet bonus total", sameMoney(got.bonus, manifest.money.walletBonusSum), `${got.bonus} / ${manifest.money.walletBonusSum}`);
    ok("ledger entry count", Number(got.ledger_entries) === manifest.money.ledgerEntries, `${got.ledger_entries} / ${manifest.money.ledgerEntries}`);
    ok("ledger net sum", sameMoney(got.ledger_net, manifest.money.ledgerNetSum), `${got.ledger_net} / ${manifest.money.ledgerNetSum}`);
    ok("unbalanced ledger groups", Number(got.unbalanced) === manifest.money.ledgerUnbalancedGroups, `${got.unbalanced} / ${manifest.money.ledgerUnbalancedGroups}`);

    // ── 5. Audit chain head + the sequence that makes it writable again ──────
    console.log("\nAudit chain:");
    const a = await client.query<{ n: string; head: string | null; maxseq: string | null }>(
      `select (select count(*) from "public"."AuditLog")::text as n,
              (select "entryHash" from "public"."AuditLog" order by "seq" desc limit 1) as head,
              (select max("seq")::text from "public"."AuditLog") as maxseq`,
    );
    ok("entry count", Number(a.rows[0].n) === manifest.audit.entries, `${a.rows[0].n} / ${manifest.audit.entries}`);
    ok("head entryHash", a.rows[0].head === manifest.audit.headEntryHash, `${a.rows[0].head?.slice(0, 16) ?? "—"}…`);
    ok("max seq", (a.rows[0].maxseq ?? null) === (manifest.audit.maxSeq ?? null), `${a.rows[0].maxseq ?? "—"}`);

    // The failure this catches: rows restore perfectly, the sequence does not, and
    // the FIRST audit write after recovery dies on the unique constraint. The site
    // looks healthy and silently cannot record anything.
    const seqName = await client.query<{ s: string | null }>(
      `select pg_get_serial_sequence('"public"."AuditLog"', 'seq') as s`,
    );
    if (seqName.rows[0].s) {
      const next = await client.query<{ n: string }>(`select nextval(${JSON.stringify(seqName.rows[0].s)})::text n`);
      const maxSeq = Number(manifest.audit.maxSeq ?? 0);
      ok(
        "seq resumes above the restored max",
        Number(next.rows[0].n) > maxSeq,
        `next=${next.rows[0].n} max=${maxSeq || "—"}`,
      );
    }

    // ── 6. Referential integrity across the money tables ─────────────────────
    console.log("\nReferential integrity:");
    const orphanChecks: Array<[string, string]> = [
      ["Position → PredictionMarket", `select count(*)::text n from "public"."Position" p left join "public"."PredictionMarket" m on m."id" = p."marketId" where m."id" is null`],
      ["Position → User", `select count(*)::text n from "public"."Position" p left join "public"."User" u on u."id" = p."userId" where u."id" is null`],
      ["Wallet → User", `select count(*)::text n from "public"."Wallet" w left join "public"."User" u on u."id" = w."userId" where u."id" is null`],
      ["Transaction → Wallet", `select count(*)::text n from "public"."Transaction" t left join "public"."Wallet" w on w."id" = t."walletId" where w."id" is null`],
    ];
    for (const [label, q] of orphanChecks) {
      const r = await client.query<{ n: string }>(q);
      ok(label.padEnd(28), r.rows[0].n === "0", `${r.rows[0].n} orphan(s)`);
    }

    // ── 7. A restored wallet a human can read ────────────────────────────────
    const sample = await client.query<{ userId: string; phone: string; balance: string }>(
      `select w."userId", u."phoneE164" as phone, w."balance"::text as balance
         from "public"."Wallet" w join "public"."User" u on u."id" = w."userId"
        order by w."balance" desc limit 1`,
    );
    if (sample.rows.length) {
      const s = sample.rows[0];
      // Mask the phone: this output lands in CI logs.
      const masked = s.phone ? `${s.phone.slice(0, 6)}***${s.phone.slice(-2)}` : "—";
      console.log(`\nLargest restored wallet: ${masked}  balance ${s.balance} TZS`);
      const trail = await client.query<{ account: string; entryType: string; amount: string; memo: string | null }>(
        `select "account", "entryType", "amount"::text as amount, "memo" from "public"."LedgerEntry"
          where "userId" = $1 order by "createdAt" limit 6`,
        [s.userId],
      );
      for (const t of trail.rows) {
        console.log(`   ${t.account.padEnd(30)} ${t.entryType.padEnd(18)} ${t.amount.padStart(12)}  ${t.memo ?? ""}`);
      }
    }

    await client.end();
    client = null;

    // ── 8. THE PROOF: 50pick's own integrity code, on the restored data ──────
    //
    // Point the process at the scratch database BEFORE importing anything that
    // touches Prisma — prisma() latches its client on globalThis from
    // DATABASE_URL at first call, which is exactly the seam the load harness uses.
    console.log("\n50pick's own integrity functions, run against the restored database:");
    process.env.DATABASE_URL = scratchUrl;
    process.env.USE_PRISMA_DAL = "true";

    const { trialBalance } = await import("../src/lib/server/ledger.ts");
    const tb = await trialBalance();
    ok("trialBalance().ok", tb.ok, `drift ${tb.totalAbsDrift} across ${tb.checkedWallets} wallets, globalSum ${tb.globalSum}`);
    ok("no drifting wallets", tb.driftingWallets === 0, `${tb.driftingWallets} drifting`);
    ok("no imbalanced groups", tb.imbalancedGroups.length === 0, `${tb.imbalancedGroups.length}`);

    const { verifyChainFull } = await import("../src/lib/server/audit.ts");
    const chain = await verifyChainFull();
    // linkBroken is the real tamper/loss signal — a row inserted, removed or
    // reordered. Hash-unverifiable rows predate the current signing key and are
    // reported, not failed (see audit.ts).
    ok("audit chain links intact", !chain.linkBroken, chain.linkBroken ? `first break at ${chain.firstBreakAt}` : `${chain.total} entries`);
    ok("audit chain valid", chain.valid, chain.valid ? "" : `break at index ${chain.index}`);
    if (chain.unverifiable) {
      console.log(`   note  ${chain.unverifiable} entr(ies) predate the current signing key — links still verified`);
    }

    const { PrismaClient: PC } = await import("@prisma/client");
    void PC;

    // ── 9. Record the verified run for /admin/compliance ────────────────────
    if (has("record")) {
      const recordUrl = process.env.BACKUP_RECORD_DATABASE_URL;
      if (!recordUrl) {
        console.warn("\n   --record given but BACKUP_RECORD_DATABASE_URL is unset — nothing written.");
      } else {
        recorded = {
          finishedAt: new Date().toISOString(),
          ok: true,
          verified: failures.length === 0,
          sizeBytes: raw.length,
          rows: expectedRows,
          sha256,
          destination: process.env.BACKUP_DESTINATION ?? "unspecified",
          sealed,
          ...(failures.length ? { error: `${failures.length} verification failure(s): ${failures[0]}` } : {}),
        };
        // A dedicated client: the singleton above is bound to the scratch DB.
        const rec = new PrismaClient({ datasources: { db: { url: recordUrl } }, log: ["error"] });
        await rec.systemConfig.upsert({
          where: { key: BACKUP_STATE_KEY },
          create: { key: BACKUP_STATE_KEY, value: recorded as unknown as object },
          update: { value: recorded as unknown as object },
        });
        await rec.$disconnect();
        console.log(`\nRecorded ${BACKUP_STATE_KEY} on ${maskUrl(recordUrl)} — verified=${recorded.verified}`);
      }
    }
  } finally {
    // Close our own connection first, or the terminate below kills it mid-flight
    // and the resulting async error masks whatever actually went wrong.
    if (client) await client.end().catch(() => {});
    // Always drop the throwaway, even on failure. Connect to the admin database:
    // you cannot drop a database you are connected to.
    try {
      const cleanup = new pg.Client({ connectionString: scratchAdminUrl });
      await cleanup.connect();
      await cleanup.query(
        `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
        [scratchName],
      );
      await cleanup.query(`DROP DATABASE IF EXISTS ${JSON.stringify(scratchName)}`);
      await cleanup.end();
    } catch (e) {
      console.warn(`   note: could not drop scratch database ${scratchName}: ${(e as Error).message}`);
    }
  }

  console.log("");
  if (failures.length) {
    console.error(`!! VERIFICATION FAILED — ${failures.length} of ${checks} checks:`);
    failures.slice(0, 20).forEach((f) => console.error(`   - ${f}`));
    console.error(`\n   DO NOT TRUST THIS BACKUP.`);
    process.exit(2);
  }

  console.log("===============================================================");
  console.log(`  VERIFIED — ${checks} checks passed.`);
  console.log("  This backup restores into an empty Postgres, every shilling and");
  console.log("  every audit link comes back intact, and the platform's own trial");
  console.log("  balance and chain verification pass on the restored data.");
  console.log("===============================================================");
  if (recorded) console.log(`\n::verify-result::${JSON.stringify(recorded)}`);
}

main().catch((e: unknown) => {
  console.error("\nVERIFY FAILED:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
