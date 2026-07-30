# Backups — what exists, what it proved, and how to run it

Built 2026-07-30. **The drill has now been run against production.** A sealed 13 MB
artifact was taken, shipped, restored into a throwaway PostgreSQL 18.3 cluster, checked
against 79 assertions, and `db:restore` was rehearsed end to end. `/admin/compliance`
reads that run.

> **A backup you have never restored is not a backup. It is a file you feel good about.**
>
> That sentence was written the day before the first restore. The restore then found
> **six defects**, four of which no test could have caught, one of which would have made a
> successful recovery report itself as a failure, and one of which had been silently
> dropping a uniqueness guarantee from every artifact ever written.

---

## The four commands

| Command | Does | Safe? |
|---|---|---|
| `npm run db:backup` | Dumps schema + extensions + data + indexes + constraints + foreign keys + sequence resets into one replayable, sealed file | ✅ read-only, one snapshot |
| `npm run db:scratch` | Boots a throwaway PostgreSQL 18.3 on `127.0.0.1:5433` for the verifier to restore into | ✅ local only |
| `npm run db:verify-backup -- --file <f>` | Restores into a **throwaway** database and re-checks everything. **Refuses production, no override.** The only thing allowed to record backup health | ✅ never touches the source |
| `npm run db:restore -- --file <f>` | Puts a backup **back**. 🔴 **The only script here that destroys data on purpose** | ⛔ four gates, see below |

Plus `npm run db:backup-upload -- --file <f>`, which ships a **sealed** artifact to R2 and
refuses to upload an unsealed one.

## ▶ The drill

```sh
# 1. Secrets. The key seals every artifact; store it in a PASSWORD MANAGER as well as
#    Railway/CI. A key that lives only where the database lives is not a key.
export BACKUP_ENCRYPTION_KEY='…'          # 32 random bytes, base64 (>= 24 chars enforced)
export AUDIT_CHAIN_SECRET='…'             # so the manifest can record the source's chain state

# 2. The SOURCE. Railway's DATABASE_URL is postgres.railway.internal, which resolves ONLY
#    inside Railway's private network — `railway run npm run db:backup` cannot reach it
#    from a laptop. Use the Postgres service's PUBLIC url.
export DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)

npm run db:backup                          # → backups/50pick-full-<stamp>.sql.gz.enc

# 3. Off-box. A backup on the same disk as the database is not a backup.
npm run db:backup-upload -- --file backups/<artifact>

# 4. PROVE IT. Boots the scratch cluster, restores into a throwaway database inside it,
#    re-runs the platform's own trialBalance() and verifyChainFull(), records health.
npm run db:scratch -- --run npm run db:verify-backup -- --file backups/<artifact> --record

# 5. Look at /admin/compliance. A green script is not the artifact an officer receives.
```

Nightly, this is `.github/workflows/backup-nightly.yml` (00:15 UTC / 03:15 EAT). It needs
these repository secrets: `BACKUP_SOURCE_DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`,
`AUDIT_CHAIN_SECRET`, `R2_ENDPOINT`, `R2_BACKUP_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`. It fails fast if any is missing, rather than dumping the database
and then discovering it cannot seal it.

## 🔴 What the first real restore found

Every one of these was invisible to a green `test:backup` and to `npm run typecheck`.

| # | Defect | Why nothing caught it |
|---|---|---|
| 1 | `db:restore` summed `Wallet."bonus"`; the column is `bonusBalance`. Postgres threw **after** the replay had committed, so a **successful recovery reported itself as a failure** | The gate asserted that the *string* `"Money invariants vs manifest"` existed in the file. A regex over source cannot see a wrong column name. |
| 2 | The seal key had **two names** — `BACKUP_ENCRYPTION_KEY` in the writer and verifier, `BACKUP_PASSPHRASE` in the restorer | Nothing compared them. The runbook exported the restore-only name, so the documented drill could not have worked. |
| 3 | `--record` needed an env var the runbook never mentioned, and without it printed a note and **exited 0** | "Recorded nothing" and "recorded successfully" were the same exit code. |
| 4 | `db:backup` **aborted** on production because prod had a table this branch's schema did not declare | The abort was correct in principle. But pre-applying a migration before pushing is this repo's *normal deploy practice*, so a routine state left a licensed operator with no way to take a backup at all. |
| 5 | The scratch cluster was WIN1252; the dump is UTF-8. It died on 至 — one of **1,464** Chinese market titles | Nothing recorded what encoding the backup needed. |
| 6 | **A unique index was missing from every artifact ever written.** `pg_constraint.conindid` is also set on FOREIGN KEYS, pointing at the index they reference, so a filter of "skip indexes backing a constraint" silently dropped `AffiliateAgent_userId_key` | Row counts, money totals and the audit chain all matched. The only symptom would have been a duplicate, months later. |
| 7 | The manifest **contradicted itself**: data and invariants were read on different pooled connections, so 23 audit rows written mid-dump made the verifier fail a perfect artifact | Only visible against a live, busy database. |
| 8 | The `nextval()` check used `JSON.stringify`, producing a double-quoted **identifier** where SQL needs a literal — a syntax error every time it ran | It had never run. |

**What changed as a result:** one snapshot (`REPEATABLE READ READ ONLY`) for the whole
dump; the encoding and a `md5` fingerprint of the platform's non-ASCII text in the
manifest; structural counts (indexes, unique indexes, PKs, checks, FKs) compared after
restore; undeclared tables dumped by introspection and named; foreign keys emitted last;
constraints the table DDL does not create re-added explicitly; and
`tsconfig.backup.json`, because two of these were files that **could not be parsed** while
`npm run typecheck` reported success — `.mts` is outside the root tsconfig.

## Source problems are not backup problems

The first verification ended with **"DO NOT TRUST THIS BACKUP"** over four failures.
Production reported the same four. The artifact was flawless.

So the comparison is now **restored-vs-source**, and the source's own health is recorded
in the manifest and reported separately. A backup is good when it reproduces the source
exactly; whether the source is healthy is a different question with a different owner.
Left unfixed, the nightly job would have been red forever and the compliance card would
never have shown a verified backup — which teaches people to ignore both.

### 🔴 Open finding from the first drill (production, not the backup)

- **One wallet holds TZS 100,000 with no ledger entry, no `Transaction` row and no audit
  row behind it.** `trialBalance()` reports `ok: false`, 1 drifting wallet, 100,000 drift;
  `globalSum` is 0 and no ledger group is imbalanced, so the double-entry books
  themselves are intact — the money simply never went through them. The wallet was
  created and credited 424 ms later, on 2026-07-30. 100,000 is exactly the
  `TESTER_BOOTSTRAP_PHONES` starter amount, and `auth-service.ts` forces starter credits
  to 0 only in **LIVE** money mode — production is in TEST mode — but that variable is not
  currently set and `starterBalanceTzs` is 0, so the path was **not** confirmed. Needs
  Ali: decide whether to write the missing ledger entry or reverse the credit.
- **The audit chain reports a broken link** on production (`verifyChainFull().linkBroken`).
  All 1,032 checked entries also predate the current signing key.

Both are visible on `/admin/compliance` under the backup card, and both are faithfully
present in the artifact.

## Design decisions worth knowing before you touch it

**The table list is derived, never written down.** `tableOrder()` reads `Prisma.dmmf`. The
sibling AWARKEH repo kept its list inside its backup script and forgot a model **three
times**; the last one meant `db:backup` had been aborting on production for weeks.

**Tables the schema does not declare are dumped anyway**, by introspection, and named in
`manifest.undeclaredTables`. The rule was never "only declared tables" — it was *never omit
data silently*. The one case that still aborts is a declared table holding a foreign key
into an undeclared one, where no ordering can satisfy the replay.

**Sealing is authenticated encryption, not obfuscation.** AES-256-GCM: a wrong key and a
single flipped byte both **throw**. `backups/` and `.pgscratch/` are gitignored — even
sealed, a backup is every balance, phone number, NIDA and KYC record on the platform, and
during a verification run the scratch cluster holds all of it in plaintext on disk.

**Only the verifier records health.** `db:backup`, `db:restore` and the uploader
deliberately do not, and `test:backup` asserts that `BACKUP_STATE_KEY` appears in none of
them. A dump nobody restored must never present as healthy, and a successful *recovery*
says nothing about whether tomorrow's backup is good.

## 🔴 `db:restore` — the four gates

It cannot refuse production the way the verifier does: on the day it is needed, production
*is* the target. So it can only be made impossible to run by accident.

1. **Prints what it will restore first** — when it was taken (with an age warning), row
   counts, wallet totals, audit head, and any undeclared tables.
2. **`--yes-restore-over <dbname>`** must name the target exactly.
3. **`--i-understand-this-overwrites-production`** additionally, for a production host.
4. **`--drop-existing`** for a populated target.

Then it re-verifies row counts, all seven money invariants and the audit head against the
manifest, and exits non-zero on any mismatch. Restoring is not the last step; checking is.

**Rehearsed 2026-07-30** into a scratch database: replayed in 5.8 s, every check matched,
exit 0.

## The scratch cluster

`npm run db:scratch` boots a real PostgreSQL **18.3** — production's version — from the
`embedded-postgres` devDependency, on loopback only, into `.pgscratch/`.

- `npm run db:scratch` — boot and hold; prints the `VERIFY_DATABASE_URL` to export.
- `npm run db:scratch -- --run <cmd…>` — boot, run with the URL injected, stop.
- `npm run db:scratch -- --reset` — discard the cluster and re-initialise.

It initdb's with `--encoding=UTF8` (the Windows default is WIN1252, which cannot hold this
platform's data), reuses a cluster that is already listening, and sweeps its **own**
orphaned postgres processes — PostgreSQL 18 leaves an `io_worker` behind on an unclean
exit, which then blocks every later start with "pre-existing shared memory block is still
in use". It never touches another project's cluster; the sibling AWARKEH repo runs one on
`:54330`.

⚠️ CI does not use it: `.github/workflows/backup-nightly.yml` uses a `postgres:18` service
container instead, which must be kept on production's major version.

## Still open

- **Repository secrets are not set yet**, so the nightly workflow will fail its
  configuration check until Ali adds them. That is deliberate — it fails before touching
  production rather than after.
- **`R2_BACKUP_BUCKET` does not exist yet.** It must be a *separate* bucket from
  `50pick-kyc`: the running app can reach that one, and a backup should not share a blast
  radius with the documents inside it.
- **Only the backup toolchain is typechecked.** `tsconfig.backup.json` covers five files;
  the other ~60 `scripts/*.mts` suites use loose fixture types and are still transpiled
  without checking.

Guarded by `npm run test:backup` — 110 checks, plus a typecheck of the five files that
make up the recovery path. Every negative assertion in it has been broken on purpose and
observed to go red.
