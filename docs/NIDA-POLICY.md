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

## ⚠️ Known gap in the uniqueness control (not yet closed)

The duplicate check is **application-level read-then-write with no lock**:
`findActiveByNida` runs, and only then is the row written. Two *different* users
submitting the **same** NIDA at the same instant can both pass — `kyc-service` takes
`kyc:${userId}`, which serialises one user against themselves, not two users against
each other. The schema has `@@index([nidaNumber])`, **not** a unique constraint.

Closing it is a one-line migration, but it must not be applied blind — if production
already holds a duplicate, the index creation fails and the deploy stops:

```sql
-- Check FIRST (must return zero rows):
SELECT "nidaNumber", count(*) FROM "Kyc"
 WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED'
 GROUP BY "nidaNumber" HAVING count(*) > 1;

-- Then, and only then:
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Kyc_nidaNumber_active_key"
    ON "Kyc" ("nidaNumber") WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED';
```

Until that index exists, uniqueness holds under normal use and can be defeated only
by a deliberately-timed concurrent submission.

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
