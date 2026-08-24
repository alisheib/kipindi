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
import pg from "pg";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  BACKUP_KEY_ENV,
  MANIFEST_MARKER,
  MANIFEST_VERSION,
  NON_ASCII_FINGERPRINT_SQL,
  PRISMA_MIGRATIONS_DDL,
  SHAPE_SQL,
  SERIAL_COLUMNS,
  backupKey,
  ident,
  isLocalHost,
  lit,
  maskUrl,
  orderAllTables,
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
  // One reader, one name, one length rule — shared with the verifier and the
  // restorer so the key that seals an artifact is the key that opens it.
  let passphrase: string | null = null;
  try {
    passphrase = backupKey();
  } catch (e) {
    fail((e as Error).message);
  }
  // A local disposable database may be dumped in the clear (it holds fixtures).
  // Anything else holds real player PII and MUST be sealed — no flag overrides it.
  if (!local && !passphrase) {
    fail(
      `${BACKUP_KEY_ENV} is not set, and this is not a localhost database.\n` +
        "   A 50pick dump contains every phone number, NIDA, KYC OCR string and email\n" +
        "   address on the platform. Refusing to write it in plaintext.\n" +
        "   Generate one:  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  console.log(`Source:  ${maskUrl(url)}`);

  // ── ONE CONNECTION, ONE SNAPSHOT ────────────────────────────────────────────
  //
  // 🔴 THE FIFTH THING THE FIRST REAL DRILL FOUND. Every read below used to be a separate
  // `prisma.$queryRawUnsafe`, which means a separate pooled connection and a separate
  // snapshot of a LIVE database. The dump therefore described a state that never existed:
  // the first verification against real production data reported
  //     FAIL entry count   17807 / 17830
  //     FAIL head entryHash
  //     FAIL max seq
  // because 23 audit rows were written between dumping AuditLog and reading the audit
  // head for the manifest. The artifact was fine; the manifest disagreed with itself, and
  // the verifier is right to fail on that. Left alone, every nightly verification of a
  // busy platform would flap, and the compliance card would swing amber for no reason —
  // which is worse than a red one, because people learn to ignore it.
  //
  // REPEATABLE READ READ ONLY on a single pg connection gives every statement below the
  // same snapshot, so the data and the invariants describe the same instant. `pg` rather
  // than Prisma because a pooled client cannot promise one connection.
  //
  // The one read outside it is `prisma migrate diff`, which spawns its own process. A
  // schema change landing mid-dump would still slip through; that is a migration deploy
  // racing a backup, is far rarer than an audit row, and is caught by the verifier's
  // structure check.
  const db = new pg.Client({ connectionString: url });
  db.on("error", (e) => console.error(`   note: source connection error: ${e.message}`));
  await db.connect();
  // `<T,>` with the trailing comma: in a .mts file a bare `<T>` on an arrow function is
  // parsed as JSX and reserved (TS7060).
  const q = async <T,>(sql: string, params: unknown[] = []): Promise<T> =>
    (await db.query(sql, params)).rows as T;
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

  const [{ v: serverVersion }] = await q<{ v: string }[]>("select version() as v");
  const server = serverVersion.split(" on ")[0];
  console.log(`Server:  ${server}`);

  // Captured, not assumed: a restore into a database with a different encoding either
  // dies mid-replay or silently mangles every non-Latin string. 50pick stores Chinese.
  const [charset] = await q<
    { encoding: string; collate: string; ctype: string }[]
  >(`select pg_encoding_to_char(encoding) as encoding,
            datcollate as collate, datctype as ctype
       from pg_database where datname = current_database()`);
  const [nonAsciiRow] = await q<{ rows: string; md5: string }[]>(
    NON_ASCII_FINGERPRINT_SQL,
  );
  const encoding = {
    ...charset,
    nonAscii: { rows: Number(nonAsciiRow.rows), md5: nonAsciiRow.md5 },
  };
  console.log(
    `Charset: ${encoding.encoding} · ${encoding.collate} · ` +
      `${encoding.nonAscii.rows} multibyte titles fingerprinted`,
  );

  // ── 1. The live table set must be fully covered by what we know how to dump ──
  const liveRows = await q<{ table_name: string }[]>(
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

  // ── Tables the DATABASE has and this branch's schema does not ───────────────
  //
  // This used to abort outright. It fired on the very first real drill: production
  // carried `UpDownProposal` from a migration applied ahead of its code — which is this
  // repo's normal deploy practice, not an accident — so a licensed real-money operator
  // could not take a backup at all. The rule being protected was "never omit data
  // silently", and refusing to dump a table you can read and enumerate does not serve
  // it. They are dumped by introspection, counted in the manifest, and named loudly.
  const undeclared: string[] = [];
  /** Live FK edges, read only when there is something undeclared whose place they decide. */
  let fkEdges: { child: string; parent: string }[] = [];
  if (unknown.length) {
    // Foreign keys among the live tables, from Postgres rather than from the schema —
    // the schema cannot describe a table it does not know about.
    const fkRows = await q<{ child: string; parent: string }[]>(
      `select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
         from pg_constraint c
         join pg_class ch on ch.oid = c.conrelid
         join pg_namespace n on n.oid = ch.relnamespace
        where c.contype = 'f' and n.nspname = 'public'`,
    );
    const strip = (s: string): string => s.replace(/^public\./, "").replace(/"/g, "");
    const edges = fkRows.map((r) => ({ child: strip(r.child), parent: strip(r.parent) }));

    // ⭐ THE ORDER IS COMPUTED OVER THE WHOLE GRAPH, so a declared table whose FK points
    // at an undeclared one is no longer a refusal — the undeclared parent is simply
    // emitted before it. See `orderAllTables`. This used to ABORT, and that abort took
    // the nightly backup down for four nights over `Session → Device`, a table the F-05
    // expand step had deliberately left in place.
    undeclared.push(...unknown);
    fkEdges = edges;

    console.warn(
      `\n   ⚠️  ${undeclared.length} table(s) exist in this DATABASE but not in this branch's\n` +
        `      prisma/schema.prisma, so they are being backed up by INTROSPECTION:\n` +
        undeclared.map((t) => `        - ${t}`).join("\n") +
        `\n      This is what a migration applied ahead of its code looks like. Their rows ARE\n` +
        `      in the dump and ARE checked on restore; they are listed in the manifest as\n` +
        `      undeclaredTables. If that is unexpected, find out which migration added them\n` +
        `      before trusting this artifact.\n`,
    );
  }
  if (absent.length) {
    console.warn(`   note: schema declares table(s) not present in this DB (skipped): ${absent.join(", ")}`);
  }
  console.log(`Tables:  ${liveTables.length} live, all covered` +
    `${undeclared.length ? ` (${undeclared.length} by introspection)` : ""}.\n`);

  // Every autoincrement column must be in SERIAL_COLUMNS or a restored database
  // hands out a colliding id on its first write. Cheap to check, fatal to miss.
  const serials = await q<{ table_name: string; column_name: string }[]>(
    `select table_name, column_name from information_schema.columns
      where table_schema = 'public' and is_identity = 'NO'
        and column_default like 'nextval%'`,
  );
  const declared = new Set(SERIAL_COLUMNS.map((s) => `${s.table}.${s.column}`));
  // Named for what it holds: undeclared SERIALS, not undeclared tables. The two used to
  // share the name `undeclared` and esbuild refused the file outright — which `tsc
  // --noEmit` did NOT catch, because tsconfig includes `scripts/**/*.ts` and these are
  // `.mts` precisely to stay out of the Next build. See `test:script-types`.
  const undeclaredSerials = serials
    .map((s) => `${s.table_name}.${s.column_name}`)
    .filter((k) => !declared.has(k) && !k.startsWith("_prisma_migrations."));
  if (undeclaredSerials.length) {
    fail(
      `ABORT — ${undeclaredSerials.length} autoincrement column(s) are not in SERIAL_COLUMNS:\n` +
        undeclaredSerials.map((k) => `     - ${k}`).join("\n") +
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
  const extRows = await q<{ name: string; schema: string; version: string }[]>(
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
  //
  // 🔴 `contype in ('p','u','x')`, NOT "any constraint". `pg_constraint.conindid` is also
  // set on FOREIGN KEYS, pointing at the index on the table they REFERENCE — so a filter
  // of "backs any constraint" silently dropped `AffiliateAgent_userId_key` purely because
  // `User.recruitedBy` points at it, and nothing else in the dump created it. That is why
  // the first real restore died with "no unique constraint matching given keys for
  // referenced table AffiliateAgent": not an ordering problem, a MISSING INDEX.
  const idxRows = await q<{ name: string; def: string }[]>(
    `select i.indexname as name, i.indexdef as def
       from pg_indexes i
       join pg_class c on c.relname = i.indexname
       join pg_namespace n on n.oid = c.relnamespace and n.nspname = i.schemaname
      where i.schemaname = 'public'
        and not exists (
          select 1 from pg_constraint con
           where con.conindid = c.oid and con.contype in ('p', 'u', 'x')
        )
      order by i.indexname`,
  );
  // ── 2d. Foreign keys move to the END, for the same reason pg_dump puts them there ──
  //
  // 🔴 THE FOURTH THING A REAL RESTORE FOUND, 2026-07-30:
  //     ERROR: there is no unique constraint matching given keys for referenced table
  //            "AffiliateAgent"
  //
  // Prisma renders `@unique` as a bare `CREATE UNIQUE INDEX`, NOT as a table constraint —
  // 23 of this schema's 71 unique indexes back no constraint at all. The filter above
  // excludes only indexes that DO back one, so those 23 were correctly taken from
  // pg_indexes and written after the data... while the diff's `ALTER TABLE … ADD FOREIGN
  // KEY` statements still ran early, in the schema section. A foreign key requires a
  // unique index on its target AT CREATION TIME, so the replay died on the first FK
  // pointing at an `@unique` column rather than a primary key.
  //
  // Emitting the FKs last fixes the ordering for every such column at once, is what
  // `pg_dump` does, and makes the bulk insert cheaper because no constraint is checked
  // per row. They come from `pg_constraint` rather than the diff, for the same reason the
  // indexes do: it is Postgres's own rendering of what is actually there.
  const fkRowsDdl = await q<{ tbl: string; name: string; def: string }[]>(
    `select c.conrelid::regclass::text as tbl, c.conname as name, pg_get_constraintdef(c.oid) as def
       from pg_constraint c
       join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where c.contype = 'f' and n.nspname = 'public'
      order by c.conname`,
  );
  const foreignKeySql = fkRowsDdl
    .map((r) => `ALTER TABLE ${r.tbl} ADD CONSTRAINT ${ident(r.name)} ${r.def};`)
    .join("\n");

  // Strip the diff's index AND foreign-key statements; everything else it emits (tables,
  // columns, types, defaults, primary keys, unique CONSTRAINTS) is correct and kept.
  const ddl = rawDdl
    .replace(/^-- CreateIndex\r?\n/gim, "")
    .replace(/^CREATE\s+(?:UNIQUE\s+)?INDEX[\s\S]*?;[ \t]*\r?$/gim, "")
    .replace(/^-- AddForeignKey\r?\n/gim, "")
    .replace(/^ALTER TABLE[^;]*?ADD CONSTRAINT[^;]*?FOREIGN KEY[\s\S]*?;[ \t]*\r?$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const strippedCount = (rawDdl.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX/gim) ?? []).length;
  const strippedFks = (rawDdl.match(/^ALTER TABLE[^;]*?ADD CONSTRAINT[^;]*?FOREIGN KEY/gim) ?? []).length;
  const indexSql = idxRows.map((r) => `${r.def};`).join("\n");
  console.log(`   ${ddl.split("\n").length} lines of DDL (dropped ${strippedCount} index + ${strippedFks} foreign-key statements)`);
  console.log(`   ${idxRows.length} indexes and ${fkRowsDdl.length} foreign keys taken from Postgres instead.\n`);

  // ── 2e. Constraints the table DDL does NOT create ───────────────────────────
  //
  // 🔴 THE WORST THING THE FIRST REAL RESTORE FOUND, 2026-07-30, and the reason a drill
  // is not paperwork. Prisma's `CREATE TABLE` emits ONLY the primary key inline; every
  // `@unique` / `@@unique` arrives as a separate statement. The index section above takes
  // indexes from `pg_indexes` but deliberately skips any that back a constraint — so of
  // this database's 71 unique indexes, the 48 that back one were created by NEITHER path.
  // They were silently absent from every artifact this tool has ever written.
  //
  // What that costs is not abstract. `Transaction @@unique([provider, providerRef])` is
  // the constraint that makes crediting the same Selcom deposit twice impossible, and
  // NIDA/phone/email uniqueness is what keeps one person to one account. A database
  // restored without them comes back with every row count matching, every money invariant
  // balancing, the audit chain intact — and no uniqueness guarantees at all. It would look
  // like a clean recovery right up until the first duplicate.
  //
  // Deduped by NAME against the DDL, so whatever Prisma already emitted inline (the PKs)
  // is not added twice, and anything it did not emit is.
  const conRows = await q<
    { tbl: string; name: string; def: string; type: string }[]
  >(
    `select c.conrelid::regclass::text as tbl, c.conname as name,
            pg_get_constraintdef(c.oid) as def, c.contype::text as type
       from pg_constraint c
       join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where n.nspname = 'public' and c.contype in ('p', 'u', 'c', 'x')
      order by case c.contype when 'p' then 0 when 'u' then 1 else 2 end, c.conname`,
  );
  // Deduped against BOTH sources of table DDL — `_prisma_migrations_pkey` is created by
  // PRISMA_MIGRATIONS_DDL, not by the diff, and re-adding it would abort the replay.
  const alreadyCreated = `${ddl}\n${PRISMA_MIGRATIONS_DDL}`;
  const missingCons = conRows.filter((r) => !alreadyCreated.includes(`"${r.name}"`));
  const constraintSql = missingCons.length
    ? missingCons.map((r) => `ALTER TABLE ${r.tbl} ADD CONSTRAINT ${ident(r.name)} ${r.def};`).join("\n")
    : "-- (the table DDL already creates every constraint)";
  const missingUnique = missingCons.filter((r) => r.type === "u").length;
  console.log(
    `   ${conRows.length} constraints live · ${missingCons.length} not created by the table DDL ` +
      `(${missingUnique} UNIQUE) — re-added explicitly.\n`,
  );

  // Belt and braces on the above: every uniqueness guarantee in the source must be
  // reproduced by SOMETHING in this dump. A restore missing one is silent, and the damage
  // shows up later as a duplicate that the database was supposed to make impossible.
  const uniqueLive = await q<{ name: string }[]>(
    `select cl.relname as name
       from pg_index x
       join pg_class cl on cl.oid = x.indexrelid
       join pg_namespace n on n.oid = cl.relnamespace
      where n.nspname = 'public' and x.indisunique`,
  );
  const reproduced = `${alreadyCreated}\n${indexSql}\n${constraintSql}`;
  const lostUnique = uniqueLive.map((u) => u.name).filter((n) => !reproduced.includes(`"${n}"`));
  if (lostUnique.length) {
    fail(
      `${lostUnique.length} unique index(es) exist in the database but appear nowhere in this dump:\n` +
        lostUnique.map((n) => `     - ${n}`).join("\n") +
        `\n\n   A database restored from it would accept duplicates the source refuses —\n` +
        `   including, potentially, the same gateway payment credited twice.`,
    );
  }

  // The diff and pg_constraint must agree about how many FKs exist. If the diff emitted
  // some and we captured none, the replay would restore a database with NO referential
  // integrity at all — and every row count would still match.
  if (strippedFks > 0 && fkRowsDdl.length === 0) {
    fail(
      `The DDL declared ${strippedFks} foreign key(s) but pg_constraint returned none.\n` +
        `   Restoring this dump would produce a database with no referential integrity.`,
    );
  }
  if (/ADD CONSTRAINT[^;]*FOREIGN KEY/i.test(ddl)) {
    fail("A foreign-key statement survived the strip and would run before the unique indexes it needs.");
  }

  // ── 3. Data — every column cast to text, Postgres doing all the formatting ──
  const parts: string[] = [];
  const tables: Record<string, number> = {};
  let totalRows = 0;

  // ⭐ ONE ORDER OVER THE WHOLE GRAPH — parents before children whether or not this
  // branch's schema declares them. It preserves `tableOrder()` exactly where nothing
  // forces a change, and slots an undeclared parent in just before the first declared
  // table that needs it. ⛔ It is NOT `[...known, ...undeclared]` any more: that
  // assumption is what made `Session → Device` an abort rather than an ordering.
  // `_prisma_migrations` stays last: it has no foreign keys and putting it after the
  // data keeps the restore's failure modes in one place.
  const dumpOrder = orderAllTables(known, undeclared, fkEdges);
  for (const table of [...dumpOrder, "_prisma_migrations"]) {
    if (!liveTables.includes(table)) continue;

    const cols = await q<{ column_name: string }[]>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position`,
      [table],
    );
    const colNames = cols.map((c) => c.column_name);
    const selectList = colNames.map((c) => `${ident(c)}::text as ${ident(c)}`).join(", ");
    // Stable row order so two dumps of the same database are byte-comparable.
    const orderBy = colNames.includes("id") ? ` order by ${ident("id")}` : "";

    const rows = await q<Record<string, string | null>[]>(
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
  const [money] = await q<
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

  const [{ n: unbalanced }] = await q<{ n: string }[]>(
    `select count(*)::text n from (
       select "groupId" from "public"."LedgerEntry"
       group by "groupId" having sum("amount") <> 0
     ) g`,
  );

  const [audit] = await q<{ n: string; head: string | null; maxseq: string | null }[]>(
    `select (select count(*) from "public"."AuditLog")::text as n,
            (select "entryHash" from "public"."AuditLog" order by "seq" desc limit 1) as head,
            (select max("seq")::text from "public"."AuditLog") as maxseq`,
  );

  // The structural shape of the SOURCE, measured with the same query the verifier will run
  // against the restored copy.
  const [shape] = await q<BackupManifest["shape"][]>(SHAPE_SQL);

  // Read-only, so COMMIT and ROLLBACK are equivalent; COMMIT states the intent that
  // everything above described one consistent instant.
  await db.query("COMMIT");
  await db.end();

  // ── The SOURCE's own integrity verdict, from the platform's own functions ───
  //
  // Recorded so `db:verify-backup` can tell "this backup is broken" apart from "this
  // backup is a faithful copy of a database that already had a problem". Without it, the
  // first real verification blamed the artifact for a drifting wallet that exists in
  // production. Deliberately the platform's OWN `trialBalance()` / `verifyChainFull()`,
  // never a re-implementation: a gate that reimplements what it checks is how this repo
  // shipped green ticks over broken things.
  process.env.USE_PRISMA_DAL = "true";
  const { trialBalance } = await import("../src/lib/server/ledger.ts");
  const { verifyChainFull } = await import("../src/lib/server/audit.ts");
  const tb = await trialBalance();
  const chain = await verifyChainFull();
  const sourceIntegrity = {
    trialBalanceOk: tb.ok,
    driftingWallets: tb.driftingWallets,
    totalAbsDrift: tb.totalAbsDrift,
    imbalancedGroups: tb.imbalancedGroups.length,
    chainValid: chain.valid,
    // `linkBroken` is optional on the result type (absent when there is nothing to
    // check). Absent means "no break was found", which is what `false` records.
    chainLinkBroken: chain.linkBroken ?? false,
  };
  if (!sourceIntegrity.trialBalanceOk || sourceIntegrity.chainLinkBroken) {
    console.warn(
      `\n   ⚠️  SOURCE INTEGRITY WARNING — this is a problem with the DATABASE, not with\n` +
        `      this backup, which captured it faithfully:\n` +
        (sourceIntegrity.trialBalanceOk
          ? ""
          : `        - trial balance FAILS: ${sourceIntegrity.driftingWallets} drifting wallet(s), ` +
            `${sourceIntegrity.totalAbsDrift} TZS total drift\n`) +
        (sourceIntegrity.chainLinkBroken ? `        - the audit chain has a BROKEN LINK\n` : "") +
        `      Investigate on production. db:verify-backup will report the same and will NOT\n` +
        `      blame the artifact for it.\n`,
    );
  }

  const takenAt = new Date().toISOString();
  const manifest: BackupManifest = {
    version: MANIFEST_VERSION,
    takenAt,
    server,
    source: maskUrl(url),
    schemaSha256: createHash("sha256").update(ddl).digest("hex"),
    encoding,
    shape,
    sourceIntegrity,
    extensions: extRows,
    tables,
    undeclaredTables: undeclared,
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
    `-- ============ CONSTRAINTS ============`,
    `-- Every PRIMARY KEY / UNIQUE / CHECK the table DDL did not create. Prisma emits only`,
    `-- the primary key inline, so without this the 48 unique indexes that back a UNIQUE`,
    `-- constraint were in NO section of the dump and a restore quietly lost them.`,
    constraintSql,
    ``,
    `-- ============ FOREIGN KEYS ============`,
    `-- Last, after the indexes, because Prisma renders @unique as a bare UNIQUE INDEX`,
    `-- rather than a constraint, and a foreign key onto such a column cannot be created`,
    `-- until that index exists. This is also the order pg_dump uses.`,
    foreignKeySql,
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
