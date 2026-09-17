# Commit 4 · §5 steps 8 and 9 — emitters, channels, drain and wiring (working aid, not an authority)

> # ⛔ THE STAFF-EDGE ALERT IS STRUCK (D20)
> **Owner ruling D20 (Ali, 2026-09-17), just below D19: every report, statutory filing, admin count, finance or insights
> figure and harm/AML detector treats a house bot's account exactly like any player's account, and every admin-only
> house tool is dropped.** Struck here, marked in place: the `STAFF_EDGE` row of §1.3, the staff-edge half of
> `test:house-bot-comms` case 18 in §6 and open point E7 in §10 (C5-SPEC rulings 218–223, TGT-39; C4-SPEC ruling 78).
> Nothing else in this file is touched by D20 (its holder-facing rows are D19c's, C4-SPEC rulings 143–150). Read
> PROGRESS.md "OWNER RULING D20" and `plans/house-bots/C5-D20-REPLAN.md` first.

> Extracted read-only on 2026-09-15 (seventh session, OMEGA-COMPILE01) on branch `house-bots`, worktree
> `F:/kipindi-house-bots`. **This file is not an authority.** `04-amendments.md` (`04`) > `02-sealed-flows.md` (`02`) /
> `03-design-spec.md` (`03`) > `PLAN.md` (`PLAN`) > `01-scenario-register.md`; `C4-SPEC.md` rulings record what was
> already decided. Every `file:line` here was re-derived against the working tree this session and the line **text** is
> quoted so a drift is visible; re-derive again before editing.
>
> Goal: a builder implements §5 step 8 (A9 drain) and step 9 (emitters + wiring) from this file alone.

---

## 0 · What already exists, and what step 9 must not re-invent

| Thing | Where (re-derived) | Line text |
|---|---|---|
| `HOUSE_BOT` kind | `src/lib/server/comms-registry.ts:223` | `  "HOUSE_BOT",` |
| `HOUSE_BOT` ∉ `MONEY_KINDS` | `comms-registry.ts:228-236` | list ends `"BONUS", "AFFILIATE",` … `"VERDICT",` — no `HOUSE_BOT` (C4-SPEC ruling 13, W17; PLAN:378's "∈ MONEY_KINDS" is superseded) |
| `notifyHouseBotOwner` | `src/lib/server/notification-service.ts:2173` | `export async function notifyHouseBotOwner(userId: string, notice: HouseBotOwnerNotice, opts: { atMs?: number } = {}): Promise<StoredNotification \| null> {` |
| `HouseBotOwnerNotice` (8 kinds) | `notification-service.ts:2158-2159` | `  \| "designated" \| "started" \| "paused" \| "password_paused" \| "removed" \| "reverified" \| "verify_reserved" \| "withdrew";` |
| which owner notices email | `notification-service.ts:2162` | `const HOUSE_BOT_OWNER_EMAILED = ["designated", "removed", "reverified"] as const satisfies readonly HouseBotOwnerNotice[];` |
| RG gate on every holder notice | `notification-service.ts:2174-2175` | `  const { isLockedOut } = await import("./responsible-gambling");` / `  if ((await isLockedOut(userId)).locked) return null;` (04:1060, A2 04:92) |
| `notifyAdminsHouseBotErasureBlocked` | `notification-service.ts:2253` | `export async function notifyAdminsHouseBotErasureBlocked(opts: { botId: string; holderUserId: string }): Promise<number> {` — **the neighbour every new `notifyAdmins*` house emitter must look like** |
| recipient resolver | `src/lib/server/house-bot/alerts.ts:16-19` | `export async function houseBotAlertRecipients(): Promise<StoredUser[]> {` … `const admins = await db.user.listByRoles(["ADMIN"]);` … `return admins.filter((u) => u.role === "ADMIN");` |
| `{holder}` | `alerts.ts:25-27` | `export function playerHandle(userId: string): string {` → `displayLabel({ id: userId, displayName: null })` → `Player #TAIL` (R6 04:1249) |
| holder email template | `src/lib/server/email.ts:2249` | `export function houseBotOwnerHtml({ kind, at }: { kind: HouseBotOwnerEmailKind; at: string }): string {` — `wrap(eyebrow → heading → subtitle(en) → subtitleSw(sw) → detailRows([{label:"When"…}]))`, **no CTA** |
| admin email template | `email.ts:2265` | `export function houseBotErasureBlockedAdminHtml({ botId, holder, botUrl }: { botId: string; holder: string; botUrl: string }): string {` — `wrap(eyebrow → heading → subtitle → detailRows → ctaButton(botUrl, "Open the bot"))` |
| `notify()` | `notification-service.ts:81` | `export async function notify(input: NotifyInput, opts?: NotifyOptions): Promise<StoredNotification \| null> {` — swallows and logs; 90 s dedupe on (userId, kind, titleEn, bodyEn, href), `DEDUPE_WINDOW_MS = 90_000` at `:56` |
| `NotifyOptions` | `notification-service.ts:70-79` | `pushTag?: string; push?: boolean; dedupe?: boolean` |
| no bet receipt for a house stake | `market-service.ts:1718-1722` | `// H8 · no bet receipt, push or email for a house stake` / `// SEAM:receipts` / `if (ctx.kind === "house") {` — so `notifyHouseBotOwnerStake` is the holder's **only** per-stake notice |
| live throttle counter | `house-bot-dal.ts:1393` | `bumpHourCount(key: string): Promise<{ hourKey: string; count: number }>;` (atomic, EAT hour from the DB clock, both twins) |
| caps | `house-bot-dal.ts:150-151` | `bellAlertsPerHour: number;` / `holderNoticesPerHour: number;` — both CHECKed 0…60 (`:751-752`); defaults 20 / 6 (`:1870`) |
| runtime keys | `src/lib/house-bot/constants.ts:656` (`RUNTIME_KEY`) | `global: "global"`, `bot: (botId) => \`bot:${botId}\`` |
| AlertOnce keys | `constants.ts:656-719` (`ALERT_KEY`) | full list in §1.3 below |
| `runOutsideLock` | `src/lib/server/locks.ts:74` | `export function runOutsideLock<T>(fn: () => T): T {` |
| `runOutsideAdmission` | `src/lib/server/admission.ts:144` | `export function runOutsideAdmission<T>(fn: () => T): T {` |

**Not built yet:** every emitter except `notifyHouseBotOwner` and `notifyAdminsHouseBotErasureBlocked`;
`CHANNEL_POLICY` / `channelAllowed`; the A9 drain; the `instrumentation.ts` engine start; the lifecycle
`holderSweep` chore; every A2 hook call site; the Up & Down digest house split; the `test:house-bot-comms` and
`test:house-bot-holder-lifecycle` package.json keys.

---

## 1 · Every emitter to build

### 1.1 The injected alert interfaces, member by member → emitter

**`EngineAlerts`** — `src/lib/server/house-bot/outcomes.ts:66-77` (re-derived; the comment at `:65` reads
`/** What the engine tells people. Step 9 supplies the real emitters; tests inject recorders. */`).
Injected as `PlannerDeps.alerts` (`planner.ts:71`), `TriggerDeps.alerts` (`trigger.ts:62`),
`FireDeps.alerts` (`fire.ts:88` → `worker.ts:36`), `oversightPass(alerts, nowMs)` (`oversight.ts:79`),
`EngineTicks.hookAlerts` (`engine.ts:103`).

| # | Member (quoted) | Emitter(s) | Plan text? |
|---|---|---|---|
| 1 | `placed(intent: StoredHouseBotIntent): Promise<void>;` (`:68`) | **`notifyAdminsHouseBotBet`** (automatic rows) OR **`notifyAdminsHouseBotStaffChosen`** (`kind==='MANUAL' \|\| targetId != null`), **plus `notifyHouseBotOwnerStake`** always | PLAN:381/388; 04:3275-3276; 04:4177-4181 |
| 2 | `once(key: string, message: EngineAlertMessage): Promise<void>;` (`:70`) | **multiplexer** on `message.code` → `notifyAdminsHouseBotAlert` for 17 codes, `notifyAdminsHouseBotHourSummary` for `HOUR_SUMMARY_ADMINS`, `notifyHouseBotOwnerHourSummary` for `HOUR_SUMMARY_HOLDER` | PLAN:382/386; C13 04:1062 |
| 3 | `security(message: EngineAlertMessage): Promise<void>;` (`:72`) | **`notifyAdminsHouseBotSwitch`** (defect branch) — see **E1** | ⚠ **no plan row names it** |
| 4 | `botStopped(bot, change: { to: "AUTO_PAUSED" \| "REMOVED"; cause: PauseReason; cancelled: number })` (`:74`) | **`notifyAdminsHouseBotPaused`** + the holder's `paused` notice (except RG causes and `OWNER_LOSS_LIMIT`) | PLAN:383; C13 04:1046; 02 F6 02:413-416 |
| 5 | `switchedOff(change: { cause: OffCause; cancelled: number })` (`:76`) | **`notifyAdminsHouseBotSwitch`** (money branch) | PLAN:384; ruling 111 |

`EngineAlertMessage` is `outcomes.ts:79`:
`export type EngineAlertMessage = { code: string; botId?: string | null; intentId?: string | null; marketId?: string | null; detail?: Record<string, unknown> };`

**`HolderAlerts`** — `src/lib/server/house-bot/holder-hook.ts:49-68`. Injected as `applyHolderCauses(read, {detectedBy, alerts})`
(`:148`), `onHolderAccountChangedWith(userId, event, {alerts, meta})` (`:367`), `holderSweep({alerts})` (`:389`),
`breakEnded(read, alerts)` (`:351`).

| # | Member (quoted) | Emitter | Plan text? |
|---|---|---|---|
| 1 | `passwordPaused(bot, change: { method: CredentialChangedVia; changedAt: string \| null; cancelled: number })` (`:51`) | **`notifyAdminsHouseBotPaused`**, A1 branch | 02:106; PLAN:592 |
| 2 | `passwordChanged(bot, change: { method: CredentialChangedVia; changedAt: string \| null })` (`:53`) | **`notifyAdminsHouseBotPaused`**, A2 branch (bell only, no email) — see **E2** | 02:107-108 give the copy; ⚠ no plan row names the emitter |
| 3 | `botStopped: EngineAlerts["botStopped"];` (`:55`) | as `EngineAlerts` #4 | — |
| 4 | `causeAdded(bot, cause: HolderCause): Promise<void>;` (`:57`) | **`notifyAdminsHouseBotPaused`**, cause-added branch; bell only, **+ email for A2 rows 5, 11, 14** | A2 04:90; C13 04:1047-1048; ⚠ no plan row names the emitter (**E2**) |
| 5 | `causeCleared(bot, code: HolderCauseCode): Promise<void>;` (`:59`) | **`notifyAdminsHouseBotAlert`**, code `CAUSE_CLEARED` | C13 04:1049 gives the copy; ⚠ no emitter named (**E2**) |
| 6 | `holderLockedOut(bot: StoredHouseBot): Promise<void>;` (`:61`) | **`notifyAdminsHouseBotAlert`**, code `HOLDER_LOCKED_OUT` | C13 04:1050 — copy needs `{t}`, **the member passes no `until`** (**E3**) |
| 7 | `officerSetEmail(bot: StoredHouseBot): Promise<void>;` (`:63`) | **`notifyAdminsHouseBotAlert`**, code `OFFICER_SET_EMAIL` | A2 row 17 04:112 "bell only if officer-set"; ⚠ **no copy anywhere** (**E2**) |
| 8 | `breakEnded(bot, untilIso: string): Promise<void>;` (`:65`) | **`notifyAdminsHouseBotAlert`**, code `RG_ENDED` | C8; C13 04:1049; ruling 16 |
| 9 | `holderNotice(userId: string, notice: HolderNoticeKind): Promise<void>;` (`:67`) | **`notifyHouseBotOwner(userId, notice)`** directly | PLAN:387; ruling 132 |

`HolderNoticeKind` is `holder-hook.ts:46`:
`export type HolderNoticeKind = Extract<HouseBotOwnerNotice, "password_paused" | "removed"> | "password_temp" | "role_changed" | "erasure_request";`
— the last three **do not exist** in `HouseBotOwnerNotice` yet (ruling 132, 04:4132 area / C4-SPEC:412). `holder-hook.ts` compiles
today only because the union widens; adding them to `HouseBotOwnerNotice` is step 9's job.

**No member is unmapped**, but members 3, 2(Holder), 4(Holder), 5(Holder), 6(Holder), 7(Holder) have no plan-named
emitter or no copy — flagged as **E1–E3**.

### 1.2 The ten (+3) emitters

All thirteen are exported from **`src/lib/server/notification-service.ts`** (`test:cert-c3` §1 discovers
`Object.keys(N).filter(k => k.startsWith("notify"))` at `scripts/comms-notification-truth.test.mts:161`, and
`test:kyc-copy-truth` §6 walks that file's literals at `scripts/kyc-copy-truth.test.mts:1122-1129`) — see **E14**.

Legend: **cap** = counted against `bumpHourCount`. **Sev** = the bell tone the console will read.

| Emitter | Implements | Recipients | Channels (F6) | Cap / AlertOnce key | Sev | Copy (en) | Link | Template to reuse |
|---|---|---|---|---|---|---|---|---|
| `notifyAdminsHouseBotBet` | `EngineAlerts.placed` for `kind<>'MANUAL' AND targetId IS NULL` | `houseBotAlertRecipients()` | bell only; never email, never SMS | `bumpHourCount(RUNTIME_KEY.global)`, send while `count <= control.bellAlertsPerHour`; **A8 `alertedAt` already claimed by fire** (04:254-255) | info | Title: `label · side · TZS · market · HH:MM:SS · intent ref` — "unique title (label · side · TZS · market · HH:MM:SS · intent ref)" PLAN:381. Title must survive the 90 s dedupe (04:3735) | `/admin/house-bots/<botId>?tab=activity&range=all&intent=<intentId>` (04:1929; C7 overrides 02:445's `#hbi_`) | none (bell only) |
| `notifyAdminsHouseBotStaffChosen` | `EngineAlerts.placed` for `kind='MANUAL' OR targetId IS NOT NULL` | every recipient | bell **+ email**, **uncapped, not counted in `countInHour`** (04:3275, 04:4178) | none (A8 claim is the dedupe) | info | Title `Staff-chosen · Bot "{label}" {SIDE} TZS {x} on {market} · {Enter now by {name} \| target by {name}} · {HH:MM:SS} · {intent ref}`. Body `Placed at {HH:MM:SS} EAT. Side rule: {the thinner side — players' locked money YES TZS {y} · NO TZS {n} \| an empty poll — side drawn once for this poll \| a counter to Player #{handle}'s TZS {t} {SIDE} stake}. Reason recorded in the activity feed →` (04:3275). A targeted row adds ` (asked {delay}, held to {h})` after the side rule (04:4179). **Never quotes the officer's reason** (04:3299, 04:3734) | `/admin/house-bots/<botId>?tab=activity&range=all&intent=<intentId>` (04:3275, 04:4180) | `houseBotErasureBlockedAdminHtml` shape (eyebrow → heading → subtitle → detailRows → ctaButton) |
| `notifyAdminsHouseBotHourSummary` | `EngineAlerts.once` code `HOUR_SUMMARY_ADMINS` | every recipient | bell only (PLAN:382) — see **E13** | claimed by `alertOnce(ALERT_KEY.summary("admins","all"), …)` in `planner.ts` `hourlyDuties` (already built) | info | "N automatic stakes beyond the cap" from `detail {fromIso, toIso, count, stakeTzs, beyondCap, staffChosen}` (see `planner.ts` tail, `hourlyDuties`); add `"{s} staff-chosen stakes were alerted one by one"` when `s > 0` (04:3277) | `/admin/house-bots?tab=activity&range=custom&from=<H:00>&to=<H+1:00>` (ruling 81; 04:1928) | none |
| `notifyAdminsHouseBotPaused` | `EngineAlerts.botStopped`; `HolderAlerts.passwordPaused` / `passwordChanged` / `causeAdded` | every recipient | **auto-pause of an ACTIVE bot: bell + email**; **cause added to a non-ACTIVE bot: bell**, + email for A2 rows 5 (ACCOUNT_CLOSED), 11 (IDENTITY_REFUSED), 14 (HOLDER_ERASURE_REQUEST) (04:1046-1048, 04:90). Never capped (PLAN:383) | the caller claims: `pw:<botId>:<fingerprint>` for A1/A2 (`ALERT_KEY.password`), `bot:<id>:CAUSE:<code>:<eventId>` for a cause | warning (claret for REMOVED) | §2 below for A1/A2. Other causes, 02:414: title `House bot "{label}" auto-paused — {cause} · {HH:MM:SS}`; body gives the cause, its end date if known, the number of stakes cancelled, and the way back. CONSENT_VOID bodies add `"Its {n} active targets were ended."` when n > 0 (04:4176) | password or C8 void → `/admin/house-bots/<id>?reverify=1`; every other pause → `/admin/house-bots/<id>` (04:1064, ruling 14 — **`?reverify=1` replaces 03:275's `#reverify`**) | one new parametrised admin template (see **E6**) |
| `notifyAdminsHouseBotSwitch` | `EngineAlerts.switchedOff`, `EngineAlerts.security`, and the A9 OFF drain (step 8) | every recipient | bell + email; never capped | none (one per switch event) | ON: info; OFF(MANUAL/LOSS): warning; OFF(ENGINE_FAULT/ENGINE_ERRORS): **danger/SECURITY** | ON (02:374): `House bots switched ON by {name} · {HH:MM:SS}` / `Reason: "{reason}". {n} bots active.` OFF (02:380 + A9 04:275-276): "House bots are off. No bot will place a bet." / drain timeout: "Switched off. A bet already in its final step may still complete." Automatic switch-offs **name their cause** (02:380) | `/admin/house-bots` (PLAN:384, 02:448) | same admin template |
| `notifyAdminsHouseBotMoneyEvent` | F7 money hooks (step 10; the emitter lands in step 9) | every recipient | bell + email; **never capped**; ACTIVE bots only (02:427) | none — "two identical events produce two rows" (02:429), so **`dedupe: false`** on `notify()` and a unique txn id in the body | info | 02:428: `House bot "{label}": {holder} {event} TZS {x} · {HH:MM:SS}` / `Transaction {txnId}. Balance now TZS {bal}.` plus an `OWNER_MONEY` event | `/admin/transactions?q=<txnId>&range=all` (04:1927 overrides PLAN:385 and 02:449) | same admin template |
| `notifyAdminsHouseBotAlert` | `EngineAlerts.once` (17 codes), `EngineAlerts.security` fallback, `HolderAlerts.causeCleared` / `holderLockedOut` / `officerSetEmail` / `breakEnded` | every recipient | bell + email (PLAN:386) | key **already claimed by the caller** (`alertOnce` at `outcomes.ts:101-113` / `claimThen` at `holder-hook.ts:102-110`) — the emitter never claims. A failed send releases the claim, **except** `PENALTY_BOXED` (ruling 117: "a failed send never releases the claim, because that row IS the box") | info → danger by code | one `satisfies Record<AlertCode, Copy>` table (**E5**); the codes and their `detail` are §1.3 | default `/admin/house-bots/<botId>?tab=activity&range=all&outcome=failed&intent=<intentId>` (ruling 14; C13 04:1065); per-code overrides in §1.3 | same admin template |
| `notifyAdminsHouseBotRoster` | commit-7 console actions + commit-3 designation (no commit-4 producer — **E8**) | every recipient passing C12's predicate | bell + email, **uncapped**, title ends `HH:MM:SS` (04:1053, 04:4167) | none | info | Events: DESIGNATED, VERIFIED, STARTED, manual PAUSED, REMOVED, RULES_SAVED / LIMITS_SAVED with a diff — e.g. `"Bot A: daily loss cap TZS 50,000 → TZS 200,000 by Juma M. at 14:02:11 EAT"` (04:1054). Targets (04:4170-4173): `"Bot A: target added on "{title}" — 10 s after each stake (held to 5:07), first stake only · by {name} at 14:02:11 EAT"`; `"…changed — delay 10 s → 20–40 s · by {name} at 14:05:40 EAT"`; `"…removed · by {name} at 14:09:03 EAT"`; `"…stopped with {n} queued reaction(s) cancelled (veto) · by {name} at 14:09:03 EAT"`. Body ends `"Reason recorded in this bot's history →"` and never quotes the reason (04:4174) | `/admin/house-bots/<botId>?tab=history&event=<eventId>` (04:1055, 04:4168) | same admin template |
| `notifyHouseBotOwnerStake` | `EngineAlerts.placed` (always) | the holder | **bell + push**, never email, never SMS; returns early while `isLockedOut` (04:3282) | `bumpHourCount(RUNTIME_KEY.bot(botId))`, send while `count <= control.holderNoticesPerHour`; **0 = summary only** (`planner.ts` `hourlyDuties`: `const over = cap === 0 ? r.count : Math.max(0, r.count - cap);`) | info | en/sw/zh; **identical for a staff-chosen row — "it never says a person chose"** (04:3282) | `/positions/<positionId>` (PLAN:388, 04:1066 "the route exists") | none (bell + push) |
| `notifyHouseBotOwnerHourSummary` | `EngineAlerts.once` code `HOUR_SUMMARY_HOLDER` | the holder | **bell only** (ruling 17: "house-only notices send no email"; F6 04:1720's "email only through the summary" is a ceiling, not a requirement) | claimed by `alertOnce(ALERT_KEY.summary("holder", botId), …)` in `hourlyDuties` | info | PLAN:389: `"50pick placed N liquidity stakes (TZS X) from your account between HH:00 and HH:00"`; en/sw/zh | `/positions` (PLAN:389; C13 04:1066) | none |
| `notifyHouseBotOwner` + kind `password_temp` | ruling 132, A2 row 3 | the holder | bell + push | `notify()` default dedupe | info | en: `"Change the temporary password in Account settings"` (04:98, C4-SPEC:412). sw/zh **must be written and marked for native review** | `/positions` | `houseBotOwnerHtml` — **not emailed**, so no template row |
| `notifyHouseBotOwner` + kind `role_changed` | ruling 132, A2 rows 12–13 | the holder | bell + push | default | info | en: a `"role changed"` notice (04:107-108). sw/zh to write, native review | `/positions` | — |
| `notifyHouseBotOwner` + kind `erasure_request` | ruling 132, A2 row 14 | the holder | bell + push | default | info | en: `"stopped while we handle your request"` (04:109). sw/zh to write, native review | `/positions` | — |

> ⚠ **`notifyAdminsHouseBotManualEntry` does not exist.** 04:3275 says `notifyAdminsHouseBotStaffChosen` is "renamed
> from `notifyAdminsHouseBotManualEntry`" — there is nothing to rename; build the new name only.

### 1.3 Every `EngineAlerts.once` code the emitter must render

Derived by grepping the engine for `code: "…"` inside `alertOnce(` / `alerts.once(` calls. `AlertOnce` keys are
`ALERT_KEY.*` at `src/lib/house-bot/constants.ts:656-719`.

| Code | Raised at | AlertOnce key | `detail` carried | Copy source | Href |
|---|---|---|---|---|---|
| `ENGINE_DB_TRANSIENT` | `outcomes.ts:235` | `ALERT_KEY.engineDb()` = `engine:db` + EAT hour | `{}`, `intentId` | A10 | engine alert default |
| `HOLDER_CONTENTION` | `outcomes.ts:240` (`count >= 2`) | `ALERT_KEY.botDaily(botId,"HOLDER_CONTENTION")` | — | A10 | bot activity |
| `UNMAPPED_REFUSAL` | `outcomes.ts:250` | `ALERT_KEY.botDaily(botId,"UNMAPPED_REFUSAL")` | `{ reason }` | ruling 54 | engine alert default |
| `PENALTY_BOXED` | `outcomes.ts:274-277` (`boxAccount`) | `ALERT_KEY.penalty(userId)` + EAT day | `{ cause, day, handle }` — `handle` is `playerHandle` (D6: no position ids) | PLAN:231, ruling 107 | `/admin/markets/<marketId>` |
| `ENGINE_ERRORS` | `outcomes.ts:310` → `engineSwitchOff` → `alerts.security` | — | `{ streak }` | A24 | `/admin/house-bots` |
| `STAKE_NOT_WHOLE` | `outcomes.ts:335` | `ALERT_KEY.stakeNotWhole(botId)` + EAT day | — | A7, ruling 34 | engine alert default |
| `ANOMALY` | `outcomes.ts:341` | `ALERT_KEY.botDaily(botId,"ANOMALY")` | `{ reason: key }` | A10 | engine alert default |
| `POISON` | `planner.ts:244` | `ALERT_KEY.poison(intentId)` | — | A10, ruling 73 | engine alert default |
| `RULES_FROM_FUTURE` | `planner.ts:370` | `ALERT_KEY.rulesFuture(botId, version)` | `{ version }` | F4, ruling 100 | bot rules tab |
| `LIMITS_FROM_FUTURE` | `planner.ts:380` | `ALERT_KEY.rulesFuture("global", v)` | `{ version }` | F4 | `/admin/house-bots?tab=limits` |
| `BOUNDS_CLAMP` | `planner.ts:409` | `ALERT_KEY.boundsClamp(botId, hash)` | `{ liveMaxTzs, stakeMaxTzs }` | F5, ruling 84 | bot rules tab |
| `BOUNDS_CANT_FIT` | `planner.ts:419` | `ALERT_KEY.boundsCantFit(botId, field, hash)` | `{ field, liveMinTzs, valueTzs }` | N1 §5, ruling 84 | bot rules tab |
| `SETTLE_BLOCKED` | `planner.ts:467` | `ALERT_KEY.settleBlocked(botId)` + EAT day | `{ openStakeTzs }` | A16 HB-LC-10, ruling 112 — **danger**; "the alert carries counts only; step 9's emitter lists the markets" | bot money tab |
| `HOUR_SUMMARY_ADMINS` | `planner.ts` `hourlyDuties` | `ALERT_KEY.summary("admins","all")` + `previousHour` | `{ fromIso, toIso, count, stakeTzs, beyondCap, staffChosen }` | C13 04:1062 | → `notifyAdminsHouseBotHourSummary` |
| `HOUR_SUMMARY_HOLDER` | `planner.ts` `hourlyDuties` | `ALERT_KEY.summary("holder", botId)` + `previousHour` | `{ fromIso, toIso, count, stakeTzs, beyondCap }` | C13 | → `notifyHouseBotOwnerHourSummary` |
| `STAFF_STAKE_VOIDED` | `oversight.ts:112-114` | `ALERT_KEY.staffStakeVoided(marketId)` | `{ action, atIso, side, stakeTzs, titleEn }` | 04:3279 — `"Market "{title}" holding a staff-chosen house stake ({SIDE} TZS {x}, Bot "{label}") was {voided \| reopened} at {HH:MM} EAT."` | `/admin/markets/<marketId>` |
| `STAFF_STAKE_SELF_DECIDED` | `oversight.ts:132-134` | `ALERT_KEY.staffStakeSelfDecided(marketId, action)` | `{ action, actorId, atIso, requestedBy[], titleEn }` | 04:3280 — `"Market "{title}" holding a house stake chosen by {name} was {resolved {OUTCOME} \| voided \| reopened \| objection upheld \| objection rejected} by {name} at {HH:MM} EAT. This is a record only; nothing was refused."` | `/admin/markets/<marketId>` |
| `HOLDER_AGAINST_BOT` | `trigger.ts:297` | `ALERT_KEY.holderAgainst(botId, marketId)` (no day suffix) | `{ side, stakeTzs, botSide, botStakeTzs }` | A21 04:554 / C13 04:1051 — `"Holder of Bot A staked TZS 20,000 UP against Bot A's TZS 8,000 DOWN on BTC 5-min #412."` **bell + email** | `/admin/markets/<marketId>` (ruling 15) |
| `UD_ORPHAN_MARKET` | `trigger.ts:328` | `ALERT_KEY.udOrphanMarket(marketId)` | — | A12, ruling 90 | `/admin/markets/<marketId>` |
| `PRODUCT_DENIED` | `trigger.ts:330` | `ALERT_KEY.productDenied(value)` + EAT day | `{ productLine }` | ruling 90 | `/admin/house-bots?tab=limits` |
| `UD_BORN_UNLOCKED` | `trigger.ts:334` | `ALERT_KEY.udBornUnlocked(roundId)` | `{ roundId }` | A12, ruling 90 | `/admin/markets/<marketId>` |
| ~~`STAFF_EDGE`~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** struck — the staff-edge alert is never raised or rendered (C5-SPEC rulings 218–223, TGT-39; C4-SPEC ruling 78). | ~~**no commit-4 producer** (ruling 78: the pass is Commit 5)~~ | ~~`ALERT_KEY.staffEdge(officerId)` + `previousMonth`~~ | ~~`{ month, settled, winPct, autoPct, netTzs }`~~ | ~~04:3281 — `"{name}'s staff-chosen stakes placed in {Month YYYY}: {n} settled, {w}% won against {a}% for automatic stakes on the same products; net {±TZS x}. See the staff-chosen scorecard →"`~~ | ~~`/admin/reports?tab=library&range=custom&from=<YYYY-MM-01>&to=<YYYY-MM-last>` — **E7**~~ |

Holder-hook codes (claimed in `holder-hook.ts`, not by `alertOnce`): `CAUSE_CLEARED`
(`ALERT_KEY.cleared(botId, cause, clearedAtIso)`), `HOLDER_LOCKED_OUT` (`ALERT_KEY.holderLocked(botId)` + EAT day),
`OFFICER_SET_EMAIL` (`bot:<id>:OFFICER_EMAIL:<stamp>`, `holder-hook.ts:338`), `RG_ENDED`
(`ALERT_KEY.rgEnded(botId, coolingOffUntilIso)`), `CAUSE_ADDED` (`bot:<id>:CAUSE:<code>:<eventId>`,
`holder-hook.ts:269`).

⛔ **`code:` literal trap (ruling 55).** `test:failure-reasons` §9b (`scripts/failure-reasons.test.mts:776-846`) walks
`src/lib/server` for any token in a `code:` position and asserts six **deleted** rows are still emitted by nothing:
`DOC_IMAGE`, `DOC_TOO_LARGE`, `DOCS_LOCKED`, `NO_EXTRA_REQUEST`, `NIDA_TAKEN`, **`MAINTENANCE`**
(`:844-845`). **Never name an alert code any of those six.** None above collides.

### 1.3b Copy rules that bind every admin house emitter

- `{holder}` is always `playerHandle(userId)` → `"Player #A3F2K8"`. **Never** `displayLabel` with a name, `maskName`
  or a phone (R6 04:1249; 04:3300; `alerts.ts:22-24`).
- Bodies **never quote an officer's reason** (INT-10; 04:3299, 04:4174, 04:3734: "a reason seeded with NEEDLE never
  appears in a body, and bodies end 'Reason recorded in the activity feed →'").
- HOUSE_BOT is **never SMS** (04:1061; 04:3301).
- Every `href` must still render its event **60 days later** (04:1077, 04:3302, 04:4184) — including `?tab=history&event=`.
- Bell titles must be **unique per event** or the 90 s dedupe eats a real second transition (04:1076, 04:3735,
  `notification-service.ts:56` + `:81-35`). The `HH:MM:SS` suffix on roster and per-bet titles is what makes them unique.
- Limits hint under bell alerts/hour (C13 04:1068): `"At {n} per hour each admin can get up to {24n} bet rows a day,
  plus summaries and pause, money and switch alerts."` (a console string, not a bell body).
- **No emoji, no `{placeholder}` left unreplaced, no `undefined`/`NaN`/`[object Object]`, every row has an `href`
  starting `/`** — `scripts/comms-notification-truth.test.mts:194-204`.

---

## 2 · A1 and A2 (02 §2.2–2.3, 02:87-117; PLAN §14 PLAN:582-593)

### 2.1 The four rows of the 02 §2.2 table, verbatim

| Bot status before | After | Queued stakes | Event · audit | Admins | Holder |
|---|---|---|---|---|---|
| **ACTIVE** (02:91) | `AUTO_PAUSED(PASSWORD_CHANGED)`; `pausedFromStatus=ACTIVE`; details `{method, changedAt, detectedBy, officerReset}` | `PENDING` and `CLAIMED` → `CANCELLED` (conditional writes) | `AUTO_PAUSED` · COMPLIANCE `house_bot.auto_paused` | **A1, bell + email** | **H1, bell + push** |
| **PAUSED (NEW or MANUAL)** (02:92) | Status and reason unchanged; `credentialChangedAt` and method recorded | none queued | `CREDENTIAL_CHANGED` · SECURITY `house_bot.credential_changed` | **A2** | none |
| **AUTO_PAUSED(PASSWORD_CHANGED), changed again** (02:93) | Details updated to the newest change | — | `CREDENTIAL_CHANGED` | **A1 again (new key per X4)** | none |
| **AUTO_PAUSED (any other reason)** (02:94) | Reason kept; credential fields set | — | `CREDENTIAL_CHANGED` | **A2** | none |

Two further rows of the same table that step 9's copy must cover:
- **erased** (02:95): `"Any status, account erased | erased=true. Erasure needs a closed account (erasure.ts:114), so
  the bot is already ACCOUNT_BLOCKED | — | CREDENTIAL_CHANGED | A2, erased wording | none (his inbox is deleted,
  erasure.ts:369)"`. Strip copy for the same state, 02:139: `"This account has no password (erased or never set). It
  can't be verified — remove the bot."` The **A2 erased wording** must say the bot can only be **removed** (PLAN:589:
  `"Erased / no password | only Remove | A2 erased wording"`).
- **REMOVED** (02:96): nothing.

### 2.2 The exact titles and bodies (02:104-109)

| Id | Title | Body | Link |
|---|---|---|---|
| **A1** | `House bot "{label}" paused — password changed · {HH:MM:SS}` | `{holder} changed his 50pick password {how} at {HH:MM} EAT on {D MMM}. The bot stopped and cancelled {n} queued stake(s). No bet will be placed until you enter his new password.` | `/admin/house-bots/{id}?reverify=1`; email button **"Enter new password"** |
| **A2** | `House bot "{label}": holder changed his password · {HH:MM:SS}` | `The bot is {Paused / Auto-paused: cause}, so nothing stopped. Enter his new password before it can run again.` | same |
| **A2, officer reset** | same title as A2 | `Support gave him a temporary password ({officer}, {HH:MM}). That is not his consent. Ask him to set his own password in Account settings, then enter it.` | `/admin/house-bots/{id}` (**no modal**) |
| **H1** | `"Liquidity stakes paused"` | `"Your password changed, so 50pick stopped placing liquidity stakes from your account. Your balance and open stakes are unchanged."` | `/positions` |

`{how}` (02:111-115): **SETTINGS** → `"in his account settings"`; **RESET_LINK** → `"with a reset link"`;
**OFFICER_RESET** → `"— support issued a temporary password"`; **UNKNOWN** → left out.

⚠ The `CredentialChangedVia` values the code actually passes are `SELF_CHANGE` / `RESET_LINK` / `OFFICER_TEMP`
(`holder-hook.ts:193` writes `officerReset: first.method === "OFFICER_TEMP"`). Map `SELF_CHANGE → SETTINGS` and
`OFFICER_TEMP → OFFICER_RESET` in the emitter.

H1 is **already built** — `notification-service.ts:2198-2203`, kind `password_paused`, in all three languages. Do not
rewrite it; the A1 path calls `HolderAlerts.holderNotice(userId, "password_paused")`, which `holder-hook.ts:201`
already does (`first.method === "OFFICER_TEMP" ? "password_temp" : "password_paused"`).

**Link ruling (14):** `?reverify=1` replaces 03:275's `#reverify` (04:1064 — "`?reverify=1` replaces the design spec's
`#reverify`; HashFocus still targets `id="reverify"`").

### 2.3 "A1 again" with nothing cancelled

02:93 demands **A1 again** when the bot was already `AUTO_PAUSED(PASSWORD_CHANGED)` and the password changed again;
PLAN:587 adds the key rule (`pw:<botId>:<newFingerprint>`, never silenced by a same-day key). The code already takes
this branch — **`holder-hook.ts:247-250`, quoted:**

```
        // Ruling 134 · 02 §2.2: A1 again when the bot is already paused FOR a password change (nothing was queued to
        // stop, so `cancelled` is 0); A2 for PAUSED(NEW|MANUAL) and for a pause with any other cause.
        if (written.stamped.pauseReason === "PASSWORD_CHANGED") {
          await safeSend("A1 again", () => o.alerts.passwordPaused(written!.stamped, { method: pw.method, changedAt: pw.changedAt, cancelled: 0 }));
```

(Rulings 133, 134 and 135 were taken while building `holder-hook.ts` in the sixth session and live **only** in that
file's comments — `holder-hook.ts:19-21`, `:214`, `:247-248`. They are **not yet in `C4-SPEC.md` §6**, which ends at
ruling 132 at `C4-SPEC.md:412`. Copy them into §6 in this commit.)

**The copy problem.** A1's body says `"The bot stopped and cancelled {n} queued stake(s)."` With `cancelled: 0` on a
bot that was **already paused**, that sentence is false twice: nothing stopped, and nothing was cancelled. The A1
emitter therefore needs a second branch, and the recommended wording (**E9**) is:

> Title (unchanged): `House bot "{label}" paused — password changed · {HH:MM:SS}`
> Body: `{holder} changed his 50pick password {how} again at {HH:MM} EAT on {D MMM}. The bot was already paused for the
> previous change and nothing was queued. No bet will be placed until you enter his newest password.`

Discriminator available to the emitter with no extra read: `change.cancelled === 0 && bot.pauseReason === "PASSWORD_CHANGED"`
plus `bot.pausedFromStatus` — a first A1 always has `pausedFromStatus = "ACTIVE"` (02:91, `outcomes.ts:142`
`pausedFromStatus: "ACTIVE"`), while the "again" path never rewrites status. The cleanest signal is to widen
`HolderAlerts.passwordPaused`'s `change` with `again: boolean` in step 9 and set it at `holder-hook.ts:250`.

---

## 3 · F6 `CHANNEL_POLICY` + `channelAllowed` (04:1711-1726)

Exact spec, quoted:

```
04:1718 - `CHANNEL_POLICY satisfies Record<NotificationKind,{sms:'never'|'otp'|'allowed'; email:'never'|'template-only'|'allowed'}>` over `NOTIFICATION_KINDS` (`:202`).
04:1719 - Every future fan-out must call `channelAllowed(kind,{houseOnly})`.
04:1720 - When all of a notice's positions are house-marked: never SMS, and email only through the holder's hourly summary.
04:1721 - The HOUSE-BOTS.md alert matrix gains a Channel column.
```

Notes for the builder:
- `NOTIFICATION_KINDS` is at **`comms-registry.ts:212-224`** (04 says `:202`; re-derived, it moved). 18 kinds, ending
  `"HOUSE_BOT",` at `:223`.
- `HOUSE_BOT` row is pinned by C13 04:1061 (`sms:'never'`). Ruling 17 makes house-only **email a ceiling, not a
  requirement**, so `email:'template-only'` is the honest value for `HOUSE_BOT`: the three owner letters
  (`designated`, `removed`, `reverified`, `notification-service.ts:2162`) and the admin templates go out; nothing
  else does.
- `channelAllowed(kind, { houseOnly })` returns `{ sms: boolean; email: boolean }`; `houseOnly === true` forces
  `sms: false` and `email: false` for every kind (04:1720's "all positions house-marked" rule), and the holder's
  hourly summary is the one exception, sent by `notifyHouseBotOwnerHourSummary` on the bell only.
- **Home:** `comms-registry.ts`, beside `NOTIFICATION_KINDS` and `MONEY_KINDS` — one home for the lens definitions
  (`src/lib/server/prisma-dal.ts:30` already records why re-listing them elsewhere is the drift). See **E10**.
- **Exhaustive at compile time** (04:1724): `satisfies Record<NotificationKind, …>`, so a 19th kind cannot ship
  without a row.
- **The pin problem (E11):** SMS fan-out is not live (`sms.ts` is two throwing stubs and a console default —
  `comms-registry.ts:127-129`), so `channelAllowed` has **no production caller**. 04:1726's "a planted fan-out that
  skips `channelAllowed` turns the pin red" needs a source walk over `sms.ts`'s send sites, not a behavioural drive,
  or it is a guard that cannot fail.

---

## 4 · Registry and guard rows every new kind or template needs

No new **kind** is added (HOUSE_BOT exists, and `EVENT_KINDS` must stay exactly 30 — `test:house-bot-rules` 11.22,
C4-SPEC §7.5). What changes is emitters and templates.

| Guard | File · row shape | What to add |
|---|---|---|
| `test:cert-c3` §1 (`scripts/comms-notification-truth.test.mts:159-172`) | `src/lib/server/comms-registry.ts` `NOTIFICATION_EMITTERS` (`:247+`), row shape `{ fn: "notifyX", kind: "HOUSE_BOT", audience: "player" \| "officer" }` — house rows today at `:334` and `:336` | **one row per new emitter** (10 new `notify*` exports) |
| `test:cert-c3` §1 fan-out list (`:169`) | `const FANOUT = [… "notifyAdminsHouseBotErasureBlocked"];` | add every new `notifyAdmins*` emitter that returns `void`/`number` instead of a row; otherwise §1's "every emitter is driven by this suite" (`:170-172`) goes red |
| `test:cert-c3` §2 / §5 | `EMITTED` (`:72-157`) for row-returning emitters; `§5` drives (`:249-259`) for fan-outs | drive `notifyHouseBotOwner` with the **three new kinds** (existing rows at `:148-155` show the shape), and each admin fan-out in §5. §2 asserts `titleSw`, `titleZh`, `bodySw`, `bodyZh` present, **CJK in Chinese**, no emoji, no unreplaced `{placeholder}`, an `href` starting `/` |
| `test:cert-c1` §1 (`scripts/comms-email-truth.test.mts:305-313`) | `EMAIL_TEMPLATES` in `comms-registry.ts:110-170`; house rows at `:168-169`, shape `{ template, trigger, audience, chrome, money }` | one row per new `*Html` export |
| `test:cert-c1` §1 render coverage (`:317`) | `RENDERS` in `comms-email-truth.test.mts:81+`; house renders at `:293-298` with a **benign and a HOSTILE** input | one entry per new template |
| `test:cert-c1` **the count pin** (`:334-337`) | `ok(\`the inventory is 66 templates (found ${exported.length})\`, exported.length === 66);` with the history comment at `:326-336` | move **66 → the measured number**, and extend the comment with the same shape ("⚠ 66 → N on 2026-09-15 (branch house-bots, build commit 4): …; measured the same way after the edit = N") |
| `test:cert-c1` §2 wiring (`:341-366`) | the template name must appear in `spec.trigger` **and** within 10 lines above / 4 lines below a `sendEmail` / `sendEmailToUser` call, **or** be bound to a local later passed as `html: <name>` | keep the new admin template's build call inside the send, as `notifyAdminsHouseBotErasureBlocked` does (`notification-service.ts:2281-2283`) |
| `test:cert-c1` `NO_CTA_TEMPLATES` (`comms-registry.ts:184-197`) | `"houseBotOwnerHtml", // a consent letter …` | only if a new template legitimately has no CTA |
| `test:kyc-copy-truth` §6 (`scripts/kyc-copy-truth.test.mts:1106-1121`) | `OFFICER_EMITTER = /^notifyAdmins?[A-Z]\w*$/`; every matching declaration in `notification-service.ts` must contain `adminUserId`, `listByRoles(`, or `houseBotAlertRecipients(` | every new `notifyAdminsHouseBot*` body **must call `houseBotAlertRecipients(`** — nothing else proves it addresses officers. The resolver itself is re-proven at `:1114-1116` (`listByRoles(["ADMIN"])` **and** `role === "ADMIN"` must both be literally present in `alerts.ts`) |
| `test:position-permalink` 4.4 (`scripts/position-permalink.test.mts:95-97`) | `const ctas = [...email.matchAll(/ctaButton\(\s*("\/positions"\|\`\/positions\`)/g)];` must be length 0 | **no email may `ctaButton("/positions")`** — the holder's letters stay CTA-less (`houseBotOwnerHtml`'s rule, `email.ts:2245-2247`) |
| `test:notifications-page` §1-§2 (`scripts/notifications-page.test.mts:46-70`, `:160-167`) | `src/lib/notification-appearance.ts` `iconFor` (`:48` `case "HOUSE_BOT": return I.activity;`) and `tintFor` (`:87` `case "HOUSE_BOT": return "border-info-border bg-info-bg/30 text-info-fg";`) | **nothing to add** — HOUSE_BOT already has an icon and a tint, and it is in neither `MONEY_FILTER_KINDS` nor `ACCOUNT_FILTER_KINDS`, so the two lenses stay disjoint |
| `test:failure-reasons` §9b (`scripts/failure-reasons.test.mts:776-846`) | walks `src/lib/server` + `src/app` for `code: "X"` positions | never use one of the six deleted codes (§1.3 above); ruling 55 |
| `test:failure-reasons` §8c | `control.ts` is a **named read-only caller** of `checkLossLimit` (ruling 56) | unchanged by step 9 |
| `test:decomment` (`scripts/decomment.test.mts:204-212`) | `const CARRIER_CEILING = 20;` — shrink-only, and **lower it in the same commit if it drops** | a new suite must `import` `scripts/lib/decomment.mts`, never write its own stripper regex |
| `test:guards-exist` | C4-SPEC §7.12 | **add `"test:house-bot-comms"` and `"test:house-bot-holder-lifecycle"` to `package.json` before any comment cites them** |
| `red-anchors` (`scripts/red-anchors.test.mts:239`) | `const UNDECLARED_CEILING = 65;` — exact (`:277` asserts `===`) | `red:house-bot-engine` must declare an anchors file in its command |
| `test:multi-container` / `test:updown-heal` / `test:aipoll-reap` / `test:payout-observability` | pin `runLifecyclePass` strings and order (C4-SPEC §7.6) | the holder-sweep line goes **after** `maybeWatchKycReviewSla`, one line, no other engine code in `lifecycle.ts` |
| `test:house-bot-rules` 11.8 | every quoted `house_bot.*` string in `src/` (comments included) must be a `HOUSE_AUDIT` key (`constants.ts:730-761`) | the emitters quote no audit action; keep it that way |

`EMAIL_TEMPLATES` row precedent to copy (`comms-registry.ts:166-169`):

```
  // ── House bots (build commit 3) ───────────────────────────────────────────
  // The holder's designated / removed / reverified letter — no figure, so not money, and royal.
  { template: "houseBotOwnerHtml",         trigger: "src/lib/server/notification-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "houseBotErasureBlockedAdminHtml", trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
```

`NOTIFICATION_EMITTERS` row precedent (`comms-registry.ts:334-336`):

```
  { fn: "notifyHouseBotOwner",         kind: "HOUSE_BOT",         audience: "player" },
  // An erasure refused while the account is still a house bot (04 R6) — to `houseBotAlertRecipients()`.
  { fn: "notifyAdminsHouseBotErasureBlocked", kind: "HOUSE_BOT",  audience: "officer" },
```

⛔ **`chrome: "gold"` is money chrome.** Every house-bot template is `royal` (`money: false`) — house notices state a
figure only in the money-event and staff-chosen bodies, and `test:gold-is-money` / the C1 chrome check read the
registry, not the copy. Keep `money: false` unless a template actually promises the holder money.

---

## 5 · How to render every bell and every email for visual verification

### 5.1 Emails — `qa:cert-c1`

- Command: **`npm run qa:cert-c1`** → `package.json:453` `"qa:cert-c1": "tsx scripts/comms-email-shots.mts"`.
- **No server, no database.** The script imports `src/lib/server/email.ts` directly and renders HTML strings
  (`scripts/comms-email-shots.mts:25-26`), then drives Playwright Chromium against `page.setContent`.
- Output: **`.qa-shots/emails/`** (`:28`, wiped on each run).
- Matrix: 360 / 768 / 1280 / 1920. Asserts zero horizontal overflow, CTA ≥ 44 px and inside the viewport, brand mark
  and card actually paint, no text collision (`:8-15`).
- Coverage pin: `:112` `for (const t of EMAIL_TEMPLATES) ok(\`${t.template} is rendered in the visual pass\`, covered.has(t.template));`
  — **every registry row must have a `PAGES` entry**, so a new template needs one there too.
- House entries to copy (`:81-84`):
  `{ name: "houseBotOwnerHtml", html: E.houseBotOwnerHtml({ kind: "designated", at: "15 Sep 2026, 14:02 EAT" }) },` plus
  `.reverified`, `.removed`, and the erasure-blocked admin render.
- ⚠ Needs Playwright Chromium. Not in `test:all` by design (`:20`).

### 5.2 Bells — `qa:cert-c3`

- Command: **`npm run qa:cert-c3`** → `package.json:454` `"qa:cert-c3": "tsx scripts/comms-bell-shots.mts"`.
- **Needs a running dev server and the memory store** — it signs in through the dev-only `/auth/demo` route
  (`scripts/comms-bell-shots.mts:53-55`). The header states the deviation (`:11-25`): a production build refuses to
  boot without `DATABASE_URL`, so this pass is evidence about **layout and content**, not token-level styling.
- Base URL: `const BASE = process.env.BELL_BASE ?? "http://127.0.0.1:3011";` (`:31`). The script's own header says
  `Needs a server on :3011 — npx next dev -p 3011` (`:25`).
- ⛔ **3011 is on the forbidden list (with 3009, 3013, 3014).** Use the env override:

  ```
  # terminal 1
  npx next dev -p 3021
  # terminal 2
  BELL_BASE=http://127.0.0.1:3021 npm run qa:cert-c3
  ```

- Output: **`.qa-shots/bell/`** (`:32`, wiped on each run).
- Matrix 360 / 768 / 1280 / 1920 × en / sw / zh. **Locale is the `kp-locale` COOKIE, never `?lang=`** (`:61-63`: "The
  F1 pass lost an afternoon to this: the query param renders English three times while reporting success").
- To see the new house rows, seed them first: the bell renders `db.notification` rows for the demo player, so a
  scratch script that calls `notifyHouseBotOwner(demoUserId, "password_temp")` etc. against the same dev server's
  memory store is the cheapest path. The **admin** rows need an ADMIN session — `/admin/notifications` is commit 7;
  for commit 4, shoot the admin bodies through `qa:cert-c1`'s email render and record the admin bell as
  **NOT MEASURED** until the console lands.

### 5.3 What is proven without pixels

`test:cert-c3` (`npm run test:cert-c3`) reads every bell row's bytes in three locales; `test:cert-c1`
(`npm run test:cert-c1`) reads every email's bytes with a hostile input. Run both after every copy edit — they are
the gate; the shots are the look.

---

## 6 · `test:house-bot-comms` — every case the plan demands

The suite key does **not exist yet** (`package.json` has `test:house-bot-rules`, `-seam`, `-migrations`, `-money`,
`-caps`, `-designation`, `-engine` only). Create it as `scripts/house-bot-comms.test.mts` following
`scripts/house-bot-engine.test.mts:14-15`:

```
import { runTwoStores } from "./lib/house-bot-two-stores.mts";
await runTwoStores({ suite: "test:house-bot-comms", casesFile: "scripts/lib/house-bot-comms-cases.mts", minPass: <measured>, dbPrefix: "hb_comms" });
```

(`runTwoStores` signature: `scripts/lib/house-bot-two-stores.mts:16` —
`{ suite: string; casesFile: string; minPass: number; dbPrefix: string; timeoutMs?: number }`.)

| # | Case | Citation |
|---|---|---|
| 1 | Matrix rows give exact recipients and channels | 04:1071 |
| 2 | A second ADMIN saving rules → both ADMINs get the diff | 04:1072 (also A22 04:569) |
| 3 | Re-verify gives 1 holder row in 3 locales plus an email. 2 wrong tries → 0 rows; reaching reserve → 1 row | 04:1073 |
| 4 | RG-locked holder: 0 HOUSE_BOT holder rows | 04:1074 |
| 5 | Stubbed SMS fan-out is never called | 04:1075 |
| 6 | Bets straddling 14:00 EAT: **20 bells plus 1 summary with N=5** | 04:1076 |
| 7 | With now = event + 60 days, each href's route file exists and its resolver includes the event | 04:1077 |
| 8 | Holder conflict: 1 alert, and the player's bet is never refused | 04:1078 |
| 9 | With `SMS_PROVIDER=selcom` stubbed, 50 house outcomes give **0 SMS calls** and ≤ `holderNoticesPerHour` bells plus 1 summary | F6 04:1725 |
| 10 | The `CHANNEL_POLICY` is exhaustive at compile time | F6 04:1724 |
| 11 | A planted fan-out that skips `channelAllowed` turns the pin red | F6 04:1726 (**E11**) |
| 12 | A MANUAL row and a targeted row each reach 2 admins by **uncapped bell + email without consuming `countInHour`** | N1 04:3732 |
| 13 | `notifyAdminsHouseBotBet` sends **neither** | N1 04:3733 |
| 14 | A reason seeded with **NEEDLE** never appears in a body, and bodies end `"Reason recorded in the activity feed →"` | N1 04:3734 |
| 15 | Titles survive the 90 s dedupe | N1 04:3735 |
| 16 | hrefs render at +60 days, **including TARGET_\* history events** | N1 04:3736 |
| 17 | The holder notice is capped | N1 04:3737 |
| 18 | **Voided, self-decided** ~~**and staff-edge**~~ alerts reach every recipient | N1 04:3738 ~~(**E7** — the staff-edge producer is Commit 5)~~ ⛔ **Superseded by D20 (Ali, 2026-09-17):** the staff-edge half is struck (C5-SPEC rulings 218–223); the voided and self-decided alerts are not touched by D20. |
| 19 | 0 SMS | N1 04:3739 |
| 20 | Roster `TARGET_*` reach both admins by bell + email, uncapped, with an href resolving at +60 days | N2 04:4394 |
| 21 | A targeted PLACED row → `notifyAdminsHouseBotStaffChosen` to both admins, **`countInHour` unchanged, 0 `notifyAdminsHouseBotBet` rows** | N2 04:4395 |
| 22 | No reason text in any body; 0 SMS | N2 04:4396 |
| 23 | (PLAN:519) admin and holder caps then summaries; **two identical money events → two rows**; every href maps to an existing `page.tsx`; holder notices trilingual | PLAN:519; 02:429 |

**`test:house-bot-holder-lifecycle`** (also a new key), from A2 04:115-119 and F8 04:1760-1761:

| # | Case | Citation |
|---|---|---|
| 1 | Each A2 row, **with the switch OFF**, gives the listed status, cause, recipients and channels | 04:116 |
| 2 | **With the hook disabled, the sweep produces the same result** | 04:117 |
| 3 | A user with no bot gets **zero extra writes** | 04:118 |
| 4 | A **shrink-only source walker** checks writers of `passwordHash`, `role`, `status`, `phoneE164`, `twoFactorEnabled` and `email`, the freeze helpers, the RG upserts and `fileDsarRequest`. **It must call the hook; a planted RED fixture fails** | 04:119 |
| 5 | F8: the walker also scans **`scripts/**` and SQL string literals containing `"passwordHash"`**; a script is allowed only with the comment `// house-bot: covered by L2 sweep`; a planted raw-SQL script with no comment turns the walker red | 04:1755-1760 |
| 6 | F8: a **REHASH fixture keeps the bot ACTIVE with a new fingerprint** | 04:1761 |
| 7 | Each A2 cause **refuses Enter now with its copy** (press REFUSED `HOLDER_CAUSE`) | N1 04:3740 |

⛔ `test:house-bot-designation` §10 (C4-SPEC §7.14): password-hash writers are exactly auth-service (1) and
password-reset (3), plus the dev seed. **The holder hook must not add a hash write.**

---

## 7 · Step 8 — the A9 kill-switch OFF drain, as a service

### 7.1 The four steps, quoted (04:272-280)

```
04:272 *F9, replace the write bullet with four steps:*
04:273 1. **Write OFF first:** autocommit `UPDATE "HouseBotControl" SET enabled=false, "offCause", "switchedAt"=now()` with no lock. H4's re-read inside the lock makes this binding for any bet not yet holding `house:control`.
04:274 2. **Drain:** a separate transaction runs `SET LOCAL lock_timeout='3s'` and then takes `house:control`.
04:275    - Success: "House bots are off. No bot will place a bet."
04:276    - 55P03: "Switched off. A bet already in its final step may still complete."
04:277 3. **Cancel** live intents with a conditional update.
04:278 4. **Record:** event, awaited audit, then alerts, all after the locks are released.
04:279
04:280 If step 1 fails: "Could not reach the database. House bots were NOT switched off. Try again, or turn on Maintenance mode." Maintenance refuses every bet, including house bets.
```

### 7.2 What "drain" measures

It measures **only** that no bet is *mid-write* under `house:control`. `house:control` is the **innermost** lock of
the house bet path and it wraps the money writes — `market-service.ts:1553-1564`, quoted:

```
      // ── H4 · house bots: `house:control` is the INNERMOST lock and wraps the money writes, so an OFF
      // written before this point binds, and the memory mutex is held too (PLAN H4, 04 A9). ───────────
      // SEAM:H4
      if (ctx.kind === "house") {
        const refused = await withLock(HOUSE_CONTROL_LOCK, async (controlTx): Promise<HouseRefusal | null> => {
```

So: step 1's autocommit OFF binds every bet that has **not yet** taken `house:control` (H4 re-reads inside the lock);
step 2's drain waits up to 3 s for the ones that already hold it. Acquiring the lock means the last in-flight house
bet committed. Failing to acquire (55P03) means one may still land — hence the second copy string. **The drain never
rolls anything back and never blocks a player.**

### 7.3 Timings and constants

| Constant | Value | Where | Line text |
|---|---|---|---|
| drain `lock_timeout` | `"3s"` | `src/lib/house-bot/constants.ts:573` | `export const OFF_DRAIN_LOCK_TIMEOUT = "3s";` |
| house bet `lock_timeout` | `"2s"` | `constants.ts:574` | `export const HOUSE_BET_LOCK_TIMEOUT = "2s";` |
| the lock key | `"house:control"` | `constants.ts:39` | `export const HOUSE_CONTROL_LOCK = "house:control";` |
| applied on the bet path | — | `market-service.ts:1420` | `if (ctx.kind === "house" && lockTx) await lockTx.$executeRawUnsafe(\`SET LOCAL lock_timeout = '${HOUSE_BET_LOCK_TIMEOUT}'\`);` |
| 55P03 detector | — | `market-service.ts:998` | `/** Postgres 55P03 \`lock_not_available\` — the house branch's \`lock_timeout\` expiring (04 A9). */` |
| 55P03 is a BUSY backoff, **never FAILED, never the error streak** | — | 04:284 | `- 55P03 maps to BUSY backoff, never to FAILED or the error streak.` |

### 7.4 The `test:house-bot-caps` cases A9 demands (04:291-295)

```
04:292 - `house:control` held 60 s: OFF returns in under 1.5 s with the drain copy, `enabled=false` is set, and the next bet gets `house_disabled`.
04:293 - `house:control` held 10 s: the bot bet on market X returns BUSY in 2–3 s, a player bet on X completes in under 3 s, and the error streak is unchanged.
04:294 - `market:X` held 20 s: the holder's withdrawal completes in under 3 s.
04:295 - The source test fails on FOR UPDATE in the house gate.
```

Ruling 26 places 04:292 and 04:294 with the drain in `test:house-bot-caps`; **04:293 already exists** —
`scripts/lib/house-bot-caps-cases.mts:608`, quoted:

```
    ok("6.1 · house:control held → the house bet returns BUSY after the 2 s lock_timeout, not after the holder's 6 s", h.r.ok === false && h.r.code === "BUSY" && h.ms >= 1_800 && h.ms < 5_000, `${show(h.r)} in ${h.ms} ms`);
```

Also A19 04:529: "With the audit queue delayed 5 s, OFF commits in under 1 s and the holder's own bet is not blocked."

### 7.5 What exists already

| Piece | Where | Note |
|---|---|---|
| `engineSwitchOff(cause, alerts, message)` | `outcomes.ts:198-214` | **Steps 3 and 4 only, no drain.** `switchOff` → `cancelLive({all:true},"MASTER_OFF")` → SWITCH_OFF event → awaited `engineAudit` → `alerts.switchedOff` (GLOBAL_LOSS_STOP) or `alerts.security`. Conditional: `if (!off) return false;` |
| `houseBotControlStore.switchOff` | `house-bot-dal.ts:1320`, memory `:1986`, SQL `:3131` | `switchOff(input: { cause: OffCause; byId: string \| null; reason: string \| null }): Promise<StoredHouseBotControl \| null>;` — **conditional on ON**, returns null when already off. This IS step 1's autocommit write (no lock is taken by the store) |
| `houseBotControlStore.switchOn` | `:1326`, memory `:1994`, SQL `:3143` | `switchOn(input: { byId: string; reason: string \| null }, tx?: HouseTx)` — sets `global.scopeFrom = now()` in the same transaction (ruling 92) |
| `OffCause` | `constants.ts:162-163` | `["MANUAL", "GLOBAL_LOSS_STOP", "ENGINE_FAULT", "ENGINE_ERRORS", "SUNSET"]` |
| audit actions | `constants.ts:730-761` (`HOUSE_AUDIT`) | `"house_bot.switch_off"`, `"house_bot.loss_stop"`, `"house_bot.engine_fault"` all present — **no new key needed** |
| `control.ts` | `src/lib/server/house-bot/control.ts` | `readControl()` `:29`, `maintenanceOn()` `:34`, `readBotAndHolder()` `:60`. **No switch writer, no drain.** |

### 7.6 What is missing

1. **A drain step.** No code anywhere runs `SET LOCAL lock_timeout` for `house:control`; the only `lock_timeout`
   writer is the bet path at `market-service.ts:1420` and the migrations. `withLock` (`locks.ts`) takes no timeout
   argument. The drain therefore needs either a `withLock` option or a raw
   `houseTransaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '3s'"); await <take house:control>; })`.
   **Memory twin:** `house:control` is a JS mutex in the memory store, so the drain must have a memory
   implementation that resolves immediately (no 55P03) — otherwise the two-store suite diverges.
2. **The service.** `switchHouseBotsOff({ cause, byId, reason })` in `control.ts`, returning
   `{ ok: true; drained: boolean; cancelled: number } | { ok: false; reason: "DB_UNREACHABLE" }`, with the three copy
   strings of 04:275/276/280. **The action is commit 7** (C4-SPEC §5 step 8: "the action is commit 7").
3. **The alert.** Step 4's "then alerts" is `notifyAdminsHouseBotSwitch` — so step 8's service must take the same
   injected channel step 9 supplies (ruling 46's rule: no default, or a build can switch off silently). Practically:
   **build step 9's emitters first, then step 8 wires them in**, or build step 8 with an injected
   `Pick<EngineAlerts, "switchedOff">` and its recorder cases, and let step 9 supply the real one.
4. **`engineSwitchOff` must reuse it.** Ruling 111 says `engineSwitchOff` "takes every engine cause"; A19's order
   (autocommit OFF → drain → cancel → event → awaited audit → alert) is the same order for the manual switch, so one
   helper serves both. Today `engineSwitchOff` skips the drain — an engine-caused OFF can return while a house bet is
   mid-write. **That is the gap step 8 closes.**
5. **`ops:house-bots-off`** (04:289) — the direct-pg script, dry by default, `--apply` writes `enabled=false`, MANUAL
   and a SWITCH_OFF event. **Commit 7** (04:289 "§11 commit 7").

---

## 8 · Step 9 wiring

### 8.1 `src/instrumentation.ts`

Current file re-derived: `register()` at `:21`, the nodejs guard at `:22`, `runBootChecks` `:25-26`, market scheduler
`:33-38`, Up & Down scheduler `:44-49`, lifecycle ticker `:54-59`, closing `}` of the nodejs block at `:60`.
**The engine start goes after `:59`, inside the nodejs block, as a dynamic import in try/catch** (C4-SPEC §2 "Boot",
§5 step 3; rulings 42 and 46 move the call here, to step 9).

The three tick factories, signatures re-derived this session:

| Export | File · line | Line text |
|---|---|---|
| `workerTicks` | `worker.ts:46` | `export function workerTicks(alerts: EngineAlerts): Pick<EngineTicks, "pollerTick" \| "requeueMine"> {` |
| `plannerTicks` | `planner.ts:227` | `export function plannerTicks(alerts: EngineAlerts): Pick<EngineTicks, "plannerTick"> {` |
| `triggerTicks` | `trigger.ts:443` | `export function triggerTicks(alerts: EngineAlerts): Pick<EngineTicks, "sweepTick" \| "hookAlerts"> {` |
| `startHouseBotEngine` | `engine.ts:208` | `export async function startHouseBotEngine(ticks: EngineTicks, deps: EngineDeps = {}): Promise<{ started: boolean; refused: EngineRefusal \| null }> {` |
| `EngineTicks` | `engine.ts:97-106` | `pollerTick`, `plannerTick`, `sweepTick`, `hookAlerts: EngineAlerts`, `requeueMine?` |
| `EngineDeps` | `engine.ts:108-114` | `schemaReady?`, `timeZone?`, `dbClockMs?`, `admission?`, `env?` — **all optional; pass none in production** |

So the boot block is, in shape:

```ts
    // House bots — the engine (04 A24, F7; C4-SPEC ruling 46: the alert channel is required).
    try {
      const { startHouseBotEngine } = await import("./lib/server/house-bot/engine");
      const { workerTicks } = await import("./lib/server/house-bot/worker");
      const { plannerTicks } = await import("./lib/server/house-bot/planner");
      const { triggerTicks } = await import("./lib/server/house-bot/trigger");
      const { engineAlerts } = await import("./lib/server/house-bot/emitters");  // step 9's channel
      const alerts = engineAlerts();
      await startHouseBotEngine({ ...workerTicks(alerts), ...plannerTicks(alerts), ...triggerTicks(alerts) });
    } catch (err) {
      console.error("[instrumentation] Failed to start the house-bot engine:", err);
    }
```

`startHouseBotEngine` refuses on its own for `ENV_DISABLED` (`engine.ts:211-215`, reads
`process.env[HOUSE_BOT_ENGINE_ENV]`), `SCHEMA_NOT_READY` (`:216-221`), `DB_TIMEZONE` (`:222-227`) and `BOOT_FAILED`
(`:228-235`) — the caller needs no env check of its own. `state.hook.alerts = ticks.hookAlerts ?? null;` at `:240` is
what un-suspends the post-commit trigger hook (`trigger.ts:412`: `if (!state.started || state.stopping || alerts == null) return "notStarted";`).

⚠ The alert channel must be a **module-level function, not module-level mutable state** — F7's source pin
(C4-SPEC §3.1): "no module-scope mutable state under `src/lib/server/house-bot/**` outside the globalThis keys".

### 8.2 The lifecycle chore (ruling 129)

`src/lib/server/lifecycle.ts`, re-derived: `TICK_MS = 60_000` at `:31`, `runLifecyclePass` at `:381`,
`acquireLeadership(LIFECYCLE_TASK)` at `:430`, the chore chain `:450-490`. The **last** chore today is `:490`:

```
    await maybeWatchKycReviewSla().catch((e) => console.error("[lifecycle] identity review target:", e));
```

Add **exactly one line after it**, before the `} finally {` at `:491`:

```
    await maybeRunHolderSweep().catch((e) => console.error("[lifecycle] house-bot holder sweep:", e));
```

`maybeRunHolderSweep` is a **local** helper in `lifecycle.ts` that dynamically imports
`./house-bot/holder-hook` and calls `holderSweep({ alerts: <step 9's HolderAlerts> })` — `holder-hook.ts:389`:
`export async function holderSweep(deps: { alerts: HolderAlerts }): Promise<HolderSweepResult> {`.
It runs on the **lifecycle leader**, every 60 s, **whatever `HOUSE_BOT_ENGINE` says** (R6 04:1256, rulings 18 and 127).
⛔ Keep every other line of engine code out of `lifecycle.ts` (C4-SPEC §7.6: `test:multi-container` reads 8,000
characters of `runLifecyclePass` and `test:updown-heal` / `test:aipoll-reap` / `test:payout-observability` pin its
strings and order).

### 8.3 The A2 call sites — re-verified against today's code

Every anchor below was re-read this session; the quoted text is what `sed -n '<n>p'` prints today. Every hook is
`void import("./house-bot/holder-hook").then(m => m.onHolderAccountChanged(userId, <event>, <meta>)).catch(() => {})`,
fired **after the outermost lock returns** (ruling 127, C4-SPEC §2's trap: `withLock` publishes its transaction
through AsyncLocalStorage, `locks.ts:112-121`).

| Row | File · line | Line text today | Hook slot | Restructure? | `HolderEvent` |
|---|---|---|---|---|---|
| 1 settings password | `password-reset.ts:330` | `await db.user.update(userId, { passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString()…` | after 330 | no | `PASSWORD_SELF_CHANGE` |
| 2 reset link | `password-reset.ts:244` | `await db.user.update(user.id, { passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString(…` | after 244 | no | `PASSWORD_RESET_LINK` |
| 3 officer temp | `password-reset.ts:275` | `await db.user.update(userId, { passwordHash: hash, passwordSalt: salt, passwordSetAt: new Date().toISOString()…` | after 275 | no | `PASSWORD_OFFICER_TEMP` |
| 4 erasure nulls hash | `erasure.ts` `anonymizeClosedAccount` | — | **no hook** (refused while live, ruling 2) | — | — |
| 5 closure | `user-service.ts:105` `status: "CLOSED",` · `:111` `await db.wallet.update(wallet.id, { status: "CLOSED" });` | as quoted | after 112 | no | `ACCOUNT_CLOSED` |
| 6 self-exclusion | `responsible-gambling.ts:307` `await db.user.update(userId, { status: "SELF_EXCLUDED" });` · `:308` `await addWalletFreeze(userId, "SELF_EXCLUSION", { actorId: userId, note: \`self-exclusion · ${period}\` });` | after 308 | no — but **the freeze result at 308 is discarded; capture it** | `SELF_EXCLUDED` |
| 7 cooling-off | `responsible-gambling.ts:348` `await db.user.update(userId, { status: "COOLED_OFF" });` | after 348 | no | `COOLING_OFF` |
| 8 own limits | `responsible-gambling.ts:248` `await db.responsible.upsert(next);` | after 248 | no | `LOSS_LIMIT_SET` |
| 8b delayed raise | `responsible-gambling.ts:99-133` `effectivize` (five blocks) | **no hook** — L2 sweep only | — | — |
| 9 suspend | `app/admin/players/[id]/actions.ts:122` `await db.user.update(userId, { status: "SUSPENDED" });` | after 123 | no | `SUSPENDED` |
| 9b restore / reopen | same file `:189` `await db.user.update(userId, { status: nextStatus });` · `:197` `await removeWalletFreeze(userId, "SELF_EXCLUSION", { actorId: officerId, note: reason, ref: { via: "…` | after 197 | no — `selfExcluded` distinguishes reopen from restore | `RESTORED` |
| 10 freeze add/remove | `wallet-freeze.ts:64` `const updated = await db.wallet.update(w.id, { status, freezeReasons: after });` inside `withLock(wallet:)` 53-86; wrappers `:90` `export function addWalletFreeze(userId: string, reason: WalletFreezeReason, meta: FreezeMeta): Promise<FreezeO…` and `:95` `export function removeWalletFreeze(…)` | in the **wrappers**, after the promise settles, on `r.ok && r.changed` | **YES — both wrappers `return` the lock's promise.** KYC callers are inside `kyc:` locks (KYC:919 from 248/373/1184; KYC:936 from 1112/1157/1189; KYC:1025; WF:131) → those need `runOutsideLock` | `WALLET_FREEZE` |
| 11a underage refusal | `kyc-service.ts:250` `await db.kyc.upsert({ ...fresh, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, upda…` | after 254 (`kyc:` call ends 253), on `refused.ok` | no | `IDENTITY_REFUSED` |
| 11b NIDA refusal | `kyc-service.ts:375` `await db.kyc.upsert({ ...fresh, status: "REJECTED", rejectReason: enumMember, rejectNote, updatedAt:` | after 382, on `nidaRefused.ok && nidaFinal` (**non-final NIDA codes also write REJECTED**) | no | `IDENTITY_REFUSED` |
| 11c officer final refusal | `kyc-service.ts:1186` `await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: rejectCode, rejectNote: officerNote, r…` inside `kyc:` 1095-1204 | after the lock returns, on `r.ok && decision==="REJECT" && isFinalRefusal(rejectCode)` | **YES — `reviewKyc` returns the lock.** On APPROVE it is also nested in `agent:` (AGT:1288) → `runOutsideLock` | `IDENTITY_REFUSED` |
| 11d reopen refusal | `kyc-service.ts:1024` `await db.kyc.upsert({ ...restartedSubmission(k, userId, { officerId, at: now }) });` inside `kyc:` 991-1051 | after the lock | **YES.** ⚠ `:1048` returns `ok:false` **after** the reset when the freeze lift fails | `IDENTITY_REOPENED` |
| 12 staff role | `app/admin/staff/actions.ts:36` `await db.user.update(target.id, { role: newRole });` | after 36 (or 40, after the session revoke) | no | `ROLE_CHANGED` |
| 12b bootstrap promotion | `auth-service.ts:1050` `await db.user.update(user.id, { role: "ADMIN", status: "ACTIVE" });` inside `login:` 964-1114 | after the lock | **YES + an outer flag** (`effectiveRole` is inside the lock) | `ROLE_CHANGED` |
| 13a agent approved | `agent-application-service.ts:1308` `await db.user.update(app.userId, { role: "AGENT", roleChangedAt: now, roleChangedBy: officerId } as …` inside `agent:<applicationId>` 1264-1317 | after the lock, on `r.ok` | **YES** | `ROLE_CHANGED` |
| 13b agent revoked | `agent-application-service.ts:1406` `await db.user.update(userId, { role: "PLAYER", roleChangedAt: now, roleChangedBy: officerId } as Par…` inside `agent:<userId>` 1400-1417 | after the lock, on `r.ok` | **YES** | `ROLE_CHANGED` |
| 14 erasure request | `privacy.ts:93` `queue.push(r);` (persist at 94, not awaited) | after 94, only when `r.type === "ERASURE"` | no | `ERASURE_REQUEST` |
| 16 lockout | `auth-service.ts:975` `await db.user.update(user.id, patch);` inside `login:` 964-1114 | after the lock | **YES + an outer flag** (`shouldLock` is inside; `:947` also returns RATE_LIMITED before the lock) | `LOCKED_OUT` |
| 17 email cleared / set | `email-verification.ts:142` `await db.user.update(userId, { email: null, emailVerifiedAt: null });` · `:176` `await db.user.update(userId, { email: next, emailVerifiedAt: null, ...(opts.byOfficer && !stampCount…` | after each | no (KYC:333 calls it **before** its locks) | `EMAIL_CHANGED`, `meta: { byOfficer }` |
| 18 2FA on / off | `player-2fa.ts:35` `await db.user.update(userId, { twoFactorEnabled: true });` · `:77` `await db.user.update(userId, { twoFactorEnabled: false });` | after each | no | `TWO_FA_ON` / `TWO_FA_OFF` |

**Restructure list (7 sites):** `wallet-freeze.ts` `addWalletFreeze` / `removeWalletFreeze`; `kyc-service.ts`
`reviewKyc`; `kyc-service.ts` `reopenFinalRefusal`; `auth-service.ts` `loginWithPassword` (twice — bootstrap promotion
and lockout, one restructure with two flags); `agent-application-service.ts` `approveAgent`; `agent-application-service.ts`
`revokeAgent`. "Restructure" = the function `return withLock(...)`s; capture the result first, hook after.

**Other writers the walker must know** (`C4-HOOK-ANCHORS.md:45`, re-verified): `kyc-service.ts:1120`
(PENDING_KYC → ACTIVE, inside `kyc:`, nested in `agent:` via AGT:1288); `auth-service.ts:625` registration create
inside `register:` 589-763; `auth-service.ts:418` OTP signup create; `app/auth/demo/route.ts:216` create (dev only).

**The wrapper to expose.** `holder-hook.ts` exports `onHolderAccountChangedWith(userId, event, { alerts, meta })`
(`:367`) — step 9 adds `onHolderAccountChanged(userId, event, meta?)` that binds step 9's `HolderAlerts` and is what
the 20 call sites import. It **never throws** (`:380-383` catch and log; the sweep decides the change within a minute).

### 8.4 Two traps the call sites must respect

1. **A hook fired inside a lock joins that lock's transaction** (`locks.ts:112-121, :140`). Fire after the outermost
   `withLock` returns, or wrap in `runOutsideLock` (`locks.ts:74`). For the bet-path trigger hook,
   `runOutsideAdmission` (`admission.ts:144`) nests with it (ruling 102).
2. **`void import(` appears nowhere in `src` today** (C4-SPEC §2). Today's patterns are `await import()` in try/catch
   and `promise.catch(()=>{})`. Ruling 127 prescribes
   `void import("./house-bot/holder-hook").then(...).catch(() => {})` — it will be the first of its kind, so expect a
   lint or a source-walk guard to notice.

---

## 9 · The Up & Down digest house split (A17 (h) 04:490)

```
04:486 *(h), list the emitters that get the liquidity label:*
04:487 - selection-closed bell and email: personal figures exclude marked positions, and the house stake gets its own labelled line;
04:488 - verdict recorded or reversed; market cancelled bell and email;
04:489 - one-sided refund and orphan refund;
04:490 - Up & Down win, loss, refund and one-sided rows, and the digest.
```

**Today's state (re-derived):**

| Anchor | Line text |
|---|---|
| `updown-digest.ts:216-218` | `export async function runUpDownDailyDigest(opts: {` / `  nowMs?: number; dryRun?: boolean; daysBack?: number;` / `} = {}): Promise<DigestRunResult> {` |
| `updown-digest.ts:232` | `  const totals = await positionStore.dailyTotalsByUser({ fromIso, toIso, productLine: "UPDOWN" });` |
| interface | `market-dal.ts:525-530` — `dailyTotalsByUser(q: { fromIso: string; toIso: string; productLine: "MARKET" \| "UPDOWN" }): Promise<DailySettledTotals[]>;` |
| result shape | `market-dal.ts:540-556` — `{ userId, rounds, wins, losses, refunds, staked, returned, wonPayout, lostStake, refundedStake }` |
| memory twin | `market-dal.ts:744` |
| SQL twin | `market-dal.ts:1303-1349` — `from "public"."Position" p join "public"."PredictionMarket" m on m."id" = p."marketId" where m."productLine"::text = $3 and p."status" in ('WIN','LOSS','VOID') and p."settledAt" >= $1::timestamp and p."settledAt" < $2::timestamp group by p."userId"` |
| **the gap** | **neither twin filters or groups on `p."houseBotId"`** — a holder's digest today folds their liquidity stakes into their own losing day |
| the label helper that already exists | `notification-service.ts:356-357` — `const LIQUIDITY_LINE = { en: " · 50pick liquidity stake", sw: " · Dau la ukwasi la 50pick", zh: " · 50pick 流动性投注" } as const;` and `const liquidityLine = (houseStake: boolean \| undefined, lang: keyof typeof LIQUIDITY_LINE): string => (houseStake ? LIQUIDITY_LINE[lang] : "");` |
| the emitter that already splits | `notifySelectionClosed` `houseStake?: boolean` at `:645`, title prefix at `:682` |
| the digest emitter | `notification-service.ts:570` — `export function notifyUpDownDigest(userId: string, opts: {` — **no `houseStake` parameter** |
| the digest email template | `email.ts` `updownDigestHtml({ dayLabel, rounds, wins, losses, refunds, wonPayout, lostStake, refundedStake, staked, returned, net })` (driven at `comms-email-shots.mts:60`) |
| C4-SPEC §2 record | `C4-HOOK-ANCHORS`-era note, C4-SPEC:88: "`updown-digest.ts`: `runUpDownDailyDigest` :216; rows `positionStore.dailyTotalsByUser` :232 … **There is no house split.**" |
| ⛔ do not break | C4-SPEC §7.12: `updown-digest.ts:209`'s `ops:updown-digest-preview` citation is on the inherited phantom list — **keep that comment when editing the digest** |

**What to build** (shape is **E13**): `dailyTotalsByUser` grows a third grouping key so each user can come back as
two rows — personal (`p."houseBotId" IS NULL`) and house (`p."houseBotId" IS NOT NULL`) — in **both twins**, with
`test:dal-parity` picking the new member up. The digest then sends one notice per user with the personal figures and
**a separate labelled line** for the house total, reusing `LIQUIDITY_LINE`. A17's test (04:493-495) demands: a
holder with mixed positions gets labelled notices and their personal payout excludes house money; **a non-holder's
notices are byte-identical**.

---

## 10 · Open points

| # | Question | Options | Recommended ruling |
|---|---|---|---|
| **E1** | `EngineAlerts.security` has no plan-named emitter (PLAN §7 has no security row). | (a) `notifyAdminsHouseBotSwitch` defect branch; (b) `notifyAdminsHouseBotAlert` at danger; (c) a new `notifyAdminsHouseBotSecurity`. | **(a).** Its only caller is `engineSwitchOff` (`outcomes.ts:212`, `else await alerts.security(message);`), which is a master OFF; PLAN:384 says Switch covers "every ON/OFF, manual or automatic". Ruling 111 already separates the two branches by cause, not by emitter. A third emitter would be a second inbox row for one event. |
| **E2** | `HolderAlerts.passwordChanged`, `causeAdded`, `causeCleared`, `officerSetEmail` have no plan-named emitter, and `officerSetEmail` has **no copy anywhere** (A2 row 17 04:112 says only "bell only if officer-set"). | (a) fold 2 and 4 into `notifyAdminsHouseBotPaused` and 5 and 7 into `notifyAdminsHouseBotAlert`; (b) four new emitters. | **(a).** Each `notifyAdmins*` export costs a registry row, a cert-c3 drive and a kyc-copy-truth §6 proof; four more is four more surfaces for one story ("something changed about the holder"). Write `officerSetEmail`'s copy now, in the same voice as C13 04:1050: `House bot "{label}": support set the holder's email address · {HH:MM:SS}` / `An officer set {holder}'s email on {D MMM, HH:MM} EAT. The bot is unaffected; a reset link now goes to the new address.` |
| **E3** | `holderLockedOut(bot)` passes no `until`, but C13 04:1050's copy is `"Holder of Bot A was locked out after 5 wrong sign-in attempts (until {t} EAT). The bot continues."` | (a) widen the member to `holderLockedOut(bot, { untilIso })`; (b) the emitter re-reads `user.lockedUntil`; (c) drop `{t}`. | **(a).** `applyHolderCauses`'s caller already holds the fresh `HolderSnapshot` (`control.ts:60` `readBotAndHolder`), so the value is free; (b) is a second read of one fact and can race the unlock; (c) loses the one number that tells an admin whether to act. Small change to `holder-hook.ts:326` + its §19 cases. |
| **E4** | 02:102 says **"Admin copy is English only"**, but `test:cert-c3` §2 (`comms-notification-truth.test.mts:180-192`) and §5 (`:264`) require `titleSw`, `titleZh`, `bodySw`, `bodyZh` with CJK on **every** bell row, officer fan-outs included. | (a) write sw/zh for every admin house bell, marked for native review; (b) exempt officer rows in the guard. | **(a).** The precedent is already in the tree: `notifyAdminsHouseBotErasureBlocked` (`notification-service.ts:2264-2268`) writes all three. (b) widens a platform guard for one feature. 02:102's sentence is about the **wording effort**, not about writing `null` into a column a Chinese-reading admin's bell renders. |
| **E5** | Where does `notifyAdminsHouseBotAlert`'s per-code copy live, and what makes it exhaustive? | (a) `satisfies Record<AlertCode, AlertCopy>` in a new pure module + an `ALERT_CODES` union in `constants.ts`; (b) a `switch` in the emitter with a `default`. | **(a).** A `default` branch is how a new code ships with no copy. The union belongs in `src/lib/house-bot/constants.ts` beside `ALERT_KEY` (module law §0 allows it), and the copy table in `notification-service.ts` so `test:kyc-copy-truth` §6 walks its literals (see E14). ⛔ none of the six deleted `failure-reasons` codes may be a member (ruling 55). |
| **E6** | How many new email templates? cert-c1 pins the exported count at **66** (`comms-email-truth.test.mts:337`). | (a) one parametrised `houseBotAdminAlertHtml({ eyebrow, heading, body, rows[], ctaUrl, ctaLabel })` shared by Paused / Switch / MoneyEvent / Alert / Roster / StaffChosen → **66 → 67**; (b) one template per emitter → 66 → 72. | **(a).** Every house admin mail is the same shape (eyebrow · heading · one paragraph · detail rows · one CTA) — exactly `houseBotErasureBlockedAdminHtml` (`email.ts:2265-2276`). Six near-identical templates are six places for the chrome, the CTA rule and the escaping to drift, and six `RENDERS` + `PAGES` entries. Move the pin to the **measured** number after the edit, and extend the `:326-336` history comment. |
| **E7** ⛔ **Superseded by D20 (Ali, 2026-09-17):** moot — the staff-edge alert is struck (C5-SPEC rulings 218–223), so there is no copy branch, comms case or planner producer to build or record. | ~~`STAFF_EDGE` copy has **no commit-4 producer** (ruling 78: the monthly pass is Commit 5), yet `test:house-bot-comms` demands "voided, self-decided and staff-edge alerts reach every recipient" (04:3738).~~ | ~~(a) build the copy branch and drive the **emitter** directly in the comms suite, recording the producer as C5; (b) defer the branch and the case to C5.~~ | ~~**(a).** The emitter is a pure function of its message; driving it proves the copy, the recipients and the +60-day href. Record in PROGRESS that the **planner producer** is NOT BUILT (Commit 5) so nobody reads a green comms suite as "staff edge is live".~~ |
| **E8** | `notifyAdminsHouseBotRoster` has no commit-4 producer either — DESIGNATED / VERIFIED / STARTED / PAUSED / REMOVED / RULES_SAVED / LIMITS_SAVED / TARGET_\* are commit-3 services and commit-7 actions. | (a) build the emitter now, drive it in the comms suite, wire the call sites in commit 7; (b) defer the whole emitter to commit 7. | **(a)**, by ruling 46/128's own precedent (build the channel, wire the call site when the producer lands). 04:4394's case is a commit-4 demand, and a roster emitter that ships with commit 7 would ship untested against the C13 +60-day href rule. |
| **E9** | A1's body says "The bot stopped and cancelled {n} queued stake(s)" — false on the **"A1 again"** path (02:93), where `cancelled: 0` and the bot was already paused (`holder-hook.ts:250`). | (a) a second A1 body branch keyed on an explicit `again` flag; (b) key on `cancelled === 0`; (c) leave one body and print "0 queued stake(s)". | **(a).** (b) is wrong for a first A1 that genuinely had nothing queued (an ACTIVE bot between passes); (c) prints a sentence that says the bot stopped when it had already stopped. Widen `HolderAlerts.passwordPaused`'s `change` with `again: boolean`, set it at `holder-hook.ts:250`, and use the §2.3 wording. |
| **E10** | Where do `CHANNEL_POLICY` and `channelAllowed` live? | (a) `comms-registry.ts` beside `NOTIFICATION_KINDS`; (b) a new `channel-policy.ts`. | **(a).** `comms-registry.ts` is already the one home for the kind lists, and `prisma-dal.ts:30` records what a second home costs ("Re-listing MONEY_KINDS here is how a kind added to…"). |
| **E11** | F6's pin "a planted fan-out that skips `channelAllowed` turns the pin red" (04:1726) has **nothing to police**: SMS is not live and `channelAllowed` would have zero production callers. A guard over an absent feature cannot fail. | (a) a source walk over every `sms.ts` send site asserting `channelAllowed(` within N lines, with a planted-violation control **and** a planted-compliant control; (b) defer the pin until SMS goes live; (c) ship the policy table only (compile-time exhaustiveness is real) and record the pin as NOT MEASURED. | **(a) + (c).** Ship `CHANNEL_POLICY` with its `satisfies` (that check is genuinely live), write the source walk over `sms.ts` with **both** controls, and record in PROGRESS that the behavioural half is NOT MEASURED until an SMS provider exists. Do not write a green assertion that would also pass with `channelAllowed` deleted. |
| **E12** | Suite keys: `test:house-bot-comms` and `test:house-bot-holder-lifecycle` do not exist in `package.json`. One suite or two? Both stores? | (a) two keys, each `runTwoStores`; (b) one combined key; (c) memory only. | **(a).** PROGRESS and C4-SPEC:25 name four suites; the holder lifecycle needs Postgres for the freeze/KYC lock nesting and the comms suite needs it for `bumpHourCount`'s EAT hour from the DB clock. **Add both keys to `package.json` before any comment cites them** (`test:guards-exist`, C4-SPEC §7.12). |
| **E13** | The digest house split's DAL shape. | (a) `dailyTotalsByUser` takes `split: "all" \| "personal" \| "house"` and the digest calls it twice; (b) it returns `{ userId, personal: Totals, house: Totals }`; (c) it groups by `(userId, houseBotId IS NOT NULL)` and returns two rows per user. | **(c).** One aggregate, one pass, one shape change, and the SQL stays a single `group by p."userId", (p."houseBotId" is not null)`. (a) doubles the query on every digest night; (b) is a bigger type change for every existing reader. `test:dal-parity` covers the new member in both twins automatically. |
| **E14** | Where do the ten emitters live? `notification-service.ts` is already ~2,290 lines. | (a) all in `notification-service.ts`; (b) in `src/lib/server/house-bot/notices.ts`, re-exported from `notification-service.ts`. | **(a).** `test:cert-c3` §1 reads `Object.keys(N)` (a re-export would pass), but `test:kyc-copy-truth` §6 walks **`notification-service.ts`'s own literals** (`kyc-copy-truth.test.mts:1122-1129`) — copy living elsewhere silently leaves that population, which is a widening nobody would see. Commit 3 put the house copy there for the same reason. |
| **E15** | `scripts/comms-bell-shots.mts` defaults to **:3011**, which is on the forbidden port list. | (a) run with `BELL_BASE=http://127.0.0.1:3021` against `npx next dev -p 3021`; (b) change the script's default and its header comment. | **(a) for this commit** — the override already exists (`comms-bell-shots.mts:31`) and changing a shared QA script's default is a platform edit outside house-bot scope. Record the port in PROGRESS so the next session does not re-derive it; propose (b) to Ali as a separate platform item. |

**15 open points. None needs Ali; W17 remains the only open owner question (C4-SPEC:414).**
