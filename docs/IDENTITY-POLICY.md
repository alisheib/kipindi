# Identity policy — what we actually check, and what we tell people

**Owner decision, Ali, 2026-07-19, widened 2026-08-19; players verify with TYPED details since 2026-10-10.** This is
the authoritative statement. If any surface, doc or comment contradicts it, that surface is wrong.

> ⚠️ **This file was `NIDA-POLICY.md` until 2026-08-20.** It was renamed because it
> stopped being about one document: a player now proves identity with **any ONE of
> four**. The rename is not cosmetic — a file called `NIDA-POLICY.md` is the document a
> future session reaches for when it wants to know what happens to a *passport*, and
> finds nothing.

## ⭐ How identity is verified — TYPED details for players, photos for agents (owner ruling, 2026-10-10)

The Gaming Board asked, relayed by Ali on 2026-10-10, that players no longer upload identity documents. Ali ruled:
players upload nothing at any step and are **approved at once** when the automatic checks pass; officers act
**afterwards**; an officer may ask a player only to **correct** their typed details; **agents keep everything as
before** (document photos and a selfie, reviewed by an officer). The record — the rulings, what each costs, and what
did not change — is [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § "2026-10-10 · Players verify identity with
typed details and are approved at once; agents keep photo identity — Privacy v2026-10-10, Terms v2026-10-10, AML
v2026-10-10 (Gaming Board request, relayed by the owner)". The Board letter is
[`BOARD-DISCLOSURE-KYC-TYPED-ONLY.md`](BOARD-DISCLOSURE-KYC-TYPED-ONLY.md) (a draft for Ali to send).

**Two tracks, one service** (`src/lib/server/kyc-service.ts`):

| Track | Who | What they give | Who decides, and when |
|---|---|---|---|
| **Typed** | every player | one document's type, number, expiry (passport and licence) and the full name as printed; the date of birth is the ACCOUNT's (`User.dob`), typed only by an account with none | `verifyIdentity` — ONE press. The automatic checks (`decideKyc`, `src/lib/kyc-auto-checks.ts`) approve it at once, or route it to an officer. An officer checks every automatic approval afterwards |
| **Agent** | agent applicants only | the same details, then the document's photos and a selfie (`requiredSlots` in `src/lib/id-documents.ts`) | `submitIdentityStep` → `attachDocument` → `submitForReview` → an officer approves on the photos, which stamps `photoVerifiedAt` — the agent programme's identity gate (`photoIdentityVerified`, `src/lib/server/agent-identity.ts`), which counts the stamp only over the photos it approved: the full set on file, each uploaded no later than the stamp (`photoSetStampedBy`) |

`/profile/kyc` draws the agent track when the link says `?for=agent` (the `/agent` button), when the account holds an
agent application or a live invitation bound to its email (`agentIdentityIntent`), or when a photo case is with an
officer or sent back for corrections. Everyone else gets the typed form.

**Each automatic check answers block, route or flag** — and nothing else:

- **Block** (never approved by anyone, and refused before the decision runs): the account's date of birth says under
  18 (a FINAL refusal, the wallet frozen first — a date typed by an account with none is refused as a form error and
  audited `kyc.identity.underage_attempt`, and routes the next press); an expired passport or licence. Every officer
  approval and Mark checked asks the blocks again on the server.
- **Route** — the identity goes to an officer (PENDING_REVIEW, audited `kyc.routed` with its reasons), never refused:
  the NIDA number's birth digits say under 18 (the officers' bell says urgent) · the player typed an under-18 date of
  birth earlier (`UNDERAGE_ATTEMPT`, urgent too) · an officer has already ruled on this
  identity (`reviewerId` on the row — carried through the player's restart — or corrections asked; and the DURABLE
  audit trail, so a row the pre-2026-10-10 build restarted with no reviewer still counts: an officer's refusal-type act —
  `kyc.rejected`, `kyc.more_info_requested`, `kyc.force_reverify`, `kyc.corrections_asked`, `kyc.refusal_reopened`,
  `kyc.dob_corrected` — with no officer approval after it) · risk score ≥ 70 (`KYC_MAKER_CHECKER_THRESHOLD`, the
  two-officer rule) · an OFFICER or IDENTITY_REFUSED wallet hold · a rejected source-of-funds declaration · an open AML
  escalation (a filtered durable read of `kyc.escalated_to_aml` since the last decision) · a possible same person (same
  normalised name and date of birth) on an account that is self-excluded, cooled off, suspended, closed, frozen or
  finally refused · the agent photo track. ⛔ **Every one of these reads fails closed**: a failed read refuses the press
  with "try again", and a truncated trail routes the identity to an officer — a fact we could not read is never "nothing
  to see".
- **Flag** — approved, and shown first on the officers' post-check list: the NIDA birth date differs from the account's
  (both adult) · a passport outside the usual shape · a licence or voter's card (no published format) · any other
  possible same person. ⛔ **A flag never blocks an officer.**

⛔ **The automatic path never lifts a wallet hold** — a hold routes the identity instead; only an officer's decision
(an approval, a request for corrections, a recoverable rejection) lifts a stale identity hold — and on an automatic
approval no officer has checked, only an officer's APPROVAL does. That is why re-opening a final refusal of such an
approval KEEPS the identity hold (`holdKept` on the audit row): its `approvedAt` would otherwise reopen withdrawals on an
identity no officer accepted, so the next press routes to an officer and that officer's approval lifts the hold.

**Officers act on ONE door, the identity workstation `/admin/kyc/[id]`** (the player page's one-click decisions were
deleted the same day). Every form posts the row version it showed — `updatedAt` plus a keyed digest of the identity
(`kycRowVersion`): Approve, a two-officer recommendation and Mark checked need the row exactly as shown; a rejection,
corrections and a date-of-birth correction need only the identity unchanged, so a player attaching photos cannot void
an officer's refusal. The actions: Approve (two officers at risk ≥ 70, the recommendation bound to the version; on
the workstation with the attestation set it is also the post-check of an automatic approval — an approval through the
agent programme's `approveAgent` is not) · **Mark checked** on an automatic approval · **Ask for corrections** (a note;
never an extra document) · a recoverable rejection · a final refusal (also on an approved identity; it freezes the
wallet itself) · Escalate to AML · a date-of-birth correction (the only fix for a wrong sign-up date; the player gets its
own notice). While the player holds the move (corrections asked) an officer can still reject — recoverably or finally —
and escalate to AML; nothing is approved there. "Also freeze the wallet" is offered with every ask and every
rejection, because none of them stops money on its own — and ⛔ it is REQUIRED for a recoverable rejection of an
automatic approval no officer has checked, in any status (`uncheckedAutomaticApproval`, `src/lib/kyc-approval.ts`; the
service refuses it without the freeze, the rail ticks and locks the box). The **post-check list** on `/admin/kyc` holds
every automatic approval nobody has checked yet — approved, back with an officer, or with the player, a chip saying
which — flagged first, and a lifecycle chore bells the officers who can act (`kycOfficerRoles()`) for the approved ones
— at its next run for a flagged approval, after 24 hours otherwise.

**An approved-once account asked for corrections may change its name and expiry, never its document type or number**
(`identity_number_locked`): a document that changed goes through an officer's recoverable rejection and a restart, and
the next send goes back to an officer.

**What players sent before 2026-10-10 stays.** Their photos are kept, readable only through the officers' image route
(a frozen accept-list, `LEGACY_KYC_DOC_SLOTS`), and held 7 years from closure as before
([`DATA-RETENTION.md`](DATA-RETENTION.md)). With no images, the typed details are the only identification record, so
the submission keeps a history, `priorIdentities`: the identity it held is appended when any fact of it (type, number,
expiry, name, date of birth) changes after it was decided — approved, refused, sent or routed to an officer, or asked
to be corrected — and on every restart, re-open and date-of-birth correction; an undecided edit is not. At most 20
entries, always keeping the first approved one. Erasure pseudonymises every entry by the row's own rule, and an access
request shows the subject their own entries without the officer or fingerprint on them (`dsarKycView`).

## ⭐ When identity is asked — before WITHDRAWAL only (owner ruling, 2026-09-13)

A player registers, deposits and plays **without** verifying their identity — and, since 2026-10-07, without
confirming an email either (owner ruling: a deposit asks no email; a confirmed email is the second withdrawal step,
`COMPLIANCE-DECISIONS.md` § "2026-10-07 · A deposit asks no email; a confirmed email is required to withdraw; receipts
in the app (owner ruling)"). The ladder: **register → deposit and play → verify identity + confirm email → withdraw**.
Identity is verified once, **before the first withdrawal**, and before nothing else. The ruling, its
accepted consequences (declared age only until withdrawal; sanctions/PEP screening happens at the
review, after the money) and the date history are in
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), 2026-09-13. The seam is
`src/lib/server/kyc-gate.ts`; the one predicate the page and the server share is
`approvedEver` in `src/lib/kyc-approval.ts`. ⚠️ **Since 2026-10-10 "the review" is, for most players, an officer's
post-check of an identity already approved** — so the sanctions/PEP assessment can come after a withdrawal, not only
after deposits and bets (AML §4 says so).

⛔ **Read the dates before "restoring" anything.** 2026-08-20: identity stopped gating withdrawal.
2026-09-05: identity gated deposit, play and withdrawal. 2026-09-13: withdrawal only. 2026-10-10: still withdrawal only —
what a player gives changed (typed details, no uploads), and most are approved at once.

**Final and recoverable refusals (2026-09-13).** Because money is now played before identity is
checked, a refusal can land on an account holding a balance, and the reason code decides what
follows (`src/lib/kyc-refusal.ts`):

| Code | Kind | What follows |
|---|---|---|
| `EXPIRED_ID` · `DETAILS_MISMATCH` · `OTHER` (and legacy `BLURRY_DOC`) | recoverable | The player may submit again; the document number is freed. ⭐ Since 2026-10-10 an officer's recoverable refusal keeps the officer on the row through the restart, so the next send goes back to an officer, never to an automatic approval. ⚠️ A recoverable refusal of an identity approved once keeps `approvedAt`, so withdrawals stay open unless the officer also freezes the wallet — which is REQUIRED (the service refuses otherwise) when the identity is an automatic approval no officer has checked, whatever its status. `BLURRY_DOC` is refused for a new decision (no player sends an image) and kept for the rows that carry it. |
| `UNDERAGE` · `SANCTIONED` · `DUPLICATE_IDENTITY` | **final** | The wallet is frozen first; the document number stays **reserved**; the player cannot restart; an officer decides the balance (`refused-funds.ts`) and may re-open a wrong refusal — which lifts the identity hold, except when the refused identity was an automatic approval no officer had checked: then the hold stays until an officer approves the identity the player sends next (2026-10-10). |

## The policy

> We care that an identity document's number is **the right shape for that document**
> and **unique — one document, one account**. That is the whole machine-side control.
> There is **no authority check**, for any of the four, and none is required.

**Since 2026-10-10, a player's identity rests on the typed details, the automatic checks above and an officer's check
afterwards; an agent applicant's still rests on the document images and a selfie, reviewed by an officer before
approval.** Neither comes from a government API.

> ~~Identity assurance comes from the **documents** (the identity document's image, plus a selfie) reviewed by a human
> compliance officer, not from a government API.~~ — ⚪ superseded for players on 2026-10-10; still true of agent
> applicants and of every identity approved before that date.

## The four documents — owner decision, Ali 2026-08-19

*"We have to give options for KYC, not just NIDA. One of them: mandatory NIDA, or
passport number and attach passport front page, or driving licence number and attach
driving licence front, or voting card and attach it. One of them works for us, not just
NIDA."* ⚪ *The "attach" half of this quote is superseded for players by the 2026-10-10 ruling (no uploads); it still
describes what an agent applicant sends.*

| Document | Number rule | Source | Images required — players: **none** since 2026-10-10 · agent applicants: | Expires |
|---|---|---|---|---|
| **NIDA** | exactly 20 digits, first 8 a real `YYYYMMDD` date | 🟢 **Published** — example `19950101-12345-67890-12` decomposes 8-5-5-2 | NIDA front · NIDA back · selfie | no |
| **Passport** | 9 alphanumeric, letters leading — **advisory, never a refusal** (outside it: the `PASSPORT_SHAPE` flag) | 🟡 **Secondary sources only.** EAC/ICAO booklet issued since Jan 2018; no TRA/Immigration spec found | bio page · selfie | **yes** |
| **Driving licence** | none — a sanity band only (4–20 alphanumeric; the `NO_PUBLISHED_FORMAT` flag) | 🔴 **Not published.** TRA's own guide describes the card and not the number | licence front · selfie | **yes** |
| **Voter's card** | none — a sanity band only (4–20 alphanumeric; the `NO_PUBLISHED_FORMAT` flag) | 🔴 **Not published.** NEC/INEC confirm a number exists; its format is not published | card image · selfie | no |

The image column is the agent photo track's `requiredSlots`. A player's typed form has no file input at any step, and
an officer can no longer ask anyone for an extra document.

⛔ **THE TWO OPEN FIELDS ARE INSTRUCTED, NOT LAZY.** Ali, 2026-08-19: *"for now driving
and voting, keep them open — later we change."* A wrong regex on a national ID locks a
real citizen out of their own money, and a format-rejected submission never reaches the
automatic checks or an officer at all. A later session does **not** get to tighten either on a
guess. Adding a real rule is a one-line change to that document's entry in
`src/lib/id-documents.ts`, **with its citation beside it**. ⚠️ Since 2026-10-10 the cost of keeping them open is
higher: with no image, a licence or voter's-card number is checked for uniqueness and nothing more before an automatic
approval — which is why both carry a flag that puts them first on the officers' post-check list.

## The selfie — agent applicants only since 2026-10-10

*"Selfie matches the ID photo"* is one of the four attestations of the **photo** set (`photo-2026-09`,
`src/lib/kyc-attestations.ts`), which an officer uses on a photo case: an agent applicant's, or a case whose full photo
set is on file from before 2026-10-10. A typed case uses the **typed** set (`typed-2026-10`): name and date of birth
look genuine and complete · document number and its flags reviewed · no other account found for this person ·
sanctions/PEP clear. The workstation chooses the set from the row (`photoSetComplete`), never from the form.

> ~~⭐ **THE SELFIE SURVIVES ON ALL FOUR ON PURPOSE.** Dropping it for three of the types would have removed the human
> control in the same change that widened the document list — which is exactly what this policy forbids.~~ — ⚪
> superseded for players on 2026-10-10 by the owner's ruling (the Gaming Board's request). The control it protected —
> a person matched to the document — no longer exists for players, and that is stated as a cost, not hidden:
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) 2026-10-10, "What this costs". It still holds for agents: all
> four documents keep the selfie on the agent photo track.

## What the code actually does

| Control | Where | Status |
|---|---|---|
| Format check, per document | `validateIdNumber` in [`src/lib/id-documents.ts`](../src/lib/id-documents.ts) — ONE catalogue, one entry per type | ✅ enforced |
| **Uniqueness — one document, one account** | `db.kyc.findActiveByIdNumber(type, number, userId)` is the fast path; the **partial unique index** is the enforcement. A **recoverable** refusal frees the number; a **final** refusal (`UNDERAGE`, `SANCTIONED`, `DUPLICATE_IDENTITY`) keeps it reserved — both indexes and both fast paths ask the same question (2026-09-13, `20260913120000_kyc_at_withdrawal`) | ✅ enforced, audited as `kyc.id.duplicate_blocked` |
| Age ≥ 18 | `validators.dateOfBirth` at parse time **and** `kyc-service` above the per-document branch, both through ONE predicate, `isOfAge` (`src/lib/id-documents.ts`): **whole calendar years on the Africa/Dar_es_Salaam date** (2026-09-13, audit session 95 — the schema used 365.25-day years and the service calendar years on UTC, and their ~12-hour disagreement let the service issue an automatic FINAL UNDERAGE refusal to a player already 18; `nida.ts` and `/admin/kyc/[id]` ask the same predicate). ⭐ **Since 2026-10-10 the date is the ACCOUNT's** (`User.dob`, normalised to `YYYY-MM-DD` before the schema, because Prisma returns a timestamp): an under-18 account date is the FINAL refusal; only an account with no date types one, which is then written to the account; a wrong sign-up date is corrected only by an officer (`correctDateOfBirth`). ⚠️ **From 2026-09-13 the declared date is the only age control before a player's first withdrawal** (Ali's ruling, consequence recorded in `COMPLIANCE-DECISIONS.md`), and since 2026-10-10 it is the only age control at approval too: no officer compares it with a document before an automatic approval | ✅ enforced for **all four** (declared); see the note below |
| Expiry | captured and refused on the typed press; on the agent track refused at the details step **and** re-checked at the photo send; asked again as a block by every officer approval and Mark checked — for the two documents that carry one | ✅ enforced |
| The automatic checks | `decideKyc` in `src/lib/kyc-auto-checks.ts` — pure, shared by the instant path, the workstation's checklist and every officer approval; its facts (risk score, holds, source of funds, AML escalation, same-person matches) are read by `kyc-service.ts` before the lock, and a failed read refuses the press with "try again" rather than deciding without it | ✅ route / flag / block, never a refusal of its own |
| Same person on another account | `findSamePersonCandidates` (both stores) + `samePersonNameKey` — the same normalised name (tokens sorted) and date of birth | ✅ routes when the other account is restricted, flags otherwise. ⚠️ It **narrows** the two-document gap; it closes nothing |
| Authority check (NIDA API, or any other) | `src/lib/server/nida.ts` | ❌ **deliberately absent.** That file is a deterministic mock; no request has ever reached the National Identification Authority, and there is no equivalent endpoint for a passport, a licence or a voter's card. `idVerifiedAt` therefore means "format accepted", NOT "government confirmed". ⛔ Its two QA hooks (`…0000` → SANCTIONED, `…9999` → MISMATCH) answer only when `NODE_ENV !== "production"` (`nidaQaHooksEnabled`, 2026-09-13 audit session 95) — before that they answered production players, and SANCTIONED is a FINAL code. |
| An officer's check of a player's identity | `/admin/kyc` (the post-check list) and `/admin/kyc/[id]` | ✅ exists, **after** an automatic approval — so possibly after money has left. Before approval only for a routed case |
| Document review by a human | `/admin/kyc/[id]`, photo mode | ✅ for agent applicants (before approval) and for photo cases on file from before 2026-10-10. ❌ **For players since 2026-10-10** — ~~"this is the real identity control"~~ |

### ⚠️ The age gate belongs to the PLAYER, not to the NIDA number

Only a NIDA carries a date of birth inside its number. An UNDERAGE check derived from
the **number** would therefore be silently NIDA-only — a control that passes for the
other three *because the feature is absent*. So the gate is on the **declared** date of
birth, above the per-document branch, and `test:id-documents` §6 asserts it per type on
four separate accounts, each beside an adult acceptance.

The NIDA number's embedded date is used for three things and no others: it must be a real
calendar date (so `19993101…` and 30 February are refused); where it says the holder is **under 18** the identity
goes to an officer at once (`NIDA_UNDER_18`, never an automatic approval); and where it **disagrees**
with the declared date of birth (both adult) the approval carries the `NIDA_DOB_MISMATCH` flag and the officer is
shown both. ⛔ The disagreement is a flag, never a refusal — a declared date can be a sign-up typo, and refusing
would lock a real citizen out over one. The marketing age gate also reads the NIDA-derived date (the youngest of the
ages governs — `src/lib/server/marketing/consent.ts`).

## ✅ The uniqueness gap — PROVEN, then CLOSED (2026-07-31), then WIDENED (2026-08-20)

The duplicate check was **application-level read-then-write with no lock**:
`findActiveByNida` ran, and only then was the row written. `withLock` guards
`reviewKyc`/`forceReverifyKyc` (the latter deleted 2026-10-10) but not this path, and it is keyed `kyc:${userId}` —
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
deliberately frees the number). ⚠️ **HISTORY — the index below no longer exists**; it was dropped
with its column on 2026-08-20 and superseded by the four-document tuple index further down. Kept
because it is the record of what closed the race, and because the `CONCURRENTLY` + `IF NOT EXISTS`
shape is the one to copy:

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

🔴 **AND FROM 2026-09-13 A FINAL REFUSAL KEEPS THE NUMBER.** A refusal freeing the number was
correct while an unapproved account could hold no money. With play before verification it became a
laundering shape: a minor refused `UNDERAGE` with a balance, their document released, an adult
accomplice presenting it on a second account to withdraw. `20260913120000_kyc_at_withdrawal`
re-creates BOTH partial unique indexes (the tuple above and `KycSubmission_idFingerprint_active_key`)
under the same names with this predicate, and `findActiveByIdNumber` / `findActiveByFingerprint`
in both stores ask the same question through `holdsDocumentNumber` (`src/lib/kyc-refusal.ts`):

```sql
WHERE "idNumber" IS NOT NULL
  AND (status <> 'REJECTED' OR "rejectReason" IN ('UNDERAGE', 'SANCTIONED', 'DUPLICATE_IDENTITY'))
```

⚠️ A restart would null the number and release it anyway — which is why `startKyc` refuses to
restart a final refusal. Only an officer's `reopenFinalRefusal` resets it, with a written reason.

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

### ✅ `nidaNumber` WAS REMOVED IN TWO RELEASES — and the ORDER is the reusable part

`nidaNumber` / `nidaVerifiedAt` and their two indexes existed for exactly one release as
a rolling-deploy mirror. They are removed in **two steps, in this order**:

1. ✅ **DONE — the fields left `prisma/schema.prisma` and every layer, with NO DDL.**
   After this release no deployed generated client names the columns. The columns are
   still physically present in production, holding their old values, read by nothing.
2. ✅ **DONE — the columns left the database**, as
   `prisma/migrations/20260821090000_kyc_drop_nida_legacy`, which re-runs the backfill
   in the same transaction before dropping (a row written by a pre-tuple container
   during the expand deploy, or after a rollback, carries `nidaNumber` with no
   `idNumber`, and dropping the column would destroy that player's identity number and
   silently free a national ID that is in use). It drops **both** indexes by name,
   creates nothing, contains no `CONCURRENTLY` in either direction — `prisma migrate
   deploy` wraps a migration in a transaction and neither `CREATE INDEX CONCURRENTLY`
   nor `DROP INDEX CONCURRENTLY` can run inside one — and every DDL statement is
   `IF EXISTS`, because hand-applying before pushing is normal practice here while CI
   replays each migration exactly once, so a non-re-runnable file is green in CI and
   fatal in production.

   ⛔ **The step-1 container had to be confirmed live and the previous one gone first.**
   Evidence used: `/api/health` showed a fresh container (`uptimeSec` reset) and then
   `leadership.lifecycle.isMe: true`, meaning the previous instance had stopped renewing
   the lifecycle lease. Timestamps alone would not have proved it.

⛔ **NOT THE OTHER ORDER, AND NOT IN ONE RELEASE.** `package.json`'s `start` is
`prisma migrate deploy && … && next start`, so a migration commits inside the NEW
container *before it serves*, while the OLD one is still taking traffic; and
`postinstall` runs `prisma generate`, which bakes the column list from `schema.prisma`,
with Prisma selecting every scalar column. Dropping the columns while the
previously-deployed container still named them would have thrown Postgres **42703** on
every `db.kyc.findByUserId`.

🔴 **AND THE BLAST RADIUS WAS RECORDED TOO SMALL FIVE TIMES.** Every earlier statement of
this hazard — including this file's own previous revision — named `/profile/kyc`,
`/wallet/withdraw` and `/admin/kyc`. But `createSession` calls `db.kyc.findByUserId`
**unguarded on all three login paths** (`auth-service.ts:353`, `:911`, `:952`), so the
real failure is **sign-in, platform-wide**. `/api/health` never touches `KycSubmission`
and `qa:live` never logs in, so nothing in the platform would have reported it.

⚠️ **"Read by nothing" was a claim nothing had ever tested.** It was true of product
code and never of the store layer: `prisma-dal.findByNida` / `findActiveByNida` read the
column and had zero callers, and the guard cited as proof — `test:id-documents` §9 —
**allowlisted the very file those reads lived in**, with a locator (`kyc.`/`k.` dot-reads
only) that could not have seen `row.nidaNumber` or a Prisma `where` key even
unallowlisted. Its positive control fed it the one shape it already matched. §9 now scans
**every** spelling across all of `src/`, with no allowlist, plus the schema and the
absence of a number-only duplicate read, and carries five controls instead of one.

⭐ **AND THE TUPLE INDEX IS NOW THE SOLE ENFORCEMENT** of one-document-one-account. Until
the contract step, a NIDA was covered twice — by
`KycSubmission_idType_idNumber_active_key` and, redundantly, by the legacy
`KycSubmission_nidaNumber_active_key`. `test:kyc` §2d therefore proves the rule at
service level for a **passport** as well as a NIDA: the duplicate refusal, the
`status <> 'REJECTED'` half that frees a rejected number, and a control showing the same
digits under a different document type are a different document. All three are proved RED
by mutation.

The instruction, the dates and what deliberately did **not** change are in
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

- ⭐ **Since 2026-10-10: the same-person check.** A typed identity whose normalised name and date of birth match another
  account's is routed to an officer when that account is self-excluded, cooled off, suspended, closed, frozen or finally
  refused, and flagged for the post-check otherwise. It **narrows** the gap; it does not close it — a different name
  spelling, or a different date on the second account, passes it.
- The **officer's post-check** sees the name, the date of birth, the document number, the flags and the same-person
  matches (linked by case, never by name) — but, for a player, **no image and no selfie** since 2026-10-10, and only
  after the approval.
- ~~The **human reviewer** sees the name, the date of birth, the document image and the selfie. A second account by the
  same person on a different document is the case the officer is positioned to catch, and it is the only place it can
  be caught.~~ — ⚪ true of agent applicants (and of photo cases from before 2026-10-10) only.
- A `DUPLICATE_IDENTITY` rejection on one document therefore **does not** block that
  person from submitting a different one. Do not describe it as if it does.

### 🔴 A second gap, opened 2026-10-10 by ruling — stated, not closed

**Nothing ties a typed document number to the person typing it.** With no image and no selfie, anyone who knows a real
document number can verify with it, and the real holder is then refused as "already linked to another account". That is
resolved by compliance, never by support: an officer satisfies themselves out of band, rejects the impostor's identity
recoverably (freeing the number) **and freezes that wallet** — a recoverable rejection keeps `approvedAt`, so without the
freeze the impostor could still withdraw; on an automatic approval no officer has checked yet, the service refuses the
rejection without the freeze. The owner accepted this cost in writing
([`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) 2026-10-10, "What this costs"). The controls that remain in front
of money leaving: payout only to the account's registered number (⚠️ not OTP-proven at sign-up), the TZS 5,000,000
per-withdrawal cap, the source-of-funds gate, the confirmed-email step, uniqueness, the routing rules, the post-check
list, and the final-refusal freeze. ⛔ `lookupPayeeName` (display only, unavailable on M-Pesa) and `nida.ts` (a mock) are
**not** controls.

## What we say to people — INTERNAL vs PLAYER-FACING

**Ali's instruction: the mechanics are an internal matter. Documentation and admin
surfaces state them plainly; player surfaces say nothing about them either way.**

- **Player surfaces must never CLAIM a check we don't do.** Fixed 2026-07-19:
  `securedBody` said *"Withdrawals are released only to a NIDA-verified account"*.
  It then said withdrawals are released after our compliance team has reviewed your
  ID documents — true until 2026-10-10. ⭐ Since 2026-10-10 it says the identity is verified **from the details of
  the ID document** and that a withdrawal goes only to the registered number — true, and it narrates no internals
  (it must still carry an identity word: `test:kyc-at-withdrawal` B8).
- **Player surfaces must also not ADVERTISE the absence.** We do not tell players
  "we don't check with NIDA". They are told what they must provide and what happens
  next. Nothing more. (This is the standing "player surfaces never narrate internal
  ops" rule.) ⛔ **Since 2026-10-10 that includes "no photo needed" / "no upload needed"**: the typed track says what
  to enter — the *details* of a document (*taarifa*, 信息) — and never what is no longer asked. In Swahili a player
  *anajaza taarifa*; ⛔ never *kuweka* (that word is a deposit).
- ⛔ **Never name the Gaming Board (or the Gaming Act) as the reason for an identity step** on any player or legal
  surface — not even for this change, which the Board asked for. The reason recorded internally is internal
  (`test:kyc-copy-truth` rule 3).
- ⭐ **Typed track and agent track speak differently, and each truthfully.** A player's screens, notices and emails
  speak of *details* ("Details received", "We're checking your details", "Check your details" when an officer asks for
  corrections, "The document number you entered is now linked to your account"); only the agent track, an officer's
  photo case, speaks of photos and a selfie — and a player already verified from typed details who applies to be an
  agent is told "Add your ID photos", never "Verify your identity" again. A routed player is
  told we are checking their details; the wait it states sits in a sentence that names no withdrawal.
- ⛔ **And a player surface must never name one document as though it were the only
  one.** Added 2026-08-20. The chooser, the progress rail, the agent track's upload slots and the
  refusal copy all resolve from the document the player actually picked — a passport
  journey that says "NIDA" anywhere is telling somebody the wrong thing about their
  own application.
- ⭐ **And from 2026-09-13, attach verification FORWARD to the exit, never BACKWARD to the
  entrance, and never name both in one sentence.** *"Verify your identity before you cash out"*
  — not *"you don't need to verify to deposit"* (advertises the absence) and not *"verification is
  what opens adding money and playing"* (false since 2026-09-13). On a legal page keep the two in
  separate `<p>`/`<li>`, not merely separate sentences. `test:kyc-copy-truth` reads the whole
  dictionary and every file under `src/app/legal/` in English, Swahili and Chinese with three rules:
  no denial of identity beside money and identity (paragraph), no identity bound to the entrance
  (a sentence and its neighbours), and never an identity word paired with the Gaming Board or Gaming
  Act as its reason (paragraph; AML attributions are true and stay). `red:kyc-copy-truth` proves each.
- **Admin surfaces state the truth plainly**, because an officer is making a money
  decision on it. Fixed 2026-07-19: the KYC review checklist read
  **"NIDA verified — government match"** whenever `nidaVerifiedAt` was set. That told
  a compliance officer a government had confirmed the identity, and would have
  invited them to release a withdrawal on evidence that does not exist. It now reads
  *"<document> number — format valid · unique to this account (no authority check by
  design)"*, and **where no format is published it says so in those words**, so the
  weight of the decision sits visibly on the document image. ⭐ Since 2026-10-10 the checklist's rows are the
  automatic checks themselves (`decideKyc`: pass · flag · route · block, each with its English detail), the number row
  still says "unique to this account (no authority check by design)", and on a typed case there is no image for the
  weight to sit on — so the officer is told which checks routed or flagged the case, and that only a block stops them.
  The date of birth on the workstation goes through `<Sensitive>` (and `maskDob` inside a checklist row), and a
  same-person match is shown as a link to the other account's case, never by its name.

## If a real integration is ever added

Replace the mock in `nida.ts`, and only then may any surface use the word *verified* in
the government sense — and only for NIDA, which is the only one of the four with an
authority to ask. Update this document in the same commit.
