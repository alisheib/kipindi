# Agent fee & payments — seal the rail, and its planner

> 🟢 **THIS FILE IS BOTH THE BRIEF AND THE PROGRESS LEDGER.** §2 is the planner: it answers
> *"where did we reach?"* on any machine, in any session. ⛔ **Tick your row in the SAME commit
> that ships the work.** A tracker that lags is worse than none, because the next session trusts it.
>
> Opened 2026-09-10. Owner: Ali (Dar es Salaam). Target `https://50pick.tz` — the LIVE money app.
> There is no staging.
>
> **Peer session:** `docs/SUPPORT-CARE-CAMPAIGN.md` runs in parallel. Read §0.4 before you edit.
>
> **Grounding:** a ten-agent source survey (map → three independent designs → adversarial critique).
> ⚠️ **Nothing was executed against a running app.** Read §5 before trusting any behavioural claim.

## §0 · ⭐ THE AUTONOMY CONTRACT — you finish this, and you ship it

⛔ **THE OWNER IS AWAY. DO NOT ASK FOR APPROVAL TO COMMIT, PUSH OR PROCEED.** Standing authority
was given for exactly this shape of work: *"you always commit + push and continue, you have full
access… stop asking me each phase — test completely & perfectly, push and proceed."* Reconfirmed
2026-09-10 for this campaign: **finish, validate, push live.**

⛔ **AND THAT AUTHORITY IS THE REASON TO BE STRICTER, NOT LOOSER.** Every push to `main` is a LIVE
DEPLOY of a real-money platform serving real players, with no staging and nobody watching. The
contract below is what makes an unattended push defensible.

### 0.1 · The unit of work is ONE unit, sealed

Per ledger unit, in this order, no batching:
1. **Read the surface before you change it.** Not the file — the SURFACE, as a player or an
   officer meets it.
2. **Write the guard FIRST and PROVE IT RED** against today's tree. ⭐ Ask the standing question:
   ***"would this still pass if the feature were absent?"*** If the answer is yes, the guard is
   decoration — rewrite it. A guard that goes green without ever having gone red proves nothing,
   and this repo has been burned by that class repeatedly.
3. **Fix it.** Smallest change that seals the CLASS, not the instance. ⛔ Fixing a constant is not
   fixing the class — that mistake is why one of these units exists at all.
4. **Prove the guard GREEN**, and prove it still goes red if you re-break the fix.
5. **Run the full board:** `npm run test:all`. ⚠️ **Baseline is 311/324.** The 13 reds are named in
   `docs/LIVE-QA-CAMPAIGN.md`. **Anything else red is yours** — do not push past it, and do not
   re-baseline a ratchet to make your own red go away.
6. **Update the docs in the SAME commit** — this file's §2 ledger row ticked, plus any doc whose
   statements your change makes false.
7. **Commit by explicit path.** ⛔ Never `git add -A`.
8. **Push, then VERIFY THE DEPLOY** (§0.3).

⭐ **If a unit turns out to be bigger than one commit, split it into sealed sub-units** — each with
its own red-then-green guard and its own push. Never leave an unsealed half on `main`.

### 0.2 · The push gate — ALL of these, every time

- `git branch --show-current` — must be the branch you intend
- `git fetch origin`
- `git rev-list --left-right --count origin/main...HEAD` — know what moved under you
- `npm run test:all` — 311/324 baseline, nothing NEW red
- `npm run test:docs` — 2 pre-existing (the MONEY-GATE placeholder names); a 3rd is YOURS
- `git status --short` — nothing foreign staged
- `git commit --only <your paths>` — ⛔ never `-A`

⛔ **`git add <your-file>` followed by `git commit` still sweeps the OTHER session's staged files
into your commit.** That has happened in this repo. `--only` is not a style preference; it is the
fix.

### 0.3 · Deploy verification — a 200 is NOT proof your commit is live

After every push:
1. `https://www.50pick.tz/api/health` — confirm **`uptimeSec` RESET** (a low number). A healthy 200
   from the OLD container satisfies every naive check.
2. **Re-read the actual surface you changed** and confirm the new behaviour is present.
3. ⛔ If the deploy did not take, **stop pushing more units** and diagnose. Stacking commits on a
   failed deploy hides which one broke it.

### 0.4 · Two sessions, one `main` — the coordination protocol

Two sessions run these campaigns in parallel. **They cannot see each other, and every collision is
SILENT — you find out by losing work, not by an error.**

- ⭐ **TALK FIRST. `ListAgents` lists the other local sessions; `SendMessage` reaches them.** This is
  the METHOD, not the fallback. Inferring the peer's state from commits is what you do only if no
  peer answers.
- **Open with a state message, and state what you have DONE, never what you are about to do**
  (replies cross mid-flight):
  > *"I am running &lt;THIS CAMPAIGN&gt;. Files I own: &lt;list&gt;. I have pushed: &lt;shas, or none&gt;.
  > `test:all` is &lt;n&gt;/324 in my tree. Tell me your file set and your last push."*
- ⛔ **WORKTREES, NOT A SHARED DIRECTORY.** `F:\kipindi-main` holds the Railway CLI link — run
  `railway …` from there even when working elsewhere. The second session takes its own
  `git worktree` with its own branch and its own `.next`. `git worktree list` shows who is where.
  A shared directory has already made one session's files vanish mid-edit under the other's
  `git checkout`.
- ⛔ **NEVER `git checkout` in the other session's tree.**
- **PUSH SEQUENCING — the two campaigns must not push at the same instant.** Before pushing:
  `git fetch`, integrate `origin/main`, **re-run `test:all` AFTER integrating**, then push. If the
  push is rejected, integrate again and re-validate. ⛔ **Never `--force`, and never `--theirs` a
  file the trunk moved** — that silently reverts every trunk fix.
- **Announce each push** to the peer with the sha and one line on what it changes. If your change
  touches a file in THEIR set, message them BEFORE you touch it.
- ⚠️ **A merge can create a coupling neither side can see alone.** After merging a shared file, ask
  what the two changes do to EACH OTHER — not just whether git resolved the text.
- ⛔ **ONE LIVE SESSION PER ACCOUNT.** A second admin sign-in REVOKES the first, and the revoked
  context silently gets the sign-in page at **HTTP 200** — every assertion then passes against a
  login screen. **Live drives must be serialized.** Message the peer, take the account, run, hand
  it back. Never run two live drives at once.
- ⚠️ **Shared-machine hazards:** port :3000 is often the peer's (check `netstat`, kill only your own
  PID); their `npm install` empties `node_modules/.bin` under your running gate and produces a mass
  of `'tsx' is not recognized` failures that are **not** product defects — ⭐ **read the FIRST
  failure's text before believing a mass failure**, the cure is one `npm install`; and there is
  **ONE database**, so a seeding run is visible to the peer's app.
- **Claim your finding-id range by message** before filing anything. Tie-break, if it comes to one:
  **`docs/LIVE-QA-CAMPAIGN.md` §6 is the authority** — whichever finding has a ROW there keeps the
  id, the other moves. An id recorded only in a prompt or a code comment is *announced*, not *filed*.

### 0.5 · When you are blocked, you do NOT stop

The owner is away; a blocked session that idles wastes the whole window.
1. **Do every unit that is not blocked**, in ledger order.
2. Record the blocker in §2 as a `⛔ BLOCKED` row **with the reason and what would unblock it**.
3. Keep going. Report at the end.

⛔ **Do not invent an answer to an owner decision.** If a unit genuinely needs a ruling, mark it
BLOCKED and move on — do not guess, and do not quietly shrink the unit to something you can finish.

### 0.6 · The hard stops — the only things you may NOT do unattended

- ⛔ **Do not re-enable QR / Selcom Lipa payment.** Withdrawn by owner ruling.
- ⛔ **Do not change the statutory helpline `0800 11 0011` or the licence number `OUS00000202602`.**
  They are pinned constants by design.
- ⛔ **Do not use GitHub's secret-scanning unblock link.** If push protection fires, CHANGE THE
  FIXTURE.
- ⛔ **Do not write to production money tables with raw SQL.** `AuditLog` is an append-only HMAC
  chain: a raw write leaves NO audit, and forging one reads as tampering. Use the audited admin
  path, or leave it and file it.
- ⛔ **Do not take a player-facing surface down** to make a gate pass.
- ⛔ **Do not re-baseline a ratchet** to swallow your own regression.

---

## §1 · THE ASK, and the rulings

> *"we said we will disable QR payment for now, all payment should normally be working. So instead
> of paying on QR they should deposit into their wallet, and then from wallet deposit they pay.
> This should be implemented and reflected properly where needed."* — owner, 2026-09-10

**Rulings, taken 2026-09-10 — do not re-open:**
- ⛔ **QR / Selcom Lipa stays DISABLED.** ✅ **It already is, completely** — `src/lib/lipa.ts:109`
  is `export const LIPA_QR_RELEASED = false;` and `shouldShowLipaQr` (`:138`) returns false first
  and unconditionally, so both `LipaQrPanel` call sites render nothing. **There is no work here.**
  The machinery is deliberately kept alive and guarded for a possible re-release. ⛔ Do not delete
  it, and do not "tidy" the flag away.
- ⭐ **The agent registration fee is paid FROM THE WALLET.** The applicant deposits on the ordinary
  rails, then pays the fee from that balance.
- ⭐ **The reason this is right:** QR was withdrawn because *a Lipa payment carries no reference on
  any network* — you cannot tell which agent paid. A wallet debit carries the payer's identity by
  construction. This ruling replaces reconciliation-by-human-reading-a-receipt with a movement that
  is traceable at the moment it happens.

---

## §2 · THE PLANNER — where we reached

| Unit | What it seals | Done |
|---|---|---|
| 0 | ⛔ **DECISION GATE** — the compliance position this reverses | ✅ **2/2** |
| 1 | 🔴 The ledger shape: a wallet-funded fee must not double-count | ☐ 0/4 |
| 2 | 🔴 The debit primitive: all-or-nothing, idempotent, its own type | ☐ 0/5 |
| 3 | 🔴 The applicant's path: deposit → return → pay, with no dead end | ☐ 0/5 |
| 4 | 🟠 The officer's workstation after reconciliation stops being manual | ☐ 0/4 |
| 5 | 🟠 Refunds — the mirror must still balance | ☐ 0/3 |
| 6 | 🟠 Copy, terms and i18n — EN/SW/ZH, and a terms version bump | ☐ 0/5 |
| 7 | 🟠 In-flight applicants must not be stranded by the deploy | ☐ 0/3 |
| 8 | 🟡 Gates — the suites that hold this subsystem, on the deploy path | ☐ 0/3 |

<details><summary><strong>Row ledger — tick these</strong></summary>

| | Unit 0 · Decision gate | where |
|---|---|---|
| ✅ | **0.1** the owner's ruling is recorded as a COMPLIANCE DECISION with its date and reason | `docs/COMPLIANCE-DECISIONS.md` § 2026-09-10 — the ruling, the reason (traceability; QR references do not exist on the network), the price (**the programme is now inside the money invariants**), the retired fraud controls and what replaces each, and what it does NOT change |
| ✅ | **0.2** ~~all three~~ **all TWELVE** "never enters the player ledger" statements are corrected together | ⚠️ **The brief said three; a full sweep found twelve.** Corrected: `schema.prisma:1030` · `ledger.ts:630-645` (**not in the brief** — it also still claimed the fee was "VAT-INCLUSIVE by decision", superseded 2026-09-09) · `agent-application-service.ts:24-26` **and `:31-32`** · `AGENT-PROGRAMME.md:159`, `:163-165` **and the Destination row `:158`** · `RULES.md:516` · `SESSION-PROMPT-AGENT-BUILD.md:34`, `:37` · `agent/page.tsx:41` · `agent/error.tsx:17`. ⛔ **Deliberately NOT swept:** every *"settled out of band"* about agent **commission payables** (`affiliate-service.ts`, `RULES.md:515`, `/admin/agents`) — a different subsystem and a different movement. ⛔ **`COMPLIANCE-DECISIONS.md:178` is NOT rewritten** — it is the true record of the 2026-09-07 decision; the new entry supersedes it as to the rail only, the same doctrine the 2026-09-09 entry used |

> 🔴 **FOUND IN UNIT 0, AND IT CHANGES UNIT 1's DESIGN — DO NOT JUST FLIP THE LEG.**
> `agentRegistrationFeeEntries` has **TWO callers**, and only one of them moves a wallet:
> - the **new** wallet debit → money-in leg is correctly `acct.player(userId)`;
> - `reconcileFee` (`agent-application-service.ts` ~`:750`) — the **LEGACY out-of-band** path,
>   where an officer attests a bank receipt. **No wallet moves there.**
>
> ⛔ **Flipping the leg to `acct.player()` unconditionally would make the legacy path post a
> PLAYER ledger entry with no wallet movement behind it** — silently diverging the player ledger
> from the balance it is supposed to describe, on exactly the applicants Unit 7 must honour.
> ⭐ **So the source must be an EXPLICIT PARAMETER of the function, not a constant**
> (`"WALLET"` → `acct.player(userId)`, `"EXTERNAL"` → `acct.external("SELCOM")`). This also makes
> Unit 7.1 buildable at all: an in-flight applicant who already paid by bank keeps the external
> leg. ⚠️ And the refund mirror must reverse to **whichever source the collection used** — the
> same doctrine as "reverse the VAT actually BOOKED, never today's rate".

| | Unit 1 · Ledger shape | where |
|---|---|---|
| ☐ | **1.1** the money-in leg is the PLAYER account **when the fee came from a wallet** — an explicit source parameter, ⛔ not an unconditional flip (see the note above) | `ledger.ts:646-667` + both callers |
| ☐ | **1.2** a trial balance proves the same shillings are not counted twice | new guard |
| ☐ | **1.3** the VAT leg still only posts when the rate is non-zero | `ledger.ts` |
| ☐ | **1.4** `test:ledger` and `test:money-invariants` stay green, proven not assumed | existing |

| | Unit 2 · The debit | where |
|---|---|---|
| ☐ | **2.1** a `TxnType` exists for this movement | `schema.prisma:115-135` |
| ☐ | **2.2** the debit is ALL-OR-NOTHING — ⛔ `debitInternal` debits PARTIALLY | `wallet-service.ts:2075-2157` |
| ☐ | **2.3** it holds a row lock and is not "ambient" | `withLock` — see §3 |
| ☐ | **2.4** double-submit cannot pay twice (idempotency key) | new |
| ☐ | **2.5** a concurrent bet cannot race the fee below zero | new guard |

| | Unit 3 · The applicant's path | where |
|---|---|---|
| ☐ | **3.1** the wizard's payment step offers "pay from wallet", not a bank instruction | `agent/apply` |
| ☐ | **3.2** insufficient balance routes to deposit and RETURNS to the same step | new |
| ☐ | **3.3** the receipt-image + reference gate is removed or conditioned, not left dangling | `recordFeePayment` |
| ☐ | **3.4** `recomputeDraftStatus`'s three draft states still derive correctly | service |
| ☐ | **3.5** no state in the wizard can trap the applicant with no way forward or back | drive |

| | Unit 4 · The officer | where |
|---|---|---|
| ☐ | **4.1** a wallet-paid fee needs no manual attestation, and the UI says so | `/admin/agents/[id]` |
| ☐ | **4.2** the gold fee panel renders the new shape without empty slots | admin |
| ☐ | **4.3** `approveAgent`'s COLLECTED-or-WAIVED precondition still holds | service |
| ☐ | **4.4** waiver still works and still needs its audited reason | service |

| | Unit 5 · Refunds | where |
|---|---|---|
| ☐ | **5.1** rejection still flips to `REFUND_DUE` with its 7-day deadline | service |
| ☐ | **5.2** the refund posts the exact mirror — back to the WALLET now | `recordFeeRefund` |
| ☐ | **5.3** it reverses the VAT the collection actually booked, not today's rate | existing rule |

| | Unit 6 · Copy and terms | where |
|---|---|---|
| ☐ | **6.1** the public `/agent` page describes the real rail | page + i18n |
| ☐ | **6.2** the wizard's payment step copy is true in EN/SW/ZH | i18n-dict |
| ☐ | **6.3** the binding agent terms match the new rail | `legal/agent-terms` |
| ☐ | **6.4** `AGENT_TERMS_VERSION` is bumped — a binding document changed | config |
| ☐ | **6.5** every fee email says what actually happens | `email.ts` |

| | Unit 7 · In-flight | where |
|---|---|---|
| ☐ | **7.1** applicants already at `PAYMENT_PENDING` by the old rail are honoured | migration |
| ☐ | **7.2** a `feeReference` already recorded is not orphaned | data |
| ☐ | **7.3** measured on production BEFORE the deploy: how many are mid-flight | read-only query |

| | Unit 8 · Gates | where |
|---|---|---|
| ☐ | **8.1** the agent suites that cover the fee are identified and extended | `test:agent-*` |
| ☐ | **8.2** each new guard is proven RED before its fix | per unit |
| ☐ | **8.3** `predeploy` runs them | `package.json` |

</details>

---

## §3 · ⛔ THE DECISION GATE — READ THIS BEFORE YOU WRITE ANY CODE

⭐ **The owner's ruling reverses a recorded compliance position. That does not make it wrong — it
makes it a decision that has to be taken deliberately and written down.**

The rule it reverses is stated, in near-identical words, in **three authoritative places**:

- `prisma/schema.prisma:1030` — *"What happened to the TZS 100,000. ⛔ Never a player-ledger
  `Transaction` — it is money from a member of the public, so it posts a `LedgerEntry`
  (`AGENT_REGISTRATION_FEE`)."*
- `src/lib/server/agent-application-service.ts:24-26` — *"⭐ The fee NEVER enters the player ledger.
  It is money from a member of the public, attested by an officer reading a receipt."*
- `docs/AGENT-PROGRAMME.md:163` — *"⛔ **The fee never enters the player ledger** — no wallet
  credit, no `Transaction` row. It is a business receipt attested by an officer, **which is why the
  programme adds zero risk to the money invariants**."*

**Paying the fee from a wallet balance makes it a player-ledger movement by construction.** The
third quote names the cost precisely: the programme stops being risk-free to the money invariants.

⛔ **Do not implement this as a code detail.** A later reader who finds a player-ledger fee row
against a schema comment forbidding it will file it as a defect and may "fix" it back.

**Unit 0 is therefore the first commit:** record the ruling — its date, the owner's reason
(traceability; QR references do not exist on the network), and what it costs — in
`docs/COMPLIANCE-DECISIONS.md`, and correct all three statements **in the same commit**. Only then
touch the ledger.

### The two hazards that make this more than a plumbing change

⛔ **DOUBLE-COUNTING.** `ledger.ts:646-667` (`agentRegistrationFeeEntries`) hard-codes the money-in
leg to `acct.external("SELCOM")`. The shillings now arrive as an ordinary DEPOSIT — already booked
as an external inflow. If the fee group ALSO books `EXTERNAL:SELCOM`, **the same money is counted
twice and the trial balance is wrong.** The credit leg must become `acct.player(userId)`.

⛔ **A PARTIAL DEBIT IS NOT A PAYMENT.** There is no `TxnType` for this movement
(`schema.prisma:115-135` has none), and the only generic debit primitive, `debitInternal`
(`wallet-service.ts:2075-2157`), accepts only `AGENT_COMMISSION_REVERSAL | ADJUSTMENT_DEBIT` and
**deliberately debits partially**: `const take = Math.max(0, Math.min(want, wallet.balance))`
(`:2111`). ⭐ **Reusing it would let an applicant with TZS 40,000 "pay" a TZS 100,000 fee and
receive a success.** This debit must be all-or-nothing, and it needs its own type so the ledger can
book it to `HOUSE:AGENT_FEE`.

⚠️ **And the transaction is not ambient.** In this repo `withLock(…, async () => {})` autocommits,
and the DAL reads `tx ?? pc()` — it never reads a store. Pass the transaction explicitly or the
debit and the ledger group are not atomic with each other.

---

## §4 · THE FLOW AS IT WORKS TODAY

You are replacing this, so know it exactly.

`/agent` (public, readable signed out) → *"Apply now"* (`startApplicationAction`) → `/agent/apply`,
a **four-step wizard** ending in Payment → `/agent/status`.

The payment step shows the total from `feeBreakdown()` and the sentence *"Send {amount} to {name},
account {account}. Keep the receipt."* — filled from `agentConfig.feeDestinationName` /
`feeDestinationAccount`, today **"Digital Selcom Bank" / "0769777877"**. The applicant photographs
the receipt into a `FEE_RECEIPT` slot and types its reference.

`recordFeePayment` refuses the reference unless the image is already attached, enforces
`/^[A-Z0-9-]+$/` at 4–64 characters, refuses a reference another application holds (`feeReference`
is UNIQUE; a collision raises a SECURITY audit), and refuses entirely while a previous application
of theirs is still owed a refund. ⭐ **It records only the reference, never an amount** — the amount
is stamped from config by the officer, deliberately: *"a human-typed amount means a TZS 1,000
receipt attested as the fee passes every check."*

**The fee is TZS 100,000, no VAT** — `registrationFeeTzs: 100_000`, `feeVatTreatment: "EXCLUSIVE"`,
`feeVatRatePct: 0` after the owner's 2026-09-09 ruling. `feeBreakdown()` is the only place the total
is computed; the config module's law is *"no surface may hard-code any number in this file."*

**Eleven statuses in one enum.** `recomputeDraftStatus` derives the three draft states: no seven
documents → `DRAFT`; seven but no fee → `KYC_SUBMITTED`; seven plus a fee reference or a waiver →
`PAYMENT_PENDING` (which the applicant reads as *"Ready to submit"*, not *"payment owed"*).
`submitForReview` is the only door into `UNDER_REVIEW`. One compliance officer then decides:
`requestMoreInfo` → `ADDITIONAL_INFO_REQUIRED` with only the named slots re-uploadable;
`rejectApplication` closes it; `approveAgent` is the only writer of `UserRole.AGENT`.

**The fee has its own five-value sub-machine.** `NONE` at creation. `reconcileFee` is the sole
writer of `COLLECTED`: the officer types what the receipt reads, a bank statement line and a masked
source account; the attested amount **must equal `feeBreakdown().totalTzs` exactly** (short or over
is a hard refusal with its own audit); it stamps `feeAmountTzs` from config and posts the balanced
group `agentfee_<id>`. `waiveFee` writes `WAIVED` with an audited reason ≥10 characters and no
ledger entry. Rejecting an application whose fee was `COLLECTED` flips it to `REFUND_DUE` with a
7-day deadline; `recordFeeRefund` posts the exact mirror, **reversing the VAT the collection
actually booked rather than today's rate**. Approval refuses unless the disposition is `COLLECTED`
or `WAIVED`.

⭐ **What the ruling deletes:** the bank instruction, the receipt image, the typed reference, the
uniqueness check, and the officer's attestation step — all of which exist only because the payment
happened off-platform. ⚠️ **Deleting them is most of the risk in this campaign**, because each one
is also a fraud control. Replace the control, do not merely remove it: a wallet debit's fraud
control is that the money was already KYC'd on the way in and the payer is the account holder.

---

## §5 · ⛔ WHAT THIS BRIEF DID **NOT** COVER

- **Nothing was executed against a running app.** Ten agents worked read-only from HEAD. No flow was
  walked, no deposit made, no fee paid.
- **The deposit rails themselves were NOT re-audited.** The owner states deposit works and is
  tested, and the repo carries ~30 payment suites (`test:payments`, `e2e:money`,
  `test:money-invariants`, `test:card-deposit`, `test:deposit-gate`, …). ⛔ **This campaign assumes
  that and does not re-litigate it.** If a deposit defect surfaces, FILE it — do not absorb it.
- **No production data was read.** Unit 7.3 exists precisely because nobody has counted the
  in-flight applicants yet.
- **The three designs disagreed** on whether the officer keeps a reconciliation step at all. That is
  a product call inside the owner's ruling; §2 Unit 4 records it as work, not as a decision taken.
- **Refund mechanics were read, not driven.** The mirror-posting rule and the VAT-at-collection rule
  are quoted from source.
- **Not examined:** Selcom statement reconciliation tooling, the agent commission path (a separate
  subsystem), PDF/XLSX report chrome for fee reporting, and whether any dashboard aggregates the
  fee in a way this change would silently alter.

---

## §6 · ⏭️ RESUME AT

**Session 1 · nothing is ticked. Every row in §2 is open.**

1. ⭐ **`ListAgents`, then `SendMessage` the peer** running `SUPPORT-CARE-CAMPAIGN.md` (§0.4).
   Your overlap is small but real: both campaigns touch `package.json` scripts and `docs/`. Agree
   who owns `package.json` edits, or you will collide on the one file you both must append to.
2. `git pull`, `npm install` if dependencies moved, confirm the `test:all` baseline (§0.1 step 5).
3. ⛔ **Unit 0 FIRST — it is a commit, not a formality.** Do not write ledger code against three
   authoritative comments that forbid it.
4. **Then Unit 7.3** — count the in-flight applicants on production, read-only, BEFORE you design
   the migration. It is one query and it decides how careful Unit 7 has to be.
5. Then Unit 1 → 2 → 3 → 4 → 5 → 6 → 8, sealing each.

⛔ **Unit 2 is the one that can lose money.** Its guard must prove all-or-nothing debiting, a
concurrent bet racing the fee, and a double-submit — each proven RED before the fix. ⭐ Ask the
standing question of every one of those: *would this still pass if the feature were absent?*

### When you finish
- Tick every row you sealed, in the commit that sealed it.
- Update §6 for the next session in this same format.
- Post a final summary: what shipped, what is BLOCKED and why, what you did not reach.
