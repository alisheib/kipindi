# SESSION PROMPT — build the Agent Affiliate programme, complete and final

**Read first, in this order:** [`AGENT-PROGRAMME.md`](AGENT-PROGRAMME.md) (the authority) →
`CLAUDE.md` → [`RULES.md`](RULES.md) → [`BONUS-WITHDRAWAL.md`](BONUS-WITHDRAWAL.md) (what the
last session shipped and why the seam is role-aware).

**Branch:** `agent-affiliate-programme`, in its own worktree. ⛔ A parallel session works in
`C:\kipindi-main` on `main` — stage by name, never `git add -A`, and `git fetch` before you
analyse anything.

---

## The commission

Build the agent programme **complete and final**, both sides, in one programme of work. Ali's
words: *"no workarounds… we need one finalised development that's complete and final."*

⭐ **There are no real agents yet, and all current data is test data.** That is a gift: no
migration has to preserve anything, no interim manual-grant shortcut is needed, and nothing is
being retrofitted around a live population. Build it properly the first time.

**⛔ What "final" rules out:** a manual role-flip as a stopgap · a second dashboard beside one
that already works · a `tier` column nobody sets · a document store beside the KYC one · a page
nobody can reach.

---

## What already exists — do not rebuild any of it

| Need | Use |
|---|---|
| Document storage | `src/lib/server/storage.ts` — `putKycDocument` / `readKycDocument`. Magic-byte validation via `image-signature.ts` (returns the **sniffed** mime, never the declared one) |
| Upload UI | `src/components/profile/kyc-doc-uploader.tsx` + `src/lib/client/kyc-image.ts` |
| Officer workstation pattern | `src/app/admin/kyc/[id]/` — page · doc viewer · decision rail · actions |
| Review guarantees | `kyc-service.ts` → `reviewKyc`: self-review blocked with a SECURITY audit · `withLock` · only decidable states decidable · categorised reject · idempotent transition · audit + notify + email on every branch |
| Queue page | `src/app/admin/approvals/` — per-queue try/catch so a failed read renders `AdminLoadError`, never a false "queue empty" |
| Gated document route | `src/app/api/admin/kyc-doc/route.ts` — copy the gate stack **verbatim** |
| Wizard / stepper | `src/app/admin/markets/new/wizard.tsx` · `src/components/proposals/status-timeline.tsx` |
| Feature seam | `src/lib/feature-state.ts` — already role-aware; `inviteIsLiveFor("AGENT")` is true |
| The whole earning engine | `affiliate-service.ts` — binding, caps, locks, idempotency, `referrerMayEarn`. Live and guarded |
| **The agent's own dashboard** | ⭐ **`/profile/invite` already is it.** For an `AGENT` it renders their code, link, QR, recruits and earnings today. **Extend it — do not build `/agent/dashboard`.** |

---

## Build it

### 1 · Schema — full shape, one migration

`AgentApplication` · `AgentApplicationDocument` · enums `AgentApplicationStatus`, `AgentDocType`
(the seven of §3), `AgentRejectReason`.

`AgentApplication` carries the fee as attested fact: `feeReference` (**unique**), `feeAmountTzs`,
`feeReconciledAt`, `feeReconciledById`, `feeRefundedAt`, `feeRefundReference`.

`AffiliateAgent`: **drop `tier`**; bring `commissionPct` and `active` to life; add `approvedAt`,
`applicationId`, and the missing `updatedAt` (today it is faked from `createdAt` — a documented
lie).

`ReferralReward`: add **`programme`** (`AGENT | PLAYER`) and **`rateApplied`**.

Partial unique indexes in raw SQL like the KYC ones (`schema.prisma:398-443`): one active
application per user `WHERE status <> 'REJECTED'`, so a rejected applicant can re-apply.

⛔ Both DAL backends + the entity map in `DATA-LAYER.md`.

### 2 · `agent-application-service.ts`

Mirror `kyc-service.ts`. `startApplication` · `attachDocument` · `recordFeePayment` ·
`submitForReview` · `reviewApplication` · `approveAgent` · `deactivateAgent` ·
`refundFee` · `listPendingApplications`.

`reviewApplication` carries all four `reviewKyc` guarantees. **Hard preconditions, not UI hints:**
no approval without an `APPROVED` KycSubmission, without a reconciled fee, or on one's own
application.

`approveAgent` is atomic: role → `AGENT`, `approvedAt`, `commissionPct`, mint the
**`50PICK-AG-[ID]`** code, audit. **The only place `UserRole.AGENT` is ever assigned.**

### 3 · Economics in `affiliate-service.ts`

One resolver — the discipline `ratesFor(market)` enforces for market fees:

```ts
function rateFor(account, cfg) {
  return account.approvedAt && account.commissionPct != null
    ? Number(account.commissionPct) / 100
    : cfg.commission.rate;
}
```

Hooks in where `onRecruitSettlement` currently reads `cfg.commission.rate`. Stamp `programme` and
`rateApplied` on every reward. Add **clawback on settlement reversal** — J4's recorded exit
criterion, and it does not exist yet. Commission passes **no `sourceRef`** today while bonus and
prize both do; add one.

### 4 · The applicant — `/agent`, `/agent/apply`, `/agent/status` (en/sw/zh)

- **`/agent`** — public, no session. What the programme is, what it requires, what it costs, the
  Apply button. ⭐ This is the discovery door (Ali: public page + support link). Linked from the
  footer. ⛔ **No entry point inside the player account** — the platform does not ask its own
  players for TZS 100,000.
- **`/agent/apply`** — seven document slots, the fee panel (Selcom destination + reference +
  receipt), `SteppedProgress`, `UnsavedChangesGuard`. Refuses submit without approved KYC.
- **`/agent/status`** — the timeline. `UNDER_REVIEW` reads **"Awaiting Compliance Approval"**.
- **`/profile/invite`** — extend for an `AGENT` with their rate and, while pending, their
  application status.

### 5 · The officer — `/admin/agents`, `/admin/agents/[id]`, `api/admin/agent-doc`

Queue + workstation: document viewer, **fee reconciliation panel**, attestation rail, approve /
request-info / reject, rate control, deactivate, **refund on reject**.

`ROUTE_DOMAINS` → `compliance` (`test:rbac` reports any unmapped route) · `admin-nav-groups.ts`
entry · `AgentApplicationStatusBadge` in `status-badge.tsx` · register emitters in
`comms-registry.ts` (`test:cert-c1`/`c3` go red otherwise; approval email is **gold**, rejection
carries **no CTA**).

### 6 · `/admin/affiliate` — the sub-ledger

Per-agent rate, and the framework's **agent sub-ledger**: recruits, their turnover, revenue
generated, commission paid. Filter the payout ledger by `programme`. Close the recorded design
defects in `DESIGN-GATE-ADMIN-2026-08-28.md:379` while you are in the file.

### 7 · Docs, in the same commits

`RULES.md` **§2.10** — the TZS 100,000 and the commission **ceiling**, in the full
`Decided / Enforced in / Configured in / Stated to / Guarded by` form. ⛔ The only legal home for
those numbers. Update `AGENT-PROGRAMME.md` §9 status · `MODULE-CERTIFICATION-PROGRAM.md` J4 (count
**re-derived**, not copied) · `LIVE-QA-CAMPAIGN.md` §6b (⛔ **Edit tool only** — Python and
`sed -i` have destroyed that file before) · **a corrected framework document** per §9.

---

## Verification — nothing is done on a green suite

⭐ Green proves the suite passed. `/admin/house` shipped 34/0 green and wrong in four places.
Re-derive every number at the end; never quote one from these notes.

**Drive it live, as four people:**

1. **Applicant** — register → KYC → apply → seven documents → fee reference → submit → watch the
   timeline. Try: no KYC (refuse) · a `.exe` renamed `.jpg` (refuse on the **sniffed** mime) ·
   two applications at once (one) · a **duplicate fee reference** (refuse).
2. **Officer** — queue → every document through the gated route → reconcile → request info →
   approve. Role flips, rate lands, applicant notified in-app **and** by email. Try approving
   your own (refuse) and twice (once). Then **reject another and confirm the refund is recorded**.
3. **Agent** — `/profile/invite` shows the `50PICK-AG-` code, link and QR. Register a second
   browser through it, confirm the **Verified 50pick Agent** badge, deposit, bet, settle —
   commission accrues at **that agent's** rate, capped, stamped `programme=AGENT` and
   `rateApplied`, paid once, as **withdrawable cash**. Then reverse the settlement and confirm
   the clawback.
4. **Ordinary player** — still finds nothing about invites or bonuses anywhere, including the
   assistant. `/agent` is reachable from the footer and explains the programme without soliciting
   them.

**Then measure:**

- `test:rbac` · `test:i18n` · `test:cert-c1`/`c3` · `test:money-invariants` · `test:concurrency` ·
  `test:withdrawn-features` · `test:rg-cash-incentive` · `test:red-anchors` · `test:orphans` · a
  new `agent-application-security` suite — **each with its red harness proven**.
- ⛔ **Lock the red harness** and mutate a **copy** via `KP_SRC`. Two concurrent runs once left a
  live payout gate disabled in the working tree.
- ⛔ **A build is not a render.** `tsc` clean and `next build` green have both passed while every
  page was down. Load `/agent`, `/agent/apply`, `/agent/status`, `/admin/agents`,
  `/admin/agents/[id]`, `/profile/invite`, `/wallet`.
- **Visual + layout drive** at 360 / 768 / 1280 × EN/SW/ZH, dark royal only. Reuse
  `qa:withdrawal-visual` — it already measures empty painted containers, orphan headings and the
  **lonely card in a multi-column grid**. ⚠️ Every new route needs a `loading.tsx`, and the
  skeleton must describe the page that is **coming**, not the one that used to be there.
- ⛔ **Measure the right population** — guards must cover `src/app/agent/**`,
  `src/app/admin/agents/**` **and** `scripts/`, not just `src/`.

**Then** rebase onto `main` (the parallel session moves), stage by name, push.

---

## Traps this repo has already paid for

| ⛔ | |
|---|---|
| **A red anchor quotes SOURCE** | Edit a guarded line and its harness silently stops being able to inject. `test:red-anchors` is the only thing that says so. It has gone red **twice** this way already |
| **A guard that chooses its own population cannot fail** | A legacy-attribution test passed with the gate deleted, because the default config could not pay on that path either way. **Every refusal needs a control that must go red** |
| **A build is not a render** | A `"use client"` helper called from server components took down every page with `tsc` clean and `next build` green |
| **Git Bash mangles things** | Heredocs eat backslashes · `sed -i` breaks CRLF · `perl -0` `\n` will not match `\r\n` in this CRLF tree. **Use Edit/Write for anything with backslashes** |
| **`next dev` renders an empty admin body on this machine** | Use a static harness over the real compiled stylesheet; settle cascade precedence with `grep -bo`, not reasoning |
| **A stale exemption is how a coverage rule stops covering** | Assert the exemption list holds nothing stale |
