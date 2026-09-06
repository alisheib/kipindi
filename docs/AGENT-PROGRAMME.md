# 50pick Agent Affiliate Programme — the authority

**v2, 2026-09-07.** Rewritten after a 293-agent adversarial stress-test raised 142 findings and
confirmed 78 — including one that **overturned v1's architecture**. Evidence:
[`AGENT-STRESS-TEST-FINDINGS.md`](AGENT-STRESS-TEST-FINDINGS.md). Build instructions:
[`SESSION-PROMPT-AGENT-BUILD.md`](SESSION-PROMPT-AGENT-BUILD.md).

**Source of record:** the management framework `50pick_affiliate_agent_framework`, taken as the
decision wherever it speaks. Where it is silent, Ali's rulings fill the gap. Where it is **wrong
about this system**, §10 records the correction.

⛔ **This file is the authority for _what_ the programme is.** Rates live in
[`RULES.md`](RULES.md) and nowhere else — ⚠️ **§2.10 does not exist yet and must be WRITTEN**;
`RULES.md` §2 currently stops at §2.9. Do not cite it as though it were already there.

---

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
| `ADDITIONAL_INFO_REQUIRED` | An officer asked for a clearer document. ⚠️ **Needs an explicit exit transition** |
| `APPROVED` | Role granted, code minted |
| `REJECTED` / `DECLINED` / `EXPIRED` | Refused, declined, or the invitation lapsed. Fee refunded |

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
| **Amount** | TZS 100,000 — stated in `RULES.md` §2.10 (to be written) |
| **Destination** | Digital Selcom Bank, account **0769777877** |
| **How** | Paid **out of band**; the applicant uploads the receipt and types the reference |
| **Waiver** | ⭐ An officer may waive it or record it as collected in cash — **with a typed reason, audited** (Ali, 2026-09-06) |
| **On rejection** | **Refunded in full** — we did not provide the service |

⛔ **The fee never enters the player ledger** — no wallet credit, no `Transaction` row. It is a
business receipt attested by an officer, which is why the programme adds zero risk to the money
invariants.

🔴 **But it must post a `LedgerEntry`.** This is money taken from a member of the public. Today it
would be invisible to the house book, the trial balance, the regulator pack and every tax figure.
⚠️ **VAT on the fee is unhandled anywhere in this repo** — raise it with Ali; do not invent a
treatment.

🔴 **One receipt, one application** — `feeReference` is unique. And a refund needs **evidence and a
deadline**: money *in* requires a receipt image, so money *out* must not be one officer typing a
string. Reject and refund need **one worklist**, or TZS 100,000 sits owed with nothing tracking it.

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
⛔ The `tier` column is **dropped**, not left dead.

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
player, then pay TZS 100,000 for AGENT status, and every one of those old binds flips to paying
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
| "**Automated webhook** matching TZS 100,000 deposits via Selcom Bank API" | Does not exist. Reconciliation is a **human officer** reading a receipt |
| "displaying fees (**0%**)" | Deposits 0%; **withdrawals 1.5%** |
| "peer-to-peer top-ups" through an agent | Out of scope — recruiter only (§1) |
| "volume turnover" as the commission base | Displayed; **paid on the net fee actually collected** (§5) |

---

## 11 · Non-negotiables

- `/admin/agents*` → **`compliance`** domain with step-up 2FA. `/admin/affiliate` stays `growth`.
  ⚠️ Today **every switch controlling agent money sits in `growth`** — the officer who approves and
  prices an agent cannot see any of them.
- **Single officer.** ⛔ No two-officer lock — Ali's dated decision; `test:two-admin` asserts its
  absence. Self-review is blocked; the invitee's acceptance is the second party.
- **Documents through the existing KYC storage seam only**, magic-byte validated on the sniffed mime.
- **Both DAL backends** plus the `DATA-LAYER.md` entity map. 🔴 `db.affiliate.update` currently
  whitelists three fields in Prisma while memory spreads everything — a rate change would be a
  **silent production no-op** with every suite green.
- **`/agent/*` in en / sw / zh.** Admin console is English. Emails EN+SW; no Chinese in any email.
- **Approval is the only place `UserRole.AGENT` is ever assigned.**
- **A red harness per guard.** A guard that has never failed is a hypothesis.
