# Identity policy — what we actually check, and what we tell people

**Owner decision, Ali, 2026-07-19, widened 2026-08-19.** This is the authoritative
statement. If any surface, doc or comment contradicts it, that surface is wrong.

> ⚠️ **This file was `NIDA-POLICY.md` until 2026-08-20.** It was renamed because it
> stopped being about one document: a player now proves identity with **any ONE of
> four**. The rename is not cosmetic — a file called `NIDA-POLICY.md` is the document a
> future session reaches for when it wants to know what happens to a *passport*, and
> finds nothing.

## The policy

> We care that an identity document's number is **the right shape for that document**
> and **unique — one document, one account**. That is the whole machine-side control.
> There is **no authority check**, for any of the four, and none is required.

Identity assurance comes from the **documents** (the identity document's image, plus a
selfie) reviewed by a human compliance officer, not from a government API.

## The four documents — owner decision, Ali 2026-08-19

*"We have to give options for KYC, not just NIDA. One of them: mandatory NIDA, or
passport number and attach passport front page, or driving licence number and attach
driving licence front, or voting card and attach it. One of them works for us, not just
NIDA."*

| Document | Number rule | Source | Images required | Expires |
|---|---|---|---|---|
| **NIDA** | exactly 20 digits, first 8 a real `YYYYMMDD` date | 🟢 **Published** — example `19950101-12345-67890-12` decomposes 8-5-5-2 | NIDA front · NIDA back · selfie | no |
| **Passport** | 9 alphanumeric, letters leading — **advisory, never a refusal** | 🟡 **Secondary sources only.** EAC/ICAO booklet issued since Jan 2018; no TRA/Immigration spec found | bio page · selfie | **yes** |
| **Driving licence** | none — a sanity band only (4–20 alphanumeric) | 🔴 **Not published.** TRA's own guide describes the card and not the number | licence front · selfie | **yes** |
| **Voter's card** | none — a sanity band only (4–20 alphanumeric) | 🔴 **Not published.** NEC/INEC confirm a number exists; its format is not published | card image · selfie | no |

⛔ **THE TWO OPEN FIELDS ARE INSTRUCTED, NOT LAZY.** Ali, 2026-08-19: *"for now driving
and voting, keep them open — later we change."* A wrong regex on a national ID locks a
real citizen out of their own money, and a format-rejected submission never reaches the
human who is the actual control. A later session does **not** get to tighten either on a
guess. Adding a real rule is a one-line change to that document's entry in
`src/lib/id-documents.ts`, **with its citation beside it**.

⭐ **THE SELFIE SURVIVES ON ALL FOUR ON PURPOSE.** *"Selfie matches the ID photo"* is one
of the officer's four attestations (`src/lib/kyc-attestations.ts`). Dropping it for three
of the types would have removed the human control in the same change that widened the
document list — which is exactly what this policy forbids.

## What the code actually does

| Control | Where | Status |
|---|---|---|
| Format check, per document | `validateIdNumber` in [`src/lib/id-documents.ts`](../src/lib/id-documents.ts) — ONE catalogue, one entry per type | ✅ enforced |
| **Uniqueness — one document, one account** | `db.kyc.findActiveByIdNumber(type, number, userId)` is the fast path; the **partial unique index** is the enforcement. A REJECTED submission frees the number | ✅ enforced, audited as `kyc.id.duplicate_blocked` |
| Age ≥ 18 | `validators.dateOfBirth` at parse time **and** `kyc-service` above the per-document branch — both on the DECLARED date of birth | ✅ enforced for **all four**; see the note below |
| Expiry | captured and refused at submit **and** re-checked at submit-for-review, for the two documents that carry one | ✅ enforced |
| Authority check (NIDA API, or any other) | `src/lib/server/nida.ts` | ❌ **deliberately absent.** That file is a deterministic mock; no request has ever reached the National Identification Authority, and there is no equivalent endpoint for a passport, a licence or a voter's card. `idVerifiedAt` therefore means "format accepted", NOT "government confirmed". |
| Document review by a human | `/admin/kyc/[id]` | ✅ this is the real identity control |

### ⚠️ The age gate belongs to the PLAYER, not to the NIDA number

Only a NIDA carries a date of birth inside its number. An UNDERAGE check derived from
the **number** would therefore be silently NIDA-only — a control that passes for the
other three *because the feature is absent*. So the gate is on the **declared** date of
birth, above the per-document branch, and `test:id-documents` §6 asserts it per type on
four separate accounts, each beside an adult acceptance.

The NIDA number's embedded date is used for two things and no others: it must be a real
calendar date (so `19993101…` and 30 February are refused), and where it **disagrees**
with the declared date of birth the officer is shown both. ⛔ The disagreement is a
reviewer flag, never a refusal — a declared date can be a sign-up typo, and refusing
would lock a real citizen out over one.

## ✅ The uniqueness gap — PROVEN, then CLOSED (2026-07-31), then WIDENED (2026-08-20)

The duplicate check was **application-level read-then-write with no lock**:
`findActiveByNida` ran, and only then was the row written. `withLock` guards
`reviewKyc`/`forceReverifyKyc` but not this path, and it is keyed `kyc:${userId}` —
which serialises one user against themselves, never two users against each other.

**This was not left as a theory.** `npm run load:nida-race` spawns two OS processes
(each its own `PrismaClient` + pool = a Railway container) submitting the *same*
national ID for two *different* users, aligned to one wall-clock instant:

```
worker A: {"accepted":true,"verified":true}
worker B: {"accepted":true,"verified":true}
active submissions holding this NIDA : 2   (must be exactly 1)
```

Two accounts, one national ID. Since there is no authority check, uniqueness is the
*entire* machine-side control — so this defeated the identity policy by timing alone.

**Closed by a PARTIAL unique index** (partial because a REJECTED submission
deliberately frees the number):

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "KycSubmission_nidaNumber_active_key"
    ON "KycSubmission" ("nidaNumber")
    WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED';
```

🔴 **AND FROM 2026-08-20 IT SPANS ALL FOUR DOCUMENTS.** The 2026-07-31 index knew only
about NIDA. Adding three more per-document number columns would have handed one human
four accounts **and** a route *around* a rejection: somebody blocked as
`DUPLICATE_IDENTITY` on their NIDA simply re-registers with their passport. So the number
moved into ONE tuple and the index spans the pair, with the **same** `WHERE` semantics:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "KycSubmission_idType_idNumber_active_key"
    ON "KycSubmission" ("idType", "idNumber")
    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED';
```

⚠️ **The table is `KycSubmission`.** An earlier revision of this document said `"Kyc"`,
which is the *app-layer* name (`db.kyc.*`); no table called `Kyc` has ever existed, so
that SQL would have failed on its first line. Check for duplicates first — index
creation fails if any exist:

```sql
SELECT "idType", "idNumber", count(*) FROM "KycSubmission"
 WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'
 GROUP BY 1, 2 HAVING count(*) > 1;
```

A clean result is expected and is not luck: the 2026-08-20 migration backfills
`idNumber` from a column that has carried its own partial unique index, with the same
`WHERE`, since 2026-07-31 (production: **16 active NIDA rows, 0 duplicates**, verified
2026-07-31).

The index is the **enforcement**; the read-check remains the fast path. The losing
writer is caught by `isIdUniqueViolation()` in `kyc-service.ts` and gets the same
refusal and the same `kyc.id.duplicate_blocked` audit row as an ordinary duplicate,
so a race is indistinguishable from a sequential duplicate to the player and to AML.
Re-running the proof after the index: **worker B refused, 1 holder. PASS.**

Guarded by `npm run test:cert-d1` (the migrations, both index names, and the violation
handler) and `npm run test:id-documents` (the rule itself, for each of the four types,
each beside a positive control). Proved red by `npm run red:id-documents`.

### ⚠️ `nidaNumber` is DEPRECATED, and its removal is a filed step

`nidaNumber` / `nidaVerifiedAt` survive one release as a rolling-deploy mirror: Railway
health-checks a new deployment while the OLD container is still serving, and Prisma
selects every scalar column, so dropping them in the expand migration would 500 every
KYC read on `/profile/kyc`, `/wallet/withdraw` and `/admin/kyc` for the length of the
switch — on an identity path. They are written by exactly ONE site (and only for a
NIDA), read by nothing, and `test:id-documents` §9 fails if anything reads one. The
contract migration that drops them is recorded in
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) (2026-08-20).

## 🔴 THE RESIDUAL GAP — stated, not closed

**One human legitimately holds a NIDA *and* a passport *and* a licence *and* a voter's
card.** Uniqueness per `(type, number)` stops **the same document** being used twice. It
does **not** stop one person opening two accounts on two *different* documents.

⛔ **Nothing in the codebase can close that**, and it is not an oversight — it is the
direct, accepted consequence of the owner's instruction to accept any one of four. Only
NIDA-as-mandatory (the thing this change removes) or a cross-document identity match
against an authority we do not query could close it. It is stated in writing to the
Board in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), dated 2026-08-20.

What still bites, and is worth knowing:

- The **human reviewer** sees the name, the date of birth, the document image and the
  selfie. A second account by the same person on a different document is the case the
  officer is positioned to catch, and it is the only place it can be caught.
- A `DUPLICATE_IDENTITY` rejection on one document therefore **does not** block that
  person from submitting a different one. Do not describe it as if it does.

## What we say to people — INTERNAL vs PLAYER-FACING

**Ali's instruction: the mechanics are an internal matter. Documentation and admin
surfaces state them plainly; player surfaces say nothing about them either way.**

- **Player surfaces must never CLAIM a check we don't do.** Fixed 2026-07-19:
  `securedBody` said *"Withdrawals are released only to a NIDA-verified account"*.
  It now says withdrawals are released after our compliance team has reviewed your
  ID documents — true, and it narrates no internals.
- **Player surfaces must also not ADVERTISE the absence.** We do not tell players
  "we don't check with NIDA". They are told what they must provide and what happens
  next. Nothing more. (This is the standing "player surfaces never narrate internal
  ops" rule.)
- ⛔ **And a player surface must never name one document as though it were the only
  one.** Added 2026-08-20. The chooser, the progress rail, the upload slots and the
  refusal copy all resolve from the document the player actually picked — a passport
  journey that says "NIDA" anywhere is telling somebody the wrong thing about their
  own application.
- **Admin surfaces state the truth plainly**, because an officer is making a money
  decision on it. Fixed 2026-07-19: the KYC review checklist read
  **"NIDA verified — government match"** whenever `nidaVerifiedAt` was set. That told
  a compliance officer a government had confirmed the identity, and would have
  invited them to release a withdrawal on evidence that does not exist. It now reads
  *"<document> number — format valid · unique to this account (no authority check by
  design)"*, and **where no format is published it says so in those words**, so the
  weight of the decision sits visibly on the document image.

## If a real integration is ever added

Replace the mock in `nida.ts`, and only then may any surface use the word *verified* in
the government sense — and only for NIDA, which is the only one of the four with an
authority to ask. Update this document in the same commit.
