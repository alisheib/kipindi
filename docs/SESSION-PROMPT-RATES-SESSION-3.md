# SESSION PROMPT — CONTINUE THE RULES PROGRAMME (session 3 of N)

> Written 2026-08-14 at the close of session 2. The work order is
> [`docs/SESSION-PROMPT-RATES-AND-FAILURES.md`](SESSION-PROMPT-RATES-AND-FAILURES.md);
> [`docs/RULES.md`](RULES.md) is the authority on what the platform charges and permits.
> Session 1's handoff is [`SESSION-PROMPT-RATES-CONTINUE.md`](SESSION-PROMPT-RATES-CONTINUE.md).
>
> **Read RULES.md first.** Everything below either enforces it or points at it.

---

## §0 · THREE THINGS FOR ALI — none of them are code questions

**1. 🔴 GOLD HAS BEEN DEAD FOR DAYS AND CANNOT RESTART ITSELF.**
[`FINDING-GOLD-CHAINS-STALLED.md`](FINDING-GOLD-CHAINS-STALLED.md). All three XAU chains read
`RUNNING` and have opened **no round** since their last session close — 15m for ~17 hours,
30m and 60m for **four days**. `advanceChain`'s market-hours gate returns BEFORE the re-arm,
so the chain stays pinned to a boundary inside the closed session and the gate is re-evaluated
at that same stale instant forever: a deadlock by construction, immune only for crypto.
Measured from the database AND from the product. **It is a one-line fix with an obvious
red-first plan and it is NOT SHIPPED** — an engine-timing change deserves its own commit,
harness and live verification, not a ride-along in a fee-and-copy programme. Your call whether
it goes next or waits.

**2. ⚠️ UD-20 IS RE-OPENED — a hedged holder sees no payout figure at all.**
`updown-board.ts` suppresses `myExactPayout` when a player holds both sides, because one
number cannot state a two-sided position. That was right, and it was documented as
*unreachable* — a state the money engine refused to create. **B made it reachable and
ordinary.** The behaviour is unchanged and still better than printing a half-truth, but the
gap is now a real one on a locked round. "Quote both outcomes" is a design question again.
⛔ Do not answer it by resurrecting the single-number form; that is the defect, not the gap.

**3. ⚠️ THE THREE ITEMS SESSION 1 RAISED ARE ALL NOW SETTLED IN CODE** — outcome-dependence
is recorded in `COMPLIANCE-DECISIONS.md` and written into `payout.ts`'s invariant 2; the free
cancellation exploit is closed (B1b); the Terms page now says 1.5%. Nothing is waiting on you
for those.

---

## §1 · WHAT SESSION 2 SHIPPED — eight commits, all pushed and live

| Commit | | Proven |
|---|---|---|
| `22215fec` | **A4** — the fee caption on `/admin/updown` | `red:fee-model-caption` 8/8 |
| `75042aae` | **B / B1b / B3** — the hedge, the wagering rule, the free-cancellation hole | `red:bonus-one-side` 6/6 |
| `d51e8fa1` | **F1** — the lopsided-market alert | `red:thin-alert` 6/6 |
| `d175cd01` | **A4 (2/2)** — the caption was ellipsised at 1024px | `red:fee-model-caption` 9/9 |
| `19ac78ec` | **C2–C5** — the reason registry, one renderer, the BUSY lie | `red:failure-reasons` 9/9 |
| `0a45a05a` | **F2/F4/F5** — the legal document, the assistant, the header, the guard | `red:rate-copy` 7/7 |
| `7625986d` | **F3/E** — the operator guide, both rates PDFs, the rasteriser | 22 pages, 42 distinct frames, read |
| `5c1959ef` | **B2** — the bonus warning before confirming | `red:failure-reasons` **11/11** |

`npm run test:all` → **215/215** green. Five new suites, five new RED harnesses, **41 mutations
caught**, every one with a positive control in the same run.

### Verified on PRODUCTION, not from a suite

- **A real two-sided bet settled at 13% of the losing side and tied out exactly.** Six QA-fleet
  players put **TZS 21,000** on one round (`mkt_39b5c1731ae414`, YES 8,000 / NO 13,000):
  **fee 1,040.00 = 13% × 8,000**, paid 19,960.00, **pool residual 0.00**. A second
  (`mkt_7b463119d4f23e`) tied out the same way.
- **A REAL one-sided round** (`mkt_228cf35c866dae`, YES 3,000 / NO 0) charged **nothing** and
  refunded all 3,000 across 2 positions.
- **The card multiplier reads higher**, at 360/768/1024/1440: `Up × 2.25` / `Down × 1.49`
  against `× 2.12` / `× 1.38` for the same pools under the retired model.
- **The admin fee tile** reads `TZS 650 · loser-share 13%` at all four widths, untruncated.
- **10/10 settled LEGACY rounds still settle by the old maths** — the no-mix guarantee, on
  real money.

---

## §2 · WHAT IS LEFT

### ▶ 1. A REAL **VOID** ROUND, ON PRODUCTION — the last A4 item

`loser-share-settled.cjs` §3 stays RED until one lands. Production's void rate is **1.7%**
(30 of 1,761 in 24h) and **all five drives placed this session decided** — BTC 5m, BTC 3m, SOL 30m and XRP 15m, 26,000 of real fleet money across them.
⚠️ **Gold is the highest-void asset (11 of those 30) and cannot be used** — see §0.1.
⛔ `test:updown-cutover` §5b proves it on the real settlement path. That is not production.

```
SHOT_DIR=./shots/x A4_PLAN=void npm run qa:loser-share-money -- "asset=XRP&d=15"
KP_REPO=F:/kipindi-main node scripts/live/ops/loser-share-settled.cjs
```

### ✅ 2. B2 — the bonus warning before confirming (shipped `5c1959ef`)

Inline on `/markets/[id]`, EN/SW/ZH, naming the amount still to wager, shown ONLY to a player
who holds an unfulfilled grant, computed on the READ path.

⏳ **But it has no live subject.** Production has **zero grants and zero bonus balance**, so
neither this warning nor the §2.5 rule it explains has ever been exercised by a real player.
⛔ `RULES.md` §2.5 keeps its ⏳ for exactly that reason. **Verifying it means granting a bonus
to a QA-fleet player and driving both routes** — the hedge (second side accrues nothing) and
the cancellation (turnover comes back). Both are proven on the real path by
`test:bonus-one-side`; neither has been proven in a wallet.

### ▶ 3. C2's SECOND TRANCHE — wallet, KYC, auth, proposals, objections

The registry covers **betting and cash-out**. The rest are enumerated at
[`FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) §2.3 and still render through `errorCopy`'s
**15 phrase tests** — matched against service strings in other files, with nothing asserting
those strings still contain those phrases. That is the single largest remaining risk in the C
workstream, and `RULES.md` §2.9 keeps its ⏳ for it.
⭐ Also still open from FAILURE-INVENTORY §1.5: **12 surfaces render a raw server string** and
**8 say only that something failed**. None are on the betting path.

### ▶ 4. E2 — the remaining documents

Done this session: `updown-operator-guide.html` (+ PDF regenerated and **rasterised, 42
distinct frames over 22 pages, looked at**), `rates-decisions-needed.html`, `RULES.md`,
`FAILURE-INVENTORY.md`, `README.md`, both session prompts.

⏳ **Not yet swept**, from the work order's list: `UPDOWN-PRICING.md` · `UPDOWN-SPEC.md` ·
`UPDOWN-ARCHITECTURE.md` · `FEE-MODEL-DECISION-2026-07-14.md` · `F6-LIQUIDITY-DESIGN.md` ·
`GO-LIVE-RUNBOOK.md` · `MODULE-CERTIFICATION-PROGRAM.md` · `NEXT-PLAN.md` ·
`POLL-OPEN-FINDINGS.md` · `design-master-brief.md` · `50pick-fee-decision.docx` ·
`50pick-fee-model-examples.docx`.

⚠️ **`LIVE-QA-CAMPAIGN.md`: do not touch the measurement rows.** Every fee figure in it records
a settlement that really happened at the rate that market froze. One banner at §0. Its open
item at :3994 (the ⅓ rounding breach) is **dissolved** by the new rule — close it explicitly.

---

## §3 · WHAT THIS SESSION LEARNED THE HARD WAY

Six of these cost real time. They are here because each one produced a GREEN that meant nothing.

1. **A correct number under a retired law is worse than a wrong one.** `/admin/updown` showed
   TZS 650 — right — captioned `capped-commission 13%`. An operator who checks the arithmetic
   finds it sound and trusts the label.
2. **"It contains the figure" is not "it is a finished sentence".** The stake-bounds copy
   rendered *"Minimum bet is TZS 1,000. Enter {min} or more…"* — `String.replace` with a
   string pattern fills only the FIRST occurrence. Every "does it name the minimum" assertion
   was green, in three languages. Only reading the output caught it.
3. **A caption can be right, tied out, and unreadable.** The same caption was ELLIPSISED at
   exactly 1024px. Clipping inside a card never reaches `document.scrollWidth`, so no
   page-level overflow check could ever see it. `qa:admin-updown-widths` now reports the
   BUDGET (144px box, 210px content, 7.24px/char) rather than just the verdict — guessing
   costs a deploy per attempt.
4. **A test that asserts a slogan ships a slogan.** `updown-engine` 8b.12 first asserted
   *"hedging both sides COSTS the player"*. Executed, it went RED: the hedger finished **6,750
   UP**. That is the SAME false claim the retired player copy made — I wrote the correct
   explanation into the i18n comment and the wrong assertion into the test, an hour apart.
5. **A section can pass while proving nothing.** `thin-alert` §5 asserted "each trigger catches
   a market the others miss" — both fixtures fired both triggers and the assertion was loose
   enough to be green anyway. Worked out properly, `thinUpside` is a strict SUBSET of
   `lopsidedBook` at the shipped 13% rate and cannot fire alone; they separate only above
   r ≈ 71.7%.
6. **"N frames captured" is not "N pages looked at".** The first rasteriser wrote 22 files that
   were all page 1 and reported success. The second landed 17 of 22. `#page=N` navigation
   reloads the viewer and landed 1 of 22. It now sweeps in small steps and **hashes each
   frame**, and refuses to report a document as rasterised with fewer distinct frames than
   pages. ⚠️ It must run HEADED — headless Chromium downloads a PDF instead of displaying it.

⚠️ **And the work order's own lists have gone stale in places.** `/admin/markets/new/wizard.tsx`
and `/admin/markets/[id]` were listed under F3 as "do not branch on the model". **Both branch
correctly** — they were fixed after the order was measured. Ask "is this the product, or my
list?" before filing.

---

## §4 · TOOLS SESSION 2 LEFT YOU

| | |
|---|---|
| `node scripts/live/ops/loser-share-settled.cjs` | READ-ONLY. The three A4 money questions, asked of production. ⭐ Counts EMPTY rounds separately and goes RED when the whole population is empty — a probe that scored 18 empty rounds as "16 one-sided verified" is what it was written to replace |
| `npm run qa:loser-share-money` | places real fleet money on production. `A4_PLAN=two-sided\|one-sided\|void` |
| `npm run qa:updown-card-widths` | the player card at 4 widths + the retired-model counterfactual |
| `npm run qa:admin-updown-widths` | the admin fee tile at 4 widths, with the truncation BUDGET in px |
| `npm run qa:rasterise-pdf -- <file.pdf> <outDir>` | ⛔ headed; refuses to claim pages it did not capture |
| `npm run test:fee-model-caption` / `red:` | 45 / 9 |
| `npm run test:bonus-one-side` / `red:` | 22 / 6 |
| `npm run test:thin-alert` / `red:` | 19 / 6 |
| `npm run test:failure-reasons` / `red:` | 48 / 9 |
| `npm run test:rate-copy` / `red:` | 20 / 7 |

⚠️ Session 1's traps all still apply: the audit table is an HMAC chain (never hand-write an
INSERT), `Transaction` has no `marketId`, `railway run` reads the internal DB host, and a
column name in backticks inside a template literal closes the string.

⚠️ **New:** the i18n dictionary stores some characters as LITERAL `\u00d7` escape text and
others as real characters, in the same file. An anchor built with `\u00d7` in a JS template
literal will not match the former. Check with `JSON.stringify` before trusting an anchor.

---

## §5 · DEFINITION OF DONE — where it stands

| | |
|---|---|
| ✅ | A market frozen before the change still settles on its old rates — 4,220 rows, 10/10 sampled |
| ✅ | The stranded candidate rows corrected |
| ✅ | `docs/RULES.md` exists and is the authority |
| ✅ | **A real bet on production settling at 13% of the losing side, tying out exactly** — Up & Down. ⏳ a long-form POLL has not been driven |
| ✅ | A player can hold both sides; the second side accrues no wagering credit | 
| ✅ | …and a bonus-holding player is **warned first** — B2 shipped. ⏳ never exercised live: production has ZERO grants |
| ✅ | **999 refused with a message naming the minimum; 1,000,000 accepted** — both products, three languages |
| ⏳ | Every failure encountered while driving states a reason at a matching severity — betting/cash-out done, §2.3 open |
| ✅ | The **Terms page** and the **in-app assistant** state the current fee rule |
| ✅ | The lopsided-market alert fires under the new model, proven on a fixture |
| ✅ | A search for the old phrasing returns only deliberate, labelled legacy references |
| ✅ | Operator guide + both rates PDFs regenerated, **rasterised, pages viewed** |
| ⏳ | A **VOID** on production charging nothing, on a real one |
| ✅ | `npm run test:all` green and every new guard seen red first |

⛔ **§10 of the work order still binds.** No rewriting any `feeSnapshot`. No re-adding
`AUTO_SETTLE`. No touching the price band, the tick floor or `computeTargets`. No `git add -A`.
No commit without checking the branch. No claiming any of it is done from a passing suite.
