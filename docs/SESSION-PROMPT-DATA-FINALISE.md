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

## 3 · F-05 — the dead schema

Zero rows **and** zero code references: `Device` (+`pushToken`), `MatchIntegrityCheck`,
`AntiFraudFlag`, `ProviderHealth`, `KycDocument.ocrText`, `KycDocument.blurScore`.
F-04 chose option (a), so **`Device` may go** — fingerprinting is not implemented and not planned.

**KEEP, and comment as dormant:** `Session` and `Otp`. Their code paths exist and OTP may activate
when SMS is wired.

⛔ **Expand → contract across TWO releases, schema-first then DDL.**
`prisma/migrations/20260821090000_kyc_drop_nida_legacy` is the worked example, and there is now a
guard that reads contract migrations — a DROP must satisfy it. Apply from the machine **before**
pushing: `prisma migrate deploy` runs before `next start`, so a failing migration is a
platform-wide sign-in outage.

---

## 4 · F-09 — AIPoll payloads only

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

---

## 5 · Read paths and hygiene

| Item | Note |
|---|---|
| **`/results` is still slow** | The memo removed the *database* scans (10 requests → **0** seq scans, measured) but not the latency: ~3.7 s either way, because the cost is JS filtering, sorting and counting 13,013 rows per render. Paginate the filtering, or move the category counts to SQL aggregates. Separate finding from the one that was closed. |
| **F-07 report paths** | `insights.ts`, `reports/catalogue.ts`, `analytics.ts`, `responsible-gambling.ts`, and the admin user lists via `db.user.list()`. Bounded today (100 users) — fix the *shape*, and follow `leaderboard()` / `settledTotalsByUser()`. |
| **F-11c `avatarDataUrl`** | On the hottest row: `app-shell.tsx` drags it every page render, and `db.user.list()` drags every avatar into 6 admin pages. `select`-exclude, or serve via a cacheable route. |
| **F-11e `/wallet`** | Pulls 1,000 txns per render. Paginate. |
| **F-11b SystemConfig** | Phone numbers inside key *names* (`bootstrap.login_promoted:+255…`), per-user `chat.daily.usr_*`. Migrate to hashed / user-id keys next time each module is touched. |

---

## 6 · Loose ends worth ten minutes each

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
