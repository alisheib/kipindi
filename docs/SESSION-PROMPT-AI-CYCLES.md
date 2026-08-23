# AI SPEND IN **CYCLES** — SHIPPED 2026-08-23 (session 59)

> **Status: 🟢 LIVE.** Built, proven and driven on production. The plan that produced it is
> preserved below from §0 down, unchanged, because §10's twenty-row table is still the
> reference for how this number can go wrong — every row is now a check in `test:ai-cycles`.
>
> **Authority for what exists today:** `src/lib/server/ai-usage.ts` (the meter),
> `src/lib/server/ai-cycles.ts` (the read model), `src/lib/ai-cycle-rules.ts` (validation).

---

## §A · WHAT A CYCLE IS, AS ALI DEFINED IT

Ali, 2026-08-23, in his own words:

> *"I will charge Claude API with maybe 1k and if a cycle is 100$ so each cycle would be 100
> and the 1k will last 10 cycles, maybe I need 1 cycle every 2 months maybe not etc, we see
> each cycle how much it lasted, and when a cycle ends we have to start a new one to proceed
> or posting or AI resolving blocked."*
> *"Then I top up and put 10k, I want to divide it on 100s, I see how much they last before I
> start a new cycle of another 100."*

So a cycle is **a $100 tranche of Claude spend**, and it is a **checkpoint**:

| | |
|---|---|
| **Denomination** | `$100` by default, custom and settable. A $1,000 top-up is 10 cycles; $10,000 is 100. |
| **Numbering** | Monotonic, 1-based, **never resets**. That is what makes "cycles this year" divisible by anything. |
| **When one ends** | It CLOSES, and **AI poll posting and AI resolving stop** until an officer starts the next one. |
| **What is recorded** | Opened, closed, **how long it lasted**, what it cost, the size it was stamped with, and the pricing revision. |

⛔ **A recharge is NOT a new cycle.** Topping up Anthropic credit starts a new **top-up
window** — a different thing, now spelled differently (§C). The cycle ledger runs straight
through it.

---

## §B · THE FIVE ANSWERS (§14, answered by Ali 2026-08-23)

| # | Question | Ali's answer | Where it lives |
|---|---|---|---|
| 1 | The billable event | **Per resolved market, with Up & Down priced separately** | `LINE_FEATURES` in `ai-cycles.ts` |
| 2 | Default cycle size | **$100** | `CYCLE_DEFAULTS.sizeUsd` |
| 3 | Target margin | **100% — price at 2× AI cost** | `CYCLE_DEFAULTS.targetMarginPct` |
| 4 | Does Up & Down price separately | **Yes, its own line and its own suggested price** | the cost-per-resolution table |
| 5 | May a cycle BLOCK calls | **Yes** — "when a cycle ends we have to start a new one to proceed" | `cycleGate()` → `assertAiBudget()` |

⛔ **AND THERE IS STILL EXACTLY ONE MONEY AUTHORITY, WHICH §8.6 DEMANDS.** The trick is that
the two controls are about different things and therefore cannot disagree:

- `limitUsd` is the only thing that says **how much** may be spent. Untouched.
- A cycle boundary says **when an officer must look**. It has no opinion about totals.

The budget is checked FIRST, so an exhausted balance is never mis-reported as a cycle
boundary — an operator would otherwise start a cycle when what they needed was credit.
`test:ai-cycles` §6.9 pins that ordering.

---

## §C · THE RENAME (§1), AND THE TRAP INSIDE IT

`CreditConfig.cycleStartIso` → **`topUpWindowStartIso`**. `resetCreditCycle()` →
**`startNewTopUpWindow()`**. The audit action `ai.credit_cycle_reset` →
**`ai.topup_window_started`**. Every operator string that said *"this cycle"* now says
*"this top-up window"*.

🔴 **THE RENAME COULD HAVE RE-OPENED THE LIVE MONEY GATE, AND ALMOST DID.** The stored JSON on
production carries the OLD key — measured 2026-08-23:
`{"limitUsd":20,"alertedLevel":"none","cycleStartIso":"2026-08-22T17:17:54.323Z"}`. Renaming
the TypeScript field without reading the legacy key would have made the first read after
deploy find no window, write a fresh one starting **now**, and thereby **zero the
"spent this window" counter** — silently re-opening a budget that may be genuinely
exhausted. `getCreditConfig()` reads `topUpWindowStartIso ?? cycleStartIso` for exactly that
reason, and the fallback is commented as load-bearing so nobody tidies it away.

---

## §D · THE PREREQUISITE THAT BLOCKED EVERYTHING: ATTRIBUTION

`AiUsageEvent` gained `subjectType` + `subjectId` — soft refs, **no foreign key**, so a
retention delete of a market can never break metering and a metering row can never block a
market delete.

**All 12 `recordAiUsage()` call sites were threaded in one commit**, because a half-threaded
attribution under-counts and an under-count reads as *cheaper than it is*:

| Site | subjectType | subjectId |
|---|---|---|
| `market-sentinel.ts` ×2 | `market` | `market.id` |
| `updown-oracle.ts` ×2 | `updown_observation` | the observation row, threaded down from `readPrice` |
| `ai-provider-claude.ts` generate ×2 | `poll_generation` | `null` — the candidate row does not exist yet |
| `ai-provider-claude.ts` ideate ×2 | `poll_ideation` | `null` |
| `ai-provider-claude.ts` proposeUpDown ×2 | `updown_proposal` | the asset key |
| `chat.ts` ×2 | `chat_session` | the player's `userId` |

⭐ **A NULL `subjectId` IS A REAL ANSWER, NOT A GAP** — a poll is generated *before* its
candidate row exists. The type is never null, and the page shows the unattributed spend as
its own column rather than folding it in.

⚠️ **AND ONE OBSERVATION IS NOT ONE ROUND.** `UpDownObservation` is `@@unique([assetId,
boundaryAt])`, so a single paid oracle call serves every round on that boundary — **measured
at 2.353 rounds per observation on production**. Dividing oracle spend by observations and
calling it a per-round cost overstates it by that factor. The read model divides a product
LINE's spend by that line's settled markets, which is correct however calls are shared.

---

## §E · WHAT PRODUCTION ACTUALLY SAYS (measured 2026-08-23, not quoted)

Re-derive with `npm run ops:preflight-ai-cycles`. Every figure below came from that run.

| | |
|---|---|
| Metered calls | **4,271** (2,839 with a non-zero cost) |
| Total AI spend | **$243.32**, from 2026-06-25 |
| Failed calls | **1,432 — costing $0**, because the failure path records no token counts (§F) |
| By feature | polls **$105.10** · sentinel **$75.48** · updown **$62.73** · chat **$0.02** |
| Model mix | Sonnet 2,500 calls / **$240.75** · Haiku 1,771 calls / **$2.56** |
| Settled poll markets | **68** (12 VOID) |
| Settled Up & Down rounds | **18,165** (937 VOID) |
| Commission actually earned | polls **TZS 1,737/market** · Up & Down **TZS 1,086/round** |

**The backfilled ledger, live on production:**

| Cycle | Cost | Opened → closed | Lasted |
|---|---|---|---|
| 1 | $100.00 | 2026-06-26 → 2026-07-09 | **12.82 days** |
| 2 | $100.00 | 2026-07-09 → 2026-07-30 | **20.88 days** |
| 3 | $43.32 | 2026-07-30 → OPEN | — |

⭐ **SO THE ANSWER TO ALI'S "MAYBE ONE CYCLE EVERY TWO MONTHS?" IS: NO — about one every two
to three weeks** at the current burn. A $1,000 top-up is roughly six to eight months.

🔴 **AND THE NUMBER HE ASKED FOR, WITH ITS TEETH IN:** the polls line has spent **$180.57**
(generation + Sentinel) to settle **68 markets** — about **$2.66 of AI per resolution**.
50pick earns **TZS 1,737** per settled poll. Those two are only comparable once a USD→TZS
rate is entered on the page, which is deliberately **not** pre-filled (§G), but at any
plausible rate the AI cost per resolution is **several times the commission the market
earns**. That is the finding the whole build existed to produce, and it is now on a screen
Ali can watch move.

⚠️ **Three things that number is NOT, stated so nobody over-reads it:**
1. It is **all-in**, including generation of candidates that never became markets. That is
   the honest cost of running the product, not the marginal cost of one more market.
2. **Up & Down's AI line is historical.** `observationMethod` is `"feed"`
   (`twelvedata-bars`) — measured on production — so its rounds have been settled by a price
   feed since 2026-08-03 and cost **nothing** in this table. Its per-round figure describes a
   period that has ended.
3. The **Sentinel is the dominant spender** on the polls line and it re-checks a market on a
   4-hour interval. Cost per resolution therefore scales with how long a market waits, not
   only with how many there are.

---

## §F · THE HONEST LIMITS, MEASURED RATHER THAN ASSUMED

- **A failed call is recorded at $0.** 1,432 of 4,271 events. The failure path passes no
  token counts, so a call that consumed input tokens before erroring is under-counted. The
  call COUNT is right; the cost of failures is a floor, not a total. §9.7 asked for failed
  calls to be included — they are, and this is what including them actually yields.
- **`priceRev` is a content hash of the price table**, so a rate change moves it
  automatically. It records what a cycle can be reconciled against — it is not a claim about
  what Anthropic charged historically, which is not recoverable.
- **The backfilled rows are stamped** `note = "backfilled from usage history"` and carry
  today's `priceRev`, so they can never be mistaken for cycles the live meter observed.
- **Overshoot is real and visible.** In pause mode the cycle that fills absorbs the rest of
  the straddling call, so "used" can read slightly over 100%. It is bounded by one call's
  cost and shown rather than smoothed away — see §H, which explains why.

---

## §G · WHAT ALI STILL HAS TO DO (one thing)

⛔ **Enter the USD→TZS rate and its date** in *Admin → AI usage → Cycle settings*. Until
then every shilling figure on the page renders `—`, deliberately: the platform's own A-5
no-fabrication rule means a converted number with no visible, dated rate behind it is a
claim nobody can check. There is **no default rate** and one must never be invented.

Once set, the page shows a suggested price at 2× AI cost beside what the line actually earns.

---

## §G2 · WHAT THE LIVE DRIVE FOUND THAT NOTHING ELSE COULD

⛔ **WHERE EACH HALF WAS DRIVEN, STATED RATHER THAN BLURRED.** `/admin/ai-usage` is
ADMIN-only — measured, with a control: `RoleDomainGrant` holds **zero** override rows and no
non-ADMIN role has `ops` under `DEFAULT_GRANTS` — and `.env.qa.local` carries no
`QA_ADMIN_PASSWORD`. So no driver can reach the console page on production, and **that was
not worked around by changing production RBAC or promoting an account.**

| Half | Where | Evidence |
|---|---|---|
| Data + behaviour | **production** | expand-only DDL pre-applied after `ops:preflight-ai-cycles` said GO · backfill applied, verified, and proven to REFUSE a second run · 🟢 **the live meter observed accruing: cycle 3 moved $43.32 → $43.52 on real Sentinel traffic after the deploy** |
| UI | **a production build on a real Postgres** (`C:/pg-loadtest`, `next start`, `NODE_ENV=production`) | **64 passed, 0 failed**, run twice to prove repeatability · 11 screenshots at 360/768/1280 × EN/SW/ZH, `<html lang>` verified per cell, 0px overflow in all nine |

### 🔴 Defect 1 — the Save button could be permanently killed on a money screen

Passing `pending` to `ConfirmDialog` opts into its **hold-open contract**: confirm no longer
closes the dialog, the falling edge of `pending` does. Validation ran inside `onConfirm`, so a
client-side rejection returned **without starting a transition** — the dialog stayed open for
ever, and `confirm-dialog.tsx` also disables the trigger while `awaiting`. **Save was dead
until a page reload.**

The kit already had the answer: **`openGuard`** refuses to OPEN on invalid input. Never ask
"are you sure?" about something already known to be refused. Five reachable bad values now
each assert three things — the dialog does not open, the message explains why, **and Save
still works afterwards.**

### 🔴 Defect 2 — the page contradicted itself, and only the image showed it

A green **"AI is healthy"** banner rendered directly above the red **"AI is paused"** bar.
Both true — health measures whether calls ERROR, the gate measures whether they are ALLOWED —
and together they told an operator nothing. **No assertion could have caught it; every check
was green.** The banner now leads with *"AI is paused — this is a spend-cycle checkpoint, not
a fault"*, and still reports the 24h error count underneath.

### ⭐ And the product was better than the test assumed

The form does **not** refuse `"0.1.2"` — the shared `Input` atom sanitises at the keystroke.
Measured live: `"0.1.2"→"0.12"`, `"1,000"→"1000"`, `"-5"→"5"`, `"12abc"→"12"`. Those states
are **unreachable from the UI**, so a driver "proving" they are rejected tests something no
operator can do. The parser still refuses them because a **forged** request can carry
anything, and that half is proven in `test:ai-cycles` §11. The drive asserts what the field
can actually produce: empty, zero, below floor, above ceiling, too many decimals — plus a
control that a valid value still saves.

### ⚠️ Three traps paid for on the way

1. **An assertion that only holds on a virgin database gets deleted, not trusted.** The drive
   pinned `5` closed cycles and `$71.05` and went red on its third run — because the drive
   itself opens cycles. It reads the index off the page now, and normalises a paused ledger
   before starting.
2. **An ops script nobody can rehearse is one whose first run is on the real thing.** Both
   ops scripts hardcoded `ssl` for the Railway proxy, which a plain local Postgres refuses.
   They decide by host now, and the backfill was rehearsed locally before it touched 50pick.
3. **Always read `git diff --numstat` before believing an edit was small.** An in-place editor
   that computes the block end from `locateHandoff().text.length` slices **inside a `\r\n`
   pair**; the single bare LF that leaves makes the file MIXED, git stops normalising it, and
   a two-line append reports as *8,978 deleted, 8,995 added*. Insert on an `eol + eol`
   boundary found in the real string. (And in ESM, `process.argv[1]` is the script — reading
   it appended the editor's own source into the campaign document.)

---

## §G3 · THE SECOND ADVERSARIAL PASS — six more defects, found by re-reading my own work

Ali asked for everything to be re-validated after it shipped. Every one of these was in code
that had already passed 115 checks, a 23/23 red fleet and a 64/64 live drive.

| # | Defect | Why it survived the first pass |
|---|---|---|
| 1 | 🔴 **The reconciliation would have started crying wolf on 2026-12-23** | Cycles are never pruned; calls are, at `RETAIN_DAYS = 180`. Comparing "all cycles" against "all surviving calls" reports a drift that grows for ever once pruning starts — on the ledger backfilled 2026-08-23, from **2026-12-23** exactly. A reconciliation that cries wolf on a schedule is one nobody reads when it finally means something. Now scoped to the first cycle that opened **inside** the retained window, and the page names that span. |
| 2 | 🔴 **`other` belonged to no product line** | Spend filed under it counted toward the page total and toward conservation and appeared in **no row** of the cost table, so the lines silently failed to sum to the total. `AiFeature` was a hand-written union — not enumerable, so nothing could check the coverage. It is now `AI_FEATURES as const` with the type derived from it, and §14 asserts every feature is in exactly one line. |
| 3 | 🔴 **The attribution was invisible** | `subjectType`/`subjectId` were threaded through all 12 call sites — the blocking prerequisite of the whole build — and shown **nowhere**. An operator could not look at a call and see what it was for, only take the division on trust. The ledger now has a sortable **For** column, and the `subjectType` filter (which the DAL had gained and nothing used) is wired to a real control. |
| 4 | 🔴 **A withheld projection claimed a read failure** | The KPI passed `unavailable`, which renders *"n/a · couldn't compute"* with the tooltip *"a data read failed"* — and **discards the value and the delta**. Nothing had failed: the platform was deliberately declining to extrapolate, and the sentence explaining that was thrown away. |
| 5 | 🔴 **An empty cycle closed by hand inflated "cycles per year"** | The rate counted CLOSED ROWS. An officer closing the books early leaves a row with nothing in it, so three empty closes in an afternoon would triple the figure Ali prices from without a cent more being spent. Seen for real — the live drive's own close/start left five `$0.00` cycles. The rate is now driven by **spend ÷ the size each cycle was opened with**, which is identical when cycles close naturally and immune to bookkeeping. |
| 6 | ⚠️ **`minDaysForProjection` was not clamped** | `clampCycleSize` existed; this did not. A hand-edited `SystemConfig` of `0` makes `observedDays < minDays` false for a zero-length history, and the next line divides by it — **Infinity cycles per year**, on the one figure Ali prices from. Guarding one and not the other only looked safe. |

**Also removed, because Ali asked for nothing stale to remain:** four fields computed and
rendered nowhere (`windows.today/7d/30d/all` — the KPI band already shows those from
`getAiUsageSummary`, and a second computation is a second chance to disagree),
`gate.openIndex`, two dead exports, and five copies of one filter-label class string.

⭐ **AND THE MOST IMPORTANT ONE WAS FOUND BY THE RED FLEET, NOT BY ME.** My first §15 computed
the retention-scoped sums *inside the test* and compared them to each other — so it proved the
TEST's arithmetic, and mutating the PRODUCT changed nothing. `red:ai-cycles` reported **MISSED**.
**A check that restates the implementation cannot fail when the implementation is wrong.**
It now drives `getCycleReadModel()` itself.

**Proof after this pass:** `test:ai-cycles` **140/140** · `red:ai-cycles` **28/28 proven, 0
missed, 0 broken** · `test:red-anchors` **441/441** · a consolidated live drive **63/63** and a
second drive of the previously-untested paths **25/25** — the subject filter, both pagers
moving independently, and the FX rate round-tripping (set → shown with its date → flagged when
stale → cleared back to `—`). `test:type-scale` ALL PASS with the tracking ratchet lowered
again, **639 → 636**.

---

## §H · THE BUG THE RED FLEET FOUND, WHICH IS THE MOST REUSABLE PART OF THIS

🔴 **THE CHECKPOINT ALI ASKED FOR WOULD HAVE FIRED ZERO TIMES.**

A call almost never lands exactly on a cycle boundary. The first meter split the straddling
call — the cycle filled, closed, and the leftover **opened the successor**. So there was never
a moment with no open cycle, `cycleGate()` never blocked, and the pause never happened.
Measured on the first drive of the suite: **0 pauses across 6 boundaries.** On a $100 cycle
with $0.05 calls it would have rolled over every single time, for ever, silently.

⭐ **It was found because a fixture's float dust made §6 fail for what looked like the wrong
reason.** The temptation was to fix the fixture and move on. The "wrong reason" was the
product. **A red that misses, or lands oddly, is a finding** — the same lesson `E-186` and
`E-189` are made of, arriving a third time.

**The fix:** in pause mode the cycle that just filled absorbs the remainder of that one call —
but **only when the remainder is smaller than a whole cycle**, so a call genuinely worth
several cycles is still split into several and the denomination survives.

**Three more things the red fleet taught, each of which had made it certify nothing:**

1. ⛔ **A mutant tree in `%TEMP%` cannot resolve `node_modules`.** The gate imports the
   product, which imports `@prisma/client` — a bare specifier. Every run died before printing
   a line and reported *23/23 broken harness*. The tree now lives under `node_modules/`.
2. ⛔ **The gate's own location does not prove the product was mutated.** `tsx` resolves a
   `@/…` import through the CWD's tsconfig paths — the real repo — so the gate could sit in
   the mutant tree while loading the **original** module. The gate now prints
   `import.meta.resolve()` for every module under test and the harness requires each to be
   inside the mutated tree. `ai-usage.ts` and `ai-cycles.ts` were converted to relative
   imports for the same reason.
3. ⛔ **A mutation that does not COMPILE proves nothing.** Replacing the meter's `while` with
   an `if` left a `continue` outside a loop — a syntax error. The harness correctly called it
   BROKEN rather than CAUGHT.

**And two of the gate's own checks were too weak, exposed by mutations that missed:**

- Deleting the empty-field guard left "empty size is refused" GREEN, because `Number("")` is
  `0` and a zero SIZE is caught a line later by the `> 0` rule — on the same field. The check
  was proving the size bound, not the guard. ⛔ The field where it actually bites is
  **margin**, where `0` is legal: a blank box would silently mean "0% margin" and the
  suggested price would collapse to bare cost. §11.30 now checks that.
- Reading the switch as truthiness landed on the fixture's CONTROL, not on the named check.
  What was never asserted is that a legitimate `"false"` / `"off"` / `"0"` is **accepted and
  means off**. §11.32 now checks that.

---

## §I · HOW IT IS PROVEN

| Command | What it says |
|---|---|
| `npm run test:ai-cycles` | **115 checks.** Conservation, contiguity, the unique index, size stamping, one-call-spans-N, concurrency, the checkpoint, projections, div-by-zero, FX honesty, the timezone year boundary, 30 validation refusals, and a best-effort meter that cannot break an AI call. |
| `npm run red:ai-cycles` | **23/23 proven · 0 missed · 0 broken.** Every check watched to fail against a real defect. |
| `npm run test:red-anchors` | 431/431 — every anchor resolves exactly once. |
| `npm run ops:preflight-ai-cycles` | Read-only. Re-measures the migration's safety AND the divisors. Refuses GO if either moved. |
| `npm run ops:backfill-ai-cycles` | Idempotent. **Refuses** if the ledger is not empty; verifies conservation before writing and reads back after. |

⛔ **Every count-based check carries a control that the corpus was non-empty.** A conservation
assertion over zero rows passes vacuously, and this repo has shipped exactly that more than
once. §1.0, §1.3, §2.0, §4.0, §5.0, §6.0, §7.0, §8.6, §9.4, §10.0, §11.0, §12.5, §12.8 and
§13.2 are those controls; none of them is padding.

---

## §J · OPERATING IT

1. **Top up Anthropic**, then *Admin → AI usage → **New top-up window*** — this zeroes
   "spent this window" and re-arms the 80% / 100% alerts. It does **not** touch the cycles.
2. **Watch the cycle meter.** When a cycle fills, the AI pauses and a red bar appears at the
   top of the page naming the finished cycle.
3. **Click *Start cycle N+1*** to resume. It is audited with who did it.
4. **Read "Cycles by year"** for the yearly counts, and "Every cycle" for how long each one
   lasted.
5. To close the books early — end of month, say — use ***Close cycle early***. ⛔ It pauses
   the AI too, deliberately: closing is "stop here", starting the next one is a separate
   decision.

---
---

*The original plan follows, unchanged.*

## SESSION PROMPT (the original plan) — AI SPEND IN **CYCLES**

> **Written 2026-08-23 (session 58) for the session that builds it.**
> ⛔ Read this whole file before opening a component. The work looks like "add a
> counter" and is not — the hard part is that a cycle count is a **business number
> Ali will price from**, so every way it can quietly be wrong is a defect, not a nit.
>
> **Status:** ⚠️ SUPERSEDED — this said NOT STARTED. It shipped 2026-08-23; read the record above.
> **Authority for what exists today:** `src/lib/server/ai-usage.ts`.

---

## §0 · THE ONE-LINE BRIEF

Ali: *"our current approach is perfect but we have to plan another approach based on
cycles. so if we charge 1k for example we will spend based on cycles, every cycle we
monitor — that way we know how many cycles spent per year, to know what to charge.
cycle size is custom, it could be set as needed."*

So: **keep the USD meter, add a CYCLE meter on top of it**, and use it to answer one
question the platform cannot answer today —

> **What does one poll resolution actually cost us in AI, and is TZS 1,000 enough?**

⛔ **This is additive. Do not remove or rewrite the USD meter** — Ali called it
perfect, and `assertAiBudget` is the live hard cap on real money.

---

## §1 · WHAT A "CYCLE" IS, PRECISELY

A **cycle** is a fixed quantum of AI spend. Not a period of time — a *denomination*.

```
cycleSizeUsd = 1.00          →  spend $13.42  =  13 closed cycles + 0.42 open
cycleSizeUsd = 0.25          →  spend $13.42  =  53 closed cycles + 0.17 open
```

Cycles are **countable**, which is the whole point: "we burned 4,380 cycles last year"
is a sentence you can divide by 12, by the number of markets resolved, or by revenue.
"We spent $4,380.17" is not, because the number has no unit tied to the thing we sell.

⛔ **THE WORD "CYCLE" IS ALREADY USED IN THIS CODEBASE FOR SOMETHING ELSE.**
`CreditConfig.cycleStartIso` (`ai-usage.ts:108`) means *"the period since Ali last
topped up Anthropic credit"*. That is a **top-up window**, not a spend quantum. Two
different things called the same word in one file is how `E-179` happened.
**Rename the existing one to `topUpWindow` in the same commit**, or name the new one
`SpendUnit` — but do not ship both meanings of "cycle". Pick one and grep for the other.

---

## §2 · WHAT EXISTS TODAY — MEASURED, NOT REMEMBERED

Re-run these before trusting any of it; this file will age.

| Thing | Where | Notes |
|---|---|---|
| Per-call record | `prisma/schema.prisma` → `model AiUsageEvent` | `feature, model, inputTokens, outputTokens, webSearches, costUsd, ok, errorType, latencyMs, detail` |
| Recording | `ai-usage.ts` → `recordAiUsage()` | ⛔ best-effort, wrapped in try/catch — **a metering failure must never break an AI call** |
| Pricing | `ai-usage.ts` → `PRICE_PER_MTOK`, `WEB_SEARCH_USD` | hardcoded per-MTok rates; unknown models fall back to Sonnet tier |
| Hard budget gate | `ai-usage.ts` → `assertAiBudget()` | fails **OPEN** on internal error, **CLOSED** on genuine over-limit |
| Alerting | `ai-usage.ts` → `checkLimitAndAlert()` | 80% warn / 100% limit, serialized by `withLock("ai-credit-alert")` |
| Storage | `ai-usage-dal.ts` | Prisma when `DATABASE_URL`, in-memory otherwise — **follow this pattern exactly** |
| Retention | `ai-usage.ts` → `RETAIN_DAYS = 180` | ⚠️ see §11(f) — this deletes the evidence cycles are derived from |
| Real Anthropic spend | `anthropic-billing.ts` → `getAnthropicSpend()` | needs `ANTHROPIC_ADMIN_KEY`; returns `null` without it |
| Admin page | `src/app/admin/ai-usage/page.tsx` | already has KPI grid, area chart, meter, pagination, sort, range filter |
| Settings form | `src/app/admin/ai-usage/credit-controls.tsx` | `Field` + `Input` + `ConfirmDialog` + `useDeferredToast` |
| Server actions | `src/app/admin/ai-usage/actions.ts` | `requireStaff("ops")` → RBAC + step-up 2FA, then `audit(...)` with the PRIOR value |
| Features metered | `AiFeature` union | `polls · chat · sentinel · updown · other` |

**Read `getAiUsageSummary()` before designing the aggregation** — buckets already exist
per feature and you should extend them, not build a parallel path.

---

## §3 · THE NUMBERS ALI ACTUALLY WANTS

Build backwards from these four. Everything else is plumbing.

1. **Cycles consumed** — today, this week, this month, all-time.
2. **Cycles per year (projected)** — a run-rate, with an honest confidence statement.
3. **Cost per billable event** — cycles ÷ resolutions, per product line.
4. **Suggested price** — cost per resolution × (1 + target margin), in **TZS**, next to
   the **TZS 1,000** actually charged today, so the headroom is visible.

⛔ **(3) IS THE ONE THAT DOES NOT EXIST YET AND IS THE REASON FOR THE WHOLE BUILD.**
`AiUsageEvent.detail` is free text. You cannot divide by "resolutions" until an AI call
is *structurally* attributable to the market/round/poll it served. See §4.

---

## §4 · DATA MODEL

### 4a · attribute the spend (do this FIRST — it blocks §3.3)

Add to `AiUsageEvent`:

```prisma
subjectType String?   // "market" | "updown_round" | "poll" | "chat_session" | null
subjectId   String?   // soft ref — no FK, so a deleted market cannot break metering
@@index([subjectType, subjectId])
@@index([cycleId])
```

⛔ **Soft refs, no foreign key.** Metering must survive retention deletes of the thing
it points at, and an FK would make a market delete fail — a metering table must never
be able to block a product operation.

Then thread `subjectType`/`subjectId` through every `recordAiUsage()` call site.
`grep -rn "recordAiUsage(" src/` — do them all in one commit, because a half-threaded
attribution silently under-counts, and an under-count here reads as "cheaper than it is".

### 4b · the cycle ledger

```prisma
model AiSpendCycle {
  id          String    @id
  index       Int       @unique   // monotonic, 1-based, no gaps
  sizeUsd     Float                // ⛔ STAMPED AT OPEN — see §9c
  priceRev    String               // pricing-table revision this cycle was costed at
  openedAt    DateTime
  closedAt    DateTime?
  costUsd     Float     @default(0)
  status      String                // "OPEN" | "CLOSED"
  openedBy    String?               // null = rolled automatically
  note        String?
  @@index([closedAt])
  @@index([status])
}
```

⛔ **`AiSpendCycle` IS NEVER PRUNED.** It is the durable aggregate; `AiUsageEvent` is
the perishable detail (180 days). This is the whole reason the cycle row carries its own
`costUsd` rather than being recomputed on read — see §11(f).

### 4c · config

Store in `SystemConfig` via `loadConfig`/`saveConfig`, same as `CreditConfig`:

```ts
type CycleConfig = {
  sizeUsd: number;          // custom, Ali sets it
  autoRoll: boolean;        // close+open automatically when size is reached
  targetMarginPct: number;  // for the suggested-price calculation
  fxTzsPerUsd: number;      // explicit, dated — never hardcode a rate
  fxAsOfIso: string;
  minDaysForProjection: number;  // default 14 — see §11(h)
};
```

---

## §5 · THE METER

In `recordAiUsage()`, after the usage row is written:

```
withLock("ai-spend-cycle"):
    cycle = openCycle() ?? openNew(index+1, cfg.sizeUsd, cfg.priceRev)
    remaining = cost
    while remaining > 0:
        room = cycle.sizeUsd - cycle.costUsd
        take = min(room, remaining)
        cycle.costUsd += take
        remaining   -= take
        if cycle.costUsd >= cycle.sizeUsd - EPS:
            close(cycle); audit("ai.cycle_closed"); cycle = openNew(...)
```

⛔ **THE LOOP IS NOT OPTIONAL.** One call can cross several cycles (size $0.01, a $0.30
Opus call = 30 cycles). A single `if` silently caps the count and every downstream number
is then too low. `test:ai-cycles` must include a one-call-spans-N-cycles case.

⛔ **`withLock` + the unique index on `index` together.** The lock serialises; the unique
index is what makes a lost lock loud instead of silent (duplicate cycle → constraint
error → alert), which is the `E-108` lesson: never let the only protection be the one you
cannot observe failing.

⛔ **Use the same `EPS = 1e-6` float guard `checkLimitAndAlert()` already uses**
(`ai-usage.ts`) — `20 * 0.8` is `16.000000000000004` in float, and this repo has already
been bitten by exactly that.

⛔ **Still best-effort for the CALL.** Wrap in try/catch; a broken meter must not block
poll generation. But — see §12 — add a reconciliation gate, because "best-effort" plus
"nobody checks" equals "silently wrong", which is this repo's single most repeated defect.

---

## §6 · ADMIN UI

Extend `/admin/ai-usage` with a **Cycles** section, or add `/admin/ai-usage/cycles`.
⛔ **Use the kit — every atom below already exists and is already the house style:**

- `AdminPageHead`, `AdminCard`, `AdminKpi`, `KpiGrid`, `AdminBody`
- `AdminAreaChart` (cycles/day), `AdminMeter` (current cycle % consumed)
- `AdminPagination` + `PER_PAGE` + `parsePage` + `buildBaseHref`
- `parseSort` / `applySort` / `SortTh`, `ScrollX`, `Chip`, `EmptyState`, `I` glyphs
- `DateTimeRangeFilter` + `resolveRange` for the window
- Form: `Field` + `Input` (⛔ **numeric input MUST be the shared `Input` atom** — never a
  raw `<input type=number>`), `Button`, `ConfirmDialog`, `useDeferredToast`

**Design law, non-negotiable (`DESIGN_AUTHORITY` B7/B8):**
- `<PageContainer tier="…">` — never a hand-typed `max-w-[…]`, and its `loading.tsx`
  must state the **same tier** or `test:measure` §3 fails
- The **closed type scale** only (`text-micro` etc.). `test:type-scale` will reject new
  arbitrary sizes and its ratchet is at its floor
- ⚠️ `theme.spacing` is overridden: **`h-7` renders 40px**, below the 44px tap target.
  Use px literals for control heights, as `/notifications` had to
- The page renders **no `<main>`** — the shell owns that landmark, and `PageContainer`
  cannot render one (compile error)

**Responsive + i18n:** 360 / 768 / 1280 × EN / SW / ZH, `<html lang>` verified per cell.
⛔ **Every user-facing string goes through the dict** (`useT` / `getServerT`, en+sw+zh);
`test:i18n` enforces parity. No hardcoded English.

---

## §7 · FORM VALIDATION — EXHAUSTIVE

Server-side is the authority (client-side is convenience only). Follow the existing
shape: `{ ok: false, error: "…" }`, never a thrown stack.

| Field | Rule | Message must say |
|---|---|---|
| `sizeUsd` | finite, `> 0`, `>= 0.001`, `<= 1000` | why the bound exists, not "invalid" |
| `sizeUsd` | reject `NaN`, `Infinity`, `-0`, `"1e999"`, `"0.1.2"`, empty, whitespace | — |
| `sizeUsd` | max 6 decimal places (matches `round6`) | — |
| `targetMarginPct` | finite, `0 ≤ x ≤ 500` | a 1000% margin is a typo, not a strategy |
| `fxTzsPerUsd` | finite, `> 0`, sane band (e.g. 500–10,000) | reject a decimal-point slip |
| `fxAsOfIso` | valid ISO, not in the future, warn if > 30 days old | staleness is a money error |
| `minDaysForProjection` | integer, `1 ≤ x ≤ 365` | — |
| `autoRoll` | strict boolean from the form, not truthiness | — |

⛔ **Parse with `Number(raw)` then `Number.isFinite()`** — the existing
`setCreditLimitAction` already does exactly this; copy it, do not invent a second style.
⛔ **Trim the raw string first.** `" 20 "` must work; `""` must fail with a message.

---

## §8 · PROTECTIONS — SETTING THE PARAMETERS

1. **RBAC + step-up 2FA** — `requireStaff("ops")`, exactly as `actions.ts` does today.
   It audits a blocked attempt as a side effect; keep that.
2. **Audit every change with the PRIOR value** — `audit({ category: "ADMIN", action:
   "ai.cycle_config_changed", payload: { sizeUsd, priorSizeUsd } })`. ⛔ **Never
   hand-insert an `AuditLog` row** — the table is HMAC-chained with a unique `prevHash`.
3. **`ConfirmDialog` on anything that changes the meaning of history** — changing
   `sizeUsd` changes what "a cycle" means. State the effect in the dialog body.
4. ⛔ **CHANGING THE SIZE IS NOT RETROACTIVE.** Closed cycles keep the `sizeUsd` they were
   opened with. If a size change rewrote history, "cycles per year" would silently change
   for every past year the moment Ali retunes it — the number would be unfalsifiable.
   The new size applies to the **next** cycle opened. Pin this with a test.
5. **No two-officer lock.** ⛔ Ali's dated decision; `test:two-admin` asserts its ABSENCE.
6. **One cap, not two.** `assertAiBudget` is the live money gate. If a cycle cap is added,
   **derive one from the other** — two independent caps will disagree and the argument
   will be settled at 2am against real money.

---

## §9 · PROTECTIONS — VIEWING THE RESULTS

The failure mode here is not a crash. It is a **confident wrong number Ali prices from.**

1. **Never extrapolate from too little data.** Under `minDaysForProjection`, render
   *"not enough data to project — N days observed"*, not a year figure.
2. **Only CLOSED cycles feed rates.** An open cycle is a partial and would drag every
   average down.
3. **Divide-by-zero** → render `—`, never `Infinity` or `NaN`. Zero resolutions in a
   window is normal.
4. **Show the FX rate and its date next to every TZS figure.** A converted number with no
   visible rate is a claim nobody can check.
5. **Show the model mix.** Haiku → Opus is a ~5× cost change; if the cost-per-resolution
   moves and the mix is invisible, it looks like the product changed when the *model* did.
6. **Show the unattributed bucket explicitly.** Calls with no `subjectId` must be visible
   as their own number, and the cost-per-resolution must state which buckets it includes.
   Silently dropping them makes the product look cheaper than it is.
7. **Failed calls still cost money** — include `ok: false` rows, and label them.
8. **Timezone** — "today" and "per year" use `getPlatformTimezone()` (`zoned-time.ts`),
   never raw UTC. `test:zoned-time` exists for this.
9. **Read-only for roles without `ops` act.** Follow the RBAC matrix; a FINANCE officer
   may view without being able to retune.

---

## §10 · SCENARIOS THAT WOULD CAUSE PROBLEMS

⭐ **This section is the reason the plan exists. Work through it before writing code —
each line is a test case.**

| # | Scenario | Consequence | Protection |
|---|---|---|---|
| a | Size changed mid-cycle | "cycles/year" becomes meaningless across history | stamp `sizeUsd` at open (§8.4) |
| b | Size set to 0 / negative | infinite cycles, div-by-zero | validation (§7) + clamp at the meter |
| c | Two calls finish simultaneously | duplicate cycle row, or lost spend | `withLock` **and** `@unique index` |
| d | One call larger than a cycle | count silently capped | the `while` loop (§5) |
| e | Meter throws | AI call breaks | try/catch, best-effort (existing rule) |
| f | Retention prunes usage rows at 180d | recomputed cycles under-count forever | cycle rows are durable and never pruned; reconciliation only spans the retained window |
| g | Server TZ ≠ platform TZ | "today" is wrong by hours; year boundary wrong | `getPlatformTimezone()` |
| h | Projection from 3 hours of data | a wildly wrong annual figure Ali prices from | `minDaysForProjection` + confidence copy |
| i | Calls with no attribution | cost-per-resolution deflated or inflated | explicit unattributed bucket (§9.6) |
| j | Failed calls ignored | real spend under-counted | include `ok:false` |
| k | Anthropic changes prices | history costed at rates nobody recorded | `priceRev` stamped per cycle |
| l | Model switched Haiku→Opus | cost/resolution jumps ~5× with no visible cause | show model mix |
| m | Two caps (USD + cycles) | they disagree; one blocks, one doesn't | derive one from the other (§8.6) |
| n | TZS shown from a stale FX rate | mispricing in the reported currency | rate + date rendered (§9.4) |
| o | Historical events predate cycles | a gap that looks like zero spend | backfill, or label "pre-cycle" and exclude from rates — **state which** |
| p | Zero resolutions in window | `Infinity` on screen | render `—` |
| q | A cycle open for weeks (low traffic) | rate maths skewed by a partial | closed-only (§9.2) |
| r | Clock skew / `openedAt` after `closedAt` | negative durations | assert ordering at close |
| s | Backfill run twice | double-counted cycles | idempotent by `index`, guarded by the unique constraint |
| t | Someone "fixes" a cycle row by hand in SQL | ledger and events silently disagree | reconciliation gate (§11) flags drift loudly |

---

## §11 · GUARDS — AND THE RED PROOF EACH ONE NEEDS

⛔ **House rule: every guard ships with a RED proof, and the proof must name the CHECK
that failed and prove it read the mutant. "Exited non-zero" is not evidence.**
⭐ **A mutation that MISSES is a finding, not a nuisance** — that is how `E-186` and
`E-189` were both found.

**A new gate, `test:ai-cycles` — ⛔ it does NOT exist yet; this session creates it** (and
its red harness `red:ai-cycles`, with anchors in `scripts/anchors/`). At minimum:

1. **Conservation** — `Σ cycle.costUsd` equals `Σ event.costUsd` over the retained
   window, within `EPS`. *This is the reconciliation that makes "best-effort" safe.*
2. **No gaps, no overlaps** — cycle `index` is contiguous from 1; exactly one `OPEN`.
3. **Size is stamped, not looked up** — change the config, assert closed cycles keep
   their old `sizeUsd`.
4. **Rollover across N cycles** — one call, tiny size, assert N closes.
5. **Concurrency** — fire M concurrent `recordAiUsage` calls, assert conservation holds
   and no duplicate index. (`test:bet-concurrency` is the pattern to copy.)
6. **Projection refuses short windows** — under `minDaysForProjection`, no year figure.
7. **Div-by-zero renders `—`.**
8. **CONTROL: the corpus was non-empty** — a conservation check over zero rows passes
   vacuously, and this repo has shipped exactly that mistake more than once.

Plus: `test:i18n` (dict parity), `test:type-scale`, `test:ui-consistency`, `test:measure`
(tier + landmark), `test:responsive`, `test:encoding`.

⛔ **`test:responsive`'s player sweep is a GUEST sweep on any production build** (`E-187`)
— for signed-in coverage use `scripts/live/harness.mjs` → `loginOnce(b, "fleet:07")`.

---

## §12 · ROLLOUT ORDER

1. Attribution (`subjectType`/`subjectId`) + thread every call site — **one commit**.
2. `AiSpendCycle` migration — expand-only, `IF NOT EXISTS`; pre-flight on production the
   way `ops:preflight-notification-idx` did.
3. The meter + `test:ai-cycles` + `red:ai-cycles` — **one commit**.
4. Backfill (or the explicit "pre-cycle" label) — decide and write it down.
5. Read model + projections.
6. UI, with screenshots at 3 widths × 3 locales.
7. Live drive on production. ⛔ **Only live tests count — a green suite is not evidence.**

---

## §13 · DEFINITION OF DONE

- [ ] Ali can set a **custom cycle size** and it takes effect on the next cycle only
- [ ] The page states **cycles today / this month / projected per year**, with confidence
- [ ] It states **cost per resolution** per product line, and what is unattributed
- [ ] It states a **suggested TZS price** beside the TZS 1,000 charged today
- [ ] Conservation gate green; `red:ai-cycles` all mutations caught
- [ ] EN/SW/ZH × 360/768/1280 screenshots taken **and opened**
- [ ] Docs + `LIVE-QA-CAMPAIGN.md` §6b handoff updated **in the same pass**, money
      position stated (`test:settlement-expectation` §5 fails otherwise)
- [ ] Committed **and pushed**

---

## §14 · OPEN QUESTIONS FOR ALI — ASK BEFORE BUILDING §3.4

1. **What is the billable event?** Per resolved market? Per bet? Per active player?
   The cost-per-unit is meaningless until this is named.
2. **Default cycle size?** $1.00 is legible; $0.25 gives finer resolution. Ali's call.
3. **Target margin** for the suggested price.
4. **Does Up & Down price separately?** It is the highest-frequency spender (one oracle
   call per asset per boundary) and Ali has already said it is its own game.
5. **Is the cycle cap allowed to BLOCK calls**, or is it report-only with `assertAiBudget`
   staying the only gate? (§8.6 — there must be exactly one authority.)
