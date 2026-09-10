# SESSION PROMPT — Agent Affiliate programme · build it complete and final

**v3, 2026-09-07 — sealed.** Every decision is closed below. Nothing is left to judgement.

**Read:** this file → [`AGENT-PROGRAMME.md`](AGENT-PROGRAMME.md) (what it is) →
[`AGENT-STRESS-TEST-FINDINGS.md`](AGENT-STRESS-TEST-FINDINGS.md) (78 confirmed findings, the
evidence) → `CLAUDE.md` · [`RULES.md`](RULES.md).

**Branch** `agent-affiliate-programme`, own worktree. ⛔ A parallel session works `main` in
`C:\kipindi-main` — `git fetch` first, stage **by name**, never `git add -A`.

**Commission:** build both sides, complete, in one programme. No real agents exist and every row
is test data — no migration preserves anything, no stopgap, nothing retrofitted. ⛔ "Final" rules
out: a manual role-flip · a second dashboard beside one that works · a `tier` column · a document
store beside the KYC one · a page nobody can reach · a guard not in `predeploy`.

---

## 1 · EVERY DECISION, CLOSED

| Decision | Value |
|---|---|
| What an agent is | **Recruiter only.** Never holds float, never touches player money. Framework §3's "peer-to-peer top-ups" is **out of scope** |
| What they earn | **Commission only.** No flat sign-up prize (the framework names only commission) |
| Commission base | ⭐ **% of the NET operator fee we KEEP** — after TRA + GBT. Never gross, never turnover |
| Normal rate | **20%** of that net fee |
| Hard ceiling | **40%** — no officer may exceed it. Goes in `RULES.md` §2.10 as a rule |
| ⚠️ Scale | `commissionPct` is a **percent (20.00 = 20%)**. The old `commission.rate: 0.5` fraction is the PLAYER config — do not mix the two scales |
| Window | **Lifetime** — an agent earns for as long as the recruit plays |
| Per-recruit cap | **None** |
| Destination | **Real withdrawable cash.** No wagering requirement, ever |
| Transaction type | **New `AGENT_COMMISSION`** — ⛔ never `BONUS_CREDIT` |
| Levels | **Single level.** Never pays on a recruit's recruits — that is a pyramid scheme and regulated as one |
| Registration fee | **TZS 100,000, NO VAT** (Ali, 2026-09-09 — the VAT-inclusive figure here is superseded). ⭐ **PAID FROM THE APPLICANT'S WALLET** (Ali, 2026-09-10): they deposit on the ordinary rails, then pay from that balance. No Selcom account, no receipt upload, no officer reconciliation |
| Fee waiver | Allowed **with a typed reason, audited** (officer-invited agents) |
| Fee on reject | **Refunded in full within 7 days.** Reject + refund share **one worklist** |
| Fee accounting | ⭐ **A player-ledger `Transaction`** (Ali, 2026-09-10) **plus** a balanced `LedgerEntry` group. ⛔ Money-in leg is the **PLAYER** account, never `EXTERNAL:SELCOM` — that would double-count the deposit |
| Who identifies an agent | ⭐ **`approvedAt` alone.** `AffiliateAgent` rows already exist for ordinary players with `commissionPct` 5.00 / `active` true — the row proves nothing. Make `commissionPct` **nullable, no default** |
| Attribution provenance | `recruitedProgramme` · `recruitedAt` · `recruitedByCode` on **`User`**, same write as `recruitedBy`. **NULL = PLAYER** |
| Agent code | **`50PICK-AG-[ID]`**, minted **at approval** (framework §2 Step 3) |
| Discovery | **Public `/agent`, linked from the site FOOTER** (site chrome, visible signed-out) + a support link. ⛔ **No entry point in the player account menu** — the footer is not the account. These do not conflict |
| Invitation | Officer proposes → **invitee accepts** (the second party) → officer approves. ⛔ Never approvable before acceptance |
| Invitation token | Single-use · **14-day expiry** · bound to the officer-entered phone with OTP proof · revocable · audited on issue/accept/decline/expiry/revoke |
| KYC in invitation | **Invitee uploads their own ID + selfie.** One approval writes an `APPROVED` `KycSubmission` **through the ordinary KYC service**. ⛔ Never flag KYC-approved without real identity documents |
| DRAFT expiry | **30 days**, then expired + documents purged; visible to officers meanwhile |
| Re-application | Allowed after **90 days**. ⛔ Terminal (never re-appliable): `SANCTIONED` · `IDENTITY_MISMATCH` · `FRAUD` |
| Self-excluded agent | ⛔ Stops recruiting **and** stops accruing. Earned commission is a **PAYABLE settled out of band** — never a `HELD` row (terminal, and it consumes the cap) |
| Deactivated agent | New binds refused, accrual stops, accrued rewards untouched. Loses **every** entry point and badge |
| Staff applicant | **Refused** at issue and at approval — approving would strip their admin access |
| Approver | **Single officer.** ⛔ No two-officer lock (`test:two-admin` asserts its absence). Self-review blocked |
| RBAC | `/admin/agents*` → **`compliance`** + step-up 2FA. `/admin/affiliate` stays `growth` |
| AML | Agent commission inflow **flagged for review**; withdrawals use existing thresholds. Today's triggers are deposit-keyed and blind to it |

---

## 1b · ⛔ EVERY NUMBER ABOVE IS CONFIGURABLE. NONE IS A LITERAL.

**New `src/lib/server/agent-config.ts`** via the `defineConfig` factory (the same one
`affiliate-config` / `bonus-config` use — globalThis cache, eager hydrate, write-through,
`{before, after, changes}` audit). Edited at **`/admin/agents` → Settings** (`compliance`
domain + 2FA), never at `/admin/affiliate`.

| Key | Ships as | Meaning |
|---|---|---|
| `enabled` | `true` | The agent programme's own switch. ⛔ Independent of `affiliate-config.enabled` |
| `defaultCommissionPct` | `20.00` | Percent of the **net** fee, pre-filled for a new agent |
| `maxCommissionPct` | `40.00` | Officer ceiling |
| `registrationFeeTzs` | `100_000` | The fee |
| `feeVatTreatment` | `"INCLUSIVE"` | `INCLUSIVE \| EXCLUSIVE` |
| `feeVatRatePct` | `18.00` | TZ standard rate — used to split the VAT component on the ledger entry |
| `commissionWindowMonths` | `0` | **0 = lifetime** |
| `capPerRecruitTzs` | `0` | **0 = uncapped** |
| `invitationExpiryDays` · `draftExpiryDays` · `refundDeadlineDays` · `reapplyCooldownDays` | `14` · `30` · `7` · `90` | |

⭐ **THE LAW: no surface may hard-code any of these.** `/agent` renders
`formatTzs(cfg.registrationFeeTzs)`; the agent's dashboard renders their own `commissionPct`;
the officer's rate field validates against `cfg.maxCommissionPct`. A number written twice is a
number that will disagree with itself.

⛔ **The RULE and the VALUE are different things.** `RULES.md` §2.10 states the ceiling as a rule
the platform cannot be configured out of — `validate()` refuses `maxCommissionPct > 40`, exactly
as `PLATFORM_MAX_STAKE` lets an operator narrow inside the rule and never widen past it.

⚠️ `defineConfig` hydrates with a **shallow spread**, so any nested field arrives `undefined` on
production. Keep this config **flat**.

---

## 2 · ⛔ FIX THE ENGINE FIRST — build no surface until these are closed

A green four-persona drive over these is the false confidence this repo keeps paying for: pages
perfect, money in the wrong wallet under the wrong policy booked as the wrong thing.

| # | Defect | At |
|---|---|---|
| 1 | 🔴 An approved agent earns the **player flat prize, zero commission** (`commission.enabled` false, `prize.enabled` true) | `affiliate-config.ts:83-85` |
| 2 | 🔴 Agent money lands in the **bonus wallet today** with 5× wagering — `creditBonus` has **no feature gate** | `bonus-config.ts:61,64` · `affiliate-service.ts:186` |
| 3 | 🔴 Its only control asserts **`cash + bonus > 0` — a SUM** — blind to the wrong wallet | `withdrawn-features.test.mts` §5e |
| 4 | 🔴 `db.affiliate.update` **whitelists 3 fields in Prisma**, memory spreads all → rate/active/approvedAt are a **silent prod no-op**, suites green | `prisma-dal.ts:1689-1696` |
| 5 | 🔴 Commission books as **`BONUS_CREDIT`**; appears on **no line of the owner's book** | `wallet-service.ts:1810` |
| 6 | 🔴 `50PICK-AG-…` **truncates at 16 chars, silently** (prefix is 10) | `register/actions.ts:20` |
| 7 | 🔴 Prices on the **GROSS** fee — ~15% already gone as TRA + GBT | `RULES.md` §2.2 |
| 8 | Eligibility reads **ROLE, never STATUS** — excluded/suspended/closed agents keep recruiting | `affiliate-service.ts:367-370` |
| 9 | **No clawback** — ⚠️ and **no settlement *reversal* exists**, so hook the **void/refund** paths | `market-service.ts` 3258/3386/4034 |
| 10 | **Best-effort accrual, no replay** — the error action appears only at the emitter | `market-service.ts:3746-3748` |
| 11 | Window runs from **`recruit.createdAt`**, not from when the bind happened | `affiliate-service.ts` |
| 12 | **`Math.round`** favours the agent vs the platform's `Math.floor` | `payout.ts:733` |
| 13 | `totalEarnedTzs` is a **read-modify-write across locks** → lost updates | `affiliate-service.ts` |
| 14 | `/admin/affiliate` totals computed over a **1000-row truncation** | `admin/affiliate` |

---

## 3 · ARCHITECTURE — five rules

1. **Separate the policy. Share the ledger. Never fork the attribution.**
2. **Provenance is stamped at bind, on `User`** — two columns beside `recruitedBy`, one writer.
   ⛔ **Not** a `ReferralAttribution` table: that makes a second writer beside readers that exist.
3. ⛔ **Do NOT gate on `boundAt >= approvedAt`** — a deactivate→reactivate restamps `approvedAt`
   and silently deletes the agent's real book. `programme === "AGENT"` is immutable and enough.
4. **One resolver, keyed on the attribution:**
   `policyFor(attribution.programme, account, cfg) -> { rate, destination, cap, window, txnType, enabled }`.
   ⛔ Never keyed on the agent's own row. ⛔ No accrual hook may call `getAffiliateConfig()` again.
   Agent branch **refuses** on a null rate — never falls back.
5. **The invariant:** *one referrer, one programme, one payment per event* — by the **stamped**
   programme, never the current role.

🔴 **The exploit this closes:** farm attributions free as a player, buy AGENT status, and every
old bind flips to paying agent commission. ⛔ **`withdrawn-features` §5e currently asserts that as
correct** — rewrite it to bind through an approved agent's own code, **and add** a section proving
a PLAYER/NULL-stamped row pays an AGENT **nothing**. Both halves.

---

## 4 · BUILD ORDER

**A** Engine (§2) + resolver + `User` columns + backfill to `PLAYER` + rewrite §5e →
**B** Application schema + `agent-application-service` + `approveAgent` (**the only writer of
`role = AGENT`**; it **UPDATEs** an existing row) → **C** Invitation → **D** Surfaces →
**E** ⛔ **WRITE `RULES.md` §2.10** (it does not exist; §2 stops at 2.9) + corrected framework doc
+ `/legal/terms` false money statement + `/legal/aml` unsupported screening claim → **F** Guards.

⚠️ `ALTER TYPE … ADD VALUE` is not transactional or reversible — the new `TxnType` is its own step.
⚠️ **Add `/agent/*` to `proxy.ts`** or the only discovery door is closed at the edge.

---

## 5 · SURFACES

Tiers: `console | board | reading | form | receipt`. Admin → `action-overlay`; player →
`operation-result-modal`. ⛔ Never native `confirm()`. **Every async route needs a `loading.tsx`
whose skeleton describes the page that is COMING.**

- **`/agent`** `reading`, public, footer-linked. States: signed out · **no KYC → route to
  `/profile/kyc`, never a dead end** · ready · in progress · under review · rejected (reason +
  refund status + re-apply) · already agent · staff (no Apply) · withdrawn (`notFound()`).
- **`/agent/apply`** `form`. 7 slots × 4 states (empty · uploading · uploaded · **officer-rejected**
  — only those actionable in `ADDITIONAL_INFO_REQUIRED`, which **needs an exit transition**).
  Distinct errors: wrong type · too large · **magic bytes disagree**. Submit disabled with an
  explicit *what is missing* list. `UnsavedChangesGuard`.
- **`/agent/status`** `reading`. `UNDER_REVIEW` reads **"Awaiting Compliance Approval"**.
- **`/profile/invite` as agent** — 🔴 **fix three defects, don't just extend**: it says their
  **withdrawable cash has a wagering requirement and expiry**; it reads **"Paused"** when a GROWTH
  officer pauses the *player* promo; it advertises the player promo's terms. ⛔ `inviteStateFor`
  keys on **role alone** — a deactivated agent keeps every entry point.
- **`/admin/agents`** `console`, **two tabs**: *Applications* (queue) · *Agents* (roster: rate,
  recruits, turnover, revenue, status; change rate, deactivate, sub-ledger, resend/revoke, refunds
  owed). ⛔ Per-queue try/catch → `AdminLoadError`, never a false "none waiting".
- **`/admin/agents/[id]`** — documents · fee panel (unreconciled / reconciled / **waived+reason** /
  refunded) · decision rail. ⭐ Every disabled action says **why**. **"Verified 50pick Agent"**
  badge needs a read model.

⛔ **Referee national IDs are third-party PII** — lawful basis, retention row, erasure path, DSAR
route, and **never a name or phone in the R2 object key**.

### 5b · The visual specification — rated from four chairs, and what makes each a 10

Honest scores for the plan **as written**, then the change that fixes it.

| Surface | Visual eng. | Platform mgr | UI/UX | Design arch. | What makes it 10/10 |
|---|---|---|---|---|---|
| `/agent` | 8 | 7 | 8 | 9 | Manager's gap: it explains but never **sells**. Add the three facts an agent decides on — *what you earn · what it costs · how long approval takes* — as three `<Stat>` tiles above the fold, values read from config |
| `/agent/apply` | 6 | 8 | **4** | 7 | 🔴 **The worst surface in the plan.** Seven upload slots in one column is ~2,400px of scroll on a 360 phone. **Chunk into 4 steps** — *About you* (CV, request letter) · *Where you live* (Serikali) · *Your referees* (2 letters + 2 IDs, paired) · *Payment* (reference + receipt). `SteppedProgress` already exists. A persistent "3 of 7 attached" counter, and **the referee pairs render as two cards, not four loose slots** |
| `/agent/status` | 9 | 8 | 9 | 9 | Add **what happens next and when** — "officer review usually takes N days", N from config. A timeline that shows only where you are, not when you'll move, reads as a dead end |
| `/profile/invite` (agent) | 5 | 6 | 6 | **4** | 🔴 Three live defects (wagering copy, "Paused", promo terms). 10/10 = the agent variant is a **distinct read model**, not the player page with fields swapped: their rate, lifetime terms, this month's commission, recruits |
| `/admin/agents` roster | 7 | **5** | 7 | 8 | 🔴 Manager's gap: recruit **count** does not answer *"is this agent worth their rate?"* Sort by **revenue generated**, show commission-to-revenue as a ratio, and flag any agent whose recruits skew to a single market (collusion signal) |
| `/admin/agents/[id]` | 8 | 9 | 7 | 8 | The decision must sit **above the fold** — an officer scrolling past seven documents to find Approve reviews worse. Decision rail sticky-right at `console` width; documents in a grid, not a column |
| Verified badge | 9 | 9 | 9 | 8 | It is a **trust mark on a money page** — it must be the same object everywhere it appears (register ribbon, `/agent`, sub-ledger). One component, one token set |

**Non-negotiable, all four chairs agree:**
⛔ **Numeric input via the shared `Input` atom; date/time via `DateSelect`/`TimeSelect`** — never a
raw `<input type=number|date>`. ⛔ **Name a type-scale rung, never a hand-typed px** (`test:type-scale`
ratchets literals). ⛔ **Gold is money and only money** — the fee panel and the rate field are gold
and `font-mono` tabular; document slots are neutral. ⛔ 44px minimum tap target. ⛔ One `<main>` —
the shell owns it. ⛔ Dark royal only. ⛔ No emoji in UI copy. ⛔ Every one of the seven slots ×
four states carries **en/sw/zh** copy — that is the largest translation surface in the build, so
write the keys before the components.

---

## 6 · GUARDS — each with its red mutation, all wired into `predeploy`

| Guard | Asserts | Red mutation |
|---|---|---|
| `test:agent-policy` | Commission · own rate · **cash** · `AGENT_COMMISSION`. ⛔ **Exact wallet + type, never a sum** | Flip each |
| `test:programme-isolation` | ⭐ Player promo on/off; agent payment does not move | Remove the resolver |
| `test:attribution-provenance` | PLAYER/NULL row pays an AGENT **nothing**; agent-stamped row **is** paid | Delete the stamp check |
| `test:no-double-pay` | One referrer, one programme, one payment | Delete → commission **and** prize on one bet |
| `test:agent-clawback` | A **voided** market reverses commission; short balance → debt, never a negative wallet | Remove the hook |
| `test:commission-bounded` | Σ commission ≤ **net** fee; rounding never overpays; **ceiling 40% enforced** | Restore `Math.round`; use gross |
| `test:agent-eligibility` | Excluded/suspended/closed/deactivated: no binds, no accrual. **Control: an active agent IS paid** | Revert to role-only |
| ⭐ `test:dal-parity` | **Every field written via `db.affiliate.update` is mapped in `prisma-dal.ts`** — source-level, no DB | Delete one mapping |
| `test:agent-application-security` | No approval without KYC · without fee resolution · self-review · double-approve · duplicate `feeReference` · staff · already-agent · **invited-not-accepted** | One per clause |
| `qa:withdrawal-visual` ext. | New routes × 360/768/1280 × EN/SW/ZH; no lonely card, orphan heading or overflow | Proven already |

⛔ **"One payment per event" turns two existing predeploy guards RED, and both will be "fixed" the
wrong way.** Find them first and rewrite them deliberately.

---

## 7 · VERIFY — drive it as five people

1. **Applicant** — register → KYC → apply → 7 docs → fee → submit. Refuse: no KYC · `.exe` renamed
   `.jpg` (**sniffed** mime) · two applications at once · **duplicate `feeReference`**.
2. **Invitee** — invite → link → OTP on the officer-entered phone → own ID + selfie → accept.
   Refuse: different phone · **approve before acceptance** · revoked/expired token.
3. **Officer** — queue → every doc through the gated route → reconcile **or waive with a reason** →
   request info → approve. Role flips, rate lands, notified in-app **and** email. Refuse: own
   application · twice. Reject another → **refund recorded and worklisted**.
4. **Agent** — `50PICK-AG-` code, link, QR. Second browser through it → **Verified 50pick Agent**
   badge → deposit, bet, settle. Commission at **their** rate, on the **net** fee, stamped
   `programme=AGENT` + `rateApplied`, paid **once**, **withdrawable cash**, `AGENT_COMMISSION`.
   Then **void the market → clawback**.
5. **Ordinary player** — finds nothing about invites or bonuses anywhere, including the assistant.
   `/agent` is reachable and explains the programme without soliciting them.

⛔ **A build is not a render — load every page.** Lock the red harness, mutate a **copy** via
`KP_SRC`. Every guard needs a control that must go red. Cover `src/app/agent/**`,
`src/app/admin/agents/**` **and** `scripts/`. Re-derive every number; quote none from this file.

---

## 8 · TRAPS ALREADY PAID FOR

⛔ **A red anchor quotes SOURCE** — editing a guarded line silently disarms its harness
(`test:red-anchors` has gone red twice this way). ⛔ **A guard that picks its own population cannot
fail** — every refusal needs a control that must go red. ⛔ **A SUM assertion cannot see a split.**
⛔ **Memory-DAL green ≠ Prisma correct.** ⛔ **A build is not a render.** ⛔ **Git Bash**: heredocs
eat backslashes, `sed -i` breaks CRLF, `perl -0` `\n` misses `\r\n` — **use Edit/Write for anything
with backslashes**. ⛔ **`next dev` renders an empty admin body here** — static harness over the
real compiled stylesheet, `grep -bo` for cascade order. ⛔ **A stale exemption stops a coverage
rule covering.** ⛔ **A gate not in the pipeline is not a gate.**
