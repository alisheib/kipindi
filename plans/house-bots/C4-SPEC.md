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

*Rulings taken while building (2026-09-16, §5 steps 1–2; the code carries the rule, these record why):*

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

No decision here needs Ali; W17 remains the only open owner question.

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
