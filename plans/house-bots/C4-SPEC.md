# Commit 4 · engine: build spec and rulings

> A working aid, extracted read-only on 2026-09-15 (OMEGA-COMPILE01) from `04-amendments.md` (`04`), `02-sealed-flows.md` (`02`), `01-scenario-register.md` (`01`), `PLAN.md` (`P`), `PROGRESS.md` (`PR`), `docs/HOUSE-BOTS.md` (`HB`) and the code on `house-bots` after Commit 3 (`624f6038`).
>
> **This file is not an authority.** The documents it cites win, and every `file:line` here must be re-derived before use. Code anchors are marked "(code @624f6038)"; plan anchors date from 2026-09-13 and are only pointers.
>
> Line numbers after `04:` / `P:` / `02:` / `01:` are the plan files' own lines on this branch.

## 0. Scope of record

PR "Scope per commit → Commit 4" (PR:281-299), with the rows placed in commit 4:
- **04 A-table:** 04:645.
- **04 R/P table:** 04:1435 (R5 penalty event, R6 copy rule and env-independent hook, P3 retention).
- **04 S/F table:** 04:1810 (F5, F6, F7, F8).
- **04 sequencing notes:** 04:2101.
- **04 N1/N2 row:** 04:4436.
- **P §11:** P:500.

**Moved in from Commit 2** (PR record 2b):
- the (a)/A21 post-commit hook call site;
- the Up & Down digest house split (with F6);
- A24's EXPLAIN pins for the per-bot and global usage reads at 1M/20k;
- MON-06, the two-process ±5 s clock-skew cash-out race.

**Suites:** `test:house-bot-engine`, `test:house-bot-info-edge`, `test:house-bot-comms`, `test:house-bot-holder-lifecycle`; **RED:** `red:house-bot-engine`.

**W1 is answered:** Commit 4 may be pushed while the repo is public (PR W1).

## 1. Already built (reuse, do not rebuild)

**Pure (`src/lib/house-bot/`)**
- `constants.ts`: `RUNTIME_KEY` :93, `ENGINE_CODES` :329, `DEFERRABLE_CAP_CODES` :421, engine timing constants :471-618, `ALERT_KEY` :647, `HOUSE_AUDIT` :718, `HOUSE_ENGINE_AUDIT_ACTIONS` :759 (code @624f6038). Constants already pinned: `LOCK_MARGIN_MS` 7000, `SWEEP_MIN_AGE_MS`, `TARGET_ARMING_SEC` 12, `HOOK_SOFT_CACHE_MS` 5000, `HOOK_SEMAPHORE` 4, `STALE_AFTER_SEC`, `CLAIM_TTL_SEC` 180, `REQUEUE_BACKOFF_SEC` [1,5,15,45], poller 2 s ± 300 ms with 2 slots, planner 15 s, `FIRST_TICK_DELAY_MS` 20 s, `ENGINE_STALE_MS` 30 s, `BOOT_GRACE_MS` 90 s, `OFF_DRAIN_LOCK_TIMEOUT` "3s", `HOUSE_BET_LOCK_TIMEOUT` "2s", AlertOnce retention 30 d / batch 5000, `HOUSE_PLANNER_TASK` "house-bot", `HOUSE_BOT_ENGINE_GLOBAL_KEY`, `HOUSE_BOT_ENGINE_ENV`.
- `rules.ts`: `parseHouseBotRules` :2812, `effectiveTiming` :3115, `effectiveTargetTiming` :3237.
- `clock.ts` (EAT keys); `consent.ts` (`consentValid`, `voidStands`, `holderCauses`, `rgLockStands`); `pause-reasons.ts`; `bet-path.ts` (`BET_PATH_REASONS`).

**DAL (`src/lib/server/house-bot-dal.ts`)** — interfaces (code @624f6038): control :1311, bot :1328, runtime :1377, alertOnce :1410, event :1425, intent :1446, target :1507, press :1540, book :1567, seam :1641; exports :3827; `houseTransaction`/`houseAtomic` :3848/:3869.
- **Intent store:** `claimBatch`, `claimById`, `heartbeat`, `markPlaced`, `requeueTransient`, `defer`, `finish`, `cancelPending`, `cancelLive`, `clampStake`, `expirePastDeadline`, `expireStale`, `poison`, `markAlerted`, `listAlertRepair`, `staffChosenPlaced(Today)`, `listFeed`, `insertIgnoringConflict`, `insertTargetedIfActive` (FOR SHARE).
- **Runtime store:** `beat`, `boot`, `advanceSweep`, `setScopeFrom`, `bumpErrorStreak`/`resetErrorStreak`, `markTransient`, `bumpHourCount`, `bumpRateLimited`, `listInstances`, `pruneInstanceRows`, `dbClock`.
- **Other stores:** target `endActive`/`endAllForBot`/`listActive`/`everStopped`; press `doneEnterNow`/`doneTerminalQueued`/`interruptStale`/`claimAuditLease`/`listAuditRepair`; event `drawOpenerSide`; alertOnce `claim`/`release`/`claimWithEatSuffix`/`purgeBatch` (purge has no production caller yet).

**Server (`src/lib/server/house-bot/`)**
- `seam.ts`: H0 :83, H1 :110, H2 :131, H3 :223, H4 :320.
- `pools.ts`: `lockedForHouse`, `lockedPoolInputs`.
- `blackout.ts`: `infoBlackout(marketId,{tx?})` — ⚠️ no `{countResolveClaim:false}` option yet.
- `book.ts`, `eligibility.ts`.
- `designation.ts`: `voidHouseConsent` :539, `withdrawHouseConsent`, `startHouseBot`; its `houseAudit` helper is private.
- `alerts.ts`: `houseBotAlertRecipients`, `playerHandle`.

**Bet path and notices**
- `market-service.ts` `placeHouseBet(botUserId, {marketId, side, stake, idempotencyKey}, {botId, intentId})` :981-996 → `BuyResult` (`replayed?: true`). Admission `maxWaitMs:0`; `AdmissionBusy`/55P03 → `BUSY/system_busy`. The header says only `house-bot/fire.ts` may import it.
- `notifyHouseBotOwner` (8 notices, RG gate, `push`/`dedupe` options); `HOUSE_BOT` kind (not money, W17).

**Not in `src` yet:** `control.ts`, `market-view.ts`, `trigger.ts`, `planner.ts`, `decide.ts`, `worker.ts`, `fire.ts`, `outcomes.ts`, `opener-side.ts`, `enter-now.ts`, `enter-now-decision.ts`, `oversight.ts`, `holder-hook.ts`, `feed-copy.ts`, `counterparty.ts`, `houseBotSchemaReady`, and every engine emitter except `notifyHouseBotOwner`.

## 2. Hook points in the platform (code @624f6038; re-derive before editing)

### ⛔ The trap first: a hook fired inside a lock joins that lock's transaction
- `withLock` publishes its transaction through AsyncLocalStorage (`locks.ts:112-121, :140`). A `void import().then(hook)` started inside a lock callback inherits it, so the hook's own `wallet:<user>` lock joins a transaction that may already be committed, or not yet hold the write.
- **Fire every hook after the outermost `withLock` returns**, or add a `locks.ts` helper that leaves the lock context (`lockStore.exit`). None exists today.
- `void import(` appears nowhere in `src`; today's patterns are `await import()` in try/catch and `promise.catch(()=>{})`.

### Bet commit — `market-service.ts`
- The outer `withLock(wallet:)` runs :1243-1655, and the bet commits when it returns.
- The post-commit block starts :1671; its guard `if (result.ok && committed)` is at :1675.
- Existing effects in that block, in order: `recordSnapshot` 1677 (floating), `emit` 1678, `emitWalletBalances` 1685, `readIdentityStanding` 1698 (awaited), `audit` 1699, `notifyBetPlaced` 1724, email 1740, `pushOnly` 1764, bonus 1783, `onRecruitBet` 1799 (guarded by `result.ok` only, so it also runs on replays), return 1815.
- **The Up & Down trigger hook goes under `committed` (:1675), for `ctx.kind === "player"` only.**

### Boot — `instrumentation.ts`
- `register()` :21; the nodejs block :22. Boot order: `runBootChecks` 25, scheduler 33, Up & Down 44, `startLifecycleTicker` 54-59.
- The engine start goes after :59, as a dynamic import in try/catch.

### Leadership — `leader.ts`
- `acquireLeadership(task, now)` :91; lease `LEASE_MS` 3 min :61; it fails closed in the catch :115-121.
- It takes **no lease-duration argument**, yet A24 needs 45 s for the planner and a lease write that throws.
- Its only caller is `lifecycle.ts:430`.

### Lifecycle — `lifecycle.ts`
- `startLifecycleTicker` :507 (timers are module-local :40-41); `runLifecyclePass` :381.
- Retention runs from `maybeRunRetention` :139-152 → `retention.ts runRetentionPass` :139-224. It has no house purge; `RetentionResult` is at :99-122.

### Health — `src/app/api/health/route.ts`
- `GET` :25. `dbReady` :45-46 is the only readiness input (ok :66, 503 :193). `leadership` :100. `HEAD` :208-220.
- There is no `houseBots` field.

### Up & Down
- `updown-board.ts`: `getBoard` :663, `getRoundDetail` :1346.
- `updown-service.ts`: `openRound` :673, `closeRound` :839, `advanceChain` :1493.
- `updown-digest.ts`: `runUpDownDailyDigest` :216; rows `positionStore.dailyTotalsByUser` :232 (`market-dal.ts` interface :525, memory :744-765, SQL :1303-1349). There is no house split.

### Maintenance
- `platform-config.ts isMaintenanceMode` :103, checked once in `buyPositionInner` :1047. Fire must read it through `loadConfigResult` (F7).

### Holder-change writers (A2 matrix; current lines, plan line in brackets)

| Row | Writer | Where the hook goes |
|---|---|---|
| 1 | `password-reset.ts changePassword` 330 [326] | after 330 |
| 2 | `consumeResetToken` 244 [242] | after 244 |
| 3 | `adminResetPassword` 275 [271] | after 275 |
| 4 | erasure nulls the hash | no hook: refused while live (row 4) |
| 5 | `user-service.ts closeAccount` user 104-108, wallet CLOSED 111 | after 112 |
| 6 | `responsible-gambling.ts selfExclude` status 307, freeze 308 | after 308 |
| — | reopen `players/[id]/actions.ts restorePlayerAction` 189, freeze lift 197 | after 197 |
| 7 | `coolOff` 348 [315] | after 348; the break ends with no writer, so only the L2 sweep sees it |
| 8 | `setLimits` upsert 248 [130] | after 248; a delayed raise in `effectivize` 114-119 fires no hook |
| 9 | suspend `suspendPlayerAction` 122 [121] | after 123 |
| — | restore | 189 |
| 10 | `wallet-freeze.ts applyFreeze` 64, inside `withLock(wallet:)` 53-86 | in `addWalletFreeze` :90 / `removeWalletFreeze` :95 after the promise settles (`ok && changed`); the KYC callers are inside `kyc:` locks |
| 11 | `kyc-service.ts` final refusal: underage 250, NIDA 375, `reviewKyc` 1186 | after their locks: 257, 383, after the lock ending 1204; reopen `reopenFinalRefusal` 981, after its lock (991-1051) |
| 12 | `staff/actions.ts applyRoleChange` 36 | after 39 |
| — | bootstrap promotion `auth-service.ts` 1050, inside `login:` 964-1114 | after the lock, with a flag |
| 13 | `agent-application-service.ts approveAgent` 1308 / `revokeAgent` 1406 | after their locks |
| 14 | `privacy.ts fileDsarRequest` 80 (synchronous; queue push 93) | after 94, ERASURE only |
| 16 | lockout `auth-service.ts` 975 | after the `login:` lock |
| 17 | `email-verification.ts setUserEmail` clear 142 / set 176 | after each |
| 18 | `player-2fa.ts` 35 / 77 | after each |

Other writers the A2 walker must know: `kyc-service.ts:1120` (PENDING_KYC → ACTIVE), registration create `auth-service.ts:634-641`, and `auth/demo/route.ts:240` (dev).

### Money events (F7; commit lines)

| Event | Where | Hook |
|---|---|---|
| deposit confirmed | `wallet-service.ts settleDepositConfirmed` lock 400-469 | at 471, inside `if (outcome.credited)` |
| deposit under RG lockout | same function, branch 519-537 | in that branch |
| deposit failed | `settleDepositFailed` 567 | after 568 |
| withdrawal requested | `withdraw` hold lock 1745-1816 | after 1824 |
| AML hold | `withdraw` 1945 | after 1949 (unreachable while `WITHDRAWAL_AML_HOLD` is off) |
| AML approve → dispatch | `dispatchApprovedWithdrawal` 717 inside `aml-txn:` lock `admin/aml/actions.ts` 70-128 | after that lock |
| withdrawal paid | `settleWithdrawalConfirmed` lock 591-617 | at 618 |
| withdrawal failed | `settleWithdrawalFailed` 858-869 | at 870 |
| officer adjustment | `adminAdjustBalance` lock 2611-2660 | after 2660 (restructure) |
| AML reject | `rejectAmlAction` 131, `aml-txn:` 145-201 | after the lock; note its wallet adjust 167 and txn 171 pass no `tx` |

## 3. Rules by area (citations; the cited text is the specification)

1. **Modules and boot** (P §4.1-4.2 P:216-224; A24 04:612-620; F7 04:1742-1745):
   - `startHouseBotEngine()` is idempotent, with state on `globalThis.__50PICK_HOUSE_BOT_ENGINE` (`inFlight`, stopping flag, timers).
   - The first tick waits 20 s. The poller runs with no leader; the planner runs under `acquireLeadership("house-bot", {leaseMs: 45_000})` with a throwing lease write.
   - Beats go to runtime keys `beat:poller:<id>` (only after a claim) and `beat:planner`; `engine:<id>` holds `{engineEnabled, bootAt}`.
   - `HOUSE_BOT_ENGINE=false` starts no timers and makes the bet-trigger hook return before its import.
   - SIGTERM: set `stopping`, requeue this instance's claims that are not in flight (inline Enter now excluded), release the lease.
   - Refuse to boot unless DB `TimeZone` is UTC or Etc/UTC (A4 04:179).
   - Skew is measured every minute; claim with `dueAt ≤ now() − max(0, skew) − 2 s`; above 5 s, stop claiming and alert.
   - Admission: no claims while queue depth > 0 or in-flight ≥ half the maximum; hook semaphore 4.
   - F7 source pin: no module-scope mutable state under `src/lib/server/house-bot/**` outside the globalThis keys.
2. **Schema gate** (A23 04:590-596; P §18 P:800, :822): `houseBotSchemaReady()` checks marker columns, **8** tables and seeded rows. If false: no engine and `/api/health` 503 with `houseBots.schemaReady=false`. The engine-stale warning waits 90 s after the latest boot.
3. **Triggers** (P §4.3 P:229-232; A11 04:339-345; A21 04:552-556; R5 04:1228; N2 §4 steps 1-4 04:3940-3975):
   - The hook handles **Up & Down only** (poll positions return before any read), under `committed` for player bets, suspended above |skew| 5 s.
   - The sweep is keyset `(placedAt, id)`, pages of 200, starting at `max(watermark − 90 s, dbNow − 10 min)`; while OFF or with no ACTIVE bot it advances with no writes. It reads only positions older than 5 s; `passNow` is read once per pass.
   - Scope start is `placedAt ≥ max(global scopeFrom, bot scopeFrom, target.effectiveFrom)`.
   - Trigger filter: unmarked, not a live bot's account, PLAYER, not penalty-boxed, not a live holder's recruit (HOLDER_RECRUIT).
   - One SKIPPED COUNTER row records a negative decision. A penalty box also writes a PENALTY_BOXED event.
   - A21 holder-against-own-bot: alert only (key `holder-against`), never refuse the bet; the sweep repeats the check.
4. **Scope and view** (A12 04:363-381; A13 04:397-403; A15 04:436-442; A16 04:454-465; P §4.7 P:280-283):
   - `inScope`; cutoffs; `HOUSE_MARKET_FIELDS` → `PublicMarketView` (no `StoredMarket` import in engine modules).
   - `udPriceForDecision`: vendor bar under 120 s, else observation under 60 s.
   - Closeness is checked against both targets.
   - The untargeted COUNTER uses `lockedA15`; FILL, targeted COUNTER and Enter now use `lockedForHouse`.
   - The A16 lifecycle table applies.
5. **Decide** (P §4.4 P:234-237; A7 04:233-238; N1 §4.1-4.2 04:2556-2700; N2 §4 steps 4-6):
   - `decide.ts` is pure: injected `randomInt`, `openerSide` and `blocked`; it imports neither the store nor `blackout.ts`.
   - Bot choice order is as specified; `why` and `decision` are written once and carry only `playerHandle`.
   - Target timing: `dueAt = max(requested, exitWindowClosesAt + LOCK_MARGIN_MS)`, `staleAt = dueAt + 60 s`.
   - `enterNowDecision`, steps 1-11.
6. **Claim, fire, outbox** (N1 §4.3 04:2702-2892, which replaces P §4.5; A8 04:253-256; A9 04:272-284; A10 04:307-318; F5 04:1701-1703):
   - Poller claim on `staleAt`.
   - `fireClaimedIntent` refuses inside a lock or admission slot; registers in `inFlight`; heartbeats every 30 s.
   - F5 re-checks; target checks inside fire after scope (N2 §4 step 7); write-back clamp for every kind.
   - Transient requeue with `transientAttempts`; deferral for rate caps.
   - A8 `alertedAt` claim, then alerts.
   - The engine never writes PLACED.
7. **Outcome mapper** (P §4.6 P:253-274, amended by A7/A10/N1 04:2967-2995): `satisfies Record<HouseBetOutcomeKey, …>` over `BET_PATH_REASONS`. The full table is in the extraction (A10 + N1 rows).
   - Auto-pause order (A19 04:515-525): the status commits under `wallet:<botUser>`; after release, cancel intents, append the event, await the COMPLIANCE audit, send alerts.
   - The engine audit allowlist is as specified.
8. **Planner pass order** (N1 04:2880-2892):
   1. deadline;
   2. STALE (before POISON);
   3. POISON;
   4. press INTERRUPTED/DONE;
   5. audit lease repair;
   6. A8 repair;
   7. `endTargets`;
   8. once a minute: oversight;
   9. hourly: summaries, and staff-edge on the first EAT day.
   - Also: FILL/OPENER planning (opener draw via `openerSide`), realised-loss stops (P §3 P:206-211), F5 `revalidateLive`, A7 stake-min pause, rules parse outcomes (C14), the C8 cooling-off-end bell, the C9 erasure-request sweep, and the AlertOnce purge (P3 04:1392).
9. **Holder hook** (A2 04:79-119; A3/C8 04:138-140, :822-836; A5 04:203-213; R6 04:1249-1256; F8 04:1755-1757; P §14 P:571-601; 02 §2.2-2.3):
   - `holder-hook.ts onHolderAccountChanged(userId, event, meta)` at every row, fired after the write and outside locks.
   - One indexed read for a live bot; then, under `wallet:<userId>`, re-read and recompute `holderCauses`, and apply the status rules.
   - Consent voids go through `voidHouseConsent` (Commit 3). Closure → REMOVED(ACCOUNT_CLOSED) by `system_house_bot`.
   - Password changes follow the P §14 effect table (A1/A2/H1 copy; key `pw:<botId>:<newFingerprint>`).
   - The L2 sweep repeats every row.
   - F8 walker: `scripts/**` and SQL literals need `// house-bot: covered by L2 sweep`.
10. **Kill switch OFF** (A9 04:272-280; P §18 P:776-781):
    1. autocommit OFF, no lock;
    2. drain with `lock_timeout '3s'` on `house:control`;
    3. cancel intents;
    4. audit and alerts after release.
    - Copy as specified; if the DB is unreachable: "House bots were NOT switched off…".
11. **Notifications** (P §7 P:381-392; C13 04:1044-1068; F6 04:1718-1721; N1 §7 04:3271-3302; N2 §7 04:4165-4184; 02 F6/F7):
    - Emitters: `notifyAdminsHouseBotBet` (capped; excludes staff-chosen), `…HourSummary` (split), `…Paused`, `…Switch`, `…MoneyEvent`, `…Alert`, `…Roster`, `…StaffChosen`, `notifyHouseBotOwnerStake`, `notifyHouseBotOwnerHourSummary`.
    - F6 `CHANNEL_POLICY` + `channelAllowed`.
    - The Up & Down digest house split (A17 (h) 04:490).
12. **Retention** (P3 04:1392; A20 04:537): the AlertOnce purge in `runRetentionPass`, plus `houseBotAlertOncePurged` in `RetentionResult` and the audit payload.

## 4. Tests demanded

Citations; the full lists are in the extraction.
- **`test:house-bot-engine`:** P:517; A3 04:153-155; A5 04:220; A7 04:241; A8 04:259-261; A10 04:321-325; A11 04:348-350; A12 04:384-387; A15 04:445-448; A16 04:468-473; A19 04:528-530; A21 04:559-562; A24 04:626-634; A4 04:192; F5 04:1706-1709; F7 04:1748-1749; N1 04:3692-3723; N2 04:4359-4377.
- **`test:house-bot-info-edge`:** P:518; A13 04:406-408; N1 04:3724-3730.
- **`test:house-bot-comms`:** P:519; C13 04:1071-1078; F6 04:1724-1726; N1 04:3731-3739; N2 04:4393-4396.
- **`test:house-bot-holder-lifecycle`:** A2 04:116-119; F8 04:1760-1761; N1 04:3740.
- **`red:house-bot-engine`:** N1-1…9 04:3796-3804; N2-E1…E8 04:4403-4410; plus the 01 mutations at 01:754, :770, :2249.
- **Also:** `test:erasure` (R6 04:1263), `test:retention` (P3 04:1398), `test:house-bot-caps` (A9 drain 04:292-294; MON-06 04:3686/4354), `test:wallet-status-writers` (only if a house wallet write is added).
- **Scenario ids to cover:** ENG-* (01:1052-1377) and TGT-* (01:2626-3683). Commit 4 owns most TGT-* (the 01 text names the engine suite for 27 of them).

## 5. Build order (resume steps for a fresh session)

1. **`locks.ts`:** a helper that runs a callback outside the ambient lock context. **`leader.ts`:** `acquireLeadership(task, {leaseMs})` with a lease write that throws; the lifecycle caller is unchanged. Both get unit cases; re-anchor any red anchor.
2. **Pure pieces:** `market-view.ts` (A13 fields and projection), `decide.ts`, `counterparty.ts`, `enter-now-decision.ts`, `feed-copy.ts` (`satisfies Record<EngineCode,…>`), the outcome-mapper table (`satisfies Record<HouseBetOutcomeKey,…>`). Pure suites first.
3. **`houseBotSchemaReady()`** + the `/api/health` `houseBots` field + the 503 rule; `startHouseBotEngine()` boot, globalThis state, beats, skew, TZ check, SIGTERM, and `instrumentation.ts` wiring (env-gated).
4. **`fire.ts` / `worker.ts` / `outcomes.ts`:** claim, fire re-checks, write-back clamp, transient requeue, deferral, A8 outbox, mapper, auto-pause order (A19).
5. **`planner.ts`:** expiry, STALE, POISON, press passes, repairs, loss stops, F5, A7, FILL/OPENER + `opener-side.ts`, `endTargets` (extend `blackout.ts` with `{countResolveClaim}`, output unchanged), `oversight.ts`, summaries, AlertOnce purge in `retention.ts`.
6. **`trigger.ts`:** the Up & Down post-commit hook (outside the lock, `committed`, player only), the poll sweep with target arming and FOR SHARE insert, A21, penalty box.
7. **`holder-hook.ts`:** hooks at every A2 writer (§2 table, outside locks), the L2 holder sweep, closure → REMOVED, the password effect table, F8 walker.
8. **Kill switch OFF drain** (A9) as a service; the action is commit 7.
9. **Notifications:** emitters + comms-registry + cert-c3/cert-c1 drive rows; F6 `CHANNEL_POLICY`; the digest house split.
10. **Money hooks** (F7) at §2's commit points.
11. **Suites:** the four suites on both stores (commit 2's `house-bot-two-stores.mts`) + `red:house-bot-engine`; then the closing gates as in commits 2-3. Re-run `test:kyc-copy-truth`, `test:position-permalink`, `test:failure-reasons`, `test:cert-c1`/`c3` and `test:wallet-status-writers` early: each went red on new house code in Commit 3.

## 6. Rulings this build takes

Authority order: 04 > 02/03 > PLAN > 01; the later and more specific text wins.
1. **Hook:** `holder-hook.ts onHolderAccountChanged` at every A2 writer (A2, P §18:791) — not P §14's `credential.ts`.
2. **Erasure nulling the hash** fires no hook: erasure refuses while a bot is live (A2 row 4, Commit 3).
3. **Sweep lookback:** A11 (`max(watermark − 90 s, dbNow − 10 min)`), not P's 60 s.
4. **Claim and lateness:** N1's `staleAt` claim replaces P §4.5 and A24's `maxLateness`.
5. **Alert once:** A8 `alertedAt` claim, not "ok and not replayed".
6. **Stake refusals:** A7 (bounds → SKIPPED(STAKE_BOUNDS_CHANGED); not whole → FAILED).
7. **INVALID:** A10 re-reads the market; an invalid SIDE (impossible from a stored intent) stays FAILED + SECURITY + master OFF(ENGINE_FAULT).
8. **`house_market_conflict{OPPOSITE_SIDE}`** → SKIPPED(CAP_OPPOSITE_SIDE); the others → MARKET_HELD (N1).
9. **Auto-pause order:** A19, not P §4.6.
10. **Heartbeats:** runtime keys `beat:poller:<id>` / `beat:planner` (A24, the schema), not P's fields.
11. **Schema gate:** 8 tables.
12. **The bet hook** decides Up & Down only; polls are sweep-only (N2, P §18:813); suspended while |skew| > 5 s.
13. **`HOUSE_BOT`** stays out of MONEY_KINDS (W17 default).
14. **Links:** C13's (engine alert `…&range=all&outcome=failed&intent=`, `?reverify=1` for password or void pauses); staff-chosen rows use N1's `&intent=`.
15. **A21:** key `holder-against:<botId>:<marketId>` (as built), C13's sentence, href `/admin/markets/<marketId>`, event HOLDER_AGAINST_BOT.
16. **A break that ends** sends ONE bell: `rgEnded` (C8). The C13 "cause cleared" bell covers restore, freeze lifted and role back, never a break end.
17. **The holder's hourly summary** is bell only; house-only notices send no email (F6 "email only through the summary" read as a ceiling, not a requirement).
18. **The L2 holder sweep runs whatever `HOUSE_BOT_ENGINE` says** (R6's intent: holder detection is not env-gated). It runs from the lifecycle ticker's leader pass, not the engine planner.
19. **No IDENTITY_REQUIRED cause:** FS-23 was dropped (04 §0); 01's rows are superseded.
20. **`session_limit_reached`:** a `satisfies` row → AUTO_PAUSED(ACCOUNT_BLOCKED) + one alert (unreachable by A7).
21. **Day and hour keys** go through `clock.ts` (C14, P §18:784).
22. **Placement follows PROGRESS** where 04's tables disagree (A8, A23, the four suites).
23. **Commit-7 surfaces:** engine suites drive services; action-level press cases, href route existence at +60 days and the console Callout are recorded NOT MEASURED in commit 4 and land in commit 7.
24. **MON-06** lives in `test:house-bot-caps` (N1/N2 placement).
25. **A24's usage EXPLAIN pins** live in `test:house-bot-money` beside Commit 2's pins.
26. **A9's drain cases** (OFF < 1.5 s with `house:control` held 60 s; holder withdrawal < 3 s with `market:X` held 20 s) land with the drain in `test:house-bot-caps`.
27. **BOTH_SIDES penalty:** the sweep sets it when a trigger account holds OPEN positions on both sides of a market the house countered (R5 cause BOTH_SIDES); a trigger exit sets CASHED_OUT_COUNTERED.
28. **`house_bot.credential_changed`** (SECURITY) is written by the holder hook as `system_house_bot`; it joins `HOUSE_ENGINE_AUDIT_ACTIONS`.
29. **Self-decided oversight** recomputes `requestedBy` from intents and targets (R9's payload is commit 5). **Staff-edge baseline:** `kind<>'MANUAL' AND "targetId" IS NULL` on polls.
30. **Target checks run inside `fireClaimedIntent`, after the scope step** (N2 §4 step 7 + N1 §4.3 step 6). "Exit-window fit" means N2 step 5's EXIT_WINDOW_TOO_LATE rule.
31. **Hooks never run inside a lock:** fired after the outermost lock returns, or through the `locks.ts` exit helper (§2 trap).

*Rulings taken while building (2026-09-15, §5 steps 1–2; the code carries the rule, these record why):*

32. **The strict lease write is opt-in.** `acquireLeadership(task, {strictWrite:true})` fails closed on a lost lease write (A24); the lifecycle ticker keeps its swallowing write and 3-minute lease ("the lifecycle caller is unchanged", §5 step 1). The same swallow in the lifecycle lease is a platform item, not house-bot scope.
33. **An invalid side and a foreign idempotency key are engine faults.** On the bet path `market_not_live` is the invalid-side refusal (`buyPositionInner`), which a stored intent cannot produce; `idempotency_key_conflict` can only follow a defect H0 missed. Both → FAILED(INTERNAL) + SECURITY + master OFF(ENGINE_FAULT), as `house_key_mismatch` (PLAN §4.6).
34. **Cash refusals skip under the balance-floor code.** `balance_insufficient` and `house_cash_only` → SKIPPED(CAP_BALANCE_FLOOR) + AlertOnce per bot per day (PLAN §4.6 names no code). `stake_not_whole` → FAILED(INTERNAL) + the `stakeNotWhole` AlertOnce (A7).
35. **`enterNowDecision` uses the seam's own NULL and window rules.** A money cap that is not set leaves no room (STAKE_BELOW_MIN naming it); a rate cap that is not set refuses with its code; PER_HOUR and PER_DAY are the seam's rolling 3,600 s / 86,400 s windows (`botUsage`), not the EAT day N1 §4.2 mentions — the code is authority.
36. **Trigger filter rows.** A marked position, a live bot's account or a non-PLAYER account is not a trigger (no row). A penalty-boxed or HOLDER_RECRUIT trigger leaves ONE SKIPPED row with that code when some bot covers the market, so "didn't react" stays visible (PLAN §4.3).
37. **"Skip polls closing within" records CUTOFF** (no code of its own in PLAN §4.4). The pool band compares the raw YES + NO total.
38. **Targeted timing is drawn before its money read.** `drawTargetDelay` draws the delay; the loader then reads `lockedForHouse(asOf: dueAt)` and passes both into `decideCounter`, which stays pure. The untargeted COUNTER's decision cut is PLAN F4's `nonHouse(trigger side) − raw(bot side)`; fire re-cuts on `lockedA15` through the write-back clamp.
39. **FILL sizing.** Thin side S when `raw(S)·100 < p·(raw(S)+raw(opp))` and `locked(opp) > 0`; stake `floor(locked(opp)·p/(100−p)) − raw(S)`, cut to H3's `locked(opp) − raw(S)`, then the bot's maximum, the platform maximum and round-to; due `max(cutoff − lead − jitter, passNow)`. PLAN F4 says "up to that share" without a formula; A15/N1 size FILL against eligible locked money.
40. **Out of scope writes no row.** A demo market, a product no policy admits, an Up & Down market with no round and a poll with no cutoff produce no intent; `decide` returns the code (UD_NO_ROUND, NO_CUTOFF, PRODUCT_NOT_SUPPORTED) for the caller's once-only alerts (A12 tests). A demo market reuses PRODUCT_NOT_SUPPORTED.
41. **The information blackout gates staff-chosen rows only.** `decideCounter` applies `blocked` to the target candidate; an untargeted COUNTER, FILL and OPENER ignore it (N1 §3 "for staff-chosen rows only", as H3 does).

*Rulings taken in §5 step 3 (2026-09-15):*

42. **The engine shell takes its passes as arguments, and `instrumentation.ts` is wired in step 4.** A booted engine with no poller would beat for work nobody did; `startHouseBotEngine(ticks, deps)` is proven on its own now, and the boot call lands with the poller tick.
43. **The database TimeZone gate is exact:** `current_setting('TimeZone')` must be `UTC` or `Etc/UTC` (A4). The local scratch cluster reports the machine zone, so the engine refuses there; local drives set the cluster to UTC rather than widen the gate.
44. **The schema gate caches only "ready".** A not-ready answer is asked again on every call, so a container that booted mid-migration recovers without a restart; a failing probe is not ready (fails closed).
45. **`marketView` is a seam-store member** (plain SELECT, both twins), so `test:dal-parity`'s existing both-implementations check covers it with no new wiring pin. The row types live in the DAL; `market-view.ts` re-exports them type-only and stays pure.

*Rulings taken in §5 step 4 (2026-09-15):*

46. **The engine is wired into `instrumentation.ts` only with the alert emitters (step 9), not in step 4.** `applyOutcome` and fire take `EngineAlerts` as a required argument with no default, so no build can run the engine with a silent alert channel; ruling 42's "wire in step 4" moves to step 9.
47. **Where a deferred rate cap waits.** MIN_GAP defers to the seam's own `detail.until`; GLOBAL_BETS_PER_MINUTE defers 60 s (its window length, an upper bound on when it frees); PER_HOUR and PER_DAY skip — the seam's answer does not carry their free time, and an hour-scale deferral outlives `staleAt` for every Up & Down and targeted row. A deferral past `staleAt` skips (N1 §4.3).
48. **Maintenance at fire reads the row, not the latch.** `control.ts maintenanceOn()` reads `platform_config` through `loadConfigResult`; an unreadable row throws (a transient requeue, never a stake). A stored row is interpreted as `getPlatformConfig` interprets it (no `timezone` → the defaults), so fire and the bet path never disagree; the seam's own maintenance check still runs inside the bet.
49. **`account_blocked` is resolved by re-reading the account (A10).** CLOSED → REMOVED(ACCOUNT_CLOSED) through `stopBot` (A5); SELF_EXCLUDED or COOLED_OFF → `voidHouseConsent` with that cause (it pauses, ends the bot's targets and cancels its intents in its own wallet-lock transaction); SUSPENDED → AUTO_PAUSED(ACCOUNT_SUSPENDED); anything else, unreadable included → AUTO_PAUSED(ACCOUNT_BLOCKED).
50. **A transient requeue with no time left expires on the nearer bound:** EXPIRED(STALE) when `staleAt ≤ deadlineAt`, else EXPIRED(BUSY_TIMEOUT) (N1 §4.3 MON-10, PLAN §4.6).

*Rulings taken writing the §13 cases (2026-09-15, third session):*

51. **A failed re-read requeues, never guesses.** When the market read fails on `NOT_FOUND`, `INVALID` or `SELECTION_CLOSED`, or the holder read fails on `house_consent_stale`, the row takes the transient requeue (MON-10 backoff; no time left → ruling 50). A consent re-read that finds no cause at all (re-verified in between) requeues too. `account_blocked` keeps ruling 49: its unreadable account is ACCOUNT_BLOCKED, because the bet path had already refused on a real account state.
52. **One stop helper, and a consent-void cause voids consent.** A refusal or re-read naming SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED or HOLDER_ERASURE_REQUEST goes through `voidHouseConsent`, which ends the bot's ACTIVE targets (A3, TGT-40). Before this ruling, the bet path's own `self_excluded`/`cooling_off` refusals only paused the bot and left its targets ACTIVE; case 13.29 proves the fix. A void that already stands stops the bot through `stopBot` with that cause. The engine never writes HOLDER_WITHDREW (only the holder withdraws; no holder confirmation or withdrawal audit from the engine, 13.40). An engine-found void sends one `botStopped` alert when it paused an ACTIVE bot. ACCOUNT_CLOSED from any path → REMOVED (A5). After every stop, the claimed row is closed CANCELLED(BOT_NOT_ACTIVE) — a second worker's answer on an already-paused bot no longer leaves it CLAIMED until expiry (13.31).
53. **An engine fault switches OFF whoever holds the row.** `market_not_live`, `idempotency_key_conflict` and `house_key_mismatch` are defects whether or not the row was moved by the planner or another worker in the meantime; the conditional `switchOff` still writes once (13.24, 13.26).
54. **An unknown cap code is UNMAPPED (A10):** FAILED(UNMAPPED) + AUTO_PAUSED(UNMAPPED_REFUSAL) + one alert a day — the same as an unknown reason, never a silent FAILED (13.57).
55. **The outcome table's field is `reasonCode`** (the `HouseBotIntent` column it is written to), not `code`. `test:failure-reasons` 9b reads any `code: "X"` literal under `src/lib/server` as a player-facing emitter; the table's `code: "MAINTENANCE"` turned its "MAINTENANCE is still emitted by nothing" pin red. The emitter walk is unchanged; the engine's intent codes no longer sit in a player refusal's position.
56. **`control.ts` is a named read-only caller of `checkLossLimit`** in `test:failure-reasons` 8c (the holder's own limit, asked before an engine stake; the stake itself still meets `buyPosition`'s check). The guard's stale-exemption check keeps it honest.
57. **A15 price read.** `udPriceForDecision(assetId)` (`server/house-bot/ud-price.ts`) takes the newest cached 1-minute vendor bar through `peekVendorBar` (cache only — no fetch, no TTL change, a cached failure is no bar), aged from the bar's OPEN (`t`), under 120 s; else the latest CONFIRMED observation through the board's own read (`observationStore.list({state:"CONFIRMED", limit:1})`, newest first on both stores), aged from `sourceQuotedAt`, under 60 s; else null (UD_STALE_PRICE). A failed observation read is no price. PLAN I2 lists this source per A15; the info-edge walker must exempt `ud-price.ts` by name.

*Rulings taken building `enter-now.ts` (2026-09-15, fourth session):*

58. **`marketHeld`'s count is seam H2's count.** N1 §4.4 says "this bot's OPEN house positions here ≥ `freqMaxPerMarket`", but H2 refuses on `botUsage.countOnMarket`, which counts the bot's marked positions in ANY status, and refuses a NULL cap. The predicate uses that read and holds on NULL, so the picker, preview and fire never show a market the gate then refuses (code over plan; case 15.13 places through the seam to prove the two agree).
59. **`marketHeld` answers in N1 §6 refusal 15's order and codes** (a OWNER_POSITION, b OTHER_BOT, c OWN_INTENT, d PER_MARKET_COUNT), not §4.4's listing order: §6 is the later, more specific text, and the officer sees the holder's own stake first. OTHER_BOT names the other bot when a live intent or ACTIVE target holds the market; when only another bot's OPEN position does (the aggregate `marketUsage` read), `botId` is null and commit 7's copy resolves it. The bot's own ACTIVE target does not hold its market (§4.4 lists targets only under "another bot"). `own` in the Enter now input is the holder's OPEN marked positions, as H2's conflict check reads them.
60. **The loader reads one statement at a time, and owns only four refusals.** `loadEnterNowInput` answers BOT_MISSING, MARKET_MISSING, RULES_FROM_FUTURE or RULES_REVIEW (N1 §6 refusals 7 and 9, rules parse); every other refusal (master, bot status, holder, scope, lifecycle, holding) belongs to the caller's list, run before the loader. Its reads are sequential: a first draft ran fifteen reads in parallel and the Postgres child lost its connection to the scratch cluster mid-section (the pool-exhaustion cause is probable, NOT MEASURED); a preview must never take a burst of pooled connections from players' bets.
61. **The server's rules parse context** (`rules-context.ts`) is every chain of an ENABLED asset keyed `<assetId>:<durationMinutes>` with the label `<symbol> <d>-min`, plus `RULES_CONTEXT_LISTS`; live stake bounds are left out (parse never checks them, F5). A chain of a disabled asset reads as stale — narrowing, never widening.
62. **`houseSeamStore.placedTimes({houseBotId|null, withinSec})`** returns placement instants newest first on the database clock, with the window bounded to whole seconds 1–86,400 in both twins (the longest rate window). The loader asks 86,400 s for the bot and 60 s for the platform, the windows H2 and H4 count.

*Rulings for `fire.ts` and `worker.ts`, taken before building them (2026-09-15, fourth session; sources: PLAN F5 P:96-107, PLAN §4.6 P:253-274, N1 §4.3 04:2702-2892, N1 §4.6 04:2967-2995, N2 §4 step 7 04:3989-3995, A16 04:451-473, C14 04:1082-1122, F4 04:1676-1690):*

63. **Fire's F5 re-checks go through the one mapper.** A re-check that finds a condition a bet-path refusal names is applied as that refusal through `applyOutcome`, so a pre-check and the seam write the same row, event, audit and alert: master OFF → `house_disabled`; maintenance → `maintenance`; bot missing or not ACTIVE → `house_bot_inactive`; a holder cause → `loss_limit_daily` when the first cause is OWNER_LOSS_LIMIT, else `house_consent_stale` (the mapper re-reads and stops on the live cause, or requeues when none remains — ruling 51); market missing → bare `NOT_FOUND`; market not LIVE → bare `INVALID` (the mapper's market re-read); a COUNTER trigger no longer OPEN → `house_trigger_gone` (penalty box). Outcomes with no bet-path refusal are written with the conditional `finish` on the claim.
64. **Order at fire, per kind** (PLAN F5, N1 §4.3 step 6, N2 §4 step 7): master · maintenance · bot · holder · rules parse · market · A12 market scope, product policy and the row's own product line · bot scope (ruling 66) · A16 (reopened → MARKET_REOPENED for automated kinds, while staff-chosen rows meet the blackout; chain stopped or asset disabled → CHAIN_NOT_RUNNING) · deadline = min(stored, fresh cutoff − `minTimeToCutoff`) on the database clock → EXPIRED(CUTOFF) · schedule (automated kinds and a targeted COUNTER; never MANUAL, W8) → SKIPPED(OUTSIDE_SCHEDULE) · target checks (targeted rows) · blackout (staff-chosen rows) → SKIPPED(INFO_BLACKOUT) · trigger OPEN (COUNTER) · Up & Down closeness on `udPriceForDecision` (automated Up & Down rows) → SKIPPED(UD_CLOSENESS / UD_STALE_PRICE / UD_NO_PRICE) · MANUAL: `marketHeld` ignoring the row, `loadEnterNowInput`, `enterNowDecision` with N1 §4.3 step 6's mapping · the step-9 re-cut and write-back clamp (ruling 67) · the bet.
65. **Rules at fire** (A4 04:185-186, C14, F4): RULES_FROM_FUTURE → the row goes back to PENDING through the transient requeue (no pause, no error streak; F4's 10-minute alert belongs to the planner); RULES_OUTDATED / RULES_INVALID → AUTO_PAUSED with that cause and the parse's field through `stopBot`, and the row CANCELLED(BOT_NOT_ACTIVE).
66. **A bot that no longer covers the market at fire → SKIPPED(OUT_OF_SCOPE)**, a new engine code (the `reasonCode` column is TEXT with no CHECK, so no migration) with its feed sentence; the name is the target end cause of the same meaning (N2 §4 step 9.6). C14 says nothing about rows queued before an owner narrows scope; firing them would place a stake the saved rules no longer allow. MANUAL: polls product off, category no longer listed, or `enterNow.enabled` false; targeted COUNTER: polls product off, category no longer listed, or `targeting.enabled` false; automated kinds: `botCovers(bot, view, mode)` false.
67. **The step-9 re-cut, per kind, before the write-back clamp** (MON-02, rulings 38–39): an untargeted COUNTER against `lockedA15(trigger side) − raw(bot side)` (H3's A15 test); a targeted COUNTER and FILL against `locked(opposite) − raw(side)`; OPENER no pool term (H3 needs both pools 0); MANUAL the re-run decision's stake. Then `min(row stake, cut, stakeMaxTzs, bounds.max)` floored to the rules' round-to. A cut ≤ 0 → SKIPPED(CONDITION_GONE), the row H3 would write; a stake below `max(stakeMinTzs, bounds.min)` → SKIPPED(STAKE_BOUNDS_CHANGED) without calling the seam. A stake never grows; the clamp writes back only a smaller stake, conditional on the claim (0 rows → stop).
68. **When `applyOutcome` itself throws** (a store read inside it failed), fire requeues the claimed row through `requeueTransient` in a try/catch and returns; if that also fails, the claim expires and the planner's STALE pass ends the row. No stake can land twice: the seam's key is the intent id (I4), and H0 replays it.
69. **`inFlight` and the heartbeat wrap the whole fire** in try/finally: the row is registered in `engineState().inFlight` before the first read, the `FIRE_HEARTBEAT_MS` timer is unref'd, and both are cleared on every exit, a throw included. Fire throws before registering when called inside a lock, a lock transaction or an admission slot (MON-13).
70. **`worker.ts`:** `pollerTick` = `claimGate` → `claimBatch({me, freeSlots, skewGuardMs})` → beat `beat:poller:<instance>` only when a row was claimed → fire the claimed rows concurrently (at most `MAX_FIRES_PER_PROCESS`). `requeueMine(instanceId, excludeIds)` for SIGTERM needs a new intent-store member returning this instance's CLAIMED rows (not in flight) to PENDING, conditional on the claim, in both twins (`test:dal-parity` picks it up).

*Rulings for `planner.ts` and `trigger.ts`, taken before building them (2026-09-15, fifth session). They resolve every open point of `C4-PLANNER-EXTRACT.md` §6 (P1–P32) and `C4-TRIGGER-EXTRACT.md` §10 (T1–T15) in one sequence; a shared point has one ruling. Sources: N1 §4.3 pass order 04:2880-2892, N1 §4.5 04:2911-2946, N2 §4 04:3940-4010, N2 §2 04:3889, A8 04:253-256, A10 04:317, A11 04:334-350, A12 04:363-387, A16 04:454-473, A19 04:515-530, A20 04:537-542, A21 04:552-562, A24 04:607-634, C7 04:1924-1928, C13 04:1044-1078, R5 04:1228-1229, R6 04:1256, F4 04:1683-1690, F5 04:1701-1709, PLAN §3 P:206-211, §4.2-§4.4 P:222-237, §11 P:500, ENG-16 01:1176.*

| Open point | Ruling | Open point | Ruling | Open point | Ruling |
|---|---|---|---|---|---|
| P1 | 71 | P12 | 82 | P23 | 91 |
| P2 | 72 | P13 | 83 | P24 · T1 | 92 |
| P3 | 73 | P14 | 84 | P25 · T14 | 93 |
| P4 | 74 | P15 · P16 | 85 | P26 · T10 | 94 |
| P5 | 75 | P17 | 86 | P27 | 95 |
| P6 | 76 | P18 | 87 | P28 | 96 |
| P7 | 77 | P19 | 88 | P29 · T12 | 97 |
| P8 | 78 | P20 | 89 | P30 | 98 |
| P9 | 79 | P21 | 90 | P31 · T7 (doc) | 99 |
| P10 | 80 | P22 | 91 | P32 | 100 |
| P11 | 81 | T2 | 101 | T3 | 102 |
| T4 | 103 | T5 | 104 | T6 · T7 | 105 |
| T8 | 106 | T9 | 107 | T11 | 108 |
| T13 | 109 | T15 | 110 | §1.10 switch-off · §1.16 wallet | 111 · 112 |

71. **Planner pass order.** N1's steps 1–7 in N1's order (deadline · STALE · POISON · press INTERRUPTED then DONE · audit lease repair · A8 alert repair · `endTargets`), then the duties N1 gives no slot, in this order: 7a A16 PENDING lifecycle sweep (ruling 88) · 7b rules-parse outcomes and the F4 future alert (ruling 100) · 7c F5 `revalidateLive` with A7's stake-min pause (ruling 84) · 7d realised-loss stops, bots then global (rulings 82–83) · 7e WALLET_MISSING (ruling 112) · 7f FILL/OPENER planning, only while the master is ON (P:500; ruling 91); then N1 step 8 (once a minute: oversight) and step 9 (hourly: summaries, `pruneInstanceRows`). Money-safety duties (expiry, pauses, stops) run before anything that plans a stake, so a pass never plans a FILL for a bot it is about to pause. **Every duty runs in its own try/catch** and a failing duty never skips the next; the failure is logged by duty name (no ids) and counted in the pass result.
72. **The deadline pass also expires abandoned claims** (ENG-16 01:1176: "CLAIMED rows past deadline are expired by the planner; an in-flight claim is never expired"). `expirePastDeadline()` = PENDING past `deadlineAt`, OR CLAIMED past `deadlineAt` with `claimedUntil < now()` → EXPIRED(CUTOFF). A live claim (`claimedUntil ≥ now()`) is left to fire's own deadline check. Both twins; the dal-parity case grows.
73. **POISON writes one audit per pass, never one per intent.** A19 allowlists `house_bot.poison` AND says "no row per intent" (04:520, :523); both hold when a pass that poisoned n ≥ 1 rows writes ONE `house_bot.poison` row (actor `system_house_bot`, target `HouseBotControl`/`global`, payload `{cause:"POISON", counts:{poisoned:n}}`), as A19's own test "OFF with 200 intents writes exactly one audit row" counts. Each poisoned row still gets its AlertOnce `poison:<intentId>` (A10) through `alerts.once`. No event (EVENT_KINDS stays 30).
74. **The press audit repair writes as the officer who pressed, from one shared builder.** The audit records the officer's decision; the planner only delivers a write the press flow lost, so `actorId = press.actorId` (never `system_house_bot`, whose allowlist A19 keeps to engine decisions). The builder is `server/house-bot/press-audit.ts pressAuditEntry(press, {intent, events})` → `{action, category, targetType, targetId, payload}` for the six N1 §2 shapes; the planner uses it now and commit 7's actions use it for the first write, so the first write and the repair cannot drift. A press whose record cannot be rebuilt (intent or event missing) is left unaudited and counted, never guessed.
75. **`endTargets` runs whatever the master says** (a target ends on market facts; OFF does not make a closed poll's target meaningful). Per target: causes 1–5 always; cause 6's A12 `scopeCode` and F1 policy parts always; cause 6's rules parts (polls product off, category not listed) and cause 7 only when the bot's rules parse — unparseable rules, `targeting.enabled=false` and a non-ACTIVE bot leave the target ACTIVE and inert (04:4005), so they never end it as OUT_OF_SCOPE or CUTOFF_PASSED. `lastReactableStakeAt = null` (no stake at or after `effectiveFrom` can be reacted to) → CUTOFF_PASSED at once: a trigger before `effectiveFrom` is not eligible, so nothing can arm it. The pass reads `now()` once (the DB clock) and `listActive()` (bounded by `gTargetsMaxActive` ≤ 200).
76. **`TARGET_ENDED` payload is `{targetId, endCause, previousEndCause?}`** everywhere (N2 §2's event table, 04:3889, is the specific text). `designation.ts voidHouseConsent` writes `{targetId, cause}` today — fixed in this commit to `endCause`; the designation cases pin the target rows, not the payload key, and are re-run.
77. **Cadence lives on the engine state, correctness in AlertOnce.** `EngineState` gains `planner: {oversightAtMs, hourlyKey}` (globalThis, F7). Oversight runs when `oversightAtMs` is null or ≥ 60 s old by the DB clock; the hourly duties run when the EAT hour key of the DB clock differs from `hourlyKey`. A marker advances only when its duty finished. A leader failover repeats a duty early; every effect is an AlertOnce claim or a conditional write, so a repeat sends nothing twice.
78. **The staff-edge pass lands in Commit 5, with R1's scorecard.** N1 §4.5 requires its counts to come "from `book.ts`, the same function as R1's scorecard" (04:2940), and the per-officer settled book is Commit 5's (PROGRESS scope). Building a second reader now would be the two-function drift the sentence forbids; the one-function rule wins over placement (ruling 22's precedent). Commit 4 records staff edge NOT BUILT, and PROGRESS moves it to Commit 5's list.
79. **Oversight readers and the void time.** Two new reads: `houseBotIntentStore.staffChosenPlacedSince({sinceIso, limit})` (PLACED staff-chosen rows by `finishedAt`, through `hbi_staff_finished_idx`, returning `{id, marketId, houseBotId, side, stakeTzs, finishedAt, requestedById, targetId}`, both twins) and `audit.ts getAuditForTargetsDurable({targetType, targetIds, actions, sinceIso, limit})` (with its memory twin; `market.resolve.bulk` rows are read by action and filtered on their payload's market list). **"voided at {HH:MM}"**: a reopen uses `reopenedAt`; a VOIDED market uses the `createdAt` of the newest void-shaped audit row naming it in the lookback (`market.emergency_void`, `market.adjudicated`, `objection.upheld`, `market.resolve.bulk*`); when none is found the alert omits the time rather than print a detection time as the void time (no fabrication).
80. **Hourly summary keys name the hour summarised.** `EAT_KEY_UNITS` gains `previousHour` (SQL `(now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 hour'` formatted as the hour key, and its JS twin), as `previousMonth` names the month judged. The planner reads PLACED intents per bot for `[H:00, H+1:00)` EAT of the hour just ended (a new `houseBotIntentStore.placedInWindow({fromIso, toIso})` → per bot `{count, stakeTzs, staffChosenCount, staffChosenTzs}`, both twins) and runs the summaries only while the DB clock's EAT minute is 1–58, so the window computed in JS and the key computed in SQL can never name different hours. An hour whose whole following hour had no planner pass is not summarised (recorded as a known gap, not repaired).
81. **Summary links follow C7** (04:1924-1928, later and more specific than P:382): the admins' summary → `/admin/house-bots?tab=activity&range=custom&from=<H:00>&to=<H+1:00>`; the holder's → `/positions` (C13). Step 9's emitters render them; the planner passes the window.
82. **Loss-stop records.** A bot stop: `stopBot(botId, {to:"AUTO_PAUSED", cause:"DAILY_LOSS_STOP"})` with the audit action `house_bot.loss_stop` (A19 names it; `stopBot` takes the action), event AUTO_PAUSED `{cause, cancelled}`, alert `botStopped`. The global stop: conditional `switchOff({cause:"GLOBAL_LOSS_STOP"})` → `cancelLive({all:true},"MASTER_OFF")` → SWITCH_OFF event `{cause, cancelled}` → audit `house_bot.loss_stop` on `HouseBotControl` → `alerts.switchedOff` (ruling 111) — never `alerts.security`, which is for defects. Realised loss is `houseDayBooks(eatDayKey(dbNow))` (one GROUP BY, A24) and `houseDayBook(day, null)`; a bot stops when `capDailyLossTzs != null && realisedLossTzs ≥ capDailyLossTzs` (the Start predicate, `eligibility.ts`); a NULL cap never stops (a bot with it unset cannot Start).
83. **A bot's loss stop runs while the master is OFF; the global stop is a no-op then.** Realised loss is a fact about money already lost, and Start already refuses on it; pausing while OFF keeps the status truthful for the next switch-on. `switchOff` is conditional on ON, so the global stop writes nothing while OFF.
84. **F5 `revalidateLive` runs every pass, for ACTIVE bots only.** Live bounds = `getGlobalConfig()` min and max stake and `RATE_RULES["bet.place"].refillPerMin`; `boundsHash` = the first 16 hex characters of sha256 over those three, stored on the `global` runtime row as the last hash seen (a record, never a gate). Can no longer place any bet → AUTO_PAUSED(RULES_INVALID, field) through `stopBot` (its `botStopped` alert is the "1 alert", and a paused bot is not re-checked): stakeMin < live min (A7) or > live max; stakeMax < live min; an enabled opener mode whose opener range lies wholly outside the live bounds; `gCapPerMarketTzs` < live min (every ACTIVE bot, field `gCapPerMarketTzs`); `freqMinGapSec` below `minGapFloorSec`. Narrowing only (stakeMax > live max) → AlertOnce `bounds-clamp:<botId>:<hash>`. N1 §5: an Enter now stake or `capStaffChosenDailyTzs` below the live minimum → AlertOnce `bounds-cant-fit:<botId>:<field>:<hash>`, no pause. Per-market and per-chain overrides only narrow; `stakeBoundsForMarket` applies them at decide and fire, so they are not in the hash. PAUSED and AUTO_PAUSED bots get nothing: Start re-checks every live bound (`rulesStartProblems`).
85. **The C8 break-end bell and the C9 erasure sweep belong to the L2 holder sweep (step 7), not `planner.ts`** (ruling 18; R6: holder detection must run whatever `HOUSE_BOT_ENGINE` says, and the planner does not). The DSAR queue is a process array hydrated by a fire-and-forget read at module load (`privacy.ts`), so a container can read it empty after boot: step 7 reads the durable copy (`loadConfig(DSAR_QUEUE_KEY)`, exported for it) awaited, never the array.
86. **The P3 purge loops.** `runRetentionPass` calls `purgeBatch` until a batch returns fewer than `HOUSEBOT_ALERT_ONCE_PURGE_BATCH` rows, at most 20 batches (100,000 rows) per run, summing `houseBotAlertOncePurged` (A20 "in batches of 5,000"; the DAL doc already says the caller loops). A 21st batch waits for the next night.
87. **`pruneInstanceRows()` runs in the planner's hourly duties.** The rows are the engine's own (`engine:*`, `beat:poller:*`), and `lifecycle.ts` stays free of engine code (§7.6).
88. **The A16 PENDING lifecycle sweep** (N1 has no slot; ruling 71 puts it at 7a): PENDING rows only — a CLAIMED row meets fire's own checks. New twins `houseBotIntentStore.listPendingMarketIds(limit ≤ 500)` and `skipPendingOnMarket(marketId, code, {kinds?})` (conditional on `status='PENDING'`, RETURNING ids). Per market, read `marketView` one at a time: missing → SKIPPED(MARKET_GONE); not LIVE → SKIPPED(MARKET_NOT_LIVE); Up & Down chain not running or asset disabled → SKIPPED(CHAIN_NOT_RUNNING); `reopenedAt` set → SKIPPED(MARKET_REOPENED) for FILL, OPENER and untargeted COUNTER (A16 "never re-planned"; fire's automated-kind rule) — staff-chosen rows are left for fire's blackout. No event, audit or alert (A16 table: "none").
89. **`chain-in-scope` is superseded by C14** (explicit chain lists; a new chain is out of every bot's scope and gets commit 7's roster Callout), so no planner alert. **`exit-config` is a planner duty** in the once-a-minute slot: `exitConfigHash` over the live exit settings on the `global` runtime row; on a change, when any ACTIVE bot with counter mode on has `effectiveTiming(...).counter` = `never` for an enabled product, ONE AlertOnce `exit-config:<hash>`. The hash is written after the check, so a failed check re-runs next minute.
90. **Once-only scope alerts come from where the market is first seen.** `ud-orphan-market:<marketId>` from the trigger and fire when a decision returns UD_NO_ROUND; `product-denied:<value>` (per EAT day) from the trigger for a raw product line no policy admits (never for a demo market); `ud-born-unlocked:<roundId>` from the trigger when an Up & Down market's cutoff is at or before its `createdAt` (A12's evidence: a round created after its own lock time takes bets it should not). The planner's scan filters all three in SQL (ruling 91) and raises none.
91. **The FILL/OPENER market scan** (no document defines it): `houseSeamStore.plannableMarkets({kind, productLine, fromIso, toIso, after, limit ≤ 200})` → `{id, cutoff}[]`, both twins, a plain SELECT (no `StoredMarket`, A13): LIVE · raw product line = the given one · `reopenedAt IS NULL` · not a demo market · polls: `selectionClosedAt IS NOT NULL`, cutoff = it · Up & Down: round joined, chain RUNNING, asset enabled, cutoff = `least(opensAt + D·60 s, coalesce(selectionClosedAt, resolutionAt))` · cutoff in `(fromIso, toIso]` · OPENER: `yesPool = 0 AND noPool = 0` · `NOT EXISTS` an intent of that kind with `anchorKey = market id` that is not CANCELLED, or is CANCELLED with `CANCELLED_BY_ADMIN` (02 X11: an officer's cancel is final) · ordered and keyset-paged on `(cutoff, id)`. **Windows** (DB clock `passNow`): FILL `(passNow + 10 s, passNow + max over ACTIVE FILL bots of (lead + jitterMax) + PLANNER_INTERVAL_MS]` — FILL is planned only near its due time (P23), because an early decision sizes against pools that are not final and a SKIPPED FILL is never re-planned; OPENER `(passNow + 10 s, ∞)`. At most 5 pages per kind per pass; the keyset cursor per kind lives on `engineState().planner` and wraps at the end, so markets past the page bound are reached in later passes (a failover restarts from the start, harmlessly). EXPLAIN pin at 20,000 markets lands with A24's pins (ruling 25).
92. **A NULL `scopeFrom` is out of scope** (the DAL and migration comments; A11 "nothing in scope until Start / switch-on"). `decide.ts` changes: a NULL `globalScopeFrom` → no row (`{row:null, code:null}`) for COUNTER, FILL and OPENER; a bot whose `scopeFrom` is NULL is out of `inBotScope` and cannot be a target's bot. And the global row gets its writer now: `houseBotControlStore.switchOn` sets `global.scopeFrom = now()` in the same transaction as the control write (both twins; A11 "in the same transaction as those events"), so commit 7's ON action cannot forget it. `startHouseBot` already writes the bot's.
93. **Automated kinds use the one `marketHeld` predicate** (rulings 58–59): any held answer (OWNER_POSITION, OTHER_BOT, OWN_INTENT, PER_MARKET_COUNT) makes `DecideBot.marketHeld` true, because the seam refuses each of them. It is loaded **lazily, per bot, in `orderBots` order**, only for a bot that already passed `botCovers` and the pure early checks, and the loop stops at the first row. Per pass the trigger and planner read control, bots, rules and the parse context once; `marketHeld`, `capPrecheck` and the penalty box are read per decision and never cached across decisions (an insert earlier in the same pass changes them). The hook's 5 s soft cache holds only "switch on and any bot ACTIVE" (P:229).
94. **`capPrecheck`** (no producer today): a pure `server/house-bot/cap-precheck.ts capPrecheck(facts, {stake, staffChosen, counterpartyUserId})` evaluates the seam's money caps at the smallest stake the bot could place, `max(stakeMinTzs, bounds.min)`, in H2 → H3 → H4 declared order and returns the first `CAP_<code>` that refuses: STAKE_MIN/STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE, (staff-chosen rows) STAFF_CHOSEN_PER_DAY and STAFF_CHOSEN_DAILY_STAKE, GLOBAL_PER_MARKET, GLOBAL_DAILY_STAKE, GLOBAL_LOSS_PROJECTED, GLOBAL_EXPOSURE, (a COUNTER) COUNTERPARTY_COUNT and COUNTERPARTY_TZS for the trigger account, (staff-chosen) GLOBAL_STAFF_CHOSEN_PER_DAY and _DAILY_STAKE. A money cap that is not set refuses with its code (ruling 35). Rate caps and TARGET_ONCE are excluded: they defer or decide at fire. Its facts are the same reads `loadEnterNowInput` makes (one at a time). **The targeted stake is clamped** to the staff-chosen TZS left today, bot and global (N2 §4 step 6 04:3986): `DecideTarget` gains `staffChosenRoomTzs`.
95. **The automated OPENER draws without a blackout read, only for a row it will write.** Ruling 41 stands (the blackout gates staff-chosen rows), and a random side carries no verdict information. The planner runs `planOpener` with a recording `randomInt`; only when it returns a row does it call `openerSide(marketId, {houseBotId: <that bot>, actorId: null, drawnFor: "OPENER_PLAN"})`, then re-runs `planOpener` with the stored side and the recorded draws replayed, so the delay and stake are the ones first drawn and no market gets a draw event without a row.
96. **FILL/OPENER bot choice is per market**: `orderBots` over the ACTIVE bots whose rules parse and `botCovers` the mode; the first bot whose plan returns a row inserts; the unique index keeps one FILL and one OPENER per market across bots and replicas.
97. **`insertIgnoringConflict` swallows only the row's own anchor index** (TGT-26(e) 01:3334: an unknown index is rethrown). Postgres: `ON CONFLICT ("anchorKey") WHERE "kind" = 'COUNTER' DO NOTHING` for COUNTER and `ON CONFLICT ("kind","anchorKey") WHERE "kind" IN ('FILL','OPENER') AND "status" <> 'CANCELLED' DO NOTHING` for FILL/OPENER (partial-index inference, so a violation of any other index — the id, the idempotency key — raises, inside a transaction too); MANUAL is refused by the method. Memory: a unique error is swallowed only when `uniqueViolation` names that index. `insertTargetedIfActive` takes the same COUNTER inference.
98. **The planner beats after its money-safety duties.** `beat:planner` is written once per pass, after steps 1–3 (expiry, STALE, POISON) and 7d (loss stops) all succeeded, whatever the later duties do: a failing summary never makes the planner look dead, and a planner that cannot expire rows or stop losses does look stale (C11's "Loss stops, fills and summaries are delayed").
99. **Doc fixes:** `HouseViewRound.chainKey` and the `marketView` interface comment say `<assetId>:<durationMinutes>` (the code; ruling 45's catch), not the asset symbol. Step 9's emitters resolve the asset symbol and round number for copy.
100. **Rules from a newer build are reported while OFF too.** F4's alert says nothing will be placed until that build is back, which is exactly what an owner about to switch on needs. Per bot: `bot:<id>.rulesFutureSince` is set on the first FROM_FUTURE pass and cleared when the rules parse; ≥ 10 min → AlertOnce `rules-future:<botId>:<v>`. Limits: `global.rulesFutureSince` for `limitsSchemaVersion > HOUSE_LIMITS_SCHEMA_VERSION` → `rules-future:global:<v>`; while limits are ahead, the planner plans nothing and fire requeues quietly like RULES_FROM_FUTURE (F4 "Limits ahead of the build means nothing is placed"). OUTDATED and INVALID bots are paused (ACTIVE only) with `stopBot(…, {field})`; the engine never writes rules (F4).
101. **The hook call site is a marked block (option B).** Under `if (result.ok && committed)`, a `// SEAM:trigger` block `if (ctx.kind === "player" && market.productLine === "UPDOWN")` with `"trigger"` added to `SEAM_SITES`. It does not depend on the notification branch, and the seam guard sees it. The env check (`process.env[HOUSE_BOT_ENGINE_ENV] !== "false"`) runs before the dynamic import; the facts passed are only what the call site already holds (`positionId`, `userId`, `marketId`, `side`, `stake`, `placedAt`); nothing is awaited on the bet path.
102. **The hook leaves the admission context as well as the lock context.** `admission.ts` exports `runOutsideAdmission(fn)` (its AsyncLocalStorage `exit`), and the call site nests it with `runOutsideLock`, so `inAdmission()` is false inside the trigger. `trigger.ts` still never imports `fire.ts` or `placeHouseBet` (a source pin in the engine suite).
103. **The sweep runs on its own 5 s timer, only on the planner's leader, without a lease write.** `EngineTicks` gains `sweepTick`; the engine calls it every `SWEEP_INTERVAL_MS = 5_000` when `leadershipSnapshot()["house-bot"]` says this instance holds an unexpired lease (the planner renews it every 15 s). A 15 s cadence would land a targeted reaction due at +7 s up to ~20 s late; a leaderless sweep on every instance multiplies the reads. A brief double sweep at failover is harmless (anchor conflicts, forward-only watermark). The sweep skips its pass while admission has a queue (A24).
104. **The watermark is the last position read.** After a caught-up pass, `advanceSweep(lastPlacedAt, lastId)` of the last row read (the read is bounded by `passNow − SWEEP_MIN_AGE_MS`); a pass that read nothing advances to `(passNow − SWEEP_MIN_AGE_MS, "")`; while OFF or with no ACTIVE bot the pass reads no triggers and advances to `(passNow − SWEEP_MIN_AGE_MS, "")` (A11; ENG-10), writing no intent. Late commits within 90 s are re-read through the lookback; the `NOT EXISTS` anchor filter makes the re-read cheap.
105. **A21 runs whatever the switch says, and writes an alert and an event only.** A holder staking against their own bot's OPEN position matters while OFF too, since the positions are still open. Each sweep pass (and the hook, Up & Down only) checks its positions against the set of non-REMOVED bots' holder ids read once per pass; for a match, the bot's OPEN house positions on that market on the opposite side (`y` = their stake). Alert `holder-against:<botId>:<marketId>` (no day suffix; claim released on a failed send) and event HOLDER_AGAINST_BOT with columns `houseBotId`, `userId`, `marketId` and payload `{side, stakeTzs, botSide, botStakeTzs}` — no position ids (D6). Same side: nothing. The bet is never refused and the bot never paused.
106. **BOTH_SIDES means the house countered this account on this market** (ruling 27, option b): the sweep, for an unmarked position whose user has a PLACED COUNTER with `triggerUserId` = that user on that market (new twin `houseBotIntentStore.placedCounterFor(userId, marketId)`, through `HouseBotIntent_triggerUserId_createdAt_idx`), reads the user's positions there; OPEN positions on both sides → the penalty box with cause BOTH_SIDES and that COUNTER's `intentId`.
107. **PENALTY_BOXED carries `{cause, day, intentId}`** (R5 lists `userId`, which is the event's column), `day` being the EAT day the claim's key was suffixed with. **One admin alert per boxing** (P:231) through `alerts.once(<the penalty key>, {code:"PENALTY_BOXED"})`; a failed send never releases the claim, because that row IS the box.
108. **One due-time formula.** `decide.ts` exports pure `targetDueAt({placedAtMs, exitCloseAtMs, timingFrom, delaySec})` → `{requestedMs, dueMs}`; `decideCounter` and the trigger loader both call it (red N2-E2/E3).
109. **Accepted: the hook is off until the engine has measured skew.** A container whose engine is refused (env, schema, TimeZone) or not yet started decides Up & Down triggers through the leader's sweep only; the hook's suspension rule is unchanged (N2 §4 step 1). HOUSE-BOTS.md records it.
110. **The hook's semaphore and overflow count live on the engine state.** `EngineState.hook = {inFlight, dropped, cache: {atMs, live}}` on globalThis (F7); `houseBotEngineHealth` reports `hookDropped` (a count, no ids), which `/api/health` already includes through `engine`.
111. **The engine gets a switch-off channel and one switch-off helper.** `EngineAlerts.switchedOff({cause, cancelled})` (required, ruling 46), and `engineSwitchOff` takes every engine cause: ENGINE_FAULT and ENGINE_ERRORS keep `alerts.security` and their audits; GLOBAL_LOSS_STOP uses `house_bot.loss_stop` and `alerts.switchedOff`. The A19 order is unchanged (autocommit OFF, cancel, event, awaited audit, alert).
112. **WALLET_MISSING** (A16 table, HB-LC-10): per bot with OPEN house exposure (`houseBookStore.openExposure(null)`), REMOVED bots included, a missing holder wallet → an ACTIVE bot is AUTO_PAUSED(WALLET_MISSING) through `stopBot`, and a danger AlertOnce `settle-blocked:<botId>:<EAT day>` repeats daily while the exposure stays open. The alert carries counts only; step 9's emitter lists the markets.

*Ruling taken building `planner.ts` (2026-09-15, fifth session):*

113. **The `exit-config` alert (ruling 89) is not built in step 5.** Its check needs `effectiveTiming(rules, RulesContext)` over the live exit settings of polls and every chain, and no server builder of `RulesContext.exitRates` exists yet — commit 7's Start action needs the same builder. A planner-only reader would be a second reader of one fact. It lands with that builder. Until then a widened exit window is still visible per trigger: the decision writes SKIPPED(EXIT_WINDOW_TOO_LATE) (A16 table, "Exit rules widened"). PROGRESS carries it as ⬜.

*Rulings taken building `trigger.ts` (2026-09-15, sixth session):*

114. **A stake that is no longer OPEN is not countered** (no row). The sweep reads positions older than 5 s; a stake cashed out or settled by then would get a COUNTER that fire refuses with `house_trigger_gone`, which penalty-boxes the player (R5 CASHED_OUT_COUNTERED) for an exit that happened before the house decided anything. `triggerPage` returns the position's status; the trigger checks it after A21.
115. **The sweep reads pages whenever a non-REMOVED bot exists**, OFF included, and decides nothing while OFF (ruling 105's "A21 whatever the switch says" over ruling 104's "while OFF the pass reads no triggers"). With no bot at all there is no holder to watch and nothing to decide: the pass advances to `(passNow − 5 s, "")` with no read. The watermark rule is unchanged: the last position read, or `passNow − 5 s` when nothing was read; a failed decision holds it at the row before.
116. **The hook's soft cache is `{atMs, live, holderIds}`.** PLAN §4.3 caches "switch on and any bot ACTIVE"; A21 also needs the holders. A stake by an account that holds no bot, while nothing is live, returns with no read. Every decision still reads fresh (`loadPassFacts`), so a stale cache costs at most one decision the sweep makes instead.
117. **The penalty box is the claim; its event and alert follow it best effort.** `boxAccount` claims `penalty:<userId>:<EAT day>` (the box both `lockedPool` and the trigger filter read), then writes PENALTY_BOXED `{cause, day, intentId}` and sends ONE alert with the player's handle only. A failure of either is logged and never releases the claim or fails the caller: un-boxing an account because an alert channel was down would reopen what R5 closed. `outcomes.ts` (CASHED_OUT_COUNTERED) and the trigger (BOTH_SIDES) share it.
118. **A targeted decision without a staff-chosen room figure places nothing.** `CounterInput.target.staffChosenRoomTzs` is required; a missing figure makes the clamp `NaN` and the candidate SKIPPED(STAKE_BELOW_MIN), never an unclamped stake.
119. **The trigger loads the holding and cap facts only for a row that is not SKIPPED** (ruling 93). A SKIPPED row's code can therefore name an earlier pure check (for example NOT_REACTING, drawn before the holding read) where the bot would also have met MARKET_HELD; the row still says truthfully that the stake was not countered, and a burst of player stakes costs no holding or cap reads for bots that would not react.
120. **A row decided not to react records the smallest stake the bot could have placed there**, `max(1, stakeMinTzs, live minimum)`, and a reacting row its decided stake. Found by §18 on both stores: `decideCounter` wrote SKIPPED rows with `stakeTzs = 0`, which `HouseBotIntent_stakeTzs_check` (1 … 1,000,000,000, both twins) refuses, so every negative decision threw and held the sweep's watermark. No document says what a SKIPPED row's stake is; every money reader (`staffChosenPlaced*`, `counterpartyToday`, `placedInWindow`, the books) counts PLACED rows only, so the figure is display-only, and the smallest possible stake is the same figure `capPrecheck` tests. The schema is unchanged.

*Rulings for `holder-hook.ts`, the L2 holder sweep and their wiring (§5 step 7), taken before building them (2026-09-15, sixth session). Sources: A2 04:79-119, A3 04:121-156, A5 04:203-213, C8 04:818-840, C13 04:1044-1078, R6 04:1245-1262, F8 04:1750-1761, PLAN §14 P:566-601, 02 §2.2–2.3 02:87-117; earlier rulings 1, 2, 16, 18, 28, 52, 85. Code facts re-derived this session (anchors in `C4-HOOK-ANCHORS.md`): `PauseDetail` already carries `causes`, `method`, `changedAt`, `detectedBy`, `officerReset`; `houseBotStore.setStatus` accepts a same-status write that replaces `pauseDetail`; `setCredentialChanged` and `setConsentVoid` exist; the lifecycle ticker runs every `TICK_MS` = 60 s.*

121. **The event is a hint; the causes are read.** `onHolderAccountChanged(userId, event)` — the event is one of PASSWORD_SELF_CHANGE · PASSWORD_RESET_LINK · PASSWORD_OFFICER_TEMP · ACCOUNT_CLOSED · SELF_EXCLUDED · COOLING_OFF · LOSS_LIMIT_SET · SUSPENDED · RESTORED · WALLET_FREEZE · IDENTITY_REFUSED · IDENTITY_REOPENED · ROLE_CHANGED · ERASURE_REQUEST · LOCKED_OUT · EMAIL_CHANGED · TWO_FA_ON · TWO_FA_OFF. It does one indexed read (`findLiveByUserId`) and returns when there is no live bot; otherwise it recomputes `holderCauses` from a fresh `readBotAndHolder` (with the bot's stake minimum, for OWNER_LOSS_LIMIT) and applies them. The event decides only what has no cause of its own (ruling 126) and supplies `detectedBy: "HOOK"`; a wrong or stale event can never apply a wrong cause.
122. **One apply for the hook and the L2 sweep.** `applyHolderCauses(bot, read, {detectedBy, alerts})` is the only writer: the hook calls it for one bot, the sweep for every non-REMOVED bot. Every write is conditional (`setStatus` from the status read, `setConsentVoid`, AlertOnce claims), so a hook and a sweep racing each other change nothing twice.
123. **The status rules, by cause** (A2 status rules, A5, C8, ruling 52): ACCOUNT_CLOSED → REMOVED(ACCOUNT_CLOSED) through `stopBot` from any non-REMOVED status; SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST → `voidHouseConsent` in any non-REMOVED status (an ACTIVE bot pauses and its targets end; a paused bot keeps its status); any other cause on an ACTIVE bot → AUTO_PAUSED with the FIRST cause (`HOLDER_CAUSES` order) as `pauseReason` and `pauseDetail {causes, detectedBy}`, through `stopBot` (A19 order); a paused bot keeps its status and reason; REMOVED → nothing. A bot never resumes by itself: every way out ends in Start.
124. **A paused bot's cause set lives in `pauseDetail.causes`.** Under `wallet:<userId>` the apply compares the fresh cause codes with `pauseDetail.causes`: a code not recorded → ONE HOLDER_CAUSE_ADDED event `{cause}` and ONE admin bell (bell + email for rows 5, 11 and 14); a recorded code that is no longer live → ONE "cause cleared" bell (C13, ruling 16 — never for a break's end, which is C8's own bell); then `pauseDetail.causes` is rewritten to the fresh set with the same status and reason. The rewrite is the dedupe: the second of two racing applies finds the set already current and sends nothing. No column is added.
125. **PASSWORD_CHANGED follows PLAN §14's effect table.** ACTIVE → AUTO_PAUSED(PASSWORD_CHANGED) with `pauseDetail {method, changedAt, detectedBy, officerReset}` through `stopBot`, the holder's `password_paused` notice (H1) and admin A1. PAUSED or AUTO_PAUSED for any reason → `setCredentialChanged(via)`, a CREDENTIAL_CHANGED event, the SECURITY audit `house_bot.credential_changed` by `system_house_bot` (ruling 28) and admin A2 (the officer-reset wording for OFFICER_TEMP). Both alerts claim `pw:<botId>:<fingerprintNow>`: a second change is a new fingerprint and alerts again (X4), while the same change seen by the hook and the sweep alerts once.
126. **Rows 16–18 carry no cause and no pause.** A lockout (row 16) → AlertOnce `holder-locked:<botId>:<EAT day>` SECURITY bell (anyone could lock the holder out, so it never stops the bot). An email change (row 17) → a HOLDER_EMAIL_CHANGED event every time, and a bell only when an officer set it (`emailSetByOfficerAt`). 2FA on or off (row 18) → a HOLDER_2FA_ON/OFF event and no alert (D5). The event decides these; the L2 sweep does not repeat them (none leaves a durable signal to compare against).
127. **The holder hook runs whatever `HOUSE_BOT_ENGINE` says** (R6, ruling 18): after the outermost lock, as `void import("./house-bot/holder-hook").then(...).catch(() => {})`, through `runOutsideLock` wherever a caller might hold one (the freeze wrappers inside `kyc:`, reviewKyc inside `agent:`). A user with no live bot costs one indexed read and no write. Functions that `return withLock(...)` capture the result first (`C4-HOOK-ANCHORS.md` "restructure").
128. **The call sites land with the emitters, never before** (as ruling 46 for the engine). A hook that runs in every environment and pauses a bot with no alert channel would stop liquidity silently. Step 7 builds `holder-hook.ts` and the L2 sweep with an injected `HolderAlerts` and their cases on both stores; step 9 adds the emitters and, in the same step, wires the A2 call sites, the lifecycle chore and `test:house-bot-holder-lifecycle` (A2's shrink-only walker plus F8's `scripts/**` and SQL-literal scan).
129. **The L2 holder sweep is the lifecycle ticker's last chore** (ruling 18, §7.6): one line, `await maybeRunHolderSweep().catch(...)`, after `maybeWatchKycReviewSla`, on the lifecycle leader, every 60 s. Detection latency: under a second through the hook for every in-app change; under a minute through the sweep for a change the hook missed (raw SQL, a script, a lost import, `effectivize`'s delayed raises); and at the next bet in any case, where H2 refuses on stale consent inside the lock (PLAN §14 L3). The sweep covers every A2 cause row, C8's break-end bell (AlertOnce `bot:<id>:RG_ENDED:<coolingOffUntil>` once a COOLING_OFF void stands and the break has ended) and C9's erasure requests.
130. **Every holder snapshot reads the erasure queue from its durable copy** (ruling 85). `privacy.ts` exports `openErasureRequest(userId)`: the stored queue through `loadConfigResult`, awaited, then this process's own array (a request filed here whose write-through has not landed), answering with the first open ERASURE request in either — failing closed. `control.ts readBotAndHolder` and `eligibility.ts` use it instead of the process array, so the hook, the sweep, Start and fire all see a request filed on another container or before a restart. A failed read throws: fire requeues, the sweep retries next tick, and eligibility shows the new blocking row ERASURE_UNREADABLE ("Couldn't read the data-rights queue. Refresh to try again.").
131. **The A19 order for holder changes.** Status, `pauseDetail`, the credential stamp, the void and the HOLDER_CAUSE_ADDED / CREDENTIAL_CHANGED events are written under `wallet:<userId>`; the audit and every bell and email go after the lock is released. Bells claim AlertOnce first (`bot:<id>:CAUSE:<code>:<eventId>` for an added cause, `ALERT_KEY.cleared(botId, cause, clearedAtIso)` for a cleared one); a failed send gives the claim back and is logged, and the event stands.
132. **Three holder notices are missing and land with step 9's emitters:** `password_temp` (row 3, "Change the temporary password in Account settings"), `role_changed` (rows 12–13, "role changed" notice) and `erasure_request` (row 14, "stopped while we handle your request"). Each gets its `HouseBotOwnerNotice` kind, copy in three languages marked for native review, a cert-c1/c3 registry row and a rendered bell.

133. **A password change is identified by the pause's own detail, never by who claimed the alert key first** (found by §19, seventh session). `pw:<botId>:<fingerprint>` is claimed AFTER the status write (inside `stopBot`'s channel), so a second look — the sweep, or another hook — that read the bot between the pause and the claim saw `AUTO_PAUSED(PASSWORD_CHANGED)` and took the "changed while stopped" path: it recorded the SAME change again (`setCredentialChanged`, a second CREDENTIAL_CHANGED event and its audit) and won the claim, so A1 was never sent. Claiming before the pause instead would trade this for a worse failure: a process that dies holding the claim would leave an ACTIVE bot nobody pauses. The rule: the credential branch runs only when the bot was NOT paused by this very change — `pauseReason === "PASSWORD_CHANGED"` with `pauseDetail.method` and `pauseDetail.changedAt` equal to the cause's — which the pause writes atomically with the status. ⚠️ Known edge: two changes that both leave `passwordSetAt` NULL (a raw-SQL writer, method UNKNOWN) are indistinguishable, so the second is not re-recorded; L3 still refuses every bet on stale consent, and re-verify is still required.
134. **A bot already paused FOR a password change alerts A1 again on the next change** (02 §2.2 row 93, "A1 again (new key per X4)"), not A2. Ruling 125's blanket "A2 for any stopped bot" was too wide: 02's table gives A1 to the ACTIVE row and to this repeat row, and A2 only to PAUSED(NEW|MANUAL) and to AUTO_PAUSED(any other reason). The channel carries `cancelled: 0` for the repeat, because nothing was queued to stop; step 9's copy needs that A1 variant ("The bot was already paused …"), which the emitter chooses from `cancelled` and the bot's status.
135. **A change that lands while another cause stops the same ACTIVE bot is still recorded.** A holder who self-excludes and changes his password between two looks would otherwise have the password change recorded by neither: the ACTIVE branch pauses for the void and the credential branch's old condition required a bot that was already stopped. It now also runs for a bot this apply stopped for another cause, with A2 (02 row 94: "AUTO_PAUSED (any other reason) → A2").
136. **X7 · BOTH_SIDES is checked again at fire** (Ali, 2026-09-15, Phase 0: "yes — build it"). The sweep boxes an account only when the house's counter was already PLACED as it read the player's second stake; a player who takes the other side while a poll counter still waits (up to 5 minutes) is not boxed, and the counter fires into a player holding both sides. Fire already re-reads the trigger position, so it also asks for the opposite side on that market: on a hit the intent finishes SKIPPED(BOTH_SIDES) and `boxAccount` records the penalty box with cause BOTH_SIDES, exactly as the sweep does (ruling 117 — the claim is the box; its event and alert are best effort). It never refuses the player's own stake.
137. **L10 · the AML rejection refund becomes one transaction** (Ali, 2026-09-15, Phase 0: "fix it on `house-bots`"). `rejectAmlAction` refunds a rejected withdrawal with a wallet adjust and a FAILED transaction write that pass no transaction, the second outside the inner wallet lock, so a crash between them leaves money and the withdrawal's record disagreeing — the very split `settleWithdrawalFailed` exists to avoid. It lands in step 10 with the F7 money hooks (the same file), with a case on both stores and a mutation. It is platform money code, not house-bot code: it reaches production only through the REL-4 merge.

138. **A failed A1 is paid by the next look, never turned into an A2** (found by §19's mutation round, seventh session). `claimThen` gives the claim back when a send fails, so `pw:<botId>:<fingerprint>` was free again — but every later look sees a bot paused BY that change (ruling 133) and skips the credential branch, so the only alert that says "a running bot stopped" was lost with nothing but a log line. The apply now retries it: when the bot was paused by this very change and the claim is free, it sends A1 alone with `cancelled: 0` and writes no record (the pause is the record). Delivery is therefore at least once for A1 and exactly once for the record. ⚠️ The same mutation round showed `bellSent` is not redundant with the claim: without it, a failed A1 releases the claim and the credential branch then writes a SECOND record for the same change (§19.C9).

139. **The kill switch is a service, and its drain only informs** (04 A9 F9, step 8). `switchOffHouseBots` in `src/lib/server/house-bot/kill-switch.ts` runs A9's four steps in order: the OFF write first, autocommit and with no lock (H4's in-lock re-read makes a committed OFF binding for every bet not already holding `house:control`); then `drainLock("house:control", {timeout: OFF_DRAIN_LOCK_TIMEOUT})`, a separate transaction that sets `SET LOCAL lock_timeout` and takes the lock only to let it go; then the conditional cancel of live intents; then the SWITCH_OFF event, the awaited audit and the alert, every one outside every lock. A9's test says "OFF returns in under 1.5 s" while step 2 waits up to 3 s: what A9 protects is that the switch is BINDING at once, not that the operator's sentence arrives first, so §7.3 measures the control row going false (well under 1.5 s) while the drain is still waiting, and §7.4 measures the bounded answer. `drainLock` refuses to run inside a lock — a drain that joined its caller's transaction would answer "drained" about itself — and it has a memory twin that races the mutex chain, so both stores answer the same. `engineSwitchOff` stays as it is (ruling 111): it runs inside a worker, must not wait on a drain, and speaks on a different channel; both writers go through the same conditional UPDATE, so the second one changes nothing and says `ALREADY_OFF`.
140. **An alert channel carries what its copy needs, never a proxy for it** (emitter extraction E9 and E3). Two members were short of their sealed copy: A1's body says "The bot stopped and cancelled {n} queued stake(s)" (02:106), which is false on ruling 134's "A1 again" path, where the bot was already paused — and `cancelled === 0` cannot tell the two apart, because a stop with nothing queued is also 0. `passwordPaused` therefore takes an explicit `again: boolean`: false when this change stopped a running bot (and `cancelled` is its own count), true for the repeat. The A1 the retry of ruling 138 pays is `again: false` with `cancelled: 0` — the count is gone with the failed send, and 0 reads truthfully as "nothing is queued now". Row 16's bell needs when the lockout ends (C13 04:1050), so `holderLockedOut` takes `until`, read from the holder snapshot, which now carries `lockedUntil` (never a cause: anyone can lock the holder out).

Ali answered every open question in Phase 0 (2026-09-15, seventh session): W17 stays out of the money group; W4 is 7 years; W2 and W5-W16 stand as written; X7 is built (ruling 136) while X3 and X8 are not; L10 is fixed here (ruling 137). No decision in this file waits on Ali.

## 7. Guards that will go red, and how to move each honestly

Code anchors are as of `624f6038`. Run each named suite right after touching its file.

1. **`test:house-bot-seam` §4.** Any new house branch in `market-service.ts` (`ctx.kind`, `houseBotId`, `"house"` in a condition) needs a `// SEAM:<name>` marker within 3 code lines, and the name must be added to `SEAM_SITES` in `scripts/anchors/house-bot-seam.anchors.mjs`. Only `houseStake: …` and `houseBotId: x ?? null` count as data.
   - §4.3 lets only `house-bot/fire.ts` import `placeHouseBet`. It checks tracked files only, so `git add` `fire.ts` before running.
2. **`red-anchors` §3.** Every anchor must resolve exactly once. These quote the bet post-commit block:
   - `kyc-gate.anchors.mjs:140-141`, a 4-line block at ms:1698-1701 (`readIdentityStanding` + `market.position.opened` audit);
   - `:126-129`, the audit payload;
   - `house-bot-seam.anchors.mjs:47-74`, `if (await isMaintenanceMode()) {` at ms:1047;
   - `house-bot-money.anchors.mjs:165` `replayed: true as const,` (short, easy to duplicate);
   - `layout-staleness.anchors.mjs:91-93`.
   - Place the Up & Down hook so no quoted block is split, or re-anchor it to the same defect.
   - `UNDECLARED_CEILING = 65` is exact: `red:house-bot-engine` must declare an anchors file in its command.
3. **`test:wallet-status-writers`** `SITE_COUNT = 36` is exact. An engine wallet write moves it, after reading the printed population. Status writes only through `wallet-freeze` / `closeAccount`.
4. **`test:cert-c3` / `test:cert-c1`.** Every new `notify*` export needs a registry row and an EMITTED or FANOUT drive. Every new `*Html` needs a registry row, a render, a trigger reference inside a send, and the 66 pin moved after measuring. `test:kyc-copy-truth` §6 requires every `notifyAdmins*` emitter to show `listByRoles(`, `adminUserId`, or the proven `houseBotAlertRecipients(`. `test:position-permalink` 4.4 bans `ctaButton("/positions")`.
5. **`test:house-bot-rules`.**
   - 11.8: every quoted `house_bot.*` string in `src/` (comments included) must be a `HOUSE_AUDIT` key.
   - 11.22: `EVENT_KINDS` must be exactly 30. The event list cannot grow without a migration, so do not add an event kind.
   - §0 module law: files in `src/lib/house-bot/` may value-import only `@/lib/eat-day`, `@/lib/updown-durations`, `@/lib/markets/categories`, `@/lib/wallet-freeze-reasons`, `./clock`, `./constants` and `./pause-reasons` — so a pure helper that needs `./rules` goes under `src/lib/server/house-bot/`, or the allowlist grows with a stated reason.
6. **`test:multi-container`** reads 8,000 characters from `runLifecyclePass` and needs `acquireLeadership(LIFECYCLE_TASK)` before `maybeReconcileSchedules()`. `test:updown-heal`, `test:aipoll-reap` and `test:payout-observability` pin lifecycle strings and order. Keep engine code out of `lifecycle.ts` except a one-line call; the L2 holder sweep call goes after the existing chores.
7. **`test:lock-tx-threading`** pins literal windows in `wallet-service.ts` `withdraw` (the hold lock), `settleWithdrawalFailed`, `creditInternal` and `settleWithdrawalConfirmed`. Money hooks go after those windows, outside the locks.
8. **`test:product-line`:** every `listMarkets` call in the health route passes `productLine: "ALL"`. `test:admin-2fa-honesty`, `test:alerting` and `test:payout-observability` pin health-route strings.
9. **`test:failure-reasons`** 8c `checkLossLimit` has one player-refusing caller, plus named read-only callers (commit 3); §8c per-file reason literals. **`test:layout-staleness`** 5.7: a function in ms that moves a balance must call `emitWalletBalances(`.
10. **`test:control-gates` / `test:orphan-actions`** apply to any new exported `*Action` under `src/app/admin/**`. Commit 4 adds none; the actions are commit 7.
11. **`test:decomment`** `CARRIER_CEILING = 20` is exact: new suites import `scripts/lib/decomment.mts` and never write their own stripper regex.
12. **`test:guards-exist`:** never cite `test:house-bot-engine` (or any suite) in code before its `package.json` key exists. `updown-digest.ts:209`'s `ops:updown-digest-preview` citation is on the inherited phantom list: keep that comment when editing the digest.
13. **`test:pii-in-logs`** (predeploy): no `console.*` template with an unmasked email or phone. **`test:read-tiers`** 7.1: no raw email or phone rendering in admin tsx (commit 7).
14. **`test:house-bot-designation` §10:** password-hash writers are exactly auth-service (1) and password-reset (3), plus the dev seed. The holder hook must not add a hash write.
