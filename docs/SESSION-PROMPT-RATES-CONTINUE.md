# SESSION PROMPT — CONTINUE THE RULES PROGRAMME (session 2 of N)

> Written 2026-08-14 at the close of session 1. **The work order is
> [`docs/SESSION-PROMPT-RATES-AND-FAILURES.md`](SESSION-PROMPT-RATES-AND-FAILURES.md) and it is
> still the authority** — read it in full. This file records only what session 1 finished, what
> it found that the work order did not know, and exactly where to pick up.
>
> ⛔ **Read [`docs/RULES.md`](RULES.md) first.** It did not exist when the work order was
> written. It is now the single authoritative statement of the money rules, and every remaining
> task either enforces it or points at it.

---

## §0 · HOW THIS SESSION MUST WORK — unchanged, and it is not decoration

Everything in §0 of the original work order still applies. The three that earned their place in
session 1, with what they actually caught:

1. **A code default is not a live setting.** `test:config` asserted `minStake === 1_000`, green,
   for 19 days while production charged a **TZS 500** floor on both products. Verify every
   config change by READING THE DB.
2. **Every guard proven RED first, with a positive control in the same run.** Two of the six
   `red:updown-cutover` mutations are the *mistake*, not the bug — `history-repriced` would have
   silently repriced 4,220 frozen rounds and a suite that only checked the new rate would have
   been green on it.
3. **A guard whose anchor has gone stale is an ABSENT guard, not a failing one.** Moving the
   AI-publish chain out of the server action turned `test:criterion-i18n` §8 red; it was
   RE-ANCHORED, never relaxed, plus a new assertion that the action still calls the module so
   the section cannot become a reading of dead code.

**Ali's standing instructions, added mid-session:**
- **Perfect code and logic only. No workarounds.** Where a rule change broke a fixture, the
  fixture was corrected to the real scenario (a legacy row written through the DAL) — never the
  rule weakened to keep a test green.
- **Update the real docs properly, every time**, in the same commit as the change.
- **When you need a new session: stop, update the docs, and write the next prompt.** That is
  what this file is.

---

## §1 · WHAT SESSION 1 SHIPPED — all pushed to `main` and live

| Commit | | Verified how |
|---|---|---|
| `7b27ff25` | **D1/D3** — the AI-poll publish false alarm | deploy confirmed live; `test:aipoll-publish` 33/33; `red:aipoll-publish` 6/6 |
| — | **D2** — 4 stranded candidate rows corrected on production | money fingerprinted before AND after: unchanged |
| `f70042e0` | **A1** — the stake bounds are a rule | live DB read back: 500 → **1,000**, 100,000 → **1,000,000** on both products |
| `36a44842` | **C1** — the failure inventory | `docs/FAILURE-INVENTORY.md`, committed before any C fix |
| `ba851514` | **A2/A3** — Up & Down → `loser-share` | see below |

**A2 is fully verified on production (2026-08-14 13:08):** `updown.config.defaultRateProfile`
reconciled to `loser-share`; **16/16** `UpDownChain.rateProfile` rows migrated by
`ops:updown-loser-share` and read back off the DB; and **a new round opened at 13:08 froze
`loser-share` while all 4,220 legacy rounds still hold `capped-commission`** — the no-mix
guarantee holding on real production data, not on a fixture.

`npm run test:all` → **210/210 green** at `ba851514`.

### Three things the work order did not know

1. **There were FOUR stranded candidate rows, not three.** A fourth fired at 2026-08-14 10:29,
   after the order was written. `ops:d2-publish-false-alarm` now derives the list from the audit
   log rather than trusting a hardcoded one, and reports which rows were not in the order.
2. **The withdrawal fee was already 1.5% on production.** The code default read 1% and
   `test:withdrawal` asserted the 1%. The TEST was out of step with reality, not the platform.
   Both corrected; the Terms page still says 1% (workstream F2, below).
3. **🔴 Up & Down is no longer outcome-neutral, and the work order does not mention it.**
   `capped-commission` reads only the two pool sizes and is byte-identical whichever side wins —
   `docs/F6-LIQUIDITY-DESIGN.md` §3.1 names that as the pari-mutuel licence anchor and it is the
   stated reason the 2026-07-24 ruling chose it. `loser-share` charges a slice of whichever side
   LOST. Polls have been outcome-dependent since 2026-07-23 under Ali's explicit override; A2
   extends that override to the second product. **Recorded in full in
   `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14 and FLAGGED FOR ALI AND THE GBT FILE.**
   ⛔ Do not re-litigate it in code. Do raise it with Ali.

### The corrected counts (the work order's numbers were measured earlier)

| | order said | measured |
|---|---:|---:|
| `INVALID` returns | 102 | **108** |
| player toast sites | 23 | **46** (+3 modals, +12 inline banners) |
| copy mappers | 2 | **4**, and they disagree |
| UPDOWN rounds frozen on the old model | 3,767 | **4,220** and rising until the cutover |
| the 70/30 fee-seam claim in `UPDOWN-PRICING.md` | — | **it is not there.** It lives in `CLAUDE.md`, `F6-LIQUIDITY-DESIGN.md` and `FEE-MODEL-DECISION-2026-07-14.md` |

---

## §2 · PICK UP HERE — the remaining order of work

The original §8 order, with what is done struck out:

~~1. D~~ · ~~2. A1~~ · ~~3. C1~~ · ~~4. A2–A3~~ · ~~5. A4 (code + guard)~~ · **→ 6. B · 7. F1 · 8. C2–C5 · 9. F2–F5 + E**

### ✅ A4 — the caption beside the money (session 2)

The hardcoded `delta="capped-commission 13%"` at `/admin/updown` page.tsx:210 is gone, and so
is the reason it could exist:

- **`describeFeeModel(rates)`** (`payout.ts`) derives the model NAME and its rate from the
  same resolved rates `poolFee` charges. A caption can no longer disagree with the fee
  beside it.
- **`boardFeeSummary(chains, cfg)`** (`updown-config.ts`) answers "what is this game on"
  from EVERY configured chain, not from `defaultRateProfile` — which is what a NEW chain
  would freeze and what no live chain reads. A half-migrated board now renders `split`
  with a danger-toned value instead of one law printed as if it were all.
- **`test:fee-model-caption` (39 checks) / `red:fee-model-caption` (8/8 red)** — mutation 1
  is the `8c06517f` source verbatim; mutation 8 is not a defect at all, it renames the tile
  so the guard's anchor goes stale, and proves the guard goes RED rather than finding
  nothing and reporting clean.
- **`scripts/live/ops/loser-share-settled.cjs`** — READ-ONLY, asks production the three A4
  money questions. On 2026-08-14 13:29 it reported **4.2 green: 10/10 settled LEGACY rounds
  still settle by `min(commission × pool, ⅓ × smaller)`** — the no-mix guarantee on real
  money — and **1.★★ RED: all 18 settled loser-share rounds were EMPTY**, so nothing about
  the new model had been proven with a shilling on it. That red is what forced the money
  drive below; a probe that counted empty rounds as one-sided would have reported 16 green.

**Looked at, on production, 2026-08-14 13:38** — six QA-fleet players put **TZS 21,000** of
real money on ONE round (`mkt_39b5c1731ae41480406e`, YES 8,000 / NO 13,000, `loser-share`)
via `npm run qa:loser-share-money`, and `npm run qa:updown-card-widths` photographed the card
at **360 / 768 / 1024 / 1440**. All four read **`Up × 2.25 est.` · `Down × 1.49 est.`** over
`VOL TZS 21,000 · ≈ 6 · Up 38% / 62% Down`. Priced through the same `payoutFor` under the
RETIRED profile those same pools give **× 2.12 / × 1.38** — so the multiplier reads **higher
under the smaller fee**, measured rather than impressed.

⚠️ Two harness traps this cost, both now written into the scripts:
- **The card FLOORS the multiplier to 2 dp, it does not round.** 2.2567 renders `2.25`. A
  probe that rounded reported a 0.01 disagreement with a card that was exactly right.
- **An empty round reads `× 1.00` under BOTH fee models** — one-sided, so the stake simply
  comes back. The first drive photographed six `× 1.00` buttons and proved nothing.

⏳ **Still open on A4** — needs a settled round of each shape:
- a one-sided round refunding in full, and a VOID charging nothing, **on a real one**.

### ▶ B — bet logic (the largest remaining piece)

⛔ **B1 and the wagering rule ship in ONE commit.** The window between them is the exploit; the
work order quantifies it at 6,750 per grant.

An exact, ordered edit list — pre-flight checks, the two surgical edits, the tests to invert
red-first, and the surfaces built on "this state cannot exist" — is in the session-1 inventory
at `docs/FAILURE-INVENTORY.md` §3 and in the notes below. The essentials:

- `market-service.ts` — delete **only** the `if (opposite) {…}` block and the `const opposite =`
  line. ⛔ **KEEP `const mine = …`**: it feeds `predictorCount`, which feeds the UD card, the
  admin economics panel, the regulator match-integrity report and the public share card.
- **Same commit:** gate the `recordWageringLocked` call on `!opposite`. The predicate is already
  computed in the same lock, in the same transaction, still in scope — no new query, no new lock.
- Invert red-first, do NOT delete: `updown-window.test.mts` §6 · `updown-quickbet.test.mts`
  (⚠️ §5 breaks as a side effect) · `updown-engine.test.mts` · `maintenance-mode.test.mts`
  (comment only). Delete mutation 6 of `updown-window-red.mjs` or `red:all` goes red on a stale
  anchor rather than a defect.
- **B1b — a SECOND hole, found in session 1 and not in the work order.** `cashOutPosition` never
  calls `reverseWagering`. A grant holder can bet, cancel free inside 5 minutes, get the full
  stake back **and keep the turnover credit** — clearing a 5× bonus at zero cost, repeatedly.
  This exists today, independently of the hedge exploit, and is arguably larger now cancellation
  is free for 5 minutes on both products. Fix it in the B commit.
- **B2** — the warning before confirming. ⛔ It **cannot** be computed inside the bet
  transaction: `getBonusSummary` issues its own wallet read and would block on the bet's own
  uncommitted row (the P2028 self-deadlock documented at `bonus-service.ts:235-243`). It belongs
  on the READ path — which is fine, because it is a warning, not a gate. Copy is drafted in
  EN/SW/ZH at `docs/FAILURE-INVENTORY.md` §2.4.
- **B3** — `market-service.ts:1970` tells an Up & Down player about a **"poll"**, on a path with
  no productLine branch; on a 5-minute round it is the ORDINARY branch. And
  `hedgeBothBody`/`hedgeOppositeBody` (EN/SW/ZH) state the retired fee model and become
  REACHABLE the moment the guard goes.

### ▶ F1 — the lopsided-poll alert (do it as soon as B lands, it is a live capability)

`market.selection_closed.thin_poll` fires on `closeFee.capped || closeFee.smaller === 0`.
**`poolFee` returns `capped: false` for loser-share, always** — so it has been half-dead for
every loser-share poll since 2026-07-23 and, since A2 shipped, is now **completely silent for
Up & Down** except on a fully one-sided market.

A grounded replacement, with every variable already in scope at `market-service.ts:1322`, is in
the session-1 inventory: use `payoutByPosition` (already model-correct under both models,
because `settledPayoutFor` is given the side) to compute the worst winner ratio, and fire on
`oneSided || leanFor(worstRatio, rates.thinProfitRatio) === "thin" || smallerShare < 0.15`.
⛔ Prove it RED on a genuinely lopsided fixture first.

### ▶ C2–C5 — the failure sweep

The map is `docs/FAILURE-INVENTORY.md`, committed. It carries the reason registry, the severity
per reason, the four drafted copies in EN/SW/ZH, and seven defects found while making it. Note
in particular:

- ⛔ **`warning` may NOT be a gold toast.** `toast.tsx:236` paints that variant gold and gold
  means earned money only. Use NoticeBar `warning`, Callout `warning`, or toast `default`.
- **A1 is not fully closed until C2 lands.** The work order requires a 999 stake refused *with a
  message naming the minimum*. The SERVER already names both bounds; neither player surface
  shows it — polls fall through to "That didn't go through", Up & Down discards the string by
  design. That is C2's first job and it completes A1's acceptance.
- The server-redirect channel (`wallet/withdraw`, `wallet/deposit`, `profile/kyc` actions)
  URL-encodes a localized STRING into a query param. A severity has to ride alongside it or
  those four surfaces keep their single tone. **Decide this before writing the renderer.**

### ▶ F2–F5 + E — copy, comments and the document sweep

Every disposition is already decided and recorded. Highest risk first:

- 🔴 **`src/app/legal/terms/page.tsx`** — §4 states the retired rule in **all three languages**
  (EN :64, SW :180, ZH :293) and §5 states the withdrawal fee as **1%** (:97, :214, :318). This
  is the binding legal document and it contradicts the platform *today*.
- 🔴 **`src/app/_actions/chat.ts:106-107,113`** — the assistant's system prompt teaches players
  the retired fee rule, a "base TZS 500" stake, a "1x-200x multiplier" and a paid cash-out
  window that is switched off. It will state all of it confidently.
- `i18n-dict.ts`: `hedgeOppositeBody` · `hedgeBothBody` · `resFeeCappedNote` · `card3Body` ·
  `howStep3B` · `estimateHowItWorks` (**hardcodes "1.5×"**) — EN, SW **and** ZH.
  ⚠️ `faq1a` and `payoutHowItWorks` are correctly **gated** on the non-loser-share branch —
  leave them; they are the legacy model's fallback.
- **F5** — `test:rate-copy`, proven red on `estimateHowItWorks`. `docs/RULES.md` §7 is its
  allowlist and is currently empty; the guard does not exist yet and RULES.md says so.
- **E2** — dispositions per file (CORRECT IN PLACE vs MARK SUPERSEDED) are decided; the worst is
  `docs/updown-operator-guide.html`, the document non-technical admins are physically handed. It
  states the opposite of the new rule on positions (:120) and carries a fully worked ceiling
  example (:344-350). ⛔ Editing the HTML ships nothing — regenerate the PDF and **rasterise it**.
- ⚠️ `docs/LIVE-QA-CAMPAIGN.md`: **do not touch the measurement rows.** Every fee figure in it
  records a settlement that really happened at the rate that market froze. One banner at §0.
  Its open item at :3994 (the ⅓ rounding breach) is DISSOLVED by the new rule — close it
  explicitly.

---

## §3 · TOOLS SESSION 1 LEFT YOU

| | |
|---|---|
| `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs` | mint a live `DATABASE_URL`; asserts the internal host was rewritten |
| `KP_REPO=F:/kipindi-main node scripts/live/ops/rates-census.cjs` | **what the platform actually charges** — persisted config, all 16 chains, and every distinct frozen snapshot with counts |
| `npm run ops:d2-publish-false-alarm` | dry-run by default; derives its list from the audit log |
| `npm run ops:updown-loser-share` | dry-run by default; migrates chain rows through the audited `updateChain` |
| `npm run test:updown-cutover` / `red:updown-cutover` | both fee models settling side by side on the real path |
| `npm run test:aipoll-publish` / `red:aipoll-publish` | the publish chain, executed |
| `npm run red:stake-bounds` | includes the exact 2026-08-14 "constant right, production wrong" state |

⚠️ **The audit table is an HMAC chain** (`prevHash`/`entryHash`, both UNIQUE, `@@unique([prevHash])`).
Never hand-write an `INSERT INTO "AuditLog"` — go through the product's own `audit()`. The first
draft of the D2 script did exactly that and would have broken every later verification.

⚠️ **Transaction has no `marketId`.** Reach the ledger side of a market THROUGH its positions.

⚠️ **Do not write a column name in backticks inside a template literal** — it closes the string
and the parse error lands on a line you did not touch.

---

## §4 · DEFINITION OF DONE — the original §9, with what is already proven

| | |
|---|---|
| ✅ | A market frozen before the change still settles on its old rates — proven on 4,220 real production rounds |
| ✅ | The stranded candidate rows are corrected and the officer no longer sees a false publish failure |
| ✅ | `docs/RULES.md` exists |
| ⏳ | A **real bet placed on production** under the new rules, on both products, settling at 13% of the losing side and tying out exactly |
| ⏳ | A player can hold both sides; a bonus-holding player is warned first and the second side accrues no wagering credit |
| ⏳ | 999 refused **with a message naming the minimum**; 1,000,000 accepted on both products |
| ⏳ | Every failure encountered while driving the above states a reason at a matching severity |
| ⏳ | The **Terms page** and the **in-app assistant** state the current fee rule, checked by reading them as a player would |
| ⏳ | The lopsided-poll alert fires under the new model, proven on a fixture |
| ⏳ | A search for "10% of the pool", "a third of the smaller side", "capped commission" returns only deliberate, labelled legacy references |
| ⏳ | Both PDFs + the operator guide regenerated, **rasterised, every page viewed** |
| ⏳ | `npm run test:all` green and every new guard seen red first |

⛔ **§10 of the work order still binds.** No rewriting any `feeSnapshot`. No re-adding
`AUTO_SETTLE`. No touching the price band, the tick floor or `computeTargets`. No shipping B1
without the wagering change in the same commit. No `git add -A`. No commit without checking the
branch. No claiming any of it is done from a passing suite.
