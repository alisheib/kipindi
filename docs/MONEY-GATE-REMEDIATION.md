# MONEY GATE REMEDIATION — the pre-launch money audit

> 🟢 **THIS FILE IS THE AUTHORITY AND THE HANDOVER for the money-gate programme.**
> Opened 2026-09-08. Branch `money-gate-remediation`, worktree `C:\kipindi-money`.
> The money LAW is [`RULES.md`](RULES.md) — this file never restates a rate, it records
> what was found, what was fixed, and what is still open.
>
> ⛔ **§3 is a list of LEADS, not a list of defects.** Read §0 before believing any row in it.

---

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
`<failures>` block.** Run 1: 0/12 done. Run 2: 41/222 done.

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
- The withdrawal FAILED path may not be atomic — debit and Transaction row in separate commits. *(blocker)*
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

- **TRA/GBT are re-derived per winner with `Math.round` instead of the single `levySplit`, so GBT
  can book ZERO on a market that owes it** — with a worked example inside the live stake bounds.
  Two rounding regimes for one levy. *(the highest-value settlement lead)*
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
