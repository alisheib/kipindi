# SESSION PROMPT — RULES PROGRAMME, SESSION 3

Continue the 50pick rates / bet-logic / failure-messaging programme.
**Repo: `F:\kipindi-main`, branch `main`.** Every push to `main` deploys LIVE to 50pick.tz.

---

## §0 · STANDING AUTHORISATION — ASKED AND GRANTED BY ALI, 2026-08-14. DO NOT ASK AGAIN.

Four questions were put to Ali at the close of session 2 and answered. These are his answers,
not an assumption made on his behalf. **You have advance permission for all of it, on
PRODUCTION, for the whole session:**

| Asked | Granted |
|---|---|
| Mint test data on production without stopping to ask? | ✅ **ALL OF IT** — players, markets/polls, Up & Down assets and chains, bonus grants, invite/share tokens, and crediting test wallets |
| Create a temporary Up & Down asset/chain on the LIVE board to force a VOID? | ✅ **YES — create it, then remove it.** Name it obviously (e.g. `QA-VOID`), stop and retire it when done, and say so in the commit |
| How much real money may move through QA-fleet wallets in one session? | ✅ **NO CAP — whatever the test needs.** For scale: session 2 moved ~47,000 across nine drives; fleet wallets hold 46k–200k each |
| The Gold outage — ship the fix or wait? | ✅ **SHIP IT FIRST**, red-first, before the rules work. It is now §4 item 1 |

⭐ **WHY THIS EXISTS.** Session 2 had to leave things unproven, and in every case the reason
was that the STATE did not exist on production rather than that the code was wrong: B2 has
never been exercised because there are ZERO bonus grants; the VOID case is unproven because
nobody bet on a round that voided. **Those are now yours to create.** If a rule cannot be
proven because the state does not exist, **create the state.**

⛔ **AND MINT A REAL FLEET, NOT TWO PLAYERS.** As many test players as the case needs, playing
BOTH sides. Two personas are structurally blind — that is a standing instruction of Ali's, given
twice, and it is why the two-sided settlement drive used six.

**The only limits:**
1. ⛔ **Never rewrite, backfill or migrate an existing `feeSnapshot`.** Frozen money is frozen.
2. ⛔ **Never re-add `AUTO_SETTLE`.** Never touch the price band, the tick floor or
   `computeTargets`.
3. ⛔ **Never hand-write an `INSERT INTO "AuditLog"`** — it is an HMAC chain. Go through
   `audit()`.
4. ⛔ **Never put a credential in a tracked file, a commit, a doc or a screenshot.**
5. ⚠️ **The board is SHARED with another operator.** Anything you create on it is visible to
   them — name it so it is obviously QA, and retire it when you are done.
6. ⚠️ **Say what you minted**, in the commit and in the handoff, so it can be cleaned up.
   Production DATA is wiped before public launch, so test data is fine — a CODE path that
   produces bad data is not.

---

## §1 · HOW THIS SESSION MUST WORK

**Do not stop until the workstreams in §4 are complete and verified. Do not ask permission
between workstreams — the decisions are already made. Come back when it is done, or when you
hit something that genuinely contradicts this document.**

1. **A green suite is not evidence.** Every claim is driven against production and looked at.
   Ask of every check: *would this still pass if the feature were absent?*
2. **Every guard proven RED first**, with a **positive control in the same run**, and at least
   one **over-correction** mutation — or "no defect" and "no feature" are indistinguishable.
3. **LOOK AT IT.** Details in §3. A passing test is not a screen.
4. **One fix, one commit, docs in the SAME commit.** Full validation before *each* commit.
5. **`git branch --show-current` before every commit. Never `git add -A`.** The working tree is
   shared with another session.
6. **Perfect code and logic only. No workarounds.** If a rule change breaks a fixture, correct
   the fixture to the real scenario — never weaken the rule to keep a test green.
7. **When you need a new session: stop, update the docs, and write the next prompt.**

---

## §2 · READ FIRST, IN THIS ORDER

1. **`docs/RULES.md`** — the single authoritative statement of the money rules. Every task
   either enforces it or points at it. Its roll-out table marks each rule ✅ live or ⏳ LANDING.
   ⛔ **Never delete a ⏳ marker without verifying on production.**
2. **`docs/FINDING-GOLD-CHAINS-STALLED.md`** — a live outage. ⭐ Ali has decided: **fix it FIRST**. It is §4 item 1.
3. **`docs/FAILURE-INVENTORY.md`** — the map for the remaining C work.
4. **`docs/SESSION-PROMPT-RATES-AND-FAILURES.md`** — the original work order. Still the
   authority. ⚠️ Parts of its file lists have gone stale — see §7.
5. `docs/SESSION-PROMPT-RATES-CONTINUE.md` — session 1's handoff, for background.

---

## §3 · WHAT "LOOKED AT" MEANS HERE — the visual contract

**Every player-facing change is verified by driving the real UI on production and viewing it at
360 / 768 / 1024 / 1440.** Not one width. The 1024 case has already caught a defect this
programme shipped.

- ⛔ **Clipping INSIDE a card never reaches `document.scrollWidth`.** No page-level overflow
  check can see it. Measure the element (`scrollWidth > clientWidth`) and **report the budget in
  px** — box width, content width, px-per-character — not just the verdict. Guessing costs a
  deploy per attempt.
- ⛔ **`innerText` returns the full string whatever the ellipsis paints**, and a WRAP satisfies
  `scrollWidth === clientWidth` exactly as a fit does.
- ⛔ **A CSS-`uppercase` label reads back UPPERCASE.** Lowercase both sides of any text match,
  or a working screen reports as missing.
- ⛔ **Every PDF is verified by RASTERISING THE REAL PDF and viewing every page** — never by
  screenshotting the HTML, which is a different document and hides pagination faults.
  `npm run qa:rasterise-pdf -- <file.pdf> <outDir>`. ⚠️ **It must run HEADED** — headless
  Chromium *downloads* a PDF instead of displaying it. It hashes every frame and **refuses to
  report a document as rasterised with fewer distinct frames than the file declares pages**.
- ⚠️ **`/updown` holds an open event stream, so `waitUntil: "networkidle"` NEVER fires.** Use
  `domcontentloaded` and wait for a control.
- ⚠️ **There is not always an open round.** A fixed wait measures when the run started, not
  whether the product works. Poll across a boundary.
- ⚠️ **Match on rendered TEXT, not the accessible name**, and use ASCII in selectors — `×`
  (U+00D7) does not survive every shell/encoding path.

**Credentials:** `.env.qa.local` (gitignored) holds the QA personas and the admin login.
`scripts/live/harness.mjs` exposes `PERSONA` (alpha, echo, officer, trading, growth, finance,
admin) and `fleetPersona(nn)` for `fleet:01`…`fleet:30` on `+2557990000NN`.
⚠️ Sign in as the **role that owns the page** — ADMIN bypasses every domain check, so a sweep
run as ADMIN measures nothing about RBAC.
⚠️ Use `loginOnce()` for any matrix — repeated sign-ins to one account trip attempt limiting and
read exactly like a wrong password.

---

## §4 · WHAT IS LEFT — in order

### ▶ 1. FIX GOLD. FIRST. — Ali's decision, 2026-08-14

**`docs/FINDING-GOLD-CHAINS-STALLED.md` has the mechanism, the one-line fix and the red-first
plan.** Gold is a dead asset on the live player board and has been for days; it goes before the
rules work.

`advanceChain`'s market-hours gate `return`s **before** the re-arm at step 4, so when a session
closes the chain stays pinned to a boundary INSIDE that closed session — and every later tick
re-evaluates the gate at that same stale instant. It can never reopen. Deterministic, and immune
only for crypto (`sessionKindFor` → `"always"`).

**Prove it RED first, with a positive control in the same run:**
1. A `commodity` chain armed at a boundary inside a closed session, advanced twice: the second
   tick must arm a boundary at or after now. Against today's code the boundary never moves.
2. ⭐ **The positive control that matters:** the same chain with the session OPEN must still
   open a round. A fix that re-armed unconditionally would SKIP live boundaries, and a suite
   that only checked "the boundary moved" is green on it.
3. A crypto chain is unaffected in both directions — it never reaches this branch.

⚠️ **The re-arm must not write back the value it read.** If the NEXT boundary is also inside the
closed session, re-arming to it and waiting is correct; re-arming to the SAME instant reproduces
the bug while looking busy. Guard the patch with an equality check.

⛔ **A DEPLOY ALONE DOES NOT RECOVER THE THREE STALLED CHAINS.** `nextBoundaryAt` is persisted,
so each is still pinned to its 2026-08-10 / 2026-08-13 boundary. The fixed branch re-arms them
on the first tick after deploy — **verify that by reading `nextBoundaryAt` and `opensAt` off the
live DB afterwards, and by looking at `/updown?asset=XAU` on the real board.** Do not assume the
deploy did it.

### ▶ 2. PROVE THE THREE THINGS PRODUCTION COULD NOT SHOW ME

All three are unproven only because the state did not exist. **§0 authorises you to create it.**

**(a) A REAL VOID round, charging nothing, refunding both sides in full.**
`scripts/live/ops/loser-share-settled.cjs` §3 stays RED until one lands. Production's void rate
is **1.7%** (30 of 1,761 in 24h) and **all five drives last session decided** — BTC 5m, BTC 3m,
SOL 30m, XRP 15m, ~26,000 of fleet money across them. ⚠️ Gold voids most (11 of those 30) and
**cannot open a round at all** — see §6.1. ⭐ **You can force one, and you are authorised to:** create a temporary asset and chain
(§0 — name it obviously, e.g. `QA-VOID`, and retire it when done) and drive a round whose price
cannot clear the band. ⛔ `test:updown-cutover` §5b proves
it on the real settlement path, and the settlement path is not production.

**(b) B2 and the one-side wagering rule, exercised by a real bonus.**
Production has **ZERO grants and ZERO bonus balance**. `RULES.md` §2.5 keeps its ⏳ for that
reason alone. **Grant a bonus to a fleet player and drive both routes:**
- the **hedge** — first side accrues, second side accrues nothing, and the warning appears
  before they confirm (inline, naming the remaining amount, EN/SW/ZH, at all four widths);
- the **cancellation** — bet, cancel free inside 5 minutes, and the turnover credit comes back.

Both are proven on the real path by `npm run test:bonus-one-side`. Neither has been proven in a
wallet. **Then clear the ⏳ on `RULES.md` §2.4 and §2.5.**

**(c) A real bet on a long-form POLL**, settling at 13% of the losing side. The definition of
done says *both products*; only Up & Down has been driven. Create the poll, bet both sides
across several fleet players, resolve it, settle it, tie out the ledger.

### ▶ 3. C2's SECOND TRANCHE — wallet, KYC, auth, proposals, objections

The reason registry (`src/lib/failure-reasons.ts`) covers **betting and cash-out**. The rest are
enumerated at `FAILURE-INVENTORY.md` §2.3 and still render through `error-copy.ts`'s **15 phrase
tests** — matched against service strings that live in *other files*, with **nothing asserting
those strings still contain those phrases**. That is the largest remaining risk in the C
workstream. Extend the registry the same way; the guard already fails when a reason ships
without copy, a severity, or a fillable placeholder.

⭐ Also open from `FAILURE-INVENTORY.md` §1.5: **12 surfaces render a raw server string** and
**8 say only that something failed**. None are on the betting path. Fix them; drive each one.

### ▶ 4. E2 — the remaining documents

Swept already: `updown-operator-guide.html` (+ PDF regenerated, **rasterised, 42 distinct frames
over 22 pages, read**), `rates-decisions-needed.html`, `RULES.md`, `FAILURE-INVENTORY.md`,
`README.md`, both session prompts.

⏳ **Not yet swept:** `UPDOWN-PRICING.md` · `UPDOWN-SPEC.md` · `UPDOWN-ARCHITECTURE.md` ·
`FEE-MODEL-DECISION-2026-07-14.md` · `F6-LIQUIDITY-DESIGN.md` · `GO-LIVE-RUNBOOK.md` ·
`MODULE-CERTIFICATION-PROGRAM.md` · `NEXT-PLAN.md` · `POLL-OPEN-FINDINGS.md` ·
`design-master-brief.md` · `50pick-fee-decision.docx` · `50pick-fee-model-examples.docx`.

Each: **correct it, or mark it superseded with a pointer to `docs/RULES.md`.** ⛔ Do not leave a
third version of the truth anywhere.

⚠️ **`LIVE-QA-CAMPAIGN.md`: DO NOT TOUCH THE MEASUREMENT ROWS.** Every fee figure in it records
a settlement that really happened at the rate that market froze. One banner at §0. Its open item
at :3994 (the ⅓ rounding breach) is **dissolved** by the new rule — close it explicitly.

---

## §5 · WHAT SESSION 2 SHIPPED — eight commits, all live

| Commit | | Proven |
|---|---|---|
| `22215fec` | **A4** — the fee caption on `/admin/updown` | `red:fee-model-caption` 8/8 |
| `75042aae` | **B / B1b / B3** — the hedge, the wagering rule, the free-cancellation hole | `red:bonus-one-side` 6/6 |
| `d51e8fa1` | **F1** — the lopsided-market alert | `red:thin-alert` 6/6 |
| `d175cd01` | **A4 (2/2)** — the caption was ellipsised at 1024px | `red:fee-model-caption` 9/9 |
| `19ac78ec` | **C2–C5** — the reason registry, one renderer, the BUSY lie | `red:failure-reasons` 9/9 |
| `0a45a05a` | **F2/F4/F5** — the legal document, the assistant, the header, the guard | `red:rate-copy` 7/7 |
| `7625986d` | **F3/E** — the operator guide, both rates PDFs, the rasteriser | 22 pages, 42 frames, read |
| `5c1959ef` | **B2** — the bonus warning before confirming | `red:failure-reasons` **11/11** |

`npm run test:all` → **215/215** green. Five new suites, five RED harnesses, **41 mutations
caught**, every one with a positive control in the same run.

**Verified on production, not from a suite:** a real two-sided bet settled at
**fee 1,040.00 = 13% × 8,000**, paid 19,960.00, **pool residual 0.00** (`mkt_39b5c1731ae414`,
YES 8,000 / NO 13,000, six fleet players) · a real one-sided round charged nothing and refunded
3,000 in full · the card multiplier reads **× 2.25 / × 1.49** against **× 2.12 / × 1.38** for the
same pools under the retired model, at all four widths · the admin tile reads
`TZS 650 · loser-share 13%` untruncated at all four · **10/10 settled legacy rounds still settle
by the old maths**.

---

## §6 · WHAT ALI HAS DECIDED, AND THE ONE THING STILL OPEN

**1. ✅ DECIDED 2026-08-14 — SHIP THE GOLD FIX FIRST.** It is §4 item 1; the detail below is
the evidence, and `docs/FINDING-GOLD-CHAINS-STALLED.md` is the plan.
All three XAU chains read `RUNNING` and have opened **no round** since their last session close
— 15m for ~17 hours, 30m and 60m for **four days**. `advanceChain`'s market-hours gate `return`s
**before** the re-arm, so the chain stays pinned to a boundary inside the closed session and the
gate is re-evaluated at that same stale instant forever: a **deadlock by construction**, immune
only for crypto. Measured from the database AND from the product. One-line fix and a red-first
plan are in the file. ⛔ A deploy alone does NOT recover the three stalled chains —
`nextBoundaryAt` is persisted; verify by reading it back off the live DB afterwards.

**So §6 now carries ONE open question, not three: UD-20, below.**

**2. ⚠️ UD-20 IS RE-OPENED.** A hedged holder now sees **no payout figure at all** on a locked
round. `updown-board.ts` suppresses it because one number cannot state a two-sided position —
still right — but the state was documented as *unreachable* and B made it ordinary. "Quote both
outcomes" is a design question again. ⛔ Do not answer it by resurrecting the single-number form;
that is the defect, not the gap.

**3. ✅ Session 1's three items are settled in code.** Outcome-dependence is recorded in
`COMPLIANCE-DECISIONS.md` and written into `payout.ts`'s invariant 2; the free-cancellation
exploit is closed (B1b); the Terms page says 1.5%.

---

## §7 · SIX GREENS THAT MEANT NOTHING — every one needed a human to look

1. **A right number under a retired law.** `/admin/updown` showed TZS 650 — correct — captioned
   `capped-commission 13%`. Worse than a wrong number: an operator who checks the arithmetic
   finds it sound and trusts the label.
2. **"Contains the figure" ≠ "a finished sentence".** `String.replace` with a STRING pattern
   fills only the FIRST occurrence, so the stake-bounds copy rendered *"Enter **{min}** or
   more"*. Green in all three languages.
3. **Right, tied out, and ELLIPSISED** at exactly 1024px, where the KPI row goes 4-up.
4. **A test that asserts a slogan ships a slogan.** *"Hedging both sides costs the player"* went
   RED — the hedger finished **6,750 UP**. The same false claim the retired player copy made.
5. **A section that passes while proving nothing.** "Each trigger catches what the others miss"
   — both fixtures fired both triggers and the assertion was loose enough to be green anyway.
6. **"N frames captured" ≠ "N pages looked at".** Three rasteriser attempts each reported
   success: 22 copies of page 1, then 17 of 22, then 1 of 22.

⚠️ **And the work order's own lists go stale.** Two F3 items listed as "do not branch on the
model" already branched correctly — they were fixed after the order was measured. Ask *"is this
the product, or my list?"* before filing.

---

## §8 · TOOLS

| | |
|---|---|
| `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs` | mint a live `DATABASE_URL`; asserts the internal host was rewritten |
| `KP_REPO=F:/kipindi-main node scripts/live/ops/rates-census.cjs` | what the platform ACTUALLY charges — persisted config, every chain, every frozen snapshot |
| `KP_REPO=F:/kipindi-main node scripts/live/ops/loser-share-settled.cjs` | the A4 money questions. ⭐ counts EMPTY rounds separately and goes RED when the whole population is empty |
| `SHOT_DIR=./shots/x A4_PLAN=two-sided\|one-sided\|void npm run qa:loser-share-money -- "asset=BTC&d=5"` | real fleet money on a production round |
| `SHOT_DIR=./shots/x A4_YES=8000 A4_NO=13000 npm run qa:updown-card-widths` | the player card at 4 widths + the retired-model counterfactual |
| `SHOT_DIR=./shots/x npm run qa:admin-updown-widths` | the admin fee tile at 4 widths, with the truncation budget in px |
| `npm run qa:rasterise-pdf -- <file.pdf> <outDir>` | ⛔ HEADED; refuses to claim pages it did not capture |
| `npm run test:all -- --skip responsive,motion` | the full net (215 suites) |
| `npm run red:all` | every RED harness |
| `node scripts/generate-pdfs.mjs` · `node scripts/generate-rates-pdf.mjs` | regenerate the three PDFs |

**New suites, each with a `red:` twin:** `test:fee-model-caption` (45) · `test:bonus-one-side`
(22) · `test:thin-alert` (19) · `test:failure-reasons` (58) · `test:rate-copy` (20).

### Traps that have each cost a diagnosis

- ⛔ `railway run` injects `postgres.railway.internal`, which resolves nowhere off-platform —
  **every read silently returns DEFAULTS.** `mkenv.cjs` rewrites the host and asserts it.
- ⛔ The **AuditLog is an HMAC chain** (`prevHash`/`entryHash`, both UNIQUE). Use `audit()`.
- ⛔ **`Transaction` has no `marketId`.** Reach the ledger side of a market through its
  positions, or through the `POOL:<marketId>` ledger account.
- ⛔ **Do not write a column name in backticks inside a template literal** — it closes the
  string and the parse error lands on a line you did not touch.
- ⚠️ **`i18n-dict.ts` stores some characters as LITERAL `\u00d7` escape TEXT and others as real
  characters, in the same file.** Check with `JSON.stringify` before trusting an anchor.
- ⚠️ **`allocateFeeShares` FLOORS the fee** (`Math.floor`), so a probe comparing against the
  unrounded figure reports perfectly correct rounds as defects.
- ⚠️ **The UD card FLOORS its multiplier to 2dp**; a probe that rounds manufactures a 0.01
  disagreement with a card that is exactly right.
- ⚠️ **An EMPTY round reads `× 1.00` under BOTH fee models** and proves nothing.
- ⚠️ **`orphan-scripts` fails any new top-level `scripts/*.mjs` not wired into `package.json`.**
  Wire it as you write it.

---

## §9 · DEFINITION OF DONE

| | |
|---|---|
| ✅ | A market frozen before the change still settles on its old rates — 4,220 rows, 10/10 sampled |
| ✅ | `docs/RULES.md` exists and is the authority |
| ✅ | A real bet on production settling at 13% of the losing side, tying out exactly — **Up & Down** |
| ⏳ | …the same on a long-form **POLL** |
| ✅ | A player can hold both sides; the second side accrues no wagering credit |
| ⏳ | …and a bonus-holding player is **warned first** — shipped, but **never exercised live** |
| ✅ | 999 refused **with a message naming the minimum**; 1,000,000 accepted — both products, 3 languages |
| ⏳ | Every player-facing failure states a reason at a matching severity — betting/cash-out done, §2.3 open |
| ✅ | The **Terms page** and the **in-app assistant** state the current fee rule |
| ✅ | The lopsided-market alert fires under the new model, proven on a fixture |
| ✅ | A search for the old phrasing returns only deliberate, labelled legacy references |
| ✅ | All three PDFs regenerated, **rasterised, pages viewed** |
| ⏳ | A **VOID** on production charging nothing, on a real one |
| ✅ | `npm run test:all` green and every new guard seen red first |
