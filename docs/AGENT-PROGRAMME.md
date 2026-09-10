# 50pick Agent Affiliate Programme — the authority

**v2, 2026-09-07.** Rewritten after a 293-agent adversarial stress-test raised 142 findings and
confirmed 78 — including one that **overturned v1's architecture**. Evidence:
[`AGENT-STRESS-TEST-FINDINGS.md`](AGENT-STRESS-TEST-FINDINGS.md). Build instructions:
[`SESSION-PROMPT-AGENT-BUILD.md`](SESSION-PROMPT-AGENT-BUILD.md).

**Source of record:** the management framework `50pick_affiliate_agent_framework`, taken as the
decision wherever it speaks. Where it is silent, Ali's rulings fill the gap. Where it is **wrong
about this system**, §10 records the correction.

⛔ **This file is the authority for _what_ the programme is.** Rates live in
[`RULES.md`](RULES.md) §2.10 and nowhere else.

> ✅ **BUILT 2026-09-07 on branch `agent-affiliate-programme` · MERGED to `main` as `a783299f` and LIVE on
> 50pick.tz at 13:54 UTC the same day, on Ali's instruction** (every push to `main` deploys live). The decision record is `COMPLIANCE-DECISIONS.md` § 2026-09-07; the rule is
> `RULES.md` §2.10; the code is `src/lib/server/agent-config.ts`, `affiliate-service.ts`
> (`policyFor`, the one resolver) and `agent-application-service.ts`; the surfaces are `/agent`,
> `/agent/apply`, `/agent/status`, `/agent/invite/[token]`, `/legal/agent-terms`, the dashboard on
> `/profile/invite`, and the console `/admin/agents` (+ `/admin/agents/[id]`). Guards, each with a
> red harness: `test:agent-policy` · `test:programme-isolation` · `test:attribution-provenance` ·
> `test:no-double-pay` · `test:agent-clawback` · `test:commission-bounded` · `test:agent-eligibility`
> · `test:agent-application-security` · `test:dal-parity`; the five-persona browser drive is
> `npm run qa:agent-drive` — it needs a **fresh** `next dev -p 3210` (the in-memory DAL carries an
> earlier run's enrolled officer and approved agent otherwise; the drive aborts with exit 2 and says
> so) and `SERVER_LOG=<the dev server's log>` to read OTPs and invitation texts. Sections below
> marked 🔴/⚠️ describe the world BEFORE the build; the ✅ notes beside them say what closed each one.

---

## AMENDMENT · 2026-09-08 · MANAGEMENT'S FEEDBACK ON v1

⭐ **READ THIS BEFORE §5.** It supersedes four of the decisions recorded there — the rate, the
VAT treatment, the unit of the review promise — and adds a deduction the platform did not model.
`RULES.md` §2.10 carries the same amendment as the rule.

**Source** *Feedback for the Agent v1* (`~/Downloads`), five annotated screenshots of the live
`/agent` page. Their annotations, verbatim, and what each became:

| Their note, against | What it said | What was done |
|---|---|---|
| the "What you earn" tile | "Agent fee = 10% of commission on winnings after tax" | `defaultCommissionPct` 20 → **10** |
| the "What it costs" tile | "TZS 100,000 + VAT = 118,000" | `feeVatTreatment` INCLUSIVE → **EXCLUSIVE**; the applicant-facing total was TZS 118,000. ⭐ **SUPERSEDED 2026-09-09** — Ali ruled the fee bears **no VAT**, `feeVatRatePct` is **0**, and the tile now reads **TZS 100,000** with no VAT sentence at all |
| the "Approval time" tile | "5 Working days" | the copy reads **working days** in all three locales, and `/admin/agents` measures the SLA with `workingDaysBetween` so the promise and the "Past SLA" chip are one fact |
| the commission paragraph | "Remove this and Keep this below:" — followed by an eight-row financial waterfall | the paragraph (`agent.earnBody`) is **deleted**; the waterfall is rendered on `/agent` from `src/lib/agent-commission.ts` |

### The waterfall they drew, and the one line the platform did not have

Their table adds a row the platform had never modelled: **local withholding tax, 5% of the
agent's earnings**. Drawing it while the engine credited the gross would have been a false money
statement, so it is implemented for real — deducted at accrual, remitted to `HOUSE:TAX` in the
same balanced ledger group as the credit, recorded on the `ReferralReward` row as gross/tax/net,
and reversed **in proportion** by a clawback.

| Step | Their figure | Ours | Why |
|---|---|---|---|
| Referred players' winnings | 1,000,000.00 | 1,000,000 | the worked example's base |
| Gross platform commission (13%) | 130,000.00 | 130,000 | §2.1 loser-share fee |
| · TRA (10% of the fee) | 13,000.00 | 13,000 | `levySplit` |
| · GBT (5% of the fee) | 6,500.00 | 6,500 | `levySplit` |
| Net 50pick commission | 110,500.00 | 110,500 | the only base an agent is paid on |
| Agent share (10% of net) | 11,050.00 | 11,050 | `Math.floor` |
| · Local withholding (5%) | 552.50 | **553** | ⚠️ see below |
| **Net agent payout** | **10,497.50** | **10,497** | ⚠️ see below |

⚠️ **THE ONE PLACE WE DO NOT REPRODUCE THEIR SPREADSHEET TO THE CENT.** TZS has no
circulating subunit and every money column in this platform is a whole number of shillings, so
5% of 11,050 is `Math.round(552.5)` = **553** and the payout is **10,497**. Their figures carry
two decimals. This is a PRESENTATION difference of half a shilling, not an economics one — and
rendering a decimal the ledger cannot pay would be the worse error. `Math.round` was chosen over
floor or ceil because it is how `levySplit` already rounds TRA and GBT: the same kind of
statutory deduction on the same fee, rounded the same way, needs no special pleading.

⚠️ **Their table's last row is labelled "NET AGENT PAYOUT PER WINNING PLAYER".** It is not per
player — it is the payout on the whole TZS 1,000,000 aggregate the table starts from. The
rendered row reads **"Net agent payout"**; keeping their label would have made the table
contradict its own first line.

⚠️ **Two columns, not their three.** Their document sets PARAMETER · AMOUNT · NOTES side by
side. §A6's floor is zero horizontal overflow at 360px, and in Swahili — 35–40% longer than
English — a third prose column either scrolls sideways or wraps to six lines a row. Every word
of every note is kept, set UNDER its parameter instead of beside it. Verified at 360/768/1280 in
all three locales: `node scripts/live/agent-v1-visual.mjs` (135 assertions).

## 1 · What an agent is, and is not

A vetted, fee-paying, compliance-approved business partner who introduces players and earns
commission on the revenue those players generate.

| An agent **is** | An agent is **not** |
|---|---|
| A recruiter with a verified identity and a public badge | A cashier — they never hold float |
| Paid commission on revenue we actually **kept** | Paid for signups alone |
| Approved once, by a compliance officer | Self-service, or assignable from the staff-roles screen |
| An ordinary player account with `role = AGENT` | Staff — `isStaffRole` excludes AGENT; it reaches no admin surface |

⛔ **Recruiter only** (Ali, 2026-09-06). The framework's §3 *"peer-to-peer top-ups"* language
describes an agent float / cash-in-cash-out product. **Out of scope, and must not be built.**
Players deposit themselves through Selcom, exactly as today.

⭐ **Single level. No downline.** An agent earns on their recruits' own betting, **never** on
their recruits' recruits. A programme that pays on a second level is a pyramid scheme and is
regulated as one. The engine is single-level today; this must be **stated and guarded**, not left
as an accident of implementation.

---

## 2 · The lifecycle — two doors, one state machine

```
SELF-SERVICE   /agent → apply → pay → submit ──┐
                                               ├─→ UNDER_REVIEW → APPROVED
OFFICER-LED    invite → INVITED → accept ──────┘         ↘ REJECTED (fee refunded)
                                                         ↘ DECLINED / EXPIRED
```

| State | Meaning |
|---|---|
| `DRAFT` | Started, still attaching documents |
| `INVITED` | An officer proposed it; awaiting the invitee's acceptance |
| `KYC_SUBMITTED` | All documents attached |
| `PAYMENT_PENDING` | Fee reference + receipt recorded (or waived), awaiting submit |
| `UNDER_REVIEW` | ⭐ Shown to the applicant as **"Awaiting Compliance Approval"** — the framework's own wording |
| `ADDITIONAL_INFO_REQUIRED` | An officer asked for a clearer document. ✅ **Exit built (2026-09-07):** re-attaching every slot the officer named and pressing Submit again returns the application to `UNDER_REVIEW` (`submitForReview`) |
| `APPROVED` | Role granted, code minted |
| `REJECTED` / `DECLINED` / `EXPIRED` | Refused, declined, or the invitation lapsed. Fee refunded |
| `REVOKED` | ⭐ **Added 2026-09-07.** An officer revoked an already-approved agent (`revokeAgent`) — distinct from `deactivateAgent`, which pauses standing and keeps the row reactivatable. `REVOKED` closes the application record; the agent's earned commission stays theirs (payable), the code stops binding, and re-application follows the 90-day cooldown unless the reason was terminal |

⭐ `ADDITIONAL_INFO_REQUIRED` is the state the framework omits, and it is not optional: without
it a blurry scan forces a rejection, which triggers a refund and a re-application for something
one message solves.

---

## 3 · The documents — framework §2, verbatim

Seven: **CV** · **formal request letter** · **Serikali ya Mtaa letter** · **referee letter ×2** ·
**referee national ID ×2** (the framework requires *"clear copies of the referees' national
identification documents"*).

⭐ The framework's fifth item, *"Government-Issued Identification"*, **is the platform's existing
KYC** — live and certified (D1–D4, the only 4 of 52 certified modules). An applicant may not
submit until their own `KycSubmission` is `APPROVED`. ⛔ Do not build a second identity flow.

🔴 **Referee national IDs are third-party personal data.** The referee never used 50pick and never
consented in-app. They need a lawful basis, a retention row, an erasure path and a DSAR route —
none of which exist today, and the erasure sweep is a hardcoded bucket list that passes clean over
them. ⛔ And **never put a name or phone in the R2 object key**: that is the one class of PII
erasure can never reach.

---

## 4 · The fee — framework §2 Step 2

| | |
|---|---|
| **Amount** | ⭐ **TZS 100,000 — NO VAT** (Ali, 2026-09-09; supersedes management's 2026-09-08 VAT-exclusive 118,000, which superseded the VAT-inclusive decision of 2026-09-07). `registrationFeeTzs` holds 100,000, `feeVatTreatment` stays `EXCLUSIVE` and `feeVatRatePct` is **0**, so `feeBreakdown().totalTzs` is **100,000** and `vatTzs` is **0**. ⛔ What an applicant owes is `feeBreakdown().totalTzs` and nothing may quote the raw config field. ⛔ At a zero component **no surface may state a VAT treatment** — the binding terms and `/agent` go silent, or they render "(TZS 100,000 plus TZS 0 VAT)". ⛔ **NOT retroactive**: the one agent registered before it paid **118,000** and `HOUSE:TAX` holds that 18,000 as a genuine liability to TRA. Stated in `RULES.md` §2.10 · `COMPLIANCE-DECISIONS.md` § 2026-09-09 · `npm run test:agent-fee-copy` |
| **Destination** | ⚠️ **NO LONGER THE LIVE RAIL** (Ali, 2026-09-10) — the fee is paid from the wallet, so no applicant is given a destination account. `feeDestinationName` / `feeDestinationAccount` remain in config for the LEGACY out-of-band path and the withheld QR only. The rest of this row is the historical record: **Digital Selcom Bank, account 0769777877.** ✅ Re-read on production 2026-09-09T17:31Z and this row was CORRECT then. ⚠️ It briefly was not: from 2026-09-08T17:42:24Z the live row read `Selcom LIPA NAMBA - OCEAN ENTERTAINMENT LIMITED` / `7006 3747` for the Lipa QR programme, and the money gate flagged this line as stale on that basis. The QR was then WITHDRAWN — a Lipa Namba payment carries no reference on any network, so it cannot be traced to a payer — and the destination was restored through the audited admin path at 2026-09-09T11:08:41Z. ⭐ The lesson is the flag, not the row: a note that says "production reads X" is only true at the moment it was read, and this one was falsified within hours. `MONEY-GATE-REMEDIATION.md` §7.1 |
| **How** | ⭐ **PAID FROM THE APPLICANT'S WALLET** (Ali, 2026-09-10). They deposit on the ordinary rails, then pay the fee from that balance — no receipt, no typed reference, no officer attestation. ⛔ **Reason: a Lipa/QR payment carries no reference on any network and a bank receipt is only as good as the human reading it; a wallet debit carries the payer's identity by construction.** ⚠️ Supersedes the out-of-band rail of 2026-09-07. `COMPLIANCE-DECISIONS.md` § 2026-09-10 |
| **Waiver** | ⭐ An officer may waive it or record it as collected in cash — **with a typed reason, audited** (Ali, 2026-09-06) |
| **On rejection** | **Refunded in full** — we did not provide the service |

⭐ **The fee ENTERS the player ledger** (Ali, 2026-09-10) — it is debited from the applicant's
wallet, so it carries a `Transaction` and a balanced `LedgerEntry` group whose money-in leg is
the **PLAYER** account. ⛔ **Never `EXTERNAL:SELCOM`**: those shillings already entered as a
DEPOSIT, and booking them again would count the same money twice.

⚠️ **This reverses the rule that stood until 2026-09-10, and it has a price this document used to
state as a benefit.** The programme no longer "adds zero risk to the money invariants" — it is
now **inside** them. A wallet never goes negative, a ledger group sums to zero, and the fee can
race a bet for the same balance, so the debit must be **all-or-nothing, row-locked and
idempotent**. `COMPLIANCE-DECISIONS.md` § 2026-09-10.

✅ **It posts a `LedgerEntry` (2026-09-07).** `agentRegistrationFeeEntries` books the fee to
`HOUSE:AGENT_FEE` with its VAT split at reconciliation, so the house book, trial balance,
regulator pack and the tax figures all see it. ⭐ **VAT is settled, and the answer is NONE**
(Ali, 2026-09-09): `feeVatRatePct` is **0**, so `feeBreakdown()` — still the one place the split
is computed — returns **TZS 100,000 payable with a zero VAT component**, and
`agentRegistrationFeeEntries` omits the `HOUSE:TAX` leg entirely. The `EXCLUSIVE` treatment
remains set but adds nothing at a zero rate, and the `INCLUSIVE` treatment exists in config for
a future change of policy and is not in force.

⛔ **A REFUND REVERSES WHAT WAS BOOKED, NOT TODAY'S RATE.** `recordFeeRefund` reads the VAT leg
the collection actually posted (`ledgerGroupAccountSum`), so the one application collected at
18% still nets `HOUSE:TAX` to zero if it is ever refunded. Computing the reversal from live
config would have returned its full 118,000 and reversed **zero**.

🔴 **One receipt, one application** — `feeReference` is unique. And a refund needs **evidence and a
deadline**: money *in* requires a receipt image, so money *out* must not be one officer typing a
string. Reject and refund need **one worklist**, or TZS 100,000 sits owed with nothing tracking it.

### 4a · Paying it by QR (2026-09-08)

The fee may be paid by scanning Ocean Entertainment's Selcom merchant QR instead of typing an
account number. **The authority is [`LIPA-QR.md`](LIPA-QR.md); read it before touching any of
this.** The two things that matter here:

- ⭐ **This is the only surface the QR is allowed on**, and the reason is the row above: the fee
  is reconciled by a *person*. The QR is **static** (EMVCo tag 01 = `11`, decoded from the
  artwork, not assumed) — it carries no amount and no per-payment reference, and our rail
  credits a wallet solely on the `dep_…` order id we mint. On a self-service top-up it would
  take money and credit nobody, silently. `test:lipa-qr` §4.4 enforces that.
- 🛑 **The Lipa QR is WITHDRAWN** (`LIPA_QR_RELEASED = false`, `LIPA-QR.md` §3d), so it renders on
  no surface and the fee runs on the normal flow: the account as text, the receipt uploaded, an
  officer reconciling it. ⭐ A Lipa Namba payment carries no reference on any network — on M-Pesa,
  Mixx, Airtel and HaloPesa the payer enters only the Lipa number and the amount — so it cannot be
  traced to the payer, and payment without traceability is why it went. The safety rule still holds
  underneath the gate, and re-enabling needs Selcom confirming a verifiable per-order QR.

---

## 5 · What an agent earns

**Commission on revenue.** From framework §4: *"track user acquisition, volume turnover, and
automated commission payouts."* No flat sign-up prize is mentioned, so **none is paid**.

🔴 **On the NET fee, not the gross.** Commission is a share of the operator fee 50pick actually
**kept** — roughly 15% of the gross fee has already left as TRA and GBT levies (`RULES.md` §2.2).
Paying on the gross would share out money we never had.

⭐ **Priced at settlement, on fee collected — not on turnover.** This engine once accrued at bet
time against `stake × rate` and it was fixed as a defect: a share of turnover can exceed the
revenue that turnover produced. ▶ *"Volume turnover"* is honoured as a **display** — the sub-ledger
shows turnover and revenue, and pays on revenue.

**Rate:** ⭐ **one rate per agent** (Ali — the framework specifies no tiers, so there are none).
⛔ The `tier` column is **dropped**, not left dead — **in two releases, not one** (expand →
contract on Railway, `docs/…expand-contract`): release 1 (2026-09-07) removed `tier` from
`schema.prisma`, both DALs and every reader with **no DDL**, so a container still running the
previous build never selects a column that is gone; release 2, after one deploy has run without
reading it, is the one-line migration below. ⛔ Do not fold it into a feature migration.

```sql
-- prisma/migrations/20260907140000_agent_tier_drop/migration.sql  (release 2 ONLY — release 1 went live 13:54 UTC 2026-09-07; SAFE TO SHIP NOW)
ALTER TABLE "AffiliateAgent" DROP COLUMN IF EXISTS "tier";
```

| Term | Value (Ali, 2026-09-07) |
|---|---|
| **Normal rate** | **10%** of the net operator fee (management, 2026-09-08; was 20%) — of every TZS 100 we keep from that agent's recruit, TZS 10 is allocated to the agent, and **5% of that is withheld** as local tax, so TZS 9.50 reaches their wallet |
| **Hard ceiling** | **40%** — no officer may set more. A *rule*, so it belongs in `RULES.md` §2.10 |
| **Window** | **Lifetime** — an agent earns for as long as the recruit keeps playing |
| **Per-recruit cap** | **None** |

⚠️ **TWO SCALES EXIST IN THIS CODEBASE AND THEY ARE NOT THE SAME.** `AffiliateAgent.commissionPct`
is a **percent** (`10.00` = 10%); the player config's `commission.rate` is a **fraction**
(`0.5` = 50%). ⛔ Never feed one into the other. The agent resolver reads the percent.

⭐ **Lifetime and uncapped is safe** precisely because the base is the fee we *kept*: the house
always retains the majority, so commission can never cost more than the recruit earned us.

🔴 **Only `approvedAt` identifies an agent.** `AffiliateAgent` is *simultaneously* every player's
referral account and the vetted-agent record: rows already exist for ordinary players, each with
`commissionPct` NOT NULL defaulting to **5.00** and `active` defaulting **true**. So a row's
existence proves nothing, and a "refuse when the rate is unset" branch is unreachable. Make
`commissionPct` **nullable with no default**, and treat `approvedAt` as the only discriminator.
⚠️ `approveAgent` therefore **UPDATEs** a row that already exists with a player-format code.

**Paid as real, withdrawable cash** — no wagering requirement, its own transaction type, its own
line in the owner's book. ⛔ Never `BONUS_CREDIT`: that reports agent commission to the regulator
as *bonus cost*, for a programme we told the Board we withdrew.

**Recorded per accrual:** `rateApplied` and `programme`, so a later rate change never rewrites
history.

### 5b · Responsible gambling — commission is a payable, not a promo

🔴 **The one place the agent rule departs from the player rule.** RG suppression exists to stop
*promotional inducements*. Agent commission is **contractual income for services rendered**. It
must not be paid into a self-excluded person's wallet — and it must not be destroyed either.
Accrue it as a **payable** and settle it out of band.

⛔ Today it would be written `HELD`, and `HELD` is terminal **and consumes the once-per-recruit
budget** — a business debt silently written off.

⛔ Separately: **a self-excluded, suspended or closed agent must stop recruiting.** Eligibility
today reads the **role** and never the **account status**.

---

## 6 · Agent and player referral — where the line runs

> **Separate the policy. Share the ledger. Never fork the attribution.**

| Layer | Shared or separate |
|---|---|
| **Attribution** — who recruited whom | ⭐ **SHARED — one system, always.** Two attribution stores would let one player be recruited twice and both referrers paid |
| **Provenance** — under which programme | Stamped **on the attribution at bind**, immutable (§6b) |
| **Economics · destination · caps · switch · config · admin surface** | 🔴 **SEPARATE** |
| **Ledger** | One table, one `programme` column |

### 6b · 🔴 Provenance is stamped at bind — the exploit this closes

**v1 was wrong.** It put `programme` only on the *reward*, derived at accrual from the referrer's
**current role**. That is a **purchasable arbitrage**: farm attributions for free as an ordinary
player, then pay the registration fee for AGENT status, and every one of those old binds flips to paying
agent commission at the negotiated rate — with the window opening on recruits who joined months
ago.

✅ **Stamp `recruitedProgramme`, `recruitedAt` and `recruitedByCode` on `User`**, in the same write
that already sets `recruitedBy`. Two columns beside an existing one — **not a new table**, which
would create a second writer beside readers that already exist. Legacy rows backfill to `PLAYER`;
**NULL means PLAYER**, never a fall-through to the agent branch.

⛔ **Do not gate on `boundAt >= approvedAt`.** That is a second discriminator derived from mutable
state: a deactivate→reactivate restamps `approvedAt` and silently deletes the agent's genuine book.
`programme === "AGENT"` alone is immutable and sufficient.

### 6c · The invariant

> **One referrer, one programme, one payment per event** — decided by the programme **stamped on
> the attribution**, never by the referrer's current role.

---

## 7 · Officer-initiated invitation

⭐ **The invitee's acceptance is the second party.** Self-service has a two-party control built in
— the applicant submits, a different person approves. An invitation removes it, letting one
officer mint an agent single-handedly. So **an invited application can never be approved before
the invitee accepts**, and every document records **who supplied it**.

🔴 **KYC cross-acceptance, done safely.** Agent paperwork cannot satisfy player KYC — that needs
NIDA/passport/licence/voter **plus a selfie**, format validation, the one-document-one-account
index and four attestations. ✅ The invitation collects the **standard KYC documents** alongside,
and the officer's single approval writes an `APPROVED` `KycSubmission` **through the ordinary KYC
service**: one review, two records, no second trip. ⛔ Never flag an agent KYC-approved without the
identity documents actually being checked. **The invitee uploads their own ID and selfie** — an
officer cannot take a selfie for someone else.

**Token:** single-use · expiring · bound to the officer-entered phone with OTP proof · revocable ·
audited on issue, accept, decline, expiry and revoke.

**Refused at issue** (not at acceptance): already an agent · staff · self-excluded.

---

## 8 · What the player sees — framework §3

- **"Verified 50pick Agent"** with the agent's name and registration status, on the register page
  ribbon. ⚠️ Needs a read model — it is required by the verification and absent from the build.
- **Responsible gaming**: `18+ · Cheza Kwa Busara · Bara & Zanzibar` — ✅ already live in the footer.
- **Fees.** The framework says "fees (0%)": true of deposits, **false of withdrawals** (1.5%).
- ⛔ **Dispute tickets tied to an agent** (framework §3) are **not built** — they exist to escalate
  *transaction* queries against an agent who handled your money, and under recruiter-only no agent
  ever does.

---

## 9 · The agent's code

Framework §4: *"unique cryptographic referral tokens (`50PICK-AG-[ID]`)"*, minted **at approval** —
§2 Step 3 is explicit that the ID is generated *upon clearance*.

🔴 **The registration path truncates a referral code at 16 characters and fails silently.** The
prefix is 10, leaving six for the ID — no error, no audit row, the attribution simply lost. The
limit must be raised **and** the format validated.

---

## 10 · Where the framework is wrong about this system

Correct these before the document reaches an applicant or the Gaming Board.

| Framework says | Reality |
|---|---|
| "Secure **AWS S3** with AES-256" | Cloudflare **R2** (`50pick-kyc`, WEUR), or base64 in Postgres when `KYC_STORAGE` is unset |
| "**Automated webhook** matching registration-fee deposits via Selcom Bank API" | Does not exist. Reconciliation is a **human officer** reading a receipt |
| "displaying fees (**0%**)" | Deposits 0%; **withdrawals 1.5%** |
| "peer-to-peer top-ups" through an agent | Out of scope — recruiter only (§1) |
| "volume turnover" as the commission base | Displayed; **paid on the net fee actually collected** (§5) |
| Agent vetting alongside "sanctions screening of all users and beneficial owners" | ⭐ **There is no automated sanctions feed** (`kyc-risk.ts` assigns no sanctions points by design). Sanctions/PEP is an **officer checklist item** at every identity and EDD review. `/legal/aml` §4 was corrected to say so on 2026-09-07 (`COMPLIANCE-DECISIONS.md`); the framework must describe the officer check, not a feed |
| Tiered agents (`tier` column) | **None** — one rate per agent (§5). The column is contracted out in two releases; the framework must not describe tiers |
| "Approved or rejected" as the only outcomes | Plus `ADDITIONAL_INFO_REQUIRED` (§2), `DECLINED` / `EXPIRED` for invitations, and `REVOKED` for an approved agent whose standing is withdrawn |
| Fee "refunded" with no clock | **Refunded within 7 days** of a rejection (`refundDeadlineDays`), tracked on the Refunds-owed worklist on `/admin/agents` and stated on `/agent` |

---

## 11 · Non-negotiables

- `/admin/agents*` → **`compliance`** domain with step-up 2FA. `/admin/affiliate` stays `growth`.
  ✅ **Fixed 2026-09-07:** every switch controlling agent money lives in `agent-config.ts` and is
  edited only on `/admin/agents?tab=settings` (compliance); the growth officer's `/admin/affiliate`
  reads the PLAYER promo only (`getAdminAffiliateStats` filters `programme !== "AGENT"`).
- **Single officer.** ⛔ No two-officer lock — Ali's dated decision; `test:two-admin` asserts its
  absence. Self-review is blocked; the invitee's acceptance is the second party.
- **Documents through the existing KYC storage seam only**, magic-byte validated on the sniffed mime.
- **Both DAL backends** plus the `DATA-LAYER.md` entity map. ✅ **Fixed 2026-09-07:**
  `db.affiliate.update` in Prisma is driven by `AFFILIATE_COLUMN` — a `Record<keyof
  StoredAffiliateAccount, …>` the compiler refuses to leave incomplete — and **throws** on an
  unmapped field rather than dropping it. `test:dal-parity` (230 checks) + `red:dal-parity` (5/5)
  prove a memory-only field cannot ship silently again.
- **`/agent/*` in en / sw / zh.** Admin console is English. Emails EN+SW; no Chinese in any email.
- **Approval is the only place `UserRole.AGENT` is ever assigned.**
- **A red harness per guard.** A guard that has never failed is a hypothesis.
