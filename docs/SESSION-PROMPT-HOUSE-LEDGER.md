# SESSION PROMPT — `/admin/house`, the owner's book

**Commission opened 2026-09-04 by Ali. Status: NOT STARTED.**
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
`AdminRestricted`, `AdminTableEmpty`, `AdminPagination`, `AdminSort`, `StatusPill`, `Tabs`,
`ScrollX`, `Stat`, `DateTimeRangeFilter`, and from `admin-charts`: `AdminAreaChart`,
`AdminStackedBars`, `AdminBarList`, `AdminMeter`, `AdminGauge`, `AdminSpark`.

⛔ **No hand-written colour, shadow, border or spacing.** Tokens only; a shadow is composed from
`--shadow-*`. ⛔ **A new Tailwind rung must be added to `tailwind.config.ts` AND `src/lib/utils.ts`
in the SAME commit** — `twMerge` files this repo's fontSize keys as colours and will silently
delete a size that is not registered. ⛔ Money is `formatTzs` / `formatTzsCompact` on tabular
figures — never a raw number, never a hand-rolled format. ⛔ Widths: admin board tier, via the kit.

⛔ **Trilingual (en/sw/zh), no hardcoded user-facing strings** — every key in all three locales,
`npm run test:i18n` must keep parity. ⚠️ Swahili is the longest; the 360 layout is designed for it.

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
| 1 · Pure `house-book.ts` + `test:house-book` + `red:house-book` | ☐ |
| 2 · Ledger-backed DAL (position, earnings, per-game, provenance) | ☐ |
| 3 · Tab 1 POSITION | ☐ |
| 4 · Tab 2 EARNINGS | ☐ |
| 5 · Tab 3 BY GAME | ☐ |
| 6 · Drill-down + ⭐ rate provenance + reconciliation | ☐ |
| 7 · RBAC gate + nav + cross-links | ☐ |
| 8 · Trilingual copy | ☐ |
| 9 · Live visual drive, READ, 4 widths × 3 locales | ☐ |
| 10 · Close-out, every number re-derived | ☐ |

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
2. **Are TRA/GBT levies already remitted, or accruing?** Changes whether they are a *payable* on
   the balance sheet or an expense already gone.
3. **Bonus cost** — does the owner want it as a cost line in the waterfall? (It is real money out.)
4. **Per-player drill-down inside a game** — wanted, or is per-game the floor? ⚠️ Player-level money
   on an admin screen carries a privacy/data-handling obligation (`docs/DATA-RETENTION.md`).
