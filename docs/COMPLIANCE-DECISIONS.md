# 50pick — Compliance Decisions Log

> Deliberate, owner-authorised decisions that touch a compliance control. Each is
> recorded so a future audit/session understands it was intentional and does NOT
> silently "restore" a prior behaviour. Newest first.

---

## 2026-08-20 · What Up & Down writes to the audit chain — one entry cut, four protected

**Instruction:** Ali, **2026-08-20**, choosing between three options put to him for audit
finding **F-10**: *"Reduce what Up & Down writes"* — in preference to accepting the growth
or to a yearly export-and-re-anchor ceremony.

**The problem, measured.** `AuditLog` is **144 MB / 114,480 rows**, growing **~11,500 rows a
day** — three times the rate the audit recorded. ~90% is Up & Down machinery at six entries
per round. The chain is append-only and **cannot be pruned without breaking its HMAC links
by design**, so every row written is written for the platform's lifetime.

### What was cut

| Entry | Why it could go |
|---|---|
| `market.created` (for `productLine === "UPDOWN"` only) | Every field is already in the `updown.round.opened` entry written moments later, and that one is **strictly richer** — it carries the marketId, the pinned `capturedSourceUrl`/`capturedSourceDomain`, the `rateProfile`, the stake bounds, the margin, both targets, the open price and the write-once observation id. Nothing is lost by not saying it twice in two vocabularies. **10,012 entries in the last 7 days alone.** |
| `notification.delivered` (platform-wide) | Carried `{ userId, kind }` about a `Notification` row that already holds strictly more — both titles, both bodies, href, readAt, dismissedAt, createdAt. A poorer copy of a record that already exists, and the highest-volume non-money action in an unprunable log. Nothing read it: no consumer of the action name exists in `src/` or `scripts/`. |

### 🔴 What was NOT cut, and why — read this before reducing anything further

Each was examined individually. None is a duplicate:

- **`market.settled`** — THE MONEY: `winnersPaid`, `positionsSettled`, `grossPool`,
  `winningPool`, `objectionsClosedAt`. If this goes, the chain no longer records that a
  player was paid.
- **`market.resolved`** — the FULL FEE ARITHMETIC, written so *"an inspector (or a player who
  disputes a payout) can recompute the fee from these numbers"*. ⚠️ The Up & Down twin
  `updown.round.resolved` carries pools and players but **NOT the rate breakdown**, so this
  is *not* a mirror and dropping it would cost a dispute record.
- **`updown.round.opened`** — the round's provenance and its pinned price source.
- **`updown.observation.confirmed`** — the price, write-once. The fairness record the whole
  product rests on.

**⛔ Guardrail.** "Reduce what Up & Down writes" is not a licence to keep cutting. The four
above are asserted PRESENT by name in `test:updown-reporting` (assertions 20–23), each with
the reason attached, and the cut one is asserted ABSENT **for the round's market only** while
a long-form poll must still record its creation — so deleting the audit call outright fails
too. Both directions were driven red.

### ⚠️ Be honest about the size of the win

This removes **one of six** entries per round plus the notification rows: roughly
**1,700–3,000 rows a day**, on the order of **1 GB a year**. It does not solve the growth
curve — four load-bearing entries per round remain, and at ~1,650 rounds a day that is still
~6,600 rows a day from Up & Down alone.

**The remaining lever is not an engineering one: it is the number of rounds.** Nothing else
can come out of the chain without losing a money, fee, provenance or fairness record. If the
growth needs to be halved again, that is a decision about how many rounds the product
generates — or the export-and-re-anchor ceremony, which remains on the table and is recorded
here as *not chosen today*.

**Code:** `src/lib/server/market-service.ts` (the `productLine !== "UPDOWN"` guard) ·
`src/lib/server/notification-service.ts` (the audit call removed, with the reasoning left in
its place).
**Tests:** `test:updown-reporting` 25/25 (assertions 17–25, both halves driven red) ·
`test:audit` 36/36 · `test:lifecycle-e2e` 1545/1545 · `test:markets` 24/24.

---

## 2026-08-20 · The privacy policy stops declaring collection and controls we do not have

**Origin:** the data-handling audit ([`DATA-AUDIT-2026-08-20.md`](DATA-AUDIT-2026-08-20.md))
finding **F-04**, which named one false claim. Grounding the finding against the code found
**three**, each repeated in all three locales. Ali's decision on the open a/b question:
**option (a) — correct the policy to actual collection.** Device/browser fingerprinting is
NOT implemented and is NOT planned for launch, so the `Device` model stays unwritten and
F-05 may drop it.

**What was false, and what is true.**

| The policy said | The code does | Corrected to |
|---|---|---|
| "IP address, **device and browser fingerprint**, session timestamps" | Nothing computes a fingerprint. `Device.fingerprint` exists in the schema with **zero writes anywhere in `src/`**. The only "fingerprint" in auth code is `passwordFingerprint()` — a SHA-256 of the stored *password hash* that makes a reset link single-use (`password-reset.ts:52-55`). No browser entropy is read, stored or transmitted. | "IP address and browser user-agent string, recorded on sign-in and security events; session issue and expiry times" — which is exactly what `AuditLog.ip` / `AuditLog.userAgent` hold |
| "Behavioural: **time on platform, reality-check responses**, limit changes" | Session elapsed time and the reality-check dismissal are written to browser `sessionStorage` and **never sent to the server** — `reality-check.tsx` contains no `fetch`, no action, no POST. No table holds either. Only "limit changes" was ever real. | "deposit and loss limit changes, self-exclusion and cooling-off periods" — the whole of what `ResponsibleGambling` stores |
| "Passwords **(when introduced) will use Argon2id**." | Password registration and login are the **primary, live** auth path, and hashing is **scrypt with a per-user salt**. | "Passwords: scrypt with a per-user salt (NIST SP 800-132)." |

**Which of the three mattered most.** The Argon2id sentence. Over-claiming *collection* is
inaccurate; mis-stating an *actual security control* to a regulator, on the page they read,
is a different category — and it was future-tense about a control that had already shipped.

**⛔ This page is not dictionary-driven.** All three locales are inline JSX in
`src/app/legal/privacy/page.tsx`, so `npm run test:i18n` cannot see a word of it and never
protected any of this. The new `test:cert-d1` §2b block is the only guard there is; it
asserts the negative in all three languages, requires `scrypt` to appear at least three
times so a partial fix cannot pass, and carries a control assertion so the negatives cannot
pass vacuously on an unreadable page. Both new negatives were driven red by reinstating the
old sentences.

### The ISO 27001 / penetration-testing claim — Ali's attestation, recorded

§8 of the same page states, in all three locales, an **annual ISO 27001 audit cadence and
penetration testing twice a year**. Unlike the three corrections above this is an
operational fact, not a code fact — nothing in `docs/` records a completed ISO 27001 audit
or a pentest report, so it could not be settled from the repository.

Put to Ali on **2026-08-20**. His instruction: **both have happened; the sentence stands as
written.** The reports are held outside this repository.

This entry is the record of that attestation, and it is deliberately explicit about its
own basis: the claim rests on the owner's statement, **not** on anything verified in code or
filed in `docs/`. ⚠️ If a regulator asks for the ISO certificate or a pentest report, they
are requested from Ali — there is nothing in the repo to hand over. Filing copies (or a
summary with dates, scope and assessor) under `docs/` would close that gap; until then the
gap is this paragraph.

### Two inert controls found in the same sweep — NOT fixed here, recorded so they are not forgotten

Both are the same shape as the privacy overclaim — the product describes a control that no
code path can exercise — but both sit outside the data-handling audit's scope and neither was
changed in this pass:

1. **Shared-IP affiliate anti-fraud never fires.** `referrerSharesIp()`
   (`affiliate-service.ts:255-267`) reads `globalThis.__50PICK_SESSIONS`; a repo-wide grep
   finds that symbol on **that line only**, so it is always `undefined` and the function
   always returns `false`. `suspectIpOverlap` is therefore permanently false — the
   "rewards land HELD for review" branch never triggers, and every
   `affiliate.recruit.bound` audit payload records `suspectIpOverlap: false` forever. The IP
   *is* available at the call site (`bindRecruit` receives `ip: meta.ip`), so this is a
   wiring gap, not a missing input.
2. **The `SESSION_OVERRUN` responsible-gambling detector is unreachable.**
   `responsible-gambling.ts:537-551` returns immediately unless `ctx.opts.sessionStartedAt`
   is set, and its only caller (`:593`) passes no options. The detector that watches for a
   player sitting on the platform past 4× their reality-check interval has never produced a
   flag and cannot. Note the neighbouring detector #4 is *declared* an intentional no-op in
   a comment — so this file already has a convention for saying so honestly, and #5 should
   either be wired or labelled the same way.

**Code:** `src/app/legal/privacy/page.tsx` (9 lines, 3 claims × 3 locales).
**Tests:** `test:cert-d1` §2b (74/74, both negatives driven red).

---

## 2026-08-20 · Identity verification STOPS being a precondition of withdrawal

**Instruction:** Gaming Board comment **#1**, relayed by the owner (Ali) on **2026-08-19**. That
relay is the authority of record for this change. Register row **`E-175`**. The statement sent to
the Board **before** the code was written is [`BOARD-DISCLOSURE-B-E.md`](BOARD-DISCLOSURE-B-E.md);
it is the fuller document and this entry does not restate it.

**What changed.** `wallet-service.withdraw()` no longer refuses a payout on identity status. The
refusal, its `withdraw.kyc_blocked` COMPLIANCE audit, and the `kyc_required` failure reason — union
member, registry row, three dictionary keys and its single emitter — are retired together. The
`/wallet/withdraw` page changed in the **same commit** (`canSubmit = payoutsOpen`, the verify-first
panel deleted); a UI-only change would have reproduced `E-5`, a screen promising what the next
screen refuses.

**What replaced it — a RECORD, not another gate.** The identity read is deliberately KEPT. Every
withdrawal's `withdraw.initiated` audit now carries `kycStatus`, and an unverified payer produces an
**awaited** COMPLIANCE fact `withdraw.unverified_payer` carrying `txnId`, the amount, the provider,
and the instruction that authorised it. Stamping every payout — not only the unverified ones — is
deliberate: a stamp that appeared selectively would make its own absence ambiguous.

**Deliberately NOT changed.** The identity system itself (collection, the four documents, the
`(idType, idNumber)` uniqueness tuple, the human review, the audit trail) · the AML/FIU controls
(the ≥ TZS 1,000,000 two-officer hold comes from a **different authority** and a Gaming Board
instruction about identity-on-withdrawal does not repeal it; `payments.ts` contains no identity
reference at all and so cannot be weakened by this) · the human review queue.

### 🔴 THE LEVERS THIS COST US — recorded because they were real controls

1. **`forceReverifyKyc` is no longer a money control.** Its entire stated purpose was to "re-lock
   withdrawals". It now changes a player's KYC state and nothing about their ability to be paid.
   Four surfaces that said otherwise were corrected. What an officer has instead: **wallet freeze**,
   **payout pause**, **the AML two-officer hold**.
2. **`withdraw()` has no `user.status` check and no self-exclusion check.** With the identity gate
   gone, `wallet.status !== "ACTIVE"` is the only account-level control inside the function.
   Suspension and self-exclusion are enforced upstream by session revocation — which stops a
   *player*, not a call arriving without a session. The two **operator** retry paths
   (`retryWithdrawalAction`, `bulkRetryAction`) call `withdraw()` directly and pass neither those
   nor the route-level payout pause; the identity gate used to stop them for unverified accounts as
   a side effect, and no longer does. An actor is now threaded through so the record names the
   **officer** rather than the player. ⛔ The controls themselves were **not** changed here — that
   is a separate decision, disclosed rather than quietly patched.
3. **The payee-name lookup was ungated on purpose.** It was KYC-gated, and leaving it would have
   switched off the one check that catches a mistyped payout destination for exactly the population
   this opens up — silently, since it fails by returning no name. Its rate limit is now the only
   control against name enumeration.

### ⚠️ THE RECORD IS FAIL-OPEN, AND THAT IS DISCLOSED

`audit()` keeps the entry in a per-instance in-memory ring and lets the request proceed if the
database write throws. So under a database outage a payout can succeed while the record explaining
it does not durably persist — on the one path where that record is the only evidence. Stated to the
Board rather than presented as durability we have not built.

### ⛔ THE ATTRIBUTION WAS REWRITTEN, OR THIS GETS REVERTED

`docs/FLOWS.md` cited the *"TZ Gaming Board model"* as the **reason** the gate existed. Left
standing, that sentence invites a future session to re-add the gate by reading our own docs
correctly. It now records the removal, dated, naming this instruction. Four player-facing surfaces
additionally asserted that the **Tanzania Gaming Act requires** verification before withdrawal — a
legal claim the instruction contradicts — and one FAQ cited the Gaming Act *and* the AML Act. The
Gaming Act claims are gone; the AML attribution is kept, because it is true.

### 🔴 WHAT IS NOT PROVEN — the seal was waived

**No unverified player has completed a withdrawal on production.** The end-to-end seal moves real
money to a real mobile-money account and was **waived by Ali on 2026-08-20** — *"proceed without
this real test, if anything happens we detect later in live testing."* The change is proven by
green guards, twelve mutations and re-anchored live drives; the **payout leg is unproven**. Filed as
**`E-177`** so it is not mistaken for passed.

---

## 2026-08-20 · FOUR ways to prove who you are — NIDA is no longer the only accepted document

**Owner decision:** Ali, 2026-08-19. *"We have to give options for KYC, not just NIDA. One of
them: mandatory NIDA, or passport number and attach passport front page, or driving licence
number and attach driving licence front, or voting card and attach it. One of them works for us,
not just NIDA."* And, on the two undocumented formats, 2026-08-19: *"for now driving and voting,
keep them open — later we change."*

**The rule, in one line:** a player proves identity with **any ONE** of **NIDA**, **passport**
(+ bio page image), **driving licence** (+ front image) or **voter's card** (+ image). Full
statement, with every enforcement point: [`docs/IDENTITY-POLICY.md`](IDENTITY-POLICY.md).

### 🔴 THE RESIDUAL GAP — stated to the Board, in writing, and NOT closed

**One human legitimately holds a NIDA *and* a passport *and* a driving licence *and* a voter's
card.** The uniqueness rule is `(document type, document number)`, enforced by a partial unique
index at the database level. It stops **the same document** being used on two accounts. It does
**not** stop **one person** opening two accounts on **two different documents**.

⛔ **Nothing in the codebase can close this, and it is not an oversight.** It is the direct,
accepted consequence of the instruction above. Only two things could close it, and both are
excluded:

1. **NIDA-as-mandatory** — which is precisely what this decision removes.
2. **A cross-document identity match** against an authority — which would require an authority
   check. There is none, for any of the four, by owner decision (2026-07-19), and none is wired.

⚠️ **So the control that catches it is the HUMAN REVIEWER, and only the human reviewer.** The
officer sees the name, the declared date of birth, the document image and a selfie on every
submission. A second account opened by the same person on a different document is the case they
are positioned to catch, and it is the only place it can be caught.

⛔ **And one consequence must not be misdescribed anywhere:** a `DUPLICATE_IDENTITY` rejection on
one document does **not** prevent that person submitting a different one. No surface, report or
statement to the Board may imply that it does.

**Flagged for Ali and for the GBT file.** If the Board's position is that one natural person must
hold exactly one account regardless of which document they present, that requirement cannot be
met by this platform without an authority check, and the answer is a policy change rather than a
code change. Test it once, on this entry.

### What changed

| | |
|---|---|
| **The identity fact** | `KycSubmission.nidaNumber` → the tuple **`idType` + `idNumber`**, plus `idExpiry` and `idVerifiedAt`. ONE identity number per submission, whatever document it came from |
| **The uniqueness rule** | partial unique index **`KycSubmission_idType_idNumber_active_key`** on `("idType","idNumber") WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'` — the **exact** `WHERE` semantics of the 2026-07-31 NIDA index it supersedes, so a REJECTED submission still frees the number |
| **Formats** | NIDA `^\d{20}$` with digits 1–8 validated as a real calendar date (🟢 published) · passport 9 alphanumeric as an **advisory** shape that flags but never refuses (🟡 secondary sources only) · driving licence and voter's card **openly unformatted** (🔴 TRA and NEC publish nothing), held to a stated 4–20 alphanumeric sanity band |
| **Expiry** | captured, and **refused at submit**, for the two documents that carry one (passport, driving licence). Re-checked again at submit-for-review. ⛔ Never asked for on a NIDA or a voter's card |
| **Images** | per document: NIDA front + back + selfie · the other three, one document image + selfie |
| **Failure reasons** | `nida_taken` → **`id_taken`**, `nida_not_verified` → **`id_not_verified`**, plus new `id_number_format`, `id_expired`, `id_expiry_required`. Union member, registry row and dictionary key moved together in one commit |

⭐ **THE SELFIE IS STILL REQUIRED ON ALL FOUR, and that is deliberate.** *"Selfie matches the ID
photo"* is one of the officer's four recorded attestations. Dropping it for three of the types
would have removed the human control in the same change that widened the document list — the one
thing the policy says this change must not do.

⛔ **AND THE AGE GATE IS NOT DERIVED FROM THE NUMBER.** Only a NIDA carries a date of birth
inside it. An UNDERAGE check read out of the number would pass for the other three *because the
feature is absent*. The gate is on the **declared** date of birth, enforced twice (Zod at parse
time, and the service above the per-document branch), and asserted per document type.

### 🟡 What is deliberately NOT enforced, and why

**We did not invent a driving-licence or voter-card format.** TRA's own driver's-licence guide
describes the card and not the number; NEC/INEC material confirms a voter number exists and does
not publish its shape. ⛔ A wrong regex on a national ID **locks a real citizen out of their own
money**, and a format-rejected submission never reaches the human who is the actual control — so
a permissive field is the safer error here. This is the same discipline `updown-symbols.ts`
applies to silver and platinum, and it is **instructed**, not assumed. A later session does not
get to tighten either on a guess: adding a rule is a one-line change to that document's entry in
`src/lib/id-documents.ts`, **with its citation beside it**.

**Ali asked for "100% accurate" sizes.** The honest form of that is a **sourced rule where a
source exists and a stated absence where none does** — two of the four are enforced from a
source, one is advisory from secondary sources, and two are deliberately permissive with the
absence written into the catalogue, this entry and the officer's own screen.

**No PDF uploads.** A passport scan arrives as a photograph like everything else. The storage
seam validates image magic bytes, the client downscales to stay under the 3 MB cap, and the
officer's viewer is an `<img>`; admitting PDFs would mean a second validation path, a second
viewer, and an active-content format on an identity page. Decided, not overlooked.

### What was NOT touched

- ⛔ **`TWO_PERSON_THRESHOLD_TZS` and `/admin/aml` are untouched.** Those come from the AML/FIU
  regime, a **different authority**. A Gaming Board instruction about which documents are
  accepted does not repeal an AML threshold.
- ⛔ **KYC remains a precondition of withdrawal.** Board instruction #1 (remove that gate) had
  **not** landed when this shipped — `wallet-service.ts` still requires `APPROVED` — and this
  unit deliberately does not pre-empt it.
- ⛔ **No `nidaNumber` value was rewritten or discarded.** The migration BACKFILLS the existing
  rows into the new tuple (`idType='NIDA'`) and changes nothing about them.

### ⚠️ One deliberate piece of debt, with its discharge named

The migration is **EXPAND ONLY**: `nidaNumber` and `nidaVerifiedAt` are kept, and mirrored on a
NIDA submission by exactly one write site. Railway health-checks a new deployment while the OLD
container is still serving, and Prisma selects every scalar column — so dropping them in the same
migration would have returned a 500 on every KYC read (`/profile/kyc`, `/wallet/withdraw`,
`/admin/kyc`) for the length of the switch, on an identity path.

⛔ **Nothing reads them**, and `npm run test:id-documents` §9 fails if anything starts to. ⚠️ **BOTH HALVES OF THAT SENTENCE WERE FALSE — see the amendment below:** the store layer held two readers, and §9 allowlisted the file they lived in.
**The contract step is: a follow-up migration dropping `nidaNumber`, `nidaVerifiedAt` and
`KycSubmission_nidaNumber_active_key`, once the expand release has been stable on production.**
Until that lands, this entry is the record that the duplication is time-boxed and intentional.

> #### ✅ AMENDED 2026-08-20 — the debt is being discharged, and in TWO releases
>
> ⚠️ **This paragraph named THREE objects and there are FOUR.** `@@index([nidaNumber])`
> (`KycSubmission_nidaNumber_idx`, created 2026-06-14) was not listed. It goes with the column.
>
> ⚠️ **And "nothing reads them" was true of PRODUCT code only.** `prisma-dal.findByNida` /
> `findActiveByNida` read the column — with zero callers — and §9, the guard cited here as
> proof, **allowlisted the file they lived in**. The claim was never tested. §9 has been
> re-pointed at every spelling across all of `src/`, with no allowlist, plus the schema and
> the absence of a number-only duplicate read.
>
> **Step 1 shipped 2026-08-20:** the fields left `prisma/schema.prisma`, the mirror write,
> the DTO, the two dead readers, eleven fixtures, both race proofs and one data-migration
> script — **with no DDL**. **Step 2 shipped 2026-08-20** as
> `20260821090000_kyc_drop_nida_legacy`, in the release after it, once `/api/health`
> confirmed the step-1 container was serving and `leadership.lifecycle.isMe: true` showed
> the previous instance had stopped renewing the lifecycle lease.
>
> ⭐ **From step 2 on, `KycSubmission_idType_idNumber_active_key` is the SOLE enforcement
> of one-document-one-account** — a P0 AML control that a NIDA used to have twice.
> `test:kyc` §2d therefore proves it at service level for a **passport** as well: the
> duplicate refusal, the `status <> 'REJECTED'` half that frees a rejected number, and a
> control showing the same digits under a different document type are a different
> document. All three proved RED by mutation.
>
> ⚠️ **And nothing in the platform had ever read a contract migration.** `test:cert-d1`
> hard-coded two migration paths, and its "does NOT drop the deprecated columns" check is
> scoped to the *expand* file — so a contract migration that dropped the wrong index,
> forgot `KycSubmission_nidaNumber_idx`, ran `CONCURRENTLY` inside Prisma's transaction or
> was not re-runnable would have been caught by **no suite**. §3b now reads it: nine
> assertions, three of them proved RED.
>
> 🔴 **THE ORDER IS THE SAFETY ARGUMENT, and the hazard was recorded five times with the
> wrong blast radius.** Every statement of it — including the paragraph above — named
> `/profile/kyc`, `/wallet/withdraw` and `/admin/kyc`. But `createSession` calls
> `db.kyc.findByUserId` **unguarded on all three login paths** (`auth-service.ts:353`,
> `:911`, `:952`), so dropping a column a previously-deployed container still selects is
> **sign-in, platform-wide** — and `/api/health` never touches `KycSubmission`, so nothing
> would have reported it.

### Where it lives

`src/lib/id-documents.ts` (the catalogue — one entry per document, the ONLY place a format is
declared) · `src/lib/server/kyc-service.ts` (`submitIdentityStep`) ·
`prisma/migrations/20260820120000_kyc_identity_document` ·
`src/app/profile/kyc/page.tsx` (the chooser, built from the kit's one filter control) ·
`src/app/admin/kyc/[id]` (the reviewer's per-document screen).
Guards: `npm run test:id-documents` (192 assertions, every refusal beside a positive control) ·
`npm run red:id-documents` (**18 injected defects, 18 caught**) · `npm run test:cert-d1` ·
`npm run test:failure-reasons`.

---

## 2026-08-14 · ONE fee for both games — Up & Down moves to `loser-share`

**Owner decision:** Ali, 2026-08-14. **This SUPERSEDES § 2026-07-24 item 1** below, which put
Up & Down on `capped-commission` at 13% of the pool with a ⅓ ceiling.

**The rule, for both games, identically:** our fee is **13% of the LOSING side** — Platform 3%
+ Operator 10%. Full statement, with enforcement and configuration for every rule:
[`docs/RULES.md`](RULES.md).

**Why.** Two charge models needed a diagram to explain and produced two different answers to
"what do you take?". One model the customer can understand is worth more than the difference.

### The two consequences, both accepted, both recorded

**1. Our income halves on a balanced round.** 13% of the whole pool becomes 13% of half of it:
a balanced TZS 10,000 round yields **TZS 650** where it used to yield TZS 1,300. On the
lopsided case the fall is larger still — a 9,000/1,000 pool goes from 333 to 130. Deliberate.
⛔ Do not "restore" the ceiling to protect income. `test:updown-config` §4.2/§4.3 pin both
numbers, and `red:updown-cutover` includes the mutation that takes the fee on the whole pool
precisely because it is the tempting one.

**2. 🔴 UP & DOWN IS NO LONGER OUTCOME-NEUTRAL — and that needs saying plainly.**

`capped-commission` reads only the two pool sizes, so its fee is byte-identical whether YES or
NO wins. `docs/F6-LIQUIDITY-DESIGN.md` §3.1 names that as the pari-mutuel licence anchor, and
it is the reason the 2026-07-24 ruling chose it for Up & Down — that entry says in as many
words that Up & Down therefore sat *closer* to the licence posture than long-form polls.

`loser-share` charges a slice of whichever side **lost**, so it is outcome-DEPENDENT by
construction. On a 7,000/3,000 pool the fee is 390 if YES wins and 910 if NO wins.

This is **not new to the platform**: long-form polls have been outcome-dependent since
2026-07-23, under Ali's explicit override of the same property. What 2026-08-14 does is
**extend that existing override to the second product**, so that the platform now has one
posture rather than two. It is recorded here, rather than left implicit, because a compliance
record that documents an override for one product and silently applies it to another has a
hole in exactly the place an auditor will look.

⚠️ **Flagged for Ali and for the GBT file.** The fee remains a function of the pools and the
outcome only — never of the identity of a bettor, never adjustable after a round opens, and
always disclosed before the bet. The winner floor still holds by construction under
loser-share (a winner keeps their stake plus a share of a net pool that can never be smaller
than the winning pool). If the Gaming Board's position on outcome-neutrality needs testing,
test it once, for both products, on this entry.

### What was NOT touched

- ⛔ **No `feeSnapshot` was rewritten, backfilled or migrated.** 4,146 Up & Down rounds and 58
  legacy polls stay frozen on `capped-commission` and settle by it forever. `test:updown-cutover`
  settles a legacy round beside a new one in the same process and asserts they differ.
- ⛔ The price band, the tick floor and `computeTargets` are untouched. This was a fee change.
- The ⅓ `feeCeilingRate` remains present in the profile and **inert** — `poolFee`'s loser-share
  arm never reads it. It is kept defined so a reader of an old snapshot never sees `undefined`.

### Where it lives

`DEFAULT_UPDOWN_CONFIG.defaultRateProfile` (`src/lib/server/updown-config.ts`) ·
`reconcileUpDownDefaults` v4, which moves a persisted config still on the exact retired default
and leaves a deliberate operator profile alone · **`ops:updown-loser-share`**, which migrates
the 16 `UpDownChain.rateProfile` rows one at a time, audited — they carry their own copy and do
**not** inherit the default, so the constant alone changes nothing a player can see.
Guards: `npm run test:updown-cutover` (23 assertions, both models settling on the real path) ·
`npm run red:updown-cutover` (6 mutations, including "history repriced" and "not switched").

---

## 2026-08-14 · A human approval wins — the AI confidence threshold is an autopilot gate, not a licence rule

**Owner decision:** Ali, 2026-08-14, after three false "publish failed" reports on live markets.

**The decision, in one line:** *the 75-confidence threshold applies only to publishing with
no human in the loop.* Where an officer has read a candidate and approved it, that approval
is the authority, and the score does not overrule it.

**Why the question arose.** `/admin/ai-polls` publishes a poll an officer has ALREADY
approved by running it through the market-candidate pipeline — ingest → filter → verify →
score → approve — so the candidate record carries the same audit trail as one that came
through the unattended route. `scoreCandidate` sent anything below
`CONFIDENCE_PUBLISH_THRESHOLD = 75` to `FILTERED_OUT`. `approveCandidate` then returned
`null`, **and its return value was discarded**, so `createMarket` ran anyway and put a LIVE,
bettable market on the board; `markPublished` refused because the candidate was not
`APPROVED`; and the officer was told the publish had **failed**.

It fired three times on production, every one of them on a market that was live:

| when | market | state |
|---|---|---|
| 2026-08-11 05:05 | `mkt_034555d0c988640474d8` | LIVE · 2 bettors |
| 2026-08-14 08:25 | `mkt_49303bbf4faec0e38524` | LIVE · TZS 15,000 staked |
| 2026-08-14 08:36 | `mkt_02fe245420ecec12fc80` | LIVE · 0 bettors |

All three audit rows read `pollLinked: true, marketPublished: false`. The console told an
officer a market did not exist while players were betting in it — and the error text said
*"Do NOT retry"*, which is the one instruction that would have made it worse.

**What the threshold is for, stated so it is not re-litigated.** It is the **autopilot's
admission test**: it stops the unattended pipeline (news → extract → filter → verify →
score) promoting a weak candidate on its own. That is a real control and it is unchanged —
an unattended candidate scoring 52 is still `FILTERED_OUT`, and `test:aipoll-publish` asserts
it in the same run as the waiver, so "fix the false alarm" and "delete the gate" cannot pass
the suite identically. What changed is only its **scope**.

**Nothing is hidden.** The confidence is still recorded on the candidate and still shown to
the officer. A waived gate is written into the candidate's own layer-4 trace
(`scored:52:human_approved:{…}`) and audited as `candidate.confidence_gate_waived`
(category COMPLIANCE), so an auditor reading the record months later sees the override
rather than inferring it from a gap.

**And a second, independent rule — nothing goes live off a broken pipeline.** Every
pipeline step's return value is now checked, and checked **before** `createMarket`. Creating
a market is the irreversible act — it can only be voided with refunds, never un-created — so
it is the last thing that happens, after everything that can still fail has. That ordering is
the safety property; the scoping decision above is what stops it being exercised.

**Where this lives.** `src/lib/server/ai-poll-publish.ts` (extracted from
`publishPollAction` so it can be executed by a test at all) ·
`scoreCandidate({ humanApproved })` in `src/lib/server/market-candidate.ts` ·
`npm run test:aipoll-publish` (33 assertions) · `npm run red:aipoll-publish` (6 mutations,
including the production defect verbatim, with a positive control).

---

## 2026-07-24 · "Up & Down" product line — fee basis, instant settlement, notification digest

> ⏳ **DECIDED, NOT YET LIVE.** The decisions below are owner-authorised as of
> 2026-07-24 and the architecture is built around them, but the behaviour ships in
> Phases 3–5. Nothing in production behaves this way yet. This entry exists now so a
> future session does not "correct" the design back to the platform default without
> realising it was a deliberate, dated choice. Update this block when it goes live.

**Owner decision:** Ali, explicit, 2026-07-24, on a presented trade-off with the
arithmetic and the risks on the table.

**What Up & Down is.** A second product line: short-term price rounds (5/15/30 min) on
Gold and Silver, running in continuous chains. Each round is a `PredictionMarket` row
(`productLine: "UPDOWN"`, UP = YES, DOWN = NO), so **every money path — bet, settle,
refund, ledger, audit — is the existing, proven code.** Spec: `docs/UPDOWN-SPEC.md`.
Architecture: `docs/UPDOWN-ARCHITECTURE.md`.

### 1. Fee basis — `capped-commission` at 13% of the pool

> ⛔ **SUPERSEDED 2026-08-14.** Up & Down now charges `loser-share` — 13% of the LOSING
> side — exactly as long-form polls do. See the § 2026-08-14 entry at the top of this file,
> and [`docs/RULES.md`](RULES.md) §2.1. **Everything below remains a true account of the
> 2026-07-24 decision and of how the rounds frozen before the cutover still settle** —
> ⚠️ (**4,220** of them as of 2026-08-14 18:28 — read the live count from
> `scripts/live/ops/loser-share-settled.cjs` §4, never from a number typed here: it grew from
> 4,146 between this note being written and the cutover, and a stale count in a compliance
> document is exactly the kind of thing a regulator checks.)
> it is history, not the current rule. In particular the outcome-neutrality argument it makes
> no longer describes Up & Down; the 2026-08-14 entry records that consequence explicitly.

Up & Down rounds freeze `feeModel: "capped-commission"`, `commissionRate: 0.13`,
`feeCeilingRate: 1/3` — i.e. `fee = min(0.13 × pool, ⅓ × smaller side)`.

The management proposal is built on "13% commission on the total poll volume"
(TZS 1,300 on a TZS 10,000 pool). The platform default is `loser-share` — 13% of the
**losing** pool — which on a balanced round yields TZS 650, **half** the proposal's
figure. Rather than invent a third model, this uses the `capped-commission` maths that
already exists and is already tested (`test:fee-model`, 77 assertions) at a 13% rate,
which reproduces the proposal's number exactly.

**Why this is the safer of the two for the licence:** `capped-commission` is
**outcome-neutral** — the fee is a function of the two pool sizes and nothing else, so
it is byte-identical whether UP or DOWN wins. That is the property the pari-mutuel
licence rests on (`docs/F6-LIQUIDITY-DESIGN.md` §3.1). `loser-share`, the model
long-form polls now use, is outcome-dependent and was itself an explicit owner
override. Up & Down therefore sits *closer* to the licence posture, not further from it.
The ⅓ ceiling preserves the winner floor: a winning bet can never be paid below stake.

⛔ **The two models never mix.** The model is frozen per poll at creation; long-form
polls keep `loser-share`, Up & Down rounds keep `capped-commission`, and
`snapshotOrLegacy` reads only what each poll froze.

### 2. Settlement is IMMEDIATE — the objection window does not apply

Winners are paid the moment the outcome is confirmed. The platform-wide 24-hour
objection window is **not** applied to Up & Down rounds.

**Why.** A five-minute round that pays out tomorrow is not a five-minute round. Holding
~800 pools/day open for 24 hours would also mean thousands of unsettled pools standing
at any moment.

**What still protects the money — none of this is bypassed:**
- The **standing-objection freeze** still runs. Settlement calls the normal
  `settleMarket()` gate, **not** `force`, so an objection filed against a round still
  stops its money.
- The already-settled idempotency guard, the winner floor and exact conservation are
  untouched.
- Every round stores a **full settlement proof**: open price, close price, both source
  links, and **both timestamps the source itself quoted**. This is materially stronger
  evidence than a long-form poll carries, because it is machine-checkable by the player.
- Disputes are handled **after** payout, with `emergencyVoidMarket` as the audited
  reversal path.

**The honest limitation, stated plainly:** the pre-payout dispute window is the control
being traded away. It is replaced by stronger evidence and a post-payout reversal, not
by nothing — but a player cannot freeze a round before it pays.

### 3. Per-round notifications are digested

Per-round bet-placed / win / loss **notifications and emails are suppressed** for
Up & Down and replaced by an in-app result plus a **daily digest**. A player running
twenty rounds an hour would otherwise receive forty emails, which is both unusable and
a worse RG signal than a single readable summary.

⚠️ **The money record is NOT digested.** Transaction, ledger and audit rows are written
per round exactly as today. Only the player-facing *notification* is aggregated. Loss
notifications remain direct and non-euphemistic within the digest (LCCP harm-prevention
— see the loss-notification rule in `CLAUDE.md`).

✅ **IMPLEMENTED 2026-08-03** — `src/lib/server/updown-digest.ts`, on the lifecycle ticker.
Until then only the *suppression* half existed, and the digest sentence above was a claim about
a system that did not exist: measured on production, **0 of 13 winning and 0 of 11 losing** Up &
Down positions had ever produced a notification. Worse, `perEventNotificationsSuppressed` was
never applied to the refund emitters, so **56 of 56 refunds did** — the policy kept the one
outcome where nothing happened to the player's money and deleted the two that moved it. Both
halves are now closed; the digest states wins, losses **and** refunds, each with its own count
and its own figure, and the loss clause is never folded into a net number. Guarded by
`npm run test:updown-digest` (72 assertions, proven RED against six reintroduced defects).

### 4. Resolution stays on the AI sentinel

No external price-feed contract. The cost/latency/determinism trade-off was presented
and the AI path chosen. It is made sound by an **immutable observation ledger**: a price
is read once per (asset, grid boundary) and shared by every round edge on that instant,
enforced by `@@unique([assetId, boundaryAt])`. Consequences: one AI call per asset per
boundary instead of one per round, and round N's close **is** round N+1's open — so the
AI can never disagree with itself between adjacent rounds, because it is never asked
twice. A reading whose source-quoted time is too far from the boundary is **refused**,
and a boundary that will not confirm **VOIDs its rounds with a full refund** rather than
settling on a guess.

**Guardrail for future work (⛔):** do not "optimise" the observation ledger into
per-round price columns, and never update a CONFIRMED observation's price. Both would
silently reintroduce the possibility of two adjacent rounds disagreeing about the same
instant.

---

## 2026-07-24 · Single-admin resolution by default; two-admin authorization optional; officer-conflict block removed

**Owner decision:** Ali, explicit, 2026-07-24 (authorised in-session): *"when solo admin, allow
him to resolve even if he holds a position in it — we should end this matter forever,"* and *"one
place controls one thing."*

**What changed.** Market resolution used to be a mandatory **two-officer ceremony** (stage-1 by A,
stage-2 by a different B), and an officer holding a position was **hard-blocked** from resolving.
Both are retired:

- **Single-admin resolution is the permanent DEFAULT, in ALL money modes (LIVE and TEST).** One
  admin resolves any market in ONE action — **including a market they hold a position in.** Their
  own position settles like any player's.
- **Two-admin authorization is an OPTIONAL toggle** (`resolution-policy.ts`, flag
  `requireTwoOfficer`, default `false`), switchable from the **resolver-queue header** only —
  ONE control, ONE place. When ON, the classic two-distinct-officer ceremony returns (B ≠ A gate).
- **There is NO real-money hard-lock** on this — unlike the (now-removed) 2026-07-17 solo-override.
  It is the owner's call in every mode, consistent with the auto-resolve precedent (below).
- **The officer-conflict block is deleted** from `resolveMarket` AND `emergencyVoidMarket`.

**Why this is acceptable to the compliance posture:** the relaxed control is the *pre-payout*
authorization step, not the money movement. Every payout is still gated by the untouched controls —
the objection window (`TOO_EARLY`), the objection freeze (`OBJECTION_OPEN`), the already-settled
idempotency guard, the winner-floor and exact-conservation — and **every** resolution writes an
immutable ADMIN audit (`market.adjudicated`) tagged `resolutionAuth: "single-admin" | "two-officer"`.
The toggle change writes a COMPLIANCE audit (`resolution.two_admin_enabled` / `…_disabled`). Player
and public surfaces state the truth: a single-officer resolution shows "Resolved by an officer
against the declared public source" (never a fabricated two-signature claim); the two-officer badge
shows ONLY for two genuinely distinct human officers.

**One-place-one-thing cleanup:** `test-overrides.ts` (`allowConflictedResolution`,
`getConflictedResolutionAllowed`, `isConflictOverrideHardLocked`, `setConflictedResolutionAllowed`,
`assertProductionComplianceLocks`), the conflict-override toggle + action, and the
`assertProductionComplianceLocks()` boot call are **deleted**. A `content-integrity` guard (`RESOLVE`)
fails the build if any of those symbols — or an import of `test-overrides` — returns to `src/**`.

**Guardrail for future work (⛔):** do NOT re-add an officer-conflict block or a second place that
edits the two-admin flag (e.g. RateConfig / `/admin/config`). The single flag lives only in
`resolution-policy.ts`, set only from the resolver-queue header.

**Code:** `src/lib/server/resolution-policy.ts` (the one flag) · `market-service.ts`
(`resolveMarket`, `emergencyVoidMarket`) · `admin/resolver-queue/` (two-admin-toggle +
resolution-policy-action + page + resolve-controls) · `admin/resolver/[id]/` (page +
resolution-ceremony) · `resolution-panel.tsx` · `markets/[id]/page.tsx` · `page.tsx` ·
`fairness/page.tsx` · `i18n-dict.ts` · `email.ts`.
**Tests:** `test:two-admin` (single-admin default incl. position-holder + money conservation; two-admin
B≠A; simulated-LIVE no hard-lock; audit, 18/18) · `test:officer-conflict` (position-holder can
resolve/void; evidence; predicate, 21/21) · `test:settlement-gate` (single-admin path hits the same
gate, 121/121) · `content-integrity` `RESOLVE` guard.

---

## 2026-07-24 · Operator-switchable payment provider (mock ↔ Selcom), any money mode

**Owner decision:** Ali, explicit, 2026-07-24: *"we are admins, we control the system — allow us to
toggle anytime, LIVE or TEST; we can change later."*

**What changed.** The mock provider used to be **hard-locked off whenever real money was LIVE** —
`setPaymentControls` refused to persist `provider=mock`, `resolveActiveAdapter` refused at dispatch
(`PROVIDER_DOWN` + SECURITY audit), and `demoAsync` was force-off. That forced pre-launch testers
onto real Selcom. Those hard-locks are **removed**. Admins may now switch the provider — **including
to the mock** — from `/admin/payments` in **any** money mode, with no Railway env change or redeploy.

**The guardrails that replace the locks (not blocks):**
- **The mock is a self-contained simulator** — it does not touch the real payment gateway in either
  direction. Selecting it while real money is LIVE is a deliberate **simulation**.
- **Typed confirm.** Switching to the mock while `isLiveMoneyMode()` requires typing `MOCK` in the
  control-plane confirm (hard tier).
- **Persistent banner.** While the mock is active on real money, `/admin/payments` shows a loud,
  role="alert" banner (`simulationActiveOnLiveMoney`) and the active-provider chip reads "· SIM";
  the boot alarm logs a NOTICE. It can never run silently.
- **Audited.** The switch writes a COMPLIANCE audit (`payments.simulation.activated`), and each
  dispatch under the live-money simulation leaves a `payments.simulation.dispatch` breadcrumb.
- **The ONE surviving gate:** a REAL provider (`selcom`/`azampay`) still cannot be selected until its
  credentials are present — otherwise every call would fail.
- **The kill-switch remains the emergency STOP** — to halt payments, use it, not the mock.

**Why this is acceptable:** the state is impossible to reach by accident (typed confirm), impossible
to leave running unseen (persistent banner + audit + boot notice), and cannot move real funds (the
mock does not reach the real rail). Provider selection is an operational, reversible control — not a
money-minting one (that is `TEST_FUNDING`, which stays deployment-level and is NOT here).

**Code:** `src/lib/server/payment-control.ts` · `payments.ts` (`resolveActiveAdapter`) ·
`admin/payments/control-plane.tsx`.
**Tests:** `test:payment-control` (mock selectable + dispatch runs the simulator in LIVE; demo-async
settable; credential gate remains; simulation flag, 39/39) · `test:payment-killswitch` (kill-switch
still the stop, 11/11).

---

## 2026-07-24 · Per-market scheduled resolution: operator-controlled auto-resolve + timer-driven settlement

**Owner decision:** Ali, explicit, 2026-07-24 (authorised in-session), as part of replacing the
poll-everything lifecycle sweep with a precise **per-market timer** keyed to each market's own
resolution date (`src/lib/server/market-scheduler.ts`).

Two compliance-relevant postures change here. Both are deliberate.

### 1. Auto-resolve — the operator's toggle governs, in BOTH money modes

**Control:** `resolutionMode` — `"human"` (default) or `"auto"` — global at
`/admin/resolver-queue` (kit `Toggle` + `ConfirmModal`), with an optional per-market override
(`PredictionMarket.resolutionMode`).

- **`human` (default):** at a market's resolution time the AI web-checks the outcome and
  **pre-fills a recommendation**; two officers then seal + settle it. Unchanged behaviour.
- **`auto`:** the AI **seals the outcome itself** — stamping RESOLVED and opening the objection
  window — **without the two-officer ceremony**.

**This overrides the two-officer / POCA §16 rule when enabled.** Ali's directive was explicit:
*the toggle works as toggled — LIVE or TEST, the operator decides.* So, unlike the
solo-resolution override below, there is **deliberately NO real-money hard-lock** on this control.
It is the owner's call, taken with the consequence stated on screen (the confirm dialog is sterner
still when real money is LIVE).

**The safety floor that is NOT negotiable (and must not be removed):**
- **Never auto-resolve on a shaky signal.** Auto fires only when ALL hold: the AI returned a
  concrete YES/NO (never UNKNOWN), said the outcome is irreversibly *determined*, cleared
  `resolveConfidenceThreshold` (default **90**, min 50), and supplied real evidence (a
  hallucination guard). Anything less **always** falls back to the human ceremony. This is the pure,
  exhaustively-tested `decideAutoResolve()`.
- **Money still waits.** Auto-resolve adjudicates only — it moves no money. The objection window,
  the objection freeze, the winner-floor and exact-conservation all still gate the payout.
- **Never silent.** Every auto-resolution writes a COMPLIANCE audit (`market.autoresolved`) with the
  AI's outcome, confidence, evidence, reasoning and source URL; every mode change writes
  `market.resolution_mode.auto_enabled` / `…human_restored` with the money-mode it was made in.

### 2. Settlement is timer-driven — `AUTO_SETTLE` is removed

**What changed:** the `settleDueMarkets()` sweep, its heartbeat, the `AUTO_SETTLE` env var, the
`autoSettle` control-plane toggle and `getAutoSettleEnabled()` are **all deleted**. Each
adjudicated market now carries its own **settle timer** that fires at its `objectionsClosedAt` and
calls the unchanged `settleMarket()`.

**This reverses the earlier "automatic market payout is PAUSED" posture** (Ali, 2026-07-13), under
which every payout was a manual officer action. That entry is superseded — do not restore it.

**Why this is safe:** the pause was a coarse "nothing pays itself" switch standing in for the real
controls. Those real controls are untouched and are re-checked under the market lock on every
attempt: the objection window (`TOO_EARLY`), a standing objection (`OBJECTION_OPEN`), the
already-settled idempotency guard (no double-pay), the winner-floor assertion, and exact
conservation. **The payout maths is byte-for-byte unchanged** (loser-share / capped-commission per
the poll's frozen snapshot — see the 2026-07-23 entry). Settlement credits a player's 50pick
wallet; it is not a gateway disbursement, so it does not depend on the withdrawal rail.

**What remains as the human fallback:** `/admin/settlement` keeps the manual **Settle now** button
and the objection-frozen view. Anything sitting in "Ready to settle" now means a timer was dropped —
the ~5-minute `reconcileMarketSchedules()` backstop re-arms it, and `/admin/system` shows live
scheduler health (armed timers + next fire).

**Guardrails (⛔):**
- Do **not** re-introduce a `NODE_ENV`/real-money hard-lock on `resolutionMode` — Ali decided the
  toggle governs directly. (This is the deliberate *difference* from the solo-resolution lock below;
  the two controls are not the same and must not be "harmonised".)
- Do **not** lower or bypass the confidence floor, the evidence guard, or the UNKNOWN→human
  fallback. Auto-resolve on a shaky signal is the one thing this design must never do.
- Do **not** resurrect `AUTO_SETTLE`/`settleDueMarkets` or re-add a global settlement pause switch.
- Do **not** let the resolve trigger close a market **early** (before `resolutionAt`) when the AI has
  no locked outcome — the `early-noop` guard exists so a manual re-check cannot kill live betting.

**Code:** `market-scheduler.ts` (timers, `nextDeadlineFor`, boot hydrate, reconciler) ·
`market-service.ts` (`resolveDueMarket`, `decideAutoResolve`, per-market notify transitions) ·
`market-sentinel.ts` (per-market AI check only — the global sweep is gone) ·
`market-config.ts` (`resolutionMode`, `resolveConfidenceThreshold`, `resolveOffsetMinutes`) ·
`admin/resolver-queue/` (mode toggle + per-market re-check).
**Tests:** `test:scheduler` (deadline matrix, >24.8-day timer chaining, boot hydrate never skips a
missed deadline, reconciler healing, concurrent-fire exactly-once, the full auto-vs-human matrix,
the early-re-check guard, and auto-seal → window → settle) · `test:settlement-gate` (the payout gates).

---

## 2026-07-23 · Fee model: "loser-share" (Jay) + pre-bet estimate — new polls

**Owner decision:** Ali, explicit, 2026-07-23 (authorised in-session), on the recommendation
of accountant Jay (`Proposal/50pick Calculations.xlsx`, reviewed in `docs/FEE-MODEL-DECISION-2026-07-14.md`).

**What changed (FUTURE polls only):** a new fee model, `loser-share`, is now the default a
new poll freezes at creation:
- **Fee = (platformFeeRate + operatorFeeRate) × the LOSING pool** (Jay's default: 3% + 10% =
  **13% of the losing side**), instead of `capped-commission`'s `min(commission·pool, ⅓·smaller)`.
- **Players see a fixed "possible winnings" estimate** pre-bet = `stake × (1 + estimatedWinningsRate)`
  (Jay's default 0.5 → **1.5×**), with a mandatory "estimate only — the pool sets the real
  amount" disclaimer. This is shown ONLY on `loser-share` polls.
- Admin-managed at **/admin/config → Fee model** (`feeModel`, `platformFeeRate`, `operatorFeeRate`,
  `estimatedWinningsRate`, `showEstimatedWinnings`); a change requires a confirm and is audited.

**Two compliance postures this DELIBERATELY overrides (for `loser-share` polls only):**
1. **Outcome-neutral fee (F6 §3.1).** `loser-share` is outcome-DEPENDENT — the fee is a slice
   of whichever side loses, so the same pools yield a different fee per outcome. This is an
   explicit owner override; the settlement audit records `payoutModel: "whole-pool-loser-share"`
   and the two rate slices so an inspector can still recompute it.
2. **Policy D3 (no pre-bet payout number).** `loser-share` polls show the fixed 1.5× estimate
   before betting. The disclaimer keeps it honest (it is a marketing estimate, not the payout).

**What did NOT change (the safety rails hold):**
- **No mint / no leak.** `Σ payouts + fee == pool` exactly, proven under `loser-share` by
  `money-invariants` (default is now loser-share), `jay-fee-model`, and `ledger` (double-entry).
- **Winner floor.** A correct call is never paid below its stake — `netPool = winningPool +
  losingPool·(1 − rate) ≥ winningPool`, `assertWinnerFloor` still enforced.
- **Taxes out of OUR fee.** TRA 10% + GBT 5% still come out of the 13%, never the player.
- **No mixed maths — the whole point.** The model is FROZEN per poll (`feeSnapshot.feeModel`,
  schema `v:2`). Every poll created before this change has NO `feeModel` and is read as
  `capped-commission` forever (`snapshotOrLegacy`), so existing/in-flight/settled polls are
  untouched. `capped-commission` remains fully implemented and tested (`fee-model.test.mts`,
  pinned to it).

**Where it lives:** `src/lib/payout.ts` (`FeeModel`, `poolFee(…, winningSide?)`),
`src/lib/server/market-config.ts` (RateConfig + snapshot), `market-service.ts` (settlement
passes the winner), admin `config/` (kit `Select` + `Toggle`, a kit `ConfirmModal` that warns
on EITHER model switch, and a per-model description that updates on select) + `markets/new`,
player `conviction-dial` / `bet-confirm-modal`, and the help FAQ / hedge copy (model-aware).
Golden test: `scripts/loser-share-fee.test.mts` (reproduces the accountant's sheet: 84,500 / 2,080).

**Naming (owner directive):** the product NEVER brands the model after the accountant. UI + code
call it **`loser-share`**; "Jay" appears only as the person who proposed it, and only in this
decision log. Do not reintroduce "Jay" into UI/code.

**Accountant visibility:** `/admin/finance` has a **"Settlement fees by poll"** card
(`analytics.settlementFeesByPoll(period)`) listing each settled poll's fee MODEL + fee + operator
net for the period, with per-model totals — so an accountant can reconcile which model applied to
which poll. The per-poll fee is recomputed from the poll's frozen snapshot (equals the booked
commission). The `/admin/markets/[id]` view also shows the model + both-outcome fees per poll.

**Guardrail (⛔):** do not "restore" outcome-neutrality or D3 for `loser-share` polls — the
override is intentional and owner-authorised. Do not change existing polls' frozen model. Do
not delete the `capped-commission` model (existing polls settle on it).

---

## 2026-07-21 · Player terminology: "one-sided market" → "one-sided win" (licence)

**Owner decision:** Ali, explicit, 2026-07-21 (authorised in-session). **Critical for the
GBT licence — apply everywhere.**

**What changed:** every textual occurrence of the term **"one-sided market"** (and
"one-sided markets") is now **"one-sided win"** — the player-facing disclaimer label in all
three locales, the code comments/audit-reason text, and the design docs:
- UI (`src/lib/i18n-dict.ts` → `market.oneSidedMarket`): EN "One-sided win" · SW
  "Ushindi wa upande mmoja" · ZH "单边获胜" (rendered on `/markets/[id]` when a pool is
  all on one side).
- Code: `market-service.ts` settlement comment + the `market.resolved.one_sided_refund`
  audit `reason` string.
- Docs: `F6-LIQUIDITY-DESIGN.md`, `perfection-plan.md`.

**What did NOT change (deliberate scope):**
- The **mechanic is identical** — a one-sided pool still issues a **full refund at 0% fee**
  (no money moves differently). Only the *label* changed.
- The disclaimer **body copy stays factually truthful** — it still explains that every stake
  is refunded and there is no opposing pool to pay winnings from. We do **not** claim anyone
  "wins money" on a one-sided pool (that would violate the A‑5 no-fabrication rule). The
  prominent term is the licence-preferred "win"; the explanation remains the honest refund.
- The **machine identifiers are unchanged** on purpose — the audit action stays
  `market.resolved.one_sided_refund`, and the code symbols (`isOneSided`, `notifyOneSidedRefund`,
  `oneSidedRefundHtml`, the `oneSidedMarket` i18n key, `oneSidedBody`) keep their names.
  Renaming symbols is refactoring with no licence value and real regression risk; the licence
  concern is the *text a player/regulator reads*, which is now consistent.
- Other "one-sided" **mechanic phrases** ("one-sided refund/pool/poll") are left as-is — they
  are not the "market" term and are accurate descriptions of the refund.

**Guardrail (⛔):** do not revert "one-sided win" back to "one-sided market" in player copy or
docs, and do not "correct" it to imply a real cash win — the body must keep truthfully
describing the full refund.

---

## 2026-07-17 · Solo-resolution override: real-money-state lock (replaces the NODE_ENV hard-lock)

> ⚠️ **HISTORICAL — SUPERSEDED by the 2026-07-24 "Single-admin resolution by default"
> entry above.** The `allowConflictedResolution` override, its hard-lock
> (`isConflictOverrideHardLocked`), the officer-conflict block and the whole
> `test-overrides.ts` module were **removed**. Single-admin resolution is now the
> permanent DEFAULT with no hard-lock, and two-admin authorization is the optional
> toggle. Kept for provenance; do NOT restore anything described below.

**Owner decision:** Ali, explicit, 2026-07-17 (authorised in-session).

**Control:** `allowConflictedResolution` (the "solo resolution" toggle on
`/admin/resolver-queue`). When ON it lets ONE officer resolve a market end-to-end
even if they hold a position in it — relaxing the POCA §16 officer-conflict block
AND the two-officer / self-countersign rule. Their own position settles like any
player's.

**Why POCA §16 matters:** a licensed operator must never let an officer with a
financial interest in a market decide its outcome — otherwise an admin could pay
their own bets with real money. This is a GBT licensing requirement.

**What changed:** previously (audit C7, 2026-07-15) the override was
UNCONDITIONALLY disabled whenever `NODE_ENV === "production"`. That made it
impossible to exercise solo-resolution on the production 50pick.tz deployment,
which blocked pre-launch testers. Per Ali's decision, the lock now keys off
**real-money state**, not NODE_ENV:

- `isConflictOverrideHardLocked()` = `NODE_ENV === "production" && TEST_FUNDING !== "true"`.
- `getConflictedResolutionAllowed()` returns `false` whenever hard-locked, else the
  persisted admin flag governs.

**Net behaviour:**
| State | Solo-resolution |
|---|---|
| Local / staging (`NODE_ENV !== production`) | admin flag governs |
| **Pre-launch prod** (`TEST_FUNDING=true`, test float, no real money) | **admin flag governs — testers CAN enable it** |
| **Real money live** (`TEST_FUNDING` unset at go-live) | **HARD-LOCKED off, flag ignored** |

**Why this is safe:** the relaxation is bound to the *provable no-real-money* state.
Unsetting `TEST_FUNDING` is already a **required go-live step** (`LAUNCH-GO-NO-GO`
§5) — the same action that stops minting the test float also auto-hard-locks
solo-resolution. You cannot have real money live with the override active. And
`TEST_FUNDING=true` on real money would itself mint un-ledgered money that the
nightly trial-balance screams about immediately, so the failure mode is already
loudly detected by an independent control.

**Defence-in-depth + trail:**
- The toggle action refuses to ENABLE when hard-locked (`enable_blocked` COMPLIANCE
  audit); it can always be turned OFF.
- The resolver-queue UI renders a clear "Solo resolve · locked (live)" disabled
  state when hard-locked, so a tester is never confused by a toggle that won't latch.
- The boot check logs loudly if the flag is left ON with real money live (runtime
  still forces it off), and a friendly note when it's active pre-launch.
- Every toggle and every actual bypass (`market.resolve.conflict_overridden`,
  `market.resolve.solo_overridden`) is written to the COMPLIANCE audit chain.

**Guardrail for future work (⛔):** do NOT re-widen `isConflictOverrideHardLocked()`
to a plain persisted flag, and do NOT revert it to a raw `NODE_ENV` lock without
re-reading this entry. The lock MUST stay coupled to real-money state.

**Code:** `src/lib/server/test-overrides.ts` · `admin/resolver-queue/conflict-override-action.ts`
· `admin/resolver-queue/conflict-override-toggle.tsx` · `admin/resolver-queue/page.tsx`.
**Tests:** `test:conflict-gate` (the lock matrix, 10/10) · `test:solo-resolution`
(full effects, 18/18) · `test:officer-conflict` (33/33).
