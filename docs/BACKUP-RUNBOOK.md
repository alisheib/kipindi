# Backups — what exists, what it proved, and how to run it

Built 2026-07-30. **The drill has been run against production, and since 2026-07-31 the
NIGHTLY runs it unattended: dump → off-box to R2 → restore into a throwaway Postgres →
record health.** Proven by the artifact in the bucket, not by the workflow going green. A sealed 13 MB
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

## 🔑 Where the seal key lives — read this before an incident, not during one

`BACKUP_ENCRYPTION_KEY` is the only thing that opens any artifact. **Rotated 2026-07-31**,
and it is now in three places:

| Where | Readable? | Why there |
|---|---|---|
| **Railway** → `50pick` service → `BACKUP_ENCRYPTION_KEY` | ✅ yes | The one place an operator can go and look |
| **GitHub** repo secret `BACKUP_ENCRYPTION_KEY` | ❌ **write-only** | What the nightly seals with |
| `.env.backup.local` on the hardening machine | ✅ yes | gitignored working copy |

🔴 **WHY IT WAS ROTATED, and it is the sharpest lesson in this file.** The nightly had been
sealing every artifact with a key that existed **only as a GitHub secret** — and GitHub
secrets cannot be read back, by anyone, ever. Proven rather than assumed: the local key was
tried against the CI artifact and failed with `unable to authenticate data`. So every backup
the schedule produced was **undecryptable by any human**. It restored, it verified, it
recorded `verified: true` — and nobody could have opened it. **A backup you cannot decrypt
is not a backup, and this one passed every check we had.**

The fix: generate a key, put it somewhere retrievable *first*, then set it everywhere and
re-run. Verified by fetching the newest artifact from R2 and opening it with the stored key
— 13.19 MB, 32,768 rows, `sourceIntegrity.trialBalanceOk: true`.

⚠️ **Two artifacts in the bucket predate the rotation and CANNOT be opened** —
`…T08-13-44-316Z` (the orphaned CI key) and `…2026-07-30T15-43-27-112Z` (the old local key).
Both are superseded by the newest, which is a complete backup of the same database taken
later, and the 90-day rule removes them. **Do not reach for either during a recovery.**

⚠️ **The tradeoff of keeping it on Railway, stated plainly:** that environment also holds the
R2 credentials, so anything that reads it gets both the key and the bucket. The alternative
was a key on one laptop, where losing the laptop loses every backup. Put a copy in a password
manager too — that is the version with no single point of failure.

## 🔴 THE ELEVEN NIGHTS — found 2026-08-25, and the part that matters is not the bugs

**The nightly failed on eleven consecutive nights (2026-08-14 → 2026-08-24). The last
verified, restorable artifact was 2026-08-13 — 11.8 days old, on a licensed real-money
platform.** Two unrelated causes wearing the same red X:

| Nights | Cause | Fix |
|---|---|---|
| 2026-08-14 → 08-20 (7) | `could not resize shared memory segment "/PostgreSQL.849538176" to 70190496 bytes: **No space left on device**` in the VERIFY step | `--shm-size=1g` on the CI Postgres service. Docker gives a container **64 MB** of `/dev/shm`; the restore asked for **67 MB**. ⚠️ **The message names a disk and means shared memory** — the runner had plenty of disk. It also grows with the database, so it arrived one night with nothing changed, which is why it read as flakiness rather than as a fixed, findable cause. |
| 2026-08-21 → 08-24 (4) | `ABORT — 1 declared table(s) hold a foreign key into a table this branch's schema does not declare: **Session → Device**` | `orderAllTables` — the dump is now ordered over the whole FK graph. See below. |

⭐ **`db:backup` WAS RIGHT TO REFUSE, GIVEN THE ORDER IT WAS GIVEN.** On 2026-08-21 the F-05
expand step (`49398191`) removed `Device` from `prisma/schema.prisma` and deliberately left
the table on production — the correct expand/contract order — but `Session` still holds
`Session_deviceId_fkey` into it. The dump was assembled as `[...declared, ...undeclared]`,
so the parent would have been inserted after its child and the artifact would not replay.
**The refusal was correct about the ordering. It was the ordering that was wrong** — the
constraint belongs to the foreign-key graph, not to which branch declares what. The whole
set is now sorted at once, `tableOrder()` is preserved exactly where nothing forces a
change, and an undeclared parent is emitted just before the first declared table that needs
it. There is no remaining case where a dump has to be withheld.

⛔ **THE REAL DEFECT IS THAT NOBODY WAS TOLD, AND IT IS NOT THAT THE ALARM WAS BROKEN.**
`/admin/compliance` had been showing the amber **stale** state for ten of those days,
exactly as `BACKUP_STALE_AFTER_MS` (36 h) intends. The alarm was correct and nobody was
looking at it — a different failure, needing a different instrument: one you **run**, like
`census.cjs`, rather than one that waits to be noticed.

```
npm run ops:backup-status      # exits NON-ZERO when the last verified backup is stale
```

It reports the last recorded run, its age against the product's own staleness window, and
the source warnings the manifest carries. ⛔ **It writes nothing.** In particular it does
**not** record a failure into `__BACKUP_LAST_RUN__`: that row holds the last GOOD run, and
overwriting it with a failure would destroy the single most useful fact in an incident —
the date of the newest artifact known to restore. *A status tool that erases the status is
not a status tool.*

⚠️ **This file predicted it, for the other cause.** *"On the schedule there is no human
watching at 00:15 UTC. It would have failed in four seconds, every night, looking exactly
like a transient network blip in a log nobody reads."* That paragraph was written about
`ENOTFOUND postgres.railway.internal` in July. **The prediction was right and the cause was
a different one**, which is the argument for a run-it-yourself check rather than for
guessing the next cause.

⚠️ **And the manifest has carried `the SOURCE's audit chain has a broken link` since at
least 2026-08-13.** That is a statement about the DATABASE, not the artifact — a faithful
copy of an unhealthy database is a GOOD backup and a BAD situation. It is **not** part of
this repair and is **not** closed; it is named here so it is not mistaken for fallout.

**Guards:** `test:backup` **117/0** (the case asserting the old ABORT was **inverted, not
deleted**) · `red:backup-order` **4/4 caught, 0 missed**, anchors declared as data.

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

### ✅ Resolved — the finding the first drill surfaced (2026-07-31)

The orphaned **TZS 100,000** is cleared and **`trialBalance()` returns `ok: true` for the
first time** — 0 drifting wallets, 0 drift, global ledger sum 0, no imbalanced group.

🔴 **The order matters, and getting it wrong cost a round trip.** `adminAdjustBalance` moves
the wallet **and** the ledger together — that is what makes it money-safe, and it is exactly
why it cannot close a wallet↔ledger *mismatch*. Debiting the unledgered 100,000 left the
wallet at 0 and the player's ledger at −100,000: identical drift, opposite sign. The fix is
two steps, in this order:

1. **backfill** the ledger entry that was never written (ledger-only, balanced group), so the
   ledger states what the wallet actually holds;
2. **debit** through `adminAdjustBalance`, which moves both to zero together.

`scripts/ops-clear-unledgered-credit.mjs` does exactly that, refuses without `--actor`, is a
dry run until `--confirm`, and refuses to debit a wallet whose money has been used. Both
postings are in the audit chain, so the correction is as traceable as the money was not.

⚠️ **The audit-chain break is deliberately NOT "fixed".** It is a tamper-evident hash chain;
rewriting entries so it verifies is precisely what the chain exists to detect. A clean chain
that was edited is worth less than a broken one that is honest. All 1,032 checked entries
also predate the current signing key, so a key rotation is the likelier cause than tampering
— that needs investigating, not repairing.

### 🔴 Historical — the finding as first reported

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

`npm run db:scratch` boots a real PostgreSQL **18.3** — production's version — on loopback
only, into `.pgscratch/`.

⚠️ **The binaries are NOT a dependency of this repo.** Install them once, locally:

```sh
npm i -D --no-save embedded-postgres@18.3.0-beta.17
```

They are **107 MB**, and the platform packages are optional deps chosen by `os`/`cpu`, so
listing it in `package.json` made Railway's Linux builder pull
`@embedded-postgres/linux-x64` into **every production build and image** — to support a
drill that only ever runs on a laptop. `db:scratch` loads it through a computed specifier
(so `tsc` does not need it either) and prints that exact command when it is missing.
Guarded by `test:backup` §15b.

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

- ✅ **Repository secrets are SET — all seven, 2026-07-31**, verified with `gh secret list`
  against `alisheib/kipindi`. The workflow's "Check configuration" step now passes.

  🔴 **`BACKUP_SOURCE_DATABASE_URL` must be the PUBLIC url, and this is the trap.** Set from
  Railway's `DATABASE_URL` the first run died instantly:

  ```
  BACKUP FAILED: Error: getaddrinfo ENOTFOUND postgres.railway.internal
  ```

  `postgres.railway.internal` resolves **only inside** Railway's private network. The
  workflow runs on a GitHub runner, which is outside it. The right value is the Postgres
  service's **`DATABASE_PUBLIC_URL`** (`turntable.proxy.rlwy.net:40357`) — a different
  host *and* a different port, so copying the internal one and editing the hostname is not
  enough.

  Why this mattered more than a normal typo: on the schedule there is no human watching at
  00:15 UTC. It would have failed in four seconds, every night, looking exactly like a
  transient network blip in a log nobody reads. Check with:

  ```
  railway run node scripts/backup-secrets.mjs   # reports host + reachability, writes nothing
  ```

  ⚠️ The same trap applies to **anything** run outside Railway against this database —
  `railway run` included, since that executes locally. Inside the container (`railway ssh`)
  the internal host is correct and the public one is the wrong choice.
- ✅ **OFF-BOX IS REAL, 2026-07-31 08:06 UTC.** `50pick-backups` exists (WEUR, Standard,
  private) and a **13.16 MB sealed artifact of production is in it** —
  `2026-07-31/50pick-full-2026-07-30T15-43-27-112Z.sql.gz.enc`. Confirmed by
  `node scripts/backup-verify-offbox.mjs`, which lists the bucket independently, not by the
  uploader's own claim — because the uploader's own claim is exactly what lied below.

  🔴 **THE TRAP THAT CAME WITH IT: rolling an R2 token silently breaks the running app.**
  The account had ONE token (`50pick-kyc-rw`). Rolling it to widen its scope invalidated the
  old secret — and Railway was still holding it, so **KYC document upload and viewing were
  broken on production the moment the roll completed**, with nothing reporting it: no boot
  check, no health field, no alert. Nothing surfaces a dead storage credential until a
  player tries to upload an ID.

  Fixed within minutes by updating `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on the
  Railway service. **If you ever roll or replace an R2 token, update Railway in the SAME
  sitting** — and prefer creating a second token over rolling the one in use, which is what
  the separation below was for.

  ⚠️ **The current token reaches ALL buckets** (Ali's call, 2026-07-31, for simplicity). So
  the blast-radius separation argued for below is **not** in place today: one leaked key
  reaches both the KYC documents and the backups that contain them. Narrowing the workflow
  to a `50pick-backups`-only token remains the right end state.

  ✅ **RETENTION IS SET — 90 days, confirmed in the dashboard 2026-07-31.** Two enabled rules
  on `50pick-backups`:

  | Rule | Prefix | Action |
  |---|---|---|
  | `expire-backups-90d` | all objects | Delete objects after 90 days |
  | Default Multipart Abort Rule | all objects | Abort uploads after 7 days |

  Without it every artifact — each a full copy of every balance, phone number, NIDA and KYC
  record on the platform — would accumulate forever, invisibly, because nothing fails.

  ⚠️ **The nightly will still print `RETENTION UNVERIFIED`, and that is correct, not a bug.**
  The workflow's token has Object Read & Write and cannot read bucket *configuration*
  (`GetBucketLifecycleConfiguration` → `AccessDenied`), so the check can only say "I cannot
  confirm" — never "it is fine". No flag was added to declare it verified and silence the
  warning: a switch that turns a real check into a green tick is the exact failure this
  runbook exists to document. To make it go quiet, widen the token to Admin Read & Write and
  update the two GitHub secrets; until then, this table is the record.

  ⚠️ Setting it needed the dashboard. Both `PutBucketLifecycleConfiguration` (S3, Object R/W
  token) and the Cloudflare REST lifecycle endpoint (with the R2 token's `cfat_…` value)
  returned `AccessDenied` / `401`.

- 🔴 **[HISTORICAL — fixed] `R2_BACKUP_BUCKET` DID NOT EXIST, AND THE NIGHTLY REPORTED GREEN.**
  This was the worst defect found so far, because it produced a *reassuring* result.

  On 2026-07-31 a full `workflow_dispatch` run showed **every step ✓**, including "Ship it
  off-box", and the verify step printed `VERIFIED — 79 checks passed`. All of that was true
  except the shipping. A direct check against R2 returned:

  ```
  ❌ cannot list 50pick-backups: NoSuchBucket (404)
  🔴 THE BUCKET DOES NOT EXIST. Nothing has ever been shipped off-box.
  ```

  **Cause: a missing `set -o pipefail`.** The step ran
  `npm run db:backup-upload -- --file "$f" | tee upload.log`, and a bash pipeline exits with
  the status of its **last** command — `tee` — which always succeeds. `bash -e` does not help;
  the pipeline as a whole "succeeded". The upload threw `NoSuchBucket`, exited 1, and the step
  went green. The tell was in the recorded result all along: `"destination":""`.

  ✅ Fixed: the step now sets `set -euo pipefail` **and** fails explicitly if the destination
  comes back empty, because "we have off-box backups" is the one claim that must not be wrong.
  Verified by re-running with the bucket still absent and watching the job go **red**.

  ▶ **Still outstanding, and now the only thing between us and a working nightly:** create the
  bucket. Cloudflare → R2 → **Create bucket** → `50pick-backups`. It must be a *separate*
  bucket from `50pick-kyc` — the running app can reach that one, and a backup should not share
  a blast radius with the documents inside it. The Railway R2 token is bucket-scoped and
  cannot create it (`ListBuckets` → `AccessDenied`).

  Then prove it, rather than trusting a green tick:

  ```
  railway run node scripts/backup-verify-offbox.mjs
  ```

  It lists the bucket, shows each artifact's age and size, and fails if the bucket is missing,
  empty, under 1 MB (a truncated upload — production dumps ~13 MB), or over 30 hours stale.

  **Verified 2026-07-31 — and it cannot be created from here.** The R2 API token in Railway
  is **bucket-scoped**: `ListBuckets` returns `AccessDenied`, and a bucket-scoped token
  cannot `CreateBucket`. Create `50pick-backups` in the Cloudflare dashboard (R2 → Create
  bucket), then confirm with:

  ```
  railway run node scripts/r2-provision-backup-bucket.mjs
  ```

  That script reports what exists, refuses outright if `R2_BACKUP_BUCKET` is pointed at the
  KYC bucket, and takes `--create` if it is ever given a token that can.

  ✅ **THE UNATTENDED NIGHTLY WORKS — run `30615505120`, 2026-07-31 08:13 UTC.** All seven
  repository secrets are set; a `workflow_dispatch` run took a fresh dump of production,
  shipped it off-box, restored it into a throwaway PostgreSQL 18, and recorded health.
  **Verified by looking at the bucket, not at the tick** — it now holds two objects, and the
  second is the workflow's own:

  ```
  2026-07-31T08:13:47Z   13.18 MB   .../50pick-full-2026-07-31T08-13-44-316Z.sql.gz.enc   ← CI
  2026-07-31T08:06:58Z   13.16 MB   .../50pick-full-2026-07-30T15-43-27-112Z.sql.gz.enc   ← manual
  ```

  And `__BACKUP_LAST_RUN__` on production records `verified: true`, 32,750 rows, with a real
  `destination` — the field that was an empty string the last time this "passed".

  🔴 **AND CREATING THE BUCKET IS ONLY HALF — verified 2026-07-31.** The workflow
  authenticates with `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` from the GitHub secrets,
  and those are the **KYC-scoped** key. It cannot write to a bucket it was never granted,
  so the very next nightly would fail on `AccessDenied` — a *different* error, after the
  bucket finally exists, which reads like a new problem rather than the same one.

  So the bucket needs its own token:

  1. Cloudflare → R2 → **Create bucket** → `50pick-backups`
  2. R2 → **API Tokens** → **Create API token** → **Object Read & Write**, scoped to
     **`50pick-backups` only**
  3. GitHub → `alisheib/kipindi` → Settings → Secrets and variables → Actions →
     set `R2_BACKUP_BUCKET`, and **replace** `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
     with the new pair

  This is the security property, not a chore: a key that can reach the backups can delete
  them, and the backups contain every KYC document on the platform. The app keeps a
  KYC-only key; the workflow gets a backups-only key; neither can touch the other's data.

  ⚠️ An **S3 access key cannot create a bucket** — that is an account-level action. Tried
  on the live account (`e6e5f86…`): `CreateBucket` → `AccessDenied`, `ListBuckets` →
  `AccessDenied`. `ops:r2-backup-bucket` now also accepts `CLOUDFLARE_API_TOKEN` and uses
  Cloudflare's REST API, which *can*. A token of the wrong kind is rejected with the reason
  printed (a `cfk_…` value tried on 2026-07-31 returned `401 Invalid API Token`).
- ⚠️ **The drill's `BACKUP_ENCRYPTION_KEY` is on the OTHER machine, not lost** — corrected
  2026-07-31. `.env.backup.local` (gitignored) exists in `F:\kipindi-main` on the
  launch-hardening machine, alongside the sealed drill artifact it opens. The searches that
  reported it missing looked in `C:\kipindi-main` and the `kipindi-night` worktree, which are
  a different machine — so this was two lanes not seeing each other's disk, not a lost key.

  It does not change the advice below, and the advice is still right: the repository secret
  should be a **freshly generated** key rather than that one, because a key that only exists
  on one laptop is not a key. Nothing is stranded either way — the drill artifact is local
  and disposable and nothing has been uploaded off-box. So:
  **generate a fresh 32-byte key at the moment you add the repository secrets, and put it in
  a password manager in the same sitting.** Do not write it to a file intending to move it
  later; that is precisely what did not happen.
- **Only the backup toolchain is typechecked.** `tsconfig.backup.json` covers five files;
  the other ~60 `scripts/*.mts` suites use loose fixture types and are still transpiled
  without checking.

Guarded by `npm run test:backup` — 110 checks, plus a typecheck of the five files that
make up the recovery path. Every negative assertion in it has been broken on purpose and
observed to go red.
