# SESSION PROMPT — FINAL RULE SET: rates, bet logic, failure messaging, and one clean rules kit

> Prepared 2026-08-14. **All rules are decided — there are no open questions.** Every fact in §2 was measured
> against **production** on 2026-08-14 (live config + live DB, cross-checked against `/api/health`: 75 users).
> Nothing in this programme has been coded yet.
>
> **Paste everything below into a new session and work it end to end.**

---

## §0 · HOW THIS SESSION MUST WORK

**Do not stop until every workstream in §8 is complete and verified. Do not come back with partial work,
and do not ask permission to continue between workstreams — the decisions are already made and recorded here.
Come back when it is done, or when you hit something that genuinely contradicts this document.**

We are going live soon. The reason this programme exists is that our documentation currently contradicts our
system in several places, and an administrator was misled by it this week. Half-finished work here is worse than
no work, because it creates a third version of the truth.

1. **A green suite is not evidence.** Every claim is driven against production and looked at. Ask of every
   check: *would this still pass if the feature were absent?*
2. **Every guard is proven RED first** — watch it fail for the right reason, then fix, then watch it pass.
   A refusal check needs a positive control in the same run, or fixing the defect turns the check red.
3. **LOOK AT IT.** A passing test is not a screen. Every player-facing change in this programme is verified by
   driving the real UI on production and viewing it at **360 / 768 / 1024 / 1440**. Every PDF is verified by
   **rasterizing the real PDF and viewing every page** — never by screenshotting the HTML source, which is a
   different document and will hide pagination faults.
4. **One fix, one commit, docs in the same commit.** Full validation before *each* commit, not once at the end.
5. **`git branch --show-current` before every commit.** The working tree is shared with another session.
   **Never `git add -A`.** Every push to `main` deploys LIVE to 50pick.tz.
6. **Frozen money is frozen.** A market's `feeSnapshot` is stamped at creation and settles by it forever.
   **Nothing in this programme may rewrite, backfill or migrate an existing snapshot.** If you find yourself
   writing an UPDATE against `feeSnapshot`, stop.
7. **`railway run` injects `postgres.railway.internal`**, which resolves nowhere off-platform — rewrite onto
   `turntable.proxy.rlwy.net:40357` or every read silently returns DEFAULTS. Cross-check any probe against
   `/api/health` before believing it.

---

## §1 · THE FINAL RULE SET — the single source of truth

Everything this session writes, in code or in prose, must agree with this table exactly. It is signed off and
printed in `docs/50pick-betting-rules-final.pdf`.

| Rule | Value | Applies to |
|---|---|---|
| **Our fee** | **13% of the LOSING side** (Platform 3% + Operator 10%) | **Both games — identical** |
| Tax on our fee | TRA 10% + GBT 5% of the fee we earned, never from a player's payout | Both |
| **Minimum stake** | **TZS 1,000** | Both |
| **Maximum stake** | **TZS 1,000,000 — per bet**, not per player per market | Both |
| **Positions per market** | **Unlimited, either or both sides** | Both |
| **Bonus wagering** | Only **one side** of a market counts toward a bonus requirement | Both |
| Free cancellation | 5 minutes, full refund, then locked | Both |
| Withdrawal fee | 1.5% of the amount withdrawn | Platform |
| Failure messages | Must state the reason and the next step; severity must match — a fixable problem is a **warning**, not a red error | Whole player UI |

**Accepted consequences, already recorded — do not re-open them:**
- On a balanced Up & Down round our income halves (26% → 13% of the losers' money). Deliberate: one charge
  model the customer can understand.
- Per-bet cap + unlimited positions means total exposure on one market is not bounded by the maximum. The
  player's balance and the daily loss limit are what bound it.

---

## §2 · MEASURED PRODUCTION STATE (2026-08-14)

**Money config.** Polls: `loser-share`, 3% + 10%. Up & Down: `capped-commission`, 13% of pool capped at ⅓ of the
smaller side, held in `SystemConfig["updown.config"].defaultRateProfile` **and separately on all 16
`UpDownChain.rateProfile` rows** — the chains will NOT inherit a changed default. 3,767 UPDOWN markets and 58
legacy polls are frozen at capped-commission; 44 polls at loser-share.

**Stake bounds.** `market.config`: min **500**, max 1,000,000. `updown.config`: min **500**, max **100,000**.
All 16 chains have `minStake`/`maxStake` NULL, so they inherit — only the two config rows need changing.

**Bet logic.** Multiple positions on the same side already work (production has one user with **20 bets on one
round**). Opposite sides are blocked by the "ONE ACCOUNT, ONE SIDE" guard in `buyPosition`
(`src/lib/server/market-service.ts`, inside the wallet lock). 15 both-side groups exist, all polls, latest
2026-08-03; zero since the guard shipped 2026-08-04.

**Bonus.** Zero grants, zero bonus balance on production. Default: 5× turnover, 30-day expiry.
`recordWageringLocked` credits turnover on **every** stake placed, inside the bet transaction; refunds reverse it.

**Failure messaging.** `INVALID` is returned **102 times** across services and carries no reason. Other codes:
`NOT_FOUND` 33, `RATE_LIMITED` 16, `SUSPENDED` 14, `SELECTION_CLOSED` 4, `PAUSED` 3, `AUTH` 3, ~12 one-offs.
Only **9 player files** use the shared mapper; there are **23 player toast sites**. The good precedent to
generalise is `src/components/updown/updown-bet-errors.ts` (`udBetErrorCopy`). A known lie:
`conviction-dial.tsx` maps **any** thrown server action to `BUSY` ("your stake hasn't moved"), so a genuine
server crash reads to the player as "we're busy".

**AI-poll publish false alarm.** `aipoll.publish_link_failed` fired 2026-08-11 05:05, 2026-08-14 08:25,
2026-08-14 08:36 — all with `pollLinked: true`, `marketPublished: false`, all three markets LIVE
(`mkt_034555d0c988640474d8` 2 bettors, `mkt_49303bbf4faec0e38524` 15,000 staked, `mkt_02fe245420ecec12fc80` 0).
Cause: `scoreCandidate` sends anything below `CONFIDENCE_PUBLISH_THRESHOLD = 75` to `FILTERED_OUT`;
`approveCandidate` then returns **null** and **its return value is discarded**; `createMarket` runs anyway;
`markPublished` fails; the officer is told "failed" about a live market. Candidates: 120 PUBLISHED (75–92),
106 FILTERED_OUT (52–72).

---

## §3 · WORKSTREAM A — the money

### A1 · Stake bounds → 1,000 / 1,000,000 (do this first, it is the smallest)
- `market.config`: `minStake` 500 → **1,000**.
- `updown.config`: `defaultMinStake` 500 → **1,000**, `defaultMaxStake` 100,000 → **1,000,000**.
- Change the code defaults **and** the live config, and verify the live values afterwards by reading the DB —
  a code default is not a live setting. Chains inherit; do not touch the 16 chain rows for this.
- Verify on the real Up & Down card that the stake panel offers the new range at all four widths, and that a
  bet of 1,000,000 is accepted and one of 999 is refused **with a message naming the minimum**.

### A2 · Up & Down fee → loser-share
- `defaultRateProfile` in `src/lib/server/updown-config.ts` → `feeModel: "loser-share"`,
  `platformFeeRate: 0.03`, `operatorFeeRate: 0.10`. Keep `feeCeilingRate` present but inert so an old snapshot
  read never sees `undefined`.
- **Then update all 16 `UpDownChain.rateProfile` rows** — they carry their own copy and will not inherit.
  Audited, one at a time, and verified per chain against the live board.
- Rounds already open keep the profile they froze. Do not touch `UpDownRound` or `PredictionMarket`.

### A3 · Prove the no-mix guarantee, red first
One run must assert: a round opened after the change settles **13% of the losing side**; a round frozen before it
still settles the old capped model; both satisfy the winner floor and exact conservation (Σ payouts + fee == pool).
Prove it red by pointing the new-round assertion at the old profile first.

### A4 · Look at the consequences
- The Up & Down card multiplier is pool-derived and **will read higher** (smaller fee). Confirm on the live
  board at all four widths.
- A one-sided round still refunds in full and charges nothing. Confirm on a real one.
- A VOID still charges nothing. Confirm on a real voided round.

---

## §4 · WORKSTREAM B — bet logic

### B1 · Remove the one-side guard AND land the bonus rule in the SAME commit
Remove the "ONE ACCOUNT, ONE SIDE" block in `buyPosition` and invert every test that asserts it (red first).

**In the same commit**, change wagering so that **only one side counts**: `recordWageringLocked` currently
credits turnover on every stake. It must credit only the side the player was already on — a stake on the opposite
side of a market accrues nothing toward a bonus requirement.

⛔ **These cannot ship separately.** The window between them is exactly the exploit: measured at the agreed rates,
a 10,000 bonus with a 5× requirement clears for 3,250 of fee — a 6,750 gift per grant, same day, no risk taken.

### B2 · The player must be warned before confirming
A player who holds an unfulfilled bonus and takes the opposite side of a market they are already on gets a
**warning, not a refusal**, before the bet is confirmed. The bet still goes through if they choose. Approved
draft (page 2 of the rules PDF):

> **This bet won't count toward your bonus.**
> You already have money on the other side of this market. Only one side counts toward the **TZS X** you still
> need to bet before your bonus can be withdrawn.
> `Place bet anyway` · `Cancel`

Only shown to a player who actually holds an unfulfilled grant. Build it with the C3 renderer, not as a one-off.
EN/SW/ZH.

### B3 · Copy that outlives the guard
- The deleted refusal was hardcoded to "UP"/"DOWN"/"round" in a path shared with polls — a poll player was told
  *"You already backed UP on this round."* Sweep the shared bet and cash-out paths for any other copy that names
  one product's vocabulary while running for both.
- `i18n-dict.ts:721` `hedgeOppositeBody` says *"our {pct}% commission applies to the pool"* — wrong after A2, and
  written for a rule we are removing. Rewrite or retire it.
- No surface may state the maximum stake in words implying it limits total exposure on a market.

---

## §5 · WORKSTREAM C — every failure explains itself

### C1 · Inventory first, committed before any fix
One table: surface → server code → real reason → current copy → proposed copy (EN/SW/ZH) → severity → next
action. Start from the 102 `INVALID` returns, the 23 player toast sites, the 9 files already mapped.
Nothing gets fixed before it is listed.

### C2 · Give refusals a reason, not just a code
Add a stable machine `reason` alongside the code (`stake_below_min`, `stake_above_max`, `selection_closed`,
`loss_limit_daily`, `balance_insufficient`, `market_not_live`, `kyc_required`, …). The code stays for API/audit
compatibility; the reason drives the copy. **Never phrase-match English prose to decide what to show** — that
bug is already documented in `error-copy.ts`.

### C3 · One renderer, three severities
- **info / warning** — the player can fix it: below minimum, above maximum, insufficient balance, selections
  closed, rate-limited, daily limit reached, the B2 bonus warning. Warning styling, the reason in plain words,
  one clear next action.
- **error** — a genuine fault or hard block: suspended account, self-exclusion, system error.
- No screen renders a raw server string as a headline, ever. No screen says only "failed".

### C4 · Kill the BUSY lie
Separate a real `AdmissionBusy` from an unexpected throw and give the throw its own honest copy. Keep the
idempotency-key retry exactly as it is — that part is correct and is what makes retrying safe.

### C5 · A guard that can actually fail
Assert every player-facing failure path renders a reasoned, localized sentence. Prove it red against a surface
that currently renders a bare string. It must fail when a NEW unmapped failure path is added — a count of mapped
surfaces is not enough.

---

## §6 · WORKSTREAM D — the AI-poll publish false alarm

- **D1** · In `publishAIPollAction`, stop reporting failure for a market that is live and bettable. Recommended
  shape: a human officer's approval satisfies the pipeline, so the redundant 75-score gate does not apply on the
  human-in-the-loop path. Guard proven red first with a candidate scored below 75.
- **D2** · Correct the three stuck rows — `cand_b1445133f4fe3f2223be9205`, `cand_adb5a50a688130f55535a416`,
  `cand_ee4ec4f6ccf9bd8b2839fbab` — audited, one-off. Verify the three markets' money is untouched before and
  after. Note only the candidate row is wrong; the AiPoll rows linked correctly.
- **D3** · Record in `docs/COMPLIANCE-DECISIONS.md`: **a human approval wins**; the 75 threshold applies only to
  publishing with no human in the loop.

---

## §7 · WORKSTREAM E — clean every document, and leave a rules kit

**This is why the session exists. We cannot go live with documentation that contradicts the system.**

### E1 · Build the canonical rules kit
Create **`docs/RULES.md`** — the one authoritative statement of §1, with, for each rule: the value, the date and
who decided it, where it is enforced in code, where it is configured, and which player-facing surfaces state it.
Every other document links to it rather than restating the numbers. This is the artefact that answers, months
from now, *"what are our rules and why"*.

### E2 · Sweep every document and fix or retire it
Each of these contains rate, fee, stake or bet-logic claims that this programme changes. Read each one and
either correct it, or mark it superseded with a pointer to `docs/RULES.md` — **do not leave a third version of
the truth anywhere**:

`docs/UPDOWN-PRICING.md` (also states the fee seam is at 70/30 — true only at a 10% commission; at 13% it is
39%, and after A2 the seam does not exist at all) · `docs/UPDOWN-SPEC.md` · `docs/UPDOWN-ARCHITECTURE.md` ·
`docs/FEE-MODEL-DECISION-2026-07-14.md` · `docs/COMPLIANCE-DECISIONS.md` · `docs/F6-LIQUIDITY-DESIGN.md` ·
`docs/README.md` · `docs/GO-LIVE-RUNBOOK.md` · `docs/MODULE-CERTIFICATION-PROGRAM.md` · `docs/NEXT-PLAN.md` ·
`docs/LIVE-QA-CAMPAIGN.md` · `docs/POLL-OPEN-FINDINGS.md` · `docs/design-master-brief.md` ·
`docs/50pick-updown-operator-guide.pdf` + `docs/updown-operator-guide.html` · `docs/50pick-fee-decision.docx` ·
`docs/50pick-fee-model-examples.docx`.

### E3 · In-app and player-facing copy
The rules must read the same in the app as in the documents: `/admin/config` and `/admin/updown` help text, the
fee simulator, the market-creation wizard, `i18n-dict.ts` (fee wording, stake hints, `hedgeOppositeBody`, the
`estimateHowItWorks` string that **hardcodes "1.5×"** instead of reading the configured rate), the player rules
/ terms pages, and the bonus terms shown at grant. EN/SW/ZH.

### E4 · Re-issue the PDFs, and verify them properly
`docs/rates-for-admins.html` and `docs/rates-decisions-needed.html` have already been rewritten to the final
rules. Regenerate with `node scripts/generate-rates-pdf.mjs` after any rule detail changes, then **rasterize the
real PDF and look at every page**. Both must state exactly §1 and nothing else.

---

## §7b · WORKSTREAM F — the deep sweep: comments, labels, and logic that quietly changes meaning

Changing the fee model does not only change arithmetic. It changes what dozens of **comments, labels, legal
sentences and conditional branches** mean. A comment that states the old rule is not cosmetic — it is the next
engineer's source of truth, and a label is the customer's. **Sweep all of it.** The findings below were measured
on 2026-08-14 and are a starting list, not the whole list.

### F1 · Logic that silently loses meaning — fix these first, they are defects
- 🔴 **`market.selection_closed.thin_poll`** (`src/lib/server/market-service.ts:1322`) fires when
  `closeFee.capped || closeFee.smaller === 0`. **`poolFee` returns `capped: false` for loser-share, always.**
  So this admin alert — "this poll is lopsided, an officer should know before the result lands" — has already
  been half-dead for the 44 loser-share polls since 2026-07-23, and goes **completely quiet for Up & Down**
  after A2, firing only for fully one-sided markets. Decide a replacement trigger that works under the new
  model (smaller side below a share of the pool, or worst winner ratio below a threshold), and prove it RED
  on a genuinely lopsided fixture before fixing.
- Enumerate every other reader of `.capped`, `.ceiling`, `.shareOfLosers` and `feeCeilingRate` outside
  `payout.ts` and decide each one. Under loser-share `ceiling` holds the losing pool and `capped` is never
  true — several surfaces will render confidently wrong numbers rather than fail.

### F2 · Player-facing and LEGAL copy stating the old rule — highest risk
- 🔴 **`src/app/legal/terms/page.tsx:64,68`** — the **Terms and Conditions** state *"Our commission is 10% of
  the pool, but never more than a third of the smaller side"* and *"more than a third of what you win"*. This
  is a legal document that will contradict §1 the moment A2 ships.
- 🔴 **`src/app/_actions/chat.ts:107`** — the in-app assistant's system prompt **teaches the old rule to
  customers**, in detail. It will confidently tell players the wrong fee.
- `src/lib/i18n-dict.ts`: `:548` howStep3B · `:1451` card3Body · `:679` resFeeCappedNote (describes capping and
  can never fire under loser-share) · `:721` hedgeOppositeBody · `:1619` estimateHowItWorks (**hardcodes
  "1.5×"** instead of reading the configured rate) · `:80` explanatory comment. **EN, SW and ZH — all three.**
- `src/components/markets/house-lean-warning.tsx` · `src/components/markets/resolution-panel.tsx:55`
  ("what 10% of the pool WOULD have been").

### F3 · Admin surfaces
- `/admin/config` **already branches on `feeModel`** (`config-form.tsx`, `fee-simulator.tsx`, `page.tsx`) —
  verify it reads correctly once Up & Down is loser-share too, rather than assuming.
- `src/app/admin/config/page.tsx:133-134` explains that the two rules *"cross over"* at a computed percentage.
  **That crossover does not exist under loser-share.**
- `src/app/admin/markets/new/wizard.tsx:132` and `src/app/admin/markets/[id]/page.tsx:265` do **not** branch on
  the model — they present capped-commission concepts unconditionally.
- `/admin/updown`: the chains table and Thresholds help text describe the old profile.

### F4 · Comments and names
- 🔴 **`src/lib/payout.ts` header** — the "THE RULE" block states *"Our commission is 10% of the pool, but never
  more than a third of the smaller side"* as **the** rule, with a long justification for the ceiling. It is the
  first thing any engineer reads about our money. Rewrite it so the two models are presented as what they are:
  legacy, and current.
- `src/lib/server/market-config.ts:197` · `src/lib/server/updown-config.ts:151`.
- Test and script names that assert the old model. Renaming a test is fine; **do not rename an audit `action`
  string that already exists in production history** without recording the change.

### F5 · The method, so this does not rot again
Any comment or label that states a rate must either **read it from config** or **point at `docs/RULES.md`** —
never restate a number inline. Where you find an inline number that cannot be made data-driven, add it to
`docs/RULES.md` as a known duplicate with its file and line.

Finish with a guard: a check that fails when player-facing copy hardcodes a rate figure. Prove it red against
`estimateHowItWorks`, which hardcodes "1.5×" today.

---

## §8 · ORDER OF WORK

1. **D** — publish false alarm. Smallest, and it is actively misleading an officer on a live money surface.
2. **A1** — stake bounds. Small, self-contained, unblocks the documents.
3. **C1** — the failure inventory only. It is the map for everything after it and needs no decisions.
4. **A2–A4** — the Up & Down fee change.
5. **B** — bet logic + bonus wagering + the warning. One commit for B1, as stated.
6. **C2–C5** — the failure-messaging sweep.
7. **F1** — the thin-poll alert, as soon as A2 lands. It is a live monitoring capability, not cosmetics.
8. **F2–F5** — the code/copy/comment sweep, alongside E.
9. **E** — the documentation sweep and `docs/RULES.md`, last, so it records what actually shipped.

---

## §9 · DEFINITION OF DONE

Do not report this programme complete until all of the following are true and were **observed**, not assumed:

- A real bet placed on production under the new rules, on both products, settles at 13% of the losing side, and
  the money ties out exactly (Σ payouts + fee == pool).
- A market frozen before the change still settles on its old rates — proven on a real one.
- A player can hold both sides of a market; a bonus-holding player is warned first and the second side accrues
  no wagering credit.
- A stake of 999 is refused with a message naming the minimum; 1,000,000 is accepted on both products.
- Every player-facing failure encountered while driving the above states a reason at a matching severity.
- The three candidate rows are corrected and the officer no longer sees a false publish failure.
- `docs/RULES.md` exists, and no document or in-app string contradicts it.
- The **Terms and Conditions page** and the **in-app assistant** state the current fee rule, checked by reading
  them as a player would — not by grep alone.
- The lopsided-poll admin alert fires on a genuinely lopsided market under the new model, proven on a fixture.
- A search for the old rule's phrasing ("10% of the pool", "a third of the smaller side", "capped commission")
  returns only deliberate, labelled references to the legacy model — nothing that reads as current.
- Both PDFs regenerated, rasterized, and every page viewed.
- `npm run test:all` green, and every new guard was seen red first.

---

## §10 · WHAT MUST NOT HAPPEN

- No rewriting, backfilling or migrating any existing `feeSnapshot`, on either product.
- No re-adding `AUTO_SETTLE`.
- No touching the price band, the tick floor, or `computeTargets` — A2 is a **fee** change only.
- No shipping B1 without the wagering change in the same commit.
- No `git add -A`; no commit without checking the branch; no batching fixes.
- No claiming any of this is done from a passing suite. Drive it on production and look at it.
