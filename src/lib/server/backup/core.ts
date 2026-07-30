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

export const MANIFEST_VERSION = 1;
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
  /** Row count per table, keyed by table name. */
  tables: Record<string, number>;
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
