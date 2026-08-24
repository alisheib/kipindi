/**
 * Backup core — the ONE definition of what a 50pick backup is.
 *
 * `scripts/db-backup.mts` (write), `scripts/db-verify-backup.mts` (prove) and
 * `scripts/db-restore.mts` (recover) all import from here. Nothing in this file
 * may be re-declared in any of them.
 *
 * 🔴 WHY THAT RULE EXISTS. The sibling AWARKEH repo kept its table list in the
 * backup script itself, and a new model was forgotten in it THREE separate times —
 * the last one (`Contact`) meant `db:backup` had been ABORTING on production for
 * weeks, so the shop had no working backup command at all and did not know. The
 * abort guard did its job every time; the duplicate list is what kept re-breaking.
 *
 * So this file does not keep a list. It DERIVES the table set from the Prisma
 * schema itself (`Prisma.dmmf`), which cannot drift from the database because the
 * same schema generates the migrations. A new model is backed up the moment it is
 * added, with no human step, and `db-backup.mts` STILL aborts if the live database
 * contains a table this derivation did not produce — belt and braces, because a
 * backup that silently omits `LedgerEntry` or `Wallet` is worse than no backup:
 * you trust it.
 *
 * WHAT IS BEING PROTECTED. Not photos or copy — player balances (`Wallet`), the
 * double-entry ledger (`LedgerEntry`), the tamper-evident audit chain (`AuditLog`)
 * and the settlement record (`Transaction`, `Position`, `PredictionMarket`) of a
 * licensed real-money operator. That is why the manifest below carries money
 * invariants rather than a row count alone, and why the verifier re-runs the
 * platform's OWN `trialBalance()` and `verifyChainFull()` against the restored
 * data instead of re-implementing the arithmetic.
 */
import { Prisma } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/* ── Manifest ────────────────────────────────────────────────────────────── */

/** 2 adds `undeclaredTables` (2026-07-30). Nothing rejects an older manifest — the
 *  field is read defensively — but the artifact header should say which shape it is. */
export const MANIFEST_VERSION = 2;
/** The line prefix the manifest is written under, inside the SQL header. */
export const MANIFEST_MARKER = "-- @manifest ";

export type BackupManifest = {
  version: number;
  takenAt: string;
  server: string;
  /** Password-masked. A manifest is read by humans and shipped off-box. */
  source: string;
  /** sha256 of the DDL, so a restore can prove it rebuilt the same shape. */
  schemaSha256: string;
  /**
   * The source database's character encoding and collation.
   *
   * 🔴 THE THIRD THING A REAL RESTORE FOUND, 2026-07-30. The first verification run died
   * with `character with byte sequence 0xe8 0x87 0xb3 ... has no equivalent in encoding
   * "WIN1252"` — that is 至, and 50pick is trilingual EN/SW/**ZH**, so Chinese text runs
   * through market titles and translations everywhere. The scratch cluster had been
   * initdb'd with the Windows default encoding, and a UTF-8 dump does not go into a
   * WIN1252 database.
   *
   * It failed loudly here, which was luck: the target was empty. The reason this is in the
   * manifest is the case where it would not be — a recovery target created with a default
   * `CREATE DATABASE` on the wrong day, restoring most of the platform and mangling every
   * non-Latin string in it. The encoding a backup needs is a property OF the backup, so
   * `db:verify-backup` creates its throwaway with these values and `db:restore` refuses a
   * target that does not match.
   */
  encoding: {
    encoding: string;
    collate: string;
    ctype: string;
    /**
     * A fingerprint of the platform's actual non-ASCII text (1,464 of 1,467 market
     * titles carry Chinese). Every other check in this toolchain is blind to mojibake:
     * row counts still match, money is numeric, and the audit chain is ASCII hex — so a
     * restore that silently mangled every Swahili and Chinese title would be reported as
     * a complete success. This is the only assertion that can see it.
     */
    nonAscii: { rows: number; md5: string };
  };
  /**
   * Postgres extensions the schema depends on.
   *
   * 🔴 FOUND BY THE FIRST RESTORE DRILL, 2026-07-29. `prisma migrate diff` emits the
   * GIN indexes that `20260728030000_search_trgm_small_tables` created but NOT the
   * `CREATE EXTENSION pg_trgm` they need, so a dump built from the live schema
   * restored into an empty database and died on `operator class "gin_trgm_ops" does
   * not exist`. The backup looked perfect and was unrestorable — which is the whole
   * reason a backup that has never been restored does not count as a backup.
   */
  extensions: Array<{ name: string; schema: string; version: string }>;
  /**
   * How many of each structural guarantee the SOURCE had, so the verifier can prove the
   * restored database has them too.
   *
   * 🔴 WHY COUNTS AND NOT JUST "IT RESTORED". Until 2026-07-30 every dump was missing the
   * 48 unique indexes that back a UNIQUE constraint, and nothing could tell: row counts
   * matched, wallets balanced to the shilling, the audit chain verified end to end. The
   * only visible symptom would have been a duplicate — a Selcom payment credited twice, a
   * second account on one NIDA — long after the restore was declared a success. Structure
   * is part of what a backup is FOR, so it is measured like the money is.
   */
  shape: {
    tables: number;
    indexes: number;
    uniqueIndexes: number;
    primaryKeys: number;
    uniqueConstraints: number;
    checkConstraints: number;
    foreignKeys: number;
  };
  /** Row count per table, keyed by table name. */
  tables: Record<string, number>;
  /**
   * Tables present in the DATABASE but not declared in the schema this dump was taken
   * with, backed up by introspection instead.
   *
   * 🔴 FOUND BY THE FIRST REAL DRILL, 2026-07-30. `db:backup` ABORTED against production
   * — correctly, by its own rule — because prod had `UpDownProposal`, applied by a
   * migration run ahead of its code. That is not a mistake: pre-applying a migration via
   * Railway before pushing is this repo's documented deploy practice, so "the database is
   * ahead of this branch" is a ROUTINE state, and in it a licensed real-money operator
   * had no way to take a backup at all. Refusing to write anything is the wrong answer to
   * a table you can plainly see and read.
   *
   * The rule the abort protected was never "only dump declared tables" — it was **never
   * omit data silently**. So undeclared tables are dumped from `information_schema` like
   * any other, their row counts go into `tables` (so the verifier and the restorer check
   * them with no special case), and they are named here and warned about loudly. Nothing
   * omitted, nothing silent. The one case that still aborts is a DECLARED table holding a
   * foreign key INTO an undeclared one, where no append order can satisfy the replay.
   */
  undeclaredTables: string[];
  /**
   * Money invariants AT CAPTURE TIME. The verifier recomputes each of these on the
   * restored database and fails on any difference. A backup whose wallet total does
   * not come back to the shilling is not a backup of this business.
   */
  money: {
    walletBalanceSum: string;
    walletPendingSum: string;
    walletHoldSum: string;
    walletBonusSum: string;
    ledgerEntries: number;
    /** Σ of every ledger amount. Double entry ⇒ this is 0.00 in a healthy DB. */
    ledgerNetSum: string;
    /** Ledger groups that do NOT sum to zero. Healthy ⇒ 0. */
    ledgerUnbalancedGroups: number;
  };
  /**
   * The SOURCE's own integrity verdict at capture time, from the platform's own
   * `trialBalance()` and `verifyChainFull()`.
   *
   * 🔴 WHY A BACKUP HAS TO RECORD THIS. The first real verification run ended with
   * "DO NOT TRUST THIS BACKUP" over four failures — a drifting wallet and a broken audit
   * link. Running the same two functions against production showed it reported EXACTLY
   * the same four. The artifact was perfect; it had faithfully reproduced a source that
   * was already unhealthy, and the verifier blamed the backup for what it found inside it.
   *
   * That is not a cosmetic mislabel. It would have made the nightly job red forever, kept
   * `/admin/compliance` on "no verified backup" while a perfectly good one existed, and
   * taught whoever reads it that the red is normal — the precise failure this whole
   * toolchain was built to stop. So the comparison is restored-vs-SOURCE: a backup is good
   * when it reproduces the source exactly, and the source's own problems are reported
   * separately, as the operational finding they are.
   */
  sourceIntegrity: {
    trialBalanceOk: boolean;
    driftingWallets: number;
    totalAbsDrift: number;
    imbalancedGroups: number;
    chainValid: boolean;
    chainLinkBroken: boolean;
  };
  /** The audit chain's tail, so a restore can prove the chain came back whole. */
  audit: {
    entries: number;
    headEntryHash: string | null;
    maxSeq: string | null;
  };
};

export function readManifest(sql: string): BackupManifest | null {
  const line = sql.split("\n").find((l) => l.startsWith(MANIFEST_MARKER));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(MANIFEST_MARKER.length)) as BackupManifest;
  } catch {
    return null;
  }
}

/* ── Table order, derived from the schema ────────────────────────────────── */

/**
 * Every table, parents before children, so a plain `INSERT` replay satisfies
 * foreign keys without deferring constraints (Prisma's FKs are NOT DEFERRABLE, so
 * `SET CONSTRAINTS ALL DEFERRED` is not available to us, and managed Postgres
 * does not grant the superuser rights `session_replication_role = replica` needs).
 *
 * Edge: a self-referencing model depends on itself. That edge is dropped — row
 * order WITHIN a table is preserved by the dump's own `ORDER BY`, and a genuine
 * self-FK cycle would surface as a restore failure in `db:verify-backup`, which is
 * the point of running it.
 */
export function tableOrder(): string[] {
  const models = Prisma.dmmf.datamodel.models;
  const tableOf = new Map(models.map((m) => [m.name, m.dbName ?? m.name]));

  /** parent model names this model holds a foreign key to */
  const parentsOf = new Map<string, Set<string>>();
  for (const m of models) {
    const parents = new Set<string>();
    for (const f of m.fields) {
      // relationFromFields non-empty ⇒ THIS model owns the FK column, so the
      // referenced model's row must already exist. The other side of the relation
      // carries an empty array and must be ignored, or every pair looks circular.
      if (f.kind === "object" && f.relationFromFields?.length && f.type !== m.name) {
        parents.add(f.type);
      }
    }
    parentsOf.set(m.name, parents);
  }

  const out: string[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();

  const visit = (name: string): void => {
    if (done.has(name)) return;
    // A true cycle (A → B → A). Emit anyway and let the restore be the judge;
    // refusing to dump would leave the operator with nothing at all.
    if (onStack.has(name)) return;
    onStack.add(name);
    for (const p of parentsOf.get(name) ?? []) visit(p);
    onStack.delete(name);
    done.add(name);
    out.push(tableOf.get(name) ?? name);
  };

  // Sort first so the output is deterministic run to run — a backup that reorders
  // itself between two identical databases is impossible to diff.
  for (const m of [...models].sort((a, b) => a.name.localeCompare(b.name))) visit(m.name);
  return out;
}

/**
 * The ONE query that fingerprints the platform's non-ASCII text, shared by the writer and
 * the verifier so neither can drift into checking something the other does not.
 *
 * `octet_length <> char_length` is true exactly when a string contains a multibyte
 * character — no regex escaping to get subtly wrong across two dialects. Ordered by id so
 * the aggregate is deterministic, and md5'd so the manifest carries a constant rather
 * than a copy of the data it is describing.
 */
/**
 * The ONE query that measures a database's structure, run by the writer against the source
 * and by the verifier against the restored copy. Shared so the two cannot drift into
 * counting different things — which is how a comparison quietly becomes a tautology.
 */
export const SHAPE_SQL = `
  select
    (select count(*) from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE')::int as tables,
    (select count(*) from pg_index x join pg_class c on c.oid = x.indexrelid
       join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public')::int as indexes,
    (select count(*) from pg_index x join pg_class c on c.oid = x.indexrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and x.indisunique)::int as "uniqueIndexes",
    (select count(*) from pg_constraint c join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where n.nspname = 'public' and c.contype = 'p')::int as "primaryKeys",
    (select count(*) from pg_constraint c join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where n.nspname = 'public' and c.contype = 'u')::int as "uniqueConstraints",
    (select count(*) from pg_constraint c join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where n.nspname = 'public' and c.contype = 'c')::int as "checkConstraints",
    (select count(*) from pg_constraint c join pg_class ch on ch.oid = c.conrelid
       join pg_namespace n on n.oid = ch.relnamespace
      where n.nspname = 'public' and c.contype = 'f')::int as "foreignKeys"`;

export const NON_ASCII_FINGERPRINT_SQL = `
  select count(*)::text as rows,
         md5(coalesce(string_agg("titleZh", '|' order by "id"), '')) as md5
    from "public"."PredictionMarket"
   where "titleZh" is not null
     and octet_length("titleZh") <> char_length("titleZh")`;

/** A foreign key, as Postgres reports it: `child` holds a column pointing at `parent`. */
export type FkEdge = { child: string; parent: string };

/**
 * THE FULL DUMP ORDER — declared and undeclared tables together, over the REAL foreign-key
 * graph Postgres reports.
 *
 * 🔴 WHY THIS REPLACED `orderUndeclared`, 2026-08-25. That function sorted the UNDECLARED
 * tables among themselves and then had to REFUSE whenever a DECLARED table held a foreign
 * key into an undeclared one — because the dump was assembled as `[...declared,
 * ...undeclared]`, so the parent would be inserted after its child and the replay would
 * fail. The refusal was correct about the ordering it was given. It was the ordering that
 * was wrong.
 *
 * ⛔ AND IT TOOK THE NIGHTLY BACKUP DOWN FOR FOUR NIGHTS. On 2026-08-21 the F-05 expand
 * step removed `Device` from `prisma/schema.prisma` and deliberately LEFT the table on
 * production — the correct expand/contract order — but `Session` still holds
 * `Session_deviceId_fkey` into it. Every run from 2026-08-21 to 2026-08-24 aborted with
 * `Session → Device`, and the platform went eleven nights with no verified backup (the
 * first seven were a different cause, a CI `/dev/shm` exhaustion). **A guard that refuses
 * because of an assumption it makes itself is a guard reporting its own limitation as the
 * product's defect.**
 *
 * ⭐ THE ORDERING CONSTRAINT IS A PROPERTY OF THE FK GRAPH, NOT OF WHICH BRANCH DECLARES
 * WHAT. So the whole set is sorted at once and the refusal disappears — there is no
 * remaining case where a dump has to be withheld.
 *
 * ⚠️ IT PRESERVES `tableOrder()` EXACTLY where nothing forces a change. `declared` is
 * visited in its own order and its declared parents are already emitted by construction,
 * so the declared subsequence comes out byte-identical; an undeclared parent is emitted
 * JUST BEFORE the first declared table that needs it, and an undeclared table nothing
 * references is appended at the end, sorted. That is deliberate: a backup that reorders
 * itself between two identical databases is impossible to diff.
 *
 * A true cycle emits anyway and lets the restore be the judge — the same choice
 * `tableOrder()` documents, for the same reason: refusing to dump would leave the
 * operator with nothing at all, which is strictly worse than a dump that may need a
 * deferred constraint.
 *
 * Extracted from `db-backup.mts` so `test:backup` can drive it. The version of this logic
 * that lived inline was a bare `if (unknown.length) fail(...)`, and it took a real drill
 * against production to find out what that cost.
 */
export function orderAllTables(
  declared: readonly string[],
  undeclared: readonly string[],
  edges: readonly FkEdge[],
): string[] {
  const all = new Set<string>([...declared, ...undeclared]);
  const parentsOf = new Map<string, Set<string>>();
  for (const t of all) parentsOf.set(t, new Set<string>());
  for (const e of edges) {
    // A self-reference depends on itself; row order within a table is already fixed by
    // the dump's own ORDER BY, so that edge is dropped exactly as tableOrder() drops it.
    // ⚠️ DEFENCE-IN-DEPTH, NOT LOAD-BEARING, and this is measured rather than assumed:
    // `red:backup-order` mutated this line to `if (false)` and the gate stayed GREEN,
    // because `visit()` already refuses a node that is `onStack`, which absorbs a self-edge
    // and emits the table exactly once either way. The line stays because it says what it
    // means at the point the edge is read; the mutation was DELETED rather than kept as a
    // permanent NOT CAUGHT (see the note at the foot of the anchors sidecar).
    if (e.child === e.parent) continue;
    // An edge touching a table this dump does not carry cannot constrain its order.
    if (!all.has(e.child) || !all.has(e.parent)) continue;
    parentsOf.get(e.child)!.add(e.parent);
  }

  const order: string[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();
  const visit = (t: string): void => {
    if (done.has(t) || onStack.has(t)) return; // a true cycle emits anyway; the restore judges
    onStack.add(t);
    for (const p of parentsOf.get(t) ?? []) visit(p);
    onStack.delete(t);
    done.add(t);
    order.push(t);
  };
  // Declared first, in tableOrder()'s order, so that order survives untouched. Then the
  // undeclared leftovers, sorted, so two dumps of one database agree.
  for (const t of declared) visit(t);
  for (const t of [...undeclared].sort()) visit(t);
  return order;
}

/* ── DDL fragments Prisma owns but no migration creates ──────────────────── */

export const PRISMA_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);`.trim();

/**
 * 🔴 THE STEP THAT MAKES A RESTORE SURVIVABLE RATHER THAN MERELY COMPLETE.
 *
 * `AuditLog.seq` is a BIGSERIAL. Restoring rows does NOT advance its sequence, so a
 * restored database hands out seq=1 again and the very first audit write — every
 * login, every bet, every settlement — dies on the unique constraint. The site
 * would come back up looking perfect and then refuse to record anything.
 *
 * `pg_get_serial_sequence` is used rather than a hardcoded sequence name so this
 * keeps working if the column is ever renamed. Any future autoincrement column must
 * be added here; `db-verify-backup.mts` asserts the set matches the live schema.
 */
export const SERIAL_COLUMNS: ReadonlyArray<{ table: string; column: string }> = [
  { table: "AuditLog", column: "seq" },
];

export function sequenceResetSql(): string {
  return SERIAL_COLUMNS.map(
    ({ table, column }) =>
      `SELECT setval(pg_get_serial_sequence('"public"."${table}"', '${column}'), ` +
      `GREATEST(COALESCE((SELECT MAX("${column}") FROM "public"."${table}"), 1), 1), true);`,
  ).join("\n");
}

/* ── SQL literal helpers ─────────────────────────────────────────────────── */

/** Escape for a `standard_conforming_strings=on` literal — only quotes double up. */
export function lit(v: string | null): string {
  return v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
}

export function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function maskUrl(url: string): string {
  return url.replace(/:\/\/[^@]*@/, "://***:***@");
}

/** True for a database we are willing to treat as disposable/local. */
export function isLocalHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

/* ── Encryption ──────────────────────────────────────────────────────────── */

/**
 * A 50pick dump contains every phone number, NIDA, KYC OCR string and email
 * address the platform holds. Fixing a disaster-recovery gap must not open a data
 * protection one, so a backup of anything that is not a local disposable database
 * is sealed with AES-256-GCM and is useless without `BACKUP_ENCRYPTION_KEY`.
 *
 * Layout:  magic(8) ‖ version(1) ‖ salt(16) ‖ iv(12) ‖ tag(16) ‖ ciphertext
 * The plaintext is the gzipped SQL, so a sealed file is compressed once, then
 * encrypted — the reverse order would defeat compression entirely.
 */
export const SEAL_MAGIC = Buffer.from("50PICKBK", "ascii");
const SEAL_VERSION = 1;

/**
 * The ONE name the seal key is read under, and the one place it is read.
 *
 * 🔴 WHY THIS IS A FUNCTION AND NOT THREE `process.env` READS. It was three, under
 * TWO different names: `db-backup.mts` and `db-verify-backup.mts` read
 * `BACKUP_ENCRYPTION_KEY`, while `db-restore.mts` read `BACKUP_PASSPHRASE` — and the
 * runbook's drill exported the restore-only name. So an operator whose environment
 * was set up to TAKE and VERIFY backups could not OPEN one, and would find that out
 * on the day the database was gone. The length rule was duplicated too, and only in
 * the writer, so a 4-character key was refused when sealing and accepted when
 * opening.
 *
 * One control, one place: `test:backup` asserts this is the only reader of the env
 * var and that the old name appears nowhere in the toolchain.
 */
export const BACKUP_KEY_ENV = "BACKUP_ENCRYPTION_KEY";

/** Minimum length. A dump is every balance, phone number and NIDA on the platform;
 *  a memorable passphrase is not an acceptable key for it. */
export const BACKUP_KEY_MIN_LEN = 24;

/**
 * Where `db:verify-backup --record` writes backup health, or why it cannot.
 *
 * 🔴 WHY THIS IS A NAMED DECISION. It used to be an inline `??` that resolved to
 * `undefined` and merely `console.warn`ed, so `--record` exited 0 having written
 * nothing — the drill reported success while `/admin/compliance` still said no backup
 * had ever run. A decision that can silently choose "do nothing" has to be drivable
 * by a test; `test:backup` drives this one.
 *
 * `explicit` (`BACKUP_RECORD_DATABASE_URL`) wins. Otherwise the database the run
 * STARTED against — the one the backup was taken from, and the one the compliance
 * card reads. Never the scratch database, which is dropped seconds later.
 */
export function recordTargetFor(
  explicit: string | undefined,
  original: string | undefined,
): { url: string } | { error: string } {
  const url = explicit ?? original;
  if (!url) {
    return {
      error:
        "neither BACKUP_RECORD_DATABASE_URL nor DATABASE_URL was set, so there is no " +
        "database to write backup health to",
    };
  }
  return { url };
}

/**
 * The seal key, or `null` when unset. Throws on a key too short to be one —
 * refusing at BOTH ends, because a key accepted by the opener and rejected by the
 * writer is how you discover the mismatch mid-incident.
 */
export function backupKey(): string | null {
  const key = process.env[BACKUP_KEY_ENV];
  if (!key) return null;
  if (key.length < BACKUP_KEY_MIN_LEN) {
    throw new Error(
      `${BACKUP_KEY_ENV} is ${key.length} characters — at least ${BACKUP_KEY_MIN_LEN} are required.\n` +
        `   Generate one:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

export function isSealed(buf: Buffer): boolean {
  return buf.length > SEAL_MAGIC.length && buf.subarray(0, SEAL_MAGIC.length).equals(SEAL_MAGIC);
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  // scrypt with the Node defaults (N=16384, r=8, p=1) — ~100 ms, which is the
  // point: it makes a stolen artifact expensive to attack offline.
  return scryptSync(passphrase, salt, 32);
}

export function sealBackup(plain: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([SEAL_MAGIC, Buffer.from([SEAL_VERSION]), salt, iv, cipher.getAuthTag(), body]);
}

export function openBackup(sealed: Buffer, passphrase: string): Buffer {
  if (!isSealed(sealed)) throw new Error("not a sealed 50pick backup");
  let off = SEAL_MAGIC.length;
  const version = sealed[off];
  off += 1;
  if (version !== SEAL_VERSION) throw new Error(`unsupported seal version ${version}`);
  const salt = sealed.subarray(off, (off += SALT_LEN));
  const iv = sealed.subarray(off, (off += IV_LEN));
  const tag = sealed.subarray(off, (off += TAG_LEN));
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  // GCM authenticates: a wrong key or a single flipped byte throws here rather
  // than handing back plausible-looking garbage.
  return Buffer.concat([decipher.update(sealed.subarray(off)), decipher.final()]);
}
