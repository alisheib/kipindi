# SESSION PROMPT — `/admin/house`, the owner's book

**Commission opened 2026-09-04 by Ali. Status: ⭐ CLOSED 2026-09-05 — live on production.**
**Authority: this file. Progress lives in §9; nothing else records this work.**

---

## 0 · THE ASK, IN THE OWNER'S OWN WORDS

> *"Admins now — we can see how much money we made. Maybe we need a dedicated page to see, after a
> game, players are winning, how much is coming to our wallet as owners after commission and all,
> with all calculations in it… so we know how much we have in our balance, how much we made from
> games, each game, and if we decide to go detail and see where it all came from and how much we
> have now… I care to know our house, how much we have, so we know how much we're making, profits,
> and paying losses. And when the rate from admin is used, and starting when admin changed rates
> and we started having each this rate."*

Read plainly, that is **four questions**, and the page exists to answer exactly these:

1. **What do we hold right now, and how much of it is actually ours?**
2. **What did we make in a period — and is that cash, or an accounting figure?**
3. **Per game: money in, money paid out, our cut, levies out, what we kept.**
4. ⭐ **Which rate did that game use, who set it, and when?**

⛔ **QUESTION 4 IS THE HARD ONE AND IT IS THE REASON THIS PAGE IS NOT JUST A CHART.** Everything
else is presentation over data that exists. Question 4 is a claim about *history*, and a page that
answers it wrongly is a page that misreports revenue for every game settled before the last rate
change.

---

## 1 · WHAT THE SYSTEM ALREADY HAS — ⛔ READ THIS BEFORE WRITING A LINE

**This platform is not missing a financial engine. It has a good one.** The failure mode for this
commission is building a second one beside it. Measured 2026-09-04:

### 1a · The books are real double-entry

`prisma/schema.prisma` → `model LedgerEntry`: `groupId` (balanced set), `account`, `entryType`,
`amount Decimal(18,2)`, and — decisively for this page — **`marketId`**. Per-game attribution is
therefore a `groupBy`, not a reconstruction.

House accounts in use: `HOUSE:COMMISSION` (our fee: pool + early-exit + withdrawal),
`HOUSE:AGGREGATOR` (gateway's share), `HOUSE:TRA_LEVY`, `HOUSE:GBT_LEVY`.

Revenue-bearing entry types: `SETTLEMENT_COMMISSION`, `CASHOUT_FEE`, `WITHDRAWAL_FEE`.
Money leaving the house: `SETTLEMENT_TRA_LEVY`, `SETTLEMENT_GBT_LEVY`.
⚠️ Four **retired** types (`SETTLEMENT_TAX`, `SETTLEMENT_RESERVE`, `SETTLEMENT_AGGREGATOR`,
`WITHDRAWAL_TAX`) are never written again but **historical rows still reference them** — any
period covering mid-2026 or earlier must include them or the books will not reconcile.

`src/lib/server/ledger.ts` already provides `trialBalance()`, `computeTrialBalance()`,
`houseAccountBalances()`, `ledgerAccountBalance()`, `reconcileLedger()`.

### 1b · ⭐ THE RATE IS ALREADY FROZEN PER GAME — ALI'S CONCERN IS ARCHITECTURALLY SOLVED

`Market.feeSnapshot Json?` stores the rates **as they stood when that market was created**.
`src/lib/server/market-config.ts` provides `snapshotFromConfig(cfg)` and — for games that predate
snapshotting — `snapshotOrLegacy(raw)`, which falls back to the **legacy 9% commission with the new
ceiling**, deliberately, because that is what those players were quoted.

⛔ **SO AN ADMIN CHANGING THE RATE TODAY CANNOT REWRITE YESTERDAY'S GAMES, AND THE PAGE MUST NEVER
IMPLY OTHERWISE.** Two fee models coexist: `loser-share` (current) and `capped-commission`
(retired arm, still live on historical rows and on Up & Down). Up & Down additionally freezes
`UpDownRound.marginBps` at open.

What does **not** exist is the *link*: nothing today shows "this game used 10%, set by <officer> on
<date>". `/admin/config` has a **history tab backed by `AuditLog`** — that is the other half of the
join, and it has never been joined.

### 1c · `/admin/finance` already exists and is substantial

It renders GGR, NGR, operator margin, wallet liability, provider summary, money-flow and margin
series, top NGR contributors, house account balances and the trial balance — gated to
`MONEY_ROLES` / `canView("accounting")`.

⛔ **DO NOT DUPLICATE IT.** §3 defines the boundary.

### 1e · ⭐ THE SELCOM RAIL BALANCE — ALI ASKED FOR IT, AND IT IS ALREADY BUILT

Ali, 2026-09-04: *"you have Selcom credentials… if you can get API what we have in the account
linked to Selcom that we pay from."* **That exact number already exists and is already read.**

`src/lib/server/selcom.ts → selcomFloatBalance()` calls `POST /v1/vendor/balance` and returns the
**disbursement float** — precisely "the account we pay from". It needs `PAYMENT_VENDOR_PIN`; when
that is unset the reader returns a *reason*, not a zero. It is already rendered on
`/admin/payments` via `selcom-statement-card.tsx`. ⛔ **No new API integration is required and no
new credentials are needed.**

⛔ **BUT IT IS NOT "HOW MUCH THE BUSINESS HAS", AND THE PAGE MUST NOT LET IT READ THAT WAY.**
Measured on production three independent ways (session 62): **Selcom publishes NO collections
balance.** The vendor `data` array has length 1, and a drawdown proved the account it reads is the
disbursement float alone — it fell ~73,615 against 70,000 of confirmed payouts *while 646,000 of
confirmed collections passed through and never touched it*. **Deposits settle to the bank, not to
any float we can read.** So the rail balance answers *"can we pay people today?"* — a genuine and
important owner question — and it does **not** answer *"what is the house worth?"*.

⭐ **AND THE CODEBASE ALREADY HAS THE MECHANISM THAT KEEPS THIS HONEST — REUSE IT, DO NOT REINVENT.**
`selcom-statement.ts` makes provenance a **type**, not a comment: every figure carries
`source: "rail" | "ledger"`, only `railFloat()` can mint a `"rail"` one, and the renderer prints
the provenance label **out of the same object as the number** — so a ledger total physically
cannot appear under a rail heading. `RailBalance` is deliberately
`{available:true, balance, source:"rail"} | {available:false, reason}` with **no
`{available:false, fallback:number}` arm**, because an "unavailable" balance carrying a number is
the exact lie this page must never tell. ⛔ **The new page imports these types. Any figure it shows
must carry its provenance.**

⚠️ The related trap, already measured: never add `BET_PAYOUT` (an internal wallet credit) to
`WITHDRAWAL` (money that actually left). On 2026-08-25 that conflation would have overstated
outflow by **29.7×**.

### 1d · 🔴 A REAL DEFECT RISK, FOUND WHILE EVALUATING — THIS PAGE MUST NOT INHERIT IT

`analytics.ts → settlementFeesByPoll()` reports per-poll fees by **RECOMPUTING** them:
`ratesFor(m)` then `poolFee(...)`. It does **not** read the ledger.

That means the number the owner reads is a *recalculation*, not the money that was actually
booked. They agree only while the recompute and the settlement writer agree — and the moment a fee
formula, a rounding rule or a snapshot fallback changes, **the page will report revenue the books
never recorded, silently and confidently.**

⭐ **THE LAW FOR THIS PAGE: THE LEDGER IS THE TRUTH; A RECOMPUTE IS A CHECK.** Every figure shown
is read from `LedgerEntry`. The recompute is still performed — and displayed **as a reconciliation
variance**, so a divergence becomes a visible, investigable row instead of a quiet misstatement.
⛔ Never show a computed figure where a booked one exists.

---

## 2 · THE FINANCIAL MODEL — DEFINITIONS, WRITTEN ONCE

⛔ **A financial page that will not say which number it means is worse than no page.** Every tile
states its definition; no tile is labelled merely "revenue" or "profit".

| Term | Definition | Source |
|---|---|---|
| **Handle** | Total staked in the period. Not revenue. | `STAKE_DEBIT` |
| **GGR** | Handle − player winnings. The gaming result. | `report-money` |
| **House fee earned** | `SETTLEMENT_COMMISSION` + `CASHOUT_FEE` + `WITHDRAWAL_FEE` | ledger |
| **Levies payable** | `SETTLEMENT_TRA_LEVY` + `SETTLEMENT_GBT_LEVY` — ⛔ **ours to remit, never ours to keep** | ledger |
| **Aggregator share** | `HOUSE:AGGREGATOR` — the gateway's, passing through us | ledger |
| **NGR** | GGR − bonus cost − processing fees (pre-tax bottom line) | `report-money` |
| **Net retained** | House fee − levies − aggregator. **What the owner actually keeps.** | ledger |
| **Player liability** | Σ ACTIVE wallet `balance + hold`. **Owed to players; not ours.** | `walletLiabilityTotal()` |
| **Free house cash** | Cash held − player liability − levies payable | derived, ⚠️ see below |

⛔ **THE SOLVENCY LINE IS THE MOST IMPORTANT NUMBER ON THE PAGE AND THE EASIEST TO GET WRONG.**
Gross float is not profit. A platform holding TZS 100M of which TZS 92M is player balances and
TZS 3M is unremitted TRA/GBT has **TZS 5M**, and an owner shown "100M" makes decisions that
insolvency is built from. The page states liability and levies **beside** any balance, never after
a scroll. ⚠️ Where custodial cash cannot be read from a gateway balance, the page says
`— not connected` and shows the ledger-derived figure labelled as such. ⛔ **Never present a
ledger-derived figure as a bank balance.**

⚠️ **VOID ≠ zero revenue by accident.** A voided game refunds and books **no** fee — it must appear
in per-game lists with an explicit `VOID · no fee` marker, never be filtered out. A missing row
reads as data loss.

⚠️ **BONUS MONEY IS NOT REAL MONEY.** `BONUS_*` entries must never be summed into house revenue or
player liability without being named as bonus.

---

## 3 · THE BOUNDARY WITH `/admin/finance` — ⛔ ONE HOME PER QUESTION

Ali's own standing rule is **one source of truth**. Two pages showing GGR that disagree is the
worst outcome of this commission.

- **`/admin/finance` KEEPS**: period analytics — trend series, provider/gateway breakdowns, funnel,
  cohorts, top contributors, report-pack generation. *"How is the business trending?"*
- **`/admin/house` OWNS**: the balance sheet and per-game P&L with rate provenance.
  *"What do we hold, what is ours, and where did each shilling come from?"*
- ⛔ **Shared figures come from ONE exported function**, imported by both. If both pages show NGR,
  they call the same `report-money` core — never two queries.
- ⭐ **Cross-link both ways.** `/admin/finance` gains a link to the per-game book; `/admin/house`
  links to trends. Neither reimplements the other.
- ⛔ **`settlementFeesByPoll` must not gain a second caller.** Either migrate it to ledger-backed
  (preferred, §1d) or leave it to `/admin/finance` and give the new page its own ledger reader.

---

## 4 · THE PAGE

**Route:** `src/app/admin/house/page.tsx` — server component, `force-dynamic`.
**Nav:** add to `admin-nav-groups.ts` under the money group.
**Access:** ⛔ `MONEY_ROLES` / `canView("accounting")` — **owner-grade money data, NEVER MODERATOR.**
Gate **in the page body**, not only the layout (the layout gates `ADMIN_CONSOLE_ROLES` only) —
follow the `/admin/insights` precedent exactly.

### Tab 1 · POSITION — *"what do we hold right now"*
Not period-scoped; it is a balance sheet at an instant, and says the instant.
KPI row: **Selcom payout float (rail) · Ledger house position · Player liability · Levies payable ·
Free house cash** — the last with its arithmetic shown, not asserted, and every tile carrying its
`source` label out of the same object as its number (§1e). ⛔ The rail float and the ledger position
sit side by side and are **never summed**; the float answers *"can we pay today?"*, the ledger
answers *"what is ours?"*. ⛔ If the float read fails, render its `reason` — never a zero, never a
ledger figure wearing a rail heading. Then house accounts with the plain-language note each already
carries in `HOUSE_ACCOUNT_NOTE`, and the **trial balance with its in-balance/out-of-balance state
stated loudly** — an out-of-balance book is the single most serious thing this page can discover.

### Tab 2 · EARNINGS — *"what did we make"*
Period-filtered via the existing `DateTimeRangeFilter` + `resolveRange`.
A **waterfall**, because that is the shape of the question: `Handle → winnings paid → GGR →
fees earned → levies out → aggregator out → net retained`. Each step labelled, each figure booked.
Below it: fee earned split by source (settlement / early-exit / withdrawal) and by fee model.

### Tab 3 · BY GAME — *"each game, and where it came from"*
Paginated table, one row per settled game: title · settled-at · outcome (incl. **VOID**) · product
line · pool in · paid out · **our fee (booked)** · levies · **net retained** · ⭐ **rate applied**.
Sortable by net retained. Uses `AdminPagination` + `AdminSort` + `ScrollX` — never a bespoke table.

### Tab 4 (drill-down) · `/admin/house/[marketId]` — *"where did this one come from"*
The full arithmetic for one game, shown as a derivation a person can follow line by line:
pool composition (YES/NO) → winning side → gross payout → fee formula **with the actual rates
substituted** → levies → net retained. Then:

- ⭐ **THE RATE PROVENANCE PANEL — the answer to Ali's fourth question.** State the exact snapshot
  this game used, the fee model (`loser-share` / `capped-commission`), whether it came from the
  game's own `feeSnapshot` or from the **`snapshotOrLegacy` fallback** (⛔ say which, plainly —
  "this game predates rate snapshotting and uses the legacy 9%"), and the `AuditLog` config-change
  entries that bracket the game's creation: **the rate in force, who set it, and when.**
- **Reconciliation**: booked vs recomputed, and the variance. ⛔ A non-zero variance is rendered as
  an alarm with the difference named — never rounded away, never hidden.
- Every ledger entry for the game, so the owner can see the actual rows.

---

## 5 · DESIGN — ⛔ THE KIT ONLY, NOTHING BESPOKE

**Read `docs/DESIGN_AUTHORITY.md` first**, then `src/app/globals.css`.
⛔ The old design_handoff kit is **deleted and forbidden**.

Use: `AdminPageHead`, `AdminKpi`, `KpiGrid`, `AdminCard`, `AdminBody`, `AdminLoadError`,
`AdminRestricted`, `AdminTableEmpty`, `AdminPagination`, `Tabs`, `ScrollX`, `FilterPill`,
`DateTimeRangeFilter`, the `admin-skeletons` kit for `loading.tsx`, and from `admin-charts`:
`AdminAreaChart`, `AdminStackedBars`, `AdminBarList`, `AdminMeter`, `AdminGauge`, `AdminSpark`.
⚠️ **`AdminSort` is not an export** — it is `parseSort` / `applySort` / `SortTh` from
`@/components/admin/admin-sort`. `AdminPagination` is an alias of `Pagination`.

⛔ **No hand-written colour, shadow, border or spacing.** Tokens only; a shadow is composed from
`--shadow-*`. ⛔ **A new Tailwind rung must be added to `tailwind.config.ts` AND `src/lib/utils.ts`
in the SAME commit** — `twMerge` files this repo's fontSize keys as colours and will silently
delete a size that is not registered.

### 🔴 THREE CORRECTIONS TO THIS SECTION (2026-09-05, measured while building the page)

**1. ⛔ MONEY IS `<span className="amount">{formatTzs(x)}</span>` — NEVER `<Stat money>` AND
NEVER `<Cash>`.** This section did list `Stat`, and following it would have been a defect.
`Stat money` wraps its value in `<Cash>`, which honours the PLAYER's balance-privacy blur
(`window.__cashHidden` + `localStorage.cashHidden`) — and **the admin console renders no
`<CashEye />`**. An operator who once hid balances in the player app would open the owner's book
and read `TZS •••••` with no way to reveal it. `AdminKpi` is safe: it writes its value under
`.amount` directly and does not route through `Cash`. A money `<td>` must carry `amount` (or
`font-mono tabular`) or `.admin-tbl td.tabular`'s nowrap rule cannot see it and `TZS 550,560`
folds onto two lines. `formatTzsCompact` only where a figure would clip — ⛔ never in a
reconciliation, where the reader is checking digits.

**2. ⛔ THE PAGE IS ENGLISH, WITH `sw` GLOSSES — NOT TRILINGUAL. This overrules the paragraph
above.** `/admin` is English-only **by design**, and it is written down in four places:
`tabs.tsx` (*"`TabItem.labelSw` was dead API … the admin console is English-only by design"*),
`admin/roles/page.tsx`, `admin/players/[id]/page.tsx` (*"ENGLISH LITERALS ON PURPOSE — /admin is
a staff surface … test:failure-reasons §10 excludes it from the trilingual ratchet"*), and
`utils.ts`'s `adminCount` (*"⛔ ENGLISH ONLY, AND THAT IS WHY IT IS NAMED `adminCount`"*).
Measured: 4 of 157 admin files touch i18n at all and every one borrows a player-kit string;
there is **no `admin` section in the dictionary** and **zero `zh` in the console**. `test:i18n`
makes no parity claim over `/admin` and stays green either way. So: hardcoded English body copy,
plus the `sw` gloss prop on `AdminPageHead` / `AdminCard` / `AdminKpi`. ⛔ Do not invent Swahili
— every gloss on `/admin/house` was lifted from a shipped admin page.

**3. ⛔ THERE IS NO "ADMIN BOARD TIER". This overrules the width line above.** The cap lives
once, on `admin/layout.tsx` (`max-w-console`); admin routes are excluded from tier parity by
design, and a page that renders its own `<main>` is banned. Use `AdminBody` (which *is*
`px-4 lg:px-6 py-5 space-y-4`) and `KpiGrid`. A wide table gets `<ScrollX>` plus a
`min-w-[Npx]` on the `.admin-tbl` — never a page-level width.

⛔ **Charts follow the existing engine grammar** — no new chart library, no vendor attribution
(§B12.6: attribution is expressly declined).

---

## 6 · GUARDS — ⛔ EXECUTED, NOT GREPPED

Ali's law: *a gate that chooses its own population cannot fail*, and *prove it by mutation*.

1. **Extract the arithmetic into a PURE module** (`src/lib/house-book.ts`) — no DB, no React, no
   clock. Every input an argument. This is what makes it testable at full strength.
2. **`npm run test:house-book`** must **CALL** it: the waterfall identity
   (`handle − payouts − fees − levies` closes to zero); mixed/VOID/legacy-snapshot games; both fee
   models; a booked-vs-computed variance surfacing rather than rounding away; ⭐ **a game settled
   BEFORE a rate change still reporting the OLD rate** — that is Ali's question as an assertion.
3. **`npm run red:house-book`** with anchors in `scripts/anchors/`, mutating: the levy summed into
   net retained; player liability omitted from free cash; a VOID game filtered out; the snapshot
   replaced by the *current* config (⭐ the retroactive-rate defect); variance silently zeroed.
   ⛔ **Every anchor must resolve exactly once and be provably caught.**
4. ⛔ **Gates must be DISJOINT.** A broader guard upstream makes the one below it untestable — that
   was proven the expensive way in session 84.
5. Existing suites must stay green: `test:i18n`, `test:ui-consistency`, `test:type-scale`,
   `test:spacing-scale`, `test:dead-css`, `test:design-frozen`, `test:tokens`, `test:admin-nav`,
   `test:read-tiers` (+ `red:read-tiers` for the RBAC gate), `test:money-invariants`.

---

## 7 · ACCEPTANCE — Ali's words: *"0 issues, no data missing, everything perfect"*

- `tsc --noEmit` clean · `next build` clean · every guard above green · RED harness 100%.
- ⛔ **Driven on the LIVE deploy, and READ** — 360/768/1280/1920 × en/sw/zh: every tab renders,
  every figure present, no clipped edge, no horizontal scroll, no `NaN`, no `undefined`, no raw
  `{n}` template braces.
- ⛔ **Every link and redirect exercised**: nav entry, both cross-links with `/admin/finance`, the
  per-game drill-down, pagination, sort, the date-range filter, and the **RBAC refusal** — a
  MODERATOR must be genuinely refused, proven by a session that is actually rejected.
- ⛔ **Reconciliation proven on real production data**: booked totals equal the trial balance, and
  any variance is displayed rather than absorbed.
- ⛔ **Empty and failure states designed, not defaulted**: no settled games in range, a failed read
  (`AdminLoadError`), an out-of-balance book. A page that renders a confident zero over a failed
  query is the defect class this platform has been burned by repeatedly.
- ⚠️ **Re-derive every number at close.** Recorded numbers rot; never quote one in a conclusion.

---

## 8 · THE TRAPS THIS REPO WILL SET

- ⛔ **`Decimal`, not float.** Ledger amounts are `Decimal(18,2)`. Summing through JS floats
  reintroduces rounding error into a reconciliation whose whole purpose is detecting it.
- ⛔ **`productLine: "ALL"` for money reads.** `listMarkets()` defaults to `"MARKET"` and would
  silently omit every Up & Down round — guarded by `test:product-line`.
- ⛔ **Retired ledger types must be summed** for historical periods (§1a).
- ⚠️ **`$queryRaw` binds JS numbers as bigint** — int4-only PG functions need `::int` or fail 42883,
  prod-only.
- ⚠️ **Push to `main` is LIVE.** Another session may share this checkout: **stage by name, never
  `git add -A`**, and `git fetch` before analysing.
- ⚠️ **`test:motion` and every `qa:*` drive need a running server**; a bare run exits 1 with
  `ERR_CONNECTION_REFUSED` and that is the harness, not a defect.
- ⚠️ Production QA logins: `alpha`/`echo` are **rejected**; use `fleet:NN` for a player and `admin`
  for the console. See `reference` notes in `scripts/live/harness.mjs`.

---

## 9 · PROGRESS

*(Nothing else records this commission. Update in the SAME commit as the code, and keep a dated
handoff a fresh session can act on.)*

| Step | State |
|---|---|
| 1 · Pure `house-book.ts` + `test:house-book` + `red:house-book` | ☑ `6c591222` |
| 2 · Ledger-backed DAL (position, earnings, per-game, provenance) | ☑ driven read-only on production |

### ⭐ WHAT DRIVING THE DAL AGAINST THE LIVE DATABASE CHANGED (2026-09-04)

⛔ **`tsc` PROVES NOTHING ABOUT SQL.** Most suites run with no `DATABASE_URL`, so `hasDatabase()`
is false and the whole Prisma branch never executes — the exact hole a verification defect
shipped through on 2026-08-28. So every reader was driven **read-only against production**
(`railway run --service Postgres npx tsx …`), and it found three things no amount of reading
would have:

1. ⭐ **THE PER-GAME TOTAL CANNOT EQUAL THE HOUSE TOTAL, AND THAT IS CORRECT.** Measured gap:
   **760**, and it is entirely `WITHDRAWAL_FEE` credited to `HOUSE:COMMISSION` with a **NULL
   `marketId`** (15 rows). Withdrawal fees are not attributable to any game. ⛔ The BY GAME tab
   must SAY this, or an owner reconciling the two columns will conclude money is missing.
2. 🔴 **SEEDED BALANCES MAKE THE STRICT SOLVENCY LINE SCREAM.** Player liability **20,105,687**,
   of which **`ADJUSTMENT` = 20,600,000**, against real `DEPOSIT` of only **680,000** and
   custodial cash of **605,110** — so free house cash reads **−19,555,989**. Arithmetically
   right; as a headline it tells the owner he is insolvent by nineteen million when what he
   holds is test money. ⛔ **A false alarm is as serious as a missed one** — an owner who learns
   this line cries wolf stops reading it. `housePosition` now returns **both** the strict line
   and an ex-adjustments line, plus the liability split. ⛔ Neither may stand in for the other,
   and two RED anchors enforce exactly that.
3. ✅ **THE BOOKS ARE INTERNALLY CONSISTENT.** ACTIVE wallets **20,105,687** vs the `PLAYER:`
   ledger sum **20,105,687** — **difference 0**. Whatever else the page reports, the wallet
   ledger and the wallet table agree to the shilling.

⚠️ Also measured, so nobody re-derives it: `HOUSE:COMMISSION` **312,099** (already net),
`TRA` 36,658, `GBT` 18,374, `AGGREGATOR` 380; 588 markets touched money in the last year, 243
with a booked fee, **345 rows correctly kept as VOID/no-fee**; the waterfall identity closes.
⚠️ **These are dated readings and they rot — re-derive before quoting any of them.**
| 0 · ⭐ **Four defects found in steps 1–2 AFTER they shipped green** | ☑ `a47db847` |
| 3 · Tab 1 POSITION | ☑ `2fe0c975` |
| 4 · Tab 2 EARNINGS | ☑ `2fe0c975` |
| 5 · Tab 3 BY GAME | ☑ `2fe0c975` |
| 6 · Drill-down + ⭐ rate provenance + reconciliation | ☑ `2fe0c975` |
| 7 · RBAC gate + nav + cross-links | ☑ `2fe0c975` |
| 8 · ~~Trilingual copy~~ → English copy + `sw` glosses | ☑ see §5 correction 2 |
| 9 · Live visual drive, READ, 4 widths × 3 tabs + drill-down + a refused role | ☑ `npm run qa:house` |
| 10 · Close-out, every number re-derived | ☑ 2026-09-05 |

### 🔴 STEP 0 — FOUR DEFECTS IN THE SHIPPED ARITHMETIC, FOUND AFTER IT WENT GREEN (2026-09-05)

Steps 1–2 shipped at **34/0 green** and were wrong in four places. ⭐ **THE GUARD AGREED WITH
TWO OF THEM**, which is why the green meant nothing: `test:house-book` §5.2 asserted `60_000`,
the wrong answer, so the suite and the code were wrong in the same direction.

1. 🔴 **`waterfall()` subtracted the gateway share that was never in the fee.**
   `withdrawalEntries` splits the withdrawal fee AT THE POINT OF BOOKING — `gatewayShare` goes
   straight to `HOUSE:AGGREGATOR`, only `houseShare` reaches `HOUSE:COMMISSION` — while
   `feeEarned` reads positive `HOUSE:COMMISSION` rows only. **`house-book.ts`'s own header
   forbids exactly this, one account over**, and the code contradicted it. Now a labelled
   pass-through rendered outside the subtraction.
2. 🔴 **`bonusCost` was gross of re-locks.** `bonusRelockEntries` writes a **negative**
   `BONUS_CREDIT` to `PLAYER:`; an `amount > 0` filter dropped every reversal. Measured: gross
   **16,000** against a net of **2,000** — seven re-locks — so the owner's net retained was
   understated by **14,000**. The largest of the four live errors.
3. 🔴 **Bonus-funded stakes were missing from the handle.** `stakeEntries` credits the pool
   TWICE (`STAKE_DEBIT` + `BONUS_SPEND`) while payouts from it are counted in full, so a
   bonus-funded market **cannot close** and the reconciliation panel would cry wolf on a correct
   book. `BONUS_REFUND` (to `PLAYER_BONUS:`, which `LIKE 'PLAYER:%'` cannot match) was missing
   for the same reason and was fixed in the same pass — ⚠️ **that one is not in the original
   brief; it was found by measuring, and fixing only half would still not close.**
4. 🔴 **`readHouseAccounts` named four accounts.** `acct` mints three more — `HOUSE:RG_SUSPENSE`
   (*"money the platform HOLDS but does not own"*) and the retired `HOUSE:TAX` / `HOUSE:RESERVE`
   — so RG suspense was invisible to the solvency line and the page could disagree with
   `houseAccountBalances()`, which reads `LIKE 'HOUSE:%'`. Now read as a group.

⭐ **AND HERE IS THE HONEST PART: THREE OF THESE MOVE NO NUMBER TODAY.** `BONUS_SPEND`,
`HOUSE:RG_SUSPENSE` and `EXTERNAL:INTERNAL` are all **ZERO on production**. They are latent, one
bonus bet or one self-excluded deposit from being real. The brief asserted them as live
misstatements; the measurement says otherwise, and the measurement wins. Only the gateway
(**380**) and the bonus re-locks (**14,000**) were actually misreporting — **14,380 total**.

`test:house-book` 34 → **48**. `red:house-book` 10 → **17 mutations, all caught**.

### ⭐ WHAT BUILDING THE PAGE FOUND (2026-09-05, re-derived at close)

- **A REAL MONEY DISCREPANCY ON PRODUCTION.** Of 419 settled markets, **405 close EXACTLY**;
  twelve differ by ±1–2 (the documented per-winner allocation dust), one by +15, and
  `mkt_037b284976b9dd2bd9e2` by **−19,999** — its ledger recorded **10,500** of stakes while its
  `yesPool`/`noPool` columns said **30,500**, and settlement priced and paid against the columns.
  ⛔ An epsilon would have hidden it. This is the page working.
- **121 LEDGER `marketId`s HAVE NO MARKET ROW**, carrying **54,650** of real fees between them —
  and the **second-largest earner in the whole book (22,321) is one of them**. They render with
  the raw id and a *market row missing* label; dropping them would break the identity by that
  much, silently.
- **THE IDENTITY CLOSES:** per-game **366,371** + unattributed **760** (15 `WITHDRAWAL_FEE` rows,
  no `marketId`) = **367,131** = the house fee. **Variance 0.**
- **Up & Down is 353 of the 467 named money-moving markets** — three quarters. This is the
  measurement behind `bookByIds` having no `productLine` parameter.
- **`CASHOUT_FEE` has never been booked** (0 rows): every cash-out so far fell inside the
  free-exit grace. A hard-coded fee-source table would have shown a confident permanent zero,
  which is why `readFeeBySource` enumerates nothing.
- **`stampedAt === "legacy"` would mislabel 0 markets today** — every snapshot on production
  carries a `stampedAt`, and 44 markets have no snapshot at all. `hasOwnSnapshot()` closes the
  hole before a restore or a race opens it, not after.

### ⭐ AND A GUARD THAT READS THE FILE — `test:house-page` + `red:house-page`

None of the page's rules is a value a function returns: *this read is not reachable from here*,
*this fabricating idiom does not appear*, *this decision is taken through the one function
allowed to take it*. So there is a source-reading suite (**67 assertions**) with a mutation
harness (**16, all caught**).

🔴 **IT EARNED ITS KEEP TWICE, BOTH TIMES AGAINST ME.** First it caught a real defect in the
page: the reconciliation variance rendered as `?? 0`, printing *"TZS 0 · the books reconcile"*
on a window where the check **could not be run at all**. Then `red:house-page` found **five of
my own checks that could not fail** — a ternary that was always true, an `===`-only regex that
read straight past `!==`, an order check that ignored what the subtotal actually read. All five
are closed and the notes stay in the file. ⭐ **A guard nobody has watched go red is a green
light over an unread road, and that is as true of a guard I wrote this session as of one from
last year.**

---

## 10 · OPEN QUESTIONS FOR ALI — ⚠️ EACH CHANGES THE WORK

1. ✅ **ANSWERED 2026-09-04 — "the account we pay from".** Ali asked for the real Selcom balance and
   offered API credentials; **none are needed.** `selcomFloatBalance()` already reads
   `POST /v1/vendor/balance` (the disbursement float) and it already renders on `/admin/payments`.
   The page shows **both, side by side, each labelled by its own `source`**: the **rail float**
   (Selcom's own figure — *"can we pay people today?"*) and the **ledger house position**
   (*"what is ours?"*). ⛔ **They are never added together and never presented as one "balance".**
   ⚠️ **The remaining gap is real and must be stated on the page, not hidden:** Selcom publishes
   **no collections balance**, so deposits are invisible to any rail read — bank cash is not
   available through this API at all. If Ali wants true bank cash, that is a **separate bank
   integration or a manual reconciliation input**, and it is the one thing this page genuinely
   cannot answer today (§1e).
2. ✅ **ANSWERED — LEVIES ARE A LIABILITY, AND THE HEADLINE SUBTRACTS THEM.** Ali's call,
   2026-09-04: TRA/GBT are **money still owed**. So
   `free house cash = cash held − player liability − levies payable`, and ⛔ **no view may present
   a figure that includes unremitted levies as the owner's money.** This is the conservative
   reading and it is deliberate: an owner must never see as theirs money that must still be paid.
3. ✅ **ANSWERED — PER GAME IS THE FLOOR, AND THERE IS NO PLAYER-LEVEL DRILL-DOWN.** Ali's call:
   detail stops at the game (pool in · paid out · fee · levies · net kept · rate used). ⛔ **Do NOT
   render individual player stakes or payouts on this page** — that carries a data-handling duty
   under `docs/DATA-RETENTION.md`, and the owner did not ask for it. The per-player view already
   has homes (`/admin/players`, `/admin/transactions`).
4. ✅ **ANSWERED — ONE COMBINED BOOK, FILTERABLE BY PRODUCT.** Ali's call: polls and Up & Down live
   in **one** table with a product filter, because *"how much we made"* is one number. ⛔ This makes
   the `productLine: "ALL"` trap (§8) load-bearing — a money read that defaults to `"MARKET"`
   silently omits every Up & Down round and understates the total. Per-product subtotals are shown
   **within** the one book, never as two books the owner must add up.
5. **Bonus cost** — still open. It is real money out; the default is to show it as its own labelled
   line in the waterfall, never silently netted into GGR.

---

## 11 · HANDOVER — 2026-09-05

**The commission is CLOSED.** `/admin/house` is live: three tabs, a drill-down, registered in
`ROUTE_DOMAINS` / `NAV_GROUPS` / `ROUTE_KEYS` / `ADMIN_ROUTES`, gated to `accounting`, and driven
on production. Two commits: `a47db847` (the four defects in the shipped arithmetic) and
`2fe0c975` (the page, its structural guard and the live drive).

### Where things are

| What | Where |
|---|---|
| The arithmetic, pure | `src/lib/house-book.ts` — `test:house-book` (48) · `red:house-book` (17) |
| The readers | `src/lib/server/house-ledger.ts` |
| The join | `MarketStore.bookByIds()` in `src/lib/server/market-dal.ts` — ⛔ no `productLine` param, by design |
| The pages | `src/app/admin/house/{page,loading}.tsx` + `[marketId]/{page,loading}.tsx` |
| The structural guard | `test:house-page` (67) · `red:house-page` (16) |
| The live drive | `npm run qa:house` → `scripts/live/house-drive.mjs` |

### ⛔ Read these before touching any of it

1. **`?? 0` is banned in the two page files** and `test:house-page` §3 enforces it. It is the
   idiom that turns a failed read into *"the books reconcile"*. It already happened once here.
2. **Never reach for `listMarkets()` from this page.** §2 of the guard forbids it, and the
   reason is measured: Up & Down is three quarters of the money-moving markets.
3. **Never badge rate provenance off `stampedAt`.** Two paths produce `"legacy"`. Ask
   `hasOwnSnapshot()`, which `snapshotOrLegacy` itself calls so the two cannot drift.
4. **Narrow the outcome to `YES`/`NO` before `poolFee`.** Under `capped-commission` it ignores
   the winning side and will price a VOID, manufacturing a variance on a correct book.
5. **`tsc` proves nothing about SQL.** Most suites run with no `DATABASE_URL`, so the Prisma
   branch never executes. Drive any new reader read-only against production, then delete the
   probe. Every reader here was driven that way.

### 🔴 Two things that are somebody's, and are not this page's

- **`mkt_037b284976b9dd2bd9e2` is short 19,999 shillings.** Its ledger recorded 10,500 of stakes;
  its pool columns said 30,500; settlement priced and paid against the columns. `/admin/house`
  now displays it rather than absorbing it. **Nobody has investigated why.** It is a MARKET-line
  poll, settled 2026-08-30, and it has no `feeSnapshot`.
- **`test:updown-source-class` and `test:updown-handover` are RED on `main`** and were red at
  `9ce071aa`, before any of this work — verified in a throwaway worktree, not assumed. They
  belong to the parallel `/updown` lane.

### ⚠️ Every number in this document is dated and will rot

⛔ **Re-derive before quoting any of them.** The whole reason `test:house-book` executes the
arithmetic instead of grepping it, and the whole reason this page reads the ledger instead of a
recompute, is that a recorded number is a claim about a moment that has passed.
