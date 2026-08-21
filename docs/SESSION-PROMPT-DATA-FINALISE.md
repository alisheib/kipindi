# SESSION PROMPT — finish the data work, completely

> **Written 2026-08-21** at the close of the data-handling fixing session, by the session that
> did the work, for the session that finishes it.
>
> ⛔ **READ THESE TWO FIRST, IN THIS ORDER, BEFORE OPENING ANY CODE:**
> 1. [`DATA-AUDIT-2026-08-20.md`](DATA-AUDIT-2026-08-20.md) **§0a** — what shipped, what remains,
>    and **every place the audit itself was wrong**. Several findings were. Do not act on §4
>    without reading its annotations.
> 2. [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § *2026-08-21* — Ali's four answers.
>    They are decided. ⛔ Do not re-raise them.
>
> Then [`DATA-RETENTION.md`](DATA-RETENTION.md) for any period, and this file for the queue.

---

## The one-line brief

Everything in the data audit is closed except **erasure**, **six dead tables**, and a handful of
read-path and hygiene items. This session finishes them. The hard one is first and it is the only
one that can hurt somebody.

---

## 1 · ✅ DONE 2026-08-21 — `anonymizeClosedAccount`

> **Shipped.** `src/lib/server/erasure.ts` · `npm run test:erasure` 155/155 ·
> `npm run red:erasure` 16/16. Wired to the officer's **Fulfil** button on an ERASURE request.
> **The authority is now [`DATA-RETENTION.md`](DATA-RETENTION.md) §2b**; the reasoning is in
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) (2026-08-21, later).
>
> 🔴 **Read this before believing the section below.** The trap it describes is real and it is
> *understated*. Hashing `idNumber` in place does **not** preserve the collision — a unique
> index compares stored strings, so the erased row's hash never meets the next applicant's raw
> number, and the second account is created. Proved by building it that way (`red:erasure` case
> 1). The collision now lives on a new `KycSubmission.idFingerprint` column that BOTH rows write.
>
> Also different from the plan below, deliberately:
> · the identity **images** are held 7 years from closure, not deleted on request — flagged for
>   Ali, one constant (`KYC_DOCUMENT_HOLD_YEARS`);
> · `Comment.body` is redacted and the comment soft-deleted (the open question, decided);
> · **every** KYC submission is erased, not the newest — `findByUserId` returns one row;
> · two surfaces this section does not mention were found by sweeping the store: the referrer's
>   frozen notification mask, and `KycSubmission.extraRequests[].description`.

<details>
<summary>The original work order (kept as written, for the record)</summary>

### 🔴 `anonymizeClosedAccount` — the only item with a trap in it

**Ali's decision is already made** (COMPLIANCE-DECISIONS § 2026-08-21 item 3): the national ID
number is replaced with a **keyed HMAC of itself — never NULL**.

### ⛔ Understand the trap before writing a line

Since the NIDA contract migration, the partial unique index on `(idType, idNumber)` is the
**SOLE** enforcement of one-document-one-account — a P0 AML control. It says so in
`prisma/schema.prisma` at the index itself. **Nulling `idNumber` frees that slot, so one human
could open a second account.** An erasure routine written the obvious way silently repeals an AML
control, and no test in the repo would notice today.

Hashing preserves the collision: the same document still hashes to the same value, so the index
still rejects the second account, while the citizen's number becomes unreadable. Use the same
peppered-HMAC pattern already used for OTP codes and 2FA backup codes (`crypto.ts`).

### What the routine does

| Field | Action | Why |
|---|---|---|
| `email`, `emailVerifiedAt`, `passwordHash`, `passwordSalt`, `displayName`, `dob`, `region`, `avatarDataUrl`, `lastLoginAt` | **NULL** | all confirmed nullable |
| `phoneE164` | **TOMBSTONE** (`erased:<cuid>`) | NOT NULL *and* `@unique`, and the row must survive — `Comment.user` is a required relation with no `onDelete`, so the User row **cannot** be deleted |
| `KycSubmission.idNumber` | **keyed HMAC** | see above |
| `KycSubmission.fullName`, `.dob` | pseudonymise | what `/admin/retention` already tells the Board |
| KYC documents | **delete the R2 objects and the rows** | `deleteKycDocument` was shipped 2026-08-20 for exactly this |
| `role`, `status`, `locale`, `marketingOptIn`, `twoFactorEnabled`, `createdAt`, `updatedAt` | **leave** | NOT NULL |
| `acceptedTermsVersion`, `acceptedTermsAt` | **leave** | nullable but load-bearing: evidence the player accepted terms at a version |
| Money, ledger, positions, audit chain | **NEVER TOUCH** | 7 years, POCA Cap 423 §16 |

### ⚠️ One more thing that makes erasure incomplete, and it is easy to miss

`Comment.authorName` is **NOT NULL** and is written as `maskName(displayName, phoneE164)`. When
`displayName` is absent that returns `+255•••XXX` — **the last three digits of the phone number**,
frozen at write time. So after a `phoneE164` tombstone the public comment still carries a fragment
of the original number. It must be **overwritten**, not nulled. `Comment.body` is also free text a
player wrote and may contain their own name or number; decide and record what happens to it.

### The acceptance suite — write it against the in-memory store

Which also forces the memory half of any new DAL method to exist (`tsc` cannot catch a missing
in-memory twin, and a Prisma-only method throws in every unit test).

1. Close an account, run the routine, assert **every** PII column null or tombstoned.
2. Assert wallet balance, `Transaction`, `LedgerEntry` and `Position` rows are **byte-identical**.
3. `trialBalance()` still ok. `verifyChain()` still valid.
4. 🔴 **Assert the identity tuple STILL COLLIDES for the same document after erasure.** This is
   the assertion the whole item exists for. Drive it red by switching the HMAC to a null.
5. Assert no comment carries a fragment of the erased phone.

</details>

---

## 2 · ✅ DONE 2026-08-21 — The DSAR intake

> **Shipped, both doors.** The player files from `/profile/account`; an officer files on a
> player's behalf from `/admin/privacy`. `fileDsarAction`'s `KNOWN_ORPHAN` entry is gone in the
> same commit as its first caller, and the §2 ratchet confirms it.
> `npm run test:dsar-intake` 36/36 · `npm run red:dsar-intake` 12/12.
>
> Beyond the brief, and worth knowing:
> · **both doors REFUSE ACCESS and PORTABILITY** through one shared narrower — the officer's
>   door used to *default* to ACCESS, filing a 30-day obligation for the one right the export
>   answers instantly;
> · **both cap at one open request per person per kind** — the player's is a public form;
> · ⚠️ the Fulfil dialog was promising the player a notification that nothing sends and that,
>   for an erasure, is impossible — the routine destroys the email and phone you would reply
>   to. It now says to answer the player FIRST.

Ali's answer: **the player files it from `/profile/account`, on their authenticated session**
(already the accepted standard for handing over their whole bundle via "Export my data" — a higher
bar for asking than for receiving would be incoherent). Officers may also file on a player's behalf.

⭐ Note the **ACCESS** right needs no DSAR at all; the export already serves it. The register is
for **erasure and correction**.

⛔ `fileDsarAction` is a declared `KNOWN_ORPHAN` in `scripts/orphan-actions.test.mts`. **Give it a
caller and delete that entry in the SAME commit**, or the §2 ratchet fails with "it now HAS a
caller". (That suite strips comments now — it used to read prose and reported an explanatory
comment as a caller.)

---

## 3 · 🟠 F-05 — the dead schema · **EXPAND DONE 2026-08-21, DDL IS THE NEXT RELEASE**

> **Step 1 of 2 is shipped.** The declarations are out of `prisma/schema.prisma`; **every table
> and column is still in the database.** `npm run test:dead-schema` 34/34 ·
> `npm run red:dead-schema` 7/7.
>
> ⛔ **DO NOT COMMIT THE DDL IN THE SAME RELEASE.** `package.json`'s `start` is
> `prisma migrate deploy && … && next start`, so a migration file committed now runs on the
> **same** deploy that removes the declarations — and the previously-deployed container's
> generated client still names them. That is a 42703 on every read of those tables for the
> length of the rolling deploy. The declarations must be *deployed* first, then the DDL.

### What left the schema

`Device` · `MatchIntegrityCheck` · `AntiFraudFlag` (+ enums `FlagType`, `FlagSeverity`,
`FlagStatus`) · `ProviderHealth` · `KycDocument.ocrText` · `KycDocument.blurScore` ·
`Session.deviceId` / `Session.device` · `User.devices` / `.flags` / `.reviewedFlags`.

**KEPT and annotated as dormant:** `Session` and `Otp`, each with a note at its own definition
saying why. The difference that matters is not emptiness — all six were empty — it is that these
two **have code paths** and the dead four had none. `test:dead-schema` §1.4/1.5 holds both halves,
and `red:dead-schema` case 3 deletes the annotation to prove the note is load-bearing.

### 📏 The evidence, measured read-only on production 2026-08-21

| Table / column | Rows |
|---|---|
| `Device`, `MatchIntegrityCheck`, `AntiFraudFlag`, `ProviderHealth` | **0** each |
| `KycDocument.ocrText`, `.blurScore` | **0 non-null** across 67 rows |
| `Session.deviceId` | **0 non-null** |
| `Session`, `Otp` (kept) | **0** each — dormant, as documented |

⛔ **Re-measure before running the DDL.** A grep found no code that can write to any of them, so
nothing should have changed — but the whole point of this document is not asserting things nobody
checked.

### The DDL, ready for the release AFTER this one

⛔ Not committed. Paste into `prisma/migrations/<next>_f05_drop_dead_schema/migration.sql` in the
release after the schema change has deployed, with the reasoning above it, and hand-apply on
production first (`IF EXISTS` makes the file a no-op afterwards).

```sql
-- Indexes explicitly and BEFORE their tables/columns: DROP TABLE cascades, so naming them
-- puts them in the audit trail of what this migration removed instead of letting them vanish.
DROP INDEX IF EXISTS "Device_fingerprint_idx";
DROP INDEX IF EXISTS "Device_userId_fingerprint_key";
DROP INDEX IF EXISTS "AntiFraudFlag_userId_status_idx";
DROP INDEX IF EXISTS "AntiFraudFlag_type_severity_status_idx";
DROP INDEX IF EXISTS "MatchIntegrityCheck_matchId_createdAt_idx";
DROP INDEX IF EXISTS "ProviderHealth_provider_bucketStart_idx";
DROP INDEX IF EXISTS "ProviderHealth_provider_bucketStart_key";

-- Session.deviceId FIRST: it holds the FK into Device, so Device cannot go while it exists.
ALTER TABLE "Session"     DROP COLUMN IF EXISTS "deviceId";
ALTER TABLE "KycDocument" DROP COLUMN IF EXISTS "ocrText";
ALTER TABLE "KycDocument" DROP COLUMN IF EXISTS "blurScore";

DROP TABLE IF EXISTS "AntiFraudFlag";
DROP TABLE IF EXISTS "MatchIntegrityCheck";
DROP TABLE IF EXISTS "ProviderHealth";
DROP TABLE IF EXISTS "Device";

-- The enums only AntiFraudFlag used. AFTER the table, or Postgres refuses the type as in use.
DROP TYPE IF EXISTS "FlagStatus";
DROP TYPE IF EXISTS "FlagSeverity";
DROP TYPE IF EXISTS "FlagType";
```

⛔ **No `CONCURRENTLY` anywhere** — `migrate deploy` wraps a migration in a transaction and
CONCURRENTLY fails 25001 inside one, taking the boot with it. `test:dead-schema` §3 reads any
migration that drops one of these names and holds it to that rule plus IF EXISTS plus
index-before-column ordering, so the file above cannot be committed in a broken shape.
`prisma/migrations/20260821090000_kyc_drop_nida_legacy` is the worked example for the prose.

⚠️ **The backup stops covering these tables the moment the declaration goes**, because
`tableOrder()` is driven by `Prisma.dmmf`. They hold zero rows, so nothing is lost — but that is
the reason the row counts above were measured before the declarations were removed and not after.

---

## 4 · ✅ DONE 2026-08-21 — F-09, AIPoll payloads

> **Shipped.** `rawResponse` + `generation` blanked after 30 days by `retention.purge.daily`.
> `npm run test:retention` 34/34 · `npm run red:retention` 9/9.
> ⛔ **No row is deleted** — an `AIPoll` row is the decision record for every AI market ever
> published. `rawResponse` keeps a tombstone SENTENCE, not a NULL, so a reviewer can tell
> *pruned* from *never existed*. Measured: 494 of 621 rows are already past 30 days and carry
> **4.41 MB of an 8.43 MB table**.
>
> ⚠️ **The field list below is wrong about `trace`** — there is no such column on `AIPoll`.
> `trace` is on `MarketCandidate` and is a decision trail, not a payload. Not pruned.
>
> 🔴 **AND THE SNAPSHOT NOTE BELOW IS WRONG TWICE.** Measured on production 2026-08-21:
> there is no 1-in-50 *sampling* (`PRUNE_EVERY` is how often an append also runs a prune —
> **every** snapshot is written), and shortening the FIFO depth would evict **nothing**
> (`MAX_POINTS` is 800; the deepest market in the whole database holds **30**). The driver is
> the number of ROUNDS: 13,245 UPDOWN markets × ~1 row each, 97.6% of the table.
> ⭐ And a market with ONE snapshot cannot draw a sparkline — one point is not a line — so those
> rows are kept for a garnish they cannot render. The honest options and the numbers are in
> [`DATA-RETENTION.md`](DATA-RETENTION.md) §2c. **Ali's call; not changed here.**

<details>
<summary>The original work order (kept as written, for the record)</summary>

### F-09 — AIPoll payloads only

Null `rawResponse` / `trace` / `generation` after 30 days, keeping the decision fields. Copy the
opportunistic prune pattern in `ai-usage.ts`. **494 of 621 polls are already older than 30 days.**

⛔ **DO NOT do the snapshot skip.** It is settled, not deferred: `/results` reads the terminal set
at `productLine: "ALL"`, so UPDOWN market ids reach `results/page.tsx:224` → `getCardCharts` →
rendered as `spark={…}` at `:466`. Skipping the write would strip the sparkline from every Up &
Down card on the archive. Every other call site was checked and is clean — the list is in the
audit doc so nobody re-checks them.

⚠️ The cost the finding was reaching for is real and still unanswered: **13,463 of 13,797 snapshot
rows are on UPDOWN markets** — 97.6% of the table — for a garnish. Reducing the 1-in-50 sampling
for UPDOWN, or shortening its FIFO depth, keeps the sparkline and cuts the volume. That is the
real fix.

</details>

---

## 5 · 🟠 Read paths and hygiene — **THREE DONE, TWO LEFT, AND ONE ITEM'S PREMISE WAS WRONG**

> **Measured on production 2026-08-21 before touching anything, because the numbers changed
> what the work was.**
>
> | Item | State | What the measurement said |
> |---|---|---|
> | `/results` is still slow | ✅ **re-scoped and improved** | 🔴 **"~3.7 s" does not reproduce.** 21 samples from the public internet: **warm 0.65–1.28 s, cold 1.29–2.42 s**, against `/api/health` on the same host at **1.30–1.44 s**. And `?cat=…&sort=volume` and `?q=<no match>` — which force the whole filter and sort — came in at **0.67–1.01 s, inside the noise of the plain page.** So the JS filtering of 13,013 rows is **not** the cost, and paginating it (the proposed fix) would have bought nothing while making every count on the page a lie. The cost is the **cold hydration**, so `TERMINAL_TTL_MS` went 60 s → **5 min**: at 60 s a low-traffic archive expires between visits, so every real visitor was paying the cold path. Bounded above by the 24-hour objection window, asserted in `test:product-line` §C, both directions driven red. |
> | F-11b SystemConfig phone-in-key | ✅ **done** | 2 rows, not 3 — the third grep hit (`chat.daily.usr_f5edd2a2255997a262…`) was a **false positive of my own pattern**: "255" inside a cuid. `bootstrap.login_promoted:` is now keyed on `user.id`, still reads the legacy key, and **deletes** it once carried over. ⛔ A new key with no fallback would have re-promoted a demoted admin on their next login — the exact hole that record exists to close. `deleteConfig` was added for it; `test:erasure` §11.11b–g, three defects driven red. |
> | F-11c `avatarDataUrl` | ✅ **done for `db.user.list()`** | **1 of 100 users has an avatar, 39 kB.** So this is shape, not cost — but the column caps at 96 kB and `list()` has 19 callers including 6 admin pages, so 10,000 users at a third adoption is ~320 MB per render. Now `omit`-ed (a `select` allowlist would silently drop the next column added to `User`). ⚠️ A row read that way reports `avatarDataUrl: null`, indistinguishable from "no avatar" — `test:erasure` §11.14 enumerates every reader in `src/` and fails the build if a list path ever reads it. **The `app-shell` read is untouched and still `findById`** — it RENDERS the avatar, so the "select-exclude it there" half of the finding was wrong; the real fix there is a cacheable route, and that is still open. |
> | F-11e `/wallet` 1,000 txns | 🟠 **open** | The cap is 1,000 and **the busiest account on the platform holds 485** (2,028 rows total, 46 average). Shape only, today. |
> | F-07 remaining report paths | 🟠 **open** | `insights.ts`, `reports/catalogue.ts`, `analytics.ts`, `responsible-gambling.ts`, `kyc-service.ts`, `affiliate-service.ts` and 6 admin pages all call `db.user.list()`. The avatars are out of it now, which was the part that scaled worst; the unbounded row count is not. Bounded at 100 users. |

<details>
<summary>The original work order (kept as written, for the record)</summary>

### Read paths and hygiene

| Item | Note |
|---|---|
| **`/results` is still slow** | The memo removed the *database* scans (10 requests → **0** seq scans, measured) but not the latency: ~3.7 s either way, because the cost is JS filtering, sorting and counting 13,013 rows per render. Paginate the filtering, or move the category counts to SQL aggregates. Separate finding from the one that was closed. |
| **F-07 report paths** | `insights.ts`, `reports/catalogue.ts`, `analytics.ts`, `responsible-gambling.ts`, and the admin user lists via `db.user.list()`. Bounded today (100 users) — fix the *shape*, and follow `leaderboard()` / `settledTotalsByUser()`. |
| **F-11c `avatarDataUrl`** | On the hottest row: `app-shell.tsx` drags it every page render, and `db.user.list()` drags every avatar into 6 admin pages. `select`-exclude, or serve via a cacheable route. |
| **F-11e `/wallet`** | Pulls 1,000 txns per render. Paginate. |
| **F-11b SystemConfig** | Phone numbers inside key *names* (`bootstrap.login_promoted:+255…`), per-user `chat.daily.usr_*`. Migrate to hashed / user-id keys next time each module is touched. |

---

</details>

---

## 6 · Loose ends worth ten minutes each

> **State after 2026-08-21:**
>
> | Item | State |
> |---|---|
> | `prisma:error` fires for a healthy control | ✅ **DONE.** `observationStore.ensure` was a `create` in a try/catch — correct, but Prisma logged the unique violation at `error` level **before the catch could see it**, on a money product, many times a day. It is an `upsert` now: the losing racer takes the existing row with no exception and no log line. ⛔⛔ Its `update: {}` **must stay empty** — on conflict that row may already be CONFIRMED and holding the price that settled real money, which is what `confirm`'s `state: "PENDING"` guard exists to prevent. `test:updown-config` §6.2b–e, both defects driven red. |
> | `PHONE_EMAIL_MAP` still set in production | 🟠 **open.** Step 5 of `LAUNCH-GO-NO-GO.md` §5. Untouched — the warning in the item below is right: `resolvePhoneEmail` is consulted when `user.email` is absent, so removing it blind turns a live persona's mail into a silent no-address send. |
> | The live KYC read drive | 🟠 **open.** Needs current QA credentials; personas are stale. `verify:kyc-storage` (202 assertions) stands in. |
> | Redis SSE fan-out unverified | 🟠 **open.** Rate limiting is proven cross-container (`qa:redis-armed` 8/8); the pub/sub half is not driven. |
> | Two inert controls | 🟠 **open**, recorded in `COMPLIANCE-DECISIONS.md` and outside this audit. |

<details>
<summary>The original list (kept as written, for the record)</summary>

- **`PHONE_EMAIL_MAP` is still set in production.** Now step 5 of
  [`LAUNCH-GO-NO-GO.md`](LAUNCH-GO-NO-GO.md) §5. ⚠️ Read every use before removing —
  `resolvePhoneEmail` is consulted when `user.email` is absent, so removing it blind turns a live
  persona's mail into a silent no-address send.
- **The live KYC read drive has never been run.** `npm run qa:kyc-r2-read` needs current QA
  credentials; the personas are stale again. `scripts/ops-remint-qa-passwords.mts` is the tool.
  The 202-assertion `verify:kyc-storage` stands in for it meanwhile.
- **Redis SSE fan-out is unverified.** Rate limiting is proven cross-container
  (`npm run qa:redis-armed`, 8/8). The pub/sub half — a `wallet:balance` emitted on container A
  reaching a client whose EventSource landed on container B — has not been driven.
- **`prisma:error` fires for a healthy control.** The write-once observation race
  (`@@unique([assetId, boundaryAt])`) is caught and handled correctly, but Prisma logs it at
  *error* level before the catch, which teaches an operator to ignore `prisma:error`. Pre-check or
  quiet that one violation.
- **Two inert controls**, recorded in COMPLIANCE-DECISIONS and outside this audit: the shared-IP
  affiliate check reads a global nothing populates and is permanently `false`; the
  `SESSION_OVERRUN` responsible-gambling detector has no caller supplying its input.

---

</details>

---

## How this session should work

The recurring theme of the last one, and worth repeating because it cost real time:

- **Measure before believing a finding, including your own.** F-08's premise was wrong; I repeated
  it before checking, and my own `/results` and Redis-health claims each needed narrowing after a
  live measurement. Two of the three most valuable things found were things the audit asserted
  were fine.
- **A guard that cannot go red is not a guard.** Drive every new assertion red on purpose. Two
  unfalsifiable assertions were found *inside existing suites* last session, and I wrote a third
  by accident and caught it reading the output back.
- **Ask for a control by what it IS.** "0 rows returned" and "the query is broken" look identical.
  The ledger-rescue dead end was only provable because a control showed the join works elsewhere.
- **Docs move in the same commit as the code.** They are Ali's only view.

**Verification bar:** `npx tsc --noEmit` clean and
`node scripts/test-all.mjs --no-tsc --skip responsive,motion` at **226/226** before any push, and
a live check on production after. Push to `main` is a production deploy — Ali asks for it
explicitly; the auto-mode classifier blocks it otherwise.
