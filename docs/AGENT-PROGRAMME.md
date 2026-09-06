# 50pick Agent Affiliate Programme — the authority

**Decided:** Ali, 2026-09-06. **Source of record:** the management framework
`50pick_affiliate_agent_framework` (Confidential & Proprietary), taken as the decision wherever
it speaks. Where it is silent, Ali's rulings below fill the gap. Where it is **wrong about this
system**, §9 records the correction and the reason.

⛔ **This file is the authority.** Rates live in [`RULES.md`](RULES.md) §2.10 and nowhere else.
Nothing here may be restated in code comments or on a screen.

---

## 1 · What an agent is, and is not

An **Agent Affiliate** is a vetted, fee-paying, compliance-approved business partner who
introduces players to 50pick and earns commission on the revenue those players generate.

| An agent **is** | An agent is **not** |
|---|---|
| A recruiter with a verified identity and a public badge | A cashier — they never hold float |
| Paid commission on revenue we actually collected | Paid for signups alone |
| Approved once, by a compliance officer | Self-service, or assignable from the staff-roles screen |
| An ordinary player account with `role = AGENT` | A staff account — `isStaffRole` excludes AGENT, and it reaches no admin surface |

⛔ **Recruiter only** (Ali, 2026-09-06). The framework's §3 language about *"peer-to-peer
top-ups"* through an agent is **out of scope and must not be built**: it describes an agent
float/cash-in-cash-out product, which is a different, money-critical system. Players deposit
themselves, through Selcom, exactly as they do today.

---

## 2 · The lifecycle

```
PLAYER → KYC approved → APPLY → PAY → SUBMIT → UNDER REVIEW → APPROVED → RECRUITS → EARNS → WITHDRAWS
                                                            ↘ REJECTED → fee refunded → may re-apply
```

The framework's §4 state machine, honoured exactly, plus one state it omits:

| State | Meaning | Set by |
|---|---|---|
| `DRAFT` | Started, still attaching documents | Applicant |
| `KYC_SUBMITTED` | All seven documents attached | Applicant |
| `PAYMENT_PENDING` | Fee reference + receipt recorded, awaiting submit | Applicant |
| `UNDER_REVIEW` | Submitted. **Shown to the applicant as "Awaiting Compliance Approval"** — the framework's own wording | Applicant |
| `ADDITIONAL_INFO_REQUIRED` | An officer asked for a clearer document | Officer |
| `APPROVED` | Role granted, code minted | Officer |
| `REJECTED` | Refused, with a categorised reason. Fee refunded | Officer |

⭐ **`ADDITIONAL_INFO_REQUIRED` is the state the framework omits, and it is not optional.**
Without it a blurry scan forces a rejection, which triggers a refund and a re-application for a
problem a single message solves. The KYC workstation already works this way.

---

## 3 · What the applicant must supply — framework §2, verbatim

Seven documents. The framework lists five items; two of them are pairs.

| # | Document | Framework wording |
|---|---|---|
| 1 | **CV** | "Detailed professional history and background" |
| 2 | **Formal request letter** | "Written application letter addressed to 50pick requesting Agent Affiliate status" |
| 3 | **Serikali ya Mtaa letter** | "Official introduction/residence letter issued by the local government authority where the applicant resides" |
| 4 | **Referee letter 1** | "2 Professional/Character Referral Letters" |
| 5 | **Referee ID 1** | "Must include attached clear copies of the referees' national identification documents" |
| 6 | **Referee letter 2** | as above |
| 7 | **Referee ID 2** | as above |

⭐ **The framework's fifth item — "Government-Issued Identification" — is the platform's
existing KYC**, which is live and certified (modules D1–D4, the only 4 of 52 certified). An
applicant may not submit until their own `KycSubmission` is `APPROVED`. ⛔ Do not build a second
identity flow; the framework's NIDA / Passport / Driving Licence / Voter's Card list is already
`docs/IDENTITY-POLICY.md`.

---

## 4 · The fee — framework §2 Step 2

| | |
|---|---|
| **Amount** | TZS 100,000 — stated in `RULES.md` §2.10, nowhere else |
| **Destination** | Digital Selcom Bank, account **0769777877** |
| **How** | Paid **out of band**. The applicant uploads the receipt and types the transaction reference |
| **Reconciled by** | A compliance officer, against the Selcom statement |
| **On rejection** | ⭐ **Refunded in full** (Ali, 2026-09-06) — we did not provide the service |

⛔ **THE FEE NEVER ENTERS THE PLAYER LEDGER.** No wallet credit, no `Transaction` row, no ledger
entry. It is a business receipt recorded on the application and attested by an officer. This is
why the programme adds **zero** risk to the money invariants, and it is not negotiable: every
Selcom money-in path in this platform settles into a player wallet, and a registration fee is
not a deposit.

🔴 **One receipt, one application.** `feeReference` is unique. Two applicants submitting the
same Selcom reference must not both be onboarded on one payment.

**The refund** is an officer action recorded on the application (`feeRefundedAt`,
`feeRefundReference`), paid out of band the same way it came in. It moves no player money, so it
touches no ledger.

---

## 5 · What an agent earns

**Commission on revenue.** Taken from the framework §4: *"track user acquisition, volume
turnover, and automated commission payouts."* No flat sign-up prize is mentioned, so none is
paid — the framework is the decision.

⭐ **PRICED ON THE FEE WE ACTUALLY COLLECTED, NOT ON TURNOVER — and this is a deliberate,
disclosed improvement on the framework's wording.** Commission accrues at **settlement**, as a
share of the operator fee 50pick actually took on that recruit's settled position. It once
accrued at bet time against `stake × rate` — i.e. turnover — and that was fixed as a defect,
because a share of turnover can exceed the revenue the turnover produced. You cannot pay out a
share of money you did not earn.

▶ **"Volume turnover" is honoured as a DISPLAY.** The agent's sub-ledger shows recruits, their
turnover and their generated revenue. Turnover is what an agent is measured on; collected fee is
what they are paid on. Both are true, and the sub-ledger says both.

**Rate:** ⭐ **one rate per agent** (Ali, 2026-09-06 — *"if it's not mentioned in the document of
the management make it one rate per agent"*). The framework specifies no tiers, so there are
none. An officer sets `commissionPct` on the individual agent, bounded by a ceiling in
`RULES.md` §2.10.

⛔ **The `tier` column is DROPPED**, not left dead. It was never read or written, the framework
does not ask for it, and a column nobody sets is a rule nobody enforces.

**Paid as real, withdrawable cash.** An agent is a business partner who paid a fee, not a promo
recipient — so no wagering requirement, no bonus wallet. They withdraw like any player (1.5%
fee, KYC already approved).

**Recorded per accrual:** `rateApplied` and `programme`. A later rate change must never rewrite
history — the same reason `PredictionMarket.feeSnapshot` exists.

---

## 6 · Agent and player referral — where the line runs

The player Invite & Earn programme is **withdrawn** today ([`BONUS-WITHDRAWAL.md`](BONUS-WITHDRAWAL.md))
and may return. When it does, the two must not collide.

| Layer | Shared or separate | Why |
|---|---|---|
| **Attribution** — who recruited whom | ⭐ **SHARED — one system, always** | `User.recruitedBy` is written once and never re-attributed. Two attribution systems would let one player be recruited twice and both referrers paid |
| **Eligibility** | Shared seam, branches on role | `feature-state.ts`, already built and guarded |
| **Economics** | 🔴 **SEPARATE** | Agent rate on the agent's own row; player promo in `affiliate-config.ts` |
| **Destination** | 🔴 **SEPARATE** | Agent → real cash. Player → bonus wallet, played through |
| **Ledger** | One table, one `programme` column | So "what did we pay agents" and "what did the promo cost" are separable |
| **Admin surface** | 🔴 **SEPARATE** | `/admin/agents` is compliance; `/admin/affiliate` is growth |

### ⛔ The invariant

> **One referrer, one programme, one payment per event.** The programme is decided by the
> referrer's role at the moment of accrual — never both.

Without it an agent double-dips: agent commission **and** the player prize, on the same recruit,
from the same bet.

---

## 7 · What the player sees — framework §3

- **The badge.** A player arriving on an agent's link, or entering an agent code, sees
  **"Verified 50pick Agent"** with the agent's name and registration status, on the register
  page. The ribbon already exists; it gains the verified marker.
- **Responsible gaming.** The framework requires `18+ · Cheza Kwa Busara · Bara & Zanzibar` on
  every player portal. ✅ Already live in the footer on every page — nothing to add.
- **Fees.** The framework says "fees (0%)". ⚠️ True of deposits, **false of withdrawals**, which
  carry 1.5% (`RULES.md` §2.7). The corrected framework says so.
- ⛔ **Dispute tickets tied to an agent** (framework §3) are **not built**: they exist to
  escalate *transaction* queries against an agent who handled your money, and under the
  recruiter-only ruling no agent ever handles a player's money. Ordinary support covers it.

---

## 8 · The agent's code

Framework §4: *"unique cryptographic referral tokens (`50PICK-AG-[ID]`) linked to agent
sub-ledgers."*

⭐ **Agent codes take the framework's format**; player codes (if the player programme returns)
keep the existing short form. The format is a specification from management, and it is also
useful: an agent code is visually distinct from a player code in a share link, a WhatsApp
message and a support conversation.

⚠️ Codes are minted **at approval**, not at application. The framework is explicit: the system
*"generates a unique Agent Affiliate ID/referral link"* **upon clearance**.

---

## 9 · Where the framework is wrong about this system

These must be corrected before the document goes to applicants or the Gaming Board. A document
that asserts controls we do not have is worse than one that claims less.

| Framework says | Reality |
|---|---|
| "Secure **AWS S3** bucket with AES-256" | Cloudflare **R2** (`50pick-kyc`, WEUR) via `src/lib/server/storage.ts`, or base64 in Postgres when `KYC_STORAGE` is unset |
| "**Automated webhook** integration with Digital Selcom Bank API to instantly match incoming TZS 100,000 deposits" | Does not exist, and is not a small build. Every Selcom money-in path settles into a player wallet; there is no fee or order concept. Reconciliation is a **human officer** reading a receipt |
| "displaying fees (**0%**)" | Deposits 0%. **Withdrawals 1.5%** |
| "peer-to-peer top-ups" through an agent | Out of scope — recruiter only (§1) |
| "volume turnover" as the commission base | Displayed, but commission is paid on the operator fee actually collected (§5) |

---

## 10 · Non-negotiables for the build

- **RBAC:** `/admin/agents*` → `compliance` domain, step-up 2FA. `/admin/affiliate` stays `growth`.
- **Single officer.** ⛔ No two-officer hard-lock — Ali's dated decision, and `test:two-admin`
  asserts its absence. Self-review is blocked; a second signature is not required.
- **Documents through the existing KYC storage seam only** — `putKycDocument` / `readKycDocument`,
  magic-byte validated on the sniffed mime. No second storage path.
- **Both DAL backends** plus the entity map in `DATA-LAYER.md`, or memory and Prisma diverge.
- **`/agent/*` in en / sw / zh.** Admin console is English by design. Emails are EN+SW; there is
  no Chinese in any email.
- **Approval is the only place `UserRole.AGENT` is ever assigned.**
- **A red harness per guard.** A guard that has never failed is a hypothesis.
