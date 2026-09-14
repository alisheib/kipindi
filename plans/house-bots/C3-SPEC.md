# Commit 3 · designation services: build spec and rulings

> Working aid, written 2026-09-14 on OMEGA-COMPILE01 from a read-only extraction of `04-amendments.md` (`04`), `02-sealed-flows.md` (`02`), `01-scenario-register.md` (`01`), `PLAN.md`, `docs/HOUSE-BOTS.md` (`HB`) and the code at `b6971618`. **It is not an authority.** The documents it cites win, and every `file:line` must be re-derived before use. §6 records the rulings this build takes where the documents disagree or are silent; each ruling becomes a PLAN §18 row when the commit closes.

## 0. Scope of record
- PROGRESS "Scope per commit → Commit 3"; PLAN:499 "Designation, eligibility and password **services** (no actions yet) · `HOUSE_BOT` kind + `notifyHouseBotOwner` + owner email template · `test:house-bot-designation`".
- Placement: 04:645 `| 3 | A3 (service), A4, A5 (designation/erasure), A22 |`; 04:1434 `| 3 | R6 erasure step and house_bot_live |`; 04:4435 N1/N2: A5 erasure pseudonymises `HouseBotPress.reason` and event reasons to "[erased]"; A3 consent void ends every ACTIVE target as ENDED(CONSENT_VOID) with TARGET_ENDED events in the same `wallet:<botUser>` transaction.
- The PROGRESS table has "—" in the red column for commit 3.

## 1. Already built (reuse)
- `src/lib/house-bot/pause-reasons.ts`: `PAUSE_REASONS`, `REMOVE_CAUSES`, `CONSENT_VOID_CAUSES` (SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW), `RG_CAUSES`, `CREDENTIAL_CHANGED_VIA`, `HOLDER_CAUSES` (display order), `REVERIFY_ELIGIBLE_CAUSES`, `HolderCause`, `PauseDetail`, `PAUSE_REASON_WAY_OUT`, `CONSENT_VOID_WAY_OUT`, `wayOutForCause`, `sortCauses`, `canStart(status, causes)`, `canReverify(status, causes, rgLocked)`, `nextActions`. Its header says `holderCauses()` is commit 3.
- `src/lib/house-bot/constants.ts`: `SYSTEM_HOUSE_BOT_ACTOR`, `HOUSE_CONTROL_LOCK`, `PASSWORD_SET_VIA` (REGISTRATION, SELF_CHANGE, RESET_LINK, OFFICER_TEMP, REHASH), `EVENT_KINDS`, `OFFICER_EMAIL_WINDOW_DAYS = 30`, `ALERT_KEY.password/erasureBlocked/submit/…`, `HOUSE_AUDIT` (incl. `house_bot.designated`, `holder_withdrew_consent`, `auto_paused`, `password_verified`, `password_rejected`, `verify_rate_limited`, `verify_account_locked`, `verify_reserved`, `credential_changed`), `HOUSE_AUDIT_FORBIDDEN_KEYS` (label, labelKey, note, fingerprint, phone, displayName, name, email), `isAllowedHouseAuditPayload`.
- `src/lib/house-bot/rules.ts`: `normaliseLabel`, `labelKey`, `validateLabel`, `validateNote`, `validateReason`.
- `src/lib/server/house-bot-dal.ts` `HouseBotStore`: `designate({bot, event}, tx?)` (PAUSED(NEW), rulesVersion 1, runtime row, DESIGNATED event, one transaction; a uniqueness clash rethrows → name it with `uniqueViolation`), `get`, `findLiveByUserId`, `listByUserId`, `listNonRemoved`, `countLive`, `setStatus(id, {from[], to, …})`, `setVerified(id, {fingerprint, verifiedById})` (paused only; sets `verifiedAt`, clears `pausedFromStatus` and credential fields; **no status change**), `setCredentialChanged`, `setConsentVoid(id, cause, tx?)` (conditional `consentVoidAt IS NULL OR verifiedAt > consentVoidAt`; null when a void stands; **no targets, no events**), `pseudonymiseForUser(userId, tx?)` → `{ok:true, bots, events, presses}` | `{ok:false, code:"house_bot_live", botId}` (label `Erased <TAIL6>`, note/removedReason/event reason/press reason "[erased]"; **no notification redaction, no alert**). Also `targetStore.endAllForBot(botId, cause, tx?)`, `houseBotIntentStore.cancelLive`, `houseBotEventStore.append`, `houseBotAlertOnceStore.claim`, `houseTransaction(fn)` (memory restores every map on throw).
- Seam H2 computes consent inline (`seam.ts` `// H2_ORDER:consent`).
- User columns `passwordSetAt`, `passwordSetVia`, `emailSetByOfficerAt` exist in schema, memory store and prisma-dal; **no writer sets them**.
- Reads: `isLockedOut` / `checkLossLimit(userId, stake, tx?)` / `getRgSettings` (`responsible-gambling.ts`); `hasOpenRequest(userId, type)` (`privacy.ts`); `passwordFingerprint` (`password-reset.ts`); `requireOwner` (`rbac-guard.ts`, ADMIN + TOTP); `rateCheckAsync` (`rate-limit.ts`); `displayLabel` gives "Player #TAIL" (`display-label.ts`).

## 2. Rules

### 2.1 `houseBotEligibility(userId, {botId?, context})` — `src/lib/server/house-bot/eligibility.ts`
PLAN:343: "the one function behind picker, card, designate, re-verify and Start". Contexts: `designate` (picker is designate without a password), `reverify`, `start`, `card`.

| Applies | Blocking rows (PLAN:344-349, C9 04:861-866, A4 04:172-175) |
|---|---|
| always | role ≠ PLAYER (staff or AGENT) · status ≠ ACTIVE or `closedAt` (closed copy: "Account closed on {date} — it can't be reopened…") · no password · RG lockout · wallet ≠ ACTIVE / no wallet ("This account has no wallet — it cannot be designated.") · balance read failed (`BALANCE_UNREADABLE`, "Balance unavailable — try again") |
| designate (no botId) | already a live bot · the owner's own account · roster full (`ROSTER_FULL`) |
| designate, reverify, start | open ERASURE request ("He asked for his data to be erased ({dsarId}, {date})…") |
| designate + reverify (password contexts) | `lockedUntil` in the future · `passwordSetVia = OFFICER_TEMP` · `RESET_LINK` with `emailSetByOfficerAt` within the 30 days before `passwordSetAt` · legacy NULL columns → awaited audit read for `player.password_reset_by_officer`; a failed read blocks. Copy: "His password was last set through support ({how}, {date}). Ask him to change it himself in Account settings, then verify." |
| start (botId) | OWNER_LOSS_LIMIT while `checkLossLimit(userId, stakeMinTzs)` refuses · today's realised loss ≥ `capDailyLossTzs` · the RG backstop: `max(selfExclusionStartedAt, coolingOffStartedAt) > verifiedAt` refuses; a failed read refuses (04:140) |

- Warnings (PLAN:351): email unverified · identity never approved · recruited by agent · open positions · leaderboard shows the display name's first word.
- RG lockout blocks re-verify, uncounted and before any password check, while `isLockedOut(userId).locked` or status SELF_EXCLUDED / COOLED_OFF (PLAN:774, C8 04:828, A3 04:137). Copy: "Can't ask for his password while he is {self-excluded | on a break} (until {D MMM YYYY}). His permission can be confirmed again only after it has ended."
- Re-verify allowed only when causes ⊆ {PASSWORD_CHANGED, CONSENT_VOID}, the password-context rows pass and no RG lockout (04:137). Start allowed only with no causes (04:136).
- Started bots are not blocked by "already a live bot" (PLAN:516).
- Suspension, freeze, role change: consent is kept; after restore Start is enabled without re-verify (04:873).
- Picker reasons (02:266-274): "Staff account", "Agent account", "Not active ({status})", "No password set", "Already house bot "{label}"", "Your own account", "Roster full ({n} of {max})", "Sign-in locked until {HH:MM}".

### 2.2 `holderCauses(...)` and `consentValid(bot, user)`
- `consentValid = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)` — one predicate for H2, Start, the strip and `?reverify=1` (PLAN:789). A void with an unchanged password still requires re-verify (never NOT_NEEDED).
- Causes are recomputed live, ordered by `HOLDER_CAUSES`; CONSENT_VOID is listed only while a void stands and its original cause is no longer live (HB:453). `pauseReason` never gates (HB:437-439).

### 2.3 `verifyHouseBotPassword` — reserved attempts, never a session (C4 service side)
1. Empty input → refused uncounted, never trimmed (02:160).
2. Fresh bot read (re-verify): REMOVED → refuse; ACTIVE with a matching fingerprint → no-op (PLAN:609).
3. Password-context rows and the RG block, uncounted, before any password check (C8).
4. Rate bucket `housebot.verify` {capacity 3, refill 0.2/min}, key `<officer>:<target>` (02:165, PLAN:356). Refused → SECURITY `verify_rate_limited`; the holder's counter is untouched.
5. **Reserve** (04:1838): `failedLoginCount >= LOCKOUT_MAX_FAILS − 2` → `verify_reserved`, password not checked. Copy: "Stop here — the last 2 attempts are kept for the holder. Ask him to sign in once (that resets the count), then try again." Holder bell (04:1058): "Someone at 50pick tried to confirm your permission with a wrong password. Your sign-in is not locked."
6. Inside `withLock("login:"+userId)` on the re-read row: clear an expired lock as login does; verify against the **fresh** row's salt and hash (04:1832: login's pre-lock pattern must not be copied); wrong → `failedLoginCount + 1`, **never set `lockedUntil`** (C4 04:1839, PLAN:612); right → reset the count and clear the lock. Wrong copy: "That isn't his current password. It was changed on <passwordSetAt> via <passwordSetVia>. N attempts left."
7. Return: success → `passwordFingerprint(hash)`; refusal → `attemptsBeforeLock` and `retryAfterSec`.
8. **Never** a session, cookie, `ActiveSession` row, `lastLoginAt`, bootstrap-admin promotion or `auth.login.*` audit. SECURITY audits `password_verified | password_rejected | verify_rate_limited | verify_account_locked | verify_reserved`. The password never reaches logs or errors (PLAN:360, 02:235-239).
- `LOCKOUT_MAX_FAILS` (5) and `LOCKOUT_DURATION_MS` are module-private in `auth-service.ts`: export or share them.
- Double submit: `submitId` claimed through AlertOnce `submit:<actor>:<id>` before the password check (04:1851).

### 2.4 Designate service — `src/lib/server/house-bot/designation.ts`
Order (C4 04:1844-1847, C9 04:874, A3 04:142):
1. Eligibility (designate), including roster full and a readable balance — before the password, so no attempt is spent.
2. Password check (§2.3).
3. Under `wallet:<userId>`: re-read the hash; if `fp(fresh) ≠ fp(verified)` → field `password` "His password changed a moment ago — enter the new one.", no row. Then under `house:control`: count again (`count < maxDesignatedBots`), else "The roster is full (5 of 5). Remove a bot or raise Max designated bots on Limits →"; insert PAUSED(NEW) + runtime row + DESIGNATED event in one transaction.
- Label clash (incl. concurrent, `HouseBot_labelKey_live_key`) → field `label`: "Another bot is already called "Bot A" (Paused). Choose a different label." Same-account clash (`HouseBot_userId_live_key`) → `{ok:false, data:{botId}}` "This account is already a house bot."
- Audit COMPLIANCE `house_bot.designated`, awaited, outside the locks, payload without label/note/fingerprint (R7 04:1287 wins over 02:294).
- Holder notice (bell + push + email): "Your account now provides liquidity" / "50pick will place liquidity stakes from your account as you agreed. You keep full use of it. Nothing is placed until 50pick starts them. You can stop this at any time by changing your password or contacting 50pick." (02:302 + 04:1059)
- Re-designating a removed account creates a new row (02:305).

### 2.5 Re-verify write
02:172-177 / PLAN:614: release the login lock, take `wallet:<bot>`; if the stored hash's fingerprint no longer matches the verified one → "His password changed again while you were typing. Ask him for the newest one." (not counted); else `setVerified` (fingerprint, `verifiedAt/ById`, clear credential fields, `pausedFromStatus = null`); if the bot is AUTO_PAUSED, move to PAUSED(MANUAL); event VERIFIED; SECURITY audit `password_verified`. Holder notice `reverified` (bell + push + email, 04:1057): "50pick confirmed your permission for liquidity stakes with your current password at {HH:MM} EAT. If you did not give your password to 50pick, change it now — that stops liquidity stakes at once."

### 2.6 Consent void service
- Causes: exactly `CONSENT_VOID_CAUSES`. Callers: the holder hook, the L2 sweep and the mapper (commit 4) and `withdrawHouseConsentAction` (holder, HOLDER_WITHDREW, COMPLIANCE `holder_withdrew_consent`).
- For a non-REMOVED bot in any status, under `wallet:<botUser>`, one transaction: `setConsentVoid` (conditional); event CONSENT_VOIDED; **end every ACTIVE target as ENDED(CONSENT_VOID) with one TARGET_ENDED event each** (N2 §4 step 10, 04:4009; no audit per target); ACTIVE bot → AUTO_PAUSED(first cause) with `pausedFromStatus = ACTIVE` and live intents cancelled; PAUSED / AUTO_PAUSED → status kept, HOLDER_CAUSE_ADDED; REMOVED → nothing. A rollback leaves targets ACTIVE; a second pass changes nothing; Re-verify and Start never revive targets (01 TGT-40).
- Suspension is not a void: targets stay ACTIVE and inert.
- Audit `house_bot.auto_paused` (COMPLIANCE, awaited, outside the locks). RG causes send no holder notice (C8); OWNER_LOSS_LIMIT is not an RG pause and does not void.

### 2.7 Password history writers (A4, 04:165-170)
Same update as the hash:

| Via | Writer |
|---|---|
| REGISTRATION | `registerWithPassword` create (`auth-service.ts`) |
| RESET_LINK | `consumeResetToken` (`password-reset.ts`) |
| OFFICER_TEMP | `adminResetPassword` (`password-reset.ts`) |
| SELF_CHANGE | `changePassword` (`password-reset.ts`) |
| REHASH | no writer exists; value reserved |
| `emailSetByOfficerAt` | the officer email writer (`setPlayerEmailAction` → `setUserEmail`) |

### 2.8 Erasure (A5 04:209-213, R6 04:1251-1254)
- `anonymizeClosedAccount` refuses `house_bot_live` while any non-REMOVED bot row exists, before any destructive write. Error: "This account is still house bot hb_…. The owner must remove it at /admin/house-bots/<id> before it can be erased." AlertOnce `erasure-blocked:<botId>` to the owner by bell and email.
- On success: `pseudonymiseForUser`; for each bot row `db.notification.redactFragment('"'+label+'"', '"Erased bot '+tail+'"')`; counts `houseBots` and `houseBotNotificationsRedacted` in `privacy.erasure.completed`.
- `{holder}` in admin HOUSE_BOT copy is "Player #TAIL" (never a name or phone).

### 2.9 Recipients (A22)
`houseBotAlertRecipients()` in `src/lib/server/house-bot/alerts.ts` — the same rule as the owner guard (today `requireOwner`: every ACTIVE ADMIN). Its alert callers arrive in commits 4 and 7.

### 2.10 `HOUSE_BOT` kind, `notifyHouseBotOwner`, owner email
- Kind lists: `comms-registry.ts` `NOTIFICATION_KINDS` / `MONEY_KINDS` / `NOTIFICATION_EMITTERS`; `store.ts` `StoredNotification["kind"]`; `notification-appearance.ts` icon and tint. Never SMS (04:1061).
- Guards: `test:cert-c3` (registry both ways, every emitter driven, en/sw/zh, money kinds must carry a figure), `test:cert-c1` (email templates registered ↔ exported ↔ rendered; exported count pinned), `test:notifications-page`.
- Owner notices (PLAN:387, 04:1056-1059, 02): designated (bell + push + email), started "Liquidity stakes started", paused "Liquidity stakes paused", password pause "Your password changed, so 50pick stopped placing liquidity stakes from your account. Your balance and open stakes are unchanged.", removed (bell + push + email) "Liquidity stakes ended" / "50pick no longer uses your account for liquidity stakes. Open stakes settle to your wallet as normal.", reverified (bell + push + email), verify_reserved (bell). Link always `/positions`. **Every holder emitter returns early while `isLockedOut(userId).locked`** (04:1060).

## 3. Tests (`test:house-bot-designation`, memory + scratch Postgres)
- PLAN:516: every blocking row per context (incl. started bots not blocked by "already a live bot"); officer-reset refusal; empty password uncounted; counter and `attemptsBeforeLock`; no session, no `lastLoginAt`; re-designate = new row; Start refused at the loss cap.
- 02 §2.6: holder's `ActiveSession` unchanged and `lastLoginAt` identical; no `session.created` audit; a rate-limit refusal leaves the count unchanged.
- A3 (04:151-156): self-exclude → re-verify refused while excluded, allowed after; a password change between verify and insert creates no row; every pair of causes in every clear order leaves an action other than Remove.
- A4 (04:189-193): officer reset with `audit()` dropped → refused (reads the column); officer-set email then reset link → refused; holder's own email plus reset → allowed.
- C4 (04:1856-1862): 3 wrong tries → the 4th refused uncounted, `lockedUntil` stays null, the holder can still sign in; a concurrent double submit adds 1; roster full before the check → counter unchanged; two designates at 4 of 5 → one bot + one ROSTER_FULL.
- C8 (04:839-845): same password after self-exclude + reopen → not NOT_NEEDED, H2 `house_consent_stale` until re-verify; re-verify during the lock refused and the count unchanged; a PAUSED(MANUAL) bot plus self-exclusion → status unchanged, `consentVoidAt` set, 0 holder rows; a second RG episode after a re-verify voids again; a fingerprint-only predicate fails case 1 (control/mutation).
- C9 (04:878-887): each row per context with its copy; suspend then restore → Start without re-verify; interleaved password change → 0 rows.
- C2: concurrent same-label designate → 1 bot + 1 field error; a removed "Bot A" frees the label.
- N2 (sealed, 04:4397-4399): each of the 5 void causes ends every ACTIVE target as CONSENT_VOID in the wallet transaction with TARGET_ENDED events; a suspension keeps them ACTIVE; an injected rollback leaves them ACTIVE.
- R6 erasure: a live bot → `house_bot_live`, request stays PENDING, exactly 1 owner alert.

## 4. Not in commit 3
- Commit 7: every `*Action`, `requireHouseOwner`, the wizard and picker DAL, `houseBotsLive()`.
- Commit 4: `holder-hook.ts` and the writer call sites (A2 (l)), the L2 sweep, the mapper, closure → REMOVED(ACCOUNT_CLOSED), the credential detection matrix, the admin emitters, the writer walker (`test:house-bot-holder-lifecycle`).
- Commit 5: DSAR view, `test:dsar-secrets`, the `test:erasure` house buckets.
- No migration, no CHECK change. Master switch OFF; designate only on memory or the scratch Postgres.

## 5. Open points found in the documents
1. A22 / A5 placement: 04:2100-2104 say A5 → 4, A22 recipients → 7; 04:645/1434 and PROGRESS say 3.
2. Erasure tests: 04:1434 says 3; HB:640 and 04:4437 say 5.
3. The consent predicate is inline in seam H2 (pinned by the seam anchors).
4. Designate lock nesting is unstated (C4 `house:control`, C9/A3 `wallet:<userId>`).
5. Attempts: 02:169/186 "lock at 5" vs C4 "admin attempts never set `lockedUntil`"; `attemptsBeforeLock` base unstated.
6. Reserve alert: 01 HB-ACC-19 admin bell vs 04 C13 holder bell.
7. The password-writer source pin: 02:19 designation suite vs A2 04:119 holder-lifecycle suite (commit 4).
8. OTP registration (null hash): write REGISTRATION? Erasure nulls the hash: touch the columns?
9. `emailSetByOfficerAt` when the holder later sets their own email.
10. Resume with the master switch OFF: C4 PAUSED(MANUAL) vs 02:193 / C10 ACTIVE.
11. Status after re-verify: "if the reason was PASSWORD_CHANGED" vs "reasons never gate"; `setVerified` changes no status.
12. Void holder notice: C8 none (RG) vs A2 rows 14/15.
13. `HOUSE_BOT` in `MONEY_KINDS` (PLAN:378) vs cert-c3 "a money kind must state a figure" — the owner notices carry no amount.
14. Superseded scenario rows: CA-03 (A1), CRA-05 (A5), FS-31 (04:44), FS-23, FS-02, CA-26 (C10).
15. Designate audit payload: 02:294 label vs R7 no label.
16. Erasure count names and label forms ("Erased <tail>" row vs "Erased bot <tail>" notification).
17. Mutations asked by C8/A3/HB-ACC-03/HB-ACC-19 with "—" in the red column.
18. Start service ownership: tests need Start refusals; Start is a commit-7 action.
19. `LOCKOUT_MAX_FAILS` not exported; `playerHandle` does not exist.
20. Password input attributes (commit 7): 03 `off` vs 04 `new-password`.

## 6. Rulings this build takes (authority order: 04 > 02/03 > PLAN > 01; later and more specific wins)
1. **A5 erasure half and the A22 resolver are built in 3**; closure (A5 F8b) is 4; A22's alert callers are 4 and 7.
2. **Erasure:** the `house_bot_live` refusal, pseudonymising and notification redaction are wired in 3 and proven in `test:house-bot-designation`; the `test:erasure` bucket additions stay in 5.
3. **One consent predicate:** a pure `consentValid` in `src/lib/house-bot/`, and seam H2 calls it. The seam anchors are re-aimed at the call (same defect).
4. **Designate nesting:** `wallet:<userId>` → `house:control` (the global order, as C6's rules save).
5. **C4 wins:** admin attempts never set `lockedUntil`. `attemptsBeforeLock = max(0, LOCKOUT_MAX_FAILS − 2 − failedLoginCount)` — the tries the admin may still make before the reserve.
6. **Reserve notice:** the holder bell (C13).
7. **Source pin:** the password-write allow-list pin lands in 3 in `test:house-bot-designation` (a narrower pin; commit 4's walker supersedes it).
8. **OTP registration:** no history write for a null hash (there is no password); erasure leaves the columns (the row is anonymised; eligibility refuses a closed account first).
9. **`emailSetByOfficerAt`** is set only by the officer writer and never cleared; the 30-day window is what expires it (A4 reads it relative to `passwordSetAt`).
10. **Resume with master OFF:** Start's own result decides (ACTIVE with the "switched off" line, per C10 and 02:193); the C4 test row is recorded as superseded by C10.
11. **After re-verify:** an AUTO_PAUSED bot moves to PAUSED(MANUAL) (the causes, not the reason, gate what follows).
12. **Void holder notice:** none for RG causes (C8); HOLDER_WITHDREW gets the holder confirmation; HOLDER_ERASURE_REQUEST and IDENTITY_REFUSED follow A2 rows 14/15 when their emitters land (commit 4).
13. **`HOUSE_BOT` is not added to `MONEY_KINDS`.** A money kind must state a figure, and the owner notices state none; weakening cert-c3's figure rule is not allowed. Recorded for Ali as a deviation from PLAN:378 with this default.
14. Superseded scenario rows are not built as written.
15. R7 wins: no label in any audit payload.
16. Counts `houseBots` (bots pseudonymised) and `houseBotNotificationsRedacted`; the row label is the DAL's `Erased <TAIL6>` and the notification fragment `"Erased bot <TAIL6>"`, as R6 writes.
17. The asked-for mutations are written as in-suite controls (a planted fingerprint-only predicate, single-reason gating) that must fail; no new `red:` key.
18. **Start in 3 is a service** (`startHouseBot` refusal chain and write) that the commit-7 action will call; no action, no console.
19. Export the lockout constants from `auth-service.ts`; `playerHandle` = `displayLabel({id, displayName: null})`.
20. Commit 7 uses `autoComplete="new-password"` (04).
