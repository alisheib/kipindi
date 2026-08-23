# SESSION PROMPT — AI SPEND IN **CYCLES**, AND WHAT IT TELLS US TO CHARGE

> **Written 2026-08-23 (session 58) for the session that builds it.**
> ⛔ Read this whole file before opening a component. The work looks like "add a
> counter" and is not — the hard part is that a cycle count is a **business number
> Ali will price from**, so every way it can quietly be wrong is a defect, not a nit.
>
> **Status:** NOT STARTED. Nothing below exists yet.
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
