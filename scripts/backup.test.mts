/**
 * BACKUP TOOLCHAIN — the guards that make a backup trustworthy.
 *
 * 🔴 THE HISTORY THIS ENCODES. Two separate failures, both of which a green build was
 * blind to:
 *
 *   1. Until 2026-07-29 `/admin/compliance` rendered a hardcoded green ✓ claiming
 *      "Auto-snapshot on every mutation · HMAC-signed · last 12 retained · disk-backed".
 *      None of it existed — no script, no writer, nothing read `STORE_BACKUP_DIR`. It sat
 *      beside the audit-chain card, which DOES read live state, so a fabricated tick
 *      borrowed real credibility on the one screen where an officer decides whether
 *      player balances are recoverable.
 *   2. The sibling AWARKEH repo kept its table list inside its backup script, and a new
 *      model was forgotten THREE times. The last one meant `db:backup` had been aborting
 *      on production for weeks and nobody knew.
 *
 * So the rules these assert are not stylistic:
 *   · the table set is DERIVED from the schema, never hand-listed;
 *   · a backup claim is rendered from a row a script wrote, or not rendered;
 *   · only the VERIFIER may record health, because only restoring proves a backup;
 *   · the restore script can destroy data, so it must be impossible to run by accident.
 *
 * Pure — no DB, no network. The parts that can be driven are driven.
 */
import { readFileSync } from "node:fs";
import {
  MANIFEST_MARKER,
  MANIFEST_VERSION,
  readManifest,
  tableOrder,
  lit,
  ident,
  maskUrl,
  isSealed,
  sealBackup,
  openBackup,
} from "../src/lib/server/backup/core.ts";
import { backupHealth, BACKUP_STALE_AFTER_MS, type BackupRun } from "../src/lib/server/backup/state.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

console.log("\n── 1 · The table set is derived, never hand-listed ─────────────");

const order = tableOrder();
ok("tableOrder() returns tables", order.length > 20, `${order.length} tables`);
// The money tables are the entire point of this system existing.
for (const t of ["Wallet", "LedgerEntry", "AuditLog", "Transaction", "Position", "User"]) {
  ok(`${t} is included`, order.includes(t));
}
ok("no duplicates", new Set(order).size === order.length);
ok("parents precede children (User before Wallet)",
  order.indexOf("User") < order.indexOf("Wallet"),
  "a plain INSERT replay must satisfy FKs without deferring them");
ok("User precedes Transaction", order.indexOf("User") < order.indexOf("Transaction"));

// The AWARKEH lesson: a literal array of table names in the script is the bug.
const core = readFileSync(new URL("../src/lib/server/backup/core.ts", import.meta.url), "utf8");
ok("the order comes from Prisma's dmmf, not a literal list",
  core.includes("dmmf"),
  "a hand-kept list drifted three times in the sibling repo");

console.log("\n── 2 · SQL literal + identifier quoting ────────────────────────");

ok("null becomes NULL", lit(null) === "NULL");
ok("a plain string is quoted", lit("abc") === "'abc'");
ok("🔴 a single quote is escaped", lit("O'Brien") === "'O''Brien'", "the classic dump-breaking input");
ok("a backslash survives", lit("a\\b").includes("\\"));
ok("an identifier is double-quoted", ident("Wallet") === '"Wallet"');
ok("🔴 an embedded double quote is escaped", ident('we"ird') === '"we""ird"');

console.log("\n── 3 · The manifest round-trips ────────────────────────────────");

const manifest = {
  version: MANIFEST_VERSION,
  takenAt: "2026-07-30T12:00:00.000Z",
  server: "PostgreSQL 16",
  source: "postgresql://user:***@host:5432/db",
  schemaSha256: "abc123",
  extensions: [{ name: "pg_trgm", schema: "public", version: "1.6" }],
  tables: { Wallet: 41, LedgerEntry: 1200 },
  money: {
    walletBalanceSum: "1000.00", walletPendingSum: "0.00", walletHoldSum: "0.00",
    walletBonusSum: "0.00", ledgerEntries: 1200, ledgerNetSum: "0.00",
    ledgerUnbalancedGroups: 0,
  },
  audit: { entries: 500, headEntryHash: "deadbeef", maxSeq: "500" },
};
const dump = `-- header\n${MANIFEST_MARKER}${JSON.stringify(manifest)}\nBEGIN;\nCOMMIT;\n`;
const parsed = readManifest(dump);
ok("a manifest is recovered from a dump", parsed !== null);
ok("row counts survive", parsed?.tables.Wallet === 41);
ok("money invariants survive", parsed?.money.walletBalanceSum === "1000.00");
ok("the audit head survives", parsed?.audit.headEntryHash === "deadbeef");
ok("extensions survive", parsed?.extensions[0]?.name === "pg_trgm",
  "the first restore drill died because CREATE EXTENSION was missing");
ok("a dump with no manifest returns null", readManifest("BEGIN;\nCOMMIT;\n") === null);
ok("a corrupt manifest returns null rather than throwing",
  readManifest(`${MANIFEST_MARKER}{not json\n`) === null);

console.log("\n── 4 · Sealing is real encryption, not obfuscation ─────────────");

const plain = Buffer.from("BEGIN; -- player balances\nCOMMIT;\n");
const sealed = sealBackup(plain, "correct-horse");
ok("a sealed artifact is recognised", isSealed(sealed));
ok("plaintext is NOT recognised as sealed", !isSealed(plain));
ok("the plaintext is not visible in the sealed bytes",
  !sealed.toString("latin1").includes("player balances"),
  "a backup is every balance, phone number and NIDA on the platform");
ok("the right passphrase opens it", openBackup(sealed, "correct-horse").equals(plain));

let wrongKeyThrew = false;
try { openBackup(sealed, "wrong"); } catch { wrongKeyThrew = true; }
ok("🔴 a wrong passphrase THROWS rather than returning garbage", wrongKeyThrew);

let tamperThrew = false;
const tampered = Buffer.from(sealed);
tampered[tampered.length - 1] ^= 0xff; // flip a byte in the ciphertext/tag
try { openBackup(tampered, "correct-horse"); } catch { tamperThrew = true; }
ok("🔴 one flipped byte THROWS (AES-GCM is authenticated)", tamperThrew,
  "silent corruption is the failure mode a backup cannot have");

console.log("\n── 5 · Credentials never reach a log or a manifest ─────────────");

const masked = maskUrl("postgresql://u:sup3rs3cret@host:5432/db");
ok("the password is masked", !masked.includes("sup3rs3cret"), masked);
ok("the host survives (it is the useful part)", masked.includes("host"));

console.log("\n── 6 · Backup health is honest when nothing has run ────────────");

// ⚠️ Build these from the REAL BackupRun shape and compare on `.kind`. An earlier
// draft of this section used `{ at: … } as BackupRun` and compared against the string
// "healthy" — so every "is NOT healthy" assertion passed for ANY input, including a
// perfectly healthy run. Three green checks that could not fail. Exactly the class of
// lying gate this repo has been bitten by, produced here by a cast that silenced the
// compiler. No casts below; if the type changes, this stops compiling.
const run = (over: Partial<BackupRun> = {}): BackupRun => ({
  finishedAt: new Date().toISOString(),
  ok: true,
  verified: true,
  sizeBytes: 1024,
  rows: 5000,
  sha256: "a".repeat(64),
  destination: "r2://50pick-backups/test",
  sealed: true,
  ...over,
});

ok("no run at all reports 'none'", backupHealth(null).kind === "none",
  "the hardcoded green tick this replaces was the original sin");
ok("a fresh, verified run reports 'ok'", backupHealth(run()).kind === "ok");
ok("🔴 a dump that was never VERIFIED reports 'unverified', not ok",
  backupHealth(run({ verified: false })).kind === "unverified",
  "taking a dump is not evidence; restoring one is");
ok("a failed run reports 'failed'", backupHealth(run({ ok: false })).kind === "failed");
ok("⛔ a FAILED run is not rescued by verified:true",
  backupHealth(run({ ok: false, verified: true })).kind === "failed",
  "ok is checked before verified — a broken dump cannot present as healthy");
ok("an old run goes 'stale' rather than staying ok",
  backupHealth(run({ finishedAt: new Date(Date.now() - BACKUP_STALE_AFTER_MS - 60_000).toISOString() })).kind === "stale");
ok("just inside the window is still ok",
  backupHealth(run({ finishedAt: new Date(Date.now() - BACKUP_STALE_AFTER_MS + 60_000).toISOString() })).kind === "ok",
  "the boundary is asserted from both sides, not assumed");
ok("an unparseable timestamp is treated as stale, never ok",
  backupHealth(run({ finishedAt: "not-a-date" })).kind === "stale",
  "a corrupt state row must degrade to a warning, not a green tick");

console.log("\n── 7 · Only the verifier may record health ─────────────────────");

const backup = readFileSync(new URL("./db-backup.mts", import.meta.url), "utf8");
const verify = readFileSync(new URL("./db-verify-backup.mts", import.meta.url), "utf8");
const restore = readFileSync(new URL("./db-restore.mts", import.meta.url), "utf8");

ok("the verifier writes backup state", /saveBackupRun|BACKUP_STATE_KEY/.test(verify));
ok("⛔ db:backup does NOT record health", !/saveBackupRun\(/.test(backup),
  "a dump nobody restored must not present as a healthy backup");
ok("⛔ db:restore does NOT record health", !/saveBackupRun\(/.test(restore),
  "a successful recovery says nothing about tomorrow's backup");

console.log("\n── 8 · The verifier can never target production ────────────────");

ok("the verifier has a production host list", /PRODUCTION_HOSTS/.test(verify));
ok("it refuses, with no override", /REFUSING/.test(verify) && /no override/i.test(verify),
  "verification restores a FULL copy — it must never point at the live money cluster");

console.log("\n── 9 · The restore script cannot be run by accident ────────────");

ok("it demands the target database BY NAME", /yes-restore-over/.test(restore),
  "a runbook copy-paste must not silently hit a different database");
ok("🔴 production needs a SECOND, different confirmation",
  /i-understand-this-overwrites-production/.test(restore) && /PRODUCTION_HOSTS/.test(restore));
ok("it refuses a populated target unless --drop-existing", /drop-existing/.test(restore),
  "replaying over existing tables leaves a mixture of old and new rows");
ok("it shows WHAT it will restore before asking", /describeManifest/.test(restore),
  "restoring a three-week-old backup over good data is worse than not restoring");
ok("it warns when the backup is old", /hours old/.test(restore));
ok("🔴 it re-verifies row counts AND money after replaying",
  /Row counts vs manifest/.test(restore) && /Money invariants vs manifest/.test(restore),
  "a replay that exits 0 having lost rows is silent data loss");
ok("it exits non-zero when a post-restore check fails",
  /failures\b[\s\S]{0,400}process\.exit\(1\)/.test(restore));
ok("it refuses a file with no manifest", /No manifest in this file/.test(restore),
  "an arbitrary .sql is not a 50pick backup");

console.log("\n── 10 · The compliance card renders REAL state ──────────────────");

// NEXT-PLAN's warning was explicit: "When you build backups, wire this card to the
// REAL last-run state — do not restore a static tick." This is that warning as a gate.
const compliance = readFileSync(new URL("../src/app/admin/compliance/page.tsx", import.meta.url), "utf8");
ok("the card reads backup state from the store", compliance.includes("loadBackupRun"));
ok("it classifies via backupHealth, not its own logic", compliance.includes("backupHealth"));
ok("🔴 no hardcoded 'no backup configured' string survives",
  !/No backup configured/.test(compliance),
  "the static text this replaces was the original lie");
ok("all five health states are rendered",
  ["none", "failed", "unverified", "stale", "ok"].every((k) => compliance.includes(`"${k}"`)),
  "a state with no branch would fall through to a misleading default");
ok("it fails CLOSED when the state read errors",
  /loadBackupRun\(\)\.catch\(\(\) => null\)/.test(compliance),
  "a failed read must report 'none', never assume health");

console.log("\n── 11 · Backups are never committed ───────────────────────────");

const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
ok("backups/ is gitignored", /^backups\/$/m.test(gitignore),
  "even sealed, a backup is every balance, phone number and NIDA on the platform");

console.log(`\n${"─".repeat(64)}\n  BACKUP TOOLCHAIN: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
