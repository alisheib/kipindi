/**
 * `npm run db:backup` — a full, self-contained, restorable backup of the money
 * database.
 *
 *   npm run db:backup                                    # uses DATABASE_URL
 *   railway run --service 50pick npm run db:backup       # against production
 *
 * WHY THIS EXISTS. 50pick is a licensed real-money operator holding player
 * balances, a double-entry ledger and a tamper-evident settlement record — and
 * until today it had no backup script of any kind. Everything else on the
 * hardening list is recoverable; losing this database is not.
 *
 * WHY PLAIN SQL AND NOT `pg_dump`. `pg_dump` is not installed on the Windows
 * machine this repo is worked on, and its version must match the server or it
 * refuses. A plain `.sql` file needs no binaries to create and no bespoke tool to
 * restore — `psql`, pgAdmin, DBeaver or any managed-host import can read it. A
 * backup must not depend on tooling we do not have on the day we need it.
 *
 * WHY `.mts` AND NOT `.ts`. `tsconfig.json` includes `scripts/**\/*.ts`, so a `.ts`
 * script is typechecked as part of `next build` and its imports are dragged into
 * the Railway deploy. `.mts` files are outside that include.
 *
 * FOUR THINGS THAT MAKE THIS TRUSTWORTHY:
 *
 *  1. **Every column is read `::text`.** Postgres formats each value and Postgres
 *     re-parses it on the way back in, so no driver type conversion sits in the
 *     middle. This is not tidiness: Prisma maps `DateTime` to `timestamp(3)`
 *     WITHOUT time zone, which node-postgres parses into a LOCAL-time JS Date —
 *     restoring through the driver would silently shift every transaction,
 *     settlement and audit timestamp by the machine's UTC offset. In Dar es Salaam
 *     that is three hours of ledger.
 *  2. **The table set is derived from the Prisma schema** (`tableOrder()`), never
 *     hand-listed, and the run still ABORTS if the live database contains a table
 *     the derivation missed. See the header of `src/lib/server/backup/core.ts` for
 *     the three separate times a hand-maintained list silently dropped a table in
 *     the sibling repo.
 *  3. **The manifest carries money invariants**, not just row counts — wallet
 *     totals, ledger balance, the audit chain head. `db:verify-backup` recomputes
 *     all of them on the restored copy.
 *  4. **The artifact is sealed** (AES-256-GCM) unless the source is a local
 *     disposable database. A dump of this database is every phone number, NIDA,
 *     KYC OCR string and email the platform holds; fixing a recovery gap must not
 *     open a data-protection one.
 *
 * A backup this script wrote is still only a file. `db:verify-backup` is what makes
 * it a backup, and it is the only thing that may record a healthy state for the
 * compliance card.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  MANIFEST_MARKER,
  MANIFEST_VERSION,
  PRISMA_MIGRATIONS_DDL,
  SERIAL_COLUMNS,
  ident,
  isLocalHost,
  lit,
  maskUrl,
  sealBackup,
  sequenceResetSql,
  tableOrder,
  type BackupManifest,
} from "../src/lib/server/backup/core.ts";

/** Keep a single INSERT statement under this. Payload JSON rows can be large. */
const MAX_STATEMENT_BYTES = 4 * 1024 * 1024;

function fail(msg: string): never {
  console.error(`\n!! ${msg}\n`);
  process.exit(2);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set — nothing to back up.");

  const local = isLocalHost(url);
  const passphrase = process.env.BACKUP_ENCRYPTION_KEY;
  // A local disposable database may be dumped in the clear (it holds fixtures).
  // Anything else holds real player PII and MUST be sealed — no flag overrides it.
  if (!local && !passphrase) {
    fail(
      "BACKUP_ENCRYPTION_KEY is not set, and this is not a localhost database.\n" +
        "   A 50pick dump contains every phone number, NIDA, KYC OCR string and email\n" +
        "   address on the platform. Refusing to write it in plaintext.\n" +
        "   Generate one:  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  if (passphrase && passphrase.length < 24) {
    fail("BACKUP_ENCRYPTION_KEY is shorter than 24 characters — use a generated 32-byte key.");
  }

  console.log(`Source:  ${maskUrl(url)}`);
  const prisma = new PrismaClient({ datasources: { db: { url } }, log: ["error"] });

  const [{ v: serverVersion }] = await prisma.$queryRawUnsafe<{ v: string }[]>("select version() as v");
  const server = serverVersion.split(" on ")[0];
  console.log(`Server:  ${server}`);

  // ── 1. The live table set must be fully covered by what we know how to dump ──
  const liveRows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  const liveTables = liveRows.map((r) => r.table_name).sort();
  const known = tableOrder();
  // `_prisma_migrations` is Prisma's own bookkeeping table; it has its own DDL
  // below and is dumped explicitly, so it is expected in the live set.
  const covered = new Set([...known, "_prisma_migrations"]);
  const unknown = liveTables.filter((t) => !covered.has(t));
  const absent = known.filter((t) => !liveTables.includes(t));

  if (unknown.length) {
    fail(
      `ABORT — the database has ${unknown.length} table(s) this backup does not cover:\n` +
        unknown.map((t) => `     - ${t}`).join("\n") +
        `\n\n   These are tables Prisma's schema does not declare, so tableOrder() cannot see\n` +
        `   them. Add the model to prisma/schema.prisma, or drop the table if it is dead.\n` +
        `   Refusing to write a backup that silently omits data.`,
    );
  }
  if (absent.length) {
    console.warn(`   note: schema declares table(s) not present in this DB (skipped): ${absent.join(", ")}`);
  }
  console.log(`Tables:  ${liveTables.length} live, all covered.\n`);

  // Every autoincrement column must be in SERIAL_COLUMNS or a restored database
  // hands out a colliding id on its first write. Cheap to check, fatal to miss.
  const serials = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
    `select table_name, column_name from information_schema.columns
      where table_schema = 'public' and is_identity = 'NO'
        and column_default like 'nextval%'`,
  );
  const declared = new Set(SERIAL_COLUMNS.map((s) => `${s.table}.${s.column}`));
  const undeclared = serials
    .map((s) => `${s.table_name}.${s.column_name}`)
    .filter((k) => !declared.has(k) && !k.startsWith("_prisma_migrations."));
  if (undeclared.length) {
    fail(
      `ABORT — ${undeclared.length} autoincrement column(s) are not in SERIAL_COLUMNS:\n` +
        undeclared.map((k) => `     - ${k}`).join("\n") +
        `\n\n   A restore would not advance their sequences, so the FIRST write after\n` +
        `   recovery would collide on the unique constraint. Add them to SERIAL_COLUMNS\n` +
        `   in src/lib/server/backup/core.ts.`,
    );
  }

  // ── 2a. Extensions. `prisma migrate diff` does NOT emit these ───────────────
  //
  // The first restore drill died here: the diff happily rebuilt the pg_trgm GIN
  // indexes from the search migration without the extension that defines
  // `gin_trgm_ops`. Dump them from `pg_extension` so the restore is self-contained.
  // `plpgsql` is installed in every database by default and is skipped.
  const extRows = await prisma.$queryRawUnsafe<{ name: string; schema: string; version: string }[]>(
    `select e.extname as name, n.nspname as schema, e.extversion as version
       from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname <> 'plpgsql'
      order by e.extname`,
  );
  const extensionSql = extRows.length
    ? extRows
        .map((e) => `CREATE EXTENSION IF NOT EXISTS ${ident(e.name)} WITH SCHEMA ${ident(e.schema)};`)
        .join("\n")
    : "-- (no non-default extensions)";
  console.log(`Ext:     ${extRows.length ? extRows.map((e) => `${e.name} ${e.version}`).join(", ") : "none"}\n`);

  // ── 2b. Schema DDL, generated from the LIVE database (immune to repo drift) ──
  console.log("Generating schema DDL from the live database...");
  // Spawn the Prisma CLI through node directly: `npx.cmd` fails with EINVAL on
  // Windows since Node 20 hardened .cmd execution, and npx resolves the same file.
  const require_ = createRequire(import.meta.url);
  const prismaCli = require_.resolve("prisma/build/index.js", { paths: [process.cwd()] });
  const rawDdl = execFileSync(
    process.execPath,
    [prismaCli, "migrate", "diff", "--from-empty", "--to-url", url, "--script"],
    { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, env: process.env },
  ).trim();
  if (!/CREATE TABLE/i.test(rawDdl)) fail("Schema DDL generation produced no CREATE TABLE statements.");

  // ── 2c. Indexes come from POSTGRES, not from the diff ───────────────────────
  //
  // 🔴 THE SECOND THING THE FIRST RESTORE DRILL FOUND. `prisma migrate diff` renders
  // every index with an explicit sort direction, including GIN ones:
  //     CREATE INDEX "…_trgm_idx" ON "…" USING GIN ("titleEn" gin_trgm_ops ASC);
  // Postgres rejects that outright — `access method "gin" does not support ASC/DESC
  // options`. So Prisma's index DDL is not re-executable against this schema at all,
  // and a backup built on it restores its tables and then dies.
  //
  // `pg_indexes.indexdef` is Postgres's own canonical rendering of a live index and
  // is guaranteed re-executable — it is what `pg_dump` emits. Indexes that back a
  // constraint (every PRIMARY KEY) are excluded, because the constraint in the table
  // DDL already creates them.
  const idxRows = await prisma.$queryRawUnsafe<{ name: string; def: string }[]>(
    `select i.indexname as name, i.indexdef as def
       from pg_indexes i
       join pg_class c on c.relname = i.indexname
       join pg_namespace n on n.oid = c.relnamespace and n.nspname = i.schemaname
      where i.schemaname = 'public'
        and not exists (select 1 from pg_constraint con where con.conindid = c.oid)
      order by i.indexname`,
  );
  // Strip the diff's own index statements; everything else it emits (tables,
  // columns, types, defaults, foreign keys, primary keys) is correct and kept.
  const ddl = rawDdl.replace(/^-- CreateIndex\r?\n/gim, "").replace(/^CREATE\s+(?:UNIQUE\s+)?INDEX[\s\S]*?;[ \t]*\r?$/gim, "").replace(/\n{3,}/g, "\n\n").trim();
  const strippedCount = (rawDdl.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX/gim) ?? []).length;
  const indexSql = idxRows.map((r) => `${r.def};`).join("\n");
  console.log(`   ${ddl.split("\n").length} lines of DDL (dropped ${strippedCount} generated index statements)`);
  console.log(`   ${idxRows.length} indexes taken from pg_indexes instead.\n`);

  // ── 3. Data — every column cast to text, Postgres doing all the formatting ──
  const parts: string[] = [];
  const tables: Record<string, number> = {};
  let totalRows = 0;

  for (const table of [...known, "_prisma_migrations"]) {
    if (!liveTables.includes(table)) continue;

    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position`,
      table,
    );
    const colNames = cols.map((c) => c.column_name);
    const selectList = colNames.map((c) => `${ident(c)}::text as ${ident(c)}`).join(", ");
    // Stable row order so two dumps of the same database are byte-comparable.
    const orderBy = colNames.includes("id") ? ` order by ${ident("id")}` : "";

    const rows = await prisma.$queryRawUnsafe<Record<string, string | null>[]>(
      `select ${selectList} from ${ident("public")}.${ident(table)}${orderBy}`,
    );
    tables[table] = rows.length;
    totalRows += rows.length;

    if (!rows.length) {
      parts.push(`-- ${table}: 0 rows`);
      continue;
    }

    const head = `INSERT INTO ${ident("public")}.${ident(table)} (${colNames.map(ident).join(", ")}) VALUES\n`;
    let batch: string[] = [];
    let batchBytes = 0;
    const flush = (): void => {
      if (!batch.length) return;
      parts.push(head + batch.join(",\n") + ";");
      batch = [];
      batchBytes = 0;
    };
    for (const row of rows) {
      const tuple = `(${colNames.map((c) => lit(row[c] ?? null)).join(", ")})`;
      if (batchBytes + tuple.length > MAX_STATEMENT_BYTES) flush();
      batch.push(tuple);
      batchBytes += tuple.length + 2;
    }
    flush();
    parts.push(`-- ${table}: ${rows.length} rows`);
    console.log(`   ${table.padEnd(22)} ${String(rows.length).padStart(7)} rows`);
  }

  // ── 4. Money invariants at capture time ─────────────────────────────────────
  const [money] = await prisma.$queryRawUnsafe<
    {
      balance: string; pending: string; hold: string; bonus: string;
      ledger_entries: string; ledger_net: string;
    }[]
  >(`select
       coalesce((select sum("balance")      from "public"."Wallet"), 0)::text as balance,
       coalesce((select sum("pending")      from "public"."Wallet"), 0)::text as pending,
       coalesce((select sum("hold")         from "public"."Wallet"), 0)::text as hold,
       coalesce((select sum("bonusBalance") from "public"."Wallet"), 0)::text as bonus,
       (select count(*) from "public"."LedgerEntry")::text                    as ledger_entries,
       coalesce((select sum("amount") from "public"."LedgerEntry"), 0)::text  as ledger_net`);

  const [{ n: unbalanced }] = await prisma.$queryRawUnsafe<{ n: string }[]>(
    `select count(*)::text n from (
       select "groupId" from "public"."LedgerEntry"
       group by "groupId" having sum("amount") <> 0
     ) g`,
  );

  const [audit] = await prisma.$queryRawUnsafe<{ n: string; head: string | null; maxseq: string | null }[]>(
    `select (select count(*) from "public"."AuditLog")::text as n,
            (select "entryHash" from "public"."AuditLog" order by "seq" desc limit 1) as head,
            (select max("seq")::text from "public"."AuditLog") as maxseq`,
  );

  await prisma.$disconnect();

  const takenAt = new Date().toISOString();
  const manifest: BackupManifest = {
    version: MANIFEST_VERSION,
    takenAt,
    server,
    source: maskUrl(url),
    schemaSha256: createHash("sha256").update(ddl).digest("hex"),
    extensions: extRows,
    tables,
    money: {
      walletBalanceSum: money.balance,
      walletPendingSum: money.pending,
      walletHoldSum: money.hold,
      walletBonusSum: money.bonus,
      ledgerEntries: Number(money.ledger_entries),
      ledgerNetSum: money.ledger_net,
      ledgerUnbalancedGroups: Number(unbalanced),
    },
    audit: {
      entries: Number(audit.n),
      headEntryHash: audit.head,
      maxSeq: audit.maxseq,
    },
  };

  // ── 5. Assemble one restorable file ─────────────────────────────────────────
  const sql = [
    `-- 50pick — FULL DATABASE BACKUP`,
    `-- taken:  ${takenAt}`,
    `-- source: ${maskUrl(url)}`,
    `-- server: ${server}`,
    `-- rows:   ${totalRows} across ${Object.keys(tables).length} tables`,
    `--`,
    `-- Restore into an EMPTY database:`,
    `--   npm run db:restore -- --file <this file> --to "$TARGET_URL"`,
    `-- Prove it first:`,
    `--   npm run db:verify-backup -- --file <this file>`,
    `--`,
    `${MANIFEST_MARKER}${JSON.stringify(manifest)}`,
    ``,
    `SET statement_timeout = 0;`,
    `SET client_encoding = 'UTF8';`,
    `SET standard_conforming_strings = on;`,
    `SET check_function_bodies = false;`,
    `SET client_min_messages = warning;`,
    `SET row_security = off;`,
    ``,
    `BEGIN;`,
    ``,
    `-- ============ EXTENSIONS ============`,
    `-- Must precede the DDL: the GIN indexes below reference operator classes these`,
    `-- extensions define. prisma migrate diff does not emit them.`,
    extensionSql,
    ``,
    `-- ============ SCHEMA ============`,
    ddl,
    ``,
    PRISMA_MIGRATIONS_DDL,
    ``,
    `-- ============ DATA ============`,
    ...parts,
    ``,
    `-- ============ INDEXES ============`,
    `-- Taken from pg_indexes (Postgres's own re-executable rendering), not from`,
    `-- prisma migrate diff, which emits GIN indexes with an ASC that Postgres rejects.`,
    `-- Built AFTER the data so the bulk insert does not pay index maintenance.`,
    indexSql,
    ``,
    `-- ============ SEQUENCES ============`,
    `-- Without this the first audit write after a restore collides on AuditLog.seq.`,
    sequenceResetSql(),
    ``,
    `COMMIT;`,
    ``,
  ].join("\n");

  // ── 6. Sanity gate. A backup missing the money is not a backup ──────────────
  const problems: string[] = [];
  if (!/CREATE TABLE .*"Wallet"/is.test(ddl)) problems.push("Wallet missing from the DDL");
  if (!/CREATE TABLE .*"LedgerEntry"/is.test(ddl)) problems.push("LedgerEntry missing from the DDL");
  if (!/CREATE TABLE .*"AuditLog"/is.test(ddl)) problems.push("AuditLog missing from the DDL");
  // The drill that found the pg_trgm gap, kept as a permanent gate: an index that
  // names a non-default operator class needs the extension that defines it, and a
  // dump missing it restores into a dead database.
  if (/gin_trgm_ops/i.test(ddl) && !extRows.some((e) => e.name === "pg_trgm")) {
    problems.push("DDL uses gin_trgm_ops but pg_trgm is not in the dumped extensions");
  }
  if (manifest.money.ledgerUnbalancedGroups > 0) {
    // Not a backup defect — a defect in the SOURCE, captured faithfully. Say so
    // loudly rather than failing: you still want the backup of a sick database.
    console.warn(
      `\n   ⚠️  SOURCE WARNING: ${manifest.money.ledgerUnbalancedGroups} ledger group(s) do not sum to zero\n` +
        `      in the database being backed up. The backup is still written and is faithful,\n` +
        `      but this is a live double-entry violation — investigate it separately.`,
    );
  }
  if (problems.length) fail(`BACKUP LOOKS WRONG: ${problems.join(", ")}. Do not trust this file.`);

  const gz = gzipSync(Buffer.from(sql, "utf8"), { level: 9 });
  const sealed = passphrase ? sealBackup(gz, passphrase) : gz;
  const dir = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = takenAt.replace(/[:.]/g, "-");
  const file = join(dir, `50pick-full-${stamp}.sql.gz${passphrase ? ".enc" : ""}`);
  writeFileSync(file, sealed);

  const size = statSync(file).size;
  const sha256 = createHash("sha256").update(sealed).digest("hex");

  console.log(`\nWritten: ${file}`);
  console.log(`Size:    ${(size / 1024 / 1024).toFixed(2)} MB ${passphrase ? "sealed" : "gzip (PLAINTEXT — local only)"} (${(sql.length / 1024 / 1024).toFixed(2)} MB raw)`);
  console.log(`sha256:  ${sha256}`);
  console.log(`Wallets: ${manifest.money.walletBalanceSum} TZS across ${tables.Wallet ?? 0} wallets`);
  console.log(`Ledger:  ${manifest.money.ledgerEntries} entries, net ${manifest.money.ledgerNetSum}`);
  console.log(`Audit:   ${manifest.audit.entries} entries, head ${manifest.audit.headEntryHash?.slice(0, 16) ?? "—"}…`);

  console.log(`\nThis is a file, not yet a backup. Prove it restores:`);
  console.log(`   npm run db:verify-backup -- --file "${file}"`);

  // Machine-readable tail for the CI workflow to parse without re-deriving anything.
  console.log(`\n::backup-result::${JSON.stringify({ file, size, sha256, rows: totalRows, sealed: !!passphrase })}`);
}

main().catch((e: unknown) => {
  console.error("\nBACKUP FAILED:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
