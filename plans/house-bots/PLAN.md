# House Bots — build plan (50pick, `/admin/house-bots`)

> # ⛔ THE HOUSE REPORTING SPLITS, THE ADMIN HOUSE LINES AND THE HOUSE REPORT ARE SUPERSEDED (D20)
> **Owner ruling D20 (Ali, 2026-09-17): a house bot's account is a normal player in every report.** Every report,
> statutory filing (Gaming Board monthly pack, FIU SAR, match integrity, daily ops), admin count, finance or insights
> figure and harm/AML detector treats a house bot's account exactly like any player's account, and no report, CSV, memo,
> column, line, chip, tag, alert or record names house bots or splits house money out. Struck in this file: D6's admin
> analytics clause, I8's report filter, I10's resolver display, §1-F11, §8's player profile chip, §9's splits, §11's
> Commit 5 reporting and resolver display, §12's report splits, §16 D14 (the house-liquidity report and CSV), the
> display, R9 and R1 mitigations in §16b risks 13, 15 and 20 (with the staff-edge scorecard and its alert), and in §18
> the R9 row and the R1/R2/R3/R5/R9 index lines (C5-SPEC rulings 187–213, with 211 and 212 kept only as recorded platform
> defects L26/L27; 218–231; 233–234; 236–238; 240–242; 246; 254's overview split; 256; 261–262). **Not struck here, left
> to Commit 7's rulings:** §8's strip "today net", the overview's today and lifetime `houseBotBook` and the money tab's
> house-marked row labels; `C5-D20-REPLAN.md` §4 sets those rulings' default to no results/P&L report, CSV or per-market
> house line beyond what a control needs. **Unchanged:** D19 still binds everything (its supersede list names this file's
> §1-F10 and §10); the money rules (I7) and the marker (I8); the engine, consent, designation, caps, the kill switch and
> admin alerts about bot status; R8 for the report pack and RG engagement; R6 erasure; and Commit 7's console for
> CONTROLLING bots. Accepted by Ali: statutory figures include 50pick's own house stakes as player activity, and the harm
> and AML detectors can flag a bot account like any player's. Read PROGRESS.md "OWNER RULING D20" and
> `plans/house-bots/C5-D20-REPLAN.md` first.

> # ⛔ OWNER RULING D19 — HOUSE BOTS ARE NEVER PUBLIC, AND THE HOLDER SEES NOTHING
> **Owner ruling D19 (Ali, 2026-09-16), which outranks this plan: nothing about house bots reaches a player or the holder.**
> The rulebooks, Terms, privacy notice, FAQ, home copy and chatbot keep exactly the words they have on `main`: no carve-out,
> no disclosure line, no META or `TERMS_VERSION` bump and no announcement (D19a). The regulator draft stays private (D19b).
> The holder sees no chip, no explanatory line, no liquidity label on outcome notices and no house wording in any refusal,
> and receives no house-bot notice or email at all; every alert goes to admins only (D19c). The chatbot discloses nothing
> and never lies, kept so by a forbidden-phrase guard (D19d). Struck in this file: D2/D7; the holder notices in the Context,
> F1, F6 and F8; §1-F10; §2's `holderNoticesPerHour`; §3's (d) `HOUSE_POSITION`, (e), (h), (i), H5–H9's holder notices and
> the house refusal copy; §5's holder-notice limit; §7's three holder emitters; §10's public text and its rulebook §8
> supersede row; §11's Commit 3 holder notice, Commit 5 holder chip and SellButton, and Commit 6 public text; §12's comms,
> reports and disclosure rows, the visual holder chip and the production legal-text check; §13's legal-text review; §14's
> holder notice H1; §15 phase E's chip checks, seed route and legal-page widths, and phase F's legal pages; and in §18
> the holder's own Stop action, the privacy line, ruling 33's letter, condition 6's disclosure line, A17's label, P1 and
> P2's Terms §10 notice rows. **Unchanged:** the master switch ships OFF; D3/D3b; D5 (consent
> is the holder typing their password); D6 (publicly a bot is exactly like a player); the admin console and its alerts;
> every audit, internal doc and engine rule. Read PROGRESS.md "OWNER RULING D19".

## Context
50pick is live, but pools are thin. A player often enters a round or poll with nobody on the other side, so
the market is one-sided and simply refunds: nothing to win. Ali wants **house bots**. These are real 50pick
accounts, designated by the owner and funded with real money. A server-side engine stakes from them on
Up & Down rounds and/or YES/NO polls, usually on the opposing or thinner side, so players see real money to
win. Winnings stay in the bot account. The owner gets full control of products, timing, entry style, volume,
frequency, budgets and a kill switch, with notifications for admins ~~and for the account holder~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** notifications go to admins only; the account holder receives no house-bot notice or email (D19c).

How this plan was produced: an 8-agent code map, 3 slice designs, 3 adversarial reviews (50 findings), then
2 plan critics (35 findings). All findings are resolved below. Nothing has been edited yet.
⚠️ This reverses `docs/F6-LIQUIDITY-DESIGN.md` (2026-07-13, "do not build") and parts of
`UPDOWN-FINAL-DESIGN.md` D3/G2. Those safeguards are rebuilt here as engineering.

## Decisions (Ali, 2026-09-13)
| # | Ruling |
|---|---|
| D1 | Build everything. A global **master switch ships OFF** on production, and Ali alone turns it on. |
| D2/D7 | ~~Amend the published Rules and Terms (en/sw/zh): a carve-out from the prohibited-conduct list for accounts 50pick operates, plus one disclosure line. **Effective on deploy, with no 14-day notice** (owner ruling; 50pick reports to GBT).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the published Rules and Terms (en/sw/zh) are not amended: no carve-out, no disclosure line, no META or `TERMS_VERSION` bump and no announcement; they keep exactly the words they have on `main` (D19a). |
| D3 | The bot account belongs to a real person. **They may use it and withdraw normally.** The console reads the **live wallet balance** (no shadow balance). |
| D3b | **No payment feature.** The holder tops up through the normal deposit flow and is reimbursed out of band. While their bot is **ACTIVE**, every deposit or withdrawal on the account alerts admins. While inactive, nothing is watched. |
| D4 | A **roster** of bots, each with its own rules. One master switch plus global limits. |
| D5 | Consent = the owner types the account's **password** (only). |
| D6 | Publicly the bot is **exactly like a player**: counts, avatars and the leaderboard. ~~Admin analytics still separate house from players.~~ Statutory figures include everything. ⛔ **Superseded by D20 (Ali, 2026-09-17):** admin analytics, counts and reports treat a house bot's account exactly like a player's and never separate house from players. |
| D8 | **Live activity feed**, plus per-bet bell alerts **capped per hour** (then an hourly summary). Money events and auto-pauses always go to bell + email. |
| D9 | Everything else was decided by Claude, following platform precedent (cited inline). |

## Invariants — each has a guard that fails when broken
| # | Invariant |
|---|---|
| I1 | Bot bets go only through the bet service. `placeHouseBet` may only **add** refusals and markers, and only `house-bot/fire.ts` may import it (source pin). |
| I2 | The engine reads only what players can see: pools, status, cutoff/open times, the public Up & Down board (`livePrice`, `openPrice`, targets), and the triggering position plus that account's own positions on that market (anti-abuse). It **never** reads Sentinel fields, staged outcomes, objections, observations or oracle modules, drafts or AI data. |
| I3 | Never bot-vs-bot. Never react to house positions, designated accounts, staff or AGENT accounts. One bot per market, one side per market. |
| I4 | Exactly once. A durable intent with a stable key `hb:<intentId>` is written **before** the bet. A duplicate fire is a no-op; a lost timer only delays. |
| I5 | Master switch and bot state are read fresh at fire time and authoritatively inside the bet's locks. A failed read means no bet. |
| I6 | **Every** cap (money and count) is enforced inside the bet's own locks, never only in the engine. |
| I7 | House stakes are cash only. No bonus spend, no wagering accrual, no agent commission, no cash-out, no objection standing. |
| I8 | An immutable `houseBotId` marker sits on the Position and on every Transaction of it. ~~Reports filter on the row marker, never on current status.~~ Levy identity unchanged. The marker never reaches a public payload. ⛔ **Superseded by D20 (Ali, 2026-09-17):** no report filters on the marker, because every report treats a house bot's rows exactly like a player's; the marker itself stands for the money rules and caps. |
| I9 | Owner self-exclusion, cooling-off, suspension, frozen or missing wallet, own loss limit, password change or role change auto-pause that bot and alert admins. |
| I10 | No officer-conflict lock (2026-07-24 ruling). ~~House exposure is only **displayed** to resolvers.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** house exposure is not displayed to resolvers or on any admin screen; a house bot's stake counts exactly like a player's (C5-SPEC rulings 192–194). |

---

## 1. Flows (end to end)

**F1 Designate** (owner, `/admin/house-bots/new`; the step lives in the URL, `?user=<id>&step=check|consent|review`)
1. **Find.** UserPicker search. Ineligible rows are shown greyed with the reason.
2. **Check.** Account card rendered fresh:
   - name, masked phone, role, status;
   - **live wallet balance** (real TZS, with bonus shown separately as "not usable by the bot"), wallet status and open positions;
   - blocking rows (Continue disabled) and warning rows from `houseBotEligibility(userId)`.

   A failed balance read is a blocking row: "Balance unavailable — try again".
3. **Consent.** Label, purpose note, and the holder's password. "N attempts left before his own sign-in locks for 30 min" is read fresh, with separate rate-limited and locked states and a countdown. An empty password is refused before it counts.
4. **Review.** Shows the live balance again (re-read at render). Designate creates the bot as **PAUSED(NEW)** and `router.replace`s to `/admin/house-bots/<id>?tab=rules`. ~~The holder gets a trilingual notice (bell + push + email).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder receives no notice or email (D19c).

**Wizard states and edge cases**
- `step` is honoured only if the earlier steps' data is in memory. Otherwise it replaces to `step=consent` with "Enter the password again — it is never kept".
- The password is cleared on going back to check or find, and on unmount.
- An unknown or malformed `?user=` gives an empty state with "Search again".
- A previously REMOVED account shows "Removed on … by …" and **Designate again** (creates a new row).

**F2 Configure.** The rules tab saves behaviour (JSON) and caps (typed columns) in **one** `rulesVersion`-checked UPDATE
under `wallet:<botUser>`.
- "Use recommended values" fills the form but does not save it.
- An unset cap shows "Not set — this bot cannot bet".
- The save is refused, with `field`, if `stakeMaxTzs > gCapPerMarketTzs` or `capPerMarketTzs > gCapOpenExposureTzs` (where those global caps are set).
- The limits tab does the same for global caps and checks every bot in the other direction.
- **Effective timing preview** (read-only, recomputed on every edit), e.g. *"3-min rounds: 20 s after the stake · 10–60-min rounds and polls: 5:00 after the stake, because the player keeps a free 5-min exit · stakes in the last 0:40 before lock: not countered"*.

**F3 Go live**
- **Master ON:** a Modal form (reason 5–300 characters, then the typed word `BOTS ON`).
  - While any global cap is unset, the ON button is disabled with "Set N global limits first →" (link to `?tab=limits`).
  - As a backstop the action returns `{field, data:{href}}`. The client closes the modal, pushes to the href and focuses the field.
- **Start bot:** a ConfirmDialog showing the rule summary. Refused while any of these hold:
  - `houseBotEligibility(userId,{botId})` blocks;
  - the fingerprint mismatches;
  - a cap is unset;
  - no mode is on;
  - **today's realised loss ≥ `capDailyLossTzs`, whatever the pause reason**.

  Unset caps or modes route to `?tab=rules` the same way.

**F4 Engine: three entry modes, per product, all off by default**
- **COUNTER.** A real player's bet commits, and a post-commit hook (plus a recovery sweep) decides.
  - Timing: `dueAt = max(placedAt + random delay, exitClosesAt)`, where `exitClosesAt` = the trigger's free + paid exit window close.
  - Decidable only if `placedAt < cutoff − noReactZone` and `dueAt ≤ deadlineAt`.
  - Side is the opposite of the trigger. Amount is % of the trigger or fixed, jittered and rounded, then cut so **bot side + stake ≤ the trigger side's non-house pool**.
- **FILL.** At `cutoff − lead − jitter`, if real money sits on one side and the other side is below the target share, the bot stakes the thin side up to that share.
- **OPENER.** At `bettableFrom + delay`, while **both pools are 0**, a small stake on a random side.
- **Up & Down closeness rule, all modes, at decision and at fire:** `|livePrice − openPrice| ≤ closenessPct × (upTarget − openPrice)` (default 25%). A missing price → skip `UD_NO_PRICE`.
  - It is symmetric by design: the bot enters only while the round is still a coin flip. Momentum bettors can't farm it, and the house never cherry-picks the side that is already winning.
  - Targets are open ± margin, and a close strictly between them refunds (`updown-config.ts:1525-1533`, `updown-service.ts:107-121`).

**F5 Fire.** The poller claims the intent, then re-checks fresh:
1. Master switch.
2. Maintenance (`loadConfigResult`).
3. Bot ACTIVE.
4. Holder role, status and fingerprint (via `control.ts`).
5. Schedule window.
6. Market LIVE with at least `minTimeToCutoff` left.
7. COUNTER trigger still OPEN.
8. Up & Down closeness.
9. Stake clamp.

Then `placeHouseBet`; the locks run the authoritative checks (§3). The mapper (§4.6) sets the result.

**F6 Auto-pause and way out.** `startHouseBotAction` + `reverifyHouseBotAction` rules; Remove is always enabled.
| Status (reason) | Way back |
|---|---|
| PAUSED (NEW, MANUAL) | Start |
| AUTO_PAUSED (PASSWORD_CHANGED) | Re-verify (password Modal) → PAUSED(MANUAL) → Start |
| AUTO_PAUSED (SELF_EXCLUDED, COOLING_OFF, ACCOUNT_BLOCKED, WALLET_FROZEN, WALLET_MISSING, ROLE_CHANGED, ACCOUNT_MISSING) | Start is disabled, showing the cause (and its end date where known), until eligibility passes again |
| AUTO_PAUSED (OWNER_LOSS_LIMIT) | Start is disabled until the holder's own loss limit would allow `stakeMinTzs` |
| AUTO_PAUSED (DAILY_LOSS_STOP) | Start is disabled until the next EAT day, or until the cap is raised above today's realised loss |

- **Re-verify** works from AUTO_PAUSED(PASSWORD_CHANGED). From PAUSED(*) it refreshes the fingerprint and keeps the reason. It is disabled for every other AUTO_PAUSED reason and while ACTIVE.
- **Alerts:** admins get bell + email. ~~The holder gets a notice unless the cause is an RG pause.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder gets no notice for any pause; only admins are alerted (D19c).

**F7 Holder money events** (only while ACTIVE)
- **Events:** deposit credited, withdrawal requested, AML hold, paid, failed or AML-rejected, officer adjustment.
- **Admin alert:** bell + email, with the txn id in the body, linking to `/admin/transactions?q=<txnId>`. A HouseBotEvent row is appended.
- **Effect on the bot:** it sees the new balance. "Balance too low" becomes a skip plus one alert a day.

**F8 Pause / Remove.** Both use target-state semantics: never refused as stale, and a repeat is a no-op.
- **Pause:** ConfirmDialog with an optional reason.
- **Remove:** Modal form (reason, then `REMOVE`). It cancels PENDING and CLAIMED intents. Open house positions keep their markers and settle normally. ~~The holder is notified.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder is not notified (D19c).

**F9 Kill switch OFF.** One click, no confirm, no version check.
- The write takes `house:control`, which bets hold only through their final writes. It returns once in-flight bets have committed; a separate conditional statement then cancels live intents.
- Copy: "House bots are off. No bot will place a bet." If the wait times out: "Switching off — a bet already in its final step may still complete".

**F10 Holder's own app** (holder-only; never public)
⛔ **Superseded by D19 (Ali, 2026-09-16):** the chip, its line, the SellButton `houseStake` state, the house-bet notices, the hourly summary and the liquidity label are struck and never built; a house stake looks exactly like the holder's own bet, its exit reads as closed (`WINDOW_PASSED`, C4 ruling 147), and the win, loss and refund notices that stay are byte-identical to any player's (D19c; C4 rulings 143–145).
- ~~**Chip** "50pick liquidity stake" (en/sw/zh) with the line "Placed by 50pick with your permission; it can't be cashed out and settles to your wallet." It appears on:~~
  - ~~PositionCard,~~
  - ~~the market page's own-positions block,~~
  - ~~wallet rows,~~
  - ~~Up & Down history.~~
- ~~**SellButton** gets a distinct `houseStake` state.~~
- **Notices:** ~~house-bet notices up to `holderNoticesPerHour`, then an hourly summary.~~ Win/loss/refund notices stay (2026-08-22 "announce every outcome") ~~with a liquidity label line~~.

**F11 Resolvers.** ~~The resolver queue card, resolution ceremony and admin market page show "House stake: YES X · NO Y". Display only.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no resolver queue card, resolution ceremony, admin market page or other admin screen shows a house stake; resolvers see a house bot's stake exactly like any player's (C5-SPEC rulings 192–194, built in step 5 and un-built in checkpoint C5-5b).

---

## 2. Data model (TEXT + CHECK, no new Postgres enums — precedent `Transaction.payoutRail`)
Two hand-written, re-runnable, expand-only migrations, applied before the release push: `…_house_bot_tables`
(seeds control `global` and runtime `global`) and `…_house_bot_markers`.

| Table | Key columns |
|---|---|
| **HouseBot** | `id` (hb_), `userId` FK. Partial unique `(userId) WHERE status<>'REMOVED'` (new row per designation). `label` (2–32, unique among live bots), `note` (≤300), `status` (ACTIVE/PAUSED/AUTO_PAUSED/REMOVED), `pauseReason` (closed list), `pauseDetail` Json. `passwordFingerprint`, `verifiedAt/ById`, `designatedAt/ById`, `removedAt/ById/Reason`. `rules` Json + `rulesVersion`. **Typed caps (NULL = not set):** `stakeMinTzs`, `stakeMaxTzs`, `capPerMarketTzs`, `capDailyStakeTzs`, `capDailyLossTzs`, `capOpenExposureTzs`, `balanceFloorTzs` (default 0), `freqMinGapSec`, `freqMaxPerHour`, `freqMaxPerDay`, `freqMaxPerMarket`. |
| **HouseBotControl** (id `'global'`) | `enabled` (false), `switchedAt/ById/Reason`, `offCause` (MANUAL/GLOBAL_LOSS_STOP/ENGINE_FAULT/ENGINE_ERRORS). Global caps (NULL = not set): `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gCapOpenExposureTzs`, `gCapPerMarketTzs`, `gMaxBetsPerMinute`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`. Also `maxDesignatedBots` (5), `bellAlertsPerHour` (20), ~~`holderNoticesPerHour` (6),~~ `limitsVersion`. ⛔ **Superseded by D19 (Ali, 2026-09-16):** `holderNoticesPerHour` was removed before it shipped: the holder is told nothing (D19c), so it had no reader (C4 ruling 153). |
| **HouseBotRuntime** (key `'global'` / `'bot:<id>'`) | Hot counters kept off the control row, written with `INSERT … ON CONFLICT (key) DO UPDATE`: `hourKey`, `countInHour`, `summarySentHourKey`, `rateLimitedHourKey`, `rateLimitedCount`, `sweepPlacedAt` + `sweepPositionId`, `errorStreak`, `pollerBeatAt`, `plannerBeatAt` (DB `now()`). Designate inserts `bot:<id>` in its transaction. |
| **HouseBotAlertOnce** | `key` PK (`bot:<id>:<code>:<EAT day>`, `penalty:<userId>:<EAT day>`, …), `createdAt`. `INSERT … ON CONFLICT DO NOTHING RETURNING`; send only when a row returns (replica-safe throttles). |
| **HouseBotEvent** (append-only) | `houseBotId?`, `userId?`, `kind` (DESIGNATED, VERIFIED, STARTED, PAUSED, AUTO_PAUSED, RULES_SAVED, REMOVED, SWITCH_ON, SWITCH_OFF, LIMITS_SAVED, OWNER_MONEY), `from/toStatus`, `reason`, `actorId` (null = `system_house_bot`), `payload`. |
| **HouseBotIntent** | See below. |
| **Markers** | `Position.houseBotId`, `Transaction.houseBotId` (soft ref; written in create only; every `update` skips it). Indexes: `Position(placedAt,id)` (sweep); partial `Position(houseBotId,placedAt)`, `Position(marketId)`, `Transaction(createdAt)`, each `WHERE houseBotId IS NOT NULL`. |

**HouseBotIntent columns**
- **Identity:** `id` (hbi_), `houseBotId`, `botUserId`, `kind` (COUNTER/FILL/OPENER), `anchorKey` (COUNTER → trigger position id, otherwise marketId), `marketId`, `productLine`, `triggerPositionId?`, `triggerUserId?`.
- **Decision:** `side`, `stakeTzs`, `dueAt`, `deadlineAt` (= cutoff − minTimeToCutoff), `status` (PENDING/CLAIMED/PLACED/SKIPPED/EXPIRED/FAILED/CANCELLED), `reasonCode`, `why`, `decision` Json (drawn values + public snapshot).
- **Execution:** `attempts`, `nextAttemptAt`, `claimedBy`, `claimedUntil`, `positionId` (unique), `idempotencyKey` (unique), `finishedAt`.
- **Uniqueness:** partial unique `(anchorKey) WHERE kind='COUNTER'`, and partial unique `(kind, anchorKey) WHERE kind<>'COUNTER' AND status<>'CANCELLED'`. A cancelled FILL or OPENER can be planned again while its timing holds; a skipped or expired one is not.
- **Indexes:** `(status,dueAt)`, `(houseBotId,createdAt)`, `(triggerUserId,createdAt)`, `(marketId,status)`.

**Store twin and timestamps**
- **In-memory twin** (`DATABASE_URL=""`): matching stores and types, and every new DAL function has a memory twin (`test:dal-parity`).
- **Timestamps:** Position times are naive UTC, so bounds are cast as ISO `::timestamp` (precedent `dailyTotalsByUser`).

**Shared pure modules** (`src/lib/house-bot/`), each the single source for its concern:
- `constants.ts`: `HOUSE_CONTROL_ID`, `HOUSE_CONTROL_LOCK = "house:control"`, `houseIntentKey()`, typed words, the `EngineCode` and cap-code lists.
- `pause-reasons.ts`: NEW, MANUAL, PASSWORD_CHANGED, ROLE_CHANGED, SELF_EXCLUDED, COOLING_OFF, ACCOUNT_BLOCKED, ACCOUNT_MISSING, WALLET_FROZEN, WALLET_MISSING, OWNER_LOSS_LIMIT, DAILY_LOSS_STOP.
- `rules.ts`: schema, bounds, field metadata, recommended values, `validateHouseBotRules`, `validateHouseBotLimits`, `effectiveTiming()`.
- `feed-copy.ts`: exhaustive `Record<HouseReason|EngineCode,string>`.

## 3. The money seam (`market-service.ts`)
`placeHouseBet(botUserId, {marketId, side, stake, idempotencyKey}, {botId, intentId})` and `buyPosition` share one private
`buyPositionGuarded(userId, opts, house?)`.

**Sanctioned player-path changes** (all others are forbidden). With `houseBotId` null, `test:house-bot-seam` proves each gives unchanged output.
- **(a)** A non-awaited post-commit trigger hook (dynamic import).
- **(b)** A replay refuses when `existing.userId !== userId`, returning `idempotency_key_conflict`. This closes a pre-existing hole: the key-only lookup returns another user's bet.
- **(c)** `buyPositionAction` refuses keys starting `hb:` with `idempotency_key_conflict`.
- **(d)** `cashOutValue` input gains `houseBotId` ~~and reason `HOUSE_POSITION`~~; the callers `markets/[id]/page.tsx:292` and `positions/page.tsx:189` pass it. ⛔ **Superseded by D19 (Ali, 2026-09-16):** a house position reports the closed-exit reason `WINDOW_PASSED`, not `HOUSE_POSITION`, so no caller can surface the difference (D19c; C4 ruling 147).
- **(e)** ~~A `cashOutPosition` refusal `house_position_no_exit`.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** `house_position_no_exit` is deleted; `cashOutPosition` refuses a house position with `origin/main`'s exit-window refusal verbatim, reason `exit_window_closed` and code `SELECTION_CLOSED` (D19c; C4 ruling 147).
- **(f)** Objection standing requires a non-house position (`objections-service.ts:108`).
- **(g)** Settlement-loop skips of wagering reversal and referral accrual for marked rows.
- **(h)** ~~A liquidity label line on outcome notices for marked positions.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** a holder's outcome notice is byte-identical to any other player's (D19c; C4 rulings 143–145).
- **(i)** ~~The holder chip and the SellButton `houseStake` state.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder chip and no `houseStake` state; the offer renders the closed state for a house position (`sellable: false`), in the words of a closed exit (D19c; C4 ruling 147).
- **(j)** `BuyResult.data.replayed?: true` on both replay paths.
- **(k)** Extract `exitWindowClosesAt(position, market)` = `placedAt + (grace+paid)·60s` when `closesAt − placedAt ≥ grace`, else `placedAt`. `cashOutValue` uses it, as does the engine.

**Checks in order when `house` is set**
| Step | Where | Check → refusal |
|---|---|---|
| H0 | First | The key must equal `houseIntentKey(intentId)` and there must be no `playStartedAt`, else `house_key_mismatch`. **Pre-lookup:** key found with the same user and bot → return the original with `replayed:true`. Key found with another user or bot → `house_key_mismatch`. **Key not found → continue.** |
| H1 | Pre-lock, fresh | Read failure → `house_gate_unreadable`. Switch off → `house_disabled`. Bot not ACTIVE or wrong user → `house_bot_inactive`. The ordinary gates then run unchanged. |
| H2 | Inside `wallet:<botUser>`, one `lockedGate` query on lockTx | Holder status and RG timers → `self_excluded` / `cooling_off` / `account_blocked`. Role ≠ PLAYER → `house_account_ineligible`. Fingerprint mismatch → `house_consent_stale`. Bonus part > 0 → `house_cash_only`. The holder's own non-house OPEN position here, or his house position on the other side → `house_market_conflict{OWNER_POSITION\|OPPOSITE_SIDE}`. `house_cap_reached{STAKE_MIN, STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE, MIN_GAP, PER_HOUR, PER_DAY, PER_MARKET_COUNT}`. |
| H3 | Inside `market:<id>`, after the closed re-check (intent kind read from the CLAIMED intent row, never passed in) | Another bot holds a house position here → `house_market_conflict{OTHER_BOT}`. `house_cap_reached{GLOBAL_PER_MARKET}`. COUNTER trigger no longer OPEN → `house_trigger_gone`. COUNTER trigger account holds the bot's side → `house_market_conflict{TRIGGER_BOTH_SIDES}`. **Mode condition:** COUNTER/FILL need bot side + stake ≤ opposite non-house pool; OPENER needs yesPool = noPool = 0; otherwise `house_condition_gone`. |
| H4 | Inside `HOUSE_CONTROL_LOCK` (innermost, wrapping the money writes so the memory mutex is held too) | Control re-read: `enabled` false → `house_disabled`. `house_cap_reached{GLOBAL_DAILY_STAKE, GLOBAL_LOSS_PROJECTED, GLOBAL_EXPOSURE, GLOBAL_BETS_PER_MINUTE, COUNTERPARTY_COUNT, COUNTERPARTY_TZS}`. Then **the first statement of `withMoneyTx`** is `markPlaced`: it sets `status='PLACED', positionId, finishedAt`, conditional on `status='CLAIMED' AND positionId IS NULL`. 0 rows → `BetAbort` before any money write → `house_intent_superseded`. In the in-memory `!tx` branch of both NO_FUNDS aborts (`:1293`, `:1308-1312`), the intent is reset to CLAIMED with positionId null before throwing. |
| H5–H9 | Existing writes | Stamp the marker on Position and BET_PLACED. Skip `recordWageringLocked`. Audit row payload gains `houseBotId`, `intentId` (never a second row). Skip bet receipts ~~(the engine sends capped holder notices)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the engine sends the holder nothing; a house stake has no bet receipt, push or email (D19c). Skip `onRecruitBet`. `predictorCount`, odds and balance events stay unchanged (D6). |

- **Lock order** `wallet:<bot> → market:<id> → house:control`. `house:control` is held only through the final writes, so a holder never waits on another lock and there is no deadlock. Control writes (ON, OFF, limits) take it briefly.
- **Loss (one function, `server/house-bot/book.ts`), per EAT-day cohort of positions placed that day:**
  - *Realised* = settled stakes − money returned.
  - *Projected* = realised + open stakes, counted as lost.
  - The gates refuse on **projected + this stake** (`DAILY_LOSS_PROJECTED` / `GLOBAL_LOSS_PROJECTED` → SKIPPED).
  - **Auto-pause and master OFF fire only on realised ≥ cap** (planner, every 15s).
  - Hint copy: "Counts today's open stakes as lost until they settle; bots stop only on settled losses".
- **Propagation:** marker stamped on one-sided and VOID refunds, WIN payouts, emergency void, orphan repair and cash-out txns.
- **Failure reasons:** ~~all `house_*` reasons and `idempotency_key_conflict` are registered with en/sw/zh copy~~; `FailureDetail` gains `cap` and `conflict`. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the `house_*` reasons and their 54 sentences leave the player registry and the dictionary as the server-only `HouseSeamReason`, which the console reads through the engine's server-side copy; `idempotency_key_conflict` names nothing and stays a player reason (C4 ruling 148).

## 4. Engine (`src/lib/server/house-bot/`)
**4.1 Modules**
- Readers and state: `control.ts` (fresh reads of control, bot and holder), `market-view.ts` (the only market reader, via `getBoard`/`getRoundDetail` public models and market fields), `eligibility.ts`, `designation.ts`.
- Decision and firing: `trigger.ts`, `planner.ts`, `decide.ts` (pure, injected `crypto.randomInt` RNG), `worker.ts`, `fire.ts`, `outcomes.ts`.
- Output: `alerts.ts`, `book.ts`.
- `test:house-bot-info-edge` scans the import graph of trigger/planner/decide/worker/fire/outcomes/market-view (`designation.ts`/`eligibility.ts` exempt by name; they read the audit log).

**4.2 Boot.** `startHouseBotEngine()` from `instrumentation.ts`.
- **Poller:** every 2s ±300ms, **no leader** (correctness lives in the row claims), at most 2 fires per process. Beats `pollerBeatAt`.
- **Planner:** every 15s under `acquireLeadership("house-bot")` (`leader.ts:91` takes a task name). Beats `plannerBeatAt`. Runs FILL/OPENER planning, realised-loss stops, expiry of rows past `deadlineAt`, hourly summaries.
- **Off switch:** `HOUSE_BOT_ENGINE=false`.
- **SIGTERM:** stop the timers, conditionally return this instance's not-yet-firing claims to PENDING, let in-flight bets finish, release the lease.

**4.3 Triggers**
- **Fast path:** the post-commit hook with a 5s soft cache of "switch on and any bot ACTIVE"; firing always re-reads.
- **Sweep:** keyset `(placedAt,id)`. Each pass restarts at watermark − 60s, reads 200 per page until caught up, and advances the watermark to `min(max seen, now − 60s)`. Inserts use `ON CONFLICT DO NOTHING`, so re-reading is idempotent.
- **Trigger filter:** no marker; account not a live bot; role PLAYER; not in today's **penalty box** (an account that cashed out a countered trigger, or held both sides of a market the house countered; one admin alert via AlertOnce).
- **Negative decisions:** a trigger that passes the filter and is in at least one ACTIVE bot's scope but is not countered writes **one SKIPPED COUNTER intent** with its `EngineCode` and `why`, so "didn't react" is always visible.

**4.4 Decide** (recorded once in `decision`/`why`, never re-decided)
- **`EngineCode`:** OUTSIDE_SCHEDULE, POOL_BAND, NOT_REACTING, TRIGGER_STAKE_RANGE, NO_REACT_ZONE, EXIT_WINDOW_TOO_LATE, UD_CLOSENESS, UD_NO_PRICE, PENALTY_BOX, MARKET_HELD, NO_ELIGIBLE_BOT, STAKE_BELOW_MIN, MAINTENANCE, CUTOFF, MARKET_NOT_LIVE, MARKET_GONE, MASTER_OFF, BOT_NOT_ACTIVE, TRIGGER_EXITED, CONDITION_GONE, BUSY_TIMEOUT, UNMAPPED, INTERNAL, plus `CAP_<code>`.
- **Bot choice:** lowest `openExposure/capOpenExposure`, then least recent bet, then id. Markets where another bot holds positions or live intents → MARKET_HELD.
- **Held counters carry the reason in `why`**, e.g. "Counter · Player #A3F2K8 UP 10,000 on BTC 10m · delay 20s → held to 5:00 (player's free exit) · 80% → 8,000".

**4.5 Claim**
```sql
UPDATE "HouseBotIntent" SET status='CLAIMED', "claimedBy"=$me, "claimedUntil"=now()+interval '180 seconds', attempts=attempts+1
WHERE id IN (SELECT id FROM "HouseBotIntent"
  WHERE ((status='PENDING' AND "dueAt"<=now() AND coalesce("nextAttemptAt",now())<=now())
      OR (status='CLAIMED' AND "claimedUntil"<now()))
    AND "deadlineAt">now()
  ORDER BY "dueAt" LIMIT $freeSlots FOR UPDATE SKIP LOCKED)   -- $freeSlots = 2 − in-flight
RETURNING *;
```
- A 30s heartbeat runs while firing.
- Every requeue or terminal write (other than `markPlaced`) is conditional on `status='CLAIMED' AND "claimedBy"=$me`; 0 rows means someone else owns it, so no alert.
- **The engine never writes PLACED** (`markPlaced` does). Alerts go out **iff** the result is ok and `replayed !== true`.

**4.6 Outcome mapper** — `Record<HouseBetOutcomeKey, Action>`; anything else → FAILED(UNMAPPED) + alert
| Key | Action |
|---|---|
| ok | nothing to write (markPlaced did it); alerts unless replayed |
| `house_intent_superseded` | no-op |
| BUSY, `rate_limited`, `house_gate_unreadable`, thrown transient | Back to PENDING with backoff 1s/5s/15s/45s while before `deadlineAt`, else EXPIRED(BUSY_TIMEOUT). Two `rate_limited` in an hour (runtime counter) → one "holder contention" alert |
| maintenance | SKIPPED(MAINTENANCE), never replayed |
| `house_disabled` / `house_bot_inactive` | CANCELLED(MASTER_OFF / BOT_NOT_ACTIVE) |
| `house_consent_stale` / `house_account_ineligible` | AUTO_PAUSED(PASSWORD_CHANGED / ROLE_CHANGED) |
| `self_excluded` / `cooling_off` / `account_blocked` / `session_limit_reached` | AUTO_PAUSED(SELF_EXCLUDED / COOLING_OFF / ACCOUNT_BLOCKED / ACCOUNT_BLOCKED + anomaly alert) |
| `wallet_frozen` / `wallet_missing` / `loss_limit_daily` | AUTO_PAUSED(WALLET_FROZEN / WALLET_MISSING / OWNER_LOSS_LIMIT) |
| NOT_FOUND (no reason) | re-read market: gone → SKIPPED(MARKET_GONE); else AUTO_PAUSED(ACCOUNT_MISSING) |
| INVALID (no reason) / `market_not_live` (invalid side) | SKIPPED(MARKET_NOT_LIVE) / FAILED + SECURITY alert + master OFF(ENGINE_FAULT) |
| SELECTION_CLOSED / `selection_closed` | EXPIRED(CUTOFF) |
| `stake_not_whole/below_min/above_max` | FAILED + alert (AlertOnce) |
| `house_cap_reached{code}` | SKIPPED(CAP_<code>) |
| `house_market_conflict` / `house_trigger_gone` / `house_condition_gone` | SKIPPED(MARKET_HELD / TRIGGER_EXITED / CONDITION_GONE); a trigger exit also puts the trigger in the penalty box |
| `balance_insufficient` / `house_cash_only` | SKIPPED + AlertOnce per bot per day |
| `house_key_mismatch` | FAILED + SECURITY alert + master OFF(ENGINE_FAULT) |
| thrown non-transient | FAILED(INTERNAL); `errorStreak` ≥ 3 → master OFF(ENGINE_ERRORS) |

- **Auto-pause:** status write under `wallet:<botUser>`, then cancel that bot's live intents, append an event, write an awaited COMPLIANCE audit `house_bot.auto_paused`, send alerts.
- **Realised-loss stops** come from the planner (§3).

**4.7 Timing**
- **Up & Down:** `cutoff = selectionClosedAt` (= opensAt + D). Rounds open about 92s late.
- **Polls:** `cutoff = selectionClosedAt ?? resolutionAt`.
- **`bettableFrom`** = max(round opensAt, market createdAt).
- **Clock:** due and claim times use DB `now()`; `minTimeToCutoff` has a 10s floor to absorb container skew.
- **FILL** cannot seed exactly at the lock (I1 cutoffs), so docs say the fill is visible for its lead time.
- **No-react zone** applies to COUNTER triggers only.

## 5. Rules and limits (one schema, `src/lib/house-bot/rules.ts`; the form renders from its metadata)
**Per bot, behaviour (JSON v1)**
| Group | Field | Default | Bounds |
|---|---|---|---|
| Scope | products (Up & Down / polls) | both off | ≥1 to Start |
| | UD chains | all | durations ⊆ 3/5/10/15/30/60 |
| | poll categories | all | valid set |
| | skip polls closing within | 60 min | 1–43,200 min |
| | pool total min / max | 0 / none | 0–100M, min ≤ max |
| Modes | per product: counter / fill / opener | all off | ≥1 on to Start |
| COUNTER | delay | 15–45 s | 5–600 s |
| | react probability | 60% | 0–100% |
| | trigger stake range | platform min–200,000 | platform bounds |
| | amount | 80% of trigger (or fixed TZS) | 10–100% |
| | **effective timing** | read-only preview | equals `decide.ts` for 3-min, 10-min at open, poll, paid window > 0 |
| FILL | lead before cutoff | UD 45 s / polls 30 min | UD (minTimeToCutoff + jitter) to (shortest chain D·60 − 92 − 20) s; polls (minTimeToCutoff + 1) to 1,440 min |
| | target thin share | 40% | 10–50% |
| | jitter | 10 s | 0 to (lead − minTimeToCutoff) |
| OPENER | delay | UD 20–90 s / polls 5–30 min | UD ≤ shortest D·20 s |
| | stake | 1,000–5,000 | platform bounds |
| Up & Down | closeness | 25% of margin | 0–100% |
| Shaping | round to | 500 | {100, 500, 1,000, 5,000} |
| | jitter | 10% | 0–30% |
| Guards | no-react zone (COUNTER) | UD 30 s / polls 15 min | 0–300 s / 0–1,440 min |
| | min time to cutoff | UD 20 s / polls 5 min | ≥10 s / ≥1 min |
| Schedule | days | all | ≥1 |
| | All day toggle, or 1–4 windows | all day | EAT, no overlap; overnight entry stored as two windows, shown "22:00 → 02:00 (overnight)" |

**Per bot, typed caps** (recommended values are placeholders, filled only by the button)
| Cap | Recommended | Rule |
|---|---|---|
| stake min–max | 1,000–10,000 | within platform bounds; min ≤ max; max ≤ global per-market |
| per market | 20,000 | ≥ stake max; ≤ global exposure |
| daily stake | 200,000 | ≥ per market |
| daily loss | 50,000 | ≤ daily stake |
| open exposure | 100,000 | ≥ per market |
| balance floor | 0 | ≥ 0 |
| min gap | 30 s | **≥ 20 s** (leaves ≥70% of the holder's `bet.place` 10/min) |
| per hour | 20 | ≤ 3600/minGap and ≤ 60 |
| per day | 200 | ≥ per hour |
| per market (count) | 2 | 1–6 |

**Global limits (control row)**
| Limit | Recommended | Rule |
|---|---|---|
| daily stake | 500,000 | — |
| daily loss (realised stops the master) | 100,000 | ≤ daily stake |
| open exposure | 300,000 | ≥ every bot's per-market cap |
| per market | 30,000 | ≥ every bot's stake max |
| bets/minute | 6 | 1–20 |
| counters per player per day | 3 and 30,000 | — |
| max designated bots | 5 | 1–20, ≥ current count |
| bell alerts/hour | 20 | 0–60 |
| ~~holder notices/hour~~ | ~~6~~ | ~~0–60 (0 = summary only)~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** removed before it shipped; the holder is told nothing, so the limit had no reader (D19c; C4 ruling 153). |

Cross-field errors return `field` → `focusFirstInvalid`.

## 6. Designation and consent (`designation.ts`)
**`houseBotEligibility(userId, {botId?, context})`** is the one function behind picker, card, designate, re-verify and Start.
| Applies | Blocking rows |
|---|---|
| always | role ≠ PLAYER (staff or AGENT) · status ≠ ACTIVE or `closedAt` · no password · RG lockout · wallet ≠ ACTIVE · balance read failed (card) |
| designate / picker (no botId) | already a live bot · the owner's own account · roster full |
| designate + re-verify (password contexts) | `lockedUntil` in the future · latest password write was `player.password_reset_by_officer`, or the audit read failed ("Ask the holder to change it in Account settings") |
| Start (with botId) | OWNER_LOSS_LIMIT while `checkLossLimit(userId, stakeMinTzs)` refuses · today's realised loss ≥ `capDailyLossTzs` |

Warnings: email unverified (can't top up) · identity never approved (can't withdraw) · recruited by agent (no commission on
house bets) · open positions (the bot skips those markets) · the leaderboard shows the display name's first word (suggest a nickname).

**Password check** (`verifyHouseBotPassword`)
1. Empty input is refused uncounted.
2. Rate bucket `housebot.verify` {capacity 3, refill 0.2/min}, keyed `officer:target`.
3. `lockedUntil` check.
4. Inside `withLock("login:<id>")`, `verifyPassword` against the **fresh** row, with login's counter and lockout (5 attempts → 30 min).
5. On success, reset the counter and return `passwordFingerprint(hash)`. Every refusal returns `attemptsBeforeLock` and `retryAfterSec`.
6. **Never** a session, `lastLoginAt`, bootstrap promotion or `auth.login.*` audit. SECURITY audits: `house_bot.password_verified|password_rejected|verify_rate_limited|verify_account_locked`. The password never appears in logs or errors.

**Owner actions** (`src/app/admin/house-bots/actions.ts`; each starts with `requireOwner`)
| Export | Input | From → to | Confirm | After |
|---|---|---|---|---|
| `searchHouseBotCandidatesAction` | q (2–64) | — | — | rows with `eligible` + reason |
| `designateHouseBotAction` | userId, label, note, password | none → PAUSED(NEW) | review step | replace → `/[botId]?tab=rules`; double submit → `{ok:false, data:{botId}}` link |
| `reverifyHouseBotAction` | botId, password | per F6 | password Modal (no typed word) | refresh |
| `startHouseBotAction` | botId | per F3/F6 → ACTIVE | ConfirmDialog + summary | refresh; unset cap or mode → `{field, href}` push |
| `pauseHouseBotAction` | botId, reason? | ACTIVE → PAUSED(MANUAL); otherwise ok no-op | ConfirmDialog | refresh |
| `removeHouseBotAction` | botId, reason, word `REMOVE` | any → REMOVED; no-op if removed | Modal form | replace → roster |
| `saveHouseBotRulesAction` | fields, rulesVersion (CAS) | — | Unsaved guard | refresh |
| `setHouseBotSwitchAction` | on, reason + word `BOTS ON` (ON only) | OFF: one click, no CAS | ON: Modal form | refresh; unset caps → `{field, href}` push |
| `saveHouseBotLimitsAction` | fields, limitsVersion (CAS) | — | Unsaved guard | refresh |
| `cancelHouseBotIntentAction` | intentId | PENDING → CANCELLED ("Already firing" if CLAIMED) | ConfirmDialog | refresh |

The server re-checks every typed word from the shared constants. Engine writes never bump `rulesVersion` or `limitsVersion`.

## 7. Notifications (kind `HOUSE_BOT` ∈ MONEY_KINDS; every emitter in `comms-registry.ts`; templates in `EMAIL_TEMPLATES`)
| Emitter | Audience · channel | When | href |
|---|---|---|---|
| `notifyAdminsHouseBotBet` | ADMINs · bell | fresh PLACED while runtime `global` `countInHour ≤ bellAlertsPerHour`; unique title (label · side · TZS · market · HH:MM:SS · intent ref) | `/admin/house-bots/<botId>?tab=activity` |
| `notifyAdminsHouseBotHourSummary` | ADMINs · bell | planner, claim-once, hours over the cap | `/admin/house-bots?tab=activity&range=today` |
| `notifyAdminsHouseBotPaused` | ADMINs · bell + email | every auto-pause (never capped) | `/admin/house-bots/<botId>` |
| `notifyAdminsHouseBotSwitch` | ADMINs · bell + email | every ON/OFF, manual or automatic | `/admin/house-bots` |
| `notifyAdminsHouseBotMoneyEvent` | ADMINs · bell + email | F7, ACTIVE bots only; txn id in body (never capped) | `/admin/transactions?q=<txnId>` |
| `notifyAdminsHouseBotAlert` | ADMINs · bell + email | AlertOnce per bot per code per day | `/admin/house-bots/<botId>?tab=activity&outcome=failed` |
| ~~`notifyHouseBotOwner`~~ | ~~holder · bell + push (+ email on designated/removed)~~ | ~~designated / started / paused / password pause / removed; "liquidity" wording, en/sw/zh~~ | ~~`/positions`~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** deleted; the holder receives no house-bot notice or email at all, and every admin alert stays (D19c; C4 ruling 149). |
| ~~`notifyHouseBotOwnerStake`~~ | ~~holder · bell + push~~ | ~~per house bet while runtime `bot:<id>` count ≤ `holderNoticesPerHour`~~ | ~~`/positions/<positionId>`~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** deleted; the holder receives no per-stake notice (D19c; C4 ruling 149). |
| ~~`notifyHouseBotOwnerHourSummary`~~ | ~~holder · bell~~ | ~~"50pick placed N liquidity stakes (TZS X) from your account between HH:00 and HH:00"~~ | ~~`/positions`~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** deleted; the holder receives no hourly summary (D19c; C4 ruling 149). |

Money hooks are fire-and-forget after commit at the `wallet-service.ts` points: deposit confirmed, withdrawal requested, AML
hold, paid, failed; AML rejected in `admin/aml/actions.ts`; officer adjustment. Each is confirmed at build.

## 8. Console UX (`/admin/house-bots`, owner-only)
**Routes**
- `/admin/house-bots`: strip + 4 KPIs above the tab rail. Tabs:
  - `roster`: the roster table; "Designate an account" (disabled with the reason when the roster is full);
  - `activity`: the feed;
  - `limits`: global form + today's usage bars;
  - `history`: control events and all bot events.
- `/new`: the wizard.
- `/[botId]`: strip (status, reason + its resolving action, live balance, today net, exposure) and actions (Start, Pause, Re-verify, Remove). Tabs:
  - `overview`: the saved-rules sentence; today's cap usage bars (daily stake, projected and realised loss, exposure, bets per hour and day); today and lifetime `houseBotBook` (bets, staked, returned, net, open exposure, fee withheld); the next due intent. Empty: "No house bets yet — set rules, then Start."
  - `rules`: the form + effective timing preview.
  - `activity`: the feed filtered to this bot.
  - `money`: the holder's transactions since designation, house-marked rows labelled, plus OWNER_MONEY events → `/admin/transactions?q=`. Empty: "No money movements since designation on {date}."
  - `history`: events (actor, from→to, reason). Empty: "No changes yet."
- Every route has `force-dynamic` and a `loading.tsx` with the same `AdminPageHead` and skeleton order. An unknown bot gives `notFound()`; a REMOVED bot renders read-only.

**Live state**
- One `RefreshPoller` in the shared strip on every tab (`LIVE_ROUND_MS`); disabled while a form is dirty.
- `notification:new` of kind HOUSE_BOT triggers an immediate refresh.
- **Engine health:** switch ON and `pollerBeatAt` or `plannerBeatAt` older than 30s → danger Callout "The bot engine is not running (last seen HH:MM:SS EAT). No bot will place a bet."
- Due times show as absolute EAT with a client countdown.

**Feedback**
- Agents-page runner (`useRunner` + ActionOverlay + `focusFirstInvalid`); `useMayAct()` before `ActReadOnly`; buttons disabled while pending.
- **Modal forms:**
  - master ON (reason, then `BOTS ON`);
  - Remove (reason, then `REMOVE`);
  - Re-verify (password only).

  Submit is disabled until valid; errors are inline and the modal stays open.
- **Unsaved-changes exemption (①):** every client file rendering these modals or the Pause reason `Textarea`, each with its reason.

**UserPicker** (`src/components/admin/user-picker.tsx`)
- `Input type="text"` with the full combobox ARIA set and an in-flow listbox.
- 250ms debounce, with a sequence number that drops stale answers.
- Keyboard: ↑/↓/Home/End/Enter/Esc/Tab.
- Idle, loading, empty and error states, plus a polite live count.
- New DAL `db.user.searchForPicker` with a memory twin, using an explicit `HOUSE_BOT_PICKER_SEARCH`: name/phone/email/id, default `id, phoneE164, displayName, email`. A pasted "Player #XXXXXX" resolves to the id suffix.

**Activity feed**
- Built from HouseBotIntent joined to the trigger, market and settlement.
- `QueryStrip` filters (bot, product, outcome, range); changing a filter drops `page`. `AdminPagination` shows 20 rows.
- Each PENDING row has a Cancel button.
- Copy comes from `feed-copy.ts`, e.g. "House bot "Bot A" countered a TZS 10,000 UP stake by Player #A3F2K8 with TZS 8,000 DOWN on BTC 5-min #412 — 22s later".
- Side words come from the dictionary. Tones: placed royal, skipped/pending neutral, failed danger, never gold. No entrance motion.
- Empty states: switch off / no bots / filtered.

**Visual rules**
- Money second in tables; no `min-w` on narrow tables; `ScrollX`.
- `KpiGrid cols=4`; `FormColumn measure="form"`.
- Status tones in `status-tone.ts`: ACTIVE green, PAUSED amber, AUTO_PAUSED claret, REMOVED slate. Toggle tone brand.
- Widths 360/640/768/1024/1280/1920.
- Kit controls only: Toggle, Checkbox, Select, TimeSelect, DurationInput, PasswordInput, Textarea.

**Nav and RBAC**
- `NAV_GROUPS` Money group after House, `{key:"house-bots", domain:"ops", ownerOnly:true}`.
- `ROUTE_KEYS` entry **before** `/admin/house`. `CRUMB_LABELS`.
- `roles.ts` `ROUTE_DOMAINS` + `OWNER_ONLY_PREFIXES` (update the "two surfaces" comment).
- `admin-nav.test.mts` pins in both directions + `REACHED_WITHOUT_NAV` (`/new`, `/[botId]`).
- `rbac.test.mts` pins in both directions; `scripts/admin-view-matrix-drive.mjs:54`; `design-gate/routes.mjs`.
- ~~Player profile chip "House bot · ACTIVE" for staff, linking to the bot for the owner only.~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** `/admin/players/[id]` shows a house bot's holder exactly like any player, with no chip, no owner link and no transactions-tab row tag (03 S7, C5-SPEC ruling 241).

## 9. Reporting (levy identity stakes−payouts−refunds = fee stays intact: statutory filters nothing)
⛔ **Superseded by D20 (Ali, 2026-09-17):** every house split, house line and house exclusion in this table is struck and never built (C5-SPEC rulings 224–231, 233–234): no `house` summary line and no "all = players + house" identity; active players, per-game players, unique players, top contributors, the Top-10 list and insights count a house bot's account as a player; no GBT, daily-ops or match-integrity house line and no per-market `houseStake`; no `/admin/house` marker row; no "House bots net" tile; the AML and harm detectors read house bets like any player's; and no D6 pin. What stands is the heading's levy identity, row 3's "unchanged (include)" and row 8's "unchanged (D6)": every report, filing, count and detector treats a house bot's account exactly like a player's.

| Surface | Change |
|---|---|
| `report-money.summarise`, `moneyByGame`, `categoryBreakdown` | totals unchanged; ~~`activePlayers` and per-game players skip house rows; add a `house{stakes,returned,net,bets}` line; assert all = players + house~~ |
| `analytics.activePlayers`, `topNgrContributors` | ~~exclude house rows~~ |
| GGR/NGR, deposits, withdrawals, liability, FIU SAR, `house-ledger` waterfall | unchanged (include) |
| `buildGbtMonthly` / `buildDailyOps` / match integrity | ~~add "House liquidity stakes (included above)" + net; `uniquePlayers` non-house; per-market `houseStake`~~ |
| `/admin/house` | ~~row "House bots — net result (included above)" + open exposure; update `test:house-page` pins~~ |
| `/admin/finance`, `/admin/insights` | ~~Top-10 players only + "House bots net" tile; insights loop skips marked rows~~ |
| AML `detectSuspiciousBets`, RG harm markers | ~~skip marked bets (deposits stay)~~ |
| Leaderboard, trader avatars, `predictorCount`, ticker | **unchanged (D6)**~~, pinned by a test~~ |

## 10. Public text and docs
⛔ **Superseded by D19 (Ali, 2026-09-16):** the public text below is struck and never built. The rulebooks, Terms, privacy notice, FAQ, home copy and chatbot keep exactly the words they have on `main`: no carve-out, no disclosure line, no META or `TERMS_VERSION` bump and no announcement (D19a); there is no holder chip (D19c); the chatbot gets no bullet, only a guard that keeps false assurances out of the system prompt and `faq8a` (D19d); and the house refusals left the public dictionary (C4 ruling 148). The "Docs" half stands except its rulebook §8 supersede row: the docs are internal, and the Board draft stays private (D19b).

**Public text**
- ~~**Rules:**~~
  - ~~Carve-out sentence covering **the whole §8 prohibited list**, including multi-account and coordination (`_content-up-down.tsx:209-211`, `_content-yes-no.tsx:217-219`).~~
  - ~~Disclosure line in the §3/§4 pools sections.~~
  - ~~YES/NO §3 conviction text: "…including any stakes 50pick places to add liquidity".~~
- ~~**Terms:** a §4 line; §10 unchanged (waiver recorded).~~
- ~~**i18n-dict:** `faq1aLoser` (keeps `{pct}`), `faq8a`, `howStep1B`, `heroConvEmpty`.~~
- ~~**Chatbot:** new bullet after `_actions/chat.ts:147`; **lines 143–144 untouched**.~~
- ~~**Locales:** sw/zh drafted and marked for native review; English binding.~~
- ~~**META:** version bumps, with a "no 14-day notice, owner ruling" comment.~~
- ~~**Holder chip and failure-reason copy:** en/sw/zh.~~

**Docs**
- `docs/COMPLIANCE-DECISIONS.md` new top entry: ruling; supersedes table (F6, UPDOWN D3/G2/G4, ~~rulebook §8,~~ §10 notice, backlog F6); do-not-restore; D1–D9 with accepted consequences; the closeness-rule rationale; accountability. ⛔ **Superseded by D19 (Ali, 2026-09-16):** the rulebook §8 row supersedes nothing: the rulebooks are not amended, and their prohibition still stands as published (D19a).
- New `docs/HOUSE-BOTS.md` (authority: invariants→guards, model, engine, caps, eligibility and auto-pause matrix, console map, reporting table, alert matrix, disclosure surfaces, runbook, verification, risks). It names no script or npm key before that commit adds it.
- `docs/RULES.md` §2.x; `docs/FLOWS.md` §9 (plus the two stale §3 rows); `docs/FAILURE-INVENTORY.md` §6.
- Supersede banners on F6, UPDOWN-FINAL-DESIGN and feature-backlog.
- `docs/README.md` index; `CLAUDE.md` pointer; `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md` (DRAFT FOR ALI); `docs/LIVE-QA-CAMPAIGN.md` §6b handoff; memory update.

## 11. Build order
**Setup and working rules**
- Worktree: follow `plans/house-bots/README.md` → "Resume on any machine" (branch `house-bots` already exists on origin; the old `-b house-bots origin/main` form is superseded by S1). Never rebase the branch; merge `origin/main` into it. Stage by name only.
- Push the **branch** after every commit. Merge `origin/main` in often (never rebase: the branch is shared across machines); conflicts are expected in nav, admin-shell and docs.
- **Before each push:** `test:all` green, then an **adversarial review workflow** (money / logic / UX lenses) on the commit's diff, with findings fixed first.

**Commits**
| # | Contents |
|---|---|
| 1 | Docs of record (COMPLIANCE entry, HOUSE-BOTS skeleton, supersede notes) · schema + 2 migrations + DAL + memory twin · `src/lib/house-bot/{constants,pause-reasons,rules}` · `server/house-bot/book.ts` · `test:house-bot-rules` |
| 2 | Money seam (§3) + propagation + reasons/copy · `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-caps` · `red:house-bot-money` |
| 3 | Designation, eligibility and password **services** (no actions yet) · `HOUSE_BOT` kind ~~+ `notifyHouseBotOwner` + owner email template~~ · `test:house-bot-designation` ⛔ **Superseded by D19 (Ali, 2026-09-16):** Commit 3 built `notifyHouseBotOwner` and the owner email template `houseBotOwnerHtml`, and the eighth session deleted both; the holder receives no house-bot notice or email (D19c; C4 ruling 149). |
| 4 | Engine (§4) + remaining notifications (§7) + money hooks + `feed-copy.ts` · `test:house-bot-engine`, `test:house-bot-info-edge`, `test:house-bot-comms` · `red:house-bot-engine`. Idle while the switch is OFF. |
| 5 | ~~Reporting (§9) + resolver exposure display +~~ ~~holder chip / SellButton~~ · `test:house-bot-reports` ⛔ **Superseded by D20 (Ali, 2026-09-17):** the §9 reporting splits and the resolver exposure display are struck; Commit 5 is re-planned in `C5-D20-REPLAN.md` §3 (C5-5b un-build, C5-6 R8 + R6, C5-7 absence sweep and served layer, C5-8 closing gates), and the holder chip and SellButton fall under D19c. ⛔ **Superseded by D19 (Ali, 2026-09-16):** no holder chip and no SellButton `houseStake` state are built; a house stake looks exactly like the holder's own bet (D19c). |
| 6 | ~~Public text (§10)~~ · `test:house-bot-disclosure` ⛔ **Superseded by D19 (Ali, 2026-09-16):** no public text; Commit 6 is the non-disclosure commit (the private Board draft, the chatbot guard D19d, docs, the absence suite). |
| 7 | Console: `actions.ts`, routes, UserPicker + DAL search, nav/RBAC, FAILURE-INVENTORY · `test:house-bot-console` · `red:house-bot-console` · `qa:house-bots-visual` |
| 8 | `seed:house-bots-local`, `drive:house-bots-local`, `ops:house-bots-status` · docs finalised · end-to-end drive · verification record |

**Release:** migrations applied to production from this machine first. **One merge to `main`** at a quiet hour: one deploy, which is a brief outage while `overlapSeconds` is null. The switch stays OFF and Ali turns it on.

## 12. Verification
**New suites**
| Key | Proves |
|---|---|
| `test:house-bot-rules` | every bound and cross-field rule (both directions vs globals); recommended values valid; min gap floor; windows split; `effectiveTiming` equals `decide.ts` (3-min 0:20, 10-min at open 5:00, poll 5:00, paid window 2 min 7:00) |
| `test:house-bot-seam` | sanctioned changes (a)–(k) give unchanged output with a null marker; `placeHouseBet` import pin; `hb:` key and cross-user replay → `idempotency_key_conflict` |
| `test:house-bot-money` (real PG + memory) | trial balance ties; all GGR = fee; marker on every txn path, immutable in both stores; no bonus; no commission (holder's own bet still accrues); no cash-out; no objection standing; forced 0-row `markPlaced` and memory NO_FUNDS abort leave money and intent consistent |
| `test:house-bot-caps` | concurrent bursts stop exactly at every per-bot and global cap code; projected-loss skip vs realised-loss stop; OFF mid-burst → nothing later commits; OFF commits <1s while a market lock is held 25s; cooling-off mid-burst; two bots racing → one position; duplicate/reclaimed fire → one position, one alert; OPENER on empty market places, after any stake refused |
| `test:house-bot-designation` | every blocking row per context (incl. started bots not blocked by "already a live bot"); officer-reset refusal; empty password uncounted; counter, lockout and `attemptsBeforeLock`; **no session, no `lastLoginAt`**; fingerprint auto-pause; re-verify refused on DAILY_LOSS_STOP; Start refused at loss cap; re-designate = new row |
| `test:house-bot-engine` | mapper covers every `HouseBetOutcomeKey`, unmapped → FAILED(UNMAPPED); every `EngineCode` reachable with copy; bot-vs-bot, staff and AGENT triggers ignored; **bait-and-dilute → no counter**; **cashed-out trigger → TRIGGER_EXITED + penalty box**; closeness rule (price at open + 0.3·margin with 25% → UD_CLOSENESS); exit window hold; sweep catches a late-committing position; cancelled FILL re-planned once, skipped not; stale engine beats render the Callout; SIGTERM claim release; every (status, reason) has a way out |
| `test:house-bot-info-edge` | engine modules import no Sentinel, objection, observation, oracle, AI or audit readers (positive control) |
| `test:house-bot-comms` | admin ~~and holder~~ caps then summaries; unique titles survive the 90s dedupe; two identical money events → two rows; every href maps to an existing `page.tsx`; ~~holder notices trilingual~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there are no holder notices to cap, summarise or translate; every alert goes to admins only (D19c). |
| `test:house-bot-reports` | ~~splits; all = players + house; AML/harm exclusion;~~ leaderboard still includes the bot; **`houseBotId` ~~and the chip~~ absent from `getBoard`/`getRoundDetail`, market page props, leaderboard, trader avatars and `market:odds` ~~for non-holders~~** ⛔ **Superseded by D20 (Ali, 2026-09-17):** the suite carries no house-split, "all = players + house" or AML/harm-exclusion case, because reports treat a house bot's account as a player's; it holds the D19 absence, gate and money proofs (C5-SPEC ruling 176) and the cases of the rulings D20 keeps. ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no chip, and nothing house reaches the holder either, which `qa:house-bot-holder-view` proves on the holder's own pages (D19c). |
| `test:house-bot-console` | nav/RBAC in both directions; every action refused for 8 non-owner roles with a SECURITY row; typed-word re-check; CAS only where specified; unset-cap `{field, href}`; wizard `step=review` with empty memory → consent; picker schema, handle lookup, check card shows balance and bonus |
| `test:house-bot-disclosure` | ~~carve-out and disclosure in 3 locales in the right sections; META bumped; no "crowd"; `{pct}` kept; chat bullet present, anchors unchanged~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no carve-out, disclosure line, META bump or chat bullet; the suite proves the absence instead, walking every client module and its value imports for house vocabulary (D19a, D19c; C4 ruling 152). |

**Other checks**
- **RED harnesses:** `red:house-bot-money` / `-engine` / `-console`. Each mutation must fail **its own** assertion, with an unmutated control.
- **Existing gates touched:** `failure-reasons`, i18n, dal-parity, `cert-c1`/`c3`, admin-nav, rbac, admin-act-gate, orphan-actions, orphans, feedback-law, confirm-gate, unsaved-changes, ui-consistency, gold-is-money, house-page, docs, late-bet, rg-limit-race, bet-retry, money-invariants.
- **Local Postgres, end to end** (`seed:` + `drive:house-bots-local`, loopback-only guard):
  - designate (balance shown), rules, switch ON, real player bet → COUNTER PLACED with markers;
  - FILL and OPENER;
  - OFF mid-delay → CANCELLED;
  - password change → AUTO_PAUSED → re-verify → Start;
  - self-exclusion → AUTO_PAUSED;
  - settlement → P&L and reports tie.
- **Visual** (`qa:house-bots-visual`, the proven method on this machine): `next start` of this build. Same-origin public page with the body replaced by `renderToStaticMarkup` of props-only `*View`s with fixtures:
  - every tab 0-row and n-row;
  - roster 0/1/5 with every status;
  - strip ON/OFF/auto-off/engine-stale;
  - rules clean and with errors, plus timing preview;
  - wizard steps, including balances 0 / 1,000 / 2,500,000 and ineligible rows;
  - feed rows and empty states;
  - modals;
  - ~~holder chip.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no holder chip to render (D19c).

  Run at 6 widths with overflow, clipping and control-height assertions, plus a `--sheet-missing` red control. **Each PNG opened and read.**
- **Production after release:**
  - `dpl=` SHA equals the merge;
  - `ops:house-bots-status` read-only (switch off, 0 bots, 0 marked rows, engine beats fresh);
  - owner renders the page, nav highlight correct, picker and check card with balance work **without designating**;
  - a non-owner role gets `AdminRestricted`;
  - ~~rules and terms in en/sw/zh show new text and versions;~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the rules and terms keep exactly the words and versions they have on `main` (D19a);
  - recheck 0 marked rows after 10 minutes.
- **Handover:** the first live money run is Ali's (D1), monitored via the feed and alerts.

## 13. Accepted risks (written into COMPLIANCE entry and HOUSE-BOTS.md)
1. **Licence class and levies.** House stakes are taxed within the fee, and the pool becomes a "book" (F6 §3). Ali reports to GBT.
2. **Consent is knowledge, not proof.** Password-only (D5). Officer resets are blocked, but resets before the 2026-09-11 audit genesis are invisible.
3. **Exploitation is bounded, not eliminated.** Alt accounts farming counters are capped per account, and G4 still applies. Caps, penalty box, closeness rule and exit-window hold are the controls.
4. **The holder sees house positions live** (they could front-run with an alt account). House stakes also count against their own RG loss limit, which auto-pauses the bot.
5. **Throughput.** Bot bets serialise on `house:control` (ms-long), and the holder shares the `bet.place` rate bucket (min gap ≥ 20s).
6. **Delivery.** Merge conflicts with the parallel session are likely. `overlapSeconds` in production is unverified; the design is correct either way. ~~sw/zh legal text needs native review.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no legal text changes, so there is none to review (D19a). The leaderboard shows the holder's display name.

Risks 13–20 (stakes chosen by staff; D17–D18) are in §16b. Like the risks above, they go into the COMPLIANCE entry and HOUSE-BOTS.md.

---

## 14. Password lifecycle — sealed (Ali: "if he changes his password we must enter the new one")
**The console never logs into the holder's account.** It creates no session, no cookie, no `ActiveSession` row and no
`lastLoginAt`, and never signs him out. Bets run as `placeHouseBet(userId, …)`. The typed password is used once, in memory,
inside `withLock("login:<id>")`, and then dropped.

**Detection (three layers, so an idle bot is caught too)**
| Layer | Where | Latency | Catches |
|---|---|---|---|
| L1 hook | `void import(".../house-bot/credential").then(m => m.onHolderCredentialWrite(userId, method))` right after the write in `password-reset.ts:242` (reset link), `:271` (officer temp), `:326` (settings), and erasure's hash nulling | <1s | every in-app change |
| L2 planner sweep | every 15s under `acquireLeadership("house-bot")`, **independent of the master switch**; one query joining live bots to the holder's hash, role, status, closedAt, RG and wallet | ≤15s | raw-SQL/ops-script writes, lost hooks, and the other holder changes (role, suspend, self-exclusion, cooling-off, closure, officer freeze) |
| L3 in-lock | F5 step 4 + H2 `house_consent_stale` | at the next bet | cannot be bypassed: no bet ever runs on stale consent |

- **Hook behaviour:** `onHolderCredentialWrite` does one indexed read and returns if the user is not a live bot. Otherwise it takes `wallet:<userId>` and re-reads; a matching fingerprint means no-op, so hook and sweep can race harmlessly.
- **Source pin:** any new password writer outside the allow-list fails `test:house-bot-designation`. A future re-hash-on-login writer passes method REHASH and refreshes the fingerprint without pausing.
- **Console render:** every render recomputes the fingerprint match live, so the strip is right even if the engine is down.

**Effect by prior state**
| Before | After | Admins | Holder |
|---|---|---|---|
| ACTIVE | AUTO_PAUSED(PASSWORD_CHANGED), `pausedFromStatus=ACTIVE`, queued stakes CANCELLED | A1 bell + email | ~~H1 bell + push~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder is told nothing (D19c). |
| PAUSED / AUTO_PAUSED (other cause) | status kept; `credentialChangedAt` + method recorded; Start disabled until re-verified | A2 bell | — |
| Changed again before re-verify | details updated; alert key `pw:<botId>:<newFingerprint>` (never silenced by a same-day key) | A1 again | — |
| Officer temp password | as above + **re-verify blocked** until the holder sets his own password | A2 officer wording | — |
| Erased / no password | only Remove | A2 erased wording | — |

**Alert copy** (admin English; ~~holder en/sw/zh, sw/zh native review~~) ⛔ **Superseded by D19 (Ali, 2026-09-16):** admin copy only; there is no holder copy (D19c).
- **A1** title: `House bot "{label}" paused — password changed · {HH:MM:SS}`. Body: "{holder} changed his 50pick password {in his account settings | with a reset link | — support issued a temporary password} at {HH:MM} EAT on {D MMM}. The bot stopped and cancelled {n} queued stake(s). No bet will be placed until you enter his new password." Link: `/admin/house-bots/{id}?reverify=1`; email button "Enter new password".
- ~~**H1:** "Liquidity stakes paused — your password changed, so 50pick stopped placing liquidity stakes from your account. Your balance and open stakes are unchanged."~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** H1 is never sent; a password pause alerts admins only (D19c; C4 ruling 149).

**Deep link `?reverify=1`**
- The server works out ELIGIBLE / BLOCKED{reason} / NOT_NEEDED{by, at} / ACTIVE / REMOVED.
- If ELIGIBLE and the viewer may act, the modal opens on mount with focus in the password field. The param is `router.replace`d away, so reload or Back never reopens it.
- NOT_NEEDED shows "Already done — {name} entered the new password at {HH:MM} EAT."
- Signed-out or lapsed-2FA admins return to the link after login and 2FA.

**Strip:** AUTO_PAUSED(PASSWORD_CHANGED) is the only state where **Enter new password** is the primary button. Line: "Paused {HH:MM} EAT — {holder} changed his password {how} on {D MMM, HH:MM}. No bets until you enter the new password." If it was running, add "It was running; you can resume it right after." Start is disabled with "Enter the new password first".

**Re-verify modal** (kit `Modal`, 400 wide, `closeOnScrim={false}`, modal-local runner, never ActionOverlay while open)
- **Field:** `PasswordInput size="md" autoComplete="new-password" name="holderSecret"` with password-manager ignore attributes. Label "Account holder's password (not your own)". Tries-left line.
- **Checkbox** "Resume the bot now — it was running before", ticked by default, shown only when `pausedFromStatus=ACTIVE`. Under it: "Uses rules v{n}. Master switch: {ON | OFF — no bets until it's on}".
- **Server steps:**
  1. `requireOwner`.
  2. Empty password → "Enter his password." (not counted, never trimmed).
  3. Fresh bot read (REMOVED → refuse; ACTIVE with a matching fingerprint → no-op).
  4. Password rows only: sign-in locked, officer-set, no password, audit read failed. Status causes do **not** block re-verify.
  5. Rate bucket `housebot.verify`.
  6. **Reserved attempts:** if `failedLoginCount ≥ 3`, refuse **without checking**: "Stop here — the last 2 attempts are kept for the holder. Ask him to sign in once, then try again." **Admin attempts never set `lockedUntil`**, so we can never lock him out.
  7. Verify against the fresh row inside `login:<id>` (wrong → counter +1).
  8. Under `wallet:<bot>`: if the hash changed again meanwhile → "His password changed again while you were typing — ask him for the newest one" (not counted). Otherwise store the new fingerprint, `verifiedAt/ById`, clear the credential fields, PASSWORD_CHANGED → PAUSED(MANUAL). Event VERIFIED, SECURITY `house_bot.password_verified`.
  9. If resume is ticked, run the normal Start service with all its checks.
- **States:**
  - wrong: "Wrong password. This may be his OLD password — he changed it on {D MMM, HH:MM} EAT." Field cleared and refocused.
  - few tries left: warning Callout.
  - reserved / rate-limited: Callout with countdown, submit disabled.
  - blocked while typing: close and show the reason.
  - another admin already verified: success "Already verified by {name}".
  - verified, no resume: "Password confirmed — press Start when ready".
  - verified and resumed: "Password confirmed · bot running" (+ master OFF note).
  - **verified but Start refused:** a failure card that stays: "Password confirmed · bot still paused" + the refusal + its fix link. The bot stays PAUSED(MANUAL), and only the VERIFIED event is written.

**Consent voids (ruling D11):** any RG pause (self-exclusion, cooling-off) also voids consent. When the cause clears, **Start requires a fresh password** (Re-verify, then Start), never a silent restart.
**Out of scope (recommended separate hardening, not this build):** signing a player out of other devices when his password changes. That is platform-wide behaviour and touches the half-fixed revoked-session path (E-381).

## 15. Design conformance — authorities and rulings
**Authorities**
- `src/app/globals.css` (tokens) → `docs/design-master-brief.md` → `docs/DESIGN_AUTHORITY.md` (laws).
- Records: `DESIGN-BASELINE.md`, `DESIGN-GATE-ADMIN/PLAYER-2026-08-28.md`.
- Full screen-by-screen spec: `03-design-spec.md` (§17). **Where it differs from §8 above, it wins:**

| # | Ruling |
|---|---|
| X1 | Activity filters use `FilterPill rank="dense"` + `DateTimeRangeFilter rank="dense"` (precedent `admin/ai-polls/poll-filters.tsx`), not `QueryStrip`; add the file to `ADMIN_SURFACES` in `test:filter-language` |
| X2 | Every form control `size="md"` (44 = `--h-input`), because the `sm` rungs disagree (36 vs 40). 32 only in filter rails and table row actions |
| X3 | The static harness cannot draw Modal, Select listbox, overlay, PendingChangesBar or the picker listbox (they mount client-side). These are verified in the real-route client pass (phase D) |
| X4 | Status tone keys `HOUSE_BOT_ACTIVE` (green) / `HOUSE_BOT_PAUSED` (amber) / `HOUSE_BOT_AUTO_PAUSED` (claret) / `HOUSE_BOT_REMOVED` (slate), because the flat namespace already has PAUSED for chains |
| X5 | Master switch `Toggle tone="brand"`, always paired with a visible state sentence. **No gold anywhere** in house-bot UI (no `<Toggle tone="gold">` exists; gold = earned money only). Scan house-bot files for gold/gilt in `test:house-bot-console` |
| X6 | The activity feed is an `.admin-tbl` inside `ScrollX`, not `FeedRow` (FeedRow truncates money and offers a gold variant) |
| X7 | Wizard progress = eyebrow "Step 2 of 4" + kit `ProgressBar` (no stepper exists; do not fork one) |

**Everywhere**
- Tokens only: no hex or `oklch` literals, no one-off `rounded-[…]`, no new CSS files or keyframes. Remember the overridden spacing scale (`h-7`=40, `p-4`=20).
- Money: `.amount` / `td.tabular`, `formatTzs` / `formatTzsSigned` (`formatTzsCompact` only in KPI tiles). Money is the second table column; no `min-w` on narrow tables.
- Times formatted on the server; countdowns client-side from ISO + `serverNow`. The zone suffix comes from the platform TZ.
- YES/NO and UP/DOWN words via `side-label.ts`, and green/rose only for sides. Claret only for Remove and AUTO_PAUSED. No aqua.
- Admin copy is English sentence case; player copy is en/sw/zh via `i18n-dict.ts`. No emoji, no raw enums.
- A11y: AA contrast on rendered ink, no opacity on subtle ink, tap ≥44 at ≤768, one focus ring, colour never the only signal, Swahili +40% fits, zero overflow at 320/360.
- **Traps:**
  1. Tailwind scans comments and `.ts` strings, so no class-shaped fragments in comments or copy.
  2. Client/server boundary: pure modules carry no `"use client"` and no server imports, and a build is not a render.
  3. In-flow picker listbox, never a portal inside cards.
  4. `hidden` on `.btn` does nothing.
  5. `MSYS_NO_PATHCONV=1` for route env values.
  6. Locale is the `kp-locale` cookie.
  7. One login per account in drives.

**Render and responsive verification, on this machine** (full detail in `03-design-spec.md` §7)
| Phase | What |
|---|---|
| A static | `tsc` + every design gate (ui-consistency, type-scale, tap-target, unsaved-changes, confirm-gate, admin-act-gate, section-rail, tab-anchors, validation-focus, filter-language, eyebrow-roles, popup-fit, chip-contract, labels, i18n, feedback-law, cert-devroutes, contrast, design-frozen, measure, reduce-motion, dead-css) |
| B build ≠ render | `npm run build && npm run start`: every public route plus `/legal/*` returns non-5xx with a real body; no server/client boundary error in the console; the CSS parses |
| C admin static harness | this build's sheet, same origin; `renderToStaticMarkup` fixtures; widths 320/360/640/768/1024/1280/1920; assertions: no overflow, no clipped or wrapped TZS, field heights 44, measure ≤640, children inside cards, one-line chips; `--sheet-missing` red control; every PNG opened and read |
| D real-route client pass | local Postgres + seeded owner + `next start` with `DISABLE_ADMIN_TOTP=true`, at 360/768/1280 without submitting: every modal, picker keys, guard on tab switch, focus return; plus `qa:chaos` and `qa:pending-bar`. If local login fails → record NOT MEASURED (never fall back to `next dev` for admin) |
| E player surfaces | `next dev` + `/auth/demo` ~~+ new dev-only `api/dev-test/seed-house-stake` (404 in production before its first await)~~. `kp-locale` en/sw/zh × 6 widths on `/positions`, `/markets/<id>`, `/wallet`, `/updown/history`~~, `/legal/*`, `/help`~~: ~~chip wraps, `houseStake` note (no "Selling closed"), signed-out view has no chip~~. Plus `responsive-audit` ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no chip and no `houseStake` note to check; a house stake renders exactly like the holder's own bet, and `qa:house-bot-holder-view` proves the holder's pages carry nothing house (D19c). No dev seed route is built: the marker is create-only, so the method is a scratch database filled through the real services (C5-SPEC rulings 248, 253). The rulebooks, Terms and FAQ keep their words on `main`, so this work puts nothing on `/legal/*` or `/help` to render (D19a). |
| F production (read-only, after merge) | `dpl=` SHA; `qa:dg-shell` / `qa:dg-measure` on `/admin/house-bots`; open the ON modal and cancel; picker + check card without designating; ~~legal pages in 3 locales;~~ every PNG read ⛔ **Superseded by D19 (Ali, 2026-09-16):** the legal pages keep their words on `main` (D19a), so there is nothing of this work to check on them. |

## 16. Decisions added 2026-09-13 (by Claude under D9)
| # | Decision | Precedent / reason |
|---|---|---|
| D10 | Password change → the console asks for the new password (§14). No platform-wide sign-out in this build | smallest change that meets the ask; E-381 risk |
| D11 | Any RG pause voids consent: fresh password + Start after it clears | RG outranks every other door (`wallet-service.ts:135-138`) |
| D12 | Holder bets on a market against their own bot → one admin alert per market (AlertOnce); their player path is never refused | I1 |
| D13 | Lowering a global cap is allowed, with a consequence preview; raising a bot cap above a set global cap is refused | risk-reducing edits never blocked |
| D14 | ~~House-liquidity regulator report + CSV ship in v1~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no house-liquidity report or CSV is built; the statutory reports treat house bot accounts as ordinary player accounts with no house memo (C5-SPEC rulings 199–213). | Ali reports everything to GBT |
| D15 | Build starts only when the other session's KYC-at-withdrawal work is on `origin/main` | hooks touch the same wallet-freeze and RG code |
| D16 | Master switch tone brand; holder-password field `new-password` + ignore attributes | §15 X5; password-manager trap |

## 16b. Decisions added 2026-09-14 (by Claude under D9, at Ali's request)
On 2026-09-14 Ali asked for two features: **Enter now** (pick a poll and enter it at the click) and **targeted polls with exact entry timing** (react a set number of seconds after a player's stake). Ali asked Claude to decide the details from the app's logic and architecture. The full specification is `04-amendments.md` N1–N2. The owner defaults Ali may override are rows W7–W16 in PROGRESS.md "Waiting on Ali"; the build uses them until Ali says otherwise.

### D17 · Enter now (a manual one-shot stake on a poll)
- An owner (any ADMIN passing `requireHouseOwner`) may press **Enter now** on an ACTIVE bot to place one house stake on a chosen LIVE **poll**, now, apart from the automatic modes. Enter now on Up & Down is not built (W9).
- **The server computes the side and the amount** from public pool data. Nobody types either.
  - The side is the thinner side, measured against locked money of eligible player accounts only, with a 7 s safety margin after each free exit closes.
  - On an empty poll, the side is the poll's single drawn side, shared with the automated OPENER.
  - The amount is the bot's saved Enter now stake, cut to fit.
- Every house gate applies, plus the information blackout, the staff-chosen caps (per bot and for all bots) and the counterparty share limit.
- One press places at most one stake. Every press, placed or refused, is kept as a record.
- **Supersedes** F6 §3.3 and §4 R5 ("never discretionary") as to the market and the moment only, never the side or the amount.

### D18 · Targeted polls and exact entry timing
- A bot may hold **targets**: explicit LIVE polls chosen in the MarketPicker (polls only, W13).
- For each target it reacts, as a COUNTER, to real players' stakes placed after the target is armed.
- Each target has its own whole-second delay of 5–600 s (fixed or a range), counted from the stake or from the moment the player's free exit closes.
- It **never lands before the player's free exit closes plus 7 s**: `dueAt = max(requested, exit close + LOCK_MARGIN_MS)`.
- Exact timing on Up & Down is the existing chain-scoped COUNTER delay with min = max (5–600 s).
- Cancelling a queued staff-chosen stake, or removing a target that has a queued reaction, is a **veto**. It needs a reason and writes a COMPLIANCE row, and that poll can never be targeted again by any bot.
- When the holder's consent is voided, every active target of that bot ends.
- Targeted reactions count toward the staff-chosen caps and alert every admin, exactly like Enter now.
- Early entry before the player's free exit closes is not built. Asking for it needs a new amendment and a COMPLIANCE ruling that amends A15.

### Accepted risks 13–20 (§13; the COMPLIANCE entry and HOUSE-BOTS.md take them verbatim)
13. **Selection edge, bounded not eliminated.** Staff choose the poll and the moment, and can decline after seeing the computed side. They can also see what players cannot: positions with owner names and phones on the admin market page, AML views, and AI poll data (reasoning, confidence, reviewer). The side can't be typed, but it can be matched by waiting until the thinner side is the side they favour. Bounds: the blackout (AI result check recorded, or market reopened), the formula side and amount, staff-chosen caps inside the locks, the counterparty share limit and pro-rata counterparty caps, a durable record of every press (placed or refused)~~, previews per officer, the vetoes register, and the monthly staff-edge scorecard with its alert (W16)~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the per-officer previews and vetoes sections and the monthly staff-edge scorecard with its alert are struck with R1 and the staff-edge alert (04 N1 §9 R1 sections (c), (f) and (h); C5-SPEC rulings 199–213, 218–223); the bounds before them stand, and each veto still writes its COMPLIANCE row (§18 "Cancel a queued stake").
14. New with D17: a person chooses the moment of an opener stake and of any stake; opening empty markets is already superseded (UPDOWN D3, automated OPENER).
15. **Void after a staff-chosen stake.** A single admin can still void or reopen a market holding one (no officer lock: I10 and the 2026-07-24 guardrail). Mitigation is ~~display, the R9 `houseStake.staffChosen` payload,~~ the `staff-stake-voided` alert ~~and an R1 row~~ only. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the display, the R9 payload and the R1 row are struck (C5-SPEC rulings 187–194, 199–213); the mitigation that stands is the `staff-stake-voided` admin alert.
16. **Amounts are deterministic,** so a repeated Enter now stake is recognisable (D6 fingerprint). With no jitter, an amount can't be re-rolled either.
17. **A fixed target delay makes reactions predictable.** The field hint recommends a range.
18. **Consumed trigger.** A target removed or ended after a trigger was decided consumes that trigger. No other bot may react to it (one COUNTER row per trigger).
19. **Counterparty concentration.** A staff-chosen stake can still be matched mostly against a few players' money. It is bounded by the share limit (refused when one account holds more than 50% of the locked opposite money, W15). It is also bounded by pro-rata counterparty caps: the stake counts toward the per-player daily counter limits of every account holding at least 25%.
20. **An officer may decide a market holding a stake they chose** (resolve, void, reopen or an objection ruling). There is no refusal (2026-07-24 guardrail, I10). The mitigations are ~~display, audit and~~ alert only: ~~the viewer sees "of which chosen by you", the decision audit records `requestedBy`, and~~ `staff-stake-self-decided` alerts every admin. ⛔ **Superseded by D20 (Ali, 2026-09-17):** the "of which chosen by you" display and the decision audit's `requestedBy` are struck (C5-SPEC rulings 187–193); the mitigation that stands is the `staff-stake-self-decided` alert to every admin, which the planner computes from the stakes, never from an R9 payload.

### Do not restore
- No human-typed side.
- No human-typed amount.
- No sizing against cancellable money: only locked money of eligible accounts counts, 7 s after its free exit closes.

## 17. Supporting documents and the new-session prompt
Right after this plan is approved, these files are copied to **`plans/house-bots/ (branch house-bots) `** (durable; committed on branch `house-bots` and worked on only in its own worktree, so
the parallel session can't sweep them):
- `PLAN.md`: this file.
- `00-NEW-SESSION-PROMPT.md`: the prompt below.
- `01-scenario-register.md`: 241 scenarios with expected behaviour and the test for each, plus `TGT-01`…`TGT-40` added 2026-09-14.
- `02-sealed-flows.md`: every flow, step by step.
- `03-design-spec.md`: screen-by-screen design and the render protocol.
- `04-amendments.md`: verified amendments A/C/R/P/S/F and N1–N2, all mandatory.

> ⚠️ **Superseded 2026-09-13:** the plan now lives on branch `house-bots` under `plans/house-bots/`. The authoritative prompt is `plans/house-bots/00-NEW-SESSION-PROMPT.md` and progress is tracked in `plans/house-bots/PROGRESS.md`. The block below is the original draft, kept for the record.

**Copy-paste prompt for the build session**
```
You are building "House Bots" for 50pick (C:\kipindi-main, LIVE real-money platform; push to main = live deploy).
Planning is finished and approved by Ali. Do not re-plan; execute, verify, report.

READ FIRST, IN ORDER
1. plans/house-bots/ (branch house-bots) PLAN.md  (the plan; §0 decisions and I1–I10 invariants are binding)
2. plans/house-bots/ (branch house-bots) 04-amendments.md  (verified amendments — every one is mandatory)
3. plans/house-bots/ (branch house-bots) 02-sealed-flows.md and 03-design-spec.md  (flow + design law for every screen)
4. plans/house-bots/ (branch house-bots) 01-scenario-register.md  (each scenario's "Test" line must exist as an assertion by the end)
5. Repo: CLAUDE.md, docs/COMPLIANCE-DECISIONS.md (newest entries), docs/F6-LIQUIDITY-DESIGN.md, docs/UPDOWN-FINAL-DESIGN.md §D3/§3b, docs/DESIGN_AUTHORITY.md, docs/TRAPS.md
Where documents disagree: amendments > sealed flows/design spec > plan body. Where any doc disagrees with the CODE, trust the code, say so, and fix the doc in the same commit.

PRECONDITIONS (stop and tell Ali if any fails)
- git fetch; the KYC-at-withdrawal work (commit ac411357 "KYC AT WITHDRAWAL (1/n)" and its follow-ups) is on origin/main (D15).
- git worktree list — another Claude session works in C:\kipindi-main. NEVER edit, stage, checkout or build there.

WORKING RULES
- Own worktree: git worktree add C:\kipindi-house-bots -b house-bots origin/main. Junction node_modules for tsx/tsc only (never npm run build through a junction; install for builds).
- Stage files BY NAME, never git add -A. Push the branch after every commit. Rebase on origin/main often.
- Build in the plan's §11 commit order (1→8), amendments placed per their "Commit placement" table.
- Per commit: implement → npx tsc --noEmit → the commit's new suites → npm run test:all → its red: harness (each mutation fails its OWN assertion) → run an adversarial review WORKFLOW on the diff with three lenses (money/concurrency, logic/integrity/exploitability, UX/visual/repo-gates); fix every confirmed finding → update docs/HOUSE-BOTS.md progress → commit → push branch.
- Green is not verification: drive real behaviour (local Postgres 127.0.0.1:5433 with a loopback-only guard) and render real screens per plan §15 phases A–F. Open and read every screenshot. Anything you could not measure is reported as NOT MEASURED, never as passed.
- Never quote a recorded number without re-deriving it. Never write class-shaped strings in comments (Tailwind scans them). Git Bash: MSYS_NO_PATHCONV=1 for /-leading env values; no heredoc'd Python writing backslashes.
- Money paths: read the bet-concurrency rules in market-service.ts before editing (abort must escape withLock; writes inside a lock take the caller's tx; emits after the outer lock).

RELEASE (commit 8 done, everything green and driven)
- Send Ali the release checklist and wait for his one-word go before: applying the two migrations to production (expand-only, re-runnable, from this machine) and merging house-bots into main.
- Merge at a quiet hour (one deploy; brief outage while overlapSeconds is null). Master switch stays OFF.
- Production read-only checks from plan §12 and §15 phase F. Verify the deployed SHA via the dpl= preload header.

REPORT BACK TO ALI (plain language, he is non-technical)
- What shipped, what was verified and how, what is NOT MEASURED, open risks, and exactly how to: designate a bot, set rules and limits, switch on, pause everything, re-verify after a password change.
- Update in the same pass: docs/HOUSE-BOTS.md (🟢), docs/COMPLIANCE-DECISIONS.md, docs/RULES.md, docs/FLOWS.md, docs/README.md, docs/LIVE-QA-CAMPAIGN.md §6b handoff, and the memory index.
```

## 18. Amendment reconciliation (verified sealing pass — binding)
**Precedence:** `04-amendments.md` > `02-sealed-flows.md` / `03-design-spec.md` > this plan body. Where two amendments overlap,
the resolution below is final.

**Corrections to this plan's own text**
- **§14 step 4:** "Status causes do not block re-verify" now reads: **an RG lockout (self-exclusion, cooling-off, `isLockedOut`) blocks re-verify, uncounted, until it ends** ("Can't ask for his password while he is on a break — until {date}"). Suspension, freeze and role causes still don't block it (A3 / C8).
- **§14 deep link:** `?reverify=1` is canonical; HashFocus still targets `id="reverify"` (C13 over the design spec's `#reverify`).
- **F9 kill switch:** replaced by A9.
  1. Autocommit OFF first, with no lock.
  2. Drain with `lock_timeout='3s'`.
  3. Cancel intents.
  4. Audit and alerts outside the locks.
  - DB unreachable → "House bots were NOT switched off — try again or turn on Maintenance mode". Fallback `ops:house-bots-off`.
- **§3 (k):** the extracted exit-window formula keeps `graceMs > 0` (A14). `cashOutValue` output must be byte-identical (golden grid).
- **§4.7 cutoffs:** Up & Down = `min(opensAt + D, selectionClosedAt ?? resolutionAt)`; a poll with a null `selectionClosedAt` is **out of scope** (A12).
- **§15 formatting:** all house-bot day/hour keys, schedules and console times use `src/lib/house-bot/clock.ts` (fixed EAT), an explicit exception like `report-pack.ts` (C14 over the design spec).

**Overlaps resolved**
| Topic | Resolution |
|---|---|
| Consent void (A3 ∪ C8) | `consentVoidAt`/`consentVoidCause` ∈ {SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW}; one predicate `consentValid = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)`, used by H2, Start, strip and `?reverify=1`; a void with an unchanged password still requires re-verify (never NOT_NEEDED) |
| Password history (A4 = C9) | `User.passwordSetAt` + `passwordSetVia` (REGISTRATION/SELF_CHANGE/RESET_LINK/OFFICER_TEMP/REHASH) + `emailSetByOfficerAt`, written in the same update as the hash; eligibility reads the columns (not the audit log); legacy nulls fall back to an awaited audit read that fails closed |
| Holder causes (A2 + C9) | one hook `holder-hook.ts onHolderAccountChanged` at every writer in A2's matrix + L2 sweep; `holderCauses()` → ordered live causes; `pauseReason` is history only; strip shows ≤3 causes + "and N more", each with its action |
| Holder can stop it himself (A3) | ~~new player action `withdrawHouseConsentAction` (ConfirmDialog on the holder chip, en/sw/zh)~~ → HOLDER_WITHDREW + void ⛔ **Superseded by D19 (Ali, 2026-09-16):** the holder-facing "Stop liquidity stakes" action is struck (D19c); a withdrawal the holder asks for through support is recorded with the officer as actor, reshaped in Commit 7 (C5-SPEC ruling 170, L49). |
| Closure / erasure (A5 + C9) | closure → auto-REMOVED, float line in alerts; erasure refused while a live bot exists, then pseudonymises house rows (ids, markers and amounts kept) |
| Owner guard (C12) | `requireHouseOwner()` returns REAUTH_LOGIN / REAUTH_TOTP / NOT_OWNER instead of redirecting; `STALE_BUILD` on `UnrecognizedActionError`; sessionStorage drafts (never passwords) |
| Numbers and text (C1, C2, C3) | one `parseWholeNumber` (no guessing on "10.000"), `HouseNumberField`, BigInt caps with CHECKs, NULL = not set; `normaliseLabel`/`labelKey` case-insensitive uniqueness; `normaliseTypedWord` shared by client and server |
| Live strip (C11) | admin has no SSE provider today, so the strip mounts `useEventStream` itself + a 20s status poll even while dirty; changes on a dirty page show a Callout instead of refreshing; uncertain-result handling; engine-health table |
| Bet context (A7) | `ctx: {kind:'player'…} \| {kind:'house'…}` with exhaustive handling; cash-only by construction; `stakeBoundsForMarket` extracted (identical output); stake-bound drift → SKIPPED, no alert |
| Engine robustness (A8, A10, A11, A13, A15, A16, A19, A24) | alert outbox (`alertedAt`); compile-time exhaustive mapper + `isEngineTransient`; `scopeFrom` so switching on never replays history; allowlisted `PublicMarketView`; fresh-price closeness against both targets; lifecycle table (reopen, void, chain stop, purge, missing wallet); audits outside locks from an allowlist; backlog lateness, admission backpressure, heartbeats per instance, clock-skew guard, replica-safe caps |
| Scope over time (C14) | explicit chain and category lists (new ones out of scope until added); `parseHouseBotRules` → RULES_FROM_FUTURE / RULES_OUTDATED / RULES_INVALID; live-derived bounds; cap windows named in hints |
| Release (A23) | KYC-at-withdrawal on origin/main first; preflight script; `houseBotSchemaReady()` gate (503 + engine idle if missing); rollback only with switch OFF and 0 open marked positions |
| Intent uniqueness (§2 "Uniqueness", N1 §2) | **Replaced by four named partial unique indexes:**<br>- `hbi_counter_anchor_uq` `("anchorKey") WHERE kind='COUNTER'`<br>- `hbi_fill_opener_anchor_uq` `("kind","anchorKey") WHERE kind IN ('FILL','OPENER') AND status<>'CANCELLED'`<br>- `hbi_manual_anchor_uq` `("anchorKey") WHERE kind='MANUAL'`, where anchorKey is `manual:<requestedById>:<submitId>`<br>- `hbi_manual_live_market_uq` `("marketId") WHERE kind='MANUAL' AND status IN ('PENDING','CLAIMED')`<br>**Other named unique indexes:** `hbe_opener_draw_uq`, `hbt_active_market_uq`, `hbp_actor_submit_uq`.<br>**Telling them apart:** callers go only by index name, through DAL `uniqueViolation(err)`. It reads 23505 from P2002 `meta.target` or P2010 `meta`, and the memory twin throws the same code and name. An unknown unique violation is rethrown. |
| Lateness (A24 `"dueAt" > now() − maxLateness`) | **Replaced by `staleAt`** (NOT NULL on every intent):<br>- COUNTER without target, FILL and OPENER: dueAt + 30 s (Up & Down) or + 600 s (polls)<br>- targeted COUNTER: dueAt + 60 s<br>- MANUAL: dueAt + 15 s<br>**Claims** filter `"staleAt" > now()`.<br>**In the seam,** the claimed row is re-read inside `house:control` before `markPlaced`, on the DB clock. `NOT ("staleAt" > clock_timestamp())` gives `house_intent_stale` → EXPIRED(STALE), with no alert.<br>**A24's rate-cap deferral** reads "the window frees before `staleAt`". |
| Transient retries vs poison (A10, A24) | BUSY, `rate_limited`, 55P03 and `isEngineTransient` requeues increment `transientAttempts`, not `attempts`. The claim filter `attempts < 3` is unchanged. The STALE expiry pass runs before POISON, and POISON applies only to `attempts >= 3` with an expired claim. MANUAL and targeted CLAIMED rows become EXPIRED(STALE) once `staleAt` + 5 s < now(), without waiting for `claimedUntil`. |
| OPENER side (§1-F4 "a random side") | Now "a random side drawn once per market". The planner calls `openerSide(marketId)` in its own autocommit statement before `decide()` and passes `{openerSide}` in; `decide.ts` stays pure and never imports the store. Enter now previews and presses read the same `hbe_opener_draw_uq` row, with `actorId` = the officer (null only for automated planning). |
| Start mode rule (§1-F3 "no mode is on"; 02 §3.3 item 6) | "No mode is on" is true only when every automatic mode, `enterNow.enabled` and `targeting.enabled` are all off. The Start confirm lists "Active targets: {n} →". |
| R9 / sanctioned change (q) | ⛔ **Superseded by D20 (Ali, 2026-09-17):** sanctioned change (q) is struck: no resolve, void, objection or bulk decision audit carries `houseStake` or `houseStakes`, and nothing displays it (C5-SPEC rulings 187–191, built in step 4 and un-built in checkpoint C5-5b). The original row follows, kept as the record. ~~**Payload** is exactly `houseStake:{yes:number,no:number,staffChosen:{yes:number,no:number,requestedBy:string[]}}`.<br>**With no house stake:** `{yes:0,no:0,staffChosen:{yes:0,no:0,requestedBy:[]}}`.<br>**For targets,** `requestedBy` = the officer who added the target.<br>**Use:** display, audit and alert only (I10).~~ |
| New sanctioned change (r) | `adminReopenMarket` (`market-service.ts:4000-4040`) sets `reopenedAt` and `reopenCount` in the same `marketStore.set(m)`; its output is otherwise byte-identical (seam test). A16's MARKET_REOPENED detection reads `reopenedAt` for every mode, replacing "an intent with MARKET_NOT_LIVE exists". |
| Privacy line (P1) | ~~Replaced by the N1 §10 line: stakes on markets chosen by an automated system or by 50pick staff. It folds into P1's version bump.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no privacy line and no version bump; the privacy notice keeps the words it has on `main` (D19a; W19 superseded, D19e). |
| I2 (engine never reads Sentinel fields) | Holds "except `blackout.ts` and the H3 site, whose only output is `{blocked:boolean}`". `decide.ts` receives `blocked` as an injected argument and never imports `blackout.ts` (source pin). |
| A13 token walker | Exempts `blackout.ts` by name, like `designation.ts`. Every other engine and picker module stays under the walker. |
| A15 locked pool → `lockedForHouse` | **Query:** one SQL aggregate on the lock transaction, grouped by side and also returning per-account shares. It sums `stake` over positions with `"marketId"=$1 AND status='OPEN' AND "houseBotId" IS NULL` whose exit-window expression ≤ clock_timestamp() − `LOCK_MARGIN_MS` (7000).<br>**Excluded accounts:** role ≠ PLAYER; holders of any non-REMOVED bot; accounts penalty-boxed today; recruits of any live bot's holder.<br>**Used by:** Enter now preview, fire and H3; the targeted COUNTER cut and H3; FILL, whose hold becomes the latest `exitCloseAt + LOCK_MARGIN_MS` among the stakes it counts (replaces A15 "FILL timing").<br>**Not used by** the untargeted COUNTER, which keeps A15 through the `lockedA15` column.<br>**Unchanged:** raw pools in the THIN formula stay the raw market pools. |
| I3 for staff-chosen sizing | **Concentration:** MANUAL THIN refuses `house_counterparty_concentration` when one account holds more than `gStaffChosenMaxCounterpartyShare` percent of `lockedForHouse(opposite)`. A NULL share refuses.<br>**Attribution:** the stake is attributed pro rata to every opposite-side account holding at least 25% of that money, and counts into COUNTERPARTY_COUNT/TZS for each. |
| §4.3 fast path | Poll triggers are decided only in the sweep. It reads targets fresh and compares `placedAt` with `effectiveFrom` using its DB watermark. The post-commit hook keeps Up & Down triggers only and is suspended while \|skew\| > 5 s. `TARGET_ARMING_SEC` stays 12. |
| H0 (§3) | **Ordered rule:**<br>1. The key equals `houseIntentKey(intentId)` and there is no `playStartedAt`.<br>2. The pre-lookup runs: same user and bot → `replayed:true`; another user or bot → `house_key_mismatch`.<br>3. The intent is loaded by id with no status filter. Missing, or `houseBotId`, `botUserId`, `marketId`, `side` or `stakeTzs` differing from ctx/opts → `house_key_mismatch`.<br>**Status is never part of H0.** A non-CLAIMED row proceeds, `markPlaced` returns 0 rows, and the result is `house_intent_superseded`. |
| §1-F5 step 9 stake clamp | **Write-back for every kind:** `UPDATE "HouseBotIntent" SET "stakeTzs"=$c, decision = decision \|\| jsonb_build_object('firedStakeTzs',$c) WHERE id=$1 AND status='CLAIMED' AND "claimedBy"=$me AND "stakeTzs">$c RETURNING *`.<br>**0 rows** → stop.<br>**Otherwise** `placeHouseBet` gets the returned row's `marketId`, `side` and `stakeTzs`.<br>**Never grows.** Below the minimum → SKIPPED(STAKE_BOUNDS_CHANGED) without calling the seam. |
| Fires per process (§4.2, A24 SIGTERM) | **Guards:** `fireClaimedIntent` throws inside a lock or an ambient admission slot.<br>**Accounting:** inline Enter now fires register in `globalThis.__50PICK_HOUSE_BOT_ENGINE.inFlight`, count toward `$freeSlots`, get the 30 s heartbeat and are excluded from the SIGTERM requeue.<br>**Status:** the modal's final status comes from `getEnterNowStatusAction`, never from the inline return value. |
| C4 submit claim | For Enter now, target add/update/remove and staff cancels, the AlertOnce `submit:<actor>:<submitId>` claim is replaced by `HouseBotPress`, unique on `hbp_actor_submit_uq`. The press is inserted CHECKING before any lock, its move to DONE is inside the write transaction, and a refusal is a separate conditional REFUSED update. `DUPLICATE_SUBMIT` is never silently ignored in these modals. C4 is unchanged for the password dialogs. |
| Commit 3 build rulings (2026-09-15) | The rulings the designation build took where the documents disagree or are silent are **`plans/house-bots/C3-SPEC.md` §6, rulings 1–38**, binding as rows of this table. Among them: re-verify tolerates suspension, freeze, role and the holder's own loss limit (C8 over A3's sentence, 21); `HOUSE_BOT` is not a money kind (13, W17); `verifiedAt` is the check time and the void stamp is always later than it (29, 30); the RG backstop also compares the end dates (31); a reset-link password reads the officer-email audit rows too (32); ~~the holder's letter has no button (33)~~. ⛔ **Superseded by D19 (Ali, 2026-09-16):** ruling 33 is moot, because the holder receives no letter (D19c; C4 ruling 149). The Commit 4 rulings are `C4-SPEC.md` §6. |
| Clearing limits (02 §3.8; C1) | **Exemption:** every staff-chosen cap, `gStaffChosenMaxCounterpartyShare`, `targetsMaxActive` and `gTargetsMaxActive` is exempt from "Can't clear a limit while bots are on" and from C1's refusal to clear a cap on an ACTIVE bot.<br>**Clearing** takes `house:control` briefly. Previews: staff-chosen caps "Enter now and targets will be off for every bot. {n} queued staff-chosen stakes will be skipped." (per bot: "for Bot A"); `targetsMaxActive` or `gTargetsMaxActive` "No target can be added until this is set. {n} active targets keep reacting — clear a staff-chosen limit to stop them betting."; `gStaffChosenMaxCounterpartyShare` "Enter now will be off for every bot. {n} queued Enter now stakes will be skipped."<br>**Master ON:** these caps are not required for it, and they are excluded from PLAN F3's "Set N global limits first" list. |
| Cancel a queued stake (02 §3.9) | **When the intent is staff-chosen** (MANUAL, or `targetId` not null), the cancel:<br>- requires a reason (5–300);<br>- writes COMPLIANCE `house_bot.staff_intent_cancelled {botId, marketId, intentId, side, stakeTzs}` and event STAFF_INTENT_CANCELLED, with the reason in the reason column;<br>- ends a linked target as ENDED(VETOED).<br>**Removing a target** with a PENDING or CLAIMED reaction also ends it VETOED, and writes one COMPLIANCE `house_bot.target_removed` whose `cancelled[]` lists the cancelled reactions.<br>**After a veto or removal,** that poll can never be targeted again by any bot. |
| Dialogs and refresh (03 S4 "RefreshPoller is disabled while any dialog is open") | Superseded by C11 plus N1 §8. Any open house-bot dialog counts as dirty in HouseBotFormContext, so C11 shows its change Callout instead of dispatching `50pick:refresh`, and runs exactly one refresh when the dialog closes. |
| A19 audits outside locks | **Target actions:** take `wallet:<botUser>` then `house:targets` (bets never take it), commit, then run the awaited COMPLIANCE audit and roster alert. They never take `house:control`.<br>**Source scan:** "no `audit(` inside a `withLock` callback" extends to `src/app/admin/house-bots/**` and `src/lib/server/house-bot/**`. |
| A23 schema gate | `houseBotSchemaReady()` and the preflight check 8 house tables (7th `HouseBotTarget`, 8th `HouseBotPress`), plus the new columns. |
| P2 Terms §10 notice text (Terms v2026-09-14) | P2 quotes §10 as promising "in-app + SMS" notice. Since Terms v2026-09-14 (the KYC audit's P1, all three languages), §10 promises written notice **in the app** only. ~~The COMPLIANCE House bots entry therefore names the in-app promise, and still cites `smsConfigured()` because no SMS channel could stand in.~~ The open defect is now the missing localised in-app notice channel. ⛔ **Superseded by D19 (Ali, 2026-09-16):** no rulebook or Terms text changes, so Terms §10's notice is not engaged and there is no waiver for the entry to name (D19a reverses D2/D7; 04 P2). |
| `uniqueViolation` reading (04 N1 §2: "the constraint named in its message") | **Refuted by code.** Probed 2026-09-14 on the scratch Postgres 18.3 with `@prisma/client` 6.19.3: a raw-SQL unique violation arrives as P2010 with `meta.code` "23505", and its `meta.message` is only Postgres's DETAIL, `Key (cols)=(vals) already exists.`, with no index name. This holds for `$queryRawUnsafe`, `$executeRawUnsafe` and interactive transactions; a 23514 CHECK violation does name its constraint. So the house DAL resolves the index inside its two raw-SQL doors, from the table the statement writes and the DETAIL's key columns (an intent `anchorKey` starting "manual:" is `hbi_manual_anchor_uq`, otherwise `hbi_counter_anchor_uq`), and re-raises the memory twin's named shape. Anything it cannot resolve to exactly one house index is rethrown untouched. Callers still read only `uniqueViolation(err)`. |
| C14 test row "paid exit 60 → never for polls" (Commit 1 critic, CC-16a) | **Refuted by code** (`MIN_SELECTION_WINDOW_MINUTES = 120`, `ai-poll-config.ts:41`). "Never" = no feasible stake instant on the shortest lifetime of the class. So a 120-min paid exit makes polls "never" and a 60-min one does not. |
| C2 emoji label test vs C2 charset (Commit 1 critic, CC-16b) | C2's test row "a 32-emoji label is valid, 33 is invalid" contradicts C2's own allowed characters (`\p{L}\p{M}\p{N}`, space and `- _ . # '`): an emoji is none of those, so it gets the charset error. **The charset wins.** The 32/33 length test uses the astral letter 𠀀 (U+20000), one code point in two UTF-16 units. Emoji stay valid in notes and reasons, which have no charset. |
| P1 "F6 §5 conditions 1–3" (Commit 1 critic, CC-33) | **Widened to conditions 1–4 and 6** after reading F6 §5 (`docs/F6-LIQUIDITY-DESIGN.md`), which lists six. Condition 1 (written GBT approval) is waived by owner ruling D1, not satisfied. Condition 4 (independent resolution) is replaced by I10 ~~display-only resolution~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** I10 keeps no officer-conflict lock and no longer displays house exposure to resolvers. ~~Condition 6 (a per-market label) is replaced by one rulebook and Terms disclosure line (D2, D6).~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** there is no per-market label and no rulebook or Terms disclosure line, so nothing public stands in for condition 6 (D19a, D19c). Condition 5 (caps and a kill switch) is built. |
| R3 fee withheld per bot (Commit 1 critic, CC-35) | ⛔ **Superseded by D20 (Ali, 2026-09-17):** the house reports that consumed this figure are struck and the console's book is left to Commit 7's rulings, so ruling 183's derivation stays only if checkpoint C5-5b names a remaining caller or a cited Commit 7 scope line for it (`C5-D20-REPLAN.md` §2, rulings 177–186). ⛔ **SUPERSEDED IN PLACE by C5-SPEC ruling 183 (2026-09-17) — the premise below is refuted by code.** Settlement books each winner's pre-allocated commission share as a `SETTLEMENT_COMMISSION` line in ledger group `settle_<payout txn id>`, and that payout transaction is marked. `houseBotBook.feeWithheldTzs` is DERIVED from the market's frozen fee snapshot and `allocateFeeShares` (the split settlement makes), null only where a winning market has no own snapshot, and proven equal to that ledger group per marked WIN position with zero tolerance (`test:house-bot-reports` §2, Postgres). The original row follows, kept as the record. ~~**Not derivable from Transaction rows:** a payout row writes `fee: 0` (`market-service.ts:3603`, the `BET_PAYOUT` create), and the commission ledger line carries no user and no transaction (`ledger.ts:423`). `houseBotBook.feeWithheldTzs` is null ("not recorded per stake") until commit 5 derives it from the pool fee snapshot × the position's share. `docs/HOUSE-BOTS.md` §8 cites this row.~~ |
| `RESOLVE_CLAIM_TTL_MS` in `market-service.ts` (04 N1 §4.1 "its private copy is deleted", Commit 2) | **Refuted by code.** Deleting the private copy would break `test:bulk-resolve` 7.6 (it reads the engine's own `const RESOLVE_CLAIM_TTL_MS = 10 * 60_000` from `market-service.ts` and compares it with the exported one) and its red mutation, and would add a value import cycle (`bulk-resolve-eligibility.ts` imports `decideAutoResolve` from `market-service.ts`). 7.6 already pins the two constants equal. So `blackout.ts` imports the exported constant and `market-service.ts` keeps its copy. |
| `buyPositionGuarded` (PLAN §3, Commit 2) | **Kept the existing name.** The guarded bet function is `buyPositionInner(userId, opts, ctx)`: `test:failure-reasons` 9f, `test:kyc-approved-copy` and `test:override-scope` locate it by that name. Only the context parameter is new; every other document's `buyPositionGuarded` means this function. |
| `withAdmission` "maxWaitMs: 0" (04 A24, Commit 2) | `withAdmission` took no options. It now takes `{maxWaitMs}`, which can only narrow the configured wait; `placeHouseBet` passes 0. |
| N2-a (Commit 1) | The sealed rule requires polls on and at least one category but seals no copy for that case; `rules.ts` uses N1-a's wording as `messages[3]`, "Targets are for polls: turn on polls and choose at least one category." Sealed message 0 cannot surface from `validateHouseBotRules` because the counter amount and trigger fields are non-nullable and report their own UNSET or bound error first. |

**Amendment index** (full text in `04-amendments.md`)
- **Blockers:**
  - A3 consent void and re-verify gating;
  - A9 bounded kill switch and lock timeouts;
  - A12 scope predicate and Up & Down lock refusal;
  - A14 exit-window formula;
  - C1 number parsing;
  - C8 RG voids consent.
- **Majors:**
  - A2 holder hook matrix; A4 password history; A5 closure/erasure; A7 bet context;
  - A8 alert outbox; A10 mapper; A11 scope start; A13 market view; A15 locked pool and fresh price;
  - A16 lifecycle; A17 wagering reversal ~~and labels~~; A19 engine audits; A21 holder vs own bot; A23 release; A24 runtime; ⛔ **Superseded by D19 (Ali, 2026-09-16):** A17's liquidity label is struck; its wagering reversal stands (D19c).
  - C9 holder causes; C10 switch and Start states; C11 live strip; C12 re-auth and deploy; C13 notification matrix;
  - C4 password attempts; C5 phone search.
- **Minors / records:**
  - A1 (no platform sign-out; hardening H1); A18; A20 retention; A22 recipients;
  - C2; C3; C6 limits consequences; C7 modals, routes and a11y; C14; C15 windows;
  - ~~R1 house-liquidity report + CSV; R2 exposure everywhere; R3 statutory notes;~~ R4 no prizes on house stakes; ⛔ **Superseded by D20 (Ali, 2026-09-17):** R1, R2 and R3 are struck (no house report or CSV, no house exposure line on any admin screen, no house statutory note); R4 stands, already built in the money seam.
  - ~~P1 disclosure completeness (privacy notice, versions, chatbot,~~ Board draft). ⛔ **Superseded by D19 (Ali, 2026-09-16):** P1 is struck (no privacy line, version bump, chatbot bullet, FAQ sentence or disclosure tracking, D19a); the private Board draft stays (D19b), and the chatbot gets only the guard against false assurances (D19d).
- **Reporting and public text (final set):**
  - ~~R5 data-rights export: a holder `houseLiquidity` section; trigger players get excluded days only;~~ a `PENALTY_BOXED` event kept 7 years. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R5 is struck with its owner-only internal record (C5-SPEC rulings 236–238, 240–242, 246); no export or record projects house data, the holder's and trigger players' doors carry nothing house (rulings 168–169 and 239's absence half), and the `PENALTY_BOXED` event stands.
  - R6 erasure leftovers: admin copy uses the `Player #` handle only; `house_bot_live` refusal; holder hook not gated by `HOUSE_BOT_ENGINE`.
  - R7 one `HOUSE_AUDIT` category table plus a payload allowlist; no label or name in the audit chain.
  - R8 ~~house reports and~~ the report pack read the durable audit table. ⛔ **Superseded by D20 (Ali, 2026-09-17):** there are no house reports; R8 stands for the report pack and RG engagement, which read the durable audit table (C5-SPEC rulings 214–216).
  - ~~R9 `houseStake` in resolve, void and objection audits; KYC card "of which liquidity stakes".~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** no decision audit carries `houseStake`, and the KYC card has no house line and `kycMoneyFacts` no house fields (C5-SPEC rulings 187–191, 197).
  - ~~P2 Terms §10 notice waived on Ali's ruling alone, with nothing broadcast, and the SMS-promise defect recorded.~~ ⛔ **Superseded by D19 (Ali, 2026-09-16):** no Terms text changes, so there is no §10 notice to waive (D19a); nothing is broadcast.
  - P3 DATA-RETENTION rows and a 30-day AlertOnce purge.
  - P4 RULES §2.11, FLOWS §9, FAILURE-INVENTORY §7.1, AGENT-PROGRAMME §5; doc-content tests move into `test:house-bot-disclosure`.
- **Release and verification:**
  - S1 **P0 before commit 1:** KYC-at-withdrawal on origin/main, production migration row checksum match, migration law (`lock_timeout 3s`, nullable, no defaults) + `test:house-bot-migrations`.
  - **S2 replaces §11 "Release" and the §17 RELEASE block:** steps R0–R6 with Ali's "go" at R0, `migrate deploy` from this machine at R2, schema-ready check at R3, one merge at R4, post-checks at R5, and a first-switch-on guide at R6.
  - S3 rollback plan and levers table + `ops:house-bots-status --drift` / `ops:house-bots-remark`.
  - S4 rehearsals: migrations under load, rollback, two processes, audit chain burst, two-admin ON.
  - S5 risks 8–12.
- **Future safeguards:**
  - F1 product default-deny policy.
  - F2 sunset via feature state + `ops:house-bots-sunset`.
  - F3 gate-parity table over every bet-path reason.
  - F4 rules migration: RULES_OUTDATED, owner-reviewed conversion only.
  - F5 live stake-bound revalidation.
  - F6 channel policy (never SMS for house-only notices).
  - F7 no module-scope state + fresh maintenance read.
  - F8 raw-SQL password writers walker.
  - F9 no prizes, cashback or rewards on house stakes.
- **Owner request 2026-09-14 (D17–D18, §16b):**
  - N1 Enter now: polls only; formula side and amount; `HouseBotPress`; staff-chosen caps; blackout.
  - N2 targeted polls and exact timing: `HouseBotTarget`; delays 5–600 s; absolute hold; vetoes.
- **Duplicates:** G1 = R5 and G2 = R9 ~~(R5 and R9 are the text to build)~~. ⛔ **Superseded by D20 (Ali, 2026-09-17):** R5 and R9, with their duplicates G1 and G2, are struck: nothing of R5 is built, and R9's built code is un-built in checkpoint C5-5b.
- **Complete:** `04-amendments.md` holds every set above.
