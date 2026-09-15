# House bots — the authority

> 🟠 Being built on branch `house-bots` (commit 3 of 8, designation services). Nothing is on production. The master switch ships OFF (D1).

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
| I7 | House stakes are cash only. No bonus spend, no wagering accrual, no agent commission, no cash-out, no objection standing. | `test:house-bot-money` (commit 2): cash only, no cash-out (d)/(e); `test:house-bot-seam` §6: no wagering reversal or recruiter reward on a marked position, `HOUSE_STAKE_ONLY` objection standing. | The no-reward pin (R4, F9), commit 5. |
| I8 | An immutable `houseBotId` marker sits on the Position and on every Transaction of it. Reports filter on the row marker, never on current status. Levy identity unchanged. The marker never reaches a public payload. | `test:house-bot-migrations` (commit 1): the two marker columns and their partial indexes. `test:dal-parity` (commit 1): the memory position store's full-row write keeps the stored marker and never takes the incoming one, at source level. `test:house-bot-migrations` §d c21 (commit 1): on Postgres and on memory, a full-row write neither drops a marker nor marks an unmarked stake. `test:house-bot-money` (commit 2): the marker on the position, BET_PLACED, WIN payout, VOID, one-sided, emergency and orphan refunds (a player's refund carries none); on Postgres the books balance and the levy identity holds with a house stake in the pool. | The reports suite, commit 5 (absent from every public payload). |
| I9 | Owner self-exclusion, cooling-off, suspension, frozen or missing wallet, own loss limit, password change or role change auto-pause that bot and alert admins. | `test:house-bot-rules` (commit 1): every pause reason has a way out, and any two holder causes cleared in either order leave a step other than Remove at every point. `test:house-bot-designation` (commit 3): each of the five consent-void causes auto-pauses an ACTIVE bot and ends every active target in the wallet transaction; the live causes, the RG backstop and Start's refusals; a planted fingerprint-only predicate is shown to let a voided bot through. | The engine and holder-lifecycle suites, commit 4 (the hook, the sweep and the admin alerts that detect each change). |
| I10 | No officer-conflict lock (2026-07-24 ruling). House exposure is only **displayed** to resolvers. | `test:two-admin` and `test:officer-conflict`: a position-holding admin resolves or voids in one action, and no conflict block exists. | The reports suite, commit 5: resolver display, including "of which chosen by you" (risk 20). |

---

## 2. Data model

- **No Postgres enums.** Every status, cause, kind and purpose column is TEXT with a CHECK whose IN-list equals a tuple in `src/lib/house-bot/`, value for value and in the same order (precedent `Transaction.payoutRail`). `test:house-bot-migrations` reads the migration and compares them.
- **Two migrations**, hand-written, re-runnable and expand-only (S1, A23), both timestamped after `20260913120000_kyc_at_withdrawal`, and touching no KYC table. The floor moves with `main`: on 2026-09-14 `main` added `20260914120000_rg_pending_limits_play_clock`, which shared the first house folder's old timestamp and sorted between the two, so both house folders were renamed from `20260914120000`/`20260914120100` to `20260914150000`/`20260914150100`; on 2026-09-15 `main` added `20260915120000_site_visits`, which sorted after both, so they were renamed again to `20260915150000`/`20260915150100` (never applied anywhere but scratch databases). REL-0's migrations diff re-checks that they are still the newest:
  - `20260915150000_house_bot_tables` creates the eight tables below and seeds `HouseBotControl` `global` and `HouseBotRuntime` `global` (`ON CONFLICT DO NOTHING`);
  - `20260915150100_house_bot_markers` adds the `houseBotId` markers, the `User` password-history columns and `PredictionMarket.reopenedAt` / `reopenCount`, all nullable with no default.
- **A23 hand step.** Above 500,000 positions or 1,000,000 transactions, the marker indexes are built `CONCURRENTLY` by hand before the deploy. The markers migration's header holds the exact statements; the preflight and its runbook land in commit 8 (§11).
- **Ids** are minted by the DAL with the prefixes in `HOUSE_ID_PREFIX`: `hb_` bot, `hbi_` intent, `hbe_` event, `hbt_` target, `hbp_` press.

### 2.1 Tables

| Table | Key | What it holds | Retention (A20, DATA-RETENTION §1) |
|---|---|---|---|
| `HouseBot` | `hb_…` | One designation of one account. Label and `labelKey`, note, `status`, `pauseReason` (history only) and `pauseDetail`, `pausedFromStatus`. Consent: `passwordFingerprint`, `verifiedAt/ById`, `consentVoidAt/Cause`, `credentialChangedAt/Via`. Designation and removal: `designatedAt/ById`, `removedAt/ById/Cause/Reason`. Behaviour: `rules` JSON and `rulesVersion`. The typed caps (§5, NULL = not set). Designating the same account again makes a new row. | 7 years from removal, never deleted. Label, note and free-text reasons are pseudonymised on erasure (⏳ lands in build commit 3). |
| `HouseBotControl` | `global` only | The master switch (`enabled`, `switchedAt/ById/Reason`, `offCause`), the global limits (§5), `limitsVersion` and `limitsSchemaVersion`, and `boardDisclosureSentAt` / `boardDisclosureSections`. `boardDisclosureSections` is NULL until the first record, and readers treat NULL as an empty list. | One fixed row. |
| `HouseBotRuntime` | `global`, `beat:planner`, `bot:<id>`, `engine:<instance>`, `beat:poller:<instance>` | Hot counters kept off the control row and written with `INSERT … ON CONFLICT DO UPDATE`: the hour counter, the rate-limited counter, the sweep watermark and `scopeFrom`, error streaks, bounds and exit-config hashes, beats and clock skew. | Fixed rows overwritten in place. Per-instance rows (`engine:*`, `beat:poller:*`) are deleted after 24 h, because the instance id is random per boot (⏳ lands in build commit 4). |
| `HouseBotAlertOnce` | the throttle key | One row per throttle key (§9.3). An alert is sent only when the claim's `INSERT … ON CONFLICT DO NOTHING RETURNING` returns a row, so two replicas send it once. | 30 days, purged by `retention.purge.daily` in batches of 5,000 (⏳ lands in build commit 4). |
| `HouseBotEvent` | `hbe_…` | The append-only history of every bot and of the control row: `kind` (§2.4), `fromStatus` / `toStatus`, `reason`, `actorId` (null = `system_house_bot`), `marketId`, `payload`, `auditId`. | 7 years, never deleted. `reason` is pseudonymised on erasure (`erasure.ts`, commit 3). |
| `HouseBotIntent` | `hbi_…` | Every decision, placed or not: `kind`, `anchorKey`, market and product line, trigger, side, `stakeTzs`, `dueAt` / `deadlineAt` / `staleAt`, `status` and `reasonCode`, `why` and `decision`, the claim and attempt columns, `positionId`, `idempotencyKey`, `finishedAt`, `alertedAt`. Staff-chosen rows add `requestedById` and `entryCondition` (Enter now) or `targetId` (a targeted COUNTER). | 7 years, never deleted, skipped and expired rows included (PROGRESS W4). |
| `HouseBotTarget` | `hbt_…` | A poll one bot reacts to (N2): `delayMinSec` / `delayMaxSec`, `timingFrom`, `reactTo`, `effectiveFrom` (= `createdAt` + `TARGET_ARMING_SEC`, written from DB `now()` in the insert), `version`, the end and removal columns, and a `snapshot`. Officer ids and public poll fields only. | 7 years, never deleted. Never in the holder's data-rights export. |
| `HouseBotPress` | `hbp_…` | Every officer press for Enter now, a target add, update or remove, and a staff cancel: `actorId` + `submitId` (one press per double tap), `purpose`, `state`, the refusal `code`, `reason`, and the audit lease (`auditId`, `auditClaimUntil`). | 7 years, never deleted. Officer data, never in the holder's export. `reason` is pseudonymised on erasure (`erasure.ts`, commit 3). |

Every house table is on the chain purge's NEVER list (`src/lib/server/chain-purge.ts`, DATA-RETENTION §7.1). This is the chain purge only: `HouseBotAlertOnce` is still purged at 30 days by the retention pass, and per-instance `HouseBotRuntime` rows after 24 h.

**Columns added to existing tables**

| Column | Written | Rule |
|---|---|---|
| `Position.houseBotId` | At create only (⏳ lands in build commit 2) | A soft reference with no foreign key. Every update skips it; it never reaches a public payload. |
| `Transaction.houseBotId` | At create only, on every transaction of a marked position (⏳ lands in build commit 2) | As above. Reports filter on it (I8). |
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
- **Rails.** Every TZS cap and limit is 0–1,000,000,000, and an intent's `stakeTzs` is 1–1,000,000,000. Counts: `freqMinGapSec` 0–86,400, `freqMaxPerHour` 1–60, `freqMaxPerDay` 1–1,440, `freqMaxPerMarket` 1–6, `capStaffChosenPerDay` 1–50, `targetsMaxActive` 1–50, `gMaxBetsPerMinute` 1–20, `gMaxBetsPerDay` 1–28,800, `gCounterPerPlayerPerDay` 1–1,440, `gCapStaffChosenPerDay` 1–200, `gTargetsMaxActive` 1–200, `gStaffChosenMaxCounterpartyShare` 10–100, `gStaffEdgeWinRatePts` 1–100, `maxDesignatedBots` 1–20 (default 5), `bellAlertsPerHour` 0–60 (default 20), `holderNoticesPerHour` 0–60 (default 6), target delays 5–600 with minimum ≤ maximum. The forms are stricter than these rails (§5).
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
- **What a holder's data-rights export may show** is an allowlist, `DSAR_HOLDER_EVENT_KINDS`: DESIGNATED, VERIFIED, STARTED, PAUSED, AUTO_PAUSED, RULES_SAVED, REMOVED, CREDENTIAL_CHANGED, HOLDER_CAUSE_ADDED, CONSENT_VOIDED, HOLDER_2FA_ON, HOLDER_2FA_OFF, HOLDER_EMAIL_CHANGED, ENTER_NOW_REQUESTED, TARGET_ADDED, TARGET_REMOVED, TARGET_ENDED. Each is rendered as `{kind, at, actor}` only, with no reason and no market id, for the holder's own bots (⏳ lands in build commit 5). PENALTY_BOXED belongs to the trigger player's export only. A kind added to `EVENT_KINDS` stays out of the holder's export until someone decides it belongs.

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
| (d) | `cashOutValue` takes `houseBotId`; a house position is not sellable (`HOUSE_POSITION`). Output for every player position is byte-identical to the golden grid captured before the change. | `market-service.ts`, both page callers |
| (e) | `cashOutPosition` refuses a house position `house_position_no_exit`. | `market-service.ts` |
| (f)/(n) | Objection standing: a user whose only positions on the market are house-marked → `HOUSE_STAKE_ONLY`; own plus house stays eligible. | `objections-service.ts`, market page, resolution panel |
| (g) | Wagering reversal is skipped for marked positions in settlement, emergency void and orphan repair (A17); `onRecruitBet` and `onRecruitSettlement` take a required `houseBotId` and return on a marked position. | `market-service.ts`, `affiliate-service.ts` |
| (j) | `replayed: true` on both replay paths. | `buyPositionInner` |
| (k) | `exitWindowClosesAt` extracted into `src/lib/exit-window.ts`; `graceMs > 0` kept (A14). | `market-service.ts` |
| (h) | The liquidity label ("50pick liquidity stake", en/sw/zh) is appended to a holder's outcome notice for a house stake: WIN, LOSS, VOID and orphan refunds, one-sided, emergency cancel, the four Up & Down rows, and the verdict notice. A holder whose every position on the market is house-marked is not invited to object. Selection closed splits into a labelled house notice (label in the title too, its own push tag `selection-closed-house:<marketId>`) and a personal notice whose figures exclude house money. No per-stake email is sent for a marked position (04 F6). | `notification-service.ts`, `market-service.ts` |
| (m) | The comment side chip ignores marked positions (`commentSideFor`, `src/lib/comment-side.ts`). | `app/markets/actions.ts` |
| (p) | `stakeBoundsForMarket(market)` extracted with identical output. | `market-service.ts` |
| (r) | `adminReopenMarket` stamps `reopenedAt` (never cleared) and `reopenCount`. | `market-service.ts` |
| Propagation | The marker is copied onto WIN payouts, one-sided, VOID, emergency-void and orphan refunds, and cash-out transactions. | `market-service.ts` |

⏳ Moved to commit 4, recorded in PROGRESS: (a) the post-commit hook call site (its only reader is the engine), the Up & Down daily digest's house split (no Up & Down house stake can exist before the engine; Enter now is polls only), and the per-bot and global usage EXPLAIN pins (A24). ⏳ Commit 5: (i) the holder chip and (o) the activity-feed chip.

### 3.6 Registries
- **`BET_PATH_REASONS`** (`src/lib/house-bot/bet-path.ts`) lists every refusal the bet path can return to a house stake; `test:house-bot-seam` reads the bet-path sources and fails in both directions.
- **`GATE_PARITY`** (`scripts/lib/house-bot-gate-parity.ts`, typechecked) has one row per reason: a fixture proving `placeHouseBet` and `buyPosition` refuse alike, or a stated exemption.
- **SEAM sites** (`scripts/anchors/house-bot-seam.anchors.mjs`): every house branch in `market-service.ts` — any `ctx.kind` use, a `"house"` comparison, or a condition on `houseIntent`, `housePool`, `housePosition` or `houseBotId` — sits within the first three code lines under a `// SEAM:<name>` marker, read on decommented code. The markers are exactly the declared list (38), and each marker's window touches house state.
- **Failure reasons:** every `house_*` reason and `idempotency_key_conflict` is registered in `failure-reasons.ts` with en/sw/zh copy (sw/zh drafted, native review); `FailureDetail` gains `cap`, `conflict` and `condition`.

---

## 4. Engine

⏳ Written in commit 4. The timings the engine will read are already fixed in `src/lib/house-bot/constants.ts`, so it arrives to pinned values. The relationships between them are the design, and `test:house-bot-rules` pins the first four:
- `LOCK_MARGIN_MS` = `MAX_TOLERATED_SKEW_MS` + `CLAIM_SKEW_GUARD_MS`. It applies to `lockedForHouse` (Enter now, FILL and every targeted COUNTER), never to the untargeted COUNTER (§5.7).
- `TARGET_ARMING_SEC` ≥ the largest tolerated skew + 2 s + the sweep's age filter (`SWEEP_MIN_AGE_MS`). Poll triggers are decided only in the sweep, so no trigger at or after a target's `effectiveFrom` can be decided before the target row exists.
- `SWEEP_LOOKBACK_MS` ≥ 60 s.
- `CLAIM_TTL_SEC` ≥ the admission wait + 4 × (the lock's pool wait + its transaction timeout) + 5 s, so a fire that retries its lock four times still owns its row.
- `staleAt` = `dueAt` + `STALE_AFTER_SEC`, with one tolerance each for automatic rows on Up & Down, automatic rows on polls, a targeted COUNTER and an Enter now press. No stake lands after its `staleAt`: the seam re-reads it on the database clock inside `house:control`.

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
| `gStaffEdgeWinRatePts` | Staff edge: win rate | pts | 1 | 100 | 15 (W16) | Alert when an officer's staff-chosen win rate beats the automated bots' by at least this many points in a month (10 or more settled stakes). Not set = this alert is off. |
| `gStaffEdgeNetTzs` | Staff edge: net | TZS | 0 | 1,000,000,000 | 100,000 (W16) | Alert when an officer's staff-chosen stakes net at least this much in a month (10 or more settled stakes). Not set = this alert is off. |
| `maxDesignatedBots` | Max designated bots | count | 1 | 20 | 5 (also the seeded value) | — |
| `bellAlertsPerHour` | Bell alerts per hour | count | 0 | 60 | 20 (also seeded) | At {n} per hour each admin can get up to {24n} bet rows a day, plus summaries and pause, money and switch alerts. |
| `holderNoticesPerHour` | Holder notices per hour | count | 0 | 60 | 6 (also seeded) | 0 = summary only. |

The loss hint, on both loss fields: "Limits count stakes by the day they were placed and restart at 00:00 EAT. Losses that settle today can include stakes from earlier days. Counts today's open stakes as lost until they settle; bots stop only on settled losses."

Lowering `maxDesignatedBots` below the number of designated bots is allowed and only previewed: no account can be designated until enough are removed, and no bot is paused (C10).

### 5.3 Cap windows (C14)

| Window | Fields |
|---|---|
| The EAT day, 00:00 to 24:00 | `capDailyStakeTzs`, `capDailyLossTzs`, `freqMaxPerDay`, `capStaffChosenPerDay`, `capStaffChosenDailyTzs`, `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gMaxBetsPerDay`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`, `gCapStaffChosenPerDay`, `gCapStaffChosenDailyTzs` |
| A rolling 60 minutes, `(now − 60 min, now]` (`countInRollingWindow`) | `freqMaxPerHour` |
| A rolling 60 seconds | `gMaxBetsPerMinute` |
| Since this bot's last placed bet | `freqMinGapSec` |
| The EAT month just ended, evaluated on the first EAT day of the next | `gStaffEdgeWinRatePts`, `gStaffEdgeNetTzs` |

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
- **Not exempt:** the two staff-edge thresholds. Clearing one switches an oversight alert off, and that still needs the switch off first.

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
- **The void service** (`voidHouseConsent`): an ACTIVE bot → AUTO_PAUSED(cause) with `pausedFromStatus` ACTIVE and its live intents cancelled; a PAUSED or AUTO_PAUSED bot keeps its status and gets HOLDER_CAUSE_ADDED; a second pass changes nothing; a failure part-way rolls every write back. The holder is told only for HOLDER_WITHDREW (a confirmation); responsible-gambling causes send them nothing (C8).
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

**`verifyHouseBotPassword`** (C4). In order: an empty password refuses, uncounted and untrimmed; a `submitId` is claimed once (`ALERT_KEY.submit`); re-verify refuses a removed bot and is a no-op for a running bot with valid consent; the password-context rows and an RG lock refuse, uncounted; the `housebot.verify` bucket {capacity 3, refill 0.2/min}, keyed `<officer>:<holder>`; then inside `login:<userId>` on the fresh row: an expired lock is cleared, at `failedLoginCount ≥ LOCKOUT_MAX_FAILS − 2` the password is not checked (`RESERVED`), a wrong password adds 1 and never writes `lockedUntil`, a right one resets the count. `attemptsBeforeLock = max(0, 5 − 2 − failedLoginCount)`. It never creates a session, a cookie, an `ActiveSession` row or `lastLoginAt`, and writes no `auth.login.*` audit. The holder is told once when the owner's wrong tries reach the reserve.

**`designateHouseBot`**: label and note → eligibility (so no attempt is spent on an account that cannot be designated) → the label pre-check → the password check → under `wallet:<userId>` the hash is re-read (a change since the check writes no row) → under `house:control` the roster is counted again and the bot (PAUSED(NEW)), its runtime row and DESIGNATED are written in one transaction. A clash the pre-check missed is named by the unique index: `HouseBot_labelKey_live_key` → field label, `HouseBot_userId_live_key` → "This account is already a house bot." with its id. Then COMPLIANCE `house_bot.designated` (no label, note or fingerprint) and the holder's notice.

**`reverifyHouseBot`**: refuses on the rows above that stop a re-verify (closed, no password, RG, erasure, sign-in locked, support-set password, history unreadable), then `canReverify`; checks the password; under `wallet:<botUser>` refuses if the hash changed again while the owner typed, if a void was written since the pre-check (compared by value), or if the account changed since (below); otherwise the new fingerprint and `verifiedAt`, AUTO_PAUSED → PAUSED(MANUAL), event VERIFIED, and the holder's "Your permission was confirmed". It never starts the bot.

**What can land while the owner types** (review `wf_2208135b-079`, MC-1/LI-3/MC-4). Designate and re-verify take a check time before eligibility, and `verifiedAt` is that time, never the write time: a void, a break or a self-exclusion that lands during the password check is later than it, so it still stands. Under `wallet:<userId>` both re-read the account (`accountChangedSince`): closed, an erasure request, a responsible-gambling lock, or a self-exclusion or break started after the check time refuses with no row. `setConsentVoid` stamps `GREATEST(clock_timestamp(), verifiedAt + 1 ms)`, so a void written after a verification is always later than it. The real `selfExclude` already serialises with both writes: its wallet freeze takes the same lock.

**`startHouseBot({officerId, botId, rulesContext})`** in 02 §3.3's order: removed → eligibility → consent (PASSWORD_CHANGED, CONSENT_VOID, RG_SINCE_VERIFIED) → the saved rules and caps (`parseHouseBotRules`, `rulesStartProblems`) → today's loss cap → the holder's own loss limit. Under `wallet:<botUser>` consent is read again, then ACTIVE, `scopeFrom` now and STARTED. With the master switch OFF the bot still starts and the result says `masterOn: false` (C10).

**Erasure** (`anonymizeClosedAccount`, A5/R6): a non-REMOVED bot refuses (`house_bot_live`) before any destructive write; the check runs under `wallet:<userId>`, the lock designate writes under. Every owner is alerted once per bot (`notifyAdminsHouseBotErasureBlocked`, AlertOnce `erasure-blocked:<botId>`); a send that reached no one gives the claim back (`houseBotAlertOnceStore.release`), so the next attempt still tells someone. After Remove, erasure redacts the quoted label to `"Erased bot <TAIL6>"` in that bot's own HOUSE_BOT notices only (rows linking to the bot, or written while it was designated — a freed label may name another holder's live bot) and pseudonymises the bot rows (label `Erased <TAIL6>`, note, `removedReason`, event and press reasons `[erased]`), counting `houseBots` and `houseBotNotificationsRedacted`; a re-run counts zero. A routine that throws part-way is recorded by `fulfillDsarRequest` as a blocked erasure (reason `error`), never an unhandled error.

**Officer email stamp** (`setUserEmail(…, {byOfficer})`): a stamp that still counts (a reset-link password at or after it, within 30 days) is never overwritten by a later officer edit.

**The withdrawal over a standing void** (`voidHouseConsent`, HOLDER_WITHDREW): the void's cause becomes HOLDER_WITHDREW (`upgradeConsentVoidCause`), with a CONSENT_VOIDED event naming what it superseded, the COMPLIANCE row and the holder's confirmation. A repeat changes nothing.

---

## 7. Console map

⏳ Written in commit 7.

---

## 8. Reporting

⏳ Written in commit 5.

- **Fee withheld per bot is not recorded per stake.** `houseBotBook` (`src/lib/server/house-bot/book.ts`, commit 1) returns `feeWithheldTzs: null`, never a confident 0: a payout transaction writes no fee, and the commission ledger line names no user and no transaction. Commit 5 derives it from the pool fee snapshot × the position's share. The record is PLAN §18, row "R3 fee withheld per bot".

---

## 9. Alert matrix

The emitters land in commits 3 and 4, each with a `comms-registry` row, under notification kind `HOUSE_BOT`. ⚠️ `HOUSE_BOT` is **not** a money kind, although PLAN §7 put it there: a money kind must state a figure (`test:cert-c3` §6) and these notices state none (W17, waiting on Ali with this default). Commit 3 built `notifyHouseBotOwner` (all eight holder notices), `notifyAdminsHouseBotErasureBlocked`, and the email templates `houseBotOwnerHtml` and `houseBotErasureBlockedAdminHtml`; the others are commit 4. The throttle keys are fixed now, in `ALERT_KEY`.

### 9.1 Channel law
- ⛔ **`HOUSE_BOT` is never sent by SMS** (C13, and F6's channel policy in commit 4). When every position behind a notice is house-marked there is no SMS, and email only through the holder's hourly summary.
- Admin alerts go to everyone `houseBotAlertRecipients()` returns, the same rule as the owner guard (A22).
- Holder emitters return early while the holder is under a responsible-gambling lockout (`isLockedOut`). Win, loss and refund notices keep today's behaviour, with a liquidity label line on marked positions.
- Bodies never quote an officer's reason, and name a holder or a trigger player only by their `Player #` handle (R6).
- Every link still opens its event 60 days later; on a REMOVED bot it opens the read-only page.
- A PLACED row's alert is claimed once through `alertedAt` and repaired 30 s later if the send was lost (A8).

### 9.2 Who is told, over which channel

| Event | Emitter | Audience | Channel | Throttle | Link |
|---|---|---|---|---|---|
| A fresh automatic house bet is PLACED | `notifyAdminsHouseBotBet` | Admins | Bell | While runtime `global` `countInHour` ≤ `bellAlertsPerHour`. Staff-chosen rows are excluded. | `/admin/house-bots/<botId>?tab=activity` |
| Automatic bets beyond that cap | `notifyAdminsHouseBotHourSummary` | Admins | Bell | Once per EAT hour (`summary`). Adds "{s} staff-chosen stakes were alerted one by one" when s > 0. | `/admin/house-bots?tab=activity&range=today` |
| A staff-chosen stake is PLACED (Enter now, or a target's reaction) | `notifyAdminsHouseBotStaffChosen` | Every recipient | Bell + email | Uncapped, and not counted in `countInHour`. | `/admin/house-bots/<botId>?tab=activity&range=all&intent=<intentId>` |
| An ACTIVE bot auto-pauses | `notifyAdminsHouseBotPaused` | Admins | Bell + email | Never capped. A consent void adds "Its {n} active targets were ended." when n > 0. | `?reverify=1` when the way out is re-entering consent (a password change or a consent void); otherwise the bot page |
| …and the holder is told | `notifyHouseBotOwner` | Holder | Bell + push | Not for a responsible-gambling cause or the holder's own loss limit. | `/positions` |
| A cause is added to a bot that is not ACTIVE | C13 matrix | Admins | Bell | — | The bot page |
| The holder's account is closed | C13 matrix | Admins; holder | Admins bell + email with the float amounts; holder email only | — | The bot page |
| A holder cause clears (account restored, freeze lifted, role back to PLAYER, break ended) | C13 matrix | Admins | Bell | Once per cause and clearing (`cleared`) | The bot page |
| The holder is locked out by wrong sign-ins | C13 matrix | Admins | SECURITY bell | Once per bot per EAT day (`holderLocked`). The bot continues. | The bot page |
| The holder stakes against their own bot (A21) | C13 matrix | Admins | Bell + email | Once per bot and market (`holderAgainst`). Writes event HOLDER_AGAINST_BOT. The bet is never refused and the bot never paused. | `/admin/markets/<marketId>` |
| The master switch goes ON or OFF, by hand or automatically | `notifyAdminsHouseBotSwitch` | Admins | Bell + email | Every one | `/admin/house-bots` |
| Money moves on an ACTIVE bot's account (deposit credited, withdrawal requested, AML hold, paid, failed or AML-rejected, officer adjustment) | `notifyAdminsHouseBotMoneyEvent` | Admins | Bell + email | Never capped; two identical events are two rows | `/admin/transactions?q=<txnId>` |
| Roster changes: DESIGNATED, VERIFIED, STARTED, a manual PAUSED, REMOVED, RULES_SAVED and LIMITS_SAVED with a before → after diff, TARGET_ADDED, TARGET_UPDATED, TARGET_REMOVED, and TARGET_ENDED from a staff veto | `notifyAdminsHouseBotRoster` | Every recipient | Bell + email | Uncapped; the title ends HH:MM:SS | `/admin/house-bots/<botId>?tab=history&event=<eventId>` |
| A target ended by the planner, by Remove or by the sunset | — | — | No alert | History and the targets tab record it. | — |
| An engine alert (a failed intent, a poison row, a stake not whole, a balance or cash-only skip, and the other keys in §9.3) | `notifyAdminsHouseBotAlert` | Admins | Bell + email | Once per bot, code and EAT day, unless §9.3 gives the key | `/admin/house-bots/<botId>?tab=activity&range=all&outcome=failed&intent=<intentId>` |
| A market holding a staff-chosen stake is voided or reopened | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | Once per market (`staffStakeVoided`) | `/admin/markets/<marketId>` |
| A market holding a staff-chosen stake is decided by the officer who chose it (resolved, voided, reopened, objection upheld or rejected) | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | Once per market and action (`staffStakeSelfDecided`). A record only: nothing is refused. | `/admin/markets/<marketId>` |
| An officer's staff-chosen stakes meet a staff-edge threshold for the month | `notifyAdminsHouseBotAlert` | Every recipient | Bell + email | Once per officer per month (`staffEdge`) | `/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>` |
| Holder: designated, started, paused, paused for a password change, removed | `notifyHouseBotOwner` | Holder | Bell + push, and email on designated and removed | — | `/positions` |
| Holder: stopped liquidity stakes themselves (A3) | `notifyHouseBotOwner` (`withdrew`) | Holder | Bell + push | — | `/positions` |
| An erasure is refused because the account is still a house bot (R6) | `notifyAdminsHouseBotErasureBlocked` | Every recipient | Bell + email | Once per bot (`erasureBlocked`) | `/admin/house-bots/<botId>` |
| Holder: an owner confirmed their permission with their current password | `notifyHouseBotOwner` (`reverified`) | Holder | Bell + push + email | — | `/positions` |
| Holder: wrong password attempts reached the attempts kept for the holder | `notifyHouseBotOwner` (`verify_reserved`) | Holder | Bell only — no push (`NotifyOptions.push: false`) | The 90 s duplicate check. Every other holder notice skips it (`dedupe: false`): each is sent once per committed state change, so started → paused → started is three rows. | `/positions` |
| Holder: a house bet from their account | `notifyHouseBotOwnerStake` | Holder | Bell + push | While runtime `bot:<id>` count ≤ `holderNoticesPerHour`. A staff-chosen stake reads like any other. | `/positions/<positionId>` |
| Holder: bets beyond that cap | `notifyHouseBotOwnerHourSummary` | Holder | Bell | Once per EAT hour (`summary`) | `/positions` |
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
| `summary(audience, botId)` | `summary:<admins or holder>:<botId or all>` | hour | The hourly summaries, built from PLACED intents |
| `productDenied(value)` | `product-denied:<value>` | day | A stake on a product line no policy row admits (F1) |
| `rulesFuture(botId, version)` | `rules-future:<botId or global>:<version>` | — | Rules or limits saved by a newer build (F4) |
| `boundsInvalid(botId, hash)` · `boundsClamp(botId, hash)` | `bounds-invalid:<botId>:<hash>` · `bounds-clamp:<botId>:<hash>` | — | The live stake bounds moved: the bot can no longer bet, or its stake is clamped (F5) |
| `boundsCantFit(botId, field, hash)` | `bounds-cant-fit:<botId>:<field>:<hash>` | — | An Enter now stake or staff-chosen cap below the live minimum (N1 §5) |
| `erasureBlocked(botId)` | `erasure-blocked:<botId>` | — | An erasure refused while a live bot exists |
| `staffStakeVoided(marketId)` | `staff-stake-voided:<marketId>` | — | §9.2 |
| `staffStakeSelfDecided(marketId, action)` | `staff-stake-self-decided:<marketId>:<action>` (action: resolved, voided, reopened, objection_upheld, objection_rejected) | — | §9.2 |
| `staffEdge(officerId)` | `staff-edge:<officerId>` | previous month | The monthly staff-edge alert. It runs only on the first EAT day of a month, for the month just ended, and the key carries that month (an October run writes `staff-edge:<officerId>:2026-09`). |
| `preview(actorId, botId, marketId)` | `preview:<actorId>:<botId>:<marketId>` | minute | At most one ENTER_NOW_PREVIEWED event per officer, bot and poll per minute |
| `submit(actorId, submitId)` | `submit:<actorId>:<submitId>` | — | The double-tap claim for presses other than Enter now, target and staff-cancel presses, which write a `HouseBotPress` row instead |

---

## 10. Disclosure surfaces

⏳ Written in commit 6.

---

## 11. Runbook

### Release (R0–R6)
⏳ Written in commit 8.

### Migration preflight
⏳ Written in commit 8.

### Rollback levers
⏳ Written in commit 8.

### Sunset
⏳ Written in commit 8.

### First switch-on
⏳ Written in commit 8.

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
| 4 | The engine, info-edge, comms and holder-lifecycle suites, and the engine RED harness | — | Land in commit 4 |
| 5 | The reports suite, and the house cases in `test:erasure` and `test:dsar-secrets` | — | Land in commit 5 |
| 6 | The disclosure suite, which also pins risks 13–20 and the do-not-restore lines in §13 | — | Lands in commit 6 |
| 7 | The console suite, its RED harness and the visual pass | — | Land in commit 7 |
| 8 | The local end-to-end drive, the S4 rehearsals and the scenario coverage gate | — | Land in commit 8 |
| Production | Nothing is deployed. | — | NOT MEASURED |

---

## 13. Accepted risks

Risks 1–6 are PLAN §13, risk 7 is amendment A1, and risks 13–20 are PLAN §16b, each verbatim. The House bots entry in `COMPLIANCE-DECISIONS.md` carries the same text.

1. **Licence class and levies.** House stakes are taxed within the fee, and the pool becomes a "book" (F6 §3). Ali reports to GBT.
2. **Consent is knowledge, not proof.** Password-only (D5). Officer resets are blocked, but resets before the 2026-09-11 audit genesis are invisible.
3. **Exploitation is bounded, not eliminated.** Alt accounts farming counters are capped per account, and G4 still applies. Caps, penalty box, closeness rule and exit-window hold are the controls.
4. **The holder sees house positions live** (they could front-run with an alt account). House stakes also count against their own RG loss limit, which auto-pauses the bot.
5. **Throughput.** Bot bets serialise on `house:control` (ms-long), and the holder shares the `bet.place` rate bucket (min gap ≥ 20s).
6. **Delivery.** Merge conflicts with the parallel session are likely. `overlapSeconds` in production is unverified; the design is correct either way. sw/zh legal text needs native review. The leaderboard shows the holder's display name.
7. A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13). Recommended hardening, as a separate platform commit: revoke at the three writers, re-mint the session of the device that made the change, and add login copy `kp_revoked=pw`. House consent is unaffected either way, because consent is the fingerprint, never a session. (also recorded as hardening H1, C9)

Risks 8–12: ⏳ added in commit 8 (S5).

13. **Selection edge, bounded not eliminated.** Staff choose the poll and the moment, and can decline after seeing the computed side. They can also see what players cannot: positions with owner names and phones on the admin market page, AML views, and AI poll data (reasoning, confidence, reviewer). The side can't be typed, but it can be matched by waiting until the thinner side is the side they favour. Bounds: the blackout (AI result check recorded, or market reopened), the formula side and amount, staff-chosen caps inside the locks, the counterparty share limit and pro-rata counterparty caps, a durable record of every press (placed or refused), previews per officer, the vetoes register, and the monthly staff-edge scorecard with its alert (W16).
14. New with D17: a person chooses the moment of an opener stake and of any stake; opening empty markets is already superseded (UPDOWN D3, automated OPENER).
15. **Void after a staff-chosen stake.** A single admin can still void or reopen a market holding one (no officer lock: I10 and the 2026-07-24 guardrail). Mitigation is display, the R9 `houseStake.staffChosen` payload, the `staff-stake-voided` alert and an R1 row only.
16. **Amounts are deterministic,** so a repeated Enter now stake is recognisable (D6 fingerprint). With no jitter, an amount can't be re-rolled either.
17. **A fixed target delay makes reactions predictable.** The field hint recommends a range.
18. **Consumed trigger.** A target removed or ended after a trigger was decided consumes that trigger. No other bot may react to it (one COUNTER row per trigger).
19. **Counterparty concentration.** A staff-chosen stake can still be matched mostly against a few players' money. It is bounded by the share limit (refused when one account holds more than 50% of the locked opposite money, W15). It is also bounded by pro-rata counterparty caps: the stake counts toward the per-player daily counter limits of every account holding at least 25%.
20. **An officer may decide a market holding a stake they chose** (resolve, void, reopen or an objection ruling). There is no refusal (2026-07-24 guardrail, I10). The mitigations are display, audit and alert only: the viewer sees "of which chosen by you", the decision audit records `requestedBy`, and `staff-stake-self-decided` alerts every admin.

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
  | `housebot.verify` bucket | process | N× tries; C4's database reserve still binds |
  | Holder's `bet.place` bucket (`rate-limit.ts`) | process | holder gets more headroom |
  | Vendor 1-minute bar cache (`updown-terminal-vendor.ts`) | process | a cold container skips with UD_STALE_PRICE (fails closed) |
  | Maintenance flag, loaded once (`platform-config.ts`) | process | the other container's bet path misses it, so A9's maintenance fallback isn't binding |

- **R4 — no rewards on house stakes:** "No prize, cashback, tournament or rank reward may be computed on house-marked positions; public display may include them (D6)."
- **A10 — every refusal is mapped:** "A new bet refusal = a BET_PATH_REASONS entry + a mapper row in the same commit."
- **FS-07 — rules schema bumps:** "A rules schema bump may never widen scope or caps by default."
- **A7 — the session clock:** "A house bet neither advances nor is refused by the holder's session clock."
