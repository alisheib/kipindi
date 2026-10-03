# Government Tax Report — `/admin/tax`

> 🟢 **LAW for this report.** The owner's plan *"Government Tax Reporting System — Project Plan v1.0"*
> (03 Oct 2026, document owner: Business / Finance Owner) built into the console: **Report 1 — Total
> Reporting System** and **Report 2 — Taxation**, for any day, week, month or custom window, for all
> products or one, exported as PDF, Excel and CSV, and locked when Finance files it.
> Every figure on the page and in every export comes from ONE reader, `src/lib/server/tax-report-data.ts`.

## §0 · Status — read first

| | |
|---|---|
| Live | 🟢 **LIVE 2026-10-03, `d1b82f9a`** on https://50pick.tz/admin/tax (deploy read back from `?dpl=`; the export route answers an anonymous request with 401) |
| Page | `/admin/tax` — Money → **Tax report** in the sidebar |
| Who sees it | Owner (ADMIN), Finance, Compliance, Auditor — accounting VIEW (`roles.ts` `ROUTE_DOMAINS`) |
| Who locks a period | Finance or the Owner (accounting ACT). The Owner alone (the stored ADMIN role) reopens one, records new rates, or locks a period out of balance — including one product while the whole book behind it is out |
| Proof | `npm run test:tax-report` (engine + reader on real bets/settlements) · `npm run red:tax-report` (every declared mutation caught) |
| Owner ruling | 2026-10-03 — the plan's model was **made in coordination with the Gaming Board**: implement it exactly; no restriction of our own (`COMPLIANCE-DECISIONS.md` § "2026-10-03 · The Government Tax Report files the plan's model") |

## §1 · What the plan asks for

- **Report 1 — Total Reporting System:** Sales · Payout · On hold · Refunds, and the hard check
  *Payout + On hold + Refunds = Sales*. A check that does not balance **blocks sign-off** and raises an
  exception listing the offending records (plan FR-6).
- **Report 2 — Taxation:** Commission = **13% × Payout** · TRA = **10% × Commission** · GBT = **5% × Commission** ·
  Total tax = TRA + GBT. **Each line rounded to the nearest whole shilling, at each step** (plan §3.3).
- The plan's acceptance tests (§8): the worked example to the shilling; a 50,000 withdrawal changes nothing;
  a round resulted after the cut-off stays On hold for the closed period and reclassifies in the next.

## §2 · The lines, in plain words

| Line | What it is |
|---|---|
| **Sales** | Every stake placed in the period (plus any bonus-funded part of a stake — zero while the bonus wallet is withdrawn). |
| **Payout** | Winnings paid on rounds that resulted in the period. ⛔ Never a withdrawal (wallet movement), never a refund, never an early exit. |
| **On hold** | Stakes still waiting for a result at the period's cut-off — including bets placed earlier. |
| **Refunds** | Stakes returned in the period: one-sided bets, cancelled/voided rounds, players' early exits — each with its reason (§8). |
| **Platform fee kept** *(reconciling item)* | Our fee on each resulted round — a share of the losing side at the round's own frozen rate (an admin setting, `docs/RULES.md` §1; no document pins the number); an older round keeps the fee model it froze — plus any early-exit fee and the shilling of rounding a fractional fee leaves in the pool. |
| **On hold brought forward** *(reconciling item)* | Stakes placed before the period that were still waiting when it opened. |

### Why two reconciling items

The plan's rule is exact for a period that **opens with nothing on hold** and whose resulted pools go **wholly to the
winners** — its worked example is such a period, and the report reproduces it to the shilling. On 50pick neither is
ever true: a poll runs for days and a round straddles midnight, so every period opens holding earlier stakes (whose
results are this period's Payout — the plan's own acceptance test 3); and our fee comes out of the pool before the
winners are paid. Carried in its general form the rule is

> **Sales + On hold brought forward = Payout + Refunds + Platform fee kept + On hold**

which **is** the plan's rule whenever the two extra terms are zero. Without them every live period would fail its
check and sign-off would be blocked for ever. Report 1 prints the plan's four lines first, in the plan's order, then
the two reconciling items, then *Check: accounted total* and *Difference from Sales (must be 0)*.

## §3 · Where each figure comes from — three independent records

| Figure | Source |
|---|---|
| Sales · Payout · Refunds | The **money records** — CONFIRMED `Transaction` rows `BET_PLACED`, `BET_PAYOUT`, `BET_REFUND`, `CASHOUT` (what each wallet was actually debited and credited), by the record's own timestamp. Withdrawals, deposits, bonuses and adjustments are not read. |
| On hold · Brought forward | The **bets** (`Position`): a bet is on hold at instant T when `placedAt < T` and it had not left "open" at T (`status = OPEN`, or `settledAt` null or ≥ T). Every way a bet leaves open stamps `settledAt`. Read by `positionStore.listLiveDuring(start, end)` (both store twins). |
| Platform fee kept | Each resulted **round's own frozen rates**, through `chargedFee` — the very call settlement debits (pinned against real settlement by `test:charged-fee`). Kept = pool − floor(net pool): the booked fee floor(fee) plus the rounding. |

Because the three are independent, a check that does not close is a real disagreement in the books, and the report
says exactly where: the difference splits — **to the cent, by construction** — into one group per bet, one per
resulted round and one per money record whose bet cannot be found. Every non-zero group is an **exception**
(`EXCEPTION_LABEL` in `src/lib/tax-report.ts`), and the exceptions always add up to the difference
(`explainedCents`, shown on the page). `test:tax-report` §12 plants a payout with no bet and a short stake and proves the
list names both and adds up.

⛔ No house-bot filter, split or memo — a house stake is an ordinary stake in every report (rulings D20a/D21b).

## §4 · Tax

`taxOnPayout(payoutCents, rates)` in `src/lib/tax-report.ts`, in integer arithmetic (BigInt — a cents figure times a
basis-point rate passes 2^53 at about 9 billion shillings):

- Commission = round(Payout × commission rate) — whole shillings
- TRA = round(**rounded** Commission × TRA rate) · GBT = round(**rounded** Commission × GBT rate)
- Total = TRA + GBT
- "Standard rounding": a half rounds **away from zero** (GBT 6.5 → 7).

Worked example (plan §3.2): Payout 570,000 → Commission **74,100** · TRA **7,410** · GBT **3,705** · Total **11,115**
(`test:tax-report` §2). Rounding at each step is provably different from rounding at the end: Payout 999 gives a
total of **20** step by step, against 19 rounded once (§3.3).

## §5 · Rates — admin settings, effective-dated

- The approved model (13% / 10% / 5%) is the built-in version, in force from 1 Jan 2026.
- The **Owner** records a new version on the page (Rates card): the day it takes effect (00:00 EAT), the three
  percentages (up to two decimals), and **why** (the notice, letter or decision — mandatory). A version for a day that
  already has one replaces it from then on; both stay in the history.
- A rate change **re-prices nothing before its day**: a period spanning a change is taxed in segments, each at its own
  rates, and Report 2 prints each segment. A locked period keeps the rates it was filed under.
- Stored in `SystemConfig["tax_report.config"]` through `defineConfig` (`src/lib/server/tax-config.ts`), saved
  **verified** (read back before "saved"), audited as `tax_report.config.updated`. The report reads the rates fresh and
  **refuses to compute** if they cannot be read.
- ⛔ Deliberately NOT `market.config`'s `traTaxOnCommissionRate` / `gbtLevyOnCommissionRate`: those are frozen into every
  new poll and price the levy settlement books. Changing this report's rates must not re-price settlement.

## §6 · Periods, products, locks

- **Period types:** Month (default: the last complete month), Week (Monday–Sunday), Day, Custom (date and time, up to
  366 days). All boundaries are **East Africa Time**. A period still running is **PARTIAL**: shown and exported, marked
  "not for filing", never lockable.
- **Products:** All · Polls · Up & Down (`PredictionMarket.productLine`). Polls + Up & Down = All on every Report 1
  line (`test:tax-report` §12.3). The tax lines are computed on each product's own Payout and rounded at each step, so
  they can differ from All by a shilling (Payout 999 + 999: Total tax 20 + 20 against All's 39 — §12.3b). A money
  record whose bet or round cannot be found appears only under All — and a single-product view still reports the
  **whole book's** check: while the whole book is out, a product cannot be locked or filed (Owner override with a
  written reason).
- **Lock (filing):** a finished day, week or month, 10 minutes after it closes (`LOCK_GRACE_MS` — a bet stamped at
  23:59:59 can commit up to a transaction timeout later). Lock is typed-confirmation (`LOCK`). The server recomputes the
  period and **refuses unless it is exactly what the officer was shown**: the page puts the fingerprint of everything it
  shows into the lock form (`seenFingerprint` — every line, the TRA/GBT split, each rate segment, the products, the
  whole book, the exceptions, the rates), and a recompute with any other fingerprint is refused (the books moved since
  the page loaded — refresh first). It stores the WHOLE report as a snapshot with its canonical sha256 (`TaxPeriodLock` table, migration
  `20261003180000_tax_period_lock`), and audits `tax_report.period.locked`. One live lock per period and product —
  enforced by a partial unique index. A running period is read to a minute before now (`RUNNING_MARGIN_MS`), so a
  bet still committing can never show as a false exception.
- **A locked period shows its snapshot** — on screen and in every export — and names every line where the live books
  have moved since (the drift table), so a late correction is never silent.
- **Out of balance:** sign-off is blocked. The Owner can lock it with the exceptions acknowledged — on its own
  difference, or on the whole book's behind a balanced product. The written reason and the difference are printed on
  every export of that period: the title says **EXCEPTIONS ACKNOWLEDGED** and the first note gives the difference and
  the Owner's words (`test:tax-report` §13.12i–k).
- **Reopen:** the Owner, with a written reason (typed `REOPEN`); the lock's row stays, a re-lock is a new row, audited
  `tax_report.period.unlocked`. "The Owner" is the STORED ADMIN role (`requireOwner`) — reopening, rates and an
  out-of-balance lock can never be handed to another role through the grant table.

## §7 · Exports

`GET /api/admin/tax/export?format=pdf|xlsx|csv&<the page's own period query>&product=…`
(`src/app/api/admin/tax/export/route.ts`) — the buttons in the page head.

- Same view as the page (a locked period exports its snapshot). PDF and Excel through the platform's report renderers;
  CSV is ONE flat table (Section · Line · Basis/rate · Amount · Count) with plain numeric cells and the formula guard
  on every text cell, UTF-8 with a BOM.
- File names carry the period type, the period and the product: `50pick-government-tax-report-month-2026-09-all-products.pdf`
  (a week and the day of its Monday share a date, never a file name).
- A finished, balanced day/week/month is a **Regulator hand-off** with the three-role attestation (Prepared by ·
  Reviewed by · Approved by); so is a period the Owner locked with exceptions acknowledged, titled **EXCEPTIONS
  ACKNOWLEDGED** with the difference and the reason as its first note. These are **Internal**, with no attestation, and
  say why in their title and first note: a partial period; a custom window; an unacknowledged out-of-balance period; a
  single product whose whole book is out of balance; and a period closed less than 10 minutes ago and not yet locked
  (still settling). A running period's window is printed to its cut-off, "(period in progress)" — never "now".
- **The printed page is measured, not hoped:** the PDF's KPI tiles run three across and every column is sized so a
  ten-digit figure (TZS 9,999,999,999), a 28-character record id and a two-decimal rate print on one line —
  `findPdfOverflows` (the shared renderer, `reports/pdf.ts`) measures every box with the renderer's own fonts, and
  `test:tax-report` §13.27 fails on any split (its control, §13.28, proves the old layout is caught). A table of up to
  ten rows moves whole to the next page rather than split; a longer one continues under a repeated header captioned
  "(continued)". The workbook's tab is the title's head, never the title cut at Excel's 31 characters.
- A locked period's export carries the lock reference and, if the live books have moved since, a note naming every
  line that moved (locked → live).
- Gate: accounting VIEW or Owner + admin 2FA + same-origin request. **The audit row (`tax_report.exported`) is written
  and confirmed before the first byte**; a download whose record did not land is refused.
- Its own route, not `/api/admin/reports/[id]`: that route carries no product filter, no calendar week and is pinned to
  two formats by three guards. None of them was loosened.

## §8 · Refund reasons

Derived from each refund's round, never from free text: CASHOUT → **player exit**; a refund on a round resolved YES/NO →
**one-sided bet**; on a round resolved VOID (officer resolution, emergency void, Up & Down void rule) → **round
cancelled**; a refund whose round no longer exists → **other** (the start-up repair). They map onto the plan's codes
ONE_SIDED_BET · CANCELLED · CANCELLED · OTHER, and the "Approved by" column names the authority behind each (50pick
writes no manual refund: every one is a rule or a recorded officer decision). The reasons always add up to Refunds.

## §9 · Proof

| Instrument | What it proves |
|---|---|
| `npm run test:tax-report` | §1 purity · §2 the worked example · §3 rounding · §4 rate input · §5 effective dates · §6 EAT periods · §7 cents · §8 reasons · §9 the reader on REAL bets, settlements, a one-sided refund, an emergency void, a free exit and an Up & Down round, read back to the cent · §10 a withdrawal changes nothing · §11 a round resulted after the cut-off · §12 products, rounding residue, planted defects, and the whole-book check a single product carries · §13 locks, drift, the PDF/Excel/CSV documents, and their states: custom window, PARTIAL, SETTLING (closed less than the lock grace ago), WHOLE BOOK OUT OF BALANCE; the period type in every file name and reference; drift rows in a locked CSV; the Owner's acknowledged filings (title + first note); the lock fingerprint (stable across reads, sensitive to a TRA/GBT re-split and to the whole book); the printed PDF measured at ten-digit figures (§13.27, control §13.28) and the workbook's tab (§13.29) |
| `npm run red:tax-report` | Mutates a COPY of `src/` with each declared defect (`scripts/anchors/tax-report.anchors.mjs`) and proves `test:tax-report` goes red on the named check — the plan's formula and rounding, every line of the check, the products, the locks, and each protection the 2026-10-03 adversarial review added (the whole-book loophole, the settling copy, a week's file overwriting its Monday's, merged rate segments, link inference, the running period's one-minute margin), and those of the second review (an acknowledged filing printed bare, the lock fingerprint, four-across tiles, a narrow id column, the window printed to "now") |
| `npm run test:tax-report-page` | The surfaces at source level, every check with a planted-violation control: the page computes nothing and has no `?? 0`; the export gates on the stored role + 2FA + same-origin and audits before the first byte; every action gates first (reopen and rates on the stored ADMIN role, `requireOwner`); a lock recomputes from the books, refuses unless its fingerprint is the one the page showed, and treats a whole-book difference as its own; the lock panel is rebuilt per period and product; the dev seeder is dead in production |
| `npm run e2e:tax-report` | The same real flows on a LOOPBACK Postgres (`DATABASE_URL=…127.0.0.1…`): every Prisma twin the reader uses, the migration applied from empty, and the partial unique index refusing a second live lock |
| `npm run qa:tax-report` | The browser drive on a local dev server: every period type × product, the arrows, the week/day pickers (typing moves nothing until **Go**), a link naming only a day, a balanced, an out-of-balance and a running month, one product balancing while the whole book is out, Lock → drift → Reopen, a lock refused because the books moved after the page loaded, a rate change that splits a month, all three downloads, six widths, no console errors |

`test:tax-report` and `test:tax-report-page` run in `predeploy` and `test:all`.

## §10 · Files

| File | Role |
|---|---|
| `src/lib/tax-report.ts` | The pure engine: rates, rounding, tax, the check, periods, refund reasons, URLs, formatting |
| `src/lib/server/tax-report-data.ts` | THE reader — figures, exceptions, by-product |
| `src/lib/server/tax-config.ts` | Effective-dated rates (admin-editable, verified, audited) |
| `src/lib/server/tax-locks.ts` | Period locks (Postgres + in-memory twin) |
| `src/lib/server/tax-report-view.ts` | Locked snapshot vs live, and the drift between them |
| `src/lib/server/tax-report-doc.ts` | The PDF/Excel `Report` and the CSV |
| `src/app/admin/tax/*` | The page, its picker, export buttons, lock panel, rates form, actions |
| `src/app/api/admin/tax/export/route.ts` | The downloads |
| `src/lib/server/market-dal.ts` | `positionStore.listLiveDuring` / `getMany` (both twins) |
| `scripts/live/tax-report-guide.mjs` | The managers' PDF guide (`docs/guides/`) from the real screens |
| `src/lib/server/reports/pdf.ts` · `xlsx.ts` · `brand.ts` | The shared renderers: `findPdfOverflows` + `summaryColumns`, keep-together tables, the "(continued)" caption, the workbook's tab name, single-spaced dashes |

## §11 · How Finance files a month — step by step

> The managers' guide, with a picture of every step: [`guides/50pick-how-to-download-the-tax-report.pdf`](guides/50pick-how-to-download-the-tax-report.pdf)
> (rebuilt from the real screens by `scripts/live/tax-report-guide.mjs`, which refuses to build if a label it quotes changed).

1. Sidebar → **Money → Tax report**. It opens on the last complete month, all products.
2. Read the coloured line under the filters:
   - **green "Balanced … Ready to lock and file"** — the books agree; go on.
   - **red "Out of balance by TZS …"** — do not file. The *Exceptions* card names every record behind the difference;
     fix the books (or, if the Owner decides to file anyway, the Owner locks with a written reason).
   - **amber "Period in progress"** — the month has not finished; come back after it closes.
3. Check **Report 1** (the plan's four lines and the check, *Difference from Sales* = 0 ✓) and **Report 2** (the tax).
   *By product* shows Polls and Up & Down separately if the filing needs them apart (use the product pills on top) —
   their money lines add up to All; each product's tax is rounded on its own Payout, so it can differ by a shilling.
4. Press **Lock period**, type `LOCK`, confirm. The lock freezes exactly the figures on screen — if the books moved
   since the page loaded, it refuses and asks you to refresh first.
5. Now download what the authority wants — **PDF** to sign, **Excel** or **CSV** to submit. The files carry the lock
   reference and the figures as locked; the file name carries the period. (The lock's optional note is the place for
   any reference you already hold when you lock.)
6. Mistake? The Owner reopens the period (written reason, type `REOPEN`); the old lock stays in the history, and every
   export of a locked period says so if the live books later move under it.
7. A rate changes in law? The Owner records it under **Rates** with the day it takes effect and why. Months already
   filed keep their rates.

## §12 · Decisions taken (owner delegated 2026-10-03: "any decision you take them")

1. **Payout = winnings paid** (the plan's definition, word for word); early exits are Refunds, not Payout.
2. **The rule in its general form** (§2) — the plan's rule exactly when nothing is brought forward and no fee is kept.
3. **Separate, effective-dated rates** for this report (§5).
4. **Own route and page** (§7), so no existing report guard was loosened.
5. **Weeks run Monday–Sunday EAT**; the default view is the last complete month.
6. **Lock = Finance; reopen, out-of-balance lock and rates = the Owner**, all with written reasons and audit rows.
7. **One product cannot be filed around the whole book** (adversarial review, 2026-10-03): a difference that belongs to
   no product blocks every product's sign-off; the Owner's acknowledged override is printed in the title and first note.
8. **What was shown is what is locked** — a fingerprint of the whole view, not a list of figures: a TRA/GBT re-split that
   keeps the total, or a move in the whole book behind a product, refuses the lock as surely as a changed Sales.
9. **The regulator's PDF is measured**: three KPI tiles across, columns sized for ten-digit figures and 28-character ids,
   `findPdfOverflows` in the suite. The shared renderer gained it, and every 50pick PDF the platform-wide fixes that came
   with it: a heading never prints alone at a page's foot, a short table moves whole, "(continued)" names the table
   above its repeated header instead of sitting on its first figure, a dash is no longer double-spaced, a workbook's
   tab is its title's head, and a signatory's name shrinks to fit its box on one line (it used to wrap over the
   signature rule; an officer with no display name now signs as "Generator" over their id). `test:report-cells` runs
   the same measurement over every catalogue report — it found and fixed three: the SX register's hash tile, the match-
   integrity "Predictors" header and the finance window's "Outcome" header.
10. **The page passed a full visual inspection** (2026-10-03): every state the drive reaches, photographed at six widths
   (360 → 1920, viewport tiles), read by independent inspectors with a second look per finding — 63 confirmed, all
   fixed: no table wider than its card at any width (By product stacks per line on a phone and goes full width below
   1536px; Exceptions, Rates history, Recent locks and the drift are two-column tables or lists), every figure on its
   line's top edge, prose at the 12.5px reading floor (`test:type-scale` §3 adds nothing), one sign for brought-forward
   everywhere, no gold on a figure that is not earned money. Two fixes went platform-wide: `.admin-tbl` honours
   `align-top` (the unlayered `vertical-align: middle` had silently beaten it on every admin table) and divider rows no
   longer take the data-row hover; the admin staff strip shows its session half from 1024px (it collided at 640–1023).
