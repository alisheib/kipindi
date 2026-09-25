# House results: one owner-only view on the Desk (HOUSE-PNL-PLAN)

**Status: PLAN, not built.** This comes from a read-only research pass on `C:/kipindi-house-bots`, branch `bot-flow-seal`, at `6427ef64`.
- The tree is clean. The Opening/Closing fix the drafts were waiting on has landed as `5f1737af`.
- Nothing was run.
- Production figures are from the SELECT-only read of 2026-09-26 ≈00:10 EAT (`plans/house-bots/RESUME-HERE.md:8-22`). They are quoted as read, never as conclusions. Re-read them before quoting.
- Every line number below must be re-found by its TEXT before building (C7 ruling 460).

---

## 0 · In plain English (for Ali)

**What you get.** The Desk gets a new tab called **Results**. It answers three questions: did the desk's stakes make or lose money, on which day, and on which account.

**What is on it.** Two small tables:
- **By day:** the last 7 days, one line each. For example: *"25 Sep · Loss TZS 12,600 · 320 stakes placed · Final"*.
- **By account:** each account's result today and over the 7 days.

**How a result is counted.** For each stake that has finished:
- A **win** counts the payout minus the stake. The payout is already after 50pick's fee. For example, a 10,000 stake that wins against 20,000 on the other side is paid 27,400 at the current 13% fee on the losing side, so it counts **+17,400**.
- A **loss** counts minus the stake.
- A **refund** (void) counts **nothing**.
- A stake **still running** counts nothing until it finishes.

**Which day.** A stake counts on the day it was **placed**. That is how your daily loss limit and the automatic loss stop count it, so **today's figure is exactly the number the loss stop compares with your limit**. Because of this, a day can still change after midnight until its last stake finishes, and the tab says so.

**What it is not.**
- It is not 50pick's whole profit. The fee 50pick earns on those rounds sits on the House page, like any player's fee, and the two are never added together.
- It is not a report. There is no download, no email and no filing.

**Why days can look small.** As read on 26 Sep, 534 of the desk's 694 stakes were refunded. So a day's result comes from the few stakes that were actually decided.

**What it costs.** One written change to your 17 Sep rule ("no house lines on admin screens"), narrowed to this one tab and recorded in the compliance log in your own words. Everything else that rule banned stays banned.

**What you decide.** The 11 one-line choices at the end (§11). The recommended option is first each time.

---

## 1 · What "P&L" counts

### 1.1 Per stake: Position.status is the outcome truth (`8018653b`)

The statuses are exactly OPEN, WIN, LOSS, VOID and CASHED_OUT (`prisma/schema.prisma:1319-1325`).

| Status | Money the ledger writes | Counts as | Code |
|---|---|---|---|
| WIN | `BET_PAYOUT`, `amount: payout, fee: 0` | payout − stake | `market-service.ts:3887-3895` |
| LOSS | **nothing** | − stake | `market-service.ts:3952` |
| VOID | `BET_REFUND` of the whole stake | **0** | `:3615-3622` (one-sided), `:3747-3754` (void) |
| CASHED_OUT | `CASHOUT` | cash-out − stake | cannot happen: a house position is never sellable (`:2974-2980`) |
| OPEN | nothing yet | **not counted**; the day reads "Still running" | — |

Notes on the table:
- **The WIN payout.** It is paid out of the pool less the fee: `payout = stake ÷ winning pool × netPool` (`:3789-3817`).
- **The fee is already netted.** The current rule for both games is "13% of the LOSING side", and `netPool = pool − fee` (`src/lib/payout.ts:17-31`). The comment at `market-service.ts:3790` quotes the legacy capped formula, which is kept only for markets created before the cutover. Under either formula the winner is paid from the pool less the fee.
- **A void refund is the whole stake** because a house stake is cash only: `realPart = opts.stake` when `ctx.kind === "house"` (`:1388-1393`).

### 1.2 The arithmetic already exists, in ONE function

- `foldDayBook` computes `realisedLossTzs = settledStake − returned` (`src/lib/server/house-bot/book.ts:52-53`).
  - "Settled" means status ≠ OPEN.
  - "Returned" means CONFIRMED, marked `BET_PAYOUT`/`BET_REFUND`/`CASHOUT` rows on the cohort's positions (`house-bot-dal.ts:4260-4276`; memory twin `:2967-2988`).
- **So result = −realisedLossTzs.** The book already says so: *"Realised loss may be negative: that is a profit"* (`book.ts:19`).
- Every control that talks about this money reads that same field:
  - the desk-wide GLOBAL_LOSS_STOP: `houseDayBook(day, null).realisedLossTzs >= gCapDailyLossTzs` (`planner.ts:471-474`);
  - the per-account stop (`:461-467`);
  - the Limits tab's settled row (`house-console-read.ts:1701`);
  - each account's settled row (`:5509`).

### 1.3 Which day

**The EAT day the stake was PLACED** (`book.ts:10-12`). This is the only choice that keeps one arithmetic with the stops. Counting by the day a stake finished would be a second arithmetic for the same money.

What follows from that:
- **A past day can move.** Returns are bounded only from below (`t."createdAt" >= $1`, `house-bot-dal.ts:4267`), so a late settlement changes the day the stake was placed on.
- **"Final" is permanent.** A day with no open stake cannot move again: there is no reversal path, and Position and Transaction rows are never purged (`chain-purge.ts:12`).
- **A past day may not match the stop.** A past day's line is the cohort as it stands now, not the figure a stop fired on. The stop keeps only its cause and the count of cancelled intents (`outcomes.ts:198-213`), and the detail built at `planner.ts:474` is discarded. So the 2026-09-24 line will not show what the 21:52:26 stop saw. The tab says this in one sentence.
- **Today's key.** "Today" is the render's own key, `eatDayKey(Date.now())` (`house-console-read.ts:923`). `resolveRange({range:"today"})` starts at the same instant: `date-range.ts:165` → `report-money.ts:70-72`, and both use the one offset at `eat-day.ts:24`. A test pins this.
  - **Caveat:** the stops run on the DATABASE clock (`planner.ts:115`, `:181`). For as long as the two clocks differ around EAT midnight, the tab's "today" and the stop's "today" can differ. Ruling 348 already accepts this for the Limits row. The honest claim is "same arithmetic, same day except at the midnight instant."
- **Earlier days are whole EAT days counted back from the render's key.** They never come from `resolveRange("7d")`, which is rolling (`now − 7×DAY`, `date-range.ts:167`) and would cut a day's stakes in half. `report-money.ts:85-94` records that exact trap.

### 1.4 What is shown, and in which state

**Shown:**
- the desk's result per day for the last 7 EAT days;
- each account's result for today and for the 7 days;
- stakes placed per day (`book.bets`);
- the day's state.

**Not in the first cut** (§11 choices 7–9):
- a split by product;
- won/lost/void counts and the reasons stakes were refunded;
- the amount still running. The band's *Open exposure* tile already shows it desk-wide on every tab (C7 406).

**Never shown:** a split by stake type (§5).

| Situation | Result cell | State |
|---|---|---|
| No stakes that day | `—` (account cells: `No stakes`) | No stakes |
| Stakes placed, none finished | `Nothing settled` | Still running |
| Settled, figure > 0 | `Profit TZS X` | Still running / Final |
| Settled, figure < 0 | `Loss TZS X` | Still running / Final |
| Settled, figure exactly 0 (including `−0`, which is what `−realisedLossTzs` yields on an even day) | `Even` | Still running / Final |
| The day's read failed | `couldn't read — this is not zero` (C7 355/372(c)) | — |

- A 7-day total that includes a failed day is **refused**, never partial.
- A non-integer figure is also refused: `formatTzs` rounds silently (`utils.ts:62-65`), and every legitimate figure is whole TZS.

---

## 2 · Where it lives

**A fifth tab on the landing page, `/admin/desk?tab=results`, labelled "Results", appended LAST.**

**Why a tab rather than its own page.** A tab inherits the page's gate, the master-switch strip, the band, the rail, the loader and the metadata. A page would add a route, a loader under the parity rule (417), a probe instance and a second strip. It is still its own surface: its own panel and its own reader, with nothing added to the activity row (373(g) stands).

**Why last.** Ruling 312's order is "who is on the desk, what it is doing, what would stop it, what was done to it". Results controls nothing, so the four control tabs stay together and in order. No badge: `page.tsx:487` gives counts only to limits and activity.

**Changes:**
- `src/lib/house-bot/console-routes.ts:63` becomes `CONSOLE_TABS = ["roster", "activity", "limits", "history", "results"]`. Its docblock (`:47-62`) gains the fifth key and its reason. `CONSOLE_DETAIL_TABS` (`:147`) is unchanged: there is no results tab on the account page in the first cut.
- `page.tsx`:
  - `TAB_LABEL` (`:71`) and `TAB_GUIDANCE` (`:85`) are typed by the list, so tsc forces both new entries.
  - One more line joins the one-reader-per-render block (`:248-252`): `const resultsView = tab === "results" ? await houseResultsForConsole(session?.userId ?? null, "/admin/desk") : null;`, and `view` gains `?? resultsView`.
  - The panel is written in the shipped idiom `{tab === "results" && (<>`, because `test:tab-anchors` and the served probe (`house-bot-console-probe.mts:423`) discover panels by that exact text. The panel renders no `id=`, so it adds no anchor subject.

**Knock-on effects:**
- **1.312** (`house-bot-console-cases.mts:7285-7303`) is re-pinned to five keys in rail order. Its control ("each of the four panels") becomes five. It is replaced, not relaxed.
- **1.302** gains a case: `?tab=results` resolves to itself.
- **Three declared anchors whose `from` is the four-key literal must be RE-AIMED, not deleted.** Otherwise `test:red-anchors` §3 reports them STALE. Each `from` becomes the five-key literal:

| Anchor | Where | New `to` |
|---|---|---|
| `312-rail` | `anchors.mjs:751-752` | adds a sixth key, `"money"` |
| `320-tab-key-gone` | `:2331-2332` | drops `"activity"` |
| `312-rail-order` | `:2861-2862` | swaps limits and activity |

**No action needed:**
- Comms 7.2c/7.2d derive `landingOnly` from the two lists (`house-bot-comms-cases.mts:341-351`), so `results` becomes one more landing-only key both probes already handle.
- `qa:house-bots-visual` reads its routes from `CONSOLE_TABS` (`qa-house-bots-visual.mjs:64-83`) and picks up the tab automatically.
- The loader mirrors the default (roster) tab (`loading.tsx:7`) and does not change.
- The metadata stays "Admin · Desk".

**How it stays distinct from `/admin/house`, the platform's own book:**

| | `/admin/house` | The desk's Results tab |
|---|---|---|
| Question | what 50pick holds and earned as operator (`src/app/admin/house/page.tsx:1-4`) | what the desk's own stakes won or lost |
| Source | `LedgerEntry` through `house-ledger.ts` / `src/lib/house-book.ts` | the marked positions and transactions, through `book.ts` |
| Audience | the accounting domain (`roles.ts:245`) | Owner only (`roles.ts:345`, plus the gate's own constant) |

The separation is enforced four ways:
- **(a) A route belt.** `houseConsoleAudience` answers any non-desk `/admin` route by that route's own domain (`house-console-read.ts:129-140`). A results reader called with `"/admin/house"` would therefore admit FINANCE or AUDITOR. The new reader refuses any `route !== CONSOLE_ROUTE` before any read.
- **(b) No shared code.** Neither side imports or names the other (1.437l).
- **(c) Never combined.** The two figures are never added or netted: a desk payout is already after the fee that the operator book records.
- **(d) Different vocabulary.** The tab never says "house" (`house-bot-vocabulary.mjs:190-195`), and it does not borrow `/admin/house`'s signed "+TZS" grammar or its window labels.

---

## 3 · The reader, and ONE arithmetic with `book.ts`

The reader is **`houseResultsForConsole(viewerUserId, route)`** in `src/lib/server/house-console-read.ts`. It is placed after `houseUsageForConsole` (`:1662`), outside `readDeskCore`'s pinned slice (`console-cases:6983-6995`). Its arity is 2, like `houseRosterForConsole` (`:1174`). It joins `CONSOLE_GATES` (`house-bot-reports-cases.mts:2244`) as `houseResultsForConsole: 2`, with its measured call count; 0.512 compares the table with the module's exports (`:2505`).

**What the reader does, in order:**
1. `if (route !== CONSOLE_ROUTE) return null` (the belt), then `houseConsoleAudience` (`:129-141`). A refused viewer causes zero store calls and gets an empty payload (259).
2. It reads ONE `readDeskCore` set (`:913-975`), with:
   `extraA = (dayKey) => Promise.allSettled(priorEatDays(dayKey, 6).map((k) => houseDayBooks(k)))`.
   - The inner `allSettled` never rejects, so each earlier day fails on its own (355).
   - 1.355's `await Promise.allSettled([` / no-`Promise.all(` pin is unchanged (`console-cases:6975`).
3. **Today is `core.dayBooks`**: the SAME map, from the same read, that the band, the roster and the Limits settled row use in that render (`:927`, `:1040-1041`, `:1701`). It is never read a second time, because two reads of one question can disagree inside a render (346, 433(d)).
4. **The earlier day keys** come from a new pure helper, `priorEatDays(dayKey, n)`, in `src/lib/house-bot/clock.ts`. That module already re-exports the eat-day arithmetic (`clock.ts:24-26`). The helper does calendar arithmetic on the render's KEY, never on an instant.
   - ⛔ This is deliberate. **1.348 pins exactly two `eatDayKey(` calls in the gate module, with arguments `Date.now()` and `nowMs`** (`console-cases:2127-2137`). Deriving the keys inside the reader, as two drafts proposed, would turn it red.
   - It would also be a second derivation inside one render, which 348 forbids. Keys derived from the render's own key are not.
5. **The figure has one sign, in one helper:** `settledResultOf(b) = −b.realisedLossTzs`.
   - It never reads `returnedTzs`, `netTzs` or `houseBotBook` (1.371's grep stays green: `console-cases:7059-7094`).
   - The desk's figure for a day is Σ over that day's map, the band's own idiom (`sumDay`, `:1165-1167`, over the MAP, 432(l)). By linearity of `foldDayBook` this equals `houseDayBook(day, null)`, the stop's own read. That equality is **asserted, not assumed** (1.437b).
   - An account's 7-day figure is Σ of its seven days, and unreadable if any day failed.
6. **Labels come from the roster read** (`core.roster`).
   - Accounts in a day's map that are not on the roster have left the desk. They fold into ONE row, labelled with a new plural word in `CONSOLE_ACCOUNT_WORD` (`:6065-6072`): **"Accounts no longer on the desk"**. The M6 collision check then covers it. They stay in every total.
   - A failed roster read blanks the By-account card (`AdminLoadError what="the accounts"`) and leaves By day standing (355).
7. **It returns painted strings only** (372(b)): day text, result word and figure halves, stakes text, state text, account label and href (built with `consoleBotHref` as the roster does). There are no field ids and no raw numbers the page could re-format.

**What is not touched:**
- No new DAL member: `dal-parity` and C7 350 are untouched.
- No new `book.ts` export: 305 and 371 are untouched.
- No SQL, and no `db.txn`/`db.position` read (349).
- `book.ts` changes only in its header docblock.

**Cost of a render:** seven `dayRows` statements (one of them the core's own) and nothing else. Each statement is its own snapshot. That is correct here, because every stake belongs to exactly one day. **Nothing subtracts across two reads.** Plan 3's "earlier days still running = exposure − Σ open" is rejected for that reason.

---

## 4 · The amendment, and everything it amends

It is ONE dated owner entry at the head of `docs/COMPLIANCE-DECISIONS.md`, in the style of the 2026-09-25 D3 entry (`:53-94`): his words, what he was shown, the alternative, **Permitted by ROLE**, **Still forbidden**, **What the figure is**. Every other text gets an in-place pointer that cites it. The build ruling is **C7 437**, the next free number (`C7-SPEC.md:1989`); 461 is updated to say the next one is 438. No replan ruling is allocated; the highest replan ruling is 556 at `C5-D20-REPLAN.md:1662`.

The full text is in the `amendment_text` field and is reproduced in §4.3.

### 4.1 Amended (each marked in place)

| Text | Where | Change |
|---|---|---|
| D20b | `COMPLIANCE-DECISIONS.md:635` | Pointer: one owner-only view; every other tool stays struck; D20a untouched |
| D20b | `PROGRESS.md:56` | Same pointer |
| Commit 7 bullet | `PROGRESS.md:685` ("no results or P&L report") | Pointer |
| Replan 266 | `C5-D20-REPLAN.md:128-131` | One exception by role; Book card, "Today's net", fee withheld and money-tab chip stay struck |
| Replan §4 Commit 7 default | `C5-D20-REPLAN.md:107-109` | "…except ONE results view on the desk" |
| C7 303 | `C7-SPEC.md:119-134` | **Decision stands** (no results tile, ever); Why only |
| C7 305 | `:149` | Title narrowed; book-read list and pin unchanged |
| C7 312 | `:244` | Five tabs, results last, no badge |
| C7 360 | `:689-699` | Adds role **E**; records `Left today` (373(d)) and the D3 balance bracket (role BAL), which were never added to the closed set |
| C7 361 | `:701-707` | Pointer only; banned list unchanged; 1.361's scan widened |
| C7 366 | `:747-755` | Writes down the 2026-09-23 ruling at **both** sites (`house-console-read.ts:1701` and `:5509`, both through `usageRow` `:1606-1628`). The ruling text at `:749` still says "clamped" |
| C7 372 | `:807-813` | Role E's reader, with its belt |
| C7 374 | `:829-837` | Role E's canary; `MUST_CARRY` |
| C7 408 | `:1097-1103` | Exception for the results view |
| C7 453 | `:1963-1973` | Lexicon additions |
| C7 459 | `:1985` | "266 holds with NO exception" overtaken three times, said so |
| C7 461 | `:1989` | Next ruling 438 |
| C7 437 | new, before §7 at `:1945` | The build ruling |
| `docs/HOUSE-BOTS.md` | `:964` | "There is no house report" stays true; add that the view is not a report |
| `docs/HOUSE-BOTS.md` | `:998` | Stale: "`houseBotBook` … Commit 7's rulings give it one or delete it" (371 deleted it) |
| Source docblocks | `desk/page.tsx:22-27`; `house-console-read.ts:13-15`, `:17-22` and `:1580` ("The DISPLAY is clamped at zero", false since `735712b0`); `book.ts:21-29` | A false authority is what survives a sweep |

### 4.2 Not amended (named so no one reads them as silently overridden)

- **Compliance log:** D19 (all of it), D20a, D20c, D20d, D3 and its 2026-09-25 amendment, D6, D14.
- **Replan:** 183 (the fee derivation stays un-built), 265 and 267 (the staff scorecard stays struck).
- **C7 rulings:**
  - 347 and 348. Today is the core's one read, and the key is derived once.
  - 349 and 350. There is no ledger read and no new DAL member.
  - 365 and 368.
  - 369, including 369(a): `formatTzsSigned` stays banned under the section.
  - 371.
  - 373(g). There is still no P&L column on the activity row.
  - 375.
  - 404 and 406.
  - 456.
- `03-design-spec.md:259` and `PLAN.md:440`: the Book card stays struck.

### 4.3 The text

The text below is identical to `amendment_text`.

**1 · The head entry in `docs/COMPLIANCE-DECISIONS.md`.** It goes above the 2026-09-25 entry at `:9`, and is committed only after Ali answers.

> ## <DATE> · D20b AMENDED — the desk may show what its own finished stakes won or lost, on ONE owner-only view
>
> **Owner decision (Ali, <DATE>), asked explicitly.** *"<Ali's own words, verbatim, from the message in which he approves this entry>"*
>
> He asked to see the profit and loss of the accounts the desk stakes from. He was shown:
> - that five texts forbid it in terms:
>   - D20b ("no house lines on admin screens");
>   - replan 266 ("money only as usage against a configured limit", striking "Today's net" and the "Book" card);
>   - the replan's §4 Commit 7 default ("no results/P&L report … in the console beyond what a control needs");
>   - C7 360 ("Struck … any net, profit, return, won/lost … any signed money");
>   - C7 408 ("NO console surface renders a sum, total row, net … P&L").
> - that a ± figure on the activity row would amend those texts one column at a time. He declined that on 2026-09-25 (`8018653b`, `3859118f`), and that refusal stands.
> - the alternative that needs no amendment: today's desk-wide figure, which the Limits tab's settled row has stated since his 2026-09-23 ruling.
>
> He chose one view, built once, under this one amendment.
>
> ⛔ **THE AMENDMENT IS NARROW, AND THE NARROWNESS IS THE POINT.** D20's reasoning is not withdrawn.
> - A desk account is still an ordinary player in every report, statutory figure, admin count and detector (D20a, word for word).
> - Every other admin-only tool that D20b lists stays struck.
>
> One thing changes. The owner has judged that the person who funds the desk needs to see whether its stakes win or lose money, on the one owner-only surface that already controls them. He has accepted that trade knowingly.
>
> **Permitted, from this date, written by ROLE.** The desk's RESULT: for the stakes the desk placed, the money each FINISHED stake brought back to its account, less that stake. It is:
> - totalled per EAT day of placement, for all accounts together and for each account, over a fixed window of the last [7] EAT days (today included);
> - shown beside how many stakes were placed and whether any are still running;
> - written in words ("Profit TZS X", "Loss TZS X", "Even"), never as a signed amount;
> - shown on ONE owner-only view of `/admin/desk` (behind `houseConsoleAudience`), read only through the gated console reader, and nowhere else.
>
> The view's current form is the desk's Results tab. The permission names the ROLE, not the tab, so a rename cannot leave it permitting something that no longer exists (the 2026-09-25 D3 lesson).
>
> **Recorded here, because it was never written down.** Ali's 2026-09-23 ruling: the SETTLED daily-loss row states a profit as `ahead by X · limit Y` (`735712b0`), on the Limits tab and on each account's overview. It is the same figure, for today, against the same limit. This entry covers it by role and does not widen it.
>
> **Still forbidden, and the guards stay pointed at all of it:**
> - any REPORT or record (the Board pack, FIU SAR, match integrity, daily ops, finance, insights, analytics, the harm and AML detectors, the ISO 27001 export, the reports catalogue; D20a unchanged);
> - any EXPORT: CSV, print view, PDF or download (D14 and D20b's per-account CSV);
> - any bell, email, digest or alert that carries the figure or links to the view;
> - `/admin/house`: no line of this figure, and no read in either direction;
> - any split by stake type, entry mode or who chose the stake. That is the entry split and staff scorecard D20 struck (C7 349; replan 265, 267).
> - per-market, per-counterparty-player or per-officer money (C7 365);
> - a lifetime, month-to-date or wider window; fee withheld; a "net to 50pick" figure (replan 183 stays un-built); any "Book" card;
> - the figure anywhere else on the console: the band (C7 303), the roster, the activity row (the chip stays a word), the Limits tab beyond the 2026-09-23 settled rows, or any account's page;
> - any statement of what is owed to or settled with a holder (C7 375, 457);
> - the holder's balance beyond the 2026-09-25 D3 amendment;
> - every player-reachable surface and the holder, without exception (D19, untouched);
> - any house word on the view (C7 453).
>
> ⚠️ **WHAT THE FIGURE IS.** Per stake:
> - A win counts its payout less its stake. The payout is already after the platform's fee.
> - A loss counts minus its stake. A loss writes no ledger row; the outcome is read from the position.
> - A refund counts nothing.
> - A stake still running counts nothing until it finishes, and its day says so.
>
> Which day:
> - A stake belongs to the EAT day it was PLACED, so a day's figure can move after midnight.
> - A past line may differ from the figure a loss limit acted on at the time, because that figure is not kept.
>
> Where the number comes from:
> - It is the day book's own settled figure with the sign turned (`book.ts`: minus `realisedLossTzs`), the function the daily loss limit's settled row and both automatic loss stops act on.
> - A manual adjustment to a holder's wallet is not counted.
>
> ⚠️ **AND IT IS NOT THE PLATFORM'S WHOLE RESULT.** The platform's fee on those pools is ordinary commission on `/admin/house`, counted there as player activity (D20a). The two are never added together or netted against each other.
>
> **Amends** (each marked in place): D20b (here and in `PROGRESS.md`); replan 266 and §4's Commit 7 default; C7 303 (Why only), 305 (title), 312, 360, 361 (pointer), 366, 372, 374, 408, 453, 459 and 461; and new C7 437.
>
> **Does not amend:** D19, D20a, D20c, D20d, D3 and its 2026-09-25 amendment, D6, D14; replan 183, 265, 267; C7 347, 348, 349, 350, 365, 368, 369, 371, 373(g), 375, 404, 406, 456.
>
> **Enforced by:** `test:house-bot-console` 1.437 and 1.360 (memory and Postgres), with declared mutations in `red:house-bot-console`; and `qa:house-bot-console-probe`'s result canary.

**2 · The in-place pointers.**
- **D20b row (`:635`), `PROGRESS.md:56`:** "⚠️ AMENDED <DATE> (owner): the desk may show what its own finished stakes won or lost, on ONE owner-only view. See the dated entry at the head of the log. Every other tool in this row stays struck, and D20a is untouched."
- **`PROGRESS.md:685`:** "⚠️ AMENDED <DATE>: one results view on the desk. It is not a report and has no CSV (C7 437)."
- **Replan 266:** "⚠️ AMENDED <DATE> (owner): ONE exception by role. The desk's results view may state what its finished stakes came to (C7 360(E), 437). The Book card, 'Today's net', fee withheld and the money-tab chip stay struck."
- **Replan §4 default:** "⚠️ AMENDED <DATE> (owner): except ONE results view on the desk. It is owner-only and not a report, with no CSV, no export and no per-market line."
- **C7 303:** "Decision unchanged: no results tile, ever (406). AMENDED <DATE>, Why only: 'how did we do' is answered on the results view (360(E)), never in the band."
- **C7 305:** its title becomes "No results figure is read anywhere on the console except the results view, through the gate (437)". The pin is unchanged.
- **C7 312:** "⚠️ AMENDED <DATE> (437): FIVE tabs, with `results` appended LAST, after the four control tabs. It has no badge."
- **C7 360:** adds "**(E)** the desk's result on the results view ONLY (the grammar and window above). Everything struck stays struck elsewhere, and on that view too except the result itself." It also records `Left today` (373(d), 2026-09-24, a form of role B) and the Opening/Closing balance bracket (D3 2026-09-25, role BAL), so that 1.360 is built against A–E plus BAL.
- **C7 361:** "Role E is `formatTzs` of the magnitude beside a word. The banned list is unchanged, and 1.361's scan is widened to the whole section."
- **C7 366:** "AMENDED 2026-09-23 (owner), written down <DATE>: the SETTLED row states `ahead by X · limit Y` on the Limits tab and on each account's overview. The projected row, the roster and the band keep the clamp."
- **C7 372:** "Role E is produced by `houseResultsForConsole(viewerUserId, route)`, in `CONSOLE_GATES`. It refuses any route but the desk's own before the audience question. A failed day read is 'couldn't read — this is not zero'."
- **C7 374:** "Role E's canary is a LOST stake of a unique amount, alone on its day, shown absent first. `/admin/desk?tab=results` joins `MUST_CARRY`."
- **C7 408:** "Except the results view (360(E)): per-day and per-account sums of the day book's settled figure, in words. Lifetime, fee withheld, a per-market line and CSV stay struck everywhere."
- **C7 453:** adds Results / result / Profit / Loss / Even / Nothing settled / Still running / Final / No stakes / Accounts no longer on the desk.
- **C7 459:** "Overtaken three times by the owner: 2026-09-23, 2026-09-25 (D3) and <DATE>. The wizard still paints a funded STATE."
- **C7 461:** "437 is spent; the next ruling is 438."
- **New C7 437:**
  - (a) the tab;
  - (b) the reader and its belt;
  - (c) `priorEatDays` on the render's key;
  - (d) `settledResultOf = −realisedLossTzs`, with desk = Σ map and account = Σ days;
  - (e) words, not signs;
  - (f) the gone-accounts row;
  - (g) painted strings only;
  - **Proof:** §7 of this plan.

---

## 5 · What stays forbidden

- **Reports and outputs.** Any report or record, and any export: CSV, print, PDF or download. Any bell, email, digest or alert carrying the figure. No alert may link to `?tab=results`, and comms 7.2c would NOT catch one, because the panel exists, so 1.437l does.
- **`/admin/house`.** Any line or read between the desk's figure and it.
- **A split by stake type (Opening/Responding/Filling/Manual), entry mode or who chose the stake.** This is the struck entry split and staff-edge scorecard:
  - C7 349 (`C7-SPEC.md:593`): no "staff-edge, scorecard, entry-split" read;
  - replan 265 (`C5-D20-REPLAN.md:123`) and 267 (`:133`);
  - D20b's "no staff-edge alert".
  On a one-owner platform a "Manual" line is also a per-officer figure (365).
- **Money figures:**
  - per-market, per-counterparty-player or per-officer money (365);
  - a lifetime or month figure, fee withheld, a "net to 50pick" figure, or a Book card;
  - the struck names `houseBotBook`, `HouseBotBook`, `netTzs`, `feeWithheldTzs`, `byEntry`, `feeInputs` and `houseStaffScorecard` (1.371).
- **The result anywhere else on the console:**
  - a result tile in the band, which renders on every tab (303, 406);
  - a result on the roster;
  - a result on the activity row (`8018653b`, `3859118f`);
  - a result on an account's page (1.408, `console-cases:3183-3184`, stays the guard there);
  - on the Limits tab, anything beyond the two 2026-09-23 settled rows.
- **Holder figures.** Any holder-settlement or "owed" framing (375, 457), and the holder's balance anywhere new.
- **Signed money.** No signed formatter (`formatTzsSigned`, `formatTzsAbs`, `formatWhole`, local `toLocaleString`), and no hand-prefixed "+" (a hand-typed "+" would evade 1.361's name check, `console-cases:7699`).
- **Every player-reachable surface** (D19).

---

## 6 · D19 and lexicon constraints

**No new `"use client"` file.**
- The panel is server-rendered in `page.tsx`.
- The client `Tabs` receives only the label "Results" and the href.
- The reader, its types and `priorEatDays` are server/pure. `clock.ts` is already client-safe and imports nothing house-side (`clock.ts:20-22`).
- `verify:house-bot-bundle` must stay at 0 hits.

**Words, fixed now so nothing is invented at build time.** None of them matches `consoleNeutralRegExp` (`house-bot-vocabulary.mjs:190-200`).

| Element | Words |
|---|---|
| Tab | **Results** |
| Cards | **By day**, **By account** |
| Headers | **Day (EAT)**, **Result**, **Stakes placed**, **State**, **Account**, **Today**, **Last 7 days** |
| Results | **Profit TZS X**, **Loss TZS X**, **Even**, **Nothing settled**, **No stakes**, `couldn't read — this is not zero` |
| States | **Still running**, **Final**, **No stakes** |
| Gone accounts | **Accounts no longer on the desk** |

**The guidance line** (`TAB_GUIDANCE.results`): *"What the desk's finished stakes came to, by the EAT day each was placed: money back less money staked, after the platform's fee. A refunded stake counts as nothing."*

**The note under By day:** *"A day with stakes still running can still change, so a past day may differ from the figure a loss limit acted on at the time. The Loss today tile above counts running stakes as lost; this tab counts only finished ones."*
- This fixes the same-word problem the correctness review found: the band's "Loss today" is PROJECTED and clamped at 0 (`house-console-read.ts:1041`).

**Never used:** bot(s), house, counter*, counterparty, liquidity, "P&L of…", "our own stakes". No `data-house-*` hooks.

**Operator data.** Account labels keep `data-operator-text="label"` (474). The holder appears only as a handle, never by name, phone or email.

**Colour and figures.**
- No colour carries the sign (§A4). A profit is not green and a loss is not red, and a loss is stated calmly.
- No gold (1.306), no claret.
- Every figure sits in `.amount` inside `td.tabular` (401/407).

---

## 7 · Tests

Every assertion has a control, and every fix has a declared mutation in `scripts/anchors/house-bot-console.anchors.mjs`.

⛔ **The fixture rule comes first.**
- `world.setPositionStatus` changes status and writes NO money (`house-bot-world.mts:201-208`), so a status-flipped WIN reads as a loss. This is the class of the 2026-09-26 Opening/Closing defect (`5f1737af`).
- Every money case settles for real with `w.svc.resolveMarket` + `settleMarket`, on markets with a real player on the other side and a non-zero fee, as `house-bot-money-cases.mts:473-474` and `:511-512` do.
- A LOSS is the one outcome a status flip reproduces faithfully, because a real loss writes nothing either. That is allowed only for the probe canary.

**The fixture, on both stores** (Postgres dates bound as ISO `::timestamp`, as `dayRows` does):
- **Today:**
  - Account **A** WINs 10,000 against a player's 20,000 (profit, fee > 0).
  - Account **B** LOSES 30,000.
  - Account **C** LOSES 4,000, and C is then REMOVED.
  - A 5,000 is really VOIDed.
  - B 3,000 stays OPEN.
  - Result: the desk is in LOSS today, A is in profit and B is in loss, so a sign flip is visible on every side.
- **Yesterday:** an A stake backdated to 23:59:30 EAT (`w.backdate`, `house-bot-world.mts:211`) and settled today as a real loss.
- **Day −2:** only a real VOID, giving a real `−0`, which must read "Even".
- **Day −3:** only an OPEN stake, which must read "Nothing settled".
- **Day −4:** empty, which must read "No stakes".

### 7.1 New cases (C7 437), memory and Postgres

| Case | Asserts | Control |
|---|---|---|
| **1.437a · audience** | A player, the holder, a trigger player, a non-owner staff role and a signed-out viewer get `null` with ZERO store calls (spy). An ADMIN on `/admin/house` gets `null` (the belt). | The same ADMIN on `/admin/desk` gets rows |
| **1.437b · one arithmetic** | Today's desk result equals all four of: −`houseDayBook(today, null).realisedLossTzs` (the stop's read); Σ of the account rows; −(the Limits settled row's `usedTzs`); and an INDEPENDENT ledger walk (Σ CONFIRMED payout+refund amounts on the fixture's positionIds − Σ settled stakes). Each account's Today equals −(its overview settled row's `usedTzs`). With `gCapDailyLossTzs` equal to today's desk loss, `lossStops` switches the desk OFF with GLOBAL_LOSS_STOP. | cap + 1 leaves it ON. The desk result is non-zero with mixed signs. The fee is > 0 and A's payout < 30,000. A status-flipped WIN gives a different result |
| **1.437c · outcomes and words** | VOID gives 0; LOSS gives −stake; OPEN is excluded and sets "Still running"; day −2 reads "Even" (a real −0); day −3 reads "Nothing settled"; day −4 reads "No stakes" | A genuinely level settled day is not "Nothing settled"; a profit day is not "Even" |
| **1.437d · cohort** | The 23:59:30 stake counts on yesterday's row, although its money is dated today | Today's row does not carry it |
| **1.437e · window and day** | Exactly 7 keys, the newest equal to the shell's `dayKey`. `priorEatDays` crosses month and year boundaries correctly. At 20:59:59.999Z, 21:00:00.000Z and 00:00Z, `resolveRange({range:"today"}).start === eatDayStartMs(eatDayKey(now))`. A source pin requires the reader to call `priorEatDays(core.dayKey, 6)` / its `dayKey` argument, never an instant. | A UTC-day key (`toISOString().slice(0,10)`) disagrees at 21:30Z; an 8-key window is reported |
| **1.437f · one read per day** | A spy counts exactly 7 `dayRows` per render, today's window exactly once | A planted second read of today is reported (433(d)) |
| **1.437g · failure** | `dayRows` rejects for day −2 only. That row and every 7-day total spanning it read `couldn't read — this is not zero`; the other rows are real. | The failed row is not blank, not "Even" and not "No stakes" |
| **1.437h · removed** | C's stakes are in every desk total and in the "Accounts no longer on the desk" row; Σ of the account rows equals Σ of the day rows | A fold over `listNonRemoved` differs |
| **1.437i · grammar** | Every result cell matches `^(Profit\|Loss) TZS [\d,]+$\|^Even$\|^Nothing settled$\|^No stakes$\|^—$\|^couldn't read — this is not zero$`. A non-integer is refused. | `+TZS 1,000`, `−TZS 1,000`, `TZS 0` and `Net TZS 5` are each reported |
| **1.437j · containment** | The roster, feed, limits, history and detail view models on the same fixture carry no `(Profit\|Loss) TZS` string; the results view does | "Profit TZS 1" planted in a feed row is reported |
| **1.437k · lexicon** | The results view model and `panelOf("results")` pass `consoleNeutralRegExp` (4.453 also walks it) | "Bot results" is reported |
| **1.437l · no channel** | No `tab=results` in `alert-copy.ts`, notifications or the reports catalogue. The page is the reader's ONLY caller. No file under `src/app/admin/house/**`, `house-ledger.ts` or `src/lib/house-book.ts` names it, and the reverse holds too. | Each is planted and reported |
| **1.437m · register** | `COMPLIANCE-DECISIONS.md` carries the entry heading, its by-role "Permitted" sentence and D20b's pointer, and `C7-SPEC.md` carries 360's role (E). Precedent: `test:house-bot-disclosure` already pins the log (d.1–d.5, `house-bot-absence-cases.mts:472-529`, run from `house-bot-disclosure.test.mts:55`). No script pins D20b or 266 today. | A copy with the sentence removed is reported |
| **1.437n · layout (source)** | In both tables the first `.amount` sits in the second wide cell; neither table has a `min-w-*`; the empty row's `colSpan` equals the header count; each below-`sm` second line is the same view-model field as its wide cell | Moving money to the third column is reported |

### 7.2 Existing guards, taught or built

| Guard | Change |
|---|---|
| **1.360** | **BUILT HERE.** Specified at `C7-SPEC.md:699` but never written: `grep` finds only the comment at `console-cases:5018`. It walks `src/app/admin/desk/**` for `formatTzs`, `.amount`, `Tzs` props and money attributes against a per-site role allowlist (A–E plus BAL), with E = `panelOf("results")` only, and fails on an empty population. Controls: a planted `formatTzs(result)` on the roster, and a console-written money `title`. Without it, role E is a line in a list nothing enforces. |
| **1.361** | The banned list is unchanged. Its scan widens from `pageCode + gateCode` (`console-cases:7698-7701`) to the whole section. Today `[id]/page.tsx` is scanned only by 1.369, and only for `formatTzsSigned` (`:4595-4599`). |
| **1.312 / 1.302** | Five keys, rail order, controls kept (§2) |
| **1.306** | The spy (`console-cases:1768-1810`) adds the results reader: one control read per render |
| **0.260.1 / 0.512** | `CONSOLE_GATES += houseResultsForConsole: 2`, with its measured count; no floor lowered |
| **Probe (374)** | A new `CANARY.dayLoss`. It is a LOST stake of a unique amount, flipped to LOSS (faithful for a loss), backdated alone onto day −2, and first shown ABSENT. `0.canary` goes from 12 to 14 forms (`probe:63-71`, `:527`). `/admin/desk?tab=results` joins `MUST_CARRY` (`:856-860`). Otherwise the instance prints NOT MEASURED. |
| **Visual seed** | `scripts/seed-house-bot-panels-local.mts` settles nothing today (0 resolve/settle calls). It must place and REALLY settle stakes across at least 2 EAT days and 2 accounts, or the 360 read shows an empty state and proves nothing. |
| **Unchanged, must stay green** | 1.303, 1.305/1.349/1.371, 1.347·432(q), 1.348, 1.355, 1.366, 1.369, 1.408, 4.453, `test:house-bot-disclosure`, `verify:house-bot-bundle`, `test:tab-anchors`, comms 7.2c/7.2d |

### 7.3 Declared mutations (each must fail ITS OWN assertion)

| Name | Mutation | Must fail |
|---|---|---|
| `437-sign` | `-b.realisedLossTzs` → `b.realisedLossTzs` | 1.437b |
| `437-projected` | `realisedLossTzs` → `projectedLossTzs` | 1.437c |
| `437-stake-only` | result from `-settledStakeTzs` | 1.437b |
| `437-second-today` | today from `houseDayBooks(core.dayKey)` instead of `core.dayBooks` | 1.437f |
| `437-audience` | audience check removed | 1.437a |
| `437-route-belt` | route belt removed | 1.437a |
| `437-fail-as-empty` | a rejected day becomes an empty map | 1.437g |
| `437-partial-total` | 7-day total summed over the readable days only | 1.437g |
| `437-roster-fold` | per-account fold over the roster, not the map | 1.437h |
| `437-window-8` | `priorEatDays(dayKey, 6)` → `7` | 1.437e |
| `437-days-from-clock` | `priorEatDays` fed `Date.now()` instead of the key | 1.437e |
| `437-zero-is-profit` | `r > 0` → `r >= 0` | 1.437c |
| `437-open-is-even` | "Nothing settled" branch removed | 1.437c |
| `437-signed-formatter` | `formatTzsSigned` in the words builder | 1.361 (widened), 1.369 |
| `437-leak-activity` | result words in the feed view model | 1.437j |
| `437-label` | `"Results"` → `"Bot results"` | 1.437k |
| `437-alert-link` | `href: CONSOLE_LIMITS_HREF,` (`alert-copy.ts:351`) → `?tab=results` | 1.437l |
| `437-register` | the by-role sentence deleted from `COMPLIANCE-DECISIONS.md` | 1.437m |
| `360-result-in-roster` | a result cell pasted into the roster panel | 1.360 |

Also: the three re-aimed tab-literal anchors (§2). Each `expect` label is copied from a green run's printed output, never typed (the file's own convention).

### 7.4 Run at close

Run one at a time, through `~/heavy-node-lock.sh`, in the red tree `C:/kipindi-hb-red` for red drives (`RESUME-HERE.md:125`). Never run through a pipe.
- tsc;
- `test:house-bot-console` on memory and Postgres, with floors raised to the printed counts;
- `test:house-bot-reports`, `test:house-bot-comms`, `test:house-bot-disclosure` and `test:house-bot-surfaces`. If surfaces is red, compare it against clean `main` first.
- `verify:house-bot-bundle`, `test:tab-anchors` and `test:red-anchors`. Every `from` must resolve exactly once.
- `red:house-bot-console`, with the 19 new mutations and the 3 re-aimed ones;
- `qa:house-bot-console-probe`;
- `qa:house-bots-visual` at six widths, plus viewport tiles read by eye at 360 and 1280 on a served build via `localhost`.

---

## 8 · Layout: phone at 360, and the width tiers

**Width tiers, re-derived.** The tokens are console **1600**, board **1280** (not 1480), reading **1080** and form **640** (`src/app/globals.css:4848-4851`). The desk renders in the console column (`admin/layout.tsx:217`).

**Wide layout (1280, ≈998px strip, C7 373(e)):**
- The two cards sit side by side from `lg`. Their pair is capped at the reading tier (`max-w-reading`, `tailwind.config.ts:400`) so figures do not drift from their labels at 1600. If `test:measure` refuses a tier class there, drop the cap.
- Each table is `AdminCard padding="p-0"` › `ScrollX` › `table.admin-tbl` (407).
- Money is the SECOND column: **Day (EAT) · Result · Stakes placed · State** and **Account · Today · Last 7 days**.
- There is no `min-w-*` on either table. The Account header keeps the roster's measured floor (`page.tsx:694`).
- At ≈490px per card everything is in view, with no sideways scroll.

**Phone (360, ≈339px strip, ≈318 inside card padding, `c7c4aefe`):**
- A result cell is two `whitespace-nowrap` halves with a breakable space between them ("Loss" · "TZS 12,600"), the `usageRow` halves idiom (`house-console-read.ts:1606-1628`). Its widest unbreakable unit is the figure alone.
- Below `sm`, **By day**'s State folds under Day as a second line, and **By account**'s "Last 7 days" folds under Today. It is one view model with two layouts (the `c7c4aefe` precedent), so the two shapes cannot drift.
- The rail's five tabs scroll, and the kit centres the active tab. This is measured on a served build.
- `qa-house-bots-visual.mjs` §5.2's stacked branch applies: EVERY money atom must be inside the strip, with no sideways scroll at all.
- The gutters follow the activity table's existing below-`sm` treatment (373(e)); nothing new is added.
- Tiles are read at 360 and 1280 before anything is called done.

---

## 9 · The smallest first cut worth shipping

**One commit**, after Ali's answers:
1. The amendment entry and every pointer in §4.
2. `priorEatDays` in `clock.ts`.
3. `houseResultsForConsole`, `settledResultOf` and the words builder, plus the plural gone-accounts word.
4. The `results` key, label, guidance, the panel with its two tables and the note.
5. Cases 1.437a–n; 1.360 built; 1.361 widened; 1.312/1.302/1.306/0.260.1 taught.
6. The 19 mutations and the 3 re-aimed anchors.
7. The probe canary and `MUST_CARRY`; the visual seed settling for real.
8. Docs in the same pass: `docs/HOUSE-BOTS.md` §12.6 (the verification record) plus the `:964`/`:998` fixes, `RESUME-HERE.md` and the `PROGRESS.md` status rows.

Then **push, confirm the deploy's `dpl=` sha on production, and read the live tab at 360 and 1280.**

**Not in the first cut:**
- product split;
- outcome counts and refund causes;
- the amount still running;
- 30 days;
- an account-page tab;
- a render-time reconciliation check. That check would need a new DAL member and a C7 350 amendment, and marker drift is already measured by `ops:house-bots-status --drift` (`scripts/ops-house-bots-status.mts:294-308`).

**If even this is too much,** the fallback is **By day alone**. It keeps the reader, the amendment and all the guards, and drops the By-account card.

**Risks carried knowingly:**
- **Screenshots.** This is the most sensitive screenshot the desk can produce (neutral words, owner-only, the canary proves the gate).
- **Days that move.** A past day moves until it is Final (the note says so).
- **Holders who are also admins.** A holder who is also an ADMIN sees their own account's line (X13 / C7 458, already accepted).

---

## 10 · What the three drafts and two critiques got wrong, re-verified against the code

1. **The branch moved.** `5f1737af` landed and HEAD is `6427ef64`, clean. "Build after the uncommitted fix" is stale; re-grep every anchor by text instead (460).
2. **Drafts 1 and 3 would have broken 1.348.** 1.348 caps `eatDayKey(` at two calls in the gate module (`console-cases:2127-2137`). Fixed here with `priorEatDays` in `clock.ts`.
3. **1.360 was never built** (only the comment at `console-cases:5018`). And **360's closed set was already exceeded twice without an amendment**: `Left today` (373(d)) and the D3 balance bracket (373(f)/(g)). Both are recorded now, and the walk is built.
4. **The 2026-09-23 "ahead by" profit row is at TWO sites** (`:1701` and `:5509`), not one. C7 366 (`:749`) still says "clamped", and the `usageRow` docblock (`:1580`) still says so too.
5. **Draft 2's shapes breach rulings it did not name.** Its stake-type split breaches 349/265/267/365. Its `outcomeRows` DAL member breaches 350/305. Its band override breaches 303/347/348. Its hand-prefixed "+" evades 1.361. Its "All time"/"Month to date" windows are the struck lifetime and month figures. All were dropped.
6. **Draft 3's `returnCheck` does not catch clock skew** (a window-level sum still balances), and its tab name "P&L" reads as `/admin/house`'s book. It is deferred as a separate step and named "Results".
7. **The compliance critique said `test:house-bot-disclosure` d.5 "does not exist". It does**, in `house-bot-absence-cases.mts:526`, run by `house-bot-disclosure.test.mts:55`. The true finding stands: no script pins D20b or 266.
8. **The fee rule.** The current fee is loser-share, 13% of the losing side, for both games (`payout.ts:17-31`). The capped formula commented at `market-service.ts:3790` is legacy. Either way the fee is netted.
9. **"Board 1480"** is 1280 in the tokens (`globals.css:4849`).
10. **Draft 2's line that "a void counts toward the daily bet limit"** is wrong for the bets-per-day cap, which is a rolling 24 hours on the database clock. No such sentence is used here.

---

## 11 · Choices for Ali

One line each; the recommended option is first.

1. Approve the one rule change as written (the Desk may show what its own finished stakes won or lost on one owner-only tab; everything else stays banned): **Yes** (recommended) / No, keep only today's "ahead by" line on the Limits tab.
2. Tab name: **"Results"** (recommended; "P&L" reads like 50pick's own profit, which is on the House page) / "P&L".
3. How far back: **the last 7 days, one line per day** (recommended) / the last 30 days / since the desk started (needs a wider rule change).
4. Whose results: **the whole desk by day, plus each account** (recommended) / the whole desk only.
5. How a result reads: **words, e.g. "Profit TZS 12,000" / "Loss TZS 8,000"** (recommended) / plus and minus signs.
6. Which day a stake counts on: **the day it was placed, the same day the daily loss limit counts it on** (recommended) / the day it finished.
7. Stakes still in play: **a "Still running" label on that day** (recommended) / also show how much is still running.
8. Split Polls from Up & Down: **not now** (recommended) / yes (a bigger build that changes the query the loss limits use).
9. Won / lost / refunded counts, and why stakes were refunded: **later, as a separate step** (recommended) / now.
10. Split results by stake type (Opening / Responding / Filling / Manual): **no, because that is the staff scorecard you struck on 17 Sep** (recommended) / yes, with its own rule change.
11. An automatic check that hides an account's figure when its records don't add up: **later, as a separate step** (recommended) / now.