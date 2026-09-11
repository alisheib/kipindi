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

### 0.5 · ⭐ YOU DECIDE — the owner has delegated it

⭐ **THE OWNER'S INSTRUCTION, 2026-09-10, VERBATIM:** *"take decisions if needed, as I'll be away.
Decisions should be as per what they think is more perfect with the overall flow of the platform."*

⛔ **So a design question is NOT a blocker any more. It is your call.** Do not park a unit waiting
for a ruling that is not coming, and do not quietly shrink a unit to the part you can finish without
deciding. **Decide it, record it, ship it.**

#### The criterion he gave you — use it literally

**"More perfect with the overall flow of the platform."** That is a coherence test, not a taste
test, and it has a concrete meaning here:

1. ⭐ **What does this codebase already do for the same class of problem?** This repo is unusually
   consistent and unusually well-commented about WHY. Find the established pattern and follow it.
   The nearest existing precedent beats a cleaner idea with no precedent.
2. ⭐ **Which option leaves the platform easier to reason about in six months?** Prefer one concept
   over two. Prefer a single source of truth over a synchronised pair. Prefer making an invariant
   explicit over relying on a convention.
3. ⭐ **Which option makes the next defect in this area IMPOSSIBLE rather than merely unlikely?**
   This platform's whole standing doctrine is to seal the class, not the instance.
4. ⚠️ **When two options are genuinely balanced, take the REVERSIBLE one.** The owner is away; a
   choice he can undo cheaply is worth more than the marginally better choice he cannot.
5. ⛔ **Never decide by "what is quickest to make green."** That is how this repo acquired the
   guards that lie.

#### Record every decision — this is the part that makes delegation safe

For each decision you take, add a row to the **DECISION LOG** at the end of this file:
what you decided, the alternative you rejected, the criterion above that settled it, and the
files it touched. ⭐ **Write it so the owner can overturn it in one read.** A delegated decision
that is not written down is indistinguishable from a defect.

⚠️ **If a decision changes money semantics, a binding document, or a compliance position, say so
explicitly in that row and flag it in your final summary.** It is still yours to take — but he must
be able to find it without hunting.

#### What is still NOT yours

§0.6's hard stops are safety rails and standing owner rulings, not open questions. And if you find
a genuine external blocker — a credential you do not have, a vendor secret, a third party who has
to act — that is not a decision, it is a dependency: record it in §2 as a `⛔ BLOCKED` row with what
would unblock it, do every other unit, and report it at the end. **Never idle.**

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
| 1 | 🔴 The ledger shape: a wallet-funded fee must not double-count | ✅ **4/4** |
| 2 | 🔴 The debit primitive: all-or-nothing, idempotent, its own type | ✅ **5/5** |
| 3 | 🔴 The applicant's path: deposit → return → pay, with no dead end | ✅ **5/5** |
| 4 | 🟠 The officer's workstation after reconciliation stops being manual | ✅ **4/4** |
| 5 | 🟠 Refunds — the mirror must still balance | ☐ 0/3 |
| 6 | 🟠 Copy, terms and i18n — EN/SW/ZH, and a terms version bump | ⏳ **2/5** — 6.1 + 6.2 |
| 7 | 🟠 In-flight applicants must not be stranded by the deploy | ⏳ **1/3** — 7.3 measured: **no migration needed** |
| 8 | 🟡 Gates — the suites that hold this subsystem, on the deploy path | ⏳ **2/3** — 8.2 + 8.3; predeploy 97 → 98, two guards on the path |

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
| ✅ | **1.1** the money-in leg is the PLAYER account **when the fee came from a wallet** — an explicit source parameter, ⛔ not an unconditional flip (see the note above) | `ledger.ts` `source: "WALLET" \| "EXTERNAL"`, **required and not defaulted** so `tsc` names every caller. Found exactly TWO, as predicted: `reconcileFee` → `EXTERNAL`, `recordFeeRefund` → whatever collected |
| ✅ | **1.2** a trial balance proves the same shillings are not counted twice | `test:agent-fee-wallet` §2. ⭐ **Non-vacuous by construction:** §2.4–2.6 feed `computeTrialBalance` the exact numbers a double-counting build produces and assert drift is **exactly −100,000** and `ok === false`. Those three PASSED against the unfixed tree, which is what makes §2.1 mean something |
| ✅ | **1.3** the VAT leg still only posts when the rate is non-zero | `test:agent-fee-wallet` §1.8–1.11, both directions (18% posts `HOUSE:TAX` and nets correctly; 0% posts no leg at all) |
| ✅ | **1.4** `test:ledger` and `test:money-invariants` stay green, proven not assumed | ✅ **RUN, not assumed:** `test:ledger` PASS · `test:money-invariants` PASS · `test:trial-balance` PASS · `test:agent-fee-copy` PASS · `test:lifecycle-reach` PASS · `test:agent-application-security` **110/0 after I fixed the regression I caused** (see 8.2) |

| | Unit 2 · The debit | where |
|---|---|---|
| ✅ | **2.1** a `TxnType` exists for this movement | `AGENT_REGISTRATION_FEE`, appended LAST to match Postgres `ALTER TYPE … ADD VALUE` order, in its **own** migration file per the `20260907120000` precedent (⛔ Postgres refuses to USE a value added in the same transaction, and `migrate deploy` wraps each FILE in one) |
| ✅ | **2.2** the debit is ALL-OR-NOTHING — ⛔ `debitInternal` debits PARTIALLY | `payAgentRegistrationFee`. ⭐ **§3.1 asserts `debitInternal` REALLY DOES debit partially** — 40,000 taken against a 100,000 demand, shortfall 60,000, success-shaped output. So if anyone "fixes" it, the reason this second primitive exists is re-examined rather than lost |
| ✅ | **2.3** it holds a row lock and is not "ambient" | `withLock("wallet:<id>")` + nested `withMoneyTx`. ⚠️ **THE BRIEF'S REASON WAS WRONG** — see the §3 correction below. There IS an ambient store; the actionable half (pass `tx` to every DAL call) is right and is done |
| ✅ | **2.4** double-submit cannot pay twice (idempotency key) | Keyed on the **application id** via `Transaction.providerRef`, checked under the lock before any money moves; a second call returns the FIRST payment. ⛔ Deliberately NOT relying on `postLedgerEntries` dedupe — its comment claims stable ids but it mints `le_${randomId(12)}` |
| ✅ | **2.5** a concurrent bet cannot race the fee below zero | `requireBalanceGte` makes the write `WHERE balance >= n`, so the **conditional write** is the guard, not the read. `test:agent-fee-wallet` §3.11–3.12 fire two concurrent payments at one balance: exactly one succeeds, balance never negative |

| | Unit 3 · The applicant's path | where |
|---|---|---|
| ✅ | **3.1** the wizard's payment step offers "pay from wallet", not a bank instruction | `payFeeFromWalletAction` + a gated pay control. ⛔ Takes NO `FormData` — the amount comes from `feeBreakdown()` on the server and the payer is the session; a form field for the amount is how a TZS 1,000 payment gets attested as the fee |
| ✅ | **3.2** insufficient balance routes to deposit and RETURNS to the same step | The shortfall is NAMED, not left to arithmetic, and a top-up link goes to `/wallet/deposit`. ⚠️ **Nothing carries them back** — the deposit rail has no return-URL contract (**PSC-01**) — but `firstMissingStep` recomputes from docs+referees only, so it returns them to Payment by construction. The hint says the application is saved |
| ✅ | **3.3** the receipt-image + reference gate is removed or conditioned, not left dangling | 🔴 **ONLY THE CLIENT HALF WAS TRUE, AND THE OTHER HALF WAS LIVE UNTIL 2026-09-11 — see §5d.** `apply-client.tsx`'s `missingNow` was fixed; the SERVER's `missingForSubmit` went on demanding `FEE_RECEIPT` + `FEE_REFERENCE` for anything not `WAIVED`, and a wallet payment stamps `COLLECTED`. ⛔ **A paying applicant could not submit.** Now ONE settlement-keyed token, `FEE_PAYMENT`, on both sides. The original note said the two edits were *"one change, never split"* — ⭐ and they were split, not across two commits but across the CLIENT and the SERVER |
| ✅ | **3.4** `recomputeDraftStatus`'s three draft states still derive correctly | 🔴 **THE TRAP.** It read `!!feeReference \|\| WAIVED`; a wallet payment writes NO reference, so a payer stayed at `KYC_SUBMITTED` and `submitForReview` is the only door into review — **they pay TZS 100,000 and cannot apply.** Now reads the DISPOSITION (`COLLECTED`), which is already what `approveAgent` requires. ⭐ The money guard could not see it: the money moved correctly |
| ✅ | **3.5** no state in the wizard can trap the applicant with no way forward or back | ⛔ **TWO DEAD ENDS THE BRIEF DID NOT ANTICIPATE.** Paying from a wallet inherits every precondition of DEPOSITING: (a) KYC APPROVED — enforced for self-service but `!forInvitation` **exempts an officer-invited applicant deliberately**, so an un-KYC'd invitee could not fund a wallet and was told nothing (and `agentInvitationHtml({feeWaivable:true})` is hard-coded, so the email promises a waiver that is a separate officer action); (b) a VERIFIED EMAIL — required by deposit, checked nowhere upstream. Each now renders the GATE plus the action that clears it, in the server's own order so nobody fixes one thing and is refused for another |

| | Unit 4 · The officer | where |
|---|---|---|
| ✅ | **4.1** a wallet-paid fee needs no manual attestation, and the UI says so | 🔴 **THE UI SAID NOTHING AT ALL.** `decision-rail.tsx:211` rendered `whyNoReconcile` behind `&& disposition === "NONE"`, so on a COLLECTED fee the sentence was computed and thrown away. ⚠️ And it was wrong twice over: `COLLECTED ? "Reconciled."` names an officer act that never happened on the wallet rail, and the fallback — *"The applicant has not recorded a receipt reference."* — is the WITHDRAWN rail's instruction, shown to an officer looking at somebody who has simply not paid. Now truthful for all FIVE dispositions (⛔ `REFUND_DUE`/`REFUNDED` must never read "has not paid" — they exist *because* it was) and the gate that hid it is gone. `test:agent-fee-officer-panel` §4b + §4c |
| ✅ | **4.2** the gold fee panel renders the new shape without empty slots | ⛔ **THE BRIEF SAID TWO EM-DASHES. IT WAS THREE, PLUS A FOURTH SLOT THAT LIED.** `Receipt ref`, `Attested` and `Statement line` all rendered `—` for a wallet-funded fee, and `Reconciled` printed a REAL timestamp because `payFeeFromWallet` sets `feeReconciledAt`. ⚠️ An em-dash is not neutral in this grid — every other one means *"not done yet"*, the thing the officer's job is to chase. A fifth, `To`, showed `—` on every wallet refund. ⭐ **`feeReconciledAt` is NOT cleared:** `reconcileFee` refuses while it is set, and that refusal is what stops an officer collecting a SECOND time from someone who already paid. The fix is the LABEL, never the field. Grid now decided by the rail in `[id]/fee-evidence.ts` |
| ✅ | **4.3** `approveAgent`'s COLLECTED-or-WAIVED precondition still holds | ✅ **VERIFIED, unchanged** — `if (app.feeDisposition !== "COLLECTED" && !== "WAIVED") refuse("fee_unresolved")` admits a wallet-funded COLLECTED row by construction. ⚠️ Its refusal COPY said *"Reconcile the fee, or waive it"*, telling an officer to do something the live rail offers no control for; the rail's own sentence now carries the truth instead |
| ✅ | **4.4** waiver still works and still needs its audited reason | ✅ **VERIFIED, unchanged and untouched** — `waiveFee` still demands ≥10 characters, writes `feeWaiverReason` and audits `agent.fee.waived` through the ordinary path. ⛔ It still refuses a fee already `COLLECTED` (*"Reject and refund instead"*), which is what stops a waiver being used to paper over a wallet payment. `test:agent-fee-officer-panel` 4b.9 holds the copy |

| | Unit 5 · Refunds | where |
|---|---|---|
| ✅ | **5.1** rejection still flips to `REFUND_DUE` with its 7-day deadline | service |
| ✅ | **5.2** the refund posts the exact mirror — back to the WALLET now | `recordFeeRefund` |
| ✅ | **5.3** it reverses the VAT the collection actually booked, not today's rate | existing rule |

| | Unit 6 · Copy and terms | where |
|---|---|---|
| ✅ | **6.1** the public `/agent` page describes the real rail | `feeBodyWallet` replaces `feeBody` ("Pay {amount} to {name}, account {account}, then upload the receipt…") in all three locales — **replaced, not reworded**. ⛔ And it was a DEPENDENCY of PSC-02: deleting the visible copy alone would have been cosmetic while the gated panel still published the account |
| ✅ | **6.2** the wizard's payment step copy is true in EN/SW/ZH | 12 new keys × EN/SW/ZH, parity green at **2382 each**. Every new refusal carries a MACHINE TOKEN, never English the form substring-matches — the defect this form already shipped once |
| ☐ | **6.3** the binding agent terms match the new rail | `legal/agent-terms` |
| ☐ | **6.4** `AGENT_TERMS_VERSION` is bumped — a binding document changed | config |
| ☐ | **6.5** every fee email says what actually happens | `email.ts` |

> ⭐ **MEASURED ON PRODUCTION 2026-09-10, READ-ONLY — AND IT COLLAPSES THIS UNIT.**
> Route: `railway run --service Postgres -- node <scratchpad script>`, session `SET … READ ONLY`
> at the server so a stray write would be refused by Postgres and not merely by intent. ⛔ The
> brief's `F:\kipindi-main` Railway-link claim is **STALE — F: does not exist on this machine**;
> there is also no `.env` and no `.railway` in either checkout. The live route is `railway link
> -p 50pick -e production` plus the Postgres service's `DATABASE_PUBLIC_URL`, which `railway run`
> injects without ever printing it.
>
> **The whole `AgentApplication` table is TWO ROWS:**
>
> | | rows | fee disposition | feeReference | reconciled |
> |---|---|---|---|---|
> | `APPROVED` | **1** | `COLLECTED` | yes | yes |
> | `DRAFT` | **1** | `NONE` | **none** | no |
>
> - **In-flight population = ONE**, and it is a `DRAFT` that has paid **nothing** and recorded
>   **nothing** — no reference, no amount, no reconciliation.
> - `PAYMENT_PENDING`: **0**. `REFUND_DUE`: **0** (overdue: 0). Orphaned references: **0**.
> - Rows a migration could strand (a reference recorded but undecided): **0**.
> - `FEE_RECEIPT` documents still held: **1**, unpurged — it belongs to the APPROVED agent.
> - Accepted terms versions in use: `2026-09-07` ×1 (the APPROVED agent) and `null` ×1.
>
> ⭐ **SO THERE IS NO DATA MIGRATION TO WRITE.** Nobody is mid-payment on the old rail. Unit 7 is
> not a backfill; it is a **non-regression** obligation: keep the legacy officer-attested path
> working for the one historical `COLLECTED` row, whose fee was collected at **18% VAT and is NOT
> retroactive** (2026-09-09). ⛔ That row must not be reclassified, rewritten or migrated — and it
> is the concrete reason the money-in leg must be a PARAMETER, not an unconditional flip (see the
> Unit 1 note above).
> ⚠️ **A count is true only at the moment it was read.** Re-run the census immediately before the
> deploy that changes the rail; an applicant can reach `PAYMENT_PENDING` at any time.

| | Unit 7 · In-flight | where |
|---|---|---|
| ☐ | **7.1** applicants already at `PAYMENT_PENDING` by the old rail are honoured — ⭐ **measured: ZERO exist**, so this is a non-regression guard on the legacy path, not a backfill | no migration needed |
| ☐ | **7.2** a `feeReference` already recorded is not orphaned — ⭐ **measured: ZERO undecided**; the only one belongs to the APPROVED agent and must be preserved untouched | data |
| ✅ | **7.3** measured on production BEFORE the deploy: how many are mid-flight | ⭐ **DONE — 2 rows total, 1 in-flight, and it has paid nothing.** See the note above for the route and the full census |

| | Unit 8 · Gates | where |
|---|---|---|
| ⏳ | **8.1** the agent suites that cover the fee are identified and extended | ✅ **`test:agent-fee-wallet` NEW** (47 assertions, in `test:all` automatically — it discovers every `test:*` key, so the board is **325** now, not 324). ✅ `test:agent-application-security` **extended**: its §8 audit scan read only `agent-application-service.ts` and the fee's audit now fires from `wallet-service.ts`, so it was measuring the wrong population — it now reads both and asserts it reaches the wallet rail. ⏳ remaining agent suites reviewed under Units 3–6 |
| ✅ | **8.2** each new guard is proven RED before its fix | ⭐ **RED 21/11 → GREEN 34/0 → hardened to 47/0**, and then **re-broken FIVE ways**. ⛔ **TWO MUTATIONS ESCAPED THE FIRST VERSION** and are recorded in the guard's own §4 docblock rather than quietly patched: (a) `reconcileFee`'s `source` flipped to `"WALLET"` — §1 calls the entry builder DIRECTLY, so it proved the parameter works and never checked the CALLER, which is exactly the defect the parameter exists to stop; (b) `requireBalanceGte` deleted — the in-memory store serialises through one lock, so the read-then-write race cannot be staged there at all. §4 closes both. ⚠️ They are **source assertions** because `postLedgerEntries` writes nothing without a database ("the in-memory store doesn't have a LedgerEntry model"), so the posted legs cannot be read back — ⛔ not a substitute for driving it on Postgres |
| ✅ | **8.3** `predeploy` runs them | `test:agent-fee-wallet` appended to the `predeploy` chain (**96 → 97 entries**), after the peer's `test:support-contact && test:cert-c1`. ⛔ Added only AFTER it was green — an already-red suite on the deploy path blocks BOTH campaigns, the same call the peer made on `test:popup-fit`. ⚠️ No `red:` twin was added: it fails by construction, and this repo's red harness mutates the tree IN PLACE |

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

## §5b · 🔴 FILED FINDINGS — ids `PSC-*` (the peer holds `E-340…E-379`)

⛔ **Both are PRE-EXISTING and neither was absorbed.** §5 says a deposit defect is to be FILED,
not fixed inside this campaign, and the same discipline applies to the QR.

| id | what | evidence | why it is not fixed here |
|---|---|---|---|
| **PSC-01** | 🟠 **The deposit rail has no return-URL contract.** Any flow that sends a user to top up cannot bring them back to where they were. | `wallet/deposit/actions.ts:145` hard-codes `/wallet?deposited=<id>&amount=<n>&status=<TxnStatus>`; the gateway path lands on `wallet/deposit/return/page.tsx` which links to `/wallet` (`:153`). `KycGatePanel returnTo=` is a KYC convention, not a deposit one. | ⛔ §5 forbids re-litigating deposit, and rerouting its success redirect would drop the `deposited=/amount=/status=` confirmation a depositor is entitled to see. ⭐ **Unit 3.2 does not need it:** `apply-client.tsx:83-90` recomputes `firstMissingStep` from docs+referees only (`FEE_RECEIPT` is not one of the seven), so it returns the Payment step by construction. |
| **PSC-02** | 🔴 **The WITHHELD Lipa QR's merchant config is published to every anonymous visitor of `/agent`.** Nothing renders — but the data is in the page. | Read off the LIVE page 2026-09-11: `"enabled":true,"merchantName":"OCEAN ENTERTAINMENT LIMITED","lipaNumber":"70063747","ussdCode":"*150*50#","qrAssetPath":"/pay/selcom-lipa-qr.d997c1d2.svg"},"account":"0769777877","amountTzs":100000`. `LipaQrPanel` is `"use client"` and `/agent/page.tsx:267` passes it `lipa={lipaDisplay()}` from a **server** component, so Next.js serialises the props into the RSC flight payload embedded in the HTML — even though `shouldShowLipaQr` returns false and the component renders nothing. | ⛔ **NOT a hard-stop breach:** no QR renders, no `<img>` is emitted, `LIPA_QR_RELEASED` is `false` and `test:lipa-qr` is green including *"the PERFECT config still renders NOTHING"*. ⚠️ **But no guard covers this:** §4.3 is a source-level check that `qrPayload` never enters a `.tsx`, and `lipaDisplay()` (`lipa-config.ts:162-169`) deliberately omits **only** `qrPayload` — its other five fields must reach the client for the component to render at all. So a withdrawn programme's payable merchant identity, plus `enabled:true`, is public. ⛔ **AND IT IS A HARD DEPENDENCY OF UNIT 6.1, not merely a filed nicety** — see below. |

### 🔴 PSC-02 IS A DEPENDENCY OF UNIT 6.1 — measured on the live page 2026-09-11

Counted on `https://www.50pick.tz/agent`, signed out: **`0769777877` appears 3 times**,
`Digital Selcom Bank` **twice**, `70063747` once, and `\"account\":\"0769777877\"` sits in the RSC
flight payload as `LipaQrPanel`'s `account` prop.

⛔ **So when Unit 6.1 removes the visible bank instruction, the removal would be COSMETIC.** The
visible `feeBody` copy goes, and the destination account stays published to every anonymous
visitor through the props of a component that renders nothing. **Unit 6.1 cannot be truthfully
sealed until the props stop flowing.**

⭐ **AND THE FIX DOES NOT TOUCH THE WITHHELD MACHINERY, so it is not blocked by the hard stop.**
The change is at the CALL SITES — `/agent/page.tsx:267` and `apply-client.tsx` — to not render
`<LipaQrPanel>` at all while the release gate is shut, using the server-importable
`LIPA_QR_RELEASED` / `lipaQrWouldShow` rather than relying on the component to return null after
its props have already been serialised. ⛔ `lipa.ts` and `lipa-config.ts` are NOT edited, the flag
is NOT tidied away, and the machinery stays alive for a possible re-release — exactly what §0.6
protects. Gating a call site is the opposite of deleting the feature.

⚠️ Whoever does Unit 6.1 must therefore verify by reading the SHIPPED PAGE, not the JSX: grep the
response for the account digits and the merchant name. A visible string removed from a template is
not a string removed from the payload.

---

⭐ **The lesson PSC-02 carries, beyond the QR:** *"renders nothing"* and *"sends nothing"* are
different claims. A `"use client"` component reached from a server component publishes its PROPS
whatever it returns, so a feature gate that only stops the render still ships the data. ⚠️ Worth
asking of every gated panel in this repo, not just this one.

---

## §5d · 🔴 THE PAYER COULD NOT APPLY — found 2026-09-11, and why five green guards missed it

⛔ **`missingForSubmit` refused every wallet-funded applicant, and it was LIVE at `31883970`.**

```
feeDisposition=COLLECTED (wallet-paid) → missing: [... ,"FEE_RECEIPT","FEE_REFERENCE"]
feeDisposition=WAIVED    (officer)     → missing: [...]
feeDisposition=NONE      (unpaid)      → missing: [... ,"FEE_RECEIPT","FEE_REFERENCE"]
```

**A person who had paid TZS 100,000 from their wallet was treated identically to one who had
paid nothing.** `submitForReview` answered *"Your application is not complete."* and named two
pieces of evidence the product had stopped collecting. This is the SAME trap row 3.4 records as
closed — *"they pay TZS 100,000 and cannot apply"* — living one layer further down, in the
function `submitForReview` actually consults.

### ⭐ Why nothing caught it — five separate blindnesses, each instructive

1. **The fix was split across the CLIENT and the SERVER.** `apply-client.tsx` was corrected and
   its docblock even says the edits *"are ONE atomic change and must never be split"*. Two lists
   describing one rule drifted. ⭐ **The wizard ENABLED its Submit button and the server refused
   it** — the worst possible shape, because the applicant is told they are ready and then told
   they are not.
2. 🔴 **The guard that promised this ran only its dead branch.** `agent-fee-wallet-path` §5 is
   headed *"driven end to end: a funded applicant pays and becomes able to submit"*. Its
   assertions `5.1 a funded, KYC'd applicant pays and the status ADVANCES` and `5.3 paying twice
   does not charge twice` sit INSIDE `if (typeof payFeeFromWallet !== "function")` — the ABSENT
   branch. From the moment the feature shipped, the else-branch ran instead and drove an
   **unfunded** applicant. ⭐ **A guard whose happy path lives in its own absence-handler tests
   nothing once the feature exists**, and reads as thorough forever.
3. **`test:agent-application-security` (110/0) proves a submit works — over the LEGACY rail.** It
   uploads a `FEE_RECEIPT` and types a reference. Green about a rail the product no longer offers.
4. **The money guards were all correct.** The debit, the ledger legs, the trial balance, the
   refund mirror — every one of them green, because **the money moved perfectly.** Only the
   *door afterwards* was shut. ⭐ Same shape as 3.4: *the money guard could not see it.*
5. **`recomputeDraftStatus` was fixed and `missingForSubmit` was not** — two functions encoding
   the same "is the fee settled?" question, and only one was moved to read the disposition.

### The fix, and the two mutations that prove it

`missingForSubmit` now exempts `COLLECTED` as well as `WAIVED`, and pushes ONE token
`FEE_PAYMENT` — mirroring the client's single `missingFeePayment` entry. ⛔ **The legacy rail is
untouched:** a recorded reference against an uploaded receipt still satisfies it with the
disposition still `NONE`, which is how the one historical APPROVED agent got in.

`agent-fee-wallet-path` **34 → 49**, with a new §7 that drives seven documents, referees, a
funded wallet, a real payment and then `submitForReview`, and a new §8 that holds the other side.
⭐ **Both mutations caught, by DIFFERENT assertions** — which is the point:

| mutation | caught by | what it would have shipped |
|---|---|---|
| drop the `COLLECTED` exemption | §7.7, §7.8, §7.9, §8.5 | the defect itself — a payer blocked |
| delete the fee gate entirely | §7.2, §8.1, §8.2, §8.3 | **an UNPAID applicant submitting, `ok:true`** — a free agent |

⚠️ **The second mutation is the one that matters.** Deleting the two pushes outright makes §7 go
green instantly and turns a blocked-payer defect into a free-agent defect, which is strictly
worse. A guard that only tested the first direction would have applauded it.

⭐ **The lesson, in the campaign's own terms:** the assertion *"a funded applicant becomes able to
submit"* was a HEADING, not a test. Ask of every guard not only *"would this still pass if the
feature were absent?"* but also **"which branch of this guard actually executes today?"** — a
section whose real assertions live in the not-yet-built branch is worse than no section, because
the ledger row beside it says ✅.

---

## §5c · ✅ WHAT IS LIVE AS OF 2026-09-11 — verified by commit hash, not by uptime

**`31883970` is RUNNING in production.** Units **0, 1, 2, 3, 5, 6.1, 6.2, 7.3, 8.2, 8.3** are
shipped and verified. Two guards on `predeploy` (chain at 98): `test:agent-fee-wallet` **58/0**
and `test:agent-fee-wallet-path` **34/0** — 92 assertions.

⛔ **THE LAST PUSH SKIPPED THE FULL BOARD**, at Ali's explicit instruction ("push now all to live
I have to leave"). What DID run on the integrated tree: `tsc` clean, plus `agent-fee-wallet`,
`agent-fee-wallet-path`, `agent-application-security`, `trial-balance`, `ledger`, `i18n`, `audit`,
`wallet`, `integrity`, `decomment`, `type-scale` — all PASS. ⚠️ **SO THE FIRST JOB OF THE NEXT
SESSION IS `npm run test:all`.** If a 14th red appears, it is from `31883970` and it is ours.

⭐ **THE ONE THING THAT WOULD HAVE COST REAL MONEY, and it was created BY this campaign:**
`recordFeeRefund` posted the ledger mirror and touched **no wallet**. Correct while every fee
arrived in a bank account; wrong the moment a fee could be paid from a balance — the applicant's
`PLAYER:` account credited, their wallet unmoved, `computeTrialBalance` drifting by the whole fee
forever, and the person we refused out of pocket while our books said we paid them. Fixed by
`refundAgentRegistrationFeeToWallet`, the exact mirror of the debit.

---

## §6 · ⏭️ RESUME AT

**Session 1 · SHIPPED AND LIVE `c5dd7918` — Units 0, 1, 2, 7.3 and 8.2/8.3 sealed. Units 3, 4, 5,
6 and 7.1/7.2 remain.**

### What is live, and how it was verified
`d9de3eaf..c5dd7918`, six commits, deployed **SUCCESS** and verified three independent ways:
- `railway deployment list --service 50pick --json` → `status=SUCCESS`, and `railway status --json`
  → the RUNNING deployment's `meta.commitHash` **names `c5dd7918584b`**;
- `/api/health` `uptimeSec` reset **687 → 63**;
- the migrations' artifacts re-read on production (enum value, enum labels, column, both
  `_prisma_migrations` rows `finished`), and `/`, `/agent`, `/legal/agent-terms`, `/help` all 200
  with `/wallet` correctly 307 — ⭐ a render check, because a green `next build` has taken every
  page down in this repo before.

⛔ **AND CORRECT §0.3 WHILE YOU ARE HERE — A RESET `uptimeSec` IS NOT PROOF EITHER.** With two
sessions deploying minutes apart it cannot say *whose* container came up, and the health payload
carries `"version":"1.0.0"` with **no commit SHA**. ⭐ **`meta.commitHash` is the only reading that
NAMES the commit.** Also: `railway status`'s `deploymentStopped:true` / empty `instances` means
"no instance YET", not "failed" — I read it as a failed deploy and was wrong; the authoritative
field is `deployment list`'s `status` (mine sat at `BUILDING` → `DEPLOYING` → `SUCCESS`).

### ⭐ THE MIGRATION ORDER THAT MADE THIS SAFE — do the same next time
`package.json`'s `start` is `prisma migrate deploy && node scripts/seed-test-float.mjs &&
next start`. ⛔ **It is an `&&` chain: a failing migration means `next start` never runs and the
whole live platform is down.** So the two migrations were **hand-applied to production BEFORE the
push**, with the app still up as a safety net, exactly as `20260907120000`'s own comment records as
house practice. Pre-flight `prisma migrate status` showed **75 found, only my two pending** — no
drift. Both are `IF NOT EXISTS`, additive, and write no data; the schema being AHEAD of the code is
safe because the column is nullable and the enum value unused. ⛔ **Nothing was backfilled** — the
one APPROVED row still reads `feeFundingSource: null`, because its fee was collected at 18% VAT and
the 2026-09-09 ruling is not retroactive.

### 🔴 START HERE — Unit 3, and the ONE LINE that traps a paying applicant
1. ⛔ **`recomputeDraftStatus` (`agent-application-service.ts:409-417`) is the highest-value line
   left in the campaign.** It reads
   `const feeRecorded = !!app.feeReference || app.feeDisposition === "WAIVED";`
   A wallet payment writes **no `feeReference`**, so it must become
   `… || app.feeDisposition === "COLLECTED"`. **Without it an applicant who has PAID can never
   reach `PAYMENT_PENDING`, and `submitForReview` is the only door into review** — they have paid
   and cannot submit. Guard it before you fix it.
   ⚠️ Same shape at `apply-client.tsx:131-132`: `missingNow` adds `missingReceipt` /
   `missingReference`, so `canSubmit` never becomes true either.
2. ⛔ **TWO DEAD ENDS THE BRIEF DID NOT ANTICIPATE.** Paying from a wallet inherits **every
   precondition of depositing**, and `wallet/deposit/page.tsx:173-180` renders gates instead of the
   form for two:
   - **KYC APPROVED.** `applicantEligibility:219-223` already refuses self-service without it, so
     a self-service applicant is fine. ⛔ **But `if (!opts.forInvitation)` exempts an
     OFFICER-INVITED applicant deliberately** — under the old rail they paid by bank transfer, so
     KYC was irrelevant to paying; under the wallet rail **they cannot deposit and cannot pay**,
     and nothing tells them why. ⚠️ `agentInvitationHtml({ feeWaivable: true })` (`:1248`) is
     hard-coded, so the email says the fee *may* be waived while the waiver is a separate officer
     action — an unwaived, un-KYC'd invitee is trapped.
   - **EMAIL VERIFIED.** Deposit requires it; `applicantEligibility` never checks it.
   ⭐ The module's own law says where these must bite (`:29-33`): *"BEFORE the applicant is asked
   to pay."* `KycGatePanel` takes a `returnTo`, so both become gates rather than dead ends.
3. Then Unit 4 (⛔ `/admin/agents/[id]/page.tsx:210-211` renders **two em-dashes** where the
   receipt ref and attested amount used to be — condition them on the funding source; `:65`
   `feeShownTzs` needs the wallet path to stamp `feeAmountTzs` or the officer sees today's config
   figure), then 5, 6, and 7.1/7.2 as **non-regression guards, not a backfill**.
4. **Unit 6 strings are all located** — `feeBody` (i18n `2270`/`4338`/`6386`), `payInstruction`
   (`2364`/`4430`), and the whole `payReference*` / `missingReceipt` / `missingReference` family.
   `payWaived` and `payRefundOwed` stay true. `AGENT_TERMS_VERSION` must bump (binding text moves
   in all three locales); ⚠️ nothing compares it to a stored value so it forces no re-acceptance,
   and production holds one accepted version (`2026-09-07`) plus one null.
   ⚠️ `agentFeeRefundedHtml` (`server/email.ts:1821`) tells a refunded applicant the money went to
   a masked **bank account** — false under the wallet rail. My range is the agent bodies; the peer
   owns `REPLY_TO` and its call sites wherever they fall.

### ⚠️ Corrections to THIS BRIEF, all re-derived from source
| the brief says | the truth |
|---|---|
| §2 row 0.2: *"all three"* statements | **TWELVE.** Full list in the row. |
| §3: *"`withLock(…)` autocommits, and the DAL … never reads a store"* | ⛔ **It DOES read a store.** `locks.ts:46` holds an `AsyncLocalStorage`, `:140` publishes the tx, and `withMoneyTx` (`ledger.ts:69`) calls `currentLockTx()` and **JOINS** it. The actionable half — pass `tx` to every DAL call — is right. |
| §0.4: *"`F:\kipindi-main` holds the Railway CLI link"* | ⛔ **F: does not exist on this machine.** No `.env` and no `.railway` in either checkout. Use `railway link -p 50pick -e production`, then `railway run --service Postgres -- <cmd>` for `DATABASE_PUBLIC_URL`. ⚠️ The Railway **MCP** works only if you pass `project_id` explicitly (`5e87353c-1d59-433d-a683-a32b9149f74c`); it cannot discover the link. |
| §0.1 step 5: baseline **311/324** | ✅ Confirmed by running it. ⚠️ **Now 312/325** — `test:all` discovers every `test:*` key, so declaring one adds a suite. |
| §0.4: split `email.ts` by line range | ⛔ **Unsatisfiable.** `REPLY_TO` is one module-scope binding used from `:364` to `:1889`, so any refactor crosses any line boundary. ⭐ **Declare ownership by UNIT (function/export), never by line range**, and a shared module-scope helper belongs to whoever owns the helper. |
| §0.4 says nothing about the generated Prisma client | ⛔ **ADD IT: a schema change is NOT carried by `git pull`.** `node_modules/@prisma/client` is a build artifact, and neither a rebase nor `test:all` regenerates it. The peer integrated this campaign's schema commit and got `typecheck` + `test:backup` red — *"Type `'AGENT_REGISTRATION_FEE'` is not assignable to type `TxnType`"* in `prisma-dal.ts`, in files they had never touched. ⭐ **`npx prisma generate` after integrating any schema change**, then re-run. Same family as the `jsqr` `MODULE_NOT_FOUND`: read the FIRST failure's text before believing a red. ⚠️ And it is why §0.4's *"re-run `test:all` AFTER integrating"* earned its keep — a pre-integration board would have pushed a tree never typechecked against the other session's schema. |

### ⭐ Two lessons from the guard work, both earned the hard way
- **A guard that drives a function directly can be blind to its CALL SITES.** Flipping
  `reconcileFee`'s `source` to `"WALLET"` — the exact defect the parameter exists to prevent — left
  the suite 34/0. §4 fixes it with source assertions.
- **A guard that runs only on the in-memory store is blind to every protection that exists for
  real Postgres.** Deleting `requireBalanceGte` also left it 34/0, because one lock serialises
  everything and the race cannot be staged.
- ⚠️ **And a hard-coded population is only as current as its last editor.** One deliberate schema
  change moved THREE counts and only one announced itself; `activity-summary` §C.0 was quietly
  covering 12 of 13 types, so an applicant charged a fee would have seen it nowhere in their
  activity summary. ⭐ Prefer a DISCOVERED population with a ratchet on the discovery itself —
  a broken scan that finds zero passes beautifully.

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

---

## §7 · ⭐ DECISION LOG — what this campaign decided on the owner's behalf

⛔ **Append a row for EVERY decision taken under §0.5, in the commit that acted on it.** Empty is a
valid state; a decision missing from here is not.

| # | Decision taken | Alternative rejected | Which §0.5 criterion settled it | Touches | Money / binding / compliance? |
|---|---|---|---|---|---|
| **1** | **Work from a dedicated `git worktree`** (`F:\kipindi-seal`, branch `payments-seal-s3`) instead of sharing `F:\kipindi-main` with the peer session. | Continuing in the shared checkout and serialising every board by message. | §0.4's own ⛔ *"WORKTREES, NOT A SHARED DIRECTORY"*, and criterion 3 — it makes the whole collision CLASS impossible rather than merely unlikely. We had already lost a stash race and run two overlapping boards within 15 minutes. | working tree only; no product code | no |
| **2** | **`missingForSubmit` emits ONE settlement token `FEE_PAYMENT`**, replacing the `FEE_RECEIPT` + `FEE_REFERENCE` pair, and exempts `COLLECTED` alongside `WAIVED`. | The smaller edit: keep both tokens and merely add `&& !== "COLLECTED"`. | Criteria 1 and 2 — the CLIENT already states this rule as a single settlement-keyed entry (`missingFeePayment`), so one concept matching the existing precedent beats two lists that have now demonstrably drifted apart. | `agent-application-service.ts` `missingForSubmit`; `admin/agents/[id]/page.tsx` `MISSING_WORD` | ⚠️ **YES — it unblocks a paying applicant who could not apply.** No money moves differently; the fee is still required, and §8 proves an unpaid applicant is still refused |
