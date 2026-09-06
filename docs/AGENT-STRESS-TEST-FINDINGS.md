# Agent programme — adversarial stress-test findings

**Run:** 2026-09-06 · 9 angles × refute-by-default verification · **293 agents** ·
**142 findings raised, 78 confirmed.**

⛔ **This file exists so a 293-agent pass is not lost to a session boundary.** It is the
evidence behind [`AGENT-PROGRAMME.md`](AGENT-PROGRAMME.md) and
[`SESSION-PROMPT-AGENT-BUILD.md`](SESSION-PROMPT-AGENT-BUILD.md). Generated from the run's
own output, never transcribed by hand.

⚠️ **Read the confidence markers.** A finding here survived at least one verifier reading the
actual code — it is not a guess. But `visual-ux`, `operational`, `integration-conflicts` and
`money-adversarial` lost verifiers to a session limit mid-run, so items in those sections are
**explored but under-verified**: strong leads, not settled facts. Verify before acting.

⭐ **`FIX DISPUTED` is the most valuable marker in this file.** It means a verifier agreed the
finding is real but judged the proposed handling wrong, and said what to do instead. The
architecture in the build plan was rewritten off exactly these.

---

## Lifecycle scenarios — 17 confirmed

### 🔴 A player promoted to AGENT retroactively converts every pre-existing attribution into a paying agent relationship — and the repo's own guard asserts this as correct

**Severity** critical · **Kind** scenario · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: an applicant is vetted and charged TZS 100,000 to acquire players FROM THE APPROVAL DATE. Recruits they collected as an ordinary player — self-minted code, no vetting, no fee, possibly their own household — are not what was bought. WOULD: `referrerMayEarn` and `bindRecruit` both ask `inviteIsLiveFor(referrer.role)` against the CURRENT role. The instant `approveAgent` writes role=AGENT, every legacy `User.recruitedBy` row pointing at them (BONUS-WITHDRAWAL §6b finding 4 confirms these exist on the live table) becomes live and starts accruing on the next bet/deposit/settlement, at the agent's negotiated rate, with the commission window measured from the RECRUIT's createdAt (affiliate-service.ts:553-555) so anyone who joined inside `windowMonths` pays immediately. §5e of the shipped test suite pins this behaviour as the CONTROL, so the guard that exists will go red if you fix it. The plan never mentions the case.

**Evidence** — scripts/withdrawn-features.test.mts:259 ("§5e CONTROL · an AGENT referrer on the same path IS paid"); src/lib/server/affiliate-service.ts:367-370 (referrerMayEarn reads the referrer's role NOW); affiliate-service.ts:280 (the bind gate is also role-now)

**Proposed handling** — Decide the rule explicitly in AGENT-PROGRAMME.md and enforce it in code: agent commission accrues only on recruits whose attribution was created at or after `AffiliateAgent.approvedAt`. Stamp `boundAt`/`programme` on the attribution (or compare `recruit.createdAt >= approvedAt`) inside `onRecruitSettlement`, not in the UI. Rewrite withdrawn-features §5e so its control is an agent-era recruit and add a new section asserting a PRE-approval recruit pays nothing — with a red harness that must go red when the date comparison is removed.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the DOCTRINE, not the hook. `AGENT-PROGRAMME.md` §6's "the programme is decided by the referrer's role at the moment of accrual" must be struck and replaced with the rule the architecture brief already states: **the programme is stamped on the ATTRIBUTION at bind and is immutable; accrual reads the stamp, never the current role.** Role-now is the whole bug; a date comparison bolted on top leaves role-now as the primary gate.

Then, in the one migration this build is already writing:

1. SCHEMA. Alongside `ReferralReward.programme` / `rateApplied`, add the stamp to the attribution itself — `User.recruitedProgramme` (`AGENT | PLAYER`, NOT NULL) and `User.recruitedAt` — written in the SAME `db.user.update` that sets `recruitedBy` (`affiliate-service.ts:304`), so an attribution can never exist without its programme. Both DAL backends plus the `DATA-LAYER.md` entity map.

2. BACKFILL, in that same migration — the step the proposal omits and the load-bearing one. Every existing `recruitedBy` row gets `recruitedProgramme = 'PLAYER'`, `recruitedAt = "User"."createdAt"`. They were all bound under the player promo; that is a historical fact, not a guess. NOT NULL forces it. Do not leave the column nullable with "NULL means fall back to current role" — that is the defect with a new name. Do this even if the prod count is zero: the column is what makes the returning player programme safe.

3. ONE RESOLVER, ALL THREE HOOKS. Widen the existing predicate rather than adding a sibling — `referrerMayEarn(referrerUserId, attribution)`:
   · `attribution.recruitedProgramme === "AGENT"` → require an `AffiliateAgent` with `approvedAt != null` AND `active`, and `attribution.recruitedAt >= approvedAt`. Agent economics, agent rate, agent caps.
   · `attribution.recruitedProgramme === "PLAYER"` → require `inviteIsLiveFor(referrer.role)` AND `role !== "AGENT"`. Player economics, player config. Today this is WITHDRAWN, so it pays nothing; when it returns it pays what it always promised, into the bonus wallet.
   Call it from all three hooks (:495, :544, :610) — the single edit that also kills the retroactive prize, because `payPrize` sits behind the same gate.
   The `programme` written onto `ReferralReward` then simply copies the attribution stamp, which makes "one referrer, one programme, one payment per event" mechanically true instead of role-dependent.

4. THE WINDOW. With `recruitedAt` stamped, `onRecruitSettlement:553` should measure from the ATTRIBUTION, not `recruit.createdAt` — otherwise an agent's window is silently shortened by however long the recruit existed before binding, and the proxy stays load-bearing.

5. GUARDS. §5e's control is not "wrong", it is under-specified: keep its intent (an eligible agent on the same path IS paid) and give its fixture a `recruitedProgramme = "AGENT"` attribution bound after `approvedAt`. Then add the refusal it never had — a PRE-approval / `programme = PLAYER` attribution whose referrer is now an AGENT accrues ZERO across all three hooks — and, per the repo's rule that every refusal needs a control that must go red, prove it with a red harness that deletes the stamp comparison and watches the new section fail while §5e still passes. Also assert the flat prize specifically: `listByReferrer(agent).filter(type === "PRIZE").length === 0`, because a commission-only check passes while TZS 200,000 of prize money leaves.

6. AND CHECK THE ASSUMPTION. Before the build starts, re-derive the live count of non-null `recruitedBy` and record it in AGENT-PROGRAMME.md. `SESSION-PROMPT-AGENT-BUILD.md`'s "all current data is test data" is an unmeasured claim carrying a migration decision.

**⭐ A verifier disagreed with that handling and proposed:**

Stamp the ERA on the attribution, once, at bind — and make every hook read the stamp instead of the role.

1. SCHEMA (same migration the plan already opens). `User.recruitedProgramme` (`AGENT | PLAYER`, null only for un-recruited) and `User.recruitedAt DateTime?`, written in `bindRecruit` at `affiliate-service.ts:304` in the same update as `recruitedBy`. Backfill in that migration: every existing row → `programme = 'PLAYER'`, `recruitedAt = User.createdAt`. That backfill is provable, not a guess — nothing has ever assigned `UserRole.AGENT`, so no agent-era attribution can exist yet. Both DAL backends + the `DATA-LAYER.md` entity map, per §10.

2. RULE, written into `AGENT-PROGRAMME.md` §6, replacing line 155. Today it says the programme is decided by "the referrer's role at the moment of accrual". It must say: **the programme is decided by the attribution's stamp, fixed at bind and never rewritten** — the same principle as `PredictionMarket.feeSnapshot` and `rateApplied`, which §5 already commits to ("a later rate change must never rewrite history"). Role-at-accrual is the one place the plan violates its own snapshot discipline. Consequence, stated plainly: agent commission is paid ONLY on `programme = AGENT` attributions; pre-approval recruits stay on PLAYER terms — which today, invite being WITHDRAWN, means they pay nothing (identical live behaviour to the finder's rule) and later means they pay the player promo, not a forfeit.

3. ONE RESOLVER, beside `rateFor`, consulted by all three hooks — not inside `onRecruitSettlement`:
   `programmeFor(recruit)` → `recruit.recruitedProgramme`; then `mayEarn = programme === "AGENT" ? (account.approvedAt != null && account.active) : inviteIsLiveFor(referrer.role)`. `referrerMayEarn` (`:367`) becomes this function's PLAYER branch, so there is still exactly one definition of "may earn", and `rateFor` keys off the same stamp rather than off `approvedAt != null` — that also closes leak 3 properly (an AGENT-stamped attribution with no `commissionPct` must REFUSE and record HELD, never silently fall through to `cfg.commission.rate`). Note this also fixes the mirror the finding misses: a deactivated agent's agent-era recruits stop, and never fall onto the player promo.

4. THE §5e CONTROL NEEDS MORE SURGERY THAN "re-base it on an agent-era recruit". As written it pays an AGENT a **player PRIZE** (`onRecruitBet` → `payPrize`, config `prize.amountTzs: 10_000` at `withdrawn-features.test.mts:221`). `AGENT-PROGRAMME.md` §5 says no flat prize is paid to agents, and §6's invariant exists precisely to stop "agent commission **and** the player prize, on the same recruit, from the same bet". So the control is asserting a double-dip the plan forbids, independent of this finding. Re-base it on `onRecruitSettlement` with a real `operatorFee`, and make §5d/§5e a 2×2 that varies ONE thing at a time:
   · referrer PLAYER now + PLAYER stamp → nothing (§5d, unchanged);
   · referrer AGENT now + **PLAYER stamp** → nothing (the new cell — this finding);
   · referrer AGENT now + AGENT stamp → PAID at `commissionPct`, `programme=AGENT`, `rateApplied` (the control that must go red);
   · referrer AGENT now + AGENT stamp but `active=false` → nothing.
   Red harness: delete the stamp read from the resolver and cell 2 must go red. ⛔ Do not leave `:259`'s wording in place — it is now the assertion of a defect, and its comment must record why it changed, or the next reader restores it.

5. THE DISPLAY IS PART OF THE FIX, not a follow-up. `getPlayerReferralSummary` (`affiliate-service.ts:648`) lists every `u.recruitedBy === userId` and reports `acct.recruitCount`, which `incrementRecruitCount` (`:302`) bumped for the legacy binds too. Decision 10 makes that page the agent's dashboard. Left alone, a newly approved agent sees a book of recruits that will never pay them a shilling — a false money statement of exactly the class the Player-View Audit shipped five blockers for. Split the read model by stamp: the agent's commissionable book (`programme = AGENT`) is the headline; pre-agent recruits either drop out or are labelled non-commissionable. Same split on `/admin/agents/[id]` and the `/admin/affiliate` sub-ledger, so the officer setting a rate is looking at the population that rate will actually price.

---

### 🔴 On today's shipped config an approved agent earns the PLAYER FLAT PRIZE and zero commission — the exact inverse of decisions 3 and 5

**Severity** critical · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: commission only, priced on the operator fee actually collected; no flat signup prize (decisions 3 and 5). WOULD: `payPrize` and `payBonus` are gated by `cfg.prize.enabled` / `cfg.bonus.enabled` and by `referrerMayEarn` — which returns TRUE for an AGENT. The shipped defaults have commission OFF and the 10,000 TZS first-bet prize ON, capped at 20 per referrer. So on approval day an agent earns TZS 200,000 of flat prizes as real withdrawable cash and TZS 0 of commission, and `/admin/affiliate`'s growth officer can turn the prize amount up without anyone thinking about agents. This is a fifth leak of the same family as the four already found, but it is the one that is live under the CURRENT config rather than under a hypothetical re-enablement.

**Evidence** — src/lib/server/affiliate-config.ts:83-85 — `commission: { enabled: false, … }`, `prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, capPerReferrer: 20 }`; src/lib/server/affiliate-service.ts:501-513 (onRecruitBet → payPrize) and :372 (payBonus); docs/SESSION-PROMPT-AGENT-BUILD.md:79-92 touches only the commission branch

**Proposed handling** — The AGENT programme must be commission-only by construction, not by config: make `payPrize` and `payBonus` return early when the referrer's programme is AGENT (the same resolver that decides `rateFor`), and assert it in the new agent-application-security suite with a control proving a PLAYER referrer on the same path IS paid. Separately, re-derive the LIVE `affiliate.config` SystemConfig row on production before writing any number into RULES.md §2.10 — affiliate-config.ts:81 warns its defaults are what runs when no row exists.

**⭐ A verifier disagreed with that handling and proposed:**

The defect is real; the proposed fix is the wrong shape and would create a third definition of "is this an agent".

WHY THE PROPOSAL IS WRONG. It says to reuse "the same resolver that decides `rateFor`". `rateFor(account, cfg)` as specified at SESSION-PROMPT-AGENT-BUILD.md:84-89 takes an `AffiliateAgent` row and returns a NUMBER — it is a rate function, not a programme resolver, and it cannot answer "which programme is this accrual". Bolting early returns into `payPrize` and `payBonus` would leave THREE places independently deciding what an agent is: `referrerMayEarn` (367), the new `rateFor`, and two new guard clauses. `feature-state.ts:277` and the bind-gate comment at affiliate-service.ts:257-278 both state the standing rule — the predicate "must not grow a SECOND definition of 'may refer' somewhere else". Defensive early returns are also the weaker construction: they make the agent programme commission-only by GUARD, when the plan's own framing ("complete and final", no workarounds) calls for commission-only by CONSTRUCTION.

DO THIS INSTEAD — one resolver, resolved once per hook, threaded down.

1. `async function accrualContext(referrerUserId): Promise<AccrualContext | null>` in affiliate-service.ts, replacing `referrerMayEarn` outright (do not leave it as a second seam). It reads the user row and the `AffiliateAgent` row ONCE and returns `null` when the referrer may not earn at all, else `{ programme: "AGENT" | "PLAYER", rate, capPerRecruitTzs, windowMonths, destination: "CASH" | "BONUS" }`. This is the single place role, agent row and config meet. The plan already requires a programme resolution at accrual anyway, because §3 says to stamp `programme` on every reward — so this resolver is not new work, it is the work the plan already implies, done once instead of three times.

2. All three hooks (onRecruitBet 490, onRecruitSettlement 537, onRecruitDeposit 605) call it at the top and branch on `ctx.programme`. `payPrize` and `payBonus` are wired ONLY under the PLAYER branch — they are never invoked with an agent context, so there is no early return to forget. `onRecruitSettlement` uses `ctx.rate`.

3. Fold the four known leaks into the same resolver rather than patching them separately — they are all the same seam:
   · AGENT with `commissionPct == null` → return null and write a SECURITY/ADMIN audit. REFUSE, never fall back to `cfg.commission.rate` (leak 3). The fallback in the plan's `rateFor` at line 88 must be deleted, not kept.
   · The AGENT branch must not read `cfg.enabled` or `cfg.commission.enabled` at all (affiliate-service.ts:497, 546, 548) — those are the growth officer's player-promo levers. An agent's on/off is `AffiliateAgent.active && approvedAt` (leak 2).
   · Caps and window come from the agent row for AGENT, from `cfg.commission` for PLAYER (leak 4).
   · `ctx.destination` is passed into `creditWallet` (185): AGENT → `creditInternal` unconditionally, never `creditBonus` (leak 1). Without this, fixing the prize still leaves agent COMMISSION landing in the bonus wallet under the shipped `bonus-config.ts:61,64` defaults.

4. THE CONTROL AS PROPOSED CANNOT GO RED FOR THE RIGHT REASON. "A control proving a PLAYER referrer on the same path IS paid" will not run today: `PRODUCT_STATE.invite = "WITHDRAWN"` (feature-state.ts:62), so a PLAYER referrer is refused at `referrerMayEarn` long before reaching `payPrize`. The control would pass with the new agent gate deleted, because the default state cannot pay a player either way — the repo's own named trap at SESSION-PROMPT-AGENT-BUILD.md:182, "a guard that chooses its own population cannot fail". The PLAYER control MUST drive the ON branch through the `FEATURE_INVITE=ACTIVE` env override (feature-state.ts:82-86), exactly as `scripts/withdrawn-features.test.mts:131-143` already does, and must restore it in a `finally`. Assert two things under that override: an AGENT referrer accrues COMMISSION and ZERO PRIZE rows; a PLAYER referrer on the identical path accrues a PRIZE. Then prove the harness by deleting the programme branch and confirming the AGENT assertion goes red.

5. ONE THING BOTH THE FINDING AND THE PLAN MISS, and it decides what the resolver reads. AGENT-PROGRAMME.md:154-155 says the programme is "decided by the referrer's role at the moment of ACCRUAL", but the architecture under test stamps `programme` at BIND. Those diverge the first time a player referrer is later approved as an agent, or an agent is deactivated with live recruits. Pick one and write it into RULES.md §2.10: accrual-time is the correct choice here (it is what `referrerMayEarn` already does, and it is what lets deactivation stop payment), with the bind-time stamp kept as history only, never read for pricing.

6. Before any number reaches RULES.md §2.10, re-derive BOTH live SystemConfig rows on production — `affiliate.config` and `bonus.config`. `define-config.ts:57,63-72` shows the shipped defaults are what runs when no row exists, and BONUS-WITHDRAWAL.md:176 already records that warning for bonus-config. The finding applied this caution to one row and not the other.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the fix with ONE resolver plus a guard swap, landed together.

1. In `affiliate-service.ts`, add a single `resolveReferralProgramme(referrerUserId)` returning either `{ programme: "AGENT", rate }`, `{ programme: "PLAYER", rate: cfg.commission.rate }`, or a REFUSAL. It is the only thing in the codebase that answers both "which programme" and "at what rate", so the two can never disagree:
   - `role === "AGENT"` (assigned in exactly one place, `approveAgent` — feature-state.ts:93-95) ⇒ programme AGENT, rate from that agent's `AffiliateAgent.commissionPct`.
   - Role AGENT but no `approvedAt` / null `commissionPct` ⇒ REFUSE, with a SECURITY-category audit. ⛔ Never fall back to `cfg.commission.rate` — that is leak 3, and it is the same class of bug as `rateFor`'s drafted `:` branch. Fix `rateFor` to be this resolver, not a sibling of it.

2. All four payers consult it, and only it:
   - `payBonus` (:372) and `payPrize` (:424) return early — with an audit line, not a silent `return` — when programme is AGENT. This is a PRICING refusal, not a feature gate, so it does not violate feature-state.ts's "gate the offer, never the refusal": commission-only becomes true by construction rather than by a config a growth officer owns.
   - `onRecruitSettlement` takes rate/programme from the resolver and, for an AGENT, stops consulting `cfg.commission.enabled` and `cfg.enabled` (leaks 2 and 4 are the same resolver's business — land them here rather than in a second pass, or the agent branch keeps reading the player promo's switches and caps).
   - Stamp `programme` and `rateApplied` on `recordReward` from the resolver's single return value.

3. Guards, in the same commit:
   - Re-point `scripts/withdrawn-features.test.mts` §5e (:253-263) from the prize path onto the commission path: an AGENT referrer with a set `commissionPct` must be PAID at `onRecruitSettlement`. The control keeps doing its job — proving the payment path is alive for the population that may earn — without asserting the wrong answer.
   - In the new `agent-application-security` suite: (a) an approved AGENT referrer on `onRecruitBet` with the prize config forced on earns ZERO and writes NO reward row; (b) the control — the identical shape with a PLAYER referrer under `process.env.FEATURE_INVITE = "ACTIVE"`, restored in a `finally` exactly as §4 does (:126-142) — IS paid; (c) an AGENT with null `commissionPct` is REFUSED and audited, never paid at `cfg.commission.rate`.
   - Prove both by MUTATION on a locked copy via `KP_SRC`: delete the AGENT early-return in `payPrize` and (a) must go red; delete the refusal branch and (c) must go red. A refusal whose deletion leaves the suite green is not a guard.

4. Evidence, separately and before RULES.md §2.10 is written: re-derive the LIVE `affiliate.config` SystemConfig row on production (affiliate-config.ts:81 says the defaults only run when no row exists). Record what the row actually says; ⛔ do not carry the defaults-derived 10,000 / cap-20 / 200,000 figures into any doc as live numbers. The code fix above does not depend on that answer — that is the point of fixing it by construction.

---

### 🔴 A closed, suspended or self-excluded agent's code keeps recruiting, and every accrual it produces is written HELD forever

**Severity** critical · **Kind** scenario · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: closing an account, or suspending it, ends the commercial relationship — the link stops binding and no further liability is created. WOULD: `closeAccount` leaves `role = AGENT`, so `inviteIsLiveFor` stays true. The agent's `50PICK-AG-…` link is a public artefact on WhatsApp and posters; it keeps binding new registrations to a dead account, those recruits see a 'Verified 50pick Agent' ribbon for someone who no longer exists, and every settlement writes a HELD ReferralReward — a ledger row claiming money is owed that no code path can ever pay (BONUS-WITHDRAWAL §7: HELD is terminal), while consuming the once-per-recruit budget. The dead/abandoned-agent scenario and the account-closure scenario are the same bug. Nothing in the plan closes it.

**Evidence** — src/lib/server/affiliate-service.ts:280 (bind gate reads role only); src/lib/server/user-service.ts:71-119 (`closeAccount` sets status/wallet CLOSED, never touches role or the affiliate account); src/lib/server/wallet-service.ts:1803-1805 (`creditInternal` returns null when `wallet.status !== "ACTIVE"`); affiliate-service.ts:576-585 (null credit → status HELD); affiliate-service.ts:567-573 (the per-recruit cap sums COMMISSION rows regardless of status)

**Proposed handling** — Make the seam read agent standing, not just role: extend the single `referrerMayEarn`/`bindRecruit` predicate (the file's own comment at affiliate-service.ts:275 already promises this) to require `user.status === "ACTIVE"` AND `AffiliateAgent.active` AND `approvedAt != null` — one definition, no second copy. Add `closeAccount` → `deactivateAgent` (audited), and make `/admin/agents` show any agent with HELD rows so an officer can settle out. Red harness: close an agent, bind through their code, assert refusal; control = an active agent still binds.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding, replace the fix. Separate the two questions the one-line predicate is currently conflating — may this code CREATE a new relationship, and may this agent be PAID on relationships already created — with ONE derived resolver, no second definition and no write-side fan-out.

1. ONE resolver, in `affiliate-service.ts` beside `referrerMayEarn`:
   `agentStanding(user, account) → "ACTIVE" | "SUSPENDED" | "ENDED"`, derived from `user.status` + `account.active` + `account.approvedAt`. Nothing else computes it; `closeAccount`, admin suspend and self-exclusion stay untouched, so no status writer can forget to call a deactivator.

2. BIND (affiliate-service.ts:280) refuses unless standing is ACTIVE, and BRANCHES ON ROLE so re-enablement is unaffected:
   · `role === "AGENT"` → require `account.active && account.approvedAt != null && user.status ∉ {CLOSED, SUSPENDED, SELF_EXCLUDED}`;
   · every other role → the existing `inviteIsLiveFor(role)` test unchanged, and NEVER `approvedAt`.
   Keep the existing `affiliate.bind.refused_withdrawn` audit, with the standing in the payload.

3. EARN on already-bound recruits is a POLICY question the framework is silent on — do not let a predicate tweak decide it. Put it to Ali and record it in AGENT-PROGRAMME.md §2 as a dated ruling, with a lifecycle row for SUSPENDED/ENDED (the table stops at APPROVED/REJECTED today). The defensible default for a licensed operator: commission earned on a recruit bound while the agent was in good standing stays a LIABILITY and must remain VISIBLE — so keep accruing and keep recording the row; do not silently return. Terminate accrual only on ENDED-for-cause, audited by the deciding officer.

4. Fix the artefact rather than deleting it. `recordReward` already has a `note` field — write the suppression reason on the HELD row (`agent_closed`, `rg_lockout`), and either exclude HELD from the cap sum at affiliate-service.ts:567-573 or ship the release action BONUS-WITHDRAWAL.md:195 already prescribed. Do not both suppress the row and spend the budget.

5. `/admin/agents` surfaces standing (ENDED/SUSPENDED) as a queue state, and the officer's existing deactivate button becomes load-bearing because the gate now reads `active`.

6. RED HARNESS — every refusal needs a control that must go red, and this one needs two:
   · close (and separately suspend, and separately deactivate) an agent, bind through their code → assert `bound === false, reason: "referrer_not_eligible"` plus the audit line;
   · CONTROL A: an ACTIVE approved agent still binds;
   · CONTROL B (the one that catches defect (a)): `FEATURE_INVITE=ACTIVE` with an ordinary PLAYER referrer whose `approvedAt` is null → must still bind. Delete the role branch and this control must go red.
   Lock the harness and mutate a copy via `KP_SRC`; run both DAL backends.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding, change the seam. Do not push standing; READ it, and branch on programme.

1. ONE resolver, consumed by both eligibility and pricing so they can never disagree (the discipline `rateFor` is already meant to enforce): `agentStanding(userId) -> { isAgent, active, approvedAt, ratePct }` in affiliate-service.ts, backed by the AffiliateAgent row. The plan's `rateFor` must call it too.

2. TWO predicates, both programme-aware, replacing the bare `inviteIsLiveFor(role)` at the three sites:
   - `mayRecruit(referrer)` — used by BOTH `bindRecruit` (:280) and `resolveReferralPreview` (:165); they must stay identical, as the ribbon's own comment at :157 requires.
   - `mayAccrue(referrer)` — used by the three hooks (:495, :544, :610).
   Both resolve as: if role === "AGENT" → `inviteIsLiveFor(role) && standing.active && standing.approvedAt != null && referrer.status !== "CLOSED" && referrer.status !== "SUSPENDED"`; ELSE → `inviteIsLiveFor(role)` UNCHANGED. The role branch is what keeps the player programme alive the day FEATURE_INVITE flips back, and it is why `approvedAt` must never be a flat conjunction.

3. ⛔ CLOSED and SUSPENDED only. Do NOT put COOLED_OFF, SELF_EXCLUDED or PENDING_KYC in either predicate. Those are responsible-gaming and identity states about the agent's own PLAY; closure and suspension are the only two that end the commercial relationship. RG stays where it already is and already works — `isLockedOut` in creditInternal (wallet-service.ts:1790), which suppresses the CASH incentive and writes a truthful HELD row rather than destroying the attribution.

4. Wire `AffiliateAgent.active` into those two predicates and into `DATA-LAYER.md` + BOTH DAL backends (it is missing from `StoredAffiliateAccount`, store.ts:348-355). This is the single highest-value line in the whole fix: without it the plan's §5 deactivate button is a no-op. `active` is the officer's explicit revocation switch; `status` is the derived one. ⛔ Do not add a `closeAccount → deactivateAgent` call — that hook would have to be repeated at every writer of standing and would silently lie the day a fourth writer appears.

5. HELD: leave the accrual and cap guards ALONE — BONUS-WITHDRAWAL §7 is a dated, measured decision, and changing a money-path guard with no red control is how the next defect gets written. Once (2) lands, a closed agent stops PRODUCING new HELD rows, which is the actual remedy. If a release action is wanted, put it on /admin/affiliate as §7 directs, not /admin/agents.

6. RED HARNESS — three controls, and the third is the one the original proposal misses:
   a. close an agent, bind through their code → refused; the ribbon renders nothing on `/auth/register?ref=CODE`.
   b. `deactivateAgent` (active=false) with the account still ACTIVE → bind refused AND `onRecruitSettlement` accrues nothing. Deleting the `active` term must turn this red.
   c. ⭐ with `FEATURE_INVITE=ACTIVE`, an ordinary player who has never been approved STILL binds and still accrues. This is the control that catches the `approvedAt` conjunction silently killing the player programme on re-enablement, and it is the one that must exist before the predicate is touched.

7. While in `bindRecruit`: `/auth/register` slices `ref` to 16 chars (register/page.tsx:51). `50PICK-AG-` is already 10, so an agent code longer than 16 is truncated and silently fails to resolve — check this when minting the code format, or the badge and the bind both vanish for long IDs.

---

### 🟠 A permanent self-exclusion silently forfeits 100 years of an agent's contractual commission, and the plan takes no position on whether an excluded person may be an agent at all

**Severity** high · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: RG suppression exists so we do not push promotional money at someone who has asked us to stop. Agent commission is not a promotion — it is contracted business income from a partner who paid TZS 100,000, and the framework calls them a business partner. Whether it should be suppressed is a money-and-licence decision with Ali's name on it. WOULD: the moment an agent cools off for one hour, or self-excludes, `creditInternal` returns null, every accrual lands HELD, HELD is terminal, and the per-recruit cap counts it — so a 24-hour cool-off permanently destroys that recruit's remaining commission budget. A permanent exclusion stores as now+100 years, so it is not a pause, it is forfeiture. And nothing prevents a self-excluded player from applying: the application precondition is APPROVED KYC (SESSION-PROMPT:72-75), which an excluded player still has.

**Evidence** — src/lib/server/responsible-gambling.ts:42 (`"perm": 100 * 365 * 24 * 60 * 60`), :314-325 (`isLockedOut`), :353 ("the period is a MINIMUM… never reinstates itself"); src/lib/server/wallet-service.ts:1790-1801 (RG suppression on the cash path); docs/BONUS-WITHDRAWAL.md:179-197 (HELD is terminal and consumes the budget)

**Proposed handling** — Two rulings to put in AGENT-PROGRAMME.md before building. (a) Application: refuse to submit/approve while `isLockedOut` or `selfExclusionStanding !== none` — an excluded gambler with a financial stake in recruiting gamblers is a licence problem. (b) Accrual: if commission is business income, route it past the RG suppression with its own audited justification, or keep the suppression and build the officer release action on /admin/affiliate that BONUS-WITHDRAWAL §7 already names as the correct fix. Either way, stop HELD rows consuming the cap — filter the cap sum to `status = 'PAID'`.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the fix with four items, three of them rulings written into AGENT-PROGRAMME.md before any code.

RULING 1 — commission stays behind the RG gate. Write it in AGENT-PROGRAMME.md §5 as a dated decision: agent commission is paid into a gambling wallet on a gambling platform, so it is suppressed by `isLockedOut` like every other credit. Do NOT add a bypass flag to `creditInternal`. Record the reasoning so the next session cannot re-open it, and note the mechanical fact that a bypass would not even work (`wallet-service.ts:1805` frozen-wallet check).

RULING 2 — HELD becomes non-terminal, for AGENT rows first. Build `releaseHeldReward(rewardId, officerId)` on `/admin/agents` (the compliance surface AGENT-PROGRAMME §6 assigns to agents — BONUS-WITHDRAWAL §7 said `/admin/affiliate` only because agents did not exist yet). It re-runs `creditInternal`, flips HELD→PAID on success, audits, and runs inside the same `referral:commission:${referrer}:${recruit}` lock the accrual uses. Pair it with the cap change: exclude non-PAID rows from the `already` sum at `affiliate-service.ts:566-572` AND re-check `capPerRecruitTzs` inside release, so a released backlog cannot overshoot. One without the other moves the defect rather than fixing it.

RULING 3 — say what an exclusion does to the AGENT ROLE, which is the piece genuinely missing. Concretely: `selfExclude()` and `coolOff()` call `deactivateAgent` (`active = false`), so the code stops binding new recruits while the person is on a break. This is the platform's own shape — gate the offer, never the refusal: stop new attribution, do not retroactively void commission already earned on existing recruits. `restorePlayerAction` reactivates. Note the control this needs: a red test asserting that a bind against a deactivated agent's code REFUSES, which must go red when `active` is ignored.

RULING 4 — permanent exclusion needs Ali's name, because no release action can reach it. `restorePlayerAction` refuses a permanent exclusion outright (`actions.ts:155-160`), the wallet stays FROZEN for ever, and the register entry is deliberately never cleared. So an agent with a HELD balance who permanently self-excludes cannot be paid by any existing route. Two options, both his: (a) a one-off officer final-settlement disbursement to the agent's registered Selcom MSISDN, booked as a business payable and NOT as a wallet credit — the same out-of-band shape decision 2 already uses for the TZS 100,000 fee, which is the precedent that makes this coherent; or (b) written forfeiture, disclosed to the applicant in the agent terms before they pay. Do not let the build session pick.

APPLICATION PRECONDITION — narrower than proposed, and stated accurately. Add to `reviewApplication`/`submitForReview`, alongside APPROVED KYC: refuse when `isLockedOut()` is true or `selfExclusionStanding().state !== "none"`. Document that a *serving* self-exclusion is already unreachable (sign-in is refused at `auth-service.ts:123-165`), so this precondition exists for the two cases that actually reach the form — a COOLED_OFF applicant, and one restored after `minimum_served` — and that the second is a judgement call an officer sees rather than a silent refusal. Put the refusal reason on the officer's screen, not just in the audit log.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the remedy. Four parts, in this order.

1. TWO RULINGS IN docs/AGENT-PROGRAMME.md, DATED, IN ALI'S NAME — not derived mechanically. Put them as questions, because both are money-and-licence calls: (i) May a person with a self-exclusion in their PAST — served, and reinstated by an officer — hold an agent code and earn commission on recruited gamblers? (ii) Is an agent's own commission suppressed while THEY are on a break? Record the answers as decisions 11 and 12 alongside the existing ten. Do not let a predicate choice smuggle in an answer.

2. MECHANISM — SEPARATE ACCRUAL FROM PAYMENT, using the enum value that already exists. `ReferralRewardStatus.PENDING` is in prisma/schema.prisma:953-957 and no code path writes it (BONUS-WITHDRAWAL.md:187). When `creditWallet` refuses for an RG reason specifically, record the reward `PENDING` with the reason on the row; keep `HELD` for the frozen/missing-wallet defect case, which is a different thing and should not be tidied into the same bucket. Then build the officer release action on /admin/affiliate that BONUS-WITHDRAWAL.md §7 already names as the correct fix — the agent programme is what turns that from hypothetical into certain, because commission is now contracted income from a partner who paid TZS 100,000, not a promo. No migration; the page already renders the chip. This satisfies BOTH sides: no cash lands during the break (the RG control is untouched and `test:rg-cash-incentive` stays green), and nothing is forfeited.

3. CAP — DO NOT TOUCH IT. The cap counts every non-void row (PAID + PENDING + HELD) and must keep doing so: it is a budget on ACCRUAL, and a suppressed accrual is money we owe. The release action pays what was already budgeted, so the cap is enforced exactly once, where it is today. Under decision 4 (one rate per agent) the agent cap should be per-agent config anyway — that is leak 4's fix, and it lands in the same edit.

4. AND FIX THE RECORD-ORDER, which the finding misses and leak 1 makes live. `creditBonus` RG-suppression writes NO ledger row at all (bonus-service.ts:111-123) while the cash route writes one — BONUS-WITHDRAWAL.md:189-190 flags the disagreement. So if bonus is ever re-enabled with `affiliateToBonus` on (leak 1), an agent's suppressed commission vanishes with no trace to release. Record the reward row BEFORE attempting the credit and update its status from the result — record-then-credit, not credit-then-record — so the artefact exists whichever route refused.

GATE THE OFFER, NOT ONLY THE REFUSAL, AND MIND THE FEE ORDERING. If ruling (i) comes back as a refusal, it must bite at `startApplication` and at the /agent page's apply CTA for a signed-in locked user — BEFORE the applicant is told to send TZS 100,000 out of band. This is the same discipline `resolveReferralPreview` already applies ("THE RIBBON IS A PROMISE, SO IT OBEYS THE SAME GATE AS THE BIND", affiliate-service.ts:155-165). A refusal that first appears at `reviewApplication` strands a paid fee, and decision 7 only guarantees a refund to a REJECTED applicant — so if a lock appears between submit and review, the outcome must route through the existing refund path as a rejection, never a silent block.

CONTROL THAT MUST GO RED: a drive that cools an approved agent off for 1h, settles a recruit's position, and asserts (a) no cash reached the wallet, (b) the row is PENDING with the RG reason, (c) the cap consumed equals the accrual, (d) after officer release the total paid equals the accrual and does not exceed `capPerRecruit`. Then the control: delete the release action and the drive must fail. Add a second control asserting a restored, minimum-served player is NOT refused by the eligibility check unless ruling (i) says so — that is what stops `selfExclusionStanding !== none` creeping back in.

---

### 🟠 `deactivateAgent` has no defined meaning, and on the memory DAL it cannot have one

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: the authority states what deactivation does to (i) new binds through the code, (ii) commission on recruits already bound, (iii) any in-flight settlement, (iv) whether it is reversible and by whom. WOULD: the build prompt lists a function name and an officer button and stops. The proposed `rateFor` does not consult `active`, so a deactivated agent whose row still has `approvedAt` and `commissionPct` keeps earning at their full rate; if instead you gate the seam on `active`, deactivation retroactively stops paying on relationships the agent already delivered — a commercial dispute with a fee-paying partner. Worse, the in-memory backend's affiliate shape carries none of these three columns, so on that backend `rateFor` falls through to `cfg.commission.rate` (leak 3) and deactivation is a silent no-op — and the memory backend is what every local test and the QA harness runs on, so the guards would be measuring the wrong population.

**Evidence** — docs/SESSION-PROMPT-AGENT-BUILD.md:69 and :111 are the ONLY mentions of deactivation in either document; src/lib/server/store.ts:348-355 (`StoredAffiliateAccount` has no `active`, `approvedAt` or `commissionPct`); SESSION-PROMPT:84-88 (`rateFor` reads `approvedAt` and `commissionPct` but never `active`); docs/DATA-LAYER.md:66 already records a field-name divergence on this entity

**Proposed handling** — Write the deactivation policy into AGENT-PROGRAMME.md as a table (bind: refused · already-bound recruits: keep paying until X / stop immediately — Ali's call · in-flight settlement: see the mid-settlement finding · reversible: yes, by a compliance officer, audited). Add `active`, `approvedAt` and `commissionPct` to `StoredAffiliateAccount` and to the DATA-LAYER.md entity map in the same commit. Make `rateFor` REFUSE (return null → no accrual, audited) rather than fall back, for both a missing rate and an inactive agent.

**⭐ A verifier disagreed with that handling and proposed:**

1 · WRITE THE POLICY IN THE AUTHORITY, AND SPLIT THE TWO MEANINGS `active` IS BEING ASKED TO CARRY.
Add a row set to `AGENT-PROGRAMME.md` §2 (today it stops at APPROVED/REJECTED) covering two distinct post-approval states, because they have opposite commercial answers:
· `SUSPENDED` — compliance hold. New binds REFUSED. Accruals on already-bound recruits are RECORDED but `HELD`, not dropped. Reversible by a single compliance officer, audited.
· `OFFBOARDED` — relationship ended. New binds REFUSED. Whether already-bound recruits keep paying to the window end (`cfg.commission.windowMonths`, `onRecruitSettlement` :551-555) or stop at once is a DATED ALI DECISION — get it before the build, because it is the difference between an honoured contract and a dispute with a partner who paid TZS 100,000.
Also decide explicitly, in the same table: deactivation does NOT demote `UserRole.AGENT`. `feature-state.ts` `inviteStateFor` opens `/profile/invite` on role alone, so demoting would hide a still-owed agent's own ledger and their withdrawal path. Keep the role; gate on the account flag.

2 · ONE PREDICATE, NOT TWO.
Extend the existing seam, exactly as `affiliate-service.ts:275-277` reserves: a single exported `agentMayRefer(referrer, account)` = `inviteIsLiveFor(referrer.role) && (role !== "AGENT" || account.active)`, consumed by BOTH the bind gate (:280) and `referrerMayEarn` (:367-370). Bind and pay then cannot disagree by construction. Leave `rateFor` a pure pricing resolver.

3 · `rateFor` REFUSES ONLY ON A MISSING RATE.
`return account.approvedAt && account.commissionPct != null ? Number(account.commissionPct)/100 : null` — null means no accrual plus an audit. That is leak 3's fix and it is right. It must NOT also encode eligibility.

4 · THE DAL TRAP IS THE OPPOSITE OF THE ONE REPORTED, AND IT IS SHARPER.
`store.ts:1190-1196` memory `affiliate.update` is `{ ...a, ...patch }` — it accepts any new field for free. `prisma-dal.ts:1689-1700` `update` maps an explicit ALLOW-LIST (`code`, `recruitCount`, `totalEarnedTzs` only), `create` :1677-1687 likewise, and `toStoredAffiliate` :382-390 drops unmapped columns on read. So adding `active` to `StoredAffiliateAccount` WITHOUT adding it to all three Prisma mappers gives a deactivation that works perfectly in every memory-backed guard (`store.ts:1429-1453` — memory is the test-only fallback, `money-invariants.test.mts:2` runs "in-memory store; no DATABASE_URL") and is a SILENT NO-OP in production. That is this repo's "a guard that chooses its own population cannot fail", on a money control.
Required control that must go RED: a DAL-parity guard that sets `active:false`, `commissionPct` and `approvedAt` through `db.affiliate.update` and reads them back on the PRISMA backend, with the mutation being "delete the field from the prisma `update` allow-list". A memory-only guard proves nothing here.

5 · AUDIT AND REVERSIBILITY.
`deactivateAgent` / `reinstateAgent` both take a categorised reason and audit actor + reason, mirroring `reviewKyc`; single officer, no two-officer lock (standing owner decision, `test:two-admin` asserts its absence). Held accruals are released or voided explicitly by an officer from `/admin/agents/[id]` — never implicitly on reinstatement.

**⭐ A verifier disagreed with that handling and proposed:**

Split it: eligibility goes in the ONE predicate the code already reserved for it; `rateFor` stays a pure price resolver.

1 · POLICY, in AGENT-PROGRAMME.md — extend §2's lifecycle with a reversible `DEACTIVATED` state and add a §5a table, but write the answers ALIGNED to the decision already recorded in source, not re-opened as fresh: new binds REFUSED · already-bound recruits STOP accruing at deactivation (affiliate-service.ts:359-365 already gives the reason — gating only the bind leaves the older population paying quietly) · accruals already PAID are NEVER clawed back, deactivation is prospective only (that is the whole answer to the "commercial dispute with a fee-paying partner" objection: the partner keeps every shilling earned and stops earning on future activity — anything softer is not a lever) · in-flight settlement reads `active` at the moment of accrual, inside the same lock as the reward write, the same way `rateApplied` is snapshotted · reversible by a single compliance officer with a categorised reason, audited in both directions, and reactivation does NOT retro-pay the gap. Cross-reference it from RULES.md §2.10 beside the ceiling.

2 · MECHANISM — put `.active` and `.approvedAt` into `referrerMayEarn` (affiliate-service.ts:367-370) and into the bind gate (:279-289), and give the inactive case its OWN audit action (`affiliate.bind.refused_inactive_agent`) so it is separable from `affiliate.bind.refused_withdrawn` in the log. ⛔ Do NOT touch `rateFor`. Extract the composite predicate once and route ALL THREE consumers through it — `:165` (registration ribbon / Verified-Agent badge), `:280` (bind), `:369` (pay) — or the badge keeps vouching for a deactivated partner.

3 · LEAK 3 stays separate and stays LOUD. `rateFor` must not fall back to `cfg.commission.rate` on an AGENT-programme accrual — agreed. But a null-return read as "no accrual" is a silent refusal, and this repo's own trap is that a guard choosing its own population cannot fail. With `approveAgent` setting `commissionPct` atomically and the schema defaulting it to 5.00, a missing rate on an approved agent is an INVARIANT VIOLATION: refuse the accrual AND raise an `ADMIN` audit `affiliate.rate.missing` with the agent id, so an officer sees it rather than a partner quietly earning nothing.

4 · DAL, one symmetric commit — add `active`, `approvedAt`, `commissionPct` to `StoredAffiliateAccount` (store.ts:348-355) AND fix `toStoredAffiliate` (prisma-dal.ts:382-391) plus `create`/`update` (prisma-dal.ts:1677-1700), which drop them today exactly as the memory store does; update the Affiliate row in DATA-LAYER.md:66 in the same commit. Frame it as one shared omission — describing it as a memory-backend problem sends the build at the wrong half.

5 · THE CONTROLS THAT MUST GO RED — two, driven on BOTH backends: (a) a deactivated agent's code REFUSES a bind, red harness deleting the `.active` term from the shared predicate; (b) a deactivated agent accrues ZERO on a settlement for an ALREADY-BOUND recruit — this is the one that catches the bind-only regression, and it is exactly the guard whose absence lets the old population pay quietly. Add a third asserting a reward accrued BEFORE deactivation is still present and PAID after it, so "prospective only" is enforced and not just written down.

---

### 🟠 A deactivation landing during settlement leaves one market half-paid, position by position

**Severity** high · **Kind** scenario · ⭐ **FIX DISPUTED**

SHOULD: a settlement is one event — either that agent is paid for this market or they are not. WOULD: `settleMarket` gathers `pendingReferralAccruals` under the market lock and then walks them one at a time outside it, each taking the referrer's wallet lock, each re-reading the agent's eligibility. On a large poll that loop is not instantaneous. An officer clicking Deactivate (or the agent closing their account, or a cool-off starting) mid-loop pays the positions already processed and refuses the rest of the SAME market, with no single audit row saying so — the officer sees a partial payout they cannot explain and cannot reproduce.

**Evidence** — src/lib/server/market-service.ts:3111 and :3628 (accruals collected inside the market lock), :3744-3751 (the loop runs AFTER the lock is released, serially, one `onRecruitSettlement` per position); src/lib/server/affiliate-service.ts:544 (`referrerMayEarn` re-read on every call)

**Proposed handling** — Resolve eligibility and the rate ONCE per settlement, before the loop, and pass the resolved `{programme, rateApplied, eligible}` into each `onRecruitSettlement` call rather than re-deriving it per position. Record the resolution on the settlement audit entry so a partial payout is impossible and a zero payout is explainable. Concurrency guard: deactivate an agent between two iterations of a seeded multi-position settlement and assert all-or-nothing.

**⭐ A verifier disagreed with that handling and proposed:**

Do NOT cache eligibility. Keep referrerMayEarn live per call — feature-state.ts:112 states the platform rule outright ("⛔ Never consult this to decide a refusal") and affiliate-service.ts:350-366 argues explicitly that attribution and payment must read the SAME live seam. Pre-resolving {programme, rateApplied, eligible} before the loop caches a refusal: an officer deactivating an agent for an integrity reason at 14:00:00 would still be paying them for every remaining position of a settlement whose loop began at 13:59:58 — real cash to a deactivated agent AFTER the refusal, on a Gaming Board-licensed book. That is strictly worse than a partial payout. The proposal is also under-specified: SESSION-PROMPT-AGENT-BUILD.md:86-94 makes rate and eligibility per ACCOUNT, and one accrual list spans many referrers, so "resolve once per settlement" has no correct meaning and collides with stamping rateApplied per accrual.

Take the real residue instead, as its own work item — MAKE THE REFUSAL EXPLAINABLE, DO NOT MAKE IT ATOMIC:

1. Give every silent exit in onRecruitSettlement (affiliate-service.ts:538, :544, :546, :555, :559, :572, :575) a single audited reason. One audit call at the exit point, category SYSTEM, action `affiliate.accrual_refused`, payload { reason: "no_fee" | "no_referrer" | "referrer_ineligible" | "programme_off" | "window_expired" | "cap_exhausted", referrerUserId, recruitUserId, marketId, operatorFee }. Cheap, and it makes cap-exhaustion and deactivation equally legible — the officer's "partial payout I cannot explain" disappears for ALL its causes, not just the racy one.

2. Roll the per-settlement referral outcome into the existing market.settled audit payload (market-service.ts:3700-3709): { referralAccrualsAttempted, referralPaidTzs, refusedByReason: {...} }. That is the "single audit row" the finding wants, without changing when money moves.

3. If mid-settlement deactivation is genuinely a concern for the officer's mental model, the honest fix is on the OFFICER's side, not the engine's: have deactivateAgent audit the deactivation with a timestamp and let /admin/agents show the agent's accruals bracketed by it, so a split settlement reads as "paid until 14:00:03, refused after" — which is the truth and is reproducible from the chain.

CONTROL THAT MUST GO RED (per the platform's convention): seed a market with several positions from ONE recruit whose referrer is an approved AGENT, deactivate the agent between iterations, and assert (a) the pre-deactivation positions PAID, (b) every post-deactivation position produced an `affiliate.accrual_refused` row with reason "referrer_ineligible", and (c) NO credit landed after the deactivation timestamp. Then mutate the guard by restoring a cached-eligibility snapshot and confirm (c) goes RED — that is what proves the live seam is load-bearing rather than decorative.

**⭐ A verifier disagreed with that handling and proposed:**

Two changes, neither of which touches the rate resolver or the hook's signature.

A · PRICE ELIGIBILITY ON THE EVENT, NOT ON WALL-CLOCK. The commission is already priced on the fee we actually took AT SETTLEMENT (affiliate-service.ts:516-535). Make eligibility obey the same rule: give `onRecruitSettlement` an `eventAt` (the market's `settledAt`, resolved once inside the lock and passed with the fee — a timestamp, not a decision), and judge the agent as at `eventAt`. That needs `AffiliateAgent.deactivatedAt` alongside the `active` and `approvedAt` the plan already adds, so eligibility becomes `approvedAt <= eventAt && (deactivatedAt == null || deactivatedAt > eventAt)`. The refusal stays inside the money service; the caller supplies a fact, not a verdict; and `Date.now()` at :555 becomes `eventAt` so the window boundary stops splitting a market too. This gives true all-or-nothing per settlement, and — unlike a snapshot — it also holds if the loop is retried minutes later or replayed by an officer, which a snapshot in memory cannot.

B · MAKE A ZERO PAYOUT EXPLAINABLE, WHICH IS THE FINDER'S REAL COMPLAINT. Today every refusal returns silently: :538, :542, :544, :546, :555, :559, :572, :575. Only the throw path is audited (market-service.ts:3746-3749). Add a counted summary AFTER the loop — one `affiliate.settlement_accruals` audit row per market carrying `{positions, credited, totalTzs, refused: {noReferrer, ineligible, programmeOff, windowExpired, capReached, creditFailed}}`. One row per settlement, no per-position audit spam, and it answers "why did this agent earn nothing / less than I expected on this poll" without any change to the money path. That is the officer-facing gap, and it is worth shipping on its own merits whether or not A lands.

CONTROL THAT MUST GO RED (the finder's concurrency test is the wrong shape — it asserts a race outcome, which is flaky). Instead seed a market with 3+ positions from one agent's recruits, stamp `deactivatedAt` BEFORE `settledAt`, settle, and assert ZERO rewards; then stamp it AFTER `settledAt`, settle, and assert ALL of them paid. Deterministic, and it goes red the moment eligibility drifts back to wall-clock. Add a second control for B: refuse via each distinct reason and assert the audit row's counter for that reason increments.

NOT WORTH DOING: `rateApplied` should be stamped on the reward row by `rateFor` at credit time (as SESSION-PROMPT-AGENT-BUILD.md:88-93 already specifies) — do not hoist it into `market-service.ts`.

---

### 🟠 An Owner can demote an approved agent from /admin/staff, silently and irreversibly

**Severity** high · **Kind** scenario · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: an agent's standing changes only through the compliance workstation, with the application record, the fee and the audit trail all in one place. WOULD: the plan hardens the way IN and leaves the way OUT wide open. `/admin/staff` will happily set an approved agent to PLAYER (or to SUPPORT/GROWTH) with a five-character reason: their code stops recruiting, their commission stops, and neither `AffiliateAgent.active` nor `AgentApplication.status` records it — the compliance queue still shows APPROVED. And there is no way back, because AGENT is deliberately not assignable and their APPROVED application blocks a new one under the partial unique index. A misclick permanently un-agents a fee-paying partner.

**Evidence** — src/lib/server/staff-roles.ts:10 (`ASSIGNABLE_ROLES = [...STAFF_ROLES, "PLAYER"]`), :27-42 (`validateRoleChange` checks only self-demotion and no-op); docs/SESSION-PROMPT-AGENT-BUILD.md:77 ("the only place `UserRole.AGENT` is ever assigned"); SESSION-PROMPT:62 (one active application `WHERE status <> 'REJECTED'`)

**Proposed handling** — Add a guard in `validateRoleChange`: refuse any change where `prevRole === "AGENT"` with the message that agent standing is changed on /admin/agents. Conversely, `deactivateAgent` should be the single, reversible, audited exit. Unit-test both directions in staff-role.test.mts with a control that an ordinary PLAYER→SUPPORT change still succeeds.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the refusal, but move it, complete it, and give it a way back.

1. CHOKEPOINT. Put the predicate in `src/lib/server/staff-roles.ts` as a pure exported helper (`agentStandingIsProtected(prevRole)`), so it stays unit-testable per that file's header, and call it from BOTH `validateRoleChange` (`staff-roles.ts:34`) and `addStaffByPhoneAction` (`actions.ts:99`, after the same-role check). Guarding only `validateRoleChange` misses the phone form entirely, which is the reachable path. Belt-and-braces: assert it again inside `applyRoleChange` (`actions.ts:34`), the one function both callers share. The phone-form refusal must return `fieldError("phone", ...)`, not a bare string — `actions.ts:87-90` records DG-S-05: every refusal names the control whose value has to change.

2. MESSAGE. Name the surface: "This account is an approved Agent. Agent standing is changed at /admin/agents." Per DG-S-05 the sentence alone is not enough on a three-field form.

3. THE REAL EXIT, and it must actually bite. Add `revokeAgent` to `agent-application-service.ts` (SESSION-PROMPT §2) as ONE atomic, audited transaction: `AffiliateAgent.active = false`, `AgentApplication.status = REVOKED`, `role -> PLAYER`, audit + notify. `REVOKED` is a new terminal state and it has to be added to `docs/AGENT-PROGRAMME.md` §2's table in the SAME commit — that table is the authority and today it has no state for an agent who stops being one. Making it terminal also lets `WHERE status <> 'REJECTED'` become `WHERE status NOT IN ('REJECTED','REVOKED')` (SESSION-PROMPT:62), so a revoked partner can re-apply rather than being blocked by their own dead record.

4. REINSTATE, because AGENT is deliberately unassignable elsewhere. `reinstateAgent` on the same workstation: `active = true`, status back to `APPROVED`, `role -> AGENT`, audited. Without it the "reversible" claim is false — nothing else in the system can hand the role back.

5. FIX THE SEAM WHILE YOU ARE IN IT — otherwise revocation half-works. `inviteStateFor(role)` (`feature-state.ts:95-99`) cannot see `AffiliateAgent.active`, so a deactivated-but-not-demoted agent keeps earning. Either `revokeAgent` always moves the role (making role the single test, as `feature-state.ts:92-93` claims), or `referrerMayEarn` (`affiliate-service.ts:367-369`) gains the `active` check the comment at `:275-277` promises. Pick ONE — that comment's own warning is "it must not grow a SECOND definition of 'may refer' somewhere else." I would take the first: `revokeAgent` moves the role, `active` stays a display/ledger fact, and role remains the one seam every surface reads.

6. CONTROLS THAT MUST GO RED, in `scripts/staff-role.test.mts` — and note the existing `:26` assertion ("ASSIGNABLE excludes AGENT") is about newRole and gives false comfort here:
   - AGENT -> PLAYER via `validateRoleChange` refuses;
   - AGENT -> SUPPORT via the addStaffByPhone predicate refuses (the path the finding missed);
   - control that must pass: PLAYER -> SUPPORT and SUPPORT -> PLAYER still succeed, so the guard cannot pass by refusing everything;
   - a `revokeAgent` -> `reinstateAgent` round trip restores role AND `active` AND status;
   - after `revokeAgent`, `referrerMayEarn` returns false and `bindRecruit` returns `referrer_not_eligible` — drive it, do not assert on the flag, since the flag is exactly what is currently unwired.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the refusal, move it to the funnel, and give it a floor. Four parts, one commit.

1. Guard `applyRoleChange`, not `validateRoleChange`. `applyRoleChange` (src/app/admin/staff/actions.ts:28) is the single funnel both entry points share, and it already holds `prevRole` at :34. Refuse there, before `db.user.update` at :36: if `prevRole === "AGENT"`, return "Agent standing is changed at /admin/agents, not here." That closes `addStaffByPhoneAction` too. Keep `validateRoleChange` pure — its header (staff-roles.ts:2-5) says it exists to be unit-testable with no DB, and a live-standing check cannot live there. Add the same refusal to `validateRoleChange` as well if you want it locked by the pure test, but the action-level one is the one that must exist.

2. Make `deactivateAgent` do the WHOLE job, so the block has a floor. In `agent-application-service.ts`, atomically: `AffiliateAgent.active = false`, `deactivatedAt` + officer + reason, `role → PLAYER`, audit. Then an ex-agent IS an ordinary PLAYER and freely assignable from /admin/staff like anyone else — the refusal in (1) never traps a compromised or departed partner, and the two records can no longer disagree, because one action writes both. Add the mirror `reactivateAgent` (role → AGENT, active = true, audited) so the exit is reversible, as the finder asks.

3. Restate the non-negotiable in the same commit or you have just broken it. AGENT-PROGRAMME.md:217 and SESSION-PROMPT:77 say approval is the ONLY place `UserRole.AGENT` is assigned; `reactivateAgent` is a second one. The honest wording is "`agent-application-service.ts` is the only module that assigns `UserRole.AGENT`, and it does so in exactly two audited places: approval and reactivation." Leave the old sentence and a future single-assignment-site guard is either red or, worse, someone builds reactivation elsewhere to satisfy it.

4. Widen the eligibility predicate in the SAME commit — this is what makes deactivation bite. `referrerMayEarn` (affiliate-service.ts:367-369) and the bind gate (:280) must both become role AGENT AND `AffiliateAgent.active` AND `approvedAt` set, resolved in ONE helper as :275-277 instructs. Without it, part 2 is cosmetic and part 1 is a lockout.

Controls, each of which must go RED when its line is deleted:
  · Delete the `applyRoleChange` refusal → an integration test that drives `addStaffByPhoneAction` with an approved agent's phone must fail. Do the same via `setStaffRoleAction`. Two entry points, two red proofs — the whole point of finding defect 1.
  · Delete `role → PLAYER` from `deactivateAgent` → a test asserting a deactivated agent's role must fail.
  · Delete `active` from the widened predicate → a test that a deactivated agent accrues ZERO on a settled recruit position must fail. Assert zero rewards for that agent, never a sum over the table: a SUM assertion is how the bonus-withdrawal guard reported 43/0 while paying.
  · Keep the PLAYER→SUPPORT pass as a smoke check, but do not count it as the control — it survives every deletion above.

Finally, fix the notification while you are in the file: actions.ts:50-56 branches on `newRole !== "PLAYER"` to choose "staff access removed" wording. An agent leaving the programme must not receive a staff email; route that message from the agent service.

---

### 🟠 Approving a staff member's agent application strips their admin access — the plan has no refusal

**Severity** high · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: staff may not be agents — a compliance officer earning commission on players they can also approve, freeze and pay out is a self-dealing conflict a regulator will name. WOULD: `approveAgent` writes `role = AGENT` over whatever was there. Approve a SUPPORT or GROWTH colleague's application and they lose the admin console at their next request, with the only record being the role-change side effect of an agent approval. `reviewApplication` blocks self-review, which covers the officer reviewing their OWN application but not a second officer reviewing the first officer's. Restoring their staff role then destroys their agent status (previous finding).

**Evidence** — src/lib/server/roles.ts:22-31 (`Role` is a single-valued union; AGENT is one of its members); src/lib/server/roles.ts:87-89 (`isStaffRole` excludes AGENT); docs/AGENT-PROGRAMME.md:23; docs/SESSION-PROMPT-AGENT-BUILD.md:72-77 (preconditions are KYC, fee, not-self — nothing about the applicant being staff)

**Proposed handling** — Hard precondition in `reviewApplication`/`approveAgent`, next to the KYC and fee checks: refuse when `isStaffRole(applicant.role)`, with a SECURITY audit row — same shape as the self-review block in `reviewKyc`. Refuse at `startApplication` too, so a staff member never reaches the fee. State the conflict rule in AGENT-PROGRAMME.md §1. Red harness: neutralise the check and assert a COMPLIANCE user can be turned into an AGENT.

**⭐ A verifier disagreed with that handling and proposed:**

Make `staff-roles.ts` the ONE authority for every write to `User.role`, and have the agent service ask it — do not add a second rule inside `agent-application-service.ts`.

1. **Extend `src/lib/server/staff-roles.ts` with a role-TRANSITION validator** (pure, beside `validateRoleChange`), covering all four AGENT edges the column now has:
   - `PLAYER → AGENT` — legal, and ONLY via agent approval.
   - `<any staff role> → AGENT` — REFUSED. This is the finding's case.
   - `AGENT → PLAYER` — legal, but only with the `AffiliateAgent` row deactivated in the same transaction (closes the reverse edge in the same pass).
   - `AGENT → <any staff role>` — REFUSED unless already deactivated.
   `ASSIGNABLE_ROLES` stays exactly as it is; this sits beside it. Lock it in the EXISTING `scripts/staff-role.test.mts`, which already asserts `ASSIGNABLE excludes AGENT` (:26,28) and already has a red harness — no new suite, and the two halves of the same rule end up in one file a reader can hold.

2. **Both writers consult it.** `approveAgent` calls it before the role write; `setStaffRoleAction` calls it too (it currently only runs `validateRoleChange`). One validator, two callers — the `ratesFor(market)` discipline the prompt already asks for on rates, applied to the role column.

3. **Refuse at THREE points, not two.** `startApplication` (so a staff member never pays the TZS 100,000 and never triggers the refund path of decision 7), `submitForReview`, and `approveAgent`. The third is not redundant: a PLAYER can pay and submit and *then* be promoted by the Owner before the officer decides — a check only at intake misses it. Each refusal writes a `SECURITY` audit row in the `kyc.review.self_blocked` shape (`kyc-service.ts:720-722`), e.g. `agent.apply.staff_blocked` / `agent.approve.staff_blocked`.

4. **`approveAgent` must call `revokeUserSessions(userId)`** after the role write, exactly as `applyRoleChange` does (`staff/actions.ts:44`) and for the same stated reason — the role rides in the signed session cookie. Without it the new agent's `/profile/invite` and the badge behave off a stale PLAYER role until they next log in. This is needed whether or not the staff refusal lands.

5. **Ask Ali, don't legislate.** Put the eligibility question to him as a one-liner — "may a member of staff hold an agent account?" — and until he rules, ship the refusal as the reversible default with the officer-facing message naming the next step: *"This account holds a staff role. The Owner must set it to Player at /admin/staff before an agent application can be approved."* Record it in `AGENT-PROGRAMME.md` §1 in the `Decided / Enforced in / Guarded by` form once he answers; if he rules the other way, the transition validator is the one line that changes.

6. **Controls that must go red.** Two harnesses, both mutating a locked COPY via `KP_SRC` (never the working tree): (a) neutralise the transition check and assert a `COMPLIANCE` user CAN be turned into an AGENT; (b) the control the repo's own trap-list demands — assert that with the check in place a `PLAYER` applicant is still approved, so the guard cannot pass by refusing everyone. Add a third asserting `AGENT → COMPLIANCE` with an active `AffiliateAgent` row is refused, since that edge is where the silent earning-stop lives (`affiliate-service.ts:367-370`).

7. **Do not implement any part of this by hiding the Apply button.** `/agent` is public and session-less (`SESSION-PROMPT:98`), so there is no role at the door; and the repo's law in `feature-state.ts` is gate the offer, never the refusal. The control is server-side in the service; the UI may only echo it.

**⭐ A verifier disagreed with that handling and proposed:**

Make it ONE rule, in the PURE module, enforced by BOTH writers of `User.role`, with an exit for the paid applicant.

1. In `src/lib/server/staff-roles.ts`, beside `validateRoleChange` and `isStaffAssignable`, add one exported predicate — the single definition of role mutual exclusion, e.g. `roleConflict(prevRole, newRole): { blocked: true; reason } | { blocked: false }`: staff -> AGENT is blocked, AGENT -> staff is blocked while an `AffiliateAgent` row is `active`. Pure, sync, unit-testable, no DB. It is the `ratesFor`/`canRead` shape this repo already uses for "one source of truth for a rule two surfaces ask".

2. Both writers consult it:
   - `approveAgent` / `reviewApplication` — evaluate INSIDE `withLock`, against the applicant row re-read there, never a value captured at page render (a role can change between queue render and click). Refuse with a SECURITY audit, same shape as `kyc.review.self_blocked` (src/lib/server/kyc-service.ts:721).
   - `validateRoleChange` (staff-roles.ts:36-40) gains the AGENT clause, so /admin/staff refuses to promote an active agent and tells the Owner to run `deactivateAgent` first. This is the half the finding misses, and without it the commission just stops (affiliate-service.ts:367-370) with no record naming the programme.

3. Give the stuck application an exit: add `STAFF_CONFLICT` to `AgentRejectReason` (it is a new enum in this migration — SESSION-PROMPT:51) so the officer REJECTS with a category, which runs the §4 refund path and returns the TZS 100,000. Do NOT leave the only outcome a hard INVALID on approve.

4. Refuse at `startApplication` too — before any money leaves — but as a plain refusal on /agent/apply, not a hidden page. /agent is the public discovery door and must stay reachable by a staffer reading it; the refusal belongs at the point of application, and the reason must be legible ("staff accounts cannot hold agent status") rather than a 404.

5. `approveAgent` must call `revokeUserSessions(userId)` in the same transaction-adjacent step `applyRoleChange` does (src/app/admin/staff/actions.ts:37-39) — the role is cached in the signed session cookie, and the shell computes `inviteIsLiveFor(viewerRole)` (src/components/layout/app-shell.tsx:183). Without it the freshly-approved agent sees nothing on /profile/invite until they happen to re-login, and a stale staff cookie is the exact residue this control is meant to prevent.

6. State it as a rule, not a note: AGENT-PROGRAMME.md §1's "is not a staff account" row (line 23) becomes a stated refusal, and §10 (line 217) gains "`UserRole.AGENT` is assigned in one place AND is mutually exclusive with every staff role, enforced in both writers."

7. Red harness must be SYMMETRIC — the finding's control (neutralise the check, assert a COMPLIANCE user becomes AGENT) covers only one writer. Add the mirror: neutralise the clause and assert /admin/staff can promote an ACTIVE agent to SUPPORT, and that `referrerMayEarn` then returns false for a referrer with live bound recruits. Mutate a copy via KP_SRC on a locked harness.

---

### 🟠 KYC re-verification or post-approval rejection does not touch agent standing — a sanctioned or duplicate identity keeps recruiting and keeps being paid

**Severity** high · **Kind** scenario · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: the identity precondition for being an agent is continuous, not a one-time gate — an agent we can no longer identify is an agent we cannot pay under AML rules. WOULD: the plan checks APPROVED KYC once, at approval. Afterwards an officer can force re-verification (a sanctions hit, a fraud alert) or reject outright, and nothing revisits `role = AGENT`: the code keeps binding new players who see 'Verified 50pick Agent', commission keeps accruing, and withdrawals stay open because the withdrawal gate asks whether the account was EVER approved. A DUPLICATE_IDENTITY rejection — the case where we have decided this is a second account for one human — leaves an approved, paid, publicly badged agent live.

**Evidence** — src/lib/server/kyc-service.ts:652-677 (`forceReverifyKyc` sets APPROVED → ADDITIONAL_INFO_REQUIRED and does nothing else); kyc-service.ts:701+ (`reviewKyc` REJECT is reachable for a previously approved user, with codes DUPLICATE_IDENTITY / SANCTIONED / UNDERAGE); src/lib/server/kyc-gate.ts:22-29 (WITHDRAW asks `approvedAt != null` — EVER approved); docs/SESSION-PROMPT-AGENT-BUILD.md:72-75 (approved KYC is a precondition at APPROVAL time only)

**Proposed handling** — Bind the two lifecycles: `forceReverifyKyc` and a REJECT on a previously-approved user must call `deactivateAgent` (suspend, reversible on re-approval) and audit it, and the agent seam must require current KYC APPROVED for BINDING new recruits even if it does not for paying already-earned commission. State the asymmetry explicitly in AGENT-PROGRAMME.md the way kyc-gate.ts:22-29 states the deposit/withdraw one. Drive it: approve an agent, force re-verify, assert the code refuses to bind and the badge disappears while any HELD/earned money remains withdrawable.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; invert the direction. Nothing in `kyc-service.ts` should know that agents exist — the agent seam should ASK, at the decision, exactly as `assertKycForMoney` re-reads the row.

1. ONE predicate module, read-through, in `affiliate-service.ts` — and split it along the asymmetry kyc-gate.ts already owns, with the same header discipline:
   · `agentMayRecruit(userId)` — `inviteIsLiveFor(role)` AND `AffiliateAgent.active` AND `approvedAt != null` AND **current** `KycSubmission.status === "APPROVED"` (re-read, never cached, refuse on read failure — kyc-gate.ts:109-116's rule). NEW exposure, so it asks current standing.
   · `agentMayBePaid(userId)` — `inviteIsLiveFor(role)` AND `active` AND `approvedAt != null`, and deliberately NOT current KYC status. Money already earned under an identity we accepted.
   Wire `agentMayRecruit` into BOTH affiliate-service.ts:280 (`bindRecruit`) and :165 (`resolveReferralPreview`) — one call fixes the bind and the badge together, because the ribbon already reads the same predicate by design. Wire `agentMayBePaid` into `referrerMayEarn` (:367). Delete `referrerMayEarn`'s role-only body rather than leaving it as a shim — feature-state.ts's own header records that deleting `invite-feature.ts` instead of shimming it is what forced all six call sites to surface.

2. HOLD new accrual, do not refuse it. When `agentMayBePaid` passes but current KYC is not `APPROVED`, record the reward with `status: "HELD"` instead of `PAID` — the primitive already exists and is already used for exactly this shape (affiliate-service.ts:385, 393-404, and the `credited ? "PAID" : "HELD"` fallbacks at :448 and :584). The ledger row is written, `programme`/`rateApplied`/`sourceRef` are stamped, clawback maths stays whole, and no wallet is credited under an identity we cannot stand behind. Release on re-approval by extending the existing one-way cascade at kyc-service.ts:779 — `releaseKycHeldGrants(userId)` is already the "the money that was waiting for this" hook, already awaited, already non-fatal, already audited on failure. That is the only line `kyc-service.ts` needs, and it is a release, not a revocation, so it cannot undo an officer's decision.

3. Leave `deactivateAgent` meaning exactly one thing: the officer's commercial decision. Never call it from a KYC path. If the officer wants the agent gone as well as re-verified, they click it — a separate, audited act with its own reason string.

4. Make the officer see what they are touching. `/admin/players/[id]` renders the force-reverify control with no idea the subject is an AGENT with live recruits. Add an inline warning on that control and on the KYC decision rail when `role === "AGENT"`: "This player is an approved Agent (N bound recruits). Re-verifying suspends new recruiting and holds new commission; earned money stays withdrawable." Same for the REJECT rail. That is the surface that stops a routine identity action becoming an unnoticed commercial one.

5. Docs, same commits. Add a §2b "Standing is continuous" to AGENT-PROGRAMME.md, written the way kyc-gate.ts:20-34 writes its asymmetry — the two questions, why they differ, and the explicit statement that recruiting asks CURRENT KYC while earned money asks EVER-approved. Add the agent row to the kyc-gate.ts header too, since that file is where the next reader looks for the identity asymmetry. RULES.md §2.10 gets the standing rule alongside the fee and the commission ceiling.

6. Red harness, per §10's "a guard that has never failed is a hypothesis": approve an agent → bind a recruit (passes) → `forceReverifyKyc` → assert bind now returns `referrer_not_eligible`, `resolveReferralPreview` returns null, a settlement records `HELD` not `PAID`, and a withdrawal of previously-PAID commission still succeeds → re-approve → assert bind resumes and the HELD row releases. The mutation that must go red: delete the KYC read from `agentMayRecruit` and the suite must fail — not the doc comment, the behaviour. Add the same drive for a `DUPLICATE_IDENTITY` REJECT from `ADDITIONAL_INFO_REQUIRED`, which is the two-click path that produced this finding.

**⭐ A verifier disagreed with that handling and proposed:**

ONE PREDICATE, LIVE-READ, NO WRITE-BACK. Do not touch `kyc-service.ts` at all.

1. Extend the single seam, not the KYC service. Give `affiliate-service.ts` one async `agentMayRefer(referrerUserId)` that replaces the bare `inviteIsLiveFor(referrer.role)` at all three sites — `resolveReferralPreview:186`, `bindRecruit:279`, `referrerMayEarn:368`. For `role === "AGENT"` it additionally requires, read live at call time: `AffiliateAgent.active === true` AND `user.status === "ACTIVE"` AND `(await db.kyc.findByUserId(id))?.status === "APPROVED"`. Non-agents keep exactly today's answer. This is the promise at `affiliate-service.ts:275` cashed in the one place it said it must live. It is self-healing: re-approval sets KYC APPROVED and standing returns with no second write path, which is the "reversible" property the proposal tried to hand-build. And the badge disappears for free — a `deactivateAgent`-plus-bind-check fix would leave `resolveReferralPreview` still advertising "Verified 50pick Agent".

2. Keep `AffiliateAgent.active` as the officer's own lever only. Never written by the KYC service, so the two reasons for standing loss stay separable and a re-approval cannot lift a fraud suspension.

3. Split the THREE questions — the finding conflates two of them, and only three is coherent:
   · BADGE + BIND → current standing. New exposure, refuse. (The bind refusal already audits `affiliate.bind.refused_withdrawn`; add the reason to the payload.)
   · NEW ACCRUAL on existing recruits → also current standing, because accrual creates NEW money for a referrer whose identity we can no longer stand behind. But do NOT return silently as `referrerMayEarn` does today: record the reward `status: "HELD"` with the reason, reusing the existing held-queue pattern (`recordReward` already writes HELD when a credit cannot land). An agent under re-verification who is then re-approved is contractually owed commission on fees collected while their file was open; a silent `return` cancels the contract retroactively and leaves no trace that it did.
   · ALREADY-EARNED, ALREADY-PAID commission → `approvedAt`, unchanged. Do not touch `kyc-gate.ts:22-29`.

4. Answer the SANCTIONED/DUPLICATE_IDENTITY money question where this platform already answers it. Identity status is not a money-out control here — the three controls are freeze the wallet, pause payouts, the AML ≥1M hold (`kyc-service.ts` forceReverify header). So: `/admin/agents/[id]`'s deactivate action must prompt the officer to freeze the wallet when the reason is sanctions/duplicate, and `AGENT-PROGRAMME.md` must say that freezing — not the identity gate — is what stops a deactivated agent's balance leaving.

5. Fix the authority first, since the build has nothing to implement without it. `AGENT-PROGRAMME.md` §2 needs a `SUSPENDED` state and a termination arm on the lifecycle line, plus a short §-of-its-own stating the three-way asymmetry in the same voice `kyc-gate.ts:22-29` states the deposit/withdraw one, and naming the causes that suspend standing (KYC not currently APPROVED · account not ACTIVE · officer deactivation). §10 gains: "Agent standing is CONTINUOUS and derived at read time — it is never stored as a flag the KYC path writes."

6. The control that must go red (this one is prone to the "guard chooses its own population" trap the prompt names — a fixture whose role is not AGENT refuses either way and the guard passes with the clause deleted). Fixture: role=AGENT, `active=true`, status=ACTIVE, KYC APPROVED → bind SUCCEEDS and the badge renders. Then force-reverify only → assert bind refuses, `resolveReferralPreview` returns null, a settlement records HELD not PAID, and `assertKycForMoney(WITHDRAW)` still returns eligible. Mutation: delete the KYC clause from `agentMayRefer` (via `KP_SRC` on a locked copy) and the suite must go red on all four assertions, including the withdraw one staying green.

---

### 🟠 An abandoned DRAFT permanently blocks re-application, is invisible to officers, and leaves uploaded documents with no owner and no expiry

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: an applicant who uploads two documents and gives up can start again, and their part-uploaded scans do not sit in R2 for ever. WOULD: the partial unique index excludes only REJECTED, so a DRAFT — or a PAYMENT_PENDING, or an ADDITIONAL_INFO_REQUIRED — is a permanent block. No state expires, no job sweeps, and the officer queue does not show DRAFTs, so nobody can even see it to clear it. The applicant's only route is support, which has no tool. Meanwhile the documents are real PII in the KYC bucket with no retention period in DATA-RETENTION.md, which is the file the Gaming Board reads.

**Evidence** — docs/SESSION-PROMPT-AGENT-BUILD.md:61-62 ("one active application per user `WHERE status <> 'REJECTED'`"); SESSION-PROMPT:108-109 (the officer queue is the pending/UNDER_REVIEW list); docs/AGENT-PROGRAMME.md:41-49 (no expiry state); grep of docs/DATA-RETENTION.md returns no mention of agent, affiliate or referral

**Proposed handling** — Add an `EXPIRED`/`WITHDRAWN` terminal state and put it in the index predicate alongside REJECTED, with an applicant-facing 'Start over' action that transitions the old row and deletes its documents through `deleteKycDocument`. Set an abandonment period (e.g. DRAFT untouched for 30 days) and a retention period for application documents, and write both into DATA-RETENTION.md in the same commit — with the third-party referee IDs called out separately (next finding).

**⭐ A verifier disagreed with that handling and proposed:**

Drop the new terminal state, the sweeper and the queue change. Do three things instead.

1 · Close the (non-)block by construction, not by a new enum. Write `startApplication` as a literal mirror of `startKyc` (`kyc-service.ts:97-135`): an existing row in `DRAFT` / `PAYMENT_PENDING` / `ADDITIONAL_INFO_REQUIRED` is RESUMED and its id returned; `UNDER_REVIEW` and `APPROVED` refuse with a real message; `REJECTED` is not found by the partial index, so a fresh row is created. No `EXPIRED`, no `WITHDRAWN`, no predicate change — every status added to `WHERE status <> 'REJECTED'` is one more way for a user to hold two live applications, and `prisma/schema.prisma:425-443` is explicit that these predicates are the control and must not drift. GUARD that must go red: delete the resume branch and prove the second `startApplication` blows up on the unique index.

2 · ⛔ Do NOT add a 30-day abandonment sweeper. `DATA-RETENTION.md:24` states that identity documents are "Never deleted by any automated path", and the fee receipt plus the Serikali ya Mtaa letter are CDD evidence on a 7-year clock the moment they are uploaded. An automated job that destroys compliance documents 30 days after an applicant paused is a new destructive control in the exact file the Gaming Board reads — a worse problem than the one it solves. If Ali wants an applicant-facing escape hatch, make it an explicit applicant action ("discard and start over") that clears the DOCUMENT SLOTS on the existing row through `deleteKycDocument`, keeps the row and audits it — no new state, no automation, no ambiguity about who chose.

3 · The real fix — put agent documents inside the regimes that already exist, in the same commit as the schema:
· `erasure.ts`: extend the TIER ② block (`:274-303`) to walk `AgentApplicationDocument` and the fee receipt under the SAME `documentsReleased` gate, with the same "the row only goes if the bytes went" rule, the same `survivors` retry shape and the same `documentObjectsFailed` counter. Same bucket, same clock, one routine.
· `DATA-RETENTION.md` §1: add a row — Agent application documents + fee receipt | 7 years | account closure | POCA Cap 423 §16, FATF R.11 | never deleted by any automated path, erasure destroys images after the hold | `AgentApplication`, `AgentApplicationDocument`, R2 `50pick-kyc`. And a SEPARATE row for the referee national IDs, because those data subjects never met us: PDPA 2022 basis, and `/agent/apply` must carry an attestation that the applicant obtained each referee's consent, recorded on the row and shown to the officer on the attestation rail.
· Both DAL backends (`prisma-dal.ts` ~:815 and `store.ts` ~:727 already carry the paired KycDocument delete note — the new table needs the same pair), plus the entity map in `DATA-LAYER.md`.
· Extend `scripts/erasure.test.mts` with a CONTROL: a CLOSED account holding an agent application with documents, run past the hold, assert zero surviving storage keys — then delete the new enumeration and prove it goes RED. Without that mutation the check proves nothing.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the diagnosis (documents with no retention row and no erasure reach); throw the mechanism away.

1. RE-APPLICATION — no new state, no index change. Make `startApplication` resume, verbatim in the shape of `startKyc` (src/lib/server/kyc-service.ts:97-101): an existing row in any non-REJECTED, non-APPROVED state returns that row's id, and `attachDocument` REPLACES the slot rather than appending. Write that resume behaviour into SESSION-PROMPT §2 explicitly so it is not left to inference. Then close the one state that IS stuck: decide whether `deactivateAgent` re-opens re-application, and if it does, express it in the predicate as `status <> 'REJECTED' AND NOT (status = 'APPROVED' AND agent.active = false)` — the real hole, rather than an EXPIRED state invented to paper over a block that resume already removes.

2. RETENTION — add a row to docs/DATA-RETENTION.md §1 in the SAME commit as the migration, on the same terms as line 24 rather than a new policy: `AgentApplication` / `AgentApplicationDocument` / R2 `50pick-kyc` — 7 years from account closure, POCA Cap 423 §16, HELD not swept, "never deleted by any automated path". The fee attestation (`feeReference`, `feeReconciledAt`, `feeRefundedAt`) is a business/AML record and must outlive the application regardless. No sweeper job, no timer.

3. ERASURE — extend `anonymizeClosedAccount` to NAME the two new tables: bucket ① pseudonymise applicant-identifying free text (officer notes, reject notes) immediately; bucket ② hold the objects `KYC_DOCUMENT_HOLD_YEARS` from closure and then destroy them through `deleteKycDocument` using the existing discipline at erasure.ts:272-296 — the row goes only if the bytes went, `documentObjectsFailed` counted, survivors kept for retry. Extend `test:erasure` and add a `red:erasure` case that removes the agent-document destruction and MUST go red; per the platform's own law, a control with no control that fails is a hypothesis. Add docs/DATA-RETENTION.md and `erasure.ts` to SESSION-PROMPT §7's list, which today omits both.

4. THE REFEREES — the genuinely new exposure, and it needs its own paragraph, not a footnote: two third parties' national IDs held for a partner-vetting decision they are not party to. State the lawful basis and the period on `/agent/apply` in en/sw/zh, require the applicant to attest the referees consented, and record it in the corrected framework document §9 that goes to the Board — the framework's own "AWS S3 / AES-256" line is already being corrected there, and this belongs beside it.

5. ABANDONMENT, if wanted at all — an OFFICER ceremony on `/admin/agents/[id]` ("close abandoned application", categorised, audited, `withLock`, no document destruction), the same shape as every other destructive act here (docs/DATA-RETENTION.md §7's chain purge). Never a timer, never the applicant's button.

---

### 🟠 Referee national IDs are third-party PII with no retention rule, no erasure path and no way to service a DSAR from the referee

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: every category of personal data we store has a stated purpose, a retention period on /admin/retention, and a route to erasure. WOULD: the two referee ID scans belong to people who are not users, have no account, never accepted our terms, and cannot invoke erasure through any surface we have. `anonymizeClosedAccount` refuses anything that is not a CLOSED user and cannot reach an `AgentApplicationDocument` at all, so those images survive the applicant's own erasure indefinitely — including for applicants we REJECTED, where we never even had a relationship. Under PDPA 2022 that is a harder problem than the applicant's own data, and the plan does not mention it.

**Evidence** — docs/AGENT-PROGRAMME.md:61-69 (items 5 and 7 are the REFEREES' national identification documents); docs/DATA-RETENTION.md contains no occurrence of 'agent', 'affiliate' or 'referral'; src/lib/server/erasure.ts:70-90 and :364-390 (erasure names KycSubmission slots, extra requests, comments, notifications, OTPs, push, watchlist — nothing about applications or the affiliate ledger)

**Proposed handling** — Before the build: decide and record (a) the lawful basis and retention period for referee documents — likely much shorter than the 7-year CDD hold, because a referee is not a customer; (b) a REJECTED application's documents are deleted at rejection, once the refund is recorded; (c) `anonymizeClosedAccount` gains an agent-application step, under the same 7-year tier logic as KYC documents where the applicant was approved. Publish all three in DATA-RETENTION.md and on /admin/retention, and have test:erasure drive the agent path with a control that must go red.

**⭐ A verifier disagreed with that handling and proposed:**

Settle it BEFORE §1's "one migration" — a retention clock added afterwards is a migration over live third-party PII.

1 · MINIMISE INSTEAD OF RETAINING (the referee scans). The framework requires the IDs be *attached to the application*; it does not require us to keep them after the decision they exist to inform. Make the officer's verification the durable record and the scan disposable: add `refereeIdVerifiedAt` / `refereeIdVerifiedById` to `AgentApplication` as attested facts, exactly the shape the plan already gives the fee (`feeReconciledAt` / `feeReconciledById`, SESSION-PROMPT-AGENT-BUILD.md:52). The two referee ID objects are destroyed at the application's **terminal decision** — APPROVE and REJECT alike — after one short, stated appeal hold.

2 · ITS OWN CLOCK, MEASURED FROM THE DECISION. Never from `User.closedAt`. Add `AGENT_REFEREE_DOC_HOLD_DAYS` and `AGENT_APPLICATION_DOC_HOLD_YEARS` beside `KYC_DOCUMENT_HOLD_YEARS` (erasure.ts:83), each with the same "lowering this is a compliance decision with an owner's name on it" note, and drive them from `retention.purge.daily` — which is what makes it a ✅ Code row in §1 rather than a 📋 Policy one. A rejected applicant who never returns must still have their file destroyed on schedule with nobody doing anything.

3 · KEEP THE ROW-ONLY-GOES-IF-THE-BYTES-WENT DISCIPLINE. Reuse erasure.ts:272-288 verbatim in shape: `deleteKycDocument` returns `false` rather than throwing, a failed object KEEPS its row for a later retry, and `documentObjectsFailed > 0` is the signal a re-run is owed. The alternative produces exactly what storage.ts was written to prevent — "the record says erased, the data is not."

4 · SEPARATE THE APPLICANT'S OWN AGENT DOCUMENTS FROM CDD. CV, request letter and Serikali ya Mtaa letter are business-relationship records, not customer due diligence — POCA/FATF R.11 does not reach them, so they must not silently inherit the KYC row's 7-years-from-closure. Give them their own DATA-RETENTION §1 row measured from the end of the agency. And because the plan stores all of it in bucket `50pick-kyc`, amend that bucket's existing row's "Where" column in the same commit, or it becomes a false statement to the Board.

5 · BASIS AND NOTICE AT COLLECTION, not just retention. On `/agent/apply`, an attestation the applicant must make — the referee consented and was shown the referee notice — recorded on the application and audited. Add a referee-facing line to `/legal/privacy` §2 (page.tsx:38-46) and §6, naming the DPO address §1 already publishes as the route for a person with no account, in en/sw/zh (`test:i18n`). ⛔ Do NOT store the referee's name to make them findable — that adds PII to solve a lookup; the referee knows which applicant named them, and that is the search key.

6 · THE GUARD, WHERE IT ACTUALLY BITES. Extend the §8 sweep's hand-enumerated `buckets` map (scripts/erasure.test.mts:520-533) with the application and its documents, and add a REFEREE identifier to `NEEDLES` (:505-512) — that sweep is the only thing in the suite that asks "does anything still hold this", and it is blind to any table its author did not list. Mirror the existing control pattern at 8.0c (plant the needle, prove the predicate finds it) and add the doc-parity assertion in the style of §10.1/10.2 (:587-596): read DATA-RETENTION.md and assert the new rows exist and the constants match the published numbers. One `red:erasure` defect per new destruction path.

7 · THE PUBLISHED SURFACE, SAME COMMIT. `SCHEDULE` at src/app/admin/retention/page.tsx:35 needs the new rows *with the `swahili` field*, and src/app/admin/retention/loading.tsx:19 hard-codes "Ten rows, because SCHEDULE has ten entries" — leaving it stale is the skeleton-describes-the-old-page trap the build prompt itself calls out.

**⭐ A verifier disagreed with that handling and proposed:**

Keep part (a) — a distinct schedule row is required and must be written before the build. Replace (b) and (c), and add the collection-side control the proposal omits.

1. ONE NEW ROW IN docs/DATA-RETENTION.md §1, in the file's existing column form, and nowhere else:
   `Agent-applicant supporting documents (incl. third-party referee IDs) | 12 months | Final decision (approval or rejection) | PDPA 2022 §15 — minimisation; NOT a CDD record, not POCA Cap 423 §16 | ✅ Code — retention.purge.daily | AgentApplicationDocument, R2 50pick-kyc`
   The period is Ali's to set, but it must be SHORT and it must be measured from the DECISION, not from account closure — a referee has no account, so account closure is not a clock that exists for them. Mirror the constant as `AGENT_DOCUMENT_HOLD_MONTHS` in retention.ts and assert it against the published row exactly as erasure.test.mts §10.2 asserts KYC_DOCUMENT_HOLD_YEARS.

2. ENFORCE IT IN THE CHORE THAT ALREADY RUNS, NOT ON AN EVENT. Extend `retention.purge.daily` (src/lib/server/retention.ts) to destroy AgentApplicationDocument objects and rows whose application reached APPROVED or REJECTED more than the period ago, via the existing deleteKycDocument seam (already imported by erasure.ts). This is the platform's only wired time-based enforcement and it covers the approved-and-never-closed case, which is the majority. Same treatment as the AIPoll payload prune: destroy the DOCUMENTS, keep the APPLICATION row — the decision record (status, reject reason, officer, feeReference, feeRefundedAt) is what an audit or a re-application needs, and it carries no third-party PII once the scans are gone. This also preserves the re-application signal that (b) would have destroyed, because feeReference and the decision history survive.

3. ADD THE ERASURE STEP, BUT AS A SECOND ROUTE, NOT THE ONLY ONE. anonymizeClosedAccount gains an agent-application step under the SAME two-tier logic it already uses: applicant free-text and any applicant PII pseudonymised immediately, documents destroyed on the agent period (not the 7-year KYC tier — these are not CDD records; putting them on KYC_DOCUMENT_HOLD_YEARS would hold a non-customer's ID for seven years on a statute that does not cover them, which is worse than today). Wire `AgentApplication` and `AgentApplicationDocument` into the erasure.test.mts §8 sweep buckets — its own comment at :531 says excluding a store silently is how the sweep comes to pass over an unread one — and prove the new needle (a referee ID number) can go red before the fix.

4. MAKE THE REFEREE FINDABLE AND ACCOUNTED FOR — the part the proposal misses. On AgentApplication, capture `refereeOneName` / `refereeTwoName` (and a contact) alongside the two ID slots, and require an explicit applicant attestation at the fee/submit step that each referee consented to their identification being submitted to 50pick and was shown the privacy notice. This is the lawful basis (the applicant is the accountable party, since we have no relationship with the referee), it gives DSAR intake something to match a walk-in referee against, and it gives the officer workstation the pairing it needs to judge the letters anyway. Refuse submission without it, and put a control on the refusal that must go red — a submit with the attestation stripped must fail.

5. SAY IT WHERE IT IS PUBLISHED. The new row must reach /admin/retention (src/app/admin/retention/page.tsx) and the privacy notice, marked Code not Policy — and only once (2) actually runs, or we repeat F-01 in a new table.

6. Both DAL backends plus the DATA-LAYER.md entity map for the delete path, per AGENT-PROGRAMME §10 — a purge that exists only in Prisma is a purge the memory backend proves nothing about.

Ordering note: (1) and (4) are DECISIONS and belong in AGENT-PROGRAMME.md before a line is written; (2), (3), (5), (6) are build items and belong in SESSION-PROMPT-AGENT-BUILD.md §1/§2/§7 with DATA-RETENTION.md added to the §7 docs list.

---

### 🟠 Re-application after rejection has no refund precondition, no cool-down and no terminal reject reasons

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: a rejected applicant may re-apply only once we have actually returned their first TZS 100,000, and some rejections are final. WOULD: the index lets a REJECTED applicant open a new application the same minute, before the refund is paid, with a new fee. Nothing checks `feeRefundedAt`. We can therefore hold two of one person's fees at once, and an aggressive applicant can cycle indefinitely — each cycle costing an officer review and a bank round-trip. And the reject-reason enum will contain reasons that must be terminal (a sanctions or integrity refusal) sitting beside ones that must be re-appliable (an unsatisfactory referee letter), with no distinction.

**Evidence** — docs/AGENT-PROGRAMME.md:87 ("Refunded in full") and :98-100 (`feeRefundedAt`, `feeRefundReference` — an officer action, out of band); docs/SESSION-PROMPT-AGENT-BUILD.md:62 (a rejected applicant may re-apply); AGENT-PROGRAMME.md:41-49 (no reject-reason taxonomy is bound to re-application)

**Proposed handling** — Make `startApplication` refuse while the applicant's most recent REJECTED application has `feeRefundedAt == null`, with the message naming the outstanding refund. Split `AgentRejectReason` into re-appliable and terminal sets, store it, and refuse a new application on a terminal reason. Add a minimum interval (e.g. 90 days) between applications. Cover all three in agent-application-security with red harnesses.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding's first concern, drop its second and third, and move the gate.

1. MAKE "REFUND OWED" A FACT, NOT AN INFERENCE FROM A NULL. Add `feeRefundDueAt` beside the planned `feeRefundedAt`/`feeRefundReference` (`AGENT-PROGRAMME.md:98`). `reviewApplication`'s reject branch sets it in the same transaction as the status, and only when `feeReconciledAt != null` — so "nothing was ever paid" and "we owe 100,000" stop being the same value. Give `/admin/agents` an Outstanding refunds queue beside the review queue, built on the `src/app/admin/approvals/` per-queue try/catch pattern the build prompt already cites at :36, so an unpaid refund is visible work rather than a forgotten column. Show it on `/agent/status` too: the applicant should be able to see we owe them.

2. GATE THE SECOND FEE, NOT THE SECOND APPLICATION. Leave `startApplication` open — the applicant should be able to reassemble seven documents while waiting for our bank transfer. Refuse in `recordFeePayment` and again in `submitForReview` while any application of theirs has `feeRefundDueAt != null && feeRefundedAt == null`, with the message naming the amount and the original `feeReference`. That is the exact point where the harm — us holding two of one person's fees — occurs, and it is refused with a condition the applicant can see and we can clear.

3. TERMINALITY GOES WHERE IT ALREADY LIVES. Keep `AgentRejectReason` a flat taxonomy mirroring `kyc-service.ts:711`; add no terminal subset. Instead give `startApplication` a precondition that the account is `UserStatus.ACTIVE` (`prisma/schema.prisma:47-54`). A sanctions or integrity refusal is then handled by the existing compliance suspension, which bars the programme AND the betting, is auditable, is reversible through a surface that already exists, and needs no second bar that only the affiliate code understands. Record this as a line in `AGENT-PROGRAMME.md` §10 so the next session does not re-invent the enum split.

4. IF ALI WANTS A COOL-DOWN, IT IS A RULE, NOT A CONSTANT. Raise it to him as an open question rather than building it; if he decides one, it goes in `RULES.md` §2.10 in the full five-line form with a config key, and the officer surface gets an override. Before pricing it, measure whether rejections are being issued where `ADDITIONAL_INFO_REQUIRED` was the intended remedy (`AGENT-PROGRAMME.md:51-53`) — a cool-down that suppresses officer misuse is treating the symptom.

5. THE RED HARNESSES MUST INCLUDE THE POSITIVE CONTROLS, or this refusal is the trap the prompt names at :182 ("a guard that chooses its own population cannot fail"). In `agent-application-security`, three cases, not one: (a) rejected WITH a reconciled fee and no refund recorded → the second `recordFeePayment` is refused; (b) rejected with NO fee ever reconciled → re-application and payment proceed immediately (this is the case the finding's predicate would have broken, and it must go red if anyone re-widens the gate to bare `feeRefundedAt == null`); (c) rejected, refund recorded → payment proceeds. Prove the harness red by deleting the guard, per the standing rule, and lock it under `KP_SRC` (:161-162).

**⭐ A verifier disagreed with that handling and proposed:**

Do not gate the applicant's door on our own unfinished back-office task. Make the obligation visible and the officer informed.

1. A **Refunds owed** queue — the control the plan is actually missing. On `/admin/agents` (and as a card in `src/app/admin/approvals/`): every application where `status = 'REJECTED' AND feeReconciledAt IS NOT NULL AND feeRefundedAt IS NULL`, oldest first, with an age in days. Per-queue try/catch like `src/app/admin/approvals/` so a failed read renders `AdminLoadError`, never a false "queue empty". This closes the real hole: today a refund that is never paid is invisible forever.

2. **Prior applications on the workstation.** `/admin/agents/[id]` renders the applicant's earlier applications: status, decided date, `rejectReason`, `rejectNote`, fee reconciled, fee refunded. A repeat applicant then meets an informed officer — this repo's actual pattern (self-review blocked, categorised reason, audit on every branch) rather than an automated ban.

3. **Store the reason, bind nothing to it.** Keep `AgentRejectReason` as data. If a terminal category is wanted it is Ali's dated decision and must land in `AGENT-PROGRAMME.md` and `RULES.md` §2.10 BEFORE any code reads it — not invented in the service, and not while a single officer with no second signature can set it.

4. **Show the applicant.** `/agent/status` states an outstanding refund and, once paid, its `feeRefundReference`. We must not silently sit on TZS 100,000 while inviting them to send another.

5. **Rate limit, don't cool down.** Add `agent.apply` / `agent.submit` buckets beside `kyc.submit` in `src/lib/server/rate-limit.ts:90`. That is this repo's existing answer to a cycling applicant and it costs no policy decision.

6. If a precondition is still wanted after (1)–(4), the only defensible form is: `startApplication` succeeds but the NEW application is flagged, and `reviewApplication` REFUSES APPROVAL while the same user has a `REJECTED` application with `feeReconciledAt != null AND feeRefundedAt == null` — a refusal at the decision, where an officer can act on it, not at the door, where the applicant cannot. Never key it on `feeRefundedAt` alone.

Red harnesses in `agent-application-security`, each with a control that must go red:
· a rejected-with-reconciled-fee application enters the refunds-owed queue and LEAVES it when `refundFee` runs — control: delete the `feeRefundedAt IS NULL` clause, the suite must go red;
· an application rejected with NO reconciled fee never enters that queue and its owner can still re-apply — this is the exact case the proposed fix would have banned for life;
· prior applications and their reject reasons render on `/admin/agents/[id]`;
· `reviewApplication` refuses approval while a refund is outstanding (if 6 is adopted) — control: remove the check, red.

---

### 🟠 The clawback the plan orders has no trigger in this codebase, while the reversal that can actually happen has none

**Severity** high · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: money paid out on revenue we later did not keep comes back. WOULD: the build prompt asks for a clawback on an event the platform cannot produce — a settled market cannot be re-resolved, and voids pass `operatorFee = 0` so they never accrued in the first place. Building it means shipping a money path nothing exercises, which this repo's own Law 2 (BONUS-WITHDRAWAL §2) says will rot. Meanwhile the reversals that CAN occur — a recruit's deposit reversed after the fee was already earned and shared, a fraudulent recruit whose whole history should be unwound, an officer's manual adjustment — have no clawback and no way to void an attribution, because `recruitedBy` is immutable by design (affiliate-service.ts:251).

**Evidence** — src/lib/server/market-service.ts:2963 (`if (m.status === "RESOLVED" || m.status === "VOIDED") return … "Market already resolved."` — adjudication is one-way); `settleMarket` is idempotent on `settledAt`; no `unsettle`/`resettle` path exists anywhere in src/ or scripts/; src/app/admin/objections/actions.ts:28 ("Only reachable while the market is unsettled"); docs/SESSION-PROMPT-AGENT-BUILD.md:92 ("Add clawback on settlement reversal")

**Proposed handling** — Replace 'clawback on settlement reversal' with the reversal that exists: an officer action on /admin/agents that VOIDS an attribution and reverses the commission already paid on it (a negative ReferralReward plus an audited wallet adjustment, never an edit to history), reachable when a recruit is found fraudulent. Re-derive J4's exit criterion in MODULE-CERTIFICATION-PROGRAM.md against what the settlement engine can actually do rather than copying the recorded wording.

**⭐ A verifier disagreed with that handling and proposed:**

Four moves. Money already paid is never chased; the refusal is what gets guarded.

1 · DELETE the clawback from the build prompt. Strike "Add clawback on settlement reversal" (SESSION-PROMPT-AGENT-BUILD.md:92) and the live-drive line "Then reverse the settlement and confirm the clawback" (:151). Replace :92 with one sentence recording WHY it is gone: "Commission prices the operator fee actually collected at settlement (decision #5) and settlement is one-way — resolveMarket:2963, adminReopenMarket:3903, upholdObjection's settled refusal. There is no revenue we can later not keep, so there is nothing to claw back."

2 · RE-DERIVE J4 as a control that CAN go red. Rewrite the exit criterion (MODULE-CERTIFICATION-PROGRAM.md:894) from "reversal claws back commission" to the structural invariant that actually holds: "Commission accrues ONLY from operator fee actually collected at settlement; no refund, void, or one-sided branch reaches the accrual; settlement is one-way, so no reversal exists." Guard it by REFUTATION, per the mutation rule: a red harness that deletes the `settleFee.fee > 0` term at market-service.ts:3626 and proves a voided / one-sided market then accrues commission — plus a second mutation deleting `if (!(opts.operatorFee > 0)) return` at affiliate-service.ts:538. Both must go red. That is a real control; a test for an event the platform cannot produce is not. Also fix J4's stale attack line "commission on a reversed/refunded deposit" — under the settlement-time model neither a deposit nor a bet accrues commission at all.

3 · The reversal that IS real — a fraudulent recruit — is FORWARD-ONLY, and money already paid is untouched. Do not void recruitedBy; do not write a negative ReferralReward. Mirror the seam that already exists: alongside referrerMayEarn (affiliate-service.ts:367) add a recruit-side refusal read at the SAME point in all three hooks (onRecruitBet:495, onRecruitSettlement:545, onRecruitDeposit:610), backed by one nullable column — `User.attributionSuspendedAt` (or AffiliateAgent-side equivalent), set by an officer action on /admin/agents/[id] with a mandatory reason and a COMPLIANCE audit. One column, both DAL backends, entity map in DATA-LAYER.md. Immutable history preserved; the attribution row stays, it simply stops paying. The control goes red by deleting the check — add it to the new agent-application-security suite.

4 · If an officer must actually recover cash from a fraudulent agent, route it through the EXISTING adminAdjustBalance (wallet-service.ts:1863) — already atomic, capped, overdraw-guarded, WATCHED COMPLIANCE audit, "clawback" already named in its docstring. /admin/agents/[id] shows a LINK to that adjustment, never its own money path. One money mover, one audit trail. And state the consequence in RULES.md §2.10 in the Decided/Enforced in/Configured in/Stated to/Guarded by form: "Commission, once paid, is final. Recovery is an officer balance adjustment, not an automatic clawback" — so the product never promises a reversal it cannot perform (Law 3, BONUS-WITHDRAWAL §2: silence is not consistency).

Note for whoever executes: correct the finding's own evidence before quoting it — voids never reach the accrual push (market-service.ts:3626), they do not "pass operatorFee = 0"; and a deposit reversed after commission was shared is not reachable either (REVERSED is stamped before the credit lands, wallet-service.ts:420-437).

**⭐ A verifier disagreed with that handling and proposed:**

Five steps, all inside the existing plan's schema migration.

1. DELETE "Add clawback on settlement reversal" from docs/SESSION-PROMPT-AGENT-BUILD.md:92 and the harness step at :150-151. Do not replace it silently.

2. Re-derive J4 in MODULE-CERTIFICATION-PROGRAM.md (the prompt's own §7 already orders "count re-derived, not copied") and ANSWER its Attack line rather than deleting it. Both recorded reversals are inert, for stated reasons: (i) a settled verdict cannot change — cite market-service.ts:2963, :3131, :4002 and objections-service.ts:499; (ii) "commission on a reversed/refunded deposit" cannot arise either, because the RG reversal happens BEFORE the credit (onRecruitDeposit fires only on the crediting call, wallet-service.ts:496-500) and, under decision 3, commission prices the operator fee, not deposits. New J4 exit: "no reversal path exists that can pay commission on revenue we did not keep — proven by the three settlement guards; the reachable remedy is attribution void + commission reversal, driven by a red harness."

3. Build the remedy that IS reachable, as an officer action on /admin/agents/[id], named for what it is (agent misconduct / fraudulent recruit), not "clawback on reversal":
   - `voidAttribution(recruitUserId, reason)` — writes `attributionVoidedAt` + `attributionVoidedById` on the recruit. ⛔ Never null `recruitedBy`: that is the evidence of who introduced them, and the reversal row points at it.
   - Add the void to the ONE predicate all three hooks already share — extend `referrerMayEarn` (affiliate-service.ts:367) rather than adding a check to `onRecruitSettlement` alone. Same discipline the plan applies to `rateFor`: one resolver, not three.

4. Reverse already-paid commission WITHOUT a negative COMMISSION row:
   - Add `REVERSED` to `ReferralRewardStatus` and stamp the source rows (a status change, not an amount edit — history stays intact).
   - Write the compensating row as a distinct type (`COMMISSION_REVERSAL`), and EXCLUDE it from the cap sum at affiliate-service.ts:565-571 by filtering `type === "COMMISSION" && status !== "REVERSED"`. Reversed earnings must not hand back cap headroom.
   - Settle the cash through `adminAdjustBalance` (negative, mandatory reason, existing ledger pairing + COMPLIANCE audit).
   - ⭐ When the debit is refused for insufficient balance (wallet-service.ts:1912 — the normal case for an agent who cashed out), leave the reversal row `OWED` and net it against the agent's next accrual in `onRecruitSettlement` before the cap check. The obligation must survive an empty wallet, or the control passes by doing nothing.

5. Gate and drive it:
   - The void and the reversal are REFUSALS. They must sit OUTSIDE `cfg.enabled` and outside `PRODUCT_STATE` — Law 1, BONUS-WITHDRAWAL §2. Note this is also the answer to leak #2: turning the promo off must not disable a clawback.
   - Law 2 demands a driver. The red harness must: pay commission → void the attribution → assert (a) the source row is REVERSED, (b) a reversal row exists and is excluded from the cap, (c) the wallet debited or the row is OWED, (d) a further settlement on that recruit accrues NOTHING through all three hooks. The control that must go red: delete the `attributionVoidedAt` term from `referrerMayEarn` and the suite must fail.
   - RULES.md §2.10 gains a line: agent commission is reversible on misconduct, in the full Decided / Enforced in / Configured in / Stated to / Guarded by form — because it reverses the objections-service posture (":8, :465, :501") and that reversal has to be a recorded decision, not an implementation detail.

---

### 🟡 Erasing an agent's account leaves their code binding and their sub-ledger naming them

**Severity** medium · **Kind** scenario · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: erasure ends the commercial relationship as well as the identity. WOULD: after erasure the account still carries `role = AGENT` and its `50PICK-AG-…` code still resolves in `bindRecruit` and in `resolveReferralPreview` — so a link on a poster keeps recruiting players into a badged relationship with a person who has been erased. The sub-ledger and leaderboard degrade to `@unknown` / a phone-fragment handle rather than saying 'erased', and `getPlayerReferralSummary` masks recruits with `maskName`, which erasure was careful about elsewhere but nobody has checked on the agent surface.

**Evidence** — src/lib/server/erasure.ts:364-390 (the User row is emptied; role, AffiliateAgent and ReferralReward are untouched, and :366-368 explains the row itself cannot be deleted because the affiliate ledger names it); src/lib/server/affiliate-service.ts:748-759 (`getAdminAffiliateStats` resolves referrer handles from the user row)

**Proposed handling** — Add to `anonymizeClosedAccount`: deactivate the AffiliateAgent row and retire the code (keep the row for the ledger FK, but make it un-bindable), and give the admin sub-ledger an explicit 'erased account' label rather than a fallback handle. Assert it in scripts/erasure.test.mts with a control that a live agent's code still binds.

**⭐ A verifier disagreed with that handling and proposed:**

Fix it at the ONE predicate, read-time, and label from the tombstone rather than from a stored flag.

1 · WIDEN THE SINGLE ELIGIBILITY PREDICATE, DON'T ADD A WRITE.
The plan already has to turn the role test into an account test to pick up `AffiliateAgent.approvedAt` / `.active`. Do it once, in `affiliate-service.ts`, and make `status` part of it:

```ts
// the ONE answer to "may this account refer?" — bindRecruit, resolveReferralPreview
// and referrerMayEarn all call this and nothing else.
async function mayRefer(referrerUserId: string): Promise<boolean> {
  const u = await db.user.findById(referrerUserId);
  if (!u) return false;
  if (u.status !== "ACTIVE") return false;   // CLOSED · SUSPENDED · SELF_EXCLUDED · COOLED_OFF
  if (!inviteIsLiveFor(u.role)) return false;
  if (u.role !== "AGENT") return true;
  const a = await db.affiliateAgent.findByUserId(referrerUserId);
  return !!a && !!a.approvedAt && a.active;
}
```

Then replace all three call sites — `affiliate-service.ts:280-291`, `:158-166`, `:367-370` — so the bind, the register-page ribbon and the accrual hooks cannot disagree. This is what `bindRecruit:274-277` already asks for ("it reads the SAME seam as every other surface"), it needs no migration, it covers the accounts that are already CLOSED, it covers SUSPENDED and SELF_EXCLUDED which erasure never sees, and a support reopen restores eligibility automatically with nothing to remember. `AffiliateAgent.active` then keeps ONE meaning: an officer struck this agent off.

⚠️ One money question inside this that is Ali's, not the build's: adding `status !== "ACTIVE"` to `referrerMayEarn` also stops ACCRUAL on recruits bound before the agent closed. That is almost certainly right — the wallet is CLOSED at `user-service.ts:82-85`, so `creditWallet` cannot land and `payBonus`'s fallback would pile up HELD rows naming an erased person — but it ends a commercial relationship, so record the ruling in `AGENT-PROGRAMME.md` §6 rather than deciding it in a diff.

2 · THE LABEL IS A READ-TIME DERIVATION, NOT A NEW COLUMN.
`erasure.ts` already exports `isErasedPhone` (`:110-112`) and writes a tombstone every erased row carries. So teach `handleFor` (`affiliate-service.ts:738-742`), `getPlayerReferralSummary:658` and the ledger row at `:753` to test it and return an explicit erased label — reusing `ERASED_AUTHOR_NAME` ("Former member") so the sub-ledger says the same word the comment thread already says. That is correct for accounts erased BEFORE the change too, which a stored flag would not be, and it removes the six-digit handle that currently reads as a phone fragment.

3 · WHAT MUST GO RED.
Put the assertions in the new `agent-application-security` suite (they are about agent eligibility, not about erasure), with an explicit control, per the plan's own law that a refusal needs a population that must fail:
  · CONTROL — an ACTIVE approved agent's code BINDS and the badge renders. This must stay green, and it is what proves the suite is not passing because nothing binds.
  · a CLOSED agent's code refuses, with `affiliate.bind.refused_withdrawn` audited.
  · a SELF_EXCLUDED and a SUSPENDED agent's code refuse — the two cases the erasure-hooked fix would have left open.
  · `resolveReferralPreview` returns null for all three, so the register page never shows "Verified 50pick Agent" for a code the bind is about to refuse.
  · an ERASED agent's ledger and leaderboard rows read "Former member", not `@nnnnnn`.
Then prove the harness: delete the `u.status !== "ACTIVE"` clause on a `KP_SRC` copy and confirm the CLOSED/SELF_EXCLUDED/SUSPENDED cases go red while the control stays green. Keep the `scripts/erasure.test.mts` addition to the label assertion only — that one genuinely is erasure's business.

**⭐ A verifier disagreed with that handling and proposed:**

Fix it at the ONE seam, not in erasure.ts.

1. Eligibility asks about the ACCOUNT, not only the role. When the agent build collapses `bindRecruit`'s gate and `referrerMayEarn` into the single predicate the comment at `affiliate-service.ts:275-284` promises, that predicate takes the whole referrer row and requires all three: `inviteIsLiveFor(role)` AND `user.status === "ACTIVE"` (excludes CLOSED, SUSPENDED, and therefore every erased account, since erasure cannot run on a non-CLOSED row) AND `agent.active && agent.approvedAt`. `resolveReferralPreview` already reads the same seam by construction, so the "Verified 50pick Agent" badge and the ribbon stop for free — which is precisely the property that surface was built for. Erasure then needs no new powers at all, and closure/suspension are covered on the same line.

2. Wire the lifecycle to the function the plan already has, with one writer and an audit row. In `closeAccount`, after the status flip, call the plan's `deactivateAgent(userId, { reason: "account_closed", actorId: null })` when the user is an AGENT. That keeps `AffiliateAgent.active` single-writer, produces the audit entry an officer-visible commercial change owes, and leaves reinstatement to the same officer path rather than to a hand-edit. Do NOT have erasure write it.

3. Preserve the KYC asymmetry the platform already ruled on — gate the OFFER, never the refusal. New binds and the badge stop at closure. Accrual on binds made while the agent was live must NOT be blanket-killed by the same flag: that is money already earned on a vetted relationship, and the KYC precedent (withdrawal asks "EVER approved", deposit/bet ask current status) is the standing decision on exactly this shape. `creditInternal` already refuses a CLOSED wallet (`wallet-service.ts:1805`) and every caller records the reward HELD rather than PAID, so the existing held queue is where an officer settles the relationship out. State that split in `docs/AGENT-PROGRAMME.md`; today the document is silent on the entire offboarding lifecycle.

4. Admin label: keep this part, but derive it from the tombstone, not from erasure writing a new column. `handleFor` should return an explicit "Erased account" when `isErasedPhone(user.phoneE164)` — `erasure.ts:112-114` already exports that predicate — and "Closed account" for `status === "CLOSED"`, instead of scraping digits out of a cuid.

5. Control that must go red. Assert it in the agent programme's own guard (where the bind gate lives), not only in `scripts/erasure.test.mts`: a live approved agent's code binds (the control — this must go red if the predicate is over-tightened), the SAME code refuses with `referrer_not_eligible` after `closeAccount`, refuses after suspension, and refuses after `anonymizeClosedAccount`; and `resolveReferralPreview` returns null in all three. Mirror the third case into erasure.test.mts so the privacy suite owns its half.

---

### 🟡 The refund the plan promises captures nothing to refund TO, and the rejection message is required to carry no CTA

**Severity** medium · **Kind** gap · ⭐ **FIX DISPUTED**

SHOULD: an officer rejecting an application can execute the refund without chasing the applicant. WOULD: the only payer artefact captured is a transaction reference and a receipt image. A bank or Selcom deposit reference does not reliably yield an account or MSISDN to pay back to, and the applicant's registered phone is not necessarily the paying account — the framework's own destination is a bank account, not a wallet. The rejection email is specified to carry no CTA, so the applicant is told 'no' with no instruction about their money. Result: refunds age, unrecorded, and the first regulator question about a rejected applicant's TZS 100,000 has no answer.

**Evidence** — docs/AGENT-PROGRAMME.md:85 ("uploads the receipt and types the transaction reference"), :98-100 (the refund is `feeRefundedAt` + `feeRefundReference`); docs/SESSION-PROMPT-AGENT-BUILD.md:53 (the fee fields — reference, amount, reconciled, refunded — no payer identity); SESSION-PROMPT:115 ("rejection carries no CTA")

**Proposed handling** — Capture the payer identity at `recordFeePayment` (paying account/MSISDN + payer name as typed, alongside the reference and receipt) as an explicitly attested field. Add an aged-refunds view to /admin/agents driven off `status = REJECTED AND feeRefundedAt IS NULL`, and let the rejection message state that the fee is being returned and how — that is information about the applicant's own money, not a call to action.

**⭐ A verifier disagreed with that handling and proposed:**

Drop the payer-identity capture entirely; keep the ageing view; state the refund in the rejection mail using the existing precedent.

1. **Do NOT add a payer MSISDN/name field.** Instead write the destination law into the plan explicitly, as §4's third bullet: *the refund is paid to the applicant's registered `phoneE164` and to the KYC-verified name on their approved `KycSubmission` — never to an account named on the receipt.* This is E-215 (`src/lib/payout-destination.ts:89-110`) applied to a human-executed payment, and it costs nothing because both facts are already preconditions of the application. If the fee demonstrably came from a third party, that is a rejection reason (add it to `AgentRejectReason`), not a refund destination — the platform must not return TZS 100,000 to someone it has not identified.

2. **Make the refund non-optional in the state machine, not a separate officer errand.** `reviewApplication`'s REJECT branch should either perform the `refundFee` transition in the same transaction or set the application into an explicit `REJECTED` + refund-owed state. Then add the aged view to `/admin/agents` driven off `status = REJECTED AND feeReconciledAt IS NOT NULL AND feeRefundedAt IS NULL` — note the reconciled clause the finding omitted: an unreconciled fee was never received and must not generate a refund obligation. Model the ageing on the existing stale-payment sweep shape rather than inventing one.

3. **Guard it with a control that must go red**, per the platform's own rule: a red harness that rejects an application with a reconciled fee and asserts the aged-refund count goes to 1, and a second that deletes the ageing query and proves the harness fails. A queue that chooses its own population cannot fail — this repo has already been burned by exactly that.

4. **Rejection email:** copy `amlRejectRefundHtml` (`src/lib/server/email.ts:1291-1313`) — `detailRows` carrying amount refunded (`tone: "good"`), the categorised reason, and `feeRefundReference` once set, closed with `supportLine()`, no `ctaButton`. Register it in `NO_CTA_TEMPLATES` (`comms-registry.ts:150-159`) alongside `amlRejectRefundHtml` with the same one-line justification, so `test:cert-c1`/`c3` stay green and the exemption reads as a decision. EN+SW only, per §10.

5. **RULES.md §2.10** should carry the refund destination rule in the `Decided / Enforced in / Configured in / Stated to / Guarded by` form, so there is one source of truth for it — otherwise the next session re-invents the typed-payer field.

**⭐ A verifier disagreed with that handling and proposed:**

Make the debt a state rather than a button, keep one destination law, and let the email state the money.

1. `reviewApplication(REJECT)` records the obligation in the same transaction that creates it — `feeRefundDueTzs`, written ONLY when `feeReconciledAt IS NOT NULL`. A rejection cannot leave the debt unrecorded, because the rejection is what records it. An application rejected before the fee was ever confirmed owes nothing, and must not appear as owed.

2. Give the refund an actor: add `feeRefundedById` beside `feeRefundedAt` / `feeRefundReference` (SESSION-PROMPT:53), mirroring `feeReconciledById`. Two-sided attestation or the refund has no author.

3. ⛔ Do NOT add a payer account/MSISDN field. The destination is `payoutDestinationFor(user.phoneE164, …)` — src/lib/payout-destination.ts, the same law every withdrawal obeys. If it fails closed (no usable registered number), the officer is shown the refusal reason rather than guessing; that is the decided behaviour on every other money-out path, and inventing a second destination field here would be an AML route the withdrawal path already refuses.

4. Surface outstanding refunds as a queue on the EXISTING `/admin/approvals` board, the platform's queue convention with per-queue try/catch (src/app/admin/approvals/page.tsx:31-32) so a failed read renders `AdminLoadError` and never a false "nothing owed". Predicate: `status = REJECTED AND feeReconciledAt IS NOT NULL AND feeRefundedAt IS NULL`, aged by rejection date. A duplicate view on `/admin/agents` would be a second place to look for one fact.

5. The rejection email states the refund in the body with no CTA, modelled verbatim on `depositReversedHtml` (src/lib/server/email.ts:778-800): the fee is being returned to the number registered on the account, amount + reference in `detailRows`, no button. That satisfies "rejection carries no CTA" and the gate-the-offer-never-the-refusal law — telling someone their own money is coming back is information, not solicitation.

6. The control that must go red: a guard asserting the outstanding-refunds query counts a reconciled-rejected-unrefunded application AND excludes an unreconciled one, red-harnessed by deleting the `feeRefundedAt IS NULL` term and separately the `feeReconciledAt IS NOT NULL` term. Both mutations must fail the guard, or it is a query that cannot fail.

---

### 🟡 There is no attribution correction in either direction, and a paid business partner will demand one in week one

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

SHOULD: an agent who genuinely introduced a player who then registered without the link has a documented route to be credited, and a player attributed to the wrong agent has a route to be corrected. WOULD: neither exists. The immutability is right as a fraud control, but it was designed for a free player promo where a missed attribution cost nobody anything. For a partner who paid TZS 100,000 it is a commercial dispute, and the only tools available are a support ticket with no action behind it — which is exactly the condition under which somebody eventually runs an UPDATE in SQL. The same missing mechanism blocks the fraud case: an attribution obtained by a fake sign-up cannot be voided.

**Evidence** — src/lib/server/affiliate-service.ts:251 (`already_bound`) and :263-265 ("`recruitedBy` is written ONCE … NEVER re-attributed"); binding happens only at registration (bindRecruit is called from the register flow); docs/AGENT-PROGRAMME.md:165-167 describes a code entered at register, nothing after

**Proposed handling** — Build one officer action on /admin/agents that VOIDS an attribution (sets a `voidedAt` + reason on it rather than deleting it, stops future accrual, and optionally reverses commission already paid) and one that ASSIGNS an unattributed recruit to an agent within a bounded window (e.g. 7 days from registration, only where `recruitedBy IS NULL`, two-sided audit, never a re-attribution from one agent to another). State plainly in AGENT-PROGRAMME.md that re-attribution between agents is refused, so support has an answer.

**⭐ A verifier disagreed with that handling and proposed:**

Split it, ship two of the three, and refuse the third in writing.

1 · CLOSE IT AT SOURCE — make the code enterable (this is the missing-attribution fix, and it is the cheap one). `src/app/auth/register/page.tsx:198-206` becomes a real editable, optional field: `name="ref"`, no `readOnly`, rendered ALWAYS (not only when `?ref=` resolved), with live resolution to the "Verified 50pick Agent" ribbon on blur. `startRegisterAction` already forwards `ref` (`actions.ts:20`), and it flows into the unchanged `bindRecruit` — one writer, every anti-fraud check intact, consent from the person being attributed. This is what `AGENT-PROGRAMME.md:164` already promises and what an agent with a printed card actually needs. Do it in this build; the doc is otherwise false on delivery.

2 · SHIP THE VOID, but not as proposed. Put `attributionVoidedAt` / `attributionVoidedReason` / `attributionVoidedById` on the User row (or a small `AttributionVoid` record) — never clear `recruitedBy`, so `already_bound` still refuses re-attribution by construction and the void cannot become a covert reassign. Read it in ONE place: extend the existing `referrerMayEarn` (`affiliate-service.ts:366-369`) into `attributionIsLive(recruit, referrer)` and have all three hooks (`onRecruitBet:490`, `onRecruitDeposit:539`, `onRecruitSettlement:605`) ask that same predicate — do not add a fourth check, per the file's own warning at :277. ⛔ Do NOT auto-reverse commission already paid: it is real withdrawable cash (§5) that may already be withdrawn, and an automatic debit would drive an agent's wallet negative, which this platform has no convention for. Make recovery an explicitly officer-recorded adjustment on the agent, the same shape as `feeRefundedAt`. Red harness: void an attribution, settle a position for that recruit, assert ZERO reward rows — and the control that must go red is the same settlement WITHOUT the void paying exactly once (otherwise the guard proves nothing, per the trap at SESSION-PROMPT-AGENT-BUILD.md:182).

3 · REFUSE the officer assign, and say so. Add a line to `AGENT-PROGRAMME.md` §6: an attribution is never created, moved or re-pointed by an officer; a missed attribution is a lost one, and the code field at registration is the only route. That gives support a written answer on day one — which is the actual thing the finder was reaching for — without handing a single officer the power to award commercial relationships. If Ali later wants a grace-period claim, the safe shape is player-initiated and officer-confirmed (the player enters the code from their own account within N days, `recruitedBy IS NULL` only, through `bindRecruit`), but that collides with decision 8's no-in-account-solicitation rule and is a ruling to take, not a thing to build unasked.

Give the void a `test:agent-attribution` suite and the register field a live drive (register a second browser by typing the code, not by clicking a link) — `next build` green has passed here while every page was down.

**⭐ A verifier disagreed with that handling and proposed:**

Build the VOID. REFUSE the ASSIGN. The proposal is two fixes and only one of them is right.

WHY THE ASSIGN IS WRONG HERE (it would be the worse problem):
1. It creates a SECOND writer of `recruitedBy`, which `affiliate-service.ts:275` warns against by name — the eligibility predicate "must not grow a SECOND definition of 'may refer' somewhere else". An assign path must re-implement every guard at `:280-327`: `inviteIsLiveFor`, self-referral (`:293`), `ensureAffiliateAccount`, `incrementRecruitCount` (`:308` — skip it and the denormalised counters silently desync), the IP-overlap HELD flag (`:302`), and the SIGNUP-bonus branch (`:325`). Missing any one is a leak, and none of them will be exercised by the officer path in QA.
2. It is an officer-granted money right with no evidence standard. The agent's proof that they introduced the player is, by construction, nothing — the link was not used. Under single-officer approval (AGENT-PROGRAMME.md §10) that is one signature, invisible, retroactive, and per-player; an agent who can socially engineer support can attach identified high-volume unattributed accounts. A 7-day window does not fix this — 7 days is enough to see who bets.
3. It destroys the incentive that keeps attribution honest. The link IS the agent's product; if a ticket repairs a miss, the dispute queue becomes the acquisition channel.

WHAT TO BUILD INSTEAD:

A. VOID, read in the ONE existing seam. Add `attributionVoidedAt` + `attributionVoidReason` + `attributionVoidedById` on `User` beside `recruitedBy`, and make `referrerMayEarn` (`affiliate-service.ts:367`) become a PAIR predicate — `mayPairEarn(referrerUserId, recruit)` — so all three hooks (`:495`, `:544`, `:610`) inherit it with no fourth check bolted on. ⛔ It must ALSO be read by both read models — `getPlayerReferralSummary:649` and `getAdminAffiliateStats:735` both filter on raw `u.recruitedBy` — or the agent's dashboard keeps counting a recruit the ledger no longer pays, which is this repo's signature failure (instruments green while measuring the wrong thing).

B. The void is a REFUSAL, so `feature-state.ts` must NOT gate it — that file's own header law ("GATE THE OFFER, NEVER THE REFUSAL", ~line 30). Voiding must work for a deactivated agent, a withdrawn programme, and a closed account.

C. Run the legacy population AT APPROVAL, not by ticket. `approveAgent` must count the applicant's pre-existing `recruitedBy` rows and refuse to complete silently: present them to the officer as an attestation ("this applicant already holds N attributions from share links — carry forward or void"), default VOID. That closes the §5e path above at the one moment it becomes live, and it needs no dispute process.

D. The clawback is not "optional" and must not be a second reversal mechanism. `wallet-service.ts` has `creditInternal:1769` and `adminAdjustBalance:1864` and no referral debit; the build plan already commits to one clawback for settlement reversal (SESSION-PROMPT:93) — the void must reuse it, as a compensating REVERSED `ReferralReward` row plus a debit, never an UPDATE of the paid row (immutable money history). Decide explicitly what happens when the commission is already withdrawn (it is real cash, no wagering): cap the clawback at available balance and record the remainder as a recoverable on the agent, or refuse. Driving a player balance negative must make `test:money-invariants` go red, not pass.

E. Replace the assign with honest capture, which costs no policy at all: persist the `ref` from `/agent/<code>` and `/auth/register?ref=` in a first-party cookie (30 days) and let `bindRecruit` — the same single writer — consume it at registration. That closes the actual loss mode ("clicked the link, registered later or on another device") with zero new writers and zero officer discretion.

F. Write the refusal down where it binds. AGENT-PROGRAMME.md §6 must state that attribution is never re-assigned between agents and never granted retroactively, and — more importantly — the corrected framework document that §9 requires must say it BEFORE the applicant pays TZS 100,000. A disclosed term is what prevents the dispute; a support script is only what survives it.

G. Guard with a control that must go red: a suite asserting (i) `recruitedBy` has exactly one writer in `src/**` and `scripts/**`, (ii) a voided pair stops accruing AND vanishes from both read models, (iii) CONTROL — an un-voided pair with an AGENT referrer still pays. Delete the void check and (ii) must fail; without (iii) the suite passes whenever the reward path is broken for any reason, which is exactly how §5d's first version passed.

---

### ⚪ An agent recruited by another agent is undefined, and the sub-ledger will expose one agent's book to another

**Severity** low · **Kind** scenario · ⭐ **FIX DISPUTED**

SHOULD: the rule is stated so support and the officer can answer it. WOULD: no MLM risk exists — commission is single-level by construction, so agent A earns nothing on agent B's recruits, only on B's own betting, which is negligible. The real consequence is disclosure: A's sub-ledger lists B as a recruit with B's turnover and revenue, masked by name but identifiable to A, who introduced them. One agent reading another agent's production figures is a commercial confidentiality problem the framework never contemplated, and there is no rule about whether an agent may recruit a competitor at all.

**Evidence** — src/lib/server/affiliate-service.ts:544-598 (commission accrues on the direct recruit's settlements only — no multi-level payout exists, which is correct); docs/SESSION-PROMPT-AGENT-BUILD.md:118-121 (the sub-ledger shows recruits, their turnover and revenue generated)

**Proposed handling** — One line in AGENT-PROGRAMME.md: an approved agent's own activity is excluded from any other agent's sub-ledger and from commission, and an application from an already-attributed player closes that attribution at approval. Implement as a filter in the sub-ledger read model plus an accrual skip when the recruit's own role is AGENT — cheap, and it removes the question.

**⭐ A verifier disagreed with that handling and proposed:**

The proposed fix must not be applied — two of its three limbs contradict standing law and would create worse problems than the one they answer.

1. "An application from an already-attributed player closes that attribution at approval" REVERSES `AGENT-PROGRAMME.md:145` and the permanence `bindRecruit` enforces at `affiliate-service.ts:251`/262-264. It is retroactive re-attribution under another name; it silently zeroes a legitimate referrer's income with no ledger trace; and it hands any recruit a paid route to cut off their own referrer — pay TZS 100,000, get approved, the upstream agent's book on you goes dark. That is a collusion and griefing vector the current design does not have.

2. "An accrual skip when the recruit's own role is AGENT" adds a SECOND axis (the recruit's role) to a rule the authority states on the referrer's role alone (`AGENT-PROGRAMME.md:154-155`), and it does so as one more silent `if (…) return;` in an accrual hook — the exact shape of already-found leak #2, where a hook stops paying agents with nothing going red. It also makes A's income depend on a state that changes months later, with no notification and no reversal rule if X is later deactivated.

3. Filtering agent recruits out of the sub-ledger would hide real commission rows from the officer whose job on `/admin/affiliate` is reconciling what we actually paid. The admin ledger must show every row.

WHAT TO DO INSTEAD — docs only, no code:

(a) If a sentence is wanted, add one to `AGENT-PROGRAMME.md` §6 that FOLLOWS the existing law rather than overturning it: "Attribution is never closed. If a recruit is later approved as an agent, their original referrer keeps earning on that person's own settled positions at the referrer's own rate; the new agent earns only on the players they themselves recruit. There is no second level, and none will be built." No code change; it is already how the engine behaves.

(b) The actionable edit is the viewer ambiguity, not the scenario: name the viewer in `AGENT-PROGRAMME.md:117-119`. Per-recruit turnover and generated revenue are an OFFICER view on `/admin/affiliate` (`roles.ts:239`, growth); the agent's own `/profile/invite` shows their recruits, status, and what each earned THEM, and no recruit-side figures. Back it with a guard over the `getPlayerReferralSummary` return shape (`affiliate-service.ts:642-658`) asserting no recruit turnover/revenue field is exposed — red-harnessed by adding one and watching it fail. That is a control that can go red; a rule about who may recruit whom cannot.

(c) If disclosure is genuinely the worry, the real channel is not agent-recruits-agent and the finding misses it: `/profile/invite` already publishes per-recruit `earnedTzs` (`affiliate-service.ts:657`, rendered at `page.tsx:358-359`), and build prompt §4 adds the agent's OWN rate to the same page. Commission is `round(operatorFee × rate)`, so an agent can divide and recover each masked recruit's exact generated operator fee. That applies to every recruit, not only agent ones. Decide it deliberately — it is arguably correct that an agent sees what each recruit earned them — rather than papering it over by filtering one narrow class of recruit out.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the disclosure at the surface, state the rule where rules live, and change no money and no attribution.

1 · RESOLVE THE DOC CONFLICT — this is the actual fix, and it is free.
AGENT-PROGRAMME.md:117-119 and SESSION-PROMPT-AGENT-BUILD.md:118-121 disagree on the audience. Decide once, in AGENT-PROGRAMME.md §5: per-recruit TURNOVER and GENERATED REVENUE live on `/admin/affiliate` — the officer's surface. The agent's own `/profile/invite` keeps exactly what `getPlayerReferralSummary` returns today (masked name, join date, status, and the commission THAT AGENT earned on that recruit), plus the agent's OWN aggregate turnover so the framework's "volume turnover" promise is still honoured as a measure of the agent. Nobody sees another person's gambling volume. No filter, no role check, no schema column, no accrual change — and it closes the exposure for player recruits too, not just the agent-on-agent case the finding scoped it to.

2 · STATE THE RULE IN RULES.md §2.10, in the full Decided / Enforced in / Configured in / Stated to / Guarded by form:
· An already-attributed player MAY apply to be an agent.
· Approval does NOT re-attribute and does NOT close the attribution — `recruitedBy` is written once (affiliate-service.ts:251).
· The introducing agent CONTINUES to earn on the new agent's OWN play, because 50pick actually collected that fee.
· Commission is SINGLE-LEVEL: an agent never earns on their recruits' recruits. This is the sentence support and the officer need, and it is the one the framework never wrote.
· Cross-reference it from AGENT-PROGRAMME.md §6 beside the "one referrer, one programme, one payment per event" invariant.

3 · IF the owner instead rules that A stops earning on B, that is a POLICY, not a filter. It needs a dated decision in RULES.md §2.10, the agent told in the approval email, and a CONTROL THAT MUST GO RED: a guard that binds A→B, approves B, settles a B position and asserts zero accrual — PAIRED with a control case where B stays a player and accrual MUST happen. Without the paired control the test is green while measuring nothing, which is this platform's recorded failure mode. Do not ship the skip on the strength of a one-sided assertion.

4 · GUARD WHAT ACTUALLY MATTERS, WHICH NOTHING ASSERTS TODAY.
"No MLM" is currently an emergent property of `onRecruitSettlement` reading one id — not a guarded fact. Add the invariant test: for every `ReferralReward`, `recipientUserId` is the DIRECT `recruitedBy` of `recruitUserId`, one hop, never a grandparent. Prove it by mutation — make the accrual walk a second hop and confirm the guard goes red. That converts the finding's correct observation into something a future refactor cannot quietly break, and it is worth more than the rule line it asked for.

---

## Plan quality (defects in the plan itself) — 17 confirmed

### 🔴 Implementing the plan's own "one payment per event" invariant turns two predeploy guards RED, and both will be "fixed" the wrong way

**Severity** critical · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

Two guards in the `predeploy` chain use *an AGENT referrer being paid the PLAYER prize through `onRecruitBet`* as their POSITIVE CONTROL:

· `scripts/withdrawn-features.test.mts:253-262` — "§5e CONTROL · an AGENT referrer on the same path IS paid" asserts `balance + bonusBalance > 0` and `listByReferrer(...).length > 0` after `onRecruitBet("w5e_rec", { stake: 25_000 })`. It exists solely to stop §5d (the legacy-attribution refusal) from passing vacuously — and its own comment at :210-215 records that §5d WAS vacuous once and only the red harness said so.
· `scripts/rg-cash-incentive.test.mts:128-144` — §5 makes the referrer an AGENT *on purpose* (comment at :126: "a PLAYER referrer would be refused by the ATTRIBUTION gate and this section would pass for entirely the wrong reason"), then asserts "§5 the reward is recorded HELD, not silently dropped". That row is a PRIZE row from `payPrize`.

The moment AGENT-PROGRAMME.md §6 ("One referrer, one programme, one payment per event" — commission only, no flat prize) is implemented, `onRecruitBet` stops writing any row for an AGENT referrer and BOTH assertions go red. Neither document mentions this. The engineer meets two red money guards at the end of a large build and takes the cheap exit: relax the assertion. That deletes the only control proving the legacy-attribution refusal and the RG cooling-off suppression on the affiliate cash path still mean anything — the exact "a guard that chooses its own population cannot fail" failure the prompt itself lists as a trap at :182.

**Evidence** — scripts/withdrawn-features.test.mts:253-262; scripts/rg-cash-incentive.test.mts:126-144; docs/AGENT-PROGRAMME.md:152-158; package.json:191 (both in `predeploy`)

**Proposed handling** — Add an explicit build step: in the SAME commit that suppresses the prize for AGENT referrers, re-point both controls at `onRecruitSettlement` + COMMISSION (§5e must still observe a real credit, §5 must still observe a HELD commission row for a cooling-off agent). State it as a precondition, not a cleanup: 'these two suites' controls are load-bearing and must be migrated, never relaxed.' Prove each with its red harness after the migration.

**⭐ A verifier disagreed with that handling and proposed:**

The finding's instinct (migrate in the SAME commit, never relax) is right; its concrete fix is wrong in two ways.

1) Re-pointing §5e at `onRecruitSettlement`/COMMISSION DESTROYS THE PAIRING. §5d asserts a legacy PLAYER attribution accrues nothing THROUGH `onRecruitBet`. A control sitting on a different hook cannot prove that refusal is non-vacuous — it recreates precisely the failure recorded at withdrawn-features.test.mts:210-215. A control must share the mechanism with the refusal it protects.

2) It ignores the mechanism this repo already built for exactly this. `feature-state.ts:83-87` reads `process.env.FEATURE_INVITE` PER CALL, and withdrawn-features.test.mts:130-142 §4 already drives the ON branch with it plus a leak guard at :141. Once the prize is suppressed for AGENTs and PLAYERs are refused by `inviteIsLiveFor` (affiliate-service.ts:367-370), `payPrize` becomes unreachable for EVERY role in the shipped config — the prize branch is dead code. The env override is the only honest way to keep it exercised while dormant, which is the stated reason it exists.

Do this instead, all in the commit that suppresses the prize for AGENT referrers:
- withdrawn-features §5d/§5e: keep BOTH on `onRecruitBet` and flip §5e's control to a PLAYER referrer under `process.env.FEATURE_INVITE = "ACTIVE"` (restored in a `finally`, with the §4 leak assertion repeated). Add a THIRD case: an AGENT referrer on the same path now accrues NOTHING — the new refusal, with the PLAYER case as its control.
- referral-signup.test.mts: migrate wholesale to PLAYER referrers under `FEATURE_INVITE=ACTIVE`. It is the player-prize suite; its AGENT fixtures (:22-28) were a 2026-09-06 workaround for the attribution gate, not the rule. Rewrite that header comment in the same edit or the next reader re-applies the workaround.
- concurrency §F: split it. Keep prize-exactly-once under `FEATURE_INVITE=ACTIVE` with a PLAYER referrer, AND add a commission-under-concurrency case for an AGENT through `onRecruitSettlement` — otherwise the agent programme's real money path ships with no concurrency guard, while the lock at affiliate-service.ts:564 goes unexercised.
- rg-cash-incentive §5: add a migrated HELD-COMMISSION case for a cooling-off AGENT (affiliate-service.ts:584 writes HELD identically), keep the prize case under `FEATURE_INVITE=ACTIVE`, and make the "no reward PAID" assertion non-vacuous by requiring `rewards.length > 0` first.
- Prove each with its red harness AFTER migration, and add the four suite names to the prompt's :159 list with the note that these controls are load-bearing and must be migrated, never relaxed.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the precondition framing, but fix the withdrawn-features half and add what the plan is missing.

1. withdrawn-features §5d/§5e STAY PAIRED ON onRecruitBet; change the control's variable from ROLE to FEATURE STATE. Make §5e's pair a PLAYER referrer identical to §5d's, and wrap only that call in `process.env.FEATURE_INVITE = "ACTIVE"` with a `finally { delete ... }` — the override already used in this file at :131-139 and asserted non-leaking at :143. One variable differs (resolvedState("invite"), feature-state.ts:82-85), which is precisely what referrerMayEarn consults (affiliate-service.ts:369-372). Same hook, same fixture, tighter isolation than the AGENT control, and immune to the agent/prize split because no AGENT appears in it. Do NOT re-point §5e at onRecruitSettlement while §5d stays on onRecruitBet — that leaves §5d with no control on its own path and re-creates the vacuity its comment at :210-215 records.

2. ADD THE CONTROL THE NEW REFUSAL NEEDS. "An AGENT earns no flat prize" is itself a new money refusal with no guard named in either document. Add: approved AGENT referrer, prize config fully enabled (requireDeposit:false, minBetAmountTzs:1_000, as at :219), onRecruitBet → assert zero cash AND no row with type === "PRIZE". Its positive control is step 1 on the same config; without it the assertion passes the day payPrize breaks. This is currently the ONLY guard the §6 double-dip invariant would have.

3. rg-cash-incentive §5 → onRecruitSettlement + COMMISSION, with the setup the proposal omits. The commission window is recruit.createdAt + cfg.commission.windowMonths (affiliate-service.ts:551-554), and once rateFor() lands the rate must come from the agent's own row (approvedAt + commissionPct). An unapproved or rateless fixture agent makes the new refuse-don't-fall-back lookup yield nothing, grossCut <= 0 returns early, and §5 goes green having never reached the RG gate — the same wrong-reason pass its comment at :126-128 exists to prevent. Add a SETUP assertion that a commission really would be payable on this path, mirroring "§5d SETUP · a prize really would be payable on this path" (:218). Keep one prize-path RG case as well, using the FEATURE_INVITE override, so the RG gate is not silently left measuring only one of the two credit paths.

4. All of it in the SAME commit that suppresses the prize, each re-proven with its red harness (delete referrerMayEarn's gate → §5d red; delete the new AGENT-prize branch → step 2 red; delete the RG check in creditInternal → §5 red), harness locked and mutating a copy via KP_SRC (withdrawn-features.test.mts:306).

---

### 🔴 Nothing in the plan suppresses the PLAYER prize for an AGENT referrer — and prize mode is ON by default, paying withdrawable cash

**Severity** critical · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

Decision #3 is "COMMISSION ONLY, no flat signup prize". The build prompt §3 only changes the rate resolver inside the `cfg.commission.enabled` branch of `onRecruitSettlement`. It never touches `payPrize` or `payBonus`.

`onRecruitBet` (affiliate-service.ts:490-514) is gated only by `referrerMayEarn` → `inviteIsLiveFor(role)` → true for AGENT, then `cfg.enabled && cfg.prize.enabled`. `DEFAULT_AFFILIATE_CONFIG.prize.enabled` is **true** (affiliate-config.ts:85) with `amountTzs: 10_000`, `capPerReferrer: 20`, `requireDeposit: true`, `minBetAmountTzs: 20_000`. With the bonus wallet WITHDRAWN, `creditWallet` (affiliate-service.ts:185-197) skips `creditBonus` entirely and lands in `creditInternal` — **real, withdrawable cash**.

So the day the first agent is approved, every recruit who deposits and bets ≥ TZS 20,000 pays that agent a TZS 10,000 flat prize, up to 20 of them = **TZS 200,000 per agent** — twice the TZS 100,000 registration fee, on a prize the authority document says does not exist. Meanwhile commission pays nothing (see the next finding). The programme ships economically inverted.

**Evidence** — src/lib/server/affiliate-service.ts:490-514, :424-468, :185-197; src/lib/server/affiliate-config.ts:85; docs/SESSION-PROMPT-AGENT-BUILD.md:79-95 (§3 touches only the commission branch)

**Proposed handling** — Make §3 explicit: `payPrize` and `payBonus` must return early when the referrer's programme is AGENT, keyed off the same `programme` resolution that stamps `ReferralReward.programme` — not off `cfg.*.enabled`. Add a guard whose red harness deletes the suppression and observes a PRIZE row with `programme=AGENT`. Add to the verification script §3: 'confirm the recruit's first ≥20k bet writes NO prize row.'

**⭐ A verifier disagreed with that handling and proposed:**

Rewrite §3 of the build prompt around ONE resolver rather than scattered early returns.

1. WIDEN THE RESOLVER THAT ALREADY EXISTS. `referrerMayEarn` (affiliate-service.ts:367-370) is the single place all three hooks resolve the referrer. Turn it into `earningPolicyFor(referrerUserId)` returning `null | { programme: "AGENT" | "PLAYER"; account; rate; pays: { commission: boolean; prize: boolean; bonus: boolean } }`. AGENT ⇒ `{ commission: true, prize: false, bonus: false }` and `rate` read from `AffiliateAgent.commissionPct` with NO `cfg.commission.rate` fallback (a missing rate REFUSES — this closes leak #3 in the same object). PLAYER ⇒ the config modes. Then `onRecruitBet` reads `if (!policy.pays.prize) return;`, `onRecruitDeposit`/register read `pays.bonus`, `onRecruitSettlement` reads `policy.rate`. One home for "which programme, what does it pay, at what rate" — the same discipline `ratesFor(market)` enforces, and the only shape in which a fourth reward path added later cannot miss the rule.

2. SUPPRESS ONLY THE REFERRER-SIDE LEG OF `payBonus`. Gate `payTo(opts.referrerUserId, …)` at :419. Leave the `NEW` leg at :418 on the player promo's own rules, so an agent-referred player is never worse off than an organic one. State this in the prompt explicitly — a blanket return reads as the obvious fix and is wrong.

3. SAY WHICH CLOCK DECIDES `programme`, or the two columns will drift. AGENT-PROGRAMME.md §6 rules "decided by the referrer's role at the moment of accrual", but §1 of the prompt also stamps a `programme` on the attribution at bind. A player who referred while a PLAYER and is later approved as an AGENT makes those disagree. Rule it in the prompt: accrual-time policy decides BOTH the payment and `ReferralReward.programme`; the bind stamp is history only, never read for payment. The same `earningPolicyFor` call must supply the value passed to `recordReward`, so the row and the decision cannot differ.

4. REWRITE `scripts/withdrawn-features.test.mts` §5e (:253-263) IN THE SAME COMMIT — do not delete it. It currently asserts an AGENT referrer IS paid on the first-bet PRIZE path, and it is the control that keeps §5d from going vacuous (that exact vacuity was already caught once by the red harness — BONUS-WITHDRAWAL.md §6). Move the control onto the commission path (AGENT referrer paid via `onRecruitSettlement` with a real `operatorFee > 0`) and add the new assertion: the same agent on a ≥20,000 first bet accrues NOTHING and writes NO `PRIZE` row. The build prompt's §7 does not list this file; add it.

5. ASSERT THE DESTINATION, NOT A SUM. §5e's `(balance ?? 0) + (bonusBalance ?? 0) > 0` cannot tell cash from bonus, which is why the bonus-wallet routing above went unnoticed. The replacement must assert `balance` increased AND `bonusBalance === 0` — the same assertion that proves leak #1 fixed.

6. VERIFICATION §3 must also assert NO notification and NO email fire. `payPrize` sends both (:452-467). A "you earned TZS 10,000" message for a prize the authority says does not exist is the Law-3 failure ("silence is not consistency") the withdrawal pass already had to chase in three separate surfaces.

7. RED HARNESS: delete `pays.prize` from the AGENT branch of `earningPolicyFor` and the new §5e assertion must go RED with a `PRIZE` row carrying `programme=AGENT`. A control that only observes "nothing was paid" also passes when the reward path is broken for any reason — pair it with the commission control from (4) in the same run.

**⭐ A verifier disagreed with that handling and proposed:**

The direction (suppress at accrual, keyed off programme, not off `cfg.*.enabled`) is right. Three corrections, in order of consequence.

1 · ⛔ THE PLAN MUST NAME THE SHIPPED CONTROL IT IS ABOUT TO TURN RED. Implementing this suppression makes `scripts/withdrawn-features.test.mts` §5e (:253-263) FAIL — it asserts an AGENT referrer IS paid on `onRecruitBet` at 25,000, i.e. the prize. A build session following the proposal as written meets a red suite and the cheap repair is deleting §5e. That must be forbidden in the prompt: §5e is the control that stops §5d being vacuous, and BONUS-WITHDRAWAL.md:154-160 records that §5d's FIRST version passed green with the gate neutralised for exactly that reason. Re-point §5e instead — same fixture pair, but drive `onRecruitSettlement("w5e_rec", { operatorFee: … })` with an agent rate set, so the control still proves "the reward path works for an AGENT" while §5d proves "it pays nothing for a withdrawn player". Add a matching §5g: the AGENT referrer on `onRecruitBet` at 25,000 accrues ZERO and writes NO row.

2 · DEFAULT-DENY ALLOWLIST, NOT TWO EARLY RETURNS. "`payPrize` and `payBonus` return early for AGENT" is a negative list over today's three reward modes. Add a fourth mode to `affiliate-config.ts` later and it leaks to agents silently — the same half-on shape BONUS-WITHDRAWAL.md §6 records as finding #5. Match the `ratesFor(market)` discipline the prompt already invokes: ONE resolver, `policyFor(referrerUserId)` → `{ programme, allows: ReadonlySet<RewardType>, rate }`, resolved once at the top of each of the three hooks — it has to be resolved there anyway to stamp `ReferralReward.programme` and `rateApplied`. AGENT allows `COMMISSION` only; anything not in the set is refused by default. Then keep a cheap assertion inside `payPrize`/`payBonus` as the narrow waist (both have multiple callers — `payBonus` is called from bindRecruit:326 AND onRecruitDeposit:615, which the finding missed), but as a belt-and-braces `if (!policy.allows.has("PRIZE")) return`, not as the only home of the rule.

3 · 🔴 RESOLVE THE `programme` AMBIGUITY BEFORE WRITING THE GUARD — the plan currently has two conflicting definitions and the proposal inherits the conflict. The architecture brief says `programme` is "stamped at BIND"; AGENT-PROGRAMME.md:154-155 says "the programme is decided by the referrer's role at the moment of ACCRUAL". They disagree for the one user who binds recruits as a PLAYER and is later approved as an AGENT (reachable the day the player promo returns, which is the whole reason this architecture exists). Keying the suppression off the bind-stamp lets that agent keep drawing player prizes; keying it off role-at-accrual retroactively converts historical player attributions to agent economics. Rule it explicitly in the prompt: `ReferralReward.programme` is stamped from the referrer's role AT ACCRUAL (so the ledger records what was actually paid and why), while `User.recruitedBy` stays immutable — and say so in RULES.md §2.10 alongside the fee and the ceiling.

Also add to the verification script, since neither the finding nor §3 covers it: assert the agent's commission lands in REAL balance, not `bonusBalance`. With no `SystemConfig` bonus row on production, `getBonusConfig().enabled && affiliateToBonus` are both TRUE, so today `creditWallet` routes an agent's earnings into a 5×-wagering, 30-day-expiry grant in a withdrawn wallet. That is listed leak #1, but the plan states it as conditional ("if bonus is re-enabled") — it is not conditional, it is the live default, and it should be re-measured against production rather than read from the file.

---

### 🔴 `50PICK-AG-[ID]` codes are truncated to 16 characters at registration and fail SILENTLY — no error, no audit row, attribution simply lost

**Severity** critical · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`src/app/auth/register/actions.ts:20`:
```
const referralCode = String(formData.get("ref") ?? "").trim().slice(0, 16) || undefined;
```
The 16-char cap was sized for the existing player codes (`genCode` produces ≤9, the collision path ≤12 — affiliate-service.ts:60, :84). `50PICK-AG-` is already 10 characters, leaving **6** for `[ID]`. A cuid is 25. The link path goes `?ref=` → hidden form field → this `formData.get("ref")`, so the truncation hits the mandated format on the primary acquisition path.

And it fails invisibly: `bindRecruit` returns `{ bound: false, reason: "invalid_code" }` at affiliate-service.ts:254 with **no audit row** (contrast :281-288, which does audit the withdrawn-referrer refusal). Registration ignores the return. The recruit registers normally, the agent's dashboard shows nothing, and no log anywhere says why. This is not caught by the verification script either — step 3 registers 'a second browser through it' and an engineer seeing no badge would debug the badge, not the truncation.

Neither document mentions a code-length constraint. `AffiliateAgent.code` itself is unbounded text (schema.prisma:844), so the DB will happily store a code the form can never post back.

**Evidence** — src/app/auth/register/actions.ts:20; src/lib/server/affiliate-service.ts:254 (no audit on invalid_code), :60, :84; prisma/schema.prisma:844

**Proposed handling** — Pin the total code length in §1 as a hard constraint, raise the `slice()` cap in the same commit, and specify `[ID]` concretely (see the separate finding). Add an audit row on `invalid_code` so a lost bind is observable. Add to the guard suite: a full-length `50PICK-AG-` code survives the register action round-trip and binds.

**⭐ A verifier disagreed with that handling and proposed:**

The proposed fix is directionally right but, applied as written, leaves the bug live and can make it worse.

Why it is wrong as stated:
a) It patches only `actions.ts:20`. Raising that cap alone changes nothing — `page.tsx:51` still truncates and `page.tsx:194` still withholds the hidden field. The fix must cover both slices AND the swallow.
b) "Raise the cap + specify `[ID]`" invites a cuid, which the uppercase-normalising `findByCode` in both backends makes permanently unresolvable (prisma-dal.ts:1672, store.ts:1184). A 40-char cuid code passes the slice and still never binds.
c) Two hand-copied `slice(0, 16)` constants that must agree with a number written in a doc is exactly the failure shape this repo already paid for (a rung added to the config but not to `cn()`). One source of truth, not three.
d) Auditing every `invalid_code` at affiliate-service.ts:254 aims at a seam this failure never reaches (see reasoning), and `/auth/register?ref=` is public and unauthenticated — an unbounded audit write on attacker-controlled free text feeds the hash-linked, exported audit chain (reports/catalogue.ts:519-550). That is a log-flood vector.

Do this instead:

1. PIN `[ID]` TO THE EXISTING UPPERCASE ALPHABET, NOT A CUID. Specify in AGENT-PROGRAMME.md §8 as a hard constraint: `50PICK-AG-` + 6 chars drawn from `CODE_ALPHABET` = exactly 16 characters. This honours the management-mandated format, keeps the code uppercase so both DAL backends resolve it, keeps it dictatable over WhatsApp/phone (the argument §8 itself makes at :180-183), avoids leaking a database primary key into a public URL, and — the point — fits the existing transport unchanged. 32^6 ≈ 1e9 with the same uniqueness retry loop `ensureAffiliateAccount` already runs.

2. ONE NORMALISER, NOT TWO SLICES. Export `normalizeReferralCode(raw)` and `MAX_REFERRAL_CODE_LEN` from `affiliate-service.ts` (next to `genCode`, so the constraint lives with the minting code) and call it from BOTH `page.tsx:51` and `actions.ts:20`. Delete both literals. If the format ever grows, one edit moves it.

3. FIX THE SWALLOW, WHICH IS THE ACTUAL DEFECT. `page.tsx:194` must not make attribution conditional on whether a ribbon could be rendered. Render the hidden `ref` field whenever `refCode` is non-empty, and keep the ribbon conditional on `referral` (a resolved, eligible referrer). This preserves the deliberate rule at affiliate-service.ts:164-171 — do not promise a reward for a code that will be refused — because the refusal still happens in `bindRecruit`, which is the one place that decides. It also puts the failure back on a path that CAN be observed.

4. OBSERVABILITY ON THE POST PATH ONLY. With (3), an unresolvable code now reaches `bindRecruit`, so audit `invalid_code` at :254 — but only there (registration has actually succeeded, so it is rate-limited by sign-up, not by anonymous GETs), and record the code hashed or truncated to 8 chars rather than raw attacker text.

5. RED-PROVABLE GUARD OVER THE RIGHT POPULATION. The guard must drive the PAGE, not just the action: mint a full-length agent code, request `/auth/register?ref=<code>`, assert the hidden `ref` input carries the code UNTRUNCATED, post it, assert `recruitedBy` is set and `programme=AGENT` is stamped. Prove it red by mutating the mint to a 7-char `[ID]` and, separately, by lower-casing `[ID]` — the second mutation is the one that catches the DAL normalisation trap, and a guard that only tests length will stay green through it.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding at critical; replace the remedy.

1. ONE constant, exported next to the minting code. In `src/lib/server/affiliate-service.ts`, beside `CODE_ALPHABET`/`genCode`, export `export const AGENT_CODE_PREFIX = "50PICK-AG-";` and `export const MAX_REFERRAL_CODE_LEN = 32;` with a comment deriving it: prefix (10) + the concrete `[ID]` §8 must now specify + headroom. Both call sites import it — never a second literal. Same commit, same rule as a tailwind rung landing in `utils.ts`.

2. Fix BOTH truncation points in that commit, page first:
   · `src/app/auth/register/page.tsx:51` — `.slice(0, MAX_REFERRAL_CODE_LEN)`. This is the load-bearing one: it gates `resolveReferralPreview`, the badge, AND whether the hidden `ref` input renders at all.
   · `src/app/auth/register/actions.ts:20` — same constant. It stays a bound (unauth endpoint), just a correctly-sized one.
   A plan step that says "raise the slice cap" without naming page.tsx:51 must not ship.

3. Settle `[ID]` in §8 before the cap is chosen, and do NOT make it a cuid. A cuid is 25 chars, unreadable over WhatsApp and in a support call — the very uses §8 gives as the reason for the format. Mint the ID from the existing `CODE_ALPHABET` pair-consumption routine at 6-8 chars, unique-checked against `AffiliateAgent.code` in the same retry loop shape `ensureAffiliateAccount` already uses (affiliate-service.ts:66-86). Total ≤18. Then set the constant with headroom, not to the exact length.

4. Instrument the branch that is actually silent, not `invalid_code`. In `page.tsx`, when `sp.ref` was non-empty but `resolveReferralPreview` returned null, emit one audit row (`affiliate.ref_link.unresolved`, payload: the code as received, its length, and whether it carried the agent prefix). That single row catches truncation, a revoked agent, and a typo — and it is the moment a real acquisition click was lost. It is bounded by real link traffic, unlike an `invalid_code` audit. Leave `bindRecruit:254` alone; a `no_code`/`invalid_code` audit there instruments a path the form can no longer produce.

5. The guard must be a control that goes RED. Not "register a second browser through it" (the current build-prompt step 3 passes while the badge silently misses). Assert the round-trip on a FULL-LENGTH minted agent code: render `/auth/register?ref=<full 50PICK-AG-… code>` and assert (a) the "Verified 50pick Agent" badge renders, (b) the hidden `ref` input is present carrying the code UNTRUNCATED and byte-identical, then post the action and assert `User.recruitedBy` is set with `programme = AGENT`. Prove the guard by mutation: set `MAX_REFERRAL_CODE_LEN` back to 16 and the guard must fail on (a), (b) and (c) — if it still passes, the guard is asserting its own doc comment.

6. Add it to `docs/AGENT-PROGRAMME.md` §8 as a hard constraint sentence naming the constant, so the next person who changes the code format sees the input bound it must move with. Bound the format and the input in the doc together, or they drift again.

---

### 🟠 The plan's leak list names the master switch but misses `commission.enabled`, which defaults to FALSE — agents earn nothing out of the box

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

Known leak #2 covers `if (!cfg.enabled) return;`. But the commission accrual sits behind a SECOND, per-mode gate: `if (cfg.commission.enabled && cfg.commission.rate > 0)` at affiliate-service.ts:548, and `DEFAULT_AFFILIATE_CONFIG.commission.enabled` is **false** (affiliate-config.ts:83, with the comment "Commission disabled (not in management rules)").

So on a fresh deploy: agent commission accrues **zero**, and the only lever that turns it on is a *player-promo* toggle on `/admin/affiliate`, a `growth`-domain page (roles.ts:239). A compliance officer approving an agent has no way to make them earn.

Worse for verification: the engineer running verification step 3 will hit zero commission, flip `commission.enabled` on in `/admin/affiliate` to make the test pass, tick the box, and ship a build where agent pay depends on a growth officer's toggle. The listed verification cannot distinguish that from correct.

**Evidence** — src/lib/server/affiliate-service.ts:548; src/lib/server/affiliate-config.ts:83, :76; src/lib/server/roles.ts:239

**Proposed handling** — State in §3 that the AGENT accrual path must be reachable with the entire player `AffiliateConfig` at its shipped defaults — `enabled:true, commission.enabled:false` — i.e. the agent branch is resolved before any `cfg.*` gate, not inside it. Guard: run the settlement hook with the default config object and assert a COMMISSION row with `programme=AGENT` appears; red harness = re-introduce the `cfg.commission.enabled` test and watch it go red.

**⭐ A verifier disagreed with that handling and proposed:**

Rewrite §3 as a ROLE-FIRST BRANCH with its own policy source, its own switch, and an independence guard.

1. Branch on programme before any cfg read, per AGENT-PROGRAMME.md §6's invariant ("the programme is decided by the referrer's role at the moment of accrual"). In onRecruitSettlement, after referrerMayEarn (:544) and BEFORE `const cfg = getAffiliateConfig()` (:545):

   if (referrerProgramme === "AGENT") return accrueAgentCommission({...});

   The player path below keeps every cfg.* gate it has today, untouched. State explicitly in §3 that the agent path reads NO field of AffiliateConfig — not `enabled`, not `commission.enabled`, not `rate`, not `windowMonths`, not `capPerRecruitTzs`. That single sentence closes known leaks #2, #3 and #4 as well as this one.

2. Give the agent path a named policy source, not silence. `accrueAgentCommission` reads: rate from AffiliateAgent.commissionPct, gated on approvedAt (not on null — commissionPct defaults to 5.00, so the null test never fires); active from AffiliateAgent.active; window and per-recruit cap from AGENT_COMMISSION_POLICY constants whose numbers live in RULES.md §2.10 in the full Decided / Enforced in / Configured in / Stated to / Guarded by form — the plan's §7 already makes §2.10 "the only legal home" for the ceiling, so put the window and cap there in the same commit rather than leaving them to be invented.

3. Keep a programme-level kill switch, in the compliance domain. Add `AGENT_COMMISSION` to feature-state.ts's PRODUCT_STATE table — the file that already exists precisely so a whole programme can be dark without an operator row being able to reverse it — or a `paused` flag on the agent programme surfaced at /admin/agents (ROUTE_DOMAINS compliance). Not on /admin/affiliate: that is the growth page whose reach is the defect. And per feature-state.ts's own law, gate the OFFER (whether new commission accrues) never the REFUSAL — clawback on settlement reversal must run regardless of the switch, or a paused programme becomes a way to keep money that was reversed.

4. Guard by INDEPENDENCE, not by the defaults. Drive onRecruitSettlement for an AGENT referrer across a hostile matrix of player configs — {enabled:false}, {commission:{enabled:false}}, {commission:{rate:0}}, {commission:{capPerRecruitTzs:1}}, {commission:{windowMonths:1}}, plus DEFAULT_AFFILIATE_CONFIG — and assert the resulting ReferralReward row is IDENTICAL in all six: same amountTzs, programme=AGENT, rateApplied = that agent's own pct. Then the control that must go red: run the SAME matrix with a PLAYER referrer and assert the outcome VARIES across it. Without that second half the matrix could be inert and nothing would say so.

5. Red harness: delete the `programme === "AGENT"` branch and confirm the AGENT matrix goes red at every cell (not just one), and that the PLAYER control stays green. Lock the harness and mutate a copy via KP_SRC, per the prompt.

6. Add to §7's doc work: the corrected framework document and RULES.md §2.10 must state that agent commission is NOT governed by /admin/affiliate, so a growth officer reading that page knows the toggles in front of them do not reach agents.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the fix.

§3 should specify a dedicated `commissionForAgent(account)` that reads the AGENT ROW ONLY — `approvedAt != null`, `active === true`, and an officer-set `commissionPct`, plus an agent-specific window and per-recruit cap — and consults `cfg` for NOTHING. The player promo config governs what we OFFER players; it must not govern what we OWE a fee-paying partner (feature-state.ts: gate the offer, never the refusal).

Three corrections to the proposal:
· Make `commissionPct` nullable on the agent row and DROP the `: cfg.commission.rate` fallback. An approved agent with no officer-set rate must be REFUSED explicitly, with an audit row, not silently paid the schema's undecided 5.00 default (schema.prisma:846) or the player rate. Otherwise this fix turns leak #3 into live payouts.
· Honour `active` and `approvedAt` in the agent branch itself, since hoisting past `cfg` removes the only thing currently stopping a deactivated agent from accruing.
· Carry agent window/cap on the agent row too, or leak #4 survives the hoist unchanged.

Guard it as a MATRIX, not the single default-config case:
1. agent earns at `{enabled:false}` (kills leak #2), at `{commission:{enabled:false}}` (the shipped default — this finding), and at both;
2. agent with `active:false` earns ZERO;
3. agent with no officer-set rate earns ZERO and leaves an audit row — never 5%, never the player rate;
4. rewards stamp `programme=AGENT` and `rateApplied` = the agent's own rate.

Controls that MUST go red:
· a PLAYER referrer earns ZERO in all four config states — proves the hoist did not resurrect the withdrawn promo (this is the inverse control the proposal omits entirely, and it is the dangerous direction: paying a withdrawn programme is a GBT exposure, not just a bug);
· restoring `if (cfg.commission.enabled)` around the agent branch turns cases 1 red;
· deleting the `active` check turns case 2 red;
· restoring the `cfg.commission.rate` fallback turns case 3 red.

Also worth adding to §7: RULES.md §2.10 must state the commission ceiling AND that the agent rate has no default — a rate is set by an officer or it does not exist.

---

### 🟠 `commissionPct` is NOT NULL with a default of 5.00 on a row auto-created for every player — the plan's `!= null` refusal branch is unreachable

**Severity** high · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

The build prompt §3 prescribes:
```ts
return account.approvedAt && account.commissionPct != null ? Number(account.commissionPct)/100 : cfg.commission.rate;
```
But `AffiliateAgent.commissionPct Decimal @default(5.00)` is non-nullable (schema.prisma:846), and `db.affiliate.create` never writes it (prisma-dal.ts:1677-1687), so every row takes 5.00. `commissionPct != null` is **always true** — the branch that leak #3 exists to create can never be taken.

Consequence: `approveAgent` that sets `approvedAt` but leaves the rate unset produces an agent silently earning **5%**, indistinguishable from an officer who deliberately chose 5%. "An agent with no rate is refused" is unbuildable as written.

Compounding this: `AffiliateAgent` is NOT an agents-only table. `ensureAffiliateAccount` lazily creates a row for every user on first touch, including every recruit at bind time (affiliate-service.ts:305, :309). So the table already holds a row per player, each carrying `commissionPct = 5.00`, `active = true`, `tier = 'STANDARD'`. Any "list the agents" query in §5/§6 that does not filter `approvedAt IS NOT NULL` returns the whole player base.

**Evidence** — prisma/schema.prisma:840-853 (esp. :846); src/lib/server/prisma-dal.ts:1677-1687; src/lib/server/affiliate-service.ts:305, :309; docs/SESSION-PROMPT-AGENT-BUILD.md:84-88

**Proposed handling** — §1 must say explicitly: make `commissionPct` NULLABLE and DROP its default in the same migration that drops `tier`, and backfill existing rows to NULL. Then `rateFor` must REFUSE (return null → accrue nothing, write an audit row) rather than fall back to `cfg.commission.rate`. Red harness: an approved agent with a null rate produces zero reward rows and one refusal audit.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the nullability change, add the approval gate, and carry it through both DAL backends. Concretely, four amendments to the build prompt:

1. §1 (schema) — say it explicitly, in the SAME migration that drops `tier`:
   `commissionPct Decimal? @db.Decimal(5,2)` — **nullable, NO default**, and `UPDATE "AffiliateAgent" SET "commissionPct" = NULL` (safe: the prompt itself states all current data is test data and there are no real agents). A rate must be a fact somebody wrote, never a value the database invented.

2. §1 also — extend the DAL type and BOTH backends in the same commit, or the resolver reads `undefined`. `StoredAffiliateAccount` (`store.ts:348-356`) gains `commissionPct: number | null`, `approvedAt: string | null`, `active: boolean`; `toStoredAffiliate` (`prisma-dal.ts:382-391`) maps all three; `affiliate.create`/`update` (`prisma-dal.ts:1677-1702`) and the in-memory backend (`store.ts:1182-1207`) carry them. Without this the fallback is `cfg.commission.rate = 0.5` — **50% of the operator fee** (`affiliate-config.ts:83`) — which is a bigger leak than the 5% one.

3. §2 (`approveAgent`) — GATE THE OFFER. Add "a commission rate is present and within the RULES §2.10 ceiling" to the hard preconditions already listed alongside "approved KYC" and "reconciled fee". An officer cannot approve without pricing the agent; there is no blank-form path to an approved-but-unpriced agent. This is what makes the state unreachable, rather than merely unpaid.

4. §3 (`rateFor`) — keep the branch as a CONTROL, not a fallback, and make it visible:
   - `approvedAt && commissionPct != null` → the agent's own rate.
   - `approvedAt && commissionPct == null` → **refuse**: accrue nothing, write a SECURITY/ADMIN audit row, AND surface it on `/admin/agents` as a standing warning row ("agent X unpriced — N accruals refused"). A refusal only an audit table can see is the same silent failure in a different table.
   - no `approvedAt` → the player-programme path (unchanged).

5. §5/§6 — add one line: agent listings and the sub-ledger MUST filter `approvedAt IS NOT NULL`. Best done once, as `db.affiliate.listAgents()` on both backends, rather than trusting every call site — and note in the prompt that `getAdminAffiliateStats` (`affiliate-service.ts:732`) is the existing unfiltered `db.affiliate.list()` a builder will copy by reflex.

Red harness (three controls, each must go red when the guard is deleted):
  · an approval attempted with no rate is REFUSED (proves the offer is gated);
  · an approved agent forced to `commissionPct = NULL` in the DB produces zero `ReferralReward` rows, one refusal audit, and one visible admin warning (proves the control, not a 5% or 50% silent payout);
  · the agent listing over a fixture of 50 plain players + 1 approved agent returns exactly 1 row.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the nullability change; replace the refusal semantics; add the structural guarantee the proposal omits.

1. MIGRATION (§1, same migration that drops `tier`): `commissionPct` → NULLABLE, DROP DEFAULT, backfill existing rows to NULL. Safe: no reader exists in `src/` and all data is test data. Add `approvedAt`. Then add BOTH fields to `StoredAffiliateAccount` (`store.ts:348`), to `toStoredAffiliate` (`prisma-dal.ts:382`), to the Prisma `create`/`update` (`prisma-dal.ts:1677,:1689`), to the in-memory backend (`store.ts:1189`) and to the entity map in `DATA-LAYER.md:66`. Without this the two backends disagree by construction.

2. MAKE THE UNRATED AGENT UNREACHABLE, don't just survive it. §2 already declares `approveAgent` the sole writer of `UserRole.AGENT`. Make `commissionPct` a REQUIRED parameter of `approveAgent`, and make `approveAgent` the ONLY writer of `approvedAt`. Then "approved with no rate" cannot be constructed, and `rateFor`'s refusal becomes an assertion of last resort rather than a routine path. Validate the RULES.md §2.10 ceiling inside `approveAgent` and the rate-change action (`0 < pct <= ceiling`) — at the service layer, not the admin form. Single-officer approval (decision 9) means this write site is the only control there is.

3. REFUSAL MUST BE VISIBLE AND PAYABLE, NOT A DROPPED EVENT. `return null → accrue nothing` loses the money irrecoverably: `onRecruitSettlement` is idempotent per event, so once it has run and written nothing, setting the rate later cannot replay it — the commission is gone and only a month-end reconciliation would ever notice. Use the mechanism the ledger already has: `StoredReferralReward.status` is `PAID | PENDING | HELD` and the service already writes HELD when it cannot safely pay (`payBonus({held: suspectIpOverlap})`). On an approved agent with a NULL rate, write a HELD `ReferralReward` with `programme=AGENT`, `rateApplied=null`, `amountTzs=0`, recording the operator fee — plus the SECURITY/ADMIN audit row. The debt is then visible in the officer's own sub-ledger (§6) and settleable once a rate exists. Refuse to PAY, never refuse to RECORD.

4. ONE DEFINITION OF "IS AN AGENT". Add `db.affiliate.listAgents()` filtering `approvedAt IS NOT NULL AND active` in both backends, and make §5/§6 — and `getAdminAffiliateStats` (`affiliate-service.ts:732`) — use it. Do not let each surface remember the predicate; `affiliate-service.ts:277` already warns this seam "must not grow a SECOND definition".

5. RED HARNESS, ON THE PRISMA BACKEND (in-memory would go green on the bug): (a) approved agent, NULL rate → zero PAID rows, one HELD row, one audit row; (b) the control that must go RED — restore the `@default(5.00)` and the assertion in (a) must fail; (c) `approveAgent` cannot be called without a rate (type-level) and rejects a rate above the §2.10 ceiling; (d) `listAgents()` over a fixture of 50 players + 1 approved agent returns exactly 1.

---

### 🟠 `deactivateAgent` and the `active` column are never wired into eligibility — the code itself asks for this and the plan does not answer

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

`affiliate-service.ts:275-277` states the requirement outright: *"`AffiliateAgent.approvedAt` / `.active` arrive with the agent-application service; when they do, this predicate gains them — it must not grow a SECOND definition of 'may refer' somewhere else."*

The build prompt lists `deactivateAgent` among the service functions (§2) and "bring `commissionPct` and `active` to life" (§1), but never says what deactivation does to eligibility. Eligibility today is `inviteIsLiveFor(role)` — a **pure, synchronous, role-only** function (feature-state.ts:95-104) threaded as booleans from the shell (app-shell.tsx). It cannot see `active` or `approvedAt` without a DB read.

So two competent engineers ship different products:
· A sets `active=false` and leaves `role=AGENT` → the deactivated agent keeps binding new recruits, keeps accruing commission, keeps `/profile/invite`. Termination is cosmetic.
· B flips the role back to PLAYER → deactivation works, but this contradicts the plan's own "Approval is the only place `UserRole.AGENT` is ever assigned" framing and silently kills every earlier attribution's payments.

The verification script never deactivates anyone, so neither outcome is detected.

**Evidence** — src/lib/server/affiliate-service.ts:275-277, :367-370; src/lib/feature-state.ts:95-104; docs/SESSION-PROMPT-AGENT-BUILD.md:55, :69-70

**Proposed handling** — Decide and write it down: deactivation sets `active=false` AND the eligibility predicate becomes an async `referrerMayRefer(userId)` reading role + `approvedAt` + `active` from the one place, with `inviteIsLiveFor` kept only for the synchronous shell-visibility question. Add to verification: deactivate an agent, confirm (a) a new registration on their link does not bind and audits the refusal, (b) a settlement on an existing recruit accrues nothing.

**⭐ A verifier disagreed with that handling and proposed:**

Decide it in the AUTHORITY first, then wire one predicate in the right layer, then prove it with a control.

1. DECIDE IT WHERE DECISIONS LIVE. Add `DEACTIVATED` to the `AGENT-PROGRAMME.md` §2 lifecycle table (it is a state, and §2 is where states are enumerated) with the ruling spelled out: deactivation sets `AffiliateAgent.active = false`; `role` STAYS `AGENT` (flipping it back contradicts §10 "Approval is the only place `UserRole.AGENT` is ever assigned" and would `notFound()` the agent out of their own earnings history at `profile/invite/page.tsx:130`); `approvedAt` is NOT cleared, because it is the record that approval happened. Say explicitly what deactivation does and does not stop: it stops NEW binds and ALL FUTURE accrual on existing recruits; it does NOT touch commission already credited, and it does NOT block withdrawal — that is already safe, since commission lands as real wallet cash and withdrawal gates on KYC `approvedAt` (EVER approved), so no code change is needed there. Add the same line to §10's non-negotiables and to SESSION-PROMPT-AGENT-BUILD.md §2 beside `deactivateAgent`.

2. ONE PREDICATE, IN `affiliate-service.ts`, NOT IN `feature-state.ts`. Leave `feature-state.ts` pure, synchronous and role-only — it is the PRODUCT-STATE layer, and five render sites plus `app-shell.tsx:183` depend on it being sync. Widen the existing async `referrerMayEarn` (`:367-370`) into the single eligibility predicate and have it COMPOSE the seam rather than replace it:

   async function referrerMayRefer(userId): Promise<{ok: true} | {ok: false; reason: "withdrawn"|"not_approved"|"deactivated"}>
     — user row → `inviteIsLiveFor(user.role)` (unchanged product/role question)
     — if role is AGENT → also load the `AffiliateAgent` row and require `approvedAt != null && active === true`.

   Route ALL FOUR money/promise surfaces through it, deleting the inline role check at `:280`: `bindRecruit` (:280), `onRecruitBet` (:495), `onRecruitSettlement` (:544), `onRecruitDeposit` (:610) — AND `resolveReferralPreview` (:165), which the finding omits and whose own comment at :157-163 requires it ("the ribbon is a promise, so it obeys the same gate as the bind"). Update the comment at `:275-277` in the same commit so it no longer asks for work that is done.

3. LEAVE THE RENDER SITES ON THE SYNC PREDICATE, DELIBERATELY, AND SAY WHY. A deactivated agent should still reach `/profile/invite` read-only to see history and withdraw — but the page must render the deactivated state and must NOT display a live link, code or QR. Otherwise the product hands out a link that `bindRecruit` will refuse, which is the same promise/refusal split. This is a one-line prop from the page's own agent-row read, not a second definition of eligibility.

4. DEFENCE IN DEPTH IN `rateFor`. Amend the plan's resolver (SESSION-PROMPT-AGENT-BUILD.md:84-89) to require `active` as well as `approvedAt`, and — per the already-known leak #3 — to REFUSE rather than fall back to `cfg.commission.rate`. With the gate upstream this should be unreachable; if it is ever reached, refusing pays nothing instead of silently paying a deactivated agent the player rate.

5. BOTH DAL BACKENDS. `AffiliateAgent` has no accessor in either store today. Add `db.agent.findByUserId` to memory AND Prisma plus the `DATA-LAYER.md` entity map, or the memory-backed guards physically cannot see `active` and the whole suite goes green while blind.

6. VERIFY WITH A CONTROL THAT MUST GO RED — this repo has already been burned by exactly the proposed shape. `scripts/withdrawn-features.test.mts:212-215` records the first §5d passing with `referrerMayEarn` NEUTRALISED because the config could not pay on that path anyway. So the new `agent-application-security` section must be, in order, on ONE configured-to-pay path:
   · CONTROL FIRST — an ACTIVE approved agent: a registration on their link BINDS, and a settlement ACCRUES a non-zero commission stamped `programme=AGENT` with their `rateApplied`. If this does not pay, the section is vacuous and must fail loudly.
   · Then deactivate that same agent and re-run both: the bind is refused with an `affiliate.bind.refused_*` audit row naming reason `deactivated`, and the settlement accrues NOTHING.
   · A red harness that neutralises the `active` check specifically and proves BOTH refusals flip to passing — a harness that only proves the role check still works has not tested this line.
   · Assert `role` is still `AGENT` after deactivation, so a future refactor cannot quietly implement option B.
   · Drive the ribbon too: `/auth/register?ref=<deactivated agent code>` renders no invited-by ribbon and no "Verified 50pick Agent" badge.

**⭐ A verifier disagreed with that handling and proposed:**

Decide it in the authority first, then wire ONE predicate — do not split.

1. Write the rule into `AGENT-PROGRAMME.md` (a new §5b, and a row in the §2 lifecycle table), because this is Ali's call, not a test's: **deactivation never touches `UserRole`.** Role is identity (it is what makes the historical sub-ledger, the paid-rewards history and read-only `/profile/invite` resolvable); `active` is permission. `approvedAt` stays set forever — same asymmetry as KYC, where withdrawal asks "ever approved" so re-verification cannot freeze money already earned. Add the non-negotiable beside :217: *"Approval is the only place `UserRole.AGENT` is assigned, and deactivation is the only place it is withdrawn — by clearing `active`, never by re-writing the role."*

2. Put the account-aware answer in `feature-state.ts` beside the role one, so there is still exactly one module that answers "may refer" — honouring `affiliate-service.ts:277` in letter. Keep `inviteStateFor(role)` / `inviteIsLiveFor(role)` as the explicitly-named PRODUCT-STATE layer (is this feature part of the product for this role at all), and add `export async function referrerMayRefer(userId)` that composes it with the agent row: role live AND (role !== "AGENT" OR (`approvedAt` set AND `active`)). This keeps `scripts/withdrawn-features.test.mts:49` — the control pinning `inviteIsLiveFor("AGENT") === true` — meaningful instead of breaking it.

3. Convert **all seven** call sites, not two: `affiliate-service.ts:165` (the ribbon/badge), `:280` (bind), `:369` (`referrerMayEarn` — collapse it into `referrerMayRefer`), `profile/invite/page.tsx:130`, `app-shell.tsx:183`, `profile/page.tsx:285`, `achievements.ts:43`, `markets/[id]/page.tsx:192` and `positions/page.tsx:59`. Every one is already async. A deactivated agent must stop being OFFERED the link, not merely be refused behind it.

4. ⛔ Do NOT gate the payout of anything already accrued. `referrerMayRefer` decides new binds and new accrual only; the HELD-reward retry path and every read model (`getPlayerReferralSummary`, `/admin/affiliate`, `house-ledger`) stay ungated, or deactivation strands money the ledger says we owe. State this in the same §5b sentence.

5. Add `active` and `approvedAt` to `StoredAffiliateAccount`, to `toStoredAffiliate`, to the `db.affiliate.update` patch map in BOTH backends, and to the entity map in `DATA-LAYER.md` — today `active` is unwritable through the DAL (`prisma-dal.ts:1690-1700`), so `deactivateAgent` would silently no-op. Also add `&& account.active` to the plan's own `rateFor` at `SESSION-PROMPT-AGENT-BUILD.md:84-89`.

6. Verification, WITH THE CONTROL the proposal omits (the plan's own trap at :182 — a guard that chooses its own population cannot fail). Deactivate agent A, keep agent B active, then run the identical script against both links: (a) B binds, A audits `referrer_not_eligible`; (b) a settlement on B's existing recruit accrues at B's `rateApplied`, on A's existing recruit accrues nothing; (c) A's `/profile/invite`, nav entry, and market/position share links show NO code, while B's do; (d) `/auth/register?ref=<A's code>` renders no "Verified 50pick Agent" badge; (e) a reward already `HELD` for A still retries and pays. Then re-activate A and confirm every one of those flips back — a deactivation that cannot be undone is a different bug.

---

### 🟠 `/agent/apply` and `/agent/status` are not edge-protected, and the plan never mentions `proxy.ts`

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

`src/proxy.ts:30` holds `PROTECTED_PREFIXES = ["/wallet", "/positions", "/profile", "/watchlist", "/proposals/new", "/updown/history", "/admin"]`, matched by prefix at :31-33. Its header comment defines the policy: "Private, user-scoped surfaces get edge protection (defence-in-depth on top of each page's own session check)".

`/agent/apply` and `/agent/status` are exactly that — they carry a CV, a formal letter, a Serikali ya Mtaa letter, and **two referees' national identity documents** plus a bank receipt. Neither document mentions `proxy.ts` anywhere.

The URL shape the plan chose makes this an unavoidable special case: adding `/agent` to the list would gate the public discovery door (decision #8) behind login, so the builder must add two sibling entries. A builder who adds one entry `/agent` breaks the public page; a builder who adds none leaves the applicant surfaces without the edge guarantee every other private surface has. There is no third obvious reading.

**Evidence** — src/proxy.ts:26-33; docs/SESSION-PROMPT-AGENT-BUILD.md:96-105

**Proposed handling** — Add to §4: 'Register `/agent/apply` and `/agent/status` — and NOT `/agent` — in `PROTECTED_PREFIXES` (`src/proxy.ts:30`). A single `/agent` entry closes the public door.' Add a guard asserting an unauthenticated GET of `/agent` is 200 and of `/agent/apply` is a 307 to `/auth/login`.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the proxy edit exactly as proposed; replace the guard half.

1. §4 of `docs/SESSION-PROMPT-AGENT-BUILD.md` gains: "Register `/agent/apply` and `/agent/status` — as two sibling entries, NOT `/agent` — in `PROTECTED_PREFIXES` (`src/proxy.ts:30`). `isProtected` (:31-33) matches by `startsWith(p + "/")`, so a single `/agent` entry closes the public discovery door decision #8 opened. What the edge entry buys is a clean 307 STATUS: the root `loading.tsx` Suspense boundary means a page-level `redirect()` cannot change a status already streamed as 200 (`proxy.ts:40-50`)."

2. Do NOT write a new guard. Extend the existing one: `/agent` into `PUBLIC` (`scripts/routing-audit.mjs:32`), `/agent/apply` and `/agent/status` into `PLAYER_PROTECTED` (:39). One list to add to, not a new file.

3. A gate not in the pipeline is not a gate. `routing-audit.mjs` has no npm script and sits in `scripts/orphan-allowlist.json:210`. Add `"test:routing": "node scripts/routing-audit.mjs"` to `package.json`, drop the allowlist entry, and name `test:routing` in the plan's "Then measure" list — otherwise the entries are decoration.

4. The control that must go red: delete `/agent/apply` from `PROTECTED_PREFIXES` in the locked `KP_SRC` copy and `test:routing` must FAIL. This only works if the assertion reads the STATUS, the way `routing-audit.mjs:27-30` does (`maxRedirects: 0`, then `code === 307`). Note the anti-pattern already in the repo: `scripts/affiliate-sprint4-security.mjs:22-23` asserts on the FINAL URL (`/\/auth\/admin/.test(ap.url())`), which passes with the edge gate removed because the page-level redirect still lands on the login — that check cannot detect a missing prefix. Do not copy it.

5. While the list is open, decide `/notifications` explicitly — it is private, user-scoped and unlisted in both `proxy.ts:30` and `routing-audit.mjs:39`. Either add it or record why it is exempt, rather than leaving a silent third exception beside two new entries. Small, in-scope, and it stops the next auditor re-finding it.

6. Do not put an ownership check for the applicant's own documents in the proxy — the edge cannot read the DB. That belongs in the API handler, matching every other `/api/*` route.

**⭐ A verifier disagreed with that handling and proposed:**

The proposed fix is correct and idiomatic — two sibling entries, never a bare `/agent`, is precisely how `/proposals/new` and `/updown/history` are already handled, and it introduces no new problem. Adopt it. Two changes make it stronger:

1. THE GUARD MUST BE A PIPELINE GATE, NOT A LIVE ASSERTION. As proposed ("assert an unauthenticated GET of /agent is 200 and /agent/apply is a 307") it is a live drive, which this platform's law says is verification but not a gate — a gate not in the pipeline is not a gate. Put it in the planned `agent-application-security` suite as a source-level check that reads `src/proxy.ts`, parses `PROTECTED_PREFIXES`, and asserts both `/agent/apply` and `/agent/status` present AND the bare `/agent` absent. Its red harness proves BOTH directions: delete `/agent/apply` from the list → red (surface unguarded); add `/agent` → red (public door closed). A control that only goes red one way would pass while decision #8 was broken. Keep the unauthenticated curl of all three URLs as the live verification step — green is not verification.

2. MEASURE THE POPULATION, DON'T HARDCODE TWO STRINGS. Two literals fix this instance and let the next private route repeat it. I measured the discriminator and it is clean: enumerate `src/app/**/page.tsx` whose no-session branch calls `redirect(".../auth/login"|"/auth/admin")` and assert each path is covered by the same `isProtected()` predicate. Today that yields 19 pages, all covered, with exactly one allowlisted exception — `src/app/proposals/page.tsx:82`, which redirects only when `?f=mine`, so the path itself is genuinely public. Write the guard with that single documented exception and it (a) is red on the current plan before a line is written, (b) closes the whole class rather than this instance, and (c) needs no maintenance when `/agent/apply` lands. Do NOT extend it to `src/app/api/**`: no `/api/*` prefix is in the list today, not even `/api/admin`, because API routes are not Suspense-wrapped and return a real 401 from their own check. Applying the rule there would be a false positive across dozens of routes.

One scope note for §4 of the build prompt: `/admin/agents` and `/admin/agents/[id]` are already covered by the existing `/admin` prefix, and `:193` correctly routes them to `/auth/admin` rather than `/auth/login` — no new entry, and the builder should not add one.

---

### 🟠 "Linked from the footer" and "no entry point inside the player account" are the same instruction and they contradict each other

**Severity** high · **Kind** compliance · ⭐ **FIX DISPUTED**

§4 of the build prompt, two lines apart: "⭐ This is the discovery door... Linked from the footer. ⛔ **No entry point inside the player account** — the platform does not ask its own players for TZS 100,000."

`PublicFooter` is rendered by `app-shell.tsx:236`, unconditionally, outside any session check — its own header says "Unified public footer. Visible on every player-facing page." A logged-in player sees it on `/wallet`, `/profile`, `/markets`, everywhere. Putting the `/agent` link in the footer therefore *is* an entry point inside the player account, on the wallet page, which is the most sensitive place for it.

The verification script bakes the contradiction in rather than catching it: step 4 asks the tester to confirm "`/agent` is reachable from the footer" AND that an ordinary player "still finds nothing about invites or bonuses anywhere" — a tester can tick both because 'invites/bonuses' and 'the agent programme' read as different things.

**Evidence** — docs/SESSION-PROMPT-AGENT-BUILD.md:98-102, :152-154; src/components/layout/app-shell.tsx:236; src/components/layout/public-footer.tsx:2 ("Visible on every player-facing page")

**Proposed handling** — Resolve it as a decision, not a wording tweak. Either (a) the footer link is session-gated off — `PublicFooter` already takes `proposalsState` as a prop from the shell, so it can take `agentLinkVisible={!session}` the same way; or (b) Ali rules that a neutral footer link is not solicitation, and the prompt says so explicitly so nobody re-opens it. Whichever: add it to the guard that measures what a logged-in PLAYER can see.

**⭐ A verifier disagreed with that handling and proposed:**

Resolve it by SURFACE CLASS, not by session — then measure it with the mechanism the repo already has.

1 · THE RULING, AND IT BELONGS IN THE AUTHORITY. Add it to `docs/AGENT-PROGRAMME.md` §7 ("What the player sees"), which already rules on the footer for RG messaging at line 168 — not to the build prompt, which then cites it. Wording: "The footer is regulator/legal chrome (18+, licence, helpline, GDPR rights), not a promotional surface. ONE neutral directory line — the page's name, no price, no earnings verb, no badge — is not solicitation. What §4's ⛔ forbids is a PROMOTIONAL entry point: a nav item, an avatar-menu row, a banner, a card on /wallet or /profile, a notification, an email, or an assistant answer. A logged-in applicant must be able to find the door back to /agent/status; hiding the link on login strands a person who has already paid TZS 100,000."

2 · THE GUARD, MODELLED ON §7 THAT ALREADY EXISTS. `scripts/withdrawn-features.test.mts:294+` already runs a POSITIONAL coverage rule over the literal `"/profile/invite"` with a `NOT_ENTRY_POINTS` set carrying a staleness check, a `§6.0 CONTROL` on population size, and `KP_SRC` so the red harness mutates a copy. Add a §9 in the same suite (⛔ not a second suite — that file's own header says two guards over one withdrawal is how a stale one is produced), asserting over the same tree:
  · `"/agent"` appears in EXACTLY ONE player-facing linker and it is `src/components/layout/public-footer.tsx`. Any second one fails by name.
  · Its footer line is a plain `FooterLink` in an existing column — no `ProposalsStateBadge`, no gilt/`accent` class.
  · The `t.footer.*` key it renders contains no digits, no currency token and no earnings verb, in ALL THREE locales (en/sw/zh — check the dict, not the component; `test:i18n` already owns parity but not vocabulary).
  · No `comms-registry.ts` emitter and no chatbot prompt/citation path mentions the programme to a PLAYER (`src/lib/chat/send-message.ts` is already noted in §7's exemption list as having stopped citing a door most askers cannot open — the same reasoning applies here and must be asserted, not assumed).
  · CONTROL THAT MUST GO RED: extend `scripts/red-withdrawn-features.mjs` (it already exists and already copies the tree via `KP_SRC` — the payout-gate incident is why) with two mutations: inject an `/agent` card into a `src/app/wallet` file, and swap the footer copy key for one containing "100,000". Each must fail BY THE NAMED SECTION, not merely exit non-zero.

3 · FIX THE VERIFICATION STEP so it cannot be ticked both ways. Replace prompt:152-154 with a measurement: "Signed in as an ordinary PLAYER, run a page search for 'agent' / 'wakala' on /wallet, /profile and /markets. The ONLY hit is the footer directory line. It carries no price, no badge and no earnings verb. Then ask the assistant about becoming an agent and confirm it does not pitch. Confirm by search, not by impression."

4 · SEPARATELY, AND IT IS THE REAL GAP THIS EXPOSED: `inviteVisible` is `inviteIsLiveFor(role)` and a pending applicant is still `PLAYER`, so prompt:106-107's "/profile/invite … while pending, their application status" is currently UNREACHABLE — no nav surface renders it for them. Decide the pending applicant's route to `/agent/status` explicitly (either widen the shell's resolution to `inviteVisible || hasOpenAgentApplication`, or route status from the footer link itself), or that person is stranded whichever way the footer question is settled.

**⭐ A verifier disagreed with that handling and proposed:**

Do NOT session-gate. Three moves, in the same commit:

1. SCOPE THE LINE, AND RECORD THE RULING IN THE AUTHORITY. Rewrite `docs/SESSION-PROMPT-AGENT-BUILD.md:101-102` to say what it means: "⛔ No entry point in the player's OWN surfaces — no wallet card, no top-bar or bottom-nav item, no avatar-menu row, no assistant mention, no email or push. The footer link is the single deliberate exception." Then add the discovery decision to `docs/AGENT-PROGRAMME.md` §7, which today has no discovery section at all — that is the real gap. Give it the reason so nobody reopens it: the footer is regulatory chrome (18+, licence, helpline, PDPA) and already carries `/proposals`, a cash-earning offer, to logged-in players; a neutral link to a vetted business-partner page is not player solicitation.

2. GUARD THE ENUMERATED SURFACE LIST, NOT THE SESSION. This is the salvageable half of the proposal, but pointed at the right population. `scripts/withdrawn-features.test.mts` §3's own header warns it is a SOURCE-level check and "must never be described as" a rendered-page sweep; grep confirms neither it nor `rg-cash-incentive.test.mts` mentions the footer or app-shell at all. Add a section asserting `/agent` appears in `public-footer.tsx` and in NONE of `top-app-bar.tsx`, `bottom-nav.tsx`, `avatar-menu.tsx`, or the assistant copy — with a CONTROL that must go red: add `/agent` to `avatar-menu.tsx`'s `MENU_ROWS` and the suite must fail. That measures the decision actually taken; `!session` would measure nothing, since a signed-out visitor is not the population anyone was worried about.

3. RAISE THE EDGE THE FINDER MISSED, SEPARATELY. `scripts/rg-cash-incentive.test.mts:1-19` records that cash-incentive paths must be suppressed for COOLED_OFF players (GLI-19 / LCCP SR 3.4), stressing that cooling-off — not self-exclusion — is the population that matters, because `coolOff` leaves the wallet ACTIVE. No UI component consults `COOLED_OFF`. So a cooling-off player sees the footer's earning links today. If Ali wants marketing suppression, THAT is the rule to write, and it must cover `/proposals` as well as `/agent` — a `!session` special case for `/agent` alone would leave the larger exposure untouched while looking solved.

---

### 🟡 AGENT-PROGRAMME.md asserts three times that rates live in `RULES.md` §2.10 — §2 stops at 2.9

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

The authority document states as present fact, in three places:
· :8 "Rates live in [`RULES.md`](RULES.md) §2.10 and nowhere else."
· :83 "TZS 100,000 — stated in `RULES.md` §2.10, nowhere else"
· :124 "bounded by a ceiling in `RULES.md` §2.10"

`docs/RULES.md` §2 runs 2.1 through **2.9** (headings at :65, :111, :118, :136, :187, :249, :293, :300, :310). There is no §2.10. The build prompt §7 correctly says to *create* it — but the authority already speaks in the past tense about it, and the authority is what a later session reads first.

This is the failure mode `feature-state.ts:75-79` records in this very repo: a comment named `scripts/reenablement.test.mts` as evidence a guard existed, and an audit found no such file had ever existed on any branch. "A comment that cites a guard by name is read as evidence the guard exists — so it must name one that does." The same rule applies to a document citing a rule section.

Related: `RULES.md` §7 is "KNOWN DUPLICATES — rates written inline that could not be made data-driven". The claim "nowhere else" is unverified until the TZS 100,000 and the ceiling either appear there or are proven absent from source.

**Evidence** — docs/AGENT-PROGRAMME.md:8, :83, :124; docs/RULES.md headings §2.1–§2.9 at :65,:111,:118,:136,:187,:249,:293,:300,:310; §7 at :442; src/lib/feature-state.ts:75-79

**Proposed handling** — Either write §2.10 before the build starts, or mark those three lines as forward references ('will live in §2.10, created by this programme'). Then extend `test:integrity` (or the §7 duplicates list) to assert the two numbers appear in exactly one place in `docs/` and zero places in `src/`.

**⭐ A verifier disagreed with that handling and proposed:**

Three moves, in this order, none of them a numeric-occurrence counter.

1. WRITE §2.10 NOW, BEFORE THE BUILD, MARKED ⏳ LANDING — do not soften the three citations. RULES.md is explicitly built to hold decided-but-unlanded rules (:19-24). Add "### 2.10 · Agent registration fee and commission ceiling" after §2.9 (:310, before "## §3" at :388) in the full Decided / Enforced in / Configured in / Stated to / Guarded by form, with a ⏳ LANDING marker naming what remains, plus a row in the ROLL-OUT STATUS table (:26-36). This makes AGENT-PROGRAMME.md:8/:83/:124 TRUE immediately at zero build risk, and it is strictly better than the alternative offer of "mark them as forward references": a forward reference still leaves the number homeless while somebody writes code against it.

2. THIS FORCES ALI'S RULING ON THE CEILING, WHICH IS THE REAL GAP. §2.10 cannot be written without a ceiling value, and there is none anywhere. Surface that as a blocking question before the build starts rather than letting the builder pick one — a commission ceiling is a money rule, and RULES.md §5 (:416) requires "Ali decides, in writing" then COMPLIANCE-DECISIONS.md, then this file, then code, in that order. Writing §2.10 first is what runs §5 in the correct sequence.

3. GUARD THE GENERAL DEFECT, NOT THE TWO NUMBERS. Add to scripts/content-integrity.test.mts (test:integrity, which IS in predeploy at package.json:191) a citation-resolution check: every "RULES.md §N.M" reference appearing anywhere in docs/*.md, CLAUDE.md, README and src/ comments must resolve to a real heading in docs/RULES.md. Trivially implementable (parse RULES.md's "### N.M ·" headings into a set, regex the citers), it has an obvious positive control in the same run per this repo's law — point it at a fabricated §2.99 and require a catch — and it catches the NEXT dangling citation, not just this one. That is the actual failure class feature-state.ts:75-79 records.

WHAT NOT TO DO: do not add a "TZS 100,000 appears once" or "0% in src/" assertion. If a duplicate guard is still wanted for the ceiling specifically, the ceiling is a PERCENTAGE and scripts/rate-copy.test.mts's existing RATE_PATTERNS already catch a bare percentage in any player-facing dictionary string — so the correct action is to add test:rate-copy to the predeploy chain (it is currently absent), not to write a second scanner beside it.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the diagnosis, replace the remedy.

1) Do NOT write §2.10 ahead of the build (it would have to cite a service, a config key and a guard that do not exist). Instead fix the three lines so they name the ABSENCE, not just the destination — the pattern feature-state.ts:73-76 established. E.g. at AGENT-PROGRAMME.md:8: "Rates will live in `RULES.md` §2.10, written by this programme in the same commit as the code. ⚠️ §2 stops at **2.9** today — if you are reading this and §2.10 does not exist, the numbers are UNRECORDED and the build is not done." Same treatment at :83 and :124. This is the only edit that is legal before the build.

2) Write §2.10 in the SAME commit as the code, config and guard, in the full §2 form, per RULES.md §5 steps 4-5 — guard proven RED first with a positive control.

3) Split the two numbers, because they are different kinds of rule:
   - TZS 100,000 fee — an out-of-band business receipt that never touches the ledger (AGENT-PROGRAMME.md:88), so it has no money-path enforcement. Home: one named constant it is displayed from; guard: extend the EXISTING scripts/rate-copy.test.mts so a hardcoded "100,000"/"100000" in any dictionary string fails, carrying its own positive control the way §7 (:442-450) describes.
   - The commission ceiling — must be a named constant in src beside `PLATFORM_MAX_STAKE` (src/lib/payout.ts:168), e.g. `AGENT_COMMISSION_MAX_PCT`, validated by the officer's rate control so an officer cannot configure past it. Guard it with a control that SETS a rate above the ceiling and must be REFUSED — a red control, not a text-occurrence count. Never assert "zero places in src/" for this number; §2.3 makes the in-source constant the definition of the rule.

4) Keep the doc-integrity half, but as a LINK check rather than a number count — and this one can be written and proven RED today, before the build: add a rule to scripts/content-integrity.test.mts asserting that every `RULES.md §N.M` citation anywhere under `docs/` resolves to a heading that actually exists in docs/RULES.md. Positive control: the three current AGENT-PROGRAMME.md citations must FAIL it until §2.10 is written (or until they are reworded as forward references with a syntax the checker exempts, e.g. "will live in"). That catches this defect and every future instance of its class, which a per-number count cannot.

5) While in package.json: `test:rate-copy` (:614) is absent from the `predeploy` chain (:191). It runs under `test:all` via the dynamic enumeration in scripts/test-all.mjs:43-45, so it is not dead — but if the TZS 100,000 is going to be entrusted to it, add it to `predeploy` in the same pass so the deploy gate actually runs it.

---

### 🟡 `schema.prisma:398-443` is cited as the raw-SQL partial-index exemplar; those lines are prose, and the real exemplar is a migration file

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

Build prompt §1: "Partial unique indexes in raw SQL like the KYC ones (`schema.prisma:398-443`)". Line 398 lands inside the `approvedAt` money-trap comment on `KycSubmission`; the index discussion is a `//` comment block starting around :414 explaining that these indexes are **"not expressible here"**. An engineer following the pointer finds an explanation of why the pattern is absent from that file, not the pattern.

The actual working example — `CREATE UNIQUE INDEX ... WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'` — is `prisma/migrations/20260820120000_kyc_identity_document/migration.sql:70-77`. The schema comment block also records the load-bearing detail the plan needs and does not repeat: these are hand-written DDL in a migration, and Prisma will not drift-check them.

**Evidence** — prisma/schema.prisma:412-416 ("ALSO ON THIS TABLE, but not expressible here"); prisma/migrations/20260820120000_kyc_identity_document/migration.sql:70-77; docs/SESSION-PROMPT-AGENT-BUILD.md:61-62

**Proposed handling** — Re-point the citation at `prisma/migrations/20260820120000_kyc_identity_document/migration.sql:70-77`, and add the companion instruction the KYC block earned the hard way: mirror the index into a `//` comment on the model in `schema.prisma`, because nothing in Prisma will tell the next reader it exists.

**⭐ A verifier disagreed with that handling and proposed:**

Replace `docs/SESSION-PROMPT-AGENT-BUILD.md:61-62` with a two-ended citation plus the convention, and drop the live-table ceremony as not applicable:

> Partial unique indexes cannot be expressed in the Prisma DSL, so they are hand-written DDL in the migration. Working exemplar: `prisma/migrations/20260820120000_kyc_identity_document/migration.sql:75-77` (and the fingerprint twin at `20260821140000_kyc_identity_fingerprint/migration.sql:72-74`). Here: one active application per user, `WHERE status <> 'REJECTED'`, so a rejected applicant can re-apply.
>
> ⛔ Mirror it into a `//` comment on the model in `prisma/schema.prisma` beside the `@@index` lines — the convention `KycSubmission` set at `schema.prisma:418-450`, and stated as law in `20260731120000_kyc_nida_active_unique/migration.sql:10`. `prisma migrate deploy` does NOT drift-check (`schema.prisma:436`), so nothing in Prisma will ever tell the next reader this index exists. The comment is the only record.
>
> ⚠️ Do NOT copy the `CONCURRENTLY`-by-hand-on-prod note from the KYC migrations. That exists because those indexes landed on a populated live table. `AgentApplication` is new and empty (`§ "no real agents yet"`), so the plain `CREATE UNIQUE INDEX` in the migration is the whole story. Keep `IF NOT EXISTS` for re-run safety.

Two extras worth folding in while this line is being touched, both cheap and both about controls that must be able to go red:

1. Name the predicate explicitly against the enum. `WHERE status <> 'REJECTED'` is only correct if `AgentApplicationStatus` has exactly one terminal-and-freeing state. The prompt's own state machine (`Draft → KYC_Submitted → Payment_Pending → Under_Review → Approved/Rejected`) means an APPROVED application must ALSO not block — an approved agent who is later deactivated and re-applies would collide. Decide it in the prompt, not in the migration: either `WHERE status NOT IN ('REJECTED')` and rely on `approveAgent` being terminal, or `NOT IN ('REJECTED','APPROVED')`. As written the prompt leaves the engineer to guess, and the guess is enforced by the database.

2. Require a control that goes red. Per the platform's standing rule, the index is worthless unless something proves it: a test that inserts a second non-rejected `AgentApplication` for the same `userId` and asserts a unique violation, plus one that inserts after a REJECTED and asserts success — the shape `test:kyc §2d` already uses for the KYC tuple. Without it, a migration that silently failed to create the index (or a predicate typo) leaves no trace, exactly the failure mode `schema.prisma:443-446` was written to warn about.

**⭐ A verifier disagreed with that handling and proposed:**

Rewrite the build prompt's §1 sentence to cite both halves at their true lines, and carry the three companions the KYC block earned:

"One active application per user: a PARTIAL unique index on `AgentApplication("userId") WHERE status <> 'REJECTED'`, so a rejected applicant can re-apply. The Prisma DSL has no partial-unique syntax — it is hand-written DDL in the migration. Copy the KYC pattern:
 · DDL exemplar: `prisma/migrations/20260820120000_kyc_identity_document/migration.sql:75-77` (and read :60-74 — `IF NOT EXISTS` is load-bearing, and the pre-flight duplicate check is mandatory before creating an index on a populated table; `AgentApplication` is new and empty, so `CONCURRENTLY` is not needed here).
 · The law and the mirrored comment: `prisma/schema.prisma:418-463`. Nothing in Prisma will tell the next reader this index exists and `prisma migrate deploy` does not drift-check, so mirror the full DDL into a `//` comment on the `AgentApplication` model, naming the migration — exactly as :459-463 does.
 · ⛔ THE ERROR TRANSLATOR, or the loser of a double-submit gets a 500: `src/lib/server/kyc-service.ts:376-406`. A raw-SQL partial index does not reliably populate Prisma's `meta.target`, so `isIdUniqueViolation` matches raw `23505` and the index NAME as well as `P2002`. Export `AGENT_APPLICATION_ACTIVE_INDEX` and an `isAgentApplicationDuplicate()` beside it, and have `startApplication` return `application_exists`, never throw.
 · ⛔ THE INDEX IS NOT THE ONLY GATE. A Postgres partial index cannot exist in the memory DAL backend, so `startApplication` must itself refuse a second active application — the DB index is the race-loser backstop, the service check is the control. Prove the refusal at SERVICE level against BOTH backends (the KYC precedent: `test:kyc` §2d), and make the control go red — delete the service check and the test must fail on memory as well as Postgres.

Optionally also fix the neighbouring `feeReference` (**unique**) line: a plain `@unique` there is expressible in the DSL and needs none of this, so say so, or a builder will reach for raw SQL twice."

---

### 🟡 `ADDITIONAL_INFO_REQUIRED` has no exit transition in the service list, and the verification never asks the applicant to respond

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

AGENT-PROGRAMME.md:47 and :51-53 make `ADDITIONAL_INFO_REQUIRED` mandatory — "it is not optional. Without it a blurry scan forces a rejection, which triggers a refund and a re-application for a problem a single message solves."

The build prompt §2's function list is `startApplication · attachDocument · recordFeePayment · submitForReview · reviewApplication · approveAgent · deactivateAgent · refundFee · listPendingApplications`. Nothing moves an application OUT of `ADDITIONAL_INFO_REQUIRED`. If `submitForReview` is written with the natural precondition (`status === PAYMENT_PENDING`, mirroring the linear state machine at :41-49), the applicant is stuck permanently — and the §1 partial index `WHERE status <> 'REJECTED'` means they cannot start a new application either. Officer says 'clearer scan please', applicant is locked out, fee is paid and unrefunded.

The verification section cannot see it: step 2 does "queue → every document → reconcile → request info → approve" — the *officer* proceeds to approve; the applicant never responds to the request. The one state the authority calls non-negotiable is the one state the verification never round-trips.

**Evidence** — docs/AGENT-PROGRAMME.md:47, :51-53; docs/SESSION-PROMPT-AGENT-BUILD.md:67-70, :62, :146-149

**Proposed handling** — Name the transition in §2 (`resubmitAfterInfoRequest`, or state that `submitForReview` accepts both `PAYMENT_PENDING` and `ADDITIONAL_INFO_REQUIRED`) and specify whether the fee reconciliation survives the round trip. Rewrite verification step 2 to: request info → **switch back to the applicant, attach the replacement document, re-submit** → confirm it re-enters the queue → approve.

**⭐ A verifier disagreed with that handling and proposed:**

Decide it in the prompt rather than naming it, and mirror the KYC shape exactly. Four edits.

1. `SESSION-PROMPT-AGENT-BUILD.md` §2 (around `:68-70`), keep the nine functions and add the contract instead of a tenth:
"`submitForReview` is the ONLY door into `UNDER_REVIEW` — from `PAYMENT_PENDING` and from `ADDITIONAL_INFO_REQUIRED` alike. ⛔ It must not switch on the previous status. Its refusals are COMPLETENESS refusals — approved `KycSubmission`, seven documents, fee reference + receipt recorded, every officer-requested replacement filled — plus the idempotency no-op when already `UNDER_REVIEW`/`APPROVED`. Exactly `kyc-service.ts:494-528`: the only status test there is the idempotency guard at `:523`, which is why an officer's request for a clearer scan resubmits with no second function."

2. Same section, the two silent neighbours the round trip needs:
"`attachDocument` locks in `UNDER_REVIEW` and `APPROVED` only (`kyc-service.ts:454`) — documents stay editable in `DRAFT`, `KYC_SUBMITTED`, `PAYMENT_PENDING` and `ADDITIONAL_INFO_REQUIRED`, or the applicant cannot supply what the officer asked for. `listPendingApplications` selects `UNDER_REVIEW` **and** `ADDITIONAL_INFO_REQUIRED` (`kyc-service.ts:603`), so a case awaiting the applicant never falls out of the officer's queue."

3. Answer the fee question outright rather than flagging it, in §2 next to the fee fields at `:52-53`:
"⛔ `feeReconciledAt` / `feeReconciledById` SURVIVE the round trip and are never cleared on resubmission. They attest a receipt an officer read against the Selcom statement; that fact does not become false because a referee letter was rescanned. Clearing them would demand a second reconciliation of the same TZS 100,000 — and `feeReference` is unique (`AGENT-PROGRAMME.md:95`), so the applicant has no second reference to give and the application would deadlock on the fee instead of on the document." This mirrors the `approvedAt` law already in `prisma/schema.prisma:400-403` — an attested fact is stamped once and never nulled.

4. Verification step 2 (`:146-149`) — split it so the officer is not both parties:
"2. **Officer** — queue → every document through the gated route → reconcile → **request info** (a named replacement document, with a reason) → confirm the applicant is notified in-app and by email, and that the case is STILL in the queue.
 2b. **Applicant, back in the first browser** — see the request on `/agent/status`, upload the replacement, resubmit. Confirm it re-enters `UNDER_REVIEW`, that `feeReconciledAt` is unchanged, and that resubmitting with the request unfulfilled is refused. Then the officer approves from the re-queued case: role flips, rate lands, code minted.
 Try approving your own (refuse) and twice (once). Then reject another and confirm the refund is recorded."

Add the red control, since a permission has no natural failing harness (`:160`, `:182`): in the new `agent-application-security` suite, assert that resubmission from `ADDITIONAL_INFO_REQUIRED` succeeds and that `feeReconciledAt` is preserved across it; the proven red harness is a `KP_SRC` copy that adds `if (a.status !== "PAYMENT_PENDING") return …` to `submitForReview` — the suite must go RED. Without that mutation the test passes on a build that has the bug, because a linear application never visits the state.

Finally, close the authority's own half of it: `AGENT-PROGRAMME.md` §2 should carry the return arrow, one line under `:53` — "`ADDITIONAL_INFO_REQUIRED → UNDER_REVIEW` on the applicant's resubmission. The fee stays reconciled." The table at `:41-49` is the only place a builder looks for the machine, and today it draws a state with no way out.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the fix with the KYC seam, stated as rulings rather than options.

1. §2 — ONE submit path, no new verb. Delete the `resubmitAfterInfoRequest` alternative. Write into §2: "`submitForReview` carries no positive status precondition — completeness check, unfulfilled-info check, then an idempotency guard on `UNDER_REVIEW`/`APPROVED`; every other state falls through into the queue (`kyc-service.ts:494-528`). `attachDocument` locks re-upload only in `UNDER_REVIEW` and `APPROVED` — never in `PAYMENT_PENDING` or `ADDITIONAL_INFO_REQUIRED` (`kyc-service.ts:454`). `reviewApplication` treats `ADDITIONAL_INFO_REQUIRED` as decidable (`kyc-service.ts:745`)." That is three lines and it forecloses the lockout without adding a function.

2. Rule the fee, don't ask. `feeReconciledAt`/`feeReconciledById` are attestations that TZS 100,000 arrived; a request for a clearer referee letter does not un-collect it, so reconciliation SURVIVES the round trip and `submitForReview` must not demand it be re-recorded. The one case the finder and the proposal both miss: when the info request is about the RECEIPT itself (blurry scan, wrong reference), `recordFeePayment` must be callable again in `ADDITIONAL_INFO_REQUIRED` and must CLEAR `feeReconciledAt`/`feeReconciledById` — an officer attested a reference that no longer exists, and an approval on a stale attestation is an agent onboarded on a payment nobody matched. Say so in §2 beside the `feeReference` unique index.

3. §4 — give the state a door. `/agent/status` (or `/agent/apply` reopened) must render the officer's note and the requested slots with re-upload and a re-submit action, mirroring `src/app/profile/kyc/page.tsx:102` (`needsInfo`) and `attachExtraDocument` (`kyc-service.ts:475-492`). In en/sw/zh, like the rest of `/agent/*`.

4. §5 — name the third emitter. Add the info-request template to the §5 list (royal chrome, CTA to `/agent/status`) and to `comms-registry.ts` alongside the approval and rejection entries, mirroring `kycMoreInfoHtml` (`comms-registry.ts:108`, sent at `kyc-service.ts:809-815`) with the in-app notify. Otherwise cert-c1/c3 stay green over an emitter that was never written.

5. Verification — round trip AND prove the control goes red. Rewrite step 2 as: queue → every document through the gated route → reconcile → request info (confirm the applicant gets the in-app notice and the email) → SWITCH BACK TO THE APPLICANT, replace the named document, re-submit → confirm it re-enters the queue with the fee still reconciled → approve. Then the two refusals that stop this becoming a blanket permission: re-uploading while `UNDER_REVIEW` is refused, and re-recording the fee in `ADDITIONAL_INFO_REQUIRED` clears the reconciliation so approval is refused until an officer re-attests.

6. The mutation, which is what actually settles it here. In the new `agent-application-security` suite, add a case that drives request-info → replace → re-submit, and lock its red harness (`KP_SRC` copy, per `:161-162`) mutating `submitForReview` to `if (app.status !== "PAYMENT_PENDING") return refuse`. If that mutation does not turn the case RED, the case is not testing the round trip. A guard that has never failed on the exact precondition a builder would naturally write is a hypothesis.

---

### 🟡 The "Verified 50pick Agent" badge is required by the verification but absent from "Build it", and the read model returns nothing to build it from

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

AGENT-PROGRAMME.md:164-166 requires it, and verification step 3 tests for it ("confirm the **Verified 50pick Agent** badge"). But §4 of the build prompt — the section that enumerates what to build on the applicant/player side — lists only `/agent`, `/agent/apply`, `/agent/status` and `/profile/invite`. The register-page ribbon is not there.

And it is not a one-line change: `resolveReferralPreview` (affiliate-service.ts:151-178) returns `{ referrerName, newPlayerBonusTzs, bonusTrigger }` — no role, no agent status, no verification marker. The consumer is `src/app/auth/register/page.tsx:61`. A builder working from §4 ships everything, reaches verification, and discovers a missing feature plus a read-model change during the final drive.

The same read model has a second problem for agents: `newPlayerBonusTzs` is computed from the global player `cfg.bonus`, so if bonus mode is ever enabled the badge sits next to a welcome-bonus promise that the AGENT programme has nothing to do with.

**Evidence** — docs/AGENT-PROGRAMME.md:164-166; docs/SESSION-PROMPT-AGENT-BUILD.md:96-106 vs :148-149; src/lib/server/affiliate-service.ts:151-178; src/app/auth/register/page.tsx:61

**Proposed handling** — Add a fifth bullet to §4: the register ribbon, and the `resolveReferralPreview` return-shape change (add `programme` and, for AGENT, the verified marker + registered name). State whether the badge shows the agent's real name or a masked one — `maskName` is what every other recruit-facing surface uses.

**⭐ A verifier disagreed with that handling and proposed:**

Add the fifth bullet to §4, but specify it rather than leaving it open. Concretely:

1. ONE programme resolver, no inline role checks. Export a single `programmeFor(role): "AGENT" | "PLAYER"` beside `inviteStateFor` in src/lib/feature-state.ts, and require §3 (accrual + `rateApplied` stamp), `bindRecruit` and `resolveReferralPreview` to all call it. This is the same discipline §3 already imposes with `rateFor`, and it is what keeps the preview from disagreeing with what gets stamped on the ReferralReward row.

2. Define the truth-condition of "Verified" as a hard three-part test, not `role === "AGENT"`: role is AGENT **and** `AffiliateAgent.approvedAt` is set **and** `active` is true. A deactivated or not-yet-approved account falls back to the plain ribbon — never to a verified one. While §4 is being written, also fix the parent: `referrerMayEarn` (affiliate-service.ts:367-370) tests role alone, so `deactivateAgent` in §2 does not currently stop earning either. Either `deactivateAgent` demotes the role in the same transaction, or `referrerMayEarn` gains the `active` test — decide it in §2 and let §4 consume one predicate.

3. Rule the name, do not ask for it. The badge shows the agent's REGISTERED name unmasked (the trading/registered name captured on the application), because a masked "Verified 50pick Agent · J. M." verifies nobody and defeats the framework's §3 intent. An approved agent is a vetted commercial counterparty who consented at application; `maskName` guards a different threat model (player-to-player re-identification on operator rosters, pinned by erasure.test.mts:224) and must not be borrowed here. Player-programme ribbons keep the existing first-name + last-initial form.

4. Kill the bonus line by programme, not by config. In `resolveReferralPreview`, force `newPlayerBonusTzs = 0` and drop `bonusTrigger` whenever programme is AGENT — the player promo's figures are not the agent programme's to advertise. Gate the OFFER, never the refusal.

5. ⛔ The trap in the same surface, which the finding did not reach: `src/app/auth/register/page.tsx:51` and `src/app/auth/register/actions.ts:20` both do `.trim().slice(0, 16)` on the ref code. `50PICK-AG-` is 10 characters, so only a 6-character ID survives; anything longer is silently truncated, `findByCode` returns null, and the result is NO ribbon AND NO BIND — the agent's recruit is never attributed and never earns, with nothing going red. Existing player codes are ≤12 chars (genCode, affiliate-service.ts:41-84), which is why this has never fired. §1 or §4 must fix both slices together (raise to the actual max code length and assert it against the minted format), because fixing only the page leaves the server action dropping the binding.

6. i18n + a control that must go red. The badge is player-facing copy in en/sw/zh (test:i18n parity). Add to the new `agent-application-security` suite an assertion that the verified marker does NOT render for a PLAYER code and does NOT render for an approved-then-deactivated agent, and prove the red harness by flipping `active` — a badge assertion that can only pass is not a control.

**⭐ A verifier disagreed with that handling and proposed:**

Add the fifth §4 bullet, but specify it as a programme-aware resolver change, not a ribbon tweak, and pair it with the payer.

1. §4 gains: "**`/auth/register` — the ribbon.** It exists; it gains the programme branch." Add src/app/auth/register/** and src/lib/server/affiliate-service.ts to the guard population at :170-171 in the same edit, or the new branch is unmeasured.

2. resolveReferralPreview (affiliate-service.ts:151-177) returns `programme: "AGENT" | "PLAYER"` derived from the referrer's role at :156, with the AGENT branch carrying `{ agentName, agentCode, approved }`. Derive `approved` from the SAME source rateFor uses — the agent account's `approvedAt` (prompt :82-88) — never a second flag, so "is this agent live" has one source of truth. A deactivated or not-yet-approved agent returns null, the identical graceful degradation already documented at :158-166 for a refused bind: no ribbon, no hidden ref field.

3. Settle the name now, do not leave it open: AGENT shows the REGISTERED name in full plus the 50PICK-AG- code. That is the point of the badge (§7: "name and registration status") and an agent is a vetted business partner, not a private player. PLAYER keeps the existing first-name+initial truncation at :173-176 untouched. maskName is not involved on this surface in either branch — it guards the opposite direction.

4. Gate the OFFER and the PAYMENT from the same branch, never one alone:
   - Preview: when programme === "AGENT", newPlayerBonusTzs is 0 and bonusTrigger is not returned — decision 3 is commission only, so no bonus line can render on an agent ribbon whatever the global player config says.
   - payBonus (:372-421): return early when the referrer's programme is AGENT, before the recipient branches at :418-419. Without this, re-enabling bonus pays an agent the player-promo referrer prize on top of commission and breaks §6's invariant. Same shape as leak 2 in reverse — there the player gate wrongly SILENCES agent pay; here it wrongly TRIGGERS it.

5. Strings via the en/sw/zh dict (test:i18n parity) — §4's "(en/sw/zh)" heading covers the agent pages, not the register page, so say it explicitly.

6. Two controls, each with its red harness proven: (i) an AGENT code with bonus mode FORCE-ENABLED renders the verified badge and NO bonus promise, and payBonus records no BONUS row for that recruit — this must go red when the programme branch is deleted; (ii) a deactivated agent's old link renders no ribbon. Per the prompt's own trap table (:180), a refusal without a control that must go red is a guard that cannot fail.

---

### 🟡 The agent's dashboard keeps advertising the player promo's terms — the plan extends it but never replaces what it already says

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

§4's whole instruction for the agent dashboard is: "`/profile/invite` — extend for an `AGENT` with their rate and, while pending, their application status."

But the page's content already comes from `getPlayerReferralSummary`, which builds its `promises` array entirely from the **global player config** (affiliate-service.ts:661-689) and sets `programEnabled: cfg.enabled` (:697), rendered as an Active/Paused chip at page.tsx:174. Concretely, for an approved agent today:
· `cfg.commission.enabled` is false → **no commission promise line at all**, so an agent's own dashboard says nothing about the thing they pay TZS 100,000 for.
· `cfg.prize.enabled` is true → the page promises them "Get TZS 10,000 when a friend deposits & places their first bet", a player promo the authority says agents do not get.
· A growth officer pausing the player programme flips an approved agent's dashboard to **PAUSED**.

Separately, AGENT-PROGRAMME.md:117-119 promises the agent's sub-ledger shows "recruits, their turnover and their generated revenue" — but §4 asks only for the rate, and §6 puts the sub-ledger on `/admin/affiliate`. The framework's "volume turnover" display, which the authority explicitly says is honoured, is not commissioned anywhere agent-facing.

**Evidence** — src/lib/server/affiliate-service.ts:661-689, :697; src/app/profile/invite/page.tsx:174; docs/AGENT-PROGRAMME.md:117-119; docs/SESSION-PROMPT-AGENT-BUILD.md:106

**Proposed handling** — Rewrite the §4 bullet as a replacement, not an addition: for an AGENT, the promise lines, the Active/Paused chip and the earnings figures must all be resolved from the agent's own row and the agent programme's state, with `getPlayerReferralSummary` branching on programme. Name the turnover column and say which surface owns it.

**⭐ A verifier disagreed with that handling and proposed:**

Right direction, wrong two details, and it misses the item that actually matters. Rewrite the §4 bullet as a REPLACEMENT with these five parts:

1. Name the real defect first. "`/profile/invite` currently renders, to an AGENT and to nobody else, the player promo's TZS 10,000 first-bet prize, no commission line at all, a Paused chip driven by growth's lever, and an unconditional Requirements banner (page.tsx:326-341) promising a Bonus Wallet, a {wager}× wagering requirement and 30-day expiry. **Delete or replace each of those for an AGENT** — AGENT-PROGRAMME.md §5 says the money is real, withdrawable cash with no wagering requirement." Without this sentence the builder reads "extend" and adds a rate line on top of all of it.

2. ONE resolver, not a branch bolted on. Give `getPlayerReferralSummary` the viewer's role, have it return `programme: "AGENT" | "PLAYER"` plus programme-resolved `promises`, `terms` (the requirements list, as DATA) and `programEnabled`. The page renders what it is handed — no JSX conditionals, no second summary and no `/agent/dashboard`, which "final rules out". Making the terms banner data is the part that stops the next surface forgetting; leaving it as hardcoded `<li>`s guarantees a repeat.

3. The rate has ONE home. The agent's promise line must call the same `rateFor(account, cfg)` the build prompt's §3 introduces — never re-read `commissionPct` in the page or the summary. The TZS 100,000 and the ceiling stay in RULES.md §2.10 per §7 and must not be typed into any screen copy.

4. Chip and banner: source them from the agent's own row — `approvedAt` set and `active` true (both columns §1 already brings to life) — NOT from `cfg.enabled`, and NOT from a vague "agent programme state". State explicitly that this lands in the SAME commit as the leak-#2 accrual fix, since the two are the two halves of one truth: the screen must say paused exactly when the engine stops paying.

5. Earnings: compute the agent's tile and per-recruit figures from `ReferralReward` rows filtered `programme = AGENT`, not from `acct.totalEarnedTzs` (affiliate-service.ts:225, programme-blind). Otherwise a former player-referrer's dashboard adds bonus-wallet money into a figure the page presents as withdrawable.

DROP "name the turnover column" — turnover is not a column and inventing one repeats the `totalEarnedTzs` denormalisation defect this same bullet has to clean up. Instead: "turnover is an aggregate of the recruits' settled stakes, computed on read in both DAL backends. AGENT-PROGRAMME.md:117-119 and §6 disagree on who sees it — resolve it in the authority first, then build one surface."

Control that must go red (the repo's standing rule): a test that renders the summary for an AGENT and asserts the payload contains NO player-prize promise, NO bonus/wagering/expiry term, and a commission line at the agent's own rate — proven by flipping `prize.enabled` and `commission.enabled` in the fixture and confirming the AGENT payload does not move while the PLAYER payload does. A test that only asserts the agent line is present would pass with every player promise still on the page.

**⭐ A verifier disagreed with that handling and proposed:**

The direction is right (replacement, not addition) but the proposed fix as written is INCOMPLETE in the exact way this repo keeps getting burned — implement it literally and the page still says "5× wagering required before withdrawal" to a paying agent, while the three named items look fixed. It also names the wrong discriminator. Concretely:

1. FIX THE HARDCODED COPY FIRST, not the config-driven copy. The `promises` array and the chip at least vanish when a mode is off; page.tsx:326-341 never does. §4 must name that block: for an AGENT the Requirements banner, the "How it works" ladder (page.tsx:296-324) and `inviteEarnSub` are REPLACED with agent terms — commission on collected operator fee, paid as real withdrawable cash, no wagering, no expiry, no bonus wallet — as NEW dictionary keys in en/sw/zh (`npm run test:i18n` parity guard) rather than edits to the `inviteReq*` keys, which the withdrawn player promo still owns.

2. DISCRIMINATE ON THE VIEWER, NOT ON `programme`. `programme` is stamped on a BIND (the recruit's row), not on the viewer; an agent approved after Invite was live would hold PLAYER-programme reward rows, and `acct.totalEarnedTzs` (`:695`) is a single aggregate with no split. The correct discriminator is the viewer's own agent state — the same seam `feature-state.ts` already owns. Extend that seam (`inviteStateFor(role)`) rather than adding a second role lookup inside affiliate-service.

3. MAKE THE PARAMETER REQUIRED so the compiler surfaces every call site. `getPlayerReferralSummary(userId)` has three callers — page.tsx:134, `achievements.ts:48`, `api/dev-test/affiliate-e2e/route.ts:205`. Give it a required `programme` argument with NO default. This is verbatim the pattern `feature-state.ts`'s own header prescribes ("a shim would have kept the old role-blind `inviteIsLiveFor()` compiling at every one of them"). A defaulted or internally-branching parameter reproduces the shim it warns about.

4. ONE RATE RESOLVER. The dashboard must display the rate through the SAME `rateFor(account, cfg)` §3 (prompt:81-88) gives the accrual engine — never a second `commissionPct / 100` in the read model. Otherwise the number the agent reads and the number they are paid can diverge silently, which is the `feeSnapshot` lesson §5 already cites.

5. THE CHIP MUST NOT READ `cfg.enabled` AT ALL for an agent. Its state is the agent's own account status (approved / suspended), so a GROWTH officer pausing the player promo cannot flip a commercial partner's dashboard to PAUSED. Pair this with leak #2's accrual fix in the SAME commit — shipping either alone produces a dashboard that contradicts the ledger.

6. A CONTROL THAT MUST GO RED. `scripts/withdrawn-features.test.mts` already drives the ON branch (§8, :369-379). Add: (a) render the page as an AGENT and assert the body contains NONE of the `inviteReq*` bonus-wallet/wagering/expiry strings and none of `cfg.prize.amountTzs`; (b) set `cfg.enabled = false` and assert the agent's chip is still Active. Verify both by deleting the new branch and watching them fail — a check that passes with the fix removed is not a check.

7. TURNOVER: RESOLVE THE AMBIGUITY IN THE AUTHORITY, do not silently commission a new column. Amend AGENT-PROGRAMME.md:117-119 to say which surface owns each figure. Recommend turnover stays OFFICER-FACING on `/admin/affiliate` for this build: per-recruit turnover shown to an agent is other players' betting volume, and the page already masks recruit names (`maskName`) precisely because an agent is not entitled to identify or profile them — adding a per-recruit turnover figure widens what an agent learns about individual players and deserves its own disclosed decision, not a bullet in a build prompt.

---

### 🟡 Reject and refund are two separate officer actions with no worklist — TZS 100,000 can sit owed to a rejected applicant with nothing tracking it

**Severity** medium · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

AGENT-PROGRAMME.md:49 has REJECTED mean "Refused, with a categorised reason. Fee refunded", but :98-100 makes the refund a *separate* officer action recorded on the application (`feeRefundedAt`, `feeRefundReference`), paid out of band. §2's function list has `reviewApplication` and `refundFee` as distinct calls.

Nothing in either document makes the refund mandatory, queues it, or surfaces the outstanding liability. An officer rejects at 4pm, means to refund, and the obligation exists only as two NULL columns nobody queries. Because the fee deliberately never enters the ledger (:89-93), no money invariant, no house-ledger view and no `test:money-invariants` run can see it — the very property that makes the design safe also makes this liability invisible.

The verification is one-shot and cannot detect the systemic gap: step 2 says "reject another and confirm the refund is recorded", performed by the same person in the same minute.

**Evidence** — docs/AGENT-PROGRAMME.md:49, :87, :98-100; docs/SESSION-PROMPT-AGENT-BUILD.md:67-68, :110-111, :149

**Proposed handling** — Commission an explicit 'rejected, refund outstanding' queue on `/admin/agents` (status REJECTED with `feeRefundedAt IS NULL`), ageing-sorted, and state it in §5. Add a guard asserting the queue is non-empty immediately after a rejection and empties on `refundFee`. Optionally require `refundFee` in the same transaction as a rejection.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the queue, fix the population, and delete the same-transaction option.

1. Make the liability a RECORDED DECISION, not the absence of a value. Add `feeDisposition` to `AgentApplication` (`REFUND_DUE | NOTHING_RECEIVED`), set by `reviewApplication` in the SAME transaction as a rejection, with the deciding officer and reason — the disposition, not the payment. An officer rejecting a receipt that never matched the Selcom statement records NOTHING_RECEIVED; a genuine rejection of reconciled money records REFUND_DUE. `refundFee` then closes a REFUND_DUE with `feeRefundedAt` + `feeRefundReference` and may not touch a NOTHING_RECEIVED row. This is the platform's own discipline (`PredictionMarket.feeSnapshot`, `rateApplied`): record the fact at the moment it is true rather than inferring it from two NULLs later. It also means the compliance decision is never blocked on a bank transfer.

2. Surface it where compliance already looks. A fourth queue and `AdminKpi` on `/admin/approvals` — reuse the exact failed-read discipline at src/app/admin/approvals/page.tsx:33-42 so a broken read renders `AdminLoadError` and never a false "nothing outstanding" — mirrored as a section on `/admin/agents`. Ageing-sorted via the existing `applySort`/`SortTh` from src/components/admin/admin-sort.tsx. No new page (the plan's §"What 'final' rules out" forbids one).

3. State it in the authorities, in the same commits. AGENT-PROGRAMME.md §4 gains the disposition split and the refund window; the window itself goes in RULES.md §2.10 beside the TZS 100,000 in the full `Decided / Enforced in / Configured in / Stated to / Guarded by` form — the doc's own rule that such numbers have exactly one home. AGENT-PROGRAMME.md:49 should read "Refused, with a categorised reason and a recorded fee disposition", because "Fee refunded" as a state definition is the thing that made the obligation feel already handled.

4. Guard `agent-refund-liability`, with a control that must go red for each limb: (i) rejecting a RECONCILED-fee application puts exactly one row in the queue; (ii) rejecting an UNRECONCILED / unmatched-receipt application puts ZERO rows in it — this is the limb that catches the over-reporting predicate, and the finding's proposed guard cannot see it; (iii) `refundFee` empties it and is idempotent. Red harness = delete the disposition write, and separately delete the queue predicate; both must fail. Cover `src/app/admin/agents/**` and `scripts/`, not just `src/`.

5. Cheap external accountability, consistent with §5's "rejection carries no CTA": the rejection email STATES the refund and its window. A statement, not a call to action.

6. One adjacent hole to close while in the file: the partial unique index is `WHERE status <> 'REJECTED'` (SESSION-PROMPT :61-62), so a rejected applicant may re-apply and pay a second TZS 100,000 while the first refund is outstanding. Key the queue on the APPLICATION, not the user, and show prior applications' open dispositions on `/admin/agents/[id]`.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the queue; fix its population; drop the atomic-refund clause.

1. PREDICATE. Commission the outstanding-obligation list on `/admin/agents` as `status = REJECTED AND feeReconciledAt IS NOT NULL AND feeRefundedAt IS NULL`, ageing-sorted oldest-first, modelled verbatim on the frozen-payout block at src/app/admin/payments/page.tsx:64-73 (including its per-queue try/catch, so a failed read renders `AdminLoadError` and never a false "nothing outstanding" — the A-5 rule already stated at src/app/admin/approvals/page.tsx:32-34). `feeReconciledAt IS NOT NULL` is the load-bearing term: it is the officer's own attestation that 50pick actually received the money, and it is the only thing separating a debt from a duplicate-reference applicant who paid us nothing (AGENT-PROGRAMME.md:95-96).

2. AUTHORITY TEXT. AGENT-PROGRAMME.md:49 and :87 currently read as unconditional ("Fee refunded", "Refunded in full"). Amend §4 to say what is actually true: a refund is owed only where the fee was reconciled; a rejection on an unreconciled or duplicated reference owes nothing and must be a distinct `AgentRejectReason`. Then state the queue in §5 of the build prompt as a named deliverable, not an implied one, and add a fourth persona step to the verification: an officer who rejects a reconciled application and then LOGS OUT — the obligation must still be standing on the queue at next login.

3. GUARDS — three branches, each with its own red harness (the plan's own law, SESSION-PROMPT:160,182):
   · reject with `feeReconciledAt` set → row appears on the queue. Red harness: delete the enqueue term, the assertion fails.
   · reject with `feeReconciledAt` NULL → row does NOT appear. This is the control that must go red; without it the queue is a guard that cannot fail, and it is the branch that stops the platform from being told to pay out money it never took.
   · `refundFee` → row leaves the queue, and cannot leave it any other way (in particular, a re-application must not clear the parent's outstanding row).
   Add these to the new `agent-application-security` suite, mutating a locked copy via `KP_SRC` per SESSION-PROMPT:162.

4. DROP "refundFee in the same transaction as a rejection" entirely. Replace it with a soft, non-blocking pressure that suits an out-of-band settlement and does not fabricate attestations:
   · the rejection notification/email to the applicant states that the TZS 100,000 will be returned and how to chase it — the applicant is the cheapest and most reliable dunning mechanism, and this costs one string in an emitter already being registered in `comms-registry.ts` (SESSION-PROMPT:114-116). Note the emitter is EN+SW.
   · an `AdminKpi` counter of outstanding refunds and the age of the oldest, on `/admin/agents`, so the number is visible without opening the queue — the pattern at src/app/admin/aml/page.tsx:89.
   · surface the parent application's outstanding refund on any NEW application from the same user (display only, do not block it — a rejected applicant may legitimately re-apply per SESSION-PROMPT:61-62, and blocking would mean a second TZS 100,000 collected against an unpaid first).

This preserves the two properties the design is built on — the fee stays out of the player ledger, and single-officer approval stands (AGENT-PROGRAMME.md:210-211) — while making the liability something a person can see, sort by age, and be held to.

---

### 🟡 `approveAgent` must UPDATE a row that already exists with a player-format code, and `[ID]` is left undefined

**Severity** medium · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

§2 says `approveAgent` is atomic: "role → AGENT, `approvedAt`, `commissionPct`, mint the `50PICK-AG-[ID]` code". But by approval time the applicant almost certainly ALREADY has an `AffiliateAgent` row: `ensureAffiliateAccount` mints one lazily for the recruit at bind time (affiliate-service.ts:309) and `userId` is `@unique` (schema.prisma:842). A builder who calls `db.affiliate.create` gets a constraint violation inside the approval transaction. The correct path is `db.affiliate.update(userId, { code })` (prisma-dal.ts:1689-1701, which does support a `code` patch) — worth stating, because 'mint' reads as create.

Second, `[ID]` is never defined. Candidates a competent engineer would each defend: the User cuid (25 chars — unusable, see the truncation finding), the `AffiliateAgent` cuid, a zero-padded sequence (needs a counter that does not exist anywhere in this schema), or the existing random alphabet from `genCode`. The framework specifies the *prefix* format; the plan treats `[ID]` as if it were self-evident. Two engineers ship two different, permanent, customer-facing identifier schemes.

Third: replacing the code orphans any link the applicant shared under their old player-format code. Probably fine (they should not have been recruiting), but it should be a stated consequence rather than a discovered one.

**Evidence** — src/lib/server/affiliate-service.ts:309, :64-97; prisma/schema.prisma:842, :844; src/lib/server/prisma-dal.ts:1677-1701; docs/SESSION-PROMPT-AGENT-BUILD.md:75-77

**Proposed handling** — Specify `[ID]` exactly, with its character set and total length, and check it against the 16-char register cap. Say 'UPDATE the existing `AffiliateAgent` row, do not create' and note that the previous code stops resolving.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding's two spec sentences, but replace the "use db.affiliate.update" instruction, which is incomplete enough to cause a silent bug. Put this in docs/SESSION-PROMPT-AGENT-BUILD.md §2 (and mirror the code shape into AGENT-PROGRAMME.md §8, which is the authority):

1. Define `[ID]` in ONE place, next to `genCode`. Add `genAgentCode()` in src/lib/server/affiliate-service.ts returning `50PICK-AG-` + 6 characters drawn from the existing `CODE_ALPHABET` (affiliate-service.ts:33 — 32 chars, already excludes 0/O/1/I), consuming random bytes in PAIRS exactly as `genCode` does. Total 16 characters — the maximum that survives the register truncation at src/app/auth/register/page.tsx:51 and actions.ts:20 without touching either. 32^6 is about 1.07e9. State the character set and the total length in the doc, and state WHY 16 is the ceiling, so nobody "improves" it to a cuid later. (The sibling truncation finding owns raising the cap; this fix deliberately does not depend on that landing.)

2. Reuse the guarded mint, do not hand-roll. `approveAgent` must mint through the same uniqueness retry loop that ensureAffiliateAccount uses (affiliate-service.ts:66-84) — factor that loop into a helper both callers share, parameterised by generator. A bare `create`/`update` with a fresh string throws on a `code` unique collision with no retry and fails the approval outright.

3. Spell out the write sequence, and fix the DAL first:
   - `await ensureAffiliateAccount(userId)` (idempotent, affiliate-service.ts:64) so the row provably exists, THEN `db.affiliate.update(userId, {...})`. ⛔ Never `db.affiliate.create` in `approveAgent`.
   - BEFORE that is writable, extend the seam in the same commit: add `commissionPct`, `approvedAt`, `active`, `applicationId` to `StoredAffiliateAccount` (src/lib/server/store.ts:348-355), to the mapper `toStoredAffiliate` (src/lib/server/prisma-dal.ts:382-391 — the same function that fakes `updatedAt` from `createdAt`, the documented lie §1 already tells you to fix), and to the patch list in `prisma-dal.ts` update (1689-1701). Today that update accepts only `code`, `recruitCount`, `totalEarnedTzs` and DROPS every other key without error — an approval that "succeeds" with a null `commissionPct` is exactly the silent-wrong-state this platform keeps getting bitten by. Memory backend at store.ts:1190-1196 spreads the patch and needs only the type change.

4. The control that must go RED. Drive approval against the PRISMA backend on a user who already has an affiliate row — the normal case, which you get free by loading `/positions` or `/profile/invite` as that user first. The memory backend's `create` is an UPSERT (store.ts:1189, `store.affiliates.set(a.userId, a)`), so a `create`-based implementation passes green in memory and only explodes in production. Assert three things: the approval succeeds, `code` matches `^50PICK-AG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`, and `commissionPct`/`approvedAt` actually read back non-null through `db.affiliate.findByUserId`. Mutation check: revert the prisma-dal patch-list change and the third assertion must fail.

5. State the consequence, do not let it be discovered: replacing the code makes the applicant's old player-format code stop resolving, and FREES it in the unique index so `genCode`'s collision check can re-mint it to somebody else later. Record the old value in the approval audit payload (`previousCode`) so support can trace a stale link, and note in AGENT-PROGRAMME.md §8 that pre-approval links do not carry forward.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the handling with four instructions.

**(a) Do not design the identifier around the 16 — fix the 16.** "Check `[ID]` against the 16-char register cap" treats an incidental input truncation as a permanent constraint and leaves a customer-facing ID six characters wide. The platform's law is one source of truth: export ONE code-format module (prefix set, alphabet, max length) and have `genCode` (`affiliate-service.ts:48-61`), the agent minter, `auth/register/actions.ts:20` and `auth/register/page.tsx:51` all read it — the cap is currently duplicated as a bare literal in two files with no shared constant, which is why the minter can silently disagree with the parser. Then pick `[ID]` for the identifier's needs (recommend: `50PICK-AG-` + 6 chars of the existing `CODE_ALPHABET`, giving 16 exactly and no cap change — but *stated as a decision*, not as a squeeze).

**(b) The truncation must fail loudly, not silently.** `.slice(0, 16)` on an over-length ref mangles it into a valid-looking miss. Reject over-length as invalid, and add the missing `audit()` to the `invalid_code` branch at `affiliate-service.ts:254-255` — otherwise the whole failure mode is invisible, which is exactly the "instruments green while measuring the wrong thing" pattern.

**(c) "UPDATE, not create" is right but the DAL cannot carry the update the plan asks for.** `StoredAffiliateAccount` (`src/lib/server/store.ts:348-355`) has no `commissionPct`, `approvedAt`, `active` or `tier` at all; `prisma-dal.ts:1689-1701` patches only `code` / `recruitCount` / `totalEarnedTzs`. So `approveAgent` setting `commissionPct` and `approvedAt` is not buildable today. Instruction: *call the existing idempotent `ensureAffiliateAccount(userId)`, then UPDATE — and widen `StoredAffiliateAccount` plus both backends' `update` to carry `code`, `commissionPct`, `approvedAt`, `active` in the same commit.*

**(d) The two backends fail DIFFERENTLY, so the guard must run both and must be red-provable.** In-memory `create` is `store.affiliates.set(a.userId, a)` (`store.ts:1189`) — a silent whole-record OVERWRITE that zeroes `recruitCount` and `totalEarnedTzs`; Prisma throws P2002. A builder who verifies through `/api/dev-test/affiliate-*` on the memory store sees green and ships a constraint violation to production; a builder who "fixes" it with delete-then-create silently wipes an agent's earned totals in memory. Required control: approve an applicant who already holds an affiliate row with non-zero `recruitCount`/`totalEarnedTzs`; assert the code changed to agent format, both counters survived, and exactly one row exists — run against BOTH backends, and prove it red by reverting to `create`.

**(e) On orphaning, correct the consequence.** Old player codes never bound anything — `bindRecruit` refuses a referrer whose role fails `inviteIsLiveFor` (`affiliate-service.ts:279-292`), so PLAYER-format codes have been inert since `4b3718e6`. The real consequence is the audit trail: `affiliate.account.created` recorded the old code (`affiliate-service.ts:95`), so `approveAgent` must audit `{ previousCode, code }`, not just `{ code }`, or support cannot resolve a reference to the old string.

---

### 🟡 Nothing stops an agent from having been recruited by another agent — a two-level commission structure nobody ruled on

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

`approveAgent` sets `role = AGENT` on an ordinary player account. That player may already have `User.recruitedBy` pointing at another agent — `bindRecruit` writes it once at registration and `already_bound` (affiliate-service.ts:251) makes it permanent and irreversible. Nothing in either document says approval clears it, refuses an applicant who is someone else's recruit, or rules the shape out.

Result: agent A recruits player B; B applies and is approved; every settlement on B's OWN betting pays A commission, forever, while B independently earns on their own recruits. That is a two-tier referral structure — an MLM shape — appearing by accident in a Gaming-Board-licensed product, at the exact moment the programme is being documented FOR the Gaming Board (§9 commissions a corrected framework document).

J4's recorded attack list already flags "cycles (A→B→A)" and its exit criterion is "Self/cyclic referral impossible". The plan cites J4 only for the clawback criterion and drops the rest.

**Evidence** — src/lib/server/affiliate-service.ts:251, :304, :537-544; docs/MODULE-CERTIFICATION-PROGRAM.md:887-896 (J4 Attack/Exit); docs/AGENT-PROGRAMME.md:143-146

**Proposed handling** — Take a decision and put it in §1 alongside 'recruiter only': either an applicant with a non-null `recruitedBy` is refused, or `approveAgent` clears the attribution (recording it in the audit), or the two-level payout is explicitly permitted and disclosed. Guard it with a red harness, and pick up J4's other two attacks — a reward on a self-excluded recruit, and A→B→A — while the file is open.

**⭐ A verifier disagreed with that handling and proposed:**

Take the decision the finding is right to demand, but take option (c) — permit and disclose — and guard the thing that is actually load-bearing.

1. RULE IT IN §6, NOT §1. §1 is "what an agent is/is not"; this is an attribution question and §6 is where attribution law lives (`AGENT-PROGRAMME.md:143-146`). Add a row + a paragraph: "An applicant's own `recruitedBy` is untouched by approval. If agent A introduced B, A continues to earn on B's PERSONAL betting at the standard window and cap, exactly as for any recruit. Approval neither creates nor cancels that stream — it already exists, because a withdrawn player programme means only agents' codes bind. Nothing cascades: an agent never earns on a recruit's recruits." Also record it in the corrected framework document §9 commissions, since that is the Board-facing artefact.

2. THE GUARD IS THE ABSENCE OF CASCADE, NOT A REFUSAL. Red harness in the new `agent-application-security` suite: build A→B→C with A and B both approved agents, settle a position for C with a non-zero `operatorFee`, assert EXACTLY ONE `ReferralReward` row is written and its `referrerUserId` is B, with `programme=AGENT` and B's `rateApplied`. Prove it goes red by mutating a COPY under `KP_SRC` (locked, per the build prompt's own rule) — replace the single hop at `affiliate-service.ts:541` with a two-hop walk and the assertion must fail. That is a control that can go red, unlike a cycle test.

3. PIN THE ONE CHANGE THAT WOULD CREATE A REAL CASCADE. Assert that an agent's commission credit never becomes a recruit-activity event: credit B, then assert no reward row was written for A. Today this holds because `creditInternal` writes BONUS_CREDIT and `onRecruitDeposit` fires only from `wallet-service.ts:500` on a CONFIRMED DEPOSIT — but nothing states it, and routing commission through a deposit-shaped transaction later would silently turn single-level into multi-level.

4. RETIRE THE CYCLE ATTACK HONESTLY. In `MODULE-CERTIFICATION-PROGRAM.md` J4 (:887-896), record A→B→A as structurally unreachable and change the exit criterion's guard from a runtime cycle test to a source anchor: `bindRecruit` is the only writer of `recruitedBy`, asserted by a grep-style check over `src/**` AND `scripts/**` (the "measure the right population" law) that must go red when a second writer is added. That is what actually keeps it true, and it is what makes option (b) impossible to introduce later by accident.

5. RAISE THE SELF-EXCLUDED-RECRUIT ATTACK SEPARATELY. It is a distinct defect on a distinct code path and should not ride on an attribution ruling.

If Ali would rather not pay A on a fellow fee-paying partner's betting, the honest lever is COMMERCIAL, not structural: on approval, record `agentSince` on B and stop A's accrual from that date forward (a forward-only window truncation), leaving every historical row and both derived views intact. That achieves the intent without ever rewriting `recruitedBy`.

**⭐ A verifier disagreed with that handling and proposed:**

Decide it at the ACCRUAL seam, not at the application gate, and keep history intact.

1. One predicate, one home. Beside `referrerMayEarn` in `src/lib/server/affiliate-service.ts:365-368`, add its mirror — `recruitStillCounts(recruitUserId)` — and call it in all three hooks at the same spot (`:494`, `:544`, `:610`): an approved agent is a business partner, not a recruit, so accrual on their own betting/deposits stops at `AffiliateAgent.approvedAt` (fall back to `role === "AGENT"` only until that column lands, and do NOT let a second definition of "is a recruit" grow anywhere else — the same discipline the `bindRecruit` comment at :275-278 already imposes on "may refer"). This is date-stamped by approval, so A keeps every shilling earned while B was a player, and B's later commission is unaffected.

2. `recruitedBy` is NEVER cleared and the applicant is NEVER refused. The row stays; A's sub-ledger and recruit count stay truthful; nothing is rewritten.

3. Fix the display consequence the predicate creates. In `/admin/affiliate`'s agent sub-ledger (build prompt §6) and in `recruitCount`, mark such a row "closed on approval as agent, DD MMM" rather than leaving a recruit whose turnover silently stopped moving — a compliance officer reading a frozen number with no reason is how this repo's own house-ledger findings started.

4. Write the decision down where it binds: a row in `AGENT-PROGRAMME.md` §6's line-runs table plus one sentence in §5, and the eligibility statement in `RULES.md` §2.10 in the full `Decided / Enforced in / Configured in / Stated to / Guarded by` form (§2.10 is the plan's only legal home for these). One sentence in the corrected framework document for the Board: "An approved agent's own play generates no commission for anyone."

5. Red harness that can actually go red, in the new `agent-application-security` suite: bind B to agent A, approve B, settle a fee-bearing position for B, assert ZERO new `ReferralReward` rows for A — then prove the harness by deleting `recruitStillCounts` from a LOCKED COPY via `KP_SRC` (never the working tree) and confirming it fails. Add the second control the finder did not ask for: flip `FEATURE_INVITE=ACTIVE` (the override `feature-state.ts:79-83` exists for exactly this) with a plain-player referrer on an approved agent, and assert the same zero — that is the legacy-row case, and without it the guard covers only the population that is live today. Drop the A->B->A cycle assertion; it cannot fail.

---

### 🟡 The agent sub-ledger discloses named recruits' betting turnover to a third party with no read-tier classification

**Severity** medium · **Kind** compliance · ⭐ **FIX DISPUTED**

§6 commissions "the framework's agent sub-ledger: recruits, their turnover, revenue generated, commission paid", and AGENT-PROGRAMME.md:117-119 says the agent's own sub-ledger shows "recruits, their turnover and their generated revenue". An agent is not staff — `isStaffRole` correctly excludes AGENT (roles.ts:76-91) — so this is per-player gambling-volume data being shown to an outside commercial party.

This platform governs exactly that with a read-axis regime (`docs/READ-TIERS.md`, `test:read-tiers`, `test:player-page-reads`), and this same service file carries a 2026-09-06 incident note about a masked-name fallback leaking one extra phone digit on an admin roster (affiliate-service.ts:117-137). Neither plan document mentions read tiers, masking, or an audit row for the agent sub-ledger; the existing recruit list uses `maskName` (affiliate-service.ts:658), but turnover is a new and far more identifying attribute, and the plan does not say it must be masked, bucketed, or gated.

The verification section has no step that looks at what an agent can learn about an individual recruit.

**Evidence** — docs/SESSION-PROMPT-AGENT-BUILD.md:118-122; docs/AGENT-PROGRAMME.md:117-119; src/lib/server/roles.ts:75-91; src/lib/server/affiliate-service.ts:117-137, :658; docs/READ-TIERS.md

**Proposed handling** — Classify the agent-facing sub-ledger against `docs/READ-TIERS.md` before building it, and state the answer in §6: masked name only, turnover bucketed or aggregated rather than per-position, no dates that re-identify, and an audit row if any per-recruit figure is exposed. Extend `test:read-tiers` to cover `src/app/profile/invite` under an AGENT viewer.

**⭐ A verifier disagreed with that handling and proposed:**

Rule it in the DOC, enforce it at the SERVICE SEAM, and keep READ-TIERS a staff axis.

1. Resolve the contradiction in AGENT-PROGRAMME.md §5 (:117-119) rather than leaving §6 of the build prompt to imply it. State the rule: per-recruit money figures never leave the admin surface. The agent's own view shows (a) recruit COUNT, (b) the agent's OWN aggregate turnover, generated revenue and commission, and (c) a per-recruit row limited to masked name + coarse status + commission the agent earned on that recruit — the shape already shipped at affiliate-service.ts:658, which the agent is entitled to because it is their own payment. Per-recruit TURNOVER stays on `/admin/affiliate` (growth). The framework's "volume turnover" promise is honoured at the aggregate, which is what an agent is measured on anyway.

2. Enforce it where it cannot be re-decided per page. Decision 10 shares `/profile/invite` between players and agents, so a page-level rule will drift. Give the agent view its own row type — `AgentRecruitRow` with NO `turnoverTzs` field — returned by a `programme`-branch in the summary service, so adding turnover to the agent payload is a TYPE error rather than a review miss. One source of truth: the admin sub-ledger and the agent sub-ledger read the same ReferralReward rows and differ only in the projection.

3. Never disclose RG state. No row, chip or figure that lets an agent infer a recruit self-excluded or cooled off. Note the population lesson scripts/rg-cash-incentive.test.mts §2 records: `coolOff` leaves the wallet ACTIVE, so a check that only exercises self-excluded fixtures proves nothing — test the cooling-off population.

4. Guard it with a control that must go red. In the already-planned `agent-application-security` suite: build an AGENT with a recruit carrying real settled turnover, assert the AGENT-facing payload contains no per-recruit turnover figure — and in the SAME suite assert the ADMIN payload for that same recruit DOES contain it. Without the second assertion the refusal is unfalsifiable (a suite whose fixture generates no turnover passes either way — the repo's own "a guard that chooses its own population cannot fail" trap). Prove the red harness by deleting the projection branch on a `KP_SRC` copy.

5. Add the missing verification step to persona 3 (SESSION-PROMPT-AGENT-BUILD.md:145-151): "as the agent, load /profile/invite and write down everything you now know about ONE named recruit" — then check that list against the rule in §5. That is the step the finder correctly identified as absent, and it costs nothing.

6. Record the decision NOT to extend the read axis. One line in READ-TIERS §7: AGENT is deliberately not a row in `DEFAULT_READ_GRANTS` (roles.ts:393); a non-staff viewer is bounded by what the service returns, not by a console grant cell — so the next person does not re-open it and does not add a commercial partner to the permission matrix.

**⭐ A verifier disagreed with that handling and proposed:**

Three replacements, none of which touch the read matrix's role set.

1. FIX THE AMBIGUITY, WHICH IS THE ACTUAL PLAN DEFECT. AGENT-PROGRAMME.md:117-119 never names the surface, while decision 10 makes /profile/invite the agent's dashboard — a builder can land turnover on the agent's page from those two sentences alone. Add one clause to §5 and mirror it in build-prompt §4: "/admin/affiliate carries recruits, turnover and generated revenue (growth domain, staff only). /profile/invite carries the agent's own totals — recruit count, their rate, commission earned — and the existing masked recruit list. ⛔ No per-recruit turnover figure ever renders to the agent." That is the one-line ruling; it costs nothing and closes the reading the finding worried about.

2. ASK THE MATRIX ON THE SURFACE IT ACTUALLY GOVERNS. Build-prompt §6 adds per-recruit TZS turnover to /admin/affiliate, a growth-domain route (roles.ts:239). GROWTH's default money.figures cell is "none" (roles.ts:426-431; READ-TIERS §3.2), and that class is defined as "any TZS total attributable to one named player" (§3.1). The axis is wired only to /admin/players/[id] today (§3.5 — "everything else in §3.2 is a dormant ceiling"), so nothing will go red; but a new named-player money surface built inside the growth domain is precisely the case the matrix exists to answer, and §6's "not a per-page opinion" says the page must not decide it alone. Classify that cell before building §6, and record the answer in READ-TIERS §3.5's wired-surfaces list in the same commit.

3. THE ONE CONCRETE CONTROL WORTH ADDING TO THE AGENT PAGE. affiliate-service.ts:658 still calls maskName directly. Its fallback for a recruit with no displayName is a phone fragment — "+255•••678", the last three digits — and the remedy for exactly that shape, maskedRosterLabel, sits at :117-137 in the same file with the 2026-09-06 incident note attached ("the looser of two maskings of the same value is the one that decides what leaked"). The agent recruit list is the surface where three trailing digits are most re-identifying, because an agent knows the people they signed up. Switch :658 to maskedRosterLabel, and leave maskName itself untouched — scripts/erasure.test.mts:224 pins its phone form and asserts it differs from the name mask, so this is a call-site decision, exactly as the :117-137 note frames it.

VERIFICATION, in place of extending test:read-tiers: add one step to the build prompt's "Drive it live, as four people" §3 (Agent) — "confirm /profile/invite shows no TZS figure attributable to an individual recruit other than the commission the agent themselves earned, and that a recruit with no display name renders a handle, not a phone fragment." Pair it with a red harness that adds a turnover field to RecruitRow and must go RED, per the platform's controls-must-go-red rule.

---

## Architecture — 14 confirmed

### 🔴 `programme` on the reward is DERIVED from mutable state — a player promoted to AGENT retro-monetises their entire existing recruit book

**Severity** critical · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

This is the failure mode in (B) the proposal has not identified. The build prompt adds `programme` only to `ReferralReward` (SESSION-PROMPT-AGENT-BUILD.md:60-63), while the architecture summary claims it is 'stamped at bind' on the attribution. Those two statements are not the same design, and only the first is being built.

Consequence: `onRecruitSettlement` reads nothing but `recruit.recruitedBy` (affiliate-service.ts:540-541). It has no idea WHEN the bind happened or under what programme. So:

· A user accumulates binds while the player programme is live (or holds legacy pre-gate binds — the population BONUS-WITHDRAWAL.md:147 documents as already on the table). Those binds pay nothing today, so they write NO ReferralReward row, so NO `programme` value exists for them anywhere.
· That user pays TZS 100,000, is approved, role flips to AGENT. `referrerMayEarn` now returns true for every one of those old attributions, `rateFor` returns their negotiated agent rate, and the FIRST reward row for each is stamped `programme=AGENT`.
· The ledger now asserts these were agent acquisitions. Nothing in the data can contradict it, because the bind recorded nothing. The framework's own 'user acquisition' metric credits the agent with players they never introduced under the agent contract.

The commission window makes it worse: it runs from `recruit.createdAt` (affiliate-service.ts:553-555), not from bind or approval, so an approval today opens a live window on recruits who registered months ago.

This is a purchasable arbitrage: farm attributions for free, then buy AGENT status to switch them all on. It is also the precise reason `programme` on the reward cannot be the discriminator the invariant depends on.

**Evidence** — src/lib/server/affiliate-service.ts:540-541, 553-555; docs/SESSION-PROMPT-AGENT-BUILD.md:60-63; docs/BONUS-WITHDRAWAL.md:147

**Proposed handling** — Record programme and `boundAt` on the attribution at bind time (finding #1's ReferralAttribution). Gate agent accrual on `attribution.programme === 'AGENT' AND attribution.boundAt >= agent.approvedAt` — only recruits bound through that agent's own approved code, after approval, earn agent commission. Run the window from `boundAt`, not `recruit.createdAt`. Everything bound before approval stays PLAYER-programme and pays nothing while that programme is withdrawn.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the diagnosis, replace the gate.

1. STAMP ON THE EXISTING ATTRIBUTION, NOT A NEW TABLE. Finding #1's `ReferralAttribution` contradicts `AGENT-PROGRAMME.md:145` ("Attribution — SHARED, one system, always") and creates a second writer beside `User.recruitedBy`, which `listRecruits` (`:649`) and `totalReferrals` (`:735`) already read. Add two columns to `User` — `recruitedProgramme` (AGENT|PLAYER) and `recruitedAt` — written in the SAME `db.user.update` at `affiliate-service.ts:304`. One row, one writer, both DAL backends, no live relation migrated.

2. DROP `boundAt >= agent.approvedAt`. It is a SECOND discriminator derived from mutable state — the exact disease this finding diagnoses. `bindRecruit:279-291` already refuses any referrer whose role is not eligible, and role AGENT is assigned in exactly one place (approval), so a bind stamped AGENT can only have happened post-approval: the clause adds nothing on the happy path. What it does add is failure — `deactivateAgent` and a single `approvedAt` column are both in the build prompt (§1/§2), so a deactivate→reactivate restamps `approvedAt` and silently deletes the agent's genuine book. A refusal an officer action can reset is worse than no refusal, and this repo's law is gate the offer, never the refusal. `attribution.programme === 'AGENT'` alone is sufficient and immutable.

3. THE STAMP IS USELESS UNLESS RATE AND DESTINATION READ IT. `SESSION-PROMPT-AGENT-BUILD.md:60-63`'s `rateFor(account, cfg)` keys off `account.approvedAt && account.commissionPct` — the AGENT's own row. So a PLAYER-programme accrual by someone who is now an agent is still priced at the agent rate and still paid as withdrawable cash. Replace it with ONE resolver keyed on the attribution, in the `ratesFor(market)` discipline the prompt already invokes: `policyFor(attribution.programme, account, cfg) -> { rate, destination, capPerRecruitTzs, windowMonths }`. Agent branch: refuse (do not fall back) when `commissionPct` is null. Player branch: config rate, bonus destination, config caps. This single resolver also closes recorded leaks 1, 3 and 4 in the same place.

4. BACKFILL EXPLICITLY, AND MAKE NULL MEAN REFUSE. Every existing `recruitedBy` row has no stamp. The migration writes `recruitedProgramme = 'PLAYER'` and `recruitedAt = user.createdAt` for all of them; the resolver treats NULL/unknown as PLAYER, never as a fall-through to the agent branch. With `invite: "WITHDRAWN"` those rows then pay nothing, and if the player programme returns they pay the PLAYER rate into the PLAYER destination — which is the correct answer, not a coincidence.

5. THE CONTROL THAT MUST GO RED — and this is the part the build will trip over. `scripts/withdrawn-features.test.mts:253-262` §5e today ASSERTS the exploit ("an AGENT referrer on the same legacy row shape IS paid"). This fix turns §5e red. It must be rewritten to bind through an approved agent's own `50PICK-AG-` code (a genuinely agent-stamped attribution) and keep asserting payment, and a NEW section must assert that an unstamped / PLAYER-stamped legacy row pays an AGENT referrer NOTHING. Both halves are required: without the paying control the refusal test passes whenever the reward path is broken for any reason — precisely how §5d's first version passed with the gate deleted (`BONUS-WITHDRAWAL.md:153-157`).

6. Re-anchor the window on `recruitedAt` (`:553-555`) for correctness on legacy rows, but record in the commit that it is not what closes this hole.

7. Fix the authority in the same commit: `AGENT-PROGRAMME.md:154-155` currently specifies the defect ("decided by the referrer's role at the moment of accrual"). It must read: decided by the programme stamped on the attribution at bind, and never re-derived.

**⭐ A verifier disagreed with that handling and proposed:**

Stamp provenance on the attribution that already exists, and delete the sentence that decided otherwise.

1. TWO COLUMNS ON `User`, not a new table. Add `recruitedProgramme` (`AGENT | PLAYER`, nullable) and `recruitedAt DateTime?`, written in the SAME `db.user.update` that already writes `recruitedBy` at affiliate-service.ts:304 — one write, one row, one source of truth, no second attribution system, no migration of a column with live relations. Both DAL backends touch User in a place they already map (`prisma-dal.ts:118,608`, `store.ts:60`), plus the `DATA-LAYER.md` entity map. Optionally also record `recruitedByCode` — the framework keys its sub-ledger on the `50PICK-AG-` token and it costs nothing at the same write.

   Legacy rows keep both NULL, and NULL is not AGENT. That is the correct reading, not a gap: "bound before the discriminator existed, provenance unknown, therefore not an agent acquisition." No backfill, nothing invented.

2. MAKE THE PROGRAMME A PROPERTY OF THE ATTRIBUTION, NOT OF THE REFERRER'S CURRENT ROLE. In `onRecruitSettlement` / `onRecruitBet` / `onRecruitDeposit`, read `recruit.recruitedProgramme` and pay under that programme's policy; agent commission requires `=== "AGENT"`. `referrerMayEarn` stays exactly what its own comment says it is — may this referrer still be paid at all (deactivated agent, closed account) — and must not double as the discriminator. That separation is the whole fix; drop the `boundAt >= approvedAt` clause and the window rebase, both of which are unreachable in production.

3. FIX THE AUTHORITY, IN THE SAME COMMIT. AGENT-PROGRAMME.md:154-155 currently reads "the programme is decided by the referrer's role at the moment of accrual". That sentence IS the defect, recorded as law; leaving it standing means the next session rebuilds the leak from the document. It becomes: decided at BIND and stamped on the attribution — the role at accrual decides only whether the referrer may still be paid, never under which programme.

4. THE CONTROL THAT MUST GO RED. `withdrawn-features.test.mts` §5e asserts the leak is correct and will keep passing after a partial fix. Rewrite it so the AGENT control binds through `bindRecruit` with the agent's own code (carrying `recruitedProgramme = AGENT`), and add §5f: a direct legacy row with an AGENT referrer accrues NOTHING — cash, bonus and reward-row count all zero — with the red harness proving §5f goes red when the programme check is deleted. Without §5f the fix is invisible to every suite.

5. THE SUB-LEDGER COUNTS THE SAME WAY. `/admin/affiliate`'s agent sub-ledger must derive acquisitions from `recruitedProgramme === "AGENT"`, not from `recruitedBy === agent.userId`. Otherwise the framework's "user acquisition" number still credits the legacy book even after the money stops moving — a true count over the wrong population.

6. DRIVE THE DORMANT BRANCH. While invite is WITHDRAWN, `bindRecruit` only ever binds for an AGENT, so the `PLAYER` stamp is unreachable and will rot exactly as `invite-feature.ts` did. Exercise it through the existing `FEATURE_INVITE=ACTIVE` override that withdrawn-features §4 already uses, and assert the override does not leak past the block, as §4 does.

---

### 🔴 The eligibility seam is keyed on ROLE and structurally cannot see `active` or `approvedAt` — `deactivateAgent` will not stop accrual

**Severity** critical · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

`inviteStateFor(role)` / `inviteIsLiveFor(role)` take a `Role` and nothing else (feature-state.ts:95-104), and `referrerMayEarn` is a thin wrapper over it (affiliate-service.ts:367-370). The build prompt commissions `deactivateAgent` (SESSION-PROMPT-AGENT-BUILD.md:67-68) and brings `active`/`approvedAt` to life on `AffiliateAgent` — but neither predicate can read them. So a compliance officer deactivating an agent for fraud leaves `role = AGENT` untouched and the agent keeps accruing withdrawable cash on every settled position of every recruit.

The existing code anticipated exactly this and then hit a wall: affiliate-service.ts:274-277 says '`AffiliateAgent.approvedAt` / `.active` arrive with the agent-application service; when they do, this predicate gains them — it must not grow a SECOND definition of "may refer" somewhere else.' But `inviteIsLiveFor` is a pure synchronous function that `app-shell.tsx` calls to thread booleans to client components, and feature-state.ts:37-42 explicitly forbids importing it into a client file. It cannot become an async DB read without breaking that contract. So the instruction as written is unimplementable: you either grow the second definition the comment forbids, or you break the shell.

This is the load-bearing architecture question in (B) that is currently unresolved: the surface gate is a role predicate, the money gate needs an account predicate, and they are the same function today.

**Evidence** — src/lib/feature-state.ts:95-104, 37-42; src/lib/server/affiliate-service.ts:274-277, 367-370; docs/SESSION-PROMPT-AGENT-BUILD.md:67-68

**Proposed handling** — Split deliberately and name the split: `inviteSurfaceStateFor(role)` stays pure/sync for the shell, and `mayEarnAsReferrer(userId)` becomes the single async money predicate reading role + `approvedAt` + `active` + the attribution's programme. All three accrual hooks and `bindRecruit` call only the money predicate; nothing else may. Add a red harness that deactivates an approved agent and asserts a settled recruit position accrues ZERO — with a control (an active agent) that must accrue, or the guard proves nothing.

**⭐ A verifier disagreed with that handling and proposed:**

Do not split or rename the seam. The split already exists; widen the projection and give the existing money predicate the row it needs.

1. WIDEN THE PROJECTION (this is the only real blocker). `StoredAffiliateAccount` (src/lib/server/store.ts:348-355) drops `active` and `commissionPct`. Add `active: boolean`, `commissionPct: number | null`, `approvedAt: string | null`, `applicationId: string | null` in BOTH backends (store.ts:1183 memory, prisma-dal.ts:1667-1713 Prisma) plus the entity map in DATA-LAYER.md. Until this lands, no predicate can see `active` — that, and only that, is the "structural" part.

2. LEAVE `inviteIsLiveFor(role)` EXACTLY AS IT IS. It answers PRODUCT STATE for a role: sync, shell-safe, client-import-banned. No rename, no new name to keep in sync.

3. GIVE `referrerMayEarn` THE ACCOUNT (affiliate-service.ts:367-370) — one function body, already async, no new seam:
   const referrer = await db.user.findById(referrerUserId);
   if (!referrer || !inviteIsLiveFor(referrer.role)) return false;
   if (referrer.role !== "AGENT") return true;                 // player path unchanged
   const acct = await db.affiliate.findByUserId(referrerUserId);
   return !!acct && acct.active === true && !!acct.approvedAt; // an agent earns only while APPROVED and ACTIVE
   Update the comment at 274-277 in the same edit — it predicted this and must record that it landed here, not elsewhere.

4. MAKE THE TWO PROMISING SURFACES READ THE SAME ANSWER, at zero extra cost, because both already hold the account row:
   · `bindRecruit` — `affiliate` is in hand at line 253; for an AGENT owner also require `affiliate.active && affiliate.approvedAt` before writing `recruitedBy`. A deactivated agent recruits nobody new, and `already_bound` makes that permanent.
   · `resolveReferralPreview` — `db.affiliate.findByCode` at line 152; same check before returning the ribbon. Otherwise a deactivated agent's outstanding links promise a relationship the bind now refuses, which lines 155-164 forbid in writing.

5. `rateFor` MUST REFUSE, NOT FALL BACK. For an AGENT with `active === false`, no `approvedAt`, or no `commissionPct`, return null — caller records NOTHING and audits `affiliate.commission.refused_no_rate`. Never `cfg.commission.rate`. Note `commissionPct` has `@default(5.00)` (schema.prisma:846), so "no rate" almost never presents as null; the refusal must key on `approvedAt`/`active`, not on nullness alone.

6. CLAWBACK AND HELD-RELEASE SIT OUTSIDE THE PREDICATE. §3's clawback on settlement reversal, and any officer release of a HELD reward, must not consult `referrerMayEarn`. Deactivation stops EARNING; it must never stop RECOVERING. feature-state.ts:27-35 is the standing law and names this exact trap. Put a one-line comment at the clawback site saying so, or the next reader will "fix" it by adding the gate.

7. STATE IT IN THE AUTHORITY FIRST. AGENT-PROGRAMME.md must answer, before code decides by default: does deactivation stop accrual (yes), void outstanding links (yes, at bind and at ribbon), and what happens to already-accrued PAID and HELD rewards (PAID stands; HELD goes to an officer decision, not auto-void). Add a `Deactivated` state to the §-state-machine line so the officer surface has something to render.

8. RED HARNESS WITH A CONTROL THAT MUST GO GREEN AND A MUTATION THAT MUST GO RED — scripts/agent-eligibility.test.mts, three arms on the same agent:
   (a) approved + active → a settled recruit position accrues commission at the AGENT rate, `programme=AGENT`, `rateApplied` stamped. CONTROL: if this is not green the other arms prove nothing.
   (b) deactivated → the SAME settlement accrues ZERO rows; the outstanding ?ref= link renders no ribbon and binds nobody.
   (c) deactivated → a settlement REVERSAL still claws back. This is the arm that catches fix (6) being undone.
   Prove it by mutation: delete the `acct.active` check in step 3 and arm (b) must go red; delete the clawback and arm (c) must go red. A guard that cannot be made to fail is not a guard.

**⭐ A verifier disagreed with that handling and proposed:**

Widen what exists; rename nothing.

1. `inviteIsLiveFor(role)` / `inviteStateFor(role)` stay EXACTLY as they are, names untouched, as the SURFACE gate (app-shell.tsx:183, profile/invite/page.tsx:130, profile/page.tsx:285, positions/page.tsx:59, markets/[id]/page.tsx:192, achievements.ts:43). No anchor, no MARKER, no §8 ordering assertion is disturbed.

2. Widen `referrerMayEarn` IN PLACE (affiliate-service.ts:367-370) into the one money predicate — it is already async and already reads the DB, so this adds a single `db.affiliate.findByUserId`:
   role must pass `inviteIsLiveFor`, AND if role is AGENT the account must have `approvedAt != null && active === true`.
   Export it and route ALL FOUR eligibility call sites through it — the three hooks, `bindRecruit` (:280) AND `resolveReferralPreview` (:165) — so offer, promise, attribution and payment can never disagree. That is the literal reading of :274-277: the predicate gains the columns, no second definition appears.

3. Make the AGENT branch REFUSE on missing data, never fall back — the same rule leak #3 imposes on `rateFor`. An AGENT with no `AffiliateAgent` row or a null `approvedAt` earns ZERO and writes an `affiliate.accrual.refused_inactive` audit row. It must never inherit the player rate or the player eligibility.

4. Carry `active`, `approvedAt` and `commissionPct` on `StoredAffiliateAccount` (store.ts:348-355) and in `toStoredAffiliate` in BOTH backends (prisma-dal.ts:1667-1710 + the memory map), plus the entity map in DATA-LAYER.md. Prompt §1 already requires this widening for `commissionPct`; dropping `active` from the same three lines is exactly how the gap was created.

5. Amend the AUTHORITY, not only the code. AGENT-PROGRAMME.md §2 must gain `DEACTIVATED` as a post-approval state with its recorded effects — stops accrual, stops binding, stops the "Verified 50pick Agent" badge, KEEPS `role = AGENT` and the historic ledger, is reversible by an officer — and §10 must name `referrerMayEarn` as the single money gate. An officer button with no rule behind it gets re-litigated by the next build.

6. Decide the question neither document answers: deactivation bites AT ACCRUAL TIME (settlement), so a position placed before deactivation but settling after pays nothing — we collected that fee after striking the agent off. State it in §5 beside the `rateApplied`/`feeSnapshot` rule.

7. Red harness with a DISCRIMINATING control, per the finding, hardened against this repo's own trap: in one run, deactivated agent accrues ZERO and an ACTIVE approved agent on the same settlement accrues non-zero. Then add the mutation that proves the guard can fail — flip `active` back to `true` in a KP_SRC copy and assert the suite goes RED. Without that second half it is "a guard that chooses its own population", which the prompt already names at :182.

---

### 🔴 `AffiliateAgent` is simultaneously every player's referral account and the vetted-agent record — the proposed `rateFor` guard is dead in Prisma and absent in memory

**Severity** critical · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

`AffiliateAgent` (schema.prisma:840-853) is not an agent table. `ensureAffiliateAccount` mints one for EVERY user the first time their referral surface is touched (affiliate-service.ts:64-97, store.ts:340-347), and `prisma-dal.ts:1677-1687` creates it without setting `commissionPct` — so every existing player row already carries `commissionPct = 5.00` (schema default) and `active = true`.

The build prompt's own resolver is therefore broken two different ways at once:

```ts
return account.approvedAt && account.commissionPct != null ? Number(account.commissionPct)/100 : cfg.commission.rate;
```

· Under Prisma, `commissionPct` is `Decimal @default(5.00)`, NOT NULL — the `!= null` conjunct can never be false. It reads as a second safety belt and is structurally unreachable. If anyone later drops the `approvedAt` test believing `commissionPct` carries it, every player on the platform silently becomes a 5% agent.
· Under the in-memory store there is no `commissionPct` field at all (`StoredAffiliateAccount`, store.ts:348-355) — it is `undefined`, so the expression takes the `cfg.commission.rate` fallback branch.

The two DAL backends therefore return DIFFERENT rates for the same account. And every money guard in this repo runs against the in-memory store (money-invariants.test.mts header: 'in-memory store; no DATABASE_URL'), so the suites will only ever exercise the fallback branch while production only ever exercises the column branch. That is a guard that cannot see the code path production runs.

Secondary consequences of the dual-purpose table: `/admin/agents` must filter `approvedAt IS NOT NULL` at every single read or it lists the entire player base as agents; `active` defaults true for 100% of player rows, so it means nothing until backfilled; and `db.affiliate.list()` (prisma-dal.ts:1711-1714) is an unbounded scan of a row-per-player table.

**Evidence** — prisma/schema.prisma:840-853; src/lib/server/affiliate-service.ts:64-97; src/lib/server/store.ts:340-355; src/lib/server/prisma-dal.ts:1677-1687, 1711-1714; docs/SESSION-PROMPT-AGENT-BUILD.md:84-88

**Proposed handling** — Split the table in the same migration that drops `tier`: `AffiliateAccount` (userId, code, counters — the row every player gets) and `AffiliateAgent` (applicationId, approvedAt, commissionPct, active, deactivatedAt — a row that exists ONLY for an approved agent). Then 'is this an agent' is row-existence, not a nullable-column convention, and no filter can be forgotten. Make `commissionPct` NOT NULL with NO default on the agent table — an agent row without a rate must be impossible to create. Mirror the shape in both DAL backends and add a guard that the two backends return the same rate for the same fixture.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding's core (an agent record with no rate must be impossible), drop the rename, and make the control one this repo can actually run red.

1. DO NOT rename. Leave `AffiliateAgent` as the per-player referral account — that is exactly what it is — and add a NEW model for the vetted facts:
   `AgentRecord { userId @unique, applicationId, approvedAt, commissionPct Decimal @db.Decimal(5,2)  // NOT NULL, NO @default, active Boolean @default(false), deactivatedAt, updatedAt }`
   created ONLY by `approveAgent`. This gets row-existence with zero risk to codes already live in the wild, and `/admin/agents` reads the agent table so there is no filter anyone can forget. In the same migration drop `tier` and `commissionPct`/`active` from `AffiliateAgent` — leaving a dead 5.00 on every player row is the trap re-armed.
   If the split is judged too heavy for this programme: one table is survivable, but then the mandatory changes are `commissionPct Decimal? @db.Decimal(5,2)` with NO default and `active Boolean @default(false)`. Nullable-with-no-default is what makes the refusal representable; NOT NULL with a default is what killed it.

2. ONE resolver, and it REFUSES. `agentRateFor(userId)` returns a rate only when role===AGENT AND the agent row exists AND `active` AND `approvedAt`; otherwise it refuses and pays nothing. It must never reach `cfg.commission.rate` for an AGENT (leak 3). Refusal is safe on the money path — `market-service.ts:3743-3748` already wraps `onRecruitSettlement` in try/catch + audit, so a settlement cannot break — but give it its OWN audit action (`affiliate.commission.no_rate`) instead of letting it land in the generic `affiliate.settlement_accrual_error`, and surface it in the agent sub-ledger as an unpaid accrual so an officer reconciles it rather than it vanishing.

3. `approveAgent` takes the rate as a REQUIRED argument and writes `User.role = AGENT` + the `AgentRecord` + the rate in ONE transaction. No path anywhere creates an agent record without a rate, and role and row can never disagree.

4. The controls, in the style this repo already uses (`scripts/kyc-approved-copy.test.mts:204-210` greps the source because the runtime suite cannot reach the branch):
   · STATIC: assert `prisma/schema.prisma` declares no `@default` on the agent rate column; assert the refusal branch of the resolver does not mention `cfg.commission`; assert `StoredAgentRecord` and the Prisma model declare identical field sets, so a column can never exist in one backend only. That last one is the real answer to the DAL split — a runtime parity test can't run without a database, but a field-set diff runs in `test:all`.
   · RUNTIME (in-memory, so it ships in `test:all`): approve an agent through the real service, settle a recruit's position, assert the payment is ZERO and the `no_rate` audit fired. Then verify the guard by DELETING the refusal and watching it go red — otherwise it is a guard asserting its own doc comment.

5. Keep the new sub-ledger off `db.affiliate.list()` entirely — paginate at the DAL. `getAdminAffiliateStats` (affiliate-service.ts:731-746) is already an unbounded scan plus an N+1 user lookup per row; building the agent sub-ledger on that shape puts a row-per-player scan behind an officer page.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the split — with no live agents and all-test data the migration is free, and the plan's own "complete and final / no `tier` column nobody sets" commission argues for it. But do it in this shape:

1. NAME. Rename the existing row-per-player table `AffiliateAgent` → `AffiliateAccount`, repoint the `User.recruitedBy` FK (schema.prisma:245-246, relation "AgentRecruits" → "AffiliateRecruits") at it, and rename all six `pc().affiliateAgent.*` sites. Name the NEW agent-only table `AgentProfile` — never reuse `AffiliateAgent`, so no call site can survive the swap by compiling against a name whose meaning changed. Drop `tier`, `commissionPct` and `active` from `AffiliateAccount` entirely; they were never player concepts.

`AgentProfile`: `userId @unique`, `applicationId @unique`, `approvedAt DateTime` (NOT NULL), `commissionPct Decimal @db.Decimal(5,2)` NOT NULL with NO default, `active Boolean`, `deactivatedAt DateTime?`. An agent row without a rate must be unconstructible. Created only inside `approveAgent`, in the same transaction as the role flip.

2. RESOLVER — price by the attribution's programme, refuse rather than fall back. Do not ask the referrer's row what it is; ask the attribution what it was:

```ts
// programme comes from User.recruitedByProgramme, stamped once at bind — never re-read.
async function rateFor(referrerUserId: string, programme: "AGENT" | "PLAYER", cfg) {
  if (programme === "PLAYER") return cfg.commission.rate;
  const p = await db.agentProfile.findByUserId(referrerUserId);
  if (!p || !p.active) return null;          // refuse: accrue nothing
  return Number(p.commissionPct) / 100;      // NOT NULL by construction
}
```

A `null` return means accrue nothing, write an audit (`agent.commission.no_rate`, category SECURITY or MONEY) and surface it on the officer queue — never silently pay `cfg.commission.rate`. This is "gate the offer, never the refusal": the missing rate refuses the payout loudly instead of quietly substituting the player price. It also closes leak 3 properly, which the table split alone does not.

3. WHILE IN `onRecruitSettlement` (affiliate-service.ts:537-559), the AGENT branch must not be gated on `cfg.enabled` (line 546) or `cfg.commission.enabled && cfg.commission.rate > 0` (line 548), and must not use `cfg.commission.windowMonths` (line 554) or the global caps — those are leaks 2 and 4 and the same edit touches all of them. Split the branch by `programme` at the top of the hook, not inside it.

4. GUARDS WITH CONTROLS. Two, both with a mutation that must go red:
   · Cross-backend equivalence: one fixture, `rateFor` under the in-memory store and under Prisma (`USE_PRISMA_DAL=true`), assert identical. Control: give the Prisma column a default again and the guard must fail.
   · No-fallback: an AGENT attribution whose referrer has no `AgentProfile` must accrue ZERO. Control: restore `: cfg.commission.rate` and the guard must fail. Assert the accrual COUNT and the `rateApplied` value, not a sum — the recorded lesson from the bonus guard that reported 43/0 green while crediting.
   Add the Prisma-backed one to `predeploy` (package.json:191), or it is a gate that never runs against the backend production uses.

5. `getAdminAffiliateStats` (affiliate-service.ts:732): the agent sub-ledger must read from `AgentProfile` (bounded by the number of real agents), not `db.affiliate.list()`. Leave the player leaderboard's scan alone if you like, but do not build §6 on top of an unbounded scan plus an N+1 `handleFor` per player row.

---

### 🔴 The build prompt commissions a clawback on settlement reversal, but no settlement reversal exists and the platform has a standing ruling against post-settlement clawback

**Severity** critical · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

SESSION-PROMPT-AGENT-BUILD.md:92 orders 'Add clawback on settlement reversal — J4's recorded exit criterion, and it does not exist yet', and the live-verification script (line 151) says 'Then reverse the settlement and confirm the clawback'. Neither is buildable as written:

1. There is no settlement-reversal path in this codebase. Grepping the services finds no reverse/resettle/unsettle operation. The only remedy that can change a verdict is `upholdObjection`, and it is reachable ONLY while `settledAt` is null — objections FREEZE settlement rather than undo it.

2. The platform has already RULED on this. objections-service.ts:463-465: 'Both remedies are only reachable while settledAt is null. If the market somehow settled underneath us, we refuse rather than attempt a clawback.' And :499-501: 'Should be impossible... but if it ever happens we refuse loudly rather than invent a clawback.' Building a clawback into the affiliate path introduces exactly the mechanism the money design deliberately refuses.

3. Even if a reversal existed, the clawback has nothing to take. Commission lands as real withdrawable cash and the agent can withdraw it within minutes. The only officer money-move tool, `adminAdjustBalance`, is overdraw-guarded and refuses a debit that would drive the balance negative (wallet-service.ts:1885-1893), and money-invariants law 1 (NO-NEGATIVE) forbids it anyway. So the clawback would silently fail on precisely the accounts it exists for.

A session that follows this prompt will spend a workstream on an unreachable feature and then be unable to complete verification step 3, which is the step that would have caught it.

**Evidence** — src/lib/server/objections-service.ts:463-465, 499-501; src/lib/server/wallet-service.ts:1885-1893; scripts/money-invariants.test.mts:12-14; docs/SESSION-PROMPT-AGENT-BUILD.md:92, 151

**Proposed handling** — Strike the clawback from this build and re-read J4's exit criterion against how settlement actually works: commission accrues only at settlement from the fee actually collected, and the VOID / one-sided branches already pass fee 0 (market-service.ts:3624-3628), so 'commission on a reversed/refunded deposit' is already impossible by construction — record that as the answer and prove it with a red harness. If Ali later wants a genuine recovery, the only shape consistent with this platform is a NEGATIVE ReferralReward row plus a house receivable against future accrual, never a wallet debit. Get that ruling before building it.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the proposed handling — it is right — but it is incomplete in three ways, and as written it would let the same defect return next session.

1. AMEND THE AUTHORITY, NOT JUST THE PROMPT — this is the important one. The clawback was not invented by the prompt; it is quoted from MODULE-CERTIFICATION-PROGRAM.md:894 ("reversal claws back commission"). Strike it from docs/SESSION-PROMPT-AGENT-BUILD.md:92,151 AND rewrite J4's exit criterion at :894 in the SAME commit, or the next session re-derives the identical unbuildable requirement from the certification authority — which outranks the build prompt. New J4 exit text, tied to the mechanism: "Commission accrues ONLY at settlement, from the fee actually collected; the refund branches (one-sided, VOID, emergency void) accrue nothing by construction, and no post-settlement reversal exists — proven by a red harness, not by a clawback."

2. REWRITE VERIFICATION STEP 3, DO NOT DELETE IT. The prompt's step 3 is the step that would have caught this, so replacing it with nothing loses the control. Replace "Then reverse the settlement and confirm the clawback" with a drive that is actually reachable: settle a market with an agent recruit's position and confirm exactly one COMMISSION row; then, on a SECOND market, emergency-void it while the recruit holds an OPEN position and confirm ZERO ReferralReward rows for that agent; then confirm emergencyVoidMarket REFUSES on the already-settled first market (market-service.ts:3998-4002). That drives the real refusal instead of a fictional reversal.

3. THE RED HARNESS MUST MUTATE THE ACCRUAL SITE, NOT ASSERT THE HAPPY PATH. "Impossible by construction" is a STRUCTURAL property of where the accrual call sits — inside the `settleFee.pool > 0 && settleFee.fee > 0` branch at market-service.ts:3626-3628, flushed at :3744 downstream of the settlement transaction. A future edit hoisting that push above the fee guard, or adding an accrual to the refund branches, breaks it with nothing going red. Per Ali's standing rule that a guard must be proven by MUTATION: the control must go RED when the `settleFee.fee > 0` guard is deleted from a KP_SRC copy, and RED when onRecruitSettlement's `if (!(opts.operatorFee > 0)) return;` early return (affiliate-service.ts:538) is removed. A harness that only asserts "voided market produced no rows" passes trivially on a codebase where the guard has been deleted but the void path happens not to reach it — that is a guard matching its own doc comment.

Also: do NOT build the NEGATIVE-ReferralReward recovery shape now, even though it is the right shape. It needs an owner ruling first (it creates a house receivable against future accrual — a new money concept), and there is no reversal to trigger it. Record it in AGENT-PROGRAMME.md as a deferred design note with the reason, so it is not silently lost.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the core (strike the clawback from the build), but do the whole job in one pass:

1. Prompt — REPLACE, don't delete. `SESSION-PROMPT-AGENT-BUILD.md:92`: strike "Add clawback on settlement reversal" and put in its place the true invariant plus the guard that proves it. Keep the `sourceRef` half of that bullet — it is a separate, real, buildable gap. At :151 replace "reverse the settlement and confirm the clawback" with the drive that actually exercises the criterion: "settle a ONE-SIDED and a VOID market carrying that agent's recruit; confirm ZERO ReferralReward rows and an unchanged withdrawable balance."

2. Amend the source, same commit. `MODULE-CERTIFICATION-PROGRAM.md:894` Exit becomes: "Self/cyclic referral impossible, rewards exactly-once, and NO clawback exists or is needed — commission accrues only from a fee actually collected (`affiliate-service.ts:538`, `market-service.ts:3626`), the refund arms accrue nothing, and settlement is terminal (`objections-service.ts:501`, `market-service.ts:4002`). 6 orphans adopted or deleted." The attack line "commission on a reversed/refunded deposit" stays — it is now a proven refusal, not an open hole.

3. Correct the two false statements that regenerate this. `COMPLIANCE-DECISIONS.md:1664` — `emergencyVoidMarket` is NOT a post-payout reversal path; it refuses on `settledAt`. State the real Up&Down remedy (or state plainly that post-payout there is none and disputes go to support/adjustment). `objections-service.ts:322` — drop "Use the reversal path" from the officer-facing error; it sends an officer looking for a tool that does not exist.

4. The guard, with a control that must go RED. Not a service-level fee ≤ 0 assert (already green at `affiliate-security/route.ts:112`). Drive the real `settleMarket`: an attributed recruit in (i) a one-sided market and (ii) a VOIDed market ⇒ zero `ReferralReward` rows; and a normal settled market ⇒ exactly one row whose `amountTzs === round(attributableFee × rateApplied)`. Prove it by MUTATION on a `KP_SRC` copy with the harness locked: delete `&& settleFee.fee > 0` at `market-service.ts:3626`, or move the accrual push into the refund arm — both must turn it red. A settled-market terminality anchor belongs alongside it: `upholdObjection` and `emergencyVoidMarket` both refuse when `settledAt` is set, and the anchor goes red if either guard is removed.

5. Do NOT pre-authorise the negative-row shape. Record it as a question for Ali, not a design. If he ever wants recovery, the row cannot be a signed COMMISSION row: it needs its own type (COMMISSION_REVERSAL) excluded from the cap-headroom sum at `affiliate-service.ts:567-573` and included BY NAME in every net read model (`totalEarnedTzs`, the admin leaderboard at :739-746, the sub-ledger) — the `house-ledger.ts:226-235` incident is the proof of what happens when a reversal row meets a filter that was written before it existed. Never a wallet debit: `wallet-service.ts:1890` and money-invariants law 1 forbid it, and it would fail precisely on the agent who already withdrew.

---

### 🔴 Third-party referee national IDs land outside erasure and outside the retention schedule

**Severity** critical · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Two of the seven required documents are 'clear copies of the referees' national identification documents' (AGENT-PROGRAMME.md:66-69). These are identity documents belonging to people who are not platform users, have no account, and have no route to exercise a data right here.

The plan reuses `putKycDocument` for storage (SESSION-PROMPT-AGENT-BUILD.md:32) but carries none of the obligations that come with that bucket:

· `erasure.ts` is explicit about its scope: 'this module cannot reach them. It names what it writes' (erasure.ts:55-56). A new `AgentApplicationDocument` table is not named, so agent documents are outside erasure entirely — including the account holder's own CV and letters.
· `DATA-RETENTION.md:24` publishes the 7-year identity-document schedule against exactly three stores: `KycSubmission`, `KycDocument`, R2 `50pick-kyc`. The new table gets no row, so R2 objects for referee IDs are written into the governed bucket under no published period at all.
· `test:erasure` asserts the hold constant matches the published schedule (erasure.ts:81-82). It cannot detect a table nobody added.
· The build prompt's §7 documentation list (SESSION-PROMPT-AGENT-BUILD.md:126-130) names RULES.md, AGENT-PROGRAMME.md, MODULE-CERTIFICATION-PROGRAM.md and LIVE-QA-CAMPAIGN.md. It does not name DATA-RETENTION.md, DATA-LAYER.md's retention column, or erasure.ts.

This holds identically under options A, B and D — it is not a discriminator between them, it is simply missing from all of them.

**Evidence** — docs/AGENT-PROGRAMME.md:66-69; src/lib/server/erasure.ts:55-56, 81-84; docs/DATA-RETENTION.md:24; docs/SESSION-PROMPT-AGENT-BUILD.md:32, 126-130

**Proposed handling** — Add `AgentApplication` / `AgentApplicationDocument` rows to DATA-RETENTION.md §1 and §2 with an explicit period, and extend `erasure.ts` to name them (documents on the same 7-year hold as KYC images, the application's free text pseudonymised immediately) in the same commit as the schema. Decide and record the referee position before launch: either the applicant must supply written referee consent (uploaded as an eighth artefact) and a stated destruction date, or referee IDs are viewed-and-attested by the officer without being stored at all. Do not ship the upload slots until that ruling is written down.

**⭐ A verifier disagreed with that handling and proposed:**

Take the ruling first, and make MINIMISATION the default rather than a 7-year hold.

1. RULE (Ali's, recorded in `AGENT-PROGRAMME.md` §9 as a framework correction, because it deviates from "must include attached clear copies", and carried into the corrected framework document): the referee ID is VERIFICATION EVIDENCE, not a retained record. The officer views the copy at review and records an attestation on the application — referee name, ID type, last four digits, officer id, timestamp — and the IMAGE is destroyed at decision (approve or reject), not held. This is the same shape as the fee attestation the programme already uses (`feeReconciledAt` / `feeReconciledById`), keeps the framework's verification intent, gives the Gaming Board a legible trail, and removes an unbounded third-party identity store from the estate. The referee LETTER (name, position, contact, signature — supplied deliberately by the referee) can be retained with the applicant's file; the ID scan is what should not survive the decision.

2. IF Ali instead rules the images are held, then they need their own row with their own anchor: period measured from the APPLICATION DECISION DATE, never from the applicant's `closedAt`, plus a notice the applicant must pass to the referee, plus a purge job. A row whose Enforcement column reads "policy" is what `DATA-RETENTION.md`'s own preamble calls the defect, not the control.

3. EITHER WAY, in the same commit as the migration, name the new stores in all three enumerated places — not two: `docs/DATA-RETENTION.md` §1 (its own row and period; ⛔ not RULES.md — periods have one home), `src/lib/server/erasure.ts` (the applicant's application free text and contact pseudonymised immediately, documents on whatever tier §1 says), and `src/lib/server/privacy.ts` `buildDsarBundle` (:264-283), whose completeness promise is otherwise false the day the table exists.

4. ADD THE CONTROL THAT GOES RED, which is the part that stops the next table slipping through: extend `scripts/erasure.test.mts` §8's `buckets` literal (:519-531) with the agent stores and add them to `MUST_HAVE_CONTENT` so an unread store cannot pass as clean; add a red case to `scripts/erasure-red.mjs` that puts a referee ID back and must be caught. Then the durable one — assert that every Prisma model carrying a document/`storageKey` field appears in `DATA-RETENTION.md` §1's Where column, and prove it goes red by deleting one row. Hand-adding two rows fixes this instance; that guard fixes the class.

5. Add `DATA-RETENTION.md`, `erasure.ts` and `privacy.ts` to the build prompt's §7 documentation list, alongside the existing DATA-LAYER.md entity-map obligation in §10.

6. The finding's "do not ship the upload slots until the ruling is written down" is right and should stand — but as one of the decisions the programme takes before it starts, not a late blocker, since the prompt commissions one complete-and-final build.

**⭐ A verifier disagreed with that handling and proposed:**

A · RULE ON THE REFEREE IDs FIRST, AND PREFER THE STORAGE-FREE BRANCH. Record it as a sixth row in `AGENT-PROGRAMME.md` §9 ("Where the framework is wrong about this system") — the mechanism exists and needs no new ceremony: **50pick does not retain third-party identity documents.** Two buildable shapes, ranked:
  (1) DO NOT COLLECT THEM. Require the referee letter to state the referee's name, position, phone and ID number; the officer verifies the referee by CALLING them and records an attestation on the application (officer id + timestamp + outcome), in the decision rail `kyc-service.ts` already models. This meets the framework's actual purpose — proving the referee is a real, identifiable, reachable person — with no third-party image in the bucket, no erasure route owed to a non-user, and no new retention row. It is also the only branch whose control we can verify ourselves.
  (2) If Ali insists the copies are collected: a VERIFY-THEN-DESTROY slot. The object is written, the officer attests "referee 1 ID sighted", and the bytes are destroyed AT THE DECISION — approve and reject alike — through `deleteKycDocument`, carrying erasure.ts's failed-object rule verbatim (the row survives if the delete refused, so a re-run finishes it; `erasure.ts:272-298`). The attestation, not the image, is the retained record. Never 7 years, and never on the account-closure clock, because it must not depend on the applicant ever closing an account.
  Under either branch, referee material must never reach the `kyc/` prefix.

B · SEPARATE THE OBJECTS AT THE KEY, INSIDE THE EXISTING SEAM — §10's "no second storage path" stands. `putKycDocument` hardcodes `kyc/` (`storage.ts:76`); give it an explicit prefix argument (`kyc/` default, `agent/` for applications) in the same commit as the schema. Without this, every agent document is indistinguishable from a national ID scan to any bucket lifecycle rule, restore, or operator reading `DATA-RETENTION.md:24` — and the schedule row for the applicant's own file can never be enforced or audited.

C · FOR THE APPLICANT'S OWN FILE, USE THE PERIOD THE BASIS SUPPORTS — do not borrow POCA's. CV, the two letters, the Serikali ya Mtaa letter and the fee receipt are a business-partner and tax record: TRA Income Tax Act §80 is already the cited basis on the transactions row. State a period measured from APPLICATION DECISION or AGENT DEACTIVATION, not account closure. Free text — rejection reason, officer notes — is pseudonymised IMMEDIATELY under the rule erasure.ts already applies to `extraRequests[].description` (`erasure.ts:251-269`: an officer's sentence names the person and is not a document, so no statute protects the sentence). Then, in the same commit as the migration: name the tables in `erasure.ts`, add them to `buildDsarBundle` (`privacy.ts:264-281`), and add them to the `buckets` list in `erasure.test.mts:519-531` — the sweep that found `extraRequests` is blind to a store nobody listed.

D · MAKE THE RECURRENCE IMPOSSIBLE, WITH A CONTROL THAT MUST GO RED. Add a guard that reads `prisma/schema.prisma` and asserts every model carrying a `storageKey`-shaped column or a document relation appears either as a row in `DATA-RETENTION.md` §1 or on an exemption list with a stated reason — with a red case that plants such a model and must be caught, and the stale-exemption assertion the build prompt's own trap table demands (line 186). This is the difference between fixing this table and fixing the class.

E · SEQUENCING — block the enum, not the build. The §9 ruling is one paragraph and belongs in the FIRST commit of the programme, before `AgentDocType` is written: those seven enum values are what freeze the decision into the schema, the upload UI, three locales of i18n keys and the officer rail. Ship nothing that names a referee-ID slot until the row exists in §9 and in DATA-RETENTION.md §1.

---

### 🟠 Architecture verdict: B is right about the ledger and wrong about the attribution — the missing option is D (a first-class ReferralAttribution table)

**Severity** high · **Kind** architecture · ⭐ **FIX DISPUTED**

Reading the code, the three named options resolve like this.

C (fully shared, role branch) is already refuted by the four known leaks plus finding #2 below: every policy question (rate, cap, window, destination, enabled) is answered by one global `getAffiliateConfig()` read that a GROWTH officer owns, and `feature-state.ts` is the only role-aware seam. It cannot hold a per-agent contract.

A (fully separate service + AgentRecruit/AgentCommission tables) is the only option that makes attribution forkable, and that is precisely its defect: `bindRecruit` refuses on `recruit.recruitedBy` already being set (affiliate-service.ts:251), and that is the ONLY enforcement of 'one referrer per recruit'. Split the attribution across two tables and that check becomes a two-table read with no DB constraint behind it — the exact double-attribution the authority (AGENT-PROGRAMME.md:145) says must be impossible. It also duplicates the four hardest things already proven here (advisory locks, idempotency, the settled-fee accrual point, RG suppression) into a second money path that no existing guard covers.

B (shared attribution + shared ledger + `programme` discriminator) is right about the LEDGER. `ReferralReward` is the only place a regulator's question 'what did we pay whom, at what rate' is answerable, and `programme` + `rateApplied` make agent cost separable from promo cost. Keep that.

B is wrong about ATTRIBUTION, and D is the option nobody named. Today attribution is `User.recruitedBy` — a column whose foreign key points at `AffiliateAgent.userId` (schema.prisma:245-246), not at `User.id`. That single fact causes: (a) every player must have an AffiliateAgent row, which is why that table has one row per player (finding #4); (b) it already killed a production restore — `AffiliateAgent_userId_key` was dropped from the dump precisely because a FK pointed at it (scripts/db-backup.mts:296-301); (c) the attribution carries no `boundAt`, no `programme`, no `viaCode` and no referrer-role-at-bind, so nothing can ever contradict a later reward's stamp (finding #1); (d) DSAR: erasing an agent empties `User` but leaves a live attribution graph pointing at the tombstone, and cascade-deleting their AffiliateAgent row would SetNull every recruit's attribution silently.

D: `ReferralAttribution { recruitUserId @unique, referrerUserId, programme, boundAt, viaCode, referrerRoleAtBind, agentApplicationId }`, both FKs to `User.id`. `recruitUserId @unique` is the DB constraint that makes 'one referrer, one programme' enforceable rather than aspirational; it is the only place the invariant can live. It restores in the same wave as User (no @unique-target FK), it is a discrete row for erasure to name, and it makes the framework's sub-ledger an indexed query instead of a full user scan (finding #8).

On 'which one governs when programme disagrees': the ATTRIBUTION must govern eligibility and programme; the REWARD records what was actually paid and at what rate. A mismatch must be a hard refusal plus a COMPLIANCE audit, never a silent re-stamp — because the reward's stamp is derived from mutable state and the attribution's is recorded once. There are no real agents and all current data is test data, so D costs one migration now and is unbuildable at this price ever again.

**Evidence** — prisma/schema.prisma:245-246 (`recruitedBy` FK targets AffiliateAgent.userId); src/lib/server/affiliate-service.ts:251; scripts/db-backup.mts:296-301; docs/AGENT-PROGRAMME.md:145,152-156

**Proposed handling** — Keep the shared ReferralReward ledger with `programme` + `rateApplied` exactly as proposed. Replace `User.recruitedBy` with a `ReferralAttribution` table in the same migration, with `recruitUserId` unique, `programme`, `boundAt`, `viaCode` and `referrerRoleAtBind` written at bind. Make attribution the governing source for programme and eligibility; make a reward whose computed programme disagrees with its attribution a refusal + COMPLIANCE audit, not a re-stamp.

**⭐ A verifier disagreed with that handling and proposed:**

Do not build D. Three separable changes get every real benefit at a fraction of the risk.

**1 · Keep attribution on `User.recruitedBy`; add the missing metadata as columns beside it.** In the same migration: `recruitedByProgramme` (AGENT|PLAYER, nullable), `recruitedAt` (DateTime?), `recruitedViaCode` (String?), written by `bindRecruit` at `affiliate-service.ts:304`. This keeps the 0..1 cardinality that already makes "one referrer" structural, adds no DAL surface, and needs no backfill — legacy rows read NULL, and NULL already means exactly what `referrerMayEarn` (`affiliate-service.ts:367-370`) treats it as: a pre-gate player-era bind. Critically, the finding's premise for a rip-and-replace is wrong: `docs/BONUS-WITHDRAWAL.md:147` records that legacy `recruitedBy` rows were found *still paying real cash*, and lines 174-175 say production "has **not** been re-measured". "All current data is test data" is unverified, and a migration that moves live money attribution on that assumption is the wrong bet.

**2 · Re-target the FK, on its own merits.** `prisma/schema.prisma:246` → `references: [id]` on `User`, dropping the `AgentRecruits` relation through `AffiliateAgent`. Pure constraint swap (values are already User ids), removes the `@unique`-target FK that broke the restore, and removes the requirement that a referrer hold an `AffiliateAgent` row. This is the genuinely correct half of the finding.

**3 · Fix the sub-ledger scan with an index, not a table.** Add `@@index([recruitedBy])` to `User` (absent today — 262-263 index only `[role,status]` and `[createdAt]`) plus a `db.user.listRecruitsOf(userId)` DAL method, and replace the `db.user.list()` full scans at `affiliate-service.ts:649` and `:735`. ⛔ Implement it in **both** backends in the same commit — `store.ts:1358-1360` warns the memory db is exported as a blind cast, so a missing twin is a runtime TypeError no `tsc` sees. That is the whole of the sub-ledger cost the finding attributes to D.

**4 · Reject the proposed refusal semantics outright.** "A reward whose computed programme disagrees with its attribution is a hard refusal" is a money-stopping gate at settlement: the agent's commission silently never accrues. That is the same shape as leak #2 (`if (!cfg.enabled) return`) — a policy read that returns early and stops paying agents. Gate the offer, never the refusal. Correct behaviour on disagreement: **pay, at the AGENT rate, from the agent's own row**; write the reward with `programme` taken from the attribution stamp and `rateApplied` from the agent row; set status `HELD` (the pattern already in `payTo`, `affiliate-service.ts:391-398`) and raise a COMPLIANCE audit so an officer resolves it. Money is never destroyed by a disagreement; it is parked where a human can see it.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the shared `ReferralReward` ledger with `programme` + `rateApplied` exactly as planned, and keep the mismatch rule — the finder is right about that half. Drop the new table; do three targeted things instead.

1. Stamp the attribution IN PLACE, as columns on User written once at bind alongside `recruitedBy` (`affiliate-service.ts:304`): `recruitedAt DateTime?`, `recruitedProgramme String?` (`AGENT|PLAYER`), `recruitedViaCode String?`, `recruitedReferrerRole UserRole?`. Same row, so "one referrer, one programme" stays enforced by column cardinality and `already_bound` at `:251` stays a one-row read. Backfill is trivial and honest: existing rows get `recruitedProgramme = PLAYER`, `recruitedAt = NULL` — which is precisely the population that must not become agent commission.

2. Change the invariant at `docs/AGENT-PROGRAMME.md:154`. The programme is decided by the ATTRIBUTION's stamp at bind, not by the referrer's role at accrual. This is the whole fix for the retroactive-promotion leak: `referrerMayEarn()` and the three hooks (`onRecruitBet:492`, `onRecruitDeposit:541`, `onRecruitSettlement:607`) read `recruit.recruitedProgramme` to select the pricing policy, and a newly approved agent earns AGENT commission only on recruits bound AFTER approval. Recruits bound while they were a plain player stay `PLAYER` — and since the player promo is WITHDRAWN, they pay nothing, which is the correct answer.

3. Fix the FK cheaply rather than by relocation: retarget `prisma/schema.prisma:246` to `references: [id]` on `User`. The `recruitedById` / `AffiliateAgent.recruits` relation (`schema.prisma:852`) is dead — it is not read in `prisma-dal.ts` or anywhere else (`affiliate-service.ts:649` filters `db.user.list()` in memory). One migration, no read-path change, and it removes the @unique-target FK that `scripts/db-backup.mts:296-301` had to work around.

Then keep the finder's mismatch rule verbatim: at accrual, if the programme computed from the referrer's current role disagrees with `recruit.recruitedProgramme`, REFUSE the accrual and write a COMPLIANCE audit — never re-stamp. And give it the control that must go red: a dev-test that promotes a player-era referrer to approved AGENT and asserts their pre-existing recruits accrue ZERO agent commission, which fails today and after the plan as written.

---

### 🟠 Commission is priced on the GROSS operator fee — 15% of it has already left as TRA and GBT levies

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

`onRecruitSettlement` is handed `attributableFee = (p.stake / settleFee.pool) * settleFee.fee` (market-service.ts:3626-3628), and `settleFee.fee` is the fee BEFORE levies. Fourteen lines later the same function computes `levySplit(settleFee.fee, settleCfg)` (market-service.ts:3668), which returns `operatorNet = fee - traLevy - gbtLevy` at defaults of 10% TRA + 5% GBT (payout.ts:124,126). The net figure is available and unused.

AGENT-PROGRAMME.md:110-116 justifies the whole settlement-time design with 'You cannot pay out a share of money you did not earn.' That is only true against the gross fee. Against money the operator actually kept, the claim is false by 15%: an agent on a 30% rate is being paid 30% of gross, which is 35.3% of net. It also silently changes what the commission ceiling in RULES §2.10 means — a ceiling written against gross is a materially higher number than the same figure against net, and nothing on the page will say which base it is.

Because the levies are statutory remittances to TRA and the Gaming Board, paying a partner a share of money already owed to a regulator is the version of this that is hardest to explain afterwards.

**Evidence** — src/lib/server/market-service.ts:3626-3628, 3668; src/lib/payout.ts:124, 126, 857-865; docs/AGENT-PROGRAMME.md:110-116

**Proposed handling** — Pass `levySplit(settleFee.fee, settleCfg).operatorNet` prorated by `p.stake / settleFee.pool`, not `settleFee.fee`. State the base explicitly in RULES §2.10 ('% of operator net fee, after TRA and GBT levies') and correct AGENT-PROGRAMME.md §5, since the current wording is the reason the wrong base looks right. Add a guard fixture with non-zero levy rates that asserts commission <= operatorNet share — with the levies set to 0 as the control.

**⭐ A verifier disagreed with that handling and proposed:**

The direction is right — prorate `operatorNet`, not `fee`. But the proposed handling has one defect that would ship the bug green, and two omissions.

⛔ THE PROPOSED GUARD CANNOT GO RED. "assert commission <= operatorNet share" passes on the live bug: at the 50% default, 50% of gross is 58.8% of net, which is comfortably ≤ 100% of net. The assertion is only violated at a rate above ~85%, which no officer will set. It is an instrument that is green while measuring the wrong thing. The control must be an EQUALITY against a hand-computed number, with the levies at 0 as the control that must produce the OTHER number:
  · pool 400,000, fee 30,000, stake 100,000, rate 0.30, TRA 0.10 / GBT 0.05
    → operatorNet 25,500; attributable 6,375; commission MUST equal 1,913.
    Today's code yields 2,250. Delete the levy correction and this fixture goes red.
  · same fixture with traTax = gbtLevy = 0 → commission MUST equal 2,250 (the control: with no levies the two bases coincide, so a fixture that stays red here is testing the harness, not the rule).

1 · COMPUTE THE SPLIT ONCE, ABOVE THE LOOP. Do not call `levySplit` a second time at line 3627. Hoist it to just after line 3220:
    const settleLevies = levySplit(settleFee.fee, settleCfg);
then use `settleLevies.operatorNet` in the accrual AND pass `settleLevies` at line 3668. Two call sites over one fee is how the audit chain and the payout drift apart — this file already carries a 🔴 comment at 3596-3602 about exactly that (a hand-written push copy that kept a false money string after the emitter was fixed). One computation, two readers.

2 · GATE ON NET, NOT GROSS. Change line 3626 to `if (settleFee.pool > 0 && settleLevies.operatorNet > 0)`. Under a hypothetical 100% levy the operator keeps nothing and must pay nothing — the same rule as the one-sided poll, applied on the axis that now matters. (`onRecruitSettlement:538` refuses `!(operatorFee > 0)` anyway, so this is belt-and-braces, but the refusal belongs where the fee is known.)

3 · RENAME THE BASE, OR IT WILL REVERT. `onRecruitSettlement(recruitUserId, { operatorFee })` and its 19-line doc block (affiliate-service.ts:516-535) both assert the base is "the fee we actually charged". Leaving that name and that comment is how the next session re-derives gross and thinks it is fixing a bug. Rename the field to `operatorNetFee` at both ends and rewrite the comment to name the levies. Same pass, same commit.

4 · DOCS IN THE SAME PASS, THREE PLACES — not two. AGENT-PROGRAMME.md §5:110-116 (the "money you did not earn" sentence, which is the false one); the affiliate-service.ts:517-535 block; and RULES.md, where §2.10 must be WRITTEN — not amended — to say "% of operator NET fee, after the TRA 10% and GBT 5% levies of §2.2", with the ceiling expressed against that base and a cross-reference from §2.2. §2.10 is currently a forward reference from three lines of AGENT-PROGRAMME.md to a section that does not exist; writing it against the wrong base is the version that is unrecoverable, because `rateApplied` will have recorded history against it.

5 · WHAT MAKES THIS SAFE, AND WORTH SAYING IN THE COMMIT. `traTaxOnCommissionRate` and `gbtLevyOnCommissionRate` are fields of `FeeSnapshot` (payout.ts:267-268), and `settleCfg = ratesFor(m)` (market-service.ts:3209) resolves the market's FROZEN snapshot. So pricing on net inherits the same freeze guarantee as the fee itself — a later levy change cannot retro-price an old poll's commission, and RULES §2.1's "a snapshot is never rewritten" still holds. No new drift surface.

6 · SET THE CEILING WITH THE BASE. Once the base is net, the §2.10 ceiling should be chosen knowing the `affiliate-config.ts:83` fallback is 0.5. Leak #3 (rateFor() falling through to the player rate) and this finding compound: fixed together, the refusal on a missing agent rate must fire BEFORE any base arithmetic, so an unpriced agent earns nothing rather than 58.8% of net.

What NOT to do: do not "fix" this by lowering the agent rate to compensate for the gross base. That leaves two undocumented bases in the codebase and makes the §2.10 number un-auditable against the /admin/finance column that already reports net.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the direction (price on net, say so in RULES) but make it recorded, bounded, and provable.

1. HOIST, DO NOT DUPLICATE. Move `const levies = levySplit(settleFee.fee, settleCfg)` from market-service.ts:3668 to ABOVE the settlement loop and let both the audit payload and the accrual read that one value. Two independent levySplit calls on the same settlement is a second version of the truth.

2. PASS BOTH NUMBERS, PRICE ON NET. `pendingReferralAccruals` carries `{ userId, operatorFeeGross, operatorNet }`, both prorated by `p.stake / settleFee.pool` from the hoisted split. onRecruitSettlement prices on `operatorNet`. Keeping gross is not optional: the sub-ledger's "revenue generated" column (AGENT-PROGRAMME.md §5's display promise) is a gross figure, and deriving it from the paid amount later is guesswork.

3. RECORD THE BASE ON THE ROW. Add `feeBase` ("OPERATOR_NET") and the base amount to ReferralReward alongside the planned `rateApplied`/`programme` (schema.prisma:987-1003, both DAL backends). Without it no reconciliation can distinguish a 30%-of-gross row from a 30%-of-net row, and AGENT-PROGRAMME.md's own cited precedent — `PredictionMarket.feeSnapshot` — argues for recording the terms, not merely re-pricing.

4. ENFORCE THE CEILING AT THE DOOR, NOT AT THE ACCRUAL. Write §2.10 in the full Decided/Enforced in/Configured in/Stated to/Guarded by form, base named explicitly ("% of the operator fee AFTER TRA and GBT levies"), and bind BOTH doors to it: the agent rate control in the compliance workstation, and `validateAffiliateConfig` (affiliate-config.ts:129), whose current 0..1 bound is what actually permits an over-payment. A ceiling only in a doc is a rule nobody enforces — the same argument AGENT-PROGRAMME.md uses to drop `tier`.

5. THE GUARD, WITH A CONTROL THAT MUST GO RED. Levies=0 is not a control — it makes the two bases identical. The control is the MUTATION: set traTaxOnCommissionRate=0.10 / gbtLevyOnCommissionRate=0.05, revert the accrual to `settleFee.fee`, and require the guard RED; restore and require GREEN. Assert two things: (i) Σ commission on a settled market <= operatorNet, and (ii) a rate above §2.10's ceiling is REFUSED at save, not clamped at settlement. Include one fixture at rate 0.9 — under today's code that settlement pays out more than the operator kept.

6. STATE THE BLAST RADIUS. The call site is shared, so this reprices the player programme too. It is WITHDRAWN (feature-state.ts) so there is no live money impact today, but say so in BONUS-WITHDRAWAL.md and AGENT-PROGRAMME.md §5 in the same commit, or a re-enabled player promo returns on a base nobody decided.

7. FIX THE HOUSE BOOK IN THE SAME PASS. analytics.ts:113-123 and /admin/finance:310 report operatorNet with no referral deduction. Subtract commission paid, or /admin/house ships green and wrong for the fifth time.

8. CORRECT THE DOC WORDING, NOT THE LEGAL CLAIM. Rewrite AGENT-PROGRAMME.md:110-116 to "a share of what 50pick keeps after TRA and GBT" and cite COMPLIANCE-DECISIONS.md D-3, which already made exactly this distinction. Do NOT write "money owed to a regulator" into RULES — the levies are remitted in full either way, and an overstated compliance claim in the rule book is its own defect.

---

### 🟠 Agent commission books to SYSTEM:ADJUSTMENT and appears on no line of the owner's book

**Severity** high · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

Every referral payment routes through `creditWallet` -> `creditInternal`, which posts `internalCreditEntries`: a debit to `SYSTEM:ADJUSTMENT` and a credit to `PLAYER:<id>`, entryType `INTERNAL_CREDIT` (ledger.ts:509-519, :180). Three consequences the plan has not identified:

1. `readWaterfall` (house-ledger.ts:194-242) returns stakeIn, bonusIn, winningsPaid, feeEarned, leviesOut, aggregatorOut, bonusCost. There is no agent-commission line, and `feeEarned` is the GROSS commission-account total. So the owner's net retained on `/admin/house` will be overstated by every shilling ever paid to an agent — the framework's headline deliverable ('automated commission payouts') is invisible in the owner's book. Note `bonusCost` catches the bonus route because it filters entryType `BONUS_CREDIT`; the cash route writes `INTERNAL_CREDIT` and is caught by nothing.

2. `readAdjustmentBackedLiability` sums `entryType = 'ADJUSTMENT'` only (house-ledger.ts:166-173), while `SYSTEM:ADJUSTMENT` also carries `INTERNAL_CREDIT`. The recorded reconciliation at house-ledger.ts:157-160 — 'the net matches the SYSTEM:ADJUSTMENT balance exactly, which is the check that the pairing is right' — holds today only because production has essentially no internal credits. It will diverge by exactly the cumulative agent commission the day the programme goes live, and the divergence will read as a books-don't-balance alarm with no explanation attached.

3. `creditInternal`'s ledger post is fire-and-forget outside any transaction: `postLedgerEntries(...).catch(() => {})` (wallet-service.ts:1832-1833), unlike `adminAdjustBalance` which commits money and ledger atomically under `withMoneyTx`. A failed post moves real cash into an agent's wallet with no ledger group — trial-balance drift, silently.

Classifying a business partner's contractual commission as an 'admin adjustment' is also the wrong account for a Gaming Board licensee: it is a cost of acquisition, not a correction.

**Evidence** — src/lib/server/ledger.ts:180, 509-519; src/lib/server/house-ledger.ts:157-173, 194-242; src/lib/server/wallet-service.ts:1832-1833

**Proposed handling** — Add a dedicated `HOUSE:AGENT_COMMISSION` account and an `AGENT_COMMISSION` entry type, posted debit-house / credit-player, so commission nets against `feeEarned` in the waterfall instead of hiding in the adjustment suspense. Add `agentCommissionOut` to `WaterfallRead` and to the `/admin/house` page in the same commit. Route agent commission through a credit path that commits wallet + ledger under `withMoneyTx` rather than the fire-and-forget `creditInternal`.

**⭐ A verifier disagreed with that handling and proposed:**

Mirror the LEVY convention, which this ledger already uses for exactly this shape of outflow, instead of inventing a suspense-style house account.

1. New entry type `AGENT_COMMISSION` (Prisma enum `LedgerEntryType`, schema.prisma:2058 — one migration), and a new balanced pair in ledger.ts beside `internalCreditEntries`:
   `HOUSE:COMMISSION` −X / `PLAYER:<agentId>` +X, entryType `AGENT_COMMISSION`, carrying txnId and userId.
   Do NOT add a `HOUSE:AGENT_COMMISSION` account. Commission is paid instantly into the agent's wallet; nothing is HELD, so a payable-shaped account is the wrong instrument (HOUSE:TRA_LEVY holds a positive payable until remitted — this has no such stage). Debiting HOUSE:COMMISSION is precisely what settlement already does to book levies.

2. This fixes the balance sheet for free: `housePosition.netRetained = commission` (house-book.ts:151) falls by X with no change to house-book.ts or readHouseAccounts. Verify the safety of the debit: every HOUSE:COMMISSION reader filters `amount > 0` — `feeEarned` (house-ledger.ts:220-222), `feebooked` in readGameRows (:291-292), readUnattributedFees (:331), readFeeBySource (:361) — so the negative leg is invisible to all of them and the GROSS fee lines stay intact, exactly as the levy debits do today. No per-game reconciliation moves.

3. Flow statement: add `agentCommissionOut` to `WaterfallRead` (house-ledger.ts:177-184) as `SUM(amount) WHERE entryType='AGENT_COMMISSION' AND account LIKE 'PLAYER:%' AND amount > 0` — counted once, on its own leg, per the module's stated doctrine at :190-193 — and change `waterfall()` to `netRetained = feeEarned − leviesOut − bonusCost − agentCommissionOut` (house-book.ts:317), with a row on admin/house/page.tsx beside the Bonus cost row at :560. Same commit.

4. Atomicity: do NOT fork a second credit path. Extend `creditInternal` to take the ledger lines it should post (default = today's `internalCreditEntries`, agent payer passes the AGENT_COMMISSION pair) and convert its body to the `adminAdjustBalance` shape — `withMoneyTx` inside the existing `withLock`, wallet.adjust + txn.create + postLedgerEntries(tx) committing together, replacing the fire-and-forget at wallet-service.ts:1833. `withMoneyTx` joins `currentLockTx()` (ledger.ts:58-59), so this is the precedented pattern, and the RG-lockout gate at :1775-1801 keeps serving both callers — one source of truth for the refusal. Proposal prizes get the atomicity fix as a free side effect. Ordering note: the caller's own reward-status write must treat a null return as HELD, which it already does.

5. Control that must go RED (this page has shipped green-and-wrong twice): a Postgres-backed guard that pays one agent commission of X and asserts BOTH `waterfall().netRetained` and `housePosition().netRetained` fall by exactly X and `feeEarned` is unchanged. Prove it by MUTATION — delete the `HOUSE:COMMISSION` debit line from the entry pair and the guard must go red on both assertions. An in-memory run cannot see this (no LedgerEntry model), so the guard must be gated on a real database and must SKIP LOUDLY, never pass, without one.

6. Separately, one line of docs: correct the stale reconciliation recipe at house-ledger.ts:157-160 to say the SYSTEM:ADJUSTMENT balance also carries INTERNAL_CREDIT from proposal prizes, so the next person measuring it does not read a real divergence as a break. Leave `readAdjustmentBackedLiability`'s ADJUSTMENT-only filter alone — it is correct.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the diagnosis, change the booking. Mirror the LEVY pattern, not a new suspense account.

1. Book it as a two-line group: `HOUSE:COMMISSION` -x / `PLAYER:<agentId>` +x, new entryType `AGENT_COMMISSION`. Economically exact — decision 5 prices commission on the operator fee ACTUALLY COLLECTED, so it is a share of the very account that received it, and ledger.ts already debits the TRA/GBT levies straight back out of `HOUSE:COMMISSION` (house-book.ts:19-21). No phantom `HOUSE:` account, nothing new in `all`.

2. This makes `housePosition.netRetained = commission` (house-book.ts:151) self-correct with ZERO change to that hard-locked line, so the balance-sheet KPI (house/page.tsx:289) and the earnings tab agree. The proposal's account choice cannot achieve this.

3. But `grossFeeEarned = commission + leviesPayable` (house-book.ts:152) then UNDER-reports, because the reconstruction is the inverse of the booking and agent commission is now also out. It must become `commission + leviesPayable + agentCommissionPaid`, with `agentCommissionPaid` added to the `housePosition` input. Missing this is the most likely way to ship this "green and wrong".

4. `readWaterfall.feeEarned` (`amount > 0`) is untouched, so add `agentCommissionOut` as its OWN labelled step, read on the PLAYER side by entryType exactly as `bonusCost` is — and NET, not `amount > 0`: `SELECT SUM(amount) WHERE entryType='AGENT_COMMISSION' AND account LIKE 'PLAYER:%'`. The `> 0` filter is the precise bug that overstated bonusCost by 14,000 (house-ledger.ts:229-238) by dropping reversals; a clawed-back commission must reverse. Then `netRetained = feeEarned - leviesOut - bonusCost - agentCommissionOut`, its own row in the house/page.tsx table beside "Bonus cost", never netted into feeEarned.

5. Controls that must go red, in the same commit: re-anchor scripts/anchors/house-book.anchors.mjs:71-72 (its `from` is a literal match on the current expression and will report MISS once you edit it — loud, per red-anchor.mjs, but it stops proving anything until re-anchored), and ADD two mutations — one dropping `- input.agentCommissionOut` and one double-subtracting it — plus a `housePosition` mutation dropping agent commission from `grossFeeEarned`. A new subtracted term with no anchor is a line no control can fail on.

6. Atomicity: yes, route the agent credit through `withMoneyTx` (it returns `fn(null)` with no prisma, ledger.ts:60-62, so the in-memory DAL still works, and it JOINS the enclosing `withLock` tx so it costs no extra connection). BUT preserve the soft-failure contract: inside a tx `postLedgerEntries` THROWS, and withMoneyTx's own note (ledger.ts:51-56) warns a throw rolls back the ENTIRE enclosing lock scope and that aborts must propagate out of `withLock`. affiliate-service.ts:196 treats `null` as "not credited / recorded HELD"; if the new path throws instead, a rolled-back credit gets recorded PAID. Map the abort to `null` at the lock boundary and assert that with a test.

7. Per-market: `onRecruitSettlement` knows the marketId — stamp it on the PLAYER-side line so `gameBook` can subtract it later. Do NOT wire it into `readGameLedger` in this commit unless you also change `netRetained = feeBooked - leviesBooked` (house-book.ts:244) and its anchor, or the per-game and window totals will disagree.

8. Correct the recorded claim at house-ledger.ts:157-160 ("the net matches the SYSTEM:ADJUSTMENT balance exactly") in the same commit — it is a one-off production measurement, not a live check, and it must not be quoted as a gate.

---

### 🟠 Role and agent status are two columns with three writers and no repair path — an Owner can strand an approved agent permanently

**Severity** high · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`validateRoleChange` checks only that the NEW role is assignable; it never looks at `prevRole` beyond a no-op test (staff-roles.ts:36-40), and `ASSIGNABLE_ROLES` includes `PLAYER` (staff-roles.ts:9-10). So an Owner on `/admin/staff` can change an approved agent's role to PLAYER — or to a staff role — with `db.user.update(target.id, { role: newRole })` (admin/staff/actions.ts:36) and no reference to the AffiliateAgent record at all.

After that: `referrerMayEarn` goes false and every accrual stops silently; the compliance record on the application still says APPROVED; `AffiliateAgent.active` is still true so `/admin/agents` still lists them as a live agent; and the person receives an email saying 'Your 50pick staff access was removed' (actions.ts:52-55), which is not what happened.

The recovery path does not exist. `applyRoleChange` cannot set AGENT (deliberately — staff-roles.ts:9-10). The only path to AGENT is approving an application, and the proposed partial unique index 'one active application per user WHERE status <> REJECTED' (SESSION-PROMPT-AGENT-BUILD.md:60-62) means their existing APPROVED row occupies the slot, so they cannot re-apply; and `reviewApplication` will only act on decidable states, so the APPROVED row cannot be re-approved. A fee-paying, compliance-cleared business partner is stranded by one misclick on an unrelated screen, and the fix is a manual database edit.

The same shape lets an approved agent be made a GROWTH officer — the role that administers `/admin/affiliate` and sets commission rates — while their agent record survives intact underneath.

**Evidence** — src/lib/server/staff-roles.ts:9-10, 36-40; src/app/admin/staff/actions.ts:36, 52-55; docs/SESSION-PROMPT-AGENT-BUILD.md:60-62

**Proposed handling** — Refuse the change in `validateRoleChange` when `prevRole === 'AGENT'`, with a message pointing at `/admin/agents` — an agent relationship is closed by the compliance officer who opened it, not from the staff screen. Add `reinstateAgent` beside `deactivateAgent` so an approved-then-deactivated agent has a real repair path, and make the partial unique index `WHERE status NOT IN ('REJECTED','WITHDRAWN')` so a closed relationship can be re-applied for. Add a unit test that the staff screen cannot touch an AGENT row.

**⭐ A verifier disagreed with that handling and proposed:**

Make the agent-application service the SINGLE writer of `UserRole.AGENT` in both directions, and gate the staff screen at its writer, not at its validator.

1. Gate where the write happens. Put the refusal at the top of `applyRoleChange` (`src/app/admin/staff/actions.ts:28`), so BOTH entry points are covered: `if (target.role === "AGENT") return { ok: false, error: "This is an approved Agent Affiliate. Close the agent relationship at /admin/agents first — an agent is ended by the compliance officer who approved them." }`. Mirror it in the pure `validateRoleChange` too (so it stays unit-testable and the UI refuses before the round-trip), but the validator is the convenience, not the control. Also fix `actions.ts:50-54` so the "staff access was removed" email is only sent when `prevRole` was actually a staff role.

2. Give the demotion a real home in the same commit, or the refusal is a lockout. `deactivateAgent` becomes atomic and is the ONLY place AGENT is removed: `role → PLAYER`, `active = false`, `endedAt`, `endedById`, a COMPLIANCE audit, and an email that says the agent relationship was closed. Then the staff-screen refusal has somewhere true to point.

3. `reinstateAgent` restores the SAME agent — same `AffiliateAgent` row, SAME `50PICK-AG-` code, no new application, no second fee. Never mint a new code: existing recruits are bound through the old one, and a fresh code forks the attribution the architecture's own invariant forbids. Route both approve and reinstate through one internal `setAgentRole()` so there is still exactly one function that writes the role.

4. Amend `AGENT-PROGRAMME.md` in the SAME commit — §10's "Approval is the only place UserRole.AGENT is ever assigned" becomes "`agent-application-service.ts` is the only module that assigns or removes `UserRole.AGENT`; approve and reinstate assign, deactivate removes", and §2's lifecycle gains the terminal `DEACTIVATED → reinstatable` leg it currently lacks. Fix §23's half-true "not assignable from the staff-roles screen" to say the screen cannot touch an AGENT row at all. Otherwise the authority keeps asserting a control in one direction only.

5. Leave the partial unique index as the plan has it (`WHERE status <> 'REJECTED'`). Repair is reinstatement; re-application after a genuine termination is a policy question — put it to Ali rather than inventing a `WITHDRAWN` status to carry it.

6. Guard it the way this repo requires — a refusal plus a control that must go RED: (a) `applyRoleChange` on an AGENT is refused AND the row is unchanged; (b) CONTROL — the same call on a SUPPORT row still succeeds; (c) `addStaffByPhoneAction` with an agent's phone is refused (this is the case the finding's own fix misses); (d) after `deactivateAgent` the staff screen CAN change that account, proving the refusal is scoped to a live agent and not a permanent freeze; (e) `reinstateAgent` restores role AND the original code. Then prove the harness by deleting the guard line from a `KP_SRC` COPY and confirming (a) and (c) go red — a guard in `validateRoleChange` alone would have left (c) green with the hole open, which is exactly the failure mode to demonstrate.

**⭐ A verifier disagreed with that handling and proposed:**

State the invariant once, in the direction that covers both cases: **an account whose role is AGENT may not be touched from the staff screen at all** — neither demoted to PLAYER nor promoted to a staff role. The promotion half matters on its own: GROWTH holds `growth` (roles.ts DEFAULT_GRANTS.GROWTH) which owns `/admin/affiliate` — the surface that sets commission rates — so an agent-turned-GROWTH-officer could set their own rate.

1. **Put the refusal at the single DB writer, not only the pure validator.** Export `isProtectedRole(prevRole)` from `staff-roles.ts`, use it in `validateRoleChange` (for `setStaffRoleAction`), AND add the matching check to `addStaffByPhoneAction` after the `target` lookup at actions.ts:96 — as `fieldError("phone", "That account is a 50pick Agent. Close the agent relationship at /admin/agents first.")`, because DG-S-05 (actions.ts:87-90) requires the refusal to name the control whose value must change, and on that three-field form the agent-ness is fixed at the phone, not the role. Then add the same refusal inside `applyRoleChange` (actions.ts:33, before line 36) with a `SECURITY` audit entry, mirroring how `reviewKyc` audits a blocked self-review. That last one is the guard a future third caller cannot walk around.

2. **Keep AGENT assigned in exactly one place, literally.** Do not add a `reinstateAgent` that writes the role itself. Put a private `setAgentRole(userId, on)` primitive inside `agent-application-service.ts` and have `approveAgent`, `deactivateAgent` and a new `reinstateAgent` all route through it — so `role: "AGENT"` still appears at one site, the non-negotiable at AGENT-PROGRAMME.md:217 stays true and stays grep-testable, and `deactivateAgent` becomes the atomic close (role → PLAYER, `active = false`, `approvedAt` retained, audit) with `reinstateAgent` its exact inverse. That is the real repair path; it does not depend on re-applying.

3. **Leave the partial unique index as specified (`WHERE status <> 'REJECTED'`).** Reinstatement, not re-application, is how a closed relationship reopens, so the index does not need loosening and should not gain an unspecified status value. If Ali later wants a terminated agent to re-apply and pay the fee again, that is a commercial decision with its own enum value, badge, timeline string, i18n and comms-registry entry — a deliberate step, not an index tweak.

4. **Controls that must go red.** A pure-validator unit test alone is not sufficient here. Add (a) `validateRoleChange({prevRole:"AGENT", ...})` refuses for every one of the 8 assignable roles; (b) an action-level test that drives `addStaffByPhoneAction` against an AGENT account on the memory DAL and asserts the role is unchanged — this is the case the proposed test would have missed; (c) a source guard that `role: "AGENT"` / `role: UserRole.AGENT` appears at exactly one write site across `src/**` AND `scripts/**`; and (d) prove each red harness by deleting the guard on a `KP_SRC` copy and confirming the suite fails — a guard that has never failed is a hypothesis.

5. **Fix the mislabelled email while in the file.** actions.ts:50-55 decides `isStaff` as `newRole !== "PLAYER"`, so any demotion says "Your 50pick staff access was removed" — which, if a non-staff account ever reaches this path, states something that did not happen. With the AGENT refusal in place this is closed for agents; assert it, so a future assignable role cannot reopen it.

---

### 🟠 The per-recruit commission cap is counted programme-blind, so a player-programme reward consumes an agent's cap

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

The cap query inside the accrual lock filters on `r.recruitUserId === recruitUserId && r.type === 'COMMISSION'` and sums the lot (affiliate-service.ts:566-573). Adding a `programme` column does not change that query. So even after the known leak #4 is fixed by giving agents their own cap, the COUNTING is still shared: if the player programme returns and a recruit's referrer changes programme (finding #2's promotion case, or an agent demoted and the recruit's rewards continuing under PLAYER), commission accrued under one programme is deducted from the other programme's budget.

The same blindness applies to the once-per-recruit guards for BONUS and PRIZE (affiliate-service.ts:382, 433) — they ask 'does a row of this type exist for this recruit' with no programme term, so a PLAYER-programme sign-up bonus permanently blocks the agent-programme equivalent for the same recruit and vice versa.

This is a direct consequence of the shared-ledger choice in (B) and it is the one place where the shared table genuinely costs something. It is cheap to fix and invisible if not fixed — the caps just quietly bind sooner than the config says.

**Evidence** — src/lib/server/affiliate-service.ts:566-573, 382, 433

**Proposed handling** — Add `programme` to every idempotency and cap predicate in the file, not just to the write. Prove it with a red harness: a recruit carrying one PLAYER-programme COMMISSION row must not reduce the AGENT cap by a shilling, with the control being a second AGENT-programme row that DOES reduce it.

**⭐ A verifier disagreed with that handling and proposed:**

Split the two predicates apart; they are not the same kind of check. (1) DO NOT TOUCH :382 or :433. Their programme-blindness is the control, not the defect: "one bonus per recruit, ever" and "one prize per recruit, ever" are lifetime facts about the RECRUIT, and they are the only guard between onRecruitDeposit/onRecruitBet and a payment on every deposit and every bet. Add a red-anchor comment on both lines saying the programme term must never be added and naming why, so the next reader of this finding does not re-apply it. (2) For the commission cap, keep the SUM programme-blind and change only which LIMIT is resolved — the current programme's cap applied to the cross-programme lifetime total. That is already what leak #4's fix produces, and it is the defensible policy: one recruit is one revenue stream, so a per-recruit budget that RESETS on the referrer's role change would let a single recruit fund two full caps' worth of payout on the same operator fee. Write it into AGENT-PROGRAMME.md §6 as an explicit rule ("the rate is the agent's; the per-recruit commission budget is the recruit's, lifetime, across programmes") so the number the config shows and the number the engine enforces agree on paper. (3) If the commercial answer is instead that an agent's contracted budget must not be eaten by an old promo relationship, do NOT split the predicate — resolve the agent's cap to 0 (uncapped) on the AffiliateAgent row. That is independently sound, because agent commission is a share of the fee actually collected (§5) and therefore self-limiting, and it reaches the commercial outcome without narrowing a single refusal. (4) FIRST, settle the stamped-at-bind vs role-at-accrual contradiction between the plan summary and AGENT-PROGRAMME.md:154-156. If programme is stamped on User.recruitedBy at bind and every reward inherits it, the whole class of bug disappears by construction and §6's "one referrer, one programme, one payment per event" becomes true by data rather than by predicate — which is the stronger design and worth choosing deliberately rather than by drift. (5) The red harness to build is the double-pay control, not the cap one: a recruit whose referrer is promoted PLAYER->AGENT mid-relationship, then deposits again and bets again, must end with exactly ONE BONUS row and ONE PRIZE row in total. Wire it into the replay section at affiliate-security/route.ts:76-84 (which today never mutates the referrer's role and so cannot fail), and prove it red by adding the programme term the finding proposes. Keep the cap assertion too, but as the second case, with its control being a second same-programme row that DOES reduce the budget.

**⭐ A verifier disagreed with that handling and proposed:**

DO NOT add `programme` to any cap or idempotency predicate. Four moves instead:

1) Fix the write, never the refusal. `programme` and `rateApplied` on ReferralReward exist for reporting — AGENT-PROGRAMME.md §6's ledger row says the column is there "so 'what did we pay agents' and 'what did the promo cost' are separable", and §5 says rateApplied exists so a rate change never rewrites history. Neither is an input to a refusal. Record it in the build prompt §3 as a stated rule: `programme` is stamped on the row and read by /admin/affiliate's filter; it is never a term in a guard. That single sentence is what stops a later session "completing" the column by adding it at :382, :433 and :566.

2) Make the cap's blindness DELIBERATE rather than accidental, and resolve it the way the rate is resolved. Add `capPerRecruitFor(account, cfg)` beside build-prompt §3's `rateFor(account, cfg)` — one resolver, same discipline as ratesFor(market). It returns the agent's own cap when `approvedAt` is set, and REFUSES rather than falling back to `cfg.commission.capPerRecruitTzs` when an approved agent has no cap configured (identical shape to leak #3's fix; the fallback is the same defect twice). Compare the programme-blind lifetime sum against that resolved cap, with a comment at :566 stating that the sum is blind ON PURPOSE: the cap is a lifetime bound on the PAIR, so a promotion can never reset it.

3) Add the refusal the finding did not look for, which is what makes the blind guards permanently safe. An AGENT referrer must accrue no BONUS and no PRIZE at all. Today `prize: { enabled: true, amountTzs: 10_000, minBetAmountTzs: 20_000 }` is the SHIPPED DEFAULT (affiliate-config.ts:85) and `referrerMayEarn` returns true for AGENT, so the moment approveAgent flips a role, that agent's recruit's first bet >= 20,000 pays the agent the 10,000 PLAYER prize on top of commission — the exact double-dip §6's invariant forbids ("Without it an agent double-dips: agent commission and the player prize, on the same recruit, from the same bet"). Refuse at the top of payBonus and payPrize on the referrer's programme. With that refusal in place only one programme can ever write a BONUS or PRIZE row for a given pair, so :382 and :433 need no programme term — by construction, not by luck.

4) Settle the doc contradiction the promotion case exposes, before the build. The architecture brief says `programme` is "stamped at bind"; AGENT-PROGRAMME.md §6 says "the programme is decided by the referrer's role at the moment of accrual". Those disagree exactly when a role changes, and the whole finding lives in that gap. Accrual-time is the correct one — it is what lets a promoted referrer earn agent rates on recruits bound before approval, which referrerMayEarn already assumes. Write that into §6 explicitly, and with it the corollary: because programme is accrual-time, the row's `programme` is a record of what was paid and can never be an input to a guard.

RED HARNESS — invert the finding's. Its control proves the wrong thing. The controls that must go RED are:
  · a recruit holding a PLAYER-programme BONUS row is still refused a second BONUS after their referrer is approved as AGENT (delete the :382 guard -> two bonuses -> red);
  · a promoted agent does not get a fresh cap on a recruit who already consumed it (add `programme` to :566-573 -> the pair earns 2x capPerRecruitTzs -> red);
  · an approved AGENT referrer with `prize.enabled: true` accrues ZERO PRIZE rows (delete the new §3 refusal -> a 10,000 PRIZE row appears -> red). This last one is the one with no guard today, and it pays real money on the shipped default config.

---

### 🟠 `/admin/affiliate` money totals are computed over a 1000-row truncation

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

`getAdminAffiliateStats` reads `db.referralReward.list(1000)` and then derives `commissionPaidTzs` and `totalPaidTzs` by summing that array (affiliate-service.ts:733, 738-739). `list` is a `findMany` with `take: limit` ordered by `createdAt desc` (prisma-dal.ts:1745-1751) — the newest 1000 rows, not all of them.

Today that is harmless because almost nothing has ever paid. Under an agent programme where commission accrues on EVERY settled position of EVERY recruit, 1000 rows is reached quickly, and from that moment 'what have we paid agents' stops growing and starts sliding — it becomes a rolling window presented as a total, on the screen an officer uses to reconcile commission. The build prompt then layers 'Filter the payout ledger by programme' (SESSION-PROMPT-AGENT-BUILD.md:120-121) on top, so the agent figure is a filtered subset of a truncated set: a number that looks more precise the more wrong it gets.

The same function also builds the full `ledger` array by mapping every one of those rows through `db.user.findById` (affiliate-service.ts:748-759), and `leaderboard` calls `handleFor` once per affiliate account over an unbounded `db.affiliate.list()` (affiliate-service.ts:741-746) — a table with one row per player — before slicing to ten. At the 1,000-client launch target that is ~2,000 point queries per page load.

**Evidence** — src/lib/server/affiliate-service.ts:733, 738-739, 741-746, 748-759; src/lib/server/prisma-dal.ts:1745-1751, 1711-1714

**Proposed handling** — Compute the totals as SQL aggregates over the whole table grouped by `programme` and `status`, never by summing a page. Paginate the ledger rows separately and join the referrer/recruit names in the query rather than N+1. Restrict the leaderboard query to agent rows (finding #4's split makes this a WHERE on row existence). Add a guard that seeds 1,100 rewards and asserts the reported total equals the true sum — it will fail against today's code, which is the point.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; change the fix to respect both DAL backends and the segment-don't-restrict rule.

1. TOTALS AS A DAL CONTRACT, NOT A SUM AND NOT RAW SQL. Add `db.referralReward.totals(filter?: { programme?: "AGENT" | "PLAYER" })` returning `{ paidTzs, commissionPaidTzs, distinctPaidReferrers, rowCount }`, implemented TWICE: in `prisma-dal.ts` with Prisma's typed `aggregate`/`groupBy` (NOT `$queryRawUnsafe` — the bigint-binding trap already documented at prisma-dal.ts:1297), and in `store.ts:1208` over the Maps. Seed every group to 0 before merging results, because `groupBy` omits absent groups (prisma-dal.ts:1284 says so in its own comment) — otherwise a programme that has never paid renders blank instead of "TZS 0". Fix `activeAffiliates` in the same pass: it is a DISTINCT COUNT (736-737), so give it its own `distinct` aggregate — a SUM-only fix leaves half the KPI row wrong. Replace `totalReferrals` (735, a full `db.user.list()` load) with a `db.user.countRecruited()` DB-side count. Delete `totalPaidTzs` — nothing renders it (grep: 3 hits, all inside affiliate-service).

2. SEGMENT THE LEADERBOARD, DO NOT RESTRICT IT. `/admin/affiliate` is the only surface where the withdrawn player programme's historical payouts are visible; an agent-only WHERE hides money we actually paid. Add a programme segment (tab or chip, defaulting to AGENT) that filters both KPIs and leaderboard, with the PLAYER segment still reachable, and label each figure with the segment it covers. That is the same shape as the build prompt's "filter the payout ledger by programme" and keeps one ledger, one truth.

3. PAGINATE THE LEDGER AT THE DAL, BATCH THE NAMES, KEEP MASKING IN THE SERVICE. Add `db.referralReward.page({ programme?, sort, dir, skip, take })` (both backends) returning rows plus a total count for `AdminPagination`. Then resolve names with ONE batched lookup — a new `db.user.findManyByIds(ids)` (`findMany({ where: { id: { in } } })` / Map lookup) — and run `handleFor`/`maskName` over that map in the service, so display rules and locale stay in one place and the Map backend still works. Two queries per page instead of ~2,000. Restrict the leaderboard's `handleFor` the same way: filter `recruits > 0 || earnedTzs > 0` and `.slice(0, 10)` FIRST, then resolve ten handles in one batched call (741-746 currently resolves before filtering).

4. THE SORT COLUMN IS LOAD-BEARING — handle it explicitly. `page.tsx:36-45` sorts by `date | amount | referrer | status`; `referrer` is a derived masked handle with no column behind it. Push date/amount/status into the query, and either drop the referrer sort in the same commit (with the header no longer offering it) or sort it within the page only and say so. Do not leave a header that silently sorts one page of a paginated set — that is the same "looks precise, is wrong" failure.

5. CONTROLS THAT MUST GO RED. Keep the 1,100-row seed guard, and make it assert three things, each failing against today's code: reported `commissionPaidTzs` equals the true sum over all rows; `activeAffiliates` equals the true distinct count; and a programme with zero rows reports 0, not blank. Add a query-count control (count DAL calls for one render of a 1,100-row ledger and assert it is O(1) in row count) — otherwise the N+1 quietly returns. Run both against the memory backend AND `USE_PRISMA_DAL=true`, since the two implementations are exactly what can drift.

6. NEARBY, WHILE IN THE FILE (separate finding, but the same file and the same class): the per-recruit cap check at 566-570 calls `db.referralReward.listByReferrer(referrerUserId)` — UNBOUNDED, on the settlement hot path inside an advisory lock. An agent with many recruits loads their entire reward history on every settled position. That one is a write-path scan, not a display bug, and is worse than the admin page. The same `totals(...)` contract with a `recruitUserId` filter fixes it.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the diagnosis; replace the three defective clauses.

1. TOTALS — Prisma typed aggregates, never `$queryRaw`, never a sum over a page. Add to `prisma-dal.ts` beside the reward accessors (~:1745), modelled on `transaction.sumConfirmedByTypes` at `:1263-1268`:
   - `referralReward.totals(): Promise<Record<programme, Record<status, {amount:number;count:number}>>>` using `pc().referralReward.groupBy({ by: ["programme","status"], _sum: { amountTzs: true }, _count: true })`.
   - ⚠️ Seed EVERY (programme × status) cell at zero before merging — `prisma-dal.ts:1284-1287` already records this exact trap: "a type with no confirmed rows is ABSENT from the result", and a programme silently missing from a money tile reads as a broken section, not a true zero.
   - `activeAffiliates` becomes `groupBy({ by: ["referrerUserId"], where: { status: "PAID" } })` and take `.length`, not a `Set` over a page.
   - Mirror all of it in `store.ts:1208-1226` in the SAME commit (precedent: the `totalsByType` twin at `store.ts:967`).

2. INDEX — in the migration that adds `programme` and drops `tier` (`prisma/schema.prisma:845, 1001`), add `@@index([programme, status])` and `@@index([status, referrerUserId])` to `ReferralReward`. An aggregate over an unindexed 6-figure table is a slow page, not a wrong number, but ship it together.

3. LEADERBOARD — do NOT restrict to agent rows. `AffiliateAgent` already stores `totalRecruits` and `totalCommission` (`schema.prisma:847-848`), so the whole thing is one query: `affiliateAgent.findMany({ where: { OR: [{ totalRecruits: { gt: 0 } }, { totalCommission: { gt: 0 } }] }, orderBy: [{ totalCommission: "desc" }, { totalRecruits: "desc" }], take: 10, include: { user: { select: { displayName: true, phoneE164: true } } } })`. Ten rows, zero `handleFor` lookups, filter applied in the DB instead of after every await. Programme becomes a SELECTABLE filter on the admin surface defaulting to *all* — the officer can narrow to AGENT, but the book still counts the player-programme money that exists, per the `feature-state.ts` accounting rule.

4. LEDGER ROWS — page in the DAL, not in the page. Add `referralReward.page({ programme?, status?, limit, offset })` with `include: { referrerUser: { select: {...} }, recruitUser: { select: {...} } }` so names arrive in the same query, and have `page.tsx:42-43` request the page it renders instead of slicing a 1,000-row array. Note this moves sorting server-side, so `applySort` at `:36` must be replaced by an `orderBy`, not left applying to a page.

5. WHILE YOU ARE IN THE FILE — `affiliate-service.ts:733`'s `(await db.user.list()).filter(u => !!u.recruitedBy).length` becomes `db.user.count({ where: { recruitedBy: { not: null } } })` (a `user.count` already exists at `prisma-dal.ts:660-661` with the docblock "COUNT(*) — no rows materialised (audit H4/M5)" — the same audit finding, already fixed once elsewhere). And `getPlayerReferralSummary:645` needs `db.user.listByRecruiter(userId)`, because decision #10 makes that function the agent dashboard and it currently loads every user row per view.

6. THE CONTROL, kept from the proposal and widened: seed 1,100 rewards across BOTH programmes and all three statuses; assert the reported `commissionPaidTzs`/`totalPaidTzs` equal the true sums, that a programme with zero PAID rows reports 0 rather than vanishing, and that the leaderboard names the true top ten. Run it against the memory DAL and against a real Postgres — `store.ts:1217-1220` truncates identically, so a memory-only guard still proves the fix on the backend that never serves production. It must go RED on today's code before the fix lands; a guard first seen green proves nothing.

---

### 🟠 `totalEarnedTzs` is a read-modify-write across per-recruit locks — the agent's own earnings statement will lose updates

**Severity** high · **Kind** gap · ⭐ **FIX DISPUTED**

`recordReward` updates the denormalised total with `db.affiliate.update(referrerUserId, { totalEarnedTzs: acct.totalEarnedTzs + input.amountTzs })` (affiliate-service.ts:223-226) — read, add, write. The accrual lock is per `(referrer, recruit)` (affiliate-service.ts:564), so two DIFFERENT recruits of the same agent settling concurrently hold different locks and race on this row. The exact twin defect was already found and fixed for the sibling counter: `incrementRecruitCount` is an atomic `{ increment: 1 }` with the comment 'audit M7 — the old read-modify-write lost updates when two recruits bound concurrently' (affiliate-service.ts:306-308, prisma-dal.ts:1756-1765). That fix was applied to the count and not to the money.

For a player with two recruits it was cosmetic, which is presumably why it was left. For an agent it is not: this is the number `/profile/invite` shows the agent as their earnings, and it is the number the framework's sub-ledger reports. A settlement of one market with many of one agent's recruits is exactly the concurrent workload that loses updates, and the loss is permanent and silent — nothing recomputes it from the ReferralReward rows.

**Evidence** — src/lib/server/affiliate-service.ts:223-226, 306-308, 564; src/lib/server/prisma-dal.ts:1756-1765

**Proposed handling** — Make it an atomic `{ increment: amount }` in both DAL backends, mirroring `incrementRecruitCount`. Separately, have the agent-facing sub-ledger derive earnings from a SUM over ReferralReward rather than reading the denormalised counter — a counter is a cache, and the agent's statement should be the ledger. Add a concurrency fixture (N recruits of one agent settling in parallel) asserting counter == SUM.

**⭐ A verifier disagreed with that handling and proposed:**

Do not ship this as a race fix — the stated race is refuted, and recording a false reason for a real change is the failure mode to avoid. Handle it as arming a latent trap instead:

1. WRITE THE INVARIANT DOWN WHERE IT WILL BE READ. Add a comment at affiliate-service.ts:222-225 stating the actual protection: "every totalEarnedTzs write happens while `wallet:<referrerUserId>` is held — creditWallet took it (wallet-service.ts:1803 / bonus-service.ts:124), and locks.ts:113-120 holds a nested xact lock until the OUTER commission transaction commits. If agent commission ever stops synchronously crediting the agent's wallet under that lock, this read-modify-write loses its only guard." Put the same sentence in docs/AGENT-PROGRAMME.md against the "SEPARATE payment destination" decision, because that decision is what breaks it.

2. HARDEN IT ANYWAY, but as defence-in-depth, not as a bug fix. Add `incrementTotalEarned(userId, amountTzs)` to BOTH backends mirroring incrementRecruitCount — Prisma `{ totalCommission: { increment: amount } }` (prisma-dal.ts, next to :1704) and the synchronous single-tick form in store.ts (next to :1197). The in-memory shape matters: keep read and write in one tick with no `await` between them, which is what makes store.ts's version genuinely atomic. This also fixes the in-memory divergence for free.

3. MAKE THE AGENT STATEMENT THE LEDGER, NOT THE COUNTER — but not with an in-app reduce. `listByReferrer` (prisma-dal.ts:1751-1757) has no `take`, so a full-list-then-sum on every /profile/invite render is an unbounded read for a high-volume agent (the cap check at affiliate-service.ts:566-570 already has this shape and will bite an agent harder than a player). Use a DB-side `referralReward.aggregate({ _sum: { amountTzs } })` filtered on recipientUserId + status PAID + programme AGENT. Keep totalEarnedTzs strictly as a display cache and say so in the type.

4. THE ACTUAL DIVERGENCE RISK IN THE PLAN IS HELD -> PAID, NOT CONCURRENCY. `recordReward` updates the counter only at creation time. There is no held-release path today (prisma-dal.ts:1738-1745 `referralReward.update` has no caller), but the programme needs one — an officer reconciling a HELD agent commission. A release that flips status to PAID without touching the counter breaks Invariant 6 deterministically, on every single release, with no concurrency required. That is a far more likely source of a wrong agent statement than a lost update, and (3) immunises it while (2) alone does not.

5. CONTROL THAT MUST GO RED. Extending affiliate-stress is not enough — its concurrency block runs on the in-memory store, where the race is possible but production is protected, so its colour says nothing about prod either way. The control that earns its place is the HELD -> PAID one: assert `aggregate _sum == counter` after an officer releases a held agent commission, and prove it goes RED against the counter-only implementation before wiring the aggregate in.

**⭐ A verifier disagreed with that handling and proposed:**

Make the LEDGER the number, then let the counter be an honest cache — in this order.

1. Derive every displayed earnings figure from ReferralReward. On `/profile/invite` this is one line and ZERO extra queries: `referrerRewards` is already loaded at affiliate-service.ts:647 and the identical filter is already written at :653, so replace `earnedTzs: acct.totalEarnedTzs` (:695) with the same `.filter(r => r.recipientUserId === userId && r.status === "PAID").reduce(...)`. That also removes the on-page contradiction where the per-recruit rows out-sum the headline. For the admin leaderboard (:742), add a DAL `sumPaidByReferrer()` — Prisma `referralReward.groupBy({ by: ['referrerUserId'], where: { status: 'PAID' }, _sum: { amountTzs } })` in the Prisma backend and the equivalent reduce in `store.ts` — so it is one query, not a per-account scan, and it agrees with `commissionPaidTzs`/`totalPaidTzs` computed six lines above it (:733-735).

2. Only then decide the counter's fate. If nothing needs it, drop the column write and the read; a cache with no reader is dead weight on the agent sub-ledger. If it stays (e.g. as a cheap sort key), make it atomic in BOTH backends — `{ increment: input.amountTzs }` in prisma-dal.ts mirroring `incrementRecruitCount` (1704-1710), and the same shape in store.ts (1197-1204) — AND increment it on the HELD→PAID release path the agent programme will need, so it converges instead of drifting two different ways. Never let it be the number an agent is paid on.

3. Build the control before the fix. Do not add a fourth green assertion. Restore the read-modify-write behind a temporary flag and require the guard to go RED against POSTGRES; only then accept the green. The guard must run where Postgres is (the pre-deploy `qa:live` gauntlet), not as a dev-only route that is 404 in production and referenced by nothing — the existing `affiliate-stress` checks (:146-153, :155-175) are already exactly this assertion and have never once been able to fail. Either wire that route into the gauntlet with a real DATABASE_URL, or write the check as a `scripts/*.test.mts` against a live PG.

4. Correct the plan's risk register: single-market settlement accrual is a sequential `for … await` (market-service.ts:3744-3750) and bulk resolve is explicitly sequential (bulk-resolve-action.ts:28). Document the actual exposure — concurrent resolutions across requests/instances, and a prize overlapping a commission for the same agent — so the fixture reproduces the real workload rather than one that cannot race.

5. Framework point worth stating in AGENT-PROGRAMME.md: an "agent sub-ledger" shown to a vetted business partner and used to justify a commission payout must be derived from the reward rows by construction. A denormalised counter is not an auditable sub-ledger, and "it was only cosmetic for players" stops being a defence the moment the number is a statement to a counterparty.

---

### 🟡 The TZS 100,000 fee and its refunds are recorded nowhere in the owner's book

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Decision 2 is right that the fee must never enter the PLAYER ledger — every Selcom money-in path settles into a player wallet and a registration fee is not a deposit (AGENT-PROGRAMME.md:89-93). But the plan reads that as 'the fee is not accounted for anywhere'. The only artefacts are `feeReference`, `feeAmountTzs`, `feeReconciledAt` on a compliance row, and on rejection `feeRefundedAt` / `feeRefundReference` (SESSION-PROMPT-AGENT-BUILD.md:52-53).

So: real business income arriving in a named bank account (Digital Selcom 0769777877) appears on no line of `readWaterfall` (house-ledger.ts:194-242) and nowhere on `/admin/house`, the owner's book. Neither do the refunds. There is no way to answer 'how much did we collect in agent fees this quarter and how much did we return' except by aggregating a compliance table nobody built a report over, and no reconciliation exists between fees attested as received and the Selcom statement.

The controls on the attestation are also thinner than they read. `feeReference` unique stops two applications sharing one receipt — but `feeAmountTzs` is a number a human types, not a figure read from Selcom, so a TZS 1,000 receipt attested as the TZS 100,000 fee passes every check in the design. §9 correctly records that the framework's automated webhook matching does not exist; what it does not record is that nothing replaces it beyond one officer's word.

**Evidence** — docs/AGENT-PROGRAMME.md:79-101; src/lib/server/house-ledger.ts:194-242; docs/SESSION-PROMPT-AGENT-BUILD.md:52-53

**Proposed handling** — Keep the fee out of the player ledger and add a non-player fee register: either a `HOUSE:AGENT_FEE` ledger account posted on reconciliation and reversed on refund, or at minimum a collected/refunded/net panel on `/admin/agents` plus a line on the house waterfall. Require the officer to attest the amount against a named statement line, and make `feeAmountTzs` a fixed constant read from RULES §2.10 rather than a typed field, so the only human input is the reference and the yes/no.

**⭐ A verifier disagreed with that handling and proposed:**

Keep decision 2 intact — no `LedgerEntry`, no `HOUSE:` account. Fix it in four moves:

1. ONE SOURCE, SNAPSHOT AT RECORD TIME. Write RULES.md §2.10 in the full `Decided / Enforced in / Configured in / Stated to / Guarded by` form, with a single code constant (`AGENT_FEE_TZS`) as the enforcement point. `recordFeePayment` stamps `AgentApplication.feeAmountTzs` FROM that constant — never from a form field. Keep the column: it is a snapshot, the same reason `feeSnapshot` and `rateApplied` exist. The only human inputs stay the reference, the receipt and the yes/no.

2. A SHORT PAYMENT IS A REFUSAL, NOT A FIELD. If the officer is to attest an amount actually seen on the receipt, store it as a SECOND column (`feeAttestedTzs`) and make `feeAttestedTzs < feeAmountTzs` a hard precondition inside `recordFeePayment`/`reviewApplication` — a service-layer refusal like `reviewKyc`'s, not a UI hint (the build prompt's own §2 wording: "hard preconditions, not UI hints"). Give it a red harness: an application with a 1,000 attestation must fail to reach `UNDER_REVIEW`, and the control must go red when the check is deleted.

3. THE REGISTER LIVES ON `/admin/agents`, NOT THE HOUSE PAGE. Add a period-filtered fee register using the same `DateTimeRangeFilter` the house page uses (page.tsx:261): collected (Σ `feeAmountTzs` where `feeReconciledAt` in window), refunded (Σ where `feeRefundedAt` in window), net, counts, plus an ageing list of attested-but-unreconciled applications. Show collected and refunded as TWO gross figures with net derived — never one netted balance, for the reason `readWaterfall` records twice.

4. IF A LINE IS WANTED ON `/admin/house`, GIVE IT ITS OWN PROVENANCE. The repo already has the type for exactly this problem: `BookSource` (house-book.ts:41) and `Provenance` in selcom-statement.ts, where "a figure that knows its own origin" is what stops a ledger total being printed under a rail heading. Add a third value — `"attested"` — and render agent fees as their own card carrying it. That way the owner can see the money, and it is structurally impossible to sum it into `custodialCash`, `netRetained` or the waterfall.

Finally, amend AGENT-PROGRAMME.md §9: the row should say not only that the webhook does not exist, but that NO statement feed for that bank account exists in this system at all (selcom-statement.ts:16-23 — Selcom publishes no collections balance), so the control is one officer's attestation against a receipt, with the duplicate-reference index and the short-payment refusal as the only automated parts. The corrected framework document handed to applicants and to the Gaming Board must claim exactly that and no more.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding's diagnosis; replace the mechanism with four specifics.

1. BOOK IT, BALANCED, AND NOT AGAINST `EXTERNAL:`. On `recordFeeReconciled`, post one group inside the SAME transaction that sets `feeReconciledAt`: `HOUSE:AGENT_FEE` +100,000 / `SYSTEM:AGENT_FEE_SOURCE` −100,000, `userId` = applicant, `memo` = the `feeReference`. New `LedgerEntryType` value `AGENT_FEE` (Prisma enum migration). This keeps `postLedgerEntries`' sum-zero invariant and `trialBalance.globalSum` at 0 (ledger.ts:100, 728-731); touches no `PLAYER:%` account so per-user drift is unaffected (ledger.ts:655-672); touches no `EXTERNAL:%` account so `readCustodialCash.railBacked` and `freeHouseCash` are untouched (house-ledger.ts:126-141, house-book.ts:158-160); and is invisible to `housePosition`, which reads only the five named accounts. The refund posts the exact mirror (negative `AGENT_FEE` on the same accounts, memo = `feeRefundReference`), so the account balance is collected−refunded by construction. Update `ledger.ts`'s account list comment (lines 10-25) and `acct` (lines 171-181) in the same commit — that header is the account registry.

2. THE OWNER'S BOOK NEEDS ONE LINE, NOT A WATERFALL CHANGE. The balance appears on /admin/house automatically (page.tsx:413 renders every `HOUSE:%` account); add only an `ACCOUNT_NOTE["HOUSE:AGENT_FEE"]` = "Agent registration fees collected, net of refunds — not gaming revenue, no levy". Add a small "Other income" pair BESIDE the waterfall, never inside it, following the `aggregatorPayable` pass-through precedent (house-book.ts:263-266): collected / refunded / net for the window, read by account, and captioned that it carries no TRA/GBT levy. ⛔ Do not add it to `WaterfallRead`, `feeEarned`, or `netRetained`.

3. TWO RECORDS OF ONE FACT NEED A GUARD, OR THEY DIVERGE. `AgentApplication.feeReconciledAt` and the ledger group are now both records of the same money, and the ledger is documented as a SECONDARY mirror (ledger.ts:79-90) with nothing to mirror here. Post it in the same `withMoneyTx` as the column write, and add to `test:money-invariants` (or the new `agent-application-security` suite) a check that `Σ HOUSE:AGENT_FEE == (count reconciled × expected fee) − (count refunded × expected fee)`, with the red harness proven by deleting the posting call.

4. THE AMOUNT: CONFIG, NOT A CONSTANT, AND THE OFFICER TYPES WHAT THE RECEIPT SAYS. Put the expected fee in the config store beside the other tunables, stated in RULES §2.10 in the full Decided/Enforced in/Configured in/Stated to/Guarded by form (this satisfies §7 rather than violating it, and §5 step 4's "the code, the config, and every surface"). Keep `feeAmountTzs` as the officer's ATTESTATION of the receipt — that is the control, and deleting it deletes the ability to record a short payment. Then make the mismatch a HARD PRECONDITION in `recordFeePayment`/`reviewApplication`, not a UI hint (the build prompt already demands that shape at §2): attested ≠ expected → refuse reconciliation, with a distinct `AgentRejectReason`/audit so an underpayment is a visible event rather than an officer's silent judgement. Require the officer to enter the bank statement line reference as a second field alongside `feeReference`, since the receipt reference is supplied by the applicant and the statement line is not.

5. FIX §9 WHILE YOU ARE THERE. AGENT-PROGRAMME.md:86 says the fee is "Reconciled by a compliance officer, against the Selcom statement". selcom-statement.ts:16-23 proves no collections balance exists on the API. §9 must say the reconciliation is a human reading a BANK statement outside this platform, that nothing in the system can verify it, and that the compensating controls are the unique `feeReference`, the statement-line attestation, the expected-amount refusal and the ledger register — otherwise the corrected framework document goes to the Gaming Board still asserting a control we do not have, which §9's own opening sentence forbids.

---

### 🟡 `/agent/apply` and `/agent/status` are unprotected at the edge, and the obvious fix silently closes the only discovery door

**Severity** medium · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

Edge auth is a flat prefix list: `PROTECTED_PREFIXES = ['/wallet','/positions','/profile','/watchlist','/proposals/new','/updown/history','/admin']` matched by `pathname === p || pathname.startsWith(p + '/')` (proxy.ts:30-32). `/agent` is absent, which is correct for the public discovery page (decision 8) — and it means `/agent/apply` and `/agent/status` are also unauthenticated at the edge, relying entirely on page-level session checks. Those pages carry uploaded referee national IDs and application state.

The footgun is the fix. Adding `'/agent'` to the list protects the two application pages AND redirects the public discovery page to `/auth/login` — killing the only channel Ali specified for finding the programme, and doing it in a way that no guard sees: `test:rbac` reports unmapped routes against `ROUTE_DOMAINS`, which governs admin domains, not this prefix list. Nothing in the build prompt's verification step mentions loading `/agent` while signed OUT; step 4 checks it 'is reachable from the footer' as an ordinary player, who is signed in.

**Evidence** — src/proxy.ts:30-32; docs/SESSION-PROMPT-AGENT-BUILD.md:98-101, 152-154

**Proposed handling** — Add `'/agent/apply'` and `'/agent/status'` as their own prefixes and deliberately leave `/agent` out, with a comment saying why. Add to the live drive an explicit signed-OUT fetch of all three: `/agent` must return the page, `/agent/apply` and `/agent/status` must redirect to login. Make the signed-out `/agent` assertion the control — if it ever starts redirecting, the discovery door is shut and the guard says so.

**⭐ A verifier disagreed with that handling and proposed:**

Do both, in this order.

1 · REMOVE THE FOOTGUN RATHER THAN COMMENTING IT (plan change, cheap now, impossible later). Move the two authenticated surfaces under the already-protected `/profile` tree — `/profile/agent` (the application) and `/profile/agent/status` — and keep `/agent` as the ONLY route in the `/agent` namespace: the public, signed-out marketing page. This needs ZERO edit to `src/proxy.ts:30`, because `/profile` is already a protected prefix, so there is no array for a future session to get wrong, and no prefix ordering to reason about. It is also the platform's own precedent: `src/app/profile/kyc/` and `src/app/profile/source-of-funds/` are the two other surfaces that carry uploaded identity documents, and both live there. It fits decision 10 (the agent's dashboard is `/profile/invite`, already private) — the application, its status and the dashboard end up in one private tree with one gate, and the public door is a single leaf that nothing can accidentally protect. `docs/AGENT-PROGRAMME.md:215` only requires "`/agent/*` in en/sw/zh", which the public page still satisfies; update that line and §4 of `docs/SESSION-PROMPT-AGENT-BUILD.md:98-101` in the same commit.

If the `/agent/apply` URL is kept for framework-facing reasons, then apply the finding's mechanism — add `"/agent/apply"` and `"/agent/status"`, never `"/agent"` — but note the residual: any later sibling (`/agent/documents`, `/agent/receipt`) is unprotected by default, whereas under `/profile` it is protected by default. Fail-closed beats fail-open for a surface holding referee national IDs.

2 · MAKE IT A GUARD, NOT A DRIVE STEP — and assert BEHAVIOUR, not the source text. Export `isProtected` from `src/proxy.ts` (it is currently module-private at `:31`) and add three assertions to the new `agent-application-security` suite the build prompt already commissions at `docs/SESSION-PROMPT-AGENT-BUILD.md:152`:
  · `isProtected("/profile/agent") === true` (or `/agent/apply`, per the shape chosen)
  · `isProtected("/profile/agent/status") === true`
  · ⭐ THE CONTROL, and the only one that matters: `isProtected("/agent") === false` — with a comment saying that a red here means the public discovery door has been shut, not that a test is stale.
Asserting the exported predicate rather than a regex over the array literal survives a refactor of the matcher, and directly avoids this repo's recorded "a word is not a control" failure (`scripts/layout-staleness.test.mts:211`, where a vocabulary match fired on the prose documenting the fix). Prove the red harness on all three by mutating a locked COPY via `KP_SRC`, per the build prompt's own instruction — a guard that has never failed is a hypothesis.

3 · Keep the finding's signed-out live fetch as well, but as evidence, not as the control: `curl` all three routes with no cookie and record the status codes (200 / 307 / 307) in the drive log. The pipeline guard is what stops the regression; the fetch is what proves the guard is describing the running app.

---

## Switch / re-enablement matrix — 14 confirmed

### 🔴 On the shipped defaults an approved agent earns NO commission and IS paid the player prize instead

**Severity** critical · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

DEFAULT_AFFILIATE_CONFIG ships `commission: { enabled: false }` and `prize: { enabled: true, amountTzs: 10_000, capPerReferrer: 20 }`. `onRecruitSettlement` accrues only inside `if (cfg.commission.enabled && cfg.commission.rate > 0)`, so with commission mode off the agent's commission — the entire economic substance of the programme — accrues nothing at all. Meanwhile `onRecruitBet` reaches `payPrize` with no programme branch whatsoever, so the same agent IS paid the PLAYER promo's 10,000 TZS first-bet prize, up to 20 times. So the day the first agent is approved by a compliance officer, the platform pays them the wrong programme's money and none of their own, and it takes a GROWTH officer flipping a switch on the player-promo screen before the agent contract starts paying at all. This is not a state an operator has to reach — it is the shipped state, and it simultaneously realises two of the failures the invariant in AGENT-PROGRAMME.md §6 was written to prevent (paid from the wrong policy, and silently not paid).

**Evidence** — src/lib/server/affiliate-config.ts:83 (commission.enabled false) and :85 (prize.enabled true, 10,000, cap 20); src/lib/server/affiliate-service.ts:548 (`if (cfg.commission.enabled && …)`), :501-513 (onRecruitBet → payPrize, no role/programme branch), :426 (payPrize gates only on cfg); docs/AGENT-PROGRAMME.md:152-158 ("One referrer, one programme, one payment per event")

**Proposed handling** — The agent accrual must not read the player promo's mode toggles at all. Split the accrual: resolve the referrer's programme FIRST, and for programme=AGENT read enablement, rate, cap and window from the agent's own row, never from `cfg.commission.*`. Suppress `payPrize` and `payBonus` entirely for an AGENT referrer — an explicit, audited refusal, not an omission. Add the exclusivity guard G2 below.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the shape (resolve programme first, agent economics never read cfg.commission.*), but correct three things and add two the proposal omits.

1. DEFINE "agent enablement" as columns the plan already brings to life, not a new flag. An agent earns iff `approvedAt != null && active` on their AffiliateAgent row. Do not invent a per-agent `enabled`, and do not read cfg.commission.enabled. ⚠️ As written the proposal ("read enablement, rate, cap and window from the agent's own row") is unbuildable against the plan: AffiliateAgent has no window or cap column and SESSION-PROMPT §1 does not add one. Either add `commissionWindowMonths` + `commissionCapPerRecruitTzs` to the schema step explicitly, or — better for this platform's "one home for a number" convention — put the agent programme's window/cap/ceiling in their own defineConfig object (audited, DB-backed, on the compliance surface at /admin/agents, NOT on the growth screen), with only the per-agent rate on the row. Whichever, name it in §1 of the build prompt; a fix that needs an unlisted migration will get improvised at 2am.

2. ONE resolver, at the dispatch point — not two suppressions bolted onto payPrize/payBonus. Add `resolveReferralTerms(referrerUserId)` returning a discriminated union: `{programme:"AGENT", rate, capPerRecruitTzs, windowMonths, pays:["COMMISSION"]}` or `{programme:"PLAYER", cfg, pays:["PRIZE","BONUS","COMMISSION"]}`. All three hooks (onRecruitBet, onRecruitDeposit, onRecruitSettlement) call it FIRST and dispatch; bindRecruit's SIGNUP-bonus call at :325 must go through it too, or the bonus half re-opens the day bonus mode returns. This is the `ratesFor(market)` discipline the plan already invokes, and it kills the double-dip structurally instead of by two `if`s that a later edit can drop.

3. AUDIT THE REFUSAL ONCE, NOT PER BET. An audited refusal at payPrize entry fires on EVERY qualifying bet by every agent recruit forever, because payPrize's once-per-recruit check happens inside the lock, after. Emit the refusal audit only where a payment would otherwise have been made and key it per (referrer, recruit) — or drop the audit and rely on the ledger's `programme` column plus the guard. A noisy audit stream is a control nobody reads.

4. ⛔ DO NOT FIX THIS BY FLIPPING prize.enabled TO FALSE IN DEFAULT_AFFILIATE_CONFIG. It is the tempting one-line fix and it is the wrong one twice over: it makes the double-dip latent rather than absent (it re-arms the instant a growth officer re-enables the player promo, which decision-set explicitly anticipates), and it is exactly the "measuring the config, not the gate" failure that made §5d vacuous the first time. It would also break scripts/referral-signup.test.mts:47 and scripts/rg-cash-incentive.test.mts:124, which pin the default. Leave the defaults alone; the branch is the fix.

5. TWO THINGS THE PROPOSAL LEAVES BROKEN. (a) Re-anchor scripts/withdrawn-features.test.mts §5e onto the agent's OWN path — settlement with a real operatorFee producing one COMMISSION row at that agent's rate — or §5d silently becomes vacuous again. The build prompt must say this by name; a builder who hits a red §5e mid-session will "fix" the test. (b) Branch getPlayerReferralSummary's `promises` (:661-689) on the same resolver, so an agent's dashboard states their own rate and never the player prize line; SESSION-PROMPT §4 asks for the rate but the promises array will keep emitting the prize copy alongside it.

6. THE GUARD (G2) NEEDS ITS RED CONTROL, and it must not be able to pass by refusing everyone: an AGENT referrer's recruit's first bet ≥ min with a deposit writes ZERO PRIZE rows and zero cash; that same recruit's settlement writes exactly ONE COMMISSION row stamped programme=AGENT with rateApplied = that agent's rate; and — the control — under FEATURE_INVITE=ACTIVE a PLAYER referrer on the identical path IS still paid the prize. Prove it by deleting the branch and watching it go red.

**⭐ A verifier disagreed with that handling and proposed:**

Same direction, delivered so it cannot go green while wrong.

1. ROUTE, DO NOT REFUSE. In each of the three hooks, resolve the programme once and branch positively:
   `const programme = await programmeFor(referrerUserId);`
   `if (programme === "AGENT") { …agent accrual only… } else { …existing player modes… }`
   The player prize/bonus payers are then simply not on the agent's path — no per-bet refusal, no per-bet audit row. Audit ONCE per (referrer, recruit) at bind time, where the programme is decided, not on every bet.

2. NAME THE RESOLUTION RULE AND MAKE IT ONE. Recommend: the programme is the value STAMPED ON THE ATTRIBUTION AT BIND, immutable — the same discipline as PredictionMarket.feeSnapshot and the plan's own `rateApplied` ("a later rate change must never rewrite history", AGENT-PROGRAMME.md:134). Then AGENT-PROGRAMME.md:154-155 must be edited in the SAME commit to say "the programme stamped on the attribution", because "role at the moment of accrual" contradicts it and would let a player-era recruit start paying agent commission the day their referrer is approved. Eligibility (referrerMayEarn) stays a live check on top; the programme does not.

3. AGENT ENABLEMENT LIVES IN THE COMPLIANCE DOMAIN, NOT IN SILENCE. Agent accrual reads `AffiliateAgent.approvedAt && active && commissionPct != null` — and NOT `cfg.enabled` / `cfg.commission.*`. Replace the lost master switch with an agent-programme state on the compliance surface (/admin/agents), so the operator still has a documented way to run the agent programme dark for the Gaming Board without a growth officer being able to stop paying vetted partners from the player-promo screen. Per-agent cap/window columns on AffiliateAgent alongside commissionPct (this also closes already-known leak 4); no fallback to cfg for any of them.

4. NO SILENT ZERO. An AGENT referrer with approvedAt but commissionPct null must REFUSE loudly — a HELD reward row plus an audit action, never a 0-value no-op and never the player rate (this is the correct shape of the plan's rateFor at SESSION-PROMPT-AGENT-BUILD.md:84-89, whose `: cfg.commission.rate` fallback must be deleted, not kept).

5. RE-POINT THE TWO GUARDS THAT CURRENTLY ASSERT THE DEFECT, IN THE SAME COMMIT — this is the part that must not be skipped:
   · scripts/concurrency.test.mts §F (:265-300) — payPrize's exactly-once lock proof. Keep it driving payPrize, but drive it as a PLAYER referrer under `FEATURE_INVITE=ACTIVE`, the override feature-state.ts:82-86 exists for and that withdrawn-features §4 already uses. Do not delete §F: the lock is real machinery that returns with the player programme.
   · scripts/withdrawn-features.test.mts §5e (:253-262) — the control must keep proving "an AGENT still earns", but through the agent's OWN programme: onRecruitSettlement with an operatorFee and a set commissionPct, asserting a COMMISSION row stamped programme=AGENT with the agent's rateApplied. Its current assertion (`balance + bonusBalance > 0` after onRecruitBet) is satisfied by the prize and would keep passing after a correct fix only by accident.
   · ADD the missing control, the one neither guard has: an AGENT referrer whose recruit places a qualifying first bet must produce ZERO PRIZE rows and ZERO BONUS rows, with a red harness that deletes the programme branch and proves the assertion goes red.

6. Assert the shipped defaults directly: a guard that fails if DEFAULT_AFFILIATE_CONFIG's player modes can reach an AGENT referrer at all, so the "it only breaks on the defaults nobody re-derived" class cannot come back.

---

### 🔴 Agent commission lands in the BONUS wallet today — the trigger is not "if bonus is re-enabled", it is the current default

**Severity** critical · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

Known leak #1 understates its own reachability. `creditWallet` routes to `creditBonus` when `bcfg.enabled && bcfg.affiliateToBonus`, and BOTH ship `true`. `creditBonus` gates on the bonus CONFIG, never on `bonusIsLiveFor()`, so `PRODUCT_STATE.bonus = "WITHDRAWN"` does not stop a grant being minted — it only hides the offer. And bonus-config.ts's own measured note plus BONUS-WITHDRAWAL.md §7 record that production has no bonus SystemConfig row, so the file's defaults ARE the live values. The result: the first agent commission ever paid becomes a BonusGrant carrying 5× wagering and 30-day expiry, positions funded from it are unsellable by the `BONUS_FUNDED` rule, and `expireActiveGrants` zeroes the remainder irreversibly at day 30 — while the ReferralReward row says status PAID. AGENT-PROGRAMME.md §5 promises "real, withdrawable cash… no wagering requirement". The withdrawn-features suite already knows this: its own header comment says an unverified fixture "would read bonus=0", i.e. the author observed the reward landing in the bonus wallet.

**Evidence** — src/lib/server/affiliate-service.ts:185-197; src/lib/server/bonus-config.ts:61 + :64 (enabled/affiliateToBonus both true), :70-76 (no SystemConfig row on prod — "the value below IS the live value"); src/lib/server/bonus-service.ts:93-95 (creditBonus reads config, not feature-state), :838-868 (expiry removes the remainder, "nothing to return and nothing to reverse"); scripts/withdrawn-features.test.mts:22-24; docs/BONUS-WITHDRAWAL.md:174-177

**Proposed handling** — Agent commission must never enter `creditWallet`'s routing decision. Give the agent path its own credit function that calls `creditInternal` directly, with an explicit comment that routing is a player-promo concern. Separately (and regardless of the agent build) `creditBonus` should consult `bonusIsLiveFor()` on the MINT path — gating a grant is gating an offer, which Law 1 permits; it is fulfilment and expiry that must stay ungated.

**⭐ A verifier disagreed with that handling and proposed:**

Do not touch creditBonus. Fix the DESTINATION at the one place that already knows the programme, and make the compiler enforce it.

1. Change the affiliate payer's signature to carry the programme EXPLICITLY and with NO default: `creditWallet(userId, amount, description, opts: { programme: "AGENT" | "PLAYER"; sourceRef?: string })` in src/lib/server/affiliate-service.ts:185. `programme === "AGENT"` returns `creditInternal(...)` directly and never enters the bcfg branch; "PLAYER" keeps today's routing. Required, not optional, for the same reason feature-state.ts's own header gives for deleting invite-feature.ts rather than leaving a shim: it forces tsc to surface all three call sites (:394 payBonus, :440 payPrize, :576 onRecruitSettlement) instead of letting one inherit the player destination silently.

2. Derive `programme` from the SAME role read that already decided eligibility. referrerMayEarn (affiliate-service.ts:367-370) loads the referrer and calls inviteIsLiveFor(role); return the role from it (or thread it) rather than re-reading, so eligibility and destination cannot disagree — that is the "one referrer, one programme" invariant made mechanical instead of documentary.

3. Pass a deterministic sourceRef on the commission call at :576 (e.g. `referral:commission:{recruitUserId}:{positionId}`) — it currently passes none, so the cash path has no cross-instance dedupe. This matters more once AGENT always takes the cash path, since the bonus route's sourceRef dedupe no longer backs it up.

4. Split the blind control. scripts/withdrawn-features.test.mts:256-260 asserts a SUM and cannot fail on this defect. Replace with two assertions on the agent leg — `balance > 0` AND `bonusBalance === 0` — plus a red-harness mutation that restores the bonus routing and must go RED. Add the same split to the settlement/commission path, which §5e does not exercise at all (it only drives onRecruitBet).

5. Leave bonus-config.ts's defaults alone. Flipping affiliateToBonus to false globally would silently re-decide the PLAYER destination too, contradicting AGENT-PROGRAMME.md §6 ("Player → bonus wallet, played through") for the day the promo returns. The destination is a per-programme call-site decision, not a global switch.

6. If the "should a mint be possible while bonus is WITHDRAWN" question is worth asking, raise it to Ali as a SEPARATE decision about the operator switch in /admin/config (writing the missing bonus.config row), with the proposals fall-through at proposals-service.ts:579 named explicitly as the collateral. It is not a code change to make on this branch.

**⭐ A verifier disagreed with that handling and proposed:**

Make the DESTINATION a resolved programme property inside the single `creditWallet`, mirroring `rateFor` — do not fork the function, and do not touch `creditBonus`.

1. In `affiliate-service.ts`, resolve `programme` ONCE per accrual from the referrer's role at the moment of accrual (the §6 invariant already demands this, and `referrerMayEarn`/`inviteIsLiveFor(referrer.role)` at :280/:369 already loads the row), and thread it into `creditWallet(userId, amount, description, { programme, sourceRef })`. Then:

```
if (programme === "AGENT") return (await creditInternal(...)) !== null;   // partner revenue, never a promo
if (bcfg.enabled && bcfg.affiliateToBonus) { ...creditBonus... }          // player promo only
```

with a comment saying routing is a player-promo concern and an agent is a business partner who paid a fee. One function, one decision point, one place a fifth reward type has to declare itself. Pass the same `programme` to `recordReward` so the ledger row and the destination can never disagree.

2. Apply it at ALL THREE `creditWallet` call sites (:394 `payBonus`, :440 prize, :576 commission), not just commission. Better still, under decision #3 make `payBonus` and the prize REFUSE outright for `programme === "AGENT"` — an agent earns commission and nothing else, and a refusal is stronger than a re-route.

3. Guard it with a control that must go red, since this is exactly the "a guard that chooses its own population cannot fail" trap named in the build prompt's traps table: with `affiliateToBonus` forced TRUE, settle a recruit of an AGENT referrer and assert `wallet.balance` grew by the cut and `wallet.bonusBalance` is unchanged AND no `BonusGrant` row exists; then flip the same referrer to PLAYER with invite ACTIVE and assert the reward DOES land as a grant. Without that second leg the test passes even if `creditWallet` were deleted. Add the red harness that removes the `programme === "AGENT"` branch and confirms the first leg goes red.

4. Also fix the missing `sourceRef` at :576 in the same change — the build prompt already calls for it (`SESSION-PROMPT-AGENT-BUILD.md:94`), and it is load-bearing here because `creditInternal` gets no idempotency key today.

5. Record the RG knock-on rather than discovering it live: on the cash path an RG-suppressed accrual makes `creditWallet` return false and `recordReward` writes `status: "HELD"`, and `BONUS-WITHDRAWAL.md:180-193` documents that NOTHING transitions a reward out of HELD while the caps still count the row. Routing agents to cash therefore moves them onto the branch that can strand commission. That is the right destination anyway; the plan should state it and put the release action on `/admin/agents`, as §7 already anticipated.

6. The `creditBonus`-versus-`bonusIsLiveFor` question is REAL but is a different ticket and must not be a blanket gate. `proposals-service.ts:569` and `wallet-service.ts:515` also mint grants for ordinary players while `PRODUCT_STATE.bonus = "WITHDRAWN"`, so `BONUS-WITHDRAWAL.md:22`'s claim that "Granting" is withdrawn is not enforced anywhere. If that is closed, it must be SOURCE-SCOPED — gate the automated sources (`REFERRAL`, `PROPOSAL`, `CASHBACK`) and explicitly exempt `source: "ADMIN"`, because both live production grants are `source=ADMIN` and `bonus-config.ts:80-83` promises the operator can still grant. Raise it as its own finding against the withdrawal, not as a rider on the agent build.

---

### 🔴 The only existing control on the agent payment path asserts cash+bonus as a SUM, so it cannot see the wrong wallet

**Severity** critical · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

§5e is the control that carries the whole legacy-attribution section, and it asserts `(wAgent?.balance ?? 0) + (wAgent?.bonusBalance ?? 0) > 0`. That assertion is true whether the agent was paid withdrawable cash or a wagering-locked, 30-day-expiring bonus grant — the two outcomes the programme's authority explicitly distinguishes. It is destination-blind by construction, and the build prompt does not change it. This is the same failure shape recorded in this repo's own history: a guard that printed `bonus.credited` while reporting 43 passed / 0 failed, because the assertion was a sum. Every downstream claim that "the agent is paid as cash" currently rests on this line.

**Evidence** — scripts/withdrawn-features.test.mts:259-261; docs/AGENT-PROGRAMME.md:129-131

**Proposed handling** — Replace the sum with three separate assertions in the same block: `balance` increased by exactly the expected amount, `bonusBalance === 0`, and `db.bonusGrant.listByUser(agent)` contains no `source: "REFERRAL"` row. Prove it with the red mutation: force the bonus branch in `creditWallet` and confirm the section goes red — the current version stays green.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the three separate assertions, but make them destination-explicit, config-explicit and cover the second control.

1. Rewrite §5e (scripts/withdrawn-features.test.mts:259-262) as four assertions in that block, deriving the expected amount from the config the block itself set at :219-223 (cfg.prize.amountTzs — never a literal 10_000; one source of truth for rates):
   · balance === expected (exact, not > 0)
   · bonusBalance === 0
   · (await db.bonusGrant.listByUser("w5e_ref")).filter(g => g.source === "REFERRAL").length === 0  — this catches the PENDING_KYC/QUEUED case where bonusBalance stays 0 because the grant never landed in the wallet, which a bonusBalance check alone cannot see (bonus-service.ts:203-207, landsInWallet). db.bonusGrant.listByUser exists in store.ts:1346; confirm the Prisma DAL exposes it before relying on it — both backends must answer.
   · the reward row's programme/rateApplied stamp, once those columns exist.

2. Set the hostile config explicitly, do not inherit the default. Call setBonusConfig({ enabled: true, affiliateToBonus: true }) at the top of the block and restore it after. Relying on DEFAULT_BONUS_CONFIG means a future officer flipping affiliateToBonus=false makes the control pass for the wrong reason — a gate choosing its own population. The assertion to prove is "an agent is paid cash EVEN WHEN the player bonus programme is fully on", which is precisely leak #1's condition.

3. Prove it red WITHOUT a mutation copy: write these assertions first and run test:withdrawn-features on unmodified HEAD. It must fail with cash=0 bonus=<amount>. That is a stronger proof than a KP_SRC mutation and avoids the locked-harness hazard entirely. Only then fix creditWallet (branch on the referrer's role/programme at the seam, not on global bonus config) and watch it go green.

4. Fix the second control in the SAME commit. scripts/referral-signup.test.mts:76 and :95 must flip to assert cash for its AGENT referrers. Do not delete the bonus-destination coverage — move it to a PLAYER-programme re-enablement fixture driven through the existing env override (FEATURE_INVITE=ACTIVE, as withdrawn-features.test.mts:132 already does for FEATURE_BONUS) with a PLAYER referrer, so the two destinations are asserted separately and the player promo's route back is still exercised. Add test:referral (and test:invites / test:invite-flow, which read bonus destination the same way) to the build prompt's "Then measure" list at docs/SESSION-PROMPT-AGENT-BUILD.md:158-160 so this is discovered on purpose rather than at predeploy.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the routing FIRST, then let the tightened control prove it — and make the control self-controlling so it needs no source mutation.

STEP 1 — creditWallet takes an explicit destination; the caller decides from the programme. In affiliate-service.ts:185, change the signature to carry `programme: "AGENT" | "PLAYER"` (or a `destination: "CASH" | "BONUS"` the callers derive once). AGENT => always creditInternal, unconditionally, never reading getBonusConfig. PLAYER => today's `bcfg.enabled && bcfg.affiliateToBonus` branch, untouched. This is the architecture's own line ("Destination: SEPARATE — Agent -> real cash", AGENT-PROGRAMME.md:148) actually written into the code instead of asserted in a table. Do NOT fix it by having creditWallet consult bonusIsLiveFor: that gates a PAYMENT on a feature flag, and the day someone re-enables bonus for players the agent silently flips back to a locked grant. The programme, not the flag, must decide.

STEP 2 — the control asserts the destination WITH THE BONUS ROUTE DELIBERATELY ARMED. This is the part the finding misses and it is what makes the mutation unnecessary. Inside §5e, call setBonusConfig({ enabled: true, affiliateToBonus: true }, "test-officer") explicitly, then assert the AGENT is still paid cash:
  · wAgent.balance === before + expected (exact, not > 0)
  · (await db.bonusGrant.listByUser("w5e_ref")).filter(g => g.source === "REFERRAL").length === 0
  · the reward row records programme AGENT and destination CASH
Arming the branch by config, in-suite, is strictly stronger than mutating source: it makes the section red-by-construction against the pre-fix code (I confirmed it is red today), it survives the KP_SRC limitation that makes the red harness unable to reach §5, and it is the re-enablement scenario itself rather than a proxy for it. Restore the config in a finally, the way §4 restores the FEATURE_ override (withdrawn-features.test.mts:143).

STEP 3 — add the PLAYER mirror so the branch is proven alive, not dead. Under the same armed config, with FEATURE_INVITE=ACTIVE (§4's existing mechanism), a PLAYER referrer must receive bonusBalance and a REFERRAL grant. Without this, "agent gets cash" would also pass if the bonus route were broken for everyone — the same vacuity §5e was written to prevent, one level up.

STEP 4 — move the control onto the path that will exist. Drive onRecruitSettlement(recruit, { operatorFee }) rather than onRecruitBet, since agents are commission-only priced on collected fee (decision 5). Keep §5d on the bet path, since what §5d proves is that a legacy PLAYER attribution accrues nothing anywhere.

STEP 5 — put the fact in the ledger, in the same migration that adds `programme` and `rateApplied`. Add `destination` (CASH|BONUS) to ReferralReward (prisma/schema.prisma:987) and write it in recordReward. Then the assertion reads a first-class fact instead of inferring from a missing grant, /admin/agents can show "paid as cash" without joining BonusGrant, and the HELD-vs-no-row divergence already recorded at BONUS-WITHDRAWAL.md:180-188 becomes visible in one column.

STEP 6 — keep `bonusBalance === 0` only as a fixture-local sanity line, not the primary assertion. An agent may legitimately hold an unrelated operator grant; the invariant that generalises is "no REFERRAL-sourced grant for an AGENT referrer", plus the exact cash delta.

Sequencing that keeps predeploy green: steps 1 and 2 land in the SAME commit. Landing step 2 alone leaves the tree red with no fix in it, and the documented failure mode of this repo is that somebody then softens the assertion.

---

### 🟠 `programme` is never stamped at bind, so "one referrer, one programme" is recomputed per accrual and cannot be enforced

**Severity** high · **Kind** architecture · ⭐ **FIX DISPUTED**

The architecture states the programme is "stamped at bind" on the attribution. The build prompt's schema section adds `programme` to `ReferralReward` only — nothing is added to `User` or to the attribution record. So the programme of a reward will be derived from the referrer's role at the moment of accrual. Consequences: (a) demoting an agent, or a future role change, silently re-labels the same referrer/recruit relationship's future rows into the other programme, so the sub-ledger's history is not stable; (b) there is no single place that can be asserted to prove the invariant — it becomes a property of whatever each of the three hooks happens to compute; (c) if `PRODUCT_STATE.invite` ever returns to ACTIVE, the player and agent programmes become indistinguishable at bind time and only the derived stamp separates them, which is exactly the collision AGENT-PROGRAMME.md §6 exists to prevent.

**Evidence** — docs/SESSION-PROMPT-AGENT-BUILD.md:60 (`ReferralReward`: add `programme` and `rateApplied`) vs docs/AGENT-PROGRAMME.md:145 and :152-158; src/lib/server/affiliate-service.ts:304 (`recruitedBy` written once, no programme column)

**Proposed handling** — Add `recruitProgramme` (or equivalent) to the attribution write in `bindRecruit`, set once alongside `recruitedBy`, and have all three hooks read the STAMPED value rather than re-deriving from role. `ReferralReward.programme` then copies the attribution's stamp, and the guard is: change the referrer's role between two settlements and both rows must still carry the original programme.

**⭐ A verifier disagreed with that handling and proposed:**

Reject the finding, but bank the one real residue inside it and the one real money hazard it walked past.

1. MAKE THE SINGLE RESOLVER RETURN THE WHOLE POLICY, NOT A BARE NUMBER. The build prompt's `rateFor(account, cfg)` (SESSION-PROMPT-AGENT-BUILD.md:84-89) returns a `number`, and :91 then says "Stamp `programme` and `rateApplied` on every reward" as a separate instruction — which is what leaves programme to be recomputed ad hoc. Replace it with one function that returns the whole branch together, so programme, rate, cap policy and destination cannot disagree and cannot be derived twice:

   type Policy = { programme: "AGENT" | "PLAYER"; rate: number; capPerRecruitTzs: number; windowMonths: number; destination: "CASH" | "BONUS" };
   function policyFor(account, cfg): Policy | null   // null = refuse, never a silent player-rate fallback (leak #3)

   Call it once per accrual, pass the whole object into `recordReward`, and stamp `programme`/`rateApplied` from it. That gives (b) its single assertable place without touching the attribution schema, and it is the same discipline `ratesFor(market)` already enforces. Note `AffiliateAgent.commissionPct` is `Decimal @default(5.00)` (prisma/schema.prisma:846) — never null — so the prompt's `account.commissionPct != null` test is dead and `approvedAt` must be the sole discriminator.

2. THE HAZARD THE FINDING GESTURED AT IS REAL, BUT IT RUNS THE OTHER WAY, AND IT NEEDS NO NEW COLUMN. Under accrual-time derivation an approved agent inherits their PRE-APPROVAL recruited book. A player with legacy `recruitedBy` rows — the population BONUS-WITHDRAWAL.md:147 confirms is live — pays TZS 100,000, is approved, and every one of those legacy recruits immediately begins paying agent commission at the agent's rate as real withdrawable cash, on a book no officer vetted and no fee was paid against. In-window too: the default is `windowMonths: 24` measured from `recruit.createdAt` (affiliate-config.ts DEFAULT_AFFILIATE_CONFIG; affiliate-service.ts:552-555). That is reachable today, needs no re-enablement, and is not one of the four known leaks.

   Fix it as an eligibility window keyed to approval, which keeps the decision at accrual exactly as §6 rules: accrue AGENT commission only when `recruit.createdAt >= account.approvedAt`. No `recruitProgramme` column is needed — `bindRecruit` has exactly one production call site, `auth-service.ts:647`, inside registration, so a recruit's `createdAt` IS their bind time. Recruits bound before approval fall to the PLAYER branch, which today refuses (invite WITHDRAWN) rather than paying.

3. THE CONTROL THAT MUST GO RED (replacing the finder's inverted one): seed a referrer with a legacy `recruitedBy` recruit created before `approvedAt`, approve them as an AGENT, settle that recruit with a positive `operatorFee`, and assert NO reward row is written; then, as the control, settle a recruit created AFTER `approvedAt` and assert exactly one row stamped `programme=AGENT` with `rateApplied` equal to that agent's own rate. Delete the `createdAt >= approvedAt` term and the first assertion must fail — without the second half the suite passes whenever the accrual path is broken for any reason, which is how §5d's first version passed (BONUS-WITHDRAWAL.md:152-158).

**⭐ A verifier disagreed with that handling and proposed:**

Split the two things the finder merged: ELIGIBILITY (may this referrer earn at all — mutable, always re-asked) and MEMBERSHIP (is this relationship an agent relationship — a dated fact, never re-decided). Stamp neither policy nor programme on the recruit; stamp only the FACT that is missing.

1. Eligibility stays exactly where it is. `referrerMayEarn` (`affiliate-service.ts:367`) keeps reading `feature-state.ts`, and gains `AffiliateAgent.active && approvedAt != null` for AGENT — which is what `affiliate-service.ts:275-277` already commissions ("this predicate gains them"). No hook ever reads a stamp to decide eligibility. A deactivated agent stops paying immediately, on every relationship, old and new.

2. Membership becomes a date comparison against facts that already exist. `approvedAt` is already being added to `AffiliateAgent` (build prompt:55). Add `recruitedAt` — not `recruitProgramme` — to the attribution write at `affiliate-service.ts:304`, set once beside `recruitedBy`. A timestamp is a fact (when the bind happened); an enum would be a policy that can go stale against role. Then: a relationship is an AGENT relationship iff `recruitedAt >= referrer.approvedAt`. Do not use `recruit.createdAt` as the proxy even though bind is registration-only today (`auth-service.ts:647`) — §7 contemplates "entering an agent code", and the day that ships the proxy is silently wrong on money.

3. `ReferralReward.programme` + `rateApplied` stay stamped per accrual, as `AGENT-PROGRAMME.md:133` already says. History was never the problem.

4. Fix the authority, or the build will ship the simple role lookup. `AGENT-PROGRAMME.md:154` currently reads "decided by the referrer's role at the moment of accrual". Amend to: programme is decided by the referrer's AGENT STANDING AT BIND (`recruitedAt` vs `approvedAt`); the RATE and the RIGHT TO EARN are read at accrual. And record Ali's ruling on the one case that is a decision, not a bug: when the player promo returns, does a deactivated ex-agent's pre-approval book pay the PLAYER promo, or nothing? Leave it to fall out of a role lookup and it will be answered by accident.

5. Guards, each with a control that must go red (a gate refusing everyone passes a one-sided test — `withdrawn-features.test.mts` §5c exists for exactly this reason):
   - Legacy book: write a `recruitedBy` row with `recruitedAt` BEFORE approval, approve the referrer as an agent, settle the recruit's position → assert ZERO commission and ZERO `ReferralReward` rows. CONTROL: identical fixture with `recruitedAt` after `approvedAt` → must pay. Without the control this passes with the whole agent programme broken.
   - Deactivation between two settlements: first row still reads `programme=AGENT`; second row must NOT EXIST (not exist as PLAYER). CONTROL: leave the agent active → second row exists.
   - Re-enablement matrix: with `FEATURE_INVITE=ACTIVE` (the override at `feature-state.ts:82-86`, which `withdrawn-features.test.mts` §4 already drives and restores), assert whichever answer §6 records — and assert the override does not leak, as §4 does.
   - Extend §5d's population: it currently only proves a PLAYER referrer's legacy rows are inert. Add the AGENT case, which is where the money is.

6. `recruitedAt` is a `User` column, so it must land in both DAL backends and the entity map or memory and Prisma diverge: `store.ts:60` (`StoredUser`), `prisma-dal.ts:118` AND `:608` (two separate mappings of `recruitedBy` — both need it), plus `DATA-LAYER.md`. Backfill is explicit, not implied: every existing row gets `recruitedAt = NULL`, and NULL MEANS "NOT AN AGENT RELATIONSHIP" — refuse, never fall back to role. NULL falling back to derivation is the leak unfixed.

---

### 🟠 The Prisma DAL's affiliate `update` whitelists three fields; the memory DAL spreads everything — rate changes and deactivation will be silent no-ops in production while every suite is green

**Severity** high · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`db.affiliate.update` in the Prisma backend builds `data` from an explicit allow-list of `code`, `totalRecruits`, `totalCommission`, then calls `affiliateAgent.update` and returns the row; anything not on the list is discarded without error and the call still looks successful. The memory backend does `{ ...a, ...patch }` and accepts anything. The build adds `commissionPct`, `active`, `approvedAt`, `applicationId`, `updatedAt` to this exact entity and routes `approveAgent`, the officer's rate control and `deactivateAgent` through it. Unless every one of those fields is added to the Prisma map in the same commit, setting an agent's commission rate and DEACTIVATING an agent both write nothing on Postgres while the in-memory `test:*` suites — which is what all the scripted guards run against — stay green. `deactivateAgent` is a money-stopping control; a silent no-op there is the worst case.

**Evidence** — src/lib/server/prisma-dal.ts:1688-1701 (explicit `data` allow-list, catch→null only on throw); src/lib/server/store.ts:1190-1196 (memory spread); src/lib/server/store.ts:348-355 (`StoredAffiliateAccount` carries none of the new fields today); docs/SESSION-PROMPT-AGENT-BUILD.md:55-57, 66-77

**Proposed handling** — Add every new field to the Prisma `update` map in the same commit, and add a persistence-parity guard (G6) that runs `setAgentRate` and `deactivateAgent` through BOTH backends and reads the value back. Its red mutation is removing one field from the Prisma map — memory must stay green and Prisma must go red; if both stay green the guard is measuring the wrong backend.

**⭐ A verifier disagreed with that handling and proposed:**

The first half of the proposal (map every new field, same commit) is necessary but insufficient and is stated at the wrong altitude — it asks a human to remember a hand-maintained list, which is precisely the mechanism that failed. The second half (a G6 guard that "runs through BOTH backends") is the wrong instrument on this platform: the guards run with no `DATABASE_URL`, so a Prisma-backed guard either needs `C:\pg-loadtest` wired into the pipeline or it SKIPS — and a skipped guard prints green. That is Ali's own recorded law ("a gate not in the pipeline is not a gate"; "treat `0 passed · 0 failed` as a skipped run, never a green one"). It would install a control that cannot go red on the machine it protects.

Do this instead, in three parts:

1. MAKE THE MAP TOTAL SO `tsc` IS THE GATE. Replace the three `if (patch.X !== undefined)` lines with a mapping driven by a mapped type over the full key set, so a field added to `StoredAffiliateAccount` is a COMPILE ERROR until it is mapped:

   const AFFILIATE_COLUMN: { [K in keyof StoredAffiliateAccount]-?: string | null } = {
     userId: null, createdAt: null,            // identity / immutable, deliberately not patchable
     code: "code", recruitCount: "totalRecruits", totalEarnedTzs: "totalCommission",
     commissionPct: "commissionPct", active: "active", approvedAt: "approvedAt",
     applicationId: "applicationId", updatedAt: "updatedAt",
   };

   then build `data` by iterating `Object.entries(patch)` through that map, THROWING (not silently skipping) on a key whose column is `null` while the patch sets it. `-?` is load-bearing: it makes optional new fields mandatory in the map. This converts a silent runtime no-op into a build failure, which is strictly stronger than any suite, needs no database, and cannot be skipped. Apply the same total-map treatment to `toStoredAffiliate` and to `create` — all three are the same defect, and fixing only `update` leaves the wrong-rate-on-mint and wrong-rate-on-read holes live.

2. GUARD IT STATICALLY, NOT WITH A DATABASE. The G6 backstop should be a source-level guard (`scripts/dal-parity.test.mts`) that reads `store.ts` and `prisma-dal.ts` and asserts, for the affiliate entity, that every key of `StoredAffiliateAccount` appears in the column map, in `toStoredAffiliate`, and in `create` — or is on an explicit, named immutable list. It runs in CI with zero infra. Its red mutation is exactly the one proposed — delete one field from the map — and it goes red deterministically on the same machine, rather than depending on whether a Postgres happened to be reachable.

3. THE MONEY CONTROL SHOULD NOT DEPEND ON A COLUMN BEING MAPPED AT ALL. `deactivateAgent` is a money-stopping control; do not let its whole effect hang on one boolean surviving a DAL mapping. `approveAgent` is already specified as "the only place `UserRole.AGENT` is ever assigned" — so make `deactivateAgent` flip the ROLE back off `AGENT` (and write an audit row) in the same transaction as `active=false`, and have `referrerMayEarn` refuse on the role. The role path is already exercised end-to-end by the live seam (`inviteIsLiveFor("AGENT")`, feature-state.ts) and by existing role tests, so the refusal keeps working even if `active` is mis-mapped. That is this platform's "gate the offer, never the refusal" convention applied correctly: the refusal rides the already-proven path, and the new column is a redundant second lock rather than the only one.

**⭐ A verifier disagreed with that handling and proposed:**

Make the compiler the control, then keep a live check that cannot skip quietly.

1) Replace the `if (patch.X !== undefined)` chain in prisma-dal.ts:1689-1701 with an exhaustive key→column map that `tsc` must approve:

```ts
// EVERY key of StoredAffiliateAccount must appear. `null` = deliberately not persisted.
const AFFILIATE_COLUMNS = {
  userId: null, createdAt: null,          // immutable / set at create
  code: "code",
  recruitCount: "totalRecruits",
  totalEarnedTzs: "totalCommission",
  commissionPct: "commissionPct",
  active: "active",
  approvedAt: "approvedAt",
  applicationId: "applicationId",
  updatedAt: "updatedAt",
} satisfies Record<keyof StoredAffiliateAccount, string | null>;
```
and build `data` by iterating `Object.entries(patch)` through that map, throwing on a key the map does not know. Adding a field to `StoredAffiliateAccount` without deciding its column is then a TYPE ERROR in `npm run typecheck` — red on this machine, in CI, forever, with no database and no new runner. That is strictly stronger than the proposed guard and covers every future field, not the two remembered today.

2) Apply the same `satisfies Record<keyof …>` map to prisma-dal.ts:1677-1688 (`affiliate.create` — otherwise the minted agent silently takes `@default(5.00)`) and to prisma-dal.ts:1719-1734 (`referralReward.create` — otherwise `programme`/`rateApplied` never land on Postgres and the §6 sub-ledger filter reads empty). Fix the split convention while you are there: `referralReward.update` at :1736-1744 spreads, `affiliate.update` whitelists.

3) The red mutation moves to the compiler: on a `KP_SRC` copy, delete one entry from `AFFILIATE_COLUMNS` and `npm run typecheck` MUST fail. That is the control this repo asks for, and it is locked to a copy, so it cannot leave the working tree dirty.

4) Do NOT drop the live check — but make skipping red, not green. Keep it as part of the plan's step-2/step-3 live drive against real Postgres (approve an agent at a non-default rate, read `commissionPct` back with `psql`; deactivate, confirm accrual stops on the next settlement, `active=false` in the row). If it is scripted at all, have it `process.exit(1)` when `DATABASE_URL` is absent, so "no DB" reports as a failure rather than a pass.

5) While in the file: prisma-dal.ts:1700 `catch { return null; }` makes a genuine Prisma error indistinguishable from "row not found", and the only caller today (affiliate-service.ts:225) ignores the return. Log the caught error before returning null, and have `approveAgent`/`deactivateAgent` treat a `null` from `db.affiliate.update` as a hard failure rather than proceeding to audit/notify as if the write landed.

6) Also fix the mapper's documented lie at prisma-dal.ts:389 (`updatedAt: iso(a.updatedAt ?? a.createdAt)`) in the same commit as the schema's new `updatedAt`, or the read side will keep reporting a fabricated timestamp for a column that now exists.

---

### 🟠 Per-agent `active` cannot be expressed in the single eligibility seam, and putting it in only one of the three call sites leaves a deactivated agent recruiting and badged

**Severity** high · **Kind** architecture · **unanimous** · ⭐ **FIX DISPUTED**

`inviteIsLiveFor(role)` is synchronous, role-only, and feature-state.ts forbids itself from reaching the database or being imported by client code. Agent eligibility is per-row and asynchronous (`active`, `approvedAt`). The three eligibility questions are asked at different layers: the registration ribbon (`resolveReferralPreview`), the attribution write (`bindRecruit`), and the payment (`referrerMayEarn`). affiliate-service.ts:275-277 explicitly says the predicate must gain `approvedAt`/`.active` and "must not grow a SECOND definition of 'may refer' somewhere else" — but the seam it names cannot hold them. If the build adds the row check only to `referrerMayEarn`, a deactivated agent's link still binds new players permanently and the register page still shows them the "Verified 50pick Agent" badge, while they earn nothing — attribution accruing against a partner we have terminated.

**Evidence** — src/lib/feature-state.ts:37-43 (server-only, role-only, sync), :95-104; src/lib/server/affiliate-service.ts:165 (ribbon), :279-290 (bind), :367-370 (earn), :271-277 (the stated rule)

**Proposed handling** — Introduce one async `mayRefer(userId)` in affiliate-service that composes `inviteIsLiveFor(role)` with the agent-row check, and route ALL THREE call sites through it — deleting the direct `inviteIsLiveFor` calls at :165, :280 and :369 so the compiler surfaces any missed site, exactly as deleting `invite-feature.ts` did. Also decide explicitly whether `deactivateAgent` demotes the role; if it does not, role alone must never be sufficient anywhere.

**⭐ A verifier disagreed with that handling and proposed:**

Keep ONE definition, in the seam the code already names, and force the compiler to find all nine sites without deleting a guarded export.

1. WIDEN THE SEAM IN PLACE BY CHANGING ITS SIGNATURE, not by composing a second predicate elsewhere. In `feature-state.ts`, add a REQUIRED second parameter carrying the row's standing:
   `export type AgentStanding = { approvedAt: string | null; active: boolean } | null;`
   `inviteStateFor(role, agent: AgentStanding)` — agent branch becomes `role === "AGENT" && agent?.approvedAt != null && agent.active`.
   A required parameter is a compile error at all nine existing call sites — the same forcing function the file itself credits for the `invite-feature.ts` deletion (`:5-11`) — while the export, and therefore `withdrawn-features.test.mts`, survives. It stays SYNC, server-only and DB-free: the caller supplies the row exactly as it already supplies the role, so this dodges the async/client-boundary risk that "a build is not a render" was written about.

2. LOAD THE STANDING WHERE THE ROLE IS ALREADY LOADED. All nine sites already read the user or the shell's `viewerRole`; add `db.affiliate.findByUserId` beside it and thread it as `app-shell.tsx:183` already threads `inviteVisible`.

3. SPLIT THE TWO QUESTIONS — this is what the single `mayRefer` gets wrong:
   · `mayRefer` = product state AND `approvedAt != null` AND `active`. Governs the OFFER: ribbon/badge (`:165`), bind (`:280`), accrual (`:369`), the code stitched onto share links (`markets/[id]:192`, `positions:59`), the profile row (`:285`), nav (`app-shell:183`), achievements (`:43`).
   · `mayReadOwnLedger` = role AGENT AND `approvedAt != null`, IGNORING `active`. Governs only `/profile/invite:130`, so a terminated agent still reads their history. Gate the offer, never the refusal — and never the accounting.

4. DECIDE IT IN THE DOC: `deactivateAgent` must NOT demote the role. `UserRole.AGENT` records what compliance vetted and is assigned in exactly one place (AGENT-PROGRAMME §10, `feature-state.ts:92`); `active=false` is the switch. Demoting instead would make `active` a column nobody reads — the precise defect `tier` is being dropped for.

5. BOTH BACKENDS: add `approvedAt`, `active` and `commissionPct` to `StoredAffiliateAccount` (`store.ts:348`), `toStoredAffiliate` (`prisma-dal.ts:382`) and the memory facade (`store.ts:1182`), plus the `DATA-LAYER.md` entity map — otherwise memory answers "eligible" where Prisma answers "not".

6. CONTROLS THAT MUST GO RED, on a deactivated-agent fixture: (a) the bind refuses AND the `User.recruitedBy` column is still null — assert the ROW, not the return value; (b) `resolveReferralPreview` returns null so no "Verified 50pick Agent" badge renders; (c) a settlement on a pre-existing recruit creates ZERO `ReferralReward` rows — assert the row COUNT, never a sum (a sum assertion is what let a credited bonus pass 43/0 green); (d) the mandatory control: the identical fixture with `active=true, approvedAt` set binds, badges and accrues; (e) the deactivated agent still loads `/profile/invite` and sees their historical ledger. Add an `approvedAt=null, active=true` ordinary-player fixture too, since that is what every minted row looks like.

**⭐ A verifier disagreed with that handling and proposed:**

Same direction, but the seam must be closed by construction, not by discipline. Four concrete moves, all inside the build:

1. ONE PREDICATE, AND MAKE THE COMPILER FIND ALL NINE SITES. Add to affiliate-service.ts:

   export async function mayRefer(user: { id: string; role: Role } | null): Promise<boolean> {
     if (!user) return false;
     if (inviteStateFor(user.role) !== "ACTIVE") return false;
     if (user.role !== "AGENT") return true;              // player promo path — see (2)
     const row = await db.affiliate.findByUserId(user.id);
     return !!row?.approvedAt && row.active;              // agent path: row is authoritative
   }

   Take the user ROW, not a userId — bindRecruit (:279), resolveReferralPreview (:154) and referrerMayEarn (:368) have already loaded it, and a userId signature makes three redundant reads on the settlement hot path.

   Then DELETE the `inviteIsLiveFor` export from feature-state.ts, leaving only `inviteStateFor(role)` for `mayRefer` to compose. That is what makes all nine sites fail to compile — the invite-feature.ts precedent applied correctly. Route every one of them through `mayRefer`. All six non-affiliate sites are server components or server helpers, so async is free; app-shell.tsx already awaits a user fetch two lines above :183 and already threads the resolved boolean to clients, so the "server computes, clients receive" rule at feature-state.ts:37-43 is preserved unchanged.

2. THE `role !== "AGENT"` EARLY RETURN IS LOAD-BEARING — comment it as such. Without it, re-enabling the player promo pays nobody, because every player's auto-minted AffiliateAgent row has approvedAt = null and the composed AND is false for the entire population. This is the same shape as the recorded "a guard that chooses its own population cannot fail" trap, inverted.

3. DEACTIVATION IS ONE FACT: `AffiliateAgent.active = false`. The role stays AGENT. Write it into AGENT-PROGRAMME.md §6 (which today says eligibility is role-only) and into the build prompt beside `deactivateAgent`, with the consequence stated: role alone is never sufficient to answer "may refer" anywhere, which (1) now enforces mechanically. Do NOT demote — a second writable fact drifts, and AGENT is how /agent/status, the §6 sub-ledger and the audit trail identify the partner after termination. Reinstatement is `active = true`, one write, no role churn.

4. Add `active` to `rateFor` too, or delete the fallback. The prompt's snippet (:84-89) returns the agent rate on `approvedAt && commissionPct != null` and falls back to `cfg.commission.rate`. For a deactivated agent that silently pays the PLAYER promo rate — leak #3 with a new trigger. `rateFor` must refuse (return null and skip the accrual) rather than fall back, for any AGENT row that is not approved-and-active.

RED HARNESS — four controls that must each go red when the check is deleted, since a green suite proves nothing here:
   a. deactivated agent's code → bindRecruit returns `referrer_not_eligible` and writes NO `recruitedBy`;
   b. deactivated agent's code → resolveReferralPreview returns null, so the register page shows NO "Verified 50pick Agent" badge (assert on the rendered ribbon, not the function);
   c. deactivated agent with a pre-existing recruit → settlement accrues ZERO (assert the reward COUNT, not a sum — the recorded failure where a SUM assertion passed while a bonus credited);
   d. THE POPULATION CONTROL: under FEATURE_INVITE=ACTIVE, an ordinary PLAYER with an auto-minted approvedAt-null row still passes `mayRefer`. Without (d) the suite cannot tell a correct composition from one that has switched the player programme off forever.

Also update scripts/withdrawn-features.test.mts:49 — "CONTROL · invite IS live for an approved AGENT" currently asserts `inviteIsLiveFor("AGENT")`. Once that export is gone the assertion must become a product-state statement (`inviteStateFor("AGENT") === "ACTIVE"`) plus a new `mayRefer` case, or the guard keeps asserting an answer the product no longer gives.

---

### 🟠 Every switch that controls agent money sits in the GROWTH domain; the compliance officer who approves and prices the agent cannot see any of them

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

`/admin/affiliate` and `/admin/bonuses` are both mapped to `growth`, and GROWTH holds `growth: { canView: true, canAct: true }` and nothing else. COMPLIANCE holds no growth grant at all. So a growth officer, acting alone on the player promo, can (a) stop all agent commission via the master switch or `commission.enabled`, (b) reroute every agent's commission into the bonus wallet via `affiliateToBonus`, and (c) under the build prompt §6, set an individual agent's contractual commission rate — while the compliance officer who vetted, charged and approved that agent cannot view the screen, let alone the change. The plan also places the rate on TWO surfaces (the compliance workstation §5 "rate control" and the growth sub-ledger §6 "per-agent rate"), which is two writers for one contractual term.

**Evidence** — src/lib/server/roles.ts:239-241 (both routes → growth), :189-192 (GROWTH grants), :175-180 (COMPLIANCE has no growth); docs/SESSION-PROMPT-AGENT-BUILD.md:110-112 and :119-121; docs/AGENT-PROGRAMME.md:209 ("/admin/affiliate stays growth")

**Proposed handling** — The per-agent rate is a compliance/contract term: give it exactly ONE writer, on `/admin/agents/[id]`, and render it read-only on `/admin/affiliate`. Once agent economics no longer read the player-promo config at all (finding 1), the growth switches stop being able to reach agent money, which is the structural fix rather than an RBAC patch.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the single-writer rule, then actually cut the growth domain out of agent economics — do not patch RBAC.

1. NO GROWTH GRANT FOR COMPLIANCE, EVER. Rule it out in writing in AGENT-PROGRAMME.md §10 next to the existing "/admin/affiliate stays growth" line. Cross-granting would give compliance the player promo and break the 2026-07-28 duty split.

2. ONE WRITER FOR THE RATE, and make the plan say so. Amend SESSION-PROMPT-AGENT-BUILD.md:119-121 to read "per-agent rate, READ-ONLY (written only on /admin/agents/[id])", so it stops contradicting AGENT-PROGRAMME.md:123/:148. Rendered value on a growth page, not a growth grant over compliance data.

3. ENFORCE THE §2.10 CEILING AT THE WRITE, not just in the doc. A single officer prices the agent (decision 9, no two-officer lock), so the server-side ceiling is the only bound on that transaction. Reject out-of-range commissionPct in the action, and stamp rateApplied on every reward (already planned) so a later rate change cannot rewrite history.

4. GIVE AGENTS THEIR OWN ENABLE + CAPS, resolved BEFORE any getAffiliateConfig() read. In each of the three hooks (affiliate-service.ts:497, :546, :612) resolve the referrer's programme first; for programme=AGENT take enabled/rate/caps/window from the agent's own row plus a compliance-owned agent config, and never consult cfg.enabled or cfg.commission.enabled. This is what removes the growth officer's reach; the read-only render in (2) is cosmetic without it. It also subsumes known leaks 2, 3 and 4.

5. MAKE creditWallet TAKE AN EXPLICIT DESTINATION rather than reading global bonus config (affiliate-service.ts:186-187). programme=AGENT → creditInternal unconditionally. Note this is live-relevant today, not just on re-enablement: bonus-config.ts:64 ships affiliateToBonus TRUE, so the FIRST day the bonus programme is un-withdrawn, agent commission silently becomes non-withdrawable bonus money with a wagering requirement — against decision 6 and against a paying business partner's contract.

6. VISIBILITY WITHOUT A GRANT. The audit trail already exists (affiliate-config.ts:105, bonus-config.ts:115) and compliance can already read /admin/audit — so surface agent-economics changes there and on /admin/agents/[id] as a "rate history" rail on the agent's own row, in the compliance domain. That is the correct answer to "the officer cannot see it", and it needs no RBAC change.

7. CONTROLS THAT MUST GO RED. Two guards, each proved by mutation: (i) a test that enumerates server actions writing commissionPct and fails if any resolves to a domain other than compliance — prove it by adding a write path on /admin/affiliate and watching it go red; (ii) a settlement test with an AGENT referrer run twice, once with cfg.enabled=false and affiliateToBonus=true — commission must still accrue, at the agent's rate, to REAL balance. Prove that one by restoring the cfg.enabled read and confirming it fails. A guard that has never failed is a hypothesis.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the single-writer ruling, move the resting place, and name the domain for everything new.

1. ONE WRITER, and it is already the authority's. Delete "Per-agent rate" from `SESSION-PROMPT-AGENT-BUILD.md:120`. `commissionPct` is written in exactly one place — `approveAgent` and the rate control on `/admin/agents/[id]` (`compliance`, step-up 2FA), per `AGENT-PROGRAMME.md:123/:147`. This is the `ratesFor(market)` one-resolver discipline the prompt itself invokes at §3.

2. The agent SUB-LEDGER is not a growth artefact. Split prompt §6 by `programme` — the filter it already calls for: `/admin/affiliate` (growth) renders `programme = PLAYER` only, and never a named agent's rate or earnings, which keeps it inside GROWTH's `money.figures: "none"` ceiling (`roles.ts:426-431`). The agent payout ledger goes where the money roles can read it: `/admin/agents` (compliance) for the per-agent view, and the aggregate into `/admin/reports`/`/admin/house` (`accounting`), where FINANCE, AUDITOR and COMPLIANCE all already hold canView (`roles.ts:178,185-187,193-197`) and where "what did we pay agents" belongs next to the rest of the book. Register both prefixes in `ROUTE_DOMAINS` in the same commit — `domainForPath` fails closed to `ops`, which is Owner-only, exactly the trap the `/admin/house` comment at `roles.ts:227-232` records.

3. Name the domain for every NEW agent control before writing it. The agent commission ceiling, agent cap and agent window are `accounting` (the platform already files rates & fees there — `roles.ts:236` maps `/admin/config` to accounting and `DOMAIN_SUMMARY.accounting.act` is "edit rates & fees"). Only the per-agent contractual rate is `compliance`. Nothing agent-economic is ever added to a `growth` surface. Without this line the decoupling fix reconstitutes the defect.

4. Bound the lone officer, in code not prose. `RULES.md` §2.10's ceiling must be enforced inside the rate setter and `approveAgent` — the prompt's §7 "Enforced in" must resolve to a real refusal, not a doc row. Every rate write carries an audit row (actor/before/after, the `market.recategorised` precedent), and every accrual keeps `rateApplied` (already planned), so a rate is reconstructible after the fact whoever wrote it. This is what makes compliance-only rate authorship safe without a second-officer lock, which is forbidden (`AGENT-PROGRAMME.md:210`, `test:two-admin`).

5. Prove it by mutation, with the control in the same run. New case in the agent suite: set `cfg.enabled=false`, `cfg.commission.enabled=false` and `affiliateToBonus=true`, settle an AGENT-attributed position, and assert commission still accrues, at that agent's own `commissionPct`, stamped `programme=AGENT`, as withdrawable cash with no wagering requirement. Positive control in the same run: a PLAYER-programme accrual under the identical config DOES stop — without it, deleting the accrual path passes the refusal. Red anchors: `agent-reads-player-enabled`, `agent-credit-routed-to-bonus`, `agent-rate-falls-back-to-cfg`, `agent-inherits-player-cap`, plus an RBAC anchor `growth-can-write-agent-rate` that must go red once §6 is split.

---

### 🟠 `/admin/invites` is a fifth, unenumerated switch that mints bonus-wallet money to ordinary players with no feature-state gate at all

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

Invite CAMPAIGNS are a separate system from the referral programme: a growth officer creates a campaign at `/admin/invites`, and `bindRegistration` — called directly from `registerWithPassword` — grants the campaign bonus through `creditBonus`. Nothing on that path consults `feature-state.ts`. So the statement that "normal players get no bonus wallet and no invite" is falsifiable today by a single growth officer with no code change, and a player can arrive carrying BOTH an agent referral code and a campaign invite code on the same registration. The matrix as posed (invite / bonus / agent / affiliate master / per-agent active) does not contain this switch, so no combination anyone reasons about will notice it.

**Evidence** — src/lib/server/invite-service.ts:256-270 (bindRegistration → creditBonus, no gate), :6-11; src/lib/server/auth-service.ts:641-663 (both codes bound on one registration); src/lib/server/roles.ts:241 (/admin/invites → growth); docs/BONUS-WITHDRAWAL.md:11-12

**Proposed handling** — Either gate campaign granting on `bonusIsLiveFor()` (consistent with Law 1 — a campaign grant is an offer), or record it in BONUS-WITHDRAWAL.md as a deliberate, officer-only exception with the reason. Add it to the matrix guard's switch list either way, and assert what happens when a registration carries both a campaign code and an agent code.

**⭐ A verifier disagreed with that handling and proposed:**

Gate the OFFER at all three of its faces, keep the officer's discretionary grant, and make the guard enumerate the switch list rather than trust a reader to.

1. Gate the campaign's PROMISE, not just its payment — in one commit, all four sites:
   · `createCampaign` (`invite-service.ts:75`) — refuse while `!bonusIsLiveFor()`, returning `{ ok:false, error:"The bonus wallet is withdrawn from the product; campaigns cannot be created." }`. Most upstream, and it stops the surface being usable at all.
   · `sendCampaign` (:196) — refuse, so codes already sitting in DRAFT campaigns cannot be mailed.
   · `getInvitePreview` (:295) — `return null` while withdrawn, matching `resolveReferralPreview`'s existing shape at `affiliate-service.ts:369`. The banner then simply does not render, which is exactly the "WITHDRAWN renders NOTHING" contract.
   · `bindRegistration` (:256) — refuse as the backstop for codes already in the wild from campaigns sent before the gate. This one must AUDIT the refusal (`invite.bind.refused_withdrawn`, category SYSTEM) rather than return a silent null, so an officer can see why a player who was mailed a code got nothing.
   Do NOT put the gate inside `creditBonus`: that would kill the officer grant at `/admin/bonuses` that §1's table and `bonus-config.ts:86` deliberately keep. The distinction that survives Law 1 is *automated, player-triggered, marketed en masse* (campaign — an offer) vs *per-player, officer-initiated, audited* (admin grant — discretion). Write that distinction into the comment at the gate, because the next reader will otherwise "consolidate" them.

2. Add `/admin/invites` to `roles.ts`'s route table as a WITHDRAWN-aware surface the same way the player entry points were handled — either drop the nav entry while `!bonusIsLiveFor()`, or render the page with an explicit withdrawn banner. Do not leave a live create form behind a growth scope with no state on it.

3. Make the guard hold the switch list. Add a §6 to `scripts/withdrawn-features.test.mts` that:
   · asserts `createCampaign` / `sendCampaign` / `getInvitePreview` / `bindRegistration` all refuse for a PLAYER under the shipped state, with the CONTROL that under `FEATURE_BONUS=ACTIVE` all four succeed and a grant is actually written (without that control the section passes whenever the campaign path is broken for any reason — the exact failure mode §5d already suffered and was rewritten for);
   · asserts the both-codes registration explicitly: one `registerWithPassword` carrying an AGENT `referralCode` AND a campaign `inviteCode` yields `recruitedBy` set, `programme=AGENT`, and ZERO `BonusGrant` rows — the attribution binds, the bonus does not;
   · enumerates the switches by SOURCE, not by hand: grep `src/lib/server/*.ts` for callers of `creditBonus`/`creditWallet` and fail on any caller not on an explicit allow-list in the test. That is what turns "the matrix" from a list somebody maintains into a control that goes red when a sixth switch appears.

4. Record it in `docs/BONUS-WITHDRAWAL.md` (a row in §4's sweep table, since that table is the record of what the sweep found) and add the campaign switch to the `docs/AGENT-PROGRAMME.md` state table. §4 currently claims the sweep was complete; it missed this, and the doc should say so rather than be quietly corrected.

5. Red harness before calling it done: delete the `bindRegistration` gate and confirm §6 goes red with a real `BonusGrant` row for a PLAYER; restore and confirm byte-identical to `git show HEAD:`. A gate whose removal leaves the suite green is not a gate.

**⭐ A verifier disagreed with that handling and proposed:**

Escalate, then gate the whole promise chain, then guard by enumeration rather than by memory.

1. ASK ALI, do not decide in code. One line: "A growth officer can still mint bonus-wallet money to ordinary players via /admin/invites campaigns. Is that in or out?" It contradicts his recorded ruling, so it is an owner decision. Record the answer in BONUS-WITHDRAWAL.md §1 either way — if campaigns stay, §1's headline sentence must be reworded, because as written it is false.

2. IF WITHDRAWN — gate every link of the promise, in ONE commit, on `bonusIsLiveFor()` and nowhere else:
   · `createCampaign` (invite-service.ts:75) — refuse, with the reason in the returned error so the officer sees why.
   · `sendCampaign` (:196) — refuse before anything leaves the box.
   · `getInvitePreview` (:295) — return `null`, byte-for-byte the treatment `resolveReferralPreview` (affiliate-service.ts:165) already gives the ref ribbon. This alone removes the register banner and the hidden `invite` input (page.tsx:195), so nothing carries the code forward.
   · `bindRegistration` (:256) — the grant itself.
   · the `/admin/invites` route + nav entry (roles.ts:241).
   ⛔ Never gate `creditBonus` itself: it is the shared mint that agent rewards reach through `creditWallet` (affiliate-service.ts:185-196), and it is also the refusal-side path (RG, KYC hold, wagering, expiry) that `feature-state.ts:27-36` forbids gating.

3. HONOUR WHAT WAS ALREADY PROMISED. Before the grant gate lands, measure production for campaigns holding `SENT`/`QUEUED` entries (`db.inviteEntry`), do not assume there are none. If any exist, the gate must let a pre-existing `SENT` entry redeem (grant only where `findByCampaignAndContact` returns a SENT row) while refusing every fresh code — or the campaign is cancelled and those people are told. Falling silent on a promise already delivered is the §6b #4 mistake.

4. GUARD BY ENUMERATION, WITH A CONTROL THAT MUST GO RED. Add to `withdrawn-features.test.mts` a section that greps `src/` for every call site of `creditBonus(` and `creditWallet(` and asserts each file either imports `feature-state` or appears in an explicit ALLOWLIST constant with a written reason (today: `bonus-service` itself, `affiliate-service` — the agent path, deliberately not gated). A new mint added anywhere then fails the suite instead of waiting for the next audit. Pair it with a `red:` mutation that deletes the campaign gate and must go RED — per the standing rule, a gate whose removal leaves the suite green is measuring the config, not the gate (§6b, the §5d lesson).

5. PIN THE BOTH-CODES CASE, AND NOTE IT IS NOT NEUTRAL. Assert `/auth/register?ref=AGENT&invite=CAMP` explicitly. But the assertion is not the whole answer: `onRecruitSettlement` (affiliate-service.ts:537-558) accrues on `operatorFee` with no exclusion for bonus-funded stakes, so an agent-attributed player funded by a house campaign bonus earns the agent REAL WITHDRAWABLE CASH commission on the fee generated by money the house minted. That is a subsidy path from the growth budget into agent commission, and it needs a stated decision (exclude bonus-funded stake from the commission base, or accept it in writing) — not just a test that records whichever behaviour ships.

---

### 🟠 The minimum guard set that would actually prove the matrix, with the red mutation each one needs

**Severity** high · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

The matrix is currently proven by one destination-blind sum. The minimum set, each stated with the mutation that must turn it red: G1 DESTINATION — an agent's commission increases `wallet.balance` by exactly the expected amount, `bonusBalance` stays 0, and no `source:REFERRAL` BonusGrant exists; RED: force `creditWallet`'s bonus branch (today's actual behaviour — so this guard fails on unmodified HEAD until finding 2 is fixed, which is itself the proof). G2 EXCLUSIVITY — with commission, prize and bonus modes ALL enabled, one agent recruit's first bet plus settlement yields exactly one reward row, type COMMISSION, programme AGENT; RED: delete the AGENT branch in payPrize → a PRIZE row appears. G3 INDEPENDENCE — with `affiliate.enabled:false` and `commission.enabled:false`, an AGENT still accrues at their own rate, and the CONTROL is a PLAYER referrer in the same run accruing nothing; RED: restore `if (!cfg.enabled) return` → the agent accrual vanishes while the control stays green. G4 RATE PROVENANCE — commissionPct 3 pays 3% of the operator fee, and an account with `approvedAt` null is REFUSED, not defaulted; RED: change the resolver's fallback to `cfg.commission.rate` → the refusal case pays. G5 CAP PROVENANCE — the cap comes from the agent row and its sum counts only programme=AGENT rows; RED: drop the programme filter → a seeded legacy PLAYER row shrinks the agent's remaining cap. G6 PERSISTENCE PARITY — `setAgentRate` and `deactivateAgent` write and read back through BOTH DAL backends; RED: remove `commissionPct` from the Prisma `update` map → memory green, Prisma red (if both stay green the harness is running the wrong backend). G7 MATRIX SWEEP — table-driven over the switch product (invite state × bonus state × affiliate master × commission/prize/bonus modes × affiliateToBonus × agent active), asserting for each cell (paid?, amount, destination, programme) for one AGENT and one PLAYER referrer; RED: point any single accrual gate at the player config → precisely the cells that must differ stop differing. G8 PROGRAMME IMMUTABILITY — change the referrer's role between two settlements; both rows still carry the stamped programme; RED: derive programme from current role → the second row flips. Two coverage rules apply to all of them: the population must include `src/app/agent/**`, `src/app/admin/agents/**` and `scripts/`, and every refusal needs a control in the same run that must go red — the legacy-attribution test passed with its gate deleted because the config could not pay either way.

**Evidence** — scripts/withdrawn-features.test.mts:259-261 (the only current agent-payment control, a sum) and :210-215 (the recorded precedent of a vacuous guard measuring the config rather than the gate); docs/SESSION-PROMPT-AGENT-BUILD.md:156-171

**Proposed handling** — Build G1–G8 as one `agent-matrix` suite with a `red:agent-matrix` harness, run each mutation against a LOCKED copy via KP_SRC (not the working tree), and record in AGENT-PROGRAMME.md which cell each guard covers. Do not accept any cell as proven by a passing assertion whose red mutation has not been executed.

**⭐ A verifier disagreed with that handling and proposed:**

Keep G1–G8 as the cell list. Change three things; two of them are defects that would make the harness itself the next instrument-green failure.

1. ⛔ KP_SRC CANNOT ISOLATE A BEHAVIOURAL MUTATION — the proposal's core mechanism is a category error. KP_SRC is a source-tree POINTER consumed only by file-scanning gates (`chart-one-home.test.mts:41`, `chip-contract.test.mts:104`, `cn-collision.test.mts:42`, `section-rail.test.mts:33`, `tap-target.test.mts:252`, and `withdrawn-features.test.mts:306` — its §6 source sweep only). G1–G6 and G8 EXECUTE the accrual code: the specifier `../src/lib/server/affiliate-service.ts` resolves to the working tree no matter what KP_SRC says. Mutate a copy and point KP_SRC at it and every mutation reports NOT CAUGHT — a harness that concludes its own guards are blind, from a copy nothing ran. The repo already has the right convention for behavioural gates: `scripts/red-payout-destination.mjs` — anchors as DATA in `scripts/anchors/*.anchors.mjs` (so `test:red-anchors` can audit them without running the harness), a precondition that REFUSES if the gate is already red on the untouched tree, in-tree inject → run → restore in `finally`, and the match on `FAIL <label>` rather than a section number. Build `red:agent-matrix` on that shape. Address the concurrency hazard the memory records with a lockfile plus a `git diff` against `git show HEAD:` on exit — not with KP_SRC. Use KP_SRC only for the population half (the `src/app/agent/**`, `src/app/admin/agents/**`, `scripts/` coverage rule), which is genuinely a file sweep.

2. 🔴 G3's CONTROL IS VACUOUS EXACTLY AS §5d WAS. `referrerMayEarn` (affiliate-service.ts:367-370) refuses a PLAYER on `inviteIsLiveFor` BEFORE any config is read. So in the default environment the PLAYER control accrues nothing whatever `affiliate.enabled` says — it stays green with the config gate deleted, which is the precedent the finding itself cites. The control must run with `FEATURE_INVITE=ACTIVE` (the override at feature-state.ts:82-86 exists for precisely this), so the player is refused ONLY by the config being off. Then it discriminates: config-off refuses the player, the agent still accrues.

3. G1 IS NOT A RED-HARNESS CASE YET, AND ITS SEQUENCE MATTERS. The bonus branch is not something to "force" — it is the live default (bonus-config.ts:60-64, and lines 71-76 record that production has no config row). So on HEAD G1 is a LIVE-DEFECT assertion, not a mutation. Order: fix `creditWallet` to take the destination from the referrer's programme (agent → `creditInternal`, unconditionally, never reading `getBonusConfig`), THEN G1's red mutation becomes "restore the unconditional `bcfg.enabled && bcfg.affiliateToBonus` branch". State it that way in the anchor or the harness will refuse on its own precondition and read as broken tooling.

4. FIX G7's AXES BEFORE BUILDING THE TABLE. `FEATURE_BONUS` does not gate destination — `bonus-service.ts` never imports `feature-state`. The axes that actually decide are `bonusConfig.enabled` and `bonusConfig.affiliateToBonus`. Sweeping `FEATURE_BONUS` and expecting destination to move produces a block of no-op cells that will read as proven. Keep `FEATURE_BONUS` in the table only for surface/visibility cells, and mark it explicitly as not a destination axis.

5. WIDEN G6 to cover `create`, not just `update` — the Prisma create map omits `commissionPct` too, so the first agent ever approved is the first divergence. And run the Prisma half against the real Postgres in the same invocation, printing which backend each block ran on: "both green" is otherwise indistinguishable from "memory twice".

Everything else in the proposal stands, including the rule that no cell is accepted as proven until its red mutation has actually been executed, and recording the guard↔cell map in AGENT-PROGRAMME.md (§10 already carries "a red harness per guard").

**⭐ A verifier disagreed with that handling and proposed:**

Keep G1–G5, G7, G8 as the guard set — they are well-aimed — but change the mechanism, restate G6, and reshape G7.

MECHANISM (replaces "locked copy via KP_SRC"). Use the repo's behavioural convention, which already exists and is audited: `scripts/red-anchor.mjs` + anchors as DATA in `scripts/anchors/agent-matrix.anchors.mjs`, so `test:red-anchors` can verify every anchor still resolves exactly once WITHOUT running the harness. Model `red-agent-matrix.mjs` on `red-payout-destination.mjs`: refuse if the gate is already red on the untouched tree, inject → run → restore per case, and match on `FAIL <label>` so a defect caught for the wrong reason cannot print PASS. Reserve KP_SRC for the one genuinely source-level guard (the coverage sweep over `src/app/agent/**`, `src/app/admin/agents/**`, `scripts/`), where it does work. Address the concurrency incident directly instead of by copying: before mutating, refuse if any anchor file differs from `git show HEAD:<path>`; after restoring, assert the same diff is empty again. That is the check the working-tree poisoning actually needed — the harness's own "0 files left dirty" pass was measured against an already-poisoned baseline.

G6 RESTATED. Two halves, neither pretending to be the other. (a) Source parity, in one loop over `store.ts` and `prisma-dal.ts`, in the `id-documents.test.mts:463-468` shape: every mutable `AffiliateAgent` field — `commissionPct`, `active`, `approvedAt`, `applicationId`, `updatedAt` — appears in BOTH update maps; RED: delete `commissionPct` from the Prisma map. (b) The behavioural half belongs to the live drive already scheduled at `SESSION-PROMPT-AGENT-BUILD.md:144-151` (officer sets the rate, agent earns at it), which runs on real Postgres. Do not claim (a) proves (b).

G7 RESHAPED — a property, not a table. Assert INVARIANCE rather than 576 typed expectations: for an AGENT referrer, the tuple (paid?, amount, destination, programme) is invariant across every player-promo switch and varies only with the agent's own row; the CONTROL is a PLAYER referrer in the same sweep whose tuple MUST vary across those same cells (otherwise the sweep is reaching nothing). One assertion, no author-typed answers to get wrong, and the red mutation is unchanged: point any single accrual gate at the player config and the invariance breaks. Keep an explicit small table only for the four decision-bearing cells (destination, independence, exclusivity, provenance) where the expected value is stated in `AGENT-PROGRAMME.md:129-134` and can be cited to a line.

TWO GUARDS TO ADD, both from what the reading turned up.
· G0 — DESTINATION IS DECIDED BY PROGRAMME, NOT BY GLOBAL CONFIG. Fix `creditWallet` (`affiliate-service.ts:185-197`) to take an explicit destination derived from the reward's `programme`, and assert at source that no AGENT reward path reads `getBonusConfig()` at all. One source of truth for where the money lands, the same discipline the rate resolver gets. Without this, G1 is asserting an outcome that a growth officer's toggle can still move.
· G0b — THE PRODUCT STATE MUST REACH THE GRANT. `bonus-service.ts` imports no feature seam, so `creditBonus` mints `source:REFERRAL` grants while `bonusIsLiveFor()` is false. Assert that a REFERRAL bonus grant cannot be created with the bonus feature withdrawn. This is gating an OFFER, not a refusal, so it is on the right side of the law in `feature-state.ts`'s header — but state that in the guard's comment, because the next reader will check.

ORDER OF WORK. Fix the destination leak first; then land G1; then add its red case ("restore the bonus branch") — the harness cannot be built against a gate that is red on HEAD. And record in `AGENT-PROGRAMME.md` which cell each guard covers, as proposed: that part of the proposal is right, and §10 currently demands a red harness per guard while naming none.

---

### 🟡 Caps, the window and the denormalised earnings total are programme-blind, so a shared ledger will cross-contaminate agent and player money

**Severity** medium · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

Keeping one `ReferralReward` table is right, but only the ADMIN ledger is planned to filter on `programme`. Three aggregates are not: the per-recruit cap sums rows filtered on `type === "COMMISSION"` only; `recordReward` adds every PAID reward to `AffiliateAgent.totalCommission`; and `getPlayerReferralSummary` sums every PAID row for the recruit. So an agent's cap will be consumed by any player-programme commission on the same pair, an agent's dashboard "earned" figure will silently include player-promo prizes, and the admin leaderboard's `earnedTzs` will mix both programmes into one number the framework calls a sub-ledger. Adding a `programme` column without making the aggregates read it produces a ledger that is separable on the screen and merged in the arithmetic.

**Evidence** — src/lib/server/affiliate-service.ts:566-573 (cap sum, type only), :223-226 (totalEarnedTzs), :652-654 (dashboard sum), :738-742 (admin stats); docs/SESSION-PROMPT-AGENT-BUILD.md:118-121 (only the ledger is filtered)

**Proposed handling** — Every read that aggregates ReferralReward must take `programme` as a required argument — no default. Make the parameter non-optional so the compiler lists all call sites, and assert in the guard that an agent's cap is unaffected by a legacy PLAYER row on the same pair.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding, drop the cap half of the fix, and add the column half.

1. CAP — leave the sum programme-BLIND, and fix the CAP VALUE instead (this is leak #4's fix, not a new one). One recruit, one lifetime allowance, whoever was paid on them. Source `capPerRecruitTzs` from the agent's own row when `referrerMayEarn` resolves an approved agent, and compare the mixed-programme spend against it. That direction is safe: a pair that already cost the house money under the promo does not get a second full allowance. Write the red harness the OPPOSITE way to the one proposed — seed a PAID PLAYER COMMISSION row on the pair up to the cap, approve the referrer as an agent, settle again, assert NO further commission accrues. That control goes red if anyone later "tidies" the cap by filtering it. Put the reason in a comment at affiliate-service.ts:565 so the next reader does not re-derive the wrong conclusion.

2. DENORMALISED COLUMN — do not filter the writer at :222-226. Either (a) keep `AffiliateAgent.totalCommission` as the true all-programmes lifetime total and never RENDER it as the agent figure: compute the /profile/invite headline (:695) and the admin sub-ledger's per-agent number from the ledger filtered on `programme='AGENT'`; or (b) if a per-programme scalar is genuinely wanted, add a SECOND column (`agentCommissionTzs`) written alongside. Either way, extend affiliate-stress Invariant 6 (src/app/api/dev-test/affiliate-stress/route.ts:146-153) IN THE SAME COMMIT to assert both identities — total == all PAID rows, agent scalar == PAID rows with programme='AGENT'. That guard is the control that proves the change; today it is the thing that would silently go red.

3. THE ONE THAT NEEDS NO RE-ENABLEMENT — split `getAdminAffiliateStats` (:731-746). `activeAffiliates`, `commissionPaidTzs`, `totalPaidTzs` and the leaderboard must be per-programme, because /admin/affiliate is the GROWTH surface and from the first agent settlement those tiles report agent contract payouts as promo cost. Give the function a required `programme` parameter (the non-optional technique IS right here — these are service-level aggregates, the natural home for the discipline) and leave the DAL a plain row reader, as it is everywhere else in this repo. While in the function, fix `db.referralReward.list(1000)`: money KPIs must not be summed over a truncated population.

4. Also make :652-656 programme-aware — for an agent, a pre-approval player-promo PRIZE on an old recruit currently renders inside their agent "earned" column and drives the status chip.

5. Finally, resolve the contradiction that makes (b) reachable at all: AGENT-PROGRAMME.md §6 says the programme is decided by the referrer's role AT ACCRUAL, while the architecture summary says it is stamped AT BIND. Pick one in the authority doc before the build starts. If it is stamped at bind, a pair is programme-constant and items 1 and 4 shrink to nothing; if it is accrual-time, item 1's blind cap is load-bearing and must be commented as such.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the structure, not the reads. Four steps, in this order.

1. RESOLVE THE CONTRADICTION FIRST, in `docs/AGENT-PROGRAMME.md` §6. Stamp the programme ONCE at bind — `User.recruitProgramme` written beside `recruitedBy` in `bindRecruit` (`affiliate-service.ts:~300`) — and have accrual COPY it onto the reward row rather than deriving it from the referrer's current role. Replace the sentence at `AGENT-PROGRAMME.md:154-155` ("decided by the referrer's role at the moment of accrual") accordingly; as written it contradicts "stamped at bind" and is the thing that lets a pair span programmes. With the stamp at bind, a (referrer, recruit) pair is single-programme BY CONSTRUCTION: the cap sum (:567-570) and the per-recruit `earned` (:652-654) become correct with NO filter, and the cap-reset question in (c) never arises. "One referrer, one programme" stops being an assertion and becomes an invariant the schema holds.

Keep `referrerMayEarn` (role, `:367-370`) as the ELIGIBILITY gate and the stamped programme as the PRICING key. That is exactly this repo's "gate the offer, never the refusal" split — and it closes leak (d): a pair stamped PLAYER whose referrer is now an AGENT stops accruing, instead of being silently re-priced at agent rates on a book acquired as a player. If Ali wants pre-existing recruits to convert on approval, that must be an explicit, audited, one-shot re-stamp in `approveAgent` with a recorded decision — never an emergent consequence of reading `role` at accrual.

2. MAKE THE DENORMALISATION MEAN ONE THING. `AffiliateAgent.totalCommission` must be agent commission only. Preferred: stop writing it from player-programme accruals — guard `:223-225` on `programme === "AGENT"` — and in the same migration that adds the column, backfill existing `totalCommission` to 0 (every existing row is PLAYER by definition). Then `:695` and `:742` are right with no read-side filter at all. If you would rather derive it, derive it and drop the column's use as a total — but do not ship both a column and a sum answering "what did this agent earn". One source of truth for the rate, one for the total.

3. ONLY THEN add a read parameter, and make it a required DISCRIMINATED value `"AGENT" | "PLAYER" | "ALL"`, not a required single programme. Required so the compiler lists every call site (the finder is right about that); `"ALL"` present so `totalPaidTzs` (:739) and `house-ledger.ts` can state their intent explicitly rather than being forced into a wrong answer. Split `/admin/affiliate`'s `commissionPaidTzs` (:738) into agent and player figures — the framework's "sub-ledger" is two numbers, not one filtered view.

4. GUARD WITH A CONTROL THAT MUST GO RED. Seed one PLAYER PRIZE row and one AGENT COMMISSION row for the same referrer and the same recruit, then assert: the agent's `/profile/invite` headline and the `/admin/affiliate` leaderboard show ONLY the AGENT figure, and the cap sum sees only AGENT rows. Then DELETE the `programme` guard in `recordReward` and prove the assertion fails — a guard that passes with the real code removed is what this repo has already paid for twice. Add a red-anchor for the migration backfill line, and cover `scripts/` as well as `src/`, per the build prompt's own population rule.

---

### 🟡 `/profile/invite` will show an agent the player promo's copy, rate and pause state alongside their own

**Severity** medium · **Kind** visual · **unanimous** · ⭐ **FIX DISPUTED**

The agent's dashboard is the existing page, and its content is built entirely from the player config: `promises` is assembled from `cfg.commission` / `cfg.prize` / `cfg.bonus`, and the status chip reads `programEnabled: cfg.enabled`. So an approved agent sees "Get TZS 10,000 when a friend deposits & places their first bet" (the player prize, on by default) or "Earn 50% of your friends' fees for 24 months" (`cfg.commission.rate`), and the chip flips to "Paused" when a growth officer pauses the player promo. The build prompt says to extend the page with "their rate" but does not say to replace the source, so the page would state two different commission rates at once and describe a promo the agent is not in.

**Evidence** — src/lib/server/affiliate-service.ts:661-689 (promises from cfg), :697 (programEnabled: cfg.enabled); src/app/profile/invite/page.tsx:174 (Chip active/paused); docs/SESSION-PROMPT-AGENT-BUILD.md:105-106

**Proposed handling** — Branch `getPlayerReferralSummary` on the stamped programme: for an AGENT return promises and a status derived from the agent's own row (rate, active, approvedAt) and never from `cfg`. The visual guard must load the page as an AGENT with the player promo both enabled and disabled and assert the copy does not change — BONUS-WITHDRAWAL.md §7 records that no drive has ever loaded this page as an agent.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the money and the copy in ONE commit, from ONE resolver.

1. ENGINE FIRST (this is not cosmetic). Make the prize and bonus paths refuse an AGENT attribution: `onRecruitBet` (affiliate-service.ts:490-513, `payPrize` at :511) and `onRecruitDeposit` (:618) must return before `payPrize`/`payBonus` when the bind's `programme === "AGENT"`. Decision 3 is COMMISSION ONLY; today the shipped default (`prize.enabled: true, amountTzs: 10_000`, affiliate-config.ts:85) pays an agent TZS 10,000 per recruit.

2. BRANCH ON THE PREDICATE THE PAGE ALREADY RESOLVED, not on a stamp the referrer does not carry. page.tsx:129-130 already loads `viewer` and calls `inviteIsLiveFor(viewer.role)`. Pass that resolved role (or an `AgentView | PlayerView` discriminated result) into the read model rather than having it re-read the user — the shell-resolves-once, clients-receive convention in feature-state.ts's header.

3. ONE RATE SOURCE. The agent's promise line must be rendered from the SAME `rateFor(account, cfg)` the accrual uses (SESSION-PROMPT-AGENT-BUILD.md:81-88), never from `commissionPct` read separately. And because leak #3 turns the no-rate case into a refusal, the read model must surface that refusal — "commission rate not set, contact compliance" — never a rate and never a player promise. A page that promises a rate the engine will refuse is the same class of defect as the five player-view false money statements.

4. THE CHIP IS COUPLED TO LEAK #2 — fix them together or the page starts lying. Today `programEnabled: cfg.enabled` is accidentally truthful, because `cfg.enabled` also halts agent accrual (the `if (!cfg.enabled) return;` at affiliate-service.ts:546, :611 and in the settlement hook). The instant leak #2 is fixed so agents keep earning through a player-promo pause, the chip and the :221 banner become an active lie: "Paused" while commission is being paid. The agent's chip must read the agent account's own active/approved state.

5. NEW COPY GOES THROUGH `i18n-dict.ts`, en/sw/zh. Do not clone the `promises` shape: it carries only `en`/`sw` and page.tsx:210 renders `locale === "sw" ? p.sw : p.en`, so a zh viewer gets English. That is a pre-existing violation of the never-hardcode-user-facing-strings rule and the build prompt requires en/sw/zh for the agent surfaces.

6. THE GUARD NEEDS A CONTROL THAT GOES RED. Copy-invariance alone passes on a blank page. Assert all four:
   (a) as AGENT with `prize.enabled: true` — the TZS 10,000 line is ABSENT and the agent's own rate is PRESENT;
   (b) as PLAYER with `FEATURE_INVITE=ACTIVE` (feature-state.ts:78 supports the env override) — the TZS 10,000 line IS present, proving the branch discriminates rather than blanking everything;
   (c) RED CONTROL: mutate the agent's rate and assert the rendered line moves; delete the branch and assert the suite goes red;
   (d) LEDGER, not pixels: after driving a recruit's first bet under an AGENT bind, assert ZERO `ReferralReward` rows of type PRIZE exist for that referrer.

7. WATCH THE OTHER CALLER. `achievements.ts:48` also calls `getPlayerReferralSummary`, for `recruitCount` only. The branch must keep `recruitCount` populated for an AGENT and must not throw, or agent achievements silently zero out.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the PRICING layer first, then make the page read the same object — never author agent copy as a parallel string.

1. One resolver, used by payer and reader alike. Widen the build prompt's `rateFor(account, cfg)` into `resolveReferralPolicy(referrerUserId)` returning the whole programme, not just a number: `{ programme: "AGENT"|"PLAYER", active, rate, windowMonths, capPerRecruitTzs, capPerReferrer, prize: null|{...}, bonus: null|{...}, destination: "CASH"|"BONUS" }`. For AGENT it is built from the agent's own row (`approvedAt`, `commissionPct`, per-agent caps, `active`); for PLAYER from `cfg`. This is the platform's `ratesFor(market)` discipline and it subsumes leaks 2, 3 and 4 in one place: no hook reads `cfg.*` directly any more, so a growth officer's pause cannot reach an agent and a rate-less agent yields `null` (refuse) rather than 0.5.

2. Make `onRecruitBet` and `onRecruitDeposit` programme-aware in the SAME commit — `if (policy.prize == null) return;` — so an AGENT accrues commission only. This is what enforces AGENT-PROGRAMME.md's stated invariant; the build prompt currently applies `rateFor` to settlement alone and leaves the prize path global.

3. Only then change the read model. `getPlayerReferralSummary` must not gain a `programme === "AGENT"` string branch; it must render FROM `resolveReferralPolicy(userId)` for both programmes — the promise lines derived from `policy.rate`/`policy.windowMonths`, the prize line emitted iff `policy.prize != null`. Then copy cannot diverge from payment by construction, which a branch on strings does not give you.

4. The status chip and the paused banner (page.tsx:174, :221) must read `policy.active` — the SAME predicate the hooks early-return on. If the chip and the hooks read different things, an agent can be told "Active" while nothing accrues (that is leak 2 wearing a green chip); binding them to one value makes that state unrepresentable.

5. i18n, or the build widens an existing gap: `promises` carries only `en`/`sw` (affiliate-service.ts:639) and page.tsx:210 picks `locale === "sw" ? p.sw : p.en`, so a ZH agent gets English on their own money page. New agent copy goes in the dictionary across all three locales via `getServerT` (`test:i18n` parity), not as another inline en/sw pair.

6. The guard must be money-shaped, not copy-shaped, with a control that must go red. Drive the page as an approved AGENT and assert (a) exactly one rate appears and it equals the agent row's `commissionPct`, (b) no prize/bonus promise line renders, (c) toggling `cfg.enabled` and `cfg.prize.enabled` changes nothing on the page — AND (d) the ledger assertion: a recruit's qualifying first bet under an AGENT referrer writes a COMMISSION row and ZERO `type: "PRIZE"` rows. Red harness: delete the `policy.prize == null` return in `onRecruitBet` and require (d) to fail; change the agent's `commissionPct` and require the rendered rate to move. Without (d) the suite passes on a page that hides a live payment.

---

### 🟡 A switch flipped mid-settlement splits one market across two policies, and a dropped or HELD accrual is permanent

**Severity** medium · **Kind** scenario · ⭐ **FIX DISPUTED**

Settlement accruals run as a serial loop AFTER the market lock is released, one `onRecruitSettlement` call per settled position, each re-reading `getAffiliateConfig()` fresh. A config save landing between iterations pays recruits 1..k at the old policy and k+1..n at the new one — or not at all — inside a single market settlement, with nothing recording that the market was settled under two policies. The loop is explicitly best-effort: a throw is audited as `affiliate.settlement_accrual_error` and never retried. Combined with BONUS-WITHDRAWAL.md §7's recorded finding that a HELD reward is terminal and still consumes the per-recruit budget, any accrual that fails or is suppressed at the wrong moment is money the agent can never receive, with no queue and no release action.

**Evidence** — src/lib/server/market-service.ts:3736-3751; src/lib/server/affiliate-service.ts:496, :545-546, :611 (config read per call); docs/BONUS-WITHDRAWAL.md:179-197

**Proposed handling** — Snapshot the effective agent policy (rate, cap, window, destination) once per settlement and pass it into the loop, the way `PredictionMarket.feeSnapshot` already fixes the fee — this also gives `rateApplied` a defensible provenance. Add a replay path for `affiliate.settlement_accrual_error` and a HELD-release action on `/admin/agents`, since the agent programme is the first case where the lost money belongs to a contracted business partner.

**⭐ A verifier disagreed with that handling and proposed:**

DO NOT SNAPSHOT A POLICY OBJECT INTO THE LOOP — it is incoherent here and forks the resolver.

Why it is worse: the N entries in `pendingReferralAccruals` can belong to N DIFFERENT referrers with N different `commissionPct` values, so "the effective agent policy" is not one object per settlement. The fix therefore collapses to one of two bad shapes. Either market-service snapshots only the GLOBAL config — in which case the per-agent rate is still read fresh inside `onRecruitSettlement` and the split is not even closed — or market-service pre-resolves a policy per referrer before the loop, which makes `market-service.ts` a SECOND place that decides affiliate pricing. That directly contradicts the discipline the build prompt itself sets at `SESSION-PROMPT-AGENT-BUILD.md:79` ("One resolver — the discipline `ratesFor(market)` enforces for market fees") and the platform's one-source-of-truth-for-rates convention. A snapshot parameter threaded across the market→affiliate seam is exactly the kind of second rate authority that later drifts.

WHAT TO DO INSTEAD:

1. Remove the global config from the agent path rather than freezing it. Resolve rate AND cap AND window from the agent's own `AffiliateAgent` row through one `policyFor(account)` in `affiliate-service.ts` (extending the planned `rateFor`). This is already required to close leaks #2/#3/#4; done properly it means `onRecruitSettlement` reads no `cfg` at all for an AGENT referrer, and the mid-loop config race disappears as a by-product with no new parameter. The residual — an officer editing that one agent's `commissionPct` during that one market's loop — is honestly recorded by the `rateApplied` the plan already stamps.

2. Make `rateFor` REFUSE, not fall back (leak #3), and stamp the SOURCE alongside `rateApplied` (`AGENT_ROW` vs `PLAYER_CONFIG`) so a row can never be read back as the other programme's price. An approved agent with a null `commissionPct` must record nothing and audit, never earn the player rate.

3. For the dropped accrual, fix the FALSE COMMENT first, then decide. `market-service.ts:3743` claims replayability nothing implements. Either delete the sentence, or build the replay honestly — and note the build prompt already hands you the missing ingredient: "Commission passes no `sourceRef` today while bonus and prize both do; add one" (`SESSION-PROMPT-AGENT-BUILD.md:90-91`). A deterministic per-position `sourceRef` (e.g. `referral:commission:<marketId>:<positionId>`) is precisely what makes replaying an `affiliate.settlement_accrual_error` entry idempotent instead of double-paying. Add the sourceRef in this build; ship the replay surface only if the audit action is actually non-empty on production — a queue for an event that has never fired is unproven code on a money path.

4. Do NOT add a raw HELD-release button, and if one is ever added it belongs on `/admin/affiliate` where §7 put it and where the payout sub-ledger lives — not on `/admin/agents`, which the plan scopes to compliance (`SESSION-PROMPT-AGENT-BUILD.md:106-116`). Splitting one payout queue across a compliance surface and a growth surface is the worse problem. More seriously: rewards go HELD because `creditWallet` (affiliate-service.ts:185-197) was refused by the RG lockout. A release action that credits without re-running that check launders money past a responsible-gaming control on a licensed platform — the finding does not mention this, and `test:rg-cash-incentive` is in the build's own gate list. Any release must re-invoke `creditWallet` and stay HELD if it is still suppressed.

5. If anyone still wants the split covered, the cheap control is a red-provable guard, not an architecture change: a test that mutates `setAffiliateConfig` between loop iterations and asserts every emitted `ReferralReward` carries a `rateApplied` equal to the resolver input that produced it — and that must go RED when `rateApplied` is hardcoded.

**⭐ A verifier disagreed with that handling and proposed:**

The proposed fix is wrong in its first and second parts, and the second part is actively dangerous.

WHY NOT the per-settlement policy snapshot. (a) It is the wrong analogy: `feeSnapshot` is fixed at market CREATION because the player was quoted those terms when they staked — the agent's commission is a standing contract term with no per-market quote to honour. (b) Under the plan the rate lives on each agent's row, so "snapshot the policy once per settlement" means resolving every distinct referrer among N positions BEFORE the loop just to build the snapshot — more coupling, no gain over stamping `rateApplied` per row, which the plan already mandates (AGENT-PROGRAMME.md:133). (c) It forks the pricing read: `onRecruitSettlement` would take a rate from its caller instead of resolving it, putting agent commercial terms into `market-service.ts`, which violates "separate the policy" and the one-source-of-truth-for-rates convention. (d) It does not pay a single dropped accrual, which is the actual money loss.

WHY THE REPLAY PATH AS PROPOSED IS A DOUBLE-PAY BUTTON. Commission is the ONLY reward path with no idempotency key: `affiliate-service.ts:576` calls `creditWallet(referrerUserId, cut, "Referral commission")` with no `sourceRef`, while `payBonus` (:396) passes `referral:bonus:${recruitUserId}:${who}` and `payPrize` (:436) passes `referral:prize:${recruitUserId}`. Today only the per-recruit cap bounds a re-run, and if the cap is 0 (uncapped) nothing bounds it at all. Shipping a replay button before the key exists pays twice.

DO THIS INSTEAD — make the accrual an obligation, not a best-effort call:

1. Write the INTENT inside the settlement transaction. For each attributable position, insert a `ReferralReward` row with status `PENDING` (a schema default no code currently writes — §7 notes this) carrying `marketId`, `positionId`, `operatorFee`, `programme`, and `rateApplied` resolved at that instant. Commit it with `settledAt`. The post-lock loop then only DRAINS PENDING to PAID. This delivers the finder's provenance intent without teaching market-service the policy shape, and a crash leaves rows on the table instead of nothing.

2. UNIQUE on (`positionId`, `type='COMMISSION'`) is the idempotency key that makes any replay safe. Build this BEFORE any replay surface.

3. Drain from a sweeper, not a button. `reconcileMarketSchedules()` already runs every 5 minutes as the settlement backstop (documented at market-service.ts:3758-3770) — give it a second job: drain PENDING/HELD commission rows. Self-healing beats an officer noticing an audit line nobody reads.

4. Fix the cap to stop eating unpaid money. `affiliate-service.ts:567-570` must count `PAID` and `PENDING` but NOT `HELD` — otherwise §7's "a suppressed reward spends the milestone" defect is reproduced verbatim in a programme where the loser is a contracted business partner who paid TZS 100,000.

5. Officer surface: agree with the finder that AGENT-programme rows belong on `/admin/agents` (compliance owns agent money) and PLAYER rows stay on `/admin/affiliate` — this refines §7's note, which predates the split. But make it "retry the drain", never a manual credit field, so the cap and the ledger keep a single writer. Single-officer, per decision 9.

6. Correct the lie at market-service.ts:3742-3743 in the same commit. A comment asserting a recovery path that does not exist is why nobody built one.

7. The control that must go red: settle a market, kill the process before the drain runs, restart, run the drain, assert exactly one PAID row per position and the correct total. Then MUTATE — drop the `positionId` uniqueness and re-run; if it stays green it is measuring the config, not the gate, which is precisely how §5d's first version passed.

---

### 🟡 Config caches are per-process and hydrate with a shallow spread — a switch flip is not fleet-atomic, and any new nested field will hydrate as `undefined` on production

**Severity** medium · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`defineConfig` hydrates once per key per process and is never invalidated afterwards, so on a multi-instance deploy a rate or switch change is visible only to the instance that served the save until the others restart: two instances can pay agents under different policies simultaneously, and the audit row shows one change. Separately, hydration is `{ ...defaults, ...restored }` — a SHALLOW spread over a config whose `commission`/`bonus`/`prize` are nested objects. Where a persisted row exists, a newly added field inside one of those objects restores as `undefined` rather than as its default. This has already happened here: `cfg.prize.minBetAmountTzs ?? 0` and `cfg.prize.requireDeposit ?? true` are defensively coalesced at their read sites for exactly this reason. Any new nested field this build adds (an agent ceiling, a routing flag) inherits the trap.

**Evidence** — src/lib/server/define-config.ts:63-72 (hydrate once, no invalidation) and :69 (shallow spread); src/lib/server/affiliate-service.ts:670 and :504 (existing `??` coalescing as evidence of the prior occurrence)

**Proposed handling** — Put anything the agent programme depends on on the AGENT ROW, not in a nested config object — the row is read fresh per accrual and has none of these semantics. If a nested config field is unavoidable, supply a `migrate` for the key and coalesce at the read site, and state in RULES.md §2.10 that the ceiling is enforced against a value that may be absent.

**⭐ A verifier disagreed with that handling and proposed:**

The proposal is half right and half harmful.

Right: putting the agent's rate on the AGENT ROW. The plan already does this (SESSION-PROMPT-AGENT-BUILD.md:84-87, `account.commissionPct`), and the per-agent ceiling belongs there too — it is what leak #4 needs anyway.

Wrong, and worse than the disease:
1. "Coalesce at the read site" is the pattern that CAUSES the money leak. `?? 0` on a cap means uncapped; `?? 0` makes a missing setting indistinguishable from a deliberate one. That inverts "gate the offer, never the refusal" — a coalesced default silently PAYS.
2. "Supply a `migrate` for the key" is the wrong layer. `migrate` runs at define-config.ts:68, BEFORE the shallow spread at :69, and returns a Partial<T>; returning the persisted `prize` unchanged fixes nothing. To fix it there you would hand-write a deep merge inside every migrate, duplicating the deep merge that already exists at affiliate-config.ts:115-122.
3. "State in RULES.md §2.10 that the ceiling is enforced against a value that may be absent" documents a defect as law. RULES entries are supposed to name a control, not a caveat.

Do this instead:

(a) FIX THE FACTORY, one line. define-config.ts:69 → hydrate through the merge the module already supplies: `registry.set(key, merge({ ...defaults } as T, restored as unknown as U))`. Flat configs (bonus, proposals, payout-status) keep identical behaviour under the default shallow merge; affiliate regains the deep merge A9 removed. One change, four configs, zero read-site coalescing, and it restores what define-config.ts:10-11 already claims is true.

(b) MAKE ABSENCE REFUSE, NOT DEFAULT. Carry the agent's rate AND per-agent ceiling on `AffiliateAgent` (read fresh per accrual), and have the accrual REFUSE — return without paying, with an audit row naming the agent — when the row lacks either. Same discipline as leak #3: never fall back to a config value. Do not coalesce a cap.

(c) THE CONTROL THAT MUST GO RED. Add to scripts/config-persist.test.mts (which itself already carries the "a green suite asserting a code default cannot see a live setting" warning at :68-76): hydrate `affiliate.config` from a snapshot whose `prize`/`commission` object is missing one key and assert the default survives; plus an accrual case where the agent row has no ceiling and assert it pays ZERO, not uncapped. Both need `red:` variants — revert :69 to the bare spread, and delete the refusal — that MUST fail. Without the red pass this is another guard that cannot fail.

(d) DO NOT re-document the multi-instance caveat. It is already at docs/COMPLIANCE-DECISIONS.md:271-274 with production measured single-instance. If a rate change needs it, put one line in the agent runbook — "single instance, or restart after the flip" — pointing at that entry, and note that after (b) the per-agent rate is a DB row read per accrual, so it is fleet-atomic by construction and the caveat only ever applies to the residual global switches.

**⭐ A verifier disagreed with that handling and proposed:**

Drop the multi-instance half entirely (numReplicas=1 is a standing regulatory decision; if it ever changes, self-exclusion latches break long before a config cache does — that is where the work belongs, not here). Then, for the real half, follow the pattern RULES.md §2.3 already established rather than inventing a new one:

1. CEILING AS A CODE CONSTANT, NOT CONFIG. Put AGENT_COMMISSION_PCT_MAX and the TZS 100,000 fee in src/lib/payout.ts beside PLATFORM_MIN_STAKE / PLATFORM_MAX_STAKE, and validate BOTH the officer's rate door and the accrual against it — the §2.3 form, "so the platform cannot be configured out of its own rule": an officer may narrow, never widen. RULES.md §2.10's `The rule itself` row then names that constant and `Configured in` names the per-agent commissionPct column. No new nested config field is created, so the trap has nothing to bite.

2. RATE ON THE AGENT ROW, AND REFUSE WHEN ABSENT. Read commissionPct fresh per accrual; when programme === "AGENT" and commissionPct is null/0, RETURN and audit — never fall through to cfg.commission.rate. Same object as Leak 3's fix; make the refusal explicit rather than coalescing.

3. FIX THE SEAM, NOT THE SYMPTOM. define-config.ts:69 should hydrate through the key's own merge when one is supplied — `registry.set(key, merge(defaults as T, restored as U))`, falling back to the shallow spread otherwise. affiliate's mergeConfig already recursively defaults each nested mode via `{...base.prize, ...u.prize}`, so this one line repairs affiliate TODAY (including the live requireDeposit exposure at affiliate-service.ts:504), not merely whatever the agent build adds. If that is judged too broad to change under this build, the narrower move is a CONFIG_VERSION + migrate for "affiliate.config", mirroring market-config.ts:445/460/488-490.

4. A CONTROL THAT MUST GO RED. scripts/config-hydrate-red.mjs: persist an affiliate.config snapshot with prize.minBetAmountTzs and prize.requireDeposit DELETED (the real pre-field production shape), boot, assert getAffiliateConfig().prize.requireDeposit === true. Mutation: revert :69 to the shallow spread and the harness must FAIL. Without that control this is a fix nobody can prove — §2.3's incident survived a green suite for weeks.

5. BEFORE THE BUILD STARTS, READ THE LIVE ROW. Query SystemConfig["affiliate.config"] on production and check whether prize.requireDeposit and prize.minBetAmountTzs are actually present. §2.3's own lesson is "A code default is not a live setting." If they are absent, the §4.2b deposit requirement is off in production today and that is a separate, immediate finding rather than a build-plan risk.

---

### 🟡 `AffiliateAgent` already holds a row for every user who ever touched the referral surface, each defaulting to commissionPct 5.00 and active true

**Severity** medium · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`ensureAffiliateAccount` mints an `AffiliateAgent` row lazily for referrers, for recruits, and on every reward — so the table the agent registry is being built on is a per-user table, not an agent table, and every one of those rows already carries `commissionPct` 5.00 and `active` true from the schema defaults. The plan's resolver is safe only because of its `account.approvedAt &&` conjunct; drop that conjunct, or backfill `approvedAt`, and every player in the table becomes a 5% agent. The same shape affects the new surfaces: the `/admin/agents` roster, the sub-ledger and the leaderboard must all filter on `approvedAt IS NOT NULL` or they will enumerate ordinary players as agents (the existing leaderboard already lists every account with any recruits or earnings).

**Evidence** — prisma/schema.prisma:840-853 (commissionPct default 5.00, active default true, tier default STANDARD); src/lib/server/affiliate-service.ts:64-97, :305-309 (rows minted for referrer AND recruit), :741-746 (leaderboard over `db.affiliate.list()`); docs/SESSION-PROMPT-AGENT-BUILD.md:83-88

**Proposed handling** — Make `commissionPct` and `active` NULLABLE with no default in the migration, so a non-agent row cannot present as a priced agent, and let `approveAgent` be the only writer. Add a guard asserting that a freshly minted account for an ordinary player is refused by `rateFor`, with the control that an approved agent is accepted — a guard that only tests the agent cannot fail on this.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the fix with four parts. (1) SCHEMA: commissionPct becomes `Decimal? @db.Decimal(5,2)` with NO default (agreed), tier is dropped (already planned), and `active` becomes `Boolean @default(false)` — NOT nullable. Two-valued stays two-valued, and `approvedAt IS NOT NULL AND active` (in good standing) vs `approvedAt IS NOT NULL AND NOT active` (deactivated) vs `approvedAt IS NULL` (never an agent) is fully expressive without a third boolean state. There are no real agents yet, so default-false costs nothing. (2) ONE PREDICATE, NOT FOUR FILTERS. The real defect is that "is this row an agent?" has no single home, so four new surfaces must each remember `approvedAt IS NOT NULL`. Export one helper beside rateFor — `agentStandingFor(account): { isAgent: boolean; rateOrNull: number | null }` — and make rateFor, the /admin/agents roster, the sub-ledger, the /admin/affiliate rate column, the leaderboard filter at affiliate-service.ts:741-746 and the "Verified 50pick Agent" badge ALL read it. Same discipline as ratesFor(market) that the plan already cites. A filter repeated at six call sites is six chances to forget it; a helper is one. (3) MAKE "only the application service writes these" STRUCTURAL. Do not add commissionPct/active/approvedAt to the shared StoredAffiliateAccount patch that db.affiliate.update accepts — add a separate DAL method (db.affiliate.setAgentTerms) in BOTH backends, called only from agent-application-service. ensureAffiliateAccount then cannot price anyone even by accident. While there: approveAgent must UPSERT, because the applicant almost certainly already HAS a row carrying their old short player code, and approval must replace that code with 50PICK-AG-[ID] on the same row — a bare create will throw on the userId unique. (4) THE GUARD NEEDS A SCHEMA ASSERTION, or it measures the wrong population. The behavioural guard the finder proposes (freshly minted player account refused by rateFor; control: approved agent accepted; second control: approved agent with a NULL rate is REFUSED, not priced at the player rate — that is leak 3's control and it belongs in the same suite) runs on the in-memory DAL, which has no commissionPct field and would pass green with the 5.00 default still sitting in Postgres. So add a source-level assertion over prisma/schema.prisma and the new migration SQL that AffiliateAgent.commissionPct carries no DEFAULT and is nullable, and that active defaults false — with its red harness proving it goes red when the default is put back. Then, before the migration, count the existing AffiliateAgent rows on prod and state the number in the migration note: that count is how many rows are one dropped conjunct away from being 5% agents, and it should be written down rather than assumed small.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the mechanism.

1. MIGRATION — backfill, do not merely re-default. In ONE raw-SQL migration alongside the `DROP tier`:
   - `commissionPct` → nullable, DROP DEFAULT, then `UPDATE "AffiliateAgent" SET "commissionPct" = NULL;` (unconditionally — there are zero approved agents today, so every existing row is a non-agent by construction; assert `SELECT count(*) FROM "AffiliateAgent" WHERE "commissionPct" IS NOT NULL` = 0 after).
   - `active` stays NOT NULL boolean but its default flips to `false`, plus `UPDATE ... SET "active" = false;`. Nothing reads it today (toStoredAffiliate never maps it), so flipping it is free now and impossible later. A two-valued flag that defaults to the SAFE value beats a three-valued one that defaults to nothing.
   - `approvedAt` arrives NULL for every existing row, which is already correct — leave it.
   Record the backfill row count in the migration comment, re-derived at run time, not copied.

2. ONE PREDICATE, NOT FOUR FILTERS. `approvedAt IS NOT NULL AND active` must exist in exactly one place — a DAL method (`db.affiliate.listAgents()`) plus one exported `isApprovedAgent(account)` — and `/admin/agents`, the sub-ledger, the roster and the rate control all call it. bindRecruit's own comment (affiliate-service.ts:276-278) already states this law for its own predicate: "it must not grow a SECOND definition of 'may refer'". Three hand-written `where` clauses across three new surfaces is three chances to forget one, and the leaderboard at :744 is the existing proof that the forgotten one ships.

3. RESOLVE THE PROGRAMME, THEN PRICE IT. Do not let `rateFor` carry the whole load in a single conjunct. Resolve programme first (AGENT when the referrer is an approved active agent, else PLAYER), then price inside it: an AGENT with no `commissionPct` is REFUSED and audited, never silently repriced; a PLAYER takes `cfg.commission.rate`. This makes leak #3 and this finding one fix instead of two, and it means dropping any single conjunct changes which programme you are in — a visible break — rather than quietly changing the price.

4. THE GUARD MUST RUN WITH THE FEATURE FORCED ON. feature-state.ts:79-84 already ships the `FEATURE_INVITE` override for exactly this. The guard runs with `FEATURE_INVITE=ACTIVE` so `referrerMayEarn` stops masking, and asserts, in one file:
   - a legacy-shaped account (row minted by `ensureAffiliateAccount`, no `approvedAt`) prices at the PLAYER rate and does NOT appear in `db.affiliate.listAgents()`;
   - an approved agent prices at their own `commissionPct` and DOES appear — the control that must go red;
   - an approved agent with `commissionPct` NULL is REFUSED, not repriced;
   - `deactivateAgent` removes them from the roster and from pricing.
   Run it on BOTH backends, or set the memory backend's `create` to write the same `commissionPct: null, active: false` the migration leaves behind — otherwise the suite is measuring a population that does not exist in production.

---

## Compliance & regulatory — 12 confirmed

### 🔴 Agent commission is booked as BONUS_CREDIT, so the statutory regulator pack reports it as "bonus cost" for a programme we told the Board we withdrew

**Severity** critical · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

The plan reuses `creditWallet` → `creditInternal` for agent commission (SESSION-PROMPT §3 changes only the rate resolver; `affiliate-service.ts:576` calls `creditWallet(referrerUserId, cut, "Referral commission")` with no type). `creditInternal` defaults the transaction type: `const txnType = opts.type ?? "BONUS_CREDIT"` (wallet-service.ts:1810). `report-money.ts:142` then computes `bonusCost = Σ|BONUS_CREDIT (CONFIRMED)|` and `:147` computes `ngr = ggr − bonusCost − fees`. That NGR and that bonus line are printed in the GBT monthly regulator pack (`reports/catalogue.ts:108-124`), whose own explanatory footnote says "NGR = GGR − bonus cost − payment-processing fees (pre-tax operator bottom line)" (`:187`) and whose provenance line says the figures come from "the Transaction, User and KYC tables" (`:196`). So every shilling of agent commission arrives at the Gaming Board labelled as bonus-wallet cost — while `feature-state.ts:61-64` has `bonus: "WITHDRAWN"` and BONUS-WITHDRAWAL.md records the withdrawal to the Board as Jay's item #5. A Board reader reconciling the pack sees a growing bonus cost for a feature we said no longer exists. The arithmetic is right; the label is a false statement on a signed regulatory document. It also lands the same way on `/admin/transactions` and in the DSAR bundle a player exports.

**Evidence** — src/lib/server/wallet-service.ts:1810 `const txnType = opts.type ?? "BONUS_CREDIT";` · src/lib/server/report-money.ts:142,147 · src/lib/server/reports/catalogue.ts:187,196 · src/lib/server/affiliate-service.ts:576 · src/lib/feature-state.ts:61-64

**Proposed handling** — Add a distinct transaction type for agent commission (e.g. `AGENT_COMMISSION`) in the same migration as the schema work, pass it explicitly from the commission path, and split `report-money.ts` into `bonusCost` and `agentCommissionCost` with both subtracted in NGR and both printed as their own rows in the pack. ⛔ Do NOT enumerate "current" types anywhere that sums money — house-ledger.ts's header records why (retired types still carry historical shillings); read by account/label, and keep the retired-type behaviour. Guard: a red harness that flips the commission credit back to the default type and requires the pack builder to go red on the mislabelled line, plus a positive control proving a real bonus grant still counts as bonus cost.

**⭐ A verifier disagreed with that handling and proposed:**

Right direction, wrong scope, and one detail in it would create a regulator table that does not add up. Keep the new type; extend it.

1 · MAKE THE TYPE REQUIRED, DON'T JUST PASS ONE. The defect is not the missing argument at `affiliate-service.ts:576` — it is that `creditInternal` has a money-label DEFAULT (`wallet-service.ts:1810`). Add `AGENT_COMMISSION` to `TxnType` (`prisma/schema.prisma:115-126`), the `StoredTxn` union and BOTH DAL backends, then delete the `?? "BONUS_CREDIT"` and make `opts.type` REQUIRED. That turns `tsc` into the sweep across every existing caller (bonus fulfilment, proposal prize, referral bonus/prize at `:394`/`:440`, commission at `:576`) instead of fixing one call site and leaving the trap armed for the next one. Same file, same migration as §1.

2 · REPORT-MONEY: ADD, NEVER ENUMERATE-AND-REPLACE. `bonusCost` keeps meaning exactly `BONUS_CREDIT` (historical rows keep counting — house-ledger.ts:17-19's law); add `agentCommissionCost` for `AGENT_COMMISSION`; `ngr = ggr − bonusCost − agentCommissionCost − fees`. Update the note at `catalogue.ts:187` to name both terms and add its own row in "Aggregate financials".

3 · ⛔ THE DETAIL THE PROPOSAL MISSES AND THAT WOULD SHIP A NON-RECONCILING PACK: `report-money.ts:462,465` builds `dailyPnl` rows as `{stakes, payouts, ggr, bonus, fees, ngr, holdPct}`. If NGR silently absorbs commission and no column shows it, EVERY row of the daily table fails to add up on the regulator's own calculator — a worse artifact than the mislabel being fixed. Add the commission column to `DailyPnlRow`, its totals row, and the admin table that renders it.

4 · FIX THE OWNER'S BOOK IN THE SAME COMMIT, OR THE MONEY GOES MISSING INSTEAD OF MISLABELLED. Give commission its own ledger shape rather than riding `internalCreditEntries`: a new `LedgerEntryType AGENT_COMMISSION` debiting a new `HOUSE:AGENT_COMMISSION` expense account and crediting `PLAYER:{id}`. Then map it in `readHouseAccounts` (`house-ledger.ts:71-78` — a new account otherwise lands only in `all` and is never subtracted), add `agentCommission` to `HouseAccounts`/`Waterfall`, and make it its OWN labelled subtraction in `waterfall` (`house-book.ts:317`), beside `bonusCost`, never netted into GGR.
   ⚠️ Do NOT book it as a negative entry on `HOUSE:COMMISSION`, even though decision 5 prices it off the operator fee. `house-ledger.ts:220-221` computes `feeEarned` with `AND amount > 0`, so a negative would shrink the balance that `housePosition`/`gameBook` read while leaving `feeEarned` untouched — the two reads of one account would disagree with nothing going red. That is precisely the asymmetry `house-book.ts:284-299` already paid for once.

5 · THE SMALL SWEEP tsc WILL NOT DO FOR YOU. Exhaustive `Record<StoredTxn["type"], …>` maps go red on their own (`wallet/page.tsx:22-25` — decide deliberately whether an agent sees commission as "deposit" or a new kind; `status-badge.tsx:270-281` + the `MONEY.type*` copy key in en/sw/zh or `test:i18n` goes red). What tsc will NOT catch is the `as const` filter array at `admin/transactions/page.tsx:48` — omit the new type there and an officer cannot filter for the very rows this fix creates.

6 · CONTROLS, BOTH DIRECTIONS (the proposal's guard is right but half-length):
   · RED: restore the default type on the commission credit → the pack builder must fail on the mislabelled line AND the daily table's column-sum control must fail.
   · RED: delete the new `waterfall` subtraction → `netRetained` must fail against a fixture where an agent was paid.
   · POSITIVE CONTROL: a real bonus grant fulfilment still counts as bonus cost in both books, and a legacy `BONUS_CREDIT` row from before the migration still counts (proves nothing was enumerated away).

7 · DO IT NOW, NOT AFTER. `SESSION-PROMPT-AGENT-BUILD.md` records that there are no real agents and all current data is test data. So this costs one migration today; after the first monthly pack is generated it costs a backfill plus an amendment to a signed document that a Board reader has already reconciled.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the distinct type — that part is right — but make the change reach both books, close the enumeration sites, and sequence it safely.

1. ONE EXPORTED LIST, NOT FOUR LITERALS. Export `TXN_TYPES` from `src/lib/server/store.ts` beside the `StoredTxn["type"]` union and have `admin/transactions/page.tsx:48`, `api/admin/transactions/export/route.ts:38` and `status-badge.tsx:274`'s map derive from it, with a `satisfies Record<TxnType, string>` on the label map so the compiler — not a reviewer — catches the next type. Add `AGENT_COMMISSION` there in the same commit as the Prisma enum. This is a prerequisite, not a follow-up: without it the export CSV silently cannot filter the new rows.

2. BOOK IT ON THE LEDGER TOO, AS ITS OWN LABELLED STEP. Add `agentCommissionEntries()` in `ledger.ts` alongside `internalCreditEntries` — `HOUSE:AGENT_COMMISSION` (a new `acct` constant) debited, `PLAYER:<agent>` credited, `entryType: "AGENT_COMMISSION"` — and call it from the commission path instead of the generic internal credit. Then add `agentCommissionOut` to `WaterfallRead`/`readWaterfall()` (house-ledger.ts:183, 194-241) and to `waterfall()`/`netRetained` (house-book.ts:308-317) and a row on /admin/house beside the "Bonus cost" row at page.tsx:560. ⚠️ Copy the bonus-cost lesson at house-ledger.ts:227-236 exactly: sum NET, not `amount > 0`, so a clawback reversal (which §3 of the plan is adding) nets out instead of counting as cost forever. Without this the pack and the owner's book disagree on the same shilling.

3. MAKE NGR EXHAUSTIVE, NOT TWO NAMED FILTERS. In `report-money.ts:142`, don't just add a second `t.type === "AGENT_COMMISSION"` filter. Classify every CONFIRMED credit type into {game outcome, promotional cost, agent commission, officer adjustment} and carry an `unclassified` bucket; the report builder asserts `unclassified === 0` and goes red if a future type appears. That is the correct reading of the finder's own ⛔ against enumeration: a type added later must break the REPORT, never quietly vanish from the bottom line. `proposals-service.ts:579`'s prize is already sitting in the wrong bucket today and this is what surfaces it.

4. DEPLOY THE ENUM VALUE BEFORE THE WRITER. `ALTER TYPE … ADD VALUE` must land in its own migration on an earlier deploy than the code that writes it — railway.json's `overlapSeconds: 60` keeps the old image serving for a minute after `prisma migrate deploy` runs, and that image's client throws on decoding an unknown enum value. Two commits: migration first, writer second. State this in the build prompt's §1, which currently says "one migration".

5. THE PACK. Print both rows — "Bonus cost" and "Agent commission" — under the NGR line in `catalogue.ts`, update the :187 footnote to `NGR = GGR − bonus cost − agent commission − payment-processing fees`, and add one sentence that agent commission is paid out of the operator fee and does NOT reduce the levy base (report-money.ts:19-28 records that GGR, via `levySplit()` in payout.ts, is the base TRA/GBT are charged on). Without that sentence, adding a commission row to a signed statutory artifact invites a Board reader to treat it as a tax deduction. This is a change to the two-officer-signed document, so it belongs in the §7 docs commit, not slipped in with the code.

6. GUARDS — keep both the finder's, add two. (a) Their red harness: flip the commission credit back to the default type and require the pack builder to go red — good, keep it. (b) Their positive control: a real bonus grant still counts as bonus cost — keep it. (c) NEW: a reconcile-from-the-printed-rows check, asserting the pack's NGR equals GGR minus every printed cost row minus fees, which is what catches a row that was added to the page but not to the arithmetic. (d) NEW: delete the `agentCommissionOut` term from `readWaterfall` and require /admin/house to go red — house-ledger's own history (four live arithmetic errors found in one 2026-09-05 pass) is the reason a ledger term needs its own mutation control and cannot ride on the report's.

---

### 🔴 An agent is the one account class that can be paid millions and withdraw them while every deposit-keyed AML trigger is structurally blind

**Severity** critical · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Every AML surveillance signal this platform has is keyed on DEPOSIT rows. `kyc-risk.ts` factor 3 is `dep24.length >= 5` (rapid deposits, `:39-41`); factor 5 is `totalDeposits >= 5_000_000 && !sof` (`:49-53`); `/legal/aml` §2 publishes "Cumulative deposits in 30 days exceed TZS 5,000,000" as an EDD trigger (aml/page.tsx:46). `buildFiuSar` reports only `CASH_MOVEMENT = {DEPOSIT, WITHDRAWAL}` at or above the cutoff, plus explicit AML_REVIEW rows (`catalogue.ts:236-244`). An agent's money enters entirely as internal credits — no deposit ever — so their `totalDeposits` is 0, their deposit velocity is 0, and source-of-funds is never demanded no matter how much they are paid. The only control left is `dispatchWithdrawal`'s single-transaction hold at `AML_REVIEW_THRESHOLD_TZS = 1_000_000` (payments.ts:128,187), which is per withdrawal with no cumulative or velocity component anywhere. An agent paid TZS 8,000,000 in commission who withdraws 950,000 nine times triggers nothing, files no SAR, and has no source-of-funds record — the textbook structuring pattern, on the one account class the operator itself funds. Decision 6 (real withdrawable cash, no wagering requirement) is what makes this reachable in one hop. And the officer reviewing any hold that does fire sees the inflow typed `BONUS_CREDIT` (see finding 1) — the origin reads as promotional money, not as commission the operator owed a business partner.

**Evidence** — src/lib/server/kyc-risk.ts:39-41,49-53 · src/lib/server/payments.ts:128,187 · src/lib/server/reports/catalogue.ts:236-244 · src/app/legal/aml/page.tsx:44-48

**Proposed handling** — Two controls, both in the build: (a) add an agent-specific AML trigger keyed on CUMULATIVE COMMISSION PAID in a rolling window — the same cutoff constant the hold uses, never a second number (catalogue.ts:216-219 records why) — that demands a source-of-funds/business declaration and raises the risk band, so an agent cannot be paid past the threshold with an empty CDD file; and (b) make the AML review screen state the ORIGIN of the balance for a held payout — for an agent, "commission, N recruits, period" — because the officer's decision is only as good as what the inflow says it is. State the agent case explicitly in `/legal/aml` §2's trigger list, since that page is the AML policy the Board reads and it currently describes a deposit-only regime. Guard: a red harness that pays an agent past the cutoff in sub-threshold increments and requires the trigger to fire, with a control player whose identical sums arrive as deposits (which must already fire) so the test cannot pass on the wrong population.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the behaviour, not the account class. Three changes, none agent-specific.

1. ADD THE MISSING WITHDRAWAL-SIDE AGGREGATE (the actual defect). In `withdraw()` (`src/lib/server/wallet-service.ts:1368+`), alongside the existing per-transaction gate, compute rolling-30-day cumulative withdrawals and pass the result into the AML basis so `dispatchWithdrawal` HOLDS (status AML_REVIEW) rather than refuses when `cumulativeAfter >= SOF_ROLLING_30D_TZS` — the constant already exported at `:56` and already the published number. A hold, never a refusal: the money is theirs, an officer clears it. This closes 9×950,000 for agents AND for big winners in one control, and because `catalogue.ts:250` already reports every `status === "AML_REVIEW"` row regardless of type, the SAR gap closes for free with no change to the report builder. Requires a `sumWithdrawalsSince` on BOTH DAL backends, mirroring `sumDepositsSince` at `store.ts:904` and `prisma-dal.ts:1216` — do not compute it by pulling `listForUser` into memory (`kyc-risk.ts:27-29` records why). Compute it inside the existing `withLock('wallet:'+userId)` for the same reason the deposit sum is.

2. STOP TYPING COMMISSION AS BONUS_CREDIT. `creditInternal` already accepts `opts.type` (`wallet-service.ts:1772`) and only DEFAULTS to BONUS_CREDIT (`:1810`). The agent path must pass an explicit type (a new `COMMISSION` enum member, migrated in both DAL backends and the Prisma schema in the same commit; if that is too costly for this build, `ADJUSTMENT` plus a truthful description is the honest interim). ⛔ Do NOT then add it to `CASH_MOVEMENT` in `catalogue.ts:234` — a commission credit genuinely is an internal movement and adding it would misstate the operator's cash exposure to the FIU, which is exactly the defect that comment block records fixing. The type change is for officer legibility and for the agent sub-ledger, and it makes the finder's (b) unnecessary: the AML screen shows the truth because the row IS the truth, rather than because a second surface was taught to annotate a lie.

3. THE PUBLISHED POLICY: do not add an agent bullet. Widen the bullet that is already too narrow — `legal/aml/page.tsx:47` "Cumulative deposits in 30 days" becomes cumulative deposits OR withdrawals in 30 days, edited in en/sw/zh in the SAME commit (en is the binding text, `:22`). Note that `:49` already publishes "structuring" as a detected behavioural anomaly and NOTHING in the codebase implements it — for players either. Change 1 is what makes that existing published promise true; it is not a new commitment to the Board, it is the retirement of a false one.

GUARD (must be able to go red). Drive `withdraw()` nine times at 950,000 on (i) an AGENT whose balance arrived entirely through the commission path and (ii) a PLAYER whose identical balance arrived through BET_PAYOUT. BOTH must reach AML_REVIEW at the same cumulative point — the player arm is the population control, and it is the arm that proves the rule is keyed on behaviour rather than on role. Assert the resulting rows appear in `buildFiuSar` for the period. Prove it by MUTATION: delete the aggregation and both arms must go red; a suite that stays green with the sum removed is asserting its own doc comment.

**⭐ A verifier disagreed with that handling and proposed:**

Split it. One in-scope, verified, regulator-facing defect; one out-of-scope platform gap raised on its own terms.

IN SCOPE FOR THIS BUILD — fix the ORIGIN of the money in the DATA, not on a screen.

(a) Stop typing agent commission as bonus. `affiliate-service.ts:196` must pass an explicit `type` into `creditInternal` for AGENT-programme rewards. This is not cosmetic — `report-money.ts:142` is `conf.filter(t => t.type === "BONUS_CREDIT").reduce((s,t) => s + Math.abs(t.amount), 0)` as `bonusCost`, so every shilling of agent commission is currently summed into the BONUS-WALLET COST line of the GBT regulator pack while `PRODUCT_STATE.bonus = "WITHDRAWN"` — the pack would report promotional spend on a programme that does not exist. `wallet/page.tsx:24` also maps BONUS_CREDIT to "deposit", so the agent's own statement calls their commission a deposit. Add the enum member in BOTH DAL backends in the same commit (`store.ts` and `prisma-dal.ts`) — or, if a new `TxnType` member is too heavy for this build, pass `ADJUSTMENT_CREDIT` and record the programme on the row rather than leaving the default. Also check the SAR's own type filter (`catalogue.ts:236`): whatever type you choose, decide deliberately whether a large agent payout is CASH_MOVEMENT (it is not cash crossing the perimeter on the credit leg; the WITHDRAWAL leg already is).

(b) Render the origin from the ledger, not from a string. The AML hold screen should build "commission · N recruits · period" by reading ReferralReward for that user, so the officer's context is derived from the accrual rows and cannot drift from them.

(c) Collect the BUSINESS identity at APPLICATION time, in the 7-document dossier the officer already reviews — TIN / business registration / tax residency — stored where `kycRiskScore` and the AML screen can read it. That gates the OFFER (no dossier, no agent) and never the refusal (never blocks commission already earned). It is also the control the framework's own vetting implies, and it is the honest answer to "who is this business partner", which is the question the finding was reaching for and answered with the wrong instrument.

OUT OF SCOPE — raise as its own item against the platform, not against the agent build: there is no cumulative or velocity control on withdrawals for ANYONE. If it is built: role-blind, its own named constant sitting beside `SOF_ROLLING_30D_TZS` in `wallet-service.ts` (never a reuse of `AML_REVIEW_THRESHOLD_TZS`, whose meaning is per-transaction), and a red harness whose CONTROL is a winning player with the identical withdrawal pattern — if the agent fires and the winning player does not, the trigger is scoped wrong and the harness must go red on that.

DO NOT edit `/legal/aml` §2 in this build. The page is the AML policy the Board reads; publishing a trigger before the code enforces it converts a gap into a misrepresentation. Amend it in the commit that ships the control, after the harness has been proven to go red.

---

### 🟠 Referee national ID copies are third-party personal data with no lawful basis, no retention row, no erasure path, no DSAR route — and the erasure sweep is a hardcoded bucket list that will pass clean over them

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Documents 5 and 7 of AGENT-PROGRAMME §3 are the national identification documents of two people who never touched the platform, uploaded by a third party. Five separate controls fail on them:

(1) LAWFUL BASIS — `/legal/privacy` §3 lists performance of contract, legal obligation ("KYC under the Gaming Act, AML/CFT under POCA"), legitimate interest and consent-for-marketing. None reaches a referee: they have no contract with us, and no gaming/AML statute requires an operator to hold a referee's ID. §2 "What we collect" describes only the account holder's own identity. There is no recorded basis at all.

(2) NOTICE — PDPA 2022 requires notice to the data subject. Nothing notifies a referee that a licensed gambling operator holds their national ID.

(3) RETENTION — DATA-RETENTION.md is "the authority" and its §1 row for identity documents names `KycSubmission`, `KycDocument` and R2 `50pick-kyc` at 7 years from ACCOUNT CLOSURE. Referee documents have no account and no closure date, so they fall under no row of a schedule the file's own header says every other statement must agree with — the exact F-01 defect (publishing a schedule no code enforces) reopened on a new class. Worse: routing them through `putKycDocument` puts them in the bucket the schedule says holds KYC documents, so an auditor reading the schedule against the bucket is told something false.

(4) ERASURE — `anonymizeClosedAccount` names the tables it writes (erasure.ts:65-74 imports, §1-§6). `AgentApplication`/`AgentApplicationDocument` are not among them, and `deleteKycDocument` is driven only from `KycSubmission.documents`/`extraRequests`. An applicant who is rejected, closes their account and invokes erasure leaves their CV, their Serikali ya Mtaa letter (a residential address) and two other people's national IDs standing.

(5) THE GUARD CANNOT SEE IT — `scripts/erasure.test.mts` §8 is the sweep the repo trusts over checklists, and its `buckets` object is a HARDCODED enumeration of eleven stores (`:522-533`). A new store is simply absent, `MUST_HAVE_CONTENT` does not name it, and 8.0/8.0b/8.0c all pass. The sweep reports clean while the data survives — "a guard that chooses its own population cannot fail".

(6) NO DSAR ROUTE — `fileDsarRequest({ userId, … })` (privacy.ts:74) is keyed on a User row; the player door needs an authenticated session and the officer door files on a player's behalf. A referee is not a user, so neither door can even record their request, and both refuse ACCESS by design. The statutory clock runs from the ask and the ask is unrecordable — E-33 exactly, on a new population.

**Evidence** — docs/AGENT-PROGRAMME.md:61-69 · src/app/legal/privacy/page.tsx:36-57 (§2, §3) · docs/DATA-RETENTION.md:24 · src/lib/server/erasure.ts:215-322 · scripts/erasure.test.mts:522-533 · src/lib/server/privacy.ts:74

**Proposed handling** — Before any upload slot is built: (a) record the basis and MINIMISE — the referee ID exists only to let an officer authenticate the referee at review, which is not a CDD record of OUR customer, so POCA's 7 years does not attach; hold it to decision + a short stated period and destroy it on decision, which is both lawful and cheaper than any of the alternatives. (b) Add an explicit referee-consent declaration signed by the referee in the letter template, and a plain-language notice naming 50pick as controller and giving a contact route for a non-account data subject. (c) Add a DATA-RETENTION.md §1 row for agent-application documents in the same commit, and a `/legal/privacy` section for data subjects who are not account holders. (d) Extend `anonymizeClosedAccount` to the two new tables and their R2 objects, and — the load-bearing half — make erasure.test.mts §8's bucket list fail closed: assert the bucket set covers every store the DAL exposes, with a control that adds a new store and requires §8 to go RED. (e) Give the officer door in `/admin/privacy` a path to record a request from a named non-user.

**⭐ A verifier disagreed with that handling and proposed:**

Keep (a), (b) and (c) in substance; replace (d) and (e); and add two platform-specific constraints the proposal omits.

DECIDE BEFORE THE MIGRATION, NOT AFTER. The build prompt's §1 is "full shape, one migration". Whether a referee ID gets a long-lived row at all is a schema question, so this lands in §1, not as a follow-up.

(a) MINIMISE — keep, but split the class. The framework mandates collecting the referee ID copies, so we collect them; it says nothing about how long we hold them, so retention is ours. Hold the referee LETTERS (addressed to us, the substantive vetting evidence, and the applicant's own relationship record) on the application's normal schedule; DESTROY THE TWO REFEREE ID IMAGES ON DECISION (approve or reject), via the existing deleteKycDocument, and replace them with an officer attestation written to the audit chain at review ("referee 1 ID sighted, name matched the letter"). That preserves the auditability the images exist for — which straight "destroy on decision" silently gives up, and a compliance officer will be asked for it — while removing the third-party class from every downstream problem. It is also the only version that makes (c), (d) and the DSAR question shrink rather than grow.

(c) — add the enforcement discipline the proposal skips. DATA-RETENTION.md §1 is F-01's own artefact: a row's Enforcement column must say what is TRUE. If destroy-on-decision is code, mark the row ✅ Code and name the guard; if it is a manual officer step, mark it 📋 Policy and say so. Publishing "destroyed on decision" as a control while nothing enforces it reopens F-01 on this exact class. And /legal/privacy is en/sw/zh with test:i18n asserting parity — the new non-account-data-subject section must land in all three locales in the same commit, or the build goes red for the right reason on the wrong line.

(d) — REWRITE BOTH HALVES.
  · The needle half, which the proposal misses entirely and which is decisive: erasure.test.mts §8's NEEDLES are the erasure SUBJECT's own identifiers (phone, display name, email, NIDA). A referee's ID number is never a needle because the referee is not the subject. So extending the bucket list alone produces a green sweep over precisely the class this finding is about — the finding's own thesis, applied to its own fix. Seed the §8 fixture with an agent application carrying a referee ID number and a referee name, add both as NEEDLES, and require them absent from every bucket. Prove it by planting one (the 8.0c pattern) and watching §8 go red.
  · The coverage half — "assert the bucket set covers every store the DAL exposes" is wrong as literally written. `db` in store.ts exposes proposal, objection, proposalVote, event, bonusGrant, inviteCampaign, inviteEntry, affiliate, referralReward, responsible and more beyond the eleven swept. That assertion is red on day one and forces a broad exemption list — the build prompt's own trap table (:186) names "a stale exemption is how a coverage rule stops covering". Correct shape: enumerate Object.keys(db) AT RUNTIME and require every key to be either SWEPT or EXEMPT-with-a-named-reason, plus a control asserting the exemption list holds nothing stale (every exempt key still exists on db). Then a new store is a BUILD FAILURE with a one-line decision to make, not a silent omission. Red harness: add a store to db and require §8 to fail.
  · And extend anonymizeClosedAccount to AgentApplication / AgentApplicationDocument and their R2 objects, using the existing "the row only goes if the bytes went" discipline (erasure.ts:272-298) — a failed object keeps its row so a re-run finishes. The applicant's own CV and Serikali ya Mtaa letter (a residential address) are their data and must clear on erasure regardless of the referee question.

(e) — DO NOT DO THIS. fulfillDsarRequest's ERASURE branch calls anonymizeClosedAccount(r.userId), which hard-refuses anything not status === "CLOSED" and is built end to end around a User row. A non-user arm means either a synthetic User row for a referee — putting a non-player into db.user.list(), into RBAC surfaces and into every query that counts users — or a nullable userId that forks DsarRequest and leaves the fulfil path undefined for the new shape. Both are worse than the disease, and both recreate exactly what asRequestableType was narrowed to prevent: DATA-RETENTION.md §2b-i's stated reason for refusing ACCESS/PORTABILITY is that "a queue of already-answered requests is how a real one gets missed". An entry class no code can fulfil is that, with the clock running.
  Instead: with (a) done, the only residual referee data is their name inside a letter. Serve that with a named contact route in the new /legal/privacy non-account-data-subject section (the DPO address already published at §1) plus a documented manual compliance procedure in DATA-RETENTION.md. Add a register shape only if and when a fulfil routine exists that can act on it — same rule the platform already applied to erasure itself: the branch REFUSED until there was a routine, because a status flip with every column intact is the worst kind of green.

**⭐ A verifier disagreed with that handling and proposed:**

Keep (b) and (c); replace (a), (d) and (e). Order matters — 0 first, because it may delete the whole class.

**0 · Ask Ali whether the referee ID image is needed at all.** §9 of AGENT-PROGRAMME.md is already the mechanism for correcting the framework where it is wrong about this system, and this is a candidate: the ID copy exists only so an officer can satisfy themselves the referee is real. A recorded officer call-back to the number on the referee letter, captured as an attestation, achieves that without a third party's national ID ever entering the platform. That removes the lawful-basis, notice, retention, erasure and DSAR problems in one line instead of five builds. This is a decision for Ali, not for the builder — put it to him before any upload slot is designed. Everything below applies only if he keeps the images.

**1 · Attestation BEFORE destruction, or destruction repeals the control.** At review, `reviewApplication` writes a durable referee attestation — referee name, document type, an HMAC fingerprint of the ID number via the existing `identityFingerprint` (`erasure.ts` imports it from `./crypto`), verifying officer, timestamp — into the audit chain and onto `AgentApplication`. That is the record that proves vetting occurred and that survives the image. Then, and only then, hold the image to decision + a stated short window (30 days, so a re-review or a complaint is still answerable) and destroy it. Same pattern the platform already chose for the national ID: keep the derived value, destroy the raw one.

**2 · A separate key namespace, in the same commit as the first upload slot.** Add an `agent/` prefix to `storage.ts` (a sibling of `putKycDocument`, or a prefix argument — the seam stays single, only the namespace splits) so that a per-class deletion policy is expressible at all, and so an auditor listing `kyc/` sees only customer CDD. The destroy job must iterate `AgentApplicationDocument.storageKey` **rows**, never a bucket listing, and must refuse any key not under `agent/`. Red harness: plant a `kyc/` key on an application row and require the job to refuse it and go RED if it deletes.

**3 · Close the sweep's population properly, and fix what it already misses.** Do not assert "buckets ⊇ every DAL store" bare — it is false today by eight stores and would be silenced. Write it the way §8's `ALLOWED` map is already written (`erasure.test.mts:515-518`): a `NOT_SWEPT: Record<storeName, reason>` map, and assert `Object.keys(db)` ⊆ `Object.keys(buckets) ∪ Object.keys(NOT_SWEPT)`. Adding a store then forces a sentence naming why it holds no personal data — silence fails the build. Two things must ride along or the guard is decoration: (i) add a **referee needle** to `NEEDLES` and seed a referee ID + name in the fixture, since the current six needles are the subject's own identifiers and would sweep clean over a referee's; (ii) fix the leak this exposes — `db.inviteEntry.contactValue` (`store.ts:203`) is a third party's raw phone/email that erasure never touches and the sweep never reads. Control: add a throwaway store to `db` and require §8 to go RED before it is named.

**4 · Erasure of the applicant's own file** — extend `anonymizeClosedAccount` to `AgentApplication`/`AgentApplicationDocument` and their R2 objects, on the same failed-object-keeps-its-row discipline as `erasure.ts:289-305`. Note this is only a backstop for the CV and the Serikali ya Mtaa letter: it is reachable only when the *applicant* closes their account, never by a referee, which is why step 1 carries the weight.

**5 · Instead of a non-user DSAR route: an application-scoped officer action.** Add "referee objection recorded" to the officer workstation — it destroys that application's referee documents immediately, keeps the attestation, and audits under the existing COMPLIANCE category. `DsarRequest` is not touched, so `privacy.ts:123` keeps its User-keyed invariant. The public contact route is the DPO address already published at `/legal/privacy` §1 (`page.tsx:81-84`), which is a real and sufficient answer for a non-account data subject; add the referee-facing notice and controller identity to the corrected framework document and the referee-letter template (both already in scope at SESSION-PROMPT-AGENT-BUILD.md:124-131).

**6 · The DATA-RETENTION.md row must state Enforcement honestly.** Add the agent-application row in the same commit as the first upload slot, and mark it ✅ **Code** only once the step-2 destroy job exists and `test:erasure` §10 checks the constant against the published period the way it already does for `KYC_DOCUMENT_HOLD_YEARS` (`erasure.test.mts:594-599`). A 📋 Policy row here would reproduce F-01 — publishing a schedule no code enforces — on a brand-new class, which is the exact defect DATA-RETENTION.md was written to close.

---

### 🟠 The TZS 100,000 fee posts no LedgerEntry, so money taken from the public is invisible to the house book, the trial balance, the regulator pack and every tax figure — and nothing in the repo handles VAT on it

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Decision 2 keeps the fee out of the PLAYER ledger, and that is right. But the plan then puts it in no book at all. `/admin/house` reads exclusively from `LedgerEntry`, by `HOUSE:%` account (house-ledger.ts:1-21) — a fee that posts nothing has no account and no trial-balance line. The GBT monthly pack sources from "the Transaction, User and KYC tables" (catalogue.ts:196) — a fee with no Transaction row appears in no pack. Every other shilling this operator receives from a member of the public is double-entry booked; this one is a `feeReference` string plus an image, attested by one officer.

For an auditor to trace one payment end to end today there is: a typed reference, an uploaded receipt, `feeReconciledAt`/`feeReconciledById`. There is no fee register, no period total, no export, and no reconciliation instrument against the Digital Selcom Bank statement — the platform has no read of that account at all (AGENT-PROGRAMME §9 already concedes the webhook match "does not exist and is not a small build"). The chain-purge lesson applies directly (DATA-RETENTION §7.2): "the books balance" only says every entry has a counterpart, never that every account means something — and here there is no entry at all.

Tax: `grep -rn "VAT|value added" src/` returns nothing. `payout.ts` `levySplit` handles TRA 10% + GBT 5% on the gaming FEE only (RULES.md:113-114). A non-refundable registration fee for a business service is not gaming revenue — it is a supply of services with its own TRA treatment, and it is also the one line where the refund-on-rejection ruling (decision 7) creates a credit note. Nothing in the repo, RULES.md or the plan says a word about it.

**Evidence** — src/lib/server/house-ledger.ts:1-21 · src/lib/server/reports/catalogue.ts:196 · docs/AGENT-PROGRAMME.md:89-93,200 · docs/RULES.md:113-114 · docs/DATA-RETENTION.md §7.2

**Proposed handling** — Keep the fee out of every player wallet, and put it in the operator's own book: post a house-only double-entry pair (`HOUSE:AGENT_FEE` against a bank-clearing account) at reconciliation and reverse it at refund. That satisfies both halves — no player ledger involvement, and one traceable, reconcilable, trial-balanced record per payment with the receipt and the officer's id attached. ⛔ Confirm against `test:money-invariants` and `ops:pool-orphans` before committing to it, since a new account class must not break the nightly trial balance. At minimum, if Ali rules against a ledger entry: build an exportable fee register with a period bound, a monthly total, and a reconciliation view an officer signs against the Selcom statement — and say so explicitly in a RULES.md §2.10 line and a COMPLIANCE-DECISIONS entry. Put the tax question to Ali as a named open item (is the fee VATable, and who issues the receipt) rather than shipping silence: a fee we cannot state a tax treatment for is a fee we should not take.

**⭐ A verifier disagreed with that handling and proposed:**

Keep decision 2 exactly as written — no `LedgerEntry`, because that table is a custodial gaming book whose entries are machine-observed and whose readers sweep by account prefix — and close the real gap where it belongs:

1. A REGISTER IN THE EXISTING CATALOGUE, not a new instrument. `src/lib/server/reports/catalogue.ts:1-10` states "adding a new report is a one-file change", and `REPORT_CATALOGUE` (catalogue.ts:1043-1052) already renders to XLSX and PDF through the API route. Add `"agent-fee-register": { name: "Agent registration-fee register", build: buildAgentFeeRegister }`, built from `AgentApplication` over `packPeriodBounds` (the same window `buildGbtMonthly` uses): one row per fee — applicant, `feeReference`, amount, receipt document id, `feeReconciledAt`, reconciling officer, `feeRefundedAt` + `feeRefundReference` — with `totals` (gross received, refunded, net for the period) and the standard `regulatorSignatures()` attestation block (catalogue.ts:35-43), so the officer signs the period against the Digital Selcom Bank statement. That delivers the end-to-end trace, the period total, the export and the reconciliation instrument in one file, without touching money code. Copy `buildGbtMonthly`'s provenance discipline: the note must say it reads `AgentApplication` and is officer-attested, never "reconciled against the bank".

2. A CONTROL THAT CAN GO RED. Add an officer-entered statement total per period on the register and assert `Σ reconciled − Σ refunded == statement total`, rendered as a variance the way `/admin/house`'s `reconcile` renders one — a variance shown, never an epsilon that hides it. Plus a red harness: duplicate `feeReference` refuses (the unique index gives it), approve-without-`feeReconciledAt` refuses, refund-without-`feeRefundReference` refuses. A guard that has never failed is a hypothesis (AGENT-PROGRAMME §10).

3. RULES.md §2.10 — which the build prompt already opens — must state the exclusion as a DECISION, not leave it as silence: "the TZS 100,000 is a business registration fee, not gaming revenue; it is excluded from GGR/NGR, from the TRA 10% / GBT 5% base (§2.2), and from the GBT monthly pack, and is recorded in the agent fee register." An exclusion nobody wrote down is read later as a defect.

4. TAX — put it to Ali as a named COMPLIANCE-DECISIONS item, framed correctly: the bank statement for 0769777877 is the primary accounting record and the company's accountant files the return, so this is NOT a code obligation. What the repo owes is the decision recorded: is TZS 100,000 VAT-INCLUSIVE or exclusive, and who issues the TRA fiscal receipt for a supply of services (an operations obligation). Ship the register regardless — that answer changes a sentence in §2.10, not the build.

5. ⛔ IF Ali rules he wants it in a book anyway: a separate operator-receipts table with its own read, never `LedgerEntry`. If he insists on `LedgerEntry`, then all three of these are mandatory in the same commit or the solvency line silently lies: the counterpart must NOT be an `EXTERNAL:%` account (house-ledger.ts:124-126 sweeps it into `railBacked`); `housePosition` gains an explicit non-gaming-receipts term with a `test:house-book` case AND a `red:house-book` mutation; and `BookSource` gains an `"attested"` provenance so an officer-attested figure can never render under a ledger or rail heading.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the fee out of `LedgerEntry` and make that a RULE with a control, then build the register the plan is missing, then put the tax question to Ali.

1 · State the refusal and guard it. `RULES.md` §2.10 (already the plan's only legal home for the 100,000) gets a line in the full `Decided / Enforced in / Configured in / Stated to / Guarded by` form: *the registration fee is non-gaming corporate income, not custodial player money; it posts no `LedgerEntry` and no `Transaction`; it is excluded from GGR/NGR by design.* Then make it a control that can go red — in the new `agent-application-security` suite, assert that no agent-application path (`recordFeePayment`, `reviewApplication`, `approveAgent`, `refundFee`) creates a `LedgerEntry` or `Transaction` row, with the red harness being a mutated copy of `recordFeePayment` that posts one. Today the refusal is a sentence in a doc; this makes it a gate. Mirror it in COMPLIANCE-DECISIONS.md.

2 · Make `AgentApplication` the register, with the three instruments it lacks. Add `/admin/agents/fees` (compliance domain, `ROUTE_DOMAINS`, i18n-exempt like the rest of the console): (i) period-bounded rows — reconciled / awaiting reconciliation / refunded, each with reference, amount, applicant, officer id and timestamps; (ii) a **monthly total** and a **CSV export** the officer signs against the Digital Selcom Bank statement — this is the reconciliation instrument AGENT-PROGRAMME §9 admits the webhook cannot be; (iii) an **ageing view** so a 100,000 unmatched for N days is visible rather than resting in one application's detail page. Reuse the `/admin/finance` period-bound pattern; do not invent a new one.

3 · Stamp the amount, never derive it. `feeAmountTzs` is already a column (SESSION-PROMPT:52) — write it at `recordFeePayment` from the resolved RULES §2.10 value and read it back on every surface. Rendering the register against today's config would silently restate every historical receipt when the fee changes: the same law as `PredictionMarket.feeSnapshot` and the plan's own `rateApplied`.

4 · Refund is a reversing row, not a mutation. `feeRefundedAt` / `feeRefundReference` must never blank `feeReconciledAt` / `feeReconciledById`. The register then shows 100,000 in and 100,000 out with both officer ids and both references — a traceable credit note without pretending to be a double entry.

5 · The tax question goes to Ali as a NAMED OPEN ITEM in COMPLIANCE-DECISIONS.md, not into code: (a) is the TZS 100,000 VATable (Tanzania standard rate; gaming supplies sit outside VAT, and this is the platform's first non-gaming revenue line), and (b) who issues the receipt / EFD fiscal receipt to the applicant. ⛔ Do not invent a treatment in code. But do not ship silence either: if the answer is VAT-inclusive, the amount on the public `/agent` page and in RULES §2.10 must say so — a content change, not a ledger one.

6 · ⛔ Do not touch `levySplit`. TRA 10% / GBT 5% are levied on gaming commission only (RULES §2.2); routing a registration fee near that path would tax non-gaming income as gaming income and misstate the GBT pack in the opposite direction.

If Ali later wants the fee in a general ledger, that is a separate corporate-books build with its own cash account — it must not be grafted onto the custody ledger whose trial balance protects player money.

---

### 🟠 A refund on rejection has no evidence and no deadline — money in requires a receipt image, money out requires one officer typing a string

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

The inbound leg is evidenced: a receipt upload plus a typed reference plus `feeReconciledAt`/`feeReconciledById` (AGENT-PROGRAMME §4, SESSION-PROMPT §1). The outbound leg is `feeRefundedAt` + `feeRefundReference` — a timestamp and a free string, written by the same single officer who may also reject the application (decision 9, no two-officer lock). Nothing uploads proof of the outbound transfer, nothing reconciles it against the bank, and there is no SLA: AGENT-PROGRAMME §4 says "paid out of band the same way it came in" and stops. So the platform's own record of a refund is strictly weaker than its record of the receipt, on the leg where the operator owes money to a member of the public it has just refused.

This is the asymmetry that produces the complaint nobody can answer: a rejected applicant says they were never paid, the console says `feeRefundedAt` with a reference, and there is no artefact behind it. It also gives one officer, alone, the ability to close a refused application as refunded. Compare what this repo already demands elsewhere for a fraction of the exposure — an AML release needs a ≥5-character typed reason and a second officer at TZS 1,000,000, and the chain purge needs a two-officer gate for deleting price history.

**Evidence** — docs/AGENT-PROGRAMME.md:85-101 · docs/SESSION-PROMPT-AGENT-BUILD.md:52-53 · docs/COMPLIANCE-DECISIONS.md (single-officer ruling) · src/lib/server/payments.ts:187

**Proposed handling** — Make the two legs symmetric: a refund requires a proof-of-transfer upload through the same storage seam, the reference, and a categorised reason, and it writes its own COMPLIANCE audit row naming the officer and the amount. State a refund SLA in the agent terms and on `/agent/status` ("refunded within N business days of rejection"), and show the applicant the refund state on their own timeline rather than only in the console — a refund the payee cannot see is not evidence to them. Keep single-officer per decision 9, but add a standing reconciliation view (all rejected applications where `feeRefundedAt IS NULL`, aged) so an unpaid refund surfaces on its own rather than waiting for a complaint. ⛔ Do not let the officer who rejected also be invisible: the audit row must carry both acts.

**⭐ A verifier disagreed with that handling and proposed:**

Make the refund an OBLIGATION with a queue, not a field with a button. Drop the proof upload.

1. Atomic obligation. `reviewApplication(REJECT)` creates the refund obligation in the SAME transaction as the rejection — set `feeRefundDueAt` (rejection time + the SLA) alongside the status. A rejection can then never exist without a pending refund. `refundFee` becomes the act of CLOSING an obligation, not an optional extra write. Guard: attempting to reject a fee-reconciled application without an obligation row is impossible by construction; the control that must go red is deleting the `feeRefundDueAt` write and watching the guard fail.

2. The queue is the control. `/admin/agents` gets a standing "Refunds due" tab: every application where `status = REJECTED AND feeReconciledAt IS NOT NULL AND feeRefundedAt IS NULL`, oldest first, aged in days, overdue ones flagged — with the count in the nav badge. This is the existing platform pattern, copied from src/app/admin/privacy/page.tsx:63 ("N pending · 30d SLA"). An unpaid refund then surfaces itself instead of waiting for a complaint. RED-prove it: seed a rejected-unrefunded application, confirm it lists; delete the filter clause, confirm the guard fails.

3. The payee is the second officer, and this is stronger than any image. `/agent/status` shows REFUND PENDING (with the due date) → REFUNDED (with the reference and date), in en/sw/zh. The rejection email states the amount and the SLA — this is the one thing that should change about the no-CTA rejection mail, and it is a statement, not a call to action. Register `agent.fee_refunded` in `comms-registry.ts` or test:cert-c1/c3 go red. A refund the payee can see, date and dispute is real evidence to the person who is owed; an image only staff can open is not.

4. Audit, not a mutable column, carries the accountability. `refundFee` writes one COMPLIANCE audit row: amount, reference, application id, the REJECTING officer id and the REFUNDING officer id (both acts, as the finding rightly asks). The audit chain is immutable and hash-chained here; `feeRefundedAt` is an ordinary column an officer can overwrite. Also block self-refund with a SECURITY audit, exactly as `kyc-service.ts:721` blocks self-review.

5. If Ali wants an attestation, attest against the source of truth, not a picture of it. Add `feeRefundReconciledAt` / `feeRefundReconciledById` — an officer confirms the outbound line appears on the Selcom statement, the mirror image of the inbound `feeReconciledAt` pair. Same shape, no new document type, no PDF in the KYC magic-byte allowlist, and it reconciles against the bank rather than against a screenshot.

6. The SLA number lives in RULES.md §2.10 with the TZS 100,000 and the commission ceiling, in the full Decided / Enforced in / Configured in / Stated to / Guarded by form, and nowhere else — including the corrected framework document per AGENT-PROGRAMME.md §9, since that is what an applicant reads before paying.

Keep single-officer throughout (decision 9). No second-officer lock on a 100,000 refund — the AML threshold is 1,000,000, and the queue plus the payee's own visibility are the controls that scale here.

**⭐ A verifier disagreed with that handling and proposed:**

Keep three things from the proposal — applicant-visible refund state, the aged unpaid-refund queue, and single-officer. Replace the evidence half.

**1 · Fix the schema asymmetry first (one migration, §1).** Add `feeRefundedById` — the outbound leg must name its officer exactly as `feeReconciledById` names the inbound one. Add `feeRefundDestination` (the account/msisdn the money actually went to) and `feeRefundAmountTzs`.

**2 · Enforce "in full" instead of trusting it.** Decision 7 says refunded in full, so `refundFee` REFUSES any amount ≠ `feeAmountTzs`. A policy the service enforces beats a policy an officer remembers, and it needs no new number anywhere.

**3 · Refund to source, bound at reconciliation.** When the officer reconciles the inbound fee against the Selcom statement they are already reading the payer's account — capture it then, as `feeSourceAccount`. `refundFee` then refuses a destination that does not match it, with a COMPLIANCE `agent.fee_refund_refused` audit row on the mismatch — the exact shape of `payments.payout_reverse_refused` (`payment-actions.ts:257-259`). This is the control the machine check would have been, done with data we already hold: an officer cannot redirect a refund, and an applicant cannot claim a wrong number.

**4 · Give `refundFee` the four `reviewKyc` guarantees explicitly**, since it inherits none: `withLock` on the application, refuse unless status is `REJECTED` and `feeRefundedAt IS NULL` (idempotent — a second call is a no-op, not a second payment), a typed reason at ≥10 characters (the repo's own bar for an act that returns real money — `payment-actions.ts:243`), and a watched `COMPLIANCE` / `agent.fee_refunded` audit carrying `actorId`, amount, destination, reference, and the id of the officer who rejected. The finding's "the audit row must carry both acts" is right; make it one payload field, `rejectedById`.

**5 · ⛔ Do NOT gate the rejection on the refund.** §5 bundles "reject / refund on reject" in one rail. If refund evidence becomes a precondition of `reviewApplication(REJECT)`, an officer cannot refuse a fraudulent applicant until treasury has moved money — that gates the refusal, which is exactly backwards for this platform. Reject completes immediately and CREATES the obligation; `refundFee` is a separate act on an already-rejected row.

**6 · The receipt upload: keep it, demote it.** An optional proof-of-transfer through the same `putKycDocument` seam is worth having as a dispute artefact — but it is not the control and must not gate. If you add it, it needs its own `AgentApplicationDocument` kind: `AgentDocType` is the applicant's seven (§3), and `api/admin/agent-doc`'s gate is written for applicant documents — an operator artefact served by that route without an explicit kind is a gate covering a population it was not measured against.

**7 · The aged queue — copy the precedent, don't invent one.** `/admin/payments` already solves this shape: `payout-status-control.tsx:104-105` shows "Stuck payouts" and "Oldest stuck (h)", and `worstOf(declared, derived)` means "declaring a healthier status cannot hide a stuck queue" (`payout-status-control.tsx:8-10`). Build the refund-due panel the same way on `/admin/agents`: rejected applications with `feeRefundedAt IS NULL`, count + oldest age, derived and not declarable. Its red harness: reject an application, refund nothing, assert the count is 1; delete the counter and the guard must go red — otherwise it is a guard that has never failed.

**8 · The SLA — route it through the law, don't write it on a page.** A number of business days is Ali's decision, not a build decision. `RULES.md` §5: Ali decides in writing → `COMPLIANCE-DECISIONS.md` → `RULES.md` §2.10 in the full `Decided / Enforced in / Configured in / Stated to / Guarded by` form, alongside the TZS 100,000 and the commission ceiling → one exported constant that the aged panel's amber threshold, `/agent/status` and the agent terms all read. ⛔ Never a literal on the screen — `AGENT-PROGRAMME.md:8-9` forbids restating those numbers, and an SLA published before the queue can measure it is precisely the §9 defect of asserting a control we do not have. Ship the panel first, then the promise.

**9 · Show the payee.** `/agent/status` gains a refund row on the timeline in en/sw/zh — refund due / refunded on `<date>`, reference, destination masked — and the rejection notification says the refund is owed. §5 says the rejection email carries no CTA; a factual line about money owed is not a CTA. A refund the payee cannot see is not evidence to them, and the finding is right about that.

---

### 🟠 An agent's earned commission is silently suppressed by an RG gate written for promotions, becoming a HELD row with no way to ever pay it

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

`creditInternal` refuses on `isLockedOut(userId)` and returns null, writing `credit_internal.suppressed.rg_lockout` (wallet-service.ts:1790-1801). Its own comment says this is "RESPONSIBLE-GAMBLING SUPPRESSION ON THE **CASH** INCENTIVE PATH" — it was written to stop promotional money reaching a self-excluded or cooling-off player, which is correct for a promo. Under decision 6 an agent's commission is not a promo: it is contractual remuneration to a vetted business partner who paid TZS 100,000. So the moment an agent self-excludes or takes a cooling-off break, `onRecruitSettlement`'s credit fails and `recordReward(… status: credited ? "PAID" : "HELD")` (affiliate-service.ts:576-585) writes a HELD row for money the operator owes.

And HELD is a dead end. `payBonus`'s comment claims "the held queue lets an officer retry it" (affiliate-service.ts:392-395) — there is no such queue. `/admin/affiliate/actions.ts` contains exactly ONE server action, `saveAffiliateConfigAction`; HELD appears only as a display chip (`affiliate/page.tsx:19`). There is no release, no retry, no payout path. The agent is never told. So the platform quietly stops paying a business partner the day they use a player-protection tool, keeps the debt on a row nobody can action, and the agent's only signal is that money stopped arriving.

Both possible answers are defensible and neither has been decided: withholding gambling-linked remuneration from a self-excluded person is arguably the right RG call, and paying a debt you owe is arguably the right consumer-protection call. What is not defensible is that it happens by accident, in a function whose comment says it is about incentives, with no notice and no remedy.

**Evidence** — src/lib/server/wallet-service.ts:1790-1801 · src/lib/server/affiliate-service.ts:576-585, 392-395 · src/app/admin/affiliate/actions.ts (one action only) · src/app/admin/affiliate/page.tsx:19

**Proposed handling** — Put the question to Ali explicitly and record the answer in COMPLIANCE-DECISIONS.md before building: does a self-excluded agent get paid, and if so by what route? Then implement whichever he chooses as an EXPLICIT branch in the commission path — never as a fall-through of a promo gate. If withheld: the agent must be told at the moment of suppression, in the self-exclusion confirmation, and the sum must be visible and payable out of band after the exclusion, with the same evidence discipline as the fee refund. If paid: it must not land in a wallet the agent can stake from, which means an out-of-band payment path and an officer action, not `creditInternal`. Either way, build the HELD release action that the code comment already claims exists, or delete the claim. Guard: a red harness that self-excludes an agent mid-programme and asserts the chosen behaviour, with a control player proving the promo suppression still fires.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the refusal; change the destination and build the release. Concretely:

1. STATE THE PRINCIPLE IN docs/AGENT-PROGRAMME.md: accrual is not payment. A commission row is a DEBT recorded at settlement regardless of the agent's RG state; only the payment leg may be refused. No role exception inside `creditInternal`, no change to the RG gate at wallet-service.ts:1786-1801 — it stays exactly as written and keeps covering proposal prizes and promo cash.

2. SPLIT THE ONE QUESTION INTO TWO STATES, because the code has two and they have different answers. Record both in the EXISTING docs/COMPLIANCE-DECISIONS.md, cross-referenced from AGENT-PROGRAMME.md:
   - COOLING-OFF (1h/24h/1w, wallet ACTIVE, account alive): no policy question at all. The debt is owed and becomes payable the moment `isLockedOut` goes false. This must be the default so a one-week break never forfeits a week's commission. Do not put this to Ali as an open question — put it to him as the proposed default.
   - SELF-EXCLUSION (wallet FROZEN, minimum-period, officer restore, cross-operator register): this is the genuine Ali decision. If PAID, it can only ever be an out-of-band officer disbursement against the HELD row with the same receipt/reference/evidence discipline as the rejected-applicant fee refund — never a wallet credit, since re-crediting a frozen wallet is itself an RG regression. If WITHHELD, it must be stated in the agent terms AT APPLICATION TIME, not discovered when money stops arriving.

3. BUILD THE RELEASE ACTION the comment at affiliate-service.ts:391-393 already claims exists — `releaseHeldRewardAction` on /admin/affiliate, behind `requireStaff("growth")` + `requireAdminTotp` like `saveAffiliateConfigAction`, single-officer (no two-officer lock), both DAL backends, audited. Two outcomes only: (i) RETRY, which calls the ordinary credit path so the live RG gate and wallet-status check still apply and it can only succeed once the lock is genuinely over; (ii) PAID_OUT_OF_BAND, recording officer id, reason and payment reference. Must be idempotent per reward row (advisory lock keyed on the reward id) so a double-click cannot pay twice. Then either fix or delete the "held queue" claim in that comment — CLAUDE.md's one-source-of-truth rule makes a comment that describes a feature nobody built a defect in its own right.

4. FIX THE DASHBOARD LIE IN THE SAME PASS. `getPlayerReferralSummary` (affiliate-service.ts:642-700) must return `heldTzs` and the recruit row must not show "Earning" beside "—" (profile/invite/page.tsx:357-360). Notify the agent at suppression via in-app notification + email; NOT push, which is RG-suppressed at push-service.ts:67-79.

5. DO NOT "FIX" THE CAPS. Once release exists, the per-recruit cap counting HELD rows (affiliate-service.ts:566-573) is CORRECT — it is money owed. Excluding HELD from the cap would let the same recruit's budget be spent twice after a release.

6. GUARD, WITH A CONTROL THAT MUST GO RED. One harness that (a) cools an agent off mid-programme, settles a recruit's position, asserts a HELD row and a `credit_internal.suppressed.rg_lockout` audit; (b) expires the break, runs the release, asserts exactly one PAID row, the wallet moved once, and a re-run pays nothing; (c) asserts the per-recruit cap is not double-spent after the release; (d) SELF-EXCLUDES a second agent and asserts the chosen self-exclusion behaviour — this is the leg that catches the frozen-wallet path the RG gate alone does not explain; (e) CONTROL: a cooling-off PLAYER on the promo path is still suppressed and still receives no cash, so deleting the RG gate in wallet-service.ts turns that control red.

**⭐ A verifier disagreed with that handling and proposed:**

SPLIT THE TWO STATES — they are different mechanisms with different correct answers, and the finding's single branch cannot serve both.

A · COOLING-OFF (wallet ACTIVE, login allowed, timer self-lifts). Do NOT pay out of band and do NOT bypass the gate. Accrue, hold, and RELEASE AUTOMATICALLY when the timer expires — mirror `bonus-service.ts:149-184` + `releaseKycHeldGrants()`, which is this repo's existing pattern for exactly this shape ("the delay is OURS"). Release must flip the EXISTING ReferralReward row HELD→PAID and credit then; never re-accrue, because the per-recruit cap already counted the row (`affiliate-service.ts:565-572`). Show the agent the held sum and its release date on `/profile/invite` — a cooling-off break is a pause, not a forfeiture, and today it is invisible.

B · SELF-EXCLUSION (wallet FROZEN, sessions revoked, period is a MINIMUM that never self-lifts per `responsible-gambling.ts:337-347`). This can never auto-release and must not sit as a status string the trial balance cannot see. Book the accrual to a suspense ledger account on the `rgSuspenseEntries` (`ledger.ts:199-209`) model — balanced and visible, "so nobody can quietly keep it" — and settle it by officer action on the existing restore path, with the fee-refund evidence discipline. Note the wallet freeze refuses at `creditInternal`'s `wallet.status !== "ACTIVE"` check independently of the RG gate, so any fix aimed only at `isLockedOut` is a no-op here.

C · ASK THE PRIOR QUESTION FIRST. Put to Ali not "does a self-excluded agent get paid" but "does a self-excluded person remain an ACTIVE AGENT — link live, code minted, still introducing gamblers?" If the answer is no, `referrerMayEarn` (`affiliate-service.ts:366-369`) is the seam to extend and most of the payment question dissolves. Record it in COMPLIANCE-DECISIONS.md CITING the standing decision at `BONUS-WITHDRAWAL.md:179-195` rather than opening it fresh — that entry already names the trigger ("if an agent ever loses commission this way in practice") and the agent build is what pulls it.

D · DELETE THE FALSE COMMENT NOW, regardless. `affiliate-service.ts:391-395` claims "the held queue lets an officer retry it" and no queue exists — this repo already has a rule against comments naming guards that were planned and not written (`BONUS-WITHDRAWAL.md` §6b #7).

E · GUARD. Extend the existing `test:rg-cash-incentive` rather than writing a new harness: add an AGENT arm for each of A and B, keep the unrestricted-agent control that must be PAID, and keep the existing player control proving promo suppression still fires. The red mutation that must go RED is neutralising the release path, not the gate — and it must be run separately against BOTH states, because a mutation that only exercises cooling-off is precisely how a fix aimed at the RG gate ships green with self-exclusion untouched.

---

### 🟠 A self-excluded, suspended or closed AGENT keeps recruiting new gamblers and keeps accruing — every eligibility test reads role, never account status

**Severity** high · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

`inviteIsLiveFor` takes only a `Role` (feature-state.ts:102-104). `bindRecruit`'s attribution gate is `!referrer || !inviteIsLiveFor(referrer.role)` (affiliate-service.ts:280) and `referrerMayEarn` is `!!referrer && inviteIsLiveFor(referrer.role)` (:367-370). `UserStatus` — ACTIVE / PENDING_KYC / SUSPENDED / SELF_EXCLUDED / COOLED_OFF / CLOSED (schema.prisma:47-54) — is consulted by neither. So an agent who self-excludes keeps a live public referral link and a live "Verified 50pick Agent" badge on the register page: new players continue to be recruited to a gambling platform under the name of a person who has told us they must stop gambling, and their attributions are permanent (`already_bound` never re-attributes). The same is true of an agent we SUSPEND for cause and of a CLOSED account.

The `referrerMayEarn` comment (affiliate-service.ts:350-366) shows the seam was designed for exactly this class of question and stopped at role because role was "the test available today", and the `bindRecruit` comment at :274-277 explicitly anticipates the gate gaining `AffiliateAgent.approvedAt`/`.active` when this build lands. The build plan brings those two columns to life (SESSION-PROMPT §1) but says nothing about status. Note the badge is the sharpest edge: it is a public representation by a licensed operator that this person is vetted and in good standing, rendered from a role flag that survives suspension.

**Evidence** — src/lib/feature-state.ts:102-104 · src/lib/server/affiliate-service.ts:280,367-370, and the comments at :274-277 and :350-366 · prisma/schema.prisma:47-54 · docs/AGENT-PROGRAMME.md:163-166 (the badge)

**Proposed handling** — Widen the single predicate — not a second one somewhere else, which the comment at :274-277 already forbids. `inviteIsLiveFor` (or a new `agentMayRefer(user, account)`) must require role AGENT **and** `AffiliateAgent.active` **and** `approvedAt != null` **and** a `User.status` that is not SELF_EXCLUDED / SUSPENDED / CLOSED, and the SAME predicate must decide the bind, the accrual, the badge and whether `/agent/status` and `/profile/invite` still show a live link. Suspension of the agent role on self-exclusion should be automatic and audited (COMPLIANCE category), and reinstatement should be an officer act, mirroring the self-exclusion restore rule (responsible-gambling.ts:327-347 — a self-exclusion never reinstates itself). Guard: drive each status through the bind and the accrual with an ACTIVE control that must still pass; a red harness per status.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the "one predicate" instinct; change where it lives, what it writes, and what it does to money.

1 · DO NOT widen `inviteIsLiveFor`. `feature-state.ts` is deliberately a pure, sync, DB-free PRODUCT-STATE table; its header (:37-42) says the SHELL resolves it once and threads booleans to clients, and ⚠️ warns never to import it into a `"use client"` file. Giving it a user + `AffiliateAgent` makes it async and DB-bound in the nav path, and merges two different questions ("is this feature in the product for this role" vs "may THIS account act today"). Take the finding's own parenthetical instead: ONE new async `agentMayRefer(userId)` in `affiliate-service.ts` that composes `inviteIsLiveFor(role)` AND `approvedAt != null` AND `active` AND the status verdict. Rewire all THREE existing call sites to it — `:165` (the preview/ribbon, i.e. the badge), `:280` (bind), `:369` (earn) — plus `/agent/status` and `/profile/invite`. That still honours the ⛔ at `:274-277` (no second definition of "may refer") without breaking the two-level design.

2 · DO NOT hand-type a fourth status list. `auth-service.ts:119-166` `assertSignInAllowed` is already this platform's single verdict on "may this account be here at all": SUSPENDED / CLOSED / SELF_EXCLUDED, with COOLED_OFF ⛔ deliberately absent, and it gets `minimum_served` and the no-timer `diverged` case right. Its own comment (:100-103) says a gate duplicated by hand is a gate that drifts. Export/extract that verdict and have `agentMayRefer` call it. Writing `status !== "SELF_EXCLUDED" && …` inline in the affiliate service recreates the exact defect the finding is complaining about.

3 · DO NOT write derived state on self-exclusion. "Suspension of the agent role should be automatic" is the dangerous half. Flipping `User.role` off AGENT breaks the plan's own invariant that `approveAgent` is the ONLY assigner of AGENT (SESSION-PROMPT §2) and leaves `restorePlayerAction` with no way back — that function already derives status from KYC precisely because it cannot know prior values, and the wallet unfreeze is the one thing it was taught to remember (`actions.ts:186-193`); a new writer is a new omission waiting to happen. Setting `AffiliateAgent.active = false` on self-exclusion is the same defect one level down: a second source of truth that restore must un-write. `User.status` IS the source of truth — read it LIVE in the predicate, so reinstatement resumes everything with no reconciliation job. Leave `.active` as the officer's commercial switch (`deactivateAgent`) only.

4 · SPLIT THE REFUSAL: refuse the bind and the badge, HOLD the accrual. An early `return` in the three hooks destroys the record of commission that recruits genuinely generated while an agent was suspended — and a suspension can be lifted. Reuse the mechanism that is already there: `payCommission`/`recordReward` with `status: "HELD"` when `agentMayRefer` is false but the pair is bound, which is precisely what `creditWallet` returning false already produces (`affiliate-service.ts:395-402`). Nothing is paid, nothing is lost, the held queue lets an officer decide at reinstatement or closure. Binds and badges lose nothing by being refused outright — no money is owed on a recruit who never existed.

5 · GUARD. The finding's "red harness per status" is right but under-specified for this repo's ⛔ "a guard that chooses its own population cannot fail": each status case must run in the SAME suite as an ACTIVE-agent control that must still bind AND still accrue, otherwise a predicate that refuses everybody ships green. Add the mutation: delete the status clause and the ACTIVE control must stay green while every restricted case goes red.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the layering, split the two questions, and derive rather than denormalize.

1. LEAVE `inviteIsLiveFor(role)` ALONE. feature-state.ts is sync, DB-free and resolved once by the shell then threaded down as props (its header, "SERVER COMPUTES, CLIENTS RECEIVE"). Making it async and User+AffiliateAgent-shaped drags Prisma into the product-state module and breaks all six call sites. Add exactly ONE composed server-side predicate in affiliate-service.ts beside the existing seam — `agentStanding(userId): Promise<{ mayRecruit: boolean; mayBeCredited: boolean; reason: string | null }>` — which reads `inviteIsLiveFor(user.role)` AND, for AGENT, `AffiliateAgent.active` AND `approvedAt != null` AND `User.status`. One definition of "may refer", composed over the product layer: that satisfies the ⛔ at affiliate-service.ts:274-277 without a second definition elsewhere.

2. GATE THE OFFER WITH `mayRecruit` — all THREE sites, including the one the finding missed: `resolveReferralPreview`:165 (the badge/ribbon), `bindRecruit`:280, plus the live link on `/profile/invite` and `/agent/status`. Refuse for SELF_EXCLUDED, SUSPENDED, CLOSED, and — decide it explicitly rather than by omission — COOLED_OFF. My call: block COOLED_OFF too on the badge and bind. Cost of a false block is a link that is quiet for a week; cost of a false allow is an irreversible attribution and a public vouch. On KYC, follow the ruling already made for agent-adjacent money: require `approvedAt != null` (EVER approved), not current KYC status, so a re-verification cycle cannot silently kill a live agent's book.

3. NEVER GATE THE ROW WITH `mayBeCredited`. Do not add status to `referrerMayEarn`. Let the three hooks run, compute the cut under the existing lock, and pass `status: "HELD"` with a reason when standing is bad — the instrument already exists (`recordReward({ status: credited ? "PAID" : "HELD" })`) and the held queue already lets an officer release or void. The debt survives the suspension; the money does not move.

4. FIX THE ACTUAL PAYMENT HOLE ONE LEVEL DOWN, NOT IN AFFILIATE CODE. The uncovered case is SUSPENDED/CLOSED with an ACTIVE wallet. Put that beside the existing RG suppression in `creditInternal` (wallet-service.ts:1790, next to `isLockedOut`) — refuse an incentive credit to a SUSPENDED or CLOSED account, audit COMPLIANCE, return null. That covers EVERY incentive path at once (bonus grants, goodwill, future promos), which is the same reasoning that comment already gives for why the wallet-status check was not a substitute. Fixing it only in affiliate-service leaves the identical hole open for the next credit caller.

5. NO WRITE-BACK ON SELF-EXCLUSION. Do not touch `AffiliateAgent.active` from `selfExclude()`. Instead: raise a COMPLIANCE audit (`agent.standing.blocked_by_status`) the first time the composed predicate refuses, and show a DISTINCT chip on /admin/agents — "Ineligible · account SELF_EXCLUDED" versus "Deactivated by compliance". Eligibility then restores itself automatically when the officer restores the account through the one existing door (`restorePlayerAction`, which already enforces the minimum-served rule), and `active` keeps its single meaning: a compliance act on the agency.

6. ANSWER THE QUESTION THE PLAN DOES NOT. Under decision 6 commission is real withdrawable cash for work already done. Say in AGENT-PROGRAMME.md what happens to HELD commission on a permanently self-excluded or CLOSED agent — payable on request via an officer act, or escheated by a stated rule. Leaving it to accumulate unnamed in the held queue is how it gets quietly written off.

7. GUARD, with the control that must go red. Drive all six UserStatus values through `resolveReferralPreview`, `bindRecruit` and `onRecruitSettlement`. The ACTIVE agent control must still badge, still bind and still be PAID. The red harness must assert that a SUSPENDED agent gets a HELD ROW WRITTEN — not zero rows. A test that only asserts "no PAID reward" passes on the wrong fix (the early `return`), which is exactly how the bonus-withdrawal guard reported 43 passed while paying, because its assertion was a SUM.

---

### 🟡 The build prompt puts per-agent rate control and the agent sub-ledger on /admin/affiliate — a GROWTH route — contradicting the authority's own separation of duties

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

AGENT-PROGRAMME §6 rules the admin surface 🔴 SEPARATE: "`/admin/agents` is compliance; `/admin/affiliate` is growth", and §10 repeats "`/admin/agents*` → `compliance` domain, step-up 2FA. `/admin/affiliate` stays `growth`." SESSION-PROMPT §6 then says: "`/admin/affiliate` — the sub-ledger. Per-agent rate, and the framework's agent sub-ledger: recruits, their turnover, revenue generated, commission paid." `DEFAULT_GRANTS.GROWTH` is `{ overview: view, growth: view+act }` (roles.ts:189-192) — no compliance. So as written, a marketing role gains act-authority over how much a licensed introducer is paid, and view of a recruit-level ledger; and it is the one economic lever AGENT-PROGRAMME §5 says an officer sets on the individual agent.

The alternative fix has its own recorded failure mode and must not be reached for blindly: DATA-RETENTION §7.5 records that hosting a `compliance` control on a route of another domain makes it Owner-only in practice and writes `privilege_escalation_blocked` SECURITY rows for every legitimate compliance click — the E-18/E-23 failure that `voidUpDownRound` had to be corrected for within the hour. Putting a compliance-gated rate control on a growth page reproduces it exactly. COMPLIANCE-DECISIONS §7's standing finding (a role scoped to one domain handed another domain's facts because they share a route) is the same shape.

**Evidence** — docs/AGENT-PROGRAMME.md:150,209 · docs/SESSION-PROMPT-AGENT-BUILD.md:118-122 · src/lib/server/roles.ts:189-192 · docs/DATA-RETENTION.md §7.5

**Proposed handling** — Move the rate control to `/admin/agents/[id]` where the authority puts it, and leave `/admin/affiliate` with a READ-ONLY, programme-filtered sub-ledger for growth (recruits, turnover, revenue, commission paid) — growth legitimately needs the numbers, not the lever. If any agent-scoped control must appear on the growth page, put a LINK there and the control on the compliance route, which is the pattern `/admin/updown` → `/admin/retention` already uses. Decide before writing the page whether the growth-visible sub-ledger may carry recruit-level rows at all, given §7's existing GROWTH-reads-another-domain's-facts finding; if it may, the recruit column must resolve through `<Sensitive>` like every other governed identity field. `test:rbac` reports unmapped routes but will not catch a control on a correctly-mapped page — assert the gate per control in `control-gates.ts` for all nine roles.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the direction, fix the specifics. Amend the build prompt before writing any page:

1. DELETE "Per-agent rate" from SESSION-PROMPT §6 (docs/SESSION-PROMPT-AGENT-BUILD.md:119). Rewrite §6 as: "`/admin/affiliate` — READ-ONLY agent sub-ledger. No rate control; the rate lives on `/admin/agents/[id]` (§5), and this page carries a LINK to it — the `/admin/updown` → `/admin/retention` pattern (DATA-RETENTION §7.5). Recruits, turnover, revenue generated, commission paid, filtered by `programme`." One rate, one write path, one home — matching AGENT-PROGRAMME §6/§10 and the RULES.md §2.10 ceiling the same prompt calls "the only legal home for those numbers".

2. Declare `setAgentRate: "compliance"` in `CONTROL_DOMAIN` (src/lib/server/control-gates.ts) even though `/admin/agents/[id]` is itself a compliance route. This is precisely the `purgeChainHistory` case documented in that file: the domain was correct-by-coincidence in an action literal, and declaring it is what turns a coincidence into a single definition site. Add the `setAgentRate` column to the EXPECT matrix in scripts/control-gates.test.mts §2 for all ten roles — `GROWTH: false` is the line that carries this finding, `COMPLIANCE: true`, `ADMIN: true`, everything else false. Prove the red harness by flipping GROWTH to true and watching §2 fail.

3. Add the guard that actually catches THIS class, which none of the existing ones do: assert that the rate write appears in exactly one place. Extend the `SITES` map in control-gates.test.mts §3 with `setAgentRate → src/app/admin/agents/[id]/actions.ts`, and add a positive assertion that `src/app/admin/affiliate/` (page.tsx, actions.ts, affiliate-admin-client.tsx) contains no `setAgentRate` / no `commissionPct` write. A stated separation that nothing measures is not a separation.

4. On PII, state the narrow true rule instead of the `<Sensitive>` one: the growth-visible sub-ledger carries HANDLE plus aggregates only — no email, phone, msisdn, region or dob columns. That is consistent with what `/admin/affiliate:140` already shows and with the five keys in sensitive-fields.ts. Do NOT wrap a handle in `<Sensitive>`; it is not a SENSITIVE_FIELDS key and doing so would create a new governed field and a reveal-audit trail for a public-facing username.

5. Drop the "COMPLIANCE-DECISIONS §7" citation from the finding and from anything that reaches the plan — that section does not exist. DATA-RETENTION §7.5 (line 392) and the `voidUpDownRound` / `createAsset` blocks in control-gates.ts carry the whole argument on their own, in the platform's own recorded words.

Note the residual, and record it rather than hide it — the same way control-gates.ts records the Owner-only gaps: with the rate on `/admin/agents/[id]`, GROWTH can read what agents cost but can never price them, and COMPLIANCE prices them without seeing the growth ledger. That asymmetry is the separation of duties the authority asked for, not a gap; only ADMIN sees both sides, which is the correct outcome for a licensed operator's introducer pay.

**⭐ A verifier disagreed with that handling and proposed:**

1. STRIKE "Per-agent rate," from SESSION-PROMPT §6 rather than "moving" it — §5 already places "rate control" on /admin/agents/[id]. Replace §6's mention with the rate as a READ-ONLY column sourced from the agent row, plus a link "Set rate on /admin/agents/[id] →". That is the pattern already live at src/app/admin/updown/page.tsx:856 (link to /admin/retention?tab=purge), for the reason recorded at DATA-RETENTION.md §7.5.

2. ADD ONE SENTENCE to §6 stating that /admin/affiliate gains NO agent-scoped act-authority at all — not rate, not deactivate, not approve, not refund — so a later reader cannot re-add one. A prompt that lists what a page shows but not what it must never do is how the duplicate arose in the first place.

3. DO NOT route the recruit column through <Sensitive>. Leave it on maskName (affiliate-service.ts:753). There is no name field in SENSITIVE_FIELDS, and classifying one as identity.personal renders it ABSENT for GROWTH (roles.ts:429 + the absent-not-dashed design), blanking the sub-ledger for its own audience; maskName's fallback is pinned by scripts/erasure.test.mts:224. Instead ASSERT the existing mask: extend the existing shape at src/app/api/dev-test/affiliate-e2e/route.ts:216 to cover programme=AGENT rows, and add a red-harness mutation that returns the raw displayName and must go RED.

4. DECLARE `setAgentCommissionRate: "compliance"` in CONTROL_DOMAIN, with the resolveMarket-style justification written into the comment (control-gates.ts:52-57): it is same-domain as its route, so it is declared not because the domains differ but because the Owner can create a compliance VIEW-without-ACT role at /admin/roles, and that role must see a LOCKED control rather than one that bounces and writes privilege_escalation_blocked. Say "the seven staff roles in DEFAULT_GRANTS plus ADMIN", not "nine roles" — PLAYER and AGENT are excluded from the grant matrix by construction (roles.ts:174-176). Add the mutation that flips the declared domain to "growth" and prove test:control-gates goes red.

5. MEASURE IT AS GROWTH, NOT AS ADMIN. COMPLIANCE-DECISIONS.md records that MODERATOR's view was "derived from the matrix and from sensitive.tsx:75, not observed" because the six staff QA personas are rejected on production. Open /admin/affiliate under a real GROWTH session before calling this closed — an unobserved role is precisely how a green suite ships a reachable lever.

6. The recruit-level-rows question the finder raises is already decided and needs no new ruling: the shipped page shows referrerHandle plus a masked recruit, and the AGENT sub-ledger should reuse that exact shape with a programme filter. Adding turnover and generated-revenue columns is new growth-visible economics, not new identity — that is the part worth stating explicitly in §6, and it does not need a compliance gate.

---

### 🟡 "Mirror reviewKyc" inherits no risk-based second officer — the maker-checker gate lives in the workstation, not the service

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

SESSION-PROMPT §2 says `reviewApplication` "carries all four `reviewKyc` guarantees" (self-review blocked, lock, decidable states, categorised reject, idempotent, audit+notify+email). The KYC maker-checker is NOT one of them: `kycRiskScore` and `KYC_MAKER_CHECKER_THRESHOLD = 70` are consulted in the workstation action, `kyc-actions.ts:102`, and in `/admin/kyc/[id]/page.tsx:76` — not inside `kyc-service.reviewKyc`. So mirroring the service faithfully produces an agent approval with no risk-based second signature, and nobody will notice, because the guarantee list is the one being copied.

The result is an inconsistency a Board reader will find quickly: a high-risk applicant needed two officers merely to become a VERIFIED PLAYER, and then one officer alone grants that same person the AGENT role, a commission rate, a public "Verified 50pick Agent" badge, and a permanent commercial relationship with the operator. Decision 9 is not an answer here — it is about market RESOLUTION (`test:two-admin` asserts the absence of a two-officer lock on sealing a verdict), which is a different control on a different act. Nothing recorded says a compliance officer may onboard a high-risk introducer alone.

**Evidence** — src/app/admin/kyc/[id]/kyc-actions.ts:102,115 · src/app/admin/kyc/[id]/page.tsx:76 · src/lib/server/kyc-risk.ts:17 · docs/SESSION-PROMPT-AGENT-BUILD.md:72-77 · docs/AGENT-PROGRAMME.md:210-211

**Proposed handling** — Put it to Ali as a distinct question from decision 9, with the numbers in front of him: does an agent approval inherit the KYC maker-checker at the same threshold? Recommendation: yes, and reuse the exact mechanism (recommend → a different officer approves) rather than inventing a second one, since a fit-and-proper decision on a business partner is strictly heavier than the identity decision it already applies to. Whatever he rules, record it in COMPLIANCE-DECISIONS.md with the date, and make the build prompt's guarantee list name the maker-checker explicitly so the next reader does not inherit the same omission. ⛔ Do not add a blanket two-officer lock — that is the thing decision 9 forbids; this is risk-triggered and it is a different control.

**⭐ A verifier disagreed with that handling and proposed:**

The spine is right — ask Ali, record it, fix the guarantee list — but three parts of the proposal are wrong for this platform.

1. DO THE DOC FIX UNCONDITIONALLY, NOW; IT NEEDS NO RULING. The actual defect is that SESSION-PROMPT-AGENT-BUILD.md:70 says `reviewApplication` "carries all four `reviewKyc` guarantees" without enumerating them, so a builder copies a list nobody wrote down. Replace it with the enumerated list PLUS an explicit exclusion line: "⛔ Two controls the KYC rail has do NOT live in `kyc-service.ts` and are therefore NOT inherited by mirroring it — the risk-triggered maker-checker (`kyc-actions.ts:101-111`) and the four E-4 officer attestations (`kyc-actions.ts:95-99`). Both live in the workstation action." Naming the attestations too is the generalisation the finder stopped one step short of; the same "mirror the service" instruction silently drops them, and §5's "attestation rail" only implies the UI, not the server-side refusal.

2. DO NOT "REUSE THE EXACT MECHANISM." As literal code reuse it is broken in two ways. (a) `getApprovalRecommendation(userId)` matches audit action `kyc.approve.recommended` on `targetId === userId` — call it from an agent approval and a stale IDENTITY recommendation satisfies the AGENT gate, and a future agent recommendation would satisfy a KYC re-review. Cross-programme collision on the same key, the exact "never fork the attribution / one payment per event" discipline this architecture is built on, violated on the signature instead of the reward. (b) It reads `getAuditPage` — the in-memory ring that `audit.ts:491-497` says is per-container and empties on every deploy. It fails closed (safe), but it means the record of a second signature on a permanent commercial relationship evaporates on a redeploy and is invisible across instances. If a recommend→seal step is built for agents it must be a COLUMN on `AgentApplication` (`recommendedById`, `recommendedAt`, cleared on any state change back), in BOTH DAL backends and the `DATA-LAYER.md` entity map, with its own audit action `agent.approve.recommended` at `targetType: "AgentApplication"`, `targetId: applicationId`.

3. DO NOT KEY THE TRIGGER ON `kycRiskScore`. Its five factors (kyc-risk.ts:23-60) are player money-flow signals scored for an IDENTITY decision — large withdrawals, AML holds, deposit velocity, account age, source-of-funds. None of them say anything about whether someone is fit to be an introducer. Two consequences: a clean-record business applicant scores ≤10, so a gate keyed on it would be present and inert — a control that can never fire, which is precisely the "instruments green while measuring the wrong thing" failure; and it inverts the sense of the decision, making a high-depositing loyal player HARDER to onboard as an agent than a stranger with no history.

CONCRETE ALTERNATIVE. Put it to Ali as a question about the ACT, with the operating numbers in front of him: agent approvals are a low-volume queue (7 documents, TZS 100,000, a vetted partner), and prod has 9 ADMIN accounts of which only 2 carry 2FA — so a second signature is cheap here in a way it never was on market resolution. Three options, not two:
  (a) One officer always — status quo, and the only cost is the Board inconsistency.
  (b) ALWAYS recommend→seal, for agent approval only. Recommended. A fixed rule on a rare, high-consequence act is auditable and its guard CAN go red; and it is not what decision 9 forbids, which is a hard-lock on sealing a market verdict.
  (c) Risk-triggered. If Ali chooses this, the trigger must be a fact the application itself carries, not a live recompute of betting behaviour — the cleanest is "the applicant's own KYC was sealed under maker-checker", which is already recorded in the audit payload at `kyc-actions.ts:115` (`makerChecker: true`), plus a `commissionPct` ceiling. That answers the Board question the finder actually raised ("two officers to be a verified player, one to be an agent") directly, instead of by proxy.

RECORD + PROVE. Whatever he rules goes in COMPLIANCE-DECISIONS.md dated, and AGENT-PROGRAMME.md §10's "Single officer" bullet must be rewritten to stop citing `test:two-admin` for an act that test never touches — that mis-citation is what would carry the error forward even after the ruling. Red harness per §10's own law: same-officer recommend→seal REFUSED, and a `kyc.approve.recommended` event on the same user does NOT satisfy the agent gate. That second control is the one that must go red, and it is the one nobody would have thought to write.

**⭐ A verifier disagreed with that handling and proposed:**

Keep three things from the proposal — it is a distinct question from decision 9, reuse `twoOfficerGate` rather than invent a mechanism, record the answer in COMPLIANCE-DECISIONS.md, and do NOT add a blanket lock. Change the trigger, the placement, and the framing.

1. PUT THE GATE INSIDE `reviewApplication`, not in the workstation action. This is the whole point of the finding and it costs nothing at build time. `agent-application-service.reviewApplication` refuses an APPROVE that lacks the required second signature, so `/admin/agents`, a future player-page shortcut, and any script all inherit it. Then extend `docs/SESSION-PROMPT-AGENT-BUILD.md:35` — the guarantee table itself — with a seventh row naming the maker-checker, and add a line at :72 saying the agent service places it INSIDE the service, unlike KYC, with a one-line pointer to `src/app/admin/players/[id]/actions.ts:380-398` as the reason. That one edit is what stops the next reader inheriting the omission.

2. TRIGGER ON A RECORDED FACT, NOT ON A RECOMPUTED PLAYER SCORE. Do not call `kycRiskScore` at agent approval. Anchor on what was actually decided about this person and on what the operator is granting:
   · the applicant's own KYC approval was itself maker-checkered — that fact is already written, `kyc-actions.ts:115` stamps `makerChecker: true` in the `kyc.workstation.approved` payload. Persist it on the KycSubmission at approval time so the agent service reads a column, not an audit scan; a person who needed two officers to be believed about their identity needs two to become an introducer.
   · the commission rate being granted exceeds a recorded ceiling (a rate is a permanent commercial liability; it is the actual money decision in this flow, and it is the thing an officer could get wrong alone).
   · the applicant already holds a staff role.
   Any one true → recommend-then-seal. This gives a control that can go RED on a real applicant, which the score-based version cannot.

3. STORE THE MAKER AS COLUMNS, NOT AS AN AUDIT SCAN. Do not copy `getApprovalRecommendation` (kyc-risk.ts:66-75): it filters `getAuditPage({ category: "COMPLIANCE", limit: 10000 })` in memory on every page render and every approve. The build is already creating an `AgentApplication` table — put `recommendedBy` / `recommendedAt` / `recommendationClearedAt` on it, in both DAL backends. That makes the state decidable (the same property the prompt already demands of the status machine) instead of derived from a capped scan, and it drops an O(10k) read out of the approve path.

4. FRAME THE QUESTION TO ALI AROUND THE MIS-CITATION, NOT AROUND "should agents need two officers". Show him `AGENT-PROGRAMME.md:210-211` next to `two-admin-policy.test.mts:1-16` and say: the agent programme's single-officer rule currently cites a test that only covers sealing market verdicts; it has never been decided for onboarding a business partner. Then give him the concrete default from (2) to accept or refuse, so he rules on a proposal rather than designs one. Whatever he says, correct `AGENT-PROGRAMME.md:210-211` to stop citing `test:two-admin`, because that citation is wrong in either direction.

5. WHILE THIS IS OPEN, DO NOT BLOCK THE BUILD. The self-review block, the `APPROVED`-KYC precondition and the reconciled-fee precondition already in the prompt are unaffected. If Ali rules "single officer", the only required change is deleting the citation and writing the dated decision — the finding is then closed by a record, not by code, which is the correct outcome for a question the owner is entitled to answer.

⛔ One thing to avoid: do not make the agent gate a copy of `kyc-actions.ts:102-112` sitting in `/admin/agents` actions. That is the shape that produced this finding, and a fourth copy is how it comes back.

---

### 🟡 No legal deliverable in the plan, while /legal/terms already carries a false money statement and /legal/aml claims screening that does not exist

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

SESSION-PROMPT §7 lists RULES.md §2.10, AGENT-PROGRAMME §9, MODULE-CERTIFICATION-PROGRAM J4, LIVE-QA-CAMPAIGN §6b and a corrected framework document. It names no legal surface at all. But the programme creates a paid contract with a member of the public, publishes a badge that is a representation about a third party, and holds two other people's identity documents — none of which is covered by the existing terms, and all of which needs agent-facing terms (fee, non-refundability conditions, refund on rejection and its SLA, how commission is calculated and on what base, that it accrues on collected operator fee and not turnover, one rate set by us and changeable prospectively, deactivation grounds, that an agent never handles player money, data handling for referees).

Two pre-existing defects sit on the pages the build will be editing, and touching them without fixing them re-certifies them: (a) `/legal/terms` §3 states "Identity verification is **not** required in order to withdraw" (terms/page.tsx:76-86) in the BINDING English text at version 2026-09-05 — flatly contradicted by the 2026-09-05 KYC-first ruling, which gates withdrawal on `approvedAt != null` (kyc-gate.ts:25). That is a live false money statement in the legal document, in all three locales. (b) `/legal/aml` §4 states "All registered users and beneficial owners are screened against the UN consolidated list, OFAC SDN list, the EU sanctions list, and the UK HMT list at registration and weekly thereafter" (aml/page.tsx:66-70), while `kyc-risk.ts:9-11` records that those feeds do not exist and the score deliberately invents no sanctions points. Adding a vetted, paid "business partner" tier makes §4's "and beneficial owners" clause materially worse, and the framework going to the Gaming Board will describe agent vetting alongside it.

**Evidence** — src/app/legal/terms/page.tsx:76-86 (§3), :28 (version) · src/lib/server/kyc-gate.ts:25 · src/app/legal/aml/page.tsx:66-70 · src/lib/server/kyc-risk.ts:9-11 · docs/SESSION-PROMPT-AGENT-BUILD.md:124-131

**Proposed handling** — Add to §7 of the build prompt: agent-facing terms (en/sw/zh, English binding) accepted at application with a version stamp on `AgentApplication`, a `/legal/privacy` section for non-account data subjects, the DATA-RETENTION.md row, and a dated COMPLIANCE-DECISIONS.md entry for the programme. Correct terms §3 to the live gate and bump the version in the same commit — the file's own header (`:22-28`) records that a change to the binding text may not ride in on an unbumped version. Add the sanctions correction to AGENT-PROGRAMME §9's "where the framework is wrong about this system" table and to the corrected framework, so the document that reaches the Board does not assert a control we do not have — §9's own standard: "a document that asserts controls we do not have is worse than one that claims less." ⛔ Every legal string goes through the dictionary and `test:i18n`; a hand-written agent-terms page in one locale is how the objection-window literal survived in the chatbot prompt.

**⭐ A verifier disagreed with that handling and proposed:**

SPLIT IT INTO TWO UNITS. The re-certification premise is false (the build touches no legal file), so nothing couples these. Unit 1 is the agent programme's own legal deliverables and belongs in the build. Unit 2 is two pre-existing falsehoods in binding documents — higher priority than the agent build, and it must not be gated behind it.

UNIT 1 — agent legal deliverables (in the build, per the finder, with one correction):
· Agent terms in en/sw/zh, English binding, covering: the TZS 100,000 and that it is paid out of band and never enters the player ledger; refund on rejection and its SLA; commission computed on the operator fee ACTUALLY COLLECTED at settlement, not turnover; one rate set by us, changeable prospectively only; deactivation grounds; that an agent never holds float or handles player money; referee data handling and the referees' rights.
· Acceptance stamped at application. Precedent exists — `prisma/schema.prisma:224-225` already has `User.acceptedTermsVersion` / `acceptedTermsAt`. Mirror that shape on `AgentApplication`; do not invent a second one.
· ⛔ DO NOT PUT IT IN THE DICTIONARY. The finder's instruction is wrong twice. It contradicts all four existing legal pages (`terms/page.tsx:56-406`, `aml/page.tsx:27+` are inline `Record<Locale, ReactNode>` with `LegalSection`, `<strong>`, links and interpolated live config such as `objectionWindowHours`) — flattening to dictionary strings would either fork the convention or strip the structure. And the stated reason is wrong: `test:i18n` is a PARITY guard. Parity passed happily on a falsehood present in all three locales — that is precisely what happened to terms §3. Follow the legal-page convention: `LegalHeader` + `LegalSection`, a `META` version constant, a `BINDING` notice.
· `docs/DATA-RETENTION.md` needs a row for agent application documents (CV, letters, receipt) and a SEPARATE row for referee national IDs — they are non-account data subjects with no account to close, so "7 years from account closure" (`:24`) has no anchor for them; state what it is measured from.
· `/legal/privacy` section for non-account data subjects, plus a dated `COMPLIANCE-DECISIONS.md` entry for the programme.

UNIT 2 — the two live falsehoods (separate unit, do not bundle):
· Correct BOTH sites, not one. `terms/page.tsx:78/:202/:323` AND `aml/page.tsx:32-33/:100-102` — the AML page says it in different words and the finder missed it, which is the same evasion `kyc-copy-truth.test.mts`'s own header documents.
· ⚠️ "Bump the version" has no mechanism on the AML page — its `META` (`aml/page.tsx:16-20`) is a standards line with no version and no date. Give it one in the same change, or the correction is unattributable.
· 🔴 THE OWNER DECISION THE FINDER DID NOT NAME, and it is the highest-value item here. Terms §10 (`:172-177`) promises "at least 14 days" written notice before any material change. Correcting §3 REDUCES a player right, and the 2026-09-05 precedent (`COMPLIANCE-DECISIONS.md:210+`, §6's narrowing) reasoned exactly that such a change cannot ride in on an unbumped version. Either serve the 14-day notice, or record an explicit ruling that this is the correction of a false statement rather than a change of terms — defensible, because the gate has been live since 2026-09-05 and only the document was wrong. Whichever way, it is Ali's/compliance's call and must be a dated `COMPLIANCE-DECISIONS.md` entry, not a silent edit. Note also that every player carrying `acceptedTermsVersion = "2026-09-05"` accepted a document containing the falsehood.
· SANCTIONS — fix the page, not the table. §9 of AGENT-PROGRAMME is "where the FRAMEWORK is wrong about this system"; filing it there records it and leaves `/legal/aml` §4 live and false. Correct `aml/page.tsx:66-72` in all three locales to what we actually do — PEP/sanctions as an officer-judgment checklist item at review, no automated feed, per `kyc-risk.ts:9-11` — and fix `admin/reports/page.tsx:84`, which asserts the same absent control to officers. §9 may carry a cross-reference; the correction does not live there.

THE CONTROL THAT MUST GO RED — the part the finder omitted entirely, and without it the class re-enters:
· Extend `scripts/kyc-copy-truth.test.mts` from `dict` to a population walked from disk covering `src/app/legal/**` and `src/app/agent/**` (and the new agent-terms page). Its detector is already right; only its population is wrong.
· ⛔ BUT WIDENING ALONE REPORTS GREEN ON TWO OF THE THREE LIVE DEFECTS — I measured the regexes at `:47-62`. (i) The EN `deny` alternation has no `precondition`, so aml §1's "is not a precondition of withdrawal" is NOT flagged even after widening. (ii) The SW `money` alternation is `kutoa pesa|kuweka pesa|kucheza|kuweka dau|dau`, but terms §3 SW (`:202`) says "kutoa fedha" — no match, so the Swahili half stays invisible. (Only ZH `提现无需完成身份验证` fires as written.) Add `precondition` / `not a precondition` to EN `deny` and `kutoa fedha|fedha` to SW `money`, and add each real live sentence as a positive control so the guard is proven RED against the actual text before the fix lands — not against a paraphrase, which is how this guard came to hold a control that matches a sentence it cannot reach.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding; replace the handling.

1 · CORRECT THE STATEMENT AT EVERY OCCURRENCE, NOT terms §3 ALONE. Six strings, two pages: `terms/page.tsx:76-86` (en), `:202` (sw), `:323` (zh); `aml/page.tsx:32-33` (en), `:100-101` (sw), `:169` (zh). Bump `terms` META (`:28`) as the finder says — and give `/legal/aml` a version stamp it currently lacks (`:16-20`), or the correction ships unversioned on a document whose own BINDING banner (`:21-25`) says the English text is legally binding.

2 · DO NOT WRITE A NEW ASSERTION — WIDEN THE GUARD THAT ALREADY OWNS THE RULE. Add the four `src/app/legal/*/page.tsx` files to the population of `scripts/kyc-copy-truth.test.mts` (today: `dict` only, `:30`). One rule, one place. Then fix two phrasing holes the live strings expose, or the widened guard goes green over the falsehoods it was just pointed at: `deny` (`:48`) has no "not a precondition", which is the English AML wording; `money` for sw (`:54`) has "kutoa pesa" but both live Swahili strings say "kutoa **fedha**". Its own docstring is the standard — "this guard tests the CLAIM, not the phrasing". Drive each new assertion red by reinstating the old sentence, per the cert-d1 §2b precedent.

3 · FIX THE SANCTIONS CLAIM ON THE PAGE, not only in a doc. Rewrite `aml/page.tsx` §4 (all three locales) to the control that exists: a compliance officer's sanctions/PEP attestation recorded at review into the hash-chained audit log, no automated list feed, no periodic re-screen. Assert it in `test:cert-d1` §2b — the established home for "the legal page claims only what the code does", already reading aml/terms/privacy at `:76-78`. Record it in COMPLIANCE-DECISIONS.md. In AGENT-PROGRAMME §9 keep at most a pointer row; the framework's error and our page's error are different objects.

4 · AGENT TERMS FOLLOW THE LEGAL-PAGE PATTERN, NOT THE DICTIONARY. A `/legal/agent-terms` page with the same inline `Record<Locale, ReactNode>` shape, `BINDING` banner and version META as its three siblings, guarded by content assertions with a control that must go red — not `test:i18n`, which measures key parity and would report a page of lies as green.

5 · ONE SOURCE FOR THE VERSION, AND FIX THE BROKEN PRECEDENT IN THE SAME PASS. Export the version from the page module (or a shared `src/lib/legal-versions.ts`) and have both the page's META and the acceptance write read it; add a guard that fails when a page's stated version and the constant stamped on acceptance diverge. Do this for `TERMS_VERSION` (`auth-service.ts:52`, stuck at 2026-04-01) as well as the new `AgentApplication.acceptedAgentTermsVersion` — otherwise the agent contract is born with the same defect and there is no red anywhere.

6 · THE REFEREES NEED MORE THAN A PRIVACY PARAGRAPH. Two people with no account, no login, no DSAR route and no consent will have their national IDs in R2. `privacy.ts` erasure and DATA-RETENTION.md §2b are keyed on `User`, so nothing today can find or destroy a referee's document. Give it a DATA-RETENTION row with a period and an enforcement column that is honest about being 📋 Policy if no code path exists, an erasure path reachable from `/admin/agents/[id]`, and a stated basis for holding a third party's ID at all. Decide, and record in COMPLIANCE-DECISIONS.md, whether a rejected applicant's referee documents are destroyed with the refund.

⚠️ Severity is understated at medium: six false statements in binding legal text across three locales, on the two pages a regulator reads, with the guard that exists for exactly this rule unable to see either file.

---

### 🟡 The programme is onboarding-only: an agent is vetted once and then monitored by nothing, while the sub-ledger ranks them on the metric RG duties argue against

**Severity** medium · **Kind** compliance · **unanimous** · ⭐ **FIX DISPUTED**

Every control in AGENT-PROGRAMME and the build prompt fires at application time. After approval there is: a rate, an `active` flag, a `deactivateAgent` function, and nothing that decides when to use it. Three specific gaps:

(1) The agent is paid to recruit and paid MORE the more their recruits lose — commission is a share of the operator fee, and the fee is 13% of the LOSING side (RULES.md §1). The sub-ledger the plan specifies (SESSION-PROMPT §6: "recruits, their turnover, revenue generated, commission paid") ranks agents by exactly that, with no player-protection signal beside it. `detectHarmMarkersForAllUsers()` already exists and already feeds `/admin/compliance` (responsible-gambling.ts:694-704), so the cohort signal is one query away — an agent whose recruits are disproportionately flagged CHASING_LOSSES or LATE_NIGHT_PLAY is the single most useful thing a compliance officer could see on that page, and it is not there.

(2) No trigger is defined for deactivation. There is no rule about an agent whose recruits are heavily harm-flagged, an agent whose own KYC is force-reverified or rejected, or an agent who is suspended (see the status finding). "An officer may deactivate" is a capability, not a control.

(3) Nothing says an agent may not bet, and their commission lands in the same wallet they stake from. An agent who is themselves a problem gambler is paid, in stakeable cash, in proportion to how much other people lose — and the platform's only visibility into their own play is the same harm-marker detector nobody is required to look at for this population. The framework's own vetting (CV, Serikali ya Mtaa letter, two referees) tests character and residence; it tests nothing about the applicant's gambling.

**Evidence** — src/lib/server/responsible-gambling.ts:510-538,694-704 · docs/SESSION-PROMPT-AGENT-BUILD.md:118-122 · docs/RULES.md §1 (13% of the losing side) · docs/AGENT-PROGRAMME.md:104-135

**Proposed handling** — Add three things to the build, all cheap because the machinery exists: (a) a recruit-cohort RG column on the agent sub-ledger and on `/admin/agents/[id]` — harm-marker count and self-exclusion count across that agent's recruits, read from `detectHarmMarkers`, so an officer sees the protection signal next to the money signal on the same screen; (b) written deactivation grounds in the agent terms and a periodic officer review of every active agent (a queue, dated, not a memory); (c) put to Ali whether an approved agent's own account carries a standing RG review — at minimum, run the harm-marker detector over the AGENT population and surface it in the compliance console, since an agent flagged for their own play while being paid to recruit is the exact conflict the Board will ask about. ⛔ Do not build a public agent leaderboard or any "top agents by turnover" surface — that is a recruitment incentive pointed at volume, and AGENT-PROGRAMME §5 already draws the line at displaying turnover to the agent themselves.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the finding's direction and its ⛔ (no leaderboard — it matches AGENT-PROGRAMME §5, which already confines turnover display to the agent themselves). Change three things, because as written the fix names an artifact that does not exist, specifies a query that will not survive the page it is put on, and misses the only hard control available.

(a) DO NOT put `detectHarmMarkersForAllUsers()` on `/admin/agents` or `/admin/agents/[id]`. Its own header comment (responsible-gambling.ts:696-698) says why: it walks every user's full transaction history in batches of 10 to avoid "100 users × 10K txns each → timeout". Hanging it off a per-agent workstation re-runs a whole-platform O(users × txns) scan on every page load, and off the queue page it runs once per row. Do the join in the direction where the query already runs: on `/admin/compliance`, whose harm table is already computed at page.tsx:549, add a "recruited by" column resolved from `User.recruitedBy` → agent code. Zero new scans, and it puts the protection signal in front of the officer who is already there. Then on `/admin/agents/[id]` only, compute over that agent's recruit list alone — `detectHarmMarkers(recruitId)` bounded by the cohort, never the platform — plus a self-exclusion/cool-off count read straight from the RG rows, which needs no detector at all and is the cheapest half of the signal. Display only; do not gate on it. Harm markers are advisory in this codebase (they drive outreach), and this platform's law is that a refusal needs a control that must go red — a heuristic detector cannot carry an automatic suspension.

(b) The grounds do not go "in the agent terms" — there are no agent terms anywhere in the plan (grep confirms). AGENT-PROGRAMME.md is the authority and it is where a new §11 "After approval" belongs: the grounds for deactivation, what deactivation does to accrued-but-unpaid commission (it must NOT repudiate it — say so explicitly, or the first deactivation becomes a money dispute), and a dated officer review recorded as a field on the agent row (`lastReviewedAt` / `reviewDueAt` surfaced as an overdue chip on `/admin/agents`) rather than a new scheduler. Any number that comes out of this lands in RULES.md §2.10 and nowhere else, per the doc's own rule.

(c) THE ITEM THE FINDING MISSED, and the one that must be in the build: make `deactivate` mean something. `referrerMayEarn` (affiliate-service.ts:367-370) tests role only, so today a deactivated agent still accrues on all three hooks (:495, :544, :610). Extend it to read `AffiliateAgent.active` and `approvedAt` for an AGENT referrer, and prove it with a red harness in the pattern of rg-cash-incentive.test.mts: §1 a control — an ACTIVE agent IS paid, so the harness can observe a credit; §2 the same agent deactivated is refused, with the accrual absent from `ReferralReward`, not merely zero. Without §1 the suite would go green with the whole engine switched off. Note this also interacts with leak #2 already on the board (`if (!cfg.enabled) return;`) — both are the same class of "eligibility read from the wrong seam", and they should be fixed in one pass over the three hooks.

(d) Narrow the escalation to Ali. Do not put "should agents be allowed to bet" to him as an open question — the cash-incentive gate already refuses commission to a self-excluded or cooling-off agent (wallet-service.ts:1790, proven by rg-cash-incentive §2/§3), so the residual question is smaller and answerable: should the AGENT population be a named cohort on `/admin/compliance`, and does an agent whose OWN account is harm-flagged get an officer review rather than an automatic anything. Present it with the existing gate stated, or he will be asked to decide something the platform already decided.

**⭐ A verifier disagreed with that handling and proposed:**

Keep (1) and (2) in substance; replace the mechanism. Four concrete changes, in the same build:

A. ENFORCE DEACTIVATION AT THE ONE SEAM — the highest-value item, and the finding omits it. Extend `referrerMayEarn()` (`affiliate-service.ts:367-370`) to the full predicate the code's own comment at `:275-277` already promises: role AGENT **and** `AffiliateAgent.active` **and** `approvedAt != null` **and** `User.status === ACTIVE` **and** the agent's own `KycSubmission` still APPROVED. ⛔ One definition — do not add a second "may refer" test on the admin surface or the bind path; both already read this seam. A suppressed accrual must be recorded HELD, never dropped (the pattern `payBonus` already uses), so the ledger never loses money it declined to pay. Red harness: an agent with `active=false` accrues 0, plus a CONTROL agent who is active and DOES accrue — otherwise the guard chooses its own population and cannot fail.

B. COHORT RG COLUMN, COMPUTED ONCE, NOT PER-ROW. Call `detectHarmMarkersForAllUsers()` a single time and group the flags by the flagged user's `recruitedBy` (+ `programme`). One pass, no new query, no N+1. Self-exclusion count comes from `db.responsible.listAll()` — present in BOTH backends (`store.ts:992`, `prisma-dal.ts:1330`), so it is viable. Render it with a DENOMINATOR (flagged recruits / total recruits), never a bare count — a 2-recruit cohort with 1 flag is noise, and a raw count is the measure-the-wrong-population trap. Carry the A-5 discipline verbatim from `compliance/page.tsx:544-549`: on a failed read render "n/a", ⛔ never "0 flags" beside a commission figure — a false all-clear next to a money number is worse than no column.

C. TRIGGER, NOT CALENDAR. The officer review fires when the cohort crosses a threshold, surfacing that agent in the `/admin/agents` queue with a date and the reason — beside the money, on the same screen. Write the deactivation GROUNDS into `AGENT-PROGRAMME.md` as a new post-approval section (the authority currently stops at approval) and into the agent terms: KYC no longer approved · account suspended/closed · self-exclusion · cohort harm threshold · fee reversed. Grounds in the authority, enforcement in (A), visibility in (B).

D. ONE COLUMN, NOT A NEW POLICY DEBATE, for the agent's own play. Add a role/agent marker to the harm-marker table (`compliance/page.tsx:617-631`) so an AGENT flagged for their own play is visible AS an agent. It needs no new query — `detectHarmMarkersForAllUsers` already covers them. Then put ONE narrow question to Ali, with the existing control stated so he is not asked to re-decide something already built: *"An RG-locked agent already receives no commission — `creditInternal` refuses it and the reward is held (`test:rg-cash-incentive` §5 proves it on an AGENT). Beyond that, may an approved agent bet at all?"* Do NOT frame it as "the platform has no visibility"; that is not true and the Board answer differs depending on which is the case.

⛔ Keep the finding's no-leaderboard warning, but drop the §5 citation — §5 says the reverse (`AGENT-PROGRAMME.md:117-119` deliberately shows turnover TO the agent). The line to hold is: turnover to the agent and the officer, never a public or cross-agent ranking. ⛔ And the cohort RG figures are an OFFICER surface only — they must never reach `/profile/invite`; an agent must not be shown which of their recruits is flagged or self-excluded.

---

### ⚪ Agent documents must not put a name or phone in the R2 object key — that is the one class of PII erasure can never reach

**Severity** low · **Kind** risk · **unanimous** · ⭐ **FIX DISPUTED**

`putKycDocument(dataUrl, keyHint)` builds the key as `kyc/${keyHint.replace(/[^a-zA-Z0-9/_-]/g, "_")}/${randomId(12)}.${ext}` (storage.ts:76). Whatever the caller passes as `keyHint` becomes part of a durable object name. Audit F-11b is precisely this defect on `SystemConfig.key`: the erasure test's §11.11 records that a value can be rewritten but a KEY cannot, that no path in the platform renames one, and that §8's sweep cannot see it — measured at 2 live rows on production 2026-08-21. With seven documents per application including two referees, the natural `keyHint` an implementer reaches for is the applicant's or the referee's name.

**Evidence** — src/lib/server/storage.ts:76 · scripts/erasure.test.mts:671-703 (audit F-11b, and the write-site assertion pattern)

**Proposed handling** — Pass an opaque id only — the application id plus the document slot enum, never a name, phone, or anything derived from one — and assert it at the WRITE SITE the way §11.11b does for `saveConfig`, since (as that assertion's own note says) the data is what the write site produces and only one of the two is checkable without a database. Also use a key prefix that is not `kyc/`: DATA-RETENTION.md §1 tells an auditor that everything in `50pick-kyc` is a KYC document on the 7-year clock, and agent-application documents are governed differently (see the referee finding).

**⭐ A verifier disagreed with that handling and proposed:**

Half of the proposal is right; the other half would damage a certified module for nothing.

WRONG HALF — do not change the `kyc/` prefix. The prefix is HARDCODED at `storage.ts:76`; a caller cannot pass one, so honouring this means editing the shared seam — which §10 fences ("no second storage path") and which `scripts/kyc-cert-d2.test.mts:150` reads by string index (`storageCode.indexOf("export async function putKycDocument")`, then a fixed 800-char slice) in one of the only 4 certified modules of 52. It also buys nothing operational: I grepped `src/` and `scripts/` for `ListObjects`/`Prefix`/lifecycle rules and there are NONE. Erasure walks ROWS (`erasure.ts:288`, `:310`), never keys. The prefix is a label an auditor reads, not a control.

Get the same labelling for free in the segment the caller DOES own: pass `agentapp/${applicationId}/${docType}` (the sanitiser's allowed class includes `/`, so slashes survive), yielding `kyc/agentapp/<cuid>/<SLOT>/<rand>.ext`. An auditor listing the bucket can separate the two classes; `storage.ts` and the D2 cert test are untouched.

RIGHT HALF, MADE ENFORCEABLE — a grep is the backstop, not the control:
1. TYPE THE SLOT. Expose `attachDocument(applicationId: string, docType: AgentDocType, dataUrl: string)` and build the hint INSIDE the service from those two values only; never surface a free-form `keyHint` on the agent path. Because `AgentDocType` is an enum (the plan already declares it), `tsc` refuses a name in that position — a control that cannot be forgotten. `applicationId` is a DB-minted cuid, not applicant input. This is stronger than any source grep and costs nothing.
2. KEEP the §11.11b write-site assertion as the backstop, pinned to that exact template literal in `agent-service.ts`, since the data is what the write site produces.
3. ADD THE RED CONTROL — §10 mandates "a red harness per guard". Put a referee name back into the call site and the guard must go RED. Without that run, the assertion is a hypothesis; §11.11b's own preamble records that the first version of that very check was wrong in the other direction (it forbade the fix).

WHAT MATTERS MORE, AND MUST SHIP IN THE SAME PASS. `anonymizeClosedAccount` destroys objects by iterating `k.documents` and `k.extraRequests` only. Nothing will walk `AgentApplicationDocument`, so agent objects — including the two referees' national ID scans, belonging to people with no `User` row and therefore no erasure entry point at all — would be reachable by no routine on the platform. That is also what makes the key destroyable; argue about the key name and skip this, and the key debate is moot because neither the name nor the bytes ever go. Reuse the tier-② pattern exactly: a failed object KEEPS its row so the sweep is retryable, and surface `documentObjectsFailed`.

FINALLY, SETTLE GOVERNANCE IN THE SCHEDULE, NOT IN A KEY NAME. The finding assumes agent documents "are governed differently"; `DATA-RETENTION.md` has no agent row at all, and §1 currently maps the whole `50pick-kyc` bucket to "Identity documents + KYC decisions / 7 years / from account closure". Add an explicit row with a real Enforcement value (or state that agent documents ride the 7-year KYC clock), citing the `kyc/agentapp/` prefix in *Where*, and note that the referees' documents have no data subject on the platform. Inventing a retention class implicitly, in a prefix no code enforces, is precisely the F-01 defect that file was written to close.

**⭐ A verifier disagreed with that handling and proposed:**

Do the refusal INSIDE the seam, and fix the document instead of the prefix.

1. REFUSE, DO NOT SANITIZE — one line, one place, `src/lib/server/storage.ts:76`. The sanitizer is the hazard: it accepts a name and launders it. Replace it with a shape check that throws:

   const KEY_HINT_RE = /^[A-Za-z0-9_-]{1,64}(?:\/[A-Za-z0-9_-]{1,64}){0,2}$/;
   if (!KEY_HINT_RE.test(keyHint)) throw new Error("putKycDocument: keyHint must be opaque ids and slot enums only — a name or phone in an object key is PII with no erasure path (audit F-11b).");

   Verified compatible with all three live callers: `usr_xxx/NIDA_FRONT`, `usr_xxx/extra_req_xxx` and the migration's `unknown/DOC` all pass. Put it AFTER the `assertStorageModeIntended()` call and after the inline early-return check ordering that kyc-cert-d2.test.mts:157 pins, so that guard stays green. This is one source of truth: it covers the agent flow, and every caller after it, without any guard author remembering to list a file.

2. THE CONTROL MUST GO RED, AND SO MUST ITS TWIN. In the agent programme's own guard, drive the real function twice — (a) `putKycDocument(validDataUrl, "app_123/John Doe")` must THROW, and (b) `putKycDocument(validDataUrl, "usr_abc/REFEREE_ID_1")` must NOT. Without (b) the guard is satisfied by a validator that refuses everything, which is the exact failure mode LIVE-QA-CAMPAIGN records for the underage check. Run both in inline mode by asserting on a pure `assertKeyHint` export rather than the upload, so no R2 is needed.

3. NAME THE HINT IN THE PLAN so the implementer has nothing to invent: `${applicationId}/${AgentDocSlot}` with `AgentDocSlot` the same enum shape as `KycDocSlot` — CV, REQUEST_LETTER, MTAA_LETTER, REFEREE_LETTER_1, REFEREE_ID_1, REFEREE_LETTER_2, REFEREE_ID_2, FEE_RECEIPT. Note the applicationId, not the userId: the application is the erasure unit here, and the referee documents belong to the application rather than to any platform user.

4. DROP THE PREFIX CHANGE. Fix the document, which is where the real gap is. AGENT-PROGRAMME.md contains ZERO occurrences of "retention", "erasure", "delete" or "PDPA" — I grepped it. Add a row to DATA-RETENTION.md §1 for agent-application documents naming the store (R2 `50pick-kyc`, the same bucket), their clock, and their erasure path, and cross-reference it from AGENT-PROGRAMME.md. That answers the auditor's question truthfully; a prefix rename does not.

5. THE BIGGER SIBLING, WORTH RAISING SEPARATELY. `erasure.ts:281-317` walks only `db.kyc`'s `documents` and `extraRequests`. Agent application documents on a new table have NO erasure path at all — the sweep will report success while seven documents per applicant, including two THIRD-PARTY referees' national IDs, sit in R2 forever. That is the same shape as the defect storage.ts:100-115 was written to prevent, and it is a larger hole than the key name. The agent build must extend the erasure sweep (or its table must be added to §8's store list) in the SAME release that creates the table.

---

## Visual & UX — 4 confirmed

> ⚠️ **Under-verified** — this dimension lost verifiers to a session limit. Treat as leads.

### 🔴 The `50PICK-AG-[ID]` code cannot survive the registration path — both halves truncate at 16 chars

**Severity** critical · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

`src/app/auth/register/page.tsx:51` does `(sp.ref ?? "").trim().slice(0, 16)` and `src/app/auth/register/actions.ts:20` repeats `.slice(0, 16)` on the posted field. That 16 was sized for the existing player code, which `genCode` caps at 12 chars (`affiliate-service.ts:84`). The mandated format `50PICK-AG-` is already 10 characters, leaving six for the ID — a cuid ID (the shape every other model uses) makes the code 35 chars. The failure is silent and total: the truncated code misses `db.affiliate.findByCode` (`prisma-dal.ts:1673`), so `resolveReferralPreview` returns null → the register page renders NO ribbon and NO 'Verified 50pick Agent' badge, the hidden `ref` input is never emitted (`page.tsx:194` is inside `{referral && …}`), and `bindRecruit` is never even called. The agent's link looks perfect, the recruit registers, and nothing binds. Every downstream surface (sub-ledger, commission, /admin/affiliate) is then correctly empty, so nothing goes red.

**Evidence** — src/app/auth/register/page.tsx:51 `const refCode = (sp.ref ?? "").trim().slice(0, 16);` · src/app/auth/register/actions.ts:20 same slice · src/lib/server/affiliate-service.ts:84 `code = (code.slice(0, 5) + extra).slice(0, 12)`

**Proposed handling** — Fix the ID shape and the slices in the same commit: pick a short, collision-checked numeric/base32 ID so `50PICK-AG-XXXXXX` fits, AND widen both slices to the real max code length with a named constant (`MAX_REFERRAL_CODE_LEN`) imported by page, action and minter. Add a guard asserting `mintAgentCode()` output length <= that constant, with a red harness that lengthens the format and must fail. Drive it live: register a second browser through an agent link and assert the ribbon renders AND `recruitedBy` is written — not just that the page loaded.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the guard and the live drive; change the semantics and add the two surfaces.

1. Stop truncating a lookup key. Replace both `.slice(0, 16)` calls with a defensive length CHECK, not a mutation: read the raw param, and if it exceeds `MAX_REFERRAL_CODE_LEN` treat it as absent (`refCode = ""`) rather than as a shorter code. An over-length input must resolve to "no code", never to somebody else's code. That closes the permanent-mis-bind path (`affiliate-service.ts:251/263`: `recruitedBy` is written once and never re-attributed), which widening the slice leaves open. Set the constant generously (64) so the format can grow without a second commit touching `page.tsx` and `actions.ts` again — the whole point of naming it.

2. Put the constant in `src/lib/server/affiliate-service.ts` next to `genCode`/`CODE_ALPHABET`, exported, and import it in `page.tsx:51`, `actions.ts:20` and the new `mintAgentCode`. One source of truth for the length, same rule as a rate. Do NOT also size the agent ID to squeeze under a legacy 16 — that re-hardcodes the coupling the constant exists to remove, and leaves zero headroom the next time management specifies a format.

3. Enforce at the WRITE, not only in a test. `mintAgentCode()` should refuse to return a code longer than `MAX_REFERRAL_CODE_LEN` (throw, not clamp — a clamped mint is a duplicate-code risk against the `@unique` column at `prisma/schema.prisma:844`). Collision-check the minted code with the same `while (await db.affiliate.findByCode(code))` loop `ensureAffiliateAccount` already uses (`affiliate-service.ts:70-85`), and make agent IDs FIXED-WIDTH from `CODE_ALPHABET` — variable-width IDs are what make prefix collisions expressible at all.

4. Both DAL backends. The memory DAL's `affiliate.findByCode` must uppercase-and-exact-match identically to `prisma-dal.ts:1672-1674`, or the guard passes in memory and the product misses in Postgres.

5. The red control the finding asks for is right, but point it at the real failure: the harness must mint a code one character over the constant and assert `mintAgentCode` THROWS, and separately assert that `/auth/register?ref=<code + "X">` renders NO ribbon and binds NOTHING — i.e. that over-length degrades to absent, not to a prefix match. A test that only lengthens the format and watches a slice truncate is asserting the bug.

6. Add the surface check this dimension exists for, which the proposal omits. `page.tsx:196-207` renders the code in a single-line `<Input readOnly mono prefix="REF">`. `src/app/profile/invite/invite-client.tsx:8-25` records the measured production incident on exactly this pattern — scrollWidth 454 vs clientWidth 255 at 393px, "44% of the link was unreachable, and the hidden 44% was the `?ref=` code", clipped silently under `overflow: hidden` so no overflow check could see it. A 16-plus-char mono agent code behind a `REF` prefix is materially wider than the `QAFLC8R2` that field was sized for. Measure `scrollWidth` vs `clientWidth` at 360/393px on the register field AND on the agent's own `/profile/invite` share link, and apply the fix that file already ruled correct (a self-sizing `<textarea readOnly>` with a ResizeObserver) rather than a class change — the comment is explicit that a single-line `<input>` cannot wrap, so no styling fixes it.

7. Drive it live as proposed, but assert the database, not the pixels alone: register a second browser through a real approved agent's link and assert the ribbon renders AND `User.recruitedBy` holds that agent's id AND the `programme` stamp is `AGENT`. A page that loaded is not a bind.

**⭐ A verifier disagreed with that handling and proposed:**

Fix the primitive, not the number — and make the control a round trip.

1. ONE normalizer, exported from src/lib/server/affiliate-service.ts beside genCode (the existing single source of truth for code shape):

   export const MAX_REFERRAL_CODE_LEN = 32;
   export function normalizeReferralCode(raw: string | null | undefined): string | null {
     const s = (raw ?? "").trim().toUpperCase();
     if (!s || s.length > MAX_REFERRAL_CODE_LEN) return null;   // REFUSE, never truncate
     if (!/^(?:50PICK-AG-[A-Z2-9]{4,12}|[A-Z2-9]{6,12})$/.test(s)) return null;
     return s;
   }

   It returns null rather than a shortened string, so an over-long or malformed input becomes "no code" (the already-handled unknown-code path) instead of a different code that misses the index. The length bound survives as DoS protection, but it refuses instead of mangling.

2. Replace BOTH slices with it: page.tsx:51 becomes `const refCode = normalizeReferralCode(sp.ref);` (and `refCode ? await resolveReferralPreview(refCode) : null` still works, as does the `refCode.toUpperCase()` display at page.tsx:199 — now redundant, since normalizing at the edge also removes the mixed-case hidden-input inconsistency against prisma-dal.ts:1673's uppercase lookup). actions.ts:20 becomes `const referralCode = normalizeReferralCode(formData.get("ref")?.toString()) ?? undefined;`. Do the same for the `invite` slice at page.tsx:62 / actions.ts:21 in the same commit if the grammar permits — it is the same defect at 24 chars.

3. Do NOT constrain the ID to fit 16. Mint the agent code with the EXISTING mechanism: `"50PICK-AG-" + <8 chars from CODE_ALPHABET>` reusing affiliate-service.ts's ambiguity-free alphabet and the same findByCode collision-retry loop as ensureAffiliateAccount (affiliate-service.ts:68-85). 32^8 with a uniqueness check is ample, and it stays legible in a WhatsApp share, which is the doc's stated reason for the format (AGENT-PROGRAMME.md:184-186). It must NOT be AffiliateAgent.id (a cuid) — a minted, collision-checked code is what the unique index and every share surface expect.

4. Replace the length assertion with a ROUND-TRIP control, which is the only kind that can go red for the real reason. In the new agent-application-security suite: mint a real agent code via approveAgent, then push it through the exact edge function the page and action use, and assert the account comes back —
     const minted = (await approveAgent(...)).code;
     const atEdge = normalizeReferralCode(minted);
     expect(atEdge).not.toBeNull();
     expect((await db.affiliate.findByCode(atEdge!))?.userId).toBe(agentUserId);
   Run it against BOTH DAL backends (memory and Prisma), per AGENT-PROGRAMME.md §10 — findByCode exists in each.

   RED HARNESS that must actually fail: restore `.slice(0, 16)` inside normalizeReferralCode (or lengthen the prefix) and the round trip must go red. Unlike a length assertion, this also goes red for any FUTURE edge that mangles a code — the /profile/invite QR, the share link at src/components/markets/position-share.tsx:52, or a new shortlink route — because it tests minter-to-lookup, not a constant against itself.

5. Keep the live drive at SESSION-PROMPT-AGENT-BUILD.md:147-148, but strengthen its assertion as the finder rightly says: assert the ribbon renders AND that User.recruitedBy is actually written with programme=AGENT, not merely that the page loaded. A rendered badge with no bind is the exact state this bug produces one layer down.

---

### 🔴 `inviteStateFor` keys on ROLE alone, so a DEACTIVATED agent keeps every entry point and every solicitation

**Severity** critical · **Kind** gap · **unanimous** · ⭐ **FIX DISPUTED**

`src/lib/feature-state.ts:98` is `return role === "AGENT" ? "ACTIVE" : state;` — it never consults `approvedAt` or `active`. `affiliate-service.ts:275` already records the limit ('Role is the test available today. `AffiliateAgent.approvedAt` / `.active` arrive with the agent-application service; when they do, this predicate gains them'), but the build prompt's §3 only widens `rateFor`. So `deactivateAgent` flips a boolean nobody reads: the deactivated agent still gets the 'Invite' row in More (`bottom-nav.tsx:82-83`), the Invite & Earn card on /profile (`profile/page.tsx:285`), and the full /profile/invite page with code, QR, share link and a gold 'Share with friends' CTA (`profile/invite/page.tsx:365-376`) — actively recruiting players for a relationship we terminated. Conversely, if the build instead reverts the role to PLAYER, the page 404s and the agent loses sight of commission they earned but have not withdrawn.

**Evidence** — src/lib/feature-state.ts:95-104 · src/lib/server/affiliate-service.ts:272-277 (the comment naming the missing inputs) · src/components/layout/app-shell.tsx:183 `inviteIsLiveFor(viewerRole)`

**Proposed handling** — Widen the seam once, in the same commit as `deactivateAgent`: `inviteStateFor(role, agent)` taking `{approvedAt, active}`, resolved server-side in `app-shell.tsx:183` and threaded down exactly as `inviteVisible` already is. Specify the deactivated view explicitly — history and unwithdrawn balance stay visible and read-only; code, QR, share link and CTA are gone; a stated reason line replaces them. Keep the role AGENT (so `/profile/invite` still resolves) rather than reverting it. Guard with a red harness that sets `active=false` and must make the share CTA disappear.

**⭐ A verifier disagreed with that handling and proposed:**

Decide it in the authority first, then land it as TWO predicates, not one widened boolean, in the same commit as `deactivateAgent`.

1. AUTHORITY (docs/AGENT-PROGRAMME.md §2, and RULES.md §2.10 in the full Decided / Enforced in / Configured in / Stated to / Guarded by form). Add the state the framework and the doc both omit — call it SUSPENDED — and state its six consequences explicitly, because each is a separate code path: the code stops binding new recruits; accrual stops at the next event; already-accrued cash stays in the wallet and stays withdrawable; the sub-ledger and history stay visible read-only; the role stays AGENT; reinstatement is an officer action. Without this, a developer settles a commercial question inside a predicate. Note this also fills a hole the prompt's §7 doc list does not mention.

2. SPLIT THE SEAM in feature-state.ts, because "may I be offered this?" and "may I open this page?" are different questions and the file's own header says so:
   - `inviteOfferFor(role, agent)` — required second arg `{ approvedAt: Date | null; active: boolean } | null`. Governs everything that SOLICITS: bottom-nav row, profile card, the code at invite:248, the QR at :251-254, the #referral-share block at :261, the empty-state CTA at :366-375, and the register ribbon at affiliate-service.ts:165. Goes false on `active === false` or `approvedAt == null`.
   - `inviteLedgerVisibleFor(role, agent)` — true for any AGENT who has ever been approved, active or not. This alone replaces the `notFound()` at invite:130, so a suspended agent still reaches their history and unwithdrawn total. Keep the role AGENT; do not revert it.
   Make BOTH second args required so `tsc` surfaces all eight existing call sites — the same reason invite-feature.ts was deleted rather than shimmed.

3. THE MONEY READS ARE PART OF THIS COMMIT, not a follow-up. affiliate-service.ts:280 (bindRecruit) already holds the affiliate row from `db.affiliate.findByCode(code)` a few lines above — pass it straight in, no extra query. :369 (referrerMayEarn) and :165 (ribbon) fetch only the user today and each needs the agent row; keep it as ONE resolver so, per the file's own warning at :275, "may refer" never grows a second definition. Per-settlement cost is one indexed read on AffiliateAgent.userId.

4. THE VIEW. Suspended agents get: totals, recruit list, reward history, unwithdrawn balance, and one i18n'd line (en/sw/zh) saying the relationship is closed and support is the route back. Never render an officer's free-text reason to the agent. No code, no QR, no link, no share CTA, no "new" badge.

5. CONTROLS THAT MUST GO RED — the finder's single control is not decisive:
   - active=false → the share block, code and QR are ABSENT from the rendered body. (Red control: revert the gate, assert it comes back.)
   - active=false → /profile/invite still returns 200 AND the body still contains the earnings total and recruit rows. This is the control that separates "suspended correctly" from "404'd", which the proposed harness cannot see.
   - active=false → bindRecruit returns `referrer_not_eligible` and writes the existing `affiliate.bind.refused_withdrawn` audit; and onRecruitSettlement writes NO ReferralReward row. Both need the paired positive control (active=true, same fixture, pays) or they pass whenever the reward path is broken for any reason — the exact failure BONUS-WITHDRAWAL.md:150-160 records for §5d.
   - Extend scripts/withdrawn-features.test.mts §1 positionally, since it already asserts `inviteIsLiveFor("AGENT")` at :49 and that assertion becomes wrong on the day `active` matters.
   - Both DAL backends plus the DATA-LAYER.md entity map, or memory and Prisma disagree on `active`.

**⭐ A verifier disagreed with that handling and proposed:**

Keep the spine (one seam, role stays AGENT), and fix four things:

1. DECIDE IT IN THE AUTHORITY FIRST, in the same commit. `docs/AGENT-PROGRAMME.md` §2's state table has no deactivated state; add one — `active=false` with `deactivatedAt` + a categorised `deactivatedReason` — and state the money answer explicitly. Recommended default, consistent with §6's own invariant ("the programme is decided by the referrer's role at the moment of accrual"): deactivation stops NEW binds and NEW accrual; every shilling already credited is untouched and withdrawable, because it is already in the wallet. Reversible via reactivate. Code must not invent this.

2. MAKE THE SECOND ARGUMENT REQUIRED, not optional, and give it a name that cannot be satisfied by role: `inviteStateFor(role, seat: { approvedAt: string | null; active: boolean } | null)`. Required is the whole point — it forces the compiler to surface all eight call sites, exactly as deleting `invite-feature.ts` did. Keep `feature-state.ts` PURE and sync (no `db` import): `withdrawn-features.test.mts` §4 drives it directly and the module is imported by pages. Resolve the seat once server-side in a helper (`agentSeatFor(userId)`) that returns `null` for a non-AGENT, so the extra read only happens on AGENT sessions. In `app-shell.tsx:183` fail CLOSED on a read error — the note above that line already sets that direction.

3. THREAD IT TO THE MONEY PATHS TOO, in the same commit, or the one-seam claim is false: `affiliate-service.ts:165` (ribbon/badge), `:280` (bindRecruit), `:369` (referrerMayEarn). One exception to fail-closed: on the ACCRUAL path a seat read that FAILS must not be read as "not eligible" — settlement fires once per position, so a silent `return` loses the commission with no HELD row. Distinguish "ineligible" from "could not tell" and let the latter throw, as `recordReward`'s HELD-not-PAID discipline already does for a failed credit.

4. THE DEACTIVATED VIEW, stated precisely and without inventing a balance: code, QR, share link and the gold CTA are gone; the recruit list and lifetime-earned figure stay, read-only, with a stated reason line and a pointer to `/wallet` for the money (which is already there). Entry points — More row, /profile card, avatar menu, top bar — go with the offer.

5. GUARDS THAT ASSERT THE ARGUMENT, NOT THE CALL. In `withdrawn-features.test.mts`: (a) pure-function assertions `inviteIsLiveFor("AGENT", {approvedAt: <date>, active: false}) === false` WITH the control that must go red — `{active: true}` → true, and `{approvedAt: null, active: true}` → false; (b) tighten §8's `body.search(/\binviteIsLiveFor\s*\(/)` and §7's MARKER so a role-only call FAILS — assert the call site passes a seat, e.g. `/inviteIsLiveFor\s*\([^)]*,/`, and prove it red by deleting the second argument in the `KP_SRC` copy; (c) an accrual-level red harness: a settled position under an `active:false` agent must produce ZERO `ReferralReward` rows, with the `active:true` control paying — otherwise the test is passing on a config that could not pay either way.

---

### 🟠 The agent's own dashboard tells them their withdrawable cash carries a wagering requirement and an expiry

**Severity** high · **Kind** visual · **unanimous** · ⭐ **FIX DISPUTED**

`src/app/profile/invite/page.tsx:326-341` renders a 'Bonus requirements' panel listing `inviteReqWager` — interpolated with `bonusCfg.defaultWagerMultiplier` read at line 136 from the WITHDRAWN bonus config — plus `inviteReqExpiry` and `inviteReqDeposit`. Decision 6 is that agent commission is real, withdrawable cash with no wagering requirement and no bonus wallet. The prompt's §4 says only 'extend for an AGENT with their rate and, while pending, their application status' — it never removes this panel. So the first thing an approved agent reads on their dashboard is a false money statement about their own earnings, sourced from a programme that does not apply to them. The hero has the same defect: `s.promises` (`affiliate-service.ts:661-690`) is generated entirely from the PLAYER promo config, so an agent's hero advertises 'Earn 5% of your friends' fees for N months' — the player rate and the player window — which is the visual twin of leaks 3 and 4 and will still be wrong after those are fixed in the accrual path.

**Evidence** — src/app/profile/invite/page.tsx:136,326-341 · src/lib/server/affiliate-service.ts:661-690

**Proposed handling** — Fork the page's content by programme, not just its numbers: for an AGENT render an agent requirements panel (KYC approved, fee reconciled, commission on collected operator fee, withdrawable, 1.5% withdrawal fee per RULES.md §2.7) and build the hero promise line from the agent's OWN `commissionPct`, never from `getAffiliateConfig()`. Assert in the agent-application-security suite that the rendered agent view contains no wagering-multiple and no expiry copy, with a control asserting the PLAYER view still would if the promo returns.

**⭐ A verifier disagreed with that handling and proposed:**

Same defect, but do not fix it the proposed way — hand-writing a static agent panel that asserts "withdrawable, no wagering" while `creditWallet` still reads the global bonus config produces a false statement in the OTHER direction, promising withdrawability the ledger does not deliver. That is strictly worse than today's copy.

1. ORDER IT AFTER LEAK 1. The destination resolver comes first, then the copy. Non-negotiable sequencing: programme-aware destination helper -> `creditWallet` -> summary -> view.

2. NO MONEY COPY IS COMPUTED IN THE VIEW. Extend `getPlayerReferralSummary` (`affiliate-service.ts:641`) to return a `policy` object from the SAME resolver that fixes leaks 1/3/4: `{ programme, ratePct, windowMonths: number|null, capPerRecruitTzs: number|null, destination: "CASH"|"BONUS", wagerMultiple: number|null, expiryDays: number|null }`. `destination`/`wagerMultiple`/`expiryDays` must come from the exact helper `creditWallet` consults, so the page structurally cannot state terms the credit path will not impose. This is the platform's one-source-of-truth-for-rates convention applied to terms as well as numbers.

3. RENDER THE PANEL FROM `policy`, DON'T FORK IT. `page.tsx:326-341` becomes a list driven by `policy`: the wager line and the expiry line render only when `destination === "BONUS"`; the heading keys off destination too ("Bonus requirements" vs "How you're paid"), as does `inviteReqSequential` (`:339`) which the finding missed. Delete `getBonusConfig()` from `page.tsx:136` entirely — the page should not be able to read the bonus config. In the same pass, interpolate the expiry days (`i18n-dict.ts:1302/3134/4848` hardcode 30) so the player branch stops drifting from `defaultExpiryDays`.

4. HERO: NEW SENTENCE, NOT A SUBSTITUTION. Build `promises` for AGENT inside `getPlayerReferralSummary`, not on the page, and use a sentence with NO window clause — `AGENT-PROGRAMME.md:122-123` defines a rate and a ceiling only. Substituting `commissionPct` into the existing `affiliate-service.ts:665` string keeps `${cfg.commission.windowMonths} months` and ships a false term wearing a true rate. Same for the `programEnabled` chip (`page.tsx:172`) and the paused banner (`:220-234`), both driven by `cfg.enabled` — an agent must not see "Paused" because a growth officer switched the player promo off (leak 2's visual twin).

5. WITHDRAWAL FEE: 1.5% is right (`docs/RULES.md:293`, §2.7) but source it from the withdrawal-fee constant, not a typed literal. `RULES.md:459` records a legal page that shipped 1% as static text.

6. THE TEST MUST NOT BE STRING-ABSENCE ALONE. "The agent view contains no wagering-multiple" passes on a blank render — and `BONUS-WITHDRAWAL.md` §6 records exactly that failure: a control that "passes whenever the reward path is broken for any reason at all". So pin a POSITIVE assertion in the same case (the agent panel rendered, and states the agent's own rate) alongside the absence assertions, in all three locales; assert on the server summary too (`policy.destination === "CASH"`, `wagerMultiple === null`). The red control is the PLAYER render under `FEATURE_INVITE=ACTIVE` with the promo returning, which MUST show the wagering and expiry lines — and it must be proven red by neutralising the fork, not by inspection.

---

### 🟠 An agent's dashboard reads 'Paused' and shows an amber warning when a GROWTH officer pauses the PLAYER promo

**Severity** high · **Kind** visual · **unanimous** · ⭐ **FIX DISPUTED**

`profile/invite/page.tsx:174` renders `<Chip variant={s.programEnabled ? "active" : "paused"}>` and lines 221-234 render an amber `programPaused` banner, both driven by `s.programEnabled`, which is `cfg.enabled` from the player affiliate config (`affiliate-service.ts:697`). This is the display-layer half of known leak 2 and it survives the fix to the accrual hooks: even after `onRecruitSettlement` stops returning early on `!cfg.enabled`, a growth officer toggling the player promo off still paints a paying agent's dashboard 'Paused' with a warning banner. An agent who has paid TZS 100,000 and is earning is told their programme is stopped, on the same screen that is paying them.

**Evidence** — src/app/profile/invite/page.tsx:174,221-234 · src/lib/server/affiliate-service.ts:697 `programEnabled: cfg.enabled`

**Proposed handling** — Make `getPlayerReferralSummary` return `programmeEnabled` resolved per programme — for an AGENT, the agent's own `active`/`approvedAt`, never `cfg.enabled`. Add it to the same red harness that proves leak 2: turn the player promo off, drive /profile/invite as an agent, assert the chip reads Active and the banner is absent, with a control that a player-programme viewer DOES see paused when the promo returns.

**⭐ A verifier disagreed with that handling and proposed:**

Do not patch the boolean in the view. Add ONE resolver in src/lib/server/affiliate-service.ts — `earningStateFor(userId): { programme, enabled, rate, windowMonths, caps }` where AGENT resolves from the agent's own row (`approvedAt != null && active`, `commissionPct`, per-agent caps) and PLAYER from `cfg` — and consume it in BOTH places: replace the `!cfg.enabled` early returns at affiliate-service.ts:497, :612 and the `cfg.commission.enabled && cfg.commission.rate > 0` gate at :548 (that is leak 2's fix), and have `getPlayerReferralSummary` (:642-701) return `programmeEnabled: st.enabled` AND build `promises` (:661-686) from `st` rather than `cfg.commission.*`. Rename the returned field off `programEnabled` so the compiler surfaces all three call sites. This closes the fix's blind spot: the proposal leaves affiliate-service.ts:665 rendering "Earn {cfg.commission.rate*100}% of your friends' fees for {cfg.commission.windowMonths} months" — the PLAYER rate (50%/24mo by default, affiliate-config.ts:83) — in the hero of an agent paid a different rate, and with `commission.enabled:false` by default the agent's hero carries no promise line at all. Leave page.tsx:174 and 221-234 untouched; only their input changes (feature-state.ts: server computes, clients receive). Red harness: as an approved AGENT with the player promo switched off, assert chip "Active" and no amber banner and the promise line quoting the AGENT's rate — with two controls that must go red: a PLAYER viewer with the player programme re-enabled DOES see Paused + banner, and an agent with `active:false` (schema.prisma:849) DOES see Paused (today that agent sees "Active" plus a live code, link and QR). Anchor in test:red-anchors, since page.tsx:174 becomes a quoted source line.

---

## Raised and REJECTED by verification — 64

Kept deliberately: a rejected finding records ground already checked, so the next
session does not re-investigate it. Rejected means a verifier read the code and found
the claim speculative, already handled, or unreachable.

- **`programme` is specified as stamped at bind in one place and decided at accrual in another, inside the same authority** *(lifecycle-scenarios)*
- **The flat PRIZE is still live for agents: 10,000 TZS cash per recruit, 200,000 per agent, unlinked to any revenue** *(money-adversarial)*
- **Commission accrual is gated on the GLOBAL rate before the per-agent rate is ever consulted — `rateFor` cannot rescue it** *(money-adversarial)*
- **The commission ceiling is priced on the gross fee, but 15% of that fee is already the state's** *(money-adversarial)*
- **Deactivating an agent does not stop paying them** *(money-adversarial)*
- **Every user already has an AffiliateAgent row with a 5% rate nobody chose** *(money-adversarial)*
- **The planned clawback guards a path this platform cannot reach, and the ledger could not identify the rows anyway** *(money-adversarial)*
- **The only automated anti-collusion control in the engine is dead code and has never fired** *(money-adversarial)*
- **Agent commission is booked as BONUS_CREDIT — and the two owner-facing money reports then disagree about it in opposite directions** *(money-adversarial)*
- **A self-excluded agent's commercial earnings silently become unrecoverable HELD debt** *(money-adversarial)*
- **A resumed settlement pays commission on a subset of positions, permanently, with no replay and no idempotency key** *(money-adversarial)*
- **The `50PICK-AG-[ID]` code will not survive the referral-code intake: it is truncated to 16 characters and fails silently on both sides** *(money-adversarial)*
- **Commission rounds half-up per position on an unrounded float, so the sub-ledger can never reconcile against the fee book** *(money-adversarial)*
- **`totalEarnedTzs` is a read-modify-write that races — the fix was already applied to its sibling counter** *(money-adversarial)*
- **A per-agent cap cannot be enforced under the per-recruit lock — payPrize already learned this** *(money-adversarial)*
- **The registration fee has no idempotence: the reference is user-typed, the receipt is unfingerprinted, and refundFee has no stated preconditions** *(money-adversarial)*
- **Approval retro-activates a pre-built downline the applicant assembled before the programme existed** *(money-adversarial)*
- **Rotating the agent's code at approval silently breaks every link already shared under the old code** *(reenablement-matrix)*
- **ADDITIONAL_INFO_REQUIRED has no specified exit — an applicant who paid TZS 100,000 can be frozen there** *(visual-ux)*
- **/admin/agents built on `AffiliateAgent` would list every player on the platform as an active agent at 5%** *(visual-ux)*
- **No door back to their own application for a signed-in applicant — 'no solicitation' has been read as 'no servicing'** *(visual-ux)*
- **`qa:withdrawal-visual` cannot see a single agent surface — reusing it would be a green run over the wrong population** *(visual-ux)*
- **The `50PICK-AG-` code overflows the share card it is rendered in at 360** *(visual-ux)*
- **'Copy the KYC workstation pattern' ships a vanishing toast for a role grant, against CLAUDE.md's OperationResultModal rule** *(visual-ux)*
- **/agent/status must not fabricate 'you have no application' on a degraded read — the B-1 defect, on a TZS 100,000 receipt** *(visual-ux)*
- **Adding `/agent` to PROTECTED_PREFIXES kills the public discovery door — the matcher is a prefix match** *(visual-ux)*
- **'PAYMENT_PENDING' and 'KYC_SUBMITTED' are the wrong words for the person reading them** *(visual-ux)*
- **The new statuses have no entry in STATUS_TONE — the file that exists precisely to stop badge colour drifting** *(visual-ux)*
- **Two multi-column grids break on the 'linked from the footer + a support link' instruction** *(visual-ux)*
- **An agent gets an odd number of setting rows, leaving a lonely card in the two-column grid** *(visual-ux)*
- **The commission line in an agent's own wallet is a hardcoded English string the i18n guard cannot see** *(visual-ux)*
- **The fee amount and the Selcom account number have no home in code, and the trilingual copy will trip the parity guard** *(visual-ux)*
- **prisma-dal.affiliate.update() silently discards every field it does not whitelist — the officer's rate will not persist in production** *(integration-conflicts)*
- **ReferralReward.programme / rateApplied will be written by the memory DAL and defaulted by Prisma — the ledger column that separates agent from player spend is the one most likely to be wrong** *(integration-conflicts)*
- **`db` is a blind cast, so a DAL method added to only one backend is a runtime crash, never a compile error — and no parity guard exists** *(integration-conflicts)*
- **Dropping `tier` is a CONTRACT migration shipped into a 60-second rolling overlap — the old container will SELECT a column that no longer exists** *(integration-conflicts)*
- **Approving an agent retroactively deletes that person's whole history from every funnel, cohort and retention figure** *(integration-conflicts)*
- **Commission paid to agents will not appear anywhere in the owner's house book, and will show in every player-facing and admin ledger as BONUS_CREDIT** *(integration-conflicts)*
- **`recordReward` does a read-modify-write on `totalEarnedTzs` — the lost update this repo already fixed for recruitCount** *(integration-conflicts)*
- **Two role-change paths that do not know about each other: /admin/staff can strip AGENT with no agent-side effect, and deactivateAgent leaves role=AGENT earning** *(integration-conflicts)*
- **Nothing re-checks an agent's identity, status or eligibility after approval — the vetting is a point-in-time snapshot** *(integration-conflicts)*
- **The RG cash-incentive gate will silently convert a business partner's commission into an unpayable HELD row** *(integration-conflicts)*
- **An agent sub-ledger is a shape the READ_TIERS axis cannot represent — a non-staff account reading other named players' money and activity** *(integration-conflicts)*
- **/profile/invite is player-promo-shaped: it will show an earning agent a 'Paused' chip and it is structurally EN+SW only** *(integration-conflicts)*
- **Two comms gates will go red on literals the build must edit, and one demands Chinese in officer messages the programme says are English-only** *(integration-conflicts)*
- **verified-fixtures.mts auto-approves AGENT and PLAYER through a process-global wrap — the exact population the agent refusal tests must not have** *(integration-conflicts)*
- **J4's certification exit demands seven affiliate orphans be adopted or deleted, and the build plan never mentions them — while every new scripts/ file is auto-enrolled into CI** *(integration-conflicts)*
- **"Reconciled against the Selcom statement" names a document this platform cannot produce** *(operational)*
- **A unique feeReference is the only automated fee control, and it is a string the applicant types** *(operational)*
- **Two ways an agent's commission fails, and neither has an operator path** *(operational)*
- **The officer's decision screen has none of the derived signals the KYC workstation gives them** *(operational)*
- **Referee collusion is undetectable by construction — the strongest fraud signal in the scheme is stored only as images** *(operational)*
- **SUPPORT — the desk the programme itself points people at — can see nothing about it** *(operational)*
- **The sub-ledger's headline numbers are computed off the newest 1,000 rewards and labelled "all-time"** *(operational)*
- **"Turnover" and "revenue generated" in the agent sub-ledger are not derivable from what the plan stores** *(operational)*
- **Two disjoint roles are each given a way to change an agent's pay** *(operational)*
- **The growth domain may not read money figures, and the sub-ledger is money figures** *(operational)*
- **The officer's half of the verification can only be driven as ADMIN, which bypasses every gate the plan specifies** *(operational)*
- **At 50 applications a week there is no claim, no SLA, no count, and the natural home for the queue contradicts its own header** *(operational)*
- **"Request more info" will land as one free-text note against seven documents plus a receipt** *(operational)*
- **Nothing looks at an application that was paid for and never submitted** *(operational)*
- **The DSAR bundle will not contain the agent application, its seven documents, or the commission ledger** *(operational)*
- **The page the sub-ledger is being built on does an N+1 user lookup over every affiliate account and every ledger row** *(operational)*
- **The new guards are never added to `predeploy` — "a gate not in the pipeline is not a gate"** *(plan-quality)*
