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
import { Prisma } from "@prisma/client";
import {
  BACKUP_KEY_ENV,
  BACKUP_KEY_MIN_LEN,
  MANIFEST_MARKER,
  MANIFEST_VERSION,
  backupKey,
  readManifest,
  recordTargetFor,
  tableOrder,
  lit,
  ident,
  maskUrl,
  isSealed,
  orderUndeclared,
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
  undeclaredTables: ["UpDownProposal"],
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
ok("undeclared tables are named in the manifest",
  parsed?.undeclaredTables?.[0] === "UpDownProposal",
  "a table dumped by introspection must be declared as such, or the omission is silent");
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
// Asserting only `!saveBackupRun(` was too weak to mean anything: the verifier does not
// use that helper either — it upserts BACKUP_STATE_KEY directly, because by that point
// DATABASE_URL has been repointed at the scratch database. So a db:restore that recorded
// health the same way would have passed this section. Name the KEY, which is the actual
// capability, rather than one of the two ways to use it.
ok("⛔ db:backup does NOT record health",
  !/saveBackupRun\(/.test(backup) && !/BACKUP_STATE_KEY/.test(backup),
  "a dump nobody restored must not present as a healthy backup");
ok("⛔ db:restore does NOT record health",
  !/saveBackupRun\(/.test(restore) && !/BACKUP_STATE_KEY/.test(restore),
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

console.log("\n── 12 · Every column the scripts SUM actually exists ───────────");

// 🔴 THE GATE THIS SECTION EXISTS FOR. `db-restore.mts` summed `Wallet."bonus"`. The
// column is `bonusBalance`. Postgres threw on that query AFTER the replay had already
// committed, so the recovery tool reported "restore failed — nothing was committed"
// while every shilling was back. §9 above was green throughout, because it asserts
// that the STRING "Money invariants vs manifest" appears in the file. A regex over
// source cannot see a wrong column name.
//
// So this resolves every summed column against Prisma.dmmf — the same live derivation
// the table order uses. A renamed column breaks it; it cannot be satisfied by a
// hand-kept list, because there is no list.

/** Every `sum("col") from "public"."Table"` pair in a script's SQL. */
function summedColumns(src: string): Array<{ table: string; column: string }> {
  const out: Array<{ table: string; column: string }> = [];
  for (const m of src.matchAll(/sum\(\s*"([A-Za-z_]\w*)"\s*\)\s*from\s+"public"\."(\w+)"/gi)) {
    out.push({ column: m[1], table: m[2] });
  }
  return out;
}

const modelByTable = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.dbName ?? m.name, m]));
const walletModel = modelByTable.get("Wallet");
/** The wallet's money columns, derived — every scalar Decimal on the model. */
const walletMoneyCols = (walletModel?.fields ?? [])
  .filter((f) => f.kind === "scalar" && f.type === "Decimal")
  .map((f) => f.name)
  .sort();

// The derivation must be proven to have found something. `every()` over an empty array
// is TRUE, so an empty list here would make every assertion below pass for any input —
// the exact shape of the three lying gates this repo has already shipped.
ok("dmmf yields the Wallet model", !!walletModel);
ok("the wallet's money columns are derived, not listed",
  walletMoneyCols.length >= 4 && walletMoneyCols.includes("bonusBalance"),
  walletMoneyCols.join(", "));

for (const [name, src] of [["db-backup", backup], ["db-verify-backup", verify], ["db-restore", restore]] as const) {
  const sums = summedColumns(src);
  // Same reason: if the regex matched nothing (a reformat, a CRLF checkout), the two
  // assertions after this would be vacuously true. This is the one that catches that.
  ok(`${name}: summed columns were extracted`, sums.length >= 5, `${sums.length} found`);

  const bogus = sums.filter(({ table, column }) => {
    const model = modelByTable.get(table);
    return !model || !model.fields.some((f) => f.name === column && f.kind === "scalar");
  });
  ok(`${name}: every summed column exists in the schema`, bogus.length === 0,
    bogus.length ? bogus.map((b) => `${b.table}."${b.column}"`).join(", ") : `${sums.length} checked`);

  // All three must check the SAME money, or one of them is silently not checking a
  // balance it claims to. A fifth Decimal added to Wallet turns all three red until
  // they cover it — which is the correct outcome for a money invariant.
  const walletSummed = sums.filter((s) => s.table === "Wallet").map((s) => s.column).sort();
  const missing = walletMoneyCols.filter((c) => !walletSummed.includes(c));
  ok(`${name}: sums EVERY wallet money column`, missing.length === 0,
    missing.length ? `missing ${missing.join(", ")}` : walletSummed.join(", "));
}

console.log("\n── 12b · A database ahead of the schema is still backed up ──────");

// 🔴 THE FIRST REAL DRILL, 2026-07-30, DIED HERE. `db:backup` aborted against production
// because prod carried `UpDownProposal` from a migration applied ahead of its code — the
// repo's own deploy practice — so there was NO way to back up the money database at all.
// Undeclared tables are now dumped by introspection and named in the manifest. The rule
// was never "only declared tables"; it was "never omit data silently".
const noEdges: Array<{ child: string; parent: string }> = [];
const plainCase = orderUndeclared(["UpDownProposal"], noEdges);
ok("an undeclared table is placed, not refused",
  plainCase.order?.length === 1 && plainCase.order[0] === "UpDownProposal",
  "refusing to dump a table you can read and enumerate protects nothing");

const twoCase = orderUndeclared(["Child", "Parent"], [{ child: "Child", parent: "Parent" }]);
ok("undeclared parents are ordered before their children",
  (twoCase.order ?? []).indexOf("Parent") < (twoCase.order ?? []).indexOf("Child"),
  "a plain INSERT replay has to satisfy FKs without deferring them");
// ⚠️ indexOf(a) < indexOf(b) is TRUE when a is missing (-1). Assert both are present, or
// this passes for an order that dropped one of them entirely.
ok("…and both are actually present", (twoCase.order ?? []).length === 2, (twoCase.order ?? []).join(", "));

const blocked = orderUndeclared(["Ghost"], [{ child: "Wallet", parent: "Ghost" }]);
ok("🔴 a DECLARED table with an FK into an undeclared one still aborts",
  (blocked.blocking ?? []).length === 1,
  "the parent must be inserted first and undeclared tables are dumped last — no append order fixes it");
ok("…and the blocking edge is named", blocked.blocking?.[0]?.parent === "Ghost");

const selfRef = orderUndeclared(["Loop"], [{ child: "Loop", parent: "Loop" }]);
ok("a self-referencing undeclared table does not hang or vanish",
  selfRef.order?.length === 1,
  "row order inside a table is already fixed by the dump's own ORDER BY");

ok("db:backup dumps undeclared tables after the declared ones",
  /\[\.\.\.known, \.\.\.undeclared, "_prisma_migrations"\]/.test(backup),
  "declared parents first, then introspected tables, then Prisma's bookkeeping");
ok("db:backup records them in the manifest", /undeclaredTables: undeclared/.test(backup),
  "a table dumped by introspection has to be visible as such to whoever restores it");

console.log("\n── 13 · One seal key, one name, one reader ─────────────────────");

// The artifact was sealed under BACKUP_ENCRYPTION_KEY and db:restore opened it with
// BACKUP_PASSPHRASE — so the one tool needed during a recovery could not open what the
// other two produce, and the runbook's drill exported the restore-only name. The length
// rule was duplicated in the writer alone, so a 4-character key sealed nothing and
// opened everything.
ok("the env name is BACKUP_ENCRYPTION_KEY", BACKUP_KEY_ENV === "BACKUP_ENCRYPTION_KEY");

const KEY_ENV_READ = /process\.env(?:\.|\[\s*["'])BACKUP_(?:PASSPHRASE|ENCRYPTION_KEY)/;
for (const [name, src] of [["db-backup", backup], ["db-verify-backup", verify], ["db-restore", restore]] as const) {
  ok(`${name}: reads the key through backupKey(), not process.env`,
    !KEY_ENV_READ.test(src) && /backupKey\(\)/.test(src));
}
ok("⛔ the old name is read nowhere in the toolchain",
  ![backup, verify, restore, core].some((src) => /process\.env(?:\.|\[\s*["'])BACKUP_PASSPHRASE/.test(src)),
  "a recovery is not the moment to discover the key has two names");
ok("core.ts is the ONE reader of the env var",
  (core.match(/process\.env\[BACKUP_KEY_ENV\]/g) ?? []).length === 1 &&
    !/process\.env(?:\.|\[\s*["'])BACKUP_ENCRYPTION_KEY/.test(core));

// Driven, not asserted about: the helper's actual behaviour at all three boundaries.
const savedKey = process.env[BACKUP_KEY_ENV];
try {
  delete process.env[BACKUP_KEY_ENV];
  ok("unset ⇒ null (the caller decides whether that is fatal)", backupKey() === null);

  process.env[BACKUP_KEY_ENV] = "x".repeat(BACKUP_KEY_MIN_LEN - 1);
  let threw = false;
  try { backupKey(); } catch { threw = true; }
  ok("🔴 one character too short THROWS, at both ends", threw,
    `${BACKUP_KEY_MIN_LEN - 1} chars was accepted by the opener and refused by the writer`);

  process.env[BACKUP_KEY_ENV] = "y".repeat(BACKUP_KEY_MIN_LEN);
  ok("exactly the minimum is accepted", backupKey() === "y".repeat(BACKUP_KEY_MIN_LEN),
    "the boundary is asserted from both sides");
} finally {
  if (savedKey === undefined) delete process.env[BACKUP_KEY_ENV];
  else process.env[BACKUP_KEY_ENV] = savedKey;
}

console.log("\n── 14 · --record can never silently record nothing ─────────────");

// It could, and it did: `BACKUP_RECORD_DATABASE_URL` unset ⇒ a console.warn and
// exit 0. The runbook never mentioned that variable, so drill step 3 "succeeded",
// wrote nothing, and step 4 — "confirm the card flipped" — could not have passed.
const t1 = recordTargetFor(undefined, undefined);
ok("🔴 no target at all is an ERROR, not a shrug", "error" in t1,
  "asking to record and not recording is a failure");
const t2 = recordTargetFor(undefined, "postgresql://u:p@prod/db");
ok("falls back to the database the run started against", "url" in t2 && t2.url.includes("prod"));
const t3 = recordTargetFor("postgresql://u:p@explicit/db", "postgresql://u:p@prod/db");
ok("an explicit target wins", "url" in t3 && t3.url.includes("explicit"));

// And the script must ACT on that error. Anchored on position, not on a newline: a
// CRLF checkout makes `\n`-anchored patterns match nothing, and indexOf(-1) then
// silently slices from the end — one of the ways a gate in this repo lied before.
const nothingRecordedAt = verify.indexOf("NOTHING WAS RECORDED");
ok("the script reports the record failure", nothingRecordedAt !== -1);
ok("🔴 …and exits non-zero on it",
  nothingRecordedAt !== -1 && verify.slice(nothingRecordedAt, nothingRecordedAt + 400).includes("process.exit(2)"),
  "a verified backup whose health was not written must not exit 0");
ok("the record target is a named decision, not an inline ??",
  /recordTargetFor\(/.test(verify),
  "an inline ?? that can resolve to undefined cannot be driven by a test");

console.log("\n── 15 · A backup that is scheduled and off-box ─────────────────");

// "Toolchain built, never run" was the state for a day. A backup nobody scheduled runs
// when somebody remembers; a backup on the same disk as the database is not a backup.
const wf = readFileSync(new URL("../.github/workflows/backup-nightly.yml", import.meta.url), "utf8");
ok("a nightly workflow exists", /schedule:/.test(wf) && /cron:/.test(wf));
ok("🔴 it VERIFIES, not just dumps", /db:verify-backup/.test(wf) && /--record/.test(wf),
  "taking a dump proves nothing — only a restore does");
ok("it restores into a throwaway Postgres, not production",
  /VERIFY_DATABASE_URL: postgresql:\/\/postgres:pw@localhost/.test(wf));
ok("the scratch image matches production's major version", /image: postgres:18/.test(wf),
  "a restore is evidence only on the version that would be recovering");
ok("it ships the artifact off-box", /db:backup-upload/.test(wf));
ok("⛔ the dump never leaves as a CI artifact",
  /rm -f backups\/\*\.enc/.test(wf) && !/actions\/upload-artifact/.test(wf),
  "sealed or not, that store is readable by anyone with Actions access");
ok("it fails fast when secrets are missing", /Missing repository secrets/.test(wf),
  "a run that dumps and cannot seal leaves plaintext on a public runner");

const uploader = readFileSync(new URL("./backup-upload.mts", import.meta.url), "utf8");
ok("🔴 the uploader REFUSES an unsealed artifact",
  /REFUSING to upload an UNSEALED backup/.test(uploader) && /isSealed\(bytes\)/.test(uploader),
  "the bucket must not be the only thing protecting every NIDA on the platform");
ok("backups go to their OWN bucket, not the KYC one",
  /R2_BACKUP_BUCKET/.test(uploader) && !/R2_BUCKET\b/.test(uploader),
  "the running app can reach the KYC bucket; a backup should not share that blast radius");
ok("⛔ the uploader does not record health", !/BACKUP_STATE_KEY|saveBackupRun/.test(uploader),
  "getting a file into a bucket is not evidence that it restores");

console.log("\n── 15b · The drill must not weigh down production builds ────────");

// ⚠️ Adding `embedded-postgres` as a devDependency put 107 MB of Postgres binaries into
// every Railway build: the platform packages are optional deps picked by os/cpu, so the
// Linux builder pulls @embedded-postgres/linux-x64 to support a drill that only ever runs
// on a laptop. It is installed on demand instead, through a computed specifier so `tsc`
// does not need it either, and CI uses a postgres:18 service container.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
ok("⛔ embedded-postgres is NOT a dependency of this repo",
  !("embedded-postgres" in allDeps) && !Object.keys(allDeps).some((d) => d.startsWith("@embedded-postgres/")),
  "107 MB of Postgres binaries in every production image, for a laptop-only drill");
const scratch = readFileSync(new URL("./db-scratch.mts", import.meta.url), "utf8");
ok("db:scratch loads it lazily, through a computed specifier",
  /\["embedded", "postgres"\]\.join\("-"\)/.test(scratch),
  "a static import would make tsc require a package that is not installed");
ok("…and tells you the exact install command when it is missing",
  /npm i -D --no-save embedded-postgres@/.test(scratch));

console.log("\n── 16 · Source problems are never blamed on the backup ─────────");

// The first real verification ended in "DO NOT TRUST THIS BACKUP" over four failures.
// Production reported the same four. The artifact was perfect.
// ⚠️ These are anchored on the STRUCTURE, not on the identifier. An earlier draft
// asserted `/sourceIntegrity/.test(backup)` — and deleting the field from the manifest
// left the word in three other places in the same file, so the gate stayed green while
// the manifest lost it. Substring-anywhere is how the original defects survived 59
// checks; every assertion in this section was re-broken until it went red.
const manifestAt = backup.indexOf("const manifest: BackupManifest = {");
ok("the manifest literal was located", manifestAt !== -1);
ok("the manifest records the SOURCE's own integrity verdict",
  manifestAt !== -1 && backup.slice(manifestAt, manifestAt + 900).includes("sourceIntegrity,"),
  "without it, a faithful copy of an unhealthy database looks like a broken backup");
ok("the verifier compares restored against the SOURCE",
  /trialBalance matches the source/.test(verify) && /audit chain link state matches/.test(verify));
ok("🔴 source problems are reported separately, not as backup failures",
  /sourceWarnings\.push\(/.test(verify) && /BUT THE SOURCE DATABASE HAS PROBLEMS/.test(verify));
ok("a source problem still lets the run record verified=true",
  // The push into sourceWarnings must not also push into `failures` — that would fail
  // the run and leave the compliance card red forever on a good backup.
  !/failures\.push\([^)]*source/i.test(verify),
  "a nightly that is red forever teaches people to ignore it");
ok("the compliance card renders them as their own warning",
  // The GUARD, not the identifier: an earlier version passed with the whole block
  // switched off, because `sourceWarnings` still appeared inside the dead branch.
  compliance.includes("backup.run.sourceWarnings?.length") && compliance.includes("Source database"),
  "an officer has to be able to tell a bad backup from a bad database");

console.log(`\n${"─".repeat(64)}\n  BACKUP TOOLCHAIN: ${pass} passed, ${fail} failed\n${"─".repeat(64)}`);
process.exit(fail === 0 ? 0 : 1);
