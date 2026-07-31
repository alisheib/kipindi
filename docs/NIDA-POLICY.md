# NIDA policy — what we actually check, and what we tell people

**Owner decision, Ali, 2026-07-19.** This is the authoritative statement. If any
surface, doc or comment contradicts it, that surface is wrong.

## The policy

> We care that a NIDA number is **the right format** and **unique — one NIDA, one
> account**. That is the whole control. There is **no authority check**, and none is
> required.

Identity assurance comes from the **documents** (NIDA front, NIDA back, selfie)
reviewed by a human compliance officer, not from a government API.

## What the code actually does

| Control | Where | Status |
|---|---|---|
| Format check (20-digit numeric) | `KycNidaSchema`, `src/lib/server/kyc-service.ts` | ✅ enforced |
| **Uniqueness — one NIDA, one account** | `db.kyc.findActiveByNida(nida, userId)` → `kyc-service.ts:116`; a REJECTED submission frees the number | ✅ enforced, audited as `kyc.nida.duplicate_blocked` |
| Authority (NIDA API) check | `src/lib/server/nida.ts` | ❌ **deliberately absent.** That file is a deterministic mock; no request has ever reached the National Identification Authority. `nidaVerifiedAt` therefore means "format accepted", NOT "government confirmed". |
| Document review by a human | `/admin/kyc/[id]` | ✅ this is the real identity control |

## ✅ The uniqueness gap — PROVEN, then CLOSED (2026-07-31)

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
*entire* control — so this defeated the identity policy by timing alone.

**Closed by a PARTIAL unique index** (partial because a REJECTED submission
deliberately frees the number):

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "KycSubmission_nidaNumber_active_key"
    ON "KycSubmission" ("nidaNumber")
    WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED';
```

⚠️ **The table is `KycSubmission`.** An earlier revision of this document said `"Kyc"`,
which is the *app-layer* name (`db.kyc.*`); no table called `Kyc` has ever existed, so
that SQL would have failed on its first line. Check for duplicates first — index
creation fails if any exist (production: **16 active NIDA rows, 0 duplicates**,
verified 2026-07-31):

```sql
SELECT "nidaNumber", count(*) FROM "KycSubmission"
 WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED'
 GROUP BY "nidaNumber" HAVING count(*) > 1;
```

The index is the **enforcement**; the read-check remains the fast path. The losing
writer is caught by `isNidaUniqueViolation()` in `kyc-service.ts` and gets the same
refusal and the same `kyc.nida.duplicate_blocked` audit row as an ordinary duplicate,
so a race is indistinguishable from a sequential duplicate to the player and to AML.
Re-running the proof after the index: **worker B refused, 1 holder. PASS.**

Guarded by `npm run test:cert-d1`, which fails if the migration, the index name or
the violation handler is removed.

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
- **Admin surfaces state the truth plainly**, because an officer is making a money
  decision on it. Fixed 2026-07-19: the KYC review checklist read
  **"NIDA verified — government match"** whenever `nidaVerifiedAt` was set. That told
  a compliance officer a government had confirmed the identity, and would have
  invited them to release a withdrawal on evidence that does not exist. It now reads
  *"NIDA number — format valid · unique to this account (no authority check by
  design)"*.

## If a real NIDA integration is ever added

Replace the mock in `nida.ts`, and only then may any surface use the word
*verified* in the government sense. Update this document in the same commit.
