# Backups — what exists, and the drill that makes it real

Built 2026-07-30. **The toolchain is complete and tested. It has never been run against
production.** Until the drill below is done, `/admin/compliance` correctly reports that no
backup has ever run — and that is the honest answer, not a bug.

> **A backup you have never restored is not a backup. It is a file you feel good about.**

---

## The three commands

| Command | Does | Safe? |
|---|---|---|
| `npm run db:backup` | Dumps schema + extensions + data + sequence resets into one replayable, sealed file | ✅ read-only |
| `npm run db:verify-backup -- --file <f>` | Restores into a **throwaway** database and re-checks every invariant. **Refuses production, no override.** The only thing allowed to record backup health | ✅ never touches the source |
| `npm run db:restore -- --file <f>` | Puts a backup **back**. 🔴 **The only script here that destroys data on purpose** | ⛔ four gates, see below |

## What is actually protected

Not photos or copy — `Wallet` (player balances), `LedgerEntry` (double-entry ledger),
`AuditLog` (the tamper-evident chain), and `Transaction` / `Position` / `PredictionMarket`
(the settlement record) of a licensed real-money operator. That is why the manifest carries
**money invariants**, not just row counts, and why the verifier re-runs the platform's own
`trialBalance()` and `verifyChainFull()` rather than re-implementing the arithmetic.

## Design decisions worth knowing before you touch it

**The table list is derived, never written down.** `tableOrder()` reads `Prisma.dmmf`, so a
new model is backed up the moment it is added. The sibling AWARKEH repo kept its list inside
the backup script and forgot a model **three separate times** — the last one meant
`db:backup` had been aborting on production for weeks and nobody knew. `db-backup.mts` still
aborts if the live database has a table the derivation missed: belt and braces, because a
backup that silently omits `LedgerEntry` is worse than none, since you trust it.

**Two defects only a restore could find** (first drill, 2026-07-29). `prisma migrate diff`
emits the `pg_trgm` GIN indexes but **not** the `CREATE EXTENSION` they need, so the dump died
on `operator class "gin_trgm_ops" does not exist`. And it renders GIN indexes as
`USING GIN (col gin_trgm_ops ASC)`, which Postgres rejects outright. Extensions now come from
`pg_extension` and index DDL from `pg_indexes.indexdef` — Postgres's own re-executable
rendering. Both were invisible to a green build.

**Sealing is authenticated encryption, not obfuscation.** AES-256-GCM: a wrong passphrase and
a single flipped byte both **throw**, because silent corruption is the one failure mode a
backup cannot have. `backups/` is gitignored — even sealed, a backup is every balance, phone
number, NIDA and KYC record on the platform.

**Only the verifier records health.** `db:backup` and `db:restore` deliberately do not. A dump
nobody restored must never present as healthy, and a successful *recovery* says nothing about
whether tomorrow's backup is good. `/admin/compliance` renders one of five states from that
row — `none` / `failed` / `unverified` / `stale` / `ok` — and fails **closed** if the read
errors. There is no static fallback; that hardcoded green tick is exactly what this replaced.

## 🔴 `db:restore` — the four gates

It cannot refuse production the way the verifier does: on the day it is needed, production
*is* the target. So it can only be made impossible to run by accident.

1. **Prints what it will restore first** — when the backup was taken (with an age warning),
   row counts, wallet totals, audit head. Restoring a three-week-old backup over good data is
   worse than not restoring, and seeing the date is the only defence.
2. **`--yes-restore-over <dbname>`** must name the target exactly, so a runbook copy-paste
   cannot hit a different database than the one you were reading about.
3. **`--i-understand-this-overwrites-production`** additionally, for a production host.
4. **`--drop-existing`** for a populated target — replaying over existing objects half-fails
   and leaves a mixture of old and restored rows, which is worse than either.

Then it **re-verifies** row counts, all seven money invariants and the audit head against the
manifest, and exits non-zero on any mismatch. Restoring is not the last step; checking is.

---

## ▶ The drill — do this, and backups stop being theoretical

```sh
# 1. Somewhere to put it, and a key. Store the passphrase in a password manager,
#    NOT in Railway alone — a backup you cannot decrypt is not a backup either.
export BACKUP_PASSPHRASE='…'
export VERIFY_DATABASE_URL='postgresql://…local-or-scratch-cluster…'

# 2. Take one from production (read-only).
railway run --service 50pick npm run db:backup

# 3. Prove it. Restores into a THROWAWAY database, re-runs trialBalance() and
#    verifyChainFull(), then records health for /admin/compliance.
npm run db:verify-backup -- --file backups/50pick-full-<stamp>.sql.gz.enc --record

# 4. Confirm the card flipped to "Backup verified" on /admin/compliance.
```

Then schedule steps 2–3 (cron or CI), and ship the artifact **off-box** — R2 or an encrypted
CI artifact. A backup on the same disk as the database is not a backup.

**Also rehearse `db:restore` once**, into a scratch database, so the first time anyone runs it
is not during an incident:

```sh
npm run db:restore -- --file backups/<f> \
  --target "$VERIFY_DATABASE_URL" --yes-restore-over <scratch_db_name> --drop-existing
```

## Still open

- Nothing is **scheduled** — every command above is manual today.
- No **off-box destination** is wired. `destination` in the state row is a free-text field
  the caller sets; nothing uploads yet.
- `BACKUP_PASSPHRASE` and `VERIFY_DATABASE_URL` are not set anywhere.
- The drill has **not** been run, so backup health is `none` — correctly.

Guarded by `npm run test:backup` (59 checks, pure — no DB, no network).
