# House Bots — verified plan amendments (ALL MANDATORY)

Order of authority: this file > 02-sealed-flows.md / 03-design-spec.md > PLAN.md body. Overlaps between amendment sets are resolved in PLAN.md §18.

Contents: A1–A24 (flows, data, money seam, engine) · C1–C3, C8–C15 (rules, consent, notifications, console) · R5–R9, P2–P4 (reporting, public text) · S/F (release, verification, future safeguards) · earlier set C4–C7, R1–R4, P1 and sequencing notes (last section).

# House bots: plan amendments A1–A24 (§1 Flows, §2 Data model, §3 Money seam, §4 Engine)

All code paths are under `C:\kipindi-main\`. Every `path:line` below was checked against the working tree (HEAD `ac411357`, which includes the local KYC work).

> ⚠️ **Line anchors in this file are as of 2026-09-13.** Since then the KYC-at-withdrawal release reached `origin/main`, and its audit fixes moved code in `kyc-service`, `auth-service`, `wallet-service`, `wallet-freeze`, `user-service` and `notification-service`; `TERMS_VERSION` moved to `src/lib/terms-version.ts`. Any "local only" KYC commit or `origin/main` SHA quoted below is history. Re-derive every `path:line` against the merged code before relying on it (PROGRESS.md RESUME AT).

Numbering follows the slots in the sequencing notes where they name the content: A1, A2, A3, A7, A8, A9, A11, A12, A15, A18, A19, A20, A21, A22, A23. The remaining numbers are assigned here. Slot A6 (data-rights export, D10) is outside §1–§4 and is not written.

## 0. Dropped gaps

**Already covered elsewhere**
- **HB-ACC-16:** seal-flows §6 (a REHASH refreshes the fingerprint). Its writer pin is merged into A2.
- **HB-ACC-19, HB-ACC-20:** C4 (reserved attempts, verify against the fresh row, resume checkbox, split outcome).
- **HB-ACC-26:** seal-flows X4 plus the §2.6 step 7 mismatch check.
- **HB-ACC-30:** seal-flows L1 (RESET_LINK) and §2.2.
- **FS-02:** seal-flows L1/L2/L3 and the §2.2 erased row.
- **CA-03:** the sign-out half is ruled out (see A1); the immediate pause is seal-flows L1.
- **HB-LC-05:** contradicts the accepted R3 (losses counted by the day the stake was placed).
- **HB-LC-14:** R3's source pin and book.ts reading marked transactions.
- **HB-LC-17, HB-LC-20, FS-25:** R2.
- **HB-LC-24, FS-29:** R3 (fees from transactions); the frozen-rate part is in A14.
- **HB-LC-27:** the projected loss already counts open stakes as lost; R2 and (h) cover the rest.
- **HB-LC-31, CRA-28, FS-26:** I2 and I10; stage-1 is an early close in A16, so only a test line is added.
- **ENG-26:** R3's midnight test.
- **ENG-33:** mechanics merged into A8 and A10.
- **ENG-35, CA-11, CA-21, CA-24:** C6.
- **FS-05:** R4.
- **FS-30:** P1.
- **FS-28:** plan (e) plus the money test "no cash-out".

**Not in §1–§4**
- HB-ACC-12, CRA-04, CRA-10: data-rights export (slot A6).
- HB-ACC-36, HB-ACC-37: console warnings and the Remove modal.
- ENG-28, FS-17: notification volume and channels (§7).
- FS-20: min-gap bound derivation (§5).

**Against a ruling, speculative, or partly false**
- **FS-31:** contradicts D5 (consent is password only). It becomes an information row in A2.
- **FS-23:** the bet identity gate was deleted with a "do not restore" note (`market-service.ts:1079-1082`). Any new refusal reason is caught by A10's compile check.
- **FS-34:** there is no currency-change path.
- **FS-06:** retiring the programme is an owner-level decision; master OFF, Remove and the engine env var are enough for v1.
- **FS-09:** already covered by seal-flows §3.2/§3.5/§3.7 admin alerts, apart from the diff alerts in A22.
- **HB-ACC-08, pause or refuse options:** the owner ruled alert only (A21).
- **HB-ACC-29, "consent stays intact":** overruled; any RG pause voids consent (A3).
- **seal-flows X3, "status causes don't block re-verify":** superseded for RG causes (A3).
- **ENG-07, the premise:** the start script is `prisma migrate deploy && next start` (`package.json:12`), so migrations apply at boot. What remains is in A23.

---

## 1. Amendments

### A1 · RECORD ONLY · Signing out other devices on a password change is not built
*Merged:* HB-ACC-07, CA-03 (the sign-out half).

*Evidence:* the three password writers (`password-reset.ts:242`, `:271`, `:326`) never call `revokeUserSessions`. Suspend (`players/[id]/actions.ts:122`), self-exclusion (`responsible-gambling.ts:278`), role change (`staff/actions.ts:39`) and closure (`user-service.ts:121`) all do.

*§13, add risk 7 (and a COMPLIANCE "not in this build" line):* "A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13). Recommended hardening, as a separate platform commit: revoke at the three writers, re-mint the session of the device that made the change, and add login copy `kp_revoked=pw`. House consent is unaffected either way, because consent is the fingerprint, never a session."

*Test:* `test:docs` greps the risk line.

### A2 · MAJOR · One holder hook at every writer, and the full change matrix
*Merged:* HB-ACC-01, -09 (partly), -11, -15, -21, -22, -23, -24, -28, -31, -33, -34, -35, FS-14 (approval hook), CRA-05(a).

*Evidence:* seal-flows L1 hooks only the password writes. Every other I9 change waits for the 15 s sweep. Writers confirmed:
- `staff/actions.ts:36`, `auth-service.ts:1049`
- `agent-application-service.ts:1308`, `:1406`
- `players/[id]/actions.ts:121`, `:188`
- `responsible-gambling.ts:130`, `:274`, `:315`
- `user-service.ts:91`, `wallet-freeze.ts:64`, `kyc-service.ts:776`
- `privacy.ts:80`, `auth-service.ts:972`
- `email-verification.ts:134`, `:162`, `player-2fa.ts:35`, `:77`

*§4.1, replace `credential.ts`/`onHolderCredentialWrite` with `holder-hook.ts` `onHolderAccountChanged(userId, event, meta)`:*
- It is fired after the write (`void import().catch(()=>{})`).
- It does one indexed read for a live bot, else returns.
- Under `wallet:<userId>` it re-reads bot, user, wallet, RG settings and privacy queue, recomputes `holderCauses()` (A3) and applies the matrix.
- Writes are conditional, so the hook and the L2 sweep are idempotent together.
- The L2 sweep covers every row below, whatever the master switch.

*§3, sanctioned change (l):* the hook call at each writer. For a user with no bot, output and timing are unchanged.

*Status rules:*
- **ACTIVE:** goes to AUTO_PAUSED (first cause) with `pausedFromStatus=ACTIVE`; PENDING and CLAIMED intents are cancelled conditionally.
- **PAUSED or AUTO_PAUSED:** status is kept, the cause set is updated, event HOLDER_CAUSE_ADDED is written, and admins get a bell only. Rows 5, 11 and 14 also send email.
- **REMOVED:** nothing happens.
- Every holder house notice returns early while `isLockedOut` (`responsible-gambling.ts:349`).

| # | Change (writer) | Cause | Consent | Admin | Holder | Way out |
|---|---|---|---|---|---|---|
| 1 | Password changed in settings `password-reset.ts:326` | PASSWORD_CHANGED{SELF_CHANGE} | stale | seal-flows A1/A2 | H1 if it was ACTIVE | Re-verify → Start |
| 2 | Reset link `:242` | PASSWORD_CHANGED{RESET_LINK} | stale | same | H1 | Re-verify (A4 check) → Start |
| 3 | Support temporary password `:271` | PASSWORD_CHANGED{OFFICER_TEMP} | stale, re-verify blocked | officer-reset copy | "Change the temporary password in Account settings" | holder changes it himself → bell "set his own password" → Re-verify → Start |
| 4 | Erasure nulls the hash `erasure.ts:397` | none (already REMOVED by row 5) | — | — | — | — |
| 5 | Account closed `user-service.ts:91` | ACCOUNT_CLOSED | void | bell + email with balance and open stakes | email only | none: auto-REMOVED (A5) |
| 6 | Self-exclusion `responsible-gambling.ts:274` | SELF_EXCLUDED{until} | void | bell + email | none (RG) | officer reopen (`players/[id]/actions.ts:161-188`) → Re-verify → Start |
| 7 | Cooling-off `:315` | COOLING_OFF{until} | void | bell + email; AlertOnce when the break ends | none | expiry → Re-verify → Start |
| 8 | Own loss limit set or lowered (`setLimits :130`) | OWNER_LOSS_LIMIT while `checkLossLimit(stakeMin)` refuses (rolling 24 h, `:501`) | intact | bell + email "frees HH:MM EAT (rolling 24 h)" | none | window frees or limit raised → Start |
| 9 | Suspended `players/[id]/actions.ts:121` | ACCOUNT_SUSPENDED | intact | bell + email with the officer's reason | none | restore `:188` → bell → Start |
| 10 | Officer or force-reverify freeze `wallet-freeze.ts:64` | WALLET_FROZEN{reasons} | intact | bell + email naming each hold | none (may be AML; no tipping off) | last hold lifted → Start |
| 11 | Final identity refusal `kyc-service.ts:776` | IDENTITY_REFUSED | void | bell + email "officer decides TZS X, which includes 50pick float"; Remove recommended | none | `reopenFinalRefusal` `:825` → Re-verify → Start |
| 12 | Promoted to staff `staff/actions.ts:36`, bootstrap `auth-service.ts:1049` | ROLE_CHANGED{to} | intact | bell + email | "role changed" notice | role back to PLAYER → Start |
| 13 | Agent approved or revoked `agent-application-service.ts:1308`/`:1406` | ROLE_CHANGED{AGENT} / cleared | intact | bell + email | as row 12 | revoke → Start |
| 14 | Erasure request filed `privacy.ts:80` | HOLDER_ERASURE_REQUEST | void | bell + email (once per request id) | "stopped while we handle your request" | request withdrawn → Re-verify → Start, or Remove |
| 15 | Holder presses "Stop liquidity stakes" (A3) | HOLDER_WITHDREW | void | bell + email | confirmation | Re-verify → Start |
| 16 | Locked out by failed logins `auth-service.ts:972` | none: no pause, or anyone could stop a bot | intact | AlertOnce SECURITY bell | none | — |
| 17 | Email set or cleared `email-verification.ts:134`/`:162`; officer-set email | none | intact; an officer-set email arms A4 | bell only if officer-set | none | — |
| 18 | 2FA on/off `player-2fa.ts:35`/`:77` | none (D5) | intact | event plus info row | none | — |

*Test (new `test:house-bot-holder-lifecycle`):*
- Each row, with the switch OFF, gives the listed status, cause, recipients and channels.
- With the hook disabled, the sweep produces the same result.
- A user with no bot gets zero extra writes.
- A shrink-only source walker checks writers of passwordHash, role, status, phoneE164, twoFactorEnabled and email, the freeze helpers, the RG upserts and `fileDsarRequest`. It must call the hook; a planted RED fixture fails.

### A3 · BLOCKER · A live cause set, void consent, and re-verify gating
*Merged:* HB-ACC-02, -06, -10, -17, -18, -27, -29, FS-16, and the RG part of seal-flows X3.

*Evidence:*
- F6 lets Start return "until eligibility passes again". After an officer reopens a self-exclusion (`players/[id]/actions.ts:161-188`), or once a cooling-off timer lapses (`market-service.ts:1043-1044`), Start would run on the old consent. That breaks the owner's ruling.
- The RG start stamps survive a re-take (`responsible-gambling.ts:267`, `:312`), and the activation audits are not awaited (`:281`, `:316`). Neither alone is a durable "new pause" signal.

*§2 HouseBot, add:*
- `consentVoidAt timestamptz null`
- `consentVoidCause text CHECK IN (SELF_EXCLUDED, COOLING_OFF, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW)`

*`pause-reasons.ts`, add:* ACCOUNT_SUSPENDED, ACCOUNT_CLOSED, IDENTITY_REFUSED, HOLDER_ERASURE_REQUEST, HOLDER_WITHDREW, UNMAPPED_REFUSAL and RULES_INVALID. ACCOUNT_BLOCKED stays only for an unreadable status.

*F6 and §6, replace the table with:*
- **Causes:** `holderCauses(bot, user, wallet, rg, privacy, fingerprint)` returns the ordered live causes. `pauseReason` is history only.
- **Start** is allowed only when there are no causes (plus the F3 checks).
- **Re-verify** is allowed only when the causes are limited to PASSWORD_CHANGED and CONSENT_VOID, the password-context rows pass, and no RG lockout stands (status SELF_EXCLUDED or COOLED_OFF, or `isLockedOut().locked`). Otherwise: "Re-verify after the break ends."
- **Writing `consentVoidAt`:** by the A2 hook, the L2 sweep, and the mapper on RG or identity refusals.
- **Clearing it:** only by a re-verify whose `verifiedAt` is after the RG end.
- **Start backstop:** refuse if `max(selfExclusionStartedAt, coolingOffStartedAt) > verifiedAt`; a failed read refuses.

*Designate:* inside the insert transaction under `wallet:<user>`, compare `passwordFingerprint(fresh hash)` with the verified fingerprint. On a mismatch: "His password changed a moment ago — enter the new one." No row is created.

*F10, add the holder action `withdrawHouseConsentAction`:*
- Holder session only, behind a ConfirmDialog on the /positions chip.
- Sets HOLDER_WITHDREW and writes COMPLIANCE `house_bot.holder_withdrew_consent`.
- Copy (en/sw/zh): "Done — 50pick won't place new liquidity stakes from your account. Open stakes settle as normal."

*F6 alerts, add:* after VERIFIED the holder gets bell + push + email: "50pick confirmed your permission using your current password at HH:MM EAT. If you did not give it, change your password and contact support."

*Test:*
- Self-exclude, then officer reopen: Start refused. Re-verify is refused while excluded and allowed after; then Start succeeds.
- Cooling-off expiry: Start refused until re-verify.
- With hook and sweep both disabled, the backstop still refuses.
- Every pair of causes, in every clear order, leaves at least one enabled action other than Remove. RED: single-reason gating fails.
- A password change between verify and insert creates no row.

### A4 · MAJOR · Durable password history, plus §2 column rules
*Merged:* HB-ACC-03, -25, -34, ENG-12, FS-07.

*Evidence:*
- The officer-reset audit is fire-and-forget (`password-reset.ts:273`), so seal-flows' "latest password write" read of the audit log can miss it.
- An officer-set email (`players/[id]/actions.ts:232`) followed by a reset link is audited as the holder's own reset (`:244`).

*§2 User (expand-only), add:*
- `passwordSetAt timestamptz null`
- `passwordSetVia text CHECK (REGISTRATION, SELF_CHANGE, RESET_LINK, OFFICER_TEMP, REHASH)`
- Both are written in the same update at registration (`auth-service.ts` create) and at `password-reset.ts:242`, `:271`, `:326`.
- `emailSetByOfficerAt timestamptz null`, written by the officer email writer.
- All have memory twins.

*§6 password-context blocking rows:*
- Block when `via` is OFFICER_TEMP.
- Block when `via` is RESET_LINK and `emailSetByOfficerAt` falls within the 30 days before `passwordSetAt`.
- Legacy rows with null values fall back to the audit read, and a failed read blocks.

*§2 house tables:*
- Every time column is `@db.Timestamptz(3)`.
- The engine refuses to boot unless `current_setting('TimeZone')` is UTC or Etc/UTC.
- Position and Transaction bounds keep ISO `::timestamp` casts.

*§2 rules JSON:*
- Add `schemaVersion`, and `limitsSchemaVersion` on the control row. These are separate from the CAS versions.
- `parseHouseBotRules` returns one of:
  - RULES_FROM_FUTURE: the fire requeues, the planner skips that bot, no pause.
  - RULES_INVALID{field}: AUTO_PAUSED; way out is Save, then Start.
- Any new field defaults to deny.

*Test:*
- Officer reset with `audit()` dropped: designate and re-verify are refused.
- Officer-set email, then a reset link: refused. The holder's own email plus reset: allowed.
- Claim SQL gives the same rows under `SET TIME ZONE 'Africa/Dar_es_Salaam'`.
- Rules at v99: the intent stays PENDING and the bot's status is unchanged.

### A5 · MAJOR · Closure removes the bot; erasure pseudonymises it
*Merged:* HB-ACC-04, -05, CRA-05, CRA-06.

*Evidence:*
- CLOSED is never restored (`players/[id]/actions.ts:176-177`), yet the mapper labels it `account_blocked` or `wallet_frozen` (`market-service.ts:1076`, `:1170`).
- Erasure requires CLOSED (`erasure.ts:169`).
- Settlement still pays a CLOSED wallet; it throws only when the wallet row is missing (`market-service.ts:3558`).

*F8b Closure (new):*
- The A2 hook or the sweep sets REMOVED(ACCOUNT_CLOSED) by `system_house_bot` and cancels intents.
- Awaited COMPLIANCE `house_bot.removed{cause}`.
- Admins get bell + email with the balance and open house stakes. The holder gets email only.
- Marked open positions settle into the closed wallet.

*Erasure step `pseudonymiseHouseBotsForUser` (with memory twin):*
- The label becomes "Erased <botId tail>". The note, `removedReason` and event reason text become "[erased]".
- Ids, markers, intents and amounts are kept.
- `counts.houseBots` goes into `privacy.erasure.completed`.
- Erasure is refused (`house_bot_live`) while any non-REMOVED bot row exists.

*§4.4:* `why` and `decision` store only `playerHandle(userId)` ("Player #" plus the tail) and `triggerUserId`, never a display name, masked name or phone. Names resolve at render.

*Test:*
- Close: REMOVED within the hook; a later WIN pays the closed wallet and reports tie.
- The erasure sweep finds no NAME in house tables.
- A trigger with a display name produces a `why` holding only the handle.

### A7 · MAJOR · Bet context, stake bounds, cash only by construction
*Merged:* FS-08, FS-13, FS-15, HB-LC-18.

*Evidence:*
- Bounds are resolved per market, then per chain for Up & Down (`market-service.ts:1099-1119`, `updown-config.ts:1330`, `:1345`), and they can change after a decision.
- The plan maps `stake_below_min` and `stake_above_max` to FAILED plus an alert.

*§3 changes:*
- **Context:** replace `house?` with `ctx: {kind:'player'; playStartedAt?} | {kind:'house'; botId; intentId}`. Gates that read context must handle every kind (`never` check).
- **HOUSE-BOTS.md ruling:** a house bet neither advances nor is refused by the holder's session clock.
- **H2, house kind:** `realPart = stake` and `bonusPart = 0` before the affordability check; `balance < stake` refuses `house_cash_only`.
- **Sanctioned change (p):** extract `stakeBoundsForMarket(market)` from `:1099-1105` with identical output. decide.ts and F5 step 9 clamp through it, intersected with the bot's caps, then round down.

*§4.6, split the stake row:*
- `below_min` or `above_max`: SKIPPED(STAKE_BOUNDS_CHANGED), no alert.
- `not_whole`: FAILED plus AlertOnce.
- The planner moves a bot whose minimum is below the platform minimum to AUTO_PAUSED(RULES_INVALID{stakeMinTzs}).

*Test:*
- Raising the chain minimum after a decision gives SKIPPED and 0 alerts.
- The extracted function equals the inline result for a poll, a poll with an override, and a round.
- Gate-parity table: maintenance, cooling-off, SUSPENDED, CLOSED, frozen, own loss limit, bounds and closed market give the same reason for `placeHouseBet` and `buyPosition`.
- Bonus 50,000 with balance 1,000: `house_cash_only`, bonus untouched.

### A8 · MAJOR · Alert outbox
*Merged:* ENG-04.

*Evidence:* the retry replays the same key (`market-service.ts:890`). The replay returns the original bet (`:1137-1155`) and skips the post-commit block (`:1491`). So a lost commit acknowledgement, or a crash after commit, sends no alert under "replayed !== true".

*§2 Intent, add:* `alertedAt timestamptz null`, with a partial index on `finishedAt` where status is PLACED and `alertedAt` is null.

*§4.5, replace the alert rule with:*
- After any ok result, run `UPDATE … SET "alertedAt"=now() WHERE id=$1 AND status='PLACED' AND "alertedAt" IS NULL RETURNING`.
- Send the admin bet alert and the holder notice only when a row comes back.
- The planner repairs PLACED rows whose `alertedAt` is null and `finishedAt` is more than 30 s old.

*Test:*
- An injected 08006 after commit gives exactly one admin row and one holder row.
- A duplicate fire gives none.
- A kill after commit is repaired within 45 s.

### A9 · BLOCKER · A bounded kill switch, and lock timeouts
*Merged:* ENG-01, ENG-02 (script part), ENG-06, ENG-17, ENG-18, CA-30.

*Evidence:*
- Advisory locks have no `lock_timeout` inside a 30 s transaction with a 10 s pool wait (`locks.ts:137-143`).
- Nested locks join the parent transaction and are held until it commits (`locks.ts:107-121`).
- 55P03 is not retryable (`retry.ts:47-52`).
- F9 takes `house:control` before writing, so a hung bet delays OFF by up to 30 s. A bot waiting on that lock holds `market:<id>` and stalls that market's players.

*F9, replace the write bullet with four steps:*
1. **Write OFF first:** autocommit `UPDATE "HouseBotControl" SET enabled=false, "offCause", "switchedAt"=now()` with no lock. H4's re-read inside the lock makes this binding for any bet not yet holding `house:control`.
2. **Drain:** a separate transaction runs `SET LOCAL lock_timeout='3s'` and then takes `house:control`.
   - Success: "House bots are off. No bot will place a bet."
   - 55P03: "Switched off. A bet already in its final step may still complete."
3. **Cancel** live intents with a conditional update.
4. **Record:** event, awaited audit, then alerts, all after the locks are released.

If step 1 fails: "Could not reach the database. House bots were NOT switched off. Try again, or turn on Maintenance mode." Maintenance refuses every bet, including house bets.

*§3 lock order, add:*
- The house branch runs `SET LOCAL lock_timeout='2s'` on the lock transaction before taking `market:<id>` and `house:control`.
- 55P03 maps to BUSY backoff, never to FAILED or the error streak.
- H2 is plain SELECTs: no FOR UPDATE, no writes before the market lock.
- Wording fix: `house:control` is held until the wallet-lock transaction commits.
- The player path is unchanged.

*§11 commit 7:* `ops:house-bots-off`. It uses a direct pg client, runs dry by default, and with `--apply` writes `enabled=false`, MANUAL and a SWITCH_OFF event.

*Test (`test:house-bot-caps`, Postgres):*
- `house:control` held 60 s: OFF returns in under 1.5 s with the drain copy, `enabled=false` is set, and the next bet gets `house_disabled`.
- `house:control` held 10 s: the bot bet on market X returns BUSY in 2–3 s, a player bet on X completes in under 3 s, and the error streak is unchanged.
- `market:X` held 20 s: the holder's withdrawal completes in under 3 s.
- The source test fails on FOR UPDATE in the house gate.

### A10 · MAJOR · Exhaustive mapper, status split, transient errors, poison intents
*Merged:* FS-03, ENG-11, ENG-16, HB-ACC-21 (mapper), HB-LC-16 (mapper).

*Evidence:*
- Refusal reasons are hand-written, and some are chosen by ternary (`market-service.ts:1117`, `:1170`).
- `account_blocked` is returned for SUSPENDED, CLOSED, SELF_EXCLUDED and COOLED_OFF alike (`:1045-1076`).
- The in-lock close returns `selection_closed` for markets closed early too (`:1284`, `:1413`).
- RETRYABLE lacks 55P03, 57014, 57P02/57P03 and P1001/P1017 (`retry.ts:47-52`).

*§4.6 changes:*
- **Compile check:** add a `BET_PATH_REASONS` const tuple; the mapper uses `satisfies Record<HouseBetOutcomeKey, Action>`.
- **Unknown reason at runtime:** FAILED(UNMAPPED), plus AUTO_PAUSED(UNMAPPED_REFUSAL) and one alert, instead of a stream of failures.
- **`account_blocked`:** re-read the status.
  - SUSPENDED → ACCOUNT_SUSPENDED.
  - CLOSED → A5 removal.
  - SELF_EXCLUDED or COOLED_OFF → RG cause with void consent.
  - Unreadable → ACCOUNT_BLOCKED.
- **SELECTION_CLOSED or INVALID:** re-read the market. Not LIVE → SKIPPED(MARKET_NOT_LIVE); otherwise EXPIRED(CUTOFF).
- **Transient errors:** `isEngineTransient` = `isTransient` plus {55P03, 57014, 57P02, 57P03, P1001, P1002, P1008, P1017, AdmissionBusy}.
- **Error streak:** atomic `UPDATE … SET "errorStreak"="errorStreak"+1 WHERE key='global' RETURNING`, reset on ok. Transient failures lasting 2 min send AlertOnce `engine:db:<EAT hour>`.
- **Poison:** the claim adds `attempts < 3`. The planner marks rows with 3 or more attempts and an expired claim FAILED(POISON) with AlertOnce.
- **Constant pin:** 180 s ≥ 15 s admission wait + 4 × (10 s + 30 s) + 5 s.

*Test:*
- A typecheck fixture that adds a reason without a mapper row fails.
- A walker over `reason:`/`code:` literals (ternaries included) has a planted RED case.
- An error-code table maps each code to PENDING or FAILED.
- 5 transient throws leave the switch ON. 3 TypeErrors across 2 workers give exactly one SWITCH_OFF.
- Suspension and self-exclusion mid-fire give different causes.

### A11 · MAJOR · Scope starts at switch-on or Start; the sweep lookback is bounded
*Merged:* HB-LC-06, ENG-10, ENG-31.

*Evidence:*
- `placedAt` is stamped before the market lock (`market-service.ts:1238` vs `:1282`), so the commit can trail it by up to the 30 s transaction timeout (`locks.ts:142`).
- Nothing bounds how far back the sweep reads. Old triggers are already due, so switching on fires a burst.

*§2 HouseBotRuntime, add:*
- `scopeFrom` on `global` (switch-on time) and on `bot:<id>` (Start time), written in the same transaction as those events.
- The seed migration sets `sweepPlacedAt = now()`.

*§4.3, add:*
- **COUNTER** only when `placedAt ≥ max(global, bot scopeFrom)`.
- **OPENER** only when `bettableFrom` is after that.
- **FILL** only when `cutoff − lead` is after that.
- **Sweep window:** each pass starts at `max(watermark − 90 s, dbNow − 10 min)`. `SWEEP_LOOKBACK_MS = 90 s`, pinned at or above 60 s.
- **While OFF or with no ACTIVE bot:** the watermark advances without writes.
- **Out-of-scope positions** get no intent row.
- **ON modal copy:** "Bots react only to stakes placed after you switch on".

*Test:*
- 40 positions placed while OFF, then ON: 0 intents; the next trigger is decided.
- A 3-day-old watermark with 10k old positions: 0 intents, and the watermark ends at or after now − 90 s.
- A committed position at `placedAt` now − 45 s with no hook call: exactly one intent.

### A12 · BLOCKER · One market scope predicate, and new H3 refusals
*Merged:* HB-LC-02, HB-LC-07, HB-LC-09, HB-LC-29, FS-01, FS-32.

*Evidence:*
- openRound passes the lock time (`updown-service.ts:769`) and only refuses when the close has passed (`:714`).
- `createMarket` discards a past cutoff and falls back to the category lead (`market-service.ts:646-654`). That lead has a floor of now plus the minimum window (`ai-poll-config.ts:165-171`), which a round can never fit, so the cutoff is null (`:644`). Betting then stays open until `resolutionAt` (`:566`).
- Result: a late round takes bets through its result phase, and plan §4.7 would use that null cutoff.
- The data layer turns any product line other than UPDOWN into MARKET (`market-dal.ts:158`).
- Demo markets are reachable by id (`:348`).
- The market row is created before the round row (`updown-service.ts:741` then `:800`).

*§4.1, add one predicate `inScope(view)` shared by trigger, planner and fire:*
- the raw `productLine` (explicit select) is MARKET or UPDOWN (`HOUSE_PRODUCTS`);
- not a demo market;
- a binary YES/NO market (`oppositeSide` uses an exhaustive switch);
- an Up & Down market has a round row;
- a poll has a non-null `selectionClosedAt`.

*§4.7, replace the cutoffs:*
- **Up & Down:** `min(round.opensAt + D·60 s, selectionClosedAt ?? resolutionAt)`.
- **Polls:** `selectionClosedAt`. A null cutoff puts the poll out of scope.

*§3 H3, add (raw row re-read inside the market lock):*
- `house_product_not_allowed` → SKIPPED(PRODUCT_NOT_SUPPORTED).
- `house_round_locked` → EXPIRED(CUTOFF).
- Both get en/sw/zh copy.

*Engine codes and alerts:*
- New codes NO_CUTOFF, UD_NO_ROUND and PRODUCT_NOT_SUPPORTED.
- AlertOnce `ud-born-unlocked:<roundId>` and `ud-orphan-market:<marketId>`. These are existing player-side holes; the platform fix is proposed separately.

*Test:*
- A round with a null cutoff, now in its result phase: 0 intents, a direct bet returns `house_round_locked`, pools and balance unchanged. RED: removing the check lets it commit.
- Raw product line JACKPOT: 0 intents and a refusal.
- A demo market: 0 intents.
- An Up & Down market with no round: UD_NO_ROUND and one alert.

### A13 · MAJOR · An allowlisted market view for the engine
*Merged:* HB-LC-03, FS-12.

*Evidence:*
- An early re-check stamps Sentinel fields onto a LIVE market (`market-service.ts:2355-2362`).
- Stage-1 of two-admin resolution stores the proposed outcome on a CLOSED market.
- `test:house-bot-info-edge` only scans imports, so a field read would pass.

*§4.1:* `HOUSE_MARKET_FIELDS` select produces `PublicMarketView`, containing:
- id, raw product line, category, status, pools, `selectionClosedAt`, `resolutionAt`, `createdAt`, `titleEn`;
- the frozen exit rates and `isDemo`;
- round open time, duration, open price and targets;
- `chainRunning` and `assetEnabled`.

Engine modules may not import `StoredMarket`.

*Test (info-edge):*
- The field list equals a pinned list.
- A token walker fails on sentinel, resolvedOutcome, resolutionEvidence or resolveClaimedAt (planted RED).
- The same market with and without Sentinel or staged fields produces a byte-identical intent.

### A14 · BLOCKER · Correct the extracted exit-window formula
*Merged:* FS-04, HB-LC-19.

*Evidence:*
- `cashOutValue` computes `hadRunway = graceMs > 0 && closesAt − placedAt ≥ graceMs` (`market-service.ts:2671`).
- It reads frozen rates (`:2657-2659`) and sets `sellable = hadRunway && withinWindow && !bonusFunded` (`:2687`).
- Plan (k) drops `graceMs > 0`. With grace 0 and a paid window, the refactor would offer an exit today's code never offers. That is a player money change (I1).

*§3 (k), replace:*
- `exitWindowClosesAt(p, m)` = `placedAt + graceMs + paidMs` when `graceMs > 0 && closesAt − placedAt ≥ graceMs`, else `placedAt`.
- Rates come from `ratesFor(m)`; `closesAt = selectionClosedAt ?? resolutionAt`.
- `cashOutValue` output must be byte-identical before and after.

*Test (seam):*
- The grid grace {0,5} × paid {0,2,10} × runway {<, ≥ grace} × bonus {0, >0} deep-equals a golden snapshot taken before the refactor.
- RED: dropping `graceMs > 0` fails.

### A15 · MAJOR · Count only locked money; check closeness on a fresh price against both targets
*Merged:* HB-LC-04, HB-LC-01, HB-LC-21, HB-LC-22, FS-33.

*Evidence:*
- Player stakes can exit free while sellable (`market-service.ts:2671-2687`).
- The board's live price is the latest confirmed observation (`updown-board.ts:634`, `:692`), which can be minutes old.
- Targets are null when there is no open price (`updown-service.ts:736`).

*F4 and H3 changes:*
- **Locked pool:** "non-house pool" becomes "the sum of OPEN non-house stakes whose `exitWindowClosesAt` has passed".
- **FILL timing:** `dueAt = max(cutoff − lead − jitter, latest exit close among the counted stakes)`. After `deadlineAt` → SKIPPED(CONDITION_GONE).
- **Deadline:** `dueAt ≤ deadlineAt` also applies to OPENER and FILL planning.
- **Price:** `udPriceForDecision(asset)` uses the terminal's cached 1-min vendor bar if under 120 s old (no new metered calls), else a confirmed observation quoted under 60 s ago, else SKIPPED(UD_STALE_PRICE). Add this source to the I2 list.
- **Closeness rule:** `|price − open|·100 ≤ closenessPct · min(upTarget − open, open − downTarget)`.
- **Missing inputs:** a null target or a margin of 0 or less gives UD_NO_PRICE.
- **Record:** the decision stores {price, source, ageSec}, and the check runs at decision and at fire.

*Test:*
- Observation at the open, vendor bar at open + 0.93 × margin: UD_CLOSENESS. RED: using the board price fails this.
- A 4-minute-old observation and no vendor bar: UD_STALE_PRICE.
- Asymmetric targets +10 / −4 with live price +5 at 25%: UD_CLOSENESS.
- A FILL with only sellable YES money is held, then placed.
- A cash-out racing the FILL inside the lock gives `house_condition_gone`.

### A16 · MAJOR · Market and round lifecycle handling
*Merged:* HB-LC-08, -10, -12, -13, -15, -16, -23, -25, -26, -30, FS-10, FS-11, FS-22, FS-24.

| Event (code) | Detection | Intents / new house bets | Money | Alert |
|---|---|---|---|---|
| Early close: Sentinel seal, human fallback, stage-1, single-admin resolve (`:2985`) | Planner every 15 s; conditional update on `status='PENDING'`; A10 re-read at fire | SKIPPED(MARKET_NOT_LIVE) | ride, settle normally | none |
| Reopen (`:4000-4025` clears Sentinel fields and stamps, leaves no marker) | An intent with MARKET_NOT_LIVE exists for the market (engine's own data) | new triggers SKIPPED(MARKET_REOPENED); FILL and OPENER never re-planned | ride | none |
| Emergency void (`:4061`), operator Up & Down void, objection VOID | as early close | SKIPPED(MARKET_NOT_LIVE); H3 refuses | marked BET_REFUND, no wagering reversal (A17), realised 0 | (h) label |
| Chain paused, stopped or archived, or asset disabled (`updown-config.ts:1180-1185` clears only the next boundary; `chainPaused` at `updown-board.ts:849`) | view at decide and fire; planner sweep | SKIPPED(CHAIN_NOT_RUNNING); H3 refuses | ride; the healer is independent | none |
| Cutoff or resolution moved (only `createMarket` writes these) | fire uses deadline = min(stored, fresh cutoff − minTimeToCutoff) | EXPIRED(CUTOFF) | — | source pin: `createMarket` plus dev-test only |
| New chain or category; stored category unknown | per-chain fit at decide (bettableFrom + delay ≤ deadlineAt; FILL lead fits D); unknown category → "other" plus a rules-tab flag | misfit → no row | — | AlertOnce `chain-in-scope:<botId>:<chainId>` (scope defaults belong to §5) |
| Exit rules widened (`market-config.ts:217-218`) | `effectiveTiming` counter "never"; runtime hash of the exit config | SKIPPED(EXIT_WINDOW_TOO_LATE) | — | AlertOnce per change |
| Holder wallet missing with OPEN house positions (settlement throws at `:3292`/`:3423`/`:3558`, void at `:4120`) | planner check | AUTO_PAUSED(WALLET_MISSING); Remove doesn't bypass | settlement blocked for every player until the wallet is restored | danger AlertOnce `settle-blocked:<botId>:<day>` with market links; `ops:house-bots-status` |
| Market deleted, orphan repair (`:2548-2573`) | NOT_FOUND at fire; planner | SKIPPED(MARKET_GONE) | refund copies the marker; no wagering reversal (A17) | none |
| Chain purge (rounds deleted, titles redacted) | no foreign key from intents to `UpDownRound`; `marketId` soft | feed reads `decision.snapshot` {title, round number, pools}; purge refused while PENDING/CLAIMED intents exist | untouched | — |

*Test:*
- Each transition mid-delay reaches its terminal state within one tick, and the trial balance ties.
- Reopen gives MARKET_REOPENED.
- A chain stop gives CHAIN_NOT_RUNNING.
- A purged-market feed row renders.
- A missing wallet alerts once, then settles after the wallet is restored.
- Two-admin stage-1 gives MARKET_NOT_LIVE, with the decision unchanged.

### A17 · MAJOR · Skip wagering reversal everywhere, and label every per-bettor notice
*Merged:* HB-LC-11, HB-LC-26, HB-LC-30, plus a new finding.

*Evidence:*
- `reverseWagering` runs in settlement (`market-service.ts:3798`), in emergency void (`:4248`) and in orphan repair (`:2559`). Plan (g) names only the settlement loop.
- House stakes never record wagering (H5–H9), so a void or an orphan refund would remove house turnover from the holder's personal bonus requirement.

*§3 (g), replace:*
- Every `reverseWagering` call (`:3798`, `:4248`, `:2559`) and `onRecruitSettlement` (`:3831`) skips marked positions.
- `onRecruitBet` and `onRecruitSettlement` take a required `houseBotId: string | null`.

*(h), list the emitters that get the liquidity label:*
- selection-closed bell and email: personal figures exclude marked positions, and the house stake gets its own labelled line;
- verdict recorded or reversed; market cancelled bell and email;
- one-sided refund and orphan refund;
- Up & Down win, loss, refund and one-sided rows, and the digest.

*Test:*
- Emergency void and orphan repair of a marked position leave the holder's grant unchanged and put the marker on the refund.
- A holder with mixed positions gets labelled notices, and his personal payout excludes house money.
- A non-holder's notices are byte-identical.

### A18 · MINOR · Sanctioned player-path changes (m)–(o)
*Merged:* HB-ACC-13, -14, -32.
- **(m)** The public comment side chip ignores marked positions (`markets/actions.ts:339`).
- **(n)** A user whose only positions on the market are marked is refused with reason HOUSE_STAKE_ONLY, in en/sw/zh (`objections-service.ts:99-109`). Own plus house positions stay eligible.
- **(o)** F10 adds the account activity feed as a chip surface, keyed on `payload.houseBotId`.

*Test (seam):*
- House position only: side null, HOUSE_STAKE_ONLY.
- Own plus house: own side, eligible.
- Non-holder: byte-identical.

### A19 · MAJOR · Engine audits outside the locks, from an allowlist
*Merged:* CRA-01 (engine part), CRA-13, ENG-34.

*Evidence:*
- Every audit append takes one database-wide serialised lock.
- §4.6 awaits the auto-pause audit right after the status write under `wallet:<botUser>`.

*§4.6, replace the auto-pause order:*
1. The status write commits under the wallet lock.
2. After release: cancel intents, append the event, await the audit, then send alerts.

*§4.6, allowlist and rules:*
- **Actions allowed from the engine:** `house_bot.auto_paused`, `.removed`, `.loss_stop`, `.switch_off{cause}`, `.engine_fault`, `.poison`.
- **Row shape:** COMPLIANCE, actor `system_house_bot`.
- **Payload keys:** holderUserId, from, to, cause, counts.
- **Never:** label, note, fingerprint or phone in a payload; no row per intent, skip or alert.
- **Link:** HouseBotEvent stores the audit id.
- **Source scan:** no `audit(` inside a `withLock` callback.

*Test:*
- OFF with 200 intents writes exactly one audit row.
- With the audit queue delayed 5 s, OFF commits in under 1 s and the holder's own bet is not blocked.
- Payload keys stay within the allowlist.

### A20 · MINOR · Retention of house tables (owner may shorten the skipped-intent period)
*Merged:* ENG-27, CRA-07.

*§2, add:*
- HouseBot, HouseBotEvent and HouseBotIntent are kept 7 years and never deleted.
- HouseBotAlertOnce is kept 30 days, deleted by `retention.purge.daily` in batches of 5,000.
- HouseBotRuntime holds fixed rows only.
- The house tables go on the chain-purge NEVER list.
- An index on intent `(status, finishedAt)` supports a later ruling; ENG-27 proposed 90 days for SKIPPED, EXPIRED and CANCELLED.

*Test (`test:retention`):* 400-day-old bot, event and intent rows survive; a 31-day AlertOnce row is deleted; a second pass does nothing.

### A21 · MAJOR (owner ruling) · Holder stakes against his own bot; triggers from his recruits
*Merged:* HB-ACC-08, HB-LC-28, HB-ACC-09.

*Evidence:*
- A player may hold both sides of a market (`market-service.ts:1174-1179`).
- H2's OWNER_POSITION only stops further house bets.
- `recruitedBy` records the referrer (`affiliate-service.ts:918`).

*§3 (a) and §4.3, add:*
- **Hook check:** an unmarked position whose user holds a live bot, on a market where that bot holds the opposite side.
- **Alert:** AlertOnce `holder-against:<botId>:<marketId>`, admin bell + email: "Holder of Bot A staked TZS 20,000 UP against Bot A's TZS 8,000 DOWN on BTC 5-min #412". Event HOLDER_AGAINST_BOT.
- **Never** refuse the bet and never pause the bot. A same-side bet raises nothing. The sweep repeats the check for positions the hook missed.
- **Recruits:** a trigger whose `recruitedBy` is a live bot's holder is SKIPPED(HOLDER_RECRUIT).

*Test:*
- House DOWN, then the holder bets UP twice: one alert, bet committed, bot status unchanged.
- Same side: no alert.
- Hook disabled: the sweep alerts once.
- The holder's recruit gives HOLDER_RECRUIT.

### A22 · MINOR · One alert recipient resolver
*Merged:* FS-09 (the part seal-flows does not cover).
- `alerts.ts` `houseBotAlertRecipients()` uses the same rule as the owner guard.
- F2, F3 and re-verify send uncapped bell + email for STARTED, VERIFIED, RULES_SAVED and LIMITS_SAVED, with before→after cap values.

*Test:* a second ADMIN raises a cap; both admins receive the diff.

### A23 · MAJOR · Release, migrations and deploy
*Merged:* FS-18 (ruling), ENG-07, ENG-08, ENG-21, ENG-30, ENG-32.

*Evidence:*
- The KYC commit `ac411357` is local only, with the tree dirty.
- A failed migration stops the app (`package.json:12`).
- Health readiness checks only that the database is reachable and one table exists (`api/health/route.ts:45-46`).
- `railway.json` declares a healthcheck and 60 s overlap, but production measured `healthcheckPath` null (`docs/RAILWAY-LIVE.md:101`).

*§11 precondition:*
- KYC-at-withdrawal is on origin/main before commit 1, and the worktree is branched from that SHA.
- House migrations are timestamped after `20260913120000_kyc_at_withdrawal` and touch no KYC table.

*§2 migrations:*
- Every statement uses `IF NOT EXISTS` with fixed names.
- `ops:preflight-house-bot-migrations` (read-only) prints `now()`, the timezone, Position and Transaction row counts and sizes, and existing indexes, then GO or NO-GO.
- Above 500k positions or 1M transactions, build the 4 marker indexes `CONCURRENTLY` by hand first, so the migration is a no-op.
- Merge only when `_prisma_migrations` shows both migrations finished and not rolled back. Never run `migrate resolve --applied` without checking the objects exist.

*§4.2:*
- `houseBotSchemaReady()` checks the marker columns, the 6 tables and the seeded rows.
- If false, the engine does not start and `/api/health` returns 503 (`houseBots.schemaReady=false`), because every Position create would fail.

*Runbook:*
- Deploy with the switch OFF unless the 60 s overlap is verified live.
- The engine-stale warning waits 90 s after the latest `lastBootAt`.
- Roll back past the merge only with the switch OFF and 0 open marked positions, or with the owner's recorded acceptance. The old code lets the holder cash out house positions and accrues wagering and commission on them.

*Test:*
- A mocked probe returning false gives 503, and the engine does nothing.
- Migrations replay twice on an empty Postgres.
- `test:docs` finds the preflight and the runbook sections.

### A24 · MAJOR · Engine runtime: crashes, deploys, backlog, scale-out
*Merged:* ENG-03, -05, -09, -13, -14, -15, -19, -20, -22, -23, -24, -25, -29 (beats), -36, FS-19, FS-21.

| Situation | Rule to add (§4.2–§4.5, §2) |
|---|---|
| Killed after claim, or inside the locks before commit | Rollback; reclaimed after 180 s; same key; one position |
| Killed after commit | PLACED (`markPlaced` is in the same transaction); A8 repairs the alerts |
| Player bet commits, then crash before the hook | 90 s sweep lookback (A11) |
| SIGTERM | Best effort only. Set `stopping` on globalThis synchronously; fire-and-forget requeue of this instance's claims that are not in flight; release the lease. Correctness never depends on it. |
| `HOUSE_BOT_ENGINE=false` | No timers, and the hook returns before its import. Runtime row `engine:<instanceId>` {enabled, bootAt}. |
| Duplicate module instances or HMR | State on `globalThis.__50PICK_HOUSE_BOT_ENGINE`; start is idempotent; the memory claim has no await between select and mark |
| Intents left over after downtime | Claim adds `"dueAt" > now() − maxLateness` (Up & Down 30 s, polls 600 s); the rest become EXPIRED(STALE). First tick waits 20 s after boot. Rate caps (MIN_GAP, PER_HOUR, GLOBAL_BETS_PER_MINUTE) defer to the moment the window frees if that is still within lateness, else SKIPPED; money caps skip. |
| Admission saturated | No claims while queue depth > 0 or in-flight ≥ half of max (`admission.ts:72-78`); `placeHouseBet` uses `maxWaitMs:0`; hook semaphore 4 per process, overflow dropped and counted; the sweep pauses |
| Planner lease | `acquireLeadership` gains `{leaseMs}`, 45 s for house bots, with a write that throws (`saveConfig` swallows errors, `config-store.ts:101-103`, so `leader.ts:112-114` returns true). Every planner effect is conditional with RETURNING. |
| Heartbeats | `beat:poller:<INSTANCE_ID>`, written only after the claim succeeds, and `beat:planner`. Record `pollerErrorAt`, code and streak; 10 failures send AlertOnce. Poller-stale and planner-stale are separate states. |
| Clock skew | Measure `clock_timestamp() − Date.now()` each minute; claim with `dueAt ≤ now() − max(0, skew) − 2 s`; above 5 s, stop claiming and alert |
| Day and hour keys | Computed inside the INSERT from DB `now()` in `Africa/Dar_es_Salaam`; engine modules import only `eat-day.ts` |
| 2+ replicas | Every cap and throttle comes from the database. GLOBAL_BETS_PER_MINUTE counts marked positions in the last 60 s on the lock transaction; PER_HOUR, PER_DAY and MIN_GAP are rolling windows; summaries are built from PLACED intents via AlertOnce. Per-process state (2 fires, 5 s cache whose stale intents are CANCELLED at fire, verify bucket, admission) is listed in HOUSE-BOTS.md. |
| High volume | The hook receives the committed bet's facts and returns at once for marked bets; at most 1 write per in-scope trigger. The sweep filters unmarked, LIVE, older than 5 s, and no COUNTER intent. |
| Cap queries inside the locks | Partial index on Position `(houseBotId)` where marked and OPEN; raw SQL; EXPLAIN pin with no Seq Scan; one GROUP BY for all bot books; add `gMaxBetsPerDay` to the control row |

*Test:*
- Two OS processes on Postgres, `kill -9` inside the market lock and after commit: one position per intent, no CLAIMED rows after 190 s.
- 300 stale plus 20 fresh intents: 0 stale placed; per-minute rate within the cap.
- Saturated admission: 0 claims.
- Two planners with realised loss at the cap: one event, one alert.
- A claim that throws 10 times: beat unchanged, one alert.
- +6 s skew: 0 claims plus an alert.
- 20 bets at 13:59, then one at 14:00:30: CAP_PER_HOUR.
- EXPLAIN pin at 1M/20k rows.
- `startHouseBotEngine` called twice: one interval.

---

## 2. Commit placement and severity

| Commit | Amendments |
|---|---|
| 1 | A3/A4/A8/A11/A20 columns, A23 migration rules, A24 indexes and runtime keys |
| 2 | A7, A9 (seam), A12 (H3), A14, A15 (H3), A17, A18, A21 hook |
| 3 | A3 (service), A4, A5 (designation/erasure), A22 |
| 4 | A2, A3 (engine), A5 (closure), A9 (OFF), A10, A11, A12, A13, A15, A16, A19, A21, A24 |
| 7 | A9 script |
| 8 | A1 record, A23 release checklist |

**Blockers:** A3, A9, A12, A14.

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\password-reset.ts
- C:\kipindi-main\src\lib\server\responsible-gambling.ts
- C:\kipindi-main\src\lib\server\locks.ts
- C:\kipindi-main\src\lib\server\updown-service.ts

---

# House bots: console and consent amendments C1–C3, C8–C15

## 0. Triage

**Surviving gaps and where they land**

| Amendment | Severity | Merged gaps |
|---|---|---|
| C1 Numbers on the rules and limits forms | BLOCKER | CA-01, CA-02 |
| C2 Labels, notes and reasons | MINOR | CA-14, CA-35 |
| C3 Typed confirmation words | MINOR | CA-15 |
| C8 A responsible-gambling pause voids consent (owner ruling) | BLOCKER | HB-ACC-17, HB-ACC-29, HB-ACC-02, HB-ACC-11 (strip part) |
| C9 Holder-account causes in eligibility and the console | MAJOR | HB-ACC-03 (email route), -04, -06, -21, -22, -23, -24, -27, -28, -34, -36, -37 |
| C10 Master switch and Start states, and lowering max bots | MAJOR | CA-12, CA-13, CA-22, CA-26 (remainder), plus one new verified gap (ON right after a loss stop, and stale ON/Start) |
| C11 Keeping the strip live | MAJOR | CA-04, CA-18, CA-23, CA-31, CA-30 (client side), ENG-15, -22, -29, -30, FS-19 (display only) |
| C12 Sign-out, 2FA expiry, second device and deploys keep edits | MAJOR | CA-05, CA-06, CA-07, CA-27, CA-28, ENG-02, FS-09 (guard) |
| C13 Notifications: audience, channel, links | MAJOR | HB-ACC-08, -10, -11, -31, -33, HB-LC-28, FS-09, FS-16, FS-17, CA-32 (engine-alert link), ENG-25 (summaries), ENG-28 |
| C14 Scope, timing and rule validity over time | MINOR | HB-LC-12, -19 (preview), -23, -24, FS-07, -10, -11, -15 (rules part), -20, -24, -27, ENG-25 (cap windows) |
| C15 Schedule windows and duration fields | MINOR | CA-16, CA-34 |

**Dropped (already covered, or contradicted by a ruling)**
- CA-03, HB-ACC-07: owner ruling, no platform-wide sign-out in this build. The immediate pause is already sealed (seal-flows §2.1 L1 hooks). The sign-out is recorded as hardening item H1 in C9.
- CA-08, CA-29, CA-33, CA-38, CA-39, CA-40, and CA-32 apart from the engine-alert link: covered by C7.
- CA-09, CA-19, CA-36, CA-37, HB-ACC-19, HB-ACC-20: covered by C4 and seal-flows §2.6.
- CA-10: covered by C5.
- CA-11, CA-20, CA-21, CA-24, CA-25, ENG-35: covered by C6 (both directions of bot vs global, conflicts, lock order, version clash).
- CA-26: the designate race and order are in C4. Its "refuse lowering below the count" is replaced by the owner ruling (C10).
- CA-17: R1 already ships a per-bot CSV. A print layout isn't a requirement.
- ENG-01, ENG-18, and CA-30's server bound: A9 (sequencing notes: OFF plus fallback script) and the seal-flows §3.7 database-down copy.
- CRA-01: seal-flows §1 C7 and §3.2–3.9 name the audit category per owner action; A19 covers engine audits.
- CRA-14: R1 indexes the `house_bot.*` audit rows. `/admin/audit` is a shared page outside this console.
- HB-ACC-01, -15, -16, -30: seal-flows §2.1 (hooks at 4 writers plus the sweep) and §6 (future-writer source check, REHASH).
- HB-ACC-25, -26: seal-flows §2.2, §2.5, §2.6 step 7, and X4's per-fingerprint alert key.
- HB-ACC-35, FS-31: seal-flows §6 says player 2FA has no effect, and D5 makes consent password-only. FS-31 contradicts D5.
- HB-ACC-18: A3 (IDENTITY_REFUSED cause). Its strip copy comes through C9.
- HB-LC-20: R2 (exposure split).
- HB-LC-05, ENG-26: R3 fixed the placement-day cohort and its hint copy.
- CRA-24: P1. CRA-08: R1 "Record reimbursement".
- HB-LC-06: A11 `scopeFrom`. Only its ON-modal copy lands in C10.

**Not taken (outside §5–§8):** HB-ACC-05, -09, -12, -13, -14, -32 · HB-LC-01–04, -07–11, -13–18, -21, -22, -25–27, -29–31 · ENG-03–14, -16, -17, -19–21, -23, -24, -27, -31–34, -36 · CRA-02–07, -09–13, -15–23, -25–29 · FS-01–06, -08, -12–14, -18, -21–23, -25, -26, -28–30, -32–34.

---

## C1 · BLOCKER · Numbers on the rules and limits forms: one parser, typed columns, "not set" is not 0
Merged: CA-01, CA-02.

**Evidence**
- The kit sanitiser keeps only `[^\d.]` and, for whole-number fields, deletes every `.` (`input.tsx:42-51`). So "10,000.50" becomes 1000050 and "1.5" becomes 15. JS `\d` is ASCII-only, so "٣٠٠٠" becomes "". A minus sign is dropped.
- The sanitiser switches on for any `inputMode="numeric"` (`input.tsx:86`) and rewrites the value before the page's `onChange` (`:96-101`). The design spec's limits tab asks for exactly `Input … inputMode=numeric`. DurationInput reuses the sanitiser (`duration-input.tsx:108`).
- `onPaste` and `onBeforeInput` pass through to the `<input>` (`input.tsx:156`, spread before `onChange` at `:160`).
- Money columns platform-wide are `Decimal(18,2)` (`schema.prisma:583`, `:1783`), so a plain money column wouldn't enforce whole TZS. Plan §5 gives no upper bounds.
- A database overflow is thrown and masked as "Server error — nothing may have applied" (`run-admin-action.ts:31-32`).
- Platform stake bounds are `PLATFORM_MIN_STAKE` 1,000 and `PLATFORM_MAX_STAKE` 1,000,000 (`payout.ts:166-168`).

**§5, add "Number input law" before the tables:**
- **One parser.** `parseWholeNumber(raw)` in `rules.ts` is used by the client and the server. The server parses the raw FormData string and never calls `Number()` on it.
  1. NFKC-normalise, then map every `\p{Nd}` digit to ASCII.
  2. Strip a leading `TZS`/`Tsh` (any case), spaces, no-break spaces, commas, underscores and apostrophes.
  3. The remainder must match `^\d+$`.
  - Refusal codes and copy:
    - `.` anywhere → DECIMAL: "Whole shillings only — no decimals." This includes "10.000"; the parser never guesses.
    - A leading `-` or `−` → NEGATIVE: "Must be 0 or more."
    - Anything else → NOT_A_NUMBER: "Digits only, e.g. 10,000."
  - Empty or whitespace-only → UNSET.
  - Rule: an accepted transformation never changes the digit sequence.
- **Field.** Every house-bot number field is a `HouseNumberField`: kit `Input size="md" mono`, with `prefix="TZS"` or `trailing="s"`/`"%"`.
  - Its `onBeforeInput`, `onPaste` and `onDrop` run the parser on the would-be value first.
  - A refused value calls `preventDefault`, keeps the previous value and shows the inline error with focus kept.
  - A normalisable value calls `preventDefault` and sets the digits.
  - An echo under the field shows "= TZS 10,000" via `formatTzs`.
  - The kit sanitiser remains only as a backstop and is never the thing that decides.
- **Bounds.** Add a Max column to every §5 row.
  - Stake min and max: within `PLATFORM_MIN_STAKE..PLATFORM_MAX_STAKE`, imported rather than written as literals.
  - Other TZS caps: 0–1,000,000,000.
  - Seconds: ≤ 86,400.
  - Percentages: whole numbers 0–100.
  - Counts: as in their tables.
  - Above max: "At most TZS 1,000,000,000."
  - Below min: "At least TZS 1,000 — the platform minimum."
- **Zero vs not set.** "0" is valid only where the minimum is 0 (balance floor, no-react zone, closeness %, jitter). UNSET stays NULL, shown as "Not set — this bot cannot bet".
  - Saving UNSET is allowed on a non-ACTIVE bot.
  - On an ACTIVE bot it is refused on that field: "Bot A is running — pause it before clearing {cap}."
  - The limits side keeps seal-flows §3.8 "Can't clear a limit while bots are on".
- **§2 column types.** Typed caps become `BigInt` with `CHECK (col IS NULL OR col BETWEEN 0 AND 1000000000)`. Seconds and counts become `Int` with CHECKs. The memory twin enforces the same.
- **Database errors.** P2002, P2003 and 22003 are caught in the action and returned as `{field}` errors, never as a throw.

**Test (`test:house-bot-rules`, `test:house-bot-console`)**
- Parse table: "TZS 10,000"→10000 · "Tsh 10 000"→10000 · "1,00,000"→100000 · "10,000.50"→DECIMAL · "10.000"→DECIMAL · "1.5"→DECIMAL · "-500"/"−500"→NEGATIVE · "2e5"→NOT_A_NUMBER · "٣٠٠٠"→3000 · "１０００"→1000 · ""/"  "→UNSET.
- Every field × {"", "0", min−1, min, max, max+1, 2^53, 2^63} gives its exact field and message, and the action doesn't throw.
- The max value round-trips in Postgres and the memory twin.
- Clearing a cap on an ACTIVE bot is refused.
- jsdom: pasting "10,000.50" leaves the value unchanged and shows DECIMAL.
- `red:house-bot-console`: swapping in a bare `Input inputMode="numeric"` must fail the "never saved as 1000050" assertion.

---

## C2 · MINOR · Labels, notes and reasons: normalisation, character set, case-insensitive uniqueness, code-point lengths
Merged: CA-14, CA-35.

**Evidence**
- Plan §2 (plan:153) gives "label (2–32, unique among live bots)" with no normalisation, case rule or counting unit.
- Feed and alert sentences interpolate the label.
- The kit `Textarea` has no `maxLength`, counter or error slot (`textarea.tsx:12-26`). A DOM `maxLength` counts UTF-16 units.
- No `lower()` unique-index precedent exists in `prisma/migrations`, so the index DDL is hand-written.

**§2 and §6 amendment**
- **Normalisers.** `rules.ts` exports `normaliseLabel(s)`, `normaliseText(s)` and `countChars(s)`.
  - `normaliseLabel` = NFC, trim, and collapse inner whitespace to one space.
  - `normaliseText` = NFC and trim, keeping newlines.
  - `countChars` = `[...s].length` after normalising. Client and server share all three.
- **Label rules**
  - Length: 2–32 code points, else "2 to 32 characters."
  - Allowed characters: `\p{L}\p{M}\p{N}`, space, and `- _ . # '`. Anything else is refused, including controls, zero-width characters (U+200B–200D, U+2060, U+FEFF) and bidi controls (U+202A–202E, U+2066–2069): "Letters, numbers, spaces and - _ . # ' only."
  - New column `labelKey` = NFKC of the normalised label, lowercased. Partial unique index `("labelKey") WHERE status<>'REMOVED'`.
  - Duplicate, including a concurrent one through P2002, returns field `label`: "Another bot is already called “Bot A” (Paused). Choose a different label."
  - A removed bot's label may be reused. Old rows render "Bot A (removed 20 Sep)" in history, feed and alerts, via `feed-copy.ts` from `removedAt`.
- **Note:** ≤ 300 code points.
- **Reasons** (ON, Pause, Remove): 5–300 code points after trim. Whitespace only gives "Give a reason (at least 5 characters)."
- **HouseTextField** (`Field` + `Textarea` + counter) shows "212 / 300" linked by `aria-describedby`, and turns danger above the limit.
  - Text is never truncated and no `maxLength` is set: "At most 300 characters — shorten it to save."

**Test**
- Table: "bot a" vs live "Bot A" → duplicate · " Bot  A " normalises to "Bot A" · "Bot\u200BA" and "\u202EA toB" → charset error · a 32-emoji label is valid, 33 is invalid.
- A reason of 5 spaces is refused. A 300-emoji note is valid, 301 is invalid.
- Concurrent same-label designate gives 1 bot plus 1 field error.
- A removed "Bot A" lets a new "Bot A" be created.
- red: an index without `labelKey` must fail the case test.

---

## C3 · MINOR · Typed confirmation words: one normaliser
Merged: CA-15.

**Evidence:** `ConfirmModal` arms on `typed.trim().toUpperCase()` (`modal.tsx:466`), so an inner double space never arms. The ON and Remove modals are new custom forms (C7), and §6 doesn't specify normalisation.

**§6, replace "The server re-checks every typed word from the shared constants" with:**
- `constants.ts` exports `normaliseTypedWord(s) = s.normalize("NFKC").trim().replace(/\s+/g," ").toUpperCase()` and `isTypedWord(s, WORD)`.
- Both the modal arming and `actions.ts` call it.
- "bots on", " BOTS  ON " and "remove" all arm. "BOTSON" and "BOT ON" don't: "Type BOTS ON to continue".
- A bypassed client refused by the server gets an inline error on `confirmWord`, "Type BOTS ON exactly to switch house bots on.", and the modal stays open.

**Test:** one truth table drives both the client arm and the server check. A source pin forbids any other `toUpperCase()` comparison under `src/app/admin/house-bots/**`.

---

## C8 · BLOCKER · A responsible-gambling pause voids consent: fresh password, then Start
Merged: HB-ACC-17, HB-ACC-29 (its "consent intact" is contradicted by the ruling), HB-ACC-02, HB-ACC-11 (strip part).

**Evidence**
- Plan F6 (plan:114) re-enables Start for SELF_EXCLUDED and COOLING_OFF "until eligibility passes again", with no re-verify.
- The fingerprint depends only on the stored hash (`password-reset.ts:74-76`). An unchanged password keeps it matching, so:
  - seal-flows §2.4 NOT_NEEDED and §2.6 "Another admin already verified — fingerprint already matches" would **no-op the re-verify**;
  - Start's fingerprint check (seal-flows §3.3 item 3) would pass.
  - The ruling would be unenforceable.
- Cooling-off lifts itself by timer (`responsible-gambling.ts:356-357`). Self-exclusion is reopened by an officer only after the minimum period (`players/[id]/actions.ts:161-175`). Start stamps exist at `:262-268` and `:312-313`.

**§2:** add `HouseBot.consentVoidAt timestamptz NULL` and `consentVoidCause` (SELF_EXCLUDED | COOLING_OFF).

**§6, add "Consent validity" (the single predicate):**
- `consentValid(bot, user) = fingerprint matches AND (consentVoidAt IS NULL OR verifiedAt > consentVoidAt)`.
- H2's `house_consent_stale` check, Start, the strip and the `?reverify=1` state all read this one predicate. The §3 owner wires it into H2.
- **Setting the void.** When any detector (hook, planner sweep or mapper) sees a self-exclusion or cooling-off for a non-REMOVED bot in **any** status, write under `wallet:<botUser>`: `consentVoidAt = now()` where `consentVoidAt IS NULL OR verifiedAt > consentVoidAt`. Event CONSENT_VOIDED.
  - ACTIVE bot: auto-pauses as planned.
  - PAUSED bot: status unchanged, admin bell only.
  - Neither sends a holder notice.
  - OWNER_LOSS_LIMIT is **not** an RG pause and doesn't void consent.
- **Re-verify gating** (replaces seal-flows §2.6 step 4 / X3 for RG causes only):
  - Refused, uncounted and before any password check, while `isLockedOut(userId).locked` or `status='SELF_EXCLUDED'`: "Can't ask for his password while he is {self-excluded | on a break} (until {D MMM YYYY}). His permission can be confirmed again only after it has ended."
  - Other causes (suspended, frozen, role) still don't block re-verify.
- **Modal copy when the void stands and the fingerprint matches** (runs normally, never NOT_NEEDED):
  - Title: "Confirm {holder}'s permission again".
  - Body: "His {self-exclusion | break} from {date} ended his permission for liquidity stakes. Type his current password — checked once and never stored."
  - Success sets `verifiedAt` and writes VERIFIED.
- **Start refusal**, inserted after seal-flows §3.3 item 3: "Can't start: {holder}'s {self-exclusion | break} on {date} ended his permission. Enter his password to confirm it again." Fix → `?reverify=1`.
- **F6 table, replace the SELF_EXCLUDED and COOLING_OFF rows:** "Start disabled while the lock stands. After it ends: Re-verify (fresh password, even if unchanged) → Start. Never resumes by itself."
- **Cooling-off end.** The planner sends one admin bell, AlertOnce `bot:<id>:RG_ENDED:<coolingOffUntil>`: "Bot A's holder break ended at {HH:MM} EAT. Confirm his permission before starting →" (`?reverify=1`). No holder notice.
- **Strip causes** (§8): render every live blocking row from `houseBotEligibility(userId,{botId, context:'start'})`, plus consent state. Show up to 3, then "and N more", each with its own action. `pauseReason` appears only in History.

**Test (`test:house-bot-designation`)**
1. Self-exclude, officer reopen, **same password**: the modal isn't NOT_NEEDED. Start before re-verify is refused with the void copy, and H2 returns `house_consent_stale`. After re-verify, Start succeeds.
2. Cooling-off expiry on an injected clock: Start refused, one expiry bell, re-verify, then Start succeeds.
3. Re-verify during the lock: refused, `failedLoginCount` unchanged, `verifyPassword` never called.
4. PAUSED(MANUAL) bot plus self-exclusion: status unchanged, `consentVoidAt` set, 1 bell, 0 emails, 0 holder rows.
5. A second RG episode after a re-verify voids again.
6. Red mutation: a predicate that checks only the fingerprint must fail case 1.

---

## C9 · MAJOR · Holder-account causes in eligibility and the console (not RG)
Merged: HB-ACC-03 (email route), -04, -06, -21, -22, -23, -24, -27, -28, -34, -36, -37.

**Evidence**
- Restore accepts only SUSPENDED or SELF_EXCLUDED (`players/[id]/actions.ts:176-177`), so a CLOSED account is permanent.
- ERASURE requests: `hasOpenRequest` at `privacy.ts:182-186`, persisted at `:69`.
- Officer-set email is audited as `player.email.set_by_officer` (`players/[id]/actions.ts:247-251`). A later reset-link change is audited as the holder's own `password_reset.completed` (`password-reset.ts:244-250`).
- The three password audits aren't awaited (`password-reset.ts:244`, `:273`, `:328`), so the plan's audit-log officer-reset row fails **open** if a row is lost.
- `checkLossLimit` is a rolling 24h window (`responsible-gambling.ts:499-504`).

**§6 eligibility table, add:**

| Context | Row | Copy (next step) |
|---|---|---|
| always | `status='CLOSED'` or `closedAt` | "Account closed on {date} — it can't be reopened. TZS {balance} and TZS {open house stakes} stay in his closed wallet; recover the float out of band. Remove the bot." Start and Re-verify are never offered. |
| designate, re-verify, Start | open ERASURE request | "He asked for his data to be erased ({dsarId}, {date}). Liquidity stakes can't continue — resolve the request or remove the bot." The planner sweep auto-pauses an ACTIVE bot as HOLDER_ERASURE_REQUEST. |
| designate, re-verify | `passwordSetVia='OFFICER_TEMP'` (durable column used by C4), or `RESET_LINK` within 30 days after a `player.email.set_by_officer` for this user (awaited read, fails closed) | "His password was last set through support ({how}, {date}). Ask him to change it himself in Account settings, then verify." |
| Start | OWNER_LOSS_LIMIT | "Can't start: his own daily loss limit (TZS {limit}) counts house stakes over a rolling 24 hours. The minimum stake fits again by {HH:MM} EAT at the latest." |

- **Live warnings** on `/[botId]` overview, recomputed per render and not wizard-only:
  - "Email unconfirmed — he can't top up until he confirms it."
  - "Agent application pending — approval would pause Bot A."
  - "Public name “{name}” can reveal this account — ask him to change it." Triggered when the display name matches `/50pick|house|bot|liquidity|ukwasi/i`, with one AlertOnce `bot:<id>:NAME_RISK:<nameHash>`.
  - "His sign-in is locked until {HH:MM} EAT after wrong passwords. The bot continues; re-verify waits for the lock."
- **Consent is kept for non-RG causes.** After a suspension is restored, freezes are lifted (the strip lists each `freezeReasons` entry via `FREEZE_REASON_LABEL` until the last one clears), or the role returns to PLAYER: Start is enabled without re-verify, and the bot never resumes by itself.
- **Designate order** (after C4 step 2): insert inside `wallet:<userId>`, re-reading the hash. If fp(fresh) ≠ fp(verified): "His password changed a moment ago — enter the new one." (field `password` → replace to consent), and no row is written.
- **Remove modal** (§8) shows live money from `book.ts`: "Money stays in his wallet: balance TZS {x}; open house stakes TZS {y} settle into it. Recover 50pick's float out of band." If the bot is ACTIVE, offer "Pause instead" as a ghost button.
- **§13 add H1 (hardening, not in this build):** "A password change does not sign out his other sessions. The bot pauses regardless (seal-flows §2.1)."

**Test**
- Each row appears per context with its exact copy.
- Close account: Start and Re-verify absent, float line present.
- File ERASURE with an ACTIVE bot: one sweep auto-pauses it.
- Officer sets email, reset link: re-verify refused. Holder's own email change, reset link: allowed.
- `audit()` stubbed to drop `password_reset_by_officer`: still refused, because the check reads `passwordSetVia`.
- Suspend then restore: Start enabled, no re-verify.
- Name "50pick House": one alert.
- A password change interleaved between verify and insert: refused, 0 rows.
- Visual fixture: Remove modal at balances 0, 1,000 and 2,500,000.

---

## C10 · MAJOR · Master switch and Start: every state, stale presses, unsaved edits, lowering max bots
Merged: CA-12, CA-13, CA-22, CA-26 (remainder), plus one new verified gap.

**Evidence**
- F3 refuses ON only while a global cap is unset (plan:73-75).
- The ON action has no version check (plan:372).
- The planner switches OFF on realised loss ≥ cap within 15s (plan:210). So an ON pressed after GLOBAL_LOSS_STOP flips back OFF, and every flip sends bell + email (seal-flows §3.7).
- The unsaved guard only catches link clicks (`unsaved-changes.tsx:437`), so strip buttons ignore a dirty form.
- seal-flows §3.7 says `Toggle tone="gold"`; the owner ruled brand.

**§6 `setHouseBotSwitchAction` (ON), add refusals after "unset limits":**
1. **Global loss already reached.** Today's global realised loss ≥ `gCapDailyLossTzs`: "Can't switch on: today's settled house loss TZS {x} has reached the global daily loss limit TZS {cap}. Raise it on Limits → or wait until 00:00 EAT." Field `gCapDailyLossTzs`, href `?tab=limits`.
2. **Stale safety.** The modal sends `seenSwitchedAt`. If a SWITCH_OFF event is newer: "House bots were switched off by {name | the system: {cause}} at {HH:MM:SS} EAT after you opened this. Read why, then switch on again." The modal closes and the strip refreshes.
- `startHouseBotAction` sends `seenStatusAt`. A PAUSED or AUTO_PAUSED event newer than it gives: "{name | The system} paused Bot A at {HH:MM} EAT after you opened this ({reason}). Review, then Start again."
- OFF, Pause and Remove never check versions (unchanged).

**§8, strip state table (copy composed from the returned facts `{masterEnabled, activeBots, status}`):**

| State | Tone | Copy |
|---|---|---|
| OFF, manual | neutral | "House bots are off. No bot will place a bet." |
| ON, 0 active | warning | "On · no active bot — nothing will be placed. Start a bot →" |
| ON, ≥1 active | success | "On since {t} EAT · {n} active" |
| Bot ACTIVE, master OFF (bot strip) | warning | "Active · waiting for the master switch — no bets until house bots are on →" |

- **ON modal extra lines:** "Bots react only to stakes placed after you switch on." When active bots = 0, also "No bot is active yet, so nothing will be placed until you start one."
- **Start success while OFF:** "Bot A started. House bots are switched off, so it won't bet until you switch them on →".
- **Remove the last active bot while ON:** "Bot A removed. House bots are still on, but no bot is active."
- **Rules save success** is composed from the returned status, e.g. "Rules saved (v8). Bot A is paused (by Ali at 14:03) — press Start when ready."
- **KPI:** "Bots active 0 of 5".
- **Unsaved edits.** While this page's rules or limits form is dirty (`HouseBotFormContext`), Start and ON open a three-choice dialog: "You have unsaved changes on Rules. Start uses the saved rules (v{n}: stake max TZS 10,000), not your edits."
  - "Save and start": Start runs only if the save returns ok.
  - "Start with saved rules".
  - "Cancel".
  - The Start confirm summary is headed "Saved rules (v{n})".
- **Toggle:** seal-flows §3.7 `tone="gold"` → `tone="brand"` (owner ruling).
- **Max designated bots** (owner ruling on lowering caps; replaces plan §5 "≥ current count" and seal-flows §3.8 "Max bots must be at least {n}"):
  - Lowering below the count is allowed through C6's consequence preview: "{n} bots are designated. With a limit of {m}, no account can be designated until {n−m} are removed. No bot is paused."
  - Roster button disabled reason: "Roster over the limit ({n} of {m})".
  - C4's in-lock count uses `count < maxDesignatedBots`.

**Test (`test:house-bot-console`)**
- ON at realised loss = cap: refused with field. At cap − 1: allowed.
- OFF lands after the ON modal opens: stale refusal, `enabled` stays false.
- Pause lands after the Start dialog opens: stale refusal.
- Every strip row renders its exact copy (visual fixtures "On · no active bot" and "waiting for the master switch").
- Dirty form plus Start: dialog appears. A refused save never calls Start (spy).
- `maxDesignatedBots` 5 → 3 with 5 bots: preview returned, save applies, designate refused.
- Source pin: the master Toggle uses `tone="brand"`.

---

## C11 · MAJOR · Keeping the strip live: SSE, polling while dirty, tab return, uncertain results, engine health
Merged: CA-04, CA-18, CA-23, CA-31, CA-30 (client side), ENG-15, -22, -29, -30, FS-19 (display only).

**Evidence**
- `AppShell` returns bare children for `/admin` (`app-shell.tsx:63-65`), so `EventStreamProvider` (`:18-20`) never mounts. `admin/layout.tsx` mounts no stream (grep), and `admin-shell.tsx:291` says "No notification bell here". **The plan's "notification:new triggers an immediate refresh" can never fire.**
- `useEventStream` exists (`use-event-stream.ts:22-27`) and pauses while the tab is hidden (`:55-59`).
- `RefreshPoller enabled=false` registers nothing (`refresh-poller.tsx:44`), and it skips hidden ticks with no visibility listener (`:47-48`). The plan disables it while a form is dirty, so the strip goes stale.
- The runner turns any failure into the generic sentence (`run-admin-action.ts:32`).

**§8 Live state, replace:**
- **Status action.** `getHouseBotStatusAction(botId?)`, owner-only, read-only, no audit. Returns `{master{enabled, offCause, switchedAt, by}, bot?{status, causes[], consentValid, rulesVersion, statusAt, statusBy}, limitsVersion, activeBots, engine{state, lastSeenAt, detail, instances}, serverNow}`.
- **The strip itself:**
  - mounts `useEventStream()` and handles `50pick:sse:notification` where `kind==='HOUSE_BOT'`;
  - polls the status action every 20s **whether or not a form is dirty**;
  - re-reads at once when the tab becomes visible and more than 20s have passed;
  - shows "Updated {HH:MM:SS} EAT".
- **On a change:**
  - If the page is clean, dispatch `50pick:refresh`.
  - If it's dirty, don't refresh. Show a warning Callout, e.g. "Bot A was auto-paused at 14:03 EAT (self-exclusion). Your unsaved changes are kept." or "Rules were saved by {name} at {HH:MM}." Announce it once through C7's single polite region.
  - Show an unread chip "{n} new house-bot alerts" → `?tab=history`.
- **§7 note:** admin bell rows are visible only on the player-side bell. While in the console, email is the dependable channel.
- **Uncertain results** (house-bot runner):
  - After 8s the sub-label reads "Still working — slow connection. Don't close this page."
  - On a transport failure or after 45s: "No answer from 50pick — we don't know if this was saved. Your changes are kept." with a "Check now" button. It compares version and last actor: "It was saved (v8)." or "Not saved — press Save again."
  - **OFF only:** retry automatically twice (it's idempotent), then read status. If still ON, show a danger Callout: "Could not confirm the switch-off. Press Off again, or pause each bot." Never the generic sentence.
- **Engine health table** (display only; the runtime fields belong to the §4.2 owner):

| Condition | Tone | Copy |
|---|---|---|
| ON, ≥1 active, poller stale | danger | "The bot engine is not running (last seen {t} EAT). No bot will place a bet." |
| poller error newer than its beat | danger | "The bot engine is failing (last error {t} EAT: {code}). No bot will place a bet." |
| planner stale only | warning | "Loss stops, fills and summaries are delayed (last run {t} EAT). Bets still stop at every cap." |
| `HOUSE_BOT_ENGINE=false` | neutral | "Bot engine disabled by server configuration." |
| < 90s since newest boot | neutral | "Bot engine starting after an update." |
| ON, 0 active, stale | neutral | "Engine not running — bots started now would not bet." |
| several instances | caption | "{n} engines running · last seen {t} EAT", with one line per stale instance |
| beat unreadable | danger | same as the first row, "Last seen: unknown" |

**Test**
- Source pin: the strip imports `useEventStream` and filters on HOUSE_BOT.
- Listener unit: HOUSE_BOT on a clean page gives a status read plus refresh. On a dirty page, status read only. Other kinds are ignored.
- Fake timers: visible after 21s → 1 read; after 5s → 0 reads. A dirty form still polls.
- Pause on AUTO_PAUSED returns `noop:true` with its reason.
- Runner: 8s label, 45s card. Reconciliation decides saved or not saved. OFF with fetch rejected twice → 2 retries, then a status read.
- Callout selector gets a fixture per row at 360 and 1920.

---

## C12 · MAJOR · Sign-out, 2FA expiry, a second device or a deploy never loses edits
Merged: CA-05, CA-06, CA-07, CA-27, CA-28, ENG-02, FS-09 (guard).

**Evidence**
- A stale action throws `UnrecognizedActionError("Server Action … was not found on the server")` (`server-action-reducer.js:78`). The runner catches it as "Server error" (`run-admin-action.ts:23-32`).
- The once-per-build reload exists only in `route-error.tsx:91-102`, which a caught error never reaches. `deploy-skew.test.mts` has no runner case (grep: 0).
- `requireOwner` redirects to `/auth/admin` **without** `next` (`rbac-guard.ts:210`) and throws for non-ADMIN (`:221`). The TOTP redirect is at `admin-guard.ts:71-72`; the TOTP cookie lasts 8h (`totp-cookie.ts:3`).
- A login on another device nulls the session (`session.ts:141-170`).
- Back is not guarded (`unsaved-changes.tsx:23`), and only link clicks are intercepted (`:437`).

**§6, replace "each starts with requireOwner" with `requireHouseOwner()`** (new in `rbac-guard.ts`; the one owner predicate; never redirects or throws):
- Returns `{ok:false, code:'REAUTH_LOGIN'|'REAUTH_TOTP'|'NOT_OWNER', href?}`. NOT_OWNER keeps the SECURITY `privilege_escalation_blocked` row.
- Runs before any password check or write.
- Client copy:
  - **REAUTH_TOTP:** Modal "Your 2-step check has expired. Verify again to save — your changes are kept." with "Verify now" → `/admin/totp-verify?next=<url>`.
  - **REAUTH_LOGIN:** "You were signed out because {you signed in on another device | your session expired}. Sign in again — your unsaved changes are kept on this device." → `/auth/admin?next=<url>`. The reason comes from the `kp_revoked` flash.
  - **NOT_OWNER:** "Only an admin can do this. Your access changed — reload the page."

**§8, add:**
- **Deploy.** `runAdminAction` gains an additive branch: `UnrecognizedActionError` (by name or the /was not found on the server/ message) → `{ok:false, code:'STALE_BUILD', error:"50pick was updated. This page is from the previous version, so nothing was saved. Your changes are kept — press Reload, then save again."}`. The house-bots runner renders a Reload button (a GET, never a replay).
- **Draft** (`src/lib/house-bot/draft.ts`):
  - sessionStorage key `hb:draft:<route>:<entityId>`, written on every change (300ms debounce) with `baseVersion`;
  - any key matching `/pass|secret/i` is dropped;
  - 30-minute TTL; cleared on save, Discard or Remove.
  - Restore Callout: "Restored changes you had not saved ({HH:MM}). Check them and press Save. · Discard". If the version has moved since, restoring enters C6's STALE_VERSION compare instead.
  - Password fields are always empty after REAUTH, STALE_BUILD, Back or Refresh, with "Enter the password again — it is never kept."
- **Pending OFF across a deploy.** Before OFF, write `hb:pendingOff={at, build}`. After a reload, if the switch is still ON and the marker is under 2 minutes old, show a danger Callout: "Your switch-off did not reach the server because 50pick was updating. House bots are still ON." with a primary "Switch off now" button. Never auto-replayed.
- **Wizard.** Every step render re-runs `houseBotEligibility(userId,{context:'designate'})`. If the account is now a live bot, show the check card "Already house bot “Bot A” · Open bot" with no password field.

**Test**
- With no TOTP cookie, each action returns REAUTH_TOTP, doesn't throw `NEXT_REDIRECT`, and changes 0 HouseBot, event or control rows.
- Registry pointing at another session id → REAUTH_LOGIN with the other-device reason and `next` in the href.
- FINANCE session → NOT_OWNER plus a SECURITY row, and the target's `failedLoginCount` is unchanged.
- `test:deploy-skew`, new arm: UnrecognizedActionError → STALE_BUILD.
- Fuzzed field names never store a password key. Restoring over a changed version routes to the compare flow.
- A pendingOff fixture with the switch ON renders the Callout.
- Wizard at `step=review` for an account that is now a bot renders the Open link.
- red: swapping back to `requireOwner` fails "no redirect on save".

---

## C13 · MAJOR · Notifications: who is told, over which channel, with links that still work later
Merged: HB-ACC-08, -10, -11, -31, -33, HB-LC-28, FS-09, FS-16, FS-17, CA-32 (engine-alert link), ENG-25 (summaries), ENG-28.

**Evidence**
- `notifyHouseBotOwner` covers only designated, started, paused, password pause and removed (plan:387). A re-verify without resume tells the holder nothing (seal-flows §2.6).
- The §7 engine-alert link `?tab=activity&outcome=failed` has no range, and the activity presets start at today (design spec S1), so a week-old alert opens an empty list.
- The design spec uses `#reverify` (S3); seal-flows uses `?reverify=1` (X7, §2.4).
- `requireOwner` accepts any ADMIN (`rbac-guard.ts:212`), yet RULES_SAVED, LIMITS_SAVED, STARTED and VERIFIED alert nobody.
- `isLockedOut` exists at `responsible-gambling.ts:349-360`.

**§7, add a status × cause matrix** (also in `comms-registry` and HOUSE-BOTS.md):

| Event | Admins | Holder |
|---|---|---|
| auto-pause of an ACTIVE bot | bell + email | bell + push, except for RG causes and own loss limit |
| cause added to a non-ACTIVE bot | bell | — |
| account closed | bell + email with float amounts | email only |
| cause cleared (restored, freeze lifted, role back to PLAYER, break ended) | bell, AlertOnce `bot:<id>:CLEARED:<cause>:<clearedAt>`: "Bot A can be started again — {cause} cleared{; confirm his permission first}" | — |
| holder locked out by wrong sign-ins | SECURITY bell, AlertOnce per day: "Holder of Bot A was locked out after 5 wrong sign-in attempts (until {t} EAT). The bot continues." | — |
| holder stakes against his own bot (owner ruling: alert, never refuse) | bell + email, AlertOnce `holder-conflict:<botId>:<marketId>`: "Holder of Bot A staked TZS {x} {SIDE} against Bot A's TZS {y} {SIDE} on {market}." → `/admin/markets/<marketId>` | — |

- **Roster alerts.** `notifyAdminsHouseBotRoster` goes to every recipient passing C12's predicate: bell + email, uncapped, title ends HH:MM:SS.
  - Events: DESIGNATED, VERIFIED, STARTED, manual PAUSED, REMOVED, and RULES_SAVED / LIMITS_SAVED with a diff, e.g. "Bot A: daily loss cap TZS 50,000 → TZS 200,000 by Juma M. at 14:02:11 EAT".
  - Link: `/admin/house-bots/<id>?tab=history&event=<eventId>`.
- **Holder transparency.** `notifyHouseBotOwner` gains two kinds (sw/zh drafted for native review):
  - `reverified` (bell + push + email): "50pick confirmed your permission for liquidity stakes with your current password at {HH:MM} EAT. If you did not give your password to 50pick, change it now — that stops liquidity stakes at once."
  - `verify_reserved` (bell): "Someone at 50pick tried to confirm your permission with a wrong password. Your sign-in is not locked."
  - The designated notice adds: "You can stop this at any time by changing your password or contacting 50pick."
- **RG gate.** Every holder HOUSE_BOT emitter returns early while `isLockedOut(userId).locked`. Outcome notices keep today's behaviour.
- **Channel.** HOUSE_BOT is never sent by SMS (`comms-registry` entry `sms:'never'`).
- **Summaries** are built from PLACED intents in [HH:00, HH+1:00) EAT beyond the cap, and claimed once through AlertOnce `summary:<audience>:<botId|all>:<EAT hour>`. The runtime `countInHour` is only the live throttle.
- **Links** (extend C7's table):
  - Auto-pause whose way out is re-entering consent (password change, or C8's void) → `?reverify=1`. Other pauses → the bot page. `?reverify=1` replaces the design spec's `#reverify`; HashFocus still targets `id="reverify"`.
  - Engine alert → `?tab=activity&range=all&outcome=failed&intent=<intentId>`.
  - Holder stake → `/positions/<positionId>` (the route exists).
  - On a REMOVED bot, every link renders the read-only page.
- **Limits hint** under bell alerts/hour: "At {n} per hour each admin can get up to {24n} bet rows a day, plus summaries and pause, money and switch alerts."

**Test (`test:house-bot-comms`)**
- Matrix rows give exact recipients and channels.
- A second ADMIN saving rules → both ADMINs get the diff.
- Re-verify gives 1 holder row in 3 locales plus an email. 2 wrong tries → 0 rows; reaching reserve → 1 row.
- RG-locked holder: 0 HOUSE_BOT holder rows.
- Stubbed SMS fan-out is never called.
- Bets straddling 14:00 EAT: 20 bells plus 1 summary with N=5.
- With now = event + 60 days, each href's route file exists and its resolver includes the event.
- Holder conflict: 1 alert, and the player's bet is never refused.

---

## C14 · MINOR · Scope, timing and rule validity over time
Merged: HB-LC-12, -19 (preview), -23, -24, FS-07, -10, -11, -15 (rules part), -20, -24, -27, ENG-25 (cap windows).

**Evidence**
- Plan §5 hard-codes "durations ⊆ 3/5/10/15/30/60" and defaults chains and categories to "all".
- Canonical lists: `ALLOWED_DURATIONS` (`updown-durations.ts:85`), `MARKET_CATEGORIES` (`categories.ts:29`).
- The "min gap ≥ 20 s" literal comes from `bet.place` refill 10/min (`rate-limit.ts:95`). Stake bounds are at `payout.ts:166-168`.
- The console's time helpers follow the admin-configurable platform timezone (`utils.ts:265`, `platform-config.ts:33`, `:70`). Statutory periods are pinned (`report-pack.ts:55`). The plan's day and schedule logic is EAT.

**§5 amendment**
- **Scope.** `chains: ChainKey[]` (asset + duration) and `categories: MarketCategory[]`, both explicit, new bots start empty.
  - "Select all current" fills the list but doesn't save.
  - A chain or category added later is out of every bot's scope. Neutral roster Callout: "New Up & Down chain {BTC 1-min} isn't in any bot's scope →".
  - Valid sets come from `ALLOWED_DURATIONS`, enabled assets and `MARKET_CATEGORIES`. Labels use `satisfies Record<MarketCategory,string>`.
- **Parsing.** `parseHouseBotRules(json)` → `{ok, rules, stale[]} | {ok:false, code:'RULES_FROM_FUTURE'|'RULES_OUTDATED'|'RULES_INVALID', field?}`, with `rules.schemaVersion` kept separate from `rulesVersion`.
  - Unknown values are dropped and flagged: "Rules mention {BTC 2-min}, which no longer exists — review and save."
  - From a future version: the engine skips the bot without pausing.
  - Outdated or invalid: AUTO_PAUSED(RULES_INVALID, field), way out "Rules → Save → Start".
  - New fields default to their narrowest value.
- **Live-derived bounds.**
  - `minGapFloorSec = ceil(60/(RATE_RULES['bet.place'].refillPerMin × 0.3))` (20s today). Stake bounds are imported.
  - Per-chain fit (FILL lead, OPENER delay) is a **warning**, not a refusal: "OPENER delay 90 s doesn't fit BTC 3-min — those rounds are skipped."
  - Start refuses when a saved value breaks a live bound: "Can't start: the platform minimum stake is now TZS 2,000; Stake min is TZS 1,000." (field `stakeMinTzs`).
- **Timing preview.** `effectiveTiming()` returns `counter: 'never' | {...}` per product and duration, labelled "For markets created from now (current exit settings)".
  - When live settings differ from open markets' frozen ones, add "Markets already open keep their own exit window."
  - The Start dialog warns when every enabled mode is `never`.
- **Cap windows:** per hour = rolling 60 min; per day = EAT day; min gap = since this bot's last placed bet; bets per minute = rolling 60s. A hint under each field names its window.
- **Time law.** All house-bot day keys, hour keys, schedule windows and console times go through `src/lib/house-bot/clock.ts`, labelled "EAT" whatever the platform timezone.
  - It builds on `eat-day.ts:24-32` (fixed +3h, no server imports).
  - This is an explicit exception to the design spec's §1 formatting rule, following the `report-pack.ts:55` precedent.

**Test (`test:house-bot-rules`)**
- `ALLOWED_DURATIONS` fixture gains 1 and 120: the saved scope is unchanged. An extra category is excluded.
- A legacy JSON with an unknown chain loads and is flagged. v99 → RULES_FROM_FUTURE with the intent left PENDING.
- Refill 2/min → floor 100s, and a saved 30s bot becomes invalid.
- Paid exit window 60 → counter `never` for polls.
- 20 bets by 13:59 plus one at 14:00:30 → CAP_PER_HOUR.
- Platform timezone set to UTC: the EAT day boundary stays at 21:00Z. Source pin: no `formatDateTime` import under `admin/house-bots/**`.

---

## C15 · MINOR · Schedule windows and duration fields
Merged: CA-34, CA-16.

**Evidence**
- `deriveTime` returns `{value:"", invalid:false}` while a time is half-typed (`time-mask.ts:117-128`), so "2_" looks empty but valid.
- DurationInput emits minutes only (`duration-input.tsx:7-8`), clamps silently (`:52-55`, `:102`) and defaults to `sm` (`:77`, 36px at `:139`).
- Plan §5 has seconds fields, while plan:446 lists DurationInput as a kit control.

**§5 Schedule, replace the row:**
- Windows are stored per day as minutes [start, end), where an end of 00:00 = 1440.
- An overnight row belongs to its start day and spills into the next ("Mon 22:00 → Tue 02:00 (overnight)"); Sunday spills into Monday.
- Validation:
  - start = end: "Start and end are the same — use All day for 24 hours."
  - 23:59 → 00:00 is valid.
  - A touched but incomplete time: "Enter a time as HH:MM."
  - Overlap is checked after expansion, reported on the later row: "Overlaps Mon 22:00 → Tue 02:00."
  - At most 4 rows as shown (an overnight row counts once). "Add window" disables at 4 with "Up to 4 windows".
- `TimeSelect size="md"`. Toggling All day keeps the rows in the draft.

**§8 controls:**
- `*Sec` fields use C1's `HouseNumberField` with `trailing="s"`.
- DurationInput is allowed only for minute-scale poll fields, with `size="md"` and min/max equal to the validator bounds.
- Its wrapper compares typed value × unit against the emitted value and shows "At most 30 days (43,200 minutes)" or "At least 1 minute" instead of snapping. The echo must equal the saved value.

**Test**
- Windows matrix: 00:00–00:00 · 23:59–00:00 · Mon→Tue overnight · Sun→Mon wrap · overlap after split · half-typed time · 5th row.
- Source pin: no DurationInput bound to a `*Sec` field.
- Typing 50,000 minutes gives the error, and the saved value is unchanged.

---

### Critical Files for Implementation
- C:\kipindi-main\src\components\ui\input.tsx
- C:\kipindi-main\src\lib\client\run-admin-action.ts
- C:\kipindi-main\src\lib\server\rbac-guard.ts
- C:\kipindi-main\src\lib\server\responsible-gambling.ts
- C:\kipindi-main\src\components\ui\refresh-poller.tsx

---

# House bots: §9 and §10 amendments R5–R9 and P2–P4 (compliance-data and future gaps)

I read the code in `C:\kipindi-main` at HEAD `ac411357`, without editing anything. R1–R4, P1, A1–A24 and C1–C15 are not repeated here. R5 fills slot A6, which amend-core left unwritten.

## 0. Gaps dropped: already covered or false

| Gap | Why it is dropped |
|---|---|
| CRA-01 | seal-flows §3.2–3.9 and A19 already name the audits. What remains (label in a payload, split categories) is in R7. |
| CRA-02, CRA-08, CRA-11, FS-22 | R1, plus A16 (decision snapshot) and A20 (never deleted). |
| CRA-03 | Moved to R8. |
| CRA-04, CRA-10, HB-ACC-12 | Moved to R5. |
| CRA-05 | A5 covers closure, the refusal and pseudonymising. What remains is in R6. |
| CRA-06 | A5 §4.4 (`why` stores only the id handle). |
| CRA-07 | A20 sets the periods. The retention doc, admin page and purge payload are in P3. |
| CRA-09, CRA-23 to CRA-27, FS-30 | P1. |
| CRA-12, FS-05 | R4. |
| CRA-13 | A19. |
| CRA-14 | Console triage: R1 indexes the rows, and `/admin/audit` is a shared page. R7 makes that index complete. |
| CRA-15 | A16 refuses a purge while intents are live. A20 adds the house tables to the NEVER list. The cost-panel rows are cosmetic. |
| CRA-16, CRA-17 | R2 covers the display. The audit evidence is in R9. |
| CRA-18, -19, -20, -22, FS-29 | R3. |
| CRA-21 | The §9 `summarise` house line already gives house stakes ÷ stakes. A margin delta tile adds no statutory value. |
| CRA-28, FS-26 | Core (I2/I10 test line). |
| CRA-29 | Its row-count assertion moves into R7's test. |
| FS-06 | Core dropped it as an owner-level decision. The disclosure-text flip goes with it. |
| FS-17 | C13 and F8 (channel policy). |
| FS-25 | R2 has the single reader. The procedure note adds nothing. |
| FS-01 to -04, -07 to -16, -18 to -21, -23, -24, -27, -28, -31 to -34 | Outside §9/§10; already in the A and C amendments. |
| AML public text | `/legal/aml` makes no claim about bet monitoring that house bets would falsify (`legal/aml/page.tsx:89-107`). `detectSuspiciousBets` (`analytics.ts:476`, used at `admin/aml/page.tsx:35`) is already skipped in §9. |
| KYC risk score | No scoring factor reads bets (`kyc-risk.ts:57-79`), so house stakes don't move the score. The display line is in R9. |
| `/legal/privacy` §5 | No change. §5 is a summary that already omits notifications and OTP (`privacy/page.tsx:77-84`). House data falls under "Prediction and transaction history: 7 years". |

---

## §9 Reporting

### R5 · MAJOR · Data-rights export for the holder and for trigger players
*Merged:* HB-ACC-12, CRA-04, CRA-10, and one new finding (the penalty box leaves no durable record).

**Evidence**
- **Player export** (`user-service.ts:45-69`):
  - no positions at all;
  - `transactions: db.txn.findByUser(userId, 1000)`, newest first with `take` (`prisma-dal.ts:1464`);
  - `auditEntries: getAuditForActorDurable(userId, {limit:1000})`, filtered on `actorId` only (`audit.ts:696-722`).
- **Officer bundle** (`privacy.ts:271-318`): 10,000 transactions, no positions.
- **House bet audit rows** stay under the holder's `actorId`, with `payload.houseBotId` (plan H5–H9, A18(o)). A bot at the recommended 200 bets a day fills the 1,000-row audit window in 5 days. Its bet and payout rows push his own deposits out of the export in a few days.
- **Officer player page:** its money KPIs come from `exportUserData().transactions` (`admin/players/[id]/page.tsx:122-125`).
- **Penalty box:** the only record is the AlertOnce key `penalty:<userId>:<day>` (plan:156), which A20 purges after 30 days. Penalty-boxed triggers are filtered out before the SKIPPED row (plan §4.3). Nothing durable records that automated exclusion.

**§9, add a "Data rights" row** (both doors: `exportUserData` and `buildDsarBundle`; bundle `schemaVersion: 2`):
- **Projection:** `server/house-bot/dsar.ts` → `houseLiquidityDsarView(userId)`. It is an allowlist, like `dsarUserView`.
  - `designations[]`:
    - `botId`, `status`, live `causes`, `designatedAt`;
    - `consent {method:"password entered by 50pick", verifiedAt}`, `consentVoidAt`, `consentVoidCause`;
    - `removedAt`, `removedReason`;
    - `writtenBy50pick {label, note}`.
  - `events[]`: `{kind, from, to, at, actor:"50pick owner"|"system"}`.
  - `positions`: house-marked positions `{id, marketId, side, stake, status, payout, placedAt}`, up to 1,000, with `total` and `truncated`.
  - `transactions`: house-marked rows, up to 1,000, with `total` and `truncated`.
  - **Never included:** `passwordFingerprint`, any hash, and officer ids (`designatedById`, `verifiedById`, `actorId`), because those belong to other people.
- **Personal sections:**
  - `transactions` = `findByUser(userId, 1000, {excludeHouseBets:true})` (R3's option).
  - `auditEntries` = `getAuditForActorDurable(userId, {limit:1000, excludeHouse:true})`: raw `NOT (payload ? 'houseBotId')`, with a memory twin. Add `houseAuditCount`.
- **Officer player page:** reads `db.txn.findByUser(id, 1000)` directly. Its output is unchanged, and house rows carry the chip.
- **Trigger players,** both doors: `liquidityDecisions {excludedDays:[{day, cause:"CASHED_OUT_COUNTERED"|"BOTH_SIDES"}], counteredPositionsCount}`. No position ids, times, sides, amounts, bot ids or holder ids (D6). This is a default; the owner may override it.
- **§2/§4.3:** entering the penalty box appends `HouseBotEvent` kind `PENALTY_BOXED {userId, day, cause, intentId}`, kept 7 years. This is the export's source; AlertOnce stays a throttle only.

**Test** (`test:dsar-secrets`, new §6–§8)
- A holder with 1,200 house transactions, 3 deposits and 1,100 house audit rows: both doors contain the 3 deposits and his own audit rows, and `houseLiquidity.designations[0].consent.verifiedAt` is present.
- The JSON contains no fingerprint value, hash value or officer id.
- A column added later to `HouseBot` is absent.
- A trigger fixture 31 days after the AlertOnce purge still shows `excludedDays`, and the JSON has no `hb_`, `hbi_` or bot `userId`.
- Officer page KPIs for a non-holder are byte-identical.

### R6 · MAJOR (a blocked statutory request) / MINOR (leftover data) · What erasure leaves behind on a house account

**Evidence**
- Erasure redacts only `maskName` fragments inside other people's notifications (`erasure.ts:369-372`).
- seal-flows puts `{holder}` and `"{label}"` into admin titles, bodies and emails (`seal-flows.md:106`, `:135`, `:374`, `:421`).
- The platform precedent for admin alerts uses the full `displayLabel` (`notification-service.ts:2082`).
- C2 allows letters in a label, so a label can be the holder's name.
- The `test:erasure` §8 buckets are hand-listed, with no admin-inbox bucket (`erasure.test.mts:524-536`).
- `AnonymizeOutcome.reason` is only `not_found|not_closed` (`erasure.ts:114`). The officer action passes the error straight through (`admin/privacy/actions.ts:126`), but Remove is owner-only.
- A24 says that with `HOUSE_BOT_ENGINE=false` the hook returns before its import, and the L2 sweep runs on a planner timer. So closure may never remove the bot, and A5's refusal then blocks erasure for good.

**§7 copy rule, add:** `{holder}` in every admin HOUSE_BOT title, body and email is `playerHandle(userId)` ("Player #A3F2K8"). It is never `displayLabel`, `maskName` or a phone number. Console pages resolve names live.

**A5 erasure step, add:**
- For each bot row of the user, run `db.notification.redactFragment('"'+label+'"', '"Erased bot '+tail+'"')`. Count it as `houseBotNotificationsRedacted` in the `privacy.erasure.completed` payload.
- `AnonymizeOutcome.reason` gains `house_bot_live`, with the error: "This account is still house bot hb_…. The owner must remove it at /admin/house-bots/<id> before it can be erased."
- Also send AlertOnce `erasure-blocked:<botId>` to the owner by bell and email.

**A2/A5, add:** the holder hook and closure removal run whatever `HOUSE_BOT_ENGINE` says. The env variable gates only the poller, the planner and the bet-trigger hook.

**Test** (`test:erasure`)
- §8 adds these buckets, each of which must hold no NAME:
  - `notificationsAdmin`: an ADMIN with HOUSE_BOT rows whose label equals NAME;
  - `houseBots`, `houseBotEvents`, `houseBotIntents`.
- §11: a live bot row gives `house_bot_live`; the request stays PENDING; exactly 1 owner alert.
- With `HOUSE_BOT_ENGINE=false`, `closeAccount` gives REMOVED.
- `red:erasure`: a mutation that skips the label redaction fails 8.b.

### R7 · MINOR · One audit table and one payload allowlist for every `house_bot.*` row
*Merged:* the rest of CRA-01, and CRA-29.

**Evidence**
- `house_bot.designated` is written with "label and userId only" (`seal-flows.md:294`). That puts the label into the 7-year chain, which can't be redacted (DATA-RETENTION.md §3; `erasure.ts:417-420` bans erased data in payloads).
- A19's allowlist covers engine actions only.
- Categories are split between two saves that both change money caps:
  - `rules_saved` is ADMIN (`seal-flows.md:363`);
  - `limits_saved` is COMPLIANCE (`:391`).
  - Precedent: the payments kill switch is COMPLIANCE (`payment-ops.ts:160`).
- `getAuditByActionsDurable` filters by category whenever one is passed (`audit.ts:626-639`).

**§6 owner-actions table, add an Audit column** fed from `constants.ts` `HOUSE_AUDIT: Record<action, AuditCategory>`:

| Category | Actions |
|---|---|
| COMPLIANCE | designated, started, removed, switch_on, switch_off, rules_saved, limits_saved, auto_paused, loss_stop, engine_fault, poison, holder_withdrew_consent, reimbursement_recorded |
| ADMIN | paused, intent_cancelled, exported |
| SECURITY | password_verified, password_rejected, verify_rate_limited, verify_account_locked, credential_changed |

- **Allowed payload keys:** botId, holderUserId, from, to, cause, rulesVersion or limitsVersion, `changes[{field, before, after}]` (numbers only), counts, eventId, reason.
- **Never in a payload:** label, note, fingerprint, phone, display name.
- **Reason fields** get the hint: "Kept permanently in the audit log — don't write the holder's name or number."
- **R1 index** reads `getAuditByActionsDurable(Object.keys(HOUSE_AUDIT))` with no category.

**Test**
- `test:house-bot-console`: each action writes exactly 1 row whose category equals `HOUSE_AUDIT[action]`. Payload keys stay within the allowlist. A label seeded equal to NAME appears in no payload.
- Source pin: every `"house_bot.` literal is a key of `HOUSE_AUDIT`.
- `test:house-bot-caps`: 200 house bets write exactly 200 new `market.position.opened` rows and no other rows apart from pause or alert audits. `verifyChain()` is valid.

### R8 · MINOR · House reports, the pack state and RG events read the durable audit table
*Merged:* CRA-03.

**Evidence**
- The ring holds 10,000 rows across all categories and filters after slicing (`audit.ts:63`, `:479-484`).
- At about 11,500 rows a day (DATA-RETENTION.md:229) it already holds less than one day.
- `getReportPack` reads the ring (`report-pack.ts:92`), and so do RG engagement events (`catalogue.ts:879`).
- Bots add up to 5 × 200 = 1,000 rows a day. `kyc-risk.ts:336` has the same defect but belongs to the KYC session.

**§9, add:**
- Every house report builder and the R1 index use `getAuditByActionsDurable` or `getAuditForTargetDurable` and print `truncated`.
- In commit 5:
  - `getReportPack` switches to `getAuditByActionsDurable(["pack.prepared","pack.approved","pack.submitted","pack.acknowledged"], {category:"ADMIN"})`, filtered by `targetId`;
  - `buildRgEngagement` switches to the durable reader for `rg.*` actions.
- `kyc-risk.ts:336` is listed in the HOUSE-BOTS.md risks for the KYC owner and is not edited here.

**Test**
- Source pin (positive control): no `getAuditPage` import in `report-pack.ts`, `server/house-bot/**`, or the house and RG builders in `catalogue.ts`.
- `drive:house-bots-local` (Postgres): pack prepared and approved, then 12,000 BET rows, then a fresh module → `getReportPack().state === "approved"`. The in-memory store can't prove this, because the durable reader falls back to the ring (`audit.ts:633-637`).

### R9 · MINOR · Record what resolvers and identity officers saw

**Evidence**
- These audit payloads carry pools but no house stake:
  - `market.adjudicated` (`market-service.ts:3060-3081`);
  - `market.emergency_void` (`:4208-4212`);
  - `objection.rejected` and `objection.upheld` (`objections-service.ts:422-426`, `:545-551`);
  - `market.resolve.bulk` and `bulk_override` (`bulk-resolve-action.ts:277`, `:325`, `:367`).
- P1's Board draft accepts "a single admin may resolve markets the house holds". That can only be audited if the chain records what was held.
- The identity review card shows "Bets placed · TZS staked" from all BET_PLACED rows (`admin/kyc/[id]/page.tsx:369-376`, `kyc-risk.ts:132-134`), so a holder's withdrawal review mixes in house stakes.

**F11/§9, add sanctioned change (q):**
- Those payloads gain `houseStake:{yes,no}`, read in the same call through R2's `houseStakeByMarket`, and `{0,0}` when there is none. Nothing else in the output changes.
- `kycMoneyFacts` gains `houseBetCount` and `houseStakedTzs`. The card adds "of which 50pick liquidity stakes: N · TZS X" when they are above 0. Coordinate with the KYC owner after D15.

**Test** (`test:house-bot-reports`)
- A single-admin resolve of a market where the house holds NO 40,000 gives `payload.houseStake = {yes:0, no:40000}`. Emergency void and an upheld objection give the same.
- A non-house market gives `{0,0}`.
- `test:two-admin` and `test:officer-conflict` pass unchanged.
- The KYC card shows the line for a holder; a non-holder's snapshot is identical.

---

## §10 Public text and docs

### P2 · MINOR · The Terms §10 notice: the smallest honest mechanism (settles P1's open question)

**Evidence: what the code can actually send**
- Terms §10 promises "in-app + SMS" notice at least 14 days ahead (`terms/page.tsx:222`, sw `:378`).
- `smsConfigured()` is false in production on the console provider (`sms.ts:109-112`).
- The only in-app broadcast is `platform-config.announcement` (`platform-config.ts:22-28`):
  - one untranslated string;
  - player pages only, dismissible for the session (`announcement-banner.tsx:6-10`, `:38-45`);
  - set from `/admin/system` (`admin/system/actions.ts:136-152`).
- There is no notify-all-players function.

**Evidence: precedents**
- 2026-09-07: a "correction; nothing the platform does changed" (`COMPLIANCE-DECISIONS.md:855-862`).
- KYC 2026-09-13: waived as "player-favourable", plus "do not re-add a site-wide bar" (`:65`, `:74`, `:94-108`).

**Choice under D2/D7: no banner, no bell, no SMS.** Add the "Terms §10" text below to the §10 COMPLIANCE-entry bullet:

> "Terms §10 promises written notice (in-app + SMS) 14 days before a material change. This change is material and changes what the platform does, so neither the 2026-09-07 correction reasoning nor the 2026-09-13 'favourable to players' reasoning applies. The notice is waived on Ali's ruling alone (D2/D7), effective on deploy. Nothing is broadcast: the platform has no trilingual in-app notice channel (the /admin/system banner is one untranslated, dismissible string) and SMS cannot deliver in production (`smsConfigured()` is false). ⚠️ Open defect, not fixed in this build: §10's 'in-app + SMS' promise cannot be kept for any future change until SMS is live and a localised notice exists — owner to decide. Existing players keep `acceptedTermsVersion`; no re-acceptance."

**Code comments:** above META in `terms/page.tsx` and `rules/page.tsx`, add a house-bots block in the style of `terms/page.tsx:27-41`.

**Test** (`test:house-bot-disclosure`)
- The house entry in COMPLIANCE-DECISIONS.md contains "waived on Ali's ruling alone", "smsConfigured" and "no re-acceptance".
- No file under `house-bots` imports `setAnnouncementAction` or `setPlatformConfig`.
- Both legal pages carry the house META comment.

### P3 · MINOR · Retention: the authority doc, the published page and the purge payload
*Takes the doc half of CRA-07; the periods are A20.*

**Evidence**
- DATA-RETENTION.md says every other statement must agree with it (`:3-5`). Relevant places: the class table (`:18-39`), the "Never" tier (`:95`), "touches exactly three classes" (`:260`, already stale given `retention.ts:149-157`), and the §7.1 NEVER row (`:339`).
- The page schedule is `admin/retention/page.tsx:36-77`.
- `RetentionResult` and the audit payload are at `retention.ts:88-107` and `:159-177`.

**DATA-RETENTION.md §1, add these rows:**

| Class | Period | Measured from | Basis | Enforcement | Where |
|---|---|---|---|---|---|
| House-bot designation and consent record | 7 years | Removal | POCA Cap 423 §16 (the record behind marked positions) | **Never deleted**. Label, note and free-text reasons are pseudonymised on erasure (§2b) | `HouseBot`, `HouseBotEvent` |
| House-bot decisions (each stake, each trigger not countered, penalty-box entries) | 7 years | Decision | POCA Cap 423 §16; GBT evidence | **Never deleted**; id handles only, never names | `HouseBotIntent`, `HouseBotEvent` |
| House-bot alert throttles | 30 days | Creation | Operational only | ✅ Code: `retention.purge.daily` (`HOUSEBOT_ALERT_ONCE_RETENTION_DAYS`) | `HouseBotAlertOnce` |
| House-bot runtime counters | ⛔ N/A: fixed rows overwritten in place | — | — | nothing to purge | `HouseBotRuntime` |

**Other doc edits**
- **Transactions and Positions rows:** add "(including `houseBotId` markers)".
- **§2b tier ①:** add "HouseBot label → `Erased <tail>`; note, removedReason and event reasons → `[erased]`; the quoted label is redacted in admin HOUSE_BOT notifications."
- **§2b ⛔ Never:** add `HouseBotIntent` and the markers.
- **§4:** replace "exactly three classes" with the named list: notifications, OTP, AI payloads, agent documents, house alert throttles.
- **§7.1 NEVER row:** add the three house tables.

**Code**
- `retention.ts`: export `HOUSEBOT_ALERT_ONCE_RETENTION_DAYS = 30`. Run a best-effort `.catch` pass. Add `houseBotAlertOncePurged` to `RetentionResult`, to the audit condition and to the payload.
- `/admin/retention` SCHEDULE: add two rows, each importing its constant:
  - "House-bot designation and decision records · 7y · POCA Cap 423 §16";
  - "House-bot alert throttles · 30 days · purged nightly".

**Test**
- `test:retention`: 400-day-old bot, event and intent rows survive; a 31-day-old AlertOnce row is deleted; the payload carries `houseBotAlertOncePurged`; a second pass is a no-op.
- `test:house-bot-disclosure` §docs: DATA-RETENTION.md names all 4 tables, and the page row period equals the constant.

### P4 · MINOR · Complete the docs list, and test doc content with something that can fail

**Evidence**
- **`test:docs` can't check content.** `docs-links.mjs:10-13` only checks links, script paths and npm script names. So "test:docs greps the risk line" (A1) and "finds the preflight" (A23) always pass.
- **FLOWS.md** has only §1–§8 (`FLOWS.md:11-116`). Its §3 row at `:66` still says settlement is two-officer, while a single admin is the default (`resolution-policy.ts:5-8`).
- **RULES.md** states rules that house stakes change: the §1 table (`:51-61`), §2.4 (`:208`), §2.5 (`:259`), §2.6 (`:321`) and §2.10 (`:488`).
- **FAILURE-INVENTORY §7 lexicon** starts from `schema.prisma` enums (`:802-806`; `label-lexicon.test.mts:59-65`). House statuses are TEXT + CHECK, so the lexicon can't see them.
- **AGENT-PROGRAMME.md** §5 (`:212`) has no house exception, although A17 skips accrual on house stakes.

**§10 Docs, add:**
- **RULES.md:**
  - §1 row "House liquidity stakes | accounts 50pick operates may stake; same fee, bounds and cut-offs; no cash-out, wagering, commission or objection standing | Both".
  - New "### 2.11 · House liquidity stakes", covering decided (the COMPLIANCE entry), enforced (H0–H4 and (d)–(g)), configured (`/admin/house-bots`) and stated (rules §8 carve-out, §3/§4, terms §4, privacy §3).
  - One cross-reference line each in §2.4, §2.5, §2.6 and §2.10, plus a §6 history row.
- **FLOWS.md:** new "## 9. House liquidity gates". Correct §3 `:66` to "single admin by default; two officers when enabled".
- **FAILURE-INVENTORY.md:** §6 rows (as planned) and new §7.1 families: HouseBot status, pause reasons and causes, HouseBotIntent status, EngineCode. Admin words come from `status-tone.ts` and `feed-copy.ts`; the player sees only the holder chip.
- **AGENT-PROGRAMME.md §5:** "No commission, first-bet or turnover reward accrues on house-marked stakes or settlements (`houseBotId`); the holder's own bets accrue normally."
- **DATA-RETENTION.md:** as in P3.
- **Doc-content tests:** every "test:docs greps/finds" in A1, A23 and CRA-25 moves into a `docs` section of `test:house-bot-disclosure`. `test:docs` stays a link check.

**Test** (`test:house-bot-disclosure` §docs)
- It finds `### 2.11` and the RULES §1 row, `## 9` in FLOWS, the 4 families in §7.1, and `houseBotId` in AGENT-PROGRAMME §5.
- It finds the HOUSE-BOTS.md §13 risk-7 line and the preflight and runbook headings.
- red: deleting one heading turns it red.
- `test:docs` still passes.

---

## Commit placement

| Commit | Items |
|---|---|
| 1 | R7 `HOUSE_AUDIT` constant · P3 and P4 doc skeletons · R5's `PENALTY_BOXED` event kind |
| 3 | R6 erasure step and `house_bot_live` |
| 4 | R5 penalty-box event write · R6 §7 copy rule and hook not gated by the env variable · P3 `retention.ts` pass |
| 5 | R5 DSAR views and DAL options · R8 · R9 |
| 6 | P2 |
| 7 | R7 console audit pins |
| 8 | P4 final docs |

Two defaults the owner may override: R5 (what trigger players get in their export) and P2 (the §10 SMS-promise defect).

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\user-service.ts
- C:\kipindi-main\src\lib\server\privacy.ts
- C:\kipindi-main\src\lib\server\erasure.ts
- C:\kipindi-main\src\lib\server\retention.ts
- C:\kipindi-main\docs\DATA-RETENTION.md

---

# House bots: §11–§13 amendments (S1–S5), future safeguards (F1–F9), unowned compliance-data (G1–G2)

Everything was checked against `C:\kipindi-main`. HEAD is `ac411357`, the KYC commit, which exists only locally. `origin/main` is `c63a4668`. The KYC migration file has been edited again since it was committed.

## 0. Dropped (already covered or false)

**Future gaps**
- FS-01: A12 does the scope check. What is left over is in F1.
- FS-02, FS-16: seal-flows §2/§6, A2, A3, A4.
- FS-03: A10 (compile-time mapper).
- FS-04: A14.
- FS-05: R4. What is left over is in F9.
- FS-06: A-core dropped it. The brief requires it, so a lean version is F2.
- FS-07: A4 and C14. What is left over is in F4.
- FS-08, FS-13: A7. What is left over is in F3.
- FS-09: A22, C12, C13.
- FS-10, FS-11, FS-20, FS-24, FS-27: C14 and A16.
- FS-12: A13.
- FS-14: A17 and A2 row 13.
- FS-15: A7 and C14. What is left over is in F5.
- FS-17: C13. What is left over is in F6.
- FS-18: A23 and D15. What is left over is in S1.
- FS-19, FS-21: A24. What is left over is in F7.
- FS-22: R1, A16, A20.
- FS-23: A10, plus the "do not restore" note at `market-service.ts:1079-1082`.
- FS-25: R2.
- FS-26: A16 and I10. The test line moves to S4.
- FS-28: plan (e) plus the money test.
- FS-29: R3.
- FS-30 (new locales): P1 (`Record<Locale>` copy, and the disclosure test loops over `Object.keys(dict)`).
- FS-31: contradicts D5.
- FS-32: A12.
- FS-33: A15.
- FS-34: there is no currency-change path.

**Compliance-data gaps**
- CRA-01: seal-flows C7 and A19.
- CRA-02, -08, -11: R1.
- CRA-03: this defect already exists. The platform writes about 11,500 audit rows a day (`DATA-RETENTION.md:229`), which is more than the 10,000-row global ring that `report-pack.ts:92` reads. House bots add about 9%. Report it as a platform defect, not a house-bot item.
- CRA-05, -06: A5.
- CRA-07: A20.
- CRA-09, -23 to -27: P1.
- CRA-12: R4.
- CRA-13: A19.
- CRA-14: R1's index.
- CRA-15: A16 and A20.
- CRA-18, -19, -20, -22: R3.
- CRA-21: R3's no-marker twin already pins the statutory hold %. The delta tile is optional presentation.
- CRA-28, -29: moved into S4.
- CRA-10: needs an owner ruling (D10). Nothing is built by default.

**Topics from the brief that are already covered:** the compile-time exhaustive mapper (A10), the timezone (C14), and new locales (P1).

---

## S1 · MAJOR · §11 precondition and migration law (before and in commit 1)

**Evidence**
- The start script is `prisma migrate deploy && next start` (`package.json:12`), so DDL commits while the old container is still serving (`LIVE-QA-CAMPAIGN.md:1636`, E-174).
- "Prisma wraps migrations in a transaction, and CONCURRENTLY cannot run inside one" (`migrations/20260731090000_txn_createdat_index`).
- `git status` shows `prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql` modified after its commit.

**§11 Setup, replace the first bullet with:**
> **P0, before commit 1 (stop and tell Ali if any check fails):**
> 1. `git fetch`, then `git cat-file -e origin/main:prisma/migrations/20260913120000_kyc_at_withdrawal/migration.sql`.
> 2. The KYC session's final commit, named in its handoff, is on `origin/main`.
> 3. Production `_prisma_migrations` row `…kyc_at_withdrawal` has `finished_at` set, `rolled_back_at` null, and a `checksum` equal to the sha256 of the `origin/main` file. Any mismatch is NO-GO.
> 4. The worktree is created from that SHA.
>
> **Migration law:**
> - Line 1 is `SET LOCAL lock_timeout = '3s';`.
> - New columns are nullable with no default.
> - Nothing is dropped, renamed or made NOT NULL on existing tables.
> - `IF NOT EXISTS` everywhere.
> - Large indexes are built `CONCURRENTLY` by hand, per A23.

**Test: new suite `test:house-bot-migrations` (local Postgres)**
- **(a) Replay:** both files, run twice, on an empty database and on a KYC-migrated database, raise no error.
- **(b) Blocked apply:** with an open transaction holding a Position row lock, the apply fails with 55P03 in 3.5 s or less, and a concurrent Position INSERT commits within 1 s of that failure. The apply never stalls the queue.
- **(c) Old build on new schema:** the pre-merge `origin/main` build, booted on the migrated database, gets exit 0 from its own `prisma migrate deploy`. A bet, settle and cash-out smoke test passes.

## S2 · MAJOR · §11 Release: exact checklist (commit 8; replaces the §11 "Release" paragraph and the §17 RELEASE block)

| Step | Action | GO when |
|---|---|---|
| R0 (T-1 day) | S1 P0 re-run. Rebase on `origin/main`. `git diff origin/main...house-bots --stat -- prisma/migrations` shows exactly the 2 house folders. `test:all`, every `red:house-bot-*`, `drive:house-bots-local`, `qa:house-bots-visual` and the S4 rehearsals pass on this SHA. `ops:preflight-house-bot-migrations` says GO. Send Ali the checklist. | Ali's one-word "go" |
| R1 | Pick a quiet hour: preflight prints the bets in the last 15 min. Not during the nightly trial balance. | ≥10-min window |
| R2 | From this machine: `MSYS_NO_PATHCONV=1 DATABASE_URL=… npx prisma migrate deploy`. **On any failure:** preflight `--post` confirms no house object exists, then `prisma migrate resolve --rolled-back <name>`, then retry once later. **Never leave a failed row:** P3009 blocks every boot, and boot runs `migrate deploy`. | both rows finished |
| R3 (old container still serving) | `houseBotSchemaReady()` query is true. `HouseBotControl.enabled=false`. `/api/health` `ok:true`. The Position count keeps rising (read-only check). | all true |
| R4 | Merge `house-bots` into main as one merge commit, then push. There is an outage while `overlapSeconds` is null. | build green |
| R5 (≤10 min) | `dpl=` shows the merge SHA. `/api/health` shows `houseBots.schemaReady=true` and `leadership.lifecycle.isMe=true`. After the 90 s boot grace, `ops:house-bots-status` shows: OFF, 0 bots, 0 marked rows, engine enabled, beats fresh. Run §12 production checks and §15 phase F. At +10 min: 0 marked rows and 0 HOUSE_BOT notifications. | all true |
| R6 | Handover note "First switch-on" for Ali: limits → designate → rules → Start → ON → watch the feed for 15 min → OFF on any FAILED row or unexplained alert. | — |

NO-GO before R4: nothing merges. NO-GO after R4: go to S3.

**Test**
- `test:docs` greps the R0–R6 headings in HOUSE-BOTS.md.
- The release record lists a measured value, or NOT MEASURED, for every step. No step is left blank.

## S3 · MAJOR · §11 Rollback plan (HOUSE-BOTS.md runbook; drift and remark scripts in commit 7)

**Order of use**
- One bot misbehaving → **Pause**.
- Several bots or the engine → **master OFF**.
- Console unreachable → `ops:house-bots-off --apply` (A9).
- Bets must stop now and the database is shaky → **Maintenance**.
- The engine process itself is harmful and OFF is already set → **`HOUSE_BOT_ENGINE=false`**.
- **Any player-path regression → revert immediately, whatever the house state.**

| Lever | Stops | Deploy? | Time | Side effect |
|---|---|---|---|---|
| Pause / Remove | that bot | no (DB) | <1 s | none |
| Master OFF (console) | every house bet | no | <1.5 s (A9) | intents cancelled |
| `ops:house-bots-off --apply` | same | no (direct pg) | seconds | same |
| Maintenance | every bet, players included | no, but it is a per-container latch (`platform-config.ts:103`, `RAILWAY-LIVE.md:361`) | immediate on 1 replica | player outage |
| `HOUSE_BOT_ENGINE=false` | timers and hook import | **redeploy, same image** (full outage at 1 replica) | minutes | none |
| Revert the merge (`git revert -m 1`) | all house code | **yes, a build and deploy** | build time | Migrations stay (expand-only; proven by S1c). A23 preconditions apply. |

**Rollback-window hazards (new).** Old code has no `houseBotId` in its Prisma client, so:
- its payout, refund and cash-out transactions are written unmarked, and R3's book then shows loss with no returns;
- it lets house positions be cashed out;
- it accrues wagering and commission on them.

**Re-release law.** Before any later house deploy, `ops:house-bots-status --drift` must report 0 for:
- (a) a Transaction with a `positionId` whose Position is marked but whose `houseBotId` is null;
- (b) CASHOUT rows on marked positions;
- (c) wagering or AGENT_COMMISSION rows on marked positions.

(a) is fixed by `ops:house-bots-remark --apply`: dry run by default, sets NULL→`position.houseBotId` only. It is the one sanctioned exception to "markers are written on create only". (b) and (c) go into a COMPLIANCE-DECISIONS note with amounts, and nothing is clawed back automatically.

**Test (S4 rehearsal 2)**
1. Local database migrated, with 3 open marked positions.
2. Boot the pre-merge SHA, settle, and cash one out.
3. Return to the house SHA.
4. Drift lists exactly those rows. Remark fixes (a); a second run changes 0 rows. The book's realised figure equals the ledger. The immutability pin still fails on any other `houseBotId` update.

## S4 · MAJOR · §12 Verification additions

**New suites table, add:** `test:house-bot-holder-lifecycle` (A2) and `test:house-bot-migrations` (S1).
- `test:all` runs every `test:*` key automatically (`test-all.mjs:44-46`).
- `red:*`, `drive:*`, `qa:*` and `ops:*` are **not** part of `test:all`, so each commit's checklist names them explicitly.

**Existing gates touched, add:** test:erasure (A5), test:retention (A20), test:chain-purge (A16), test:deploy-skew (C12), test:report-parity (R3), test:two-admin, test:officer-conflict, test:dsar-secrets (G1), test:withdrawn-features (F2), test:red-anchors (F3), test:docs, test:filter-language (X1). All of these keys exist in `package.json`.

**Rehearsals** (local Postgres, loopback guard, numbers recorded):
1. **Migrations under load:** 20 bets/s during the apply. 0 bet errors other than retried BUSY. The apply takes ≤3 s or ends in a clean 55P03.
2. **Rollback:** the S3 rehearsal.
3. **Two processes:** the A24 two-process suite (kill -9 cases) on the release SHA. This is also the gate for F7.
4. **Audit chain under a burst (CRA-29):** 200 house bets add exactly 200 `market.position.opened` rows plus the pause and alert rows, and `verifyChain()` is valid.
5. **Two-admin ON (CRA-28):** a house-held market needs stage 2 by a different officer, exactly like its no-house twin. The engine projection has no `resolvedOutcome`.

## S5 · MINOR · §13 accepted risks, add 8–12 (COMPLIANCE entry and HOUSE-BOTS.md)

- **8. Rollback window:** unmarked payouts, possible cash-outs, wagering and commission on house positions. Repaired or recorded per S3.
- **9. Per-process state (F7):** the maintenance latch, the vendor price cache and the verify bucket are per container. Production stays at 1 replica (`RAILWAY-LIVE.md:353`).
- **10. Up & Down with no fresh vendor bar:** modes mostly skip with UD_STALE_PRICE (A15). This fails closed.
- **11. Sunset can't unwind open stakes:** emergency void works on a whole market only (`market-service.ts:4061`). Open stakes settle normally.
- **12. Until the F2 code-state flip is deployed:** OFF and Remove are database states that any ADMIN can reverse (`rbac-guard.ts:208-225`). A22 alerts every recipient when that happens.

**Test:** `test:docs` greps risks 8–12 in both files.

---

## F1 · MINOR · New product line: default-deny (on top of A12)

**What breaks**
- `productLine` is free TEXT (`schema.prisma:1724`), and the data layer turns every value other than UPDOWN into MARKET (`market-dal.ts:158`).
- A12 refuses at H3, but when the TS `ProductLine` type (`market-service.ts:189`) widens, nothing forces anyone to decide, and nobody is told.

**Build now (commit 1)**
- `constants.ts`: `HOUSE_PRODUCT_POLICY = {MARKET:'polls', UPDOWN:'updown'} satisfies Record<ProductLine,'polls'|'updown'|'denied'>`.
- The rules form renders only entries that are not denied.
- An unknown raw value sends AlertOnce `product-denied:<value>:<EAT day>` by bell and email: "House bots ignored a stake on an unsupported product ({value}). No stake moved. Enabling it needs a COMPLIANCE-DECISIONS entry and a code change."
- The same sentence goes into HOUSE-BOTS.md as a rule.

**Test**
- A typecheck fixture that adds `'JACKPOT'` to ProductLine without a policy row fails.
- A raw JACKPOT market with an ACTIVE bot and 3 real bets gives 0 intents and 1 alert.

## F2 · MAJOR · Sunset or GBT ban (lean version of FS-06, no new console action)

**What breaks:** there is no terminal state. Any ADMIN can switch the master back on or designate again.

**Build now**
- `feature-state.ts`: `FeatureName` gains `"houseBots"`, with `PRODUCT_STATE.houseBots = "ACTIVE"`.
- `houseBotsLive()` is read by `startHouseBotEngine`, switch ON, Start, Designate and Re-verify.
- It gates the offer only. `house_position_no_exit`, the markers and the reports are never gated (the file's own "gate the offer, never the refusal" rule).
- Add `offCause` SUNSET and remove reason SUNSET.

**`ops:house-bots-sunset`** (commit 7; dry run by default; `--apply --reason`):
- master OFF(SUNSET);
- every bot that isn't REMOVED goes to REMOVED(SUNSET), and its intents are cancelled;
- one event per bot, and one COMPLIANCE `house_bot.sunset{bots, cancelled, openExposureByMarket}`;
- the holders get the normal Remove notices;
- running it again changes nothing.

**HOUSE-BOTS.md "Sunset runbook"**
1. Run the script with `--apply`. No deploy needed.
2. Commit `houseBots: "WITHDRAWN"`, change the public line to past tense with a META bump, and add a COMPLIANCE entry. Deploy.
3. Run `ops:house-bots-status` until open marked positions reach 0. Never void automatically.
4. All data is kept (A20).

**Test (`test:withdrawn-features`, new section)**
- `FEATURE_HOUSEBOTS=WITHDRAWN`: the engine starts 0 timers; ON, Start and Designate are refused with "House bots are withdrawn"; cash-out on a marked position still returns `house_position_no_exit`; reports keep the house lines.
- The ACTIVE branch is still driven.
- Script: a dry run writes 0 rows; `--apply` leaves 0 live bots and 1 audit row; a second `--apply` makes 0 changes.

## F3 · MAJOR · New bet gates are inherited (on top of A7 and A10)

**What breaks**
- A7's parity table is a fixed list.
- A future gate that returns "no opinion" when context is missing (the `responsible-gambling.ts:426-436` pattern) would silently exempt house bets.
- Someone could also add an `if (ctx.kind==='house')` skip.

**Build now (commit 2)**
1. The seam test declares `GATE_PARITY satisfies Record<BetPathReason, ParityFixture | {exempt: string}>` over A10's `BET_PATH_REASONS`.
2. Source pin: `ctx.kind` comparisons inside `buyPositionGuarded` and its helpers are allowed only at anchored sites (H0–H9, (p), cash-only), listed in `scripts/anchors/house-bot-seam.anchors.mjs` and resolved by `test:red-anchors`.
3. HOUSE-BOTS.md rule: "A new gate evaluates the holder's account state for house bets, or refuses `house_context_unsupported`. Until A10 classifies it, that maps to AUTO_PAUSED(UNMAPPED_REFUSAL). Any new funding source refuses house context."

**Test**
- Adding `zz_geo_blocked` without a parity row fails tsc.
- A planted house skip inside a gate helper turns the pin red.
- Every fixture gives the same reason through `buyPosition` and `placeHouseBet`, with wallets untouched.

## F4 · MINOR · Rules schema migration (on top of A4 and C14)

**What breaks**
- C14 folds "outdated" into RULES_INVALID and never says who converts old rules.
- After a rollback, every bot reads RULES_FROM_FUTURE and sits idle forever with no alert.

**Replace C14's "Outdated or invalid" bullet with:**
- **Older rules:** AUTO_PAUSED(RULES_OUTDATED). Copy: "Bot A is paused: its rules were saved in an older format. Open Rules, review the converted values, Save, then Start." Parse, the engine and the planner never convert anything.
- **Who converts:** only the rules form, through a pure `migrateRules(vN→vN+1)` shown as a diff. The owner saves it. The engine never writes rules back (unlike `updown-config.ts:425-429`).
- **Future rules:** if RULES_FROM_FUTURE, or a `limitsSchemaVersion` ahead of the build, lasts more than 10 min → AlertOnce `rules-future:<botId|global>:<v>`: "Bot A is idle: its rules were saved by a newer 50pick build (v{n}). Nothing will be placed until that build is back." No pause. Limits ahead of the build means nothing is placed.

**Test**
- A v0 fixture gives RULES_OUTDATED, and the rules JSON is byte-identical after 3 planner passes.
- Property test over 200 v1 inputs: converted scope ⊆ input, every cap ≤ input, modes ⊆ input.
- v99 for 11 min on an injected clock: 1 alert, status unchanged, 0 fires.

## F5 · MAJOR · Stake-bound changes invalidate saved caps (fixes C1's source; on top of A7)

**Evidence**
- C1 validates against the `PLATFORM_MIN/MAX_STAKE` constants.
- But "the money path reads the config, never these" (`payout.ts:160-163`). Production ran a 500 floor while the constant said 1,000 (`market-config.ts:442-446`).
- A7 pauses only on the minimum.

**Replace C1's "within PLATFORM_MIN_STAKE..PLATFORM_MAX_STAKE, imported" with:** "within the live global config bounds, via the A7 (p) resolver; the constants are outer rails only."

**Add to §4.2: `revalidateLive()`** runs every planner pass, even with the master OFF. It is keyed by runtime `boundsHash` (global min/max, chain bounds, the `bet.place` rule) and uses the same validators:
- **The bot can no longer place any bet** (stakeMin > live max, stakeMax < live min, OPENER range outside the live bounds, `gCapPerMarketTzs` < live min, min gap below the live floor) → AUTO_PAUSED(RULES_INVALID{field}), with 1 alert per bot per hash.
- **The bounds only narrow what it can bet** (stakeMax > live max, a per-market or chain override) → the stake is clamped at decide time. No pause, and one AlertOnce per hash: "Platform maximum stake is now TZS 5,000; Bot A's max TZS 10,000 is clamped. Review Rules."

**Test**
- Config min 500 with the constant at 1,000: stakeMin 500 saves.
- Config min raised to 2,000 with stakeMin 1,000: 1 pause and 1 alert, then 0 on the next 3 passes.
- Config max lowered to 5,000: the bot stays ACTIVE, placed stakes are ≤ 5,000, 1 warning.
- A per-market minimum of 10,000: SKIPPED, 0 alerts.

## F6 · MINOR · SMS or email fan-out goes live (on top of C13)

**What breaks**
- SMS is switched on by an environment variable (`sms.ts:94-105`, `:109`).
- C13 pins only HOUSE_BOT to "never SMS". Outcome kinds in `MONEY_KINDS` (`comms-registry.ts:213-221`) would fan out once per house stake.

**Build now (commit 4)**
- `CHANNEL_POLICY satisfies Record<NotificationKind,{sms:'never'|'otp'|'allowed'; email:'never'|'template-only'|'allowed'}>` over `NOTIFICATION_KINDS` (`:202`).
- Every future fan-out must call `channelAllowed(kind,{houseOnly})`.
- When all of a notice's positions are house-marked: never SMS, and email only through the holder's hourly summary.
- The HOUSE-BOTS.md alert matrix gains a Channel column.

**Test**
- The policy is exhaustive at compile time.
- With `SMS_PROVIDER=selcom` stubbed, 50 house outcomes give 0 SMS calls and ≤ `holderNoticesPerHour` bells plus 1 summary.
- A planted fan-out that skips `channelAllowed` turns the pin red.

## F7 · MAJOR · Replicas > 1, or the 60 s overlap (on top of A24)

**Audit: state → where it lives → effect with 2 containers**

| State | Where | Effect with 2 containers |
|---|---|---|
| Claims, caps, throttles, AlertOnce, summaries, beats, scopeFrom, hashes | DB | correct |
| 5 s soft cache | process | stale intents CANCELLED at fire |
| ≤2 fires, hook semaphore, admission | process | throughput only |
| `housebot.verify` bucket | process | N× tries; C4's database reserve still binds |
| Holder's `bet.place` bucket (`rate-limit.ts:28-33`) | process | holder gets more headroom |
| Vendor 1-minute bar cache (`updown-terminal-vendor.ts:52-57`) | process | a cold container skips with UD_STALE_PRICE (fails closed) |
| Maintenance flag, loaded once (`platform-config.ts:47-50`, `:103`) | process | the other container's bet path misses it, so A9's maintenance fallback isn't binding |

**Build now (commit 4)**
1. Source pin: no module-scope mutable `let`, `Map`, `Set` or counter in `src/lib/server/house-bot/**` outside declared `globalThis.__50PICK_HOUSE_BOT_ENGINE` keys.
2. Fire step 2 reads maintenance via `loadConfigResult` (`config-store.ts:34`), never `isMaintenanceMode`.
3. HOUSE-BOTS.md rule: "Setting numReplicas > 1 or applying overlapSeconds is a house release event: switch OFF, re-run S4 rehearsal 3, re-audit this table."

**Test**
- A planted `let fired = 0` turns the pin red.
- Instance A writes maintenance ON while instance B holds a cached OFF: B's fire returns SKIPPED(MAINTENANCE).

## F8 · MINOR · New password writers (on top of seal-flows §6, A2, A4)

**What breaks:** a raw-SQL writer escapes A2's walker, e.g. `scripts/ops-remint-qa-passwords.mts:84` (`update "User" set "passwordHash"`).

**Build now:** the A2 walker also scans `scripts/**` and SQL string literals containing `"passwordHash"`.
- A script is allowed only with the comment `// house-bot: covered by L2 sweep`.
- Writers under `src/**` must call the hook, or declare REHASH and refresh the fingerprint in the same transaction.

**Test**
- A planted raw-SQL script with no comment turns the walker red.
- A REHASH fixture keeps the bot ACTIVE with a new fingerprint.

## F9 · MINOR · Prize, tournament or cashback (on top of R4)

**What breaks:** R4 only pins files that import `leaderboard(`. A reward computed with its own `group by p."userId"` (like `market-dal.ts:1225-1235`) gets past it.

**Build now:** extend R4's pin. Any file that aggregates `"Position"` by `"userId"` and calls `creditInternal` (`wallet-service.ts:1958`), `creditBonus` (`bonus-service.ts:94`) or `adminAdjustBalance` (`:2561`) must filter `"houseBotId" IS NULL` or pass `excludeHouse:true`. Display-only sites (D6) are allowlisted.

**Test:** a planted file with that aggregate and `creditInternal` fails; adding the filter makes it pass.

---

## G1 · MAJOR · Holder's right of access (CRA-04, HB-ACC-12; slot A6 was never written) · §9, commit 5

**Evidence:** `user-service.ts:45-69` exports no positions, and its transactions are the newest 1,000. House volume pushes the holder's own deposits out of that window.

**Text**
- `exportUserData` and `buildDsarBundle` add an allowlisted `houseLiquidity` section:
  - `designations[]`: status, `designatedAt`, consent method ("password entered by 50pick"), `verifiedAt`, `removedAt`, reason;
  - `events[]`, `housePositions[]`;
  - `houseTransactions{rows,total,truncated}`.
- Personal transactions are read with `{excludeHouseBets:true}` (R3).
- The fingerprint, the hash and any `triggerUserId` are never included.

**Test (`test:dsar-secrets`)**
- A holder with 1,200 house transactions and 3 deposits: both export routes contain the 3 deposits and `designations[0].verifiedAt`.
- The fingerprint value, the hash value and `triggerUserId` are absent.
- A newly added HouseBot column is omitted, not leaked.

## G2 · MINOR · Decision audits snapshot the house stake (CRA-16, CRA-17) · F11 and §9

**Evidence:** the `market.adjudicated` payload (`market-service.ts:3060-3081`) carries pools only.

**Text:** add `houseStake{yes,no}` to these payloads, read from R2's `houseStakeByMarket` in the same call:
- `market.adjudicated`, `market.emergency_void`, `market.resolve.bulk(_override)`;
- `objection.rejected` and `objection.upheld`.

**Test**
- A market with a house stake of NO 40,000 gives `houseStake {yes:0, no:40000}`.
- A market with no house stake gives `{0,0}`.
- `test:officer-conflict` and `test:two-admin` are unchanged.

## Placement

| When | Items |
|---|---|
| Before commit 1 | S1 P0 |
| Commit 1 | S1 migration law and its test, F1, F4 parse and migrator |
| Commit 2 | F3 |
| Commit 4 | F5, F6, F7, F8 |
| Commit 5 | G1, G2, F9 |
| Commit 7 | S3 drift and remark scripts, F2 feature state and sunset script |
| Commit 8 | S2, S3 runbook, S4 rehearsals, S5, F2 runbook |

### Critical Files for Implementation
- C:\kipindi-main\package.json
- C:\kipindi-main\src\lib\feature-state.ts
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\comms-registry.ts
- C:\kipindi-main\src\lib\server\user-service.ts

---

# House bots: earlier amendments C4–C7, R1–R4, P1 and sequencing notes

> **Restored 2026-09-13 by build session `ali-e4`.** This section's heading (added here for navigation) and C4's title, merge list and first three evidence bullets were lost when the planning agent's reply hit its output limit. The C4 text below is restored verbatim from that agent's transcript (planning workflow `wf_62c09369-f5e`). Nothing else in this section changed.

**C4 · MAJOR · Entering the holder's password cannot burn or lock his sign-in.** Merged: HB-ACC-19, HB-ACC-20, CA-09, CA-19, CA-26, CA-36, CA-37.

*Evidence*
- 5 failures lock the account for 30 minutes, and the counter is shared with sign-in (`auth-service.ts:963-988`).
- Sign-in verifies against the row read before the lock (`:967`); that pattern must not be copied.
- PasswordInput sets no `autoComplete` (`password-input.tsx:100-103`), and the admin sign-in page is on the same site, so the browser can autofill the owner's own password.
- Buttons are only disabled after a re-render (`agents-client.tsx:31-43`), so a quick double tap sends two requests.
- Rate buckets are per container (`rate-limit.ts:28-33`).

*§6 password check, add step 3.5:*
- If `freshUser.failedLoginCount >= LOCKOUT_MAX_FAILS − 2`, return `verify_reserved` without checking the password: "Stop here — the last 2 attempts are kept for the holder. Ask him to sign in once (that resets the count), then try again."
- Admin attempts never set `lockedUntil`.
- Verify against `freshUser.passwordSalt` and `freshUser.passwordHash`.
- `attemptsBeforeLock` comes from the database counter. The per-replica bucket is an accepted risk.
- A wrong try shows: "That isn't his current password. It was changed on <passwordSetAt> via <passwordSetVia>. N attempts left."

*§6 designate order:*
1. Eligibility, including roster full and a readable balance.
2. Password check.
3. Under `house:control`, count again and insert. If full: "The roster is full (5 of 5). Remove a bot or raise Max designated bots on Limits →".

*F1 and §8:*
- **Password inputs:** the consent and re-verify fields use `autoComplete="new-password"`, `name="holderSecret"`, `data-1p-ignore`, `data-lpignore="true"` and `data-bwignore`, with no username field in the form. Label: "Account holder's password (not your own)".
- **Double taps:** buttons use a synchronous `useRef` busy latch. Each press sends a `submitId`, claimed through AlertOnce `submit:<actor>:<id>` before the password check; a duplicate is ignored.
- **Re-verify modal:** adds a Checkbox "Start Bot A again after verifying", ticked when `pauseDetail.wasActive`. The result is `{verified:true, started, startRefusal?}`. A refused Start after a successful verify is not a failure: "Verified. Not started: <reason> →".
- **Review step:** "Balance unavailable — try again" keeps the password in memory. An account with no wallet shows "This account has no wallet — it cannot be designated".
- **Countdowns:** hidden from screen readers (`aria-hidden`), with a static EAT time next to them.

*Test*
- 3 wrong tries → the 4th is refused without counting; `lockedUntil` stays null; the holder can still sign in.
- A concurrent double submit adds only 1 to `failedLoginCount`.
- Roster already full before the check → counter unchanged.
- Two designates at 4 of 5 → one bot and one ROSTER_FULL.
- Resume with the master switch OFF → PAUSED(MANUAL) with a fresh fingerprint.
- Source pin on the input attributes.

---

**C5 · MAJOR · The account picker finds Tanzanian phone formats.** Merged: CA-10.

*Evidence:* phone search runs a `contains` match on the raw text against `phoneE164` (`search/prisma-where.ts:33`, `search/fields.ts:63`, `:80`), so "0712345678" never matches "+255712345678".

*§8 UserPicker, add:*
- If the search has at least 6 digits and only phone characters, match `phoneE164` against `normalizeTzLocalDigits(q)` (`phone-normalize.ts:52-57`).
- Fetch 11 rows so the picker can show "Showing 10 — type more to narrow".
- Fewer than 2 characters: an idle hint, and no request.
- Closed, erased, staff and AGENT accounts are shown greyed, with the reason.
- Phones are masked with `maskPhone`.

*Test:*
- 6 spellings of one number return the same id (memory store and Postgres).
- "a" returns 10 rows with `hasMore`.
- 1 character makes no data call.

---

**C6 · MINOR · Limits and rules saves: consequences, conflicts and version clashes.** Merged: CA-11, CA-20, CA-21, CA-24, CA-25, ENG-35.

*Evidence:*
- The plan's F2 refusals carry no data.
- The rules save (`wallet:<bot>`) and the limits save (`house:control`) take separate locks (`locks.ts:164-169`), so two saves can each pass a check against the other's old values.
- H3 and H4 still enforce global caps at bet time.

*F2, replace the refusal bullets:*
- **Lowering a global cap:** allowed, because it only reduces risk (the owner may keep refusal).
- **Consequence preview:** the save returns `CONFIRM_CONSEQUENCES{warnings}` from `previewLimitConsequences(input, todayBook, exposure)`, e.g. "Today's settled loss is TZS 120,000. Saving a TZS 100,000 limit switches house bots OFF within 15 seconds."
- **Bots above the new cap:** listed as `conflicts[{botId, label, status, field, value}]`. Their stakes are clamped to `min(bot cap, global per-market − house money already on the market)`.
- **Raising a bot cap above a set global cap:** still refused, with a "Use TZS 30,000" button.
- **Lock order:**
  - The rules save takes `wallet:<bot>` then `house:control`, and reads the control row inside.
  - The limits save takes `house:control` and reads every non-REMOVED bot inside.
- **Version clash:** the refusal is `STALE_VERSION{savedBy, savedAt, changedFields, current}`.
  - The owner gets Compare, Keep theirs, and Save mine anyway (the overwrite is audited as `overwrote`).
  - The base version comes only from page load or a successful save.
- **Cross-field rules:** one table, `CROSS_FIELD_RULES [{id, fields, reportOn, message}]` in `rules.ts`, is the only source.

*Test:*
- Preview warnings when usage is below, equal to and above the new value.
- 20 paired concurrent saves are never both applied without confirmation.
- STALE_VERSION carries its payload.
- 50 engine writes between load and save cause no clash.

---

**C7 · MINOR · Modals, routes, feed, accessibility, 360 px.** Merged: CA-08, CA-29, CA-32, CA-33, CA-38, CA-39, CA-40.

*Evidence:*
- `/admin/house-bots` has no `not-found.tsx`; the only admin one is `admin/ai-polls/[id]/not-found.tsx`. So `notFound()` shows the player 404.
- Tapping outside a modal closes it by default (`modal.tsx:173`, `:282`).
- ActionOverlay's running state is its own Modal (`action-overlay.tsx:115-122`), so it would stack on top of a form modal.
- The transactions page defaults to the last 28 days (`admin/transactions/page.tsx:76`).

*§8, add:*
- **Unknown bot page:** `[botId]/not-found.tsx` with AdminPageHead, the empty state "No house bot with that id", and a Back link. A malformed id skips the database query.
- **Form modals** (ON, Remove, Re-verify): use a modal-local runner with `closeOnScrim={false}`, and never ActionOverlay while open.
- **§7 notification links** (they must work whenever opened):

| Alert | Link |
|---|---|
| Money event | `/admin/transactions?q=<txnId>&range=all` |
| Hourly summary | `?tab=activity&range=custom&from=<HH:00>&to=<HH:00 + 1h>` |
| Per bet | `/[botId]?tab=activity&range=all&intent=<id>` (row highlighted) |

- **Activity feed:**
  - Filter parameters are checked against a whitelist.
  - Page 2 onward uses a keyset cursor, so new rows don't shift pages.
  - Page 1 shows an "N new" pill.
- **Cancel intent:** returns `{status, positionId?, reasonCode}`, with this copy:
  - "Too late — this bet is being placed now."
  - "Too late — placed at 14:03:12 (TZS 8,000 DOWN)."
  - "Nothing to cancel — it was skipped: <reason>."
  - "Already cancelled."
- **Accessibility contract:**
  - The master switch has a role and label.
  - Focus moves to each wizard step's heading.
  - There is a single polite live region.
  - Countdowns are `aria-hidden`.
  - Focus returns to the trigger when a modal closes.
- **§12 visual fixtures, add:**
  - modals at 360×300 with the keyboard up;
  - a KPI of −1,234,567,890;
  - a 32-character label with no spaces;
  - 4 schedule windows with errors;
  - the unsaved-changes bar over the last field.

*Test:*
- The route files exist, and the not-found copy is pinned.
- Source pin: form modals pass `closeOnScrim={false}`.
- With now = event + 60 days, every link still shows its event.
- Page 2 is identical after new rows are inserted.
- Each cancel race gives its exact code.
- Visual assertions at 360 px.

### §9 Reporting

**R1 · MINOR (owner may promote) · House activity export.** Merged: CRA-02, CRA-08, CRA-11, CA-17, FS-22.

*Evidence:* the report catalogue has 8 reports and none covers house activity (`reports/catalogue.ts:1044-1053`). The report route passes only the user id, with no period (`api/admin/reports/[id]/route.ts:64`).

*§9, add a row:*
- **Report `buildHouseLiquidity(generatorId, period)`**, marked "Regulator hand-off". It contains:
  - the designation register;
  - the master switch history;
  - totals per bot and product;
  - per market: house share, outcome and resolution path;
  - a reconciliation showing all = players + house;
  - an index of `house_bot.*` audit rows.
- **Report route:** reads a validated `?period=YYYY-MM`, and `?marketId` for a per-market `house-market-statement`.
- **Transactions CSV:** gains a `house_bot_id` column and a `house=only|exclude` filter.
- **Per-bot CSV** (money and activity): owner-only, checked with `checkAdminTotp`, audited as ADMIN `house_bot.exported`.
- **Optional owner action** "Record reimbursement": writes an event and a COMPLIANCE row, and moves no money.

*Test:*
- A fixture month that includes the month-boundary instants reconciles.
- The CSV filter returns exactly the marked rows.
- The per-market statement ties to the market's pools.

---

**R2 · MINOR · House exposure shown wherever a money decision is made.** Merged: HB-LC-17, HB-LC-20, FS-25.

*Evidence:* the resolver queue shows "Crowd" and "Player money held" (`admin/resolver-queue/page.tsx:449`, `:463-470`). The objections and Up & Down rounds pages show pools only (`admin/objections/page.tsx:51`, `admin/updown/rounds/page.tsx:115`, `:351`).

*F11, replace:*
- One data reader, `houseStakeByMarket(ids) → {yes, no, open | settled}`, with a memory twin.
- It feeds:
  - the resolver card and resolution ceremony;
  - the admin market page (position rows tagged "House bot · Bot A");
  - the objections panel;
  - the Up & Down rounds void lever;
  - the emergency-void confirm and admin notice ("of which house TZS 8,000");
  - the bulk-resolve summary.
- **Overview exposure bars** split into "Open on live markets", "Awaiting settlement" and "Frozen by objection". This is a console query, never read by the engine.
- **CAP_EXPOSURE skip text** names the amount held.

*Test:*
- The reader separates open from settled after settlement and after a void.
- Visual fixtures with and without a house stake.

---

**R3 · MINOR · Statutory and harm figures stay exact and explained.** Merged: HB-LC-05, HB-LC-14, ENG-26, FS-29, CRA-18, CRA-19, CRA-20, CRA-22.

*Evidence:*
- The GBT pack note says "GGR = total stakes − total payouts" (`catalogue.ts:186`), but the formula also subtracts refunds (`:620`).
- The match-integrity note says "two-officer resolution flow" (`:1032`), while a single admin is the default (`resolution-policy.ts:5-8`, `:27`).
- Money settles only after the objection window (`market-service.ts:3178-3191`).
- An objection can no longer be upheld after settlement (`objections-service.ts:499-511`).

*§3 Loss, add:*
- **Cohort:** the EAT day the stake was *placed*. A multi-day stake's realised loss lands in its placement day, where the projected gate already bounded it.
- **Hint copy:** "Limits count stakes by the day they were placed and restart at 00:00 EAT. Losses that settle today can include stakes from earlier days."
- **`book.ts`:** derives returned money and fees from marker-bearing Transaction rows.
- **Source pin:** every `db.txn.create` with a `positionId` in `src/lib/server` copies `houseBotId` from the position.

*§9, add:*
- **Harm detectors:** read `findByUser(userId, 10_000, {excludeHouseBets:true})` in both stores. The compliance harm table shows "House bot holder · <status> since <date>".
- **FIU SAR:** a Context column derived from designation windows.
- **GBT monthly pack:**
  - memo rows "of which: house liquidity stakes" and "House liquidity net result (held in designated accounts; not operator revenue)";
  - the GGR note corrected to include refunds.
- **Match-integrity report:** the note corrected, plus "House stake" and "Resolution path" columns.

*Test:*
- Positions at 23:59:59.999 and 00:00:00.000 EAT fall into different cohorts.
- The source pin fails on a planted RED file.
- 50 late-night house bets raise no LATE_NIGHT flag.
- The GBT pack equals its no-marker twin on every existing row.

---

**R4 · MINOR · Future rewards never pay on house stakes.** Merged: FS-05, CRA-12.

*Evidence:* the leaderboard query groups every settled position by user with no marker filter (`market-dal.ts:1225-1235`).

*§9 leaderboard row, add:*
- `positionStore.leaderboard({excludeHouse?})`, default false, which keeps D6 (the bot shows publicly).
- A COMPLIANCE and HOUSE-BOTS.md rule: no prize, cashback, tournament or rank reward may be computed on marked positions.
- A source pin: any file that imports `leaderboard(` or `leaderboardPlayerCounts` together with a credit writer must pass `excludeHouse:true`.

*Test:*
- The pin fails on a planted offending file.
- `excludeHouse` drops marked rows in both stores.

### §10 Public text

**P1 · MAJOR (privacy line) / MINOR (the rest) · Disclosure completeness.** Merged: CRA-09, CRA-23, CRA-24, CRA-25, CRA-26, CRA-27, FS-30.

*Evidence:*
- The privacy page's lawful-basis section says nothing about automated processing of bets for liquidity (`legal/privacy/page.tsx:57-63`).
- `TERMS_VERSION = "2026-09-09"` is stamped only at registration (`auth-service.ts:72`, `:440`, `:655`).
- The plan's leak test list omits the fairness feed and the share-image route.

*§10, add:*
- **Privacy notice**, §3 "Legitimate interest", in en/sw/zh with native review: "Liquidity: an automated system operated by 50pick reads bets placed on a market to decide stakes from accounts 50pick operates; accounts that exploit those stakes may be excluded from them for the day." Bump the page version.
- **Rules and Terms versions:** move to a version different from 2026-09-13, identical across locales.
  - Bump `TERMS_VERSION`.
  - Existing players keep their accepted version, with no re-acceptance gate, stated explicitly.
  - Owner rules whether an in-app announcement goes out, since Terms §10 promises one.
- **Chatbot:** quote the exact bullet. Forbidden phrases: "independent", "cannot influence", "never bets against you", or naming or confirming an account.
- **Board disclosure draft**, required sections:
  - what 50pick does;
  - a request to confirm the licence class;
  - levy treatment;
  - the notice waiver;
  - the controls;
  - how to inspect;
  - the accepted risks.
- **Disclosure tracking:** add `HouseBotControl.boardDisclosureSentAt`. Until it is set, the ON modal shows the amber line "Board disclosure not recorded as sent".
- **COMPLIANCE-DECISIONS:** heading "## 2026-09-13 (third) · House bots"; the supersede table names F6 §5 conditions 1–3.
- **Locales:** holder copy is typed `Record<Locale, …>`, and the disclosure test loops over `Object.keys(dict)`.

*§12 leak list, add:* `/api/fairness/recent`, `/results`, `/api/og/market/<id>`, the ticker feed and the comments thread, plus a planted positive-control needle.

*Test:*
- `test:house-bot-disclosure` finds the privacy line in all 3 locales.
- Version strings match across locales and `TERMS_VERSION`.
- The forbidden-phrase check finds nothing.
- The leak sweep finds the planted needle.

---

## 3. Sequencing notes

1. **A1 first**, as a platform commit on its own. It answers the owner's explicit request and does not depend on house bots.
2. **A23 is a precondition for every house-bot commit.** A2's hooks at `wallet-freeze.ts` and self-exclusion, and A3's IDENTITY_REFUSED cause, need the KYC code on the base.
3. **Commit placement:**

| Commit | Amendments |
|---|---|
| 1 (schema, rules) | A4 columns, A8 `alertedAt`, A11 `scopeFrom`, A20 retention rows, C1 column types, S1 |
| 2 (money seam) | A7 context and stake bounds, A9 lock timeouts, A12 H3 refusal, A15 H3 checks, A17, A14, A18 sanctioned changes |
| 3 (designation) | A3, A4, A22, C4 service side |
| 4 (engine) | A2, A5, A7 mapper, A8, A9 OFF, A10, A11, A12, A13, A16, A19 engine audits, A21 |
| 5 (reports) | A6, R1–R4, A19 payloads |
| 6 (public text) | P1 |
| 7 (console) | C1–C7, the A9 fallback script, A22 recipients |
| 8 (drive, docs, release) | A23 release checklist |

4. **Owner rulings needed before build:**
   - D11 (A1), including whether the device that made the change is also signed out.
   - Consent void after an officer reopens a self-exclusion (A3).
   - Holder betting against his own bot: alert or refuse (A21).
   - D10, the trigger player's data export (A6).
   - Retention period for skipped intents (A20).
   - Lowering global caps: allow or refuse (C6).
   - Terms announcement at deploy (P1).
   - Whether R1 is v1.

### Critical Files for Implementation
- C:\kipindi-main\src\lib\server\password-reset.ts
- C:\kipindi-main\src\lib\server\market-service.ts
- C:\kipindi-main\src\lib\server\rbac-guard.ts
- C:\kipindi-main\src\lib\server\updown-service.ts
- C:\kipindi-main\src\components\ui\input.tsx