# House bots — the authority

> # ⛔ OWNER RULING D20 — HOUSE BOTS ARE ORDINARY PLAYERS IN EVERY REPORT
> **Owner ruling D20 (Ali, 2026-09-17), just below D19, which still binds everything: every report, statutory filing, admin
> count, finance or insights figure and harm or AML detector treats a house bot's account exactly like any player's account,
> and no report, CSV, memo, column, line, chip, tag, alert or record names house bots or splits house money out.** Every
> admin-only house tool is dropped: the house-liquidity report, statement, audit index and CSV (R1, R7), the house lines on
> admin screens (R2), `houseStake` in decision audits (R9), the staff-edge alert, PLAN §9's house lines, memo and exclusions
> (R3), the owner-only internal record with its chip and row tag (R5), and the `leaderboard({excludeHouse})` option with its
> reward walker. Passages below that describe them are marked "⛔ Superseded by D20" in place, never deleted. **Unchanged:**
> the engine, the money rules (cash only, never cashed out, no wagering progress, commission or reward), consent,
> designation, caps and limits, the kill switch, the admin alerts about bot status, D19's absence proofs, the console gate
> on house audit rows, erasure, and commit 7's console for CONTROLLING bots. **Accepted for Ali:** statutory figures
> include 50pick's own house stakes as player activity, and the harm and AML detectors can flag a bot account like any
> player's. The ruling: [`PROGRESS.md`](../plans/house-bots/PROGRESS.md) "OWNER RULING D20" and
> [`C5-D20-REPLAN.md`](../plans/house-bots/C5-D20-REPLAN.md).

> ⛔ **Owner ruling D19 (Ali, 2026-09-16): house bots are never public.** No rulebook, Terms, privacy, FAQ, home or chatbot
> text names them, and the holder sees nothing: a house stake looks exactly like the holder's own bet, no refusal carries
> house wording, and the holder receives no house-bot notice or email of any kind. Every alert goes to admins only.
> Passages below that said otherwise are marked ⛔ with D19 in place, never deleted. The ruling:
> [`PROGRESS.md`](../plans/house-bots/PROGRESS.md) "OWNER RULING D19".

> 🟠 Being built on branch `house-bots`: commits 1–4 of 8 are closed, and commit 5 is in progress under owner rulings D19 and D20.
> ⛔ ~~Nothing is on production.~~ **CORRECTED 2026-09-21 (C5-8): THE CODE IS IN PRODUCTION, THE BEHAVIOUR IS NOT.** `origin/main` carries the `HouseBot*` models, both house
> migrations (applied) and the engine modules, because the platform lane merges this branch's platform-safe work forward. **No house bot has ever staked on production**, and
> the master switch ships OFF (D1). ⚠️ The posture is **ONE money lock plus a kill switch**, not two locks: `HouseBotControl.enabled` is `BOOLEAN NOT NULL DEFAULT false` and is
> the thing every staking path reads (`fire.ts`, `seam.ts` ×2, `planner.ts`, `trigger.ts`); `HOUSE_BOT_ENGINE` is a KILL SWITCH — `houseBotEngineEnabled` returns `env !== "false"`,
> so **unset means the engine starts**. The live Railway service config is **NOT MEASURED** and stays so (ruling 553). Only Ali turns the switch on.

**Authority, in order:** [`04-amendments.md`](../plans/house-bots/04-amendments.md) (its last section, "House bots: amendments N1–N2", is the sealed text) > [`02-sealed-flows.md`](../plans/house-bots/02-sealed-flows.md) / [`03-design-spec.md`](../plans/house-bots/03-design-spec.md) > [`PLAN.md`](../plans/house-bots/PLAN.md). Where any of them disagrees with the code, the code is checked and the document is corrected in the same commit. Where the build stands is [`PROGRESS.md`](../plans/house-bots/PROGRESS.md). The ruling of record is the House bots entry in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md).

**How to read this file**
- A section whose code lands in a later build commit says so: "⏳ Written in commit N", or a "⏳ lands in build commit N" marker. That commit replaces the marker with the text.
- A suite that does not exist yet is named in words ("the engine suite, commit 4"). Only keys that are in `package.json` are written as keys.
- Every closed list and every field table below is copied from `src/lib/house-bot/constants.ts`, `pause-reasons.ts`, `rules.ts` and `clock.ts`, and from the two house migrations. The code is the source. A table that disagrees with it is a defect in this file.

**Contents**
1. Invariants → guards
2. Data model
3. Money seam
4. Engine
5. Caps and limits
6. Eligibility, causes and the auto-pause matrix
7. Console map
8. Reporting
9. Alert matrix
10. Disclosure surfaces
11. Runbook
12. Verification record
13. Accepted risks
14. Programme rules

---

## 1. Invariants → guards

The invariant column is PLAN's wording (I2 with its PLAN §18 amendment). "Guard today" names only keys that exist; the other guards arrive with their commit. A commit-1 key is part of this build's first commit, and §12 records whether it has run.

| # | Invariant | Guard today | Guard to come |
|---|---|---|---|
| I1 | Bot bets go only through the bet service. `placeHouseBet` may only **add** refusals and markers, and only `house-bot/fire.ts` may import it (source pin). | `test:house-bot-seam` (commit 2): the import pin; every house branch in `market-service.ts` within 3 code lines of a declared `// SEAM:` marker; `GATE_PARITY` (both paths refuse alike); every sanctioned change gives a player unchanged output. `red:house-bot-money` puts each defect back. | — |
| I2 | The engine reads only what players can see: pools, status, cutoff/open times, the public Up & Down board (`livePrice`, `openPrice`, targets), and the triggering position plus that account's own positions on that market (anti-abuse). It **never** reads Sentinel fields, staged outcomes, objections, observations or oracle modules, drafts or AI data — except `blackout.ts` and the H3 site, whose only output is `{blocked: boolean}`, and the Up & Down closeness price (04 A15): `ud-price.ts` reads the terminal chart's cached 1-minute vendor bar (never a new paid call) or the latest confirmed observation — the public board's own live price. | `test:house-bot-engine` §14 (commit 4): the price read uses the cache only (no vendor call on a miss), the newest 1-minute bar under 120 s from its open, else an observation quoted under 60 s ago, else nothing. | The info-edge suite, commit 4: an import-graph walker over the engine modules; `designation.ts`, `eligibility.ts`, `blackout.ts` and `ud-price.ts` are exempt by name. |
| I3 | Never bot-vs-bot. Never react to house positions, designated accounts, staff or AGENT accounts. One bot per market, one side per market. | `test:house-bot-migrations` (commit 1): `hbi_counter_anchor_uq` admits one COUNTER per trigger, and `hbt_active_market_uq` one active target per poll. `test:house-bot-money` (commit 2): `OPPOSITE_SIDE`, `OTHER_BOT`, `TRIGGER_BOTH_SIDES`, and house or non-PLAYER money never counted as locked. | The engine suite, commit 4 (the trigger filter). |
| I4 | Exactly once. A durable intent with a stable key `hb:<intentId>` is written **before** the bet. A duplicate fire is a no-op; a lost timer only delays. | `test:house-bot-migrations` (commit 1): `HouseBotIntent_idempotencyKey_check` pins the key to `hb:` + the intent id, and `HouseBotIntent_idempotencyKey_key` / `HouseBotIntent_positionId_key` are unique. `test:house-bot-migrations` §d (commit 1): the memory twin raises the same named unique violations as Postgres, case for case. `test:dal-parity` (commit 1): the twin's unique and CHECK name lists equal the migrations', at source level only. `test:house-bot-caps` (commit 2): the same intent fired three times at once gives one position and two `replayed: true`. | The alert half (one alert per placed intent), commit 4. |
| I5 | Master switch and bot state are read fresh at fire time and authoritatively inside the bet's locks. A failed read means no bet. | `test:house-bot-caps` (commit 2): OFF before a burst → every bet `house_disabled`; OFF between H1 and H4 → refused inside `house:control`; a bot paused under its wallet lock while a claimed bet waits → `house_bot_inactive`. | The engine suite, commit 4 (fire re-reads). |
| I6 | **Every** cap (money and count) is enforced inside the bet's own locks, never only in the engine. | `test:house-bot-caps` (commit 2): every cap code at its boundary, NULL refuses, concurrent bursts stop exactly. `test:house-bot-seam` §5: the declared `H2_ORDER` and cap sequence. | — |
| I7 | House stakes are cash only. No bonus spend, no wagering accrual, no agent commission, no cash-out, no objection standing. | `test:house-bot-money` (commit 2): cash only, no cash-out (d)/(e); `test:house-bot-seam` §6: no wagering reversal or recruiter reward on a marked position, `HOUSE_STAKE_ONLY` objection standing. | ~~The no-reward pin (R4, F9), commit 5.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the reward walker is struck (C5-SPEC rulings 233, 256). The no-reward rule itself stands: it is already built in the money seam and recorded in §14 (R4). |
| I8 | An immutable `houseBotId` marker sits on the Position and on every Transaction of it. ~~Reports filter on the row marker, never on current status.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no report filters or splits on the marker; a house stake is reported as a player's. The marker itself stands, for caps, exports and idempotency (C5-SPEC ruling 232). Levy identity unchanged. The marker never reaches a public payload. | `test:house-bot-migrations` (commit 1): the two marker columns and their partial indexes. `test:dal-parity` (commit 1): the memory position store's full-row write keeps the stored marker and never takes the incoming one, at source level. `test:house-bot-migrations` §d c21 (commit 1): on Postgres and on memory, a full-row write neither drops a marker nor marks an unmarked stake. `test:house-bot-money` (commit 2): the marker on the position, BET_PLACED, WIN payout, VOID, one-sided, emergency and orphan refunds (a player's refund carries none); on Postgres the books balance and the levy identity holds with a house stake in the pool. | The reports suite, commit 5 (absent from every public payload). |
| I9 | Owner self-exclusion, cooling-off, suspension, frozen or missing wallet, own loss limit, password change or role change auto-pause that bot and alert admins. | `test:house-bot-rules` (commit 1): every pause reason has a way out, and any two holder causes cleared in either order leave a step other than Remove at every point. `test:house-bot-designation` (commit 3): each of the five consent-void causes auto-pauses an ACTIVE bot and ends every active target in the wallet transaction; the live causes, the RG backstop and Start's refusals; a planted fingerprint-only predicate is shown to let a voided bot through. | The engine and holder-lifecycle suites, commit 4 (the hook, the sweep and the admin alerts that detect each change). |
| I10 | No officer-conflict lock (2026-07-24 ruling). ~~House exposure is only **displayed** to resolvers.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** house stakes are not displayed to resolvers at all (the R2 lines, C5-SPEC rulings 192–194, are struck); the no-lock ruling stands. | `test:two-admin` and `test:officer-conflict`: a position-holding admin resolves or voids in one action, and no conflict block exists. | ~~The reports suite, commit 5: resolver display, including "of which chosen by you" (risk 20).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck with the R2 display (C5-SPEC rulings 192–194, 196, 198). |

---

## 2. Data model

- **No Postgres enums.** Every status, cause, kind and purpose column is TEXT with a CHECK whose IN-list equals a tuple in `src/lib/house-bot/`, value for value and in the same order (precedent `Transaction.payoutRail`). `test:house-bot-migrations` reads the migration and compares them.
- **Two migrations**, hand-written, re-runnable and expand-only (S1, A23), both timestamped after `20260913120000_kyc_at_withdrawal`, and touching no KYC table. The floor moves with `main`: on 2026-09-14 `main` added `20260914120000_rg_pending_limits_play_clock`, which shared the first house folder's old timestamp and sorted between the two, so both house folders were renamed from `20260914120000`/`20260914120100` to `20260914150000`/`20260914150100`; on 2026-09-15 `main` added `20260915120000_site_visits`, which sorted after both, so they were renamed again to `20260916150000`/`20260916150100` (never applied anywhere but scratch databases). REL-0's migrations diff re-checks that they are still the newest:
  - `20260916150000_house_bot_tables` creates the eight tables below and seeds `HouseBotControl` `global` and `HouseBotRuntime` `global` (`ON CONFLICT DO NOTHING`);
  - `20260916150100_house_bot_markers` adds the `houseBotId` markers, the `User` password-history columns and `PredictionMarket.reopenedAt` / `reopenCount`, all nullable with no default.
- **A23 hand step.** Above 500,000 positions or 1,000,000 transactions, the marker indexes are built `CONCURRENTLY` by hand before the deploy. The markers migration's header holds the exact statements; the preflight and its runbook land in commit 8 (§11).
- **Ids** are minted by the DAL with the prefixes in `HOUSE_ID_PREFIX`: `hb_` bot, `hbi_` intent, `hbe_` event, `hbt_` target, `hbp_` press.

### 2.1 Tables

| Table | Key | What it holds | Retention (A20, DATA-RETENTION §1) |
|---|---|---|---|
| `HouseBot` | `hb_…` | One designation of one account. Label and `labelKey`, note, `status`, `pauseReason` (history only) and `pauseDetail`, `pausedFromStatus`. Consent: `passwordFingerprint`, `verifiedAt/ById`, `consentVoidAt/Cause`, `credentialChangedAt/Via`. Designation and removal: `designatedAt/ById`, `removedAt/ById/Cause/Reason`. Behaviour: `rules` JSON and `rulesVersion`. The typed caps (§5, NULL = not set). Designating the same account again makes a new row. | 7 years from removal, never deleted. Label, note and free-text reasons are pseudonymised on erasure (⏳ lands in build commit 3). |
| `HouseBotControl` | `global` only | The master switch (`enabled`, `switchedAt/ById/Reason`, `offCause`), the global limits (§5), `limitsVersion` and `limitsSchemaVersion`. ~~and `boardDisclosureSentAt` / `boardDisclosureSections`~~ ⛔ **Un-built in C5-5b** (owner ruling D20, `C5-D20-REPLAN.md` ruling 273 (a)): the two Board-disclosure columns and the `recordDisclosure` writer had no reader and no caller, so they are gone from the migration, the schema and both DAL twins. | One fixed row. |
| `HouseBotRuntime` | `global`, `beat:planner`, `bot:<id>`, `engine:<instance>`, `beat:poller:<instance>` | Hot counters kept off the control row and written with `INSERT … ON CONFLICT DO UPDATE`: the hour counter, the rate-limited counter, the sweep watermark and `scopeFrom`, error streaks, bounds and exit-config hashes, beats and clock skew. | Fixed rows overwritten in place. Per-instance rows (`engine:*`, `beat:poller:*`) are deleted after 24 h, because the instance id is random per boot (⏳ lands in build commit 4). |
| `HouseBotAlertOnce` | the throttle key | One row per throttle key (§9.3). An alert is sent only when the claim's `INSERT … ON CONFLICT DO NOTHING RETURNING` returns a row, so two replicas send it once. | 30 days, purged by `retention.purge.daily` in batches of 5,000 (⏳ lands in build commit 4). |
| `HouseBotEvent` | `hbe_…` | The append-only history of every bot and of the control row: `kind` (§2.4), `fromStatus` / `toStatus`, `reason`, `actorId` (null = `system_house_bot`), `marketId`, `payload`, `auditId`. | 7 years, never deleted. `reason` is pseudonymised on erasure (`erasure.ts`, commit 3). |
| `HouseBotIntent` | `hbi_…` | Every decision, placed or not: `kind`, `anchorKey`, market and product line, trigger, side, `stakeTzs`, `dueAt` / `deadlineAt` / `staleAt`, `status` and `reasonCode`, `why` and `decision`, the claim and attempt columns, `positionId`, `idempotencyKey`, `finishedAt`, `alertedAt`. Staff-chosen rows add `requestedById` and `entryCondition` (Enter now) or `targetId` (a targeted COUNTER). | 7 years, never deleted, skipped and expired rows included (PROGRESS W4). |
| `HouseBotTarget` | `hbt_…` | A poll one bot reacts to (N2): `delayMinSec` / `delayMaxSec`, `timingFrom`, `reactTo`, `effectiveFrom` (= `createdAt` + `TARGET_ARMING_SEC`, written from DB `now()` in the insert), `version`, the end and removal columns, and a `snapshot`. Officer ids and public poll fields only. | 7 years, never deleted. Never in the holder's data-rights export. |
| `HouseBotPress` | `hbp_…` | Every officer press for Enter now, a target add, update or remove, and a staff cancel: `actorId` + `submitId` (one press per double tap), `purpose`, `state`, the refusal `code`, `reason`, and the audit lease (`auditId`, `auditClaimUntil`). | 7 years, never deleted. Officer data, never in the holder's export. `reason` is pseudonymised on erasure (`erasure.ts`, commit 3). |

Every house table is on the chain purge's NEVER list (`src/lib/server/chain-purge.ts`, DATA-RETENTION §7.1). This is the chain purge only: `HouseBotAlertOnce` is still purged at 30 days by the retention pass, and per-instance `HouseBotRuntime` rows after 24 h.

⛔ **Until 2026-09-20 that sentence was true only as prose** — `grep -c "HouseBot" src/lib/server/chain-purge.ts` returned **1**, the comment itself, and the only enforcement was a source scan over a hand-written array of six non-house model names. It is now a guarded Prisma client over a **derived** population (name prefix, the soft key `houseBotId`, or an owned relation into the family), so a ninth house table is protected without anyone remembering that file, and the purge **refuses while any intent on the chain's markets is PENDING or CLAIMED** (04 A16; CRA-15's sentence, kept by D20's supersession note). See DATA-RETENTION §7.7 — `src/lib/server/purge-protected.ts`, `npm run qa:purge-protected`.

**Columns added to existing tables**

| Column | Written | Rule |
|---|---|---|
| `Position.houseBotId` | At create only (⏳ lands in build commit 2) | A soft reference with no foreign key. Every update skips it; it never reaches a public payload. |
| `Transaction.houseBotId` | At create only, on every transaction of a marked position (⏳ lands in build commit 2) | As above. ~~Reports filter on it (I8).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no report filters on it (I8). |
| `User.passwordSetAt`, `User.passwordSetVia`, `User.emailSetByOfficerAt` | In the same update as the password hash (registration, the settings change, the reset link, the officer's temporary password), or the officer's email edit (`setUserEmail(…, {byOfficer: true})`). Commit 3; a source pin in `test:house-bot-designation` refuses a new hash writer that sets no history. | `passwordSetVia` is one of `PASSWORD_SET_VIA`. NULL on accounts older than the column; eligibility then falls back to an awaited audit read that fails closed (A4). |
| `PredictionMarket.reopenedAt`, `PredictionMarket.reopenCount` | By `adminReopenMarket`, sanctioned change (r) (⏳ lands in build commit 2) | Read by the information blackout and by A16's reopen detection. |

**Foreign keys**
- There are exactly two, both `ON DELETE RESTRICT`: `HouseBot.userId` → `User`, and `HouseBotTarget.houseBotId` → `HouseBot`. Every other house reference is soft: markets can be purged, and a press naming a missing bot is still recorded, then refused.
- ⛔ **House rows block user deletion, by design** (A20: these are 7-year records). A `User` row that was ever designated cannot be deleted while its `HouseBot` rows exist, and a `HouseBot` row cannot be deleted before its targets. Erasure pseudonymises instead (DATA-RETENTION §2b).
- A local script that wipes users, such as `scripts/chain-purge-drive.mts`, must delete `HouseBotTarget` rows and then `HouseBot` rows first. It gains that step in the commit that first seeds house rows into a shared local database.

### 2.2 Index names

Names are fixed. The N1/N2 sealed names are used verbatim; every other plain or unique index keeps Prisma's default name; a partial index that exists only in SQL keeps its fixed name. Callers tell unique violations apart only by index name, through the DAL's `uniqueViolation(err)`, and an unknown one is rethrown.

**Unique**

| Table | Index | Columns and condition | What it guarantees |
|---|---|---|---|
| `HouseBot` | `HouseBot_userId_live_key` | `(userId) WHERE status <> 'REMOVED'` | One live bot per account. |
| `HouseBot` | `HouseBot_labelKey_live_key` | `(labelKey) WHERE status <> 'REMOVED'` | Labels are unique among live bots, ignoring case (C2). |
| `HouseBotEvent` | `hbe_opener_draw_uq` | `(marketId) WHERE kind = 'OPENER_SIDE_DRAWN'` | A poll's opener side is drawn once, shared by the automated OPENER and Enter now. |
| `HouseBotIntent` | `HouseBotIntent_positionId_key` | `(positionId)` | One intent per position. |
| `HouseBotIntent` | `HouseBotIntent_idempotencyKey_key` | `(idempotencyKey)` | One bet per intent (I4). |
| `HouseBotIntent` | `hbi_counter_anchor_uq` | `(anchorKey) WHERE kind = 'COUNTER'` | One COUNTER per trigger, targeted or not. |
| `HouseBotIntent` | `hbi_fill_opener_anchor_uq` | `(kind, anchorKey) WHERE kind IN ('FILL', 'OPENER') AND status <> 'CANCELLED'` | One FILL and one OPENER per market; a cancelled one can be planned again. |
| `HouseBotIntent` | `hbi_manual_anchor_uq` | `(anchorKey) WHERE kind = 'MANUAL'`, anchor `manual:<requestedById>:<submitId>` | One intent per press. |
| `HouseBotIntent` | `hbi_manual_live_market_uq` | `(marketId) WHERE kind = 'MANUAL' AND status IN ('PENDING', 'CLAIMED')` | One live Enter now per poll. |
| `HouseBotTarget` | `hbt_active_market_uq` | `(marketId) WHERE status = 'ACTIVE'` | One active target per poll. |
| `HouseBotPress` | `hbp_actor_submit_uq` | `(actorId, submitId)` | A double tap is one press. |

**Plain**

| Table | Index | Columns and condition |
|---|---|---|
| `HouseBot` | `HouseBot_userId_idx` · `HouseBot_status_idx` | `(userId)` · `(status)` |
| `HouseBotAlertOnce` | `HouseBotAlertOnce_createdAt_idx` | `(createdAt)`, for the 30-day purge |
| `HouseBotEvent` | `HouseBotEvent_houseBotId_createdAt_idx` · `HouseBotEvent_userId_kind_createdAt_idx` · `HouseBotEvent_kind_createdAt_idx` | `(houseBotId, createdAt)` · `(userId, kind, createdAt)` · `(kind, createdAt)` |
| `HouseBotIntent` | `HouseBotIntent_status_dueAt_idx` · `HouseBotIntent_houseBotId_createdAt_idx` · `HouseBotIntent_triggerUserId_createdAt_idx` · `HouseBotIntent_marketId_status_idx` · `HouseBotIntent_status_finishedAt_idx` | `(status, dueAt)` · `(houseBotId, createdAt)` · `(triggerUserId, createdAt)` · `(marketId, status)` · `(status, finishedAt)` |
| `HouseBotIntent` | `hbi_status_stale_idx` | `(status, staleAt)` |
| `HouseBotIntent` | `HouseBotIntent_finishedAt_unalerted_idx` | `(finishedAt) WHERE status = 'PLACED' AND alertedAt IS NULL`, the alert outbox repair (A8) |
| `HouseBotIntent` | `hbi_target_status_idx` | `(targetId, status) WHERE targetId IS NOT NULL` |
| `HouseBotIntent` | `hbi_staff_bot_finished_idx` · `hbi_staff_finished_idx` | `(houseBotId, finishedAt)` · `(finishedAt)`, both `WHERE (kind = 'MANUAL' OR targetId IS NOT NULL) AND status = 'PLACED'`, for the staff-chosen caps |
| `HouseBotTarget` | `hbt_market_idx` · `hbt_bot_status_idx` · `hbt_bot_created_idx` | `(marketId)` · `(houseBotId, status)` · `(houseBotId, createdAt)` |
| `HouseBotPress` | `hbp_bot_created_idx` · `hbp_state_created_idx` | `(houseBotId, createdAt)` · `(state, createdAt)` |
| `Position` | `Position_placedAt_id_idx` | `(placedAt, id)`, the sweep keyset; built after the column, under the same ACCESS EXCLUSIVE lock (a SHARE taken first would deadlock with an in-flight bet) |
| `Position` | `Position_houseBotId_placedAt_marked_idx` · `Position_marketId_marked_idx` · `Position_houseBotId_open_idx` | `(houseBotId, placedAt)` · `(marketId)` · `(houseBotId) … AND status = 'OPEN'`, each `WHERE houseBotId IS NOT NULL` |
| `Transaction` | `Transaction_createdAt_marked_idx` | `(createdAt) WHERE houseBotId IS NOT NULL` |

### 2.3 CHECK constraints

Every CHECK is named `<Model>_<field>_check` (the target delays are split into `HouseBotTarget_delayMinSec_check`, `HouseBotTarget_delayMaxSec_check` and `HouseBotTarget_delay_order_check`). Besides the closed lists in §2.4, they hold:
- **Rails.** Every TZS cap and limit is 0–1,000,000,000, and an intent's `stakeTzs` is 1–1,000,000,000. Counts: `freqMinGapSec` 0–86,400, `freqMaxPerHour` 1–60, `freqMaxPerDay` 1–1,440, `freqMaxPerMarket` 1–6, `capStaffChosenPerDay` 1–50, `targetsMaxActive` 1–50, `gMaxBetsPerMinute` 1–20, `gMaxBetsPerDay` 1–28,800, `gCounterPerPlayerPerDay` 1–1,440, `gCapStaffChosenPerDay` 1–200, `gTargetsMaxActive` 1–200, `gStaffChosenMaxCounterpartyShare` 10–100, `maxDesignatedBots` 1–20 (default 5), `bellAlertsPerHour` 0–60 (default 20), target delays 5–600 with minimum ≤ maximum. The forms are stricter than these rails (§5).
- **Text.** Label 2–32 characters and a non-empty `labelKey`; note, `removedReason`, `switchedReason`, event `reason` and press `reason` at most 300 characters.
- **Pairs.** A PAUSED or AUTO_PAUSED bot has a `pauseReason`. `credentialChangedAt` and `credentialChangedVia` are set together, as are `consentVoidAt` and `consentVoidCause`. A bot is REMOVED exactly when `removedAt` and `removedCause` are set. A target is ENDED exactly when `endedAt` and `endCause` are set, and REMOVED exactly when `removedAt` and `removedById` are set. A press is REFUSED exactly when it has a `code`, and only an ENTER_NOW press with an intent is ever QUEUED.
- **Intent shape.** Exactly the MANUAL rows carry `requestedById` and `entryCondition`. `targetId` appears only on a COUNTER. MANUAL is polls only. A COUNTER's `anchorKey` is its trigger position id; a FILL or OPENER's is its market id; a MANUAL's is `manual:<requestedById>:<uuid>`. `idempotencyKey` is `hb:` + the intent id. A PLACED row has a `positionId`.
- **Rows and keys.** The control row's id is `global`; a runtime key is `global`, `beat:planner` or starts `bot:`, `engine:` or `beat:poller:`, and its counters are ≥ 0; a target's `effectiveFrom` ≥ `createdAt` and `version` ≥ 1; a press `submitId` has the shape of a UUID.
- `User_passwordSetVia_check` is added inside a `DO` block that checks `pg_constraint` first, so a second apply never stops on "already exists".

### 2.4 Closed lists

| Column | Tuple (file) | Values, in CHECK order |
|---|---|---|
| `HouseBot.status` | `BOT_STATUSES` (`constants.ts`) | ACTIVE, PAUSED, AUTO_PAUSED, REMOVED |
| `HouseBot.pauseReason` | `PAUSE_REASONS` (`pause-reasons.ts`) | the reasons in §6.4, in that order |
| `HouseBot.pausedFromStatus` | `PAUSED_FROM_STATUSES` (`constants.ts`) | ACTIVE, PAUSED |
| `HouseBot.credentialChangedVia` | `CREDENTIAL_CHANGED_VIA` (`pause-reasons.ts`) | SELF_CHANGE, RESET_LINK, OFFICER_TEMP, UNKNOWN |
| `HouseBot.consentVoidCause` | `CONSENT_VOID_CAUSES` (`pause-reasons.ts`) | SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW |
| `HouseBot.removedCause` | `REMOVE_CAUSES` (`pause-reasons.ts`) | MANUAL, ACCOUNT_CLOSED, SUNSET |
| `HouseBotControl.offCause` | `OFF_CAUSES` (`constants.ts`) | MANUAL, GLOBAL_LOSS_STOP, ENGINE_FAULT, ENGINE_ERRORS, SUNSET |
| `HouseBotRuntime.key` | `RUNTIME_KEY_EXACT`, `RUNTIME_KEY_PREFIXES` (`constants.ts`) | global, beat:planner; prefixes bot:, engine:, beat:poller: |
| `HouseBotEvent.kind` | `EVENT_KINDS` (`constants.ts`) | DESIGNATED, VERIFIED, STARTED, PAUSED, AUTO_PAUSED, RULES_SAVED, REMOVED, SWITCH_ON, SWITCH_OFF, LIMITS_SAVED, OWNER_MONEY, CREDENTIAL_CHANGED, HOLDER_CAUSE_ADDED, CONSENT_VOIDED, HOLDER_AGAINST_BOT, HOLDER_EMAIL_CHANGED, HOLDER_2FA_ON, HOLDER_2FA_OFF, PENALTY_BOXED, REIMBURSEMENT_RECORDED, BOARD_DISCLOSURE_RECORDED, SUNSET, ENTER_NOW_PREVIEWED, ENTER_NOW_REQUESTED, OPENER_SIDE_DRAWN, TARGET_ADDED, TARGET_UPDATED, TARGET_REMOVED, TARGET_ENDED, STAFF_INTENT_CANCELLED |
| `HouseBotIntent.kind` | `INTENT_KINDS` (`constants.ts`) | COUNTER, FILL, OPENER, MANUAL |
| `HouseBotIntent.status` | `INTENT_STATUSES` (`constants.ts`) | PENDING, CLAIMED, PLACED, SKIPPED, EXPIRED, FAILED, CANCELLED (live: `LIVE_INTENT_STATUSES` = PENDING, CLAIMED) |
| `HouseBotIntent.productLine` | `INTENT_PRODUCT_LINES` (`constants.ts`) | MARKET, UPDOWN |
| `HouseBotIntent.side` | `INTENT_SIDES` (`constants.ts`) | YES, NO |
| `HouseBotIntent.entryCondition` | `ENTRY_CONDITIONS` (`constants.ts`) | OPENER, THIN |
| `HouseBotTarget.productLine` | `TARGET_PRODUCT_LINES` (`constants.ts`) | MARKET |
| `HouseBotTarget.status` | `TARGET_STATUSES` (`constants.ts`) | ACTIVE, ENDED, REMOVED |
| `HouseBotTarget.timingFrom` | `TIMING_FROM` (`constants.ts`) | STAKE, EXIT_CLOSE |
| `HouseBotTarget.reactTo` | `REACT_TO` (`constants.ts`) | FIRST, EVERY |
| `HouseBotTarget.endCause` | `TARGET_END_CAUSES` (`constants.ts`) | DONE, MARKET_CLOSED, CUTOFF_PASSED, MARKET_REOPENED, MARKET_GONE, OUT_OF_SCOPE, INFO_BLACKOUT, BOT_REMOVED, SUNSET, VETOED, CONSENT_VOID |
| `HouseBotPress.purpose` | `PRESS_PURPOSES` (`constants.ts`) | ENTER_NOW, TARGET_ADD, TARGET_UPDATE, TARGET_REMOVE, STAFF_CANCEL |
| `HouseBotPress.state` | `PRESS_STATES` (`constants.ts`) | CHECKING, REFUSED, QUEUED, DONE |
| `User.passwordSetVia` | `PASSWORD_SET_VIA` (`constants.ts`) | REGISTRATION, SELF_CHANGE, RESET_LINK, OFFICER_TEMP, REHASH |

- ⛔ **The event-kind CHECK cannot grow later.** Commit 1 owns the only two house migrations, so every kind a later commit writes is already in the list. SUNSET is one global event with no `houseBotId`, written by the sunset script; each bot's own record of a sunset is its REMOVED event with `removedCause` SUNSET.
- ~~**What a holder's data-rights export may show** is an allowlist, `DSAR_HOLDER_EVENT_KINDS`: DESIGNATED, VERIFIED, STARTED, PAUSED, AUTO_PAUSED, RULES_SAVED, REMOVED, CREDENTIAL_CHANGED, HOLDER_CAUSE_ADDED, CONSENT_VOIDED, HOLDER_2FA_ON, HOLDER_2FA_OFF, HOLDER_EMAIL_CHANGED, ENTER_NOW_REQUESTED, TARGET_ADDED, TARGET_REMOVED, TARGET_ENDED. Each is rendered as `{kind, at, actor}` only, with no reason and no market id, for the holder's own bots (⏳ lands in build commit 5). PENALTY_BOXED belongs to the trigger player's export only. A kind added to `EVENT_KINDS` stays out of the holder's export until someone decides it belongs.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no export or record renders these kinds. D19 keeps both releasable data-rights doors free of house data, for the holder and for a trigger player (C5-SPEC rulings 168, 239), and the owner-only internal record that ruling 238 would have governed with this list is struck (rulings 236–238). `DSAR_HOLDER_EVENT_KINDS` itself is commit 1 code, unchanged by this marking.

---

## 3. Money seam

A house stake is `placeHouseBet(botUserId, {marketId, side, stake, idempotencyKey}, {botId, intentId})` in `market-service.ts`. It runs the **same** function a player's bet runs, `buyPositionInner(userId, opts, ctx)`, with a house bet context (`BetContext`, 04 A7). The house gates live in `src/lib/server/house-bot/seam.ts` and are called only from anchored sites; they can only add a refusal (I1). The engine's `fire.ts` (commit 4) is the only file allowed to import `placeHouseBet`.

### 3.1 Order of checks for a house stake

| Step | Where | What refuses |
|---|---|---|
| H0 | First, before any other gate | The key must be `houseIntentKey(intentId)` and no session clock may ride along → `house_key_mismatch`. **Pre-lookup:** the key already placed this bot's stake → the original is returned with `replayed: true`; a stake by another user or bot → `house_key_mismatch`. **The intent is loaded by id with no status filter**: missing, or a different bot, holder, market, side or stake → `house_key_mismatch`. A cancelled or re-queued row goes on and ends `house_intent_superseded` at `markPlaced`. |
| H1 | Pre-lock, fresh | Unreadable control or bot → `house_gate_unreadable` (BUSY). Switch off → `house_disabled`. Bot not ACTIVE or not this holder's → `house_bot_inactive`. |
| — | The player's gates, unchanged | Rate limit, maintenance, self-exclusion and cooling-off, account status, market status and close, stake bounds (`stakeBoundsForMarket`), side. The session time limit is skipped for a house stake (A7 ruling). |
| H2 | Inside `wallet:<botUser>`, after the wallet and the holder's own loss limit | In declared order (`H2_ORDER`): **standing** (RG timers and status, as the player path) · **role** ≠ PLAYER → `house_account_ineligible` · **consent**: fingerprint matches and no void newer than the last verification, else `house_consent_stale` · **cash**: balance < stake → `house_cash_only` · **conflicts**: the holder's own OPEN position → `OWNER_POSITION`, a house position on the other side → `OPPOSITE_SIDE` · **money caps** STAKE_MIN, STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE · **staff-chosen** (MANUAL or a targeted COUNTER) STAFF_CHOSEN_PER_DAY, STAFF_CHOSEN_DAILY_STAKE, TARGET_ONCE · **rate** PER_MARKET_COUNT (terminal, checked first in its group), MIN_GAP, PER_HOUR, PER_DAY. |
| — | Funding | A house stake is cash only by construction: the whole stake is real money, the bonus part is 0. |
| H3 | Inside `market:<id>`, after the closed re-check | The raw product line not in `HOUSE_PRODUCTS` → `house_product_not_allowed`. An Up & Down market whose round lock (open + duration, or the market close) has passed, or that has no round → `house_round_locked`. Staff-chosen rows on a blacked-out market → `house_info_blackout`. Another bot holds an OPEN position here → `OTHER_BOT`. All bots' open stake + this > `gCapPerMarketTzs` → GLOBAL_PER_MARKET. **Mode condition** (from the claimed row): COUNTER — trigger no longer OPEN → `house_trigger_gone`; trigger account on the bot's side → `TRIGGER_BOTH_SIDES`; `rawPool(botSide) + stake` > locked opposite money (`lockedA15` untargeted, `locked` targeted) → `house_condition_gone{COUNTER}`. FILL — against `locked`. OPENER and MANUAL OPENER — both pools must be 0. MANUAL THIN — against `locked`, then counterparty concentration: share limit not set, or the top account's share above it → `house_counterparty_concentration`. A share limit that is not set also refuses a MANUAL OPENER (`house_counterparty_concentration`): clearing it turns Enter now off for both entry conditions (MON-14). |
| H4 | Inside `house:control`, the innermost lock, wrapping the money writes | Control re-read: switch off → `house_disabled`. GLOBAL_DAILY_STAKE, GLOBAL_LOSS_PROJECTED, GLOBAL_EXPOSURE, GLOBAL_BETS_PER_MINUTE, GLOBAL_BETS_PER_DAY. COUNTERPARTY_COUNT / COUNTERPARTY_TZS — a COUNTER is charged to its trigger account; a MANUAL THIN is attributed pro rata to every opposite account holding ≥ 25% of the locked money. GLOBAL_STAFF_CHOSEN_PER_DAY / _DAILY_STAKE. Then `staleAt` on the database clock (`clock_timestamp()`): a CLAIMED row past it → `house_intent_stale`. |
| H5–H9 | The money writes | `markPlaced` is the first money statement: no CLAIMED row → the writes roll back → `house_intent_superseded`. The Position and the BET_PLACED transaction carry `houseBotId`. No wagering is recorded. The one `market.position.opened` audit row gains `houseBotId` and `intentId`. No bet receipt, push or email. No recruiter prize. Pools, odds, `predictorCount` and the live balance event are unchanged (D6). |

Every cap that is **not set refuses** (§5.1). Every read in H2–H4 is a plain SELECT with no row lock a player's bet could queue behind (04 A9). All but two run on the lock's transaction: H2's **standing** group reads `isLockedOut(userId)` and `db.user.findById(userId)` on the pool, as the player path does, because neither takes a transaction today. Each is one indexed primary-key read; an exhausted pool would make that bet wait while it holds `wallet:<botUser>` (only the bot's own wallet), not `market:<id>`.

### 3.2 Locks and timeouts (04 A9)
- Lock order `wallet:<botUser>` → `market:<id>` → `house:control`. Because every lock joins the outer transaction, `house:control` is held until the wallet lock's transaction commits.
- The house branch sets `lock_timeout = 2s` (`HOUSE_BET_LOCK_TIMEOUT`) on its transaction before the market lock, so a house bet waits at most 2 s on `market:<id>` or `house:control`; 55P03 comes back as BUSY, never a failure. A player's bet takes no timeout.
- Admission never queues a house stake (`withAdmission(fn, {maxWaitMs: 0})`): a saturated platform sheds the house first.
- Switching OFF never waits on `house:control`: it is written first, in autocommit, and H4's re-read makes it binding for any bet not yet holding the lock (commit 4 builds the drain).

### 3.3 Locked money: `lockedForHouse` (N1 §4.1)
`src/lib/server/house-bot/pools.ts` → `houseSeamStore.lockedPool`, one SQL statement (memory twin in the DAL). A stake counts as locked only when its exit window (`exit-window.ts`, the same formula `cashOutValue` offers) closed at least `LOCK_MARGIN_MS` (7 s) ago on the database clock, and only when its account is a PLAYER, holds no live bot, is not penalty-boxed today, and was not recruited by a live bot's holder. `lockedA15` is the one unfiltered, unmarginned column, for the untargeted COUNTER only. Raw pools stay raw.

### 3.4 The information blackout (N1 §3)
`src/lib/server/house-bot/blackout.ts`, output `{blocked}` only. A LIVE poll is blocked for Enter now and targeted reactions while any of `sentinelOutcome`, `sentinelConfidence`, `sentinelDetermined`, `sentinelClosedAt`, `resolvedOutcome`, `resolutionStage1By` is set, while `resolveClaimedAt` is younger than `RESOLVE_CLAIM_TTL_MS`, or once `reopenedAt` is set. Automated kinds are not blacked out.

### 3.5 Sanctioned changes to the player path
With a null marker, each gives a player exactly what they had before; the letter is PLAN §3's, 04 A18's or N1 §2's.

| Change | What it does | Where |
|---|---|---|
| (b) | A replayed idempotency key that belongs to another account's bet refuses instead of returning that bet as this caller's receipt: a player gets `idempotency_key_conflict`; a house stake whose key belongs to another user or another bot gets `house_key_mismatch`. | `buyPositionInner` replay |
| (c) | `buyPositionAction` refuses a key starting `hb:` with `idempotency_key_conflict`. | `app/markets/actions.ts` |
| (d) | `cashOutValue` takes `houseBotId`; a house position is not sellable, and reads as a closed exit (`WINDOW_PASSED`, C4 ruling 147 — no caller can tell it apart, D19c). Output for every player position is byte-identical to the golden grid captured before the change. | `market-service.ts`, both page callers |
| (e) | `cashOutPosition` refuses a house position with the closed exit window's own refusal, word for word (`exit_window_closed`, code `SELECTION_CLOSED`; C4 ruling 147). The house refusal reasons are server-only `HouseSeamReason`s, never in the client-bundled registry or dictionary (ruling 148). | `market-service.ts` |
| (f)/(n) | Objection standing: a user whose only positions on the market are house-marked → `HOUSE_STAKE_ONLY` (server-only); own plus house stays eligible. The page shows the neutral state `NOT_ELIGIBLE` ("You can’t object to this result. If you have a concern, contact support.") and the filing path answers with its generic line (C4 ruling 146, D19c). | `objections-service.ts`, market page, resolution panel |
| (g) | Wagering reversal is skipped for marked positions in settlement, emergency void and orphan repair (A17); `onRecruitBet` and `onRecruitSettlement` take a required `houseBotId` and return on a marked position. | `market-service.ts`, `affiliate-service.ts` |
| (j) | `replayed: true` on both replay paths. | `buyPositionInner` |
| (k) | `exitWindowClosesAt` extracted into `src/lib/exit-window.ts`; `graceMs > 0` kept (A14). | `market-service.ts` |
| (h) | ⛔ **REMOVED by D19c (2026-09-16): a holder's outcome notice is byte-identical to any other player's.** (Superseded:) The liquidity label ("50pick liquidity stake", en/sw/zh) was appended to a holder's outcome notice for a house stake: WIN, LOSS, VOID and orphan refunds, one-sided, emergency cancel, the four Up & Down rows, and the verdict notice. A holder whose every position on the market is house-marked is not invited to object. Selection closed splits into a labelled house notice (label in the title too, its own push tag `selection-closed-house:<marketId>`) and a personal notice whose figures exclude house money. No per-stake email is sent for a marked position (04 F6). | `notification-service.ts`, `market-service.ts` |
| (m) | The comment side chip ignores marked positions (`commentSideFor`, `src/lib/comment-side.ts`). | `app/markets/actions.ts` |
| (p) | `stakeBoundsForMarket(market)` extracted with identical output. | `market-service.ts` |
| (r) | `adminReopenMarket` stamps `reopenedAt` (never cleared) and `reopenCount`. | `market-service.ts` |
| Propagation | The marker is copied onto WIN payouts, one-sided, VOID, emergency-void and orphan refunds, and cash-out transactions. | `market-service.ts` |

⏳ Moved to commit 4, recorded in PROGRESS: (a) the post-commit hook call site (its only reader is the engine), ~~the Up & Down daily digest's house split (no Up & Down house stake can exist before the engine; Enter now is polls only),~~ and the per-bot and global usage EXPLAIN pins (A24). ⛔ **Superseded by D19 (Ali, 2026-09-16):** the digest's house split is struck and was never built (C5-SPEC ruling 235, L40): the Up & Down digest carries no house line or label; what remains is F6's email rule, under which a digest day whose rounds are all house-marked sends no email (checkpoint C5-7). ~~⏳ Commit 5: (i) the holder chip and (o) the activity-feed chip.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** neither chip is built; a house stake looks exactly like the holder's own bet on every screen and in the activity feed (C4 rulings 143–158, C5-SPEC ruling 253).

### 3.6 Registries
- **`BET_PATH_REASONS`** (`src/lib/house-bot/bet-path.ts`) lists every refusal the bet path can return to a house stake; `test:house-bot-seam` reads the bet-path sources and fails in both directions.
- **`GATE_PARITY`** (`scripts/lib/house-bot-gate-parity.ts`, typechecked) has one row per reason: a fixture proving `placeHouseBet` and `buyPosition` refuse alike, or a stated exemption.
- **SEAM sites** (`scripts/anchors/house-bot-seam.anchors.mjs`): every house branch in `market-service.ts` — any `ctx.kind` use, a `"house"` comparison, or a condition on `houseIntent`, `housePool`, `housePosition` or `houseBotId` — sits within the first three code lines under a `// SEAM:<name>` marker, read on decommented code. The markers are exactly the declared list (38), and each marker's window touches house state.
- **Failure reasons:** ~~every `house_*` reason and~~ `idempotency_key_conflict` is registered in `failure-reasons.ts` with en/sw/zh copy (sw/zh drafted, native review); `FailureDetail` gains `cap`, `conflict` and `condition`. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the 18 `house_*` reasons and their sentences left the player registry and the dictionary: they are the server-only `HouseSeamReason`, and the console reads them through the engine's server-side copy (C4-SPEC ruling 148). `idempotency_key_conflict` names nothing and stays a player reason; `cap`, `conflict` and `condition` are documented in `failure-reasons.ts` as server-only.

---

## 4. Engine

✅ **Built in commit 4** (§5 steps 1–11; rulings 29–163 in `plans/house-bots/C4-SPEC.md` §6). The timings the engine reads are fixed in `src/lib/house-bot/constants.ts`, so it arrives to pinned values. The relationships between them are the design, and `test:house-bot-rules` pins the first four:
- `LOCK_MARGIN_MS` = `MAX_TOLERATED_SKEW_MS` + `CLAIM_SKEW_GUARD_MS`. It applies to `lockedForHouse` (Enter now, FILL and every targeted COUNTER), never to the untargeted COUNTER (§5.7).
- `TARGET_ARMING_SEC` ≥ the largest tolerated skew + 2 s + the sweep's age filter (`SWEEP_MIN_AGE_MS`). Poll triggers are decided only in the sweep, so no trigger at or after a target's `effectiveFrom` can be decided before the target row exists.
- `SWEEP_LOOKBACK_MS` ≥ 60 s.
- `CLAIM_TTL_SEC` ≥ the admission wait + 4 × (the lock's pool wait + its transaction timeout) + 5 s, so a fire that retries its lock four times still owns its row.
- `staleAt` = `dueAt` + `STALE_AFTER_SEC`, with one tolerance each for automatic rows on Up & Down, automatic rows on polls, a targeted COUNTER and an Enter now press. No stake lands after its `staleAt`: the seam re-reads it on the database clock inside `house:control`.

**Enter now's inputs and holding rule** (commit 4, §5 step 4; `test:house-bot-engine` §15 on both stores; C4-SPEC rulings 58–62):
- `server/house-bot/enter-now.ts` `loadEnterNowInput(botId, marketId, {actorId, drawnFor})` reads every input of the pure `enterNowDecision` fresh, **one statement at a time** (a preview never takes a burst of pooled connections from players' bets). The order: the bot, the market view (A13), **the blackout first**, the rules through `rules-context.ts` `loadParseContext()`, `lockedForHouse` on the view's frozen exit rates, the opener draw (only when both raw pools are 0 and the market is not blacked out), then the seam's own usage reads (`botUsage`, `marketUsage`, `houseDayBook`, `houseOpenExposure`, `staffChosenPlacedToday`, `counterpartyToday`), the placement instants (`houseSeamStore.placedTimes`: 86,400 s for the bot, 60 s for the platform), the control row and `stakeBoundsForMarket`, all on the database clock. It refuses only BOT_MISSING, MARKET_MISSING, RULES_FROM_FUTURE and RULES_REVIEW; the caller runs every other refusal first.
- `marketHeld(botId, marketId, {ignoreIntentId})` is the one holding rule for the picker, the preview, the press and fire, answering in N1 §6 refusal 15's order: OWNER_POSITION (the holder's own OPEN stake); OTHER_BOT (another bot's live intent, ACTIVE target or OPEN house position); OWN_INTENT (this bot's live intent, the row being fired excepted); PER_MARKET_COUNT, counted as H2 counts it — this bot's marked positions here in any status, and a count that is not set holds the market.
- `server/house-bot/opener-side.ts` `openerSide` writes one `OPENER_SIDE_DRAWN` event per market as its own autocommit statement (it throws inside a lock); every later call — another preview, another bot, the planner — reads that side, `drawnFor` and `drawnAt` back.
- `rules-context.ts` keys chains `<assetId>:<durationMinutes>` for every chain of an enabled asset; a chain saved by symbol, or on a disabled asset, reads as stale.
- UX-15's worked example runs on a real poll on both stores, and the decided NO 9,000 goes through `placeHouseBet` unchanged.

**Fire and the poller** (commit 4, §5 step 4; `test:house-bot-engine` §16 on both stores; C4-SPEC rulings 63–70):
- `server/house-bot/fire.ts` `fireClaimedIntent(row, {me, alerts})` is the only caller of `placeHouseBet`. It throws inside a lock, a lock's transaction or an admission slot (MON-13), and holds the row in `inFlight` with a 30 s heartbeat until it returns. It re-checks, in order: master, maintenance, bot, holder, rules, market, A12 scope and product policy, the bot's saved scope (OUT_OF_SCOPE when an owner narrowed it after the decision), A16 (reopened, chain stopped), the deadline against the fresh cutoff, the schedule (never for Enter now), the target (removed, vetoed, react-to-first), the blackout for staff-chosen rows, a COUNTER's trigger, Up & Down closeness, and for Enter now the holding rule and a re-run decision. A re-check that finds what a bet-path refusal names is applied as that refusal through `applyOutcome`, so a pre-check and the seam write the same row, audit and alert. Rules from a newer build requeue the row; outdated or invalid rules pause the bot with the field.
- The stake is re-cut per kind before the bet — an untargeted COUNTER against `lockedA15`, a targeted COUNTER and FILL against `locked`, Enter now by its re-run decision — and a smaller stake is written back to the claimed row first; a stake never grows. Nothing left to add to → CONDITION_GONE; less than the minimum → STAKE_BOUNDS_CHANGED; a row another worker now holds → nothing written.
- `server/house-bot/worker.ts` `pollerPass`: the A24 claim gate, `claimBatch`, a beat only after a claim, then the claimed rows fired together. `requeueMine`, for SIGTERM, returns this instance's claims to PENDING except the ones still in flight (`houseBotIntentStore.releaseClaims`).

**The planner** (commit 4, §5 step 5; `test:house-bot-engine` §17 on both stores; C4-SPEC rulings 71–100, 111–112):
- `server/house-bot/planner.ts` `plannerPass(ctx, {alerts})` runs every 15 s on the one leader (the engine takes the 45 s lease; the planner never takes it again). Its order: deadline (PENDING rows, and CLAIMED rows whose claim has expired — a live claim is never expired) · STALE, before POISON · POISON (one `house_bot.poison` audit per pass, one alert per intent) · press INTERRUPTED then DONE · the press audit lease repair · the A8 alert repair · `endTargets` · the A16 PENDING sweep · rules-parse outcomes · F5 `revalidateLive` · realised-loss stops · WALLET_MISSING · FILL/OPENER planning (master ON only); then once a minute the oversight passes, and hourly the summaries and the instance-row prune. Every pause and stop runs before anything plans a stake. Each duty runs in its own try/catch, so one failure never skips the next; `beat:planner` is written only when expiry, STALE, POISON and the loss stops all ran.
- **Scope start.** A NULL `scopeFrom` is out of scope, never "no bound": nothing is decided or planned before switch-on (`global.scopeFrom`, written by `houseBotControlStore.switchOn` in the same transaction) or before the bot's Start (`bot:<id>.scopeFrom`).
- **`endTargets`** runs whatever the master says. First matching cause: DONE (react-to-first and a PLACED reaction) · MARKET_GONE · MARKET_CLOSED · MARKET_REOPENED · INFO_BLACKOUT (`blackout.ts {countResolveClaim:false}` — a young resolve claim alone never ends a target) · OUT_OF_SCOPE (A12 or F1; and, when the rules parse, polls off or the category no longer listed) · CUTOFF_PASSED (no reactable stake left, or `now ≥ lastReactableStakeAt + SWEEP_LOOKBACK_MS`). Unparseable rules, `targeting.enabled=false` and a non-ACTIVE bot leave a target ACTIVE and inert. Each end writes one `TARGET_ENDED` event `{targetId, endCause}`; no audit, no alert.
- **A16 PENDING sweep.** PENDING rows on a missing market → SKIPPED(MARKET_GONE), not LIVE → SKIPPED(MARKET_NOT_LIVE), a stopped chain or disabled asset → SKIPPED(CHAIN_NOT_RUNNING); on a reopened market the automatic rows → SKIPPED(MARKET_REOPENED), and staff-chosen rows are left for fire's blackout.
- **Rules outcomes (F4).** Outdated or invalid rules pause an ACTIVE bot with the field; the engine never converts or writes rules. Rules or limits from a newer build are never a pause: the idle start is kept on the runtime row, one alert after 10 minutes, and while limits are ahead nothing is planned and fire hands rows back to PENDING.
- **F5 `revalidateLive`** (ACTIVE bots, every pass): a saved value that leaves the bot unable to place any bet under the live stake limits or the `bet.place` min-gap floor pauses it RULES_INVALID with the field (A7's stake-min rule included); a maximum that only narrows sends one `bounds-clamp` alert per limits hash; an Enter now stake or staff-chosen daily cap under the live minimum sends one `bounds-cant-fit` alert. The hash is kept on the `global` runtime row.
- **Loss stops (PLAN §3).** A bot whose REALISED loss for today's EAT cohort reaches its daily loss cap is AUTO_PAUSED(DAILY_LOSS_STOP), audited `house_bot.loss_stop`, whatever the switch says. The global realised loss at the global cap switches house bots OFF(GLOBAL_LOSS_STOP) once — the same A19 order as any engine switch-off, its own `switchedOff` alert (never the security channel).
- **WALLET_MISSING.** A bot with open house stakes whose holder wallet is missing is paused, with a daily `settle-blocked` alert while the stakes stay open.
- **FILL and OPENER** are planned from `houseSeamStore.plannableMarkets` (ids and cutoffs only: LIVE, not reopened, not demo, in A12 scope, OPENER on two empty pools, never a market an officer's cancel closed), a page of 200 at most five times per kind per pass, the cursor kept on the engine state. FILL is planned only when its due time is within the next pass, so it sizes against pools that are nearly final. Per market the covering bots go in PLAN §4.4 order and the first row wins; the holding rule and the money-cap pre-check (`cap-precheck.ts`, the seam's own caps at the smallest stake) are read only for a bot that would write a row. An OPENER's side is drawn once, only for a row that will be written, naming that bot.
- **Oversight** (`oversight.ts`, only the planner imports it): a market holding a staff-chosen stake from the last 30 days that is VOIDED or reopened after the stake → one `staff-stake-voided` alert (its time from the audit row that voided it, or no time — never the moment the pass noticed); the officer who chose the stake also deciding the market → one `staff-stake-self-decided` alert. Records only; nothing is refused. ~~The monthly staff-edge alert lands in commit 5 with R1's scorecard.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no staff-edge alert and no R1 scorecard (C5-SPEC rulings 202, 218–223).
- **Summaries.** Hourly, while the EAT minute is 1–58, for the hour just ended: the admins' summary when automatic stakes passed the per-bet bell cap, ~~and each holder's when their stakes passed their notice cap (0 = summary only)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder summary and no holder notice cap; the holder is told nothing (C4 rulings 149, 153), so the admins' summary is the only one. Keys name the hour summarised (`previousHour`).
- **Inserts** go through `insertIgnoringConflict`, which treats only the row's own anchor index as "already decided"; any other unique violation raises.
- **The press audit repair** writes the officer's own audit as the officer who pressed, from `press-audit.ts`, the one builder commit 7's actions use too.

**The trigger** (commit 4, §5 step 6; `test:house-bot-engine` §18 on both stores; C4-SPEC rulings 90–110, 114–119):
- **One decision path.** `server/house-bot/trigger.ts` `decideTrigger` decides a player's stake once, as one COUNTER row or none; the post-commit hook (Up & Down) and the sweep (every product) both call it. It inserts intents only and never places a stake: it loads neither `fire.ts` nor `oversight.ts`.
- **The hook.** In `market-service.ts`, under `if (result.ok && committed)`, a `// SEAM:trigger` block runs for a player's Up & Down stake only: it reads `HOUSE_BOT_ENGINE` first (`false` → no import), then `runOutsideAdmission(() => runOutsideLock(…))` starts `import("./house-bot/trigger")` with the six facts the block already holds, and nothing on the bet path waits for it. A poll stake never reaches the hook (targets and polls are sweep-only). Inside, the hook returns — leaving the stake to the sweep — while the engine has not started on this container, while its clock skew is unknown or over 5 s, or when four calls are already running (the drop is counted on the admin-gated engine-health reader, `/admin/system` → Diagnostics, ADMIN only — never on the public `/api/health`; owner ruling D19, C5-SPEC ruling 172. ⛔ **That reader FAILS CLOSED on its own viewer lookup**, and it did not until 2026-09-20: `houseEngineHealthFor` wrapped the lookup and the engine read in one `try` whose `catch` answered `{ readable: false }` — a truthy view — so a pool timeout on the viewer read rendered a card headed "House bot engine" / "Injini ya boti za nyumba" to any account holding the `ops` VIEW grant. The audience lookup has its own `try` and answers `null`, which is what C7-SPEC ruling 354(a) specifies; `{ readable: false }` is reachable only once `inHouseAlertAudience` has said yes. The pin is `test:house-bot-reports` 0.354a, on both stores). A 5 s soft cache skips every read when no bot is live and the staker holds no bot.
- **The sweep** runs every 5 s on the planner's leader only (`holdsPlannerLease`; no lease write of its own), skips its pass while admission has a queue, reads `passNow` once from the database clock, and pages `houseSeamStore.triggerPage` (unmarked stakes on a LIVE market, older than 5 s, not already anchored by a COUNTER; 200 a page, keyset `(placedAt, id)`) from `max(watermark − 90 s, now − 10 min)`. The watermark moves to the last stake read, to `passNow − 5 s` when nothing was read, and never past a stake whose decision failed — the next pass reads it again. With no bot at all nothing is read; while house bots are OFF the pages are still read for A21, and nothing is decided.
- **The filter, in order.** A live bot's own account is never a trigger (A21 below). A stake no longer OPEN, or an account that is not a PLAYER, writes nothing. BOTH_SIDES is checked, then the market (A12 scope and product policy; the once-only `ud-orphan-market`, `product-denied` and `ud-born-unlocked` alerts come from here), the scope start (`global.scopeFrom` and the bot's), and whether any bot covers the stake or a target is armed on the poll. A penalty-boxed account or a live holder's recruit leaves one SKIPPED row (PENALTY_BOX, HOLDER_RECRUIT) so "didn't react" stays visible.
- **The decision.** `decideCounter` runs with no holding or cap reads; only when it names a bot for a row that is not SKIPPED are that bot's `marketHeld` and `capPrecheck` read (and, for a targeted row, the staff-chosen TZS left today), and the decision runs again with them. A targeted row draws its delay first, then reads the money locked AT its due time (`targetDueAt`, the one formula); its stake never passes the staff-chosen room. A target that ended between the pass's read and the insert gets the untargeted decision in the same pass.
- **A21 — a holder against their own bot.** A holder's stake on the side opposite their bot's OPEN house stake on that market sends one alert (`holder-against:<botId>:<marketId>`, given back if the send fails) and writes one HOLDER_AGAINST_BOT event with aggregates only (`{side, stakeTzs, botSide, botStakeTzs}`), whatever the switch says. The stake is never refused and the bot is never paused; the same side is nothing.
- **The penalty box (R5).** The AlertOnce row `penalty:<userId>:<EAT day>` is the box. It is claimed when a countered trigger cashes out (CASHED_OUT_COUNTERED, at fire) or when the house countered an account on a market where it now holds both sides (BOTH_SIDES, in the trigger). Each boxing writes one PENALTY_BOXED event `{cause, day, intentId}` and one admin alert naming the player by handle only; a failed alert never un-boxes the account.

**The holder's own account, watched (commit 4, §5 step 7; `test:house-bot-engine` §19 on both stores; C4-SPEC rulings 121–135, 138):**
- `server/house-bot/holder-hook.ts` `onHolderAccountChanged(userId, event)` runs A2's table for every change to a holder's
  account — password changed or reset, email changed by an officer, a responsible-gambling limit, a break or self-exclusion, a
  closure, a role change, a suspension, a frozen wallet. Every call site fires it through `runOutsideLock` **after** the write
  commits (a hook inside the lock would read a row nobody has committed yet), and never awaits it on the player's path.
- The same table runs again in the **L2 sweep** with no hook at all, so an event that was missed (another container, a crash)
  still lands. Both paths take the one apply (`applyHolderCauses`), and §19 runs every row twice — once through the hook, once
  through the sweep — and compares the two outcomes.
- A **pause that was caused by a credential change is recorded once** (ruling 133), a change that lands while another cause is
  already stopping the bot is still recorded (135), a bot already paused FOR a password change that changes again raises A1
  again rather than A2 (134), and a failed A1 send is paid by the next look, once (138).
- ⛔ **D19c:** none of this reaches the holder. Every alert goes to admins; the holder receives nothing.

**The kill switch (commit 4, §5 step 8; `test:house-bot-caps` §7; rulings 139–140):** `server/house-bot/kill-switch.ts`
`switchOffHouseBots(cause)` runs A9's four steps under `drainLock` — a separate transaction with its own `lock_timeout`, which
refuses to run inside a lock — so a switch-off cannot deadlock behind a bet. `SWITCH_OFF_COPY` is the one home for the words
the operator sees. Nothing in flight is abandoned silently: claimed rows are cancelled and counted in the alert.

**What the engine says, and to whom (commit 4, §5 step 9; `test:house-bot-comms`, `qa:cert-c1`, `qa:house-bot-bells`; ruling 142):**
every emitter, the one alert copy table, F6's channel policy and all 20 A2 call sites are **admin-only**. Each bell and email was
rendered through the real emitters and read at 1280 and 360. ⛔ **D19 (rulings 143–158) removed everything else**: the liquidity
label, the holder's notices and emails, the house wording in refusals and in the objection panel, and the client-side `HOUSE_BOT`
appearance case. The proof is in §12, and §10 states the rule.

**The money hooks (commit 4, §5 step 10; ruling 137):** F7's seven write sites in 02 §3.6 carry the marker, and the AML refund is
atomic (`rejectAmlAction`'s wallet adjust and its FAILED transaction in one transaction).

**X7 · both sides, checked again at fire (commit 4; rulings 136 and 159):** the sweep boxes an account when the house's counter is
already PLACED, but a poll counter can wait five minutes for the exit window, so `fire.ts` reads the trigger account's own OPEN
positions (house-marked excluded) one more time immediately before placing. Both sides held → `boxAccount({cause: "BOTH_SIDES"})`
and the intent finishes SKIPPED(`PENALTY_BOX`). The player's own stake is never refused by this; the seam's `TRIGGER_BOTH_SIDES`
refusal has kept money from flowing there since commit 2.

**What step 11 pinned (commit 4, §5 step 11; rulings 160–163):**
- `test:house-bot-info-edge` (A13): the engine's market view carries only the pinned fields, on both twins, and no engine module
  can read a result field — an esbuild-stripped walker over all 40 modules, with `blackout.ts` and `seam.ts` exempt **by name**
  and `ud-price.ts` measured and deliberately not exempt.
- **A24 at scale:** 1,000,046 positions with 20,017 house-marked, every engine read of `Position` EXPLAINed with its real
  parameters — no sequential scan, each paired with a control that reads the fixture's own figures.
- **MON-06:** two OS processes with clocks at −5 s and +5 s race a cash-out against a house stake at the lock boundary; never
  both a house stake and a cashed-out position.
- **L6:** two processes sweeping the same window, each held at a barrier inside its own page read, still write exactly ONE counter
  for a stake — the failover overlap ruling 103 calls harmless, measured rather than assumed.
- `red:house-bot-engine`: 29 declared mutations (`scripts/anchors/house-bot-engine.anchors.mjs`), each required to turn its own
  assertion red, every file restored byte for byte.

---

## 5. Caps and limits

Behaviour lives in the rules JSON (`HouseBotRulesV1`, `schemaVersion` 1), caps in typed columns on `HouseBot`, and global limits on `HouseBotControl`. One module, `src/lib/house-bot/rules.ts`, holds the schema, the bounds, the field metadata, the recommended values and every validator. The forms (commit 7) render from `FIELD_META`, and the server validates with the same functions.

### 5.1 Not set is not zero (C1)
- A cap or limit that is not set is NULL, never 0. It reads "Not set — this bot cannot bet" (`NOT_SET_COPY`). Start refuses while a required cap is unset, and the master switch cannot go ON while a required limit is unset (§5.4).
- 0 is a value, accepted only where the field's minimum is 0 (`zeroAllowed`).
- One parser serves the form and the server, `parseWholeNumber`. An empty field is not set. Decimal digits of any script become ASCII, and a leading TZS or Tsh, spaces, commas, underscores and apostrophes are dropped. Then a "." is refused ("Whole shillings only — no decimals."), so "10.000" is never read as ten thousand; a minus is refused ("Must be 0 or more."); anything else that is not digits is refused ("Digits only, e.g. 10,000."). More than 15 digits reads as too large and never wraps.
- The database rails (§2.3) are wider than the form. A TZS cap's form minimum is the live minimum stake, because a smaller cap can never admit a bet, except where §5.2 shows 0.
- "Use recommended values" fills numbers only and saves nothing ("Recommended values filled — review, then Save."). It never ticks a product, a mode, a chain, a category or an `enabled` flag.

### 5.2 Fields (`FIELD_META`)

A bound written as a symbol is resolved when the field is validated, from `RulesContext`:

| Symbol | Meaning |
|---|---|
| `LIVE_MIN` / `LIVE_MAX` | The live stake bounds from the platform config (F5), never the stake constants. |
| `FLOOR` | `minGapFloorSec(refill)` = the smallest whole number of seconds ≥ 200 ÷ the holder's `bet.place` refill per minute, which leaves the holder at least 70% of their own bet rate. |
| `MAX_UD_SEC` | The longest Up & Down duration × 60 − 92 − 20 seconds (`maxUdFillLeadSec`). |
| `MAX_OPENER_UD_SEC` | The longest Up & Down duration × 20 seconds (`maxOpenerUdDelaySec`). |

**Rules JSON.** "New bot" is what `DEFAULT_RULES_V1` writes; "—" is null.

| Field | Unit | Min | Max | New bot | Recommended |
|---|---|---|---|---|---|
| `scope.skipPollsClosingWithinMin` | min | 1 | 43,200 | 60 | 60 |
| `scope.poolTotalMinTzs` | TZS | 0 | 100,000,000 | 0 | 0 |
| `scope.poolTotalMaxTzs` | TZS | 0 | 100,000,000 | — (empty = no maximum) | — |
| `counter.delayMinSec` / `counter.delayMaxSec` | s | 5 | 600 | 15 / 45 | 15 / 45 |
| `counter.reactProbabilityPct` | % | 0 | 100 | 60 | 60 |
| `counter.triggerStakeMinTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | `LIVE_MIN` | `LIVE_MIN` |
| `counter.triggerStakeMaxTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | 200,000, cut to the live bounds | 200,000 |
| `counter.amount.pct` | % | 10 | 100 | 80 (amount kind PCT) | 80 |
| `counter.amount.fixedTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | — | — |
| `fill.leadUdSec` | s | 10 | `MAX_UD_SEC` | 45 | 45 |
| `fill.leadPollsMin` | min | 2 | 1,440 | 30 | 30 |
| `fill.targetThinSharePct` | % | 10 | 50 | 40 | 40 |
| `fill.jitterSec` | s | 0 | 86,400 | 10 | 10 |
| `opener.delayUdMinSec` / `opener.delayUdMaxSec` | s | 1 | `MAX_OPENER_UD_SEC` | 20 / 90 | 20 / 90 |
| `opener.delayPollsMinMin` / `opener.delayPollsMaxMin` | min | 1 | 43,200 | 5 / 30 | 5 / 30 |
| `opener.stakeMinTzs` / `opener.stakeMaxTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | 1,000 / 5,000, cut to the live bounds | 1,000 / 5,000 |
| `updown.closenessPct` | % | 0 | 100 | 25 | 25 |
| `shaping.roundToTzs` | choice | 100 · 500 · 1,000 · 5,000 | — | 500 | 500 |
| `shaping.jitterPct` | % | 0 | 30 | 10 | 10 |
| `guards.noReactZoneUdSec` | s | 0 | 300 | 30 | 30 |
| `guards.noReactZonePollsMin` | min | 0 | 1,440 | 15 | 15 |
| `guards.minTimeToCutoffUdSec` | s | 10 (`MIN_TIME_TO_CUTOFF_FLOOR_SEC`) | 86,400 | 20 | 20 |
| `guards.minTimeToCutoffPollsMin` | min | 1 | 43,200 | 5 | 5 |
| `enterNow.thinStakeTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | — | 10,000 |
| `enterNow.openerStakeTzs` | TZS | `LIVE_MIN` | `LIVE_MAX` | — | 2,000 |

Toggles, lists and choices carry no bounds: `scope.products.updown`, `scope.products.polls`, `scope.chains`, `scope.categories`, the six mode flags (`modes.updown.counter` … `modes.polls.opener`), `counter.amount.kind`, `schedule.days`, `schedule.allDay`, `schedule.windows`, `enterNow.enabled` and `targeting.enabled`. A new bot has both products off, empty chain and category lists (scope is explicit: a chain or category added later stays out until someone adds it), every mode off, Enter now and targets off with null stakes, and a schedule of all seven days, all day.

Rules hints: `enterNow.enabled` "Polls only. You choose the poll; 50pick works out the side and the amount." · `enterNow.thinStakeTzs` "Used when players' locked money leaves one side thinner. Cut to fit." · `enterNow.openerStakeTzs` "Used on a poll with no stakes yet. The side is drawn once for that poll." · `targeting.enabled` "Targets use the Counter amount and trigger range below, and the staff-chosen limits."

**Caps** (`HouseBot` columns; every one may be not set)

| Field | Label | Unit | Min | Max | Recommended | Hint |
|---|---|---|---|---|---|---|
| `stakeMinTzs` | Stake min | TZS | `LIVE_MIN` | `LIVE_MAX` | 1,000 | — |
| `stakeMaxTzs` | Stake max | TZS | `LIVE_MIN` | `LIVE_MAX` | 10,000 | — |
| `capPerMarketTzs` | Per-market cap | TZS | `LIVE_MIN` | 1,000,000,000 | 20,000 | — |
| `capDailyStakeTzs` | Daily stake cap | TZS | `LIVE_MIN` | 1,000,000,000 | 200,000 | Resets at 00:00 EAT. |
| `capDailyLossTzs` | Daily loss cap | TZS | `LIVE_MIN` | 1,000,000,000 | 50,000 | The loss hint, below |
| `capOpenExposureTzs` | Open exposure cap | TZS | `LIVE_MIN` | 1,000,000,000 | 100,000 | — |
| `balanceFloorTzs` | Balance floor | TZS | 0 | 1,000,000,000 | 0 | — |
| `freqMinGapSec` | Min gap | s | `FLOOR` | 86,400 | 30 | Since this bot's last placed bet. |
| `freqMaxPerHour` | Bets per hour | count | 1 | 60 | 20 | Rolling 60 minutes. |
| `freqMaxPerDay` | Bets per day | count | 1 | 1,440 | 200 | Resets at 00:00 EAT. |
| `freqMaxPerMarket` | Bets per market | count | 1 | 6 | 2 | — |
| `capStaffChosenPerDay` | Staff-chosen stakes per day | count | 1 | 50 | 3 | Enter now stakes and target reactions placed this EAT day. Not set — Enter now and targets can't bet. |
| `capStaffChosenDailyTzs` | Staff-chosen daily cap | TZS | 0 | 1,000,000,000 | 30,000 | TZS of Enter now stakes and target reactions placed this EAT day. Not set — Enter now and targets can't bet. |
| `targetsMaxActive` | Max active targets | count | 1 | 50 | — | Not set — no target can be added. |

**Global limits** (`HouseBotControl` columns; the last three count limits are never NULL)

| Field | Label | Unit | Min | Max | Recommended | Hint |
|---|---|---|---|---|---|---|
| `gCapDailyStakeTzs` | Daily stake limit | TZS | `LIVE_MIN` | 1,000,000,000 | 500,000 | Resets at 00:00 EAT. |
| `gCapDailyLossTzs` | Daily loss limit | TZS | `LIVE_MIN` | 1,000,000,000 | 100,000 | The loss hint, below |
| `gCapOpenExposureTzs` | Open exposure limit | TZS | `LIVE_MIN` | 1,000,000,000 | 300,000 | — |
| `gCapPerMarketTzs` | Per-market limit | TZS | `LIVE_MIN` | 1,000,000,000 | 30,000 | — |
| `gMaxBetsPerMinute` | Bets per minute | count | 1 | 20 | 6 | Rolling 60 seconds. |
| `gMaxBetsPerDay` | Bets per day | count | 1 | 28,800 | 1,000 | Resets at 00:00 EAT. |
| `gCounterPerPlayerPerDay` | Counters per player per day | count | 1 | 1,440 | 3 | Resets at 00:00 EAT. |
| `gCounterPerPlayerTzsPerDay` | Counter TZS per player per day | TZS | `LIVE_MIN` | 1,000,000,000 | 30,000 | Resets at 00:00 EAT. |
| `gCapStaffChosenPerDay` | Staff-chosen stakes per day (all bots) | count | 1 | 200 | 10 | All bots together, this EAT day. Not set = Enter now and targets are off for every bot. Not needed to switch house bots on. |
| `gCapStaffChosenDailyTzs` | Staff-chosen daily limit | TZS | 0 | 1,000,000,000 | 100,000 | As above. |
| `gTargetsMaxActive` | Max active targets (all bots) | count | 1 | 200 | — | Not set = no target can be added for any bot. Not needed to switch house bots on. |
| `gStaffChosenMaxCounterpartyShare` | Counterparty share limit | % | 10 | 100 | 50 (W15) | Enter now refuses when one player holds more than this share of the players' locked money it would add to. Not set = Enter now is off for every bot. |
| ~~`gStaffEdgeWinRatePts`~~ | ~~Staff edge: win rate~~ | | | | | ⛔ **UN-BUILT in C5-5b** (owner ruling D20, replan ruling 265): the alert it switched is struck, and a writer with no reader is a control that lies. The column and its CHECK are out of the undeployed migration and the schema, the `FIELD_META` row and both `LIMIT_FIELDS` entries are gone, and `test:house-bot-rules` 2.d20 holds the limits tab and `LIMIT_FIELDS` at the same sealed 14 — no `FIELD_META` row, no writable limit list and no clear-exemption naming a staff edge. |
| ~~`gStaffEdgeNetTzs`~~ | ~~Staff edge: net~~ | | | | | ⛔ **UN-BUILT in C5-5b:** as the row above. |
| `maxDesignatedBots` | Max designated bots | count | 1 | 20 | 5 (also the seeded value) | — |
| `bellAlertsPerHour` | Bell alerts per hour | count | 0 | 60 | 20 (also seeded) | At {n} per hour each admin can get up to {24n} bet rows a day, plus summaries and pause, money and switch alerts. |

The loss hint, on both loss fields: "Limits count stakes by the day they were placed and restart at 00:00 EAT. Losses that settle today can include stakes from earlier days. Counts today's open stakes as lost until they settle; bots stop only on settled losses."

Lowering `maxDesignatedBots` below the number of designated bots is allowed and only previewed: no account can be designated until enough are removed, and no bot is paused (C10).

### 5.3 Cap windows (C14)

| Window | Fields |
|---|---|
| The EAT day, 00:00 to 24:00 | `capDailyStakeTzs`, `capDailyLossTzs`, `freqMaxPerDay`, `capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gMaxBetsPerDay`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`, `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs` |
| A rolling 60 minutes, `(now − 60 min, now]` (`countInRollingWindow`) | `freqMaxPerHour` |
| A rolling 60 seconds | `gMaxBetsPerMinute` |
| Since this bot's last placed bet | `freqMinGapSec` |
| ~~The EAT month just ended, evaluated on the first EAT day of the next~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no alert evaluates these thresholds (the staff-edge alert, C5-SPEC rulings 218–223, is struck). | `gStaffEdgeWinRatePts`, `gStaffEdgeNetTzs` |

- ⛔ **Every house-bot day, hour, month and minute is fixed EAT** (UTC+3, no daylight saving) from `src/lib/house-bot/clock.ts`, whatever the platform timezone is set to — an explicit exception on the `report-pack.ts` precedent. A key a claim writes to the database is computed inside the INSERT from DB `now()` in `Africa/Dar_es_Salaam` (`EAT_SQL`), so two replicas either side of midnight write one row. A key suffixed in JavaScript is never handed to a database claim.
- **Loss.** `src/lib/server/house-bot/book.ts` works per EAT-day cohort of positions placed that day. *Realised* = settled stakes − money returned; *projected* = realised + today's open stakes counted as lost. The gates refuse on projected + this stake (`DAILY_LOSS_PROJECTED`, `GLOBAL_LOSS_PROJECTED`; commit 2). An auto-pause and a master OFF happen only on realised ≥ cap (the planner, commit 4).

### 5.4 Required for Start and for master ON
- **Start** refuses while any cap in `REQUIRED_FOR_START` is not set: `stakeMinTzs`, `stakeMaxTzs`, `capPerMarketTzs`, `capDailyStakeTzs`, `capDailyLossTzs`, `capOpenExposureTzs`, `balanceFloorTzs`, `freqMinGapSec`, `freqMaxPerHour`, `freqMaxPerDay`, `freqMaxPerMarket`. It never names a staff-chosen cap or the target maximum; rules N1-a and N2-a already require those at save while Enter now or targets are on.
- **Master ON** refuses while any limit in `REQUIRED_FOR_MASTER_ON` is not set: `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gCapOpenExposureTzs`, `gCapPerMarketTzs`, `gMaxBetsPerMinute`, `gMaxBetsPerDay`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`. The staff-chosen limits, the target maximum and the staff-edge thresholds are not required, and they are left out of "Set N global limits first".
- **What else the saved rules refuse at Start** (`rulesStartProblems`; the service adds the refusals that need reads):
  - no product: "Choose at least one product.";
  - no entry mode: "Turn on at least one entry mode." Enter now or targets alone count as an entry mode;
  - a saved value that a live bound now breaks: "Can't start: the platform minimum stake is now TZS {m}; Stake min is TZS {x}." The same check covers a stake min above the live maximum and a min gap below the live floor, and, while Enter now is on, both Enter now stakes and the staff-chosen daily cap.
- **Start warnings:** "{label} has no automatic mode: it bets only when you press Enter now." (or "… when you press Enter now or a target reacts.", or "… when a target reacts."), and "Every enabled mode is currently impossible." when every enabled counter is "never" and nothing else is on.

### 5.5 Clearing a cap while bots run (MON-14)
- **Exempt** (`CLEAR_EXEMPT`): `capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `targetsMaxActive`, `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs`, `gTargetsMaxActive`, `gStaffChosenMaxCounterpartyShare`. Clearing one turns Enter now or targets off, which only ever reduces risk. So neither "Can't clear a limit while bots are on. Switch off first." nor "{label} is running — pause it before clearing {cap}." applies to them. Clearing one takes `house:control` briefly and shows a consequence preview (PLAN §18, "Clearing limits").
- **Not exempt:** every other limit — clearing one while bots run still needs the switch off first (`test:house-bot-rules` pins X-CLEAR-ON on `gMaxBetsPerDay`). ~~the two staff-edge thresholds~~ ⛔ **UN-BUILT in C5-5b** (owner ruling D20, replan ruling 265): there are no staff-edge thresholds to clear, and `CLEAR_EXEMPT` is unchanged — still the sealed seven.

### 5.6 Cross-field rules (`CROSS_FIELD_RULES`)
- This table in `rules.ts` is the only source of rules that compare two fields, or a field with a global limit or another bot (C6).
- A rule is skipped while a value it compares is not set or already refused on its own. Each field carries at most one error, and the first rule in this order wins.
- **Direction.** Raising a bot above a set global limit is refused on the rules form. Lowering a global limit below a bot is allowed on the limits form: it never refuses, and it lists that bot as a conflict in the consequence preview.

| Id | Form | Kind | What it compares | Message |
|---|---|---|---|---|
| R-STAKE-ORDER | Rules | Refuse | stake min ≤ stake max | "Minimum stake can't be above maximum stake." |
| R-PM-GE-STAKE | Rules | Refuse | per-market cap ≥ stake max | "Per-market cap must be at least the maximum stake." |
| R-DAY-GE-PM | Rules | Refuse | daily stake cap ≥ per-market cap | "Daily stake cap must be at least the per-market cap." |
| R-LOSS-LE-DAY | Rules | Refuse | daily loss cap ≤ daily stake cap | "Daily loss cap can't exceed daily stake cap." |
| R-EXP-GE-PM | Rules | Refuse | open exposure cap ≥ per-market cap | "Open exposure cap must be at least the per-market cap." |
| R-GAP-FLOOR | Rules | Refuse | min gap ≥ `FLOOR` (reported by the field's own bound check) | "Min gap is at least {floor} seconds." |
| R-HOUR-FITS-GAP | Rules | Refuse | bets per hour fit the min gap | "At {gap} s apart this bot can place at most {n} bets an hour." |
| R-DAY-GE-HOUR | Rules | Refuse | bets per day ≥ bets per hour | "Bets per day must be at least bets per hour." |
| R-POOL-BAND | Rules | Refuse | pool minimum ≤ pool maximum | "Pool minimum can't be above pool maximum." |
| N2-b | Rules | Refuse | counter delay min ≤ max; a target's own delays use the same rule | "Minimum delay can't be above maximum delay." |
| R-TRIGGER-RANGE | Rules | Refuse | trigger stake min ≤ max | "Trigger stake minimum can't be above its maximum." |
| R-OPENER-ORDER | Rules | Refuse | each opener min ≤ its max (Up & Down delay, polls delay, stake) | "Minimum can't be above maximum." |
| R-FILL-LEAD-UD | Rules | Refuse | with Up & Down FILL on, its lead against min time to cutoff plus jitter | "FILL lead must be at least min time to cutoff plus jitter ({n} s)." |
| R-FILL-LEAD-POLLS | Rules | Refuse | with polls FILL on, its lead against min time to cutoff plus jitter | "FILL lead must be more than min time to cutoff plus jitter." |
| R-SMAX-LE-GPM | Rules | Refuse | stake max ≤ the global per-market limit | "Max stake TZS {x} is above the global per-market limit TZS {g}." |
| R-PM-LE-GEXP | Rules | Refuse | per-market cap ≤ the global open exposure limit | "Per-market cap TZS {x} is above the global open exposure limit TZS {g}." |
| N1-a | Rules | Refuse | Enter now on needs both Enter now stakes and both staff-chosen caps set, polls on and at least one category | "Set {field} to use Enter now." · "Enter now is for polls: turn on polls and choose at least one category." |
| N1-b | Rules | Refuse | staff-chosen daily cap ≤ daily stake cap, and ≥ the Enter now stakes | "Staff-chosen daily cap can't exceed the daily stake cap." · "Staff-chosen daily cap must be at least the Enter now stakes (TZS {x})." |
| N1-c | Limits and Rules | Refuse | the global staff-chosen daily limit ≤ the global daily stake limit; each per-bot staff-chosen cap and the target maximum ≤ its global limit | "Staff-chosen daily limit can't exceed the global daily stake limit." · "Staff-chosen stakes per day {x} is above the global limit {g}." · "Per-bot staff-chosen cap TZS {x} is above the global staff-chosen cap TZS {g}." · "Max active targets {x} is above the global limit {g}." |
| N1-d | Rules | Refuse | staff-chosen stakes per day ≤ bets per day | "Can't exceed bets per day ({n})." |
| N1-e | Rules | Refuse | both Enter now stakes within the bot's stake min and max | "Enter now stake must be between {label}'s stake min TZS {min} and max TZS {max}." |
| N2-a | Rules | Refuse | targets on need polls with a category, the counter amount and trigger range, the target maximum and both staff-chosen caps | "Targets use the Counter amount and trigger range — set them." · "Set Max active targets to use targets." · "Set the staff-chosen limits to use targets." · "Targets are for polls: turn on polls and choose at least one category." (4th message: PLAN §18) |
| N2-c | Rules | Refuse | target maximum ≤ the global target maximum (restates N1-c, which reports it first) | "Max active targets {x} is above the global limit {g}." |
| X-CLEAR-ACTIVE | Rules | Refuse | a required cap cleared on an ACTIVE bot, unless exempt (§5.5) | "{label} is running — pause it before clearing {cap}." |
| L-LOSS-LE-DAY | Limits | Refuse | global daily loss ≤ global daily stake | "Daily loss can't exceed daily stake." |
| L-DAY-GE-MIN | Limits | Refuse | global bets per day ≥ bets per minute | "Bets per day must be at least bets per minute." |
| L-CPP-LE-DAY | Limits | Refuse | counters per player per day ≤ global bets per day | "Counters per player per day can't exceed bets per day." |
| L-GPM-VS-BOTS | Limits | Conflict | the global per-market limit against every bot's stake max | "Per-market limit TZS {g} is below bot “{label}” max stake TZS {x}." |
| L-GEXP-VS-BOTS | Limits | Conflict | the global open exposure limit against every bot's per-market cap | "Open exposure limit TZS {g} is below bot “{label}” per-market cap TZS {x}." |
| L-STAFF-VS-BOTS | Limits | Conflict | the three global staff-chosen limits against each bot's | "{field} {g} is below bot “{label}” {x}." |
| X-CLEAR-ON | Limits | Refuse | a limit cleared while the master switch is on, unless exempt (§5.5) | "Can't clear a limit while bots are on. Switch off first." |

### 5.7 When a stake lands
- **The automatic, untargeted COUNTER** is due at max(its drawn delay, the trigger's exit window close), with **no** lock margin (N1 §4.1, N2 §4). A stake with runway (a free exit, and at least that long left before betting closes) has its exit window close grace + paid minutes after the stake; any other stake has none. With a 5-minute free exit and a 20 s delay: 3-minute rounds counter at 0:20, 10-minute rounds at open at 5:00, polls at 5:00, and 7:00 with a 2-minute paid window (PLAN §12). ⛔ Adding `LOCK_MARGIN_MS` to this COUNTER is a regression: the rules suite's 10-minute 5:00 row goes red, and the engine suite (commit 4) pins it again.
- **"Never."** A class is "never" when no stake instant on it can be countered: placed before the no-react zone and due before min time to cutoff. Polls are measured on the shortest poll lifetime (`MIN_SELECTION_WINDOW_MINUTES`), so a 120-minute paid exit makes polls "never" and a 60-minute one does not (PLAN §18, the C14 row). The preview says "Counter: never fires on {classes} under current exit rules (players can exit for {n} min)".
- **A targeted COUNTER** (N2) is due at max(requested, exit close + `LOCK_MARGIN_MS`), where the requested delay counts from the stake (`STAKE`) or from the exit close (`EXIT_CLOSE`). A stake with no runway is due at max(delay, 7 s). The hold is absolute: a target never lands before the player's free exit has closed plus 7 s. A target reacts only to stakes placed at or after its `effectiveFrom`.
  - `effectiveTargetTiming` gives the preview's short form and sentence, the last reactable stake time, and "never" when no reactable instant is left after arming.
  - Its sentence ends "Armed from {HH:MM:SS} EAT. Stakes placed after {HH:MM:SS} EAT aren't reacted to.", and adds "From {HH:MM:SS} EAT a stake has no free exit, so {label} reacts {n} s after it." when the no-react zone is shorter than the free exit.
  - A target that can no longer react reads "Can't react on this poll: a stake placed from {HH:MM:SS} EAT would be held past {label}'s cutoff ({HH:MM} EAT)."
- **Enter now** (N1): "Enter now (polls only) places within a few seconds of your press. If 50pick is busy it keeps trying for 15 s, then gives up with nothing moved. It ignores this bot's schedule, pool band and closing-soon skip, and stays out of the last {m:ss} before betting closes." `{m:ss}` is the bot's polls min time to cutoff.
- **Which money counts.** Enter now, FILL and the targeted COUNTER measure the other side with `lockedForHouse`: only locked money of eligible player accounts counts, 7 s after its free exit closes. The untargeted COUNTER keeps A15's locked pool.
- The preview is headed "For markets created from now (current exit settings)", and adds "Markets already open keep their own exit window." when live rates differ from open markets.

### 5.8 Target fields (N2 §5)
- Delays are whole seconds 5–600, minimum ≤ maximum, equal allowed ("Between 5 and 600 seconds."). Hint: "Use the same number twice for an exact delay. A range makes the bot harder to spot."
- "Counted from": "The player's stake" (`STAKE`) or "When the player's free exit closes" (`EXIT_CLOSE`). "Reacts to": "First stake only (until one reaction is placed)" (`FIRST`) or "Every stake (up to {label}'s per-market limits)" (`EVERY`).
- The add dialog prefills 10 s and 10 s, STAKE, FIRST (W14). That prefill is never a saved default.
- Early entry before the player's free exit closes is not built. Asking for it needs a new amendment and a COMPLIANCE ruling that amends A15.

### 5.9 Labels, notes, reasons and the schedule (C2, C15)
- **Label.** Normalised (NFC, trimmed, inner spaces collapsed), 2–32 code points ("2 to 32 characters."), and only letters, marks, digits, space and `- _ . # '` ("Letters, numbers, spaces and - _ . # ' only."). Zero-width characters, bidi controls and emoji fail. Uniqueness is on `labelKey` (NFKC, lowercased) among live bots: "Another bot is already called “{label}” ({status}). Choose a different label." A removed bot's label may be reused.
- **Note and reasons.** A note is at most 300 code points; a required reason is 5–300 after trimming ("Give a reason (at least 5 characters)."). Over 300 reads "At most 300 characters — shorten it to save." Text is never truncated, and emoji are valid.
- **Schedule.** Days, plus either All day or 1–4 windows in EAT. A window whose end is before its start is overnight and belongs to its start day ("Mon 22:00 → Tue 02:00 (overnight)"); Sunday's runs into Monday. Refusals, in order: "Pick at least one day."; "Add a window or choose All day."; "Up to 4 windows"; "Enter a time as HH:MM."; "Start and end are the same — use All day for 24 hours." (00:00–00:00 is refused, 23:59–00:00 is valid); then any overlap is reported on the later row, naming the window it runs into.

### 5.10 Stored rules over time (C14, F4)
- `parseHouseBotRules` never writes and never widens. A missing or zero `schemaVersion` gives RULES_OUTDATED, a newer one RULES_FROM_FUTURE, and a wrong type or a broken static bound RULES_INVALID naming the field. A chain or category that no longer exists is dropped into a stale list ("Rules mention {label}, which no longer exists — review and save."). Live stake bounds are F5's revalidation, never parse's.
- Only the rules form converts old rules, through `migrateRules`, shown as a diff the owner saves. The engine and the planner never convert rules or write them back.
- Rules saved by a newer build raise one alert once they have lasted 10 minutes (`rules-future`) and pause nothing; nothing is placed until that build is back.

---

## 6. Eligibility, causes and the auto-pause matrix

The pure half — every reason, cause and way out — is `src/lib/house-bot/pause-reasons.ts` and `consent.ts`. The services are `src/lib/server/house-bot/eligibility.ts` and `designation.ts` (commit 3); the console actions that call them land in commit 7, and the holder hook and sweep that detect each change in commit 4.

### 6.1 Reasons are history; causes are live (A3)
- `pauseReason` is the reason a bot stopped, written once and shown in History. It never gates anything.
- The **causes** are recomputed from the holder's account every time (`holderCauses()` in `consent.ts`), and Start, Re-verify and the strip read only them. A bot paused for a password change whose holder then self-excludes has one reason and two causes; gating on the reason alone would offer a Start that consent no longer allows.
- NEW and MANUAL are the reasons of a PAUSED bot. ACCOUNT_CLOSED ends REMOVED. Every other reason is an AUTO_PAUSED one.
- Why a bot was removed lives in `removedCause` (§6.5), never in `pauseReason`.

### 6.2 Consent
- Consent is the owner entering the account's password (D5). The bot keeps a fingerprint of it, never the password.
- **One validity predicate** (PLAN §18), used by H2, Start, the strip and `?reverify=1`: `consentValid = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)`.
- **What voids consent** (`CONSENT_VOID_CAUSES`): SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW. A void stands until a re-verify whose `verifiedAt` is later — even when the password never changed, because the fingerprint alone would still match. A void also ends every active target of that bot as ENDED(CONSENT_VOID), with one TARGET_ENDED event each, in the same `wallet:<botUser>` transaction as the void (`voidHouseConsent`); Re-verify and Start never revive them.
- **The void service** (`voidHouseConsent`): an ACTIVE bot → AUTO_PAUSED(cause) with `pausedFromStatus` ACTIVE and its live intents cancelled; a PAUSED or AUTO_PAUSED bot keeps its status and gets HOLDER_CAUSE_ADDED; a second pass changes nothing; a failure part-way rolls every write back. ~~The holder is told only for HOLDER_WITHDREW (a confirmation); responsible-gambling causes send them nothing (C8).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder is told nothing for any cause, HOLDER_WITHDREW included (C4 ruling 149). The holder's own "Stop liquidity stakes" action is struck, so a withdrawal the holder asks for comes through support (C5-SPEC ruling 170, L49).
- **Responsible gambling outranks every other door** (`RG_CAUSES`: SELF_EXCLUDED, COOLING_OFF). While the lock stands even Re-verify is refused. When it ends, the bot needs a fresh password and then Start; it never resumes by itself (D11, C8).
- **A password change** (PLAN §14, A2) records how it happened in `credentialChangedVia`: SELF_CHANGE, RESET_LINK, OFFICER_TEMP, or UNKNOWN for a holder whose `passwordSetVia` is NULL. A password support set (OFFICER_TEMP) is not the holder's consent, so Re-verify is refused until the holder sets their own.

### 6.3 Holder causes, in display order
`HOLDER_CAUSES`: ACCOUNT_CLOSED, HOLDER_ERASURE_REQUEST, SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_WITHDREW, CONSENT_VOID, PASSWORD_CHANGED, ACCOUNT_SUSPENDED, WALLET_FROZEN, ROLE_CHANGED, OWNER_LOSS_LIMIT.
- The order is: terminal and statutory → responsible gambling → consent-voiding decisions → re-verifiable → lifted by an officer → clears by itself. The strip shows the first three, then "and N more".
- CONSENT_VOID is listed only while a void stands and its original cause is no longer live; while the cause is live, the cause says more.
- Only PASSWORD_CHANGED and CONSENT_VOID can be cleared by a re-verify (`REVERIFY_ELIGIBLE_CAUSES`), and never a password change through OFFICER_TEMP. Consent survives ACCOUNT_SUSPENDED, WALLET_FROZEN, ROLE_CHANGED and OWNER_LOSS_LIMIT (`REVERIFY_TOLERATED_CAUSES`): re-verify may run beside them, and Start waits for them (C8, 02 §2.6, PLAN §18 — A3's own sentence reads stricter; the reconciliation is binding).
- **Gating, pure.** `canStart`: not REMOVED, and no live cause. `canReverify`: stopped and not REMOVED, no responsible-gambling lock, and every live cause re-verifiable or tolerated. `nextActions`: the union of each live cause's steps, plus START when Start is allowed; while a responsible-gambling lock stands, REVERIFY is withheld and WAIT offered. The service adds the refusals that need reads (eligibility, fingerprint, today's loss, the holder's own limit).

### 6.4 The way out of each pause reason (`PAUSE_REASON_WAY_OUT`)
No reason is a dead end: `test:house-bot-rules` clears every pair of holder causes in both orders and requires a step other than REMOVE at each point. Remove itself is always available. `{label}` is the bot's label.

| Reason | Origin | Voids consent | Steps | Admin copy |
|---|---|---|---|---|
| NEW | Bot | No | `START` | "Set its rules and caps, then Start." |
| MANUAL | Bot | No | `START` | "Start when ready." |
| PASSWORD_CHANGED | Holder | No | `REVERIFY`, `START` | "Enter their new password, then Start." |
| ROLE_CHANGED | Holder | No | `OFFICER_ACTION`, `START` | "Change their role back to PLAYER, then Start." |
| SELF_EXCLUDED | Holder | Yes | `WAIT`, `OFFICER_ACTION`, `REVERIFY`, `START` | "Start disabled while the lock stands. After it ends: Re-verify (fresh password, even if unchanged) → Start. Never resumes by itself." |
| COOLING_OFF | Holder | Yes | `WAIT`, `REVERIFY`, `START` | The same copy as SELF_EXCLUDED. |
| ACCOUNT_BLOCKED | Holder | No | `WAIT`, `START` | "Their account status could not be read. Start is enabled once it reads again." |
| ACCOUNT_MISSING | Holder | No | `WAIT`, `START`, `REMOVE` | "Their account could not be found. Start once it reads again, or remove the bot." |
| WALLET_FROZEN | Holder | No | `OFFICER_ACTION`, `START` | "Start once the last hold on their wallet is lifted." |
| WALLET_MISSING | Holder | No | `OFFICER_ACTION`, `START` | "Restore their wallet — settlement is blocked for every player until then. Removing the bot does not bypass it." |
| OWNER_LOSS_LIMIT | Holder | No | `WAIT`, `START` | "Start once their own rolling 24-hour loss limit allows the minimum stake." |
| DAILY_LOSS_STOP | Bot | No | `WAIT`, `RAISE_CAP`, `START` | "Start after 00:00 EAT, or raise the daily loss cap above today's settled loss." |
| ACCOUNT_SUSPENDED | Holder | No | `OFFICER_ACTION`, `START` | "Start once their account is restored." |
| ACCOUNT_CLOSED | Removed | Yes | `NONE` | "Account closed — the bot was removed. Recover the float out of band." |
| IDENTITY_REFUSED | Holder | Yes | `OFFICER_ACTION`, `REVERIFY`, `START` | "An officer must reopen the refusal; then Re-verify and Start. Removing the bot is recommended." |
| HOLDER_ERASURE_REQUEST | Holder | Yes | `RESOLVE_REQUEST`, `REVERIFY`, `START`, `REMOVE` | "Resolve their erasure request or remove the bot. If they withdraw it: Re-verify, then Start." |
| HOLDER_WITHDREW | Holder | Yes | `REVERIFY`, `START` | "The holder stopped liquidity stakes themselves. Only a fresh password they give you can restart it." |
| UNMAPPED_REFUSAL | Engine | No | `START` | "A bet refusal this build doesn't recognise paused the bot. Read the activity feed before starting again." |
| RULES_INVALID | Bot | No | `SAVE_RULES`, `START` | "Rules → Save → Start." |
| RULES_OUTDATED | Bot | No | `SAVE_RULES`, `START` | "{label} is paused: its rules were saved in an older format. Open Rules, review the converted values, Save, then Start." |

Two ways out belong to a live cause rather than a reason:

| Case | Origin | Voids consent | Steps | Admin copy |
|---|---|---|---|---|
| A password change through support's temporary password (`OFFICER_TEMP_WAY_OUT`) | Holder | No | `HOLDER_ACTION`, `REVERIFY`, `START` | "They must change the temporary password themselves in Account settings; then enter it and Start." |
| A consent void that outlived its cause (`CONSENT_VOID_WAY_OUT`) | Holder | Yes | `REVERIFY`, `START` | "Their permission ended with the earlier pause. Re-verify with their current password, then Start." |

### 6.5 Removal causes (`REMOVE_CAUSES`, `REMOVE_CAUSE_COPY`)
`HouseBot.removedCause` says why a bot was removed; `removedReason` stays the officer's free text.

| Cause | History line |
|---|---|
| MANUAL | "Removed by an owner." |
| ACCOUNT_CLOSED | "Account closed — the bot was removed. Recover the float out of band." |
| SUNSET | "House bots were withdrawn." |

- Remove cancels the bot's PENDING and CLAIMED intents. Open house positions keep their markers and settle normally (PLAN F8).
- Closing the holder's account removes the bot with cause ACCOUNT_CLOSED (A5, commit 4). The sunset script removes every bot with cause SUNSET (F2, commit 7).

### 6.6 Eligibility and the designation services (commit 3)
`houseBotEligibility(userId, {context, botId?, actorId?})` is the one function behind the picker, the account card, designate, re-verify and Start. Every read that fails is a blocking row, never an absent one.

| Context | Blocking rows (`code`) |
|---|---|
| always | STAFF_ACCOUNT · AGENT_ACCOUNT · ACCOUNT_CLOSED (with the closed-wallet float line) · NOT_ACTIVE (a COOLED_OFF status is left to the RG row: it outlives the break) · NO_PASSWORD · RG_LOCKED / RG_UNREADABLE · WALLET_MISSING · WALLET_NOT_ACTIVE · BALANCE_UNREADABLE |
| designate (no bot) | ALREADY_LIVE_BOT · OWN_ACCOUNT · ROSTER_FULL |
| designate, reverify, start | ERASURE_REQUEST (an open erasure request, with its id and date) |
| designate, reverify | SIGN_IN_LOCKED · PASSWORD_SET_BY_SUPPORT (`passwordSetVia` OFFICER_TEMP; or RESET_LINK within 30 days after an officer email — the `emailSetByOfficerAt` column, and failing that the durable `player.email.set_by_officer` audit rows, awaited; a legacy NULL history reads the audit log too) · PASSWORD_HISTORY_UNREADABLE (an audit read that throws, or is cut off at 200 rows while still inside the window) |
| start (bot) | IDENTITY_REFUSED · PASSWORD_CHANGED · CONSENT_VOID · RG_SINCE_VERIFIED (the A3 backstop, even with no void written: a self-exclusion or break began after `verifiedAt`, OR one ran until after it — the start stamps keep the first episode for the register, so they alone miss every later one) · DAILY_LOSS_STOP · OWNER_LOSS_LIMIT |

Warnings: EMAIL_UNVERIFIED · IDENTITY_NOT_APPROVED · RECRUITED · OPEN_POSITIONS · PUBLIC_NAME · NAME_RISK (`/50pick|house|bot|liquidity|ukwasi/i`) · SIGN_IN_LOCKED_WARNING (start: the bot continues). The C9 "agent application pending" warning needs the agent-application read and lands with the overview page (commit 7).

**`verifyHouseBotPassword`** (C4). In order: an empty password refuses, uncounted and untrimmed; a `submitId` is claimed once (`ALERT_KEY.submit`); re-verify refuses a removed bot and is a no-op for a running bot with valid consent; the password-context rows and an RG lock refuse, uncounted; the `desk.verify` bucket {capacity 3, refill 0.2/min}, keyed `<officer>:<holder>` (⛔ renamed from a key that spelled the feature out — replan ruling L52: `rateLimitSnapshot()` paints every live bucket's action name on `/admin/system` to the whole ops VIEW audience, so a rule key is a rendered string and owner ruling D19 leaves it no room to name the feature; the pin is `test:house-bot-reports` 0.L52); then inside `login:<userId>` on the fresh row: an expired lock is cleared, at `failedLoginCount ≥ LOCKOUT_MAX_FAILS − 2` the password is not checked (`RESERVED`), a wrong password adds 1 and never writes `lockedUntil`, a right one resets the count. `attemptsBeforeLock = max(0, 5 − 2 − failedLoginCount)`. It never creates a session, a cookie, an `ActiveSession` row or `lastLoginAt`, and writes no `auth.login.*` audit. ~~The holder is told once when the owner's wrong tries reach the reserve.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the two-attempt reserve stays, but the holder receives no bell or email about it (C4 ruling 149).

**`designateHouseBot`**: label and note → eligibility (so no attempt is spent on an account that cannot be designated) → the label pre-check → the password check → under `wallet:<userId>` the hash is re-read (a change since the check writes no row) → under `house:control` the roster is counted again and the bot (PAUSED(NEW)), its runtime row and DESIGNATED are written in one transaction. A clash the pre-check missed is named by the unique index: `HouseBot_labelKey_live_key` → field label, `HouseBot_userId_live_key` → "This account is already a house bot." with its id. Then COMPLIANCE `house_bot.designated` (no label, note or fingerprint) ~~and the holder's notice~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder is told nothing (C4 ruling 149).

**`reverifyHouseBot`**: refuses on the rows above that stop a re-verify (closed, no password, RG, erasure, sign-in locked, support-set password, history unreadable), then `canReverify`; checks the password; under `wallet:<botUser>` refuses if the hash changed again while the owner typed, if a void was written since the pre-check (compared by value), or if the account changed since (below); otherwise the new fingerprint and `verifiedAt`, AUTO_PAUSED → PAUSED(MANUAL), event VERIFIED, ~~and the holder's "Your permission was confirmed"~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** no confirmation reaches the holder (C4 ruling 149). It never starts the bot.

**What can land while the owner types** (review `wf_2208135b-079`, MC-1/LI-3/MC-4). Designate and re-verify take a check time before eligibility, and `verifiedAt` is that time, never the write time: a void, a break or a self-exclusion that lands during the password check is later than it, so it still stands. Under `wallet:<userId>` both re-read the account (`accountChangedSince`): closed, an erasure request, a responsible-gambling lock, or a self-exclusion or break started after the check time refuses with no row. `setConsentVoid` stamps `GREATEST(clock_timestamp(), verifiedAt + 1 ms)`, so a void written after a verification is always later than it. The real `selfExclude` already serialises with both writes: its wallet freeze takes the same lock.

**`startHouseBot({officerId, botId, rulesContext})`** in 02 §3.3's order: removed → eligibility → consent (PASSWORD_CHANGED, CONSENT_VOID, RG_SINCE_VERIFIED) → the saved rules and caps (`parseHouseBotRules`, `rulesStartProblems`) → today's loss cap → the holder's own loss limit. Under `wallet:<botUser>` consent is read again, then ACTIVE, `scopeFrom` now and STARTED. With the master switch OFF the bot still starts and the result says `masterOn: false` (C10).

**Erasure** (`anonymizeClosedAccount`, A5/R6): a non-REMOVED bot refuses (`house_bot_live`) before any destructive write; the check runs under `wallet:<userId>`, the lock designate writes under. Every owner is alerted once per bot (`notifyAdminsHouseBotErasureBlocked`, AlertOnce `erasure-blocked:<botId>`); a send that reached no one gives the claim back (`houseBotAlertOnceStore.release`), so the next attempt still tells someone. After Remove, erasure redacts the quoted label to `"Erased bot <TAIL6>"` in that bot's own HOUSE_BOT notices only (rows linking to the bot, or written while it was designated — a freed label may name another holder's live bot) and pseudonymises the bot rows (label `Erased <TAIL6>`, note, `removedReason`, event and press reasons `[erased]`), counting `houseBots` and `houseBotNotificationsRedacted`; a re-run counts zero. A routine that throws part-way is recorded by `fulfillDsarRequest` as a blocked erasure (reason `error`), never an unhandled error.

**Officer email stamp** (`setUserEmail(…, {byOfficer})`): a stamp that still counts (a reset-link password at or after it, within 30 days) is never overwritten by a later officer edit.

**The withdrawal over a standing void** (`voidHouseConsent`, HOLDER_WITHDREW): the void's cause becomes HOLDER_WITHDREW (`upgradeConsentVoidCause`), with a CONSENT_VOIDED event naming what it superseded, the COMPLIANCE row ~~and the holder's confirmation~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** no confirmation reaches the holder (C4 ruling 149). A repeat changes nothing.

---

## 7. Console map

⏳ Written in commit 7.

---

## 8. Reporting

⛔ **Superseded by D20 (Ali, 2026-09-17):** there is no house report. Struck from what this section was to hold: the house-liquidity report, the house-market statement, the R7 audit index, the month picker, the transactions CSV's `house` filter and `house_bot_id` column, and the owner-only per-bot CSV (C5-SPEC rulings 199–213; 211 and 212 stay recorded only as platform defects L26/L27, no longer release preconditions); PLAN §9's house lines and exclusions — `MoneySummary.house`, the Gaming Board pack's house memo, the FIU SAR's Context column, match integrity's house parts, daily ops' house rows, the finance "House bots net" tile and margin delta, the `/admin/house` marker card, the compliance holder chip, and the active-player, unique-player, top-contributor, insights, harm and AML exclusions (224–231); and the per-bot fee figure's reporting use (below). What stands: every report, statutory filing, admin count and detector treats a house bot's account exactly like any player's; R8's durable audit reads for the report pack and RG engagement (214–216); and C5-8 writes this section to say so.

**Written in commit 5 (C5-8, 2026-09-21) — and what it says is that there is nothing special to say.**

**The rule, in one sentence: every report, statutory filing, admin count and detector treats a house bot's account exactly
like any other player's account.** There is no house split, no house filter, no house column, no house memo and no house
report. A stake 50pick places on a holder's account enters the books as that holder's bet and is counted, taxed, reconciled
and reported as one. That is not an omission to be filled in later — it is the whole of §8 under owner ruling D20.

What that means concretely, each item measured on this tree rather than quoted:

| What a reader might look for | Where it actually is |
|---|---|
| A "house" filter or `house_bot_id` column on the transactions CSV | **Does not exist.** `grep` over `src/lib/server/reports/` and `src/app/admin/reports/` returns no `houseBotId`, `house_bot_id`, `excludeHouse` or `houseOnly`. |
| A `MoneySummary.house` split | **Does not exist.** `report-money.ts` carries no house branch at all; money is summarised once, for everyone. |
| A house-liquidity report or house-market statement | **Never built.** `HOUSE_REPORT_IDS` still names the two ids (`house-liquidity`, `house-market-statement`) and `REPORT_CATALOGUE` has **no entry** under either. The list survives on purpose (replan ruling 271): `OWN_AUDIT_EXCLUDED_ACTIONS` in `user-service.ts` derives the excluded audit actions from it, so an officer's own "Export my data" and `/profile/account` feed can never carry a house word even if a fixture database still holds a row written under one of those actions. |
| A Gaming Board house memo, an FIU SAR Context column, house rows on daily ops, a "House bots net" finance tile, an `/admin/house` marker card, a compliance holder chip | **All struck by D20** (C5-SPEC rulings 224–231) and none is built. |
| The per-bot fee figure | **Un-built** — see the row below. |
| An exclusion of house stakes from active-player, unique-player, top-contributor, insights, harm or AML counts | **There is none, and that is the ruling.** A designated account is a real person who keeps full use of their account (D3); excluding it would misstate those counts, not correct them. |

**What §8 DOES own, and it is the part that is built:** R8's durable audit reads, so a report that reads audit history
reads the DATABASE and not the per-container in-memory ring (which empties on every deploy and would silently shorten a
regulator-facing list). Two readers, deliberately different, each pinned by `test:house-bot-reports` §8.216:
- `report-pack.ts` uses **`getAuditForTargetsDurable`** — filtered by target AND actions in SQL (ruling 214). ⚠️ Not
  `getAuditByActionsDurable`: the by-actions reader would pull every account's rows and filter in JS, which is the
  difference between a bounded query and a table walk. The module's own header says so.
- `reports/catalogue.ts`'s RG engagement uses **`getAuditByActionsDurable`** over `RG_AUDIT_ACTIONS` (COMPLIANCE
  category), and masks the subject with `maskUserId` — the file outlives erasure, so it may not carry a raw user id.
- `house-bot/oversight.ts` uses both, for the market-action and bulk-action halves of the staff-stake sweep.

⚠️ **The ring-emptying proof (ruling 216) is the point of the pins, not a detail:** swap either reader back to its
in-memory twin, or unmask the RG subject, and a named assertion goes red. All three were driven by hand in C5-8 and each
turned its own assertion red (`8.216.1`, `8.216.3`, `8.216.5`).

- ~~**Fee withheld per bot is derived, and proven against the ledger**~~ (C5-SPEC ruling 183). ⛔ **UN-BUILT in C5-5b** (owner ruling D20, Ali 2026-09-17; replan ruling 266): its only planned consumer, R1 section 3, is struck, and commit 7's console shows money only as usage against a configured limit — so the derivation had no caller, and a reader with no consumer is not kept. Removed from `src/lib/server/house-bot/book.ts`: `derivedFeeShares`, `foldEntryBook`, `houseStaffScorecard` and the widened `houseBotBook`; removed from the DAL twins: `houseBookStore.feeInputs` and `ledgerRows`; removed from `test:house-bot-reports`: §2 (the ledger cross-check) and §1. `HouseBotBook.feeWithheldTzs` is null again, as it was in commit 1, and `houseBotBook` itself has no caller — Commit 7's rulings give it one or delete it. PLAN §18's row "R3 fee withheld per bot" is superseded in place.

---

## 9. Alert matrix

Every emitter is built, each with a `comms-registry` row, under notification kind `HOUSE_BOT`. ⚠️ `HOUSE_BOT` is **not** a money kind, although PLAN §7 put it there: a money kind must state a figure (`test:cert-c3` §6) and these notices state none. **Ali confirmed that on 2026-09-15** (W17): the notices stay in the inbox and out of the Money filter, so the platform's rule stays as strict as it is.

⛔ **Owner ruling D19c (2026-09-16): the holder receives no house-bot notice or email at all.** Commit 3's `notifyHouseBotOwner` (eight holder notices) and `houseBotOwnerHtml`, and step 9's holder emitters, were built and then REMOVED in the eighth session (C4 ruling 149); every row below is an admin's. **Commit 3** built `notifyAdminsHouseBotErasureBlocked` and the template `houseBotErasureBlockedAdminHtml`. **Commit 4 step 9** added:
- the eight admin emitters — `notifyAdminsHouseBotBet`, `…StaffChosen`, `…HourSummary`, `…Paused`, `…Switch`, `…MoneyEvent`, `…Alert`, `…Roster`;
- **one** parametrised admin letter, `houseBotAdminHtml`, behind every alert that emails (royal chrome, never gold);
- `src/lib/house-bot/alert-copy.ts`: every alert code's words in three languages, derived from the engine's own call sites, with a fallback row so an unmapped code never reaches an admin as a bare machine token. It is pure — the caller injects the money formatter, because the house module law admits a small, deliberate set of value imports;
- `src/lib/server/house-bot/emitters.ts`: the real `EngineAlerts` and `HolderAlerts` (admins only), which also own the admin bell's hourly cap (the planner's summary accounts for exactly what it suppresses).

The throttle keys are fixed in `ALERT_KEY`. Proven by `test:house-bot-comms` (39/0 on both stores), `test:cert-c3` (1521/0), `test:cert-c1` (1215/0, its template inventory pinned at 66) and rendered: `qa:cert-c1` photographs all four shapes of the admin letter at 1280, 768, 360 and 1920, and `qa:house-bot-bells` stands the app up on a scratch database, writes every house row through the real emitters and photographs the bell and the inbox.

### 9.1 Channel law
- ⛔ **`HOUSE_BOT` is never sent by SMS** (C13). F6's channel policy is built: `CHANNEL_POLICY` and `channelAllowed(kind, {houseOnly})` live in `comms-registry.ts` beside the kinds, exhaustive by annotation so a nineteenth kind cannot ship without a row. `HOUSE_BOT` is `sms: "never"`, `email: "template-only"`; and when every position behind a notice is house-marked, `channelAllowed` returns neither channel for ANY kind ~~— the holder's hourly summary is the one account of those stakes, and it is a bell~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder summary (C4 ruling 149); the holder's in-app notices for those stakes are byte-identical to any player's, and only the email is withheld (F6, C4 rulings 143–144). ⚠️ SMS fan-out is not live (the provider is two stubs), so the policy's pin is a source walk over the house emitters rather than a behavioural drive, which would be a check that cannot fail.
- Admin alerts go to everyone `houseBotAlertRecipients()` returns, the same rule as the owner guard (A22).
- ⛔ **Nothing reaches the holder (D19c).** Their win, loss, refund, verdict and selection-closed notices are byte-identical to any player's (C4 rulings 143–145); the only difference is F6's: no per-stake outcome EMAIL for a house-marked position, which carries no words. `test:house-bot-disclosure`, `verify:house-bot-bundle` and `qa:house-bot-holder-view` prove the absence (rulings 152, 155).
- Bodies never quote an officer's reason, and name a holder or a trigger player only by their `Player #` handle (R6).
- Every link still opens its event 60 days later; on a REMOVED bot it opens the read-only page.
- A PLACED row's alert is claimed once through `alertedAt` and repaired 30 s later if the send was lost (A8).

### 9.2 Who is told, over which channel

| Event | Emitter | Audience | Channel | Throttle | Link |
|---|---|---|---|---|---|
| A fresh automatic house bet is PLACED | `notifyAdminsHouseBotBet` | Admins | Bell | While runtime `global` `countInHour` ≤ `bellAlertsPerHour`. Staff-chosen rows are excluded, and never consume the count. | `/admin/desk/<botId>?tab=activity&range=all&intent=<intentId>` |
| Automatic bets beyond that cap | `notifyAdminsHouseBotHourSummary` | Admins | Bell | Once per EAT hour (`summary`). Adds "{s} staff-chosen stakes were alerted one by one" when s > 0. | `/admin/desk?tab=activity&range=today` |
| A staff-chosen stake is PLACED (Enter now, or a target's reaction) | `notifyAdminsHouseBotStaffChosen` | Every recipient | Bell + email | Uncapped, and not counted in `countInHour`. | `/admin/desk/<botId>?tab=activity&range=all&intent=<intentId>` |
| An ACTIVE bot auto-pauses | `notifyAdminsHouseBotPaused` | Admins | Bell + email | Never capped. A consent void adds "Its {n} active targets were ended." when n > 0. | `?reverify=1` when the way out is re-entering consent (a password change or a consent void); otherwise the bot page |
| A cause is added to a bot that is not ACTIVE | C13 matrix | Admins | Bell | — | The bot page |
| The holder's account is closed | C13 matrix | Admins | Admins bell + email with the float amounts (the holder gets only the platform's own closure letter, which names nothing) | — | The bot page |
| A holder cause clears (account restored, freeze lifted, role back to PLAYER, break ended) | C13 matrix | Admins | Bell | Once per cause and clearing (`cleared`) | The bot page |
| The holder is locked out by wrong sign-ins | C13 matrix | Admins | SECURITY bell | Once per bot per EAT day (`holderLocked`). The bot continues. | The bot page |
| The holder stakes against their own bot (A21) | C13 matrix | Admins | Bell + email | Once per bot and market (`holderAgainst`). Writes event HOLDER_AGAINST_BOT. The bet is never refused and the bot never paused. | `/admin/markets/<marketId>` |
| The master switch goes ON or OFF, by hand or automatically | `notifyAdminsHouseBotSwitch` | Admins | Bell + email | Every one | `/admin/desk` |
| Money moves on an ACTIVE bot's account (deposit credited, withdrawal requested, AML hold, paid, failed or AML-rejected, officer adjustment) | `notifyAdminsHouseBotMoneyEvent` | Admins | Bell + email | Never capped; two identical events are two rows | `/admin/transactions?q=<txnId>` |
| Roster changes: DESIGNATED, VERIFIED, STARTED, a manual PAUSED, REMOVED, RULES_SAVED and LIMITS_SAVED with a before → after diff, TARGET_ADDED, TARGET_UPDATED, TARGET_REMOVED, and TARGET_ENDED from a staff veto | `notifyAdminsHouseBotRoster` | Every recipient | Bell + email | Uncapped; the title ends HH:MM:SS | `/admin/desk/<botId>?tab=history&event=<eventId>` |
| A target ended by the planner, by Remove or by the sunset | — | — | No alert | History and the targets tab record it. | — |
| An engine alert (a failed intent, a poison row, a stake not whole, a balance or cash-only skip, and the other keys in §9.3) | `notifyAdminsHouseBotAlert` | Admins | Bell + email | Once per bot, code and EAT day, unless §9.3 gives the key | `/admin/desk/<botId>?tab=activity&range=all&outcome=failed&intent=<intentId>` |
| A market holding a staff-chosen stake is voided or reopened | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | Once per market (`staffStakeVoided`) | `/admin/markets/<marketId>` |
| A market holding a staff-chosen stake is decided by the officer who chose it (resolved, voided, reopened, objection upheld or rejected) | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | Once per market and action (`staffStakeSelfDecided`). A record only: nothing is refused. | `/admin/markets/<marketId>` |
| ~~An officer's staff-chosen stakes meet a staff-edge threshold for the month~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** this alert is struck and was never built (C5-SPEC rulings 218–223). | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | ~~Once per officer per month (`staffEdge`)~~ | ~~`/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>`~~ |
| An erasure is refused because the account is still a house bot (R6) | `notifyAdminsHouseBotErasureBlocked` | Every recipient | Bell + email | Once per bot (`erasureBlocked`) | `/admin/desk/<botId>` |
| A press, or a target's reaction, refused, expired or cancelled | — | — | No bell | The press register and the activity feed record it. | — |

### 9.3 Throttle keys (`ALERT_KEY`)
- A throttle key is built only by `ALERT_KEY` in `src/lib/house-bot/constants.ts`. A key built anywhere else can be spelled two ways, and then it fires twice.
- A key ending in an EAT day, hour, month, the month just ended, or minute is returned as `{prefix, unit}`, never as a finished string: the claim appends `:` and the suffix inside its INSERT, from DB `now()` (§5.3).
- Every row lives 30 days (`HouseBotAlertOnce`, §2.1).

| Builder | Key | EAT suffix | For |
|---|---|---|---|
| `botDaily(botId, code)` | `bot:<botId>:<code>` | day | One alert per bot, code and day (balance and cash-only skips) |
| `penalty(userId)` | `penalty:<userId>` | day | The penalty box: an account is boxed for the EAT day |
| `password(botId, fingerprint)` | `pw:<botId>:<fingerprint>` | — | One password-pause alert per new fingerprint, never silenced by a same-day key |
| `engineDb()` | `engine:db` | hour | Transient database failures lasting 2 minutes |
| `pollerFailing()` | `engine:poller_failing` | hour | Ten poller failures in a row |
| `clockSkew()` | `engine:clock_skew` | day | A container clock past the tolerated skew |
| `dbTimezone()` | `engine:db_timezone` | day | The database clock's timezone check |
| `poison(intentId)` | `poison:<intentId>` | — | A claimed row that failed three times |
| `stakeNotWhole(botId)` | `stake-not-whole:<botId>` | day | A stake refused as not whole |
| `udBornUnlocked(roundId)` · `udOrphanMarket(marketId)` | `ud-born-unlocked:<roundId>` · `ud-orphan-market:<marketId>` | — | Existing player-side holes the engine reports once each (A12) |
| `chainInScope(botId, chainId)` | `chain-in-scope:<botId>:<chainId>` | — | A chain in a bot's scope (A16) |
| `settleBlocked(botId)` | `settle-blocked:<botId>` | day | Settlement blocked for that account (A16) |
| `exitConfig(hash)` | `exit-config:<hash>` | — | The exit rules changed (A16) |
| `holderAgainst(botId, marketId)` | `holder-against:<botId>:<marketId>` | — | The holder staked against their own bot (A21) |
| `holderLocked(botId)` | `holder-locked:<botId>` | day | The holder locked out by wrong sign-ins |
| `rgEnded(botId, coolingOffUntilIso)` | `bot:<botId>:RG_ENDED:<iso>` | — | A cooling-off break ended (C8) |
| `nameRisk(botId, nameHash)` | `bot:<botId>:NAME_RISK:<hash>` | — | A display name that can reveal the account (C9); the hash is computed on the server |
| `cleared(botId, cause, clearedAtIso)` | `bot:<botId>:CLEARED:<cause>:<iso>` | — | A holder cause cleared |
| `summary(audience, botId)` | ~~`summary:<admins or holder>:<botId or all>`~~ `summary:admins:<botId or all>` | hour | The hourly summaries, built from PLACED intents. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder's summary is never sent (C4 ruling 149); the only caller claims `summary:admins:all` (`planner.ts`). ~~`constants.ts` still accepts `holder` as the audience, as built (C5-SPEC ruling 258).~~ ✅ **NARROWED 2026-09-21 (C5-8, carrying out ruling 258 under C4 ruling 149).** The parameter is now `audience: "admins"` with no union, and `test:house-bot-rules` §11.27 pins it with a planted control. ⛔ **Why this sentence had to go, and it is the more important half:** it cited ruling 258 as the authority for NOT carrying out ruling 258 — a document that is true about the tree and false about its own authority, which is the worse of the two failures, because the next reader treats the gap as decided rather than owed. |
| `productDenied(value)` | `product-denied:<value>` | day | A stake on a product line no policy row admits (F1) |
| `rulesFuture(botId, version)` | `rules-future:<botId or global>:<version>` | — | Rules or limits saved by a newer build (F4) |
| `boundsInvalid(botId, hash)` · `boundsClamp(botId, hash)` | `bounds-invalid:<botId>:<hash>` · `bounds-clamp:<botId>:<hash>` | — | The live stake bounds moved: the bot can no longer bet, or its stake is clamped (F5) |
| `boundsCantFit(botId, field, hash)` | `bounds-cant-fit:<botId>:<field>:<hash>` | — | An Enter now stake or staff-chosen cap below the live minimum (N1 §5) |
| `erasureBlocked(botId)` | `erasure-blocked:<botId>` | — | An erasure refused while a live bot exists |
| `staffStakeVoided(marketId)` | `staff-stake-voided:<marketId>` | — | §9.2 |
| `staffStakeSelfDecided(marketId, action)` | `staff-stake-self-decided:<marketId>:<action>` (action: resolved, voided, reopened, objection_upheld, objection_rejected) | — | §9.2 |
| ~~`staffEdge(officerId)`~~ | ~~`staff-edge:<officerId>`~~ | ~~previous month~~ | ~~The monthly staff-edge alert. It runs only on the first EAT day of a month, for the month just ended, and the key carries that month (an October run writes `staff-edge:<officerId>:2026-09`).~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge alert is struck (C5-SPEC rulings 218–223); the builder is in `constants.ts` as built, with no product caller. |
| `preview(actorId, botId, marketId)` | `preview:<actorId>:<botId>:<marketId>` | minute | At most one ENTER_NOW_PREVIEWED event per officer, bot and poll per minute |
| `submit(actorId, submitId)` | `submit:<actorId>:<submitId>` | — | The double-tap claim for presses other than Enter now, target and staff-cancel presses, which write a `HouseBotPress` row instead |

---

## 10. Disclosure surfaces

⛔ **There are none, and that is the ruling** (owner ruling D19, 2026-09-16 — `COMPLIANCE-DECISIONS.md`).

⛔ **Owner ruling D20 (Ali, 2026-09-17), just below D19:** the admin console and the regulator's paper carry no house split either. Every report and statutory filing — the Gaming Board monthly pack and the FIU SAR included — treats a house bot's account as an ordinary player's account, with no house memo, column or line, and the private Board draft (commit 6) says so.

| Surface | What it says about house bots |
|---|---|
| The two rulebooks, Terms, the privacy notice, the FAQ, the home copy | Nothing. They keep the words they have on `main`: no carve-out, no disclosure line, no version bump, no announcement. |
| A holder's own screens and notices | Nothing. A house stake looks exactly like the holder's own bet, and the holder receives no house-bot notice or email at all. |
| The chatbot | Nothing — and it may never claim the opposite (D19d). ⭐ **This is the only surface a player can INTERROGATE**, so the guard is built to the artefact and not to a file: `test:house-bot-disclosure` §6 holds four channels — the live system prompt, the live channel's other player-read text (the capacity, empty-reply and trouble fallbacks), the **stub corpus** a rate-limited player is actually answered from, and `faq8a` plus the chat chrome in every locale `Object.keys(dict)` yields. The model is handed **no tools, no retrieval and no server-side context** (6.5, 6.5b), so it cannot repeat a house fact — it is never given one — and the prompt's `${...}` set is CLOSED (6.4), which refuses the next channel rather than policing the six that exist. The two live holes carrying operator-written text are the support email and dial target, and the shipped validator is executed against every plant to prove a sentence cannot be stored in either (6.9). 🔴 **6.2f closes a hole this build found in its own scope:** D19d is about lying, D19 is about the feature being NAMEABLE, and the shared lexicon (ruling 175) had never been run over this text at all — §1 does not follow a `"use server"` module and `verify:house-bot-bundle` reads rendered pages, which a system prompt never becomes. 0 hits over 25,271 characters on the day it was added. ⚠️ **What it does NOT hold, said out loud:** what the model IMPROVISES when asked a question its instructions never answer, and the support `phone` DISPLAY field — `plans/house-bots/DEFERRED-TESTS.md` §1o rows 200 and 201. ⛔ None of it required editing `src/app/_actions/chat.ts`, which 6.6 pins byte-identical to `origin/main`. |
| Every other player surface | Nothing — and as of 2026-09-20 that is held over the WHOLE population rather than a corner of it. `test:house-bot-disclosure` §5.2 reads every string literal, template part and JSX text of all **394** player-rendered files (`src/app/` outside `admin/` and `api/`, `src/components/` outside `admin/`) — **585,817 printed characters, 0 hits**, comments stripped first. ⚠️ **What this row used to claim and could not support:** §1 walks the CLIENT import graph and cannot see a server component at all, and the only measure that DID read printed text (`test:house-bot-reports` 0.198.3) read exactly **two** files while its own neighbour 0.198.1 walked the whole population for imports — so a house sentence typed into a rulebook, the home page or the leaderboard was held between builds by nothing. §5.1 also pins the published legal text, the Terms version stamp and the dictionary byte-identical to `origin/main`. The route handlers §5.2 excludes are covered by an EXECUTED sweep over what they return (11.171, 11.247), and §5.2b asserts that guard exists rather than assuming it. |
| The Gaming Board of Tanzania | **Nothing, and no paper is owed.** ⛔ **STRUCK 2026-09-20 by owner ruling D21:** `BOARD-DISCLOSURE-HOUSE-BOTS.md` never existed and is not to be written. Ali reports that the Board needs no disclosure about house bots; no document is on file and none was requested. The reasoning is **D20, already built** — house stakes count in GGR and the levies as player activity with no house memo, so the statutory figures the Board receives are **identical whichever account placed the stake**, and there is nothing in them for a disclosure to correct. ⚠️ It satisfies **no** condition: F6 §5 condition 1 (written GBT approval) stays waived by D1 and NOT satisfied. ~~`BOARD-DISCLOSURE-HOUSE-BOTS.md`, a draft for Ali, plus the house-liquidity report and CSV in the admin console~~ (the report half was already struck by D20; C5-SPEC rulings 199–213). Held by `test:house-bot-disclosure` §8. |

The commit-6 suite is therefore a **non-disclosure** suite: it fails if any of that text appears, and it pins the
rulebooks, Terms and the privacy notice byte-identical to `origin/main` (§5.1, against `418f1b59` on 2026-09-20 —
16 files, 0 differing, and the SHA it compared against is printed by the assertion itself).

⭐ **And it is now in a pipeline.** Until 2026-09-20 `test:house-bot-disclosure` ran only through `test:all`'s
auto-discovery of `test:*` keys, and `verify:house-bot-bundle` — the sole authority over server-rendered player pages
and `public/` — ran in **no chain at all**, because it is not a `test:*` key and nothing named it. Both are in
`predeploy` now, the bundle scan immediately after `npm run build` so its own staleness refusal cannot fire, and §0-pipe
asserts the ORDER, not just the presence. A gate not in the pipeline is not a gate.

---

## 11. Runbook

### Release (R0–R6)

Seven steps. ⛔ **Ali's "go" sits between R0 and R1 and nothing may be done ahead of it.** His words, recorded
2026-09-19: *he will not turn the switch on until a session tells him, in writing and on evidence, that it is
ready.* So the sequence is fixed — a session states readiness, Ali decides — and a green gate is never permission.

| Step | What it is | How it is proved |
|---|---|---|
| **R0** (T-1 day) | Merge `origin/main`. Everything green on ONE SHA. Checklist to Ali. | `npm run test:all`, every `red:house-bot-*`, `npm run qa:house-bots-local`, `npm run qa:house-bots-visual`, the S4 rehearsals, the coverage gate (`npm run test:scenario-coverage` — read its printed bracket, do not tick it), `npm run ops:release-migration-parity` GO and `npm run ops:preflight-house-bot-migrations` GO |
| **R1** | A quiet hour is CHOSEN — not computed. | The preflight prints the bets in the last 15 minutes as evidence; ⛔ never during the nightly trial balance, and never a window under 10 minutes |
| **R2** | The migrations, if any are still pending. ⚠️ **Struck for THIS release** — see below. | `npx prisma migrate status` against the production URL, then `migrate deploy`, then each row's checksum |
| **R3** | While the OLD container still serves: the schema read is true, the switch is `false`, `/api/health` is ok, the Position count is still rising. | `npm run ops:house-bots-status` and one `/api/health` read |
| **R4** | Merge and deploy. | The deployed commit re-derived from the live response header, never from a recorded number |
| **R5** | Five figures, on the live database: **OFF · 0 accounts · 0 marked rows · an engine boot instant · a fresh planner beat**. | One run of `npm run ops:house-bots-status` |
| **R6** | The first switch-on guide goes to Ali. | The section below |

⛔ **R0's third condition was rewritten on 2026-09-20, and this is the note that says why.** It used to read
*"`git diff origin/main...house-bots --stat -- prisma/migrations` shows exactly the 2 house folders"*. That
sentence described a world in which the house DDL was unmerged. Ali pushed the branch himself on 2026-09-18, so
both folders are in the MERGE BASE, and a three-dot diff only ever shows what the merge base lacks: the true
value is now permanently **0** and can never again be 2. Nothing executed the row — it was a checkbox — so the
risk was never a red gate; it was an officer ticking a box whose sentence had stopped describing anything.
`npm run ops:release-migration-parity` replaces it and checks what still decides whether the container boots:

1. **Byte parity** of every migration folder both refs carry. `start` is `prisma migrate deploy && … && next start`,
   so one edited byte in an already-applied migration fails the checksum, `next start` is never reached, and the
   container does not boot — a platform-wide sign-in outage, not a bad release. A line-endings-only difference is
   still a stopper and is reported as such, because the fix is different.
2. **Forward difference** — folders here that the ref lacks. Each one applies the moment the new container starts
   and must be named in Ali's "go".
3. **Reverse difference** — folders on the ref that are missing here. The branch is behind; merge first.

⛔ It is not a `test:` key and must not become one: it reads a remote-tracking ref, whose freshness belongs to the
machine and not to the tree. ⛔ And it never fetches — an unresolvable ref is **NOT MEASURED (exit 3)**, never GO.

⚠️ **R2 is struck for this release, and the reason is recorded rather than quietly dropped.** Its pre-check —
*"`migrate status` shows exactly the 2 house migrations pending"* — is false by events: both are applied. Applying
nothing needs no exception to *"migrations reach production only through the deploy"*, so striking R2 REMOVES a
manual production write from the release. That is a safety improvement, but it changes what Ali is being asked to
approve, so it is put to him at R0 and never edited away quietly. R2's text stands as the standing procedure for
any FUTURE house migration.

### Migration preflight

`npm run ops:preflight-house-bot-migrations` — **read-only**: no DDL, no DML, no transaction. Run it against the
production database at R0 (with Ali's go) and again at R3. Seven sections; it exits **0 GO** or **1 NO-GO** and
prints every number it counted.

1. **The migration files it was written against** — the two house folders and their five index names are read OFF
   `prisma/migrations/…_house_bot_markers/migration.sql`, never typed here. A split or renamed folder is reported
   instead of silently skipped. ⚠️ It is **five**, not four: the four that name `houseBotId` plus the sweep keyset
   `Position_placedAt_id_idx`, which is built under the same `ACCESS EXCLUSIVE` lock.
2. **`now()` and the TIMEZONE — and it is a VERDICT, not a print.** The engine refuses to start on any zone
   outside UTC. A non-UTC database lets both migrations apply perfectly and then leaves the engine silently dead on
   every replica, which is the worst shape a release can take: green everywhere, and nothing running.
3. **Position and Transaction rows and sizes**, against the A23 ceilings of **500,000** and **1,000,000**. Over
   either one it is a NO-GO that points at the hand-apply block in the markers migration by file and line: build
   the five indexes `CONCURRENTLY` by hand first, so the migration is a no-op.
4. **The eight house tables and the seven marker columns**, imported from the module the engine's own readiness
   gate uses — so the preflight and the engine cannot disagree about what "migrated" means.
5. **The five indexes, through `indisvalid`.** ⛔ Not by name: a failed `CONCURRENTLY` build leaves an INVALID
   index under the SAME name, and the migration's `IF NOT EXISTS` would keep it. An index that exists but is
   invalid is a NO-GO a by-name check cannot see.
6. **The migration history** — a `_prisma_migrations` scan for any unclean row. `migrate deploy` stops at the
   FIRST one, so an unrelated stuck migration would present as the house migration breaking production.
7. **Bets in the last 15 minutes** — evidence for R1's judgement, printed and never turned into a verdict. A quiet
   hour is chosen by a person; fifteen minutes of history cannot tell you whether the next fifteen are quiet.

⛔ **What cannot be measured before the day:** the production row counts and sizes, and whether any of the five
indexes already exists there as INVALID. Both need a production read, which this programme is barred from taking
outside R0. Everything else — every catalogue query, both threshold branches, the timezone verdict, the unclean
scan — is exercised on scratch Postgres by `npm run test:house-bot-ops`, which runs the preflight before AND after
`migrate deploy` on a database of its own and then breaks it one fault at a time.

### Rollback levers

Four levers, weakest blast radius first. Each row says what it stops, what it costs and what it leaves behind.
⚠️ 01's own name for this section is "Rolling back past the house-bots merge"; it is the same procedure.

| Lever | Stops | Deploy? | Speed | Leaves behind |
|---|---|---|---|---|
| Pause or Remove one account (console) | that account | no | < 1 s | its live intents cancelled |
| Master **OFF** (console) | every house bet | no | < 1.5 s | every live intent cancelled, one SWITCH_OFF event, one compliance row, one alert |
| `npm run ops:house-bots-off -- --apply` | every house bet | no (direct pg) | seconds | the control row and **one SWITCH_OFF event** — and **the live intents are NOT cancelled** (see below) |
| Maintenance mode | every bet, players included | no, but it is a per-container latch | immediate on one replica | a player outage |
| `HOUSE_BOT_ENGINE=false` | the timers and the bet hook | **redeploy** | minutes | nothing |
| Revert the merge | all house code | **yes, a build** | build time | the migrations stay (expand-only) |

**When to reach for the terminal OFF instead of the console.** Exactly two situations, and they are the two the
console cannot serve: a deploy changed the Server Action ids under an open tab, so every press posts to an id that
no longer exists; or the app's Prisma pool is exhausted and the console cannot reach the database at all. The
script uses a direct `pg` client for that reason — the data layer runs every statement through the app's own pool,
which is precisely what is gone in the second case.

⛔ **It takes NO lock, and that is the point.** Every fire re-reads the control row inside its own lock, so an OFF
that has committed already binds every bet not yet holding `house:control`. Taking the lock first would let one
hung bet hold the switch open for the whole transaction timeout.

⛔ **It does NOT cancel live intents, and it says so on screen.** The console's OFF cancels them; this one leaves
them standing, prints how many it left and prints the exact statement that cancels them. Cancelling is a
table-wide write, and a script written to hold nothing must not take one. Nothing can stake while the switch is
off; the rows are queued stakes that will never fire, and they are cancelled either by that statement or by the
console's own Switch off once the console works again.

⛔ **It writes NO compliance audit row, deliberately (D-OPS-2).** `audit()` takes a database-wide advisory lock,
reads the true chain head and HMAC-chains the entry; a hand-written `AuditLog` INSERT from a direct-pg script
would BREAK the chain — the one artefact whose purpose is to prove nothing was rewritten. **The SWITCH_OFF event
row is the record, and the officer files the compliance note by hand.** ⛔ Do not "fix" this by adding an INSERT.

**After a rollback window — the re-release law.** Old code has no marker in its client, so its payout, refund and
cash-out rows are written unmarked, it lets house positions be cashed out, and it accrues commission on them.
Before any later house deploy:

1. `npm run ops:house-bots-status -- --drift` must report **0** on all three legs. The run is time-bounded;
   widen it with `-- --drift --since 90` and read the bound it prints.
2. Leg (a) — unmarked ledger rows on marked positions — is fixed by `npm run ops:house-bots-remark -- --apply`:
   dry by default, NULL-filling only, **TRANSACTIONS only**, refused while the master switch is ON, reconciled
   inside one transaction and rolled back if the counts disagree. A second run changes 0 rows.
3. Legs (b) and (c) — a cash-out or a commission on a marked position — go into a COMPLIANCE-DECISIONS note with
   amounts. ⛔ Nothing is clawed back automatically.
4. The remark script writes no compliance row either (**D-OPS-3**, and its header argues it): there is no
   `house_bot.remark` audit action and no REMARK event kind, both closed lists pinned by SQL CHECKs. Its REPORT
   is the record — file the note with that output attached.

### Sunset

**What sunset is.** A wind-down that installs a TERMINAL state. ⛔ It is **not** a data retirement: every marker,
intent, event, press and target is kept (A20), and every report keeps every row. ⛔ It does **not** unwind open
money: open house positions **settle normally**, because a pari-mutuel pool cannot void one position, and nothing
is ever voided automatically. ⛔ It tells no holder anything (D19).

**It is two acts, and the order is the point.**

1. `npm run ops:house-bots-sunset` — read the census it prints. Then
   `npm run ops:house-bots-sunset -- --apply --reason "<why, 5–300 characters>"`.
   Seconds, no deploy: the desk is terminal the moment it commits. It writes, in this order: the control row to
   `offCause = SUNSET`; per account, every ACTIVE target ENDED(SUNSET) with one TARGET_ENDED event each and then
   the account REMOVED(SUNSET), one transaction per holder; that account's live intents cancelled; one REMOVED
   event per account plus **one** global SUNSET event; **one** `house_bot.sunset` compliance row carrying
   `{ bots, cancelled, openExposureByMarket }`; and **one** admin alert for the whole wind-down.
   ⛔ Your `--reason` is on the event row and on the account, never in the audit payload: the chain cannot be
   rewritten, and an erasure can reach the first two.
   ⚠️ If it prints `recorded: false`, **the desk IS retired** and only the compliance row failed — file it by hand.
2. Set `houseBots: "WITHDRAWN"` in `src/lib/feature-state.ts`, commit and deploy. Act 1 is a database marker that
   survives a redeploy of an older image; act 2 is a code constant that survives a database someone edits by hand.
   ⛔ Neither may become the only one that holds: each alone refuses the master switch, the roster and the engine.
3. Then run `npm run ops:house-bots-status` until the open marked positions reach **0**. They settle on their own.
   ⛔ Never void, refund or cash one out to make that number fall faster.

A second `--apply` changes nothing, writes no second event, no second compliance row and no second alert, and
exits 0 — so a half-finished run is safe to repeat. Sunset is also structurally impossible to undo by switch:
`switchOnHouseBots` refuses `offCause = SUNSET` outright, with code `WITHDRAWN`.

### First switch-on

⛔ **This is Ali's action and his alone.** A session never turns the switch on, never asks him to turn it on
early, and never treats a green gate as permission. What follows is the guide he is handed at R6 — nothing in it
is a step a session performs on his behalf.

**Before the day, on a machine that is not production.** `npm run db:scratch` in one terminal, then
`npm run db:seed-house-bots-local`, then `DISABLE_ADMIN_TOTP=true npm run start`: that is the same desk with four
accounts in the four states, and it is the right place to practise the sequence below. `npm run qa:house-bots-local`
drives the real engine against a scratch database if you want to watch a stake appear without one being at risk.

**The sequence, in order. Each step is refused if the one before it was skipped.**

1. **Limits first.** Global limits govern every stake the desk can place. Set them before an account exists, so
   there is never a moment when an account is startable and unbounded.
2. **Designate** a holder account. It is a real player account with a real password, and the officer types that
   password: the desk records a consent fingerprint from it. ⚠️ If the holder later changes their password, the
   fingerprint stops matching and the account AUTO-PAUSES itself — that is the product working, not a fault.
3. **Rules.** Nothing is in scope on a new account: every mode is off, Enter now and targeting are off, and the
   minimum gap must be at least 20 seconds before it will start. Open only what you intend to watch.
4. **Start** the account. It is now ACTIVE and still cannot stake, because the master switch is off.
5. **ON.** The master switch is the last step, and it is the one that costs money.
6. **Watch the feed for 15 minutes.** ⛔ Switch **OFF** on ANY failed row or any alert you cannot explain. Switching
   off is free and reversible; leaving it on while you work out what a row means is not.

**If anything at all looks wrong.** Reach for the console's master **OFF** first — it is under 1.5 seconds and
cancels every live intent. Only if the console itself cannot be used (a deploy changed the action ids under an
open tab, or the app cannot reach the database) reach for `npm run ops:house-bots-off -- --apply`, and read the
"Rollback levers" section above first: it leaves the live intents standing and writes no compliance row, both by
design and both stated on its screen. After any rollback window, `npm run ops:house-bots-status -- --drift` must
report 0 on all three legs before house bots go near production again.

**What "it is working" looks like.** `npm run ops:house-bots-status` prints the five release figures and four more
the rollback runbook owns — open house positions, live intents, exposure per market, and whether any settlement is
blocked. Every figure names the population it counts. ⛔ A figure with no population named is not a measurement.

---

## 12. Verification record

"NOT MEASURED" means not run, never "passed". A result is recorded only from a run on the commit it names, with the date and machine.

| Commit | What proves it | Where it runs | Result |
|---|---|---|---|
| 1 · schema, migrations, DAL, pure modules, docs | `test:house-bot-rules`: every bound and cross-field rule, the timing golden rows, the clock, the constant pins. Pure, and in `predeploy`, so it cannot skip. | Every machine and CI | ✅ 492/0 · 2026-09-14 · OMEGA-COMPILE01 · on the merged tree (`9836705e`) |
| 1 | `test:house-bot-migrations`: both migrations applied twice on a scratch Postgres (`db:scratch`), every CHECK tuple equal to the code's, the fixed index and constraint names, and the unique and CHECK refusals. Not in `predeploy`, because it needs a database. | A machine with the embedded Postgres. In CI `db-scratch` exits 2 because `embedded-postgres` is not installed, so `test:all` records this key as FAIL, as it already does `test:kyc-restart-docs`. | ✅ 679/0 on PostgreSQL 18.3 · 2026-09-14 · OMEGA-COMPILE01 · `9836705e`; in CI a FAIL (no embedded Postgres), never a green |
| 1 | `test:dal-parity`: every house store method exists in both backends, every Stored key is read and mapped with its schema.prisma kind (BIGINT included), and the unique and CHECK names mirror the migrations — at source level. Behavioural parity is `test:house-bot-migrations` §d. | Every machine | ✅ 1207/0 · 2026-09-14 · OMEGA-COMPILE01 · `9836705e`; `red:dal-parity` 9/9 |
| 1 | `verify:house-bot-migrations-old-build`: the previous build's money path runs on the new schema. It is its own key, **outside `test:all`**: it needs a second checkout with its own install, so it runs at the commit-1 gate and again at REL-0. | The build machine, as its only heavy job | ✅ 12/0 · 2026-09-14 · OMEGA-COMPILE01 · old build `origin/main` `3eb192e9` on this tree's 79 migrations: its own `migrate deploy` "No pending migrations", its money end-to-end 64/0, every row it wrote unmarked |
| 1 | The typecheck, `test:guards-exist`, `test:docs` and `test:red-anchors` | Every machine | 2026-09-14 · OMEGA-COMPILE01 · `9836705e`: typecheck ✅ 0 errors, `test:guards-exist` ✅, `test:docs` ✅. `test:red-anchors` red with the same 2 failures as clean `origin/main` `3eb192e9` (1681 passed here, 1673 there), none a house-bot anchor |
| 2 · money seam | `test:house-bot-seam`: the A14 golden grid, `BET_PATH_REASONS` both ways, `GATE_PARITY`, the SEAM-site pin, the declared H2 order, every sanctioned change. Memory store and source; no database. | Every machine | ✅ 90/0 · 2026-09-14 · OMEGA-COMPILE01 · `3841e807` |
| 2 | `test:house-bot-money` and `test:house-bot-caps`: each case file runs twice, on a scratch Postgres (`db-scratch`) and on the memory store. Markers on every money path, the books balancing, the levy identity, `lockedForHouse` against the JS exit window, the EXPLAIN pin at 20,000/200,000 positions, every cap code at its boundary, bursts, OFF mid-burst, lock timeouts (Postgres only), and a real Up & Down round. | A machine with the embedded Postgres; in CI `db-scratch` exits 2 (a FAIL, never a green) | ✅ money 78/0 memory · 82/0 PostgreSQL 18.3; caps 74/0 memory · 80/0 PostgreSQL 18.3 · 2026-09-14 · OMEGA-COMPILE01 · `3841e807` |
| 2 | `red:house-bot-money`: 45 mutations (the N1/N2 defects, H4/H5, (b)/(e)/(j), I3, the blackout, A9's lock timeout, and the review's findings), each required to turn its own assertion red, every file restored byte for byte | The build machine | ✅ 45 caught, 0 missed, 0 not measured, 0 files dirty · 2026-09-14 · OMEGA-COMPILE01 · `3841e807` |
| 2 | `test:all` (`--skip responsive,motion`) against clean `origin/main` | The build machine | 339/356 · 2026-09-14 · OMEGA-COMPILE01 · `3841e807`: the 17 reds fail identically on clean `origin/main` `3eb192e9` (3 hard-code port 3009: NOT MEASURED); `responsive` and `motion` NOT MEASURED. The market page and resolution panel in the HOUSE_STAKE_ONLY state were not rendered: NOT MEASURED |
| 3 · designation services | `test:house-bot-designation`: the case file runs on a scratch Postgres (`db-scratch`) and on the memory store — eligibility per context, the password check (reserve, rate bucket, double submit, no session), password history, designate races (label and account unique indexes, roster at max − 1), each consent-void cause ending every active target in the wallet transaction with an injected rollback, the C8 flow with a planted fingerprint-only predicate, Start's refusal order, erasure refusal and pseudonymising, the review's findings (§11), and source pins on every password-hash writer | A machine with the embedded Postgres; in CI `db-scratch` exits 2 (a FAIL, never a green) | ✅ 169/0 memory · 161/0 PostgreSQL 18.3 · 2026-09-15 · OMEGA-COMPILE01 · `624f6038`; 24 in-place mutations caught on the memory cases (Postgres half NOT MEASURED) |
| 3 | `test:all` (`--skip responsive,motion`) against clean `origin/main` | The build machine | 340/357 · 2026-09-15 · OMEGA-COMPILE01 · `624f6038`: the 17 reds fail identically on clean `origin/main` `3eb192e9` (14 compared line for line; 3 hard-code port 3009: NOT MEASURED); `responsive` and `motion` NOT MEASURED. Review `wf_2208135b-079`: 15 confirmed, all fixed |
| 4 · engine | `test:house-bot-engine`: the case file runs on a scratch Postgres (`db-scratch`) and on the memory store — the lock exit and strict lease, the pure decisions, the schema gate and `/api/health`, engine boot and back-pressure, the market view, `applyOutcome`, the A15 price read, the Enter now loader and holding rule, and fire and the poller (§1–§16) | A machine with the embedded Postgres; in CI `db-scratch` exits 2 (a FAIL, never a green) | 🟡 interim: memory 398/0 · PostgreSQL 389/0 · 2026-09-15 · OMEGA-COMPILE01 · `d60fba39`; in-place mutations on the steps built so far all caught or recorded equivalent (PROGRESS code log). The info-edge, comms and holder-lifecycle suites and `red:house-bot-engine` are NOT MEASURED: they land with build steps 5–11 |
| 5 | `test:house-bot-reports` (both stores), and the house cases in `test:erasure` and `test:dsar-secrets` | A machine with the embedded Postgres (the reports suite is `db-scratch`-wrapped; the other two are source-and-memory and run anywhere) | ✅ **BUILT AND GREEN · re-derived 2026-09-21 (C5-8, Ali-Blade15), not quoted from an earlier run:** `test:house-bot-reports` **memory 203/0 · Postgres 64/0** (wrapper 3/0); `test:erasure` **226/0**; `test:dsar-secrets` **43/0**. ⚠️ Green is not clearance: what makes these three a measurement rather than a pass count is that C5-8 drove mutations through them by hand — three against §8.216's durable readers (pack-ring, rg-ring, rg-unmasked) and three against the dsar §6–§7 assertions (`X86-A`/`B`/`C`), each of which turned its own named assertion red and was then restored byte-identically. |
| 6 | The disclosure suite, which also pins risks 13–20 and the do-not-restore lines in §13 | — | Lands in commit 6 |
| 7 | The console suite, its RED harness and the visual pass | — | Land in commit 7 |
| 8 | The local end-to-end drive, the S4 rehearsals and the scenario coverage gate | `npm run qa:house-bots-local` 21/0 · `npm run test:scenario-coverage` 18/0 — all 281 register ids measured 2026-09-20: 24 proven by name, 230 carried by an owning suite that exists, 9 struck by D19/D20, 7 deferred, **11 unresolved and named** | Drive ✅ · coverage gate ✅ · S4 rehearsals land in commit 8 |
| Production | ~~Nothing is deployed.~~ ⛔ **Corrected 2026-09-21 (C5-8):** the house-bot CODE is on production (the models, both applied migrations and the engine modules travelled with the platform lane's merges to `main`); the BEHAVIOUR is not — no house bot has ever staked there, held off by `HouseBotControl.enabled` (`DEFAULT false`, read at every staking path). | — | **NOT MEASURED** on the live service config, and it stays that way: ruling 553 forbids this programme reading it. The posture above is proven from the migration and the code only. |

| 4 | `red:house-bot-engine`: 29 declared mutations over the engine, the DAL, the trigger call site and the COUNTER migration — each must turn ITS OWN assertion red, and every file is restored byte for byte | The build machine (a temporary worktree with a `node_modules` junction) | 2026-09-16 · OMEGA-COMPILE01: **22 caught, 0 missed, 0 not measured, 0 files left dirty**, then 5 more (L1–L4 and the pins) and L6's 2, each caught on its own line |
| 4 · D19 | `test:house-bot-disclosure` (the client import graph), `verify:house-bot-bundle` (a real `next build`, then every chunk scanned) and `qa:house-bot-holder-view` (ten pages served to a holder, RSC payloads included, six screenshots at 1280 and 360 opened and read) | The build machine | 2026-09-16 · OMEGA-COMPILE01: **320 house words in the public JavaScript before the un-build, 0 after**; disclosure 15/0; holder view 27/0. Found and fixed while proving it: the holder's data export carried `houseBotId` (ruling 154) and the payout-held box invited an objection the panel refuses (158) |
| 4 | `test:house-bot-info-edge` (A13), A24's EXPLAIN pins at 1M/20k, MON-06 and L6 across two OS processes | The build machine (scratch Postgres) | 2026-09-16 · OMEGA-COMPILE01: info-edge memory 20/0 · Postgres 5/0; every pinned read plans without a sequential scan on `Position`; MON-06 never both; L6 exactly one counter |
| 4 | `test:all` (`--skip responsive,motion`) against clean `origin/main` `b726cb7f` in `F:/kipindi-old-build` | The build machine | 2026-09-16 · OMEGA-COMPILE01 · **349/369 green** here vs **338/358** on clean `origin/main` `b726cb7f`: **19 of the 20 reds are identical in both trees** (recategorise · read-tiers · lock-tx-threading · type-scale · red-anchors · revoked-deadend · admin-section-gate · needle-rest · decomment · updown-digest · updown-source-class · settlement-expectation · orphans · grid-paging · chart-one-home · popup-fit · admin-act-gate · failure-reasons · updown-handover; three of them need port 3009, which another session holds). The 20th, `test:labels`, was red HERE and green on main — measured, not assumed — and it was this branch's: rulings 166 and 167 fixed it, and it is green now. On main only, `test:kyc-restart-docs` is NOT MEASURED in the baseline tree (it needs the 107 MB embedded-postgres binaries, which that checkout does not carry). ⚠️ **THE BASELINE IS PER MACHINE, and this row is OMEGA-COMPILE01's — read it as history, not as an instruction.** The `F:` drive does not exist on Ali-Blade15. **On ALI-BLADE15 the baseline is `C:/kipindi-old-build`, detached at `418f1b5973a8af7c70ea7fc85851dfeba7f548a8` = exactly `origin/main`** (moved there on 2026-09-20 under ruling 516(a) from `8416a37c`, which was a HOUSE-BOTS commit 20 behind and therefore not a control at all — a "clean main" baseline that is the branch's own ancestor excuses every red `main` has since fixed). Ruling 465's schema test was NEGATIVE across that move (`prisma/` and `package-lock.json` diffs both EMPTY), so no `prisma generate` and no install. **And the 107 MB note no longer applies there:** that checkout carries `node_modules/embedded-postgres`, `node_modules/@embedded-postgres` and a `.pgscratch` directory, and `node_modules` is a real directory, not a junction. ⛔ A baseline whose commit is not written down is not a control (ruling 467) — so the sha is written here and in `PROGRESS.md`, and a session on a third machine writes its own rather than inheriting either. |
| 6 · step (a) · D19 + D19d | `test:house-bot-disclosure` §6 — the chatbot guard, 35 assertions over the four channels a player can be shown — and `red:house-bot-chatbot`, which runs that whole section against a **shadow tree** in a scratch directory: it writes nothing into the repository and §5 asserts `git status --porcelain` is byte-identical before and after | Every machine. No database, no build, no network, no API key | ✅ 2026-09-20 · OMEGA-COMPILE01: disclosure **66/0** (floor raised 31 → 66, to the number a run printed), `red:house-bot-chatbot` **93/0** — 30 declared mutations, each driving ITS OWN assertion red by name, plus the whole-harness positive control that the UNMUTATED shadow is green assertion for assertion. 5 of 35 cases have no mutation, against a ceiling of 5 asserted as an equality and named in `DEFERRED-TESTS.md` §1o row 203. `npx tsc --noEmit` 0 errors · `test:guards-exist` 9/0 · `test:docs` ✅ · `test:deferred-register` 14/0 · `test:chat-safety` ✅ · `test:red-anchors`: all 28 new anchors resolve exactly once, and the run carries the same 4 reds this branch already had (rg-doors ×2 and the 66-vs-65 ratchet, register row 4) — the new harness is NOT among the un-audited. ⛔ `src/app/_actions/chat.ts` was never edited, and nothing was exported from it: 6.6 pins it byte-identical to `origin/main`. |
| 6 · steps (b) + (c) · D19 + D19a + D21 | **The absence suite and the docs of record.** `test:house-bot-disclosure` §0-pipe (the two gates that ran in no chain), §5.1 (the published legal text pinned to `origin/main`), §5.2 (the print measure over the WHOLE player-rendered population instead of two files), §8 (the struck Board draft, its 15 citations, and the dormant `BOARD_DISCLOSURE_RECORDED` value) and §docs (risk 21 verbatim in both registers, its premise measured live in the rulebooks, F6 §5 condition 1 still unsatisfied) | Every machine. No database, no build, no network | ✅ 2026-09-20 · OMEGA-COMPILE01 · on `a0a6bb67`+: disclosure **108/0** (floor raised 66 → 108, to the number a run PRINTED; §5.2 read **394 files / 585,817 printed characters**, §5.1 compared **16 files against `418f1b59`**, §8.2 held **15 citations across 9 files**). `npx tsc --noEmit` 0 errors · `test:docs` ✅ (542 links) · `test:guards-exist` **9/0** · `test:deferred-register` **14/0** (104 rows) · `test:erasure` **226/0** · `test:house-bot-reports` **memory 200/0 · PostgreSQL 61/0 · 3/0** · `test:house-bot-ops` **memory 58/0 · PostgreSQL 69/0 · 3/0** · `test:red-anchors` carries the same **4** reds this branch already had (`rg-doors` ×2 and the 66-vs-65 ratchet) — this build added no harness and moved the count by zero. 🔴 **Running `test:house-bot-reports` for the first time on this lane turned `0.170.1` RED by name** and found a fabricated audit actor (`sunset.ts` `input.actorId ?? "system"`) that this lane itself shipped in `8004de9b`; fixed, and the suite is green above. ⛔ **NOT MEASURED, and recorded as such in `DEFERRED-TESTS.md` §1l:** `npx next build && verify:house-bot-bundle` (row 205 — the wiring is not the run) and a declared-mutation harness for the four new sections (row 206 — every assertion carries an in-suite planted control AND a positive control, which is a different thing and is named as one). |

### 12.1 C7 step 5's four panels, opened and read on a served build — 2026-09-21, Ali-Blade15

The two activity panels and the two history panels (`/admin/desk?tab=activity|history` and `/admin/desk/<id>?tab=activity|history`),
photographed and MEASURED in every state each can reach, on one fresh `next build` of the merged tree served at
`127.0.0.1:3021` against a scratch database of this lane's own (`ops_panels_20260921`, seeded by
`db:seed-house-bots-local` + `db:seed-house-bot-panels`: 82 stakes desk-wide, 62 on the ACTIVE account, 17 queued,
43 changes, backdated across seven ages so `today` / `24h` / `7d` / `all` are four different lists).

Two instruments, both committed, and the TILES ARE NOT (D19/W20 — `.qa-house-bots/` is gitignored, checked with
`git check-ignore` before a single byte was written):

- **`npm run qa:house-bot-panel-states`** — 18 URL-addressable states × 6 widths (360 · 640 · 768 · 1024 · 1280 ·
  1920), two viewport tiles each (the render, then the table scrolled into view, because at 360 the KPI band, the
  rail and a 330px filter rail put the table entirely below the fold and a tile whose subject is off-screen
  measures nothing). Rows · page 2 · past-the-end · filtered to zero · every filter at once · a crafted address ·
  both histories · an ACTIVE account · a REMOVED one.
- **`npm run qa:house-bot-panel-faults`** (new this pass) — the three states no URL can reach: a READ THAT FAILED
  (a view over the renamed table whose predicate raises, so the relation stays PRESENT and the page paints 355's
  failure rather than 421's "not on this database"; removed in a `finally` and proved out by a SELECT that had to
  fail and then work), the CANCEL CEREMONY (a `Modal` returns null until mounted, so it has to be opened), and the
  control-column asymmetry COUNTED on both panels at once rather than left to the eye.

**What the tiles showed, and it is the product being right:** a failed read paints "Couldn't load the desk's
activity · A data read failed — this may not be empty. Refresh to retry." with NO table and NO pager, and the
Activity tab's count badge DISAPPEARS with it (312: a badge is never how "unknown" is said) — 17 healthy, none when
the read failed. The desk owns both of its empty sentences ("No stake **anywhere on the desk** matches…" against the
account page's "No stake **on this account** matches…"). A crafted address is refused BY AXIS ("Parts of this
address were not understood and were ignored: page, window and type"). `?page=999` serves the LAST page and the
pager says so ("81-82 OF 82", page 5 outlined). Every `When` is one unwrapped line on the money column's own
numeral axis at all six widths — the defect this lane fixed on 2026-09-20 has not come back. No amount appears on
either history panel. The address bar carries no internal word: `?tab=activity&kind=responding&product=polls&outcome=placed&range=7d`,
every token the slug of its own painted label.

**Three defects were found on the served pages and fixed in this pass** — each one invisible to every static gate,
and each one a control that behaved differently from its own twin:

1. **A stop that landed and said nothing.** The stake really was cancelled (row → `CANCELLED`, note → "An officer
   stopped it before it was placed", badge 17 → 16) and no toast was painted at any width. `useDeferredToast`
   flushes its queue in an effect on the falling edge of `pending` — but the success path REFRESHES, the refresh
   removes the control that queued the message (a stopped stake is no longer QUEUED, so its row draws no button),
   and an effect on an unmounting component never runs. Every control whose SUCCESS removes it was mute;
   `designate-wizard.tsx` loses "On the desk" the same way, by `router.push` one line later. `test:feedback-law`
   can only see that `deferToast(` is called in statement position, which it was. **Fixed in the hook** — it now
   flushes on unmount too — so the fix covers both call sites and every future one.
2. **Two ways out of one dialog, disagreeing.** The stop ceremony is scrim-proof once anything is typed, and
   Escape threw the same text away without a word — at all six widths. That text is the officer's written reason
   and the server refuses the act without it. `Modal` gains `closeOnEsc` (default `true`, so no other caller
   moved) and the ceremony passes it `closeOnScrim`'s own condition, character for character.
3. **Both drivers were lying in one place each, and that is recorded rather than quietly corrected.** The states
   driver reported `pagerBox: null` on all 108 renders — for a pager the tiles show plainly — because it scoped
   its search to `main …`; it now searches the document, matches the disabled SPANS too, and carries §P1-§P4, which
   assert the pager's presence, its reading, its 44px floor and its ABSENCE over a filter that matched nothing.
   The faults driver failed its count-badge case 12 times on a correct page by asking for `[role='tablist']` when
   the kit stamps `data-section-rail` on a `<nav>`, and failed its gutter case by measuring the full-viewport
   `role="alertdialog"` container instead of the 420px panel inside it. A gate that fails on a right page is worse
   than no gate.

**Five findings are OPEN and are NOT this lane's to decide alone** (each measured, none fixed):

- **One rail, two languages.** The window row paints `Leo · Saa 24 · Siku 7 · Muda wote · Maalum` while the three
  axes under it paint `Any type · Responding · Filling · Opening · Manual`, `Any product · Polls · Up & Down`,
  `Any outcome · Queued · …`. Mechanism: the three chip groups are SERVER-BUILT by `house-console-read.ts` (so
  their copy is deliberately hard-English and inside 453's scans), while `DateTimeRangeFilter` is a `"use client"`
  kit control that builds its own labels from `useT()` — and `DEFAULT_LOCALE` is `sw`, so this is what an admin
  sees before ever touching the language menu. ⚠️ **Pre-existing and platform-wide**, not step 5's: every admin
  surface using that control (including `/admin/house`) has the same split. The fix is a policy decision about
  admin locale, not a lane call.
- **A refused window falls back invisibly.** `?range=forever` is refused by the server, which then reads the
  DEFAULT — and the same refusal leaves `Any type`, `Any product` and `Any outcome` visibly outlined while the
  window row shows NO selected chip at all. Mechanism: `datetime-range-filter.tsx:101` takes `sp.get("range")` at
  face value, so a value the server rejected selects nothing. The rail therefore stops stating the window in force
  at exactly the moment a Callout has told the officer their window was ignored. It is the one axis on this rail
  whose selected state is not the server's own parse.
- **Ruling 410 still names a `Bot` axis the landing rail does not have.** Shipped: Type · Product · Outcome. The
  account half's amendment explains why the ACCOUNT page has Type instead of Bot ("a page about ONE account has no
  Bot axis"); the LANDING half has no such amendment, so the ruling of record and the shipped rail disagree — and
  the missing axis is the one that would take an officer from an account to that account's stoppable stakes.
- **The asymmetry itself, settled: INTENDED, and coherent as far as it goes.** Counted at all six widths — the
  landing feed offers a stop on 12 of 12 QUEUED rows; the account page paints 11 QUEUED rows and 0 controls. It is
  not an oversight: `houseDetailForConsole` projects no `cancelId` at all, and the account rail carries no count
  badge either, which is the same decision applied twice (no control ⇒ no count a control acts on). The practical
  path exists — `?tab=activity&outcome=queued` lists every stoppable stake desk-wide with the account named beside
  it. What is missing is the DOOR: an officer standing on an account, looking at eleven queued stakes, is told
  nothing about where the control lives. A single server-built link on that panel would close it.
- **Every `?tab=` on a REMOVED account renders the same record, silently.** `?tab=activity` and `?tab=history` both
  paint the removal Callout and the Saved-rules card, with no rail at all and no sentence saying the panels are
  gone — while the same page refuses a bad `kind` or `range` BY NAME. A bell delivered before removal links to
  `…?tab=activity`, and that is where it lands.

Two more, reported as judgements rather than defects: **"In flight" wears `TONE_CHIP.broadcast`** — the PLAYER's
red live-pill — in a column beside FAILED (rose) and CANCELLED (claret), which is the exact case
`STATUS_TONE_EXCEPTIONS.LIVE` was written against ("to an OFFICER it is operational health … where red would read
as an incident", `admin: "green"`); the tone dictionary is documented but no suite enforces it, which is how a word
outside the dictionary (`In flight` is not in it) picked the player's half with every gate green. And the history
panels carry **no filter rail** while the activity panels carry four axes, although the history reader already
holds a `fromIso` facet.

---

## 13. Accepted risks

Risks 1–6 are PLAN §13, risk 7 is amendment A1, and risks 13–20 are PLAN §16b, each verbatim.

⚠️ **THE TWIN IN `COMPLIANCE-DECISIONS.md` IS NOT WORD FOR WORD, AND SAYING SO IS THE POINT.** This line used to read
"carries the same text", which was false and hid a real gap for four days: risk **21** was in that register in full and
in this one not at all, and a reader who trusted the sentence never looked. Measured 2026-09-20, and held by
`test:house-bot-disclosure` §docs:
- **Risk 21 is now verbatim in both** (d.1 asserts text equality, not presence, so a paraphrase in either copy is red).
- **Risks 13–20 are present by number in both** (d.2), but **13, 15 and 20 carry different supersede prose**: only the
  `COMPLIANCE-DECISIONS.md` copy has the `listRegister` / ruling-517 correction. Reconciling those three is a docs job
  nobody has been given; it is recorded in `plans/house-bots/DEFERRED-TESTS.md` §1L as NOT MEASURED with that reason,
  never quietly dropped.

1. **Licence class and levies.** House stakes are taxed within the fee, and the pool becomes a "book" (F6 §3). Ali reports to GBT.
2. **Consent is knowledge, not proof.** Password-only (D5). Officer resets are blocked, but resets before the 2026-09-11 audit genesis are invisible.
3. **Exploitation is bounded, not eliminated.** Alt accounts farming counters are capped per account, and G4 still applies. Caps, penalty box, closeness rule and exit-window hold are the controls.
4. **The holder sees house positions live** (they could front-run with an alt account). House stakes also count against their own RG loss limit, which auto-pauses the bot.
5. **Throughput.** Bot bets serialise on `house:control` (ms-long), and the holder shares the `bet.place` rate bucket (min gap ≥ 20s).
6. **Delivery.** Merge conflicts with the parallel session are likely. `overlapSeconds` in production is unverified; the design is correct either way. ~~sw/zh legal text needs native review.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no legal text changes, so there is none to review (D19a). The leaderboard shows the holder's display name.
7. A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13). Recommended hardening, as a separate platform commit: revoke at the three writers, re-mint the session of the device that made the change, and add login copy `kp_revoked=pw`. House consent is unaffected either way, because consent is the fingerprint, never a session. (also recorded as hardening H1, C9)

Risks 8–12: ⏳ added in commit 8 (S5).

13. **Selection edge, bounded not eliminated.** Staff choose the poll and the moment, and can decline after seeing the computed side. They can also see what players cannot: positions with owner names and phones on the admin market page, AML views, and AI poll data (reasoning, confidence, reviewer). The side can't be typed, but it can be matched by waiting until the thinner side is the side they favour. Bounds: the blackout (AI result check recorded, or market reopened), the formula side and amount, staff-chosen caps inside the locks, the counterparty share limit and pro-rata counterparty caps, a durable record of every press (placed or refused), ~~previews per officer, the vetoes register, and the monthly staff-edge scorecard with its alert (W16)~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** those three are R1's report sections (c) previews without a stake, (h) vetoes and (f) the staff-chosen scorecard, plus the staff-edge alert, all struck (C5-SPEC rulings 202, 218–223); D20 does not strike the durable rows beneath them (`ENTER_NOW_PREVIEWED` and `STAFF_INTENT_CANCELLED` events, VETOED targets).
14. New with D17: a person chooses the moment of an opener stake and of any stake; opening empty markets is already superseded (UPDOWN D3, automated OPENER).
15. **Void after a staff-chosen stake.** A single admin can still void or reopen a market holding one (no officer lock: I10 and the 2026-07-24 guardrail). ~~Mitigation is display, the R9 `houseStake.staffChosen` payload, the `staff-stake-voided` alert and an R1 row only.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the display, the R9 payload and the R1 row are struck (C5-SPEC rulings 187–194, 199–213); of that list only the `staff-stake-voided` alert (commit 4) is untouched by D20.
16. **Amounts are deterministic,** so a repeated Enter now stake is recognisable (D6 fingerprint). With no jitter, an amount can't be re-rolled either.
17. **A fixed target delay makes reactions predictable.** The field hint recommends a range.
18. **Consumed trigger.** A target removed or ended after a trigger was decided consumes that trigger. No other bot may react to it (one COUNTER row per trigger).
19. **Counterparty concentration.** A staff-chosen stake can still be matched mostly against a few players' money. It is bounded by the share limit (refused when one account holds more than 50% of the locked opposite money, W15). It is also bounded by pro-rata counterparty caps: the stake counts toward the per-player daily counter limits of every account holding at least 25%.
20. **An officer may decide a market holding a stake they chose** (resolve, void, reopen or an objection ruling). There is no refusal (2026-07-24 guardrail, I10). ~~The mitigations are display, audit and alert only: the viewer sees "of which chosen by you", the decision audit records `requestedBy`, and `staff-stake-self-decided` alerts every admin.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** "of which chosen by you" and `requestedBy` in the decision audit are struck (C5-SPEC rulings 187–191, 193); of that list only the `staff-stake-self-decided` alert to every admin (commit 4) is untouched by D20.

**21 (added 2026-09-16 with D19).** The published rulebooks say "Bots, scripts and automated tools may not be used to
place stakes" and "Multiple accounts, **shared accounts** and account sales are prohibited", and the privacy notice
names no house-liquidity processing. Under D19 none of that text changes, so the platform operates accounts in a way
its own published rules prohibit and its notice does not describe. A player who learns of it, or a regulator, could
call that misleading. Ali accepted this on 2026-09-16 after being shown the sentences and an alternative neutral
wording, and reports that the Gaming Board told him his answers are legally valid (no document on file; REL-4 asks for
one). The holder's own consent is unaffected: they agree privately and give the owner their password (D5). ⚠️ **Corrected 2026-09-18 (ruling 503).** This sentence read "and type their own password", which the built code contradicts: `src/lib/server/house-bot/designation.ts` addresses the OFFICER throughout — `:79` `empty: "Enter their password."`, `:102` "That isn't their current password.", `:109` "Check the holder's password for an owner" — and **no field anywhere lets the holder type it**. D5 is the OWNER typing the HOLDER's account password, verified like a sign-in and never creating a session; `:158` and `:201` stand as written. ⛔ **The consent itself does not change** — the holder still agrees privately and still supplies the password; what the record stops saying is that the holder types it into a wizard, because no such wizard field exists.

### Risk 21's premise, read out of the published rulebooks

⭐ **MEASURED 2026-09-20, so the next reader does not have to re-derive it.** Risk 21 asserts that 50pick's own
published rules prohibit what the feature does. Nobody had ever quoted them. They do, and here is where, in the files
a player reads:

| Where a player reads it | The sentence, verbatim |
|---|---|
| `src/app/legal/rules/_content-yes-no.tsx` | "One account per person. Multiple accounts, shared accounts and account sales are prohibited and may lead to forfeiture of winnings." |
| `src/app/legal/rules/_content-yes-no.tsx` | "Bots, scripts and automated tools may not be used to place stakes or scrape the platform." |
| `src/app/legal/rules/_content-up-down.tsx` (prohibited conduct) | "Using bots, scripts or automated tools to place stakes or scrape the platform." |

The feature places stakes by automation on an **existing player account** designated with the holder's password, which
the second sentence prohibits outright and which the first arguably reaches as a shared account — and the first
attaches **forfeiture of winnings** to a player who does it. That is the whole of the accepted risk, and it is a matter
between 50pick and its **players**, not a Gaming Board matter (owner ruling D21, 2026-09-20: the Board needs nothing,
and under D20 the levy and GGR reach it identically as player activity).

⛔ **It may not be "solved" by rewriting the rules.** Any carve-out for house accounts is text a player can read, and
reading it **discloses the feature** — which D19 forbids and which outranks. The accepted-risk route is the coherent
one and is the chosen one. `test:house-bot-disclosure` d.4 pins all three sentences as PRINTED text, so deleting or
reversing one turns the suite red rather than passing quietly.

### Do not restore
- No human-typed side.
- No human-typed amount.
- No sizing against cancellable money: only locked money of eligible accounts counts, 7 s after its free exit closes.

---

## 14. Programme rules

Each rule is quoted verbatim from the amendment that sets it. A change that breaks one needs a new amendment first.

- **F1 — a new product line is decided, never inherited** (`HOUSE_PRODUCT_POLICY`; the alert copy is `PRODUCT_DENIED_COPY`): "House bots ignored a stake on an unsupported product ({value}). No stake moved. Enabling it needs a COMPLIANCE-DECISIONS entry and a code change."
- **F3 — new bet gates are inherited:** "A new gate evaluates the holder's account state for house bets, or refuses `house_context_unsupported`. Until A10 classifies it, that maps to AUTO_PAUSED(UNMAPPED_REFUSAL). Any new funding source refuses house context."
- **F7 — more than one container:** "Setting numReplicas > 1 or applying overlapSeconds is a house release event: switch OFF, re-run S4 rehearsal 3, re-audit this table." The table, as audited in 04 F7:

  | State | Where | Effect with 2 containers |
  |---|---|---|
  | Claims, caps, throttles, AlertOnce, summaries, beats, scopeFrom, hashes | DB | correct |
  | 5 s soft cache | process | stale intents CANCELLED at fire |
  | ≤2 fires, hook semaphore, admission | process | throughput only |
  | `desk.verify` bucket | process | N× tries; C4's database reserve still binds |
  | Holder's `bet.place` bucket (`rate-limit.ts`) | process | holder gets more headroom |
  | Vendor 1-minute bar cache (`updown-terminal-vendor.ts`) | process | a cold container skips with UD_STALE_PRICE (fails closed) |
  | Maintenance flag, loaded once (`platform-config.ts`) | process | the other container's bet path misses it, so A9's maintenance fallback isn't binding |

- **R4 — no rewards on house stakes:** "No prize, cashback, tournament or rank reward may be computed on house-marked positions; public display may include them (D6)."
- **A10 — every refusal is mapped:** "A new bet refusal = a BET_PATH_REASONS entry + a mapper row in the same commit."
- **FS-07 — rules schema bumps:** "A rules schema bump may never widen scope or caps by default."
- **A7 — the session clock:** "A house bet neither advances nor is refused by the holder's session clock."
