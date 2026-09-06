# SESSION PROMPT — build the Agent Affiliate programme, complete and final

**v2, 2026-09-07.** Rewritten after a 293-agent adversarial stress-test (142 raised, 78 confirmed)
that **overturned v1's architecture**.

**Read first, in this order:**
1. [`AGENT-PROGRAMME.md`](AGENT-PROGRAMME.md) — the authority for *what* the programme is
2. **§0 of this file** — nine defects live in the engine right now
3. [`AGENT-STRESS-TEST-FINDINGS.md`](AGENT-STRESS-TEST-FINDINGS.md) — the evidence, 78 confirmed
4. `CLAUDE.md` · [`RULES.md`](RULES.md) · [`BONUS-WITHDRAWAL.md`](BONUS-WITHDRAWAL.md)

**Branch** `agent-affiliate-programme`, own worktree. ⛔ A parallel session works `main` in
`C:\kipindi-main` — `git fetch` before analysing, stage **by name**, never `git add -A`.

---

## The commission

Build it **complete and final**, both sides, one programme of work. Ali: *"no workarounds… one
finalised development that's complete and final."*

⭐ **No real agents exist and every row is test data.** No migration must preserve anything, no
interim stopgap is needed, nothing is retrofitted around a live population. Build it properly once.

**⛔ "Final" rules out:** a manual role-flip stopgap · a second dashboard beside one that works ·
a `tier` column nobody sets · a document store beside the KYC one · a page nobody can reach ·
a guard not wired into `predeploy`.

---

## §0 · FIX THE ENGINE FIRST — this is not negotiable

⛔ **Build no agent surface until every one of these is closed.** A four-persona drive passing
green over them is precisely the false confidence this repo keeps paying for: the pages look
perfect while the money goes to the wrong wallet, under the wrong policy, booked as the wrong
thing, with the rate change a production no-op.

| # | Defect | At |
|---|---|---|
| 0.1 | 🔴 An approved agent earns the **player flat prize** and **zero commission** — `commission.enabled` defaults **false**, `prize.enabled` **true** | `affiliate-config.ts:83-85` |
| 0.2 | 🔴 Agent money lands in the **bonus wallet today**, with a 5× wagering requirement. `bonus-config` defaults `enabled:true` + `affiliateToBonus:true` and **`creditBonus` has no feature gate** | `bonus-config.ts:61,64` · `affiliate-service.ts:186` |
| 0.3 | 🔴 The only control on that path asserts **`cash + bonus > 0` — a SUM** — structurally blind to the wrong wallet | `withdrawn-features.test.mts` §5e |
| 0.4 | 🔴 `db.affiliate.update` **whitelists three fields in Prisma**; memory spreads everything → `commissionPct` / `active` / `approvedAt` are a **silent production no-op**, every suite green | `prisma-dal.ts:1689-1696` |
| 0.5 | 🔴 Commission books as **`BONUS_CREDIT`** → the regulator pack calls it *bonus cost*; it appears on **no line of the owner's book** | `wallet-service.ts:1810` |
| 0.6 | 🔴 `50PICK-AG-…` codes **truncate at 16 chars, silently** — prefix is 10, leaving six | `register/actions.ts:20` |
| 0.7 | 🔴 Commission prices on the **GROSS** operator fee — ~15% already left as TRA + GBT levies | `RULES.md` §2.2 |
| 0.8 | Eligibility reads **ROLE, never STATUS** — a self-excluded / suspended / closed agent keeps recruiting and accruing | `affiliate-service.ts:367-370` |
| 0.9 | **No clawback** — and ⚠️ **no settlement *reversal* exists either**, so hook the **void/refund** paths that genuinely occur | `market-service.ts` 3258/3386/4034 |
| 0.10 | **Best-effort accrual, no replay.** "Can be replayed from the settlement audit entry" — the action appears **only at the emitter** | `market-service.ts:3746-3748` |
| 0.11 | The commission **window runs from `recruit.createdAt`**, not from when the relationship formed | `affiliate-service.ts` |
| 0.12 | **Rounding favours the agent** — `Math.round` vs the platform's own `Math.floor` in `allocateFeeShares` | `payout.ts:733` |
| 0.13 | `totalEarnedTzs` is a **read-modify-write across per-recruit locks** → lost updates | `affiliate-service.ts` |
| 0.14 | `/admin/affiliate` money totals computed over a **1000-row truncation** | `admin/affiliate` |

---

## §1 · The architecture

> **Separate the policy. Share the ledger. Never fork the attribution.**

### 1.1 · Provenance: two columns on `User`, not a new table

Add `recruitedProgramme` (`AGENT | PLAYER`, nullable) · `recruitedAt` · `recruitedByCode`, written
in the **same `db.user.update`** that already writes `recruitedBy` (`affiliate-service.ts:304`).
One row, one writer, both DAL backends, no live relation migrated.

⛔ **v1 proposed a `ReferralAttribution` table. Do not build it** — it creates a second writer
beside `User.recruitedBy`, which `listRecruits` and `totalReferrals` already read.

**Backfill** every existing row to `PLAYER` with `recruitedAt = user.createdAt`. **NULL means
PLAYER**, never a fall-through to the agent branch.

### 1.2 · 🔴 The exploit, and the guard that currently asserts it

Farm attributions free as a player, then **buy AGENT status** — every old bind flips to paying
agent commission at the negotiated rate. **A purchasable arbitrage.**

⛔ **`withdrawn-features.test.mts` §5e currently pins this as correct behaviour.** Rewrite it to
bind through an approved agent's own `50PICK-AG-` code, **and add a new section** asserting a
legacy/PLAYER-stamped row pays an AGENT referrer **nothing**. ⭐ Both halves — without the paying
control, the refusal passes whenever the reward path is broken for any reason. That is exactly how
§5d's first version passed with its gate deleted.

### 1.3 · ⛔ Do NOT gate on `boundAt >= approvedAt`

A second discriminator derived from mutable state: `deactivate → reactivate` restamps `approvedAt`
and **silently deletes the agent's genuine book**. `programme === "AGENT"` is immutable and
sufficient.

### 1.4 · One resolver, keyed on the attribution

```ts
policyFor(attribution.programme, account, cfg)
  -> { rate, destination, capPerRecruitTzs, windowMonths, txnType, enabled }
```

⛔ Keyed on the **attribution's programme**, never the agent's own row — otherwise a
PLAYER-programme accrual by someone who is *now* an agent is priced at the agent rate and paid as
cash. The agent branch **refuses** on a null rate; it never falls back. ⛔ **No accrual hook may
call `getAffiliateConfig()` again** — that single call is how all four known leaks entered.

⭐ Only **`approvedAt`** identifies an agent: `commissionPct` is NOT NULL default 5.00 and `active`
defaults true on rows that already exist for ordinary players. Make `commissionPct` **nullable with
no default**. `approveAgent` **UPDATEs** an existing row — it does not insert.

---

## §2 · Build order

| Stage | Work |
|---|---|
| **A · Engine** | All of §0 · the resolver · the `User` columns + backfill · rewrite §5e |
| **B · Application** | Schema · `agent-application-service` · `approveAgent` (the only writer of `role = AGENT`) |
| **C · Invitation** | `AGENT-PROGRAMME.md` §7 |
| **D · Surfaces** | §4 below |
| **E · Rules & docs** | ⛔ **WRITE `RULES.md` §2.10** (it does not exist) · corrected framework doc · `/legal` fixes |
| **F · Seal** | Guards + a red harness each + ⛔ **wire every one into `predeploy`** |

⚠️ `ALTER TYPE … ADD VALUE` cannot run in a transaction or be rolled back — the new `TxnType` is
its own ordered step. ⚠️ **`/agent/*` must be added to `proxy.ts`** or the only discovery door is
closed at the edge.

---

## §3 · Money, compliance, the owner's book

- Commission on the **NET** fee · its **own `TxnType`** · its own ledger line.
- **The TZS 100,000 fee posts a `LedgerEntry`** — money from the public, today invisible to the
  house book, trial balance, regulator pack and every tax figure. ⚠️ **VAT is unhandled anywhere in
  this repo — raise it with Ali, do not invent a treatment.**
- **AML is deposit-keyed and structurally blind** to an agent paid millions who then withdraws.
- **RG:** commission is a **payable**, not a promo (`AGENT-PROGRAMME.md` §5b).
- **Referee IDs**: third-party PII, no lawful basis / retention / erasure / DSAR today. ⛔ Never a
  name or phone in the R2 object key.
- **Ongoing monitoring**: the programme is onboarding-only, and the sub-ledger ranks agents on
  exactly the metric RG duties argue against.
- **`/legal/terms` carries a false money statement; `/legal/aml` claims screening that does not
  exist.** Both in scope.

---

## §4 · Every surface, every state

Tiers are a union type — `console | board | reading | form | receipt`. Admin mutations use
`action-overlay`; player mutations `operation-result-modal`. ⛔ Never a native `confirm()`. **Every
async route needs a `loading.tsx` whose skeleton describes the page that is COMING** — a
two-column ghost resolving into one card is a defect this repo shipped and fixed last session.

**`/agent`** — public, `tier="reading"`, footer-linked, edge-allowed. States: signed out · **KYC
not approved → route to `/profile/kyc`, never a dead end** · ready · in progress · under review ·
rejected (reason + refund status + re-apply) · already an agent · staff (no Apply) · programme
withdrawn (`notFound()`, footer link gone).

**`/agent/apply`** — `tier="form"`. Seven slots × four states (empty · uploading · uploaded ·
**officer-rejected**, and only those are actionable in `ADDITIONAL_INFO_REQUIRED`). Distinct upload
errors: wrong type · too large · **magic bytes disagree**. Submit disabled with an explicit *what
is missing* list. `UnsavedChangesGuard`.

**`/agent/status`** — `tier="reading"`. `UNDER_REVIEW` reads **"Awaiting Compliance Approval"**.

**`/profile/invite` as agent** — 🔴 **three defects to fix, not just "extend"**: it tells the agent
their **withdrawable cash carries a wagering requirement and an expiry**; it reads **"Paused"**
when a GROWTH officer pauses the *player* promo; and it keeps advertising the player promo's terms.
⛔ `inviteStateFor` **keys on role alone**, so a **deactivated agent keeps every entry point and
every solicitation** — it must read status and standing.

**`/admin/agents`** — `tier="console"`, **two tabs**: *Applications* (queue) and *Agents* (roster:
rate, recruits, turnover, revenue, status; change rate, deactivate, sub-ledger, resend/revoke,
refunds owed). ⛔ Per-queue try/catch so a failed read renders `AdminLoadError`, never a false
"none waiting". A rate change is a money action — 2FA step-up, and **prove it persists** (§0.4).

**`/admin/agents/[id]`** — documents · fee panel (unreconciled / reconciled / **waived-with-reason**
/ refunded) · decision rail. ⭐ Every disabled action says **why**. **Reject + refund need one
worklist.** The **"Verified 50pick Agent"** badge needs a read model.

---

## §5 · Guards, each with its red mutation

| Guard | Asserts | Red mutation |
|---|---|---|
| `test:agent-policy` | Commission · own rate · **cash** · `AGENT_COMMISSION`. ⛔ **Exact wallet and type — never a sum** | Flip each of the four |
| `test:programme-isolation` | ⭐ Turn the player promo on/off; the agent's payment does not move | Remove the resolver |
| `test:attribution-provenance` | A PLAYER/NULL-stamped row pays an AGENT referrer **nothing**; an agent-stamped row **is** paid | Delete the stamp check |
| `test:no-double-pay` | One referrer, one programme, one payment | Delete it → commission **and** prize on one bet |
| `test:agent-clawback` | A **voided** market reverses commission; a short balance records debt, never a negative wallet | Remove the hook |
| `test:commission-bounded` | Σ commission ≤ **net** fee; rounding never overpays | Restore `Math.round`; use gross |
| `test:agent-eligibility` | Self-excluded / suspended / closed / deactivated: no binds, no accrual. **Control: an active agent IS paid** | Revert to role-only |
| ⭐ `test:dal-parity` | **Every field written via `db.affiliate.update` is mapped in `prisma-dal.ts`** — source-level, no DB | Delete one mapping |
| `test:agent-application-security` | No approval without KYC · without fee resolution · self-review · double-approve · duplicate `feeReference` · staff · already-agent · **invited-but-not-accepted** | One per clause |
| `qa:withdrawal-visual` extended | New routes × 360/768/1280 × EN/SW/ZH; no lonely card, no orphan heading, no overflow | Proven already |

⛔ **Implementing "one payment per event" turns two existing predeploy guards RED, and both will be
"fixed" the wrong way.** Identify them first and rewrite them deliberately.

---

## §6 · Verification

Drive it live as **five people** — applicant · **invitee** · officer · agent · ordinary player.

1. **Applicant** — register → KYC → apply → seven documents → fee → submit. Try: no KYC (refuse) ·
   `.exe` renamed `.jpg` (refuse on the **sniffed** mime) · two applications at once (one) ·
   **duplicate fee reference** (refuse).
2. **Invitee** — officer invites → link → OTP on the officer-entered phone → upload own ID + selfie
   → accept. Try accepting from a different phone (refuse) · approving **before** acceptance
   (refuse) · a revoked or expired token (refuse).
3. **Officer** — queue → every document through the gated route → reconcile or **waive with a
   reason** → request info → approve. Role flips, rate lands, applicant notified in-app **and** by
   email. Try approving your own (refuse), twice (once). Reject another and **confirm the refund is
   recorded and worklisted**.
4. **Agent** — `/profile/invite` shows the `50PICK-AG-` code, link, QR. Register a second browser
   through it, confirm the **Verified 50pick Agent** badge, deposit, bet, settle. Commission
   accrues at **that agent's** rate, on the **net** fee, capped, stamped `programme=AGENT` +
   `rateApplied`, paid **once**, as **withdrawable cash**, booked as `AGENT_COMMISSION`. Then
   **void the market and confirm the clawback**.
5. **Ordinary player** — still finds nothing about invites or bonuses anywhere, including the
   assistant. `/agent` is reachable and explains the programme without soliciting them.

**Then measure.** ⛔ A build is not a render — load every page. Lock the red harness and mutate a
**copy** via `KP_SRC`. Every guard needs a control that must go red. Cover `src/app/agent/**`,
`src/app/admin/agents/**` **and** `scripts/`. Re-derive every number; quote none from this file.

---

## §7 · Traps this repo has already paid for

| ⛔ | |
|---|---|
| **A red anchor quotes SOURCE** | Edit a guarded line and its harness silently stops injecting. `test:red-anchors` is the only thing that says so — it has gone red **twice** this way |
| **A guard that chooses its own population cannot fail** | A test passed with its gate deleted, because the default config could not pay on that path either way. **Every refusal needs a control that must go red** |
| **An assertion that SUMS cannot see a split** | §0.3 — `cash + bonus > 0` is blind to the wrong wallet |
| **Memory DAL green ≠ Prisma correct** | §0.4 — a three-field whitelist makes a rate change a production no-op with every suite green |
| **A build is not a render** | A `"use client"` helper called from server components took every page down with `tsc` clean and `next build` green |
| **Git Bash mangles things** | Heredocs eat backslashes · `sed -i` breaks CRLF · `perl -0` `\n` will not match `\r\n` in this CRLF tree. **Use Edit/Write for anything with backslashes** |
| **`next dev` renders an empty admin body here** | Use a static harness over the real compiled stylesheet; settle cascade precedence with `grep -bo` |
| **A stale exemption stops a coverage rule covering** | Assert the exemption list holds nothing stale |
| **A gate not in the pipeline is not a gate** | Wire every new guard into `predeploy` |
