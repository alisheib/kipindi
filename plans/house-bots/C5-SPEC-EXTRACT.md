# Commit 5 · reporting, data rights, resolver exposure, holder chip — build extraction

> A working aid, extracted read-only on 2026-09-15 (OMEGA-COMPILE01) from `04-amendments.md` (`04`), `02-sealed-flows.md` (`02`),
> `03-design-spec.md` (`03`), `01-scenario-register.md` (`01`), `PLAN.md` (`P`), `PROGRESS.md` (`PR`), `docs/HOUSE-BOTS.md` (`HB`)
> and the code on `house-bots` at `08c82f0f` (Commit 4 🟡, step 7 begun).
>
> **This file is not an authority.** The documents it cites win, and every `file:line` here must be re-derived before use.
> Code anchors are marked "(code @08c82f0f)"; plan anchors date from 2026-09-13/14 and are only pointers.
> Authority order: `04` > `02`/`03` > `PLAN` > `01`. Line numbers after `04:` / `P:` / `02:` / `03:` / `01:` are those files' own lines on this branch.
>
> ⚠️ **§6 is OPEN POINTS, not rulings.** The builder takes the rulings first, writes them into a `C5-SPEC.md` §6 (as Commit 4 did), then builds.

## 0. Scope of record

PR "Scope per commit → Commit 5" (PR:378-390):
- §9 splits; house-liquidity report + CSV (R1); exposure everywhere (R2); statutory notes (R3); no rewards on house stakes (R4, F9).
- DSAR views (R5 = G1); durable audit readers (R8); `houseStake` in decision audits + KYC card (R9 = G2).
- Resolver display (§1-F11); holder chip + SellButton `houseStake`.
- **N1/N2:** entry split in `book.ts`; R1 sections (entry split · Enter now register · previews without a stake · voided or reopened markets · markets decided by the choosing officer · staff-chosen scorecard · targets register · vetoes); CSV columns; R9 (q) `houseStake.staffChosen.requestedBy`; "of which chosen by you"; R3 memo; R5 `events[]` kinds; `test:erasure` §8 reason bucket; `test:dsar-secrets` kind list.

**Source rows:** R1 04:1963-1985 · R2 04:1987-2007 · R3 04:2009-2037 · R4 04:2039-2050 · R5 04:1200-1236 · R6 04:1238-1264 (test half only; the copy rule and hook shipped in 4) · R7 04:1266-1288 (index reader only) · R8 04:1296-1314 · R9 04:1316-1337 · F9 04:1763-1771 · G1 04:1773-1788 · G2 04:1790-1801 · N1 §9 04:3553-3598 · N2 §9 04:4300-4313 · N1 §4.5 staff edge 04:2930-2946 · N1 §7 staff-edge row 04:3271-3302 · 04 placement tables 04:1435-1441, 04:1803-1813, 04:2102, 04:4437 · P §9 P:456-467 · P §1-F10/F11 P:134-143 · P §12 P:520, P:530 · P I7/I8/I10 P:35-41 · P §16b risks 13, 15, 20 P:706-715 · HB §8 (`⏳ Written in commit 5`) HB:576-582 · HB §12 row 5 HB:709 · HB §3.5 "⏳ Commit 5: (i) the holder chip and (o) the activity-feed chip" HB:217.

**Moved in from Commit 4** (C4-SPEC ruling 78, 04:2940): the **STAFF EDGE** monthly alert (`gStaffEdgeWinRatePts` / `gStaffEdgeNetTzs`, W16 = 15 points or TZS 100,000) — its counts must come from `book.ts`, "the same function as R1's scorecard", so it lands with R1 (f). Commit 4 records it NOT BUILT.

**Suites:** `test:house-bot-reports` (new key, two stores), plus additions to `test:dsar-secrets` and `test:erasure`. No RED key is named for commit 5 (PLAN §12 lists RED for money/engine/console only) — see P26.

**Owner defaults in force** (Ali, 2026-09-15, PR:487-506):
- **W2** — a trigger player's export shows **excluded days + countered count only** (no ids, times, sides, amounts, bot ids or holder ids; D6).
- **W4** — skipped/expired intents kept **7 years** (nothing in R1 may assume a 90-day window).
- **W16** — staff-edge thresholds 15 points / TZS 100,000.
- **W17** — `HOUSE_BOT` is **not** a money notification kind.

**Dependency on Commit 4:** steps 8–11 are not built (kill-switch drain, the notification emitters, money hooks, the four suites, `red:house-bot-engine`). The staff-edge alert needs `notifyAdminsHouseBotAlert` (step 9). Commit 5 can be built against the injected `EngineAlerts` (`outcomes.ts:66-78`), but **it cannot close visually until step 9's emitter renders its bell and email** (Ali: a surface not rendered is NOT MEASURED).

## 1. Already built (reuse, do not rebuild)

**The book (commit 1, `src/lib/server/house-bot/book.ts`, code @08c82f0f)**
- `foldDayBook` :66, `houseDayBooks(dayKey)` :101, `houseDayBook(dayKey, botId)` :109, `houseOpenExposure` :115, `houseBotBook({houseBotId, range, nowMs})` :121.
- The cohort rule is already the EAT day the stake was **placed** (R3), and both loss figures are already separated (header :11-20).
- ⛔ `HouseBotBook.feeWithheldTzs` is **always null** with the reason in the docstring :44-55: "null until build commit 5 derives it from the poll's frozen fee snapshot and the position's share" (PLAN §18 row "R3 fee withheld per bot"; HB:580).
- Reads markers only: `houseBookStore.dayRows` / `openExposure` (interface :1600-1605; memory :2794-2826; Postgres :3989-4018 — one `WITH pos … ret` GROUP BY over `Position` + `Transaction` with `BET_PAYOUT | BET_REFUND | CASHOUT`).

**House DAL readers Commit 5 will join on** (`src/lib/server/house-bot-dal.ts`)
- Intent store :1451-1538: `staffChosenPlacedSince` :1520, `placedInWindow` :1522 (`PlacedInWindow` :1607), `staffChosenPlaced`/`…Today`, `placedCounterFor` :1487, `listFeed`, `countPlacedForTarget`.
- Press store :1573-1594: **`listRegister(filter)`** + `PressRegisterFilter` :364-371 (`fromIso`, `toIso`, `actorId?`, `houseBotId?`, cursor, limit) — this is R1 (b)'s reader, already both twins.
- Event store :1430-1449: `listByKinds({kinds, houseBotId?, userId?, marketId?, sinceIso?, limit})`, `listByBot`, `listForPress`.
- Target store :1540-1571: `listForBot`, `listActive`, `everStopped`, `lastStoppedAt`, `veto`.
- Row types: `StoredHouseBot` :82, `StoredHouseBotEvent` :196, `StoredHouseBotIntent` :212 (`kind`, `targetId`, `requestedById`, `entryCondition`, `positionId`, `finishedAt`, `decision`), `StoredHouseBotTarget` :251 (`snapshot`, `createdById`, `endCause`), `StoredHouseBotPress` :276 (`purpose`, `state`, `code`, `reason`, `auditId`).

**Constants (commit 1, `src/lib/house-bot/constants.ts`)**
- `DSAR_HOLDER_EVENT_KINDS` :300 — the 17-kind allowlist for the holder's export, with the "never everything-except" rule :291-298. HB:163 repeats it and marks it "⏳ lands in build commit 5".
- `EVENT_KINDS` :256 (exactly 30 — `test:house-bot-rules` 11.22 pins it; PENALTY_BOXED :275 is R5's durable source).
- `HOUSE_AUDIT` :730 with `house_bot.exported` (ADMIN) :755 and `house_bot.reimbursement_recorded` (COMPLIANCE) :744 already declared.
- `ALERT_KEY.staffEdge(officerId)` :710 (suffix `previousMonth`), `staffStakeVoided` :702, `staffStakeSelfDecided` :703, `STAFF_EDGE_MIN_SETTLED = 10` :609, `OVERSIGHT_LOOKBACK_DAYS = 30` :612.
- `clock.ts`: `EAT_KEY_UNITS` includes `previousMonth` :64 and `EAT_SQL.previousMonthKey` :59 (built in commit 4 for exactly this alert — TGT-39's "an October run writes 2026-09").
- Control columns `gStaffEdgeWinRatePts` / `gStaffEdgeNetTzs` exist with CHECKs 1–100 and 0–1e9 (DAL :156-157, :471-472, :757-758).

**Oversight (commit 4, `src/lib/server/house-bot/oversight.ts`, 139 lines)**
- `oversightPass(alerts, nowMs)` already: reads staff-chosen PLACED rows of the last 30 days, reads the decision audits durably (`getAuditForTargetsDurable` + `getAuditByActionsDurable` for `market.resolve.bulk`), computes **`requestedBy` per market from intents and targets** :117-131, and fires `staff-stake-voided` / `staff-stake-self-decided`.
- `bulkMarketIds(payload)` :38 and `selfDecidedAction(entry)` :56 are exported and reusable.
- C4-SPEC ruling 29: "Self-decided oversight recomputes `requestedBy` from intents and targets (**R9's payload is commit 5**)"; ruling 79 fixes the void-time rule (no fabricated time).

**Durable audit readers (platform)** — `src/lib/server/audit.ts`: `getAuditForTargetDurable` :568, `getAuditByActionsDurable` :626 (⭐ "the durable read a REPORT is built from", pass the category), `getAuditForTargetsDurable` :675, `getAuditForActorDurable` :749, and the ring `getAuditPage` :479 that R8 removes from two callers. All return `{entries, total?, truncated}` and fall back to the ring without a database.

**Commit 2 (money seam) already landed**, so Commit 5 must not rebuild:
- markers on every money row and the propagation table (HB §3.5 :198-216);
- (d)/(e) `cashOutValue` → `HOUSE_POSITION` (`market-service.ts:2951` `const housePosition = position.houseBotId != null;`) and `cashOutPosition` → `house_position_no_exit`;
- (f)/(n) `HOUSE_STAKE_ONLY` objection standing (`objections-service.ts:114`) with player copy `objHouseStakeOnly` (`i18n-dict.ts:788`);
- (m) `src/lib/comment-side.ts` (the public side chip ignores marked positions);
- (g) wagering reversal and recruiter rewards skipped for marked rows (`market-service.ts:2789`, `:4092`, `:4554`; `affiliate-service.ts:1116-1118`, `:1214-1217` — **this is the seed of F9's population**);
- (h) the A17 liquidity label on every holder outcome notice (`notification-service.ts:353-357` `LIQUIDITY_LINE`, and the `houseStake?: boolean` option on `notifyWin` :368, `notifyLoss` :388, selection-closed :644, verdict :1070, `notifyRefund` :1240, `notifyMarketCancelled` :1257, `notifyOneSidedRefund` :1324).

**Commit 3** built the erasure refusal and pseudonymising the reports and DSAR rely on: `AnonymizeOutcome.reason` gains `house_bot_live` (`erasure.ts:116-118`), the §4b house block `erasure.ts:413-431` (label redaction scoped by kind + href + designation window), `houseBotStore.pseudonymiseForUser` (DAL :1374-1380) rewriting bot, event and press reasons to `[erased]`, and counts `houseBots` / `houseBotNotificationsRedacted` (`erasure.ts:145-148`). C3-SPEC §4 defers to commit 5: "DSAR view, `test:dsar-secrets`, the `test:erasure` house buckets".

**Not in `src` yet (Commit 5 builds them):** `houseStakeByMarket`, an entry-split book reader, a per-officer scorecard reader, the staff-edge pass, `server/house-bot/dsar.ts houseLiquidityDsarView`, `buildHouseLiquidity` / `house-market-statement`, the report route's `?period` / `?marketId`, `TxnSearchFilters.house` + the CSV `house_bot_id` column, `{excludeHouseBets}` on `db.txn.findByUser`, `{excludeHouse}` on `getAuditForActorDurable` and `positionStore.leaderboard`, the R9 payload fields, every R2 display, the holder chip + `SellButton houseStake`, the activity-feed chip, the §9 split lines, the harm/AML exclusions, R8's two reader swaps.

## 2. Hook points in the platform (code @08c82f0f; re-derive before editing)

### Reports subsystem
| Where | Anchor | What Commit 5 does |
|---|---|---|
| `src/lib/server/reports/catalogue.ts` | `buildGbtMonthly` :75, financial rows :116-126, GGR note :187, provenance note :196-200; `buildFiuSar` :217 (columns :306); `buildDailyOps` :586 (metrics :721-730, notes :763); `buildRgEngagement` :856 with the **ring read :887** `getAuditPage({category:"COMPLIANCE", limit:500})`; `buildMatchIntegrity` :954 (market rows :956-970, stale two-officer note :1040); `REPORT_CATALOGUE` :1052-1063 (8 reports) | add `buildHouseLiquidity` + `house-market-statement`; R3 memo rows and corrected notes; R8 swaps :887 to the durable reader |
| `src/lib/server/reports/types.ts` | `Report` :62-95 (`meta.classification`, `sections`, `notes`, signatures) | the new report's shape; `truncated` printed (R8) |
| `src/app/api/admin/reports/[id]/route.ts` | session + `canView("accounting")` :37-44, `checkAdminTotp` :45-49, `entry.build(session.userId)` (single arg), audit `report.<id>.generated` ADMIN | validated `?period=YYYY-MM` (default `currentPackPeriod()`) and `?marketId` |
| `src/app/admin/reports/page.tsx` | `TEMPLATES` :53-110, tab resolve :160, `resolveRange(sp, …)` :166, library grid :486-550 | one more TEMPLATES card (severity/target/cadence/formats + `GenerateButton`) |
| `src/app/admin/reports/generate-button.tsx` | `fetch('/api/admin/reports/<id>?format=…')` :36 | pass `period` when the template declares one |
| `src/lib/server/report-pack.ts` | `getReportPack` :88, **ring read :92** `getAuditPage({category:"ADMIN", limit:10000})` | R8: durable `getAuditByActionsDurable(["pack.prepared",…], {category:"ADMIN"})` filtered by `targetId` |
| `src/lib/server/date-range.ts` | `resolveRange` :91, `range=custom&from&to` :95-105 | the staff-edge href's `range=custom` already resolves |

### §9 splits (PLAN §9 P:456-467) — none of it is built today (`grep house` finds nothing in these files)
`src/lib/server/report-money.ts` (`holdPct` :169, `activePlayers` :175, the summarise fields :127-175, `categoryBreakdown`/`moneyByGame` :212-240) · `src/lib/server/analytics.ts` (`activePlayers` :174, `topNgrContributors` :304, `detectSuspiciousBets` :483) · `src/lib/server/responsible-gambling.ts` (harm detectors :593-760, `db.txn.findByUser(userId, 10_000)` :788) · `src/app/admin/compliance/page.tsx` (harm table, `detectHarmMarkersForAllUsers` :16) · `/admin/house`, `/admin/finance` (`houseAccountBalances` :137, margin tile :190), `/admin/insights`.

### Transactions CSV (R1)
`src/app/api/admin/transactions/export/route.ts`: headers :56-60, `TxnSearchFilters` build :90-101, `db.txn.search(filters)` :102, the `pii.revealed` / `transactions.exported` audits. Filter type `src/lib/server/txn-filters.ts:32-46` (no house field). Both stores implement `txn.search`.

### Data-rights doors
| Door | Anchor | Change |
|---|---|---|
| Player | `user-service.ts exportUserData` :46-69: `transactions: await db.txn.findByUser(userId, 1000)` :54, `auditEntries: await getAuditForActorDurable(userId, {limit:1000})` :63; `UserDataExport` :24-33 | add `houseLiquidity`; personal reads exclude house rows; add `houseAuditCount` |
| Officer | `privacy.ts buildDsarBundle` :292-330 (`schemaVersion: 1` :303, `txns = db.txn.findByUser(userId, 10_000)` :296), projection `dsarUserView` :261 | same section, `schemaVersion: 2` (R5) |
| Officer player page | `admin/players/[id]/page.tsx` :130-144 reads `exportUserData(id)` and computes lifetime KPIs from `data.transactions` | R5: it must read `db.txn.findByUser(id, 1000)` **directly** so its output is unchanged |
| Player activity feed | `user-service.ts getOwnActivity` :173-178 → `profile/account/page.tsx` :83-84 | (o) the chip on rows whose `payload.houseBotId` is set |
| Erasure | `erasure.ts` §4b :413-431; `AnonymizeOutcome` :116 | tests only (R6 §8 buckets, §11) |
| DSAR queue | `privacy.ts openErasureRequest` :223 (built in commit 4, ruling 130) | reused, not changed |

### Decision audits (R9 = G2, sanctioned change (q))
| Payload | Anchor | Note |
|---|---|---|
| `market.adjudicated` | `market-service.ts:3338-3360` inside `resolveMarket` :3244 — payload carries `outcome`, `resolutionAuth`, `yesPool`, `noPool`, `grossPool`, evidence | `test:two-admin:146-149` pins `resolutionAuth` |
| `market.emergency_void` | `market-service.ts:4510-4518` inside `emergencyVoidMarket` :4361 — `{reason, refundedCount, refundedTzs, grossPoolBefore, title}` | the refunds are already marked |
| `market.reopened` | `market-service.ts:4329` inside `adminReopenMarket` :4294 | oversight already reads it; **not** in R9's list |
| `objection.rejected` / `objection.upheld` | `objections-service.ts:428-433` / `:551-565` | |
| `market.resolve.bulk` / `_override` | `resolver-queue/bulk-resolve-action.ts:277`, `:325`, `:367` | the batch row names its markets in the payload (`bulkMarketIds`) |
| KYC card | `admin/kyc/[id]/page.tsx:389-397` ("Bets placed" Field) over `kycMoneyFacts(txns)` :111; `kyc-risk.ts kycMoneyFacts` :115-140 (`betCount`, `stakedTzs` from CONFIRMED `BET_PLACED`) | add `houseBetCount` / `houseStakedTzs` and the "of which" line |

### R2 exposure display sites (F11 + HB-LC-17)
| Surface | Anchor | Where the line goes |
|---|---|---|
| Resolver queue card | `admin/resolver-queue/page.tsx` Crowd line :449, "held" chip :462-471 (title "Player money held on this market until it resolves") | under the crowd/held row (03 S6) |
| Resolution ceremony | `admin/resolver/[id]/page.tsx` grossPool :41, "Gross pool" :132, pools line :161; component `resolution-ceremony.tsx:45-62` (props) | under the pools line |
| Admin market page | `admin/markets/[id]/page.tsx` pool figures :221-232; positions table :362-400 | the line under the pools; row tag "House bot · Bot A" in the table |
| Objections | `admin/objections/page.tsx` row build :40-60 (`pool` :51), frozen notice :83, "Pool held" column :108/:142; `objection-decision.tsx:47` | panel line + the decision dialog |
| Up & Down rounds | `admin/updown/rounds/page.tsx` volume :115/:313, `VoidRoundControl` :318-334 | the void lever row |
| Emergency-void confirm | `admin/markets/emergency-void-control.tsx:19` props, `ConfirmVoid` :101-160, body :140 | "of which house TZS 8,000" |
| Emergency-void admin notice | `notification-service.ts notifyAdminMarketCancelled` :1272-1287 | the house share sentence |
| Bulk resolve | `resolver-queue/bulk-resolve-bar.tsx` :193 ("N selected · TZS X held"), per-row pool :477, total :484-490 | "N of these markets carry house stakes" |

### Holder-facing (F10, 03 S8)
| Surface | Anchor | Change |
|---|---|---|
| `SellButton` | `components/markets/sell-button.tsx` props :26-66 (no `houseStake`), grace/closed effects :67-100 | new `houseStake?: boolean` → no button, no banner, no countdown, one static note row |
| Callers | `positions/page.tsx:425` (sellable computed :176-196 with `houseBotId` :190) and `markets/[id]/page.tsx:659` (`cashOutValue` :293) | pass `houseStake` separately from `alreadyClosed`, or a LIVE market says "Selling closed" |
| PositionCard | `components/markets/position-card.tsx` Props :20-54, chip row :80-123 | chip after the status chip + line under the header |
| Market own-positions | `markets/[id]/page.tsx:600-660` | chip after the status span |
| Wallet rows | `wallet/wallet-client.tsx TxnRow` :431; the row type is `Transaction` in `src/lib/ui-stubs.ts:26-39` (**no `houseBotId` today**); the page reads `db.txn.findByUserWindow` :167/:289 and passes `transactions={pagedTxns}` :378 | the marker must be carried into the view type |
| Up & Down history | `updown/history/page.tsx` bet chips :474-476, count-leads rule :455-462 | a separate labelled sub-row |
| Player copy | `i18n-dict.ts` has only `objHouseStakeOnly` :788 and `failHousePositionNoExit` :2265 — the S8 keys `market.houseStakeChip`, `houseStakeLine`, `houseStakeNoExit` do **not** exist | add en/sw/zh (⚠️ Swahili is now the default locale, `8822b648`) |
| Admin player chip (03 S7) | `admin/players/[id]/page.tsx` chip row :226-262 (KYC chip precedent :244) | "House bot · Active" chip (see P24) |

### Rewards (R4 + F9)
- Population: `market-dal.ts` `leaderboard(limit, opts)` interface :440-449 and `leaderboardPlayerCounts` :460; Postgres SQL :1225-1265 (`where p."status" <> 'OPEN' … group by p."userId"`), the Up & Down digest aggregate :1325-1350, memory twin :704-730; `prisma-dal.ts topContributors` :1585-1605 (`group by "userId"` over `Transaction`).
- Credit writers F9 names: `wallet-service.ts creditInternal` :1989, `adminAdjustBalance` :2599, `bonus-service.ts creditBonus` :94. Files that call one of them today: `admin/bonuses/bonus-actions.ts`, `admin/players/[id]/actions.ts`, `affiliate-service.ts`, `bonus-service.ts`, `invite-service.ts`, `proposals-service.ts`, `wallet-service.ts`.
- Display-only readers to allowlist (D6): `app/leaderboard/page.tsx:149`, `lib/leaderboard/board.ts`.

## 3. Rules by area (citations; the cited text is the specification)

1. **R1 house-liquidity report** (04:1963-1985; CRA-02 01:1761-1791; FS-22 01:2496-2510; N1 §9 04:3558-3576; N2 §9 04:4302-4310). Six base sections (designation register · master-switch and limit history · per bot per product · per market · reconciliation "all = players + house" · the `house_bot.*` audit index read with `getAuditByActionsDurable(Object.keys(HOUSE_AUDIT))`, no category, printing `truncated`), plus the eight N1/N2 sections (a)–(h). Classification "Regulator hand-off" with `regulatorSignatures`. Per-market `house-market-statement`. Transactions CSV gains `house_bot_id` and `house=only|exclude`. Feed rows and exports read titles and round numbers from `decision.snapshot`, never live joins (FS-22).
2. **R2 exposure everywhere** (04:1987-2007; 03 S6 03:306-314; HB-LC-17 01:876-883; N1 §9 "R2 display" 04:3584-3587). One reader `houseStakeByMarket(ids) → {yes, no, open|settled}` with a memory twin, feeding the eight surfaces of §2; overview exposure bars split open / awaiting settlement / frozen by objection (console query, never the engine — I2); `CAP_EXPOSURE` skip text names the amount held. Copy: "House stake: NO TZS 9,000 · of which chosen by staff TZS 9,000", and "of which chosen by you: TZS 9,000" when the viewer is in `requestedBy` (resolver card, ceremony, emergency-void confirm, objection panel). **Display only (I10, P:41; risk 20 P:714).**
3. **R3 statutory notes** (04:2009-2037; CRA-18 to CRA-22 01:2026-2088). Cohort = the EAT day the stake was placed (already in `book.ts`); the hint copy; `book.ts` derives returned money and fees from marker-bearing `Transaction` rows; the source pin "every `db.txn.create` with a `positionId` in `src/lib/server` copies `houseBotId`"; harm detectors read `findByUser(userId, 10_000, {excludeHouseBets:true})`; the compliance harm table shows "House bot holder · <status> since <date>"; FIU SAR gains a Context column from designation windows; the GBT pack gains the memo rows and the corrected GGR note ("stakes − payouts − refunds"); match integrity gains "House stake" and "Resolution path" columns and its note fix. **N1 §9:** the GBT memo adds "of which: staff-chosen house stakes (Enter now and targeted)"; statutory totals and the §9 house line are unchanged.
4. **R4 / F9 no rewards on house stakes** (04:2039-2050, 04:1763-1771; FS-05 01:2297-2304; CRA-12 01:1958-1968). `positionStore.leaderboard({excludeHouse?})` default false (D6 keeps the bot on the public board) with a memory twin; a COMPLIANCE + HB rule "no prize, cashback, tournament or rank reward on marked positions"; the pin covers any file that aggregates `"Position"` by `"userId"` **and** calls `creditInternal`, `creditBonus` or `adminAdjustBalance` — it must filter `"houseBotId" IS NULL` or pass `excludeHouse:true`; display-only sites are allowlisted (the list may only shrink); a planted offending file must go red.
5. **R5 = G1 data rights** (04:1200-1236, 04:1773-1788; CRA-04 01:1810-1835; CRA-10 01:1929-1940; N1 §9 DSAR 04:3589-3595; N2 §9 04:4312-4317). Both doors, bundle `schemaVersion: 2`. Projection `server/house-bot/dsar.ts houseLiquidityDsarView(userId)`, an allowlist like `dsarUserView`: `designations[]` (botId, status, live causes, designatedAt, consent `{method:"password entered by 50pick", verifiedAt}`, void stamp and cause, removal, `writtenBy50pick {label, note}`), `events[]` `{kind, from, to, at, actor}` over `DSAR_HOLDER_EVENT_KINDS`, `positions` and `transactions` (marked rows, ≤1,000, with `total` and `truncated`). **Never:** `passwordFingerprint`, any hash, any officer id, any `triggerUserId`, any press row, any reason text, any marketId on an event. Personal `transactions` = `findByUser(userId, 1000, {excludeHouseBets:true})`; personal `auditEntries` = `getAuditForActorDurable(userId, {limit:1000, excludeHouse:true})` (raw `NOT (payload ? 'houseBotId')`, memory twin) plus `houseAuditCount`. **Trigger players** (both doors, W2): `liquidityDecisions {excludedDays:[{day, cause:"CASHED_OUT_COUNTERED"|"BOTH_SIDES"}], counteredPositionsCount}` from the durable `PENALTY_BOXED` events — AlertOnce stays a throttle only.
6. **R6 leftovers — tests only** (04:1238-1264). `test:erasure` §8 adds buckets `notificationsAdmin`, `houseBots`, `houseBotEvents`, `houseBotIntents` and (N1 §9) `houseBotPressAndEventReasons`, each holding no NAME; §11 asserts `house_bot_live`, the request staying PENDING and exactly 1 owner alert; `red:erasure` keeps a mutation that skips the label redaction and fails 8.b.
7. **R7 index only** (04:1266-1288). The R1 index reads every `HOUSE_AUDIT` key with **no category filter**. The per-action row/category assertions are commit 7's console suite.
8. **R8 durable readers** (04:1296-1314; CRA-03 01:1792-1809). `getReportPack` and `buildRgEngagement` switch to `getAuditByActionsDurable`; every house report builder uses a durable reader and prints `truncated`; a source pin (positive control) forbids `getAuditPage` in `report-pack.ts`, `server/house-bot/**` and the house/RG builders in `catalogue.ts`. `kyc-risk.ts:336` is listed as a risk for the KYC owner and **not** edited.
9. **R9 = G2 decision audits** (04:1316-1337, 04:1790-1801; N1 §9 04:3577-3583; N2 §9 04:4311; PLAN §18 row "R9 / sanctioned change (q)" P:806; TGT-38 01:3635-3648). Exact shape `houseStake:{yes:number, no:number, staffChosen:{yes:number, no:number, requestedBy:string[]}}`, zero shape `{yes:0,no:0,staffChosen:{yes:0,no:0,requestedBy:[]}}`, read in the same call through R2's reader; `staffChosen` = the same rows restricted to `kind='MANUAL' OR "targetId" IS NOT NULL`; `requestedBy` = distinct officer ids, sorted — `requestedById` for MANUAL, the target's `createdById` for targeted. Nothing else in the payload changes. `kycMoneyFacts` gains `houseBetCount` and `houseStakedTzs`; the card adds "of which 50pick liquidity stakes: N · TZS X" when above 0.
10. **Staff edge** (04:2930-2946 + 04:3271-3302 row; W16; TGT-39 01:3649-3669; C4-SPEC ruling 78). Evaluated **only during the first EAT day of each month, for the month just ended**, per officer over staff-chosen stakes placed that month and settled by evaluation time. Counts: settled = won + lost + refunded; win rate = won/(won+lost); net = payouts + refunds − stakes — **from `book.ts`, the same function as R1's scorecard**. Baseline: the automated rate over PLACED `kind<>'MANUAL' AND "targetId" IS NULL` rows on the same products in the same month (C4-SPEC ruling 29). Fires `staff-edge:<officerId>:<YYYY-MM>` when settled ≥ 10 **and** (win-rate delta ≥ `gStaffEdgeWinRatePts` with a non-empty baseline, **or** net ≥ `gStaffEdgeNetTzs`). Both thresholds NULL → nothing. Copy and href: "…{n} settled, {w}% won against {a}% for automatic stakes…" → `/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>` (pinned by C13's +60-day test).
11. **Entry split** (N1 §9 04:3554-3557; N2 §9 04:4301). `houseBotBook(filter, {byEntry:true})` joins each marked Position to its intent by the unique `positionId`; entry is `MANUAL`, `TARGETED` (COUNTER with `targetId`) or `AUTOMATIC`; **assert automatic + targeted + manual = house totals**.
12. **Holder chip and SellButton** (P §1-F10 P:134-142; 03 S8 03:322-340; 02 F10 02:425-431; HB-ACC-40 01:689-697; HB §3.5 "(i)" and "(o)" HB:217). Chip "50pick liquidity stake" + the line "Placed by 50pick with your permission; it can't be cashed out and settles to your wallet.", en/sw/zh, on PositionCard, the market own-positions block, wallet rows, Up & Down history and the account activity feed; `SellButton houseStake` renders the static note row with **no** button, banner or countdown, and never "Selling closed".
13. **Absence assertions** (P §12 P:520; CRA-27 01:2145-2153; FS-25 01:2535-2542). `houseBotId`, `hb_`/`hbi_` ids and `hb:` keys appear in **no** public payload: `getBoard`, `getRoundDetail`, market page props, leaderboard, trader avatars, `market:odds`, `/api/fairness/recent`, `/results`, `/api/og/market/<id>`, the ticker feed and the comments thread — with a planted positive-control needle.

## 4. Tests demanded

**New suite `test:house-bot-reports`** (both stores, `scripts/lib/house-bot-two-stores.mts runTwoStores`):
- R1: a fixture month with 2 bots on both products and rows at the month-boundary instants; every section reconciles to the markers; all = players + house; xlsx and pdf render; the CSV `house=only` filter returns exactly the marked rows (04:1983-1985, 01:1784-1791).
- Entry split ties to totals; the register includes refused presses with their code; sections (c), (d), (e), (h) hold their fixture rows; targets register and vetoes (04:3743-3748, 04:4400).
- Scorecard / staff edge (TGT-39): X and Z alert once each, Y never; thresholds NULL variants; a second pass adds 0; the baseline ties to the book.
- R9: the exact shape on adjudicate, emergency void, bulk, objection upheld/rejected; the zero shape on a non-house market; "of which chosen by you" renders only for a viewer in `requestedBy`; `test:two-admin` and `test:officer-conflict` pass unchanged; source pin "no refusal branch reads `requestedBy`" (01:3647).
- R2: the reader separates open from settled after settlement and after a void (04:2006).
- R3: positions at 23:59:59.999 and 00:00:00.000 EAT fall into different cohorts; the `db.txn.create` source pin fails on a planted RED file; 50 late-night house bets raise no LATE_NIGHT flag; the GBT pack equals its no-marker twin on every existing row; `holdPct` identical to the twin; FIU context column in/out of the designation window; match-integrity columns, section and note.
- R4/F9: the walker fails on a planted offending file; `excludeHouse:true` drops marked rows in both stores and the default output is unchanged.
- R8: the source pin with a positive control; the pack state survives 12,000 BET rows (Postgres half or `drive:house-bots-local`).
- Leak sweep with a planted needle (P:520, CRA-27); leaderboard still includes the bot; two-admin ON resolves a house-held market exactly like its twin.
- Props assertion for the holder chip surfaces (HB-ACC-14 01:295).
- KYC card: the line for a holder; a non-holder's snapshot identical.

**`test:dsar-secrets`** (new §6–§8, 04:1232-1236 + 04:3743 + 04:4400): a holder with 1,200 house transactions, 3 deposits and 1,100 house audit rows — both doors contain the 3 deposits and `houseLiquidity.designations[0].consent.verifiedAt`; no fingerprint value, hash value or officer id; a column added later to `HouseBot` is absent; a trigger fixture 31 days after the AlertOnce purge still shows `excludedDays` with no `hb_`, `hbi_` or bot `userId`; officer-page KPIs for a non-holder byte-identical; `events[]` holds exactly the allowlisted kinds as `{kind, at, actor}` with no reason text and no marketId.

**`test:erasure`** (04:1259-1264, 04:3596-3598): the §8 buckets above; §11 `house_bot_live` + PENDING + 1 owner alert; `HOUSE_BOT_ENGINE=false` → `closeAccount` gives REMOVED; `red:erasure` still fails 8.b.

**Gates to re-run because they touch the same files:** `test:report-parity`, `test:read-tiers`, `test:product-line`, `test:predictor-count`, `test:leaderboard-order`, `test:house-page`, `test:insights`, `test:two-admin`, `test:officer-conflict`, `test:dal-parity`, `test:i18n`, `test:labels`, `test:chip-contract`, `test:feedback-law`, `test:popup-fit`, `test:unsaved-changes`, `test:control-gates`, `test:kyc-copy-truth`, `test:house-bot-rules`, `test:guards-exist`, `test:decomment`, `test:red-anchors`, `test:pii-in-logs` (P:530 "Existing gates touched").

**Scenario ids this commit should cover** (01): **compliance-data** CRA-01 (index), CRA-02, CRA-03, CRA-04, CRA-07 (retention doc rows), CRA-10, CRA-11, CRA-12, CRA-14, CRA-16, CRA-17, CRA-18, CRA-19, CRA-20, CRA-21, CRA-22, CRA-27, CRA-28, CRA-30, CRA-31, CRA-32, CRA-33, CRA-34, CRA-35, CRA-36 · **holder-account** HB-ACC-12, HB-ACC-13 (regression), HB-ACC-14, HB-ACC-32 (regression), HB-ACC-40 · **market-round** HB-LC-11 (regression), HB-LC-17, HB-LC-20 (reader half), HB-LC-26, HB-LC-27, HB-LC-34, HB-LC-39 · **future** FS-05, FS-22, FS-25, FS-26, FS-30 · **targeted-and-manual** TGT-28, TGT-36 (vetoes row), TGT-38, TGT-39.

## 5. Surfaces to render at 1280 and 360 (visual verification)

Ali's rule (PR:28-29): every surface a commit produces is rendered and read; a surface not rendered is NOT MEASURED. The platform kit and the existing templates are the only look (`docs/DESIGN_AUTHORITY.md`; 03 §1). Phase C is the admin static harness, phase D the real-route client pass (modals are NOT MEASURED in C — 03 X3), phase E the player pass (03 §7).

| # | Surface · route | Fixture state needed | Kit component / neighbour it must look like |
|---|---|---|---|
| 1 | `/admin/reports?tab=library` — the "House liquidity" template card | none (static card) | the existing `TEMPLATES` cards (`reports/page.tsx:495-548`): `AdminCard` + severity glyph tile + `Chip size="sm"` target + cadence mono + formats pills + `GenerateButton` |
| 2 | The generated report itself (XLSX + PDF) | the R1 fixture month | `scripts/report-renderers-smoke.mjs`; the GBT pack's section/column/notes shape (`reports/types.ts:62`) |
| 3 | `/admin/resolver-queue` — queue card house line + bulk bar count | a LIVE market pending resolution with an OPEN marked position; 3 of 8 selected markets house-held | the "held" chip and Crowd line (`page.tsx:449-471`); the bulk bar's "N selected · TZS X held" (`bulk-resolve-bar.tsx:193`) |
| 4 | `/admin/resolver/<id>` — ceremony house line + "of which chosen by you" | a poll with a PLACED staff-chosen stake whose `requestedById` is the signed-in officer | the pools line `resolver/[id]/page.tsx:161` inside `AdminCard` |
| 5 | `/admin/markets/<id>` — house line under the pools + "House bot · Bot A" row tag | one marked and two unmarked OPEN positions | pool figures :221-232; the positions `.admin-tbl` rows :362-400 with `Chip size="sm"` |
| 6 | `/admin/objections` — panel line + `ObjectionDecision` dialog | an OPEN objection on a house-held, unsettled market | the "Pool held" column :108/:142 and the frozen notice :83 |
| 7 | `/admin/markets` — emergency-void confirm dialog ("of which house TZS 8,000") | a LIVE house-held market | `ConfirmVoid` (`emergency-void-control.tsx:101-160`) — **phase D only** |
| 8 | `/admin/updown/rounds` — void lever row with house exposure | an open round holding a marked position | the volume cell :313 and `VoidRoundControl` :318-334 |
| 9 | `/admin/kyc/<id>` — "of which 50pick liquidity stakes: N · TZS X" | a holder KYC case with marked `BET_PLACED` rows | the "Bets placed" `Field` :389-397 |
| 10 | `/admin/players/<id>` — the S7 chip (see P24) and house rows in the transactions tab | a live holder | the KYC chip row :244-262 |
| 11 | `/admin/house`, `/admin/finance`, `/admin/insights` — the §9 house lines and "House bots net" tile | a settled house fixture | `AdminKpi` (never gold — 03 §1 colour) and the `.admin-tbl` money rows |
| 12 | `/admin/compliance` — the harm table holder chip | a holder flagged RAPID_DEPOSIT_ESCALATION | the existing marker chips |
| 13 | `/positions` — PositionCard chip + SellButton note row | one marked OPEN position on a LIVE market, one unmarked | `Chip size="sm" variant="neutral"` + `text-body-sm text-text-muted` line (03 S8) |
| 14 | `/markets/<id>` — own-positions block chip; signed-out view has no chip | as above | the status span row :600-660 |
| 15 | `/wallet` — `TxnRow` chip (`Chip size="xs"` in the meta line) + the expanded panel line | marked BET_PLACED + BET_PAYOUT rows | `wallet-client.tsx TxnRow` :431 |
| 16 | `/updown/history` — "{n} liquidity stakes" sub-row | a marked Up & Down position | the count-leads rule :455-476 |
| 17 | `/profile/account` — activity-feed chip on house rows | audit rows carrying `payload.houseBotId` | the existing activity rows |
| 18 | The staff-edge bell and email (Commit 4 step 9 emitters) | the TGT-39 fixture | `qa:cert-c1`'s visual pass; the other house alert templates |

**Widths:** 320/360/640/768/1024/1280/1920 in the admin harness, 360/640/768/1024/1280/1920 for the player pass in en/sw/zh (`kp-locale`). Player surfaces need the new dev route `src/app/api/dev-test/seed-house-stake/route.ts` (03 §7 phase E; it must 404 in production **before its first `await`** — `scripts/dev-route-guard.test.mts`). Every PNG opened and read.

## 6. Build order (numbered steps for a fresh session)

1. **Take the rulings.** Answer §7's open points in one sequence, write them into `plans/house-bots/C5-SPEC.md` §6 (Commit 4's pattern), and re-derive every anchor in §2. Nothing in §7 needs Ali except P8 and P13 (both have a safe default that needs no ask if the recommendation is taken).
2. **The readers, pure and DAL first.** `houseBookStore.entryRows` (Position ⋈ Intent by `positionId`) and `houseBookStore.stakeByMarket(ids)` in **both twins**; `book.ts` gains `houseBotBook(filter,{byEntry:true})`, `houseEntryBook(window)` and `houseStaffScorecard(window)`; `server/house-bot/exposure.ts houseStakeByMarket(ids)` (console-only; a source pin keeps it out of every engine module — I2). `test:dal-parity` picks up the new members. Fee-withheld derivation (P9) lands here or stays null.
3. **`test:house-bot-reports` skeleton** — the package key first (`test:guards-exist` refuses a cited key that does not exist), the two-store runner, and the R1 fixture month with boundary instants. Write the reconciliation assertions before the report exists (they must be able to fail).
4. **R9 + R2 server side.** The five decision-audit writers take the payload from `houseStakeByMarket` in the same call; `kycMoneyFacts` gains the two fields; oversight switches to the one reader (P3). Run `test:two-admin`, `test:officer-conflict`, `test:bulk-resolve`, `test:read-tiers` right after.
5. **R2 display.** One copy module, then the eight surfaces of §2 (queue card, ceremony, admin market page + row tag, objections panel and dialog, rounds lever, emergency-void confirm and its admin notice, bulk bar), plus the exposure split reader. Render steps 3–8 of §5 at 1280 and 360.
6. **R1 report + route + CSV.** `buildHouseLiquidity` with all fourteen sections, `house-market-statement`, the route's `?period`/`?marketId`, the TEMPLATES card, `TxnSearchFilters.house` + the `house_bot_id` CSV column in both stores. Render §5 rows 1–2.
7. **Staff edge.** `oversight.ts staffEdgePass` in the planner's hourly duty (first EAT day only), reading the step-2 scorecard; AlertOnce `staff-edge:<officerId>:<previousMonth>`; TGT-39's fixture in the reports suite. Record it in `C4-SPEC.md` ruling 78's place and in PROGRESS.
8. **R8.** `getReportPack` and `buildRgEngagement` move to the durable readers; the source pin with a positive control; re-run `test:report-parity` and the pack drive.
9. **R3 statutory + §9 splits.** The `book.ts` fee/return derivation, the source pin on `db.txn.create`, harm and AML exclusions (`{excludeHouseBets:true}`), the compliance holder chip, FIU context, the GBT memo rows and note fixes, match-integrity columns, `MoneySummary.house`, the `/admin/house`, `/admin/finance`, `/admin/insights` lines. Every existing row proven byte-identical against a no-marker twin.
10. **R4 + F9.** `leaderboard({excludeHouse})` in both stores, the walker with its allowlist and positive control, the COMPLIANCE/HB do-not-restore lines.
11. **R5 = G1 data rights.** `server/house-bot/dsar.ts houseLiquidityDsarView`, both doors, `schemaVersion: 2`, the `{excludeHouseBets}` / `{excludeHouse}` options with memory twins, `houseAuditCount`, the trigger-player projection, the officer player page switching to `db.txn.findByUser` directly. Extend `test:dsar-secrets`.
12. **R6 tests.** `test:erasure` §8 buckets (with `MUST_HAVE_CONTENT` entries so an empty bucket cannot pass) and §11; `red:erasure` mutation re-run.
13. **Holder-facing.** `SellButton houseStake` + both callers, the chip on the five player surfaces and the activity feed, the three i18n keys in en/sw/zh (sw drafted carefully — it is now the default locale), the marker carried into the wallet view type. Render §5 rows 13–17 at 360 and 1280 in three locales.
14. **Absence assertions and the leak sweep** with a planted needle.
15. **Closing gates** as in commits 2–4: `tsc`, every suite in §4, mutations on the new code (a temporary worktree with a `node_modules` junction — PR's technique), `test:all` against clean `F:/kipindi-old-build`, the 3-lens review, then docs (`HOUSE-BOTS.md` §8 replaces "⏳ Written in commit 5", §12 row 5, DATA-RETENTION §2b, PROGRESS, `C5-SPEC.md`).

## 7. Open points, with a recommended ruling each

Authority order: 04 > 02/03 > PLAN > 01; the later and more specific text wins.

| # | Open point | Options | **Recommended ruling** |
|---|---|---|---|
| P1 | Where the staff-edge pass lives | (a) a monthly branch in `oversight.ts`, called from the planner's hourly duty (`planner.ts:204-212`); (b) a new `staff-edge.ts`; (c) inside the report builder | **(a)** — the alert is oversight, the planner already owns the hourly slot and its AlertOnce cadence (ruling 77), and a report builder must never send alerts |
| P2 | The "one function" ruling 78 demands | (a) extend `book.ts` with an entry-split reader and a per-officer scorecard over one new DAL read; (b) a report-only reader plus a planner-only reader | **(a)** — the sentence 04:2940 forbids two readers; both the scorecard (R1 (f)) and the pass call `houseStaffScorecard(window)` |
| P3 | Who computes `requestedBy` | (a) `houseStakeByMarket` becomes the single producer and `oversight.ts` switches to it; (b) leave oversight's own computation and add a second one for the payload | **(a)** — N1 §9 says the payload is read "in the same call" through R2's reader; oversight keeps only its own "placed before the audit row" predicate |
| P4 | The R9 payload vs the richer reader | (a) reader returns `{yes,no,open,settled,staffChosen{…}}`, the payload writes exactly PLAN §18's shape; (b) write everything the reader knows | **(a)** — PLAN §18 P:806 pins the payload shape; a test asserts the exact key set |
| P5 | Where `houseStakeByMarket` lives | (a) `houseBookStore.stakeByMarket` in the house DAL + `server/house-bot/exposure.ts` wrapper; (b) `market-dal.ts` | **(a)** — it is marker-scoped (I8) and must stay out of engine imports (I2 source pin); both twins, one SQL GROUP BY |
| P6 | A failed exposure read during a resolution | (a) write the zero shape and log; (b) throw | **(a)** — I10: the display and the record may never block a decision. 03 S6 already rules the *display* shows "House stake: — couldn't read" and is never hidden; the audit takes the zero shape with a `houseStakeRead:"failed"` note only if the R7 allowlist permits (else log only) |
| P7 | Report ids and parameters | (a) `house-liquidity` (`?period=YYYY-MM`) + `house-market-statement` (`?marketId=`), with a declared `params` descriptor on the catalogue entry; (b) id-string special-casing in the route | **(a)** — the route validates by declaration, so a third parameterised report cannot forget the validation |
| P8 | Who may download | (a) the existing accounting-view + TOTP gate for both new reports; (b) owner-only | **(a)** for the two catalogue reports (same as every regulator artefact) and **owner-only + `house_bot.exported`** for commit 7's per-bot CSV button. R1 04:1980 names the owner-only rule for the per-bot CSV only |
| P9 | `feeWithheldTzs` | (a) derive from the poll's frozen fee snapshot × the position's share, null where no snapshot exists; (b) keep null everywhere | **(a)**, with null (never 0) and the words "not recorded per stake" wherever it cannot be derived; the book's docstring already promises commit 5 derives it |
| P10 | A marked position with no intent row | (a) count it as `UNKNOWN` in the entry split and print it; (b) fold it into AUTOMATIC | **(a)** — the identity "automatic + targeted + manual = totals" must be provable, and a silent fold would hide a marker written outside the seam |
| P11 | R5 vs G1 field names | (a) R5's (`positions`, `transactions`, `designations[]`, `events[]`); (b) G1's (`housePositions[]`, `houseTransactions{…}`) | **(a)** — PLAN §18 records "G1 = R5 (R5 is the text to build)"; `total`/`truncated` on both lists |
| P12 | Personal reads excluding house | (a) the two DSAR doors exclude, the officer player page reads `db.txn.findByUser` directly and stays byte-identical; (b) exclude everywhere `exportUserData` is called | **(a)** — R5 04:1226-1228 says the officer page output is unchanged; a byte-identical KPI assertion for a non-holder proves it |
| P13 | Personal **positions** in the export (CRA-04 asks; R5 does not) | (a) not built in commit 5; (b) add them | **(a)** — R5 is the sealed text and adding a new personal-data surface is outside it. Record it under "💡 Proposed extra controls" for Ali |
| P14 | `counteredPositionsCount` | (a) distinct `triggerPositionId`s of PLACED COUNTER rows naming the user (targeted included); (b) intent count | **(a)** — N2 §9 says targeted counters count and Enter now stakes have no trigger position; the name says positions |
| P15 | `events[].actor` | (a) `"50pick owner"` when `actorId != null`, `"system"` when null; (b) always "50pick owner" | **(a)** — R5's shape lists both; an engine auto-pause is not a person |
| P16 | Which event kinds the holder sees | (a) `DSAR_HOLDER_EVENT_KINDS` (built, 17 kinds); (b) only N1 §9's four staff-chosen kinds | **(a)** — the constant is the allowlist HB:163 already documents; N1 §9's four are the *staff-chosen* additions to it, not the whole list |
| P17 | `test:erasure` house buckets | (a) five buckets added to §8's sweep + `MUST_HAVE_CONTENT` entries + §11; (b) buckets only | **(a)** — an unread bucket passes silently; the suite's own 8.0b control exists for exactly this |
| P18 | R8's platform blast radius | (a) do both swaps in commit 5 with the source pin; (b) defer `getReportPack` | **(a)** — 04:1305-1310 places both in commit 5; the durable readers already fall back to the ring with no database, so the memory suites are unaffected |
| P19 | Where R8's source pin lives | (a) `test:house-bot-reports`; (b) `test:read-tiers` | **(a)** — it is a house-owned rule with its own positive control |
| P20 | §9 splits scope | (a) all of PLAN §9's rows, additive only, each proven against a no-marker twin; (b) only the rows R3 names | **(a)** — PR's Commit 5 scope says "§9 splits"; the twin discipline is what keeps a statutory number honest |
| P21 | `MoneySummary.house` shape | (a) `{stakes, returned, net, bets, houseShareOfStakesPct}` with `holdPct` unchanged; (b) a separate module | **(a)** — CRA-21 01:2067-2076; there is never a "players-only GGR" figure |
| P22 | The exposure-split bars (R2) | (a) build the reader + tests in commit 5, render in commit 7; (b) build both now | **(a)** — the overview page is commit 7's; a half-built console screen would be a surface nobody can render |
| P23 | Where the R2 copy lives | (a) one pure module `src/lib/house-bot/exposure-copy.ts` used by all eight surfaces; (b) per-surface strings | **(a)** — 03 §3 "admin sentences are built only in one place"; ⚠️ no class-shaped fragments in those strings (03 trap 1) |
| P24 | The admin player chip (03 S7) | (a) build it in commit 5 with the F10 chip; (b) leave it to commit 7 with the console | **(a)** — it renders a fact commit 5 already computes, on a page commit 5 already edits; the chip is shown to every admin and the `Link` to `/admin/house-bots/<id>` only when the route exists (commit 7) — until then, a plain chip |
| P25 | Who sees "of which chosen by you" | (a) the four surfaces N1 §9 names (queue card, ceremony, emergency-void confirm, objection panel); (b) every R2 surface | **(a)** — the admin market page and the bulk summary get the staff-chosen line only |
| P26 | A RED key for commit 5 | (a) no new `red:` key; mutations run from a scratchpad harness as in commits 3–4, plus the existing `red:erasure`; (b) a new `red:house-bot-reports` | **(a)** — PLAN §12 names RED for money/engine/console only (C3-SPEC ruling 17's precedent); every new assertion still gets a mutation |
| P27 | Suite backend | (a) `test:house-bot-reports` runs on both stores through `runTwoStores`; (b) memory only | **(a)** — the book, the entry split and `stakeByMarket` are SQL joins; a memory-only suite would prove nothing about them |
| P28 | The CSV house column and non-owner admins | (a) the column ships on the existing accounting-view CSV and the `house` filter joins `TxnSearchFilters` in both stores, recorded in the `transactions.exported` payload; (b) owner-only CSV | **(a)** — R1 04:1981-1982; the marker is admin data, never public (I8) |
| P29 | The Up & Down digest house split | (a) stays in Commit 4 step 9; (b) move it into commit 5 with the reports | **(a)** — PR moved it into Commit 4 (record 2b); commit 5 must not build a second split |
| P30 | Closing commit 5 before Commit 4 step 9 | (a) build the staff-edge pass against `EngineAlerts`, and close only after step 9's emitter renders its bell and email; (b) close with the alert NOT MEASURED | **(a)** — Ali's rule: a surface not rendered is NOT MEASURED, never passed |

## 8. Guards that will go red, and how to move each honestly

Code anchors as of `08c82f0f`. Run each named suite right after touching its file.

1. **`test:read-tiers` §8.20/§8.21** pin literal expressions inside `reports/catalogue.ts` (`scripts/read-tiers.test.mts:699-707`; anchors `scripts/anchors/read-tiers.anchors.mjs:294-312`): the FIU phone mask and the self-exclusion `hashIdentifier`. A new builder in that file must leave both untouched. §8.19 pins the `player.data_exported` audit on the players page — do not move it. 7.1 (drift ratchet) is an inherited red.
2. **`test:report-parity`** reproduces `summarise` through `moneyForWindow` (`scripts/report-parity.test.mts:84-160`). New `house` fields are additive only; every existing money field must stay identical, proven against a no-marker twin fixture.
3. **`test:product-line`** pins `reports/catalogue.ts` (`scripts/product-line.test.mts:66`): every `listMarkets` call passes an explicit `productLine`. **`test:predictor-count`** covers `buildMatchIntegrity` — its column changes must keep predictor counts as they are (D6).
4. **`test:leaderboard-order`** calls `positionStore.leaderboard(...)` directly (`:129`, `:154`, `:160-164`). Adding `excludeHouse?` must not change the default result on either store; add the option with a default of `false` and a dal-parity case.
5. **`test:two-admin`** `:146-149` reads `market.adjudicated.payload.resolutionAuth`. Adding `houseStake` beside it is safe; changing key order or nesting is not. **`test:officer-conflict`** must stay green: no refusal branch may read `requestedBy` (source pin).
6. **`test:bulk-resolve`** 10.10/10.22 pin the bulk payload bounds (`scripts/bulk-resolve.test.mts:435`, `:487`); the anchors file quotes the dedupe block (`scripts/anchors/bulk-resolve.anchors.mjs:237-239`). Add the house field without splitting those blocks, or re-anchor to the same defect.
7. **`test:feedback-law`** pins `src/components/markets/sell-button.tsx` (`:117`): the new `houseStake` state must still state a reason and a next step (§F4) and must not add a channel.
8. **`test:popup-fit` `:113`** and **`test:unsaved-changes` `:130`** pin `emergency-void-control.tsx` (EXEMPT ① "fields open inside `<Modal>`"); **`test:unsaved-changes` `:153`**, **`test:control-gates` `:182`**, **`test:overdue-format` `:23`** (it imports `humanDuration` from the page) and **`design-gate/eyebrow-roles` `:180-183`** pin `resolver-queue/page.tsx`. Insert the house line without disturbing those shapes, and re-run each.
9. **`test:labels` (`label-lexicon.test.mts:1067`)** allows exactly one lexicon exception on `resolver-queue/page.tsx`; **`test:chip-contract`** and **`test:i18n`** cover the new player chip keys — en/sw/zh, no English enum tokens (§L4), sw/zh not identical to en.
10. **`test:house-bot-rules`**: 11.8 (every quoted `house_bot.*` literal is a `HOUSE_AUDIT` key — `house_bot.exported` already is), 11.22 (`EVENT_KINDS` exactly 30 — **do not add an event kind**; the R1 sections read existing kinds), and the §0 module law (a helper that needs `./rules` lives under `src/lib/server/house-bot/`).
11. **`test:dal-parity`** grows with every new store member (`stakeByMarket`, `entryRows`, the `house` txn filter, `leaderboard({excludeHouse})`, `getAuditForActorDurable({excludeHouse})`'s memory twin). Its source-level check reads `house-bot-dal.ts` and `book.ts` (`scripts/dal-parity.test.mts:46-50`).
12. **`test:guards-exist`** refuses a suite key cited in code before `package.json` has it — add `"test:house-bot-reports"` in the same commit as the first citation. **`test:decomment`** `CARRIER_CEILING = 20` is exact: import `scripts/lib/decomment.mts`, never a new stripper. **`test:red-anchors`** `UNDECLARED_CEILING = 65` is exact.
13. **`test:kyc-copy-truth`** covers the KYC card's copy; **`test:read-tiers` 6.10** pins the reveal payload shape. The "of which 50pick liquidity stakes" line names a count and an amount, never an account.
14. **`test:erasure` / `red:erasure`**: new §8 buckets must be listed in `MUST_HAVE_CONTENT` (`scripts/erasure.test.mts:542-547`) or an unread bucket passes as clean; 8.0c's planted-needle control must stay.
15. **`test:dsar-secrets`** currently has five sections (`scripts/dsar-export-secrets.test.mts`); §5 asserts both doors expose an **identical user field set** — the house section must be added to both doors in the same shape, or §5 goes red for a real reason.
16. **`test:pii-in-logs`**, **`test:orphans`**, **`test:type-scale`** (inherited red 909 vs 908 — never raise a ratchet), **`test:house-page`** and **`test:insights`** pins move when the §9 lines land: read the printed population first, then move the pin.
17. **`test:cert-c1` / `test:cert-c3`**: only if a new `notify*` export or `*Html` template is added. The staff-edge alert reuses `notifyAdminsHouseBotAlert` (Commit 4 step 9) — if it is not built yet, the alert is injected through `EngineAlerts.once` and the registry row is step 9's.
18. **`test:house-bot-seam` §4.3** still allows only `house-bot/fire.ts` to import `placeHouseBet`; no reporting module may import the seam. **I2 source pin:** `exposure.ts`, the report builders and the DSAR projection must not be imported by any engine module.
