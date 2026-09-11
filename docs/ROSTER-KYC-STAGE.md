# The roster's KYC stage — who uploaded, and who did not

> **Status** 🟢 Shipped 2026-09-11. **Authority for this feature.**
> **Surface** `/admin/players` (the console calls it **Roster**).
> **Guards** `npm run test:kyc-stage` (in `predeploy`) · `npm run qa:kyc-roster` (localhost) ·
> `npm run test:kyc-restart-docs` (needs a real Postgres).

---

## 1 · What Ali asked for, and what was actually wrong

> *"in roster i can see players as admin but those who uploaded kyc can i have a unique tag
> for them kyc submitted maybe etc, because it says pending kyc always how i know who
> uploaded and how not especially with so many users coming in daily."*
> — 2026-09-11

He was right, and the cause was structural rather than cosmetic. The Status column renders
`User.status` — an **account** fact — so four genuinely different people read one identical
**"Pending KYC"**:

| What actually happened | In the database | The roster showed |
|---|---|---|
| Registered, never opened KYC | **no `KycSubmission` row at all** | Pending KYC |
| Opened KYC, uploaded nothing | `IN_PROGRESS`, 0 documents | Pending KYC |
| **Uploaded every photo, never pressed Confirm** | `IN_PROGRESS`, documents > 0 | Pending KYC |
| **Submitted — waiting on US** | `PENDING_REVIEW` | Pending KYC |

The two bold rows are the request. The third is the one that costs money: **no screen in the
console showed it**, because `listPendingKyc` reads only `PENDING_REVIEW` and
`ADDITIONAL_INFO_REQUIRED`. A player who uploaded everything and never pressed the button was
in no queue, on no list, and nobody chased them.

⛔ **An account fact cannot answer an identity question.** Nothing demotes `User.status` on a
KYC rejection or a force-reverify, and responsible-gambling writes it with no KYC
precondition — so `ACTIVE` + `REJECTED` and `SELF_EXCLUDED` + `IN_PROGRESS` are both
reachable. That is why the fix is a derived column and not a relabelling.

---

## 2 · The seven words

Scan order is workflow order, and **the first word says whose move it is** — the only
decision an officer scanning 500 rows actually makes. Exactly **one** of the seven is ours.

| Stage | Word | Tone | Whose move |
|---|---|---|---|
| `nothing_yet` | **Nothing yet** | slate | player |
| `uploaded` | **Uploaded · not sent** | amber | player ⭐ |
| `with_us` | **Submitted · with us** | royal | **US** |
| `more_needed` | **More needed · player** | amber | player |
| `rejected_after_upload` | **Rejected · after upload** | rose | terminal |
| `rejected_no_docs` | **Rejected · nothing sent** | rose | terminal |
| `approved` | **Approved** | green | done |
| *(render state)* | **Not available** | slate | the read failed |

### Word rulings — each is load-bearing

- ⛔ **"Submitted" appears on exactly ONE stage**, and it is the one where `submittedAt` is
  non-null by construction. `uploaded` is a player who attached every required photo and
  never pressed the button; calling that "Submitted" would be the same lie in a new colour.
  `test:kyc-stage` §2a–§2d is written specifically to close that hole, because **nothing else
  in the suite compares a word to a state**.
- ⛔ **No word contains "verified".** `idVerifiedAt` means *format accepted and unique*, never
  "an authority confirmed this identity" (`docs/IDENTITY-POLICY.md`).
- ⛔ **No word contains "Pending".** The Account column on the same row already reads "Pending
  KYC" and both render upper-cased — "PENDING KYC" beside "PENDING REVIEW" two cells apart is
  the complaint relocated, not answered.
- ⛔ **Never word `nothing_yet` as "never opened KYC".** Both sign-up doors redirect a new
  account to `/profile/kyc?welcome=new`, which creates the row — so a missing row today means
  a legacy account, an abandon, a **swallowed `startKyc` failure**, or a non-player. "Nothing
  yet" is honest for all four; "never opened" would accuse a player the platform itself failed.
- **EN-only**, like every family on this console. The lexicon forbids inventing Swahili, and
  four of the seven have no shipped source to lift from.

### Amber is spent deliberately

Today four of the six raw KYC values wear amber, which is why it says nothing — the substance
of the complaint. Here it is spent on exactly **two** stages where a human must move: a player
sitting on a complete upload they never sent, and an officer's outstanding request. The
resulting scan is the direct answer to *"it says pending kyc always"*: a sea of **slate**,
**amber** where somebody must act, **royal** for our own queue, **green** done, **rose** refused.

---

## 3 · Where the code lives

| File | Role |
|---|---|
| `src/lib/kyc-stage.ts` | The derivation. Pure, imports nothing, exhaustive by construction. |
| `src/lib/admin-status-lexicon.ts` → `KYC_STAGE` | The words. |
| `src/lib/status-tone.ts` → `KYC_*` | The colours. |
| `src/components/admin/status-badge.tsx` → `KycStageBadge` | Enum → chip. |
| `src/lib/server/store.ts` / `prisma-dal.ts` → `listStageFacts` | The read, both halves. |
| `src/app/admin/players/page.tsx` | The column, the filter, the tallies. |

### Two derivation arms that look wrong and are not

- **`IN_PROGRESS` reads `documentCount` ALONE**, never the three-witness rule. `startKyc`
  preserves `approvedAt` through a restart, so the wider rule would paint "Uploaded · not
  sent" over a once-approved player who has uploaded nothing since. Reachable entirely from
  shipped code: APPROVED → force-reverify → officer REJECT → "start again".
- **`REJECTED` needs all three witnesses.** Erasure destroys document rows from any status, so
  a count alone would call an officer-refused complete file "nothing sent" once retention
  released its images.

### ⛔ No denormalised `documentCount` column, and this is a ruling

The obvious design — a counter on `KycSubmission` — was rejected on evidence:

1. `kyc.upsert` commits the submission and its documents in **two separate round trips**, so a
   stored counter would commit *before* the rows it counts. Any failure between them leaves it
   permanently wrong, and the drift only has to cross zero to make the tag lie.
2. **This repo already tried it.** `PredictionMarket.predictorCount` is its one denormalised
   counter over a child table; it drifted, outlived its children, and
   `scripts/ops-backfill-predictor-count.mjs` could not repair all of it.
3. `test:dal-parity` **does not cover `StoredKyc`** — so a counter mapped in one DAL half only
   would be invisible to the single guard written to catch exactly that. It is the blind spot
   the 2026-09-11 P0 lived in, on this same table.

So the feature ships with **ZERO migrations**. `prisma migrate deploy` runs *before*
`next start`, and a slow or broken migration is a platform-wide outage, sign-in included.

⚠️ **When this flips.** `documentCount` becomes right in the release that moves the roster's
filtering, sorting, counting and pagination into SQL — and not before `kyc.upsert` is ONE
transaction and a reconciliation check is in the pipeline.

⛔ **The two population reads are SEQUENTIAL, submissions first.** Not `Promise.all`, and not
`$transaction([a, b])` (the array form is READ COMMITTED; each statement still takes its own
snapshot). The order is what makes the one-render skew benign — it can only under-claim.

---

## 4 · Two real defects fixed alongside

### 🔴 P0 — a KYC restart said it cleared the documents, and Postgres kept them

`prisma-dal.ts`'s `kyc.upsert` guarded its document sync with `if (k.documents?.length)`.
`startKyc` restarts a submission with `documents: []` **and reuses the row id** — and `[]` is
falsy on `.length`, so the delete never ran. The in-memory half replaces the object wholesale
and *did* clear them, so the two halves disagreed, **every unit suite ran on the half that was
right, and production ran the half that was wrong.**

Not cosmetic: `submitForReview`'s `missingSlots` reads those documents, so once the player
re-entered their identity the **old, already-refused images** satisfied the required slots and
the file passed back to an officer as complete.

Proven against a real Postgres by `npm run test:kyc-restart-docs`, driven **both ways**:
with the fix 6/6 pass and zero rows survive; with the old guard restored §2 fails with
"2 row(s) still in KycDocument".

### 🔴 The pagination filter drop

`buildBaseHref` is a **deny-list of one key** — it keeps every truthy param and drops only
`pageParam`. The allow-list was the hand-typed literal at the call site, so `?kyc=` would have
been dropped from every page link: an officer filtering to "Submitted · with us", paging
forward and working the list would have been reading the **general roster** believing it was a
review queue, while the count jumped to the unfiltered total. Now `sp` is passed wholesale,
which immunises the page against the whole class.

⛔ Do **not** "fix" this in `pagination.tsx` — there is no list in it to add to, and it is
shared by ~25 admin and money screens.

---

## 5 · Who can see it

**Ungated, exactly like the account chip beside it.** Only ADMIN, COMPLIANCE and SUPPORT reach
`/admin/players` at all, and all three are entitled to know whose move it is.

⛔ The first design gated this on `canView(role, "compliance")`. **That was wrong and was
refuted before it shipped:** `SUPPORT` has no `compliance` grant, and SUPPORT is the role whose
domain *owns* this page and who fields "why can't I deposit?". Gating would have blinded the
support desk while closing no leak at all — that role already sees "Pending KYC" by row, by
KPI, by mix bar and via `?status=PENDING_KYC`.

What stays privileged is the submission's **contents** — id number, images, date of birth —
and that is untouched: still behind the PII gate and `<Sensitive>` on the detail page. The
roster cell carries **a workflow word and nothing else**.

---

## 6 · How it was verified

| Gate | What it proves | Can it skip? |
|---|---|---|
| `npm run test:kyc-stage` | 48 assertions: totality over the whole product space, the honesty arms, no magnitude comparison, exhaustiveness against the schema enum, no hand-typed chip variant, and every page-wiring point that fails silently. | **No** — reads source and calls a pure function. In `predeploy`. |
| `npm run qa:kyc-roster` | 21 assertions against a **real render**. | Localhost Playwright — **cannot** join predeploy. |
| `npm run test:kyc-restart-docs` | The P0, against real Postgres. | Refuses to skip: exits **3** with no `DATABASE_URL`. |

### The guard was RED-tested — six mutations, each caught by the right assertion

| Mutation | Caught by |
|---|---|
| `uploaded` claims the word "Submitted" | §2a, §2b |
| `IN_PROGRESS` uses the three-witness rule | §2e, §2f |
| `baseHref` back to the hand-typed literal | §6a |
| the pre-2026-09-11 document-sync guard restored | §7a |
| the two population reads parallelised | §7d |
| the KYC column header removed | §6d |

### The live drive, on real Postgres 18.3 with 40 players

**21/21.** The central arm is **DISJOINT + COVERING**: filtering to each of the seven stages in
turn partitions the population exactly —
`{nothing_yet 34, uploaded 1, with_us 1, more_needed 1, rejected_after_upload 1,
rejected_no_docs 1, approved 1} = 40 of 40`. No player in two stages, every player in one.
That is stronger than sampling a chip's word, it never reads a label so it is locale-proof,
and it is incidentally the only live proof that one user yields one row.

⚠️ **Two of the driver's own defects were found by running it, and both had been reporting as
PRODUCT failures** — a pager walk that ignored `parsePage`'s clamping (800 ids for 40 players),
and a selector that caught both status cells because `"PENDING_KYC"` contains an underscore.
An instrument defect wearing a product defect's clothes is the expensive kind.

### Reproducing it

```bash
npx tsx scripts/db-scratch.mts                 # terminal 1 — disposable PostgreSQL 18.3
# terminal 2:
export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5433/kipindi_qa?schema=public'
npx prisma migrate deploy
npx tsx scripts/seed-admin-local.mts && npx tsx scripts/seed-staff-local.mts
npx tsx scripts/seed-kyc-stages-local.mts      # one player per stage, via the REAL writers
DISABLE_ADMIN_TOTP=true SESSION_SECRET=… AUDIT_CHAIN_SECRET=… NODE_ENV=production npx next start
npm run qa:kyc-roster                          # terminal 3
```

⚠️ `next start`, **never** `next dev` — the dev server serves stale CSS and its HMR socket does
not come up on this machine.
⚠️ Rebuild **and restart** between edits. A stale server served an old build for one whole run
here and the failures looked like product defects.

---

## 7 · Open, and deliberately not fixed in this pass

- ⚠️ **`KycDocument` has no index on `submissionId`** — it owns exactly one index in its life,
  the pkey. A Postgres FK indexes the *referenced* side, not the referencing one. The P0 fix
  widened `kyc.upsert`'s guard, so the unindexed `deleteMany` now fires on essentially every
  KYC write. The index is right and is **its own later deploy**, justified by something other
  than the roster — sequencing it apart means a bad index deploy is never a bad feature deploy.
  ⛔ Re-measure the table read-only on production first; the recorded "67 rows" predates the
  2026-09-05 policy and is stale by construction.
- ⚠️ `listByStatus` still carries `include: { documents: true }` on the `/admin/approvals`
  queue. That is what the index above would let it drop for a `_count`.
- ⚠️ `kycStatusVariant`'s final arm is a bare `: "warning"` fallback — a live §B11 breach for
  three KYC values. `kycStageVariant` deliberately does **not** delegate to it. Named, not
  extended.
- ⚠️ `MIX_ORDER` on this page paints account statuses in `var(--yes-500)`/`var(--no-500)` — the
  **betting ink** on an app state, a live §B2a breach. Named, not extended, and deliberately
  not bundled into this change.
- ⚠️ `db.user.list()` on a `force-dynamic` page remains the real ceiling for this screen and
  nothing here moves it. Around 20k–30k players it stops being defensible for reasons that have
  nothing to do with the KYC tag — and that rewrite is where `documentCount` finally earns its
  invariant.
- ⚠️ `kycStage(null) ⇒ nothing_yet` is safe **only while nothing can delete a `KycSubmission`
  row**. Today nothing can. The day a purge or a DSAR hard-delete is added, the roster silently
  starts labelling erased players "Nothing yet". That is the one future change that falsifies
  the arm.
