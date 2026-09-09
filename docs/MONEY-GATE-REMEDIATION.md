# MONEY GATE REMEDIATION — the pre-launch money audit

> 🟢 **THIS FILE IS THE AUTHORITY AND THE HANDOVER for the money-gate programme.**
> Opened 2026-09-08. Branch `money-gate-remediation`, worktree `C:\kipindi-money`.
> The money LAW is [`RULES.md`](RULES.md) — this file never restates a rate, it records
> what was found, what was fixed, and what is still open.
>
> ⛔ **§3 is a list of LEADS, not a list of defects.** Read §0 before believing any row in it.

---

---

## ⚑ STATE OF THIS PROGRAMME — read this before anything else

**Last touched: 2026-09-09, session 2. Everything below is LIVE on `main` and deployed.**

⛔ **THE PROGRAMME IS NOT FINISHED, AND "MONEY IS SAFE" IS NOT A CONCLUSION ANYONE HAS EARNED
YET.** Do not read the ✅ rows below as a launch verdict. What is done is *these six things*;
what is open is most of the surface.

| | |
|---|---|
| **Session 2 work** | ✅ **DONE and SHIPPED** — eleven defects fixed, each verified, each guarded RED |
| **`money-out` lane** | ✅ **AUDITED ONCE** (first pass ever). 18 finder lanes, 18/18 returned |
| **The 35 HIGH findings** | 🔴 **none verified** — the next batch, and the largest block left |
| **Adversarial verify pass** | 🟠 **15 of 106 findings verified.** 91 remain UNVERIFIED |
| **Blockers** | ✅ **ALL 13 ADJUDICATED — 8 fixed · 5 refuted · 0 unverified** |
| **Ali's four decisions (§4)** | 🔴 **all four still open** |
| **Production reads (§4.3)** | 🔴 **not done** — `PAYMENT_AGGREGATOR`, `agent.config` |
| **`e2e:money` against real Postgres** | 🔴 **never run this session** — the behavioural proof for §6.2/§6.9 |

### What shipped, in order

| commit | what |
|---|---|
| `81ea5b3b` | §6.1 the levy split · §6.2 the withdrawal hold · docs · 106 findings recorded |
| `1ab89cc5` | the `levy-divergence` production probe the handover names |
| `0ac97836` | §6.6 the payout callback settling an id it did not ask about |
| `639772bf` | the refund path's atomicity (`settleWithdrawalFailed`) |
| `5bd5f84e` | a red proof I rotted, and `red:levy-allocation` joining the anchor audit |
| `(this)` | §6.9 the AML phantom `providerRef` · §6.8 the verify pass that survived |

### Guards this programme owns

`test:levy-allocation` · `red:levy-allocation` · `test:lock-tx-threading` ·
`test:payout-callback-identity` · `test:aml-dispatch-window` — plus session 1's
`test:payment-control` · `red:payment-control` · `test:webhook-sec` · `red:webhook-money` ·
`test:fee-model-caption` · `red:fee-model-caption`.

### ⛔ The three ways a future session gets this wrong

1. **Reading UNVERIFIED as "cleared".** It means one lens looked and nobody voted. §0 exists
   because a previous run bucketed no-votes as *refuted*. Of the 4 findings that have now been
   through three lenses, **1 was refuted and 3 were confirmed with corrections to their stated
   cause, severity or money figure** — so both directions of error are real and neither is rare.
2. **Running the verify pass in one big batch.** 39 agents exhausted a session window and
   returned nothing; **12 completed comfortably.** The batch scripts are baked four findings at
   a time. Check `agents_done` against `agent_count` before believing any result.
3. **Treating the fixed list as the whole money surface.** `settlement-lifecycle`,
   `agent-commission`, `updown-money`, `docs-drift` and `controls-and-guards` have **still**
   never had a finder lane run against them (§0). They are unaudited, not clean.

### Where to start next session

1. `verify-blocker-0-4.js` and `verify-blocker-4-8.js` — the 8 remaining blockers, two runs.
2. Then `verify-high.js`, sliced four at a time.
3. `e2e:money` against a real Postgres.
4. Ali: the four §4 decisions and the two production reads.

## §0 · READ THIS FIRST — what "unverified" means here, and why it is not "refuted"

The audit ran as a workflow: 12 read-only finder lanes, then three independent adversarial
verifiers per finding (arithmetic · reachability-in-production · does-RULES.md-actually-say-this).

**The verify phase died twice on an account session limit.** Both times, most verifier agents
never returned a vote. The count that matters:

| Bucket | Meaning | Count |
|---|---|---|
| CONFIRMED | ≥2 independent lenses agreed it is real | **9** |
| REFUTED | ≥2 independent lenses disproved it | **2** |
| **UNVERIFIED** | **fewer than 2 votes came back — the verifier DIED, nothing was decided** | **59** |
| finder-cleared | the finder itself judged it not-a-defect and said why | 2 |

⛔ **AN EARLIER RUN OF THIS HARNESS BUCKETED NO-VOTES AS "REFUTED", AND THAT IS THE SINGLE
MOST DANGEROUS THING THIS PROGRAMME COULD HAVE INHERITED.** `votes.length > 0 && refutedCount < 2`
reports "refuted" when nobody voted at all, and `Array.every` on an empty array returns `true`.
The harness now computes `unverified = votesReturned < 2` **first** and buckets on it before any
confirmed/refuted logic runs, logs unverified counts as a WARNING, and carries them into the
report. **Any claim that the findings below were disproven is false.** They are unexamined.

⚠️ **And six lanes never ran at all** — they died before producing anything: `money-out`,
`settlement-lifecycle`, `agent-commission`, `updown-money`, `docs-drift`, `controls-and-guards`.
Their whole surface is unaudited. `money-out` is the one that matters most: withdrawals,
payouts, AML holds and the reconcile sweep have had **no** systematic pass in this programme.

**Before believing any workflow result: compare `agents_done` to `agent_count` and read the
`<failures>` block.** Run 1: 0/12 done. Run 2: 41/222 done. Run 3 (session 2): **18/18 done, 0
errors** — which is why its output could be read at all.

> ✅ **`money-out` HAS NOW HAD ITS FIRST PASS — session 2, 2026-09-09. See §6.**
> Two defects were confirmed by hand and fixed (§6.1 the levy split, §6.2 the withdrawal hold).
>
> ⛔ **AND THE UNVERIFIED BUCKET DID NOT SHRINK — IT GREW.** Session 2's own findings joined it,
> because no verify pass ran on them either. A finder is one lens. The verify pass — three
> adversarial lenses per finding, with `unverified = votesReturned < 2` computed and bucketed
> FIRST — is still the single largest piece of unfinished work in this programme.

---

## §1 · FIXED AND SHIPPED — each verified by reading the code, each with a guard proven RED

Every item below was read in full by hand before it was touched, and every guard was proven to
go RED on the pre-fix source with a positive control in the same run.

### 1.1 🔴 BLOCKER — a LIVE money rail that nobody chose resolved to the money-printing adapter

`src/lib/server/payment-control.ts` · `src/lib/server/payments.ts`

`envProvider()` folded **three** states into one return value: `PAYMENT_AGGREGATOR` set to
`mock` (a choice), **unset** (nobody chose), and set to something unrecognised — `selcomm`, a
typo in a Railway variable (a *failed* choice). All three returned `mock`. On a LIVE deployment
the last two therefore activated an adapter whose own doc comment reads *"fabricates
confirmations: deposits credit real wallets with no money received"* — with **no** typed confirm,
**no** COMPLIANCE audit and **no** banner, because every one of those guardrails lives on the
path where an officer *picks* it. The boot alarm printed *"NOTICE … deliberate operator choice"*
over an accident.

**Fixed:** resolution is tri-state (`officer` / `env` / `none`). On LIVE money with no officer
row and no recognised env value, `resolvePaymentProvider()` returns **no provider** and
`resolveActiveAdapter` refuses the dispatch — deposits and withdrawals fail `PROVIDER_DOWN`,
audited `payments.rail_unset_refused`. `getPaymentProvider()` is nullable so the compiler asks
every caller what it does when there is no rail. `/admin/payments` shows a red refusal callout.

⛔ **A CHOSEN mock still runs.** That is Ali's decision of 2026-07-24 and is untouched.
⛔ **The boot check deliberately does not throw** — the gate is on the money path. Throwing would
take down betting and settlement over a payment misconfiguration; the C7 outage was exactly that.

Guards `npm run test:payment-control` **61/0** · `npm run red:payment-control` **7/7**, including
two over-corrections (refusing a *chosen* mock; refusing in TEST) so the fix cannot drift into
reversing the owner decision or breaking every developer machine.

### 1.2 🔴 The three config hydrations raised their "done" flag BEFORE the await

`market-config.ts` · `updown-config.ts` · `payment-ops.ts` · `payment-control.ts`

`loadConfig` never throws — it logs and returns `null`. With the flag set on the line *before*
the `await`, one transient DB error at first read (a Postgres failover, pool exhaustion at boot,
a Railway migration) pinned that container on **code defaults for its entire life**, with no
retry, and a concurrent caller arriving during the read hit the same thing with no error at all.

Consequences, which are not cosmetic:
- a market created in that window **freezes those defaults into its immutable `feeSnapshot`** and
  settles by them for ever (RULES §2.1 — a snapshot is never rewritten);
- `persist()` writes the whole snapshot, so the next unrelated admin save **overwrites the
  officer's live row with the defaults** — RULES §2.3's trap, running in reverse;
- on `payment-ops.ts` the **emergency kill-switch evaporated**: `isPaymentPaused()` answered
  `false` for every rail and both flows, while `/admin/payments` rendered the toggles as live.

**Fixed** in all four: the flag is raised only after the read lands, the in-flight promise is
shared, and a failure leaves the flag down so the next call retries.
⚠️ **The kill-switch still fails OPEN on an unreadable map** — see §4.1; that direction is Ali's
call, not an engineering default. Removing the *permanence* is what closed the blocker.

Guard `test:payment-control` §H asserts the ordering on the source with a positive control
(the pre-fix shape must be rejected); `red:payment-control` mutation 7 proves it.

### 1.3 🔴 Selcom could be settled from a callback body, bypassing the order-status authority

`src/app/api/webhooks/payments/route.ts`

Routing is decided by the `Authorization: SELCOM …` scheme. A caller who simply **did not send
that header** — `X-Provider: selcom` plus an HMAC over `${timestamp}.${body}` — never reached
`handleSelcomCallback` and was settled from the body's own `status`. Every protection on that
money-in path (the authoritative signed order-status re-query, and the re-queried amount that
feeds the tamper check) lives in the handler it skipped. The exploit needs only
`SELCOM_WEBHOOK_SECRET` — a value shared with the vendor and held in a deployment variable —
plus a deposit the attacker initiated and never paid.

**Fixed:** `selcom` is no longer a generic-lane provider, and a callback naming it there is
refused before the signature check with a SECURITY audit. Costs nothing operationally: Selcom
signs with `digest`/`signed-fields`, never `X-Signature`, so such a callback could only ever
have failed the signature check anyway.

### 1.4 🔴 A chargeback of already-credited money was acked as a duplicate

`src/lib/server/wallet-service.ts` → `settlePaymentWebhook`

Every non-`PROCESSING` transaction returned `{handled: true, reason: "already-<status>"}`. Right
for a provider's at-least-once retry; wrong for a **contradiction**. `normalizeStatus` maps
`"REVERSED"` to FAILED, so a card chargeback or mobile-money reversal of a credited deposit
arrived in exactly that shape and was acked as benign — no audit, no ledger entry, nothing in
front of an officer. Repeatable, uncapped loss to the house. The mirror (a FAILED deposit later
CONFIRMED) is the player's loss.

**Fixed:** a contradicting terminal verdict raises `webhook.terminal_contradicted` (SECURITY)
plus a `payments.reconcile_needs_review` row, and returns a distinct reason.
⛔ **Nothing is clawed back automatically, deliberately** — see §4.2.

### 1.5 🔴 A deposit that tripped the amount-tamper check was stranded where nobody could see it

Same function. The refusal was correct; leaving the transaction invisible was not. It stayed
`PROCESSING` for ever — the player debited by the gateway and never credited — and the reconcile
sweep's deposit arm dropped the `handled:false` on the floor: no `leftPending`, no needs-review
row, no queue. The SECURITY row alone is a tripwire nobody stands next to.

**Fixed:** escalated once per transaction via `auditNeedsReviewOnce`, and the reconcile arm now
counts the refusal instead of discarding it.

Guards for 1.3–1.5: `npm run test:webhook-sec` **21/0** · `npm run red:webhook-money` **4/4**,
including the over-correction (refusing an honest retry, which would make the provider retry for
ever).

### 1.6 🟠 The fee simulator taught a retired law on the screen that exists to prevent exactly that

`src/app/admin/config/fee-simulator.tsx`

The first tile grid and the closing paragraph branched on `isLoserShare`; **the grid between them
did not.** Under the live model an officer read two `capped-commission` sentences beside correct
figures: *"Fee charged · min() picked the commission"* (the loser-share arm returns
`capped: false` **always** — there is no `min()` in this model) and *"Our share of the losers'
money · never exceeds 33.3%"* (quoting `feeCeilingRate`, which this model never reads; the real
share is a flat 13% of the losing side, with no ceiling).

Values right, law retired — the class RULES §2.1 already records for `/admin/updown`, and the
worse of the two lies, because an officer who checks the arithmetic finds it sound.

**Fixed** by copying the shape `/admin/markets/[id]` already had, and every rate quoted is now
`poolFee`'s own clamped `shareOfLosers`, never the raw `platformFeeRate + operatorFeeRate`.

Guard `test:fee-model-caption` §7 **RENDERS the component under both models** rather than
grepping it — §7.3 is the positive control (the same sentences must still appear under
`capped-commission`) and §7.7 renders a second rate (5%+20%) so a hardcoded *"13%"* cannot pass.
`red:fee-model-caption` **12/12**, three of them this defect verbatim.

### 1.7 🟡 Documents that contradicted the law

- `payout.ts` and `docs/SELCOM-PAYOUT-RAILS.md` both read *"1.5% in production today, not the 1%
  default"*. `DEFAULT_WITHDRAWAL_FEE_RATE` has read `0.015` since 2026-08-14 — there had been no
  1% default to contrast with, in the file that owns the arithmetic and in the payout runbook.
  **Neither states a rate now**; both point at RULES §2.7.
- `RULES.md` §6 recorded the 2026-09-07 agent decision (20%, VAT-inclusive) with **no SUPERSEDED
  marker** while §2.10 stated 10% and VAT-EXCLUSIVE — the file contradicting itself, against its
  own convention (the 2026-07-24 row carries one). Marker added, 2026-09-08 row added, and the
  ROLL-OUT STATUS table gained the agent row it never had (⏳ LANDING — three of the four amended
  numbers do not reach production on deploy if an `agent.config` row exists).
- `payments.ts`'s header claimed *"In LIVE money-mode the mock is REFUSED at dispatch"* — untrue
  since the 2026-07-24 decision removed that lock. The file that dispatches the money described a
  refusal that was not there. Corrected.
- **`AGENT_TERMS_VERSION` still read `2026-09-07` after the binding EN terms changed on
  2026-09-08** (`cc946bbb` rewrote §2's fee clause and added §3's withholding clause). The
  constant is shared by the page that prints the version and by `submitForReview`, which stamps
  it — precisely so the document read and the version recorded cannot diverge. Now `2026-09-08`.
  ⚠️ Leaves a production-data question: see §4.4.

---

## §2 · JUDGED NOT-A-DEFECT

| Claim | Why not |
|---|---|
| `payout.ts` still says "1.5% … not the 1% default" | Already corrected earlier in this same session — the finder read the fixed file. Recorded so it is not re-chased. |
| The fee simulator quotes an unclamped `platformFeeRate + operatorFeeRate` | Real in the source, **not reachable**: `market-config.ts` `validate` refuses a save where the two slices sum above `MAX_LOSER_SHARE_RATE`. Changed anyway as defence in depth, since a frozen snapshot or a hand-written config row is not bound by that form. |
| The admin form round-trips the ⅓ fee ceiling through `toFixed(1)` → 0.333 | REFUTED by 2 lenses. Do not re-open without new evidence. |
| Nested config hydration drops the affiliate prize rules' deposit requirement | REFUTED by 2 lenses. |
| Up & Down has a "third fee home" the two configs do not cover | Finder-cleared: the 16 `UpDownChain.rateProfile` rows are the documented, deliberate design (RULES §2.1), and `boardFeeSummary` reads every chain. |

---

## §3 · RAISED AND **UNVERIFIED** — leads, not facts

⛔ **Nothing here has been confirmed or disproven.** Each needs: open the file, read the whole
function, decide for yourself, and report anything that is not a defect with reasons. Line
numbers are the finder's and predate this session's edits — re-derive them.

**Highest value first — `money-out` never ran, so start there instead if time is short.**

### 3.1 CONFIRMED by ≥2 lenses, not yet fixed

| Lead | Where |
|---|---|
| `/admin/config` posts all 19 fields and `persist()` writes the whole snapshot, so the audit's `changes` cannot say which number an officer moved | `src/app/admin/config/actions.ts` |
| The config page falls back to defaults on a failed read, so an officer edits a form pre-filled with values that are not live | `src/app/admin/config/page.tsx` |
| `defineConfig`'s synchronous getter has no ready-gate — a caller can read defaults before hydration | `src/lib/server/define-config.ts` |
| The config audit entry is unreadable on `/admin/audit` | `src/app/admin/audit/page.tsx` |
| The withdrawal minimum has three homes and the player is shown the wrong one (`1,000` vs the enforced `minWithdrawalForRate` ≈ `1,016`) | `wallet-client.tsx` · `i18n-dict.ts` · `payout.ts` |

### 3.2 Money-in / transaction state machine

- An AML-approved payout may re-dispatch on a **stale providerRef** → double pay. *(blocker)*
  ⚠️ Session 2 raised this again independently as `MO-2.a` / `MO-4.a`, still UNVERIFIED. §6.3.
- The withdrawal FAILED path may not be atomic — debit and Transaction row in separate commits. *(blocker)*
  ⚠️ **The same class was CONFIRMED and FIXED on the REQUEST path (§6.2) — the FAILED path named
  here is a DIFFERENT function and is still open** (`MO-3.a` / `MO-4.b`, UNVERIFIED). Do not read
  §6.2 as closing this row.
- Rejecting an RG-held deposit in `/admin/aml` refunds nothing while the officer is told "Funds
  returned to wallet"; the `HOUSE:RG_SUSPENSE` debt is closed with no release leg.
- `creditInternal` may invent the new balance when the wallet write fails → "agent commission
  PAID" written for money that never moved.
- The card deposit return URL carries no `order_id`, so a card payer who has just been charged
  lands on *"We couldn't find that payment"*.
- CARD has **no kill-switch at all** — `MNOS` excludes it, so `isPaymentPaused("CARD", …)` can
  never be true, on the rail that carries chargeback risk.
- A phantom `PROCESSING` deposit eats the player's RG cap.
- `findByProviderRef` may drop the unique key; `settleDepositFailed` may have an unlocked TOCTOU.
- The 15s deposit fast-credit poll takes no leader lease while the 5-minute sweep beside it does.

### 3.3 Settlement, fee arithmetic and the ledger

- ~~**TRA/GBT are re-derived per winner with `Math.round` instead of the single `levySplit`, so GBT
  can book ZERO on a market that owes it.**~~ ✅ **CONFIRMED AND FIXED — see §6.1.** Verified by
  reading both functions, reproducing the arithmetic with the repo's own `allocateFeeShares`, and
  measuring production: **43 of 203** fee-bearing settlements diverge. ⛔ One correction to the
  wording above: the ZERO case is *reachable* and is driven by the new gate, but it has **not**
  occurred on production. *(was: the highest-value settlement lead — it was.)*
- The loser-share fee has **no rule-level ceiling**: 50%+50% is savable and takes 100% of every
  loser's stake with every guard green, because the winner-floor guardrail is structurally unable
  to object under this model and both guards are wired to the retired model's knob.
- The payout disclosed at selection close is `Math.round(share × netPool)` while settlement pays
  the largest-remainder floor — RULES' own production figures quote 4,828 and pay 4,827.
- `/admin/finance` recomputes the fee (and reconstructs 9% for the 58 snapshot-less markets)
  and labels it the period's **booked** commission.
- The settlement audit payload writes capped-commission fields on loser-share markets.
- `settleMarket`'s final totals are read outside the lock's transaction → audits "0 positions
  settled, TZS 0 paid".
- `repairOrphanedPositions` refunds real money with no ledger entries.
- The sub-shilling residual is stranded in market escrow, not kept by the house as `payout.ts` claims.
- **`HOUSE:TAX` is captioned "RETIRED — historical rows only" on the owner's money screens while
  the agent programme actively credits it** (18% VAT on every registration, 5% withholding on
  every accrual), and the solvency line does not subtract it — so the owner's free-cash figure
  includes money owed to the state.
- The statutory levy report derives from window GGR rather than `levySplit`.
- **No production money-invariant job exists**, and "the books are wrong" is the one money alarm
  with no delivery channel.
- Stale doc-comments in `ledger.ts` state the 1% withdrawal fee, VAT-INCLUSIVE, and retired accounts.

### 3.4 What players and officers are told

- **`/legal/terms` — the binding contract — promises an unconditional 5-minute free cancellation
  in all three languages**, a right RULES §2.6 records as unreachable by construction on Up & Down
  3- and 5-minute rounds (0 of 688 rounds ever cashed out). The in-app assistant says the same,
  and so does the `/admin/config` hint for the very setting that governs it.
- `scripts/rate-copy.test.mts` **PINS** 13% and 1.5% as literals in the terms and the chat prompt
  rather than forbidding them, while RULES §7 declares the duplicate table EMPTY.
- `docs/rates-for-admins.html` (and the PDF rendered from it) states free cancellation flat and
  states the bonus rule as live after the bonus wallet was withdrawn.
- The two `.docx` fee hand-outs state a model that never shipped; their only correction lives in a
  file their reader never opens.

---

## §4 · ONLY ALI CAN ANSWER THESE — production data or a policy decision

**4.1 · Which way should an unreadable kill-switch fail?** Today: OPEN (nothing paused). Failing
CLOSED would halt all payments on a DB blip — an outage caused by the safety mechanism. The
permanence is fixed either way; the direction is a policy call.

**4.2 · What happens on a chargeback?** Detection and escalation now exist. Automatic clawback
does not, deliberately: do we debit the player, overdraw them, and what if the cash is already
withdrawn or staked? A wrong answer written into a webhook handler becomes permanent.

**4.3 · Read these off PRODUCTION, not off this repo:**
- `PAYMENT_AGGREGATOR` on the live Railway service **must be `selcom`**, read off the LIVE
  deployment manifest. ⛔ `railway.json` is deprecated and silently ignored — do not trust a repo
  file. With the fix live, an unset value now REFUSES money rather than simulating it, so this
  check has changed from "are we minting money?" to "can we take money at all?".
- `SystemConfig["market.config"]` — fee model, platform/operator rates, TRA/GBT, stake bounds,
  withdrawal fee + gateway share.
- `SystemConfig["updown.config"]` and **every `UpDownChain.rateProfile` row** (they do not inherit).
- `SystemConfig["agent.config"]` — `/admin/agents` → Settings must read **10 · EXCLUSIVE ·
  5 working days · 5% withholding**. Three of those four do not reach production on deploy if a
  row already exists. A deploy that silently keeps the old 20% looks identical to a successful one.
- Confirm `SELCOM_WEBHOOK_SECRET` is set and the deposit webhook host is correct.

**4.4 · The agent terms stamp.** Any `AgentApplication` submitted between `cc946bbb` deploying and
this session carries `acceptedTermsVersion = "2026-09-07"` while the applicant was shown the
09-08 text (which added the withholding clause and changed the fee's VAT treatment). Read the
rows first; if any exist the acceptance record needs an officer note, **never a silent rewrite**.
Re-price any agent approved at 20%, and re-issue phone-era invitations.

**4.5 · `docs/LAUNCH-GO-NO-GO.md` still carries an unchecked "Format / rebaseline the DB, wallets
from zero"** while RULES cites production evidence that step would erase. ⛔ Not actioned here.
Resolve it with Ali before launch.

---

## §5 · HOW TO RESUME

1. `cd C:\kipindi-money` (worktree of `main`, branch `money-gate-remediation`). `git status` first
   — other sessions work in sibling worktrees and have swept uncommitted files into their own
   commits before. Never `git add -A`; stage by name.
2. Read [`RULES.md`](RULES.md) fully. It is LAW; anything disagreeing with it is the defect.
3. **Start with the `money-out` lane — it has never run.** Then the CONFIRMED-not-yet-fixed rows
   in §3.1, then the levy/GBT lead in §3.3.
4. For every item: verify by reading the whole function, decide for yourself, and report
   not-a-defects with reasons. Do not fix what you could not confirm.
5. Every guard RED first, with a positive control in the same run, and an over-correction
   mutation so the fix cannot drift into reversing a decision.
6. Update this file and `RULES.md` **in the same commit as the code**.

**Guards this programme added or extended:**
`npm run test:payment-control` · `npm run red:payment-control` ·
`npm run test:webhook-sec` · `npm run red:webhook-money` ·
`npm run test:fee-model-caption` · `npm run red:fee-model-caption`

---

## §6 · SESSION 2 (2026-09-09) — the `money-out` lane, and two fixes shipped

### 6.0 · What ran, and whether to believe it

18 read-only finder lanes: the ten `money-out` surfaces the last run never reached (withdrawal
request · payout dispatch · settle/fail/refund · the reconcile sweep · AML and RG holds · the
Selcom adapter · admin payment ops and bulk retry · ledger integrity · the player withdrawal
surface · the shared balance primitives), plus eight lanes aimed at the named leads in §3.

⭐ **`agent_count` 18 · `agents_done` 18 · `agents_error` 0 · `agents_empty_result` 0.** That
check is the first thing §0 demands, and it is the reason this run's output can be read at all.
**No lane died.** Contrast run 1 (0/12 done) and run 2 (41/222).

⛔ **AND THAT STILL DOES NOT MAKE THE FINDINGS FACTS.** No adversarial verify pass ran on them.
They are exactly what §3 is: **leads a competent reader produced, on which nobody has voted.**
They are recorded in full at [`money-gate-2-findings.json`](money-gate-2-findings.json) — each
carries its verbatim code quote, a concrete scenario in shillings, its own reachability
judgement and its own confidence. **Two** things were fixed, and only two, because those are the
two that were re-derived by hand from the source and — for the first — measured against the
production database. Everything else waits for a verify pass.

| bucket | count |
|---|---|
| blocker | **15** |
| high | 35 |
| medium | 42 |
| low | 14 |
| **total — every one UNVERIFIED** | **106** |
| claims the finders themselves CLEARED, with reasons | 171 |
| questions only a production read can settle | 122 |

### 6.1 · FIXED — the ledger and `levySplit` stated two different statutory liabilities

`src/lib/server/ledger.ts` → `settlementPayoutEntries` · `src/lib/server/market-service.ts` → `settleMarket`

§3.3's first lead, **confirmed** — by reading both functions, by reproducing the arithmetic with
the repo's own `allocateFeeShares`, and then by measuring production. The full account is in
[`RULES.md`](RULES.md) §2.2. In one line: `settleMarket` calls `levySplit` **once** over the
whole fee, while the ledger derived each winner's TRA and GBT **independently** with its own
`Math.round` — and N roundings do not sum to one rounding.

**Measured on production 2026-09-09** (read-only, across the 203 settled markets carrying a
booked fee): **43 diverge.** The discriminating variable is the mechanism itself — **0 of 138**
markets with one winner, **9 of 9** with five or more. Net exposure today is small (+20 TZS TRA,
−7 TZS GBT) because production's books are small; it scales with winner count, not with time.

⛔ **One correction to the lead's wording: GBT booking ZERO has NOT yet happened on production.**
It is reachable — fifteen bets at the TZS 1,000 minimum against one 1,000 losing bet gives every
winner a fee share of ≤ 9, and `Math.round(9 × 0.05)` is 0 — and the gate drives exactly that
shape. But writing that it *has* occurred would be the same overstatement this programme exists
to stop.

Guards `npm run test:levy-allocation` **26/0** · `npm run red:levy-allocation` **7/7**. Mutation
1 is the pre-fix source verbatim; 4, 5 and 6 are over-corrections (booking a levy at a **zero**
rate, taking the levy **out of the player's payout**, rounding a share **up**); mutation 7
attacks the gate's own positive control, so a §3 that quietly stopped failing would itself go
red.

⚠️ **The 43 historical markets are NOT backfilled** — rewriting settled ledger rows is a larger
act than the +20 / −7 TZS error it would correct. Recorded for Ali.

### 6.2 · FIXED — a withdrawal's hold and its Transaction row committed separately

`src/lib/server/wallet-service.ts` → `withdraw`, Phase A

§3.2's blocker, raised there for the FAILED path and **confirmed here on the REQUEST path**.
`locks.ts` promises *"Everything inside ONE withLock now shares ONE transaction, so a throw rolls
back every write made under the lock"* — but the transaction is **not ambient**.
`withAdvisoryLock` *passes* it to the callback; `prisma-dal` resolves `const db: Db = tx ?? pc()`
and never reads the store the lock publishes. Phase A was written `async () => {`, so both
writes autocommitted on the pooled singleton, outside the lock's transaction entirely.

⛔ **The function's own in-lock comment describes the resulting state** — *"stranding funds in
`hold` with no txn row (reconcileStalePayments scans txns, so it never finds/reverses them)"* —
while guarding only the idempotency race, the one route to it that was foreseen. A P2024 pool
timeout, a P2028, or a SIGTERM during a rolling deploy reaches the same state with no race at
all. And **nothing can see it**: the sweep and `/admin/payments` both start from the transaction
table, and `trialBalance` compares `balance + hold` against the ledger — moving money between
those two columns changes neither side, and no ledger group is posted at request time. The books
tie to the shilling over a player who is permanently short, up to the TZS 1,000,000 bound.

Guard `npm run test:lock-tx-threading` **12/0**, proven RED on the pre-fix source with the
positive control (§3) still green. ⚠️ **It is STRUCTURAL** — it reads source text, so it proves
the writes are handed the client that would roll back, not that a rollback happens. §1 states the
premise it rests on, so the gate becomes visibly wrong if the DAL ever learns to read the lock
store. **The behavioural proof is `e2e:money` against a real Postgres, and it has NOT been run.**

### 6.3 · The blockers and highs, ALL UNVERIFIED — start here

⛔ **Read §0 before treating any row as fact.** `certain` below is the FINDER's confidence in its
own reading — it is not a verdict, and no second lens has looked. The first row (LEAD-A.1) and
MO-1.a are the two fixed above.

| id | sev | the claim — UNVERIFIED unless struck through | where | finder's own confidence · reachability |
|---|---|---|---|---|
| `LEAD-A.1` | 🔴 | ~~TRA and GBT are booked PER WINNER with Math.round in the ledger while levySplit computes them ONCE over the whole fee — the ledger's GBT can book ZERO on a settlement that owes it, and the ledger is t~~ ✅ **FIXED §6.1** | `src/lib/server/ledger.ts` → `settlementPayoutEntries (called once per winning position fr` | certain · yes |
| `LEAD-B.2a` | 🔴 | ✅ **FIXED §6.11** (CONFIRMED 3/3, sev → high) — hydrateNow() closes the hydration gate on a read that FAILED — `loadConfig` swallows the DB error and returns null, so the commit's own claim "a failure leaves the flag DOWN so the next read retries"  | `src/lib/server/market-config.ts` → `hydrateNow / ensureHydrated` | certain · yes |
| `LEAD-G.1` | 🔴 | ❌ **REFUTED §6.10 (3/3)** — The daily wallet↔ledger trial balance runs in production, finds drift, and tells nobody — its entire alarm is one audit row and one console line, and grep finds no consumer of either | `src/lib/server/lifecycle.ts` → `maybeReconcileLedger` | certain · yes |
| `LEAD-G.2` | 🔴 | ❌ **REFUTED §6.10** — `maybeReconcileLedger` advances its 24-hour clock BEFORE running the check, so any throw from `trialBalance()` skips the platform's only money invariant for a full day, silently and with no counter an | `src/lib/server/lifecycle.ts` → `maybeReconcileLedger` | likely · yes |
| `LEAD-G.3` | 🔴 | ❌ **REFUTED §6.10** — The nightly production trial-balance run DOES have an alarm channel beside it — and that channel is structurally deaf: `backupHealth()` never reads `sourceWarnings`, so a drifting production ledger is | `src/lib/server/backup/state.ts` → `backupHealth` | certain · yes |
| `LEAD-H.1` | 🔴 | ✅ **FIXED §6.12** — /legal/terms §4 promises free cancellation with ONLY the window condition, in all three languages — the runway condition that makes it unreachable on Up & Down 3- and 5-minute rounds is absent from th | `src/app/legal/terms/page.tsx` → `content(objectionHours) — LegalSection n="4" "How price-comp` | certain · yes |
| `MO-1.a` | 🔴 | ~~The withdrawal debit and its Transaction row are in SEPARATE commits — a failure between them strands the player's money in `hold` with no record, invisible to reconcile AND to the trial balance~~ ✅ **FIXED §6.2** | `src/lib/server/wallet-service.ts` → `withdraw (Phase A)` | certain · yes |
| `MO-10.a` | 🔴 | ✅ **FIXED §6.15** (CONFIRMED 3/3) — creditInternal fabricates the new balance when the wallet UPDATE fails and returns a non-null number, so every caller records money as PAID that never moved | `src/lib/server/wallet-service.ts` → `creditInternal` | certain · needs-production-read |
| `MO-2.a` | 🔴 | ✅ **CLOSED §6.13** — duplicate of MO-4.a, fixed by §6.9 — An AML-held withdrawal carries a NEVER-DISPATCHED id in `providerRef`, and approve-dispatch flips the row to PROCESSING without clearing it — the reconcile sweep then re-queries a transid Selcom never | `src/lib/server/wallet-service.ts` → `dispatchApprovedWithdrawal (claim at 733-738) + withdraw (17` | likely · needs-production-read |
| `MO-3.a` | 🔴 | settleWithdrawalFailed refunds and flips status in TWO separate commits outside the lock transaction — the 5-minute sweep then refunds a second time | `src/lib/server/wallet-service.ts` → `settleWithdrawalFailed` | certain · yes |
| `MO-4.a` | 🔴 | ✅ **FIXED §6.9** — The sweep can auto-reverse an AML-approved payout by querying a providerRef that was never sent to any gateway — the payout is in flight and the player gets the money back | `src/lib/server/wallet-service.ts` → `dispatchApprovedWithdrawal + reconcileStalePayments` | likely · yes |
| `MO-4.b` | 🔴 | ❌ **REFUTED §6.8 (2/3 lenses)** — settleWithdrawalFailed — the only refund path — is not atomic and its status write fails SILENTLY, so the 5-minute sweep re-refunds the same payout every cycle | `src/lib/server/wallet-service.ts` → `settleWithdrawalFailed` | likely · yes |
| `MO-5.a` | 🔴 | ✅ CONFIRMED 3/3 §6.8 (population ZERO on production) — Rejecting an RG-held DEPOSIT in /admin/aml moves no money at all, and three surfaces tell the officer the funds were returned | `src/app/admin/aml/actions.ts` → `rejectAmlAction` | certain · yes |
| `MO-5.b` | 🔴 | ✅ CONFIRMED 3/3 §6.8 (severity → high, TZS 0 realised) — HOUSE:RG_SUSPENSE has exactly one writer and it is always a CREDIT — no code path in the repo can ever release it, yet the player is emailed that the money "has been reversed and returned to the accou | `src/lib/server/ledger.ts` → `rgSuspenseEntries / settleDepositConfirmed (RG arm)` | certain · yes |
| `MO-6.a` | 🔴 | ✅ **FIXED §6.6** — A payout callback settles the transaction it CORRELATED on using the status of a DIFFERENT transid the caller chose — on an unauthenticated route | `src/app/api/webhooks/payments/route.ts` → `handleSelcomCallback` | certain · yes |
| `LEAD-A.2` | 🟠 | The tamper-evident audit chain records a levy figure the ledger never booked — two authoritative records of the same statutory liability, disagreeing by construction | `src/lib/server/market-service.ts` → `settleMarket — the `market.resolved` audit payload` | certain · yes |
| `LEAD-B.1a` | 🟠 | The config audit's `changes` field is the entire posted form, not a diff — every one of the 19 fields is recorded as "changed" on every save | `src/app/admin/config/actions.ts` → `updateGlobalConfigAction → setGlobalConfig` | certain · yes |
| `LEAD-B.1b` | 🟠 | Both surfaces that display a config change render the payload `before`-first in a one-line truncated cell, so `after` and `changes` are never on screen at all | `src/app/admin/audit/page.tsx` → `AdminAuditPage (table body) and AdminConfigPage (history tab` | certain · yes |
| `LEAD-B.2b` | 🟠 | The config page renders an editable, unlabelled rate form from code defaults on a failed read — and saving it writes the whole snapshot back, silently deleting every per-market stake override with no  | `src/app/admin/config/page.tsx` → `AdminConfigPage` | likely · needs-production-read |
| `LEAD-B.3` | 🟠 | defineConfig's synchronous getter has no ready-gate and its failed hydration NEVER retries — and define-config.ts was not one of the four hydrations commit 2499f324 repaired | `src/lib/server/define-config.ts` → `defineConfig (the eager-hydrate block and `get`)` | likely · yes |
| `LEAD-C.1` | 🟠 | A config-change audit row is rendered as one JSON.stringify blob truncated to ~41 characters, so the two rates that actually price every poll are unreadable on every console surface | `src/app/admin/audit/page.tsx` → `AdminAuditPage` | certain · yes |
| `LEAD-C.2` | 🟠 | /admin/audit — the only surface that renders any payload, and the one the regulator export names — reads the in-process ring, which starts EMPTY on every process start, while its own 'Chain integrity: | `src/app/admin/audit/page.tsx` → `AdminAuditPage` | certain · yes |
| `LEAD-C.3` | 🟠 | settleMarket's final totals are read on the global Prisma client while every payout is still uncommitted inside the lock's transaction — the append-only chain and the officer's screen both record '0 p | `src/lib/server/market-service.ts` → `settleMarket` | certain · yes |
| `LEAD-D.a` | 🟠 | The loser-share fee has no rule-level ceiling: /admin/config saves any platformFeeRate + operatorFeeRate up to and including 100% of the losing pool, with no refusal and no warning | `src/lib/server/market-config.ts` → `validate` | certain · yes |
| `LEAD-D.b` | 🟠 | The one warning that encodes "the house takes more than all the winners put together" is computed on feeCeilingRate — a knob loser-share never reads — so under the live model it is silent when true an | `src/lib/server/market-config.ts` → `validate` | certain · yes |
| `LEAD-F.1` | 🟠 | The solvency line omits HOUSE:TAX, so unremitted VAT and withholding tax are presented to the owner as his own free cash | `src/lib/house-book.ts` → `housePosition` | certain · yes |
| `LEAD-F.2` | 🟠 | HOUSE:TAX is captioned "RETIRED — historical rows only" on both owner money screens while two live paths credit it, and no report in the repo reads the account at all | `src/app/admin/house/page.tsx` → `ACCOUNT_NOTE (and HOUSE_ACCOUNT_NOTE in src/app/admin/financ` | certain · yes |
| `LEAD-F.3` | 🟠 | The statutory TRA/GBT figure is levied on window GGR instead of on the booked fee, so it charges the whole pool as tax in the window the bets are placed and zero in the window they settle | `src/app/admin/finance/page.tsx` → `AdminFinancePage (and buildDailyOps in src/lib/server/report` | certain · yes |
| `LEAD-G.4` | 🟠 | Two of the three terms in `trialBalance().ok` cannot fail by construction, so the ONLY live money invariant is the per-wallet PLAYER check — escrow (`POOL:*`) and every `HOUSE:*` account are unchecked | `src/lib/server/ledger.ts` → `computeTrialBalance / reconcileLedger` | certain · yes |
| `LEAD-H.2` | 🟠 | The live in-app assistant's system prompt states a DIFFERENT and wrong narrowing rule for cash-out — "Selling also closes the moment betting closes" instead of the runway rule — so it will tell a late | `src/app/_actions/chat.ts` → `buildSystemPrompt` | certain · needs-production-read |
| `LEAD-H.3` | 🟠 | scripts/rate-copy.test.mts PINS 13% and 1.5% as required literals in the terms and the chat prompt — so RULES §7's "the table is EMPTY, and that is the goal state" is false: there are at least eight l | `scripts/rate-copy.test.mts` → `§3 · the two surfaces that state the rule in prose` | certain · yes |
| `MO-10.b` | 🟠 | creditInternal is the only one of the three primitives with no atomicity — wallet, Transaction and ledger are three independent autocommits outside the lock's transaction | `src/lib/server/wallet-service.ts` → `creditInternal` | certain · needs-production-read |
| `MO-10.c` | 🟠 | The two-person rule on large balance adjustments can be executed more than once from a single first approval — the stage-1 clearance is not propagated and the check has no lock | `src/app/admin/players/[id]/actions.ts` → `getAdjustStage1 / setAdjustStage1 / adjustBalanceAction` | likely · needs-production-read |
| `MO-2.b` | 🟠 | The 30-minute "never terminalise a payout early" grace is measured from `createdAt`, so an AML-approved payout is inside the reversal-capable sweep from the instant it is dispatched — and is permanent | `src/lib/server/wallet-service.ts` → `reconcileStalePayments (1228) / isFastPayoutCandidate (1123-` | uncertain · needs-production-read |
| `MO-2.c` | 🟠 | `settleWithdrawalFailed` refunds and marks FAILED as two unguarded, non-atomic pool writes whose errors are swallowed to null — then reports success and emails "Withdrawal returned" either way | `src/lib/server/wallet-service.ts` → `settleWithdrawalFailed` | certain · yes |
| `MO-2.d` | 🟠 | The payout path never pre-persists its gateway reference — the exact hardening the DEPOSIT path carries, on the direction where the money is actually leaving | `src/lib/server/payments.ts` → `dispatchWithdrawal (177-178) vs dispatchDeposit (153-157) / ` | certain · yes |
| `MO-3.b` | 🟠 | The refund credit's failure is swallowed and never checked — the player is emailed "Withdrawal returned" while the money stays locked in `hold` forever | `src/lib/server/wallet-service.ts` → `settleWithdrawalFailed` | certain · yes |
| `MO-3.c` | 🟠 | rejectAmlAction has the same split commit — an officer's retry after a partial reject refunds a ≥TZS 1,000,000 payout twice, and its comment claims the opposite | `src/app/admin/aml/actions.ts` → `rejectAmlAction` | certain · yes |
| `MO-3.e` | 🟠 | Adjacent (initiation, same root): withdraw() Phase A also splits the debit from the Transaction row, and db.txn.create throws uncaught — stranding the gross in `hold` with no txn row that any sweep ca | `src/lib/server/wallet-service.ts` → `withdraw` | certain · yes |
| `MO-4.c` | 🟠 | The sweep's deposit safety arms are gated on isLiveMoneyMode() — an env switch that is still OFF on production — so 'we could not ask the gateway' auto-FAILS a genuinely paid deposit | `src/lib/server/wallet-service.ts` → `reconcileStalePayments` | likely · needs-production-read |
| `MO-6.b` | 🟠 | An unparseable or field-renamed payout envelope resolves to FAILED, and FAILED is the one verdict that auto-refunds a payout that already left | `src/lib/server/selcom.ts` → `envelopeSettlementVerdict` | likely · needs-production-read |
| `MO-6.c` | 🟠 | The generic lane can settle a SELCOM transaction from the callback body — the session-1 fix keyed on the caller's self-declared provider, and no transaction records which gateway owns it | `src/app/api/webhooks/payments/route.ts` → `POST (generic lane) / settlePaymentWebhook` | likely · needs-production-read |
| `MO-7.a` | 🟠 | CARD has no kill-switch: MNOS is derived from MOBILE_MONEY_METHODS, so isPaymentPaused("CARD",…) can never be true on the only rail carrying chargeback risk | `src/lib/server/payment-ops.ts` → `isPaymentPaused / MNOS / setKillSwitch / toggleKillSwitchAct` | certain · needs-production-read |
| `MO-7.b` | 🟠 | reconcileWriteOffAction stamps a per-OFFICER sentinel, not a per-transaction one — the second write-off collides on @@unique([provider, providerRef]), the DAL swallows the error, and the action still  | `src/app/admin/payments/payment-actions.ts` → `reconcileWriteOffAction` | certain · yes |
| `MO-7.e` | 🟠 | reverseStuckPayoutAction skips the provider re-query entirely when providerRef is null, while the modal promises the provider is asked — and the guard that "proves" the re-query is a regex over the so | `src/app/admin/payments/payment-actions.ts` → `reverseStuckPayoutAction` | likely · needs-production-read |
| `MO-7.i` | 🟠 | setKillSwitch reports the emergency STOP applied before it is durable — the persist is `void saveConfig(...)` and saveConfig never throws, so a failed write leaves the pause in one process's memory wi | `src/lib/server/payment-ops.ts` → `setKillSwitch / toggleKillSwitchAction` | certain · needs-production-read |
| `MO-8.a` | 🟠 | repairOrphanedPositions refunds real money to a wallet with NO ledger entry at all, and leaves POOL:{marketId} holding the stake for a market that no longer exists | `src/lib/server/market-service.ts` → `repairOrphanedPositions` | certain · needs-production-read |
| `MO-8.b` | 🟠 | HOUSE:TAX is credited again by the live agent programme but is excluded from `owedToOthers`, so the solvency line reports tax owed to TRA as the owner's free cash — and both admin pages label the acco | `src/lib/house-book.ts` → `housePosition` | certain · yes |
| `MO-9.a` | 🟠 | The withdrawal minimum has three homes; every player-facing one says 1,000 and the only enforced one is 1,016 | `src/app/wallet/withdraw/page.tsx` → `WithdrawPage / withdrawAction / withdraw()` | certain · yes |
| `MO-9.b` | 🟠 | /wallet/withdraw renders arbitrary ?error= query text in a first-party alert box, and the ratchet that swears this channel is at zero cannot see it | `src/app/wallet/withdraw/page.tsx` → `WithdrawPage` | certain · yes |

### 6.6 · FIXED — a payout callback settled the id it did NOT ask about

`src/app/api/webhooks/payments/route.ts` → `handleSelcomCallback` (finding `MO-6.a`)

Verified by hand, lens by lens, because the workflow verify pass died (§6.7). The mechanism is
real and every step of it was read at `1ab89cc5`:

| step | what the code did |
|---|---|
| routing | `if (/^SELCOM\s+/i.test(authHeader))` — **`Authorization: SELCOM <anything>` reaches the handler.** No secret is needed to get in |
| signature | `sigOk` was computed, put in the audit payload, and **never read**. The code said so: *"(sigOk above is captured for audit only.)"* |
| correlation | `ref = order_id \|\| transid`, and `db.txn.findByProviderRef(ref)` finds **our** transaction |
| the authority query | `selcomVerifyPayout(env, railOf(txn.payoutRail), transid \|\| ref)` — asks the rail about **`transid`**, a *second, independent field of the caller's body* |
| the verdict | `envelopeSettlementVerdict` returns CONFIRMED on `000`, null on `111/927/999/INPROGRESS/PENDING/AMBIGUOUS`, and **FAILED on everything else** — so an id the rail does not recognise **is** a FAILED verdict |
| settlement | `settlePaymentWebhook({ providerRef: ref, status })` settles the row found by `ref` with the answer about `transid` |

A FAILED verdict on a **PROCESSING** withdrawal runs `settleWithdrawalFailed`, refunding the
player while the real payout is still in flight at the gateway. The money leaves twice.

⚠️ **AND THE FILE'S OWN HEADER PROMISED THE MISSING CONTROL.** It has always read: *"WITHDRAWALS
(wallet-cashin, no status endpoint) settle only on a signature-verified callback, else stay
PROCESSING for the reconcile sweep."* That control was not there. Same class as §1.7's
`payments.ts` header describing a refusal that had been removed.

**Two corrections to the finder's framing, both in the platform's favour** — recorded because
overstating a defect is the same failure as understating one:

- ⛔ **NOT "no credential required".** The caller must supply a `ref` that matches a real
  `providerRef`, or `findByProviderRef` returns nothing and the callback is ignored. The
  realistic exploiter is **the account holder against their own in-flight withdrawal**, not an
  anonymous internet caller. The finder's *"ten cycles by one player = TZS 9,850,000"* also
  overstates: each cycle needs a fresh **PROCESSING** payout.
- ✅ **Session 1's contradiction guard already covers the CONFIRMED case.** A FAILED verdict
  against an already-CONFIRMED withdrawal raises `webhook.terminal_contradicted` and refuses.
  The live window is strictly the PROCESSING one — which is, however, exactly the window in
  which a refund double-pays.

**Fixed:** the re-query is keyed on `txn.providerRef` — ⭐ **not a guess: it is the identifier
`verifyWithdrawalStatus` in `payments.ts` already passes for the reconcile sweep**, the proven
path — and a payout now settles only on a verified signature. Failing that check is safe in the
only direction that matters: the row stays PROCESSING and the sweep re-queries on its own
schedule, so an unverifiable callback costs a delay, never a lost or doubled payout. A
`transid` that disagrees with `providerRef` raises `webhook.payout_transid_mismatch` (SECURITY).

⛔ **The default-to-FAILED taxonomy is deliberately NOT changed.** It is what turns "an id I do
not know" into "that payout failed" — but it is load-bearing for the reconcile sweep, and
removing the caller's control over the id removes the attack without touching it. §5 of the gate
pins it so the next reader knows it was seen and left alone, not missed.

Guard `npm run test:payout-callback-identity` **14/0**, proven RED on the genuine pre-fix file
(`git show 2499f324:…`) — 5 failures across §1 and §2. §3 cross-checks the identifier against
the reconcile sweep, so §1 cannot quietly pin the wrong one; §4 is the positive control.
⭐ **§4 earned its place immediately: it failed this gate's own first draft**, where `[^)]*`
could not cross the `)` in `railOf(txn.payoutRail)` and both shapes matched nothing alike.
`test:webhook-sec` **21/0** and `red:webhook-money` **4/4** still pass, so session 1's webhook
guarantees are intact.

### 6.7 · THE VERIFY PASS RAN AND DIED — the same way runs 1 and 2 died

13 blockers × 3 adversarial lenses = 39 agents. **`agents_done` 0 · `agents_error` 39**, every
one *"You've hit your session limit"*. Nothing was verified by the harness.

⭐ **AND THE BUCKETING HELD, WHICH IS THE ONE THING THAT HAD TO.** All 13 came back
**UNVERIFIED** with `votesReturned: 0` — not "refuted". The harness computes
`unverified = votesReturned < 2` FIRST and buckets on it before any confirmed/refuted logic
runs, exactly as §0 requires. The failure mode this file was written about did not repeat.

⚠️ **So the count in §6.0 is unchanged and every §6.3 row still stands UNVERIFIED**, except
`MO-6.a`, which was verified by hand above and fixed. Scripts are ready to re-run — one per
severity, findings baked in, no arguments needed:

```
verify-blocker.js  · 13 findings ·  39 agents
verify-high.js     · 35 findings · 105 agents
verify-medium.js   · 42 findings · 126 agents
verify-low.js      · 14 findings ·  42 agents
```

⛔ **Run them ONE BATCH AT A TIME and read the result between**, and check `agents_done`
against `agent_count` before believing any of it. 39 agents was already enough to exhaust a
session; `verify-medium` at 126 will not survive a single window. The blockers are the batch
that matters — start there.

### 6.8 · THE VERIFY PASS, SECOND ATTEMPT — 12/12, and it changed three verdicts

⭐ **THE FIX FOR THE DEATH IN §6.7 WAS BATCH SIZE, NOTHING ELSE.** 39 agents exhausted a
session window; **12 survived comfortably** — `agent_count` 12 · `agents_done` **12** ·
`agents_error` **0**. The batch scripts are now baked one severity-slice at a time
(`verify-<sev>-<from>-<to>.js`, four findings each). ⛔ Do not raise it.

| id | bucket | votes | what changed |
|---|---|---|---|
| `MO-4.a` | ✅ **CONFIRMED** | 3/3 uphold | fixed below (§6.9) |
| `MO-5.a` | ✅ **CONFIRMED** | 3/3 uphold | real, but the population on production is **ZERO** |
| `MO-5.b` | ✅ **CONFIRMED** | 3/3 uphold | severity **blocker → high**; realised exposure **TZS 0** |
| `MO-4.b` | ❌ **REFUTED** | 2/3 refute | see below — the headline was wrong |

**`MO-4.b` REFUTED, and this is what a verify pass is for.** The claim was an unbounded
5-minute re-refund loop. Two lenses independently found a deployed **`wallet_hold_non_negative`
CHECK constraint**: the second release's single UPDATE aborts, so the repeat credits **ZERO
shillings**, not the millions claimed. ⚠️ The underlying non-atomicity is real and was fixed
anyway in §6.2's sibling commit — but the *money* claim was false, and shipping a fix on the
strength of that headline would have been acting on a fiction.

⚠️ **Corrections the lenses made to claims they still upheld** — record these, because a
confirmed finding with a wrong reason is how the next session mis-prioritises:
- `MO-4.a`'s finder named the wrong cause. The tx-threading is **not** load-bearing here; the
  dispatch is outside the lock **by design**. The cause is the unguarded window and the phantom
  ref. The finder also overstated frequency (~1% per approval on a healthy 1–3s accept, not
  "1 in 4"); it reaches 15–30% only when a rail hits its 45s timeout.
- `MO-5.a`/`MO-5.b` cite RULES §2.8 and §2.9, and **neither section says what is claimed**.
  §2.8 governs what a player is *charged*; §2.9 is the failure-*refusal* registry rule. Money
  the platform holds and fails to return is neither. The fitting doctrine is **A-5
  no-fabrication**, which is code-level, not a RULES.md section.
- `MO-5.b`'s "the rail does not exist" is **false** — `dispatchWithdrawal` carries every live
  payout. It is not *wired* to the release, which is a smaller and different statement.

### 6.9 · FIXED — an AML-approved payout carried a phantom `providerRef` into the sweep's reach

`src/lib/server/wallet-service.ts` → `dispatchApprovedWithdrawal` (finding `MO-4.a`, CONFIRMED 3/3)

While a large withdrawal sits in `AML_REVIEW` its `providerRef` holds the `wdr_…` correlation id
`dispatchWithdrawal` returns from its AML branch — **our** id, which no gateway has ever seen:
that branch returns *before* `resolveActiveAdapter`, and `runPayoutLadder` mints a fresh transid
on approval. Harmless in `AML_REVIEW`, which no sweep selects.

⛔ **It stops being harmless the instant the claim flips the row to `PROCESSING`.**
`reconcileStalePayments` selects `PROCESSING` rows filtered on **`createdAt`** — and an AML
row's `createdAt` is hours or days old, so the entire 30-minute grace the file's own header
calls *"deliberately patient"* is **already spent**. The row is sweep-eligible immediately,
while the dispatch round-trip runs **outside the wallet lock by design** (never hold a lock
across network I/O) for up to the 45s rail timeout. In that window the sweep queries the phantom
id; `envelopeSettlementVerdict` returns FAILED for any code that is not `000/111/927/999`; and
`settleWithdrawalFailed` refunds a payout that is **in flight**. Every AML-approved payout is at
or above the review threshold by construction — the largest-value path on the platform.

⚠️ **Nothing downstream corrects it.** After the round-trip the function writes the REAL ref onto
the now-FAILED row, audits `withdraw.approved_dispatched`, and tells the player the money is on
its way. The trail actively conceals the double payment.

**Fixed** by clearing `providerRef` and `payoutRail` in the claim, so the row enters the window
with no gateway id at all. ⭐ That routes it into the sweep's **own existing safe branch** —
`if (!ref)` → `leftPending` + `auditNeedsReviewOnce("stale withdrawal has no providerRef — not
auto-reversed")` — which moves no money and puts the row in front of an officer. No new branch
was added. Clearing *here* rather than at `withdraw()`'s write is deliberate: the correlation id
is honest and useful while the row is held for review, it only becomes a lie at that one line,
and clearing there also heals rows already sitting in production carrying one.

Guard `npm run test:aml-dispatch-window` **14/0**, RED on the genuine pre-fix file
(`git show 2499f324:…`). §1 states the premise it depends on (the AML branch really does return
a never-dispatched id) so the gate becomes visibly wrong if that changes; **§3 pins the sweep's
`!ref` branch**, because clearing the field is only safe while that branch exists — without §3
this would be a fix pointing at nothing, still green; §4 is the positive control.

### 6.10 · The second verify batch — 1 confirmed, 3 refuted, and the LEAD-G family collapses

12/12 done, 0 errors again at the 12-agent size.

| id | bucket | votes | outcome |
|---|---|---|---|
| `LEAD-B.2a` | ✅ **CONFIRMED** | 3/3 uphold | fixed below (§6.11); severity **blocker → high** |
| `LEAD-G.1` | ❌ **REFUTED** | 3/3 refute | — |
| `LEAD-G.2` | ❌ **REFUTED** | — | — |
| `LEAD-G.3` | ❌ **REFUTED** | — | — |

⛔ **THE WHOLE LEAD-G FAMILY — "the trial balance runs, finds drift, and tells nobody" — IS
FALSE, AND THE REASON IS A LESSON.** The finder grepped the audit ACTION STRING
`trial_balance_drift` rather than the FUNCTION `trialBalance`, found no consumer, and concluded
there was none. Grepping the function returns four live call sites:

- `.github/workflows/backup-nightly.yml` runs the platform's own `trialBalance()` **against the
  production database** nightly at 03:15 EAT, in its own process, and records the verdict;
- a second run against the restored copy;
- **`/admin/house` and `/admin/finance` both recompute it on every page load** (`export const
  dynamic = "force-dynamic"`) and render a **red danger card** when `!tb.ok`.

The TZS 100,000 unledgered credit it cites as live evidence was **cleared on 2026-07-31** —
`scripts/ops-clear-unledgered-credit.mjs` is the script that removed it, and `trialBalance()`
has returned `ok:true` since. ⭐ Three findings, one grep, wrong noun. §3.3's row
*"No production money-invariant job exists"* is **withdrawn**: the job exists, runs nightly
against production, and is rendered live on two owner screens.

⚠️ **One residual is real and is NOT the blocker that was claimed:** `maybeReconcileLedger`
stamps its 24-hour clock *before* the work, so a throw from `trialBalance()` consumes the
in-process slot for a day and nothing records `lastTrialBalanceOkAt`. With three other runners
covering the same question — one of them unconditional and against production — that is **low**,
and it is left open rather than fixed.

### 6.11 · FIXED — a hydration gate that closed on a read which never happened

`config-store.ts` · `payment-ops.ts` · `market-config.ts` · `updown-config.ts` · `payment-control.ts`

`LEAD-B.2a`, CONFIRMED 3/3 — **and the lens found an extension worse than the finding**, which
is recorded here because it means a shipped fix notice was wrong.

`loadConfig` collapses **three** states into one `null`: "no database", "no row yet", and **"the
query FAILED"** — its catch logs and returns null. Every hydration was
`const stored = await loadConfig(…); if (stored) …; FLAG = true;`, so one transient DB error at
first read raised the gate on a read that never landed and pinned that container on **code
defaults for its entire life, with no retry**.

⛔ **AND TWO DOCBLOCKS ASSERTED THE OPPOSITE, WHICH IS HOW IT SURVIVED §1.2.**
`market-config.ts` and `payment-ops.ts` both read *"a failure leaves the flag DOWN so the next
read retries"*, and §1.2 above declared the blocker closed on the strength of them. That
2026-09-08 fix moved the flag after the `await` — which genuinely fixed the **concurrent
caller** — and left the **failed read** raising it exactly as before. `payment-ops` is the worst
of the four and was the original blocker: `kstore` stays empty, so `isPaymentPaused()` answers
**false for every rail and both flows**, and the emergency stop evaporates. §1.2's *"Retrying
removes the permanence, which is the part that made this a blocker"* was not true.

| module | what a failed first read costs |
|---|---|
| `payment-ops` | the emergency kill-switch is off for the life of the process |
| `market-config` | a market created in the window freezes `DEFAULT_GLOBAL_CONFIG` into its **immutable** feeSnapshot; and the next unrelated admin save calls `persist()`, writing `perMarket: []` — **destroying every per-market override**, which needs no rate to diverge at all |
| `updown-config` | every round opened in the window freezes the defaults |
| `payment-control` | the officer's chosen rail is discarded; the env fallback runs the process |

⛔ **THE OBVIOUS FIX IS WRONG, AND THE GUARD PINS THAT.** Latching inside `if (stored)` never
hydrates on a fresh install, where an absent row is legitimate, and every caller waits for ever.
The gate needs a distinction `loadConfig` cannot express: **did the store answer?** — not **was
there anything in it?**

**Fixed** with `loadConfigResult`, which returns `{ok:true, value}` when the store answered
(including a legitimate `null` for no-row / no-database) and `{ok:false, error}` when it could
not be asked. All four gates latch only on `ok`. `loadConfig` remains for value-only callers,
now built on the result form, with a docblock forbidding its use for a gate.

⚠️ **Money impact today is TZS 0 on the rate half** — every fee, levy and bound in the
2026-09-09 production read equals its code default, so a container stuck on defaults would
currently charge the right numbers by coincidence. The kill-switch and per-market-override
halves are unaffected by that coincidence, and the coincidence is not a control.

Guard `npm run test:config-hydration-gate` **28/0**, RED on the genuine pre-fix source
(**19 failures**). §1 pins the store's contract, §2 sweeps all four gates, §3 is the positive
control, and **§4 is the over-correction guard** — it fails if a gate is ever keyed on the
*value* rather than on `ok`, which is the fix that would hang every fresh install.
`test:payment-control` **61/0** and `red:payment-control` **7/7** still pass.

### 6.12 · FIXED — the binding contract promised a right the product cannot deliver

`src/app/legal/terms/page.tsx` (finding `LEAD-H.1`)

Verified by reading all three language blocks. §4 stated **only the WINDOW condition** —
*"within the first 5 minutes you may sell for a full refund at no charge"* (EN), *"ndani ya
dakika 5 za kwanza"* (SW), *"前 5 分钟内"* (ZH) — and omitted both of the other two conditions
`cashOutValue` actually requires.

RULES §2.6 is explicit that this is the defect, not an omission: the RUNWAY condition makes free
cancellation **unreachable by construction on Up & Down 3- and 5-minute rounds** (production:
**0 of 688 rounds ever cashed out**), and §2.6 calls overstating it *"the same failure class as
overstating a control to the Gaming Board"*.

**Fixed** in all three languages: the clause now states the runway condition, names the two
round lengths where cash-out is **never** available, and states that a bonus-funded position can
never be sold. ⚠️ No guard — this is prose in a page, and `test:rate-copy` scans dictionaries,
not this file. A future session should decide whether §4's three conditions deserve a rendered
assertion the way `test:fee-model-caption` §7 renders the simulator.

### 6.13 · `MO-2.a` — closed as a duplicate, with one observation carried forward

`MO-2.a` describes the same phantom-`providerRef` defect as `MO-4.a` and is closed by §6.9's fix.
The `MO-4.a` law lens said so independently.

⚠️ **It named one thing `MO-4.a` did not**, and it is worth carrying: `reverseStuckPayoutAction`
(`payment-actions.ts`) asks the same ref in its "machine check". With `providerRef` now null
during the dispatch window it **skips the check entirely** and records
`"not asked (no provider reference)"`.

⭐ **That is not a regression, and I checked before concluding it.** Before §6.9 the check ran on
the phantom, returned **FAILED**, and proceeded anyway — only `CONFIRMED` refuses. So the officer
override was equally permissive before; what changed is that the COMPLIANCE audit now records an
honest *"not asked"* instead of a fabricated provider verdict. ⛔ **Left unfixed deliberately:**
tightening an officer's deliberate override path is a policy call, and the docstring states that
proceeding on a non-terminal answer *"is what this action is FOR"*. Filed for the next session.

### 6.14 · THE BLOCKER LANE IS CLOSED — 13 of 13 adjudicated

9/9 done, 0 errors on the final batch. **Every blocker in the set now has a verdict.**

| bucket | count | ids |
|---|---|---|
| ✅ **FIXED** | **8** | `LEAD-A.1` `MO-1.a` `MO-3.a` `MO-4.a` `MO-6.a` `LEAD-B.2a` `LEAD-H.1` `MO-10.a` |
| ❌ **REFUTED** | **5** | `MO-4.b` `LEAD-G.1` `LEAD-G.2` `LEAD-G.3` `MO-2.a` (duplicate) |
| 🔴 UNVERIFIED | **0** | — |

⭐ **FIVE OF THIRTEEN BLOCKERS WERE NOT REAL**, and that is the number that justifies the whole
verify pass. Three (`LEAD-G.*`) died to a single grep of the wrong noun; one (`MO-4.b`) to a
deployed CHECK constraint; one (`MO-2.a`) was a second view of another. Acting on the finder
list unverified would have meant four unnecessary changes to live money code.

⚠️ **`LEAD-H.1` and `MO-2.a` are recorded REFUTED "as live" only because I had already fixed
them** between the finder and the verifier. All three lenses confirmed the findings were
substantively RIGHT and the fixes accurate — `LEAD-H.1`'s source lens independently re-derived
the runway arithmetic (`closesAt - openMs = 180,000ms` on a 3-minute chain, never ≥ a 300,000ms
grace) and confirmed *"can never be met"* is fair rather than an overstatement. Read those two
rows as **fixed**, not as **wrong**.

### 6.15 · FIXED — `creditInternal` invented a balance nobody had written

`src/lib/server/wallet-service.ts` → `creditInternal` (finding `MO-10.a`, CONFIRMED 3/3)

```
const newBalance = updated?.balance ?? wallet.balance + amount;   // ← the defect
```

`db.wallet.adjust` returns `null` for two different reasons and that line could tell neither
apart: the guarded `updateMany` matched zero rows, or the write threw and the self-committing
arm swallowed it. **Either way no money moved** — and the function then wrote a CONFIRMED
transaction, stamped `balanceAfter` with a figure never persisted, posted a balanced ledger
group for it, and returned that figure to its caller as success. `onRecruitSettlement` records
the agent's commission as **PAID** on it, and the 5% withholding is remitted to `HOUSE:TAX` —
tax withheld from income the agent never received. Every caller's `!== null` test passes.

⭐ **`debitInternal`, its own mirror twenty lines below, has always been correct**: it threads
the lock's `tx` and ABORTS on a null. The path taking money OUT was safe; the path putting money
IN was not.

**Fixed:** the callback takes `tx`, both writes and the ledger group are threaded onto it, the
group is `await`ed rather than fire-and-forget (so an imbalanced or failed group throws and
rolls the whole credit back), and a null write now **refuses** — audited
`wallet.credit_internal_failed` (COMPLIANCE), caller sees null, the accrual stays a retryable
PENDING payable exactly as RULES §2.10 requires.

Guard `test:lock-tx-threading` extended to **22/0** with a new §2c, RED on the genuine pre-fix
file (**11 failures** across §2/§2b/§2c). §3.6 pins the credit path's pre-fix text.

⚠️ **AND THE GUARD CAUGHT ITSELF FIRST.** §2c.4 asserts the `??` fabrication is *gone* — and it
failed on correct source, because the fix's own docblock **quotes the defective line** to
explain what it replaced, and the scanner matched its own prose. An absence check that reads
comments measures the explanation, not the code; a presence check could be satisfied by a
comment over code that never makes the call. `codeOnly()` now strips comments before matching.
That is the third span/matcher flaw §3's positive control has caught in this file, which is
what a positive control is for.

### 6.16 · Corrected while here — the player terms version stamp

`src/lib/server/auth-service.ts` — `TERMS_VERSION` read `2026-04-01` and is stamped on every
registration as `User.acceptedTermsVersion`. §6.12 materially narrowed §4 of the binding terms
in all three languages **the same day**, so the document a new player is shown and the version
recorded as accepted had diverged.

⛔ **Exactly the defect RULES §2.10 records for `AGENT_TERMS_VERSION`** — caught here by a
verify lens, on a divergence this session's own fix created. Now `2026-09-09`, with the reason
in the constant's docblock. ⚠️ Nothing compares it to a stored value, so moving it forces **no**
re-acceptance; existing rows keep `2026-04-01`, which is the correct record of what those
players were actually shown.

### 6.4 · Corrected while here — documents that contradicted the law

- `ledger.ts` → `withdrawalEntries`, `prisma/schema.prisma` → `WITHDRAWAL_FEE`, and two headings
  in `scripts/ledger.test.mts` all stated the retired **1%** withdrawal fee. §2.7 has said
  **1.5%** since 2026-08-14 and production charges it. None states a rate now — the treatment
  §1.7 already gave the two doc-comments it found. ⚠️ The test's fixture still passes
  `fee: 1_000, gatewayShare: 500` on 100,000, which is arithmetically the retired shape (the live
  one is 1,500 / 500). Left as a fixture; no longer captioned as the rule.
- `ledger.ts`'s header called `HOUSE:TAX` **"RETIRED … never credited again"**. Read off
  production 2026-09-09: **HOUSE:TAX = 18,000 TZS over 1 entry** — the 18% VAT on the first agent
  registration. §2.10 credits it twice over (registration VAT, and the 5% withholding on every
  accrual). Corrected in place. ⛔ This is the premise of §3.3's HOUSE:TAX lead and it is **true**:
  the account is live and holds money owed to the state. Whether the owner's free-cash line fails
  to subtract it is the other half, and that half is still UNVERIFIED — see the LEAD-F rows.
- `RULES.md` §2.3 and §2.1 both said **16** Up & Down chains. Production has **23**. Corrected,
  and the count now carries the date it was read.

### 6.5 · How to resume

1. `cd` to a fresh worktree of `main`. `git status` first — sessions share this tree, and a
   sibling worktree appeared mid-session. Never `git add -A`; stage by name.
2. **The verify pass is the whole job.** Three independent adversarial lenses per finding, with
   `unverified = votesReturned < 2` computed FIRST and bucketed before any confirmed/refuted
   logic runs. Do not let a no-vote become a "refuted" — that is the mistake §0 exists to stop.
3. Then §6.3 top-down. Two clusters are worth taking as single defects rather than as rows:
   **MO-2.a, MO-3.a, MO-4.a and MO-4.b** describe one `settleWithdrawalFailed` / reconcile
   atomicity defect from four angles, and the **LEAD-G** rows describe one alarm that computes a
   real answer nightly and has nowhere to deliver it.
4. `e2e:money` against a real Postgres — the only behavioural proof of §6.2, and it did not run
   here. The worktree also has no `node_modules`; a junction to the main checkout's is enough.
5. Every guard RED first, with a positive control in the same run and an over-correction mutation.

**Guards this session added:** `npm run test:levy-allocation` · `npm run red:levy-allocation` ·
`npm run test:lock-tx-threading`
