# 50pick — Compliance Decisions Log

> Deliberate, owner-authorised decisions that touch a compliance control. Each is
> recorded so a future audit/session understands it was intentional and does NOT
> silently "restore" a prior behaviour. Newest first.

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
of accountant Jay (`Proposal/50pick Calculations.xlsx`, reviewed in `docs/FEE-MODEL-DECISION.md`).

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
